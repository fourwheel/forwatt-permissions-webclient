import { useMemo, useState } from "react";
import DataTable from "../components/DataTable.jsx";
import { EmptyState, StatusBadge } from "../components/ui.jsx";
import {
  dateOf,
  formatDate,
  pick,
  recordDeliveryPointOf,
  recordIdOf,
  recordRequestIdOf,
  requestDeliveryPointsOf,
  shortId,
  requestHoldersOf,
  requestIdOf,
  statusOf,
  statusTone,
} from "../lib/model.js";
import { href, navigate } from "../lib/router.js";
import { REQUEST_STATUSES, requestStatusInfo, statusLabel } from "../lib/status.js";
import { useI18n } from "../lib/i18n.jsx";
import { requestParticipants } from "../lib/participants.js";
import { ParticipantsInline, ParticipantsLegend, SituationBadge, participantsSummary, participantsTone, MpoProgressBar } from "../components/Participants.jsx";
import { useData } from "../lib/store.jsx";

const REQUEST_STATES = REQUEST_STATUSES.map((x) => x.id);

// Colored chips that filter a list by status, with counts.
export function StatusChips({ items, states, value, onChange, describe = requestStatusInfo }) {
  const { t } = useI18n();
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
        {t("All")} <span className="chip__count">{items.length}</span>
      </button>
      {all.map((s) => (
        <button
          type="button"
          key={s}
          className={`chip chip--${statusTone(s)} ${value === s ? "chip--active" : ""}`}
          title={t(describe(s)?.description)}
          onClick={() => onChange(value === s ? "" : s)}
        >
          <span className="chip__dot" />
          {t(statusLabel(s))} <span className="chip__count">{counts[s] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

const dateCell = (v) => formatDate(v);
const statusCell = (v) => <StatusBadge status={v} />;
// IDs are shortened in lists; the full value is in the tooltip (and searchable).
const idCell = (v) => (
  <code className="mono" title={v}>
    {shortId(v)}
  </code>
);

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

// Compact, clickable list of the permission records of one request.
function RecordChips({ records }) {
  const { t } = useI18n();
  if (!records.length) return <span className="kv__empty">{t("none yet")}</span>;
  return (
    <span className="record-chips">
      {records.map((r) => (
        <a
          key={recordIdOf(r)}
          href={href("records", recordIdOf(r))}
          className={`record-chip record-chip--${statusTone(statusOf(r))}`}
          title={`${t(statusLabel(statusOf(r)))} - ${t("open record")}`}
          onClick={(e) => e.stopPropagation()}
        >
          {recordDeliveryPointOf(r).split(" ")[0] || shortId(recordIdOf(r))}
        </a>
      ))}
    </span>
  );
}

// Collapsible explanation of a lifecycle.
export function StatusLegend({ statuses, flow }) {
  const { t } = useI18n();
  return (
    <details className="legend">
      <summary>{t("What do the statuses mean?")}</summary>
      {flow && <p className="legend__flow">{flow}</p>}
      <dl>
        {statuses.map((s) => (
          <div key={s.id} className="legend__row">
            <dt>
              <StatusBadge status={s.id} />
            </dt>
            <dd>{t(s.description)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function NeedsConnection() {
  const { t } = useI18n();
  return (
    <EmptyState title={t("Not connected")}>
      {t("Connect to the for.Watt API first.")} <a href={href("connection")}>{t("Open connection settings")}</a>
    </EmptyState>
  );
}

export default function RequestsView() {
  const { auth, requests, records, refresh, details, catalog } = useData();
  const { t, lang } = useI18n();
  const [status, setStatus] = useState("");

  const recordsByRequest = useMemo(() => {
    const m = new Map();
    for (const r of records.items) {
      const id = String(recordRequestIdOf(r));
      if (!m.has(id)) m.set(id, []);
      m.get(id).push(r);
    }
    return m;
  }, [records.items]);

  // One clean row per request; purpose, delivery points and MSBs come from
  // the request details loaded in the background.
  const items = useMemo(
    () =>
      requests.items
        .filter((it) => !status || String(statusOf(it) ?? "unknown") === status)
        .map((it) => {
          const id = requestIdOf(it);
          const d = details.byId[id];
          const recs = recordsByRequest.get(String(id)) ?? [];
          const participants = d ? requestParticipants(d, it, recs, catalog.dataHolders) : null;
          return {
            status: statusOf(it),
            participants,
            situation: participants ? participantsSummary(participants, t, { short: true }) : "…",
            purpose: pick(d, ["permissionRequestPurpose", "purpose"]) ?? (d ? "" : "…"),
            deliveryPoints: d ? requestDeliveryPointsOf(d).join(", ") : "…",
            msb: d ? requestHoldersOf(d, catalog.dataHolders).join(", ") : "…",
            gridUser: d ? pick(d, ["dataOwner.name"]) ?? "" : "…",
            records: recs,
            lastChange: dateOf(it),
            permissionRequestId: id,
          };
        }),
    [requests.items, status, recordsByRequest, details.byId, catalog.dataHolders, t]
  );

  if (!auth.token) return <NeedsConnection />;

  return (
    <div className="list-page">
      <div className="page-head">
        <div>
          <h1>{t("Permission Requests")}</h1>
          <p className="page-head__sub">
            {requests.loadedAt
              ? t("Loaded {time}", { time: requests.loadedAt.toLocaleTimeString(lang === "de" ? "de-DE" : "en-GB") })
              : t("Loading...")}
          </p>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn--ghost" onClick={refresh} disabled={requests.loading}>
            {requests.loading ? t("Refreshing...") : t("Refresh")}
          </button>
          <a className="btn" href={href("new")}>
            + {t("New request")}
          </a>
        </div>
      </div>

      {requests.error && <div className="response response--error">{requests.error}</div>}

      <div className="card">
        <StatusChips items={requests.items} states={REQUEST_STATES} value={status} onChange={setStatus} />
        <ParticipantsLegend />
        <StatusLegend statuses={REQUEST_STATUSES} flow={t("Waiting for grid user → Waiting for MPO → Approved | Rejected | Expired")} />
        {requests.loading && requests.items.length === 0 ? (
          <p className="field__help">{t("Loading permission requests...")}</p>
        ) : requests.items.length === 0 ? (
          <EmptyState title={t("No permission requests found")}>
            <a href={href("new")}>{t("Create your first permission request")}</a>
          </EmptyState>
        ) : (
          <DataTable
            items={items}
            rowKey={requestIdOf}
            preferredColumns={["participants", "situation", "gridUser", "purpose", "records", "msb", "deliveryPoints", "lastChange"]}
            hiddenColumns={["permissionRequestId", "status"]}
            defaultSort={{ key: "lastChange", dir: -1 }}
            columnLabels={{
              status: t("Status"),
              participants: t("Participants"),
              situation: t("Status"),
              purpose: t("Purpose"),
              records: t("Permission Records"),
              msb: t("Metering Point Operator"),
              gridUser: t("Grid User"),
              deliveryPoints: t("Delivery Points"),
              lastChange: t("Last Change"),
              permissionRequestId: t("Request ID"),
            }}
            cellRenderers={{
              ...withDateRenderers(items),
              records: (_, row) => <RecordChips records={row.records} />,
              participants: (_, row) => (row.participants ? <ParticipantsInline info={row.participants} /> : "…"),
              situation: (_, row) => (
                <span className="situation-cell">
                  <SituationBadge info={row.participants} text={row.situation} />
                  {row.participants?.partial && <MpoProgressBar info={row.participants} />}
                </span>
              ),
              gridUser: (v, row) =>
                v ? v : row.participants?.ownerLinked === false ? <span className="muted">{t("Link not opened yet")}</span> : v,
            }}
            rowClassName={(it) => `row--${it.participants ? participantsTone(it.participants) : statusTone(statusOf(it))}`}
            onRowClick={(it) => requestIdOf(it) && navigate("requests", requestIdOf(it))}
          />
        )}
      </div>
    </div>
  );
}

