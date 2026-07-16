export function qrScanPath(token: string): string {
  return `/q/${token}`;
}

export function qrScanUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}${qrScanPath(token)}`;
}
