import { getPrismaClient } from './client.js';
import { SecureStorage } from '../security/storage.js';
import { config } from '../config.js';

export interface AuthProfileData {
  id: string;
  propertyId: string;
  authType: 'none' | 'cookie' | 'scripted_login';
  loginUrl?: string | null;
  successUrlPrefix?: string | null;
  successSelector?: string | null;
  usernameSelector?: string | null;
  passwordSelector?: string | null;
  submitSelector?: string | null;
  usernameValue?: string | null;
  passwordValue?: string | null;
  postLoginSeedPaths?: string[] | null;
  extraHeaders?: Record<string, string> | null;
  isActive: boolean;
  lastTestedAt?: Date | null;
  lastTestResult?: string | null;
  lastTestError?: string | null;
}

/**
 * Repository for managing scan authentication profiles
 * Handles secure storage of credentials (encrypted or env-based)
 */
export class AuthProfileRepository {
  private secureStorage: SecureStorage;

  constructor() {
    this.secureStorage = new SecureStorage(config.outputDir);
  }

  /**
   * Get auth profile for a property
   */
  async getByPropertyId(propertyId: string): Promise<AuthProfileData | null> {
    const prisma = await getPrismaClient();
    if (!prisma) {
      throw new Error('Database not available');
    }

    const profile = await prisma.scanAuthProfile.findUnique({
      where: { propertyId },
    });

    if (!profile) {
      return null;
    }

    // Decrypt sensitive values if stored encrypted
    // For now, assume values are stored in env or encrypted at application level
    return {
      id: profile.id,
      propertyId: profile.propertyId,
      authType: profile.authType as 'none' | 'cookie' | 'scripted_login',
      loginUrl: profile.loginUrl,
      successUrlPrefix: profile.successUrlPrefix,
      successSelector: profile.successSelector,
      usernameSelector: profile.usernameSelector,
      passwordSelector: profile.passwordSelector,
      submitSelector: profile.submitSelector,
      usernameValue: profile.usernameValue, // TODO: Decrypt if encrypted
      passwordValue: profile.passwordValue, // TODO: Decrypt if encrypted
      postLoginSeedPaths: profile.postLoginSeedPaths as string[] | null,
      extraHeaders: profile.extraHeaders as Record<string, string> | null,
      isActive: profile.isActive,
      lastTestedAt: profile.lastTestedAt,
      lastTestResult: profile.lastTestResult,
      lastTestError: profile.lastTestError,
    };
  }

  /**
   * Create or update auth profile
   */
  async upsert(
    propertyId: string,
    data: {
      authType: 'none' | 'cookie' | 'scripted_login';
      loginUrl?: string;
      successUrlPrefix?: string;
      successSelector?: string;
      usernameSelector?: string;
      passwordSelector?: string;
      submitSelector?: string;
      usernameValue?: string;
      passwordValue?: string;
      postLoginSeedPaths?: string[];
      extraHeaders?: Record<string, string>;
      isActive?: boolean;
    }
  ): Promise<AuthProfileData> {
    const prisma = await getPrismaClient();
    if (!prisma) {
      throw new Error('Database not available');
    }

    // TODO: Encrypt usernameValue and passwordValue before storing
    // For now, store as-is (should be moved to env or encrypted storage)

    const profile = await prisma.scanAuthProfile.upsert({
      where: { propertyId },
      create: {
        propertyId,
        authType: data.authType,
        loginUrl: data.loginUrl,
        successUrlPrefix: data.successUrlPrefix,
        successSelector: data.successSelector,
        usernameSelector: data.usernameSelector,
        passwordSelector: data.passwordSelector,
        submitSelector: data.submitSelector,
        usernameValue: data.usernameValue,
        passwordValue: data.passwordValue,
        postLoginSeedPaths: data.postLoginSeedPaths as any,
        extraHeaders: data.extraHeaders as any,
        isActive: data.isActive ?? true,
      },
      update: {
        authType: data.authType,
        loginUrl: data.loginUrl,
        successUrlPrefix: data.successUrlPrefix,
        successSelector: data.successSelector,
        usernameSelector: data.usernameSelector,
        passwordSelector: data.passwordSelector,
        submitSelector: data.submitSelector,
        usernameValue: data.usernameValue,
        passwordValue: data.passwordValue,
        postLoginSeedPaths: data.postLoginSeedPaths as any,
        extraHeaders: data.extraHeaders as any,
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      },
    });

    return {
      id: profile.id,
      propertyId: profile.propertyId,
      authType: profile.authType as 'none' | 'cookie' | 'scripted_login',
      loginUrl: profile.loginUrl,
      successUrlPrefix: profile.successUrlPrefix,
      successSelector: profile.successSelector,
      usernameSelector: profile.usernameSelector,
      passwordSelector: profile.passwordSelector,
      submitSelector: profile.submitSelector,
      usernameValue: profile.usernameValue,
      passwordValue: profile.passwordValue,
      postLoginSeedPaths: profile.postLoginSeedPaths as string[] | null,
      extraHeaders: profile.extraHeaders as Record<string, string> | null,
      isActive: profile.isActive,
      lastTestedAt: profile.lastTestedAt,
      lastTestResult: profile.lastTestResult,
      lastTestError: profile.lastTestError,
    };
  }

  /**
   * Update test result
   */
  async updateTestResult(
    propertyId: string,
    result: 'success' | 'failed',
    error?: string
  ): Promise<void> {
    const prisma = await getPrismaClient();
    if (!prisma) {
      throw new Error('Database not available');
    }

    await prisma.scanAuthProfile.update({
      where: { propertyId },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: result,
        lastTestError: error || null,
      },
    });
  }

  /**
   * Delete auth profile
   */
  async delete(propertyId: string): Promise<void> {
    const prisma = await getPrismaClient();
    if (!prisma) {
      throw new Error('Database not available');
    }

    await prisma.scanAuthProfile.delete({
      where: { propertyId },
    });
  }
}

export const authProfileRepository = new AuthProfileRepository();

