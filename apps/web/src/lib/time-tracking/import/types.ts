export type NormalizedExternalTimeEntry = {
  externalId: string;
  description: string;
  date: string;
  durationMinutes: number;
  hourlyRate: number;
  billable: boolean;
  projectName: string | null;
};
