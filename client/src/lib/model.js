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
  return (
    pick(item, ["newStatus", "state", "status", "permissionRequestState", "permissionRecordState", "currentState"]) ??
    recordStatusOf(item) ??
    findKey(item, /^(state|status)$/i) ??
    null
  );
}

// Permission records have no status field. Per the for.Watt documentation
// the state is derived: revoked (termination metadata), terminated (end date
// passed), inactive (before start), otherwise active.
export function recordStatusOf(item) {
  if (!item || typeof item !== "object" || !("terminatedOn" in item || "deliveryPointCode" in item)) return undefined;
  const now = new Date();
  if (item.terminatedOn) return "revoked";
  if (item.end && new Date(item.end) < now) return "terminated";
  if (item.start && new Date(item.start) > now) return "inactive";
  return "active";
}

export function dateOf(item) {
  return (
    pick(item, ["changeDate", "changedAt", "stateChangedAt", "updatedOn", "createdOn", "timestamp", "modifiedAt", "updatedAt", "createdAt", "created", "creationDate", "start"]) ??
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
  revoked: "err",
  inactive: "muted",
  approved: "ok",
  active: "ok",
  granted: "ok",
  created: "neutral",
  waitingforapproval: "warn",
  pending: "warn",
  rejected: "err",
  terminated: "muted",
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

// Keys under which a permission request lists its measurand requests.
export const MEASURAND_REQUEST_KEYS = [
  "measurandCapabilityRequests",
  "measurementRequestedInformation",
  "measurandRequests",
  "requestedInformation",
];

// The API returns country names ("Germany"), the create call expects codes.
function countryCode(country) {
  if (!country) return "DE";
  const map = { germany: "DE", deutschland: "DE", austria: "AT", österreich: "AT", switzerland: "CH", schweiz: "CH" };
  return map[String(country).toLowerCase()] ?? String(country);
}

// Turns a permission request (as returned by GET v2/permissionrequest/{id})
// into initial values for the create form ("duplicate & edit").
export function toPrefill(request) {
  if (!request || typeof request !== "object") return null;
  const infos = pick(request, MEASURAND_REQUEST_KEYS) ?? [];
  const origStart = asDate(pick(request, ["start", "startDate"]));
  const start = origStart && origStart >= todayIso() ? origStart : todayIso();
  const dataStart = asDate(pick(request, ["dataStart"]));
  const purpose = pick(request, ["permissionRequestPurpose", "purpose"]) ?? "";
  return {
    start,
    end: asDate(pick(request, ["end", "endDate"])),
    // The API fills the data period with the permission period by default;
    // only keep it if it was really limited (and is not stale).
    dataStart: dataStart && dataStart !== origStart && dataStart >= start ? dataStart : "",
    dataEnd: (() => {
      const dataEnd = asDate(pick(request, ["dataEnd"]));
      return dataEnd && dataEnd !== asDate(pick(request, ["end", "endDate"])) ? dataEnd : "";
    })(),
    // The API returns both, but a new request takes exactly one of them.
    serviceId: purpose ? "" : pick(request, ["serviceId", "service.id"]) ?? "",
    purpose,
    measurands: (Array.isArray(infos) ? infos : []).map((m) => {
      const addr = m?.deliveryPointAddress ?? m?.address ?? null;
      const dh = m?.dataHolder ?? null;
      const code = m?.codeValue ?? m?.deliveryPointCode?.codeValue ?? m?.deliveryPoint?.codeValue ?? "";
      return {
        measurandCapabilityCode: m?.measurandCapabilityCode ?? m?.measurandCapability?.code ?? "",
        useDeliveryPoint: Boolean(code || addr || dh),
        codeValue: code ?? "",
        address: {
          houseNumber: addr?.houseNumber ?? "",
          streetName: addr?.streetName ?? "",
          city: addr?.city ?? "",
          postalCode: addr?.postalCode ?? "",
          country: countryCode(addr?.country),
        },
        dataHolder: { Id: dh?.Id ?? dh?.id ?? "", BDEW: dh?.Id || dh?.id ? "" : dh?.BDEW ?? dh?.bdew ?? "" },
      };
    }),
  };
}

// --- Catalog entries (measurand capabilities, active data holders) ---

export function measurandCodeOf(item) {
  if (typeof item === "string") return item;
  return pick(item, ["measurandCapabilityCode", "code", "measurandCode", "id"]) ?? findKey(item, /code$/i) ?? "";
}

const TEXT_KEY = /(name|description|desc|title|label|text|bezeichnung|beschreibung)/i;
const LANG_KEY = {
  de: /([_-]?de|ger|german|deutsch)$/i,
  en: /([_-]?en|eng|english|englisch)$/i,
};
const LANG_VALUE = { de: /^(de|ger|german|deutsch)(-|_|$)/i, en: /^(en|eng|english|englisch)(-|_|$)/i };

function matchesLang(key, lang) {
  // "German" ends in "en", so a German match always wins over English.
  if (lang === "en" && LANG_KEY.de.test(key)) return false;
  return LANG_KEY[lang].test(key);
}

// Text of an object in the given language ("de" | "en"). Understands
// suffixed keys (descriptionDe, name_en, descriptionGerman), nested objects
// ({ description: { de, en } }) and translation arrays
// ([{ language: "de", text: "..." }]). Returns undefined if none found.
export function localizedText(item, lang) {
  if (!item || typeof item !== "object") return undefined;
  const entries = Object.entries(item);
  // 1. Suffixed keys, names before descriptions.
  const suffixed = entries.filter(([k, v]) => typeof v === "string" && v && TEXT_KEY.test(k) && matchesLang(k, lang));
  if (suffixed.length) return suffixed[0][1];
  for (const [k, v] of entries) {
    if (!v || typeof v !== "object") continue;
    // 2. Nested { de: "...", en: "..." }.
    if (!Array.isArray(v) && TEXT_KEY.test(k)) {
      const hit = Object.entries(v).find(([k2, v2]) => typeof v2 === "string" && v2 && (LANG_VALUE[lang].test(k2) || matchesLang(k2, lang)));
      if (hit) return hit[1];
    }
    // 3. Translation arrays.
    if (Array.isArray(v)) {
      const hit = v.find((t) => t && typeof t === "object" && LANG_VALUE[lang].test(String(t.language ?? t.lang ?? t.culture ?? t.locale ?? "")));
      if (hit) {
        const text = pick(hit, ["text", "value", "description", "name", "label", "title"]);
        if (typeof text === "string") return text;
      }
    }
  }
  return undefined;
}

// Whether the item has texts in both languages (to decide whether the
// language switch is worth showing).
export function hasBothLanguages(item) {
  return Boolean(localizedText(item, "de")) && Boolean(localizedText(item, "en"));
}

export function measurandLabelOf(item, lang = "de") {
  const code = measurandCodeOf(item);
  const suffix = lang === "en" ? "English" : "German";
  const name =
    pick(item, [`simpleDescription${suffix}`, `businessDescription${suffix}`]) ??
    localizedText(item, lang) ??
    pick(item, ["name", "displayName", "description", "measurandName", "title", "label"]);
  return typeof name === "string" && name && name !== code ? `${name} (${code})` : code;
}

export function holderIdOf(item) {
  return pick(item, ["id", "Id", "dataHolderId", "companyId"]) ?? "";
}

export function holderBdewOf(item) {
  return pick(item, ["bdew", "BDEW", "bdewCode", "BdewCode"]) ?? findKey(item, /bdew/i) ?? "";
}

export function holderLabelOf(item) {
  const name = pick(item, ["displayName", "name", "companyName", "legalName", "shortName"]);
  const bdew = holderBdewOf(item);
  if (name && bdew) return `${name} (${bdew})`;
  return name || bdew || String(holderIdOf(item));
}

const MEASURAND_SKIP = /^(measurandCapabilityCode|code|measurandCode|id|name|displayName|description|measurandName|title|label)$/i;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// "key: value" pairs of a measurand capability's simple properties, for a
// compact summary in the dropdown (name and code are shown separately).
export function measurandPropertiesOf(item) {
  if (!item || typeof item !== "object") return [];
  const out = [];
  for (const [key, value] of Object.entries(item)) {
    if (MEASURAND_SKIP.test(key) || TEXT_KEY.test(key) || value === null || value === undefined || value === "") continue;
    if (typeof value === "object") {
      if (Array.isArray(value) && value.length && value.every((v) => typeof v !== "object")) out.push([key, value.join(", ")]);
      continue;
    }
    if (typeof value === "string" && GUID.test(value)) continue;
    out.push([key, typeof value === "boolean" ? (value ? "yes" : "no") : String(value)]);
  }
  return out;
}

// --- Identity of the logged-in ESA ---

// Decodes the payload of a JWT access token (no signature check - only used
// for display). Returns null for opaque tokens.
export function decodeJwt(token) {
  try {
    const part = String(token).split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    const claims = JSON.parse(json);
    return claims && typeof claims === "object" ? claims : null;
  } catch {
    return null;
  }
}

// Best guess for a human-readable ESA name from token claims, falling back
// to the client id that was used to log in.
export function identityOf(auth, esa = null) {
  const claims = decodeJwt(auth?.token);
  const name =
    pick(esa, ["name", "displayName"]) ??
    pick(claims, [
      "esaName",
      "companyName",
      "company_name",
      "organizationName",
      "organization_name",
      "org_name",
      "organisation",
      "organization",
      "company",
      "client_name",
      "name",
    ]) ?? findKey(claims, /(company|organi[sz]ation|esa).*name/i);
  const id = pick(esa, ["bdew"]) ?? pick(claims, ["esaId", "companyId", "organizationId", "org_id", "tenant", "tenantId"]) ?? null;
  const clientId = auth?.clientId ?? pick(claims, ["client_id", "azp", "aud", "sub"]) ?? null;
  return {
    name: typeof name === "string" ? name : null,
    id,
    clientId: typeof clientId === "string" ? clientId : clientId ? String(clientId) : null,
    claims,
  };
}

// --- Data holder (MSB) of a permission record ---

const HOLDER_OBJ_KEY = /(dataholder|data_holder|mpo|msb|meteringpointoperator|messstellenbetreiber)/i;
const HOLDER_ID_KEY = /^(dataholder|mpo|msb|meteringpointoperator)_?id$/i;
const HOLDER_BDEW_KEY = /^(dataholder|mpo|msb|meteringpointoperator)_?(bdew|bdewcode|marketpartnerid|code)$/i;
const HOLDER_NAME_KEY = /^(dataholder|mpo|msb|meteringpointoperator)_?(name|displayname)$/i;

// Finds the data holder reference ({ id, bdew, name }) anywhere in a record
// (searched a few levels deep, including arrays). Returns null if none.
export function holderRefOf(record, depth = 0) {
  if (!record || typeof record !== "object" || depth > 4) return null;
  const ref = { id: null, bdew: null, name: null };
  for (const [k, v] of Object.entries(record)) {
    if (v === null || v === undefined || v === "") continue;
    if (typeof v !== "object") {
      if (HOLDER_ID_KEY.test(k)) ref.id = String(v);
      else if (HOLDER_BDEW_KEY.test(k)) ref.bdew = String(v);
      else if (HOLDER_NAME_KEY.test(k)) ref.name = String(v);
    } else if (!Array.isArray(v) && HOLDER_OBJ_KEY.test(k)) {
      ref.id ??= pick(v, ["id", "Id"]) ?? null;
      ref.bdew ??= holderBdewOf(v) || null;
      ref.name ??= pick(v, ["displayName", "name", "companyName", "legalName"]) ?? null;
    }
  }
  // The API uses an all-zero GUID when no data holder was given.
  if (ref.id && /^[0-]+$/.test(ref.id)) ref.id = null;
  if (ref.id || ref.bdew || ref.name) return ref;
  for (const v of Object.values(record)) {
    const items = Array.isArray(v) ? v : v && typeof v === "object" ? [v] : [];
    for (const it of items) {
      const found = holderRefOf(it, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// Human-readable MSB label for a record, looked up in the active data
// holder list where possible.
export function recordHolderLabel(record, dataHolders = []) {
  const ref = holderRefOf(record);
  if (!ref) return null;
  const match = dataHolders.find(
    (h) =>
      (ref.id && String(holderIdOf(h)).toLowerCase() === ref.id.toLowerCase()) ||
      (ref.bdew && String(holderBdewOf(h)) === ref.bdew)
  );
  if (match) return holderLabelOf(match);
  if (ref.name) return ref.bdew ? `${ref.name} (${ref.bdew})` : ref.name;
  return ref.bdew ? `BDEW ${ref.bdew}` : ref.id;
}

// MSB for a permission record, taken from its parent request: the measurand
// request whose Malo/Melo matches the record's delivery point, otherwise the
// first one that names a data holder.
export function holderForRecord(record, request, dataHolders = []) {
  const own = recordHolderLabel(record, dataHolders);
  if (own) return own;
  if (!request) return null;
  const infos = pick(request, MEASURAND_REQUEST_KEYS);
  if (!Array.isArray(infos)) return null;
  const code = pick(record, ["deliveryPointCode", "deliveryPointCodeValue", "deliveryPoint.codeValue", "codeValue"]);
  const withHolder = infos.filter((m) => holderRefOf(m));
  const deliveryCode = (m) => m?.deliveryPointCode?.codeValue ?? m?.codeValue ?? m?.deliveryPoint?.codeValue;
  const match = code && withHolder.find((m) => String(deliveryCode(m) ?? "") === String(code));
  if (match) return recordHolderLabel(match, dataHolders);
  // No matching delivery point: only answer if the request has one MSB.
  const all = [...new Set(withHolder.map((m) => recordHolderLabel(m, dataHolders)))];
  return all.length === 1 ? all[0] : null;
}

// All MSB names of a permission request (one per measurand request).
export function requestHoldersOf(request, dataHolders = []) {
  const infos = pick(request, MEASURAND_REQUEST_KEYS);
  if (!Array.isArray(infos)) return [];
  return [...new Set(infos.map((m) => recordHolderLabel(m, dataHolders)).filter(Boolean))];
}

// Delivery point codes (Malo/Melo) of a permission request.
export function requestDeliveryPointsOf(request) {
  const infos = pick(request, MEASURAND_REQUEST_KEYS);
  if (!Array.isArray(infos)) return [];
  return [...new Set(infos.map((m) => m?.deliveryPointCode?.codeValue ?? m?.codeValue).filter(Boolean))];
}

// The ESA (data recipient with role "esp") named in a request detail.
export function esaOfRequest(request) {
  const recipients = request?.dataRecipients;
  if (!Array.isArray(recipients)) return null;
  return recipients.find((r) => String(r?.roleType).toLowerCase() === "esp") ?? recipients[0] ?? null;
}

// Delivery point code of a record; the API returns "na" when there is none.
export function recordDeliveryPointOf(record) {
  const code = pick(record, ["deliveryPointCode", "deliveryPointCodeValue"]);
  if (!code || String(code).toLowerCase() === "na") return "";
  return [code, pick(record, ["deliveryPointCodeType"])].filter(Boolean).join(" ");
}

// --- Who did it? ---
// Records name the revoking participant only by id (terminatedById) and
// status changes by actorId. The parent request lists all participants:
// data owner, data recipients (ESA) and data holders (MSB) per delivery point.
export const ACTOR_ROLES = { dataOwner: "Grid user", esp: "ESP", mpo: "MPO" };

export function actorOf(actorId, request) {
  if (!actorId || !request) return null;
  const id = String(actorId).toLowerCase();
  const same = (x) => x && String(x).toLowerCase() === id;
  if (same(request.dataOwner?.id)) return { role: "dataOwner", name: request.dataOwner?.name ?? null };
  const esp = (request.dataRecipients ?? []).find((r) => same(r?.id));
  if (esp) return { role: "esp", name: esp.name ?? null };
  const infos = pick(request, MEASURAND_REQUEST_KEYS);
  const mpo = (Array.isArray(infos) ? infos : []).map((m) => m?.dataHolder).find((h) => same(h?.id));
  if (mpo) return { role: "mpo", name: mpo.name ?? null };
  return null;
}

// --- Completion link for the grid user ---------------------------------------
// The create call returns e.g. https://ppd.forwatt.io/finalizeGenerateRequest?openRequestId=<id>,
// but the request detail does not contain it. The link only depends on the
// request id, so it can be rebuilt. The front-end address per environment is
// learned from create responses (kept in memory only) with known defaults.
const COMPLETION_BASES = [
  { api: /api\.ppd\.traxes\.io/i, base: "https://ppd.forwatt.io/finalizeGenerateRequest" },
  { api: /\/\/api\.traxes\.io/i, base: "https://forwatt.io/finalizeGenerateRequest" },
];
const learnedBases = new Map();

export function rememberCompletionLink(apiBaseUrl, link) {
  try {
    const u = new URL(link);
    if (!u.searchParams.get("openRequestId")) return;
    learnedBases.set(apiBaseUrl, u.origin + u.pathname);
  } catch {
    /* not a URL */
  }
}

export function completionLinkFor(apiBaseUrl, requestId) {
  if (!requestId) return null;
  const base = learnedBases.get(apiBaseUrl) ?? COMPLETION_BASES.find((b) => b.api.test(apiBaseUrl ?? ""))?.base;
  return base ? `${base}?openRequestId=${encodeURIComponent(requestId)}` : null;
}
