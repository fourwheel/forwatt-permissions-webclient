import { useCallback, useEffect, useState } from "react";
import { ActorLabel, ConfirmDialog, CopyButton, KeyValue, StatusBadge } from "../components/ui.jsx";
import {
  errorText,
  extractList,
  formatDate,
  MEASURAND_REQUEST_KEYS,
  actorOf,
  holderForRecord,
  recordDeliveryPointOf,
  pick,
  recordIdOf,
  requestDeliveryPointsOf,
  requestHoldersOf,
  requestIdOf,
  statusOf,
  statusTone,
  toPrefill,
  completionLinkFor,
} from "../lib/model.js";
import { href, navigate } from "../lib/router.js";
import { REQUEST_STATUSES, canRejectRequest, requestStatusInfo, statusLabel } from "../lib/status.js";
import { useData } from "../lib/store.jsx";
import { useI18n } from "../lib/i18n.jsx";
import { requestParticipants } from "../lib/participants.js";
import { PartialBadge, ParticipantsPanel } from "../components/Participants.jsx";
import { NeedsConnection } from "./RequestsView.jsx";

export function Fact({ label, children }) {
  return (
    <div className="fact">
      <div className="fact__label">{label}</div>
      <div className="fact__value">{children === null || children === undefined || children === "" ? <span className="kv__empty">-</span> : children}</div>
    </div>
  );
}

// Lifecycle bar: Created -> Waiting for approval -> one of the final states.
function Lifecycle({ status }) {
  const { t } = useI18n();
  const info = requestStatusInfo(status);
  const order = ["created", "waitingForApproval"];
  const reached = (id) => {
    if (!info) return false;
    if (info.id === id || info.final) return true;
    return order.indexOf(id) < order.indexOf(info.id);
  };
  return (
    <div className="card lifecycle">
      <ol className="lifecycle__steps">
        {REQUEST_STATUSES.filter((s) => !s.final).map((s) => [
          <li key={s.id} className={`lifecycle__step ${reached(s.id) ? "is-reached" : ""} ${info?.id === s.id ? "is-current" : ""}`}>
            {t(s.label)}
          </li>,
          <li key={`${s.id}-arrow`} className="lifecycle__arrow" aria-hidden>
            →
          </li>,
        ])}
        <li className="lifecycle__finals">
          {REQUEST_STATUSES.filter((s) => s.final).map((s) => (
            <span
              key={s.id}
              className={`lifecycle__final lifecycle__final--${statusTone(s.id)} ${info?.id === s.id ? "is-current" : ""}`}
            >
              {t(s.label)}
            </span>
          ))}
        </li>
      </ol>
      {info && (
        <p className="lifecycle__text">
          {t(info.description)}
          {info.next && (
            <>
              {" "}
              <strong>{t("Next step: {who}.", { who: t(info.next) })}</strong>
            </>
          )}
        </p>
      )}
    </div>
  );
}

