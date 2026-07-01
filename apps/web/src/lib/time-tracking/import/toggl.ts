import type { NormalizedExternalTimeEntry } from "@/lib/time-tracking/import/types";

type TogglTimeEntry = {
  id: number;
  description: string;
  start: string;
  duration: number;
  billable?: boolean;
  project_id: number | null;
};

type TogglProject = {
  id: number;
  name: string;
};

function togglAuthHeader(apiToken: string) {
  const encoded = Buffer.from(`${apiToken}:api_token`).toString("base64");
  return `Basic ${encoded}`;
}

export async function fetchTogglTimeEntries(
  apiToken: string,
  startDate: string,
  endDate: string,
): Promise<NormalizedExternalTimeEntry[]> {
  const headers = {
    Authorization: togglAuthHeader(apiToken),
    "Content-Type": "application/json",
  };

  const [entriesResponse, projectsResponse] = await Promise.all([
    fetch(
      `https://api.track.toggl.com/api/v9/me/time_entries?start_date=${startDate}&end_date=${endDate}`,
      { headers, cache: "no-store" },
    ),
    fetch("https://api.track.toggl.com/api/v9/me/projects", { headers, cache: "no-store" }),
  ]);

  if (!entriesResponse.ok) {
    throw new Error("Invalid Toggl API token or unable to fetch time entries");
  }

  const entries = (await entriesResponse.json()) as TogglTimeEntry[];
  const projects =
    projectsResponse.ok ? ((await projectsResponse.json()) as TogglProject[]) : [];
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));

  return entries
    .filter((entry) => entry.duration > 0)
    .map((entry) => ({
      externalId: String(entry.id),
      description: entry.description?.trim() || "Toggl time entry",
      date: entry.start.slice(0, 10),
      durationMinutes: Math.round(entry.duration / 60),
      hourlyRate: 0,
      billable: entry.billable ?? true,
      projectName: entry.project_id ? projectNames.get(entry.project_id) ?? null : null,
    }));
}
