import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog, CopyButton, KeyValue, StatusBadge } from "../components/ui.jsx";
import {
  errorText,
  extractList,
  formatDate,
  pick,
  recordIdOf,
  requestIdOf,
  statusOf,
  statusTone,
  toPrefill,
} from "../lib/model.js";
import { href, navigate } from "../lib/router.js";
import { useData } from "../lib/store.jsx";
import { NeedsConnection } from "./RequestsView.jsx";

export function Fact({ label, children }) {
  return (
    <div className="fact">
      <div className="fact__label">{label}</div>
      <div className="fact__value">{children || <span className="kv__empty">-</span>}</div>
    </div>
  );
}

export default function RequestDetail({ id }) {
  const { auth, api, requests, recordsForRequest, refresh, notify, setDraft } = useData();
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
  const measurands = pick(data, ["measurementRequestedInformation", "measurandRequests", "requestedInformation"]);
  const completionUrl = pick(data, ["url", "permissionRequestUrl", "redirectUrl", "link"]);

  const reject = async () => {
    setBusy(true);
    try {
      const res = await api(`v2/permissionrequest/reject/${encodeURIComponent(id)}`, { method: "POST" });
      if (!res.ok) throw new Error(errorText(res));
      notify("Permission request rejected.");
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
        ← All permission requests
      </a>
      <div className="page-head">
        <div>
          <div className="page-head__eyebrow">Permission Request</div>
          <h1>{purpose || <code className="mono">{id}</code>}</h1>
          <div className="page-head__meta">
            <StatusBadge status={status} />
            <code className="mono">{id}</code>
            <CopyButton value={id} label="Copy ID" />
          </div>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn--ghost" onClick={load} disabled={detail.loading}>
            {detail.loading ? "Loading..." : "Refresh"}
          </button>
          <button type="button" className="btn btn--ghost" onClick={duplicate} disabled={!data}>
            Duplicate &amp; edit
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => setConfirm(true)}
            disabled={String(status).toLowerCase() === "rejected"}
            title={String(status).toLowerCase() === "rejected" ? "Already rejected" : ""}
          >
            Reject
          </button>
        </div>
      </div>

      {detail.error && <div className="response response--error">Could not load details: {detail.error}</div>}

      <div className="card facts">
        <Fact label="Status">
          <StatusBadge status={status} />
        </Fact>
        <Fact label="Start">{formatDate(pick(data, ["start", "startDate"]))}</Fact>
        <Fact label="End">{formatDate(pick(data, ["end", "endDate"])) || "no expiry"}</Fact>
        <Fact label="Data period">
          {[formatDate(pick(data, ["dataStart"])), formatDate(pick(data, ["dataEnd"]))].filter(Boolean).join(" – ")}
        </Fact>
        <Fact label={serviceId ? "Service Id" : "Purpose"}>{serviceId || purpose}</Fact>
        <Fact label="Measurand requests">{Array.isArray(measurands) ? measurands.length : null}</Fact>
        <Fact label="Permission records">{linkedRecords.length}</Fact>
        {completionUrl && (
          <Fact label="Completion link">
            <a href={completionUrl} target="_blank" rel="noreferrer">
              Open
            </a>
          </Fact>
        )}
      </div>

      <div className="card">
        <h2>Permission Records</h2>
        {linkedRecords.length === 0 ? (
          <p className="field__help">No permission records for this request (yet).</p>
        ) : (
          <ul className="link-list">
            {linkedRecords.map((r) => {
              const rid = recordIdOf(r);
              return (
                <li key={rid} className={`row--${statusTone(statusOf(r))}`}>
                  <a href={href("records", rid)}>
                    <StatusBadge status={statusOf(r)} />
                    <code className="mono">{rid}</code>
                    <span className="link-list__extra">{pick(r, ["deliveryPointCodeValue", "deliveryPoint.codeValue", "codeValue"]) ?? ""}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Details</h2>
        {data ? <KeyValue data={data} /> : <p className="field__help">{detail.loading ? "Loading..." : "No data."}</p>}
        <details className="raw">
          <summary>Raw JSON</summary>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </details>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Reject permission request?"
        confirmLabel="Reject request"
        busy={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={reject}
      >
        <p>
          The permission request <code className="mono">{id}</code> will be rejected. The for.Watt API does not
          allow editing a request - to change it, use "Duplicate &amp; edit" to create a new one.
        </p>
      </ConfirmDialog>
    </div>
  );
}
