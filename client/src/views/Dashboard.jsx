import { useMemo } from "react";
import { StatusBadge } from "../components/ui.jsx";
import { dateOf, formatDate, pick, requestIdOf, statusOf, statusTone } from "../lib/model.js";
import { href } from "../lib/router.js";
import { useData } from "../lib/store.jsx";
import { NeedsConnection } from "./RequestsView.jsx";

const TILES = [
  { state: "created", label: "Created" },
  { state: "waitingForApproval", label: "Waiting for approval" },
  { state: "approved", label: "Approved" },
  { state: "rejected", label: "Rejected" },
];

export default function Dashboard() {
  const { auth, requests, records, refresh } = useData();

  const counts = useMemo(() => {
    const c = {};
    for (const r of requests.items) {
      const s = String(statusOf(r) ?? "unknown");
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [requests.items]);

  const recent = useMemo(
    () => [...requests.items].sort((a, b) => String(dateOf(b) ?? "").localeCompare(String(dateOf(a) ?? ""))).slice(0, 8),
    [requests.items]
  );

  if (!auth.token) return <NeedsConnection />;

  const loading = requests.loading || records.loading;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="page-head__sub">Overview of your permission requests and records.</p>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn--ghost" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <a className="btn" href={href("new")}>
            + New request
          </a>
        </div>
      </div>

      {requests.error && <div className="response response--error">{requests.error}</div>}

      <div className="tiles">
        {TILES.map((t) => (
          <a key={t.state} href={href("requests")} className={`tile tile--${statusTone(t.state)}`}>
            <div className="tile__value">{loading && !requests.loadedAt ? "…" : counts[t.state] ?? 0}</div>
            <div className="tile__label">{t.label}</div>
          </a>
        ))}
        <a href={href("records")} className="tile tile--primary">
          <div className="tile__value">{records.loading && !records.loadedAt ? "…" : records.items.length}</div>
          <div className="tile__label">Permission records</div>
        </a>
      </div>

      <div className="card">
        <h2>Latest permission requests</h2>
        {recent.length === 0 ? (
          <p className="field__help">{loading ? "Loading..." : "No permission requests yet."}</p>
        ) : (
          <ul className="link-list">
            {recent.map((r) => {
              const id = requestIdOf(r);
              return (
                <li key={id} className={`row--${statusTone(statusOf(r))}`}>
                  <a href={href("requests", id)}>
                    <StatusBadge status={statusOf(r)} />
                    <span>{pick(r, ["permissionRequestPurpose", "purpose"]) ?? <code className="mono">{id}</code>}</span>
                    <span className="link-list__extra">{formatDate(dateOf(r))}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
        <a href={href("requests")}>Show all →</a>
      </div>
    </div>
  );
}