export default function RequestDetail({ id }) {
  const { auth, api, requests, recordsForRequest, refresh, notify, setDraft, catalog } = useData();
  const { t } = useI18n();
  const listItem = requests.items.find((r) => String(requestIdOf(r)) === String(id));
  const [detail, setDetail] = useState({ loading: true, error: null, data: null });
  const [records, setRecords] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setDetail((d) => ({ ...d, loading: true, error: null }));
    const [res, rec] = await Promise.all([
      api(`v2/permissionrequest/${encodeURIComponent(id)}`).catch((e) => ({ ok: false, status: 0, data: e.message })),
      api("v2/permissionrecord/find", { method: "POST", body: { permissionRequestIds: [id] } }).catch(() => null),
    ]);
    setDetail(res.ok ? { loading: false, error: null, data: res.data } : { loading: false, error: errorText(res), data: null });
    setRecords(rec?.ok ? extractList(rec.data) : null);
  }, [api, id]);

  useEffect(() => {
    if (auth.token) load();
  }, [auth.token, load]);

  if (!auth.token) return <NeedsConnection />;

  const data = detail.data ?? listItem ?? null;
  const status = statusOf(detail.data) ?? statusOf(listItem);
  const linkedRecords = records ?? recordsForRequest(id);
  const purpose = pick(data, ["permissionRequestPurpose", "purpose"]);
  const serviceId = pick(data, ["serviceId", "service.id"]);
  const measurands = pick(data, MEASURAND_REQUEST_KEYS);
  const completionUrl = pick(data, ["url", "permissionRequestUrl", "redirectUrl", "link"]) ?? completionLinkFor(auth.apiBaseUrl, id);
  const partInfo = data ? requestParticipants(data, listItem, linkedRecords, catalog.dataHolders) : null;
  // Only useful while the grid user has not completed the request yet.
  const showCompletion = completionUrl && String(status ?? "").toLowerCase() === "created";

  const reject = async () => {
    setBusy(true);
    try {
      const res = await api(`v2/permissionrequest/reject/${encodeURIComponent(id)}`, { method: "POST" });
      if (!res.ok) throw new Error(errorText(res));
      notify(t("Permission request rejected."));
      setConfirm(false);
      await load();
      refresh();
    } catch (err) {
      notify(err.message || String(err), "err");
    } finally {
      setBusy(false);
    }
  };

  const duplicate = () => {
    setDraft({ prefill: toPrefill(data), sourceId: id });
    navigate("new");
  };

  return (
    <div className={`detail-page detail-page--${statusTone(status)}`}>
      <a className="back-link" href={href("requests")}>
        ← {t("All permission requests")}
      </a>
      <div className="page-head">
        <div>
          <div className="page-head__eyebrow">{t("Permission Request")}</div>
          <h1>{purpose || <code className="mono">{id}</code>}</h1>
          <div className="page-head__meta">
            {partInfo?.partial ? <PartialBadge info={partInfo} /> : <StatusBadge status={status} />}
            <code className="mono">{id}</code>
            <CopyButton value={id} label={t("Copy ID")} />
          </div>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn--ghost" onClick={load} disabled={detail.loading}>
            {detail.loading ? t("Loading...") : t("Refresh")}
          </button>
          <button type="button" className="btn btn--ghost" onClick={duplicate} disabled={!data}>
            {t("Use as template")}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => setConfirm(true)}
            disabled={!canRejectRequest(status)}
            title={
              canRejectRequest(status)
                ? t("Reject (cancel) this request")
                : t("Not possible - the request is already {status}", { status: t(statusLabel(status)) })
            }
          >
            {t("Reject / cancel")}
          </button>
        </div>
      </div>

      {detail.error && <div className="response response--error">{t("Could not load details:")} {detail.error}</div>}
      {listItem && detail.data && statusOf(detail.data) && String(listItem.listedStatus ?? statusOf(listItem)) !== String(statusOf(detail.data)) && (
        <p className="field__help status-note">
          {t("Current status from the request itself. The API's status change list still shows this as the latest change:")}{" "}
          <strong>{t(statusLabel(listItem.listedStatus ?? statusOf(listItem)))}</strong>
        </p>
      )}

      <ParticipantsPanel info={partInfo} />

      {showCompletion && (
        <div className="card completion-card">
          <h2>{t("Link for the grid user")}</h2>
          <p className="muted">{t("Send this link to the grid user. They complete the request, check the details and grant the permission:")}</p>
          {/* Deliberately not clickable: meant for the grid user, not the ESP. */}
          <div className="link-row">
            <code className="link-text">{completionUrl}</code>
            <CopyButton value={completionUrl} label={t("Copy link")} />
          </div>
        </div>
      )}
      <Lifecycle status={status} />

      <div className="card facts">
        <Fact label={t("Status")}>
          {partInfo?.partial ? <PartialBadge info={partInfo} /> : <StatusBadge status={status} />}
        </Fact>
        <Fact label={t("Start")}>{formatDate(pick(data, ["start", "startDate"]))}</Fact>
        <Fact label={t("End")}>{formatDate(pick(data, ["end", "endDate"])) || t("no expiry")}</Fact>
        <Fact label={t("Data period")}>
          {[formatDate(pick(data, ["dataStart"])), formatDate(pick(data, ["dataEnd"]))].filter(Boolean).join(" – ")}
        </Fact>
        <Fact label={serviceId ? "Service Id" : t("Purpose")}>{serviceId || purpose}</Fact>
        <Fact label={t("Measurand requests")}>{Array.isArray(measurands) ? measurands.length : null}</Fact>
        <Fact label={t("Delivery points")}>{requestDeliveryPointsOf(data).join(", ")}</Fact>
        <Fact label={t("Metering point operators")}>{requestHoldersOf(data, catalog.dataHolders).join(", ")}</Fact>
        <Fact label={t("Grid user")}>{pick(data, ["dataOwner.name"])}</Fact>
        <Fact label={t("Permission records")}>{linkedRecords.length}</Fact>
        {listItem?.actorId && !listItem.listedStatus && (
          <Fact label={t("Last status change by")}>
            {actorOf(listItem.actorId, data) ? <ActorLabel actor={actorOf(listItem.actorId, data)} /> : null}
          </Fact>
        )}
      </div>

      <div className="card">
        <h2>{t("Permission Records")}</h2>
        {linkedRecords.length === 0 ? (
          <p className="field__help">{t("No permission records for this request (yet).")}</p>
        ) : (
          <ul className="link-list">
            {linkedRecords.map((r) => {
              const rid = recordIdOf(r);
              return (
                <li key={rid} className={`row--${statusTone(statusOf(r))}`}>
                  <a href={href("records", rid)}>
                    <StatusBadge status={statusOf(r)} />
                    <span>
                      <strong>{recordDeliveryPointOf(r) || t("no delivery point")}</strong>
                      <span className="link-list__sub">
                        {[
                          holderForRecord(r, data, catalog.dataHolders),
                          Array.isArray(r.measurands) ? r.measurands.map((m) => m.measurandCode).join(", ") : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="link-list__extra">
                      {r.terminatedOn
                        ? t("revoked {date}", { date: formatDate(r.terminatedOn) })
                        : t("since {date}", { date: formatDate(r.start) })}
                      {r.terminatedOn && actorOf(r.terminatedById, data) && (
                        <>
                          {" "}
                          {t("by")} <ActorLabel actor={actorOf(r.terminatedById, data)} />
                        </>
                      )}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>{t("Details")}</h2>
        {data ? <KeyValue data={data} /> : <p className="field__help">{detail.loading ? t("Loading...") : t("No data.")}</p>}
        <details className="raw">
          <summary>{t("Raw JSON")}</summary>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </details>
      </div>

      <ConfirmDialog
        open={confirm}
        title={t("Reject permission request?")}
        confirmLabel={t("Reject request")}
        busy={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={reject}
      >
        <p>
          {t("The permission request will be rejected (cancelled) by you as the energy service provider:")} <code className="mono">{id}</code>
        </p>
        <p>
          {t('The for.Watt API does not allow editing a request - to change it, use "Use as template" to create a new one.')}
        </p>
      </ConfirmDialog>
    </div>
  );
}
