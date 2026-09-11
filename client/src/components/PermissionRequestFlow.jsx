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
        <>
          <div className="card">
            <div className="response response--ok">
              Match found - this data holder participates in for.Watt and can be reached via the API.
              {lookup.holder?.roleType ? ` (roleType: ${lookup.holder.roleType})` : ""}
            </div>
          </div>
          <CreatePermissionRequestForm auth={auth} />
        </>
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
    </div>
  );
}
