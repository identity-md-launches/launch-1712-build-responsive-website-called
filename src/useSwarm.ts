import { useCallback, useEffect, useRef, useState } from "react";
import { getJson, parseSwarm, REFRESH_MS, SWARM_URL } from "./data";
import type { Snapshot, Swarm } from "./types";

export function useSwarm() {
  const [swarm, setSwarm] = useState<Swarm | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [source, setSource] = useState<"loading" | "snapshot" | "live">(
    "loading",
  );
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const controller = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const refresh = useCallback(async () => {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    setRefreshing(true);
    try {
      const data = parseSwarm(await getJson(SWARM_URL, request.signal));
      if (!alive.current) return;
      setSwarm(data);
      setSource("live");
      setError("");
      setCheckedAt(Date.now());
    } catch {
      if (alive.current && !request.signal.aborted)
        setError(
          "Live updates are unavailable. Check your connection and try again.",
        );
    } finally {
      controller.current = null;
      if (alive.current) setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    const boot = new AbortController();
    getJson("./data/snapshot.json", boot.signal)
      .then((raw) => {
        const snap = raw as Snapshot;
        const data = parseSwarm(snap.swarm);
        if (alive.current) {
          setSnapshot(snap);
          setSwarm((previous) => previous ?? data);
          setSource((previous) =>
            previous === "loading" ? "snapshot" : previous,
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive.current) void refresh();
      });
    return () => {
      alive.current = false;
      boot.abort();
      controller.current?.abort();
    };
  }, [refresh]);
  useEffect(() => {
    if (!autoRefresh) return;
    const poll = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(poll, REFRESH_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [autoRefresh, refresh]);
  return {
    swarm,
    snapshot,
    source,
    error,
    refreshing,
    autoRefresh,
    setAutoRefresh,
    refresh,
    checkedAt,
  };
}
