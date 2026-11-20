import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n.jsx";
import { href } from "../lib/router.js";
import { RoleIcon } from "../components/Participants.jsx";

// ---------------------------------------------------------------------------
// Operator details for the imprint and privacy policy.
//
// Postal address and e-mail are not in the source as plain text: they are
// stored as reversed character codes and only assembled in the browser after
// the page has rendered, inside an element marked data-nosnippet. Simple
// scrapers, AI crawlers and address harvesters that read the HTML or grep the
// JavaScript bundle do not find them; people see them normally.
// To change them, encode with:
//   node -e "console.log(JSON.stringify([...'text'].map(c => c.charCodeAt(0)).reverse()))"
// ---------------------------------------------------------------------------
const PROTECTED = {
  street: [56, 49, 32, 46, 114, 116, 83, 32, 114, 101, 110, 101, 115, 115, 111, 90],
  city: [110, 105, 108, 114, 101, 66, 32, 49, 54, 57, 48, 49],
  mail: [101, 100, 46, 101, 116, 105, 108, 114, 101, 116, 101, 109, 116, 114, 97, 109, 115, 64, 111, 102, 110, 105],
};

const decode = (codes) => String.fromCharCode(...[...codes].reverse());

// Returns the decoded contact data only after mount (empty during the first render).
function useProtectedContact() {
  const [contact, setContact] = useState(null);
  useEffect(() => {
    setContact({ street: decode(PROTECTED.street), city: decode(PROTECTED.city), mail: decode(PROTECTED.mail) });
  }, []);
  return contact;
}

function ProtectedMail() {
  const c = useProtectedContact();
  if (!c) return <span data-nosnippet>…</span>;
  return (
    <a data-nosnippet href={`mailto:${c.mail}`}>
      {c.mail}
    </a>
  );
}

export const OPERATOR = {
  name: "Laurin Vierrath",
  country: "Deutschland",
  linkedin: "https://www.linkedin.com/in/laurin-vierrath/",
  // How long the web server keeps its access logs (see the CloudPanel /
  // Nginx log rotation on the server).
  // From /etc/logrotate.d/<site-user>: "daily" + "rotate 7".
  logRetentionDays: 7,
  hoster: "STRATO AG, Otto-Ostrowski-Straße 7, 10249 Berlin",
};

const SOURCES = {
  traxes: "https://www.traxes.io/service/for.watt-data-permissions/2.0/overview",
  forwatt: "https://www.forwatt.io",
  forwattEsp: "https://www.forwatt.io/ESP",
  epic: "https://www.epic-portal.io",
};

function Ext({ to, children }) {
  return (
    <a href={to} target="_blank" rel="noreferrer">
      {children ?? to}
    </a>
  );
}

function Page({ title, children }) {
  return (
    <div className="info-page">
      <div className="page-head">
        <div>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="card prose">{children}</div>
    </div>
  );
}

function Address() {
  const c = useProtectedContact();
  return (
    <p data-nosnippet>
      {OPERATOR.name}
      <br />
      {c?.street ?? "…"}
      <br />
      {c?.city ?? "…"}
      <br />
      {OPERATOR.country}
    </p>
  );
}

