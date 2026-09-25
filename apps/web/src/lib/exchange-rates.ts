/**
 * Exchange rates via Frankfurter (ECB daily rates, no API key).
 * Returns homeCurrency units per 1 documentCurrency unit.
 */
export async function fetchExchangeRate(input: {
  from: string;
  to: string;
}): Promise<{ rate: number; date: string } | { error: string }> {
  const from = input.from.trim().toUpperCase();
  const to = input.to.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
    return { error: "Invalid currency code" };
  }
  if (from === to) {
    return { rate: 1, date: new Date().toISOString().slice(0, 10) };
  }

  try {
    const url = new URL("https://api.frankfurter.app/latest");
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return { error: "Could not fetch exchange rate" };
    }
    const body = (await response.json()) as {
      date?: string;
      rates?: Record<string, number>;
    };
    const rate = body.rates?.[to];
    if (rate == null || !Number.isFinite(rate) || rate <= 0) {
      return { error: `No rate available for ${from} → ${to}` };
    }
    return {
      rate: Math.round(rate * 1_000_000) / 1_000_000,
      date: typeof body.date === "string" ? body.date : new Date().toISOString().slice(0, 10),
    };
  } catch {
    return { error: "Could not fetch exchange rate" };
  }
}
