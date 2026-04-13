import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { authProfileRepository } from '../db/auth-profile-repository.js';
import { getPrismaClient } from '../db/client.js';
import type { AuthProfileData } from '../db/auth-profile-repository.js';

const router: Router = Router();

function toSafeProfile(profile: AuthProfileData | null) {
  if (!profile) return null;
  const usernameEnvVarPresent =
    profile.usernameSecretSource === 'env' && profile.usernameEnvVarName
      ? !!process.env[profile.usernameEnvVarName]
      : null;
  const passwordEnvVarPresent =
    profile.passwordSecretSource === 'env' && profile.passwordEnvVarName
      ? !!process.env[profile.passwordEnvVarName]
      : null;
  const secretHealth =
    (profile.usernameSecretSource !== 'env' || usernameEnvVarPresent) &&
    (profile.passwordSecretSource !== 'env' || passwordEnvVarPresent);
  return {
    id: profile.id,
    propertyId: profile.propertyId,
    authType: profile.authType,
    loginUrl: profile.loginUrl,
    successUrlPrefix: profile.successUrlPrefix,
    successSelector: profile.successSelector,
    usernameSelector: profile.usernameSelector,
    passwordSelector: profile.passwordSelector ? '***' : null,
    submitSelector: profile.submitSelector,
    usernameSecretSource: profile.usernameSecretSource || 'missing',
    passwordSecretSource: profile.passwordSecretSource || 'missing',
    usernameEnvVarName: profile.usernameEnvVarName || null,
    passwordEnvVarName: profile.passwordEnvVarName || null,
    usernameEnvVarPresent,
    passwordEnvVarPresent,
    hasUsernameValue: profile.usernameSecretSource !== 'missing',
    hasPasswordValue: profile.passwordSecretSource !== 'missing',
    secretHealth: secretHealth ? 'ready' : 'missing_env',
    postLoginSeedPaths: profile.postLoginSeedPaths,
    extraHeaders: profile.extraHeaders,
    isActive: profile.isActive,
    lastTestedAt: profile.lastTestedAt,
    lastTestResult: profile.lastTestResult,
    lastTestError: profile.lastTestError,
  };
}

/**
 * GET /api/properties/:propertyId/auth-profile
 * Get auth profile for a property
 */
router.get('/properties/:propertyId/auth-profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;

    // Verify property exists and user has access
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, entityId: true },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const profile = await authProfileRepository.getByPropertyId(propertyId, { resolveSecrets: false });

    if (!profile) {
      return res.status(404).json({ error: 'Auth profile not found' });
    }

    res.json(toSafeProfile(profile));
  } catch (error) {
    console.error('[AUTH-PROFILE] Error fetching auth profile:', error);
    res.status(500).json({ error: 'Failed to fetch auth profile' });
  }
});

/**
 * POST /api/properties/:propertyId/auth-profile
 * Create or update auth profile
 */
router.post('/properties/:propertyId/auth-profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const {
      authType,
      loginUrl,
      successUrlPrefix,
      successSelector,
      usernameSelector,
      passwordSelector,
      submitSelector,
      usernameValue,
      passwordValue,
      postLoginSeedPaths,
      extraHeaders,
      isActive,
    } = req.body;

    // Verify property exists
    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Validate authType
    if (authType && !['none', 'cookie', 'scripted_login'].includes(authType)) {
      return res.status(400).json({ error: 'Invalid authType. Must be none, cookie, or scripted_login' });
    }

    const existingProfile = await authProfileRepository.getByPropertyId(propertyId, { resolveSecrets: false }).catch(() => null);

    // Validate required fields for scripted_login
    if (authType === 'scripted_login') {
      if (!loginUrl) {
        return res.status(400).json({ error: 'loginUrl is required for scripted_login' });
      }
      const hasUsernameSecret =
        (typeof usernameValue === 'string' && usernameValue.trim() !== '') ||
        existingProfile?.usernameSecretSource === 'stored' ||
        existingProfile?.usernameSecretSource === 'env';
      if (!usernameSelector || !hasUsernameSecret) {
        return res.status(400).json({
          error:
            'usernameSelector and a username secret are required for scripted_login. Provide a value, env reference, or keep the existing secret.',
        });
      }
      if (!submitSelector) {
        return res.status(400).json({ error: 'submitSelector is required for scripted_login' });
      }
    }

    const profile = await authProfileRepository.upsert(propertyId, {
      authType: authType || 'none',
      loginUrl,
      successUrlPrefix,
      successSelector,
      usernameSelector,
      passwordSelector,
      submitSelector,
      usernameValue,
      passwordValue,
      postLoginSeedPaths: Array.isArray(postLoginSeedPaths) ? postLoginSeedPaths : undefined,
      extraHeaders: extraHeaders && typeof extraHeaders === 'object' ? extraHeaders : undefined,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.json(toSafeProfile(profile));
  } catch (error) {
    console.error('[AUTH-PROFILE] Error creating/updating auth profile:', error);
    res.status(500).json({ error: 'Failed to create/update auth profile' });
  }
});

/**
 * POST /api/properties/:propertyId/auth-profile/detect
 * Detect likely scripted-login selectors from a login URL and credentials
 */
router.post('/properties/:propertyId/auth-profile/detect', requireAuth, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { loginUrl, usernameValue, passwordValue } = req.body || {};

    const prisma = await getPrismaClient();
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (!loginUrl || typeof loginUrl !== 'string') {
      return res.status(400).json({ error: 'loginUrl is required' });
    }
    if (!usernameValue || typeof usernameValue !== 'string') {
      return res.status(400).json({ error: 'usernameValue is required for detection' });
    }

    const { detectScriptedLoginProfile } = await import('../crawler/auth-helper.js');
    const result = await detectScriptedLoginProfile({
      loginUrl,
      usernameValue,
      passwordValue: typeof passwordValue === 'string' ? passwordValue : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('[AUTH-PROFILE] Error auto-detecting login profile:', error);
    res.status(500).json({ error: 'Failed to auto-detect login profile' });
  }
});

/**
 * POST /api/properties/:propertyId/auth-profile/test
 * Test login flow
 */
router.post('/properties/:propertyId/auth-profile/test', requireAuth, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;

    const profile = await authProfileRepository.getByPropertyId(propertyId);
    if (!profile) {
      return res.status(404).json({ error: 'Auth profile not found' });
    }

    if (profile.authType !== 'scripted_login') {
      return res.status(400).json({ error: 'Test login only supported for scripted_login auth type' });
    }

    // Import auth helper dynamically to avoid circular dependencies
    const { testLoginFlow } = await import('../crawler/auth-helper.js');

    const result = await testLoginFlow(profile);

    // Update test result in database
    await authProfileRepository.updateTestResult(
      propertyId,
      result.success ? 'success' : 'failed',
      result.error || undefined
    );

    res.json({
      success: result.success,
      message: result.message,
      error: result.error,
    });
  } catch (error) {
    console.error('[AUTH-PROFILE] Error testing login:', error);
    res.status(500).json({ error: 'Failed to test login flow' });
  }
});

/**
 * DELETE /api/properties/:propertyId/auth-profile
 * Delete auth profile
 */
router.delete('/properties/:propertyId/auth-profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;

    await authProfileRepository.delete(propertyId);

    res.json({ success: true });
  } catch (error) {
    console.error('[AUTH-PROFILE] Error deleting auth profile:', error);
    res.status(500).json({ error: 'Failed to delete auth profile' });
  }
});

export default router;

