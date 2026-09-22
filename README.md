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

If the key belongs to your organisation rather than to a single workspace,
also fill in **Workspace ID** — an unscoped key must name a workspace on every
request (`anthropic-workspace-id`), and without it the API returns a 400. A key
created inside a workspace carries that already and needs no ID.

The key is kept in that browser's `localStorage`, on that device. It is not in
this repository, not in the served HTML, and it is sent only to
`api.anthropic.com`. Anyone else loading the page sees an empty field and gets
the manual form. If you ever want to share the app without handing out a key,
move the call behind a small proxy (a Cloudflare Worker will do) and point
`getClient()` at it instead.

Requests use `claude-opus-5` at `effort: "low"` — roughly two cents per garment.

## Adding from a shop link

With a key connected, **Add → Add from a shop link** takes a product URL from
Zalando, AboutYou, Wehkamp or anywhere else. Claude's server-side web fetch
reads the page and returns the garment already catalogued — and because the
retailer states the colour, material and category outright, that data is
usually better than anything read off a photograph.

The browser itself cannot fetch another site (cross-origin requests to a shop
are blocked, and no amount of client-side code changes that), which is why this
path goes through Claude rather than through `fetch()`.

The product photo is hotlinked from the retailer's CDN, so it needs a
connection to display and will break if they remove it. Where the CDN permits
cross-origin reads the app keeps its own copy instead and samples the fabric
colours itself; most do not permit it, and then the shop's stated colour is
what gets used.

The fetch uses the basic `web_fetch_20250910` tool. Later versions add dynamic
filtering, which would cut the token cost of a large product page; content is
capped with `max_content_tokens` instead. Product metadata sits in the
document head, so truncation does not lose it.

Web fetch does not render JavaScript. Most retailers still server-render their
Open Graph and JSON-LD product metadata for search engines, which is where the
colour, title and image come from, so this usually works anyway.

Not every shop cooperates — some refuse anything that is not a browser. When
that happens the app says so, and saving the product photo and adding it as a
normal picture always works.

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
