import { useState } from "react";
import { useI18n } from "../lib/i18n.jsx";
import { href } from "../lib/router.js";

export const MAP_URL = "https://fourwheel.github.io/forWatt-map/";

// Embeds the for.Watt coverage map (separate project on GitHub Pages).
// It loads content from third parties (GitHub Pages, unpkg.com,
// tile.openstreetmap.org), so it is only loaded after an explicit click.
// The choice is kept in memory only, like everything else in this app.
let consentGiven = false;

export default function MapView() {
  const { t } = useI18n();
  const [consent, setConsent] = useState(consentGiven);

  const load = () => {
    consentGiven = true;
    setConsent(true);
  };

  return (
    <div className="list-page map-page">
      <div className="page-head">
        <div>
          <h1>{t("Coverage map")}</h1>
          <p className="page-head__sub">
            {t("Which metering point operators are connected to for.Watt - by distribution network area.")}
          </p>
        </div>
        <div className="button-row">
          <a className="btn btn--ghost" href={MAP_URL} target="_blank" rel="noreferrer">
            {t("Open in new tab")} ↗
          </a>
        </div>
      </div>

      <div className="card map-card">
        {consent ? (
          <iframe
            className="map-frame"
            src={MAP_URL}
            title={t("Coverage map")}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        ) : (
          <div className="map-consent">
            <div className="map-consent__icon" aria-hidden>
              🗺️
            </div>
            <h2>{t("Load the coverage map?")}</h2>
            <p>
              {t(
                "The map is a separate project hosted on GitHub Pages. When it is loaded, your browser connects to GitHub Pages, unpkg.com (map library) and tile.openstreetmap.org (map tiles); these providers receive your IP address."
              )}
            </p>
            <div className="button-row button-row--center">
              <button type="button" className="btn" onClick={load}>
                {t("Load map")}
              </button>
              <a className="btn btn--ghost" href={MAP_URL} target="_blank" rel="noreferrer">
                {t("Open in new tab")} ↗
              </a>
            </div>
            <p className="field__help">
              {t("More in the")} <a href={href("privacy")}>{t("privacy policy")}</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
