import { useState } from "react";
import { fetchToken } from "../api.js";
import { useI18n } from "../lib/i18n.jsx";
import { identityOf } from "../lib/model.js";
import { KeyValue } from "./ui.jsx";

const API_BASE_URLS = {
  prd: "https://api.traxes.io/forwatt",
  acc: "https://api.ppd.traxes.io/forwatt",
};

export default function AuthPanel({ auth, setAuth, esa }) {
  const { t } = useI18n();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [environment, setEnvironment] = useState("prd");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const changeEnvironment = (value) => {
    setEnvironment(value);
    setAuth((a) => ({ ...a, apiBaseUrl: API_BASE_URLS[value] }));
  };

  const getToken = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await fetchToken({ clientId, clientSecret, environment });
      setAuth((a) => ({
        ...a,
        token: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        clientId,
        environment,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card card--auth">
      <h2>{t("Authentication")}</h2>
      <p className="card__description">
        {t(
          "Client ID and Client Secret are only used for this one request to the token endpoint - this app itself never stores them. Your browser may offer to save them in its own password manager; that's the browser's own opt-in feature, not something this app controls. The resulting access token lives only in this browser tab's memory and is lost on page reload."
        )}
      </p>
      <form onSubmit={getToken} className="auth-form">
        <fieldset className="env-choice">
          <legend>{t("Environment")}</legend>
          {[
            { value: "prd", label: "Production", hint: "PRD - live data" },
            { value: "acc", label: "Test", hint: "ACC / PRPRD" },
          ].map((opt) => (
            <label key={opt.value} className={`env-option ${environment === opt.value ? "env-option--active" : ""}`}>
              <input
                type="radio"
                name="environment"
                value={opt.value}
                checked={environment === opt.value}
                onChange={() => changeEnvironment(opt.value)}
              />
              <span>
                <strong>{t(opt.label)}</strong>
                <small>{t(opt.hint)}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label>
            Client ID<span className="required">*</span>
          </label>
          <input name="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="username" />
        </div>
        <div className="field">
          <label>
            Client Secret<span className="required">*</span>
          </label>
          <input
            type="password"
            name="clientSecret"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="field">
          <label>API Base URL</label>
          <input value={auth.apiBaseUrl} onChange={(e) => setAuth((a) => ({ ...a, apiBaseUrl: e.target.value }))} />
        </div>
        <button type="submit" disabled={!clientId || !clientSecret || loading}>
          {loading ? t("Requesting token...") : t("Request access token")}
        </button>
      </form>

      {error && (
        <div className="response response--error">
          <strong>{t("Error:")}</strong> {error}
        </div>
      )}

      <div className="token-status">
        {auth.token ? (
          <span className="badge badge--ok">
            {t("Token available")} {auth.expiresIn ? t("(valid for ~{s}s)", { s: auth.expiresIn }) : ""}
          </span>
        ) : (
          <span className="badge badge--warn">{t("No token available")}</span>
        )}
      </div>

      {auth.token && <IdentityBox auth={auth} esa={esa} />}
    </section>
  );
}

function IdentityBox({ auth, esa }) {
  const { t } = useI18n();
  const who = identityOf(auth, esa);
  return (
    <div className="identity">
      <div className="identity__label">{t("Logged in as ESA")}</div>
      <div className="identity__name">{who.name || who.clientId || t("unknown")}</div>
      <dl className="kv">
        {who.name && who.clientId && (
          <div className="kv__row">
            <dt>Client ID</dt>
            <dd>
              <code className="mono">{who.clientId}</code>
            </dd>
          </div>
        )}
        {who.id && (
          <div className="kv__row">
            <dt>{esa ? t("BDEW code") : t("ESA Id")}</dt>
            <dd>
              <code className="mono">{String(who.id)}</code>
            </dd>
          </div>
        )}
        <div className="kv__row">
          <dt>{t("Environment")}</dt>
          <dd>{auth.environment === "acc" ? t("Test (ACC / PRPRD)") : t("Production (PRD)")}</dd>
        </div>
      </dl>
      {who.claims ? (
        <details className="raw">
          <summary>{t("All token claims")}</summary>
          <KeyValue data={who.claims} />
        </details>
      ) : (
        <p className="field__help">{t("The access token contains no readable identity data, so the Client ID is shown.")}</p>
      )}
    </div>
  );
}
