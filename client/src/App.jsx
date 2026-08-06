import { useState } from "react";
import AuthPanel from "./components/AuthPanel.jsx";
import EndpointForm from "./components/EndpointForm.jsx";
import CreatePermissionRequestForm from "./components/CreatePermissionRequestForm.jsx";

const TABS = [
  { id: "prereq", label: "Prerequisites" },
  { id: "requests", label: "Permission Requests" },
  { id: "records", label: "Permission Records" },
];

export default function App() {
  const [auth, setAuth] = useState({ token: null, apiBaseUrl: "https://api.traxes.io/forwatt" });
  const [tab, setTab] = useState("prereq");

  return (
    <div className="app">
      <header className="app__header">
        <h1>for.Watt Data Permissions - Client</h1>
        <p>Web client for the for.Watt Data Permissions API (v2.0). No data is stored.</p>
      </header>

      <AuthPanel auth={auth} setAuth={setAuth} />

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "tab--active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "prereq" && (
        <div className="tab-panel">
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
      )}

      {tab === "requests" && (
        <div className="tab-panel">
          <CreatePermissionRequestForm auth={auth} />

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
        </div>
      )}

      {tab === "records" && (
        <div className="tab-panel">
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
            title="Find Permission Records"
            description="Searches permission records by filter criteria. Enter list fields as comma-separated values."
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
        </div>
      )}

      <footer className="app__footer">
        <p>Unofficial web client for the for.Watt Data Permissions API 2.0. No inputs or responses are stored.</p>
      </footer>
    </div>
  );
}
