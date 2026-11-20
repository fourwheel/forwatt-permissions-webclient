import { useEffect, useState } from "react";
import { formatDate, statusTone } from "../lib/model.js";

export function StatusBadge({ status }) {
  if (!status) return <span className="status status--muted">unknown</span>;
  return <span className={`status status--${statusTone(status)}`}>{String(status)}</span>;
}

export function CopyButton({ value, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(String(value));
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard not available */
        }
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

// Confirmation dialog for destructive actions.
export function ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel, busy }) {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (!open) setChecked(false);
    const onKey = (e) => e.key === "Escape" && !busy && onCancel();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={() => !busy && onCancel()}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="modal__body">{children}</div>
        <label className="confirm-row">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          I understand that this cannot be undone.
        </label>
        <div className="button-row button-row--end">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={!checked || busy}>
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function isDateLike(key, value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}(T|$)/.test(value) && /(date|at|time|start|end)$/i.test(key);
}

// Renders an object as a readable key/value list; nested objects become
// sub-lists, arrays of objects become numbered blocks.
export function KeyValue({ data, depth = 0 }) {
  if (data === null || data === undefined) return <span className="kv__empty">-</span>;
  if (typeof data !== "object") return <span>{String(data)}</span>;
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="kv__empty">(none)</span>;
    if (data.every((v) => v === null || typeof v !== "object")) return <span>{data.join(", ")}</span>;
    return (
      <div className="kv-array">
        {data.map((v, i) => (
          <div className="kv-array__item" key={i}>
            <div className="kv-array__index">#{i + 1}</div>
            <KeyValue data={v} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }
  const entries = Object.entries(data);
  if (entries.length === 0) return <span className="kv__empty">(empty)</span>;
  return (
    <dl className={`kv ${depth > 0 ? "kv--nested" : ""}`}>
      {entries.map(([k, v]) => (
        <div className="kv__row" key={k}>
          <dt>{k}</dt>
          <dd>{isDateLike(k, v) ? `${formatDate(v)}` : <KeyValue data={v} depth={depth + 1} />}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <div>{children}</div>}
    </div>
  );
}
