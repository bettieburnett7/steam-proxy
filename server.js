require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const KEY = process.env.STEAM_KEY; // <-- set this in Render (Environment tab)

if (!KEY) {
console.warn('WARNING: STEAM_KEY is missing. Set it in your Render service env vars.');
}

/* ---------- CORS: allow your frontend ---------- */
app.use(cors({
origin: [
'https://steam-frontend-gomv.onrender.com', // your Render static site
'http://localhost:5173', // common dev ports (optional)
'http://localhost:5500'
],
methods: ['GET'],
}));

/* ---------- Rate limit to prevent abuse ---------- */
app.use(rateLimit({
windowMs: 60 * 1000, // 1 minute
max: 60, // 60 requests per IP per minute
standardHeaders: true,
legacyHeaders: false,
}));

/* ---------- Root check ---------- */
app.get('/', (_req, res) => {
res.type('text').send('Steam proxy running');
});

/* ---------- Helper: fetch JSON from Steam ---------- */
async function fetchJSON(url) {
const r = await fetch(url);
if (!r.ok) {
const txt = await r.text().catch(() => '');
throw new Error(`Steam error ${r.status}: ${txt}`);
}
return r.json();
}

/* ---------- GET /steam/profile?steamid=64bit ---------- */
app.get('/steam/profile', async (req, res) => {
try {
const { steamid } = req.query;
if (!steamid) return res.status(400).json({ error: 'Missing ?steamid' });

const url = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/');
url.searchParams.set('key', KEY);
url.searchParams.set('steamids', steamid);

const data = await fetchJSON(url);
res.json(data);
} catch (e) {
console.error(e);
res.status(502).json({ error: 'Proxy error' });
}
});

/* ---------- GET /steam/owned-games?steamid=64bit ---------- */
app.get('/steam/owned-games', async (req, res) => {
try {
const { steamid } = req.query;
if (!steamid) return res.status(400).json({ error: 'Missing ?steamid' });

const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/');
url.searchParams.set('key', KEY);
url.searchParams.set('steamid', steamid);
url.searchParams.set('include_appinfo', 'true');
url.searchParams.set('include_played_free_games', 'true');

const data = await fetchJSON(url);
res.json(data);
} catch (e) {
console.error(e);
res.status(502).json({ error: 'Proxy error' });
}
});

/* ---------- GET /steam/resolve?v=<vanity or full profile URL> ---------- */
/* Accepts: ?v=jeremiahburnett501 OR a full profile URL:
https://steamcommunity.com/id/jeremiahburnett501
https://steamcommunity.com/profiles/7656119... */
app.get('/steam/resolve', async (req, res) => {
try {
let { v } = req.query;
if (!v) return res.status(400).json({ error: 'Missing ?v' });

// If a full Steam URL was pasted, extract the path segment
try {
const u = new URL(v);
const parts = u.pathname.split('/').filter(Boolean);
if (parts[0] === 'profiles' && parts[1]) {
// already a 64-bit steamid
return res.json({ response: { success: 1, steamid: parts[1] } });
}
if (parts[0] === 'id' && parts[1]) {
v = parts[1]; // vanity part
}
} catch {
/* not a URL; keep v as-is */
}

// Call Steam ResolveVanityURL
const url = new URL('https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/');
url.searchParams.set('key', KEY);
url.searchParams.set('vanityurl', v);

const data = await fetchJSON(url);
res.json(data);
} catch (e) {
console.error(e);
res.status(502).json({ error: 'Proxy error' });
}
});

/* ---------- Debug endpoints ---------- */
app.get('/hello', (_req, res) => {
res.type('text').send('hello from new deploy');
});

app.get('/ping', (_req, res) => {
res.json({ ok: true, now: new Date().toISOString() });
});

app.get('/routes', (_req, res) => {
const list = (app._router?.stack || [])
.filter(layer => layer.route)
.map(layer => ({
method: Object.keys(layer.route.methods)[0]?.toUpperCase(),
path: layer.route.path,
}));
res.json(list);
});

/* ---------- Start server (keep LAST) ---------- */
app.listen(PORT, () => {
console.log(`Steam proxy listening on http://localhost:${PORT}`);
});

