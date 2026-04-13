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
  usernameSecretSource?: 'missing' | 'stored' | 'env';
  passwordSecretSource?: 'missing' | 'stored' | 'env';
  usernameEnvVarName?: string | null;
  passwordEnvVarName?: string | null;
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

  private buildProfileData(
    profile: {
      id: string;
      propertyId: string;
      authType: string;
      loginUrl: string | null;
      successUrlPrefix: string | null;
      successSelector: string | null;
      usernameSelector: string | null;
      passwordSelector: string | null;
      submitSelector: string | null;
      usernameValue: string | null;
      passwordValue: string | null;
      postLoginSeedPaths: unknown;
      extraHeaders: unknown;
      isActive: boolean;
      lastTestedAt: Date | null;
      lastTestResult: string | null;
      lastTestError: string | null;
    },
    options?: { resolveSecrets?: boolean }
  ): AuthProfileData {
    const usernameSecret = this.describeSecret(profile.usernameValue);
    const passwordSecret = this.describeSecret(profile.passwordValue);
    const resolveSecrets = options?.resolveSecrets !== false;

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
      usernameValue: resolveSecrets ? this.resolveSecretValue(profile.usernameValue) : undefined,
      passwordValue: resolveSecrets ? this.resolveSecretValue(profile.passwordValue) : undefined,
      usernameSecretSource: usernameSecret.source,
      passwordSecretSource: passwordSecret.source,
      usernameEnvVarName: usernameSecret.envVarName ?? null,
      passwordEnvVarName: passwordSecret.envVarName ?? null,
      postLoginSeedPaths: profile.postLoginSeedPaths as string[] | null,
      extraHeaders: profile.extraHeaders as Record<string, string> | null,
      isActive: profile.isActive,
      lastTestedAt: profile.lastTestedAt,
      lastTestResult: profile.lastTestResult,
      lastTestError: profile.lastTestError,
    };
  }

  constructor() {
    this.secureStorage = new SecureStorage(config.outputDir);
  }

  private parseSecretReference(value?: string | null): { type: 'env'; envVarName: string } | null {
    if (!value) return null;
    const trimmed = value.trim();
    const wrapped = trimmed.match(/^\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}$/);
    if (wrapped) {
      return { type: 'env', envVarName: wrapped[1] };
    }
    const plain = trimmed.match(/^env:([A-Za-z_][A-Za-z0-9_]*)$/);
    if (plain) {
      return { type: 'env', envVarName: plain[1] };
    }
    return null;
  }

  private describeSecret(value?: string | null): {
    source: 'missing' | 'stored' | 'env';
    envVarName?: string | null;
  } {
    if (!value || !value.trim()) {
      return { source: 'missing', envVarName: null };
    }
    const ref = this.parseSecretReference(value);
    if (ref) {
      return { source: 'env', envVarName: ref.envVarName };
    }
    return { source: 'stored', envVarName: null };
  }

  private resolveSecretValue(value?: string | null): string | null {
    if (!value || !value.trim()) {
      return null;
    }
    const ref = this.parseSecretReference(value);
    if (!ref) {
      return value;
    }
    const resolved = process.env[ref.envVarName];
    if (!resolved) {
      throw new Error(`Missing environment secret: ${ref.envVarName}`);
    }
    return resolved;
  }

  /**
   * Get auth profile for a property
   */
  async getByPropertyId(propertyId: string, options?: { resolveSecrets?: boolean }): Promise<AuthProfileData | null> {
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

    return this.buildProfileData(profile, options);
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
    const existing = await prisma.scanAuthProfile.findUnique({
      where: { propertyId },
    });

    const normalizedUsernameValue =
      data.usernameValue !== undefined && data.usernameValue.trim() !== ''
        ? data.usernameValue.trim()
        : existing?.usernameValue ?? undefined;
    const normalizedPasswordValue =
      data.passwordValue !== undefined && data.passwordValue.trim() !== ''
        ? data.passwordValue.trim()
        : existing?.passwordValue ?? undefined;

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
        usernameValue: normalizedUsernameValue,
        passwordValue: normalizedPasswordValue,
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
        ...(normalizedUsernameValue !== undefined ? { usernameValue: normalizedUsernameValue } : {}),
        ...(normalizedPasswordValue !== undefined ? { passwordValue: normalizedPasswordValue } : {}),
        postLoginSeedPaths: data.postLoginSeedPaths as any,
        extraHeaders: data.extraHeaders as any,
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      },
    });

    return this.buildProfileData(profile, { resolveSecrets: false });
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

