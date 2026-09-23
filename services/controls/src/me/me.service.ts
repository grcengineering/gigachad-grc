import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { STORAGE_PROVIDER, StorageProvider, sanitizeFilename } from '@gigachad-grc/shared';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { PrismaService } from '../prisma/prisma.service';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateApiKeyDto } from '../api-keys/dto/api-key.dto';
import { NotificationPreferenceDto } from '../notifications/dto/notification.dto';
import { ChangeMyPasswordDto, UpdateMeDto } from './dto/me.dto';

export interface IdentityCapabilities {
  accountConsoleAvailable: boolean;
  passwordApiAvailable: boolean;
  totpApiAvailable: boolean;
  sessionsApiAvailable: boolean;
  accountUrl: string | null;
}

interface KeycloakCredential {
  id: string;
  type: string;
  userLabel?: string;
  createdDate?: number;
}

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeys: ApiKeysService,
    private readonly notifications: NotificationsService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider
  ) {}

  async getMe(organizationId: string, userId: string) {
    const user = await this.getUser(organizationId, userId);
    const preferences = this.asPreferences(user.preferences);
    const [apiKeys, notifications] = await Promise.all([
      this.apiKeys.findForUser(organizationId, userId),
      this.notifications.getPreferences(userId),
    ]);

    return {
      id: user.id,
      name: user.displayName,
      email: user.email,
      role: user.role,
      avatarUrl: preferences.avatarStoragePath ? '/api/me/avatar' : null,
      timezone: typeof preferences.timezone === 'string' ? preferences.timezone : 'UTC',
      twoFactorEnabled: null,
      identity: this.getIdentityCapabilities(),
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt || null,
        scopes: key.scopes,
      })),
      notifications: notifications.map((preference) => ({
        key: preference.notificationType,
        label: preference.typeName,
        description: preference.description,
        email: preference.email,
        inApp: preference.inApp,
      })),
    };
  }

  async updateMe(organizationId: string, userId: string, dto: UpdateMeDto) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: dto.timezone }).format();
    } catch {
      throw new BadRequestException('Invalid IANA timezone');
    }

    const user = await this.getUser(organizationId, userId);
    const name = dto.name.trim().replace(/\s+/g, ' ');
    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ');
    let identitySynchronized = false;

    if (this.getIdentityCapabilities().totpApiAvailable) {
      await this.identityRequest('PUT', `/users/${encodeURIComponent(user.keycloakId)}`, {
        firstName,
        lastName,
      });
      identitySynchronized = true;
    }

    const preferences = this.asPreferences(user.preferences);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        displayName: name,
        preferences: {
          ...preferences,
          timezone: dto.timezone,
        } as Prisma.InputJsonValue,
      },
    });
    return {
      id: updated.id,
      name: updated.displayName,
      timezone: dto.timezone,
      identitySynchronized,
    };
  }

  async uploadAvatar(
    organizationId: string,
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string }
  ) {
    const user = await this.getUser(organizationId, userId);
    const preferences = this.asPreferences(user.preferences);
    const extensionByMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const extension = extensionByMime[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Avatar must be a JPEG, PNG, or WebP image');
    }
    const safeOriginalName = sanitizeFilename(file.originalname);
    const storagePath = `avatars/${organizationId}/${userId}/${randomUUID()}${extension}`;

    await this.storage.upload(file.buffer, storagePath, {
      contentType: file.mimetype,
      metadata: { originalName: safeOriginalName, userId },
      acl: 'private',
    });
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          preferences: {
            ...preferences,
            avatarStoragePath: storagePath,
            avatarContentType: file.mimetype,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      await this.storage.delete(storagePath);
      throw error;
    }

    if (typeof preferences.avatarStoragePath === 'string') {
      await this.storage.delete(preferences.avatarStoragePath);
    }
    return { avatarUrl: '/api/me/avatar' };
  }

  async getAvatar(
    organizationId: string,
    userId: string
  ): Promise<{ stream: Readable; contentType: string }> {
    const user = await this.getUser(organizationId, userId);
    const preferences = this.asPreferences(user.preferences);
    if (typeof preferences.avatarStoragePath !== 'string') {
      throw new NotFoundException('Avatar not found');
    }
    return {
      stream: await this.storage.download(preferences.avatarStoragePath),
      contentType:
        typeof preferences.avatarContentType === 'string'
          ? preferences.avatarContentType
          : 'application/octet-stream',
    };
  }

  async createApiKey(organizationId: string, userId: string, email: string, dto: CreateApiKeyDto) {
    return this.apiKeys.create(organizationId, dto, userId, email);
  }

  async revokeApiKey(
    organizationId: string,
    userId: string,
    email: string,
    keyId: string
  ): Promise<void> {
    return this.apiKeys.revokeForUser(keyId, organizationId, userId, email);
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: NotificationPreferenceDto[]
  ): Promise<void> {
    await this.notifications.updatePreferences(userId, preferences);
  }

  getSecurityStatus() {
    const identity = this.getIdentityCapabilities();
    return {
      identity,
      twoFactorEnabled: null,
      status: identity.totpApiAvailable
        ? 'available'
        : identity.accountConsoleAvailable
          ? 'provider_managed'
          : 'unavailable',
    };
  }

  async getTotpStatus(organizationId: string, userId: string) {
    const user = await this.getUser(organizationId, userId);
    const identity = this.getIdentityCapabilities();
    if (!identity.totpApiAvailable) {
      return {
        enabled: null,
        status: identity.accountConsoleAvailable ? 'provider_managed' : 'unavailable',
        setupUrl: identity.accountUrl,
      };
    }
    const credentials = await this.identityRequest<KeycloakCredential[]>(
      'GET',
      `/users/${encodeURIComponent(user.keycloakId)}/credentials`
    );
    return {
      enabled: credentials.some((credential) => credential.type === 'otp'),
      status: 'available',
      setupUrl: identity.accountUrl,
    };
  }

  async beginTotpSetup(organizationId: string, userId: string) {
    const user = await this.getUser(organizationId, userId);
    const identity = this.getIdentityCapabilities();
    if (!identity.accountConsoleAvailable) {
      throw new ServiceUnavailableException('The identity provider account console is unavailable');
    }
    if (identity.totpApiAvailable) {
      const representation = await this.identityRequest<Record<string, unknown>>(
        'GET',
        `/users/${encodeURIComponent(user.keycloakId)}`
      );
      const actions = Array.isArray(representation.requiredActions)
        ? (representation.requiredActions as string[])
        : [];
      await this.identityRequest('PUT', `/users/${encodeURIComponent(user.keycloakId)}`, {
        ...representation,
        requiredActions: [...new Set([...actions, 'CONFIGURE_TOTP'])],
      });
    }
    return {
      status: 'external_action_required',
      setupUrl: identity.accountUrl,
      message: 'Complete TOTP enrollment in the identity provider account console.',
    };
  }

  async disableTotp(organizationId: string, userId: string, currentPassword: string) {
    const user = await this.getUser(organizationId, userId);
    const capabilities = this.getIdentityCapabilities();
    if (!capabilities.totpApiAvailable || !capabilities.passwordApiAvailable) {
      throw new ServiceUnavailableException(
        'Direct TOTP removal is unavailable; use the identity provider account console'
      );
    }
    await this.verifyCurrentPassword(user.email, currentPassword);
    const credentials = await this.identityRequest<KeycloakCredential[]>(
      'GET',
      `/users/${encodeURIComponent(user.keycloakId)}/credentials`
    );
    const otpCredentials = credentials.filter((credential) => credential.type === 'otp');
    for (const credential of otpCredentials) {
      await this.identityRequest(
        'DELETE',
        `/users/${encodeURIComponent(user.keycloakId)}/credentials/${encodeURIComponent(credential.id)}`
      );
    }
    return { status: 'completed', removed: otpCredentials.length };
  }

  async changePassword(organizationId: string, userId: string, dto: ChangeMyPasswordDto) {
    const user = await this.getUser(organizationId, userId);
    const capabilities = this.getIdentityCapabilities();
    if (!capabilities.passwordApiAvailable) {
      if (!capabilities.accountConsoleAvailable) {
        throw new ServiceUnavailableException('Password management is unavailable');
      }
      return {
        status: 'external_action_required',
        setupUrl: capabilities.accountUrl,
        message: 'Change your password in the identity provider account console.',
      };
    }

    await this.verifyCurrentPassword(user.email, dto.currentPassword);
    await this.identityRequest(
      'PUT',
      `/users/${encodeURIComponent(user.keycloakId)}/reset-password`,
      {
        type: 'password',
        value: dto.newPassword,
        temporary: false,
      }
    );
    await this.identityRequest('POST', `/users/${encodeURIComponent(user.keycloakId)}/logout`);
    return {
      status: 'completed',
      message: 'Password changed. Other identity-provider sessions were signed out.',
    };
  }

  async getSessions(organizationId: string, userId: string) {
    const user = await this.getUser(organizationId, userId);
    const identity = this.getIdentityCapabilities();
    if (!identity.sessionsApiAvailable) {
      return {
        status: identity.accountConsoleAvailable ? 'provider_managed' : 'unavailable',
        sessions: [],
        manageUrl: identity.accountUrl,
      };
    }
    const sessions = await this.identityRequest<
      Array<{
        id: string;
        ipAddress?: string;
        start?: number;
        lastAccess?: number;
        clients?: Record<string, string>;
      }>
    >('GET', `/users/${encodeURIComponent(user.keycloakId)}/sessions`);
    return {
      status: 'available',
      manageUrl: identity.accountUrl,
      sessions: sessions.map((session) => ({
        id: session.id,
        ipAddress: session.ipAddress || 'Unknown',
        startedAt: session.start ? new Date(session.start).toISOString() : null,
        lastAccessAt: session.lastAccess ? new Date(session.lastAccess).toISOString() : null,
        clients: Object.values(session.clients || {}),
      })),
    };
  }

  async revokeSession(organizationId: string, userId: string, sessionId: string): Promise<void> {
    const user = await this.getUser(organizationId, userId);
    if (!this.getIdentityCapabilities().sessionsApiAvailable) {
      throw new ServiceUnavailableException('Identity-provider session management is unavailable');
    }
    const sessions = await this.identityRequest<Array<{ id: string }>>(
      'GET',
      `/users/${encodeURIComponent(user.keycloakId)}/sessions`
    );
    if (!sessions.some((session) => session.id === sessionId)) {
      throw new NotFoundException('Session not found');
    }
    await this.identityRequest('DELETE', `/sessions/${encodeURIComponent(sessionId)}`);
  }

  private async getUser(organizationId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
    });
    if (!user) {
      throw new NotFoundException('Current user not found');
    }
    return user;
  }

  private asPreferences(value: Prisma.JsonValue): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private getIdentityCapabilities(): IdentityCapabilities {
    const baseUrl = process.env.KEYCLOAK_URL?.replace(/\/$/, '');
    const realm = process.env.KEYCLOAK_REALM || 'gigachad-grc';
    const adminAvailable = Boolean(
      baseUrl && process.env.KEYCLOAK_ADMIN_CLIENT_ID && process.env.KEYCLOAK_ADMIN_CLIENT_SECRET
    );
    const passwordApiAvailable = Boolean(
      adminAvailable && (process.env.KEYCLOAK_PASSWORD_CLIENT_ID || process.env.KEYCLOAK_CLIENT_ID)
    );
    return {
      accountConsoleAvailable: Boolean(baseUrl),
      passwordApiAvailable,
      totpApiAvailable: adminAvailable,
      sessionsApiAvailable: adminAvailable,
      accountUrl: baseUrl
        ? `${baseUrl}/realms/${encodeURIComponent(realm)}/account/#/account-security/signing-in`
        : null,
    };
  }

  private async verifyCurrentPassword(email: string, password: string): Promise<void> {
    const baseUrl = process.env.KEYCLOAK_URL?.replace(/\/$/, '');
    const realm = process.env.KEYCLOAK_REALM || 'gigachad-grc';
    const clientId = process.env.KEYCLOAK_PASSWORD_CLIENT_ID || process.env.KEYCLOAK_CLIENT_ID;
    if (!baseUrl || !clientId) {
      throw new ServiceUnavailableException('Direct password verification is unavailable');
    }
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      username: email,
      password,
    });
    if (process.env.KEYCLOAK_PASSWORD_CLIENT_SECRET) {
      body.set('client_secret', process.env.KEYCLOAK_PASSWORD_CLIENT_SECRET);
    }
    let response: Response;
    try {
      response = await fetch(
        `${baseUrl}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        }
      );
    } catch {
      throw new ServiceUnavailableException('Could not reach the identity provider');
    }
    if (!response.ok) {
      if (response.status === 400 || response.status === 401) {
        throw new BadRequestException('Current password is incorrect');
      }
      throw new ServiceUnavailableException('Identity provider rejected password verification');
    }
  }

  private async identityRequest<T = void>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const baseUrl = process.env.KEYCLOAK_URL?.replace(/\/$/, '');
    const realm = process.env.KEYCLOAK_REALM || 'gigachad-grc';
    const clientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID;
    const clientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;
    if (!baseUrl || !clientId || !clientSecret) {
      throw new ServiceUnavailableException('Identity provider administration is unavailable');
    }

    let tokenResponse: Response;
    try {
      tokenResponse = await fetch(
        `${baseUrl}/realms/${encodeURIComponent(realm)}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
          }),
        }
      );
    } catch {
      throw new ServiceUnavailableException('Could not reach the identity provider');
    }
    if (!tokenResponse.ok) {
      throw new ServiceUnavailableException('Identity provider administration is unavailable');
    }
    const token = (await tokenResponse.json()) as { access_token: string };
    const response = await fetch(`${baseUrl}/admin/realms/${encodeURIComponent(realm)}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Identity provider operation failed (${response.status})`
      );
    }
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }
    return (await response.json()) as T;
  }
}
