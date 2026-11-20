// GoDaddy Developer Platform — Domains API v3 (discovery endpoints).
// Docs: https://developer.godaddy.com/docs/api-users/domains/search
// Falls back to RDAP (the public registry protocol) when no PAT is configured, so the
// agent still gives honest availability answers — just without prices.
import { config, isConfigured } from '../config.js';

const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
export const isValidDomain = (d) => typeof d === 'string' && DOMAIN_RE.test(d.toLowerCase());

export function buyUrl(domain) {
  return `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(domain)}`;
}

function pickPrice(prices) {
  if (!Array.isArray(prices) || prices.length === 0) return null;
  const p = prices.find((x) => x.period === 1) || prices.find((x) => x.recommended) || prices[0];
  const money = p.firstTermPrice || p.price;
  if (!money || !Number.isFinite(money.value)) return null;
  return {
    amount: money.value / 100,
    currency: money.currencyCode || 'USD',
    renewal: p.renewalPrice ? p.renewalPrice.value / 100 : null,
  };
}

async function gdFetch(pathname, params, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const url = new URL(pathname, config.godaddy.baseUrl);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  const res = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${config.godaddy.pat}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const err = new Error(`GoDaddy API ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function rdapAvailable(domain, { fetchImpl = fetch } = {}) {
  // 404 from RDAP means "no registration record" → very likely available.
  const res = await fetchImpl(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
    headers: { Accept: 'application/rdap+json' },
    signal: AbortSignal.timeout(6000),
    redirect: 'follow',
  });
  if (res.status === 404) return true;
  if (res.ok) return false;
  return null; // unknown
}

let warned = false;

/** Check a list of exact domains. Never throws; returns a status per domain. */
export async function checkDomains(domains, opts = {}) {
  const unique = [...new Set(domains.map((d) => String(d).trim().toLowerCase()))].filter(isValidDomain).slice(0, 8);
  const useGoDaddy = isConfigured.godaddy();
  return Promise.all(
    unique.map(async (domain) => {
      try {
        if (useGoDaddy) {
          const r = await gdFetch('/v3/domains/check-availability', { domain, optimizeFor: 'SPEED' }, opts);
          return {
            domain,
            available: Boolean(r.available),
            definitive: Boolean(r.definitive),
            price: pickPrice(r.prices),
            source: 'godaddy',
            buyUrl: buyUrl(domain),
          };
        }
        const available = await rdapAvailable(domain, opts);
        return { domain, available, definitive: false, price: null, source: 'rdap', buyUrl: buyUrl(domain) };
      } catch (e) {
        if (useGoDaddy) {
          // GoDaddy rejected the token or is unreachable: log it and fall back to the public registry.
          if (!warned) { console.warn(`[godaddy] API error ${e.status || e.message}; falling back to RDAP`); warned = true; }
          try {
            const available = await rdapAvailable(domain, opts);
            return { domain, available, definitive: false, price: null, source: 'rdap', buyUrl: buyUrl(domain) };
          } catch { /* fall through */ }
        }
        return { domain, available: null, error: e.status ? `lookup failed (${e.status})` : 'lookup failed', source: useGoDaddy ? 'godaddy' : 'rdap', buyUrl: buyUrl(domain) };
      }
    }),
  );
}

/** Ask GoDaddy for suggestions for a natural-language query. Returns [] without a PAT. */
export async function suggestDomains(query, { tlds = 'in,com,shop,store,co.in', pageSize = 6, ...opts } = {}) {
  if (!isConfigured.godaddy() || !query) return [];
  try {
    const r = await gdFetch('/v3/domains/suggestions', { query: String(query).slice(0, 100), tlds, pageSize }, opts);
    return (r.items || [])
      .filter((i) => isValidDomain(i.domain))
      .map((i) => ({ domain: i.domain.toLowerCase(), available: true, definitive: false, price: pickPrice(i.prices), source: 'godaddy-suggest', buyUrl: buyUrl(i.domain) }));
  } catch {
    return [];
  }
}
