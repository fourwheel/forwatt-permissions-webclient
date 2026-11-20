import { useCallback, useEffect, useState } from "react";
import { ActorLabel, ConfirmDialog, CopyButton, KeyValue, StatusBadge } from "../components/ui.jsx";
import {
  errorText,
  formatDate,
  actorOf,
  holderForRecord,
  pick,
  recordDeliveryPointOf,
  recordIdOf,
  recordRequestIdOf,
  statusOf,
  statusTone,
} from "../lib/model.js";
import { href } from "../lib/router.js";
import { canRevokeRecord, recordStatusInfo, statusLabel } from "../lib/status.js";
import { useData } from "../lib/store.jsx";
import { useI18n } from "../lib/i18n.jsx";
import { recordParticipants } from "../lib/participants.js";
import { ParticipantsPanel } from "../components/Participants.jsx";
import { Fact } from "./RequestDetail.jsx";
import { NeedsConnection } from "./RequestsView.jsx";

export default function RecordDetail({ id }) {
  const { auth, api, records, refresh, notify, catalog, details } = useData();
  const i18n = useI18n();
  const listItem = records.items.find((r) => String(recordIdOf(r)) === String(id));
  const [detail, setDetail] = useState({ loading: true, error: null, data: null });
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  // The parent permission request - used to find the MSB if the record
  // itself does not name it.
  const [parentRequest, setParentRequest] = useState(null);

  const load = useCallback(async () => {
    setDetail((d) => ({ ...d, loading: true, error: null }));
    try {
      const res = await api(`v2/permissionrecord/${encodeURIComponent(id)}`);
      setDetail(res.ok ? { loading: false, error: null, data: res.data } : { loading: false, error: errorText(res), data: null });
      const record = res.ok ? res.data : listItem;
      const reqId = recordRequestIdOf(record);
      if (reqId) {
        const req = await api(`v2/permissionrequest/${encodeURIComponent(reqId)}`).catch(() => null);
        setParentRequest(req?.ok ? req.data : null);
      }
    } catch (err) {
      setDetail({ loading: false, error: err.message || String(err), data: null });
    }
  }, [api, id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (auth.token) load();
  }, [auth.token, load]);

  if (!auth.token) return <NeedsConnection />;

  const data = detail.data ?? listItem ?? null;
  const status = statusOf(detail.data) ?? statusOf(listItem);
  const requestId = recordRequestIdOf(data);
  const request = parentRequest ?? details.byId[requestId] ?? null;
  const terminated = !canRevokeRecord(status);
  const { t } = i18n;

  const terminate = async () => {
    setBusy(true);
    try {
      const res = await api(`v2/permissionrecord/terminate/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(errorText(res));
      notify(t("Permission record revoked."));
      setConfirm(false);
      await load();
      refresh();
    } catch (err) {
      notify(err.message || String(err), "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`detail-page detail-page--${statusTone(status)}`}>
      <a className="back-link" href={href("records")}>
        ← {t("All permission records")}
      </a>
      <div className="page-head">
        <div>
          <div className="page-head__eyebrow">{t("Permission Record")}</div>
          <h1>
            {[recordDeliveryPointOf(data), pick(data, ["permissionRequestPurpose"]) ?? pick(request, ["permissionRequestPurpose"])]
              .filter(Boolean)
              .join(" · ") || <code className="mono">{id}</code>}
          </h1>
          <div className="page-head__meta">
            <StatusBadge status={status} />
            <code className="mono">{id}</code>
            <CopyButton value={id} label={t("Copy ID")} />
          </div>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn--ghost" onClick={load} disabled={detail.loading}>
            {detail.loading ? t("Loading...") : t("Refresh")}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => setConfirm(true)}
            disabled={terminated}
            title={
              terminated
                ? t("Not possible - the record is already {status}", { status: t(statusLabel(status)) })
                : t("Revoke this permission")
            }
          >
            {t("Revoke")}
          </button>
        </div>
      </div>

      {detail.error && <div className="response response--error">{t("Could not load details:")} {detail.error}</div>}
      {recordStatusInfo(status) && <p className="field__help status-note">{t(recordStatusInfo(status).description)}</p>}

      {data && request && <ParticipantsPanel info={recordParticipants(data, request, catalog.dataHolders)} />}

      <div className="card facts">
        <Fact label={t("Status")}>
          <StatusBadge status={status} />
        </Fact>
        <Fact label={t("Permission request")}>
          {requestId && (
            <a href={href("requests", requestId)}>
              <code className="mono">{requestId}</code>
            </a>
          )}
        </Fact>
        <Fact label={t("Metering point operator")}>
          {holderForRecord(data, request, catalog.dataHolders) ?? (detail.loading || !request ? "…" : t("not found"))}
        </Fact>
        <Fact label={t("Grid user")}>{pick(request, ["dataOwner.name"]) ?? pick(data, ["dataOwnerId", "dataOwner.id"])}</Fact>
        <Fact label={t("Delivery point")}>
          {recordDeliveryPointOf(data) || t("none")}
        </Fact>
        <Fact label={t("Measuring products")}>
          {(() => {
            // The single-record endpoint omits measurands; the list (find) has them.
            const ms = data?.measurands ?? listItem?.measurands;
            return Array.isArray(ms) ? ms.map((m) => m.measurandCode).filter(Boolean).join(", ") : null;
          })()}
        </Fact>
        <Fact label={t("Purpose")}>{pick(data, ["permissionRequestPurpose"]) ?? pick(request, ["permissionRequestPurpose"])}</Fact>
        <Fact label={t("Revoked on")}>{formatDate(pick(data, ["terminatedOn"]))}</Fact>
        {data?.terminatedById && (
          <Fact label={t("Revoked by")}>
            {actorOf(data.terminatedById, request) ? (
              <ActorLabel actor={actorOf(data.terminatedById, request)} />
            ) : request ? (
              <code className="mono">{data.terminatedById}</code>
            ) : (
              "…"
            )}
          </Fact>
        )}
        <Fact label={t("Start")}>{formatDate(pick(data, ["start", "startDate", "validFrom"]))}</Fact>
        <Fact label={t("End")}>{formatDate(pick(data, ["end", "endDate", "validTo"]))}</Fact>
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
        title={t("Revoke permission record?")}
        confirmLabel={t("Revoke permission")}
        busy={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={terminate}
      >
        <p>
          {t("This revokes the permission record")} <code className="mono">{id}</code>{" "}
          <strong>{t("and all other records stemming from the same permission request.")}</strong>
        </p>
      </ConfirmDialog>
    </div>
  );
}
