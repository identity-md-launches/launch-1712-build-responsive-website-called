import { useEffect, useRef, useState } from "react";
import {
  cleanText,
  dateTime,
  fetchDetail,
  humanize,
  latestEvent,
  progressOf,
  REFRESH_MS,
  statusOf,
} from "../data";
import type { DetailBundle, Seat, SwarmEvent } from "../types";
import Icon from "./Icon";
import { Avatar } from "./Office";

export default function AgentDetail({
  seat,
  events,
  initial,
  autoRefresh,
  saved,
  toggleSaved,
  onClose,
}: {
  seat: Seat;
  events: SwarmEvent[];
  initial?: DetailBundle;
  autoRefresh: boolean;
  saved: boolean;
  toggleSaved: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [detail, setDetail] = useState<DetailBundle | null>(initial ?? null);
  const [isLive, setIsLive] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"current" | "history">("current");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    const load = async () => {
      if (running) return;
      running = true;
      setBusy(true);
      try {
        const next = await fetchDetail(seat.tokenId, controller.signal);
        if (!controller.signal.aborted) {
          setDetail(next);
          setIsLive(true);
          setError("");
        }
      } catch {
        if (!controller.signal.aborted)
          setError(
            "Could not refresh this agent. Try again or open the Explorer.",
          );
      } finally {
        running = false;
        if (!controller.signal.aborted) setBusy(false);
      }
    };
    void load();
    const timer = autoRefresh
      ? setInterval(() => {
          if (document.visibilityState === "visible") void load();
        }, REFRESH_MS)
      : undefined;
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [seat.tokenId, autoRefresh, retry]);
  const recentEvent = latestEvent(seat, events);
  const running = detail?.standing?.standing.running ?? [];
  return (
    <dialog
      className="detail-dialog"
      ref={dialog}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="detail-heading"
    >
      <div className="detail-inner">
        <header className="detail-header">
          <div className="agent-identity">
            <Avatar id={seat.tokenId} size={56} />
            <div>
              <h2 id="detail-heading">Agent #{seat.tokenId}</h2>
              <p>Registered ID {seat.agentId ?? "not reported"}</p>
            </div>
          </div>
          <button
            className="icon-button"
            aria-label="Close agent details"
            onClick={onClose}
            autoFocus
          >
            <Icon name="close" size={22} />
          </button>
        </header>
        <div className="detail-toolbar">
          <span className={`status-badge ${statusOf(seat).toLowerCase()}`}>
            <span className="dot" />
            {statusOf(seat)}
          </span>
          <button
            className={`text-button ${saved ? "saved" : ""}`}
            onClick={toggleSaved}
            aria-pressed={saved}
          >
            <Icon name="bookmark" />
            {saved ? "Saved agent" : "Save agent"}
          </button>
          <a
            className="text-link"
            href={`https://explorer.imd.fun/agents/${seat.tokenId}`}
            target="_blank"
            rel="noreferrer"
          >
            Explorer <Icon name="external" size={14} />
          </a>
        </div>
        <div className="detail-source" role="status">
          {busy
            ? "Refreshing agent details…"
            : detail
              ? `${isLive && !error ? "Updated" : "Saved details from"} ${dateTime(detail.fetchedAt)}`
              : "No detailed record loaded."}
        </div>
        {error && (
          <div className="notice warning">
            <p>{error}</p>
            <button
              className="text-button"
              onClick={() => setRetry((n) => n + 1)}
              disabled={busy}
            >
              Try again <Icon name="refresh" size={14} />
            </button>
          </div>
        )}
        <dl className="detail-stats">
          <div>
            <dt>Accepted</dt>
            <dd>{(detail?.seat.accepted ?? seat.accepted).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Pending</dt>
            <dd>{(detail?.seat.pending ?? seat.pending).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Attempts</dt>
            <dd>{(detail?.seat.attempts ?? seat.attempts).toLocaleString()}</dd>
          </div>
        </dl>
        <div
          className="detail-tabs"
          role="group"
          aria-label="Agent detail view"
        >
          <button
            aria-pressed={tab === "current"}
            onClick={() => setTab("current")}
          >
            Current task
          </button>
          <button
            aria-pressed={tab === "history"}
            onClick={() => setTab("history")}
          >
            Work history
          </button>
        </div>
        {tab === "current" ? (
          <section className="task-section" aria-label="Current task">
            {running.length > 0 ? (
              running.map((task) => {
                const job = detail?.jobs.find((j) => j.id === task.jobId);
                const progress = job ? progressOf(job) : null;
                return (
                  <article className="task" key={task.jobId + task.nodeKey}>
                    <div className="task-label">
                      <Icon name="code" />
                      <span>{humanize(task.nodeKey)}</span>
                      <span className="muted">{humanize(task.role)}</span>
                    </div>
                    <h3>{cleanText(task.objective)}</h3>
                    <p className="muted small">
                      Started {dateTime(task.since)}
                    </p>
                    {progress ? (
                      <>
                        <div className="progress-label">
                          <span>Job progress</span>
                          <strong>
                            {progress.done} of {progress.total} steps complete
                          </strong>
                        </div>
                        <progress
                          value={progress.done}
                          max={progress.total || 1}
                          aria-label={`${progress.done} of ${progress.total} job steps complete`}
                        />
                        <p className="muted small">
                          Based on finished job steps, not elapsed time.
                        </p>
                        <ol className="job-steps">
                          {job!.nodes.map((node) => (
                            <li key={node.key}>
                              <span className={`step-symbol ${node.state}`}>
                                <Icon
                                  name={
                                    [
                                      "accepted",
                                      "completed",
                                      "skipped",
                                    ].includes(node.state)
                                      ? "check"
                                      : node.state === "working"
                                        ? "code"
                                        : "clock"
                                  }
                                  size={16}
                                />
                              </span>
                              <span>{humanize(node.key)}</span>
                              <span className="muted small">
                                {humanize(node.state)}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </>
                    ) : (
                      <p className="notice">
                        Step progress is not available from the public reader.
                      </p>
                    )}
                    {job && (
                      <details className="objective">
                        <summary>Read full task brief</summary>
                        <p>{cleanText(job.objective)}</p>
                      </details>
                    )}
                    <a
                      className="text-link"
                      href={`https://api.imd.fun/jobs/${encodeURIComponent(task.jobId)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open public job record <Icon name="external" size={14} />
                    </a>
                  </article>
                );
              })
            ) : (
              <div className="empty-detail">
                <Icon name={seat.working ? "code" : "clock"} size={30} />
                <h3>
                  {seat.working
                    ? "This agent is working"
                    : "Between assignments"}
                </h3>
                <p>
                  {seat.working
                    ? "The public feed reports active work. Detailed task progress is not available yet."
                    : "No current assignment is reported. Explore this agent’s recent work below."}
                </p>
                {seat.working && recentEvent?.objective && (
                  <details className="objective">
                    <summary>Last task reported in the feed</summary>
                    <p>{cleanText(recentEvent.objective)}</p>
                  </details>
                )}
                <button
                  className="secondary-button"
                  onClick={() => setTab("history")}
                >
                  View work history <Icon name="arrow" />
                </button>
              </div>
            )}
            <p className="fine-print">
              “Idle” means no task is reported, not that the agent is offline.
            </p>
          </section>
        ) : (
          <section className="history-section" aria-label="Work history">
            <p className="muted small">
              {detail?.seat.work.length
                ? `Latest ${detail.seat.work.length} submissions returned by IMD.`
                : "Recent work recorded in the public feed."}
            </p>
            {detail?.seat.work.length ? (
              <ol className="history-list">
                {detail.seat.work.map((work, index) => (
                  <li key={`${work.jobId}-${work.nodeKey}-${index}`}>
                    <div className="history-meta">
                      <span className={`history-state ${work.status}`}>
                        <Icon
                          name={work.status === "accepted" ? "check" : "clock"}
                          size={14}
                        />
                        {humanize(work.status)}
                      </span>
                      <time dateTime={work.submittedAt}>
                        {dateTime(work.submittedAt)}
                      </time>
                    </div>
                    <h3>{humanize(work.nodeKey)}</h3>
                    <details className="objective">
                      <summary>View task brief</summary>
                      <p>{cleanText(work.objective)}</p>
                    </details>
                    <a
                      className="text-link small"
                      href={`https://api.imd.fun/jobs/${encodeURIComponent(work.jobId)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Public job record <Icon name="external" size={12} />
                    </a>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="empty-detail">
                <h3>
                  {busy ? "Loading work history…" : "No work history available"}
                </h3>
                <p>
                  {busy
                    ? "Reading this agent’s public record."
                    : "The feed does not include older submissions. Open the Explorer for more information."}
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </dialog>
  );
}
