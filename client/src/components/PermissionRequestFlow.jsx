import { useState } from "react";
import DataHolderLookup from "./DataHolderLookup.jsx";
import CreatePermissionRequestForm from "./CreatePermissionRequestForm.jsx";
import BdewContactForm from "./BdewContactForm.jsx";

export default function PermissionRequestFlow({ auth }) {
  const [lookup, setLookup] = useState(null);

  return (
    <div>
      <DataHolderLookup auth={auth} onResult={setLookup} />

      {lookup?.status === "found" && (
        <div className="card">
          <div className="response response--ok">
            Match found - {lookup.holder?.displayName || "this data holder"} participates in
            for.Watt and can be reached via the API. Use Id <code>{lookup.holder?.id}</code> in
            the "Specify data holder" section of the relevant measurand request below.
          </div>
        </div>
      )}

      {lookup?.status === "not-found" && <BdewContactForm bdewCode={lookup.code} />}

      {lookup?.status === "error" && (
        <div className="card">
          <div className="response response--error">
            Could not check the active data holder list. Please try again or verify the API status
            above.
          </div>
        </div>
      )}

      <CreatePermissionRequestForm auth={auth} />
    </div>
  );
}
