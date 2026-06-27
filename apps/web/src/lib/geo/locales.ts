export type LocaleOption = {
  value: string;
  label: string;
  native: string;
};

export const LOCALE_OPTIONS: LocaleOption[] = [
  { value: "en", label: "English", native: "English" },
  { value: "en-US", label: "English (United States)", native: "English (US)" },
  { value: "en-GB", label: "English (United Kingdom)", native: "English (UK)" },
  { value: "es", label: "Spanish", native: "Español" },
  { value: "es-MX", label: "Spanish (Mexico)", native: "Español (México)" },
  { value: "fr", label: "French", native: "Français" },
  { value: "fr-CA", label: "French (Canada)", native: "Français (Canada)" },
  { value: "de", label: "German", native: "Deutsch" },
  { value: "it", label: "Italian", native: "Italiano" },
  { value: "pt", label: "Portuguese", native: "Português" },
  { value: "pt-BR", label: "Portuguese (Brazil)", native: "Português (Brasil)" },
  { value: "nl", label: "Dutch", native: "Nederlands" },
  { value: "pl", label: "Polish", native: "Polski" },
  { value: "sv", label: "Swedish", native: "Svenska" },
  { value: "da", label: "Danish", native: "Dansk" },
  { value: "nb", label: "Norwegian", native: "Norsk" },
  { value: "fi", label: "Finnish", native: "Suomi" },
  { value: "ja", label: "Japanese", native: "日本語" },
  { value: "ko", label: "Korean", native: "한국어" },
  { value: "zh", label: "Chinese", native: "中文" },
  { value: "ar", label: "Arabic", native: "العربية" },
  { value: "hi", label: "Hindi", native: "हिन्दी" },
  { value: "tr", label: "Turkish", native: "Türkçe" },
  { value: "he", label: "Hebrew", native: "עברית" },
];

export function getLocaleOption(value: string): LocaleOption | undefined {
  return LOCALE_OPTIONS.find((locale) => locale.value === value);
}
