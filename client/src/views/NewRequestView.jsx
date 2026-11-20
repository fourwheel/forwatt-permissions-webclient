import { useEffect, useState } from "react";
import CreatePermissionRequestForm from "../components/CreatePermissionRequestForm.jsx";
import { useI18n } from "../lib/i18n.jsx";
import { href } from "../lib/router.js";
import { useData } from "../lib/store.jsx";
import { NeedsConnection } from "./RequestsView.jsx";

export default function NewRequestView() {
  const { auth, draft, setDraft, refresh, notify } = useData();
  const { t } = useI18n();
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
        ← {t("All permission requests")}
      </a>
      <div className="page-head">
        <div>
          <h1>{taken ? t("Duplicate & edit request") : t("New permission request")}</h1>
          <p className="page-head__sub">
            {taken ? (
              <>
                {t("Prefilled from")} <a href={href("requests", taken.sourceId)}>{taken.sourceId}</a>.{" "}
                {t("Creating it does not change the original - reject it afterwards if it is no longer needed.")}
              </>
            ) : (
              t("Fill in the request - measuring products and metering point operators can be searched by typing.")
            )}
          </p>
        </div>
      </div>
      <CreatePermissionRequestForm
        key={formKey}
        auth={auth}
        initial={taken?.prefill}
        title={t("Request details")}
        onCreated={() => {
          notify(t("Permission request created. Use the link in the response to complete it."));
          refresh();
        }}
      />
    </div>
  );
}
