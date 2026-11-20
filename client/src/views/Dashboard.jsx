import { useMemo } from "react";
import { StatusBadge } from "../components/ui.jsx";
import { useI18n } from "../lib/i18n.jsx";
import { dateOf, formatDate, pick, requestIdOf, statusOf, statusTone } from "../lib/model.js";
import { href } from "../lib/router.js";
import { REQUEST_STATUSES } from "../lib/status.js";
import { useData } from "../lib/store.jsx";
import { requestParticipants } from "../lib/participants.js";
import { ParticipantsInline, RoleIcon, participantsSummary } from "../components/Participants.jsx";
import { NeedsConnection } from "./RequestsView.jsx";

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
  const waiting = {
    dataOwner: infos.filter((i) => i.waitingFor === "dataOwner").length,
    mpo: infos.filter((i) => i.waitingFor === "mpo").length,
    ready: infos.filter((i) => i.ready).length,
  };

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

      <div className="tiles tiles--focus">
        <a href={href("requests")} className="tile tile--warn">
          <div className="tile__head">
            <RoleIcon role="dataOwner" size={22} />
          </div>
          <div className="tile__value">{details.loading && !infos.length ? "…" : waiting.dataOwner}</div>
          <div className="tile__label">{t("Waiting for the grid user")}</div>
        </a>
        <a href={href("requests")} className="tile tile--warn">
          <div className="tile__head">
            <RoleIcon role="mpo" size={22} />
          </div>
          <div className="tile__value">{details.loading && !infos.length ? "…" : waiting.mpo}</div>
          <div className="tile__label">{t("Waiting for the metering point operator")}</div>
        </a>
        <a href={href("records")} className="tile tile--ok">
          <div className="tile__head">
            <RoleIcon role="esp" size={22} />
            <RoleIcon role="dataOwner" size={22} />
            <RoleIcon role="mpo" size={22} />
          </div>
          <div className="tile__value">{details.loading && !infos.length ? "…" : waiting.ready}</div>
          <div className="tile__label">{t("Ready – all three agreed")}</div>
        </a>
      </div>

      <div className="tiles">
        {REQUEST_STATUSES.map((s) => (
          <a key={s.id} href={href("requests")} className={`tile tile--${statusTone(s.id)}`} title={t(s.description)}>
            <div className="tile__value">{loading && !requests.loadedAt ? "…" : counts[s.id] ?? 0}</div>
            <div className="tile__label">{t(s.label)}</div>
          </a>
        ))}
        <a href={href("records")} className="tile tile--primary">
          <div className="tile__value">{records.loading && !records.loadedAt ? "…" : records.items.length}</div>
          <div className="tile__label">{t("Permission records")}</div>
        </a>
      </div>

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
