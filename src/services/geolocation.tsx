import { CountryCode } from 'libphonenumber-js';

interface GeolocationData {
  country_code: CountryCode;
  country: string;
  ip: string;
}

export async function detectUserCountry(): Promise<CountryCode> {
  try {
    // Option 1 : Utiliser ipapi.co (gratuit, sans clé API)
    const response = await fetch('https://ipapi.co/json/');
    
    if (!response.ok) {
      throw new Error('Failed to fetch geolocation');
    }

    const data: GeolocationData = await response.json();
    
    console.log('🌍 Detected country:', data.country_code);
    
    // Valider que c'est un code pays valide
    if (data.country_code && data.country_code.length === 2) {
      return data.country_code.toUpperCase() as CountryCode;
    }

    return 'FR'; // Fallback
  } catch (error) {
    console.warn('Failed to detect country, using default FR:', error);
    return 'FR'; // Fallback par défaut
  }
}

// Cache pour éviter de refaire la requête
let cachedCountry: CountryCode | null = null;

export async function getCachedUserCountry(): Promise<CountryCode> {
  if (cachedCountry) {
    return cachedCountry;
  }

  cachedCountry = await detectUserCountry();
  return cachedCountry;
}