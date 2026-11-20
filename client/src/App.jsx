import AuthPanel from "./components/AuthPanel.jsx";
import Flag from "./components/Flag.jsx";
import { LANGUAGES, LangProvider, useI18n } from "./lib/i18n.jsx";
import { identityOf } from "./lib/model.js";
import { href, useRoute } from "./lib/router.js";
import { DataProvider, useData } from "./lib/store.jsx";
import ApiExplorer from "./views/ApiExplorer.jsx";
import MapView from "./views/MapView.jsx";
import { AboutPage, ImprintPage, OPERATOR, PrivacyPage } from "./views/InfoPages.jsx";
import Dashboard from "./views/Dashboard.jsx";
import NewRequestView from "./views/NewRequestView.jsx";
import RecordDetail from "./views/RecordDetail.jsx";
import RecordsView from "./views/RecordsView.jsx";
import RequestDetail from "./views/RequestDetail.jsx";
import RequestsView from "./views/RequestsView.jsx";

// `locked`: only usable after logging in.
// Grouped: day-to-day operations, background information, technical tools.
const NAV = [
  { group: "Operations" },
  { id: "dashboard", label: "Dashboard", icon: "▦", locked: true },
  { id: "requests", label: "Permission Requests", icon: "✉", locked: true },
  { id: "records", label: "Permission Records", icon: "▤", locked: true },
  { id: "new", label: "New Request", icon: "+", locked: true },
  { group: "Information" },
  { id: "map", label: "Coverage map", icon: "⌖" },
  { id: "about", label: "About", icon: "ⓘ" },
  { group: "Technical" },
  { id: "explorer", label: "API Explorer", icon: "⌘" },
  { id: "connection", label: "Login / Connection", icon: "⚿" },
];

// Pages that are reachable without logging in.
const PUBLIC_PAGES = ["explorer", "connection", "about", "imprint", "privacy", "map"];

const LABELS = Object.fromEntries(NAV.filter((n) => n.id).map((n) => [n.id, n.label]));

function environmentOf(apiBaseUrl) {
  if (/ppd|acc/i.test(apiBaseUrl)) return { label: "ACC (Test)", tone: "warn" };
  if (/api\.traxes\.io/i.test(apiBaseUrl)) return { label: "PRD (Production)", tone: "err" };
  return { label: "Custom", tone: "neutral" };
}

function ConnectionView({ wanted }) {
  const { auth, setAuth, esa } = useData();
  const { t } = useI18n();
  return (
    <div>
      {!auth.token && wanted && LABELS[wanted] && wanted !== "connection" && (
        <div className="notice notice--brand">
          <span className="notice__icon" aria-hidden>
            🔒
          </span>
          <div>
            <strong>{t('"{page}" requires a login.', { page: t(LABELS[wanted]) })}</strong>{" "}
            {t("Log in below - the page opens automatically afterwards.")}
          </div>
        </div>
      )}
      <div className="page-head">
        <div>
          <h1>{auth.token ? t("Connection") : t("Log in to get started")}</h1>
          <p className="page-head__sub">
            {auth.token
              ? t("You are connected to the for.Watt API.")
              : t("Most features of this suite need an access token for the for.Watt API.")}
          </p>
        </div>
      </div>

      {!auth.token && (
        <div className="unlock">
          <div className="unlock__title">{t("After logging in you can use:")}</div>
          <ul>
            <li>
              <strong>{t("Dashboard")}</strong> - {t("all requests at a glance, by status")}
            </li>
            <li>
              <strong>{t("Permission Requests & Records")}</strong> - {t("browse, open, reject, revoke")}
            </li>
            <li>
              <strong>{t("New Request")}</strong> - {t("create and duplicate permission requests")}
            </li>
            <li>
              <strong>{t("API Explorer")}</strong> - {t("send raw API calls")}
            </li>
          </ul>
        </div>
      )}

      <AuthPanel auth={auth} setAuth={setAuth} esa={esa} />
      {auth.token && (
        <div className="notice notice--ok">
          <span className="notice__icon" aria-hidden>
            ✓
          </span>
          <div>
            {t("Connected.")} <a href={href("dashboard")}>{t("Continue to the dashboard")}</a>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginBanner() {
  const { t } = useI18n();
  return (
    <div className="login-banner">
      <span className="login-banner__icon" aria-hidden>
        🔒
      </span>
      <div className="login-banner__text">
        <strong>{t("You are not logged in.")}</strong> {t("Most features are locked until you request an access token.")}
      </div>
      <a className="btn" href={href("connection")}>
        {t("Log in")}
      </a>
    </div>
  );
}

// Language switch with flags, bottom left in the sidebar.
function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-flags" role="radiogroup" aria-label={t("Language")}>
      {LANGUAGES.map((l) => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={lang === l.id}
          className={`lang-flag ${lang === l.id ? "lang-flag--active" : ""}`}
          onClick={() => setLang(l.id)}
          title={l.name}
        >
          <Flag code={l.id} />
          <span className="lang-flag__code">{l.id.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}

function Toasts() {
  const { toasts } = useData();
  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}

function Shell() {
  const route = useRoute();
  const { auth, esa } = useData();
  const { t } = useI18n();
  const [section, param] = route;
  const env = environmentOf(auth.apiBaseUrl);
  // Without a token every locked page shows the login page instead; the URL
  // stays the same, so the wanted page appears right after logging in.
  const page = auth.token || PUBLIC_PAGES.includes(section) ? section : "connection";
  const who = identityOf(auth, esa);

  let content;
  if (page === "requests" && param) content = <RequestDetail key={param} id={param} />;
  else if (page === "requests") content = <RequestsView />;
  else if (page === "records" && param) content = <RecordDetail key={param} id={param} />;
  else if (page === "records") content = <RecordsView />;
  else if (page === "new") content = <NewRequestView />;
  else if (page === "explorer") content = <ApiExplorer auth={auth} sub={param} />;
  else if (page === "connection") content = <ConnectionView wanted={section} />;
  else if (page === "about") content = <AboutPage />;
  else if (page === "map") content = <MapView />;
  else if (page === "imprint") content = <ImprintPage />;
  else if (page === "privacy") content = <PrivacyPage />;
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
            if (n.group) return (
              <div key={i} className="nav__group">
                {t(n.group)}
              </div>
            );
            const locked = n.locked && !auth.token;
            return (
              <a
                key={n.id}
                href={href(n.id)}
                className={`nav__item ${page === n.id ? "nav__item--active" : ""} ${locked ? "nav__item--locked" : ""}`}
                title={locked ? t("Log in first") : undefined}
              >
                <span className="nav__icon" aria-hidden>
                  {n.icon}
                </span>
                <span className="nav__label">{t(n.label)}</span>
                {locked && (
                  <span className="nav__lock" aria-label={t("locked")}>
                    🔒
                  </span>
                )}
              </a>
            );
          })}
        </nav>
        <LanguageSwitch />
        {auth.token ? (
          <a className="conn" href={href("connection")}>
            <span className="conn__dot conn__dot--ok" />
            <span className="conn__text">
              <small className="conn__caption">{t("Logged in as")}</small>
              <span className="conn__who" title={who.clientId ?? ""}>
                {who.name || who.clientId || t("Connected")}
              </span>
              <small>
                <span className={`env env--${env.tone}`}>{t(env.label)}</span>
              </small>
            </span>
          </a>
        ) : (
          <a className="conn conn--login" href={href("connection")}>
            <span className="conn__dot" />
            <span>
              {t("Not logged in")}
              <small>{t("Click to log in")}</small>
            </span>
          </a>
        )}
      </aside>
      <main className="main">
        {!auth.token && !["connection", "about", "imprint", "privacy", "map"].includes(page) && <LoginBanner />}
        {content}
        <footer className="app__footer">
          <p>{t("Unofficial web client for the for.Watt Data Permissions API 2.0. Inputs and API responses are not stored - see the privacy policy for details.")}</p>
          <p>
            {t("Designed by")}{" "}
            <a href={OPERATOR.linkedin} target="_blank" rel="noreferrer">
              {OPERATOR.name}
            </a>
            , {t("built with the help of Claude")}
            {" · "}
            <a href={href("about")}>{t("About")}</a>
            {" · "}
            <a href={href("imprint")}>{t("Imprint")}</a>
            {" · "}
            <a href={href("privacy")}>{t("Privacy policy")}</a>
          </p>
        </footer>
      </main>
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <DataProvider>
        <Shell />
      </DataProvider>
    </LangProvider>
  );
}
