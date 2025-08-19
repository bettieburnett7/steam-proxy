require('dotenv').config();

const express = require('express');

const cors = require('cors');


// Node 18+ has fetch built-in (no need for node-fetch)

const app = express();

app.use(cors());


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


app.listen(PORT, () => console.log(`Steam proxy listening on http://localhost:${PORT}`));

