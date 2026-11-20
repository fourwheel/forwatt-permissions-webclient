import { useMemo } from "react";
import { StatusBadge } from "../components/ui.jsx";
import { useI18n } from "../lib/i18n.jsx";
import { dateOf, formatDate, pick, recordStatusOf, requestIdOf, statusOf, statusTone } from "../lib/model.js";
import { href } from "../lib/router.js";
import { REQUEST_STATUSES } from "../lib/status.js";
import { useData } from "../lib/store.jsx";
import { requestParticipants } from "../lib/participants.js";
import { ParticipantsInline, RoleIcon, participantsSummary } from "../components/Participants.jsx";
import { NeedsConnection } from "./RequestsView.jsx";

// Whose turn it is, shown as role icons on the status tiles.
const STATUS_ICONS = {
  created: ["dataOwner"],
  waitingForApproval: ["mpo"],
  approved: ["esp", "dataOwner", "mpo"],
};

export default function Dashboard() {
  const { auth, requests, records, refresh, details, catalog, recordsForRequest } = useData();
  const { t } = useI18n();

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

  // Participant state per request (needs the request details).
  const infoOf = (r) => {
    const d = details.byId[requestIdOf(r)];
    return d ? requestParticipants(d, r, recordsForRequest(requestIdOf(r)), catalog.dataHolders) : null;
  };
  const infos = requests.items.map(infoOf).filter(Boolean);
  // Breakdown of the approved requests (needs request details + records).
  const approvedInfos = infos.filter((i) => ["ok", "revoked", "ended"].includes(i.parts.mpo.state) && !i.waitingFor);
  const approvedBreakdown = {
    ready: approvedInfos.filter((i) => i.ready).length,
    revoked: approvedInfos.filter((i) => Object.values(i.parts).some((p) => p.state === "revoked")).length,
    notStarted: approvedInfos.filter((i) => i.notStarted).length,
    ended: approvedInfos.filter((i) => Object.values(i.parts).every((p) => p.state === "ended")).length,
  };
  const approvedParts = [
    approvedBreakdown.ready && t("{n} ready", { n: approvedBreakdown.ready }),
    approvedBreakdown.revoked && t("{n} revoked", { n: approvedBreakdown.revoked }),
    approvedBreakdown.notStarted && t("{n} not started yet", { n: approvedBreakdown.notStarted }),
    approvedBreakdown.ended && t("{n} ended", { n: approvedBreakdown.ended }),
  ].filter(Boolean);

  if (!auth.token) return <NeedsConnection />;

  const loading = requests.loading || records.loading;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{t("Dashboard")}</h1>
          <p className="page-head__sub">{t("Overview of your permission requests and records.")}</p>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn--ghost" onClick={refresh} disabled={loading}>
            {loading ? t("Refreshing...") : t("Refresh")}
          </button>
          <a className="btn" href={href("new")}>
            + {t("New request")}
          </a>
        </div>
      </div>

      {requests.error && <div className="response response--error">{requests.error}</div>}

      {/* One row that adds up: total = sum of the five status tiles. */}
      <div className="tiles tiles--status">
        <a href={href("requests")} className="tile tile--total">
          <div className="tile__value">{loading && !requests.loadedAt ? "…" : requests.items.length}</div>
          <div className="tile__label">{t("Permission requests in total")}</div>
          <div className="tile__sub">{t("= sum of the tiles on the right")}</div>
        </a>
        {REQUEST_STATUSES.map((s) => (
          <a key={s.id} href={href("requests")} className={`tile tile--${statusTone(s.id)}`} title={t(s.description)}>
            <div className="tile__head">
              {STATUS_ICONS[s.id]?.map((r) => (
                <RoleIcon key={r} role={r} size={20} />
              ))}
            </div>
            <div className="tile__value">{loading && !requests.loadedAt ? "…" : counts[s.id] ?? 0}</div>
            <div className="tile__label">{t(s.label)}</div>
            <div className="tile__sub">
              {s.id === "approved" && approvedParts.length ? approvedParts.join(" · ") : t(s.hint)}
            </div>
          </a>
        ))}
      </div>
      <p className="tiles-note">
        <a href={href("records")}>
          {t("{n} permission records", { n: records.loading && !records.loadedAt ? "…" : records.items.length })}
        </a>
        {" – "}
        {t("{n} active", { n: records.items.filter((r) => recordStatusOf(r) === "active").length })}
        {" · "}
        {t("one record per delivery point, so the number can differ from the requests")}
      </p>

      <div className="card">
        <h2>{t("Latest permission requests")}</h2>
        {recent.length === 0 ? (
          <p className="field__help">{loading ? t("Loading...") : t("No permission requests yet.")}</p>
        ) : (
          <ul className="link-list">
            {recent.map((r) => {
              const id = requestIdOf(r);
              return (
                <li key={id} className={`row--${statusTone(statusOf(r))}`}>
                  <a href={href("requests", id)}>
                    <ParticipantsInline info={infoOf(r)} />
                    <span>
                      {pick(details.byId[id], ["permissionRequestPurpose", "purpose"]) ?? <code className="mono">{id}</code>}
                      <span className="link-list__sub">{participantsSummary(infoOf(r), t)}</span>
                    </span>
                    <span className="link-list__extra">{formatDate(dateOf(r))}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
        <a href={href("requests")}>{t("Show all")} →</a>
      </div>
    </div>
  );
}
