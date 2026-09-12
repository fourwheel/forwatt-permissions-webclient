import { useState } from "react";
import { fetchToken } from "../api.js";

const API_BASE_URLS = {
  prd: "https://api.traxes.io/forwatt",
  acc: "https://api.ppd.traxes.io/forwatt",
};

export default function AuthPanel({ auth, setAuth }) {
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
      setAuth((a) => ({ ...a, token: data.access_token, tokenType: data.token_type, expiresIn: data.expires_in }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card card--auth">
      <h2>Authentication</h2>
      <p className="card__description">
        Client ID and Client Secret are only used for this one request to the token endpoint - this
        app itself never stores them. Your browser may offer to save them in its own password manager;
        that's the browser's own opt-in feature, not something this app controls. The resulting access
        token lives only in this browser tab's memory and is lost on page reload.
      </p>
      <form onSubmit={getToken} className="auth-form">
        <div className="field">
          <label>Environment</label>
          <select value={environment} onChange={(e) => changeEnvironment(e.target.value)}>
            <option value="prd">PRD (Production)</option>
            <option value="acc">ACC / PRPRD (Test)</option>
          </select>
        </div>
        <div className="field">
          <label>Client ID<span className="required">*</span></label>
          <input name="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="username" />
        </div>
        <div className="field">
          <label>Client Secret<span className="required">*</span></label>
          <input type="password" name="clientSecret" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} autoComplete="current-password" />
        </div>
        <div className="field">
          <label>API Base URL</label>
          <input
            value={auth.apiBaseUrl}
            onChange={(e) => setAuth((a) => ({ ...a, apiBaseUrl: e.target.value }))}
          />
        </div>
        <button type="submit" disabled={!clientId || !clientSecret || loading}>
          {loading ? "Requesting token..." : "Request access token"}
        </button>
      </form>

      {error && (
        <div className="response response--error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="token-status">
        {auth.token ? (
          <span className="badge badge--ok">Token available {auth.expiresIn ? `(valid for ~${auth.expiresIn}s)` : ""}</span>
        ) : (
          <span className="badge badge--warn">No token available</span>
        )}
      </div>
    </section>
  );
}
