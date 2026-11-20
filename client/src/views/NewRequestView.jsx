import { useEffect, useState } from "react";
import PermissionRequestFlow from "../components/PermissionRequestFlow.jsx";
import { href } from "../lib/router.js";
import { useData } from "../lib/store.jsx";
import { NeedsConnection } from "./RequestsView.jsx";

export default function NewRequestView() {
  const { auth, draft, setDraft, refresh, notify } = useData();
  // Take the draft once when the view opens, then clear it so a later
  // visit starts with an empty form.
  const [taken] = useState(draft);
  const [formKey] = useState(() => Math.random());
  useEffect(() => {
    if (draft) setDraft(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!auth.token) return <NeedsConnection />;

  return (
    <div>
      <a className="back-link" href={href("requests")}>
        ← All permission requests
      </a>
      <div className="page-head">
        <div>
          <h1>{taken ? "Duplicate & edit request" : "New permission request"}</h1>
          <p className="page-head__sub">
            {taken ? (
              <>
                Prefilled from <a href={href("requests", taken.sourceId)}>{taken.sourceId}</a>. Creating it does not
                change the original - reject it afterwards if it is no longer needed.
              </>
            ) : (
              "Check the data holder first, then fill in the request."
            )}
          </p>
        </div>
      </div>
      <PermissionRequestFlow
        key={formKey}
        auth={auth}
        initial={taken?.prefill}
        title="Request details"
        onCreated={() => {
          notify("Permission request created. Use the link in the response to complete it.");
          refresh();
        }}
      />
    </div>
  );
}
