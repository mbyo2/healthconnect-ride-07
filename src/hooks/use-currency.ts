
import { useState, useEffect, useCallback } from 'react';
import { safeLocalGet, safeLocalSet } from '@/utils/storage';

// Map of country codes to currency codes and symbols
const COUNTRY_CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  US: { code: 'USD', symbol: '$' },
  GB: { code: 'GBP', symbol: '£' },
  EU: { code: 'EUR', symbol: '€' },
  DE: { code: 'EUR', symbol: '€' },
  FR: { code: 'EUR', symbol: '€' },
  IT: { code: 'EUR', symbol: '€' },
  ES: { code: 'EUR', symbol: '€' },
  NL: { code: 'EUR', symbol: '€' },
  BE: { code: 'EUR', symbol: '€' },
  AT: { code: 'EUR', symbol: '€' },
  IE: { code: 'EUR', symbol: '€' },
  PT: { code: 'EUR', symbol: '€' },
  FI: { code: 'EUR', symbol: '€' },
  ZM: { code: 'ZMW', symbol: 'K' },
  ZA: { code: 'ZAR', symbol: 'R' },
  KE: { code: 'KES', symbol: 'KSh' },
  NG: { code: 'NGN', symbol: '₦' },
  GH: { code: 'GHS', symbol: 'GH₵' },
  TZ: { code: 'TZS', symbol: 'TSh' },
  UG: { code: 'UGX', symbol: 'USh' },
  RW: { code: 'RWF', symbol: 'FRw' },
  ET: { code: 'ETB', symbol: 'Br' },
  EG: { code: 'EGP', symbol: 'E£' },
  MA: { code: 'MAD', symbol: 'MAD' },
  IN: { code: 'INR', symbol: '₹' },
  CN: { code: 'CNY', symbol: '¥' },
  JP: { code: 'JPY', symbol: '¥' },
  AU: { code: 'AUD', symbol: 'A$' },
  CA: { code: 'CAD', symbol: 'C$' },
  BR: { code: 'BRL', symbol: 'R$' },
  MX: { code: 'MXN', symbol: 'MX$' },
  AE: { code: 'AED', symbol: 'د.إ' },
  SA: { code: 'SAR', symbol: '﷼' },
  PK: { code: 'PKR', symbol: '₨' },
  BD: { code: 'BDT', symbol: '৳' },
  PH: { code: 'PHP', symbol: '₱' },
  MY: { code: 'MYR', symbol: 'RM' },
  SG: { code: 'SGD', symbol: 'S$' },
  TH: { code: 'THB', symbol: '฿' },
  MW: { code: 'MWK', symbol: 'MK' },
  MZ: { code: 'MZN', symbol: 'MT' },
  BW: { code: 'BWP', symbol: 'P' },
  ZW: { code: 'ZWL', symbol: 'Z$' },
  CD: { code: 'CDF', symbol: 'FC' },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', GBP: '£', EUR: '€', ZMW: 'K', ZAR: 'R',
  KES: 'KSh', NGN: '₦', GHS: 'GH₵', TZS: 'TSh', UGX: 'USh',
  RWF: 'FRw', ETB: 'Br', EGP: 'E£', MAD: 'MAD',
  INR: '₹', CNY: '¥', JPY: '¥', AUD: 'A$', CAD: 'C$',
  BRL: 'R$', MXN: 'MX$', AED: 'د.إ', SAR: '﷼',
  PKR: '₨', BDT: '৳', PHP: '₱', MYR: 'RM', SGD: 'S$',
  THB: '฿', MWK: 'MK', MZN: 'MT', BWP: 'P', ZWL: 'Z$', CDF: 'FC',
};

const STORAGE_KEY = 'healthconnect_preferred_currency';

export const SUPPORTED_CURRENCIES = Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => ({
  code,
  symbol,
  label: `${code} (${symbol})`,
}));

export const useCurrency = () => {
  const [currency, setCurrencyState] = useState<string>(() => {
    const saved = safeLocalGet(STORAGE_KEY);
    return saved || 'USD';
  });
  const [loading, setLoading] = useState(true);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  useEffect(() => {
    const detectCurrency = async () => {
      // If user already has a saved preference, use it
      const saved = safeLocalGet(STORAGE_KEY);
      if (saved) {
        setCurrencyState(saved);
        setLoading(false);
        return;
      }

      try {
        // Use a free IP geolocation API to detect country
        const response = await fetch('https://ipapi.co/json/', { 
          signal: AbortSignal.timeout(5000) 
        });
        
        if (response.ok) {
          const data = await response.json();
          const countryCode = data.country_code;
          setDetectedCountry(countryCode);
          
          const mapped = COUNTRY_CURRENCY_MAP[countryCode];
          if (mapped) {
            setCurrencyState(mapped.code);
            safeLocalSet(STORAGE_KEY, mapped.code);
          } else {
            // Default to USD for unmapped countries
            setCurrencyState('USD');
            localStorage.setItem(STORAGE_KEY, 'USD');
          }
        }
      } catch (error) {
        console.warn('Could not detect location for currency, defaulting to USD:', error);
        setCurrencyState('USD');
      } finally {
        setLoading(false);
      }
    };

    detectCurrency();
  }, []);

  const setCurrency = useCallback((newCurrency: string) => {
    setCurrencyState(newCurrency);
    localStorage.setItem(STORAGE_KEY, newCurrency);
  }, []);

  const getSymbol = useCallback((code?: string) => {
    return CURRENCY_SYMBOLS[code || currency] || code || currency;
  }, [currency]);

  const formatPrice = useCallback((amount: number, overrideCurrency?: string) => {
    const curr = overrideCurrency || currency;
    const symbol = CURRENCY_SYMBOLS[curr] || curr;
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [currency]);

  return { currency, setCurrency, formatPrice, getSymbol, loading, detectedCountry, supportedCurrencies: SUPPORTED_CURRENCIES };
};
