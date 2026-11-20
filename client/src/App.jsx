import AuthPanel from "./components/AuthPanel.jsx";
import { href, useRoute } from "./lib/router.js";
import { DataProvider, useData } from "./lib/store.jsx";
import ApiExplorer from "./views/ApiExplorer.jsx";
import Dashboard from "./views/Dashboard.jsx";
import NewRequestView from "./views/NewRequestView.jsx";
import RecordDetail from "./views/RecordDetail.jsx";
import RecordsView from "./views/RecordsView.jsx";
import RequestDetail from "./views/RequestDetail.jsx";
import RequestsView from "./views/RequestsView.jsx";

// `locked`: only usable after logging in.
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "▦", locked: true },
  { id: "requests", label: "Permission Requests", icon: "✉", locked: true },
  { id: "records", label: "Permission Records", icon: "▤", locked: true },
  { id: "new", label: "New Request", icon: "+", locked: true },
  { divider: true },
  { id: "explorer", label: "API Explorer", icon: "⌘" },
  { id: "connection", label: "Login / Connection", icon: "⚿" },
];

const LABELS = Object.fromEntries(NAV.filter((n) => n.id).map((n) => [n.id, n.label]));

function environmentOf(apiBaseUrl) {
  if (/ppd|acc/i.test(apiBaseUrl)) return { label: "ACC (Test)", tone: "warn" };
  if (/api\.traxes\.io/i.test(apiBaseUrl)) return { label: "PRD (Production)", tone: "err" };
  return { label: "Custom", tone: "neutral" };
}

function ConnectionView({ wanted }) {
  const { auth, setAuth } = useData();
  return (
    <div>
      {!auth.token && wanted && LABELS[wanted] && wanted !== "connection" && (
        <div className="notice notice--brand">
          <span className="notice__icon" aria-hidden>
            🔒
          </span>
          <div>
            <strong>"{LABELS[wanted]}" requires a login.</strong> Log in below - the page opens automatically
            afterwards.
          </div>
        </div>
      )}
      <div className="page-head">
        <div>
          <h1>{auth.token ? "Connection" : "Log in to get started"}</h1>
          <p className="page-head__sub">
            {auth.token
              ? "You are connected to the for.Watt API."
              : "Most features of this suite need an access token for the for.Watt API."}
          </p>
        </div>
      </div>

      {!auth.token && (
        <div className="unlock">
          <div className="unlock__title">After logging in you can use:</div>
          <ul>
            <li>
              <strong>Dashboard</strong> - all requests at a glance, by status
            </li>
            <li>
              <strong>Permission Requests &amp; Records</strong> - browse, open, reject, terminate
            </li>
            <li>
              <strong>New Request</strong> - create and duplicate permission requests
            </li>
            <li>
              <strong>API Explorer</strong> - send raw API calls
            </li>
          </ul>
        </div>
      )}

      <AuthPanel auth={auth} setAuth={setAuth} />
      {auth.token && (
        <div className="notice notice--ok">
          <span className="notice__icon" aria-hidden>
            ✓
          </span>
          <div>
            Connected. Continue to the <a href={href("dashboard")}>Dashboard</a>.
          </div>
        </div>
      )}
    </div>
  );
}

function LoginBanner() {
  return (
    <div className="login-banner">
      <span className="login-banner__icon" aria-hidden>
        🔒
      </span>
      <div className="login-banner__text">
        <strong>You are not logged in.</strong> Most features are locked until you request an access token.
      </div>
      <a className="btn" href={href("connection")}>
        Log in
      </a>
    </div>
  );
}

function Toasts() {
  const { toasts } = useData();
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

function Shell() {
  const route = useRoute();
  const { auth } = useData();
  const [section, param] = route;
  const env = environmentOf(auth.apiBaseUrl);
  // Without a token every locked page shows the login page instead; the URL
  // stays the same, so the wanted page appears right after logging in.
  const page = auth.token || section === "explorer" ? section : "connection";

  let content;
  if (page === "requests" && param) content = <RequestDetail key={param} id={param} />;
  else if (page === "requests") content = <RequestsView />;
  else if (page === "records" && param) content = <RecordDetail key={param} id={param} />;
  else if (page === "records") content = <RecordsView />;
  else if (page === "new") content = <NewRequestView />;
  else if (page === "explorer") content = <ApiExplorer auth={auth} sub={param} />;
  else if (page === "connection") content = <ConnectionView wanted={section} />;
  else content = <Dashboard />;

  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href={href("dashboard")}>
          <span className="brand__mark" aria-hidden>
            fW
          </span>
          <span>
            <strong>for.Watt</strong>
            <small>Permissions Suite</small>
          </span>
        </a>
        <nav className="nav">
          {NAV.map((n, i) => {
            if (n.divider) return <div key={i} className="nav__divider" />;
            const locked = n.locked && !auth.token;
            return (
              <a
                key={n.id}
                href={href(n.id)}
                className={`nav__item ${page === n.id ? "nav__item--active" : ""} ${locked ? "nav__item--locked" : ""}`}
                title={locked ? "Log in first" : undefined}
              >
                <span className="nav__icon" aria-hidden>
                  {n.icon}
                </span>
                <span className="nav__label">{n.label}</span>
                {locked && (
                  <span className="nav__lock" aria-label="locked">
                    🔒
                  </span>
                )}
              </a>
            );
          })}
        </nav>
        {auth.token ? (
          <a className="conn" href={href("connection")}>
            <span className="conn__dot conn__dot--ok" />
            <span>
              Connected
              <small>
                <span className={`env env--${env.tone}`}>{env.label}</span>
              </small>
            </span>
          </a>
        ) : (
          <a className="conn conn--login" href={href("connection")}>
            <span className="conn__dot" />
            <span>
              Not logged in
              <small>Click to log in</small>
            </span>
          </a>
        )}
      </aside>
      <main className="main">
        {!auth.token && page !== "connection" && <LoginBanner />}
        {content}
        <footer className="app__footer">
          <p>Unofficial web client for the for.Watt Data Permissions API 2.0. No inputs or responses are stored.</p>
        </footer>
      </main>
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}
