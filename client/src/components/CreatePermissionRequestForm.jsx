import { useState } from "react";
import { callForwatt } from "../api.js";
import { useApiCall } from "../useApiCall.js";
import ResponseView from "./ResponseView.jsx";

const emptyRecipient = { Id: "", roleType: "", BDEW: "" };
const emptyMeasurand = {
  measurandCapabilityCode: "",
  codeValue: "",
  useAddress: false,
  address: { houseNumber: "", streetName: "", city: "", postalCode: "", country: "" },
  useDataHolder: false,
  dataHolder: { Id: "", roleType: "", BDEW: "" },
};

function RecipientRow({ recipient, onChange, onRemove }) {
  return (
    <div className="subrow">
      <input
        placeholder="Id (guid)"
        value={recipient.Id}
        onChange={(e) => onChange({ ...recipient, Id: e.target.value })}
      />
      <input
        placeholder="roleType (e.g. ESP/MPO)"
        value={recipient.roleType}
        onChange={(e) => onChange({ ...recipient, roleType: e.target.value })}
      />
      <input
        placeholder="BDEW"
        value={recipient.BDEW}
        onChange={(e) => onChange({ ...recipient, BDEW: e.target.value })}
      />
      <button type="button" className="btn-remove" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

function MeasurandRow({ measurand, onChange, onRemove }) {
  return (
    <div className="subrow subrow--block">
      <div className="subrow">
        <input
          placeholder="measurandCapabilityCode (BDEW code, e.g. 9991000001232)"
          value={measurand.measurandCapabilityCode}
          onChange={(e) => onChange({ ...measurand, measurandCapabilityCode: e.target.value })}
        />
        <input
          placeholder="codeValue (Malo/Melo, optional)"
          value={measurand.codeValue}
          onChange={(e) => onChange({ ...measurand, codeValue: e.target.value })}
        />
        <button type="button" className="btn-remove" onClick={onRemove}>
          Remove
        </button>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={measurand.useAddress}
          onChange={(e) => onChange({ ...measurand, useAddress: e.target.checked })}
        />
        Specify delivery point address
      </label>
      {measurand.useAddress && (
        <div className="subrow">
          <input
            placeholder="Street"
            value={measurand.address.streetName}
            onChange={(e) => onChange({ ...measurand, address: { ...measurand.address, streetName: e.target.value } })}
          />
          <input
            placeholder="House number"
            value={measurand.address.houseNumber}
            onChange={(e) => onChange({ ...measurand, address: { ...measurand.address, houseNumber: e.target.value } })}
          />
          <input
            placeholder="Postal code"
            value={measurand.address.postalCode}
            onChange={(e) => onChange({ ...measurand, address: { ...measurand.address, postalCode: e.target.value } })}
          />
          <input
            placeholder="City"
            value={measurand.address.city}
            onChange={(e) => onChange({ ...measurand, address: { ...measurand.address, city: e.target.value } })}
          />
          <input
            placeholder="Country"
            value={measurand.address.country}
            onChange={(e) => onChange({ ...measurand, address: { ...measurand.address, country: e.target.value } })}
          />
        </div>
      )}

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={measurand.useDataHolder}
          onChange={(e) => onChange({ ...measurand, useDataHolder: e.target.checked })}
        />
        Specify data holder
      </label>
      {measurand.useDataHolder && (
        <div className="subrow">
          <input
            placeholder="Id (guid)"
            value={measurand.dataHolder.Id}
            onChange={(e) => onChange({ ...measurand, dataHolder: { ...measurand.dataHolder, Id: e.target.value } })}
          />
          <input
            placeholder="roleType (e.g. MPO)"
            value={measurand.dataHolder.roleType}
            onChange={(e) => onChange({ ...measurand, dataHolder: { ...measurand.dataHolder, roleType: e.target.value } })}
          />
          <input
            placeholder="BDEW"
            value={measurand.dataHolder.BDEW}
            onChange={(e) => onChange({ ...measurand, dataHolder: { ...measurand.dataHolder, BDEW: e.target.value } })}
          />
        </div>
      )}
    </div>
  );
}

export default function CreatePermissionRequestForm({ auth }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [dataStart, setDataStart] = useState("");
  const [dataEnd, setDataEnd] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [measurands, setMeasurands] = useState([]);

  const [state, run] = useApiCall(async () => {
    const body = {
      start: start || undefined,
      end: end || null,
      dataStart: dataStart || null,
      dataEnd: dataEnd || null,
      serviceId: serviceId || null,
      permissionRequestPurpose: purpose || null,
      dataRecipients: recipients.map((r) => ({
        Id: r.Id || null,
        roleType: r.roleType || null,
        BDEW: r.BDEW || null,
      })),
      measurementRequestedInformation: measurands.map((m) => ({
        measurandCapabilityCode: m.measurandCapabilityCode,
        codeValue: m.codeValue || null,
        deliveryPointAddress: m.useAddress ? m.address : null,
        dataHolder: m.useDataHolder ? { Id: m.dataHolder.Id || null, roleType: m.dataHolder.roleType || null, BDEW: m.dataHolder.BDEW || null } : null,
      })),
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
        <div className="field">
          <label>Service Id (guid, empty = generic "Data access request" service)</label>
          <input value={serviceId} onChange={(e) => setServiceId(e.target.value)} placeholder="3b6168cb-f1f6-4fe2-a262-19a1b91332f1" />
        </div>
        <div className="field">
          <label>Purpose of the request (only relevant if no Service Id is given)</label>
          <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose of this permission request" />
        </div>

        <fieldset>
          <legend>Data Recipients</legend>
          {recipients.map((r, i) => (
            <RecipientRow
              key={i}
              recipient={r}
              onChange={(next) => setRecipients((rs) => rs.map((x, idx) => (idx === i ? next : x)))}
              onRemove={() => setRecipients((rs) => rs.filter((_, idx) => idx !== i))}
            />
          ))}
          <button type="button" onClick={() => setRecipients((rs) => [...rs, { ...emptyRecipient }])}>
            + Add data recipient
          </button>
        </fieldset>

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

        <button type="submit" disabled={!start || state.loading}>
          {state.loading ? "Sending..." : "Create permission request"}
        </button>
      </form>

      <ResponseView state={state} />
    </section>
  );
}
