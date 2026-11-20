import { CopyButton } from "./ui.jsx";
import { useI18n } from "../lib/i18n.jsx";
export default function ResponseView({ state }) {
  const { t } = useI18n();
  if (!state) return null;

  const { loading, error, result } = state;

  if (loading) {
    return <div className="response response--loading">{t("Request in progress...")}</div>;
  }

  if (error) {
    return (
      <div className="response response--error">
        <strong>{t("Error:")}</strong> {error}
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className={`response ${result.ok ? "response--ok" : "response--error"}`}>
      <div className="response__status">HTTP {result.status}</div>
      {typeof result.data === "string" && /^https?:\/\/\S+$/.test(result.data) ? (
        // Not clickable on purpose (completion link for the grid user).
        <p className="link-row">
          <code className="link-text">{result.data}</code> <CopyButton value={result.data} label={t("Copy link")} />
        </p>
      ) : result.data === null || result.data === "" ? (
        <p>{t("(empty response body)")}</p>
      ) : (
        <pre>{typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2)}</pre>
      )}
    </div>
  );
}
