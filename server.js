require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Allow your frontend to call this proxy
app.use(cors({
origin: 'https://steam-frontend-gomv.onrender.com'
}));

const PORT = process.env.PORT || 10000;
const KEY = process.env.STEAM_KEY;

// -------- Health/Debug --------

// quick “is live?” check
app.get('/ping', (_req, res) => {
res.json({ ok: true, now: new Date().toISOString() });
});

// see what routes are really registered
app.get('/routes', (_req, res) => {
const list = (app._router?.stack || [])
.filter(layer => layer.route)
.map(layer => ({
method: Object.keys(layer.route.methods)[0]?.toUpperCase(),
path: layer.route.path,
}));
res.json(list);
});

// -------- Steam API proxies --------

// profile summary
app.get('/steam/profile', async (req, res) => {
const { steamid } = req.query;
if (!steamid) return res.status(400).json({ error: 'Missing ?steamid' });
try {
const url = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/');
url.searchParams.set('key', KEY);
url.searchParams.set('steamids', steamid);
const r = await fetch(url);
const data = await r.json();
res.json(data);
} catch (e) { console.error(e); res.status(500).json({ error: 'Proxy error' }); }
});

// owned games
app.get('/steam/owned-games', async (req, res) => {
const { steamid } = req.query;
if (!steamid) return res.status(400).json({ error: 'Missing ?steamid' });
try {
const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/');
url.searchParams.set('key', KEY);
url.searchParams.set('steamid', steamid);
url.searchParams.set('include_appinfo', 'true');
url.searchParams.set('include_played_free_games', 'true');
const r = await fetch(url);
const data = await r.json();
res.json(data);
} catch (e) { console.error(e); res.status(500).json({ error: 'Proxy error' }); }
});

// vanity → steamid
app.get('/steam/resolve', async (req, res) => {
let { v } = req.query;
if (!v) return res.status(400).json({ error: 'Missing ?v' });

// If they pasted a full URL, extract the useful part
try {
const u = new URL(v);
const parts = u.pathname.split('/').filter(Boolean);
// /profiles/<steamid64>
if (parts[0] === 'profiles' && parts[1]) {
return res.json({ response: { success: 1, steamid: parts[1] } });
}
// /id/<vanity>
if (parts[0] === 'id' && parts[1]) v = parts[1];
} catch { /* not a URL; keep as-is */ }

try {
const url = new URL('https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/');
url.searchParams.set('key', KEY);
url.searchParams.set('vanityurl', v);
const r = await fetch(url);
const data = await r.json();
res.json(data);
} catch (e) { console.error(e); res.status(500).json({ error: 'Proxy error' }); }
});

// start server (keep last)
app.listen(PORT, () => {
console.log(`Steam proxy listening on http://localhost:${PORT}`);
});


