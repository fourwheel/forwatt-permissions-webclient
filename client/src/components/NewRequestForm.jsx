import { useMemo, useState } from "react";
import { callForwatt } from "../api.js";
import { useI18n } from "../lib/i18n.jsx";
import { formatDate, holderBdewOf, holderIdOf, holderLabelOf, measurandCodeOf, measurandLabelOf, measurandPropertiesOf } from "../lib/model.js";
import { href } from "../lib/router.js";
import { useData } from "../lib/store.jsx";
import {
  DataHolderSelect,
  MeasurandSelect,
  codeTypeOf,
  emptyMeasurand,
  measurandProblems,
  toRequestedInformation,
  todayIso,
} from "./CreatePermissionRequestForm.jsx";
import { CopyButton } from "./ui.jsx";

// Guided "new permission request" form for business users. Same rules and
// request body as the API Explorer form (CreatePermissionRequestForm), but
// with labelled steps, sensible defaults, a checklist and a friendly result.

const newMeasurand = () => ({ ...emptyMeasurand, address: { ...emptyMeasurand.address }, dataHolder: { ...emptyMeasurand.dataHolder } });

// End date "n years from start" (inclusive, so one day earlier).
function plusYears(startIso, years) {
  const d = new Date(`${startIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + years);
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("sv-SE");
}

// Extracts readable messages from an API error response.
function apiMessages(data) {
  if (!data) return [];
  if (typeof data === "string") return [data];
  const out = [];
  if (Array.isArray(data.messages)) out.push(...data.messages.map((m) => m?.text).filter(Boolean));
  if (data.errors && typeof data.errors === "object") {
    for (const [k, v] of Object.entries(data.errors)) out.push(`${k}: ${[].concat(v).join(" ")}`);
  }
  if (!out.length && data.title) out.push(data.title);
  if (!out.length && data.error) out.push(String(data.error));
  return out.length ? out : [JSON.stringify(data)];
}

function Step({ n, title, hint, children }) {
  return (
    <section className="card wizard-step">
      <div className="wizard-step__head">
        <span className="wizard-step__n">{n}</span>
        <div>
          <h2>{title}</h2>
          {hint && <p className="card__description">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children, required }) {
  return (
    <label className="wfield">
      <span className="wfield__label">
        {label}
        {required && <span className="required">*</span>}
      </span>
      {children}
      {hint && <span className="field__help">{hint}</span>}
    </label>
  );
}

function MeasurandCard({ index, measurand, onChange, onRemove, canRemove, measurandOptions, holderOptions }) {
  const { t } = useI18n();
  const product = measurandOptions.find((o) => o.code === measurand.measurandCapabilityCode);
  const requiredType = String(product?.raw?.deliveryPointCodeType ?? "").toLowerCase();
  const typeLabel = requiredType === "malo" ? "MaLo" : requiredType === "melo" ? "MeLo" : null;
  const flow = String(product?.raw?.energyFlow ?? "").toLowerCase();
  const enteredType = codeTypeOf(measurand.codeValue);
  const setAddress = (key, value) => onChange({ ...measurand, address: { ...measurand.address, [key]: value } });

  return (
    <div className="mcard">
      <div className="mcard__head">
        <strong>{t("Measuring product {n}", { n: index + 1 })}</strong>
        {canRemove && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRemove}>
            {t("Remove")}
          </button>
        )}
      </div>

      <Field label={t("Which data do you need?")} required>
        <MeasurandSelect
          value={measurand.measurandCapabilityCode}
          options={measurandOptions}
          showProperties={false}
          onChange={(v) => onChange({ ...measurand, measurandCapabilityCode: v })}
        />
      </Field>
      {product && (
        <div className="mcard__chips">
          {typeLabel && <span className="chip-info">{t("needs a {type}", { type: typeLabel })}</span>}
          {flow && <span className="chip-info">{t(flow === "consumption" ? "consumption" : flow === "production" ? "feed-in" : flow)}</span>}
          <span className="chip-info chip-info--code">{product.code}</span>
        </div>
      )}

      <label className="wcheck">
        <input
          type="checkbox"
          checked={measurand.useDeliveryPoint}
          onChange={(e) => onChange({ ...measurand, useDeliveryPoint: e.target.checked })}
        />
        <span>
          <strong>{t("I already know the delivery point")}</strong>
          <span className="field__help">
            {t("Otherwise the grid user fills in MaLo/MeLo, address and metering point operator when granting the permission.")}
          </span>
        </span>
      </label>

      {measurand.useDeliveryPoint && (
        <div className="mcard__dp">
          <Field
            label={typeLabel ? t("{type} number", { type: typeLabel }) : t("MaLo/MeLo number")}
            hint={typeLabel === "MaLo" ? t("11 digits") : typeLabel === "MeLo" ? t("33 characters, starts with DE") : null}
            required
          >
            <input value={measurand.codeValue} onChange={(e) => onChange({ ...measurand, codeValue: e.target.value })} />
          </Field>
          {typeLabel && measurand.codeValue && enteredType && enteredType !== requiredType && (
            <p className="field__help field__help--warn">
              {t("This looks like a {entered}, but the selected measuring product requires a {required}. The API will reject it.", {
                entered: enteredType === "malo" ? "MaLo" : "MeLo",
                required: typeLabel,
              })}
            </p>
          )}
          <div className="wgrid wgrid--address">
            <Field label={t("Street")} required>
              <input value={measurand.address.streetName} onChange={(e) => setAddress("streetName", e.target.value)} autoComplete="address-line1" />
            </Field>
            <Field label={t("House number")} required>
              <input value={measurand.address.houseNumber} onChange={(e) => setAddress("houseNumber", e.target.value)} />
            </Field>
            <Field label={t("Postal code")} required>
              <input value={measurand.address.postalCode} onChange={(e) => setAddress("postalCode", e.target.value)} autoComplete="postal-code" />
            </Field>
            <Field label={t("City")} required>
              <input value={measurand.address.city} onChange={(e) => setAddress("city", e.target.value)} autoComplete="address-level2" />
            </Field>
            <Field label={t("Country")} required>
              <input value={measurand.address.country} onChange={(e) => setAddress("country", e.target.value)} />
            </Field>
          </div>
          <Field label={t("Metering point operator")} required>
            {holderOptions.length > 0 ? (
              <DataHolderSelect dataHolder={measurand.dataHolder} options={holderOptions} onChange={(dh) => onChange({ ...measurand, dataHolder: dh })} />
            ) : (
              <input
                placeholder={t("Data holder BDEW code - or Id, not both")}
                value={measurand.dataHolder.BDEW}
                onChange={(e) => onChange({ ...measurand, dataHolder: { Id: "", BDEW: e.target.value } })}
              />
            )}
          </Field>
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result, onAnother }) {
  const { t } = useI18n();
  const link =
    typeof result.data === "string" && /^https?:\/\//.test(result.data.trim())
      ? result.data.trim()
      : result.data?.url ?? result.data?.permissionRequestUrl ?? result.data?.redirectUrl ?? null;
  // The completion link carries the id of the new request (?openRequestId=...).
  let newId = null;
  try {
    newId = link ? new URL(link).searchParams.get("openRequestId") : null;
  } catch {
    newId = null;
  }
  return (
    <section className="card wizard-result">
      <div className="wizard-result__icon" aria-hidden>
        ✓
      </div>
      <h2>{t("Permission request created")}</h2>
      {link ? (
        <>
          <p>{t("Send this link to the grid user. They complete the request, check the details and grant the permission:")}</p>
          {/* Deliberately not clickable: the link is meant for the grid user,
              the ESP should not open it by accident. */}
          <div className="wizard-result__link">
            <code className="link-text">{link}</code>
            <CopyButton value={link} label={t("Copy link")} />
          </div>
          <p className="field__help">{t("The link is not clickable on purpose - it is meant for the grid user.")}</p>
        </>
      ) : (
        <pre className="raw">{JSON.stringify(result.data, null, 2)}</pre>
      )}
      <div className="button-row">
        {newId && (
          <a className="btn" href={href("requests", newId)}>
            {t("View the new request")}
          </a>
        )}
        <a className={`btn ${newId ? "btn--ghost" : ""}`} href={href("requests")}>
          {t("To the permission requests")}
        </a>
        <button type="button" className="btn btn--ghost" onClick={onAnother}>
          {t("Create another request")}
        </button>
      </div>
    </section>
  );
}

export default function NewRequestForm({ auth, initial, onCreated }) {
  const { t, lang } = useI18n();
  const { catalog } = useData();

  const [mode, setMode] = useState(initial?.serviceId && !initial?.purpose ? "service" : "purpose");
  const [purpose, setPurpose] = useState(initial?.purpose ?? "");
  const [serviceId, setServiceId] = useState(initial?.serviceId ?? "");
  const [start, setStart] = useState(() => initial?.start || todayIso());
  const [end, setEnd] = useState(initial?.end ?? "");
  const [limitData, setLimitData] = useState(Boolean(initial?.dataStart || initial?.dataEnd));
  const [dataStart, setDataStart] = useState(initial?.dataStart ?? "");
  const [dataEnd, setDataEnd] = useState(initial?.dataEnd ?? "");
  const [measurands, setMeasurands] = useState(() => (initial?.measurands?.length ? initial.measurands : [newMeasurand()]));
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const measurandOptions = useMemo(
    () =>
      catalog.measurands
        .map((m) => ({ code: String(measurandCodeOf(m)), label: measurandLabelOf(m, lang), properties: measurandPropertiesOf(m), raw: m }))
        .filter((o) => o.code)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [catalog.measurands, lang]
  );
  const holderOptions = useMemo(
    () =>
      catalog.dataHolders
        .map((h) => ({ id: String(holderIdOf(h)), bdew: holderBdewOf(h), label: holderLabelOf(h) }))
        .filter((o) => o.id)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [catalog.dataHolders]
  );

  const today = todayIso();
  const effPurpose = mode === "purpose" ? purpose.trim() : "";
  const effService = mode === "service" ? serviceId.trim() : "";
  const effDataStart = limitData ? dataStart : "";
  const effDataEnd = limitData ? dataEnd : "";

  // Checklist (rules from the for.Watt business documentation, sections C and D).
  const checks = [
    {
      ok: mode === "purpose" ? Boolean(effPurpose) : Boolean(effService),
      text: mode === "purpose" ? t("Purpose described") : t("Service ID entered"),
    },
    { ok: Boolean(start) && start >= today, text: t("Start date today or later") },
    { ok: !end || end >= start, text: t("End date after the start date") },
    {
      ok: !limitData || ((!effDataStart || !effDataEnd || effDataEnd >= effDataStart) && (!effDataEnd || !end || effDataEnd <= end)),
      text: t("Data period within the permission period"),
    },
    {
      ok: measurands.length > 0 && measurands.every((m) => m.measurandCapabilityCode),
      text: t("Measuring product selected"),
    },
    {
      ok: measurands.every((m, i) => measurandProblems(m, i, t).length === 0),
      text: t("Delivery point details complete"),
    },
  ];
  const allOk = checks.every((c) => c.ok);

  const send = async () => {
    setSubmitted(true);
    if (!allOk) return;
    setSending(true);
    try {
      const body = {
        start,
        end: end || null,
        dataStart: effDataStart || null,
        dataEnd: effDataEnd || null,
        serviceId: effService || null,
        permissionRequestPurpose: effPurpose || null,
        measurementRequestedInformation: measurands.map(toRequestedInformation),
      };
      const res = await callForwatt({ path: "v2/permissionrequest/create", method: "POST", body, token: auth.token, apiBaseUrl: auth.apiBaseUrl });
      setResult(res);
      if (res.ok) onCreated?.(res);
    } catch (err) {
      setResult({ ok: false, status: 0, data: err.message || String(err) });
    } finally {
      setSending(false);
    }
  };

  if (result?.ok) {
    return (
      <ResultPanel
        result={result}
        onAnother={() => {
          setResult(null);
          setSubmitted(false);
          setPurpose("");
          setMeasurands([newMeasurand()]);
        }}
      />
    );
  }

  const productCount = measurands.filter((m) => m.measurandCapabilityCode).length;

  return (
    <form
      className="wizard"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <Step n={1} title={t("What is the permission for?")} hint={t("The grid user sees this when granting the permission.")}>
        <div className="wseg" role="radiogroup">
          <label className={`wseg__opt ${mode === "purpose" ? "wseg__opt--active" : ""}`}>
            <input type="radio" checked={mode === "purpose"} onChange={() => setMode("purpose")} />
            {t("Describe the purpose")} <span className="wseg__tag">{t("recommended")}</span>
          </label>
          <label className={`wseg__opt ${mode === "service" ? "wseg__opt--active" : ""}`}>
            <input type="radio" checked={mode === "service"} onChange={() => setMode("service")} />
            {t("Use an existing service ID")}
          </label>
        </div>
        {mode === "purpose" ? (
          <Field label={t("Purpose")} hint={t("Short and understandable, e.g. \"Optimisation of your heat pump\".")} required>
            <textarea rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder={t("Purpose of this permission request")} />
          </Field>
        ) : (
          <Field label={t("Service ID")} hint={t("Only if your service is registered with for.Watt.")} required>
            <input value={serviceId} onChange={(e) => setServiceId(e.target.value)} placeholder="3b6168cb-f1f6-4fe2-a262-19a1b91332f1" />
          </Field>
        )}
      </Step>

      <Step n={2} title={t("For which period?")} hint={t("You may access the data during this period. Full days only.")}>
        <div className="wgrid wgrid--2">
          <Field label={t("Start")} required>
            <input type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label={t("End")} hint={end ? null : t("No end date - unlimited")}>
            <input type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <div className="wquick">
          <span className="field__help">{t("Quick select:")}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEnd(plusYears(start, 1))}>
            {t("1 year")}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEnd(plusYears(start, 2))}>
            {t("2 years")}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEnd("")}>
            {t("Unlimited")}
          </button>
        </div>
        <label className="wcheck">
          <input type="checkbox" checked={limitData} onChange={(e) => setLimitData(e.target.checked)} />
          <span>
            <strong>{t("Limit which dates of data may be shared")}</strong>
            <span className="field__help">{t("Optional, e.g. for historical analyses. By default the data period equals the permission period.")}</span>
          </span>
        </label>
        {limitData && (
          <div className="wgrid wgrid--2">
            <Field label={t("Data from")}>
              <input type="date" value={dataStart} onChange={(e) => setDataStart(e.target.value)} />
            </Field>
            <Field label={t("Data until")}>
              <input type="date" value={dataEnd} onChange={(e) => setDataEnd(e.target.value)} />
            </Field>
          </div>
        )}
      </Step>

      <Step
        n={3}
        title={t("Which measuring products?")}
        hint={t("One entry per measuring product and delivery point. A permission record is created for each delivery point.")}
      >
        {catalog.loading && <p className="field__help">{t("Loading measuring products and metering point operators...")}</p>}
        {catalog.error && (
          <p className="field__help">
            {t("Could not load the lists of measuring products / metering point operators - enter the values manually.")}
          </p>
        )}
        {measurands.map((m, i) => (
          <MeasurandCard
            key={i}
            index={i}
            measurand={m}
            canRemove={measurands.length > 1}
            measurandOptions={measurandOptions}
            holderOptions={holderOptions}
            onChange={(next) => setMeasurands((ms) => ms.map((x, idx) => (idx === i ? next : x)))}
            onRemove={() => setMeasurands((ms) => ms.filter((_, idx) => idx !== i))}
          />
        ))}
        <button type="button" className="btn btn--ghost" onClick={() => setMeasurands((ms) => [...ms, newMeasurand()])}>
          + {t("Add another measuring product")}
        </button>
      </Step>

      <Step n={4} title={t("Check and send")}>
        <p className="wsummary">
          {t("You request a permission from the grid user for {n} measuring product(s), from {start} {until}.", {
            n: productCount,
            start: formatDate(start),
            until: end ? t("until {date}", { date: formatDate(end) }) : t("without end date"),
          })}
        </p>
        <ul className="wchecks">
          {checks.map((c) => (
            <li key={c.text} className={c.ok ? "is-ok" : submitted ? "is-bad" : "is-open"}>
              <span aria-hidden>{c.ok ? "✓" : submitted ? "✕" : "○"}</span> {c.text}
            </li>
          ))}
        </ul>
        {submitted && !allOk && <p className="field__help field__help--warn">{t("Please complete the open points above.")}</p>}
        {result && !result.ok && (
          <div className="response response--error">
            <strong>{t("The request could not be created:")}</strong>
            <ul>
              {apiMessages(result.data).map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        <button type="submit" className="btn wizard-submit" disabled={sending}>
          {sending ? t("Sending...") : t("Create permission request")}
        </button>
      </Step>
    </form>
  );
}
