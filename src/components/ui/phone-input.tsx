import React from 'react';
import { Input } from './input';
import { CountrySelector } from './country-selector';
import { CountryCode, parsePhoneNumber, getCountryCallingCode } from 'libphonenumber-js';
import '../../styles/contact.css';

interface PhoneInputProps {
  value: string;
  onChange: (value: string | undefined) => void;
  defaultCountry?: CountryCode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  defaultCountry = 'FR',
  placeholder = 'Numéro de téléphone',    
  disabled = false,
  className = '',
  error = false,
}: PhoneInputProps) {
  const [country, setCountry] = React.useState<CountryCode>(defaultCountry);

  // Synchroniser le pays avec le numéro existant
  React.useEffect(() => {
    if (value && value.startsWith('+')) {
      try {
        const parsed = parsePhoneNumber(value);
        if (parsed?.country && parsed.country !== country) {
          setCountry(parsed.country);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }, [value]);

  // Mettre à jour le pays par défaut initial
  React.useEffect(() => {
    if (defaultCountry && !value) {
      setCountry(defaultCountry);
    }
  }, [defaultCountry, value]);

  const handleCountryChange = (newCountry: CountryCode) => {
    setCountry(newCountry);
    
    // Si un numéro existe, essayer de le reformater avec le nouveau pays
    if (value) {
      try {
        const callingCode = getCountryCallingCode(newCountry);
        // Garder les chiffres uniquement
        const digits = value.replace(/\D/g, '');
        onChange(`+${callingCode}${digits.replace(new RegExp(`^${callingCode}`), '')}`);
      } catch (e) {
        onChange(undefined);
      }
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // Supprimer tout sauf les chiffres et le +
    inputValue = inputValue.replace(/[^\d+]/g, '');
    
    try {
      // Si l'utilisateur tape un +, laisser faire
      if (inputValue.startsWith('+')) {
        onChange(inputValue);
        return;
      }

      // Sinon, formater avec le code pays actuel
      const callingCode = getCountryCallingCode(country);
      const fullNumber = `+${callingCode}${inputValue}`;
      
      const parsed = parsePhoneNumber(fullNumber);
      if (parsed && parsed.isValid()) {
        onChange(parsed.format('E.164'));
      } else {
        onChange(fullNumber);
      }
    } catch (e) {
      // En cas d'erreur, utiliser la valeur brute avec le code pays
      const callingCode = getCountryCallingCode(country);
      onChange(`+${callingCode}${inputValue}`);
    }
  };

  // Extraire le numéro local pour l'affichage
  const displayValue = React.useMemo(() => {
    if (!value) return '';
    
    try {
      const parsed = parsePhoneNumber(value);
      if (parsed) {
        // Retourner le numéro national formaté (sans code pays)
        return parsed.formatNational();
      }
    } catch (e) {
      // Si parsing échoue, extraire manuellement
      try {
        const callingCode = getCountryCallingCode(country);
        return value.replace(`+${callingCode}`, '').trim();
      } catch {
        return value;
      }
    }
    
    return value;
  }, [value, country]);

  return (
    <div className={`phone-input-wrapper ${className} ${error ? 'phone-input-error' : ''}`}>
      {/* Country Selector */}
      <CountrySelector
        value={country}
        onChange={handleCountryChange}
        disabled={disabled}
      />
      
      {/* Divider */}
      <div className="phone-input-divider" />
      
      {/* Phone Number Input */}
      <Input
        type="tel"
        value={displayValue}
        onChange={handleNumberChange}
        placeholder={placeholder}
        disabled={disabled}
        className="phone-input-field border-0 focus:ring-0 shadow-none"
      />
    </div>
  );
}