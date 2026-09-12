import { useState } from "react";
import { callForwatt } from "../api.js";
import { useApiCall } from "../useApiCall.js";
import ResponseView from "./ResponseView.jsx";

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

function findByBdewCode(list, code) {
  const needle = code.trim().toLowerCase();
  return list.find(
    (item) =>
      item &&
      typeof item === "object" &&
      Object.entries(item).some(([key, value]) => /bdew/i.test(key) && String(value).toLowerCase() === needle)
  );
}

export default function DataHolderLookup({ auth, onResult }) {
  const [code, setCode] = useState("");
  const [state, run] = useApiCall(() =>
    callForwatt({ path: "v2/active-dataholders", method: "GET", token: auth.token, apiBaseUrl: auth.apiBaseUrl })
  );

  const check = async (e) => {
    e.preventDefault();
    const result = await run();
    if (!result || !result.ok) {
      onResult({ status: "error", code });
      return;
    }
    const holder = findByBdewCode(extractList(result.data), code);
    onResult(holder ? { status: "found", code, holder } : { status: "not-found", code });
  };

  return (
    <section className="card">
      <h2>Is the data holder on board?</h2>
      <p className="card__description">
        Checks whether the target data holder (MSB) is listed in "Active Data Holders" and therefore
        reachable via the for.Watt API. If not, this MSB requires a manual (e-mail based) request
        instead.
      </p>
      <form onSubmit={check} className="lookup-form">
        <div className="field">
          <label>BDEW code of the target data holder<span className="required">*</span></label>
          <input name="dataHolderLookupCode" autoComplete="on" value={code} onChange={(e) => setCode(e.target.value)} placeholder="9900000000001" />
        </div>
        <button type="submit" disabled={!code || !auth.token || state.loading}>
          {state.loading ? "Checking..." : "Check"}
        </button>
      </form>
      {!auth.token && <p className="field__help">Requires an access token (see Authentication above).</p>}
      {(state.error || (state.result && !state.result.ok)) && <ResponseView state={state} />}
    </section>
  );
}
