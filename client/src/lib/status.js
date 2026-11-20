// Lifecycle of a for.Watt permission request:
// Created -> WaitingForApproval -> Approved | Rejected | Expired
export const REQUEST_STATUSES = [
  {
    id: "created",
    label: "Created",
    hint: "waiting for the grid user's consent",
    description: "The energy service provider created the request. Waiting for the grid user to provide information and grant permission.",
    next: "Grid user",
  },
  {
    id: "waitingForApproval",
    label: "Waiting for MPO approval",
    hint: "grid user agreed, metering point operator validates",
    description:
      "The grid user granted permission (with or without modifying the provider's data). Waiting for the metering point operator to validate it.",
    next: "Metering point operator",
  },
  {
    id: "approved",
    label: "Approved",
    hint: "validated by the metering point operator",
    description: "The metering point operator validated the request previously granted by the grid user.",
    final: true,
  },
  {
    id: "rejected",
    label: "Rejected",
    hint: "by the provider, grid user or metering point operator",
    description:
      "Rejected by the energy service provider or the grid user in their portals, by the metering point operator during validation, or cancelled by the energy service provider via the API.",
    final: true,
  },
  {
    id: "expired",
    label: "Expired",
    hint: "no response before the end date",
    description:
      "The metering point operator or grid user did not react before the request end date; a nightly job changed the status automatically.",
    final: true,
  },
];

export function requestStatusInfo(status) {
  const s = String(status ?? "").toLowerCase();
  return REQUEST_STATUSES.find((x) => x.id.toLowerCase() === s) ?? null;
}

// The ESP can only reject (cancel) a request that is not final yet.
export function canRejectRequest(status) {
  const info = requestStatusInfo(status);
  return Boolean(info && !info.final);
}

// Permission records have no stored state; it is derived from start/end
// date and termination metadata (see recordStatusOf in model.js).
export const RECORD_STATUSES = [
  { id: "active", label: "Active", description: "The current date is after the start and before the end date." },
  { id: "inactive", label: "Inactive", description: "The current date is before the start date (or after the end date)." },
  {
    id: "revoked",
    label: "Revoked",
    description:
      "Revoked by the grid user, the energy service provider or the metering point operator. Revoking one record revokes all records stemming from the same permission request.",
  },
  {
    id: "terminated",
    label: "Terminated",
    description: "The end date has passed. All records of the same permission request share the end date and expire together.",
  },
];

export function recordStatusInfo(status) {
  const s = String(status ?? "").toLowerCase();
  return RECORD_STATUSES.find((x) => x.id === s) ?? null;
}

// Only records that are still in force can be revoked.
export function canRevokeRecord(status) {
  const s = String(status ?? "").toLowerCase();
  return s === "active" || s === "inactive";
}

// Display label of any request or record status (falls back to the raw value).
export function statusLabel(status) {
  return requestStatusInfo(status)?.label ?? recordStatusInfo(status)?.label ?? (status ? String(status) : "unknown");
}
