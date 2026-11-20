// Helpers for reading for.Watt API responses. The exact response schemas are
// not fully documented to us, so these accessors try the most likely field
// names and fall back gracefully.

export function extractList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const key of ["items", "data", "results", "content", "permissionRequests", "permissionRecords", "stateChanges", "records"]) {
      if (Array.isArray(data[key])) return data[key];
    }
    const firstArray = Object.values(data).find(Array.isArray);
    if (firstArray) return firstArray;
  }
  return [];
}

// Returns the first non-empty value among the given keys; keys may be
// dotted paths ("permissionRequest.id").
export function pick(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    const value = key.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

// Finds a value anywhere one level deep whose key matches the regex.
function findKey(obj, regex) {
  if (!obj || typeof obj !== "object") return undefined;
  for (const [k, v] of Object.entries(obj)) {
    if (regex.test(k) && v !== null && typeof v !== "object") return v;
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v)) {
        if (regex.test(k2) && v2 !== null && typeof v2 !== "object") return v2;
      }
    }
  }
  return undefined;
}

export function requestIdOf(item) {
  return pick(item, ["permissionRequestId", "permissionRequest.id", "id"]) ?? null;
}

export function recordIdOf(item) {
  return pick(item, ["permissionRecordId", "id"]) ?? null;
}

export function recordRequestIdOf(item) {
  return pick(item, ["permissionRequestId", "permissionRequest.id"]) ?? findKey(item, /^permissionRequestId$/i) ?? null;
}

export function statusOf(item) {
  return pick(item, ["state", "status", "permissionRequestState", "permissionRecordState", "currentState"]) ?? findKey(item, /(state|status)$/i) ?? null;
}

export function dateOf(item) {
  return (
    pick(item, ["changedAt", "stateChangedAt", "timestamp", "modifiedAt", "updatedAt", "createdAt", "created", "creationDate", "start"]) ??
    findKey(item, /(date|at|time)$/i) ??
    null
  );
}

export function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const hasTime = /T\d\d:\d\d/.test(String(value)) && !/T00:00(:00(\.0+)?)?(Z|[+-]00:?00)?$/.test(String(value));
  return hasTime ? d.toLocaleString("de-DE") : d.toLocaleDateString("de-DE");
}

export function shortId(id) {
  if (!id) return "";
  const s = String(id);
  return s.length > 13 ? `${s.slice(0, 8)}…` : s;
}

const STATUS_TONES = {
  approved: "ok",
  active: "ok",
  granted: "ok",
  created: "neutral",
  waitingforapproval: "warn",
  pending: "warn",
  rejected: "err",
  terminated: "err",
  revoked: "err",
  expired: "muted",
};

export function statusTone(status) {
  return STATUS_TONES[String(status ?? "").toLowerCase()] ?? "neutral";
}

export function errorText(result) {
  return `HTTP ${result.status}: ${typeof result.data === "string" ? result.data : JSON.stringify(result.data)}`;
}

// Local date as YYYY-MM-DD, the format of <input type="date">.
export const todayIso = () => new Date().toLocaleDateString("sv-SE");

const asDate = (v) => (v ? String(v).slice(0, 10) : "");

// Turns a permission request (as returned by GET v2/permissionrequest/{id})
// into initial values for the create form ("duplicate & edit").
export function toPrefill(request) {
  if (!request || typeof request !== "object") return null;
  const infos = pick(request, ["measurementRequestedInformation", "measurandRequests", "requestedInformation"]) ?? [];
  const start = asDate(pick(request, ["start", "startDate"]));
  return {
    start: start && start >= todayIso() ? start : todayIso(),
    end: asDate(pick(request, ["end", "endDate"])),
    dataStart: asDate(pick(request, ["dataStart"])),
    dataEnd: asDate(pick(request, ["dataEnd"])),
    serviceId: pick(request, ["serviceId", "service.id"]) ?? "",
    purpose: pick(request, ["permissionRequestPurpose", "purpose"]) ?? "",
    measurands: (Array.isArray(infos) ? infos : []).map((m) => {
      const addr = m?.deliveryPointAddress ?? m?.address ?? null;
      const dh = m?.dataHolder ?? null;
      const code = m?.codeValue ?? m?.deliveryPoint?.codeValue ?? "";
      return {
        measurandCapabilityCode: m?.measurandCapabilityCode ?? m?.measurandCapability?.code ?? "",
        useDeliveryPoint: Boolean(code || addr || dh),
        codeValue: code ?? "",
        address: {
          houseNumber: addr?.houseNumber ?? "",
          streetName: addr?.streetName ?? "",
          city: addr?.city ?? "",
          postalCode: addr?.postalCode ?? "",
          country: addr?.country ?? "DE",
        },
        dataHolder: { Id: dh?.Id ?? dh?.id ?? "", BDEW: dh?.Id || dh?.id ? "" : dh?.BDEW ?? dh?.bdew ?? "" },
      };
    }),
  };
}
