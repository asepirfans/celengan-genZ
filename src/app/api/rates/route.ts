import { NextResponse } from 'next/server';

// In-memory cache for live rates to prevent rate-limit (cached for 15 minutes)
let cachedRates: Record<string, number> = {};
let lastFetchTime = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 mins

export async function GET() {
  const now = Date.now();
  
  if (now - lastFetchTime < CACHE_DURATION && Object.keys(cachedRates).length > 2) {
    return NextResponse.json({
      success: true,
      base: 'IDR',
      rates: cachedRates,
      source: 'cache',
      updated_at: new Date(lastFetchTime).toISOString()
    });
  }

  try {
    // Fetch live currency rates against USD base from ExchangeRate API
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      if (data.rates && data.rates.IDR) {
        const idrRate = data.rates.IDR; // Real live rate e.g. 17749.33
        
        cachedRates = {
          IDR: 1,
          USD: 1 / idrRate,
          SGD: (data.rates.SGD || 1.273) / idrRate,
          MYR: (data.rates.MYR || 4.025) / idrRate,
          EUR: (data.rates.EUR || 0.861) / idrRate,
          _live_usd_idr: Math.round(idrRate * 100) / 100
        };
        lastFetchTime = now;
      }
    }
  } catch (err) {
    console.warn('Currency API live fetch error:', err);
  }

  // If live fetch succeeded, return live rates
  if (Object.keys(cachedRates).length > 0) {
    return NextResponse.json({
      success: true,
      base: 'IDR',
      rates: cachedRates,
      source: 'live',
      updated_at: new Date(lastFetchTime || now).toISOString()
    });
  }

  // Fallback if network issue
  return NextResponse.json({
    success: true,
    base: 'IDR',
    rates: {
      IDR: 1,
      USD: 1 / 17757,
      SGD: 1 / 13940,
      MYR: 1 / 4410,
      _live_usd_idr: 17757
    },
    source: 'fallback',
    updated_at: new Date().toISOString()
  });
}
