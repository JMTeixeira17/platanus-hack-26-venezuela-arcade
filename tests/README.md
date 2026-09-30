# Tests

Standalone Node scripts (no dependencies). They load the real `game.js` with a fake DOM, so they are not part of the submission.

| Command | What it checks |
|---|---|
| `node tests/collision.test.cjs` | Player vs vehicle collision matches the sprites (14 cases) |
| `node tests/touch.test.cjs` | Touch controls map to arcade codes, START button outside play (also on the intro), stuck touches recover; cabinet unaffected (23 cases) |
| `node tests/gameplay.test.cjs` | El paco (the cop) can be escaped by skill: capped top speed, a bigger wheelie boost during the chase, your lane changes reset his catch and his lane changes cost him speed (zigzag), riding straight still gets you caught, 9 s give-up, grua escape, EL PACO wording; squeezing through a jam only when slow; cola spawn never deletes what is on screen; choque cola (about 40%): one free lane, wreck closes two lanes and their canals, CHOQUE! + BUSCA EL CARRIL LIBRE; no pickups while airborne; no autopilot left; estampita blessing (ghost below the HUD, soft amen), anis text fits the screen; leaving the ranking screen does not freeze the game; night story: night sky with stars (no day colours), lit and dark windows, darker but readable road, CASA DE LA CHAMITA as the last stretch, WILKERSON SE LA LLEVO on time-out, LA RECOGISTE! A RUMBEAR! on arrival, NOCHE N instead of DIA, rider-select line, la chamita only after arriving (not before, not on crash or time-out), jumping with VAMOS A RUMBEAR! and inside the screen, no office wording left (59 cases) |
| `node tests/title.test.cjs` | Static title (same drawing at any time, only the START prompt blinks; no demo drawn or simulated behind it): MOTO PIRUETAS on a yellow band, subtitle, hero at 2x, ranking (5 rows) and controls together, nothing on the START row, PLATANUS HACK 26 footer with a banana; hero sprite decodes to its declared size with palette keys only and a free border; game name; PLATANUS HACK 2026 intro with the Venezuelan flag (8-star arc) on black, auto-advance at ~2.5 s, START / button 1 skip after 0.3 s, not shown on the next day (32 cases) |
| `node tests/measure-sprites.cjs` | Prints sprite pixel bounds vs hit bands |

The AI autopilot (and with it `ai-smoke.cjs` and `baseline-game.js`) was removed from the game; both files remain in git history.