function RolesTable({ de }) {
  const rows = de
    ? [
        ["esp", "Energieserviceanbieter (ESA)", "Data Recipient", "Stellt Permission Requests und nutzt die Daten."],
        ["dataOwner", "Anschlussnutzer", "Data Owner", "Erteilt, prüft und widerruft die Berechtigung (forWatt.io)."],
        ["mpo", "Messstellenbetreiber (MSB)", "Data Holder", "Prüft Stammdaten und Zuständigkeit und genehmigt (epic-portal.io)."],
      ]
    : [
        ["esp", "Energy Service Provider (ESP)", "Data Recipient", "Creates permission requests and uses the data."],
        ["dataOwner", "Grid User", "Data Owner", "Grants, reviews and revokes the permission (forWatt.io)."],
        ["mpo", "Metering Point Operator (MPO)", "Data Holder", "Validates master data and responsibility and approves (epic-portal.io)."],
      ];
  return (
    <table className="roles-table">
      <thead>
        <tr>
          <th />
          <th>{de ? "Rolle" : "Role"}</th>
          <th>{de ? "In der API" : "In the API"}</th>
          <th>{de ? "Aufgabe" : "Task"}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([role, name, api, task]) => (
          <tr key={role}>
            <td className="roles-table__icon">
              <RoleIcon role={role} size={22} />
            </td>
            <td>
              <strong>{name}</strong>
            </td>
            <td>
              <code>{api}</code>
            </td>
            <td>{task}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// About: background, history of for.Watt, how this tool came about, author
// ---------------------------------------------------------------------------
export function AboutPage() {
  const { lang } = useI18n();
  if (lang === "de") {
    return (
      <Page title="Über diese Anwendung">
        <h2>Was ist for.Watt?</h2>
        <p>
          Wer Messdaten aus intelligenten Messsystemen (Smart Metern) nutzen will, braucht dafür eine Berechtigung,
          damit der Messstellenbetreiber (MSB) als Data Holder die Daten rechtskonform weitergeben darf. Klassische
          Marktteilnehmer wie Lieferanten und Netzbetreiber leiten diese Berechtigung aus dem Regulierungsrahmen ab.
          Neue Anwendungsfälle, die mit der Digitalisierung des Energiesystems entstehen, müssen die Zustimmung dagegen
          ausdrücklich beim Endkunden (Anschlussnutzer, Data Owner) einholen.
        </p>
        <p>
          Der API-basierte <strong>for.Watt Data Permissions Service</strong> von 50Hertz übernimmt dafür die
          Kommunikation zwischen Anschlussnutzer (AN), Messstellenbetreiber (MSB) und Energieserviceanbieter (ESA). Der
          eigentliche Datenaustausch zwischen MSB und ESA folgt weiterhin dem regulierten Bestell- und
          Austauschprozess. Der Einstieg ist entweder über den Permission Service möglich (Berechtigung und
          Stammdatenabgleich vor dem Bestellprozess) oder über den Bestellprozess selbst, in dem die Berechtigung
          „ergänzt“ wird.
        </p>

        <h2>Rollen und Begriffe</h2>
        <RolesTable de />

        <h2>Entstehung und Entwicklung</h2>
        <p>Nach öffentlich zugänglichen Angaben von 50Hertz und der traxes-Plattform:</p>
        <ul>
          <li>
            50Hertz bietet die Schnittstelle als <strong>kostenlose API</strong> für Energieserviceanbieter an; sie
            ist für Marktparteien gedacht, die beim BDEW in der Marktrolle Energieserviceanbieter registriert sind.
          </li>
          <li>
            Gestartet ist der Dienst mit <strong>Mako365</strong> als Energieserviceanbieter und{" "}
            <strong>Stromnetz Berlin</strong> als Messstellenbetreiber.
          </li>
          <li>
            Seitdem werden schrittweise weitere Partner angebunden – insbesondere weitere Messstellenbetreiber, um die
            Gebiete abzudecken, die für ESA interessant sind.
          </li>
          <li>
            Endkunden erteilen, prüfen und widerrufen ihre Zustimmung im Kundenportal{" "}
            <Ext to={SOURCES.forwatt}>forWatt.io</Ext>, Messstellenbetreiber prüfen Anfragen im{" "}
            <Ext to={SOURCES.epic}>epic-portal.io</Ext>, ESA arbeiten über die API.
          </li>
          <li>
            Die aktuelle Fassung der Schnittstelle ist die Version 2.0; die Dokumentation steht auf der
            traxes-Plattform bereit.
          </li>
        </ul>
        <p className="field__help">
          Quellen: <Ext to={SOURCES.traxes}>traxes.io – for.Watt Data Permissions 2.0</Ext>,{" "}
          <Ext to={SOURCES.forwatt}>forwatt.io</Ext>, <Ext to={SOURCES.forwattEsp}>forwatt.io/ESP</Ext>. Stand der
          Zusammenfassung: November 2026; maßgeblich sind die Originalquellen.
        </p>

        <h2>Wie der Prozess abläuft</h2>
        <ol>
          <li>Der ESA legt einen Permission Request an.</li>
          <li>Der Anschlussnutzer ergänzt bzw. prüft die Angaben und erteilt die Berechtigung; ausgewählte MSB-Nutzer werden per E-Mail benachrichtigt.</li>
          <li>Der MSB prüft Stammdaten und die Zuständigkeit für die MaLo/MeLo und genehmigt oder lehnt ab.</li>
          <li>Nach der Genehmigung entstehen Permission Records (einer pro Lieferstelle); der Anschlussnutzer wird benachrichtigt.</li>
          <li>Der ESA fragt den Status per API ab und referenziert die Permission Records im Bestellprozess.</li>
        </ol>

        <h2>Über diese Anwendung</h2>
        <p>
          Diese Web-Oberfläche ist ein <strong>inoffizieller</strong> Client für die for.Watt Data Permissions API.
          Sie entstand, um die API nicht nur über einzelne Aufrufe, sondern wie ein Programm im Browser nutzen zu
          können: Requests und Records ansehen, filtern, anlegen, duplizieren, ablehnen und widerrufen. Die
          ursprünglichen Formulare für jeden Endpunkt sind weiterhin im API Explorer verfügbar.
        </p>
        <p>
          Sie ist kein Angebot von 50Hertz und steht in keiner Verbindung zu 50Hertz oder den Betreibern der
          traxes-Plattform. „for.Watt“ ist eine Bezeichnung der jeweiligen Rechteinhaber.
        </p>

        <h2>Autor</h2>
        <p>
          Konzipiert von <Ext to={OPERATOR.linkedin}>{OPERATOR.name}</Ext>. Realisiert mit Hilfe von Claude.
        </p>
      </Page>
    );
  }
  return (
    <Page title="About this application">
      <h2>What is for.Watt?</h2>
      <p>
        Using metering data from smart meters requires permission so that metering point operators (MPOs) as data
        holders can pass on data in a legally compliant way. Traditional market participants such as suppliers and
        network operators derive this permission from the regulatory framework. New use cases emerging from the
        digitalization of the energy system, however, must obtain permission explicitly from the end consumer (data
        owner).
      </p>
      <p>
        The API-based <strong>for.Watt Data Permissions Service</strong> by 50Hertz handles the communication between
        grid users (data owners), metering point operators (data holders) and energy service providers (data recipients). The
        actual data exchange between MPO and ESP still follows the regulated ordering and exchange process. The process
        can start either with the Permission Service (permission and master data reconciliation before ordering) or
        with the ordering process, where the permission is "supplemented".
      </p>

      <h2>Roles and terms</h2>
      <RolesTable de={false} />

      <h2>History and development</h2>
      <p>According to publicly available information from 50Hertz and the traxes platform:</p>
      <ul>
        <li>
          50Hertz offers the interface as a <strong>free API</strong> for energy service providers; it is intended for
          market parties registered with BDEW in the market role energy service provider.
        </li>
        <li>
          The service launched with <strong>Mako365</strong> as energy service provider and{" "}
          <strong>Stromnetz Berlin</strong> as metering point operator.
        </li>
        <li>
          Additional partners are being onboarded gradually – in particular further MPOs to cover the areas ESPs are
          interested in.
        </li>
        <li>
          End customers grant, review and revoke consent in the customer portal <Ext to={SOURCES.forwatt}>forWatt.io</Ext>,
          MPOs review requests in <Ext to={SOURCES.epic}>epic-portal.io</Ext>, ESPs work via the API.
        </li>
        <li>The current version of the interface is 2.0; its documentation is available on the traxes platform.</li>
      </ul>
      <p className="field__help">
        Sources: <Ext to={SOURCES.traxes}>traxes.io – for.Watt Data Permissions 2.0</Ext>,{" "}
        <Ext to={SOURCES.forwatt}>forwatt.io</Ext>, <Ext to={SOURCES.forwattEsp}>forwatt.io/ESP</Ext>. Summary as of
        November 2026; the original sources are authoritative.
      </p>

      <h2>How the process works</h2>
      <ol>
        <li>The ESP creates a permission request.</li>
        <li>The grid user completes/reviews it and grants permission; selected MPO users are notified by e-mail.</li>
        <li>The MPO validates master data and MaLo/MeLo ownership and approves or rejects.</li>
        <li>On approval, permission records are issued (one per delivery point) and the grid user is notified.</li>
        <li>The ESP queries the status via the API and references the permission records in the ordering process.</li>
      </ol>

      <h2>About this application</h2>
      <p>
        This web interface is an <strong>unofficial</strong> client for the for.Watt Data Permissions API. It was built
        to use the API like an application in the browser rather than through single calls: view, filter, create,
        duplicate, reject and revoke requests and records. The original per-endpoint forms are still available in the
        API Explorer.
      </p>
      <p>
        It is not a 50Hertz offering and is not affiliated with 50Hertz or the operators of the traxes platform.
        "for.Watt" is a designation of its respective rights holders.
      </p>

      <h2>Author</h2>
      <p>
        Designed by <Ext to={OPERATOR.linkedin}>{OPERATOR.name}</Ext>. Built with the help of Claude.
      </p>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Imprint (Impressum)
// ---------------------------------------------------------------------------
export function ImprintPage() {
  const { lang } = useI18n();
  const de = lang === "de";
  return (
    <Page title={de ? "Impressum" : "Imprint"}>
      <h2>{de ? "Angaben gemäß § 5 DDG" : "Information pursuant to § 5 DDG (German Digital Services Act)"}</h2>
      <Address />
      <h2>{de ? "Kontakt" : "Contact"}</h2>
      <p>
        {de ? "E-Mail" : "E-mail"}: <ProtectedMail />
        <br />
        LinkedIn: <Ext to={OPERATOR.linkedin} />
      </p>
      <h2>{de ? "Hinweis" : "Note"}</h2>
      <p>
        {de
          ? "Diese Anwendung ist ein inoffizieller, privat betriebener Client für die for.Watt Data Permissions API. Sie ist kein Angebot von 50Hertz und steht in keiner Verbindung zu 50Hertz oder den Betreibern der traxes-Plattform."
          : "This application is an unofficial, privately operated client for the for.Watt Data Permissions API. It is not a 50Hertz offering and is not affiliated with 50Hertz or the operators of the traxes platform."}
      </p>
      <h2>{de ? "Haftung für Inhalte und Links" : "Liability for content and links"}</h2>
      <p>
        {de
          ? "Die Inhalte dieser Anwendung wurden mit Sorgfalt erstellt; für Richtigkeit, Vollständigkeit und Aktualität wird keine Gewähr übernommen. Die über die API angezeigten Daten stammen vom for.Watt-Dienst. Für Inhalte verlinkter externer Seiten sind ausschließlich deren Betreiber verantwortlich."
          : "The content of this application was created with care; no guarantee is given for its accuracy, completeness or timeliness. Data shown via the API comes from the for.Watt service. The operators of linked external sites are solely responsible for their content."}
      </p>
      <p>
        {de ? "Siehe auch die" : "See also the"} <a href={href("privacy")}>{de ? "Datenschutzerklärung" : "privacy policy"}</a>.
      </p>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Privacy policy
// ---------------------------------------------------------------------------
export function PrivacyPage() {
  const { lang } = useI18n();
  if (lang === "de") {
    return (
      <Page title="Datenschutzerklärung">
        <h2>1. Verantwortlicher</h2>
        <Address />
        <p>
          Kontakt: siehe <a href={href("imprint")}>Impressum</a>.
        </p>

        <h2>2. Kurz zusammengefasst</h2>
        <ul>
          <li>Keine Benutzerkonten, keine Cookies, kein Tracking, keine Analyse-Tools, keine Werbung.</li>
          <li>Keine Datenbank: Die Anwendung speichert keine Eingaben und keine API-Antworten.</li>
          <li>
            Keine externen Inhalte beim Seitenaufruf: Schriftarten und alle Dateien kommen vom eigenen Server. Einzige
            Ausnahme ist die Karte der Netzabdeckung – und die nur nach deinem Klick (siehe 6).
          </li>
          <li>
            Der Webserver protokolliert Zugriffe technisch bedingt (siehe 3). Daten, die du an die for.Watt API
            schickst, laufen nur während der jeweiligen Anfrage durch den Server (siehe 4).
          </li>
        </ul>

        <h2>3. Hosting und Server-Protokolle</h2>
        <p>
          Die Anwendung läuft auf einem gemieteten Server ({OPERATOR.hoster}). Beim Aufruf jeder Seite und bei jeder
          Anfrage an den Server speichert der Webserver (Nginx) automatisch ein Zugriffsprotokoll mit:
        </p>
        <ul>
          <li>IP-Adresse des anfragenden Geräts,</li>
          <li>Datum und Uhrzeit,</li>
          <li>
            aufgerufener Pfad – bei API-Aufrufen enthält dieser z. B. die ID eines Permission Requests oder Records
            (etwa <code>/api/forwatt/v2/permissionrequest/&lt;ID&gt;</code>),
          </li>
          <li>HTTP-Statuscode und übertragene Datenmenge,</li>
          <li>Referrer und Browser-Kennung (User-Agent).</li>
        </ul>
        <p>
          Nicht protokolliert werden die Inhalte von Anfragen und Antworten, also weder Client Secret noch Access
          Token noch die Daten aus der API. Die Protokolle werden täglich rotiert und nach {OPERATOR.logRetentionDays} Tagen automatisch gelöscht.
          Zweck ist der sichere und stabile Betrieb (Fehlersuche, Abwehr von Angriffen); Rechtsgrundlage ist Art. 6
          Abs. 1 lit. f DSGVO.
        </p>
        <p>
          Der Anwendungsprozess selbst schreibt nur Start- und Fehlermeldungen in sein Prozess-Log, keine Inhalte von
          Anfragen.
        </p>

        <h2>4. Was beim Nutzen der Anwendung passiert</h2>
        <p>
          Der Server dient als Durchleitung (Proxy) zur for.Watt API, weil der Browser diese aus technischen Gründen
          nicht direkt aufrufen kann.
        </p>
        <ul>
          <li>
            <strong>Client ID und Client Secret</strong> werden beim Login einmalig an den Token-Endpunkt von
            signin.energy weitergegeben (technisch als Parameter in der Anfrage-URL) und danach verworfen. Die
            Anwendung speichert und protokolliert sie nicht; wie der Token-Anbieter mit seinen eigenen Protokollen
            umgeht, liegt in dessen Verantwortung.
          </li>
          <li>
            <strong>Access Token</strong>: Es liegt nur im Arbeitsspeicher deines Browser-Tabs und wird bei jeder
            API-Anfrage im Authorization-Header mitgeschickt. Es wird nicht gespeichert und ist nach dem Neuladen der
            Seite weg.
          </li>
          <li>
            <strong>Inhalte von API-Anfragen und -Antworten</strong> können personenbezogene Daten enthalten – etwa
            Namen von Data Ownern, Adressen von Lieferstellen und MaLo/MeLo-Nummern. Sie werden nur für die Dauer der
            jeweiligen Anfrage im Arbeitsspeicher des Servers verarbeitet und unverändert weitergeleitet, nicht
            gespeichert und nicht protokolliert.
          </li>
          <li>
            <strong>Im Browser</strong> werden weder Cookies noch Local Storage genutzt. Die Sprachauswahl gilt nur bis
            zum Neuladen. Dein Browser bietet eventuell an, Zugangsdaten im eigenen Passwortmanager zu speichern – das
            ist eine Funktion des Browsers, nicht dieser Anwendung.
          </li>
        </ul>
        <p>
          Für die über die API abgerufenen Daten ist das jeweils eingeloggte Unternehmen (ESA) verantwortlich; diese
          Anwendung ist dafür nur ein technisches Werkzeug. Rechtsgrundlage der Durchleitung ist Art. 6 Abs. 1 lit. b
          bzw. f DSGVO (Bereitstellung der von dir angeforderten Funktion).
        </p>

        <h2>5. Empfänger</h2>
        <ul>
          <li>
            for.Watt Data Permissions API (über die traxes-Plattform) und der Token-Dienst signin.energy – nur die
            Anfragen, die du auslöst. Es gelten deren Datenschutzhinweise.
          </li>
          <li>Der Hosting-Anbieter des Servers im Rahmen der Auftragsverarbeitung.</li>
        </ul>
        <p>Eine Übermittlung in Drittländer durch diese Anwendung findet nicht statt; zur optional ladbaren Karte siehe 6.</p>

        <h2>6. Eingebettete Karte (Netzabdeckung)</h2>
        <p>
          Die Seite „Netzabdeckung“ kann eine Karte einbinden, die als eigenes Projekt auf GitHub Pages
          (fourwheel.github.io, GitHub Inc., USA) liegt. Sie wird <strong>erst nach deinem Klick</strong> auf „Karte
          laden“ geladen. Dann verbindet sich dein Browser direkt mit GitHub Pages, unpkg.com (Kartenbibliothek
          Leaflet) und tile.openstreetmap.org (Kartenkacheln der OpenStreetMap Foundation); diese Anbieter erhalten
          dabei deine IP-Adresse und technische Browserdaten, GitHub ggf. auch in den USA. Rechtsgrundlage ist deine
          Einwilligung durch den Klick (Art. 6 Abs. 1 lit. a DSGVO); sie gilt nur bis zum Neuladen der Seite.
        </p>

        <h2>7. Externe Links</h2>
        <p>
          Links, etwa zu LinkedIn, forwatt.io oder traxes.io, werden erst beim Anklicken geöffnet. Dann gelten die
          Datenschutzbestimmungen der jeweiligen Anbieter.
        </p>

        <h2>8. Deine Rechte</h2>
        <p>
          Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung
          der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage
          von Art. 6 Abs. 1 lit. f (Art. 21). Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde
          beschweren (Art. 77 DSGVO). Wende dich dafür an die im <a href={href("imprint")}>Impressum</a> genannte E-Mail-Adresse.
        </p>
        <p className="field__help">Stand: November 2026</p>
      </Page>
    );
  }
  return (
    <Page title="Privacy policy">
      <h2>1. Controller</h2>
      <Address />
      <p>
        Contact: see the <a href={href("imprint")}>imprint</a>.
      </p>

      <h2>2. Summary</h2>
      <ul>
        <li>No user accounts, no cookies, no tracking, no analytics, no advertising.</li>
        <li>No database: the application does not store any inputs or API responses.</li>
        <li>
          No external content on page load: fonts and all files are served from this server. The only exception is the
          coverage map – and only after you click (see 6).
        </li>
        <li>
          The web server logs requests for technical reasons (see 3). Data you send to the for.Watt API only passes
          through the server for the duration of each request (see 4).
        </li>
      </ul>

      <h2>3. Hosting and server logs</h2>
      <p>
        The application runs on a rented server ({OPERATOR.hoster}). For every page view and every request, the web
        server (Nginx) automatically writes an access log entry containing:
      </p>
      <ul>
        <li>IP address of the requesting device,</li>
        <li>date and time,</li>
        <li>
          requested path – for API calls this includes e.g. the ID of a permission request or record (such as{" "}
          <code>/api/forwatt/v2/permissionrequest/&lt;ID&gt;</code>),
        </li>
        <li>HTTP status code and amount of data transferred,</li>
        <li>referrer and browser identification (user agent).</li>
      </ul>
      <p>
        The contents of requests and responses are not logged – neither client secret, access token nor API data. Logs
        are rotated daily and deleted automatically after {OPERATOR.logRetentionDays} days. The purpose is secure and stable operation
        (troubleshooting, defending against attacks); the legal basis is Art. 6(1)(f) GDPR.
      </p>
      <p>The application process itself only writes start-up and error messages to its process log, no request contents.</p>

      <h2>4. What happens when you use the application</h2>
      <p>The server acts as a pass-through (proxy) to the for.Watt API, because browsers cannot call it directly for technical reasons.</p>
      <ul>
        <li>
          <strong>Client ID and client secret</strong> are passed once to the signin.energy token endpoint when you log
          in (technically as parameters in the request URL) and then discarded. The application neither stores nor
          logs them; how the token provider handles its own logs is its responsibility.
        </li>
        <li>
          <strong>Access token</strong>: kept only in your browser tab's memory and sent in the Authorization header of
          each API request. It is not stored and is gone after a page reload.
        </li>
        <li>
          <strong>Contents of API requests and responses</strong> may contain personal data – such as data owner names,
          delivery point addresses and MaLo/MeLo numbers. They are processed in the server's memory only for the
          duration of each request and forwarded unchanged; they are neither stored nor logged.
        </li>
        <li>
          <strong>In the browser</strong>, neither cookies nor local storage are used. The language choice lasts until
          the page is reloaded. Your browser may offer to save credentials in its own password manager – that is a
          browser feature, not part of this application.
        </li>
      </ul>
      <p>
        The logged-in company (ESP) is responsible for the data retrieved via the API; this application is merely a
        technical tool. The legal basis for the pass-through is Art. 6(1)(b) or (f) GDPR (providing the function you
        requested).
      </p>

      <h2>5. Recipients</h2>
      <ul>
        <li>
          for.Watt Data Permissions API (via the traxes platform) and the signin.energy token service – only the
          requests you trigger. Their privacy notices apply.
        </li>
        <li>The server's hosting provider as a data processor.</li>
      </ul>
      <p>This application does not transfer data to third countries; for the optional map see 6.</p>

      <h2>6. Embedded map (coverage)</h2>
      <p>
        The "Coverage map" page can embed a map that is a separate project hosted on GitHub Pages (fourwheel.github.io,
        GitHub Inc., USA). It is <strong>only loaded after you click</strong> "Load map". Your browser then connects
        directly to GitHub Pages, unpkg.com (Leaflet map library) and tile.openstreetmap.org (map tiles of the
        OpenStreetMap Foundation); these providers receive your IP address and technical browser data, GitHub possibly
        also in the USA. The legal basis is your consent by clicking (Art. 6(1)(a) GDPR); it lasts until the page is
        reloaded.
      </p>

      <h2>7. External links</h2>
      <p>
        Links, e.g. to LinkedIn, forwatt.io or traxes.io, are only opened when clicked. The privacy policies of the
        respective providers then apply.
      </p>

      <h2>8. Your rights</h2>
      <p>
        You have the right of access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17), restriction of
        processing (Art. 18), data portability (Art. 20) and to object to processing based on Art. 6(1)(f) (Art. 21).
        You may also lodge a complaint with a data protection supervisory authority (Art. 77 GDPR). Please use the e-mail
        address given in the <a href={href("imprint")}>imprint</a>.
      </p>
      <p className="field__help">As of November 2026</p>
    </Page>
  );
}
