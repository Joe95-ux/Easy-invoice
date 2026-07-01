import type { NormalizedExternalTimeEntry } from "@/lib/time-tracking/import/types";

type ClockifyUser = {
  id: string;
  defaultWorkspace: string;
};

type ClockifyTimeEntry = {
  id: string;
  description: string | null;
  billable: boolean;
  timeInterval: {
    start: string;
    end?: string | null;
    duration?: string | null;
  };
  hourlyRate?: { amount?: number } | null;
  projectId?: string | null;
};

type ClockifyProject = {
  id: string;
  name: string;
};

function parseClockifyDuration(duration: string | null | undefined): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 60 + minutes + Math.round(seconds / 60);
}

export async function fetchClockifyTimeEntries(
  apiKey: string,
  startDate: string,
  endDate: string,
): Promise<NormalizedExternalTimeEntry[]> {
  const headers = {
    "X-Api-Key": apiKey,
    "Content-Type": "application/json",
  };

  const userResponse = await fetch("https://api.clockify.me/api/v1/user", {
    headers,
    cache: "no-store",
  });

  if (!userResponse.ok) {
    throw new Error("Invalid Clockify API key");
  }

  const user = (await userResponse.json()) as ClockifyUser;
  const workspaceId = user.defaultWorkspace;
  const userId = user.id;

  const [entriesResponse, projectsResponse] = await Promise.all([
    fetch(
      `https://api.clockify.me/api/v1/workspaces/${workspaceId}/user/${userId}/time-entries?start=${startDate}T00:00:00Z&end=${endDate}T23:59:59Z&page-size=5000`,
      { headers, cache: "no-store" },
    ),
    fetch(`https://api.clockify.me/api/v1/workspaces/${workspaceId}/projects?page-size=5000`, {
      headers,
      cache: "no-store",
    }),
  ]);

  if (!entriesResponse.ok) {
    throw new Error("Unable to fetch Clockify time entries");
  }

  const entries = (await entriesResponse.json()) as ClockifyTimeEntry[];
  const projects =
    projectsResponse.ok ? ((await projectsResponse.json()) as ClockifyProject[]) : [];
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));

  return entries
    .map((entry) => {
      const durationMinutes = parseClockifyDuration(entry.timeInterval.duration);
      if (durationMinutes <= 0) return null;

      return {
        externalId: entry.id,
        description: entry.description?.trim() || "Clockify time entry",
        date: entry.timeInterval.start.slice(0, 10),
        durationMinutes,
        hourlyRate: Number(entry.hourlyRate?.amount ?? 0),
        billable: entry.billable,
        projectName: entry.projectId ? projectNames.get(entry.projectId) ?? null : null,
      } satisfies NormalizedExternalTimeEntry;
    })
    .filter((entry): entry is NormalizedExternalTimeEntry => entry !== null);
}
