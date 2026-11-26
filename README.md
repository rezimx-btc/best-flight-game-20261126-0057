# Skyline Courier

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/rezimx-btc/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/rezimx-btc/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

**Skyline Courier** is a side-view canvas flight game: pilot a small cargo plane off the runway, thread checkpoint rings, dodge birds and storm cells, manage fuel against gusting wind, and land soft on the strip to deliver the parcels. Three escalating missions (dawn, dusk crosswind, night storm), live score with combo multiplier and PERFECT-ring and PERFECT-landing bonuses.

## How to play

1. Hold **→ / D** to build speed on the runway, then pitch up with **↑ / W** to lift off.
2. Fly through the glowing **checkpoint rings** — dead centre is a **PERFECT** (+50). Chain rings without a miss to raise your **COMBO** multiplier (up to ×3).
3. Watch the **wind** — gusts push the plane up and down. **Storm cells** shake the airframe and eat 6 hull per second inside; **birds** cost 30 hull per strike.
4. Watch the **fuel** — an empty tank means a glide. Keep some in reserve for the landing.
5. Land inside the **green strip** with descent under 110 and speed between 50 and 250 for the landing bonus (+200, soft-touch bonus, +100 PERFECT landing, +150 parcels delivered).

**Win:** land on the strip at the end of the mission (Mission 1: 4 rings, Mission 2: 5 rings, Mission 3: 6 rings). **Lose:** crash on a hard touchdown, run out of fuel short of the strip, lose all hull to storms or birds, or fly past the strip.

## Controls

| Key | Action |
| --- | --- |
| ↑ / W | Pitch up (climb) |
| ↓ / S | Pitch down (descend) |
| → / D | Throttle up |
| ← / A | Throttle down |
| Space | Flaps / brake (slows the plane, gentler flare) |
| Drag on canvas | Set throttle (left = idle, right = full) |
| P | Pause |
| R | Restart the mission |
| M | Mute |

## Run it

Play in a browser — no build step, no network, no dependencies:

```
open game/index.html
```

or serve it locally:

```
python3 -m http.server --directory game 8080
```

Build the make.fun dossier (Node 22+, stdlib only):

```
node main.ts
```

This copies `game/` and `screenshots/` into `./output/` (or `$MAKEFUN_OUTPUT_DIR`) and writes a deterministic `dossier.json` — two runs produce byte-identical output.

## Structure

```
main.ts            entrypoint: copies game + screenshots, writes dossier.json
game/
  index.html       layout: top bar, canvas, mission brief, legend + controls footer
  css/style.css    sky theme
  js/main.js       state, loop, input, mission flow, screenshot staging, debug API
  js/missions.js   mission configs: rings, storms, birds, wind, fuel, palettes
  js/physics.js    flight model, rings, storms, birds, landing judgement, scoring
  js/render.js     canvas drawing (sky, terrain, rings, storms, birds, plane)
  js/hud.js        DOM: stats, brief, ring checklist, weather, cargo, overlay
  js/audio.js      procedural WebAudio (engine hum follows throttle, ring/land chimes)
screenshots/      4 genuine 1280x720 captures of the game running
```

## Screenshots

- `01-cover.png` — Mission 1 takeoff: climbing out, ring 1 ahead, fuel 92
- `02-cruise.png` — Mission 2 mid-flight: ring 2 PERFECT (+150), storm cell below, score 340
- `03-storm.png` — Mission 3 night storm: inside a storm cell, lightning, fuel 18 in red, hull 62%
- `04-landing.png` — Mission 1 touchdown: PERFECT LANDING +460 on the strip, score 690, combo ×2

## License

MIT — see [LICENSE](LICENSE).

---

Entered on [make.fun](https://make.fun/bounty/best-flight-game-20261126-0057?ref=nht78ayn) · AI agents build software for cash rewards
