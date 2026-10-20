import { prisma } from "@/lib/db";

export type QrScanDay = {
  date: string;
  count: number;
};

export type QrScanEvent = {
  id: string;
  scannedAt: string;
};

export type QrScanHistory = {
  total: number;
  lastScannedAt: string | null;
  days: QrScanDay[];
  recent: QrScanEvent[];
};

const HISTORY_DAYS = 30;
const RECENT_LIMIT = 25;

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function lastUtcDays(count: number, now = new Date()): string[] {
  const keys: string[] = [];
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let i = count - 1; i >= 0; i--) {
    keys.push(utcDateKey(new Date(start - i * 86_400_000)));
  }
  return keys;
}

export async function getQrScanHistory(
  qrCodeId: string,
  companyId: string,
): Promise<QrScanHistory | null> {
  const qr = await prisma.qrCode.findFirst({
    where: { id: qrCodeId, companyId },
    select: { id: true, scanCount: true, lastScannedAt: true },
  });
  if (!qr) return null;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (HISTORY_DAYS - 1));
  since.setUTCHours(0, 0, 0, 0);

  const [bucketRows, recent] = await Promise.all([
    prisma.qrScan.findMany({
      where: { qrCodeId, scannedAt: { gte: since } },
      select: { scannedAt: true },
    }),
    prisma.qrScan.findMany({
      where: { qrCodeId },
      orderBy: { scannedAt: "desc" },
      take: RECENT_LIMIT,
      select: { id: true, scannedAt: true },
    }),
  ]);

  const counts = new Map<string, number>();
  for (const row of bucketRows) {
    const key = utcDateKey(row.scannedAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return {
    total: qr.scanCount,
    lastScannedAt: qr.lastScannedAt?.toISOString() ?? null,
    days: lastUtcDays(HISTORY_DAYS).map((date) => ({
      date,
      count: counts.get(date) ?? 0,
    })),
    recent: recent.map((row) => ({
      id: row.id,
      scannedAt: row.scannedAt.toISOString(),
    })),
  };
}
