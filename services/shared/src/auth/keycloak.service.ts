import { Injectable } from '@nestjs/common';

export interface KeycloakUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified: boolean;
  attributes?: Record<string, string[]>;
  realmRoles?: string[];
}

export interface CreateKeycloakUserDto {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  temporary?: boolean;
  realmRoles?: string[];
  attributes?: Record<string, string[]>;
}

@Injectable()
export class KeycloakAdminService {
  private baseUrl: string;
  private realm: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.baseUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';
    this.realm = process.env.KEYCLOAK_REALM || 'gigachad-grc';
    this.clientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'grc-services';
    const clientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;
    if (!clientSecret) {
      throw new Error('KEYCLOAK_ADMIN_CLIENT_SECRET environment variable is required');
    }
    this.clientSecret = clientSecret;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 30000) {
      return this.accessToken;
    }

    const response = await fetch(
      `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get Keycloak access token: ${response.statusText}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;

    return this.accessToken as string;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/admin/realms/${this.realm}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Keycloak API error: ${response.status} - ${error}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  async getUser(userId: string): Promise<KeycloakUser | null> {
    try {
      return await this.request<KeycloakUser>('GET', `/users/${userId}`);
    } catch {
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<KeycloakUser | null> {
    const users = await this.request<KeycloakUser[]>(
      'GET',
      `/users?email=${encodeURIComponent(email)}&exact=true`
    );
    return users[0] || null;
  }

  async createUser(dto: CreateKeycloakUserDto): Promise<string> {
    const userData = {
      username: dto.username,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      enabled: true,
      emailVerified: true,
      attributes: dto.attributes,
      credentials: dto.password
        ? [
            {
              type: 'password',
              value: dto.password,
              temporary: dto.temporary ?? true,
            },
          ]
        : undefined,
    };

    const response = await fetch(`${this.baseUrl}/admin/realms/${this.realm}/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await this.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create user: ${error}`);
    }

    // Get user ID from Location header
    const location = response.headers.get('Location');
    const userId = location?.split('/').pop();

    if (!userId) {
      throw new Error('Failed to get user ID from response');
    }

    // Assign realm roles if specified
    if (dto.realmRoles && dto.realmRoles.length > 0) {
      await this.assignRealmRoles(userId, dto.realmRoles);
    }

    return userId;
  }

  async updateUser(userId: string, updates: Partial<CreateKeycloakUserDto>): Promise<void> {
    await this.request('PUT', `/users/${userId}`, updates);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.request('DELETE', `/users/${userId}`);
  }

  async assignRealmRoles(userId: string, roleNames: string[]): Promise<void> {
    // Get all realm roles
    const allRoles = await this.request<{ id: string; name: string }[]>('GET', '/roles');

    // Filter to requested roles
    const rolesToAssign = allRoles.filter((r) => roleNames.includes(r.name));

    if (rolesToAssign.length > 0) {
      await this.request('POST', `/users/${userId}/role-mappings/realm`, rolesToAssign);
    }
  }

  async removeRealmRoles(userId: string, roleNames: string[]): Promise<void> {
    const allRoles = await this.request<{ id: string; name: string }[]>('GET', '/roles');

    const rolesToRemove = allRoles.filter((r) => roleNames.includes(r.name));

    if (rolesToRemove.length > 0) {
      await this.request('DELETE', `/users/${userId}/role-mappings/realm`, rolesToRemove);
    }
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const roles = await this.request<{ name: string }[]>(
      'GET',
      `/users/${userId}/role-mappings/realm`
    );
    return roles.map((r) => r.name);
  }

  async setUserAttribute(userId: string, key: string, value: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const attributes = user.attributes || {};
    attributes[key] = [value];

    await this.updateUser(userId, { attributes });
  }

  async resetPassword(userId: string, password: string, temporary = true): Promise<void> {
    await this.request('PUT', `/users/${userId}/reset-password`, {
      type: 'password',
      value: password,
      temporary,
    });
  }
}
