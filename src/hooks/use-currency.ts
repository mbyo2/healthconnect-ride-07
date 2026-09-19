import { useState, useEffect, useCallback } from 'react';
import { safeLocalGet, safeLocalSet } from '@/utils/storage';
import {
  BASE_CURRENCY,
  fromZmw,
  toZmw as toZmwRaw,
  roundForCurrency,
  refreshRates,
  ratesAreLive,
  ratesUpdatedAt,
} from '@/services/exchangeRates';

// Country list retained for future use; the default is ALWAYS ZMW and is
// never auto-switched by geolocation (explicit user choice only).
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
  // ZMW is the default for everything. Anything else is an explicit,
  // persisted user choice — never inferred.
  const [currency, setCurrencyState] = useState<string>(() => {
    try {
      return safeLocalGet(STORAGE_KEY) || BASE_CURRENCY;
    } catch {
      return BASE_CURRENCY;
    }
  });
  const [loading, setLoading] = useState(true);
  const [ratesLive, setRatesLive] = useState(false);
  const [ratesAt, setRatesAt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Ensure a stored value; kick off a live-rate refresh in background.
    if (!safeLocalGet(STORAGE_KEY)) safeLocalSet(STORAGE_KEY, BASE_CURRENCY);
    refreshRates()
      .then(() => {
        if (cancelled) return;
        setRatesLive(ratesAreLive());
        setRatesAt(ratesUpdatedAt());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((newCurrency: string) => {
    const code = (newCurrency || BASE_CURRENCY).toUpperCase();
    setCurrencyState(code);
    safeLocalSet(STORAGE_KEY, code);
  }, []);

  const getSymbol = useCallback((code?: string) => {
    const c = (code || currency).toUpperCase();
    return CURRENCY_SYMBOLS[c] || c;
  }, [currency]);

  /**
   * Format a canonical ZMW amount in the active display currency,
   * converting at live bank rates. Unknown currencies fall back to ZMW.
   */
  const formatPrice = useCallback((amountZmw: number, overrideCurrency?: string) => {
    const curr = (overrideCurrency || currency).toUpperCase();
    const symbol = CURRENCY_SYMBOLS[curr] || curr;
    const converted = roundForCurrency(fromZmw(Number(amountZmw) || 0, curr), curr);
    const decimals = ['JPY', 'RWF', 'UGX', 'CDF'].includes(curr) ? 0 : 2;
    return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }, [currency]);

  /**
   * Convert a canonical ZMW amount to a chargeable figure in the given
   * currency (for payment rails). Always pair amount+currency together.
   */
  const convertForCharge = useCallback((amountZmw: number, code?: string) => {
    const curr = (code || currency).toUpperCase();
    return { amount: roundForCurrency(fromZmw(Number(amountZmw) || 0, curr), curr), currency: curr };
  }, [currency]);

  /** Convert a foreign-currency input back to canonical ZMW. */
  const toZmw = useCallback((amount: number, fromCode?: string) => {
    return toZmwRaw(Number(amount) || 0, fromCode || currency);
  }, [currency]);

  return {
    currency,
    setCurrency,
    formatPrice,
    getSymbol,
    convertForCharge,
    toZmw,
    loading,
    ratesLive,
    ratesUpdatedAt: ratesAt,
    supportedCurrencies: SUPPORTED_CURRENCIES,
  };
};
