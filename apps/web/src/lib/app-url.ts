import { headers } from "next/headers";

export function getAppOriginFromHeaders(headerList: Headers): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

export async function getAppOrigin(): Promise<string> {
  return getAppOriginFromHeaders(await headers());
}
