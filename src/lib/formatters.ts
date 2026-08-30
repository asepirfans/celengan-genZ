import { CurrencyCode } from './types';

// Default accurate fallback rates if real-time rates object is not passed
const FALLBACK_RATES: Record<string, number> = {
  IDR: 1,
  USD: 1 / 17757.40,
  SGD: 1 / 13940.65,
  MYR: 1 / 4410.20,
  EUR: 1 / 19500.00
};

export function formatCurrency(
  amountInIDR: number,
  targetCurrency: CurrencyCode = 'IDR',
  showSign: boolean = false,
  exchangeRates?: Record<string, number>
): string {
  const isNegative = amountInIDR < 0;
  const absAmountIDR = Math.abs(amountInIDR);

  // Use exchangeRates if valid, otherwise use accurate live fallback rate
  let rate = 1;
  if (targetCurrency !== 'IDR') {
    if (exchangeRates && typeof exchangeRates[targetCurrency] === 'number' && exchangeRates[targetCurrency] > 0) {
      rate = exchangeRates[targetCurrency];
    } else {
      rate = FALLBACK_RATES[targetCurrency] || (1 / 17757.40);
    }
  }

  const convertedAmount = targetCurrency === 'IDR' ? absAmountIDR : absAmountIDR * rate;

  let formatted = '';
  switch (targetCurrency) {
    case 'IDR':
      formatted = `Rp ${absAmountIDR.toLocaleString('id-ID')}`;
      break;
    case 'USD':
      formatted = `$${convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      break;
    case 'SGD':
      formatted = `S$${convertedAmount.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      break;
    case 'MYR':
      formatted = `RM ${convertedAmount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      break;
    default:
      formatted = `${targetCurrency} ${convertedAmount.toLocaleString()}`;
  }

  if (showSign) {
    if (isNegative) return `-${formatted}`;
    if (amountInIDR > 0) return `+${formatted}`;
  }

  return isNegative ? `-${formatted}` : formatted;
}

export function formatDate(dateString: string, formatStyle: 'short' | 'medium' | 'long' | 'relative' = 'medium'): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    if (formatStyle === 'relative') {
      const now = new Date();
      const isToday = now.toDateString() === date.toDateString();
      if (isToday) return 'Hari ini';

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (yesterday.toDateString() === date.toDateString()) return 'Kemarin';

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (tomorrow.toDateString() === date.toDateString()) return 'Besok';

      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 1 && diffDays < 7) return `${diffDays} hari lalu`;
    }

    if (formatStyle === 'short') {
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    }

    if (formatStyle === 'long') {
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
}

export function calculatePercentage(partial: number, total: number): number {
  if (!total || total === 0) return 0;
  return Math.min(Math.round((partial / total) * 100), 100);
}
