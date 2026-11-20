// Who has said what? Derives, for each of the three participants of a
// permission, a state that the UI shows as a colored role icon:
//   ok       - agreed / done (green)
//   waiting  - we are waiting for this participant's answer (yellow)
//   idle     - not their turn yet (grey)
//   rejected - rejected the request (red)
//   revoked  - revoked the permission (red)
//   expired  - did not answer before the end date (grey)
//   ended    - the permission period is over (grey)
import { actorOf, pick, recordStatusOf, requestHoldersOf, statusOf } from "./model.js";

export const ROLES = ["esp", "dataOwner", "mpo"];

function names(request, holders) {
  const esp = (request?.dataRecipients ?? []).find((r) => String(r?.roleType).toLowerCase() === "esp") ?? request?.dataRecipients?.[0];
  return {
    esp: esp?.name ?? null,
    dataOwner: pick(request, ["dataOwner.name"]) ?? null,
    mpo: requestHoldersOf(request, holders).join(", ") || null,
  };
}

function build(states, n, extra = {}) {
  const parts = Object.fromEntries(ROLES.map((r) => [r, { state: states[r], name: n[r] ?? null }]));
  const waitingFor = ROLES.find((r) => states[r] === "waiting") ?? null;
  return { parts, waitingFor, ready: false, ...extra };
}

// Order in which the participants act on a request.
const NEXT_AFTER = { created: "dataOwner", waitingforapproval: "mpo" };

/**
 * @param request      request detail (GET permissionrequest/{id}), may be null
 * @param listItem     state change entry (newStatus, actorId, maybe listedStatus)
 * @param records      permission records of this request
 * @param dataHolders  active data holder list (for MSB names)
 */
export function requestParticipants(request, listItem, records = [], dataHolders = []) {
  const n = names(request, dataHolders);
  const status = String(statusOf(request) ?? statusOf(listItem) ?? "").toLowerCase();
  // The state change entry only tells who acted if it is the current status.
  const listed = String(listItem?.listedStatus ?? statusOf(listItem) ?? "").toLowerCase();
  const actor = listed === status ? actorOf(listItem?.actorId, request) : null;

  if (status === "created") return build({ esp: "ok", dataOwner: "waiting", mpo: "idle" }, n);
  if (status === "waitingforapproval") return build({ esp: "ok", dataOwner: "ok", mpo: "waiting" }, n);

  if (status === "rejected" || status === "expired") {
    // Whose turn was it? Known from the actor, otherwise from the last
    // recorded status before the change.
    const stuck = actor?.role ?? NEXT_AFTER[listed] ?? null;
    const order = ["esp", "dataOwner", "mpo"];
    const idx = stuck ? order.indexOf(stuck) : -1;
    const states = {};
    for (const [i, r] of order.entries()) {
      if (r === stuck) states[r] = status === "expired" ? "expired" : "rejected";
      else if (r === "esp" && stuck !== "esp") states[r] = "ok";
      else states[r] = i < idx ? "ok" : "idle";
    }
    return build(states, n, { actorKnown: Boolean(actor), actor: stuck });
  }

  if (status === "approved") {
    const revoked = records.find((r) => r.terminatedOn);
    if (revoked) {
      const who = actorOf(revoked.terminatedById, request)?.role;
      const states = { esp: "ok", dataOwner: "ok", mpo: "ok" };
      if (who) states[who] = "revoked";
      return build(states, n, { actor: who ?? null, revokedOn: revoked.terminatedOn });
    }
    const recStates = records.map(recordStatusOf);
    if (records.length && recStates.every((s) => s === "terminated")) {
      return build({ esp: "ended", dataOwner: "ended", mpo: "ended" }, n);
    }
    const active = recStates.includes("active");
    return build({ esp: "ok", dataOwner: "ok", mpo: "ok" }, n, { ready: active, notStarted: !active && recStates.includes("inactive") });
  }

  return build({ esp: "idle", dataOwner: "idle", mpo: "idle" }, n);
}

/** Participants of a single permission record (always approved before). */
export function recordParticipants(record, request, dataHolders = []) {
  const n = names(request, dataHolders);
  const status = recordStatusOf(record);
  if (status === "revoked") {
    const who = actorOf(record.terminatedById, request)?.role;
    const states = { esp: "ok", dataOwner: "ok", mpo: "ok" };
    if (who) states[who] = "revoked";
    return build(states, n, { actor: who ?? null, revokedOn: record.terminatedOn });
  }
  if (status === "terminated") return build({ esp: "ended", dataOwner: "ended", mpo: "ended" }, n);
  return build({ esp: "ok", dataOwner: "ok", mpo: "ok" }, n, { ready: status === "active", notStarted: status === "inactive" });
}
