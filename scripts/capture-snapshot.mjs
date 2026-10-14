// A compact, dated copy of real public data. Never generates synthetic agents.
import { mkdir, writeFile } from "node:fs/promises";
const main = "https://api.imd.fun";
const reader = "https://imdoffice.fun/api/imd";
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response.json();
}
const raw = await get(`${main}/swarm`);
const swarm = {
  at: raw.at,
  health: raw.health,
  counts: {
    jobs: raw.counts.jobs,
    tasksInProgress: raw.counts.tasksInProgress,
    jobStates: raw.counts.jobStates,
  },
  seats: raw.seats,
  events: raw.events.map(
    ({ kind, at, tokenId, step, role, state, jobId, objective, steps }) => ({
      kind,
      at,
      tokenId,
      step,
      role,
      state,
      jobId,
      objective,
      steps,
    }),
  ),
};
const ids = Object.values(swarm.seats)
  .sort(
    (a, b) =>
      Number(b.working) - Number(a.working) ||
      Date.parse(b.last || "") - Date.parse(a.last || ""),
  )
  .slice(0, 6)
  .map((s) => s.tokenId);
const details = {};
await Promise.all(
  ids.map(async (id) => {
    try {
      const [detail, standing] = await Promise.all([
        get(`${reader}/seats/${id}?work=15&reviews=0`),
        get(`${reader}/seats/${id}/standing`),
      ]);
      const jobs = await Promise.all(
        [...new Set(standing.standing.running.map((r) => r.jobId))]
          .slice(0, 4)
          .map(async (id) => {
            const j = await get(`${reader}/jobs/${id}`);
            return {
              id: j.id,
              objective: j.objective,
              state: j.state,
              nodes: j.nodes.map(({ key, role, state, seat }) => ({
                key,
                role,
                state,
                seat,
              })),
            };
          }),
      );
      const {
        tokenId,
        agentId,
        online,
        status,
        attempts,
        accepted,
        rejected,
        failed,
        pending,
        work,
      } = detail;
      details[id] = {
        seat: {
          tokenId,
          agentId,
          online,
          status,
          attempts,
          accepted,
          rejected,
          failed,
          pending,
          work,
        },
        standing: { tokenId: standing.tokenId, standing: standing.standing },
        jobs,
        fetchedAt: Date.now(),
      };
    } catch (error) {
      console.warn(`No snapshot detail for #${id}: ${error.message}`);
    }
  }),
);
await mkdir("public/data", { recursive: true });
const snapshot = {
  capturedAt: Date.now(),
  source: main + "/swarm",
  swarm,
  details,
};
await writeFile("public/data/snapshot.json", JSON.stringify(snapshot));
console.log(
  `Saved ${Object.keys(swarm.seats).length} real agents, ${swarm.events.length} events, ${Object.keys(details).length} detail records at ${new Date(snapshot.capturedAt).toISOString()}.`,
);
