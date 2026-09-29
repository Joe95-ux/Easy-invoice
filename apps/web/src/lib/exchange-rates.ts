/**
 * Exchange rates with historical support.
 * Prefer Frankfurter (ECB) for supported pairs; fall back to open.er-api /
 * currency-api for broader coverage (e.g. AED).
 */

import type { FxPreferredSource, FxRateSource } from "@/lib/schemas/fx-settings";

export type ExchangeRateResult = {
  rate: number;
  date: string;
  source: FxRateSource;
};

function roundRate(rate: number): number {
  return Math.round(rate * 1_000_000) / 1_000_000;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeAsOf(date?: string | null): string | null {
  if (!date) return null;
  const trimmed = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

async function fetchFrankfurter(
  from: string,
  to: string,
  asOf: string | null,
): Promise<ExchangeRateResult | null> {
  const path = asOf ?? "latest";
  const url = new URL(`https://api.frankfurter.app/${path}`);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  const response = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: { Accept: "application/json" },
    redirect: "follow",
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    date?: string;
    rates?: Record<string, number>;
  };
  const rate = body.rates?.[to];
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return null;
  return {
    rate: roundRate(rate),
    date: typeof body.date === "string" ? body.date : (asOf ?? todayIsoDate()),
    source: "ecb",
  };
}

async function fetchOpenErApi(
  from: string,
  to: string,
): Promise<ExchangeRateResult | null> {
  const response = await fetch(
    `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`,
    {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
      redirect: "follow",
    },
  );
  if (!response.ok) return null;
  const body = (await response.json()) as {
    result?: string;
    time_last_update_utc?: string;
    rates?: Record<string, number>;
  };
  if (body.result !== "success") return null;
  const rate = body.rates?.[to];
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return null;
  let date = todayIsoDate();
  if (typeof body.time_last_update_utc === "string") {
    const parsed = new Date(body.time_last_update_utc);
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed.toISOString().slice(0, 10);
    }
  }
  return { rate: roundRate(rate), date, source: "open-er" };
}

/** Historical + latest for currencies outside ECB (e.g. AED). */
async function fetchCurrencyApi(
  from: string,
  to: string,
  asOf: string | null,
): Promise<ExchangeRateResult | null> {
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();
  const pathDate = asOf ?? "latest";
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${pathDate}/v1/currencies/${fromLower}.min.json`,
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${pathDate}/v1/currencies/${fromLower}.json`,
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        next: { revalidate: 3600 },
        headers: { Accept: "application/json" },
        redirect: "follow",
      });
      if (!response.ok) continue;
      const body = (await response.json()) as {
        date?: string;
        [key: string]: unknown;
      };
      const table = body[fromLower];
      if (!table || typeof table !== "object") continue;
      const rate = (table as Record<string, number>)[toLower];
      if (rate == null || !Number.isFinite(rate) || rate <= 0) continue;
      return {
        rate: roundRate(rate),
        date: typeof body.date === "string" ? body.date : (asOf ?? todayIsoDate()),
        source: "open-er",
      };
    } catch {
      // try next URL
    }
  }
  return null;
}

async function fetchMarket(
  from: string,
  to: string,
  asOf: string | null,
): Promise<ExchangeRateResult | null> {
  if (asOf) {
    const historical = await fetchCurrencyApi(from, to, asOf);
    if (historical) return historical;
  }
  const latest = await fetchOpenErApi(from, to);
  if (latest) return latest;
  return fetchCurrencyApi(from, to, null);
}

export async function fetchExchangeRate(input: {
  from: string;
  to: string;
  /** ISO date YYYY-MM-DD for historical rate (issue/payment date). */
  date?: string | null;
  prefer?: FxPreferredSource;
}): Promise<ExchangeRateResult | { error: string }> {
  const from = input.from.trim().toUpperCase();
  const to = input.to.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
    return { error: "Invalid currency code" };
  }
  if (from === to) {
    return {
      rate: 1,
      date: normalizeAsOf(input.date) ?? todayIsoDate(),
      source: "ecb",
    };
  }

  const asOf = normalizeAsOf(input.date);
  const prefer = input.prefer ?? "auto";

  try {
    if (prefer === "ecb") {
      const ecb = await fetchFrankfurter(from, to, asOf);
      if (ecb) return ecb;
      return {
        error: `No ECB rate for ${from} → ${to}${asOf ? ` on ${asOf}` : ""}`,
      };
    }

    if (prefer === "open-er") {
      const market = await fetchMarket(from, to, asOf);
      if (market) return market;
      return {
        error: `No market rate for ${from} → ${to}${asOf ? ` on ${asOf}` : ""}`,
      };
    }

    const primary = await fetchFrankfurter(from, to, asOf);
    if (primary) return primary;

    const fallback = await fetchMarket(from, to, asOf);
    if (fallback) return fallback;

    return {
      error: `No live rate available for ${from} → ${to}${asOf ? ` on ${asOf}` : ""}`,
    };
  } catch {
    return { error: "Could not fetch exchange rate" };
  }
}
