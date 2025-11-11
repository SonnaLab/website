import axios, { AxiosInstance, AxiosError } from 'axios';
import { ContactFormInputs } from '../schemas/contactSchema';
import type { AnalyticsEvent, ConsentPayload } from '../types/analytics';

const API_BASE_URL = import.meta.env.PROD 
  ? import.meta.env.VITE_API_BASE_PROD_URL || 'https://api.sonnalab.com'
  : import.meta.env.VITE_API_BASE_DEV_URL || 'http://localhost:4000';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    });

    // Intercepteur de requête
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Log en dev
        if (import.meta.env.DEV) {
          console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Intercepteur de réponse
    this.client.interceptors.response.use(
      (response) => {
        if (import.meta.env.DEV) {
          console.log(`✅ API Response: ${response.config.url}`, response.data);
        }
        return response;
      },
      (error: AxiosError) => {
        if (error.response) {
          console.error('❌ API Error:', error.response.status, error.response.data);
        } else if (error.request) {
          console.error('❌ Network Error:', error.message);
        } else {
          console.error('❌ Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  // ==================== Contact ====================
  
  async submitContactForm(data: ContactFormInputs) {
    try {
      const response = await this.client.post('/api/v1/contacts', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== Cookie Consent ====================
  
  async sendCookieConsent(data: ConsentPayload) {
    try {
      const response = await this.client.post('/api/v1/analytics/consent', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== Analytics ====================
  
  async sendAnalyticsEvents(events: AnalyticsEvent[], sessionData: {
    id: string;
    userId?: string;
    startTime: number;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    consentedAnalytics: boolean;
    consentedMarketing: boolean;
  }) {
    try {
      const response = await this.client.post('/api/v1/analytics/events', {
        events,
        session: sessionData
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== New Project ====================
  
  async submitNewProject(data: any) {
    try {
      const response = await this.client.post('/api/v1/new/project', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== Newsletter ====================
  
  async subscribeNewsletter(email: string, preferences?: { language?: string; topics?: string[] }) {
    try {
      const response = await this.client.post('/api/v1/newsletter/subscribe', {
        email,
        preferences
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== Blog ====================
  
  async getBlogPosts(params?: { category?: string; limit?: number; offset?: number }) {
    try {
      const response = await this.client.get('/api/v1/blog/posts', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getBlogPost(slug: string) {
    try {
      const response = await this.client.get(`/api/v1/blog/posts/${slug}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // ==================== Utilities ====================
  
  getBaseUrl(): string {
    return API_BASE_URL;
  }

  isProduction(): boolean {
    return import.meta.env.PROD;
  }
}

export const apiService = new ApiService();