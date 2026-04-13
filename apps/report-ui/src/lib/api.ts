// API client for dashboard
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    createdAt?: string;
  };
}

export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('raawix_token', token);
    } else {
      localStorage.removeItem('raawix_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('raawix_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return response.json();
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.token);
    return response;
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // User management (admin only)
  async getUsers(): Promise<{ users: User[] }> {
    return this.get<{ users: User[] }>('/api/users');
  }

  async createUser(body: { email: string; password: string; role?: string }): Promise<{ user: User }> {
    return this.post<{ user: User }>('/api/users', body);
  }

  async updateUser(id: string, body: { role?: string; newPassword?: string }): Promise<{ user: User }> {
    return this.request<{ user: User }>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.request(`/api/users/${id}`, { method: 'DELETE' });
  }

  // Generic HTTP methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Dashboard API methods
  async getScans(params?: {
    status?: string;
    hostname?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    scans: Array<{
      scanId: string;
      seedUrl: string;
      status: string;
      startedAt: string;
      completedAt?: string;
      hostname: string;
      summary: {
        totalPages: number;
        aFailures: number;
        aaFailures: number;
        needsReview?: number;
      };
    }>;
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.request(`/api/scans${query ? `?${query}` : ''}`);
  }

  async getScanDetail(scanId: string): Promise<any> {
    return this.request(`/api/scans/${scanId}/detail`);
  }

  async getScanDebug(scanId: string): Promise<any> {
    return this.request(`/api/scans/${scanId}/debug`);
  }

  async cancelScan(scanId: string): Promise<{ scanId: string; status: string; message: string }> {
    return this.request<{ scanId: string; status: string; message: string }>(
      `/api/scans/${scanId}/cancel`,
      {
        method: 'POST',
      }
    );
  }

  async resumeScan(scanId: string, code: string): Promise<{ scanId: string; status: string; message: string }> {
    return this.request<{ scanId: string; status: string; message: string }>(
      `/api/scans/${scanId}/resume`,
      {
        method: 'POST',
        body: JSON.stringify({ code }),
      }
    );
  }

  async getScannerConfig(): Promise<{
    allowedPorts: number[];
    allowAllPorts: boolean;
    allowLocalhost: boolean;
    maxPagesHardLimit: number;
    maxDepthHardLimit: number;
  }> {
    // No auth required - this endpoint returns safe config values only
    return this.request<{
      allowedPorts: number[];
      allowAllPorts: boolean;
      allowLocalhost: boolean;
      maxPagesHardLimit: number;
      maxDepthHardLimit: number;
    }>('/api/scanner/config');
  }

  async deleteScan(scanId: string): Promise<{ message: string; deleted: any }> {
    return this.request(`/api/scans/${scanId}`, {
      method: 'DELETE',
    });
  }

  async exportPDF(scanId: string, locale: 'en' | 'ar' = 'en'): Promise<Blob> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api/reports/export`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ scanId, format: 'pdf', locale }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.blob();
  }

  async exportExcel(scanId: string, locale: 'en' | 'ar' = 'en'): Promise<Blob> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/api/scans/${scanId}/export/excel?locale=${locale}`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.blob();
  }

  async getComplianceScores(level: 'scan' | 'property' | 'entity', id: string): Promise<any> {
    return this.request(`/api/compliance/${level}/${id}`);
  }

  async getSites(): Promise<{
    sites: Array<{
      id: string;
      domain: string;
      createdAt: string;
      lastScan?: {
        scanId: string;
        completedAt: string;
        totalPages: number;
        aFailures: number;
        aaFailures: number;
      };
      totalScans: number;
      issueSummary: {
        total: number;
        critical: number;
        important: number;
      };
    }>;
  }> {
    return this.request('/api/sites');
  }

  async getFindings(params?: {
    site?: string;
    scanId?: string;
    wcagId?: string;
    status?: string;
    confidence?: string;
    limit?: number;
    offset?: number;
    entityId?: string;
  }): Promise<{
    findings: Array<{
      id: string;
      ruleId: string;
      wcagId?: string;
      level?: string;
      status: string;
      confidence: string;
      message?: string;
      howToVerify?: string;
      evidence?: Array<{
        type: string;
        value: string;
        selector?: string;
        description?: string;
      }>;
      site?: string;
      scanId?: string;
      pageUrl?: string;
      pageNumber?: number;
    }>;
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.request(`/api/findings${query ? `?${query}` : ''}`);
  }

  async getOverview(): Promise<{
    kpis: {
      totalSites: number;
      totalScans: number;
      pagesScanned: number;
      wcagAFailures: number;
      wcagAAFailures: number;
      needsReview: number;
      visionFindings: number;
    };
    charts: {
      scansOverTime: Array<{ date: string; count: number }>;
      failuresByLevel: Array<{ level: string; failures: number }>;
      topFailingRules: Array<{ rule: string; failures: number }>;
      topAffectedSites: Array<{ domain: string; issues: number }>;
    };
  }> {
    return this.request('/api/overview');
  }

  async getWidgetAnalytics(): Promise<{
    uniqueSessions: number;
    widgetOpens: number;
    voiceUsage: number;
    topPages: Array<{ url: string; count: number }>;
    dailyUsage: Array<{ date: string; sessions: number; opens: number }>;
    commandUsage: Array<{ command: string; count: number }>;
  }> {
    return this.request('/api/analytics/widget');
  }

  async getAssistiveMaps(): Promise<{
    maps: Array<{
      id: string;
      siteId: string;
      domain: string;
      canonicalUrl: string;
      generatedAt: string;
      confidenceSummary: {
        high: number;
        medium: number;
        low: number;
      };
      pageVersionId: string;
    }>;
  }> {
    return this.request('/api/assistive-maps');
  }

  // Entity API methods
  async getEntities(params?: {
    status?: string;
    type?: string;
    search?: string;
  }): Promise<{
    entities: Array<{
      id: string;
      nameEn: string;
      nameAr?: string;
      type: string;
      sector?: string;
      status: string;
      notes?: string;
      createdAt: string;
      updatedAt: string;
      _count: {
        properties: number;
        scans: number;
        contacts: number;
      };
      properties?: Array<{
        id: string;
        domain: string;
        displayNameEn?: string;
        displayNameAr?: string;
        isPrimary: boolean;
      }>;
    }>;
  }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.request(`/api/entities${query ? `?${query}` : ''}`);
  }

  async getEntity(id: string): Promise<{
    entity: {
      id: string;
      nameEn: string;
      nameAr?: string;
      type: string;
      sector?: string;
      status: string;
      notes?: string;
      createdAt: string;
      updatedAt: string;
      contacts: Array<{
        id: string;
        name: string;
        email: string;
        phone?: string;
        role?: string;
        isPrimary: boolean;
      }>;
      properties: Array<{
        id: string;
        domain: string;
        displayNameEn?: string;
        displayNameAr?: string;
        isPrimary: boolean;
        _count: {
          sites: number;
          scans: number;
        };
        sites?: Array<{
          id: string;
          domain: string;
        }>;
      }>;
      _count: {
        scans: number;
        properties: number;
        contacts: number;
      };
    };
  }> {
    return this.request(`/api/entities/${id}`);
  }

  async createEntity(data: {
    nameEn: string;
    nameAr?: string;
    type: 'government' | 'private';
    sector?: string;
    status?: 'active' | 'onboarding' | 'paused';
    notes?: string;
  }): Promise<{ entity: any }> {
    return this.request('/api/entities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEntity(id: string, data: Partial<{
    nameEn: string;
    nameAr?: string;
    type: 'government' | 'private';
    sector?: string;
    status?: 'active' | 'onboarding' | 'paused';
    notes?: string;
  }>): Promise<{ entity: any }> {
    return this.request(`/api/entities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEntity(id: string): Promise<{ message: string }> {
    return this.request(`/api/entities/${id}`, {
      method: 'DELETE',
    });
  }

  async addEntityContact(entityId: string, data: {
    name: string;
    email: string;
    phone?: string;
    role?: string;
    isPrimary?: boolean;
  }): Promise<{ contact: any }> {
    return this.request(`/api/entities/${entityId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addEntityProperty(entityId: string, data: {
    domain: string;
    displayNameEn?: string;
    displayNameAr?: string;
    isPrimary?: boolean;
  }): Promise<{ property: any }> {
    return this.request(`/api/entities/${entityId}/properties`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEntityProperty(
    entityId: string,
    propertyId: string,
    data: {
      domain?: string;
      displayNameEn?: string;
      displayNameAr?: string;
      isPrimary?: boolean;
      defaultScanPipeline?: Record<string, unknown> | null;
    }
  ): Promise<{ property: any }> {
    return this.request(`/api/entities/${entityId}/properties/${propertyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getProperties(params?: {
    entityId?: string;
    domain?: string;
  }): Promise<{
    properties: Array<{
      id: string;
      entityId: string;
      domain: string;
      displayNameEn?: string;
      displayNameAr?: string;
      isPrimary: boolean;
      defaultScanPipeline?: unknown;
      entity: {
        id: string;
        nameEn: string;
        nameAr?: string;
      };
      _count: {
        sites: number;
        scans: number;
      };
      scans?: Array<{
        scanId: string;
        completedAt?: string;
        status: string;
      }>;
    }>;
  }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.request(`/api/entities/properties/list${query ? `?${query}` : ''}`);
  }

  async getPropertyAuthProfile(propertyId: string): Promise<{
    id: string;
    propertyId: string;
    authType: 'none' | 'cookie' | 'scripted_login';
    loginUrl?: string | null;
    successUrlPrefix?: string | null;
    successSelector?: string | null;
    usernameSelector?: string | null;
    passwordSelector?: string | null;
    submitSelector?: string | null;
    usernameSecretSource?: 'missing' | 'stored' | 'env';
    passwordSecretSource?: 'missing' | 'stored' | 'env';
    usernameEnvVarName?: string | null;
    passwordEnvVarName?: string | null;
    usernameEnvVarPresent?: boolean | null;
    passwordEnvVarPresent?: boolean | null;
    hasUsernameValue?: boolean;
    hasPasswordValue?: boolean;
    secretHealth?: 'ready' | 'missing_env';
    postLoginSeedPaths?: string[] | null;
    extraHeaders?: Record<string, string> | null;
    isActive: boolean;
    lastTestedAt?: string | null;
    lastTestResult?: string | null;
    lastTestError?: string | null;
  }> {
    return this.request(`/api/properties/${propertyId}/auth-profile`);
  }

  async savePropertyAuthProfile(
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
  ): Promise<{
    id: string;
    propertyId: string;
    authType: 'none' | 'cookie' | 'scripted_login';
    loginUrl?: string | null;
    successUrlPrefix?: string | null;
    successSelector?: string | null;
    usernameSelector?: string | null;
    passwordSelector?: string | null;
    submitSelector?: string | null;
    usernameSecretSource?: 'missing' | 'stored' | 'env';
    passwordSecretSource?: 'missing' | 'stored' | 'env';
    usernameEnvVarName?: string | null;
    passwordEnvVarName?: string | null;
    usernameEnvVarPresent?: boolean | null;
    passwordEnvVarPresent?: boolean | null;
    hasUsernameValue?: boolean;
    hasPasswordValue?: boolean;
    secretHealth?: 'ready' | 'missing_env';
    postLoginSeedPaths?: string[] | null;
    extraHeaders?: Record<string, string> | null;
    isActive: boolean;
    lastTestedAt?: string | null;
    lastTestResult?: string | null;
    lastTestError?: string | null;
  }> {
    return this.request(`/api/properties/${propertyId}/auth-profile`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async testPropertyAuthProfile(propertyId: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    return this.request(`/api/properties/${propertyId}/auth-profile/test`, {
      method: 'POST',
    });
  }

  async detectPropertyAuthProfile(
    propertyId: string,
    data: {
      loginUrl: string;
      usernameValue: string;
      passwordValue?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    error?: string;
    loginSucceeded: boolean;
    verificationCheckpointDetected: boolean;
    detected: {
      loginUrl: string;
      usernameSelector?: string;
      passwordSelector?: string;
      submitSelector?: string;
      successUrlPrefix?: string | null;
      successSelector?: string | null;
      postLoginSeedPaths: string[];
      confidence: 'high' | 'medium' | 'low';
      notes: string[];
    };
  }> {
    return this.request(`/api/properties/${propertyId}/auth-profile/detect`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePropertyAuthProfile(propertyId: string): Promise<{ success: boolean }> {
    return this.request(`/api/properties/${propertyId}/auth-profile`, {
      method: 'DELETE',
    });
  }

  async startScan(data: {
    entityId?: string;
    propertyId?: string;
    authProfileId?: string;
    seedUrl: string;
    maxPages: number;
    maxDepth: number;
    scanPipeline?: {
      layer1?: boolean;
      layer2?: boolean;
      layer3?: boolean;
      analysisAgent?: boolean;
      screenshotMode?: 'none' | 'viewport' | 'full';
      scanPreset?: 'full' | 'fast';
    };
  }): Promise<{
    scanId: string;
    status: string;
    message: string;
  }> {
    return this.request('/api/scans/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();

