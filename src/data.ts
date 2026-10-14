import type {
  AgentStatus,
  DetailBundle,
  Job,
  Seat,
  SeatDetail,
  Standing,
  Swarm,
  SwarmEvent,
} from "./types";

export const SWARM_URL = "https://api.imd.fun/swarm";
export const DETAIL_BASE = "https://imdoffice.fun/api/imd";
export const REFRESH_MS = 30_000;
export const STALE_MS = 90_000;

export async function getJson(
  url: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const timeout = AbortSignal.timeout(15_000);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(`The public reader returned ${response.status}.`);
  return response.json();
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function parseSwarm(raw: unknown): Swarm {
  if (
    !record(raw) ||
    !record(raw.seats) ||
    !record(raw.health) ||
    !record(raw.counts) ||
    !Array.isArray(raw.events) ||
    typeof raw.at !== "number"
  )
    throw new Error("The activity feed has an unexpected format.");
  const healthKeys = [
    "agentsOnline",
    "workingNow",
    "acceptedLastDay",
    "jobsDoneLastDay",
    "seatsEnrolled",
  ];
  if (
    !healthKeys.every(
      (k) =>
        typeof raw.health === "object" &&
        Number.isFinite((raw.health as Record<string, unknown>)[k]),
    )
  )
    throw new Error("The feed is missing network totals.");
  for (const seat of Object.values(raw.seats)) {
    if (
      !record(seat) ||
      !Number.isInteger(seat.tokenId) ||
      typeof seat.working !== "boolean" ||
      ![
        "attempts",
        "accepted",
        "rejected",
        "failed",
        "pending",
        "queued",
      ].every((k) => typeof seat[k] === "number" && Number.isFinite(seat[k]))
    )
      throw new Error("The agent directory has an unexpected format.");
  }
  if (
    !raw.events.every(
      (e) =>
        record(e) && typeof e.kind === "string" && typeof e.at === "string",
    )
  )
    throw new Error("The activity events have an unexpected format.");
  return raw as unknown as Swarm;
}
export async function fetchDetail(
  id: number,
  signal: AbortSignal,
): Promise<DetailBundle> {
  const results = await Promise.allSettled([
    getJson(`${DETAIL_BASE}/seats/${id}?work=15&reviews=0`, signal),
    getJson(`${DETAIL_BASE}/seats/${id}/standing`, signal),
  ]);
  if (results[0].status === "rejected") throw results[0].reason;
  const seat = results[0].value as SeatDetail;
  if (
    !seat ||
    String(seat.tokenId) !== String(id) ||
    !Array.isArray(seat.work) ||
    ![seat.accepted, seat.pending, seat.attempts].every(Number.isFinite) ||
    !seat.work.every(
      (w) =>
        record(w) &&
        [w.jobId, w.objective, w.nodeKey, w.status, w.submittedAt].every(
          (v) => typeof v === "string",
        ),
    )
  )
    throw new Error("Agent details are unavailable.");
  const candidate = results[1].status === "fulfilled" ? results[1].value : null;
  const standing =
    record(candidate) &&
    record(candidate.standing) &&
    Array.isArray(candidate.standing.running) &&
    candidate.standing.running.every(
      (r) =>
        record(r) &&
        [r.jobId, r.objective, r.nodeKey, r.role, r.since].every(
          (v) => typeof v === "string",
        ),
    )
      ? (candidate as unknown as Standing)
      : null;
  const running = standing?.standing?.running ?? [];
  const jobs = await Promise.allSettled(
    [...new Set(running.map((r) => r.jobId))]
      .slice(0, 4)
      .map((jobId) =>
        getJson(`${DETAIL_BASE}/jobs/${encodeURIComponent(jobId)}`, signal),
      ),
  );
  return {
    seat,
    standing,
    jobs: jobs.flatMap((r) =>
      r.status === "fulfilled" &&
      record(r.value) &&
      typeof r.value.id === "string" &&
      typeof r.value.objective === "string" &&
      Array.isArray(r.value.nodes) &&
      r.value.nodes.every(
        (n) =>
          record(n) && typeof n.key === "string" && typeof n.state === "string",
      )
        ? [r.value as unknown as Job]
        : [],
    ),
    fetchedAt: Date.now(),
  };
}
export function statusOf(seat: Seat): AgentStatus {
  return seat.working ? "Working" : seat.queued > 0 ? "Queued" : "Idle";
}
export const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-US").format(n);
export function relativeTime(
  time: string | number | null,
  now = Date.now(),
): string {
  if (time == null || !Number.isFinite(new Date(time).getTime()))
    return "Not reported";
  const seconds = Math.max(0, (now - new Date(time).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
export const dateTime = (time: string | number) =>
  new Date(time).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
export function humanize(value?: string): string {
  if (!value) return "Task";
  const text = value.replace(/^skill:/, "").replace(/[_-]/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
export function cleanText(text = ""): string {
  return text.replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
}
export function shortObjective(text = ""): string {
  const first = cleanText(text).split("\n")[0];
  return first.length > 105 ? `${first.slice(0, 102).trimEnd()}…` : first;
}
export function latestEvent(
  seat: Seat,
  events: SwarmEvent[],
): SwarmEvent | undefined {
  return events.find((e) => e.tokenId === seat.tokenId && e.kind === "node");
}
export function progressOf(job: Job): {
  done: number;
  total: number;
  percent: number;
} {
  const done = job.nodes.filter((n) =>
    ["accepted", "completed", "skipped"].includes(n.state),
  ).length;
  return {
    done,
    total: job.nodes.length,
    percent: job.nodes.length ? Math.round((done / job.nodes.length) * 100) : 0,
  };
}
export function eventLabel(event: SwarmEvent): string {
  if (event.kind === "done") return "Job completed";
  if (event.kind === "site") return "Site published";
  if (event.kind === "agent") return "Agent joined";
  if (event.kind === "job") return "New job";
  return humanize(event.state);
}
