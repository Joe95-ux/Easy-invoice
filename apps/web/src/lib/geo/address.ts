export type AddressFieldLabels = {
  state: string;
  zip: string;
};

const LABELS: Record<string, AddressFieldLabels> = {
  US: { state: "State", zip: "ZIP code" },
  CA: { state: "Province", zip: "Postal code" },
  GB: { state: "County", zip: "Postcode" },
  AU: { state: "State", zip: "Postcode" },
  DE: { state: "State", zip: "Postal code" },
  FR: { state: "Region", zip: "Postal code" },
  IN: { state: "State", zip: "PIN code" },
  BR: { state: "State", zip: "CEP" },
  MX: { state: "State", zip: "Postal code" },
  NG: { state: "State", zip: "Postal code" },
};

export function addressLabelsForCountry(countryCode: string): AddressFieldLabels {
  return LABELS[countryCode] ?? { state: "State / Province", zip: "Postal code" };
}

export type AddressValues = {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

export type AddressSuggestion = AddressValues & {
  id: string;
  label: string;
};

type NominatimAddress = {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  postcode?: string;
  country_code?: string;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  address?: NominatimAddress;
};

export function normalizeNominatimResult(result: NominatimResult): AddressSuggestion {
  const addr = result.address ?? {};
  const street = [addr.house_number, addr.road].filter(Boolean).join(" ");
  const city =
    addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? "";
  const country = (addr.country_code ?? "").toUpperCase();

  return {
    id: String(result.place_id),
    label: result.display_name,
    address: street,
    city,
    state: addr.state ?? "",
    zip: addr.postcode ?? "",
    country,
  };
}
