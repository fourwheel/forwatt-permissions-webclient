import { useMemo, useState } from "react";
import DataTable from "../components/DataTable.jsx";
import { EmptyState, StatusBadge } from "../components/ui.jsx";
import { formatDate, recordRequestIdOf, requestIdOf, statusOf, statusTone } from "../lib/model.js";
import { href, navigate } from "../lib/router.js";
import { useData } from "../lib/store.jsx";

const REQUEST_STATES = ["created", "waitingForApproval", "approved", "rejected"];

// Colored chips that filter a list by status, with counts.
export function StatusChips({ items, states, value, onChange }) {
  const counts = useMemo(() => {
    const c = {};
    for (const it of items) {
      const s = String(statusOf(it) ?? "unknown");
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [items]);
  const all = [...new Set([...states, ...Object.keys(counts)])];
  return (
    <div className="chips">
      <button type="button" className={`chip ${value === "" ? "chip--active" : ""}`} onClick={() => onChange("")}>
        All <span className="chip__count">{items.length}</span>
      </button>
      {all.map((s) => (
        <button
          type="button"
          key={s}
          className={`chip chip--${statusTone(s)} ${value === s ? "chip--active" : ""}`}
          onClick={() => onChange(value === s ? "" : s)}
        >
          <span className="chip__dot" />
          {s} <span className="chip__count">{counts[s] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

const dateCell = (v) => formatDate(v);
const statusCell = (v) => <StatusBadge status={v} />;
const idCell = (v) => <code className="mono">{v}</code>;

export const commonRenderers = {
  state: statusCell,
  status: statusCell,
  id: idCell,
  permissionRequestId: idCell,
  permissionRecordId: idCell,
};

export function withDateRenderers(items) {
  const r = { ...commonRenderers };
  for (const it of items.slice(0, 20)) {
    for (const [k, v] of Object.entries(it ?? {})) {
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) r[k] = dateCell;
    }
  }
  return r;
}

export function NeedsConnection() {
  return (
    <EmptyState title="Not connected">
      Connect to the for.Watt API first. <a href={href("connection")}>Open connection settings</a>
    </EmptyState>
  );
}

export default function RequestsView() {
  const { auth, requests, records, refresh } = useData();
  const [status, setStatus] = useState("");

  const recordCount = useMemo(() => {
    const m = new Map();
    for (const r of records.items) {
      const id = String(recordRequestIdOf(r));
      m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [records.items]);

  const items = useMemo(
    () =>
      requests.items
        .filter((it) => !status || String(statusOf(it) ?? "unknown") === status)
        .map((it) => ({ ...it, records: recordCount.get(String(requestIdOf(it))) ?? 0 })),
    [requests.items, status, recordCount]
  );

  if (!auth.token) return <NeedsConnection />;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Permission Requests</h1>
          <p className="page-head__sub">
            {requests.loadedAt ? `Loaded ${requests.loadedAt.toLocaleTimeString("de-DE")}` : "Loading..."}
          </p>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn--ghost" onClick={refresh} disabled={requests.loading}>
            {requests.loading ? "Refreshing..." : "Refresh"}
          </button>
          <a className="btn" href={href("new")}>
            + New request
          </a>
        </div>
      </div>

      {requests.error && <div className="response response--error">{requests.error}</div>}

      <div className="card">
        <StatusChips items={requests.items} states={REQUEST_STATES} value={status} onChange={setStatus} />
        {requests.loading && requests.items.length === 0 ? (
          <p className="field__help">Loading permission requests...</p>
        ) : requests.items.length === 0 ? (
          <EmptyState title="No permission requests found">
            <a href={href("new")}>Create your first permission request</a>
          </EmptyState>
        ) : (
          <DataTable
            items={items}
            rowKey={requestIdOf}
            preferredColumns={["state", "status", "permissionRequestId", "id", "records"]}
            cellRenderers={withDateRenderers(items)}
            rowClassName={(it) => `row--${statusTone(statusOf(it))}`}
            onRowClick={(it) => requestIdOf(it) && navigate("requests", requestIdOf(it))}
          />
        )}
      </div>
    </div>
  );
}

