import {
  Application,
  Certificate,
  GeoCheckResult,
  LmoWithWorkload,
  PendencyStats,
  User,
  Business
} from '../types';

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).data = data;
    throw err;
  }
  return data;
}

export const api = {
  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/auth/users');
    const data = await handleResponse<{ users: User[] }>(res);
    return data.users;
  },

  async login(payload: { userId?: string; role?: string; phone?: string; email?: string }): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<{ user: User; token: string }>(res);
  },

  async verify(params: { hash?: string; certNumber?: string }): Promise<{
    verified: boolean;
    certificate?: Certificate;
    message?: string;
  }> {
    const query = new URLSearchParams();
    if (params.hash) query.set('hash', params.hash);
    if (params.certNumber) query.set('certNumber', params.certNumber);

    const res = await fetch(`/api/verify?${query.toString()}`);
    return handleResponse<{ verified: boolean; certificate?: Certificate; message?: string }>(res);
  },

  async geoCheck(payload: {
    shopLat: number;
    shopLon: number;
    inspectorLat: number;
    inspectorLon: number;
    thresholdMeters?: number;
  }): Promise<GeoCheckResult> {
    const res = await fetch('/api/geo-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<GeoCheckResult>(res);
  },

  async getApplications(filters?: {
    traderId?: string;
    lmoId?: string;
    status?: string;
    search?: string;
  }): Promise<Application[]> {
    const query = new URLSearchParams();
    if (filters?.traderId) query.set('traderId', filters.traderId);
    if (filters?.lmoId) query.set('lmoId', filters.lmoId);
    if (filters?.status) query.set('status', filters.status);
    if (filters?.search) query.set('search', filters.search);

    const res = await fetch(`/api/applications?${query.toString()}`);
    const data = await handleResponse<{ applications: Application[] }>(res);
    return data.applications;
  },

  async getApplicationById(id: string): Promise<Application> {
    const res = await fetch(`/api/applications/${id}`);
    const data = await handleResponse<{ application: Application }>(res);
    return data.application;
  },

  async submitApplication(payload: {
    traderId: string;
    businessId: string;
    instrument: any;
    verificationFee?: number;
  }): Promise<Application> {
    const res = await fetch('/api/applications/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await handleResponse<{ application: Application; message: string }>(res);
    return data.application;
  },

  async assignLmo(applicationId: string, lmoId: string, adminId?: string): Promise<Application> {
    const res = await fetch(`/api/applications/${applicationId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lmoId, adminId })
    });
    const data = await handleResponse<{ application: Application }>(res);
    return data.application;
  },

  async submitInspection(applicationId: string, payload: any): Promise<any> {
    const res = await fetch(`/api/applications/${applicationId}/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<any>(res);
  },

  async submitDecision(applicationId: string, payload: {
    lmoId: string;
    decision: 'APPROVED' | 'REJECTED';
    rejectionReason?: string;
    leadSealNumber?: string;
    hologramId?: string;
  }): Promise<{ status: string; certificate?: Certificate; rejectionReason?: string }> {
    const res = await fetch(`/api/applications/${applicationId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<any>(res);
  },

  async getCertificate(id: string): Promise<Certificate> {
    const res = await fetch(`/api/certificates/${id}`);
    const data = await handleResponse<{ certificate: Certificate }>(res);
    return data.certificate;
  },

  async getAdminStats(): Promise<PendencyStats> {
    const res = await fetch('/api/admin/stats');
    return handleResponse<PendencyStats>(res);
  },

  async getLmos(): Promise<LmoWithWorkload[]> {
    const res = await fetch('/api/lmos');
    const data = await handleResponse<{ lmos: LmoWithWorkload[] }>(res);
    return data.lmos;
  },

  async getBusinesses(traderId?: string): Promise<Business[]> {
    const query = traderId ? `?traderId=${traderId}` : '';
    const res = await fetch(`/api/businesses${query}`);
    const data = await handleResponse<{ businesses: Business[] }>(res);
    return data.businesses;
  }
};
