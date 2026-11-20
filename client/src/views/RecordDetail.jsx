import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog, CopyButton, KeyValue, StatusBadge } from "../components/ui.jsx";
import { errorText, formatDate, pick, recordIdOf, recordRequestIdOf, statusOf, statusTone } from "../lib/model.js";
import { href } from "../lib/router.js";
import { useData } from "../lib/store.jsx";
import { Fact } from "./RequestDetail.jsx";
import { NeedsConnection } from "./RequestsView.jsx";

export default function RecordDetail({ id }) {
  const { auth, api, records, refresh, notify } = useData();
  const listItem = records.items.find((r) => String(recordIdOf(r)) === String(id));
  const [detail, setDetail] = useState({ loading: true, error: null, data: null });
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setDetail((d) => ({ ...d, loading: true, error: null }));
    try {
      const res = await api(`v2/permissionrecord/${encodeURIComponent(id)}`);
      setDetail(res.ok ? { loading: false, error: null, data: res.data } : { loading: false, error: errorText(res), data: null });
    } catch (err) {
      setDetail({ loading: false, error: err.message || String(err), data: null });
    }
  }, [api, id]);

  useEffect(() => {
    if (auth.token) load();
  }, [auth.token, load]);

  if (!auth.token) return <NeedsConnection />;

  const data = detail.data ?? listItem ?? null;
  const status = statusOf(detail.data) ?? statusOf(listItem);
  const requestId = recordRequestIdOf(data);
  const terminated = /terminat|revok/i.test(String(status ?? ""));

  const terminate = async () => {
    setBusy(true);
    try {
      const res = await api(`v2/permissionrecord/terminate/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(errorText(res));
      notify("Permission record terminated.");
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
        ← All permission records
      </a>
      <div className="page-head">
        <div>
          <div className="page-head__eyebrow">Permission Record</div>
          <h1>
            <code className="mono">{id}</code>
          </h1>
          <div className="page-head__meta">
            <StatusBadge status={status} />
            <CopyButton value={id} label="Copy ID" />
          </div>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn--ghost" onClick={load} disabled={detail.loading}>
            {detail.loading ? "Loading..." : "Refresh"}
          </button>
          <button type="button" className="btn btn--danger" onClick={() => setConfirm(true)} disabled={terminated}>
            Terminate
          </button>
        </div>
      </div>

      {detail.error && <div className="response response--error">Could not load details: {detail.error}</div>}

      <div className="card facts">
        <Fact label="Status">
          <StatusBadge status={status} />
        </Fact>
        <Fact label="Permission request">
          {requestId && (
            <a href={href("requests", requestId)}>
              <code className="mono">{requestId}</code>
            </a>
          )}
        </Fact>
        <Fact label="Data owner">{pick(data, ["dataOwnerId", "dataOwner.id"])}</Fact>
        <Fact label="Delivery point">{pick(data, ["deliveryPointCodeValue", "deliveryPoint.codeValue", "codeValue"])}</Fact>
        <Fact label="Start">{formatDate(pick(data, ["start", "startDate", "validFrom"]))}</Fact>
        <Fact label="End">{formatDate(pick(data, ["end", "endDate", "validTo"]))}</Fact>
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
        title="Terminate permission record?"
        confirmLabel="Terminate record"
        busy={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={terminate}
      >
        <p>
          This terminates the permission record <code className="mono">{id}</code> <strong>and all other records
          linked to the same permission request</strong>.
        </p>
      </ConfirmDialog>
    </div>
  );
}
