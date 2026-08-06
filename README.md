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

1. In the "Authentication" section, select the environment (PRD or
   ACC/PRPRD), enter Client ID and Client Secret, and click "Request
   access token". The access token is only kept in browser state and is
   lost on page reload.
2. Use the "Prerequisites", "Permission Requests", and "Permission
   Records" tabs to pick the desired action, fill in the fields, and
   submit.
3. The response (HTTP status + JSON) is shown directly below the
   respective form.

The "API Base URL" in the auth section can be adjusted if needed, e.g. if
the test/ACC environment requires a different base URL than
`https://api.traxes.io/forwatt`.

## Security notes

- The client secret leaves the server only toward the official token
  endpoint (`signin.energy` or `acc.signin.energy`) and is never logged
  or stored.
- Destructive actions (terminate permission record, reject permission
  request) require explicit confirmation via a checkbox.
- This app is intended for local use. For a production multi-user
  deployment, the proxy should be secured further (e.g. HTTPS, network
  isolation).
