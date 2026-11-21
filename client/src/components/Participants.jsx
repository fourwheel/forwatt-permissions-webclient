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
  const mark = { ok: "✓", partial: "◐", waiting: "…", rejected: "✕", revoked: "✕", expired: "⏱", ended: "■", idle: "" }[state];
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
            title={`${t(ROLE_LONG[r])}${p.name ? ` – ${p.name}` : ""}: ${r === "mpo" && info.partial ? partialText(info, t) : t(STATE_TEXT[p.state])}`}
          >
            <RoleIcon role={r} size={15} />
            <StateMark state={p.state} />
          </span>
        );
      })}
    </span>
  );
}

/** Color of the overall situation: ok (ready/agreed), warn (waiting), err (rejected/revoked), muted (expired/ended). */
export function participantsTone(info) {
  if (!info) return "muted";
  const states = ROLES.map((r) => info.parts[r].state);
  if (info.partial) return "partial";
  if (info.waitingFor) return "warn";
  if (states.some((s) => s === "rejected" || s === "revoked")) return "err";
  if (states.some((s) => s === "expired") || states.every((s) => s === "ended")) return "muted";
  if (info.notStarted) return "neutral";
  return "ok";
}

/** The situation as a colored badge (same look as the status badges). */
export function SituationBadge({ info, text }) {
  const { t } = useI18n();
  if (!info) return <span className="status status--muted">…</span>;
  // Lists show the short form; the full sentence is in the tooltip.
  return (
    <span className={`status status--${participantsTone(info)}`} title={participantsSummary(info, t)}>
      {text}
    </span>
  );
}

/** Badge for a request in "waitingForApproval" where some MSBs already agreed. */
export function PartialBadge({ info }) {
  const { t } = useI18n();
  return (
    <span className="status status--partial" title={participantsSummary(info, t)}>
      {t("MPO partly agreed")} ({info.mpoProgress.approved}/{info.mpoProgress.total})
    </span>
  );
}

/** One segment per MSB: green = agreed, yellow = pending, red = rejected. */
export function MpoProgressBar({ info }) {
  const { t } = useI18n();
  const prog = info?.mpoProgress;
  if (!prog || prog.total < 2) return null;
  const label = t("{done} of {total} MPOs agreed", { done: prog.approved, total: prog.total });
  return (
    <span className="mpo-bar" title={`${label}: ${prog.holders.map((h) => `${h.name} ${{ ok: "✓", waiting: "…", rejected: "✕" }[h.state]}`).join(", ")}`} aria-label={label}>
      <span className="mpo-bar__track">
        {prog.holders.map((h) => (
          <span key={h.name} className={`mpo-bar__seg mpo-bar__seg--${h.state}`} />
        ))}
      </span>
      <span className="mpo-bar__text">
        {prog.approved}/{prog.total}
      </span>
    </span>
  );
}

function partialText(info, t) {
  return t("Partly agreed ({done} of {total})", { done: info.mpoProgress.approved, total: info.mpoProgress.total });
}

/** One-line summary: "Waiting for MSB", "Ready", "Revoked by data owner", ... */
export function participantsSummary(info, t, { short = false } = {}) {
  if (!info) return "";
  if (info.ready) return short ? t("Ready") : t("Ready – metering data can be transferred to the ESP");
  if (info.ownerLinked !== undefined && !short)
    return info.ownerLinked
      ? t("Waiting for grid user – link opened, decision pending")
      : t("Waiting for grid user – link not opened yet");
  if (info.partial)
    return short
      ? t("MPO partly agreed")
      : t("MPO partly agreed – {done} of {total} MPOs agreed, first records created", { done: info.mpoProgress.approved, total: info.mpoProgress.total });
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
    : info.partial
      ? "partial"
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
                  <div className="pt-card__name">{r === "mpo" && info.mpoProgress?.total > 1 && ["waiting", "partial"].includes(p.state) ? t("{n} metering point operators", { n: info.mpoProgress.total }) : p.name ?? (r === "dataOwner" && info.ownerLinked === false ? t("not known yet") : "–")}</div>
                  <div className="pt-card__state">
                    {r === "mpo" && info.partial ? (
                      <>
                        <StateMark state="partial" /> {partialText(info, t)}
                      </>
                    ) : (
                      <>
                        <StateMark state={p.state} /> {t(STATE_TEXT[p.state])}
                      </>
                    )}
                  </div>
                  {r === "mpo" && info.mpoProgress?.total > 1 && ["waiting", "partial"].includes(p.state) && (
                    <MpoProgressBar info={info} />
                  )}
                  {r === "mpo" && info.mpoProgress?.total > 1 && ["waiting", "partial"].includes(p.state) && (
                    <ul className="pt-holders">
                      {info.mpoProgress.holders.map((h) => (
                        <li key={h.name} className={`pt-holder pt-holder--${h.state}`}>
                          <span className="pt-holder__mark">{{ ok: "✓", waiting: "…", rejected: "✕" }[h.state]}</span> {h.name}
                        </li>
                      ))}
                    </ul>
                  )}
                  {r === "dataOwner" && info.ownerLinked !== undefined && (
                    <div className={`pt-card__note ${info.ownerLinked ? "pt-card__note--on" : ""}`}>
                      {info.ownerLinked ? t("Link opened – linked to their account") : t("Link not opened yet")}
                    </div>
                  )}
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
      {["ok", "partial", "waiting", "rejected", "idle"].map((s) => (
        <span key={s} className="pt-legend__item">
          <span className={`pt-swatch pt--${s}`} /> {t({ ok: "agreed", partial: "partly agreed", waiting: "waiting for response", rejected: "rejected / revoked", idle: "not yet / ended" }[s])}
        </span>
      ))}
    </div>
  );
}
