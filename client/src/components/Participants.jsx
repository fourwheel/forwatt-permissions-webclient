import { Fragment } from "react";
import { useI18n } from "../lib/i18n.jsx";
import { ROLES } from "../lib/participants.js";

export const ROLE_LABELS = {
  esp: "ESP",
  dataOwner: "Grid user",
  mpo: "MPO",
};

export const ROLE_LONG = {
  esp: "Energy service provider (data recipient)",
  dataOwner: "Grid user (data owner)",
  mpo: "Metering point operator (data holder)",
};

const STATE_TEXT = {
  ok: "Agreed",
  waiting: "Waiting for response",
  idle: "Not involved yet",
  rejected: "Rejected",
  revoked: "Revoked",
  expired: "Did not respond in time",
  ended: "Permission period ended",
};

// Role icons: briefcase (ESA), house (data owner), meter (MSB).
export function RoleIcon({ role, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  if (role === "esp") {
    return (
      <svg {...common}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 13h18" />
      </svg>
    );
  }
  if (role === "dataOwner") {
    return (
      <svg {...common}>
        <path d="M3 11l9-7 9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 11a4 4 0 0 1 8 0" />
      <path d="M12 11l2-2" />
      <path d="M8 16h8" />
    </svg>
  );
}

function StateMark({ state }) {
  const mark = { ok: "✓", waiting: "…", rejected: "✕", revoked: "✕", expired: "⏱", ended: "■", idle: "" }[state];
  if (!mark) return null;
  return <span className="pt-mark">{mark}</span>;
}

/** Compact: three colored role icons, e.g. for a table cell. */
export function ParticipantsInline({ info }) {
  const { t } = useI18n();
  if (!info) return null;
  return (
    <span className="pt-inline">
      {ROLES.map((r) => {
        const p = info.parts[r];
        return (
          <span
            key={r}
            className={`pt-dot pt--${p.state}`}
            title={`${t(ROLE_LONG[r])}${p.name ? ` – ${p.name}` : ""}: ${t(STATE_TEXT[p.state])}`}
          >
            <RoleIcon role={r} size={15} />
            <StateMark state={p.state} />
          </span>
        );
      })}
    </span>
  );
}

/** One-line summary: "Waiting for MSB", "Ready", "Revoked by data owner", ... */
export function participantsSummary(info, t) {
  if (!info) return "";
  if (info.ready) return t("Ready – metering data can be transferred to the ESP");
  if (info.waitingFor) return t("Waiting for {who}", { who: t(ROLE_LABELS[info.waitingFor]) });
  const states = ROLES.map((r) => info.parts[r].state);
  if (states.includes("revoked")) return t("Revoked by {who}", { who: t(ROLE_LABELS[info.actor] ?? "unknown") });
  if (states.includes("rejected"))
    return info.actorKnown === false
      ? t("Rejected (presumably by {who})", { who: t(ROLE_LABELS[info.actor] ?? "unknown") })
      : t("Rejected by {who}", { who: t(ROLE_LABELS[info.actor] ?? "unknown") });
  if (states.includes("expired")) return t("Expired – {who} did not respond in time", { who: t(ROLE_LABELS[info.actor] ?? "unknown") });
  if (states.every((s) => s === "ended")) return t("Permission period ended");
  if (info.notStarted) return t("All agreed – starts at the start date");
  if (states.every((s) => s === "ok")) return t("All agreed");
  return "";
}

/** Large panel with one card per participant. */
export function ParticipantsPanel({ info }) {
  const { t } = useI18n();
  if (!info) return null;
  const summary = participantsSummary(info, t);
  const tone = info.ready
    ? "ok"
    : info.waitingFor
      ? "waiting"
      : ROLES.some((r) => ["rejected", "revoked"].includes(info.parts[r].state))
        ? "rejected"
        : "idle";
  return (
    <div className="card pt-panel">
      <div className={`pt-summary pt-summary--${tone}`}>{summary}</div>
      <div className="pt-cards">
        {ROLES.map((r, i) => {
          const p = info.parts[r];
          return (
            <Fragment key={r}>
              {i > 0 && (
                <span className="pt-arrow" aria-hidden>
                  →
                </span>
              )}
              <div className={`pt-card pt--${p.state}`}>
                <div className="pt-card__icon">
                  <RoleIcon role={r} size={26} />
                </div>
                <div className="pt-card__body">
                  <div className="pt-card__role">{t(ROLE_LONG[r])}</div>
                  <div className="pt-card__name">{p.name ?? "–"}</div>
                  <div className="pt-card__state">
                    <StateMark state={p.state} /> {t(STATE_TEXT[p.state])}
                  </div>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

/** Legend for the icons and colors. */
export function ParticipantsLegend() {
  const { t } = useI18n();
  return (
    <div className="pt-legend">
      {ROLES.map((r) => (
        <span key={r} className="pt-legend__item">
          <RoleIcon role={r} size={14} /> {t(ROLE_LONG[r])}
        </span>
      ))}
      <span className="pt-legend__sep" />
      {["ok", "waiting", "rejected", "idle"].map((s) => (
        <span key={s} className="pt-legend__item">
          <span className={`pt-swatch pt--${s}`} /> {t({ ok: "agreed", waiting: "waiting for response", rejected: "rejected / revoked", idle: "not yet / ended" }[s])}
        </span>
      ))}
    </div>
  );
}
