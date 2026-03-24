import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface ApiKey {
  id: string;
  keyId: string;
  name: string;
  description?: string;
  status: 'active' | 'revoked' | 'expired';
  lastUsedAt?: string;
  expiresAt?: string;
  usageCount: number;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyData {
  name: string;
  description?: string;
  permissions?: string[];
  expiresAt?: string;
}

export interface GenerateApiKeyResponse {
  apiKey: ApiKey;
  plainTextKey: string;
}

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  refreshToken: async (): Promise<AuthResponse> => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  getProfile: async (): Promise<AuthResponse> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
};

// API Keys API
export const apiKeyApi = {
  getAll: async (): Promise<ApiKey[]> => {
    const response = await api.get('/api-keys');
    return response.data;
  },

  getById: async (id: string): Promise<ApiKey> => {
    const response = await api.get(`/api-keys/${id}`);
    return response.data;
  },

  generate: async (data: CreateApiKeyData): Promise<GenerateApiKeyResponse> => {
    const response = await api.post('/api-keys', data);
    return response.data;
  },

  rotate: async (id: string): Promise<GenerateApiKeyResponse> => {
    const response = await api.post(`/api-keys/${id}/rotate`);
    return response.data;
  },

  revoke: async (id: string): Promise<ApiKey> => {
    const response = await api.post(`/api-keys/${id}/revoke`);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateApiKeyData>): Promise<ApiKey> => {
    const response = await api.patch(`/api-keys/${id}`, data);
    return response.data;
  },
};

export default api;
