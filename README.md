# for.Watt Data Permissions - WebClient

Small web client for the [for.Watt Data Permissions API 2.0](https://www.traxes.io/service/for.watt-data-permissions/2.0/overview).
Covers all 11 API endpoints with input forms. No data is stored: client
secret, access token, and all inputs/responses live only in the browser
tab's memory, or pass through the local proxy server once per request.
Nothing is written to disk, to a database, to localStorage, or to logs.

## Structure

- `server/` - lightweight Express proxy. Needed because (a) a direct
  browser-side request would otherwise fail on CORS and (b) the OAuth2
  token endpoint can be called server-side this way. The proxy holds no
  state: token and credentials are only used for the duration of each
  request.
- `client/` - React app (Vite) with one form per API endpoint.

## Requirements

- Node.js 20+
- An OAuth2 client (Client ID + Client Secret) for the for.Watt Data
  Permissions API (see `/getaccess` on the traxes.io portal).

## Running it

### Development (with hot reload)

In two terminals:

```bash
cd server
npm install
npm start
# runs on http://localhost:8787
```

```bash
cd client
npm install
npm run dev
# runs on http://localhost:5173
```

Then open `http://localhost:5173` in your browser.

### Production (single process)

For deployment, everything - frontend and API - runs in a single Node
process on one port (no CORS, no need for two hosts):

```bash
npm install   # installs server + client and builds the client automatically (postinstall)
npm start     # starts server/index.js, which also serves client/dist
```

The port is controlled via the `PORT` environment variable (default: 8787).

For deploying this to a CloudPanel-managed vServer, see [DEPLOY.md](DEPLOY.md).

## Usage

1. Open "Connection" in the sidebar, select the environment (PRD or
   ACC/PRPRD), enter Client ID and Client Secret, and click "Request
   access token". The access token is only kept in browser state and is
   lost on page reload.
2. Once connected, all permission requests and their permission records
   are loaded automatically:
   - **Dashboard** - counts per status and the latest requests.
   - **Permission Requests** / **Permission Records** - color-coded lists
     with status filters, search and sorting; click an entry to open its
     detail page.
   - Detail pages offer the available actions: **Reject** a request,
     **Terminate** a record, and **Duplicate & edit** (the API cannot
     edit a request, so this prefills a new one).
   - **New Request** - create a permission request.
3. The language (German / English) is switched with the flags at the
   bottom left of the sidebar; it defaults to the browser language.
4. **About**, **Imprint** and **Privacy policy** are linked in the footer.
   Fill in the operator details (address, e-mail, log retention, hoster)
   in `client/src/views/InfoPages.jsx` (`OPERATOR`) before publishing.
5. **API Explorer** keeps the original endpoint-by-endpoint forms
   (Prerequisites, Permission Requests, Permission Records) showing the
   raw HTTP status and JSON.

The "API Base URL" in the auth section is set automatically based on the
selected environment (PRD: `https://api.traxes.io/forwatt`, ACC/PRPRD:
`https://api.ppd.traxes.io/forwatt`) and can be overridden manually if
needed.

## Security notes

- The client secret leaves the server only toward the official token
  endpoint (`signin.energy` or `acc.signin.energy`) and is never logged
  or stored by this app. The Client ID and Client Secret inputs use
  standard `username`/`current-password` autocomplete, so the browser
  may offer to save them in its own password manager - that's the
  browser's own opt-in behavior, not something this app writes to disk
  or storage.
- Destructive actions (terminate permission record, reject permission
  request) require explicit confirmation via a checkbox.
- This app is intended for local use. For a production multi-user
  deployment, the proxy should be secured further (e.g. HTTPS, network
  isolation).
