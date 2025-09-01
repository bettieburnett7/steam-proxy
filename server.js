require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

/* --- CORS: allow your frontend --- */
app.use(cors({
origin: ['https://steam-frontend-gomv.onrender.com'],
}));

/* --- Rate limiting --- */
app.use(rateLimit({
windowMs: 60 * 1000, // 1 minute
limit: 60, // max 60 requests/min
}));

/* --- Simple request logger --- */
app.use((req, _res, next) => { console.log(req.method, req.url); next(); });

/* --- Config --- */
const PORT = process.env.PORT || 3000;
const KEY = process.env.STEAM_KEY;

/* Root route */
app.get('/', (_req, res) => {
res.type('text').send('Steam proxy running');
});

/* Hello check (quick test) */
app.get('/hello', (_req, res) => {
res.type('text').send('hello from new deploy');
});

/* ================== STEAM API ROUTES ================== */

/* Profile summary */
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

/* Owned games */
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

/* Resolve vanity/profile URL to steamid */
app.get('/steam/resolve', async (req, res) => {
try {
let { v: vanity } = req.query;
if (!vanity) return res.status(400).json({ error: 'Missing ?v' });

// If it's a full URL, extract ID or custom name
try {
const u = new URL(vanity);
const parts = u.pathname.split('/').filter(Boolean);
if (parts[0] === 'profiles' && parts[1]) {
return res.json({ response: { success: 1, steamid: parts[1] } });
}
if (parts[0] === 'id' && parts[1]) {
vanity = parts[1];
}
} catch { /* Not a URL, keep as text */ }

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

/* ================== DEBUG ROUTES ================== */

/* Ping: proves service works */
app.get('/ping', (_req, res) => {
res.json({ ok: true, now: new Date().toISOString() });
});

/* Routes: lists all registered endpoints */
app.get('/routes', (_req, res) => {
const list = (app._router?.stack || [])
.filter(l => l.route && l.route.methods && l.route.methods.get)
.map(l => ({ method: 'GET', path: l.route.path }));
res.json(list);
});

/* Catch 404 errors */
app.use((req, res) => {
res.status(404).json({ error: 'No route matched', path: req.originalUrl });
});

/* Start server */
app.listen(PORT, () => {
console.log(`Steam proxy listening on http://localhost:${PORT}`);
});

