import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { callForwatt } from "../api.js";
import { errorText, esaOfRequest, extractList, recordRequestIdOf, requestIdOf, statusOf } from "./model.js";

const PAGE_SIZE = 50;
const MAX_PAGES = 100; // safety cap: at most 5000 entries per load
const ID_CHUNK = 50;
const REQUEST_STATES = ["created", "waitingForApproval", "approved", "rejected"];
const DETAIL_CONCURRENCY = 6;
const MAX_DETAILS = 1000;

const DataContext = createContext(null);

// Holds the auth state plus the loaded permission requests/records, all in
// memory only (nothing is persisted).
export function DataProvider({ children }) {
  const [auth, setAuth] = useState({ token: null, apiBaseUrl: "https://api.traxes.io/forwatt" });
  const [requests, setRequests] = useState({ loading: false, error: null, items: [], loadedAt: null });
  const [records, setRecords] = useState({ loading: false, error: null, items: [], loadedAt: null });
  const [toasts, setToasts] = useState([]);
  // Prefill for the "new request" view (set by "duplicate & edit").
  const [draft, setDraft] = useState(null);
  // Full details per permission request id (purpose, MSB, ESA, ...),
  // loaded in the background after the lists.
  const [details, setDetails] = useState({ loading: false, byId: {} });
  // Language for measuring product descriptions ("de" | "en").
  const [lang, setLang] = useState("de");
  // Measurand capabilities and active data holders (MSB) for the dropdowns.
  const [catalog, setCatalog] = useState({ loading: false, error: null, measurands: [], dataHolders: [] });
  const authRef = useRef(auth);
  authRef.current = auth;

  const api = useCallback((path, { method = "GET", body } = {}) => {
    const { token, apiBaseUrl } = authRef.current;
    return callForwatt({ path, method, body, token, apiBaseUrl });
  }, []);

  const notify = useCallback((message, tone = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const loadRecords = useCallback(
    async (requestItems) => {
      setRecords((r) => ({ ...r, loading: true, error: null }));
      const ids = [...new Set(requestItems.map(requestIdOf).filter(Boolean))];
      const all = [];
      try {
        // The find endpoint needs a filter too; without request ids there is
        // nothing to look up.
        for (let i = 0; i < ids.length; i += ID_CHUNK) {
          const res = await api("v2/permissionrecord/find", { method: "POST", body: { permissionRequestIds: ids.slice(i, i + ID_CHUNK) } });
          if (!res.ok && res.status !== 404) throw new Error(errorText(res));
          if (res.ok) all.push(...extractList(res.data));
        }
        setRecords({ loading: false, error: null, items: all, loadedAt: new Date() });
      } catch (err) {
        setRecords({ loading: false, error: err.message || String(err), items: all, loadedAt: new Date() });
      }
    },
    [api]
  );

  const loadDetails = useCallback(
    async (requestItems) => {
      const ids = [...new Set(requestItems.map(requestIdOf).filter(Boolean))].slice(0, MAX_DETAILS);
      setDetails((d) => ({ ...d, loading: true }));
      let next = 0;
      const worker = async () => {
        while (next < ids.length) {
          const id = ids[next++];
          try {
            const res = await api(`v2/permissionrequest/${encodeURIComponent(id)}`);
            if (res.ok) setDetails((d) => ({ ...d, byId: { ...d.byId, [id]: res.data } }));
          } catch {
            /* ignore single failures - the detail page loads it again */
          }
        }
      };
      await Promise.all(Array.from({ length: DETAIL_CONCURRENCY }, worker));
      setDetails((d) => ({ ...d, loading: false }));
    },
    [api]
  );

  const refresh = useCallback(async () => {
    setRequests((r) => ({ ...r, loading: true, error: null }));
    const all = [];
    try {
      // The endpoint requires at least one filter, so query each state
      // separately (it returns the latest state per request, so the results
      // don't overlap).
      for (const state of REQUEST_STATES) {
        let count = 0;
        for (let page = 1; page <= MAX_PAGES; page++) {
          const res = await api("v2/permissionrequest/statechanges", {
            method: "POST",
            body: { state, pageSize: PAGE_SIZE, pageNumber: page },
          });
          if (!res.ok) {
            // A 404 usually just means "no (more) entries".
            if (res.status === 404) break;
            throw new Error(errorText(res));
          }
          const list = extractList(res.data);
          // Make sure every item carries its state, even if the API omits it.
          all.push(...list.map((it) => (it && typeof it === "object" && !statusOf(it) ? { ...it, state } : it)));
          count += list.length;
          const total = res.data?.totalCount ?? res.data?.total ?? res.data?.totalItems;
          if (list.length < PAGE_SIZE || (typeof total === "number" && count >= total)) break;
        }
      }
      setRequests({ loading: false, error: null, items: all, loadedAt: new Date() });
    } catch (err) {
      setRequests({ loading: false, error: err.message || String(err), items: all, loadedAt: new Date() });
    }
    await Promise.all([loadRecords(all), loadDetails(all)]);
  }, [api, loadRecords, loadDetails]);

  const loadCatalog = useCallback(async () => {
    setCatalog((c) => ({ ...c, loading: true, error: null }));
    try {
      const [m, d] = await Promise.all([api("v2/measurand-capabilities"), api("v2/active-dataholders")]);
      const errors = [m, d].filter((r) => !r.ok).map(errorText);
      setCatalog({
        loading: false,
        error: errors.length ? errors.join(" / ") : null,
        measurands: m.ok ? extractList(m.data) : [],
        dataHolders: d.ok ? extractList(d.data) : [],
      });
    } catch (err) {
      setCatalog({ loading: false, error: err.message || String(err), measurands: [], dataHolders: [] });
    }
  }, [api]);

  // Load everything as soon as a token becomes available.
  useEffect(() => {
    if (auth.token) {
      refresh();
      loadCatalog();
    } else {
      setRequests({ loading: false, error: null, items: [], loadedAt: null });
      setRecords({ loading: false, error: null, items: [], loadedAt: null });
      setCatalog({ loading: false, error: null, measurands: [], dataHolders: [] });
      setDetails({ loading: false, byId: {} });
    }
  }, [auth.token, refresh, loadCatalog]);

  const recordsForRequest = useCallback(
    (requestId) => records.items.filter((r) => String(recordRequestIdOf(r)) === String(requestId)),
    [records.items]
  );

  // The logged-in ESA as named in the request details (the token itself only
  // carries the client id).
  const esa = useMemo(() => {
    for (const d of Object.values(details.byId)) {
      const e = esaOfRequest(d);
      if (e) return e;
    }
    return null;
  }, [details.byId]);

  // Current status of a request: the request detail is authoritative (the
  // state change list can miss automatic transitions, e.g. a request that
  // was rejected without a state change entry).
  const requestStatus = useCallback(
    (item) => statusOf(details.byId[requestIdOf(item)]) ?? statusOf(item),
    [details.byId]
  );

  // Request items with their current status merged in.
  const currentRequests = useMemo(
    () =>
      requests.items.map((it) => {
        const s = requestStatus(it);
        return s && s !== statusOf(it) ? { ...it, listedStatus: statusOf(it), newStatus: s } : it;
      }),
    [requests.items, requestStatus]
  );

  const value = useMemo(
    () => ({ auth, setAuth, api, requests: { ...requests, items: currentRequests }, records, refresh, recordsForRequest, notify, toasts, draft, setDraft, catalog, loadCatalog, lang, setLang, details, esa }),
    [auth, api, requests, currentRequests, records, refresh, recordsForRequest, notify, toasts, draft, catalog, loadCatalog, lang, details, esa]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
