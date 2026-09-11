import { useMemo, useState } from "react";

function buildBody({ bdewCode, requesterName, requesterBdew, start, end, purpose, meteringPoints, notes }) {
  const lines = [
    `We would like to request a data access permission for the following delivery/metering point(s) held by your company (BDEW code ${bdewCode}).`,
    "Your company does not currently appear to be listed as an active data holder in the for.Watt Data Permissions API, so we are sending this request manually.",
    "",
    `Requesting party: ${requesterName || "-"}${requesterBdew ? ` (BDEW code ${requesterBdew})` : ""}`,
    `Requested period: ${start || "-"} to ${end || "unlimited"}`,
    `Metering point(s) (Malo/Melo): ${meteringPoints || "-"}`,
    `Purpose: ${purpose || "-"}`,
    notes ? `Notes: ${notes}` : null,
    "",
    "Please confirm this permission or let us know the correct process on your end.",
  ].filter((l) => l !== null);
  return lines.join("\n");
}

export default function BdewContactForm({ bdewCode }) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterBdew, setRequesterBdew] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [purpose, setPurpose] = useState("");
  const [meteringPoints, setMeteringPoints] = useState("");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);

  const subject = `Request for data access permission (for.Watt) - BDEW code ${bdewCode}`;
  const body = useMemo(
    () => buildBody({ bdewCode, requesterName, requesterBdew, start, end, purpose, meteringPoints, notes }),
    [bdewCode, requesterName, requesterBdew, start, end, purpose, meteringPoints, notes]
  );

  const canSend = Boolean(recipientEmail && requesterName && start);
  const mailtoHref = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="card">
      <h2>Not on board - send a manual request</h2>
      <p className="card__description">
        BDEW code {bdewCode} was not found among the active data holders. Look up the contact person for
        this BDEW code, e.g. via{" "}
        <a href="https://bdew-codes.de" target="_blank" rel="noreferrer">
          bdew-codes.de
        </a>
        , and send the request by e-mail instead. Nothing here is sent or stored automatically - this
        only prepares a draft that opens in your own mail client (many clients truncate long mailto
        bodies, so a "Copy text" fallback is provided as well).
      </p>

      <form onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label>
            Recipient e-mail address<span className="required">*</span>
          </label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="contact@data-holder.example"
          />
        </div>
        <div className="field">
          <label>
            Your company name (ESA/ESP)<span className="required">*</span>
          </label>
          <input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} />
        </div>
        <div className="field">
          <label>Your BDEW code (optional)</label>
          <input value={requesterBdew} onChange={(e) => setRequesterBdew(e.target.value)} />
        </div>
        <div className="field">
          <label>
            Requested period start<span className="required">*</span>
          </label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label>Requested period end (empty = unlimited)</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="field">
          <label>Metering point(s) (Malo/Melo, comma-separated)</label>
          <input value={meteringPoints} onChange={(e) => setMeteringPoints(e.target.value)} placeholder="DE00...1, DE00...2" />
        </div>
        <div className="field">
          <label>Purpose of the request</label>
          <input value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </div>
        <div className="field">
          <label>Additional notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="button-row">
          <a
            className={`btn-link ${!canSend ? "btn-link--disabled" : ""}`}
            href={mailtoHref}
            onClick={(e) => {
              if (!canSend) e.preventDefault();
            }}
          >
            Open e-mail draft
          </a>
          <button type="button" onClick={copy} disabled={!requesterName || !start}>
            {copied ? "Copied!" : "Copy text"}
          </button>
        </div>
      </form>

      <div className="response response--neutral">
        <strong>Preview</strong>
        <pre>{`To: ${recipientEmail || "-"}\nSubject: ${subject}\n\n${body}`}</pre>
      </div>
    </section>
  );
}
