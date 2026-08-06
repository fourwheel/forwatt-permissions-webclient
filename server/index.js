import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "..", "client", "dist");

const app = express();
app.use(cors());
app.use(express.json());

const TOKEN_URLS = {
  prd: "https://signin.energy/am/oauth2/realms/root/realms/difesp/access_token",
  acc: "https://acc.signin.energy/am/oauth2/realms/root/realms/difesp/access_token",
};

// Fetches an OAuth2 bearer token on behalf of the client. The client
// secret passes through this process only for the duration of the
// request - it is never logged, cached, or written to disk.
app.post("/api/token", async (req, res) => {
  const { clientId, clientSecret, environment } = req.body || {};

  if (!clientId || !clientSecret || !environment) {
    return res.status(400).json({ error: "clientId, clientSecret and environment are required." });
  }

  const tokenUrl = TOKEN_URLS[environment];
  if (!tokenUrl) {
    return res.status(400).json({ error: "Invalid environment. Allowed values: 'prd', 'acc'." });
  }

  const url = new URL(tokenUrl);
  url.searchParams.set("grant_type", "client_credentials");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("scope", "esp");

  try {
    const upstream = await fetch(url, { method: "POST" });
    const text = await upstream.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Token request failed.", details: body });
    }
    return res.json(body);
  } catch (err) {
    return res.status(502).json({ error: "Token endpoint unreachable.", details: String(err) });
  }
});

// Generic pass-through proxy to the for.Watt Data Permissions API.
// The bearer token travels only in the Authorization header of each
// individual request and is never persisted server-side.
app.all("/api/forwatt/*", async (req, res) => {
  const apiBaseUrl = req.get("x-api-base-url") || "https://api.traxes.io/forwatt";
  const targetPath = req.params[0];
  const upstreamUrl = new URL(targetPath, apiBaseUrl.endsWith("/") ? apiBaseUrl : apiBaseUrl + "/");

  for (const [key, value] of Object.entries(req.query)) {
    upstreamUrl.searchParams.set(key, value);
  }

  const authHeader = req.get("authorization");
  if (!authHeader) {
    return res.status(401).json({ error: "No Authorization header provided." });
  }

  const init = {
    method: req.method,
    headers: {
      authorization: authHeader,
      accept: "application/json",
    },
  };

  if (!["GET", "HEAD"].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(req.body);
  }

  try {
    const upstream = await fetch(upstreamUrl, init);
    const text = await upstream.text();
    res.status(upstream.status);
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.set("content-type", contentType);
    return res.send(text);
  } catch (err) {
    return res.status(502).json({ error: "for.Watt API unreachable.", details: String(err) });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Serves the built React app (client/dist) so a single Node process
// covers both the API and the UI - no separate static host needed.
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next(err);
  });
});

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`for.Watt WebClient listening on http://localhost:${port}`);
});
