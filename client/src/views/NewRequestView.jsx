import { useEffect, useState } from "react";
import NewRequestForm from "../components/NewRequestForm.jsx";
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
          <h1>{taken ? t("New request from template") : t("New permission request")}</h1>
          <p className="page-head__sub">
            {taken ? (
              <>
                {t("Template:")} <a href={href("requests", taken.sourceId)}>{taken.sourceId}</a>.{" "}
                {t("Creating it does not change the original - reject it afterwards if it is no longer needed.")}
              </>
            ) : (
              t("Four short steps. Measuring products and metering point operators can be searched by typing.")
            )}
          </p>
        </div>
      </div>
      <NewRequestForm
        key={formKey}
        auth={auth}
        initial={taken?.prefill}
        onCreated={() => {
          notify(t("Permission request created."));
          refresh();
        }}
      />
    </div>
  );
}
