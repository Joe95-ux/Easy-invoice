/** Client-safe form field id helper (keep out of server-only modules). */
export function newFormFieldId() {
  return `field_${Math.random().toString(36).slice(2, 10)}`;
}
