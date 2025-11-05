export const API_CONFIG = {
  BASE_URL: import.meta.env.PROD 
    ? 'https://api.sonnalab.com' 
    : 'http://localhost:8000',
  ENDPOINTS: {
    NEW_PROJECT: '/new/project',
    CONTACT: '/contact',
  },
  TIMEOUT: 10000, // 10 secondes
};

export function getApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}