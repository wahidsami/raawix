import { getPrismaClient } from './client.js';
import { SecureStorage } from '../security/storage.js';
import { config } from '../config.js';
import { decryptAuthSecret, encryptAuthSecret, isEncryptedAuthSecret, } from '../security/auth-secret-crypto.js';
/**
 * Repository for managing scan authentication profiles
 * Handles secure storage of credentials (encrypted or env-based)
 */
export class AuthProfileRepository {
    secureStorage;
    buildProfileData(profile, options) {
        const usernameSecret = this.describeSecret(profile.usernameValue);
        const passwordSecret = this.describeSecret(profile.passwordValue);
        const resolveSecrets = options?.resolveSecrets !== false;
        return {
            id: profile.id,
            propertyId: profile.propertyId,
            authType: profile.authType,
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
            postLoginSeedPaths: profile.postLoginSeedPaths,
            extraHeaders: profile.extraHeaders,
            isActive: profile.isActive,
            lastTestedAt: profile.lastTestedAt,
            lastTestResult: profile.lastTestResult,
            lastTestError: profile.lastTestError,
        };
    }
    constructor() {
        this.secureStorage = new SecureStorage(config.outputDir);
    }
    parseSecretReference(value) {
        if (!value)
            return null;
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
    describeSecret(value) {
        if (!value || !value.trim()) {
            return { source: 'missing', envVarName: null };
        }
        const ref = this.parseSecretReference(value);
        if (ref) {
            return { source: 'env', envVarName: ref.envVarName };
        }
        return { source: 'stored', envVarName: null };
    }
    prepareSecretForPersistence(value, options) {
        if (value === undefined)
            return undefined;
        const trimmed = value.trim();
        if (!trimmed)
            return undefined;
        if (this.parseSecretReference(trimmed)) {
            return trimmed;
        }
        if (isEncryptedAuthSecret(trimmed)) {
            return trimmed;
        }
        if (!config.auth.credentialEncryptionKey) {
            if (options?.allowLegacyPlaintext) {
                return trimmed;
            }
            throw new Error('Stored auth secrets require AUTH_CREDENTIAL_ENCRYPTION_KEY. Use env-backed secrets until the encryption key is configured.');
        }
        return encryptAuthSecret(trimmed, config.auth.credentialEncryptionKey);
    }
    resolveSecretValue(value) {
        if (!value || !value.trim()) {
            return null;
        }
        const ref = this.parseSecretReference(value);
        if (!ref) {
            if (isEncryptedAuthSecret(value)) {
                return decryptAuthSecret(value, config.auth.credentialEncryptionKey);
            }
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
    async getByPropertyId(propertyId, options) {
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
    async upsert(propertyId, data) {
        const prisma = await getPrismaClient();
        if (!prisma) {
            throw new Error('Database not available');
        }
        const existing = await prisma.scanAuthProfile.findUnique({
            where: { propertyId },
        });
        const nextUsernameValue = data.usernameValue !== undefined && data.usernameValue.trim() !== ''
            ? data.usernameValue.trim()
            : existing?.usernameValue ?? undefined;
        const nextPasswordValue = data.passwordValue !== undefined && data.passwordValue.trim() !== ''
            ? data.passwordValue.trim()
            : existing?.passwordValue ?? undefined;
        const normalizedUsernameValue = this.prepareSecretForPersistence(nextUsernameValue, {
            allowLegacyPlaintext: data.usernameValue === undefined || data.usernameValue.trim() === '',
        });
        const normalizedPasswordValue = this.prepareSecretForPersistence(nextPasswordValue, {
            allowLegacyPlaintext: data.passwordValue === undefined || data.passwordValue.trim() === '',
        });
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
                postLoginSeedPaths: data.postLoginSeedPaths,
                extraHeaders: data.extraHeaders,
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
                postLoginSeedPaths: data.postLoginSeedPaths,
                extraHeaders: data.extraHeaders,
                isActive: data.isActive ?? true,
                updatedAt: new Date(),
            },
        });
        return this.buildProfileData(profile, { resolveSecrets: false });
    }
    /**
     * Update test result
     */
    async updateTestResult(propertyId, result, error) {
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
    async delete(propertyId) {
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
//# sourceMappingURL=auth-profile-repository.js.map