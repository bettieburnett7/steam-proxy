require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// --- app + middleware ---
const app = express();

// Allow only your frontend to call this API (adjust if you change domains)
app.use(cors({
origin: 'https://steam-frontend-gomv.onrender.com'
}));

// Simple rate limiting
const limiter = rateLimit({
windowMs: 60 * 1000, // 1 minute
limit: 60, // max 60 req/IP/min
});
app.use(limiter);

// Config
const PORT = process.env.PORT || 3000;
const KEY = process.env.STEAM_KEY;

// Root check
app.get('/', (_req, res) => {
res.send('Steam proxy running');
});

// ---------- PROFILE ----------
app.get('/steam/profile', async (req, res) => {
try {
const { steamid } = req.query;
if (!steamid) return res.status(400).json({ error: 'Missing ?steamid' });

const url = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/');
url.searchParams.set('key', KEY);
url.searchParams.set('steamids', steamid);

const r = await fetch(url);
const data = await r.json();
res.json(data);
} catch (e) {
console.error(e);
res.status(500).json({ error: 'Proxy error' });
}
});

// ---------- OWNED GAMES ----------
app.get('/steam/owned-games', async (req, res) => {
try {
const { steamid } = req.query;
if (!steamid) return res.status(400).json({ error: 'Missing ?steamid' });

const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/');
url.searchParams.set('key', KEY);
url.searchParams.set('steamid', steamid);
url.searchParams.set('include_appinfo', 'true');
url.searchParams.set('include_played_free_games', 'true');

const r = await fetch(url);
const data = await r.json();
res.json(data);
} catch (e) {
console.error(e);
res.status(500).json({ error: 'Proxy error' });
}
});

// ---------- RESOLVE VANITY OR PROFILE URL -> steamid ----------
app.get('/steam/resolve', async (req, res) => {
try {
let { v: vanity } = req.query;
if (!vanity) return res.status(400).json({ error: 'Missing ?v' });

// If a full profile URL was pasted, try to extract the tail
try {
const u = new URL(vanity);
const parts = u.pathname.split('/').filter(Boolean);
// /id/<name> OR /profiles/<steamid64>
if (parts[0] === 'profiles' && parts[1]) {
return res.json({ response: { success: 1, steamid: parts[1] } });
}
if (parts[0] === 'id' && parts[1]) {
vanity = parts[1];
}
} catch { /* not a URL; keep as text */ }

// Call Steam resolve API
const url = new URL('https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/');
url.searchParams.set('key', KEY);
url.searchParams.set('vanityurl', vanity);

const r = await fetch(url);
const data = await r.json();
res.json(data);
} catch (e) {
console.error(e);
res.status(500).json({ error: 'Proxy error' });
}
});

// (optional) tiny request logger to help debug
app.use((req, _res, next) => { console.log(req.method, req.url); next(); });

// Debug endpoint: list all registered routes so we can verify what's live
app.get('/routes', (_req, res) => {
const list = (app._router?.stack || [])
.filter(layer => layer.route)
.map(layer => ({
method: Object.keys(layer.route.methods)[0]?.toUpperCase(),
path: layer.route.path
}));
res.json(list);
});

// Health check so we can prove a new deploy is live
app.get('/ping', (_req, res) => {
res.json({ ok: true, now: new Date().toISOString() });
});

app.listen(PORT, () => {
console.log(`Steam proxy listening on http://localhost:${PORT}`);
});

