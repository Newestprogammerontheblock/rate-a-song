import express from "express";
import crypto from "crypto";
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url";
import spotifyPreviewFinder from "spotify-preview-finder"

dotenv.config()

const app = express();
app.use(express.json())

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')))

const PORT = process.env.PORT || 8080;
let responseType = "code"
let redirectURI = "https://rate-a-song.onrender.com/redirect"
let code_challenge_method = "S256"
let userToken = {}
const codeVerifiers = {}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get("/login", (req, res) => {
  
  const codeVerifier = crypto.randomBytes(64).toString("hex").slice(0, 64);
  
  const hash = crypto.createHash("sha256").update(codeVerifier).digest();
  const codeChallenge = hash
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
    const state = crypto.randomBytes(16).toString("hex");
    codeVerifiers[state] = codeVerifier;
    let code_challenge = codeChallenge

  const authUrl = new URL("https://accounts.spotify.com/authorize")
  authUrl.searchParams.set("client_id", process.env.SPOTIFY_CLIENT_ID)
  authUrl.searchParams.set("response_type", responseType)
  authUrl.searchParams.set("redirect_uri", redirectURI)
  authUrl.searchParams.set("code_challenge_method", code_challenge_method)
  authUrl.searchParams.set("code_challenge", code_challenge)
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("scope", "playlist-read-private playlist-modify-private playlist-read-collaborative")

  res.redirect(authUrl.toString())
});

app.get("/redirect", async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;

  const codeVerifier = codeVerifiers[state];

  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", redirectURI);
  params.append("client_id", process.env.SPOTIFY_CLIENT_ID);
  params.append("code_verifier", codeVerifier);

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });

    const data = await response.json();
    userToken[state] = {
      access_token: data.access_token,
      refresh_token: data.refresh_token
    }
    res.redirect(`/playlists.html?state=${state}`)


  } catch (err) {
    console.error(err);
    res.send("Something went wrong.");
  }
});

app.get("/api/playlists", async (req, res) => {
const state = req.query.state
const accessToken = userToken[state]?.access_token
if (!accessToken) return res.status(401).json({ error: "Missing or invalid state/token" });
const refreshToken = userToken[state]?.refresh_token
let getUserId = await fetch(`https://api.spotify.com/v1/me`, {
  headers: {"Authorization": `Bearer ${accessToken}`}
})
let data = await getUserId.json()
const userID = data.id


let getUserPlaylists = await fetch(`https://api.spotify.com/v1/me/playlists`, {
  headers: {"Authorization": `Bearer ${accessToken}`}
})
const playlistData = await getUserPlaylists.json()
const playlists = playlistData.items.map(item => ({
    id: item.id,
    name: item.name,
    image: item.images[0]?.url || null,
    description: item.description
}));
res.json(playlists)

})

app.get("/api/tracks", async (req, res) => {
const playlistId = req.query.playlistId
const state = req.query.state
const accessToken = userToken[state]?.access_token
let songData = []
try{
  const getTracks = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    })
  let tracks = await getTracks.json()

  const songNames = tracks.items
    .map(item => item.track?.name)
    .filter(Boolean)
    const songArtists = tracks.items
  .map(item => item.track?.artists.map(artist => artist.name).join(", "))
  .filter(Boolean)

  for(let i=0; i < songNames.length; i++){
    const name = songNames[i]
    const artists = songArtists[i]
    const playlistId = req.query.playlistId

        const result = await spotifyPreviewFinder(name, artists, 1, {
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET
        })
        
        if(result.success && result.results.length > 0){
          const firstResult = result.results[0]
          const allUrls = result.results.flatMap(song => song.previewUrls)
          const uniqueUrls = Array.from(new Set(allUrls))
          songData.push({
            name,
            artists,
            previewUrls: uniqueUrls,
            playlistId: playlistId,
            trackId: firstResult.trackId,
             uri: `spotify:track:${firstResult.trackId}`,
             rating: 0
          })
        }
  }
    res.json(songData)
}
catch(err){
  console.error("There was an erorr", err)
}
})

app.post("/api/submit-ratings", async (req, res) => {
  try {
    const state = req.query.state;
    const accessToken = userToken[state]?.access_token;

    if (!accessToken) {
      return res.status(401).json({ error: "No access token for this session" });
    }

    const { playlistId, ratings } = req.body;

    if (!ratings || !Array.isArray(ratings) || ratings.length === 0) {
      return res.status(400).json({ error: "No ratings provided" });
    }

    ratings.sort((a, b) => b.rating - a.rating);

    const sortedUris = ratings.map(r => r.uri);

    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: "PUT",
      headers:{
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ uris: sortedUris })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData });
    }

    console.log("Playlist reordered:", sortedUris);
    res.json({ success: true, sortedUris });

  } catch (err) {
    console.error("Error in submit-ratings:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => console.log(`Running on Port: ${PORT}`));