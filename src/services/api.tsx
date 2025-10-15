import axios, { AxiosInstance, AxiosError } from 'axios';
import { ContactFormInputs } from '../schemas/contactSchema';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.sonnalab.com';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Intercepteur de requête
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Intercepteur de réponse
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          console.error('API Error:', error.response.data);
        } else if (error.request) {
          console.error('Network Error:', error.request);
        } else {
          console.error('Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  async submitContactForm(data: ContactFormInputs) {
    try {
      const response = await this.client.post('/api/v1/contact', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export const apiService = new ApiService();