require('dotenv').config();

const express = require('express');

const cors = require('cors');

const rateLimit = require('express-rate-limit')

// Node 18+ has fetch built-in (no need for node-fetch)

const app = express();

// Allow only your frontend to call this API
app.use(cors({
origin: 'https://steam-frontend-gomv.onrender.com'
}));

// Limit requests to prevent abuse
const limiter = rateLimit({
windowMs: 60 * 1000, // 1 minute
limit: 60, // max 60 requests per IP per minute
});
app.use(limiter);


const PORT = process.env.PORT || 3000;

const KEY  = process.env.STEAM_KEY;


app.get('/', (_req, res) => {

  res.send('Steam proxy running');

});


app.get('/steam/profile', async (req, res) => {

  try {

    const { steamid } = req.query;

    if (!steamid) return res.status(400).json({ error: 'Missing ?steamid=' });


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


app.get('/steam/owned-games', async (req, res) => {

  try {

    const { steamid } = req.query;

    if (!steamid) return res.status(400).json({ error: 'Missing ?steamid=' });


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

// Resolve a vanity name or profile URL to a 64-bit SteamID
app.get('/steam/resolve', async (req, res) => {
try {
let { vanity } = req.query;
if (!vanity) return res.status(400).json({ error: 'Missing ?vanity' });

// If a full Steam URL was pasted, extract the path segment
try {
const u = new URL(vanity);
const parts = u.pathname.split('/').filter(Boolean);
if (parts[0] === 'id' && parts[1]) vanity = parts[1]; // vanity path -> resolve below
if (parts[0] === 'profiles' && parts[1]) { // already a 64-bit steamid
return res.json({ response: { success: 1, steamid: parts[1] } });
}
} catch (_) { /* not a URL */ }

const url = new URL('https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/');
url.searchParams.set('key', KEY);
url.searchParams.set('vanityurl', vanity);

const r = await fetch(url);
if (!r.ok) return res.status(502).json({ error: `Steam error ${r.status}` });
const j = await r.json();
return res.json(j);
} catch (e) {
console.error(e);
res.status(500).json({ error: 'Proxy error' });
}
});

app.listen(PORT, () => console.log(`Steam proxy listening on http://localhost:${PORT}`));

