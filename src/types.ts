export interface Seat {
  tokenId: number;
  agentId: string | null;
  attempts: number;
  accepted: number;
  rejected: number;
  failed: number;
  pending: number;
  last: string | null;
  working: boolean;
  queued: number;
}
export interface SwarmEvent {
  kind: string;
  at: string;
  tokenId?: number | null;
  step?: string;
  role?: string;
  state?: string;
  jobId?: string;
  objective?: string;
  steps?: number;
}
export interface Swarm {
  at: number;
  health: {
    reachable: boolean;
    agentsOnline: number;
    workingNow: number;
    acceptedLastDay: number;
    jobsDoneLastDay: number;
    seatsEnrolled: number;
  };
  counts: {
    jobs: number;
    tasksInProgress: number;
    jobStates: Record<string, number>;
  };
  seats: Record<string, Seat>;
  events: SwarmEvent[];
}
export interface Work {
  jobId: string;
  objective: string;
  nodeKey: string;
  role: string;
  status: string;
  submittedAt: string;
  acceptedAt: string | null;
}
export interface SeatDetail {
  tokenId: string;
  agentId: string | null;
  online: boolean;
  status: string;
  attempts: number;
  accepted: number;
  rejected: number;
  failed: number;
  pending: number;
  work: Work[];
}
export interface Standing {
  tokenId: string;
  standing: {
    working: number;
    running: {
      jobId: string;
      objective: string;
      nodeKey: string;
      role: string;
      since: string;
    }[];
  };
}
export interface Job {
  id: string;
  objective: string;
  state: string;
  nodes: {
    key: string;
    role: string;
    state: string;
    seat?: { tokenId: string; agentId: string } | null;
  }[];
}
export interface DetailBundle {
  seat: SeatDetail;
  standing: Standing | null;
  jobs: Job[];
  fetchedAt: number;
}
export interface Snapshot {
  capturedAt: number;
  source: string;
  swarm: Swarm;
  details: Record<string, DetailBundle>;
}
export type AgentStatus = "Working" | "Queued" | "Idle";
export type Filter = "All agents" | "Working" | "Idle" | "Saved";
