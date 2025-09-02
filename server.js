// server.js — Steam proxy (Render)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const KEY = process.env.STEAM_KEY;

// --- middleware ---
app.use(cors({
origin: [
'https://steam-frontend-gomv.onrender.com', // your frontend
],
}));
app.use(rateLimit({
windowMs: 60 * 1000, // 1 minute
max: 60, // 60 req/min per IP
standardHeaders: true,
legacyHeaders: false,
}));

function bad(res, code, msg) { return res.status(code).json({ error: msg }); }

// Root: quick alive check
app.get('/', (_req, res) => { res.type('text').send('Steam proxy running'); });

// ---------- STEAM API ROUTES ----------
app.get('/steam/profile', async (req, res) => {
try {
const { steamid } = req.query;
if (!steamid) return bad(res, 400, 'Missing ?steamid');

const u = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/');
u.searchParams.set('key', KEY);
u.searchParams.set('steamids', steamid);

const r = await fetch(u);
if (!r.ok) return bad(res, 502, `Steam error ${r.status}`);
const data = await r.json();
return res.json(data);
} catch (e) {
console.error(e);
return bad(res, 500, 'Proxy error');
}
});

app.get('/steam/owned-games', async (req, res) => {
try {
const { steamid } = req.query;
if (!steamid) return bad(res, 400, 'Missing ?steamid');

const u = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/');
u.searchParams.set('key', KEY);
u.searchParams.set('steamid', steamid);
u.searchParams.set('include_appinfo', 'true');
u.searchParams.set('include_played_free_games', 'true');

const r = await fetch(u);
if (!r.ok) return bad(res, 502, `Steam error ${r.status}`);
const data = await r.json();
return res.json(data);
} catch (e) {
console.error(e);
return bad(res, 500, 'Proxy error');
}
});

// Resolve vanity or full profile URL to a 64-bit steamid
app.get('/steam/resolve', async (req, res) => {
try {
let { v } = req.query;
if (!v) return bad(res, 400, 'Missing ?v');

// if a full profile URL, extract the tail
try {
const nu = new URL(v);
const parts = nu.pathname.split('/').filter(Boolean);
if (parts[0] === 'profiles' && parts[1]) {
return res.json({ response: { success: 1, steamid: parts[1] } });
}
if (parts[0] === 'id' && parts[1]) v = parts[1];
} catch { /* not a URL; treat as text */ }

const u = new URL('https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/');
u.searchParams.set('key', KEY);
u.searchParams.set('vanityurl', v);

const r = await fetch(u);
if (!r.ok) return bad(res, 502, `Steam error ${r.status}`);
const data = await r.json();
return res.json(data);
} catch (e) {
console.error(e);
return bad(res, 500, 'Proxy error');
}
});

// ---------- DEBUG / HEALTH ----------
app.get('/ping', (_req, res) => {
res.json({ ok: true, now: new Date().toISOString() });
});

app.get('/routes', (_req, res) => {
const list = (app._router?.stack || [])
.filter(l => l.route)
.map(l => ({
method: Object.keys(l.route.methods)[0]?.toUpperCase(),
path: l.route.path,
}));
res.json(list);
});

// keep LAST
app.listen(PORT, () => {
console.log(`Steam proxy listening on http://localhost:${PORT}`);
});


