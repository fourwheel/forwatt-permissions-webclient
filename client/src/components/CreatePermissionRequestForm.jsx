import { useState } from "react";
import { callForwatt } from "../api.js";
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
function measurandProblems(m, index) {
  const label = `Measurand request ${index + 1}`;
  const problems = [];
  if (!m.measurandCapabilityCode) problems.push(`${label}: measurandCapabilityCode is required.`);
  if (m.useDeliveryPoint) {
    if (!m.codeValue) problems.push(`${label}: Malo/Melo is required when specifying a delivery point.`);
    if (Object.values(m.address).some((v) => !v)) problems.push(`${label}: all address fields are required.`);
    const hasId = Boolean(m.dataHolder.Id);
    const hasBdew = Boolean(m.dataHolder.BDEW);
    if (hasId === hasBdew) problems.push(`${label}: enter exactly one of data holder Id or BDEW code.`);
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

function MeasurandRow({ measurand, onChange, onRemove }) {
  const setAddress = (key, value) => onChange({ ...measurand, address: { ...measurand.address, [key]: value } });
  const setDataHolder = (key, value) => onChange({ ...measurand, dataHolder: { ...measurand.dataHolder, [key]: value } });

  return (
    <div className="subrow subrow--block">
      <div className="subrow">
        <input
          name="measurandCapabilityCode"
          autoComplete="on"
          placeholder="measurandCapabilityCode (BDEW code, e.g. 9991000000747_cons)"
          value={measurand.measurandCapabilityCode}
          onChange={(e) => onChange({ ...measurand, measurandCapabilityCode: e.target.value })}
        />
        <button type="button" className="btn-remove" onClick={onRemove}>
          Remove
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
              placeholder="Malo/Melo (must match the code type of the measurand)"
              value={measurand.codeValue}
              onChange={(e) => onChange({ ...measurand, codeValue: e.target.value })}
            />
          </div>
          <div className="subrow">
            <input name="streetName" autoComplete="on" placeholder="Street" value={measurand.address.streetName} onChange={(e) => setAddress("streetName", e.target.value)} />
            <input name="houseNumber" autoComplete="on" placeholder="House number" value={measurand.address.houseNumber} onChange={(e) => setAddress("houseNumber", e.target.value)} />
            <input name="postalCode" autoComplete="on" placeholder="Postal code" value={measurand.address.postalCode} onChange={(e) => setAddress("postalCode", e.target.value)} />
            <input name="city" autoComplete="on" placeholder="City" value={measurand.address.city} onChange={(e) => setAddress("city", e.target.value)} />
            <input name="country" autoComplete="on" placeholder="Country (e.g. DE)" value={measurand.address.country} onChange={(e) => setAddress("country", e.target.value)} />
          </div>
          <p className="field__help">Data holder (= the MPO): enter exactly one of Id or BDEW code - not both.</p>
          <div className="subrow">
            <input
              name="dataHolderId"
              autoComplete="on"
              placeholder="Data holder Id (guid) - or BDEW, not both"
              value={measurand.dataHolder.Id}
              onChange={(e) => setDataHolder("Id", e.target.value)}
            />
            <input
              name="dataHolderBdew"
              autoComplete="on"
              placeholder="Data holder BDEW code - or Id, not both"
              value={measurand.dataHolder.BDEW}
              onChange={(e) => setDataHolder("BDEW", e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function CreatePermissionRequestForm({ auth }) {
  const [start, setStart] = useState(todayIso);
  const [end, setEnd] = useState("");
  const [dataStart, setDataStart] = useState("");
  const [dataEnd, setDataEnd] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [measurands, setMeasurands] = useState([]);

  // Rules from the for.Watt business documentation (sections C and D).
  const today = todayIso();
  const problems = [
    ...(Boolean(serviceId) === Boolean(purpose) ? ["Enter exactly one of Service Id or Purpose."] : []),
    ...(start && start < today ? ["Start date must not be in the past."] : []),
    ...(start && end && end < start ? ["End date must not be before the start date."] : []),
    ...(dataStart && dataEnd && dataEnd < dataStart ? ["Data End must not be before Data Start."] : []),
    ...(dataEnd && end && dataEnd > end ? ["Data End must not be after the End date."] : []),
    ...(measurands.length === 0 ? ["At least one measurand request is required."] : []),
    ...measurands.flatMap(measurandProblems),
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
    return callForwatt({
      path: "v2/permissionrequest/create",
      method: "POST",
      body,
      token: auth.token,
      apiBaseUrl: auth.apiBaseUrl,
    });
  });

  return (
    <section className="card">
      <h2>Create Permission Request</h2>
      <p className="card__description">Creates a new permission request. The response contains a URL to complete the request.</p>
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
          <label>Start Date<span className="required">*</span></label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label>End Date (empty = no expiry)</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="field">
          <label>Data Start (empty = same as Start)</label>
          <input type="date" value={dataStart} onChange={(e) => setDataStart(e.target.value)} />
        </div>
        <div className="field">
          <label>Data End (empty = same as End)</label>
          <input type="date" value={dataEnd} onChange={(e) => setDataEnd(e.target.value)} />
        </div>
        <p className="field__help">
          Exactly one of "Service Id" and "Purpose" is required - not both, not neither.
        </p>
        <div className="field">
          <label>Service Id (guid) - or Purpose below, exactly one required</label>
          <input name="serviceId" autoComplete="on" value={serviceId} onChange={(e) => setServiceId(e.target.value)} placeholder="3b6168cb-f1f6-4fe2-a262-19a1b91332f1" />
        </div>
        <div className="field">
          <label>Purpose of the request - or Service Id above, exactly one required</label>
          <input name="purpose" autoComplete="on" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose of this permission request" />
        </div>

        <fieldset>
          <legend>Measurand Requests</legend>
          {measurands.map((m, i) => (
            <MeasurandRow
              key={i}
              measurand={m}
              onChange={(next) => setMeasurands((ms) => ms.map((x, idx) => (idx === i ? next : x)))}
              onRemove={() => setMeasurands((ms) => ms.filter((_, idx) => idx !== i))}
            />
          ))}
          <button
            type="button"
            onClick={() =>
              setMeasurands((ms) => [...ms, { ...emptyMeasurand, address: { ...emptyMeasurand.address }, dataHolder: { ...emptyMeasurand.dataHolder } }])
            }
          >
            + Add measurand request
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
          {state.loading ? "Sending..." : "Create permission request"}
        </button>
      </form>

      <ResponseView state={state} />
    </section>
  );
}
