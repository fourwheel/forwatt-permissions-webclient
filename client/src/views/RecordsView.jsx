import { useMemo, useState } from "react";
import DataTable from "../components/DataTable.jsx";
import { EmptyState } from "../components/ui.jsx";
import { holderForRecord, pick, recordDeliveryPointOf, recordIdOf, recordRequestIdOf, statusOf, statusTone } from "../lib/model.js";
import { recordParticipants } from "../lib/participants.js";
import { ParticipantsInline, ParticipantsLegend, participantsSummary } from "../components/Participants.jsx";
import { navigate } from "../lib/router.js";
import { useData } from "../lib/store.jsx";
import { NeedsConnection, StatusChips, StatusLegend, withDateRenderers } from "./RequestsView.jsx";
import { RECORD_STATUSES, recordStatusInfo } from "../lib/status.js";
import { useI18n } from "../lib/i18n.jsx";

export default function RecordsView() {
  const { auth, records, refresh, requests, catalog, details } = useData();
  const { t } = useI18n();
  const [status, setStatus] = useState("");

  const items = useMemo(
    () =>
      records.items
        .filter((it) => !status || String(statusOf(it) ?? "unknown") === status)
        // One clean row per record. Records do not name their MSB - it
        // comes from the parent request's matching delivery point.
        .map((it) => {
          const request = details.byId[recordRequestIdOf(it)];
          const participants = request ? recordParticipants(it, request, catalog.dataHolders) : null;
          return {
            status: statusOf(it),
            participants,
            situation: participants ? participantsSummary(participants, t) : "…",
            msb: holderForRecord(it, request, catalog.dataHolders) ?? (request ? "" : "…"),
            deliveryPoint: recordDeliveryPointOf(it) || "-",
            measurands: Array.isArray(it.measurands) ? it.measurands.map((m) => m.measurandCode).filter(Boolean).join(", ") : "",
            purpose: pick(it, ["permissionRequestPurpose"]) ?? "",
            start: it.start ?? null,
            end: it.end ?? null,
            terminatedOn: it.terminatedOn ?? null,
            lastChange: it.updatedOn ?? it.createdOn ?? null,
            id: recordIdOf(it),
            permissionRequestId: recordRequestIdOf(it),
          };
        }),
    [records.items, status, catalog.dataHolders, details.byId, t]
  );

  if (!auth.token) return <NeedsConnection />;

  return (
    <div className="list-page">
      <div className="page-head">
        <div>
          <h1>{t("Permission Records")}</h1>
          <p className="page-head__sub">{t("Records belonging to the loaded permission requests.")}</p>
        </div>
        <div className="button-row">
          <button type="button" className="btn btn--ghost" onClick={refresh} disabled={records.loading || requests.loading}>
            {records.loading || requests.loading ? t("Refreshing...") : t("Refresh")}
          </button>
        </div>
      </div>

      {records.error && <div className="response response--error">{records.error}</div>}

      <div className="card">
        <StatusChips
          items={records.items}
          states={RECORD_STATUSES.map((x) => x.id)}
          value={status}
          onChange={setStatus}
          describe={recordStatusInfo}
        />
        <ParticipantsLegend />
        <StatusLegend statuses={RECORD_STATUSES} />
        {records.loading && records.items.length === 0 ? (
          <p className="field__help">{t("Loading permission records...")}</p>
        ) : records.items.length === 0 ? (
          <EmptyState title={t("No permission records found")}>
            {t("Records appear once a permission request has been approved.")}
          </EmptyState>
        ) : (
          <DataTable
            items={items}
            rowKey={recordIdOf}
            preferredColumns={["participants", "situation", "deliveryPoint", "msb", "measurands", "purpose", "start", "end", "terminatedOn", "lastChange", "status"]}
            hiddenColumns={["id", "permissionRequestId"]}
            defaultSort={{ key: "lastChange", dir: -1 }}
            columnLabels={{
              status: t("Status"),
              participants: t("Participants"),
              situation: t("Situation"),
              msb: t("Metering Point Operator"),
              deliveryPoint: t("Delivery Point"),
              measurands: t("Measuring Products"),
              purpose: t("Purpose"),
              start: t("Start"),
              end: t("End"),
              terminatedOn: t("Revoked On"),
              lastChange: t("Last Change"),
              id: t("Record ID"),
              permissionRequestId: t("Request ID"),
            }}
            cellRenderers={{
              ...withDateRenderers(items),
              participants: (_, row) => (row.participants ? <ParticipantsInline info={row.participants} /> : "…"),
            }}
            rowClassName={(it) => `row--${statusTone(statusOf(it))}`}
            onRowClick={(it) => recordIdOf(it) && navigate("records", recordIdOf(it))}
          />
        )}
      </div>
    </div>
  );
}
