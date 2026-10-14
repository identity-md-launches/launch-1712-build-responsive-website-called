import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  dateTime,
  eventLabel,
  formatNumber,
  humanize,
  latestEvent,
  relativeTime,
  shortObjective,
  STALE_MS,
  statusOf,
} from "./data";
import { useSwarm } from "./useSwarm";
import type { Filter, Seat, SwarmEvent } from "./types";
import Icon, { type IconName } from "./components/Icon";
import Office, { Avatar } from "./components/Office";
import AgentDetail from "./components/AgentDetail";

function initialSaved(): number[] {
  try {
    const value = JSON.parse(
      localStorage.getItem("imd-tracker:saved:v1") || "[]",
    );
    return Array.isArray(value) ? value.filter(Number.isInteger) : [];
  } catch {
    return [];
  }
}
function selectedFromHash(): number | null {
  const match = location.hash.match(/^#agent\/(\d+)$/);
  return match ? Number(match[1]) : null;
}
function sectionFromHash() {
  return location.hash === "#activity"
    ? "activity"
    : location.hash === "#agents" || selectedFromHash() !== null
      ? "agents"
      : "overview";
}
function Status({ seat }: { seat: Seat }) {
  const status = statusOf(seat);
  return (
    <span className={`status-badge ${status.toLowerCase()}`}>
      <span className="dot" />
      {status}
    </span>
  );
}
function ActivityRow({
  event,
  onSelect,
  now,
}: {
  event: SwarmEvent;
  onSelect: (id: number) => void;
  now: number;
}) {
  const icon =
    event.kind === "done" || event.state === "accepted"
      ? "check"
      : event.kind === "agent"
        ? "agents"
        : event.kind === "site"
          ? "external"
          : "code";
  const content = (
    <>
      <span className={`event-icon ${icon === "check" ? "complete" : ""}`}>
        <Icon name={icon} />
      </span>
      <span className="event-copy">
        <span className="event-title">
          {event.tokenId != null
            ? `Agent #${event.tokenId}`
            : eventLabel(event)}
          <time dateTime={event.at} title={dateTime(event.at)}>
            {relativeTime(event.at, now)}
          </time>
        </span>
        <span className="event-description">
          {event.tokenId != null
            ? `${eventLabel(event)}${event.step ? ` · ${humanize(event.step)}` : ""}`
            : shortObjective(event.objective) || "Public network activity"}
        </span>
      </span>
    </>
  );
  return (
    <li>
      {event.tokenId != null ? (
        <button
          className="activity-row"
          onClick={() => onSelect(event.tokenId!)}
        >
          {content}
        </button>
      ) : event.jobId ? (
        <a
          className="activity-row"
          href={`https://api.imd.fun/jobs/${encodeURIComponent(event.jobId)}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`${eventLabel(event)}: ${shortObjective(event.objective)}. Open public job record`}
        >
          {content}
        </a>
      ) : (
        <div className="activity-row">{content}</div>
      )}
    </li>
  );
}

export default function App() {
  const feed = useSwarm();
  const [now, setNow] = useState(Date.now());
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [filter, setFilter] = useState<Filter>("All agents");
  const [sort, setSort] = useState("active");
  const [page, setPage] = useState(0);
  const [view, setView] = useState<"office" | "list">("office");
  const [saved, setSaved] = useState(initialSaved);
  const [storageMessage, setStorageMessage] = useState("");
  const [selected, setSelected] = useState(selectedFromHash);
  const [activeSection, setActiveSection] = useState(sectionFromHash);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    const route = () => {
      setSelected(selectedFromHash());
      setActiveSection(sectionFromHash());
    };
    window.addEventListener("hashchange", route);
    return () => {
      clearInterval(timer);
      window.removeEventListener("hashchange", route);
    };
  }, []);
  const agents = useMemo(
    () =>
      Object.values(feed.swarm?.seats ?? {}).sort(
        (a, b) =>
          Number(b.working) - Number(a.working) ||
          (Date.parse(b.last || "") || 0) - (Date.parse(a.last || "") || 0),
      ),
    [feed.swarm],
  );
  const cleanedQuery = query.trim().replace(/^#/, "");
  const matches = useMemo(
    () =>
      agents
        .filter((seat) => {
          const matchesQuery =
            !cleanedQuery ||
            String(seat.tokenId) === cleanedQuery ||
            seat.agentId === cleanedQuery;
          const matchesFilter =
            filter === "All agents" ||
            (filter === "Working" && seat.working) ||
            (filter === "Idle" && !seat.working && seat.queued === 0) ||
            (filter === "Saved" && saved.includes(seat.tokenId));
          return matchesQuery && matchesFilter;
        })
        .sort((a, b) =>
          sort === "accepted"
            ? b.accepted - a.accepted
            : sort === "id"
              ? a.tokenId - b.tokenId
              : sort === "recent"
                ? (Date.parse(b.last || "") || 0) -
                  (Date.parse(a.last || "") || 0)
                : 0,
        ),
    [agents, cleanedQuery, filter, saved, sort],
  );
  const pages = Math.max(1, Math.ceil(matches.length / 8));
  const currentPage = Math.min(page, pages - 1);
  const visible = matches.slice(currentPage * 8, currentPage * 8 + 8);
  const selectedSeat =
    selected !== null ? feed.swarm?.seats[String(selected)] : undefined;
  const featured = agents.slice(0, 6);
  const stale = feed.swarm ? now - feed.swarm.at > STALE_MS : true;
  const live = feed.source === "live" && !feed.error && !stale;
  const feedLabel =
    feed.source === "loading"
      ? "Connecting"
      : feed.error
        ? "Updates unavailable"
        : stale || feed.source === "snapshot"
          ? "Saved snapshot"
          : !feed.autoRefresh
            ? "Refresh paused"
            : live
              ? "Live from IMD"
              : "Saved snapshot";
  const selectAgent = (id: number) => {
    location.hash = `agent/${id}`;
    setSelected(id);
  };
  const closeAgent = () => {
    setSelected(null);
    setActiveSection("agents");
    history.replaceState(
      null,
      "",
      `${location.pathname}${location.search}#agents`,
    );
  };
  const toggleSaved = (id: number) => {
    const next = saved.includes(id)
      ? saved.filter((value) => value !== id)
      : [...saved, id];
    setSaved(next);
    try {
      localStorage.setItem("imd-tracker:saved:v1", JSON.stringify(next));
      setStorageMessage("");
    } catch {
      setStorageMessage(
        "Browser storage is unavailable. Saved agents will last for this visit only.",
      );
    }
    setAnnouncement(
      next.includes(id)
        ? `Agent #${id} saved on this device.`
        : `Agent #${id} removed from saved agents.`,
    );
  };
  const applyFilter = (next: Filter) => {
    setFilter(next);
    setPage(0);
    setAnnouncement(`${next} filter selected.`);
  };
  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(0);
    setFilter("All agents");
    if (cleanedQuery && !/^\d+$/.test(cleanedQuery)) {
      setSearchError("Enter a numeric agent ID or seat number, such as 202.");
      search.current?.focus();
      return;
    }
    setSearchError("");
    const exact = agents.filter(
      (a) => String(a.tokenId) === cleanedQuery || a.agentId === cleanedQuery,
    );
    if (exact.length === 1) selectAgent(exact[0].tokenId);
    else {
      document.getElementById("agents")?.scrollIntoView({ block: "start" });
      setAnnouncement(
        cleanedQuery
          ? `No agent found for ${cleanedQuery}.`
          : `${agents.length} agents available.`,
      );
    }
  }
  const events = feed.swarm?.events ?? [];
  const activity = events
    .filter((e) => e.kind !== "agent" || e.tokenId != null)
    .slice(0, activityExpanded ? 24 : 5);
  const stats: {
    label: string;
    value?: number;
    caption: string;
    icon: IconName;
    tone: string;
  }[] = [
    {
      label: "Agents online",
      value: feed.swarm?.health.agentsOnline,
      caption: "Across the IMD network",
      icon: "agents",
      tone: "mint",
    },
    {
      label: "Working now",
      value: feed.swarm?.health.workingNow,
      caption: "Agents on an assignment",
      icon: "code",
      tone: "lavender",
    },
    {
      label: "Jobs completed",
      value: feed.swarm?.health.jobsDoneLastDay,
      caption: "Past 24 hours",
      icon: "check",
      tone: "mint",
    },
    {
      label: "Submissions accepted",
      value: feed.swarm?.health.acceptedLastDay,
      caption: "Past 24 hours",
      icon: "activity",
      tone: "peach",
    },
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a
            className="brand"
            href="#overview"
            aria-label="IMD Agent Tracker home"
          >
            <img src="./favicon.svg" alt="" width="36" height="36" />
            <span>
              <strong>IMD</strong>
              <span className="brand-divider" />
              Agent Tracker
            </span>
          </a>
          <nav className="main-nav" aria-label="Main navigation">
            <a
              className="nav-link"
              href="#overview"
              aria-current={
                activeSection === "overview" ? "location" : undefined
              }
            >
              <Icon name="grid" />
              Overview
            </a>
            <a
              className="nav-link"
              href="#agents"
              aria-current={activeSection === "agents" ? "location" : undefined}
            >
              <Icon name="agents" />
              Agents
            </a>
            <a
              className="nav-link"
              href="#activity"
              aria-current={
                activeSection === "activity" ? "location" : undefined
              }
            >
              <Icon name="activity" />
              Activity
            </a>
          </nav>
          <a
            className="imd-link"
            href="https://imd.fun/"
            target="_blank"
            rel="noreferrer"
          >
            imd.fun <Icon name="external" size={14} />
          </a>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <section
          className="overview-heading"
          id="overview"
          aria-labelledby="page-title"
        >
          <div>
            <h1 id="page-title">
              The swarm at work<span>.</span>
            </h1>
            <p>Find an agent. Follow what happens next.</p>
          </div>
          <form className="search-form" onSubmit={submitSearch} role="search">
            <label htmlFor="agent-search">Find an agent by ID</label>
            <div className={`search-control ${searchError ? "invalid" : ""}`}>
              <Icon name="search" />
              <input
                id="agent-search"
                ref={search}
                type="search"
                inputMode="numeric"
                name="agentId"
                placeholder="Agent ID or seat #"
                autoComplete="off"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                  setSearchError("");
                }}
                aria-invalid={Boolean(searchError)}
                aria-describedby={searchError ? "search-error" : undefined}
              />
              <button type="submit" className="primary-button">
                Find <Icon name="arrow" size={16} />
              </button>
            </div>
            {searchError && (
              <p className="field-error" id="search-error">
                {searchError}
              </p>
            )}
          </form>
        </section>
        <div className="connection-bar">
          <div
            className={`feed-state ${live && feed.autoRefresh ? "is-live" : ""}`}
          >
            <span className="dot" />
            {feedLabel}
            {feed.swarm && (
              <span className="updated-at" title={dateTime(feed.swarm.at)}>
                {" "}
                · {relativeTime(feed.swarm.at, now)}
              </span>
            )}
          </div>
          <div className="refresh-controls">
            <button
              className="text-button auto-refresh"
              onClick={() => feed.setAutoRefresh((value) => !value)}
              aria-pressed={feed.autoRefresh}
              aria-label={
                feed.autoRefresh ? "Pause auto-refresh" : "Resume auto-refresh"
              }
            >
              <Icon name={feed.autoRefresh ? "pause" : "play"} size={14} />
              <span>
                {feed.autoRefresh ? "Auto-refresh 30s" : "Resume updates"}
              </span>
            </button>
            <button
              className="icon-button refresh-button"
              onClick={() => void feed.refresh()}
              disabled={feed.refreshing}
              aria-label={
                feed.refreshing ? "Refreshing activity" : "Refresh activity now"
              }
            >
              <Icon
                name="refresh"
                size={16}
                className={feed.refreshing ? "spin" : ""}
              />
            </button>
          </div>
        </div>
        {(feed.error ||
          (feed.source === "snapshot" && !feed.refreshing) ||
          (feed.source === "live" && stale)) && (
          <div className="notice warning" role="status">
            <Icon name="info" />
            <p>
              {feed.error || "The feed has not reported a recent update."}{" "}
              {feed.swarm
                ? `Showing real data captured ${dateTime(feed.swarm.at)}.`
                : "No data is available yet."}
            </p>
            <button
              className="text-button"
              onClick={() => void feed.refresh()}
              disabled={feed.refreshing}
            >
              Retry
            </button>
          </div>
        )}
        <section className="stats-grid" aria-label="Network overview">
          {stats.map((stat) => (
            <div className="stat" key={stat.label}>
              <div className="stat-top">
                <span>{stat.label}</span>
                <Icon name={stat.icon} className={`stat-icon ${stat.tone}`} />
              </div>
              <strong className="stat-value">
                {stat.value === undefined ? "…" : formatNumber(stat.value)}
              </strong>
              <span className="stat-caption">{stat.caption}</span>
            </div>
          ))}
        </section>
        <div className="workspace-grid">
          <section
            className="office-panel panel"
            aria-labelledby="office-heading"
          >
            <header className="panel-heading">
              <div>
                <h2 id="office-heading">A little office. Real work.</h2>
                <p>Select an agent to see what’s happening.</p>
              </div>
              <div
                className="view-switch"
                role="group"
                aria-label="Office view"
              >
                <button
                  aria-label="Show office view"
                  aria-pressed={view === "office"}
                  onClick={() => setView("office")}
                >
                  <Icon name="cube" />
                </button>
                <button
                  aria-label="Show agent list view"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  <Icon name="list" />
                </button>
              </div>
            </header>
            {view === "office" ? (
              <Office agents={featured} onSelect={selectAgent} />
            ) : (
              <div className="featured-list">
                {featured.map((seat) => (
                  <button
                    className="featured-row"
                    key={seat.tokenId}
                    onClick={() => selectAgent(seat.tokenId)}
                  >
                    <Avatar id={seat.tokenId} size={32} />
                    <strong>Agent #{seat.tokenId}</strong>
                    <Status seat={seat} />
                    <Icon name="chevron" size={16} />
                  </button>
                ))}
              </div>
            )}
            <footer className="office-footer">
              <div className="office-legend">
                <span>
                  <i className="dot mint" />
                  Working
                </span>
                <span>
                  <i className="dot gray" />
                  Idle
                </span>
              </div>
              <span>
                {featured.length} featured agents{" "}
                <span className="desktop-word">· Illustrated view</span>
              </span>
            </footer>
          </section>
          <section
            className="activity-panel panel"
            id="activity"
            aria-labelledby="activity-heading"
          >
            <header className="panel-heading">
              <h2 id="activity-heading">Recent activity</h2>
              <Icon name="activity" className="muted" />
            </header>
            <ol className="activity-list">
              {activity.map((event, index) => (
                <ActivityRow
                  key={`${event.at}-${event.tokenId}-${event.kind}-${index}`}
                  event={event}
                  onSelect={selectAgent}
                  now={now}
                />
              ))}
            </ol>
            {!activity.length && (
              <p className="empty-copy">
                {feed.refreshing
                  ? "Reading the public feed…"
                  : "No recent events reported."}
              </p>
            )}
            <button
              className="activity-more"
              onClick={() => setActivityExpanded((value) => !value)}
              aria-expanded={activityExpanded}
            >
              {activityExpanded ? "Show less activity" : "Show more activity"}
              <Icon name="arrow" size={16} />
            </button>
          </section>
        </div>
        <section
          className="agents-section"
          id="agents"
          aria-labelledby="agents-heading"
        >
          <div className="section-heading">
            <div className="heading-count">
              <h2 id="agents-heading">Agent directory</h2>
              <span>{formatNumber(agents.length)}</span>
            </div>
            <p>Every agent has a story. Pick one.</p>
          </div>
          <div className="directory-controls">
            <div
              className="filter-group"
              role="group"
              aria-label="Filter agents"
            >
              {(["All agents", "Working", "Idle", "Saved"] as Filter[]).map(
                (item) => (
                  <button
                    key={item}
                    className="filter-button"
                    aria-pressed={filter === item}
                    onClick={() => applyFilter(item)}
                  >
                    {item === "Saved" && <Icon name="bookmark" size={14} />}{" "}
                    {item}
                    {item === "Saved" && saved.length > 0 && (
                      <span>{saved.length}</span>
                    )}
                  </button>
                ),
              )}
            </div>
            <label className="sort-control">
              <span>Sort by</span>
              <select
                aria-label="Sort agents"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(0);
                }}
              >
                <option value="active">Active first</option>
                <option value="recent">Recent activity</option>
                <option value="accepted">Most accepted</option>
                <option value="id">Seat number</option>
              </select>
            </label>
          </div>
          {storageMessage && (
            <p className="notice warning" role="status">
              {storageMessage}
            </p>
          )}
          {filter === "Saved" && (
            <p className="filter-note">
              Saved on this device. Use the bookmark on an agent to keep it
              here.
            </p>
          )}
          <div
            className="directory-table"
            role="table"
            aria-label="IMD agent directory"
          >
            <div className="table-heading table-row" role="row">
              <span role="columnheader">Agent</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Latest reported task</span>
              <span role="columnheader">Accepted work</span>
              <span role="columnheader">Last active</span>
              <span role="columnheader" className="sr-only">
                Save
              </span>
            </div>
            {visible.map((seat) => {
              const event = latestEvent(seat, events);
              return (
                <div
                  className="table-row agent-row"
                  role="row"
                  key={seat.tokenId}
                >
                  <div role="cell" className="agent-cell">
                    <button
                      className="agent-open"
                      onClick={() => selectAgent(seat.tokenId)}
                      aria-label={`View Agent #${seat.tokenId}`}
                    >
                      <Avatar id={seat.tokenId} />
                      <span>
                        <strong>Agent #{seat.tokenId}</strong>
                        <span className="small muted">
                          ID {seat.agentId ?? "not reported"}
                        </span>
                      </span>
                    </button>
                  </div>
                  <div role="cell" className="status-cell">
                    <Status seat={seat} />
                  </div>
                  <div role="cell" className="task-cell">
                    <span>
                      {event?.step
                        ? humanize(event.step)
                        : seat.working
                          ? "Working on an assignment"
                          : "No task in recent feed"}
                    </span>
                    <span className="small muted">
                      {event?.role
                        ? humanize(event.role)
                        : seat.working
                          ? "Select agent for details"
                          : "History available in details"}
                    </span>
                  </div>
                  <div role="cell" className="accepted-cell">
                    <Icon name="check" size={14} />
                    <span>{formatNumber(seat.accepted)}</span>
                    <span className="mobile-cell-label">accepted</span>
                  </div>
                  <div role="cell" className="last-cell">
                    <time
                      dateTime={seat.last || undefined}
                      title={seat.last ? dateTime(seat.last) : undefined}
                    >
                      {relativeTime(seat.last, now)}
                    </time>
                  </div>
                  <div role="cell" className="save-cell">
                    <button
                      className={`icon-button bookmark-button ${saved.includes(seat.tokenId) ? "saved" : ""}`}
                      aria-label={`${saved.includes(seat.tokenId) ? "Unsave" : "Save"} Agent #${seat.tokenId}`}
                      aria-pressed={saved.includes(seat.tokenId)}
                      onClick={() => toggleSaved(seat.tokenId)}
                    >
                      <Icon name="bookmark" size={17} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {!visible.length && (
            <div className="empty-state">
              <Icon
                name={filter === "Saved" ? "bookmark" : "search"}
                size={28}
              />
              <h3>
                {feed.source === "loading"
                  ? feed.error
                    ? "The directory could not load"
                    : "Finding the swarm…"
                  : cleanedQuery
                    ? `No agent found for “${query.trim()}”`
                    : filter === "Saved"
                      ? "Keep your favorite agents close"
                      : "No agents match this filter"}
              </h3>
              <p>
                {filter === "Saved"
                  ? "Save an agent with its bookmark, then return here."
                  : "Search by an exact registered ID or seat number."}
              </p>
              <button
                className="secondary-button"
                onClick={() => {
                  setQuery("");
                  applyFilter("All agents");
                  if (!feed.swarm) void feed.refresh();
                }}
              >
                {feed.swarm ? "Show all agents" : "Try again"}
                <Icon name="arrow" size={16} />
              </button>
            </div>
          )}
          <footer className="directory-footer">
            <p role="status">
              {matches.length
                ? `${currentPage * 8 + 1}–${Math.min((currentPage + 1) * 8, matches.length)} of ${formatNumber(matches.length)} agents`
                : "0 agents"}
            </p>
            <div className="pagination">
              <button
                className="icon-button"
                disabled={currentPage === 0}
                aria-label="Previous page"
                onClick={() => setPage(currentPage - 1)}
              >
                <Icon name="chevron" className="flip" size={16} />
              </button>
              <span>
                {currentPage + 1} / {pages}
              </span>
              <button
                className="icon-button"
                disabled={currentPage >= pages - 1}
                aria-label="Next page"
                onClick={() => setPage(currentPage + 1)}
              >
                <Icon name="chevron" size={16} />
              </button>
            </div>
          </footer>
        </section>
        <footer className="site-footer">
          <span>
            <Icon name="cube" size={16} /> A window into the IMD swarm.
          </span>
          <div>
            <a
              href="https://api.imd.fun/swarm"
              target="_blank"
              rel="noreferrer"
            >
              Public data <Icon name="external" size={12} />
            </a>
            <a href="https://imdoffice.fun/" target="_blank" rel="noreferrer">
              Inspired by IMD Office <Icon name="external" size={12} />
            </a>
          </div>
        </footer>
      </main>
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
      {selectedSeat && (
        <AgentDetail
          key={selectedSeat.tokenId}
          seat={selectedSeat}
          events={events}
          initial={feed.snapshot?.details[selectedSeat.tokenId]}
          autoRefresh={feed.autoRefresh}
          saved={saved.includes(selectedSeat.tokenId)}
          toggleSaved={() => toggleSaved(selectedSeat.tokenId)}
          onClose={closeAgent}
        />
      )}
      {selected !== null && feed.swarm && !selectedSeat && (
        <div className="unavailable-agent" role="status">
          Agent #{selected} is not in the current directory.
          <button className="text-button" onClick={closeAgent}>
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
