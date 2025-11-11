import React, { useState, useMemo, useCallback } from 'react';
import { Search, X, Globe, Check, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';
import { CountryCode } from 'libphonenumber-js';

interface CountrySelectorProps {
  value?: CountryCode;
  onChange: (country: CountryCode) => void;
  disabled?: boolean;
}

function getCountryName(code: string, locale: string = 'fr'): string {
  try {
    const regionNames = new Intl.DisplayNames([locale], { type: 'region' });
    return regionNames.of(code) || code;
  } catch {
    return code;
  }
}

// ✅ Pays populaires avec codes valides uniquement
const POPULAR_COUNTRIES: CountryCode[] = [
  'FR', // France
  'US', // États-Unis
  'GB', // Royaume-Uni
  'DE', // Allemagne
  'ES', // Espagne
  'IT', // Italie
  'CA', // Canada
  'BE', // Belgique
  'CH', // Suisse
  'MA', // Maroc
  'DZ', // Algérie
  'TN', // Tunisie
];

// ✅ Créer un composant FlagImage mémorisé
const FlagImage = React.memo(({ code, name, className }: { code: string; name: string; className: string }) => {
  const [error, setError] = React.useState(false);

  if (error) {
    return (
      <div className={`${className} bg-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-500`}>
        {code}
      </div>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w80/${code.toLowerCase()}.png`}
      alt={name}
      className={className}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
});

FlagImage.displayName = 'FlagImage';

export function CountrySelector({ value, onChange, disabled }: CountrySelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ Générer la liste complète des pays (une seule fois, mémorisé)
  const allCountries = useMemo(() => {
    const countries = getCountries()
      .map((code) => {
        try {
          return {
            code,
            name: getCountryName(code),
            callingCode: getCountryCallingCode(code),
          };
        } catch (e) {
          // Ignorer les codes pays invalides
          return null;
        }
      })
      .filter((country): country is NonNullable<typeof country> => country !== null)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    console.log('✅ Countries loaded:', countries.length);
    return countries;
  }, []);

  // ✅ Filtrer les pays selon la recherche (optimisé)
  const filteredCountries = useMemo(() => {
    if (!searchQuery) return allCountries;
    
    const query = searchQuery.toLowerCase().trim();
    return allCountries.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query) ||
        country.callingCode.includes(query)
    );
  }, [allCountries, searchQuery]);

  // ✅ Pays populaires (mémorisé)
  const popularCountries = useMemo(() => {
    return POPULAR_COUNTRIES.map(code => 
      allCountries.find(c => c.code === code)
    ).filter((country): country is NonNullable<typeof country> => country !== null);
  }, [allCountries]);

  const selectedCountry = useMemo(
    () => allCountries.find((c) => c.code === value),
    [allCountries, value]
  );

  // ✅ Handler optimisé avec useCallback
  const handleSelect = useCallback((code: CountryCode) => {
    onChange(code);
    setOpen(false);
    setSearchQuery('');
  }, [onChange]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex-shrink-0"
      >
        {selectedCountry ? (
          <>
            <FlagImage
              code={selectedCountry.code.toLowerCase()}
              name={selectedCountry.name}
              className="w-6 h-4 object-cover rounded shadow-sm"
            />
            <span className="text-sm font-semibold text-gray-900">+{selectedCountry.callingCode}</span>
          </>
        ) : (
          <>
            <Globe className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">Pays</span>
          </>
        )}
      </button>

      {/* Modal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="country-selector-dialog max-w-lg p-0 gap-0">
          {/* Header avec gradient */}
          <DialogHeader className="country-selector-header px-6 pt-6 pb-4 border-b">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-bold text-black">
                  Sélectionner un pays
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 mt-0.5">
                  {filteredCountries.length} pays disponible{filteredCountries.length > 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom ou code..."
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </DialogHeader>

          {/* Accès rapide - Pays populaires */}
          {!searchQuery && popularCountries.length > 0 && (
            <div className="country-quick-access px-6 py-4 bg-gray-50/50 border-b">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-gray-600" />
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Accès rapide
                </h3>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {popularCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleSelect(country.code)}
                    className={`group relative aspect-square rounded-lg border-2 transition-all hover:scale-105 active:scale-95 ${
                      value === country.code
                        ? 'border-black bg-black shadow-lg'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}
                    title={`${country.name} (+${country.callingCode})`}
                  >
                    <FlagImage
                      code={country.code.toLowerCase()}
                      name={country.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                    {value === country.code && (
                      <div className="absolute inset-0 bg-black/40 rounded-md flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-white border border-gray-200 rounded px-1 py-0.5 text-[10px] font-semibold shadow-sm">
                      +{country.callingCode}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Countries list avec scroll optimisé */}
          <div className="country-list-container px-3 py-3">
            {filteredCountries.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium mb-1">Aucun pays trouvé</p>
                <p className="text-sm text-gray-400">
                  Essayez avec un autre terme de recherche
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredCountries.map((country) => (
                  <CountryListItem
                    key={country.code}
                    country={country}
                    isSelected={value === country.code}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="country-selector-footer px-6 py-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>{allCountries.length} pays au total</span>
              </div>
              {selectedCountry && (
                <div className="flex items-center gap-2">
                  <FlagImage
                    code={selectedCountry.code.toLowerCase()}
                    name={selectedCountry.name}
                    className="w-5 h-4 object-cover rounded shadow-sm"
                  />
                  <span className="font-medium text-gray-700 truncate max-w-[150px]">
                    {selectedCountry.name} (+{selectedCountry.callingCode})
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ✅ Composant mémorisé pour les items de la liste
const CountryListItem = React.memo<{
  country: { code: CountryCode; name: string; callingCode: string };
  isSelected: boolean;
  onSelect: (code: CountryCode) => void;
}>(({ country, isSelected, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(country.code);
  }, [country.code, onSelect]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`country-list-item w-full group flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        isSelected
          ? 'bg-black text-white shadow-lg'
          : 'hover:bg-gray-50'
      }`}
    >
      {/* Flag */}
      <div className="relative flex-shrink-0">
        <FlagImage
          code={country.code.toLowerCase()}
          name={country.name}
          className="w-8 h-6 object-cover rounded shadow-sm"
        />
        {isSelected && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
            <Check className="w-3 h-3 text-black" />
          </div>
        )}
      </div>

      {/* Country Info */}
      <div className="flex-1 text-left min-w-0">
        <div className={`font-medium text-sm truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
          {country.name}
        </div>
        <div className={`text-xs ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
          {country.code}
        </div>
      </div>

      {/* Calling Code */}
      <div
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${
          isSelected
            ? 'bg-white/20 text-white'
            : 'bg-gray-100 text-gray-700 group-hover:bg-gray-200'
        }`}
      >
        +{country.callingCode}
      </div>
    </button>
  );
});

CountryListItem.displayName = 'CountryListItem';