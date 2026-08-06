# Deploying to a CloudPanel vServer

This app is a single Node process (Express) that serves both the API
proxy and the built React frontend, so it maps cleanly onto CloudPanel's
"Node.js" site type - no separate static host needed.

## 1. Create the site in CloudPanel

1. CloudPanel → **Sites** → **Add Site** → **Node.js**.
2. Enter your domain (e.g. `forwatt.example.com`) and pick a Node.js
   version (20 or newer).
3. Note the **App Port** CloudPanel assigns/lets you choose (e.g.
   `3000`) - Nginx will reverse-proxy your domain to this port.
4. CloudPanel creates a site user and a home directory, typically
   `/home/<site-user>/htdocs/<domain>`.

## 2. Get the private repo onto the server

The GitHub repo is private, so pulling it needs a credential. The
cleanest option is a read-only **deploy key**:

```bash
# on the vServer, as the site user
ssh-keygen -t ed25519 -C "cloudpanel-deploy" -f ~/.ssh/forwatt_deploy -N ""
cat ~/.ssh/forwatt_deploy.pub
```

Add the printed public key on GitHub: repo → **Settings** → **Deploy
keys** → **Add deploy key** (read-only is enough). Then, still on the
server:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com-forwatt
  HostName github.com
  User git
  IdentityFile ~/.ssh/forwatt_deploy
EOF

cd ~/htdocs/<domain>
git clone git@github.com-forwatt:fourwheel/forwatt-permissions-webclient.git .
```

## 3. Install, build, configure the port

```bash
npm install
# postinstall automatically installs server + client deps and runs `vite build`
```

In CloudPanel's Node.js site settings, set:

- **Startup File**: `server/index.js`
- **Environment Variables**: `PORT=<the App Port from step 1>`

The app reads `process.env.PORT` (falls back to 8787 if unset), so it
must match what Nginx is proxying to.

## 4. Start / restart

Use CloudPanel's **Restart App** button on the site page (it manages the
process via PM2 under the hood). Once DNS for the domain points at the
vServer, enable **Let's Encrypt** in CloudPanel for automatic HTTPS.

## 5. Redeploying after changes

```bash
cd ~/htdocs/<domain>
git pull
npm install   # rebuilds the client if anything changed
```

Then hit **Restart App** in CloudPanel again.

## Notes

- No secrets are stored on the server beyond what's needed to run the
  process - client secrets a user types into the web UI are forwarded
  once per request and never written to disk or logged (see
  `server/index.js`).
- No database, no `.env` file with credentials, no persistent state at
  all: the app is safe to redeploy or restart at any time.
