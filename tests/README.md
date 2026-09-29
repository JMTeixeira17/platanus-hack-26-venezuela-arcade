# Tests

Standalone Node scripts (no dependencies). They load the real `game.js` with a fake DOM, so they are not part of the submission.

| Command | What it checks |
|---|---|
| `node tests/collision.test.cjs` | Player vs vehicle collision matches the sprites (14 cases) |
| `node tests/touch.test.cjs` | Touch controls map to arcade codes, START button outside play, stuck touches recover; cabinet unaffected (22 cases) |
| `node tests/gameplay.test.cjs` | Fiscal can be escaped (speed, give-up time, blocked lane step resets the catch), squeezing through a jam only when slow, estampita blessing (ghost below the HUD, soft amen, silent in the demo), anis text fits the screen; leaving the ranking screen does not freeze the game (23 cases) |
| `node tests/ai-smoke.cjs [a.js b.js ...]` | Runs 200 AI demo games per file and prints distance and end causes (defaults to `game.js`) |
| `node tests/measure-sprites.cjs` | Prints sprite pixel bounds vs hit bands |

`baseline-game.js` is the `game.js` from before the collision and touch changes (the folder has no git history), useful as a rollback point and as a baseline for `ai-smoke.cjs`, e.g. `node tests/ai-smoke.cjs tests/baseline-game.js game.js`.
