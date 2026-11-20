import EndpointForm from "../components/EndpointForm.jsx";
import PermissionRequestFlow from "../components/PermissionRequestFlow.jsx";
import { href } from "../lib/router.js";

const TABS = [
  { id: "prereq", label: "Prerequisites" },
  { id: "requests", label: "Permission Requests" },
  { id: "records", label: "Permission Records" },
];

// The original endpoint-by-endpoint forms, unchanged.
export default function ApiExplorer({ auth, sub: rawSub }) {
  const sub = TABS.some((t) => t.id === rawSub) ? rawSub : TABS[0].id;
  return (
    <div className="explorer">
      <div className="page-head">
        <div>
          <h1>API Explorer</h1>
          <p className="page-head__sub">Call each for.Watt endpoint directly and see the raw response.</p>
        </div>
      </div>
      <nav className="tabs">
        {TABS.map((t) => (
          <a key={t.id} href={href("explorer", t.id)} className={`tab ${sub === t.id ? "tab--active" : ""}`}>
            {t.label}
          </a>
        ))}
      </nav>

        <div className="tab-panel" hidden={sub !== "prereq"}>
            <EndpointForm
              title="Measurand Capabilities"
              description="List of all measurand codes with their related information."
              method="GET"
              pathTemplate="v2/measurand-capabilities"
              fields={[]}
              hasBody={false}
              auth={auth}
            />
            <EndpointForm
              title="Active Data Holders"
              description="All active companies of type MPO."
              method="GET"
              pathTemplate="v2/active-dataholders"
              fields={[]}
              hasBody={false}
              auth={auth}
            />
        </div>

        <div className="tab-panel" hidden={sub !== "requests"}>
            <PermissionRequestFlow auth={auth} />

            <EndpointForm
              title="Get Permission Request"
              description="Returns the details of an existing permission request."
              method="GET"
              pathTemplate="v2/permissionrequest/{id}"
              hasBody={false}
              fields={[
                { name: "id", label: "Permission Request Id (guid)", type: "text", required: true, isPath: true, placeholder: "3fa85f64-5717-4562-b3fc-2c963f66afa6" },
              ]}
              auth={auth}
            />

            <EndpointForm
              title="Permission Request State Changes"
              description="Returns status changes of permission requests matching the filter. Only the latest status change per permission request is returned."
              method="POST"
              pathTemplate="v2/permissionrequest/statechanges"
              hasBody
              fields={[
                { name: "startDate", label: "Start Date", type: "date", help: "If set, endDate must be set as well." },
                { name: "endDate", label: "End Date", type: "date" },
                {
                  name: "state",
                  label: "Status",
                  type: "select",
                  options: ["created", "waitingForApproval", "approved", "rejected"],
                },
                { name: "permissionRequestId", label: "Permission Request Id (guid)", type: "text" },
                { name: "pageSize", label: "Page Size (max 50, default 50)", type: "number" },
                { name: "pageNumber", label: "Page Number (default 1)", type: "number" },
              ]}
              auth={auth}
            />

            <EndpointForm
              title="Reject Permission Request"
              description="Rejects an existing permission request."
              method="POST"
              pathTemplate="v2/permissionrequest/reject/{id}"
              hasBody={false}
              danger
              fields={[
                { name: "id", label: "Permission Request Id (guid)", type: "text", required: true, isPath: true, placeholder: "3fa85f64-5717-4562-b3fc-2c963f66afa6" },
              ]}
              auth={auth}
            />
        </div>

        <div className="tab-panel" hidden={sub !== "records"}>
            <EndpointForm
              title="Find Permission Records"
              description={`Searches permission records by filter criteria. Enter list fields as comma-separated values. This endpoint can also be used to find a permission record's id via its permission request id - look for the "id" field in the response.`}
              method="POST"
              pathTemplate="v2/permissionrecord/find"
              hasBody
              fields={[
                { name: "permissionRecordId", label: "Permission Record Id (guid)", type: "text" },
                { name: "dataOwnerId", label: "Data Owner Id (guid)", type: "text" },
                { name: "deliveryPointIds", label: "Delivery Point Ids (comma-separated, guids)", type: "csv" },
                { name: "permissionRequestIds", label: "Permission Request Ids (comma-separated, guids)", type: "csv" },
                { name: "deliveryPointCodeValues", label: "Delivery Point Code Values / Malo-Melo (comma-separated)", type: "csv" },
              ]}
              auth={auth}
            />

            <EndpointForm
              title="Get Permission Record"
              description="Returns a single permission record."
              method="GET"
              pathTemplate="v2/permissionrecord/{id}"
              hasBody={false}
              fields={[
                { name: "id", label: "Permission Record Id (guid)", type: "text", required: true, isPath: true, placeholder: "3fa85f64-5717-4562-b3fc-2c963f66afa6" },
              ]}
              auth={auth}
            />

            <EndpointForm
              title="Permission Record State Changes (Terminated)"
              description="Returns termination status changes of permission records matching the filter."
              method="POST"
              pathTemplate="v2/permissionrecord/statechanges/terminated"
              hasBody
              fields={[
                { name: "startDate", label: "Start Date", type: "date", help: "If set, endDate must be set as well." },
                { name: "endDate", label: "End Date", type: "date" },
                { name: "permissionRecordId", label: "Permission Record Id (guid)", type: "text" },
                { name: "pageSize", label: "Page Size (max 50, default 50)", type: "number" },
                { name: "pageNumber", label: "Page Number (default 1)", type: "number" },
              ]}
              auth={auth}
            />

            <EndpointForm
              title="Terminate Permission Record"
              description="Terminates the permission record and all other permission records linked to the same permission request. This action cannot be undone."
              method="DELETE"
              pathTemplate="v2/permissionrecord/terminate/{id}"
              hasBody={false}
              danger
              fields={[
                { name: "id", label: "Permission Record Id (guid)", type: "text", required: true, isPath: true, placeholder: "3fa85f64-5717-4562-b3fc-2c963f66afa6" },
              ]}
              auth={auth}
            />
        </div>
    </div>
  );
}
