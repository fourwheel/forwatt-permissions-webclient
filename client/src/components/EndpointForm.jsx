import { useState } from "react";
import { callForwatt } from "../api.js";
import { useApiCall } from "../useApiCall.js";
import ResponseView from "./ResponseView.jsx";

function buildPath(pathTemplate, values) {
  return pathTemplate.replace(/\{(\w+)\}/g, (_, key) => encodeURIComponent(values[key] ?? ""));
}

function buildBody(fields, values) {
  const body = {};
  for (const field of fields) {
    if (field.isPath || field.type === "info") continue;
    const raw = values[field.name];
    if (raw === undefined || raw === "") continue;

    if (field.type === "csv") {
      const arr = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (arr.length > 0) body[field.name] = arr;
    } else if (field.type === "number") {
      body[field.name] = Number(raw);
    } else {
      body[field.name] = raw;
    }
  }
  return body;
}

export default function EndpointForm({
  title,
  description,
  method,
  pathTemplate,
  fields,
  hasBody,
  auth,
  danger,
}) {
  const [values, setValues] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [state, run] = useApiCall(async () => {
    const path = buildPath(pathTemplate, values);
    const body = hasBody ? buildBody(fields, values) : undefined;
    return callForwatt({ path, method, body, token: auth.token, apiBaseUrl: auth.apiBaseUrl });
  });

  const setField = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const missingRequired = fields.some((f) => f.required && !values[f.name]);

  return (
    <section className="card">
      <h2>{title}</h2>
      {description && <p className="card__description">{description}</p>}
      <div className="method-line">
        <span className={`method method--${method.toLowerCase()}`}>{method}</span>
        <code>{pathTemplate}</code>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        {fields.map((field) => (
          <div className="field" key={field.name}>
            <label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="required">*</span>}
            </label>
            {field.type === "select" ? (
              <select
                id={field.name}
                value={values[field.name] ?? ""}
                onChange={(e) => setField(field.name, e.target.value)}
              >
                <option value="">-- please select --</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                id={field.name}
                placeholder={field.placeholder}
                value={values[field.name] ?? ""}
                onChange={(e) => setField(field.name, e.target.value)}
              />
            ) : (
              <input
                id={field.name}
                type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                placeholder={field.placeholder}
                value={values[field.name] ?? ""}
                onChange={(e) => setField(field.name, e.target.value)}
              />
            )}
            {field.help && <p className="field__help">{field.help}</p>}
          </div>
        ))}

        {danger && (
          <label className="confirm-row">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            I confirm that I really want to perform this action.
          </label>
        )}

        <button type="submit" disabled={missingRequired || (danger && !confirmed) || state.loading}>
          {state.loading ? "Sending..." : "Send"}
        </button>
      </form>

      <ResponseView state={state} />
    </section>
  );
}
