// server.js — Steam proxy on Render (CommonJS)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const KEY = process.env.STEAM_KEY;

// --- middleware
app.use(cors({
origin: [
'https://steam-frontend-gomv.onrender.com',
// 'http://localhost:3000', // enable if you test locally
],
}));
app.use(rateLimit({
windowMs: 60 * 1000,
max: 60,
standardHeaders: true,
legacyHeaders: false,
}));

// helper
const bad = (res, code, msg) => res.status(code).json({ error: msg });

// ---------- health / debug ----------
app.get('/', (_req, res) => res.type('text').send('Steam proxy running'));
app.get('/ping', (_req, res) => res.json({ ok: true, now: new Date().toISOString() }));
app.get('/routes', (_req, res) => {
const list = (app._router?.stack || [])
.filter(l => l.route)
.map(l => ({
method: Object.keys(l.route.methods)[0]?.toUpperCase(),
path: l.route.path
}));
res.json(list);
});

// ---------- STEAM endpoints ----------
app.get('/steam/profile', async (req, res) => {
try {
const { steamid } = req.query;
if (!steamid) return bad(res, 400, 'Missing ?steamid');

const url = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/');
url.searchParams.set('key', KEY);
url.searchParams.set('steamids', steamid);

const r = await fetch(url);
if (!r.ok) return bad(res, 502, `Steam error ${r.status}`);
res.json(await r.json());
} catch (e) { console.error(e); bad(res, 500, 'Proxy error'); }
});

app.get('/steam/owned-games', async (req, res) => {
try {
const { steamid } = req.query;
if (!steamid) return bad(res, 400, 'Missing ?steamid');

const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/');
url.searchParams.set('key', KEY);
url.searchParams.set('steamid', steamid);
url.searchParams.set('include_appinfo', 'true');
url.searchParams.set('include_played_free_games', 'true');

const r = await fetch(url);
if (!r.ok) return bad(res, 502, `Steam error ${r.status}`);
res.json(await r.json());
} catch (e) { console.error(e); bad(res, 500, 'Proxy error'); }
});

app.get('/steam/resolve', async (req, res) => {
try {
let { v } = req.query;
if (!v) return bad(res, 400, 'Missing ?v');

// If user pasted a full profile URL, extract tail
try {
const u = new URL(v);
const parts = u.pathname.split('/').filter(Boolean);
if ((parts[0] === 'id' || parts[0] === 'profiles') && parts[1]) {
if (parts[0] === 'profiles') {
return res.json({ response: { success: 1, steamid: parts[1] } });
}
v = parts[1];
}
} catch { /* not a URL; keep as text */ }

const url = new URL('https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/');
url.searchParams.set('key', KEY);
url.searchParams.set('vanityurl', v);

const r = await fetch(url);
if (!r.ok) return bad(res, 502, `Steam error ${r.status}`);
res.json(await r.json());
} catch (e) { console.error(e); bad(res, 500, 'Proxy error'); }
});

// start last
app.listen(PORT, () => console.log(`Steam proxy listening on http://localhost:${PORT}`));


