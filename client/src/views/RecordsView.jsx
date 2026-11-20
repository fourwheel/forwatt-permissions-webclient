import { useMemo, useState } from "react";
import DataTable from "../components/DataTable.jsx";
import { EmptyState } from "../components/ui.jsx";
import { recordIdOf, statusOf, statusTone } from "../lib/model.js";
import { navigate } from "../lib/router.js";
import { useData } from "../lib/store.jsx";
import { NeedsConnection, StatusChips, withDateRenderers } from "./RequestsView.jsx";

export default function RecordsView() {
  const { auth, records, refresh, requests } = useData();
  const [status, setStatus] = useState("");

  const items = useMemo(
    () => records.items.filter((it) => !status || String(statusOf(it) ?? "unknown") === status),
    [records.items, status]
  );

  if (!auth.token) return <NeedsConnection />;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Permission Records</h1>
          <p className="page-head__sub">Records belonging to the loaded permission requests.</p>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn--ghost" onClick={refresh} disabled={records.loading || requests.loading}>
            {records.loading || requests.loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {records.error && <div className="response response--error">{records.error}</div>}

      <div className="card">
        <StatusChips items={records.items} states={[]} value={status} onChange={setStatus} />
        {records.loading && records.items.length === 0 ? (
          <p className="field__help">Loading permission records...</p>
        ) : records.items.length === 0 ? (
          <EmptyState title="No permission records found">
            Records appear once a data owner has approved a permission request.
          </EmptyState>
        ) : (
          <DataTable
            items={items}
            rowKey={recordIdOf}
            preferredColumns={["state", "status", "id", "permissionRecordId", "permissionRequestId"]}
            cellRenderers={withDateRenderers(items)}
            rowClassName={(it) => `row--${statusTone(statusOf(it))}`}
            onRowClick={(it) => recordIdOf(it) && navigate("records", recordIdOf(it))}
          />
        )}
      </div>
    </div>
  );
}
