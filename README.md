# Hanger Logic

Photograph each garment you own. The app reads its colours, and scores every
combination it can make out of your wardrobe on colour relationship,
dressiness, depth, pattern and season.

A single static page — no build step, no server, no account. Everything you add
lives in IndexedDB on the device that added it.

## Running it

Any static host works. Locally:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. Service workers and the camera need HTTPS (or
localhost), so a `file://` open will not give you the installable app.

### On an iPhone

Open the deployed URL in Safari, tap Share, then **Add to Home Screen**. It
launches full screen with no browser chrome.

## Connecting Claude (optional)

Without a key the app reads garment colours on the device and you pick the cut,
dressiness and season from a form. Every outfit is still scored — the pairing
engine is local arithmetic and never calls anything.

With a key, a photo becomes a catalogued garment on its own, and outfits can ask
for written styling notes. Add it under **Settings → Anthropic API key**.

The key is kept in that browser's `localStorage`, on that device. It is not in
this repository, not in the served HTML, and it is sent only to
`api.anthropic.com`. Anyone else loading the page sees an empty field and gets
the manual form. If you ever want to share the app without handing out a key,
move the call behind a small proxy (a Cloudflare Worker will do) and point
`getClient()` at it instead.

Requests use `claude-opus-5` at `effort: "low"` — roughly two cents per garment.

## How the scoring works

Every pair of pieces is scored out of 100:

| Component | Max | What it measures |
|---|---|---|
| Colour | 45 | The relationship between the two hues on the wheel |
| Dressiness | 25 | How far apart the pieces sit on a 1–5 formality scale |
| Depth | 10 | Light-to-dark separation, so the silhouette reads |
| Pattern | 10 | Solid against patterned, and how loud each one is |
| Season | 10 | Whether the two belong to the same part of the year |

"Neutral" is used in the clothing sense, not the pigment sense: navy, denim,
camel, olive and charcoal are treated as neutrals because that is how they
behave on a body. Two saturated hues 48–88° apart score badly on purpose — that
is the interval the eye reads as a mistake rather than a choice.

An outfit's score is the mean of its pairs, adjusted for how many colours are
competing and whether the pieces agree on how dressed up they are.

## Files

| Path | |
|---|---|
| `index.html` | The whole app — styles, engine, UI |
| `sw.js` | Offline shell cache. Bump `CACHE` on each deploy |
| `manifest.webmanifest` | Home-screen metadata |
| `tools/make-icons.mjs` | Regenerates the icons: `node tools/make-icons.mjs` |

## Backups

Everything is local, so losing the device loses the wardrobe. **Settings →
Export** writes one JSON file containing every piece and every photo; **Import**
merges one back in.
