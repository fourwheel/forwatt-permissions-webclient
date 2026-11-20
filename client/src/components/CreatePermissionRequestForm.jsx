import { useMemo, useState } from "react";
import { callForwatt } from "../api.js";
import { holderBdewOf, holderIdOf, holderLabelOf, measurandCodeOf, measurandLabelOf, measurandPropertiesOf } from "../lib/model.js";
import Combobox from "./Combobox.jsx";
import { KeyValue } from "./ui.jsx";
import { useData } from "../lib/store.jsx";
import { useI18n } from "../lib/i18n.jsx";
import { useApiCall } from "../useApiCall.js";
import ResponseView from "./ResponseView.jsx";

// Local date as YYYY-MM-DD, the format of <input type="date">.
const todayIso = () => new Date().toLocaleDateString("sv-SE");

const emptyMeasurand = {
  measurandCapabilityCode: "",
  useDeliveryPoint: false,
  codeValue: "",
  address: { houseNumber: "", streetName: "", city: "", postalCode: "", country: "DE" },
  dataHolder: { Id: "", BDEW: "" },
};

// The API only accepts Malo/Melo, address and data holder together - all
// three or none. The data holder is identified either by BDEW code alone
// or by Id (with role type MPO), never by both.
function measurandProblems(m, index, t) {
  const label = t("Measurand request {n}", { n: index + 1 });
  const problems = [];
  if (!m.measurandCapabilityCode) problems.push(`${label}: ${t("a measuring product is required.")}`);
  if (m.useDeliveryPoint) {
    if (!m.codeValue) problems.push(`${label}: ${t("MaLo/MeLo is required when specifying a delivery point.")}`);
    if (Object.values(m.address).some((v) => !v)) problems.push(`${label}: ${t("all address fields are required.")}`);
    const hasId = Boolean(m.dataHolder.Id);
    const hasBdew = Boolean(m.dataHolder.BDEW);
    if (hasId === hasBdew) problems.push(`${label}: ${t("select a data holder (or enter exactly one of Id or BDEW code).")}`);
  }
  return problems;
}

function toRequestedInformation(m) {
  if (!m.useDeliveryPoint) {
    return { measurandCapabilityCode: m.measurandCapabilityCode, codeValue: null, deliveryPointAddress: null, dataHolder: null };
  }
  return {
    measurandCapabilityCode: m.measurandCapabilityCode,
    codeValue: m.codeValue,
    deliveryPointAddress: m.address,
    dataHolder: m.dataHolder.Id
      ? { Id: m.dataHolder.Id, roleType: "MPO", BDEW: null }
      : { Id: null, roleType: null, BDEW: m.dataHolder.BDEW },
  };
}

// Dropdown of the measurand capabilities offered by for.Watt. Falls back
// to a text field if the list could not be loaded.
function MeasurandSelect({ value, onChange, options }) {
  const { t } = useI18n();
  if (options.length === 0) {
    return (
      <input
        name="measurandCapabilityCode"
        autoComplete="on"
        placeholder={t("Measuring product code (BDEW code, e.g. 9991000000747_cons)")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  const selected = options.find((o) => o.code === value);
  return (
    <div className="measurand-select">
      <Combobox
        options={[
          ...(value && !selected ? [{ value, label: `${value} (${t("not in current list")})` }] : []),
          ...options.map((o) => ({ value: o.code, label: o.label, hint: o.properties.map(([, v]) => v).join(" · ") })),
        ]}
        value={value}
        onChange={onChange}
        placeholder={t("Type to search measuring products...")}
        ariaLabel={t("Measuring product")}
      />
      {selected && (
        <div className="measurand-props">
          <div className="measurand-props__title">{t("Properties of {name}", { name: selected.label })}</div>
          <KeyValue data={selected.raw} />
        </div>
      )}
    </div>
  );
}

// Dropdown of the active data holders (MSB). Selecting one sets its Id;
// a BDEW code from a duplicated request is matched to the list.
function DataHolderSelect({ dataHolder, onChange, options }) {
  const { t } = useI18n();
  const selected =
    dataHolder.Id ||
    (dataHolder.BDEW ? options.find((o) => String(o.bdew) === String(dataHolder.BDEW))?.id ?? "" : "");
  return (
    <div className="measurand-select">
      <Combobox
        options={[
          ...(dataHolder.Id && !options.some((o) => o.id === dataHolder.Id)
            ? [{ value: dataHolder.Id, label: `${dataHolder.Id} (${t("not in current list")})` }]
            : []),
          ...options.map((o) => ({ value: o.id, label: o.label })),
        ]}
        value={selected}
        onChange={(id) => onChange({ Id: id, BDEW: "" })}
        placeholder={t("Type to search metering point operators (name or BDEW code)...")}
        ariaLabel={t("Metering point operator")}
      />
      {!selected && dataHolder.BDEW && (
        <p className="field__help">{t("BDEW {code} from the original request is not an active metering point operator.", { code: dataHolder.BDEW })}</p>
      )}
    </div>
  );
}

// Format check: a MaLo is 11 digits, a MeLo is 33 characters starting with "DE".
function codeTypeOf(code) {
  const c = String(code ?? "").trim();
  if (/^\d{11}$/.test(c)) return "malo";
  if (/^DE[0-9A-Z]{31}$/i.test(c)) return "melo";
  return null;
}

function MeasurandRow({ measurand, onChange, onRemove, measurandOptions, holderOptions }) {
  const { t } = useI18n();
  // The measuring product determines whether a MaLo or a MeLo is required.
  const requiredType = String(
    measurandOptions.find((o) => o.code === measurand.measurandCapabilityCode)?.raw?.deliveryPointCodeType ?? ""
  ).toLowerCase();
  const typeLabel = requiredType === "malo" ? "MaLo" : requiredType === "melo" ? "MeLo" : null;
  const enteredType = codeTypeOf(measurand.codeValue);
  const setAddress = (key, value) => onChange({ ...measurand, address: { ...measurand.address, [key]: value } });
  const setDataHolder = (key, value) => onChange({ ...measurand, dataHolder: { ...measurand.dataHolder, [key]: value } });

  return (
    <div className="subrow subrow--block">
      <div className="subrow">
        <MeasurandSelect
          value={measurand.measurandCapabilityCode}
          options={measurandOptions}
          onChange={(v) => onChange({ ...measurand, measurandCapabilityCode: v })}
        />
        <button type="button" className="btn-remove" onClick={onRemove}>
          {t("Remove")}
        </button>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={measurand.useDeliveryPoint}
          onChange={(e) => onChange({ ...measurand, useDeliveryPoint: e.target.checked })}
        />
        Specify delivery point (Malo/Melo, address and data holder - all three are required together)
      </label>
      {measurand.useDeliveryPoint && (
        <>
          <div className="subrow">
            <input
              name="codeValue"
              autoComplete="on"
              placeholder={
                typeLabel
                  ? t("{type} code - required by the selected measuring product", { type: typeLabel })
                  : t("MaLo/MeLo (must match the code type of the measuring product)")
              }
              value={measurand.codeValue}
              onChange={(e) => onChange({ ...measurand, codeValue: e.target.value })}
            />
          </div>
          {typeLabel && measurand.codeValue && enteredType && enteredType !== requiredType && (
            <p className="field__help field__help--warn">
              {t("This looks like a {entered}, but the selected measuring product requires a {required}. The API will reject it.", {
                entered: enteredType === "malo" ? "MaLo" : "MeLo",
                required: typeLabel,
              })}
            </p>
          )}
          <div className="subrow">
            <input name="streetName" autoComplete="on" placeholder={t("Street")} value={measurand.address.streetName} onChange={(e) => setAddress("streetName", e.target.value)} />
            <input name="houseNumber" autoComplete="on" placeholder={t("House number")} value={measurand.address.houseNumber} onChange={(e) => setAddress("houseNumber", e.target.value)} />
            <input name="postalCode" autoComplete="on" placeholder={t("Postal code")} value={measurand.address.postalCode} onChange={(e) => setAddress("postalCode", e.target.value)} />
            <input name="city" autoComplete="on" placeholder={t("City")} value={measurand.address.city} onChange={(e) => setAddress("city", e.target.value)} />
            <input name="country" autoComplete="on" placeholder={t("Country (e.g. DE)")} value={measurand.address.country} onChange={(e) => setAddress("country", e.target.value)} />
          </div>
          {holderOptions.length > 0 ? (
            <>
              <p className="field__help">{t("Metering point operator (data holder) responsible for this delivery point:")}</p>
              <div className="subrow">
                <DataHolderSelect
                  dataHolder={measurand.dataHolder}
                  options={holderOptions}
                  onChange={(dh) => onChange({ ...measurand, dataHolder: dh })}
                />
              </div>
            </>
          ) : (
          <>
          <p className="field__help">{t("Metering point operator (data holder): enter exactly one of Id or BDEW code - not both.")}</p>
          <div className="subrow">
            <input
              name="dataHolderId"
              autoComplete="on"
              placeholder={t("Data holder Id (guid) - or BDEW, not both")}
              value={measurand.dataHolder.Id}
              onChange={(e) => setDataHolder("Id", e.target.value)}
            />
            <input
              name="dataHolderBdew"
              autoComplete="on"
              placeholder={t("Data holder BDEW code - or Id, not both")}
              value={measurand.dataHolder.BDEW}
              onChange={(e) => setDataHolder("BDEW", e.target.value)}
            />
          </div>
          </>
          )}
        </>
      )}
    </div>
  );
}

export default function CreatePermissionRequestForm({ auth, initial, onCreated, title }) {
  const { t, lang } = useI18n();
  const [start, setStart] = useState(() => initial?.start || todayIso());
  const [end, setEnd] = useState(initial?.end ?? "");
  const [dataStart, setDataStart] = useState(initial?.dataStart ?? "");
  const [dataEnd, setDataEnd] = useState(initial?.dataEnd ?? "");
  const [serviceId, setServiceId] = useState(initial?.serviceId ?? "");
  const [purpose, setPurpose] = useState(initial?.purpose ?? "");
  const [measurands, setMeasurands] = useState(initial?.measurands ?? []);
  // Measuring product descriptions follow the UI language.
  const { catalog } = useData();
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

  // Rules from the for.Watt business documentation (sections C and D).
  const today = todayIso();
  const problems = [
    ...(Boolean(serviceId) === Boolean(purpose) ? [t("Enter exactly one of Service Id or Purpose.")] : []),
    ...(start && start < today ? [t("Start date must not be in the past.")] : []),
    ...(start && end && end < start ? [t("End date must not be before the start date.")] : []),
    ...(dataStart && dataEnd && dataEnd < dataStart ? [t("Data End must not be before Data Start.")] : []),
    ...(dataEnd && end && dataEnd > end ? [t("Data End must not be after the End date.")] : []),
    ...(measurands.length === 0 ? [t("At least one measurand request is required.")] : []),
    ...measurands.flatMap((m, i) => measurandProblems(m, i, t)),
  ];

  const [state, run] = useApiCall(async () => {
    const body = {
      start: start || undefined,
      end: end || null,
      dataStart: dataStart || null,
      dataEnd: dataEnd || null,
      serviceId: serviceId || null,
      permissionRequestPurpose: purpose || null,
      measurementRequestedInformation: measurands.map(toRequestedInformation),
    };
    const result = await callForwatt({
      path: "v2/permissionrequest/create",
      method: "POST",
      body,
      token: auth.token,
      apiBaseUrl: auth.apiBaseUrl,
    });
    if (result.ok) onCreated?.(result);
    return result;
  });

  return (
    <section className="card">
      <h2>{title ?? t("Create Permission Request")}</h2>
      <p className="card__description">{t("Creates a new permission request. The response contains a URL to complete the request.")}</p>
      <div className="method-line">
        <span className="method method--post">POST</span>
        <code>v2/permissionrequest/create</code>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <div className="field">
          <label>
            {t("Start Date")}
            <span className="required">*</span>
          </label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label>{t("End Date (empty = no expiry)")}</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="field">
          <label>{t("Data Start (empty = same as Start)")}</label>
          <input type="date" value={dataStart} onChange={(e) => setDataStart(e.target.value)} />
        </div>
        <div className="field">
          <label>{t("Data End (empty = same as End)")}</label>
          <input type="date" value={dataEnd} onChange={(e) => setDataEnd(e.target.value)} />
        </div>
        <p className="field__help">
          {t('Exactly one of "Service Id" and "Purpose" is required - not both, not neither.')}
        </p>
        <div className="field">
          <label>{t("Service Id (guid) - or Purpose below, exactly one required")}</label>
          <input name="serviceId" autoComplete="on" value={serviceId} onChange={(e) => setServiceId(e.target.value)} placeholder="3b6168cb-f1f6-4fe2-a262-19a1b91332f1" />
        </div>
        <div className="field">
          <label>{t("Purpose of the request - or Service Id above, exactly one required")}</label>
          <input name="purpose" autoComplete="on" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder={t("Purpose of this permission request")} />
        </div>

        <fieldset>
          <legend>{t("Measurand Requests")}</legend>
          {catalog.loading && <p className="field__help">{t("Loading measuring products and metering point operators...")}</p>}
          {catalog.error && (
            <p className="field__help">
              {t("Could not load the lists of measuring products / metering point operators - enter the values manually.")} ({catalog.error})
            </p>
          )}
          {measurands.map((m, i) => (
            <MeasurandRow
              key={i}
              measurand={m}
              onChange={(next) => setMeasurands((ms) => ms.map((x, idx) => (idx === i ? next : x)))}
              onRemove={() => setMeasurands((ms) => ms.filter((_, idx) => idx !== i))}
              measurandOptions={measurandOptions}
              holderOptions={holderOptions}
            />
          ))}
          <button
            type="button"
            onClick={() =>
              setMeasurands((ms) => [...ms, { ...emptyMeasurand, address: { ...emptyMeasurand.address }, dataHolder: { ...emptyMeasurand.dataHolder } }])
            }
          >
            + {t("Add measurand request")}
          </button>
        </fieldset>

        {problems.length > 0 && (
          <ul className="field__help">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <button type="submit" disabled={!start || problems.length > 0 || state.loading}>
          {state.loading ? t("Sending...") : t("Create permission request")}
        </button>
      </form>

      <ResponseView state={state} />
    </section>
  );
}
