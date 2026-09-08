# The Wandering Keep

A playable 3D incremental game about building a settlement on the back of Morrow, a six-legged stone guardian. This implements the first chapter of the Walking Castle PRD with procedural art and a compact economy.

[Play The Wandering Keep](https://the-wandering-keep.vercel.app) · [Source on GitHub](https://github.com/Kiril-P/the-wandering-keep)

## Hosting

Hosted on Vercel as a static Vite application. `vercel.json` uses `npm ci`, `npm run build`, and the `dist` output directory. No server, database, or application secrets are required. Progress saves in each player's browser; local development and the hosted site have separate storage.

To publish updates from a linked checkout, run `npx vercel deploy --prod`. The initial release uses CLI deployment. Automatic deployment from GitHub pushes requires connecting the repository in Vercel after linking the GitHub login to the Vercel account.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` checks TypeScript and builds `dist/`. `npm run preview` serves that build. `npm test` runs the economy and progression checks, including a complete simulated journey.

## Your first chapter

1. Gather 20 stone from highlighted roadside outcrops and place a Quarry Tower.
2. Add a Moss Garden for essence and a Rune Forge for runestones.
3. Upgrade producers and the Central Keep. Forges use 4 stone and 3 essence per runestone, so watch the net production rates.
4. Unfold the east and west wings to grow from three to nine construction pads.
5. Add Watchtowers for a capped production bonus. Awaken Morrow for faster travel.
6. Reach the Moonlit Highlands and light the Crown Beacon. Continue building after the celebration.

A simulated strategy using manual gathering only for the first tower reaches the beacon in approximately 19.6 minutes at 1× pace. Your timing depends on purchases and gathering. Balance is centralized in `src/balance.ts`.

## Controls

- Click marked outcrops, use the Gather button, or press E to collect stone.
- Open Build, choose a building, then click a glowing pad or its numbered placement button. Escape cancels without spending.
- Click a building to inspect, upgrade, or remove it. Removal refunds 60% of all construction and upgrade costs.
- Click the Central Keep for platform, Keep, creature, and beacon upgrades. The Keep button opens this panel at any screen size; close it when finished.
- Drag/swipe to orbit; scroll/pinch to zoom. R restores the camera.
- Space pauses the journey; Menu → Settings changes pace through 1×, 1.5×, and 0.5× simulation speed.
- H hides/restores the interface. V opens a wider scenic view and returns to your previous camera. Menu → Settings → Light lets the lighting follow the journey or stay at evening, night, or dawn.
- Menu contains Settings, How to play, and Journey. The compact Next link opens your current objective and route details.
- A welcome screen introduces the basic loop once. Replay it from Menu → How to play. Settings includes reduced motion and a reset action with confirmation.

Resources, buildings, upgrades, outcrops, distance, expansions, and beacon state save locally after actions and periodically. Hidden/closed tabs earn no offline progress. The normal game and developer sandbox use separate save keys.

## Code map

| File | Responsibility |
| --- | --- |
| `src/balance.ts` | Costs, recipes, output rates, unlocks, regions, and pad positions |
| `src/game.ts` | Pure simulation, actions, validation, serialization, progression |
| `src/game-ui.ts` | Resource bar, objectives, build menu, inspector, dialogs |
| `src/settlement.ts` | Production models, visual upgrades, placement previews, platforms, beacon |
| `src/creature.ts` | Guardian geometry, planted-foot gait, attachment hierarchy |
| `src/castle.ts` | Detailed Central Keep and pennant |
| `src/keep-tower.ts` | Grand Tower and oversized Skycastle upgrade geometry |
| `src/selection.ts` | Forgiving interaction volumes and occlusion-aware picking |
| `src/environment.ts`, `src/lighting.ts` | Slow day cycle, weather fronts, sky palette, and illumination |
| `src/world.ts` | Bounded route streaming and scenery integration |
| `src/world/` | Shared terrain sampler, fractured geology, varied vegetation, water, wildlife, landmarks, and atmosphere |
| `src/main.ts` | Fixed-step loop, rendering, picking, effects, and persistence |
| `src/audio/` | Original musical score, synthesis, environmental layers, interaction cues, and audio lifecycle |

Models, terrain, effects, and materials are generated locally. Optional Google Fonts have system fallbacks. No paid service is required.

## Developer verification

`npm test` covers purchases and occupied/locked pads, refunds, conversion conservation and starvation, timestep agreement, unlocks, bonus caps, save validation/restoration, and a complete new-game-to-beacon strategy. This does not substitute for visual browser inspection.

During development only, `?sandbox=1` uses an isolated save. Add `&testSpeed=60` for accelerated end-to-end testing. `&scenario=settlement` or `&scenario=beacon` starts an advanced fixture; remove the scenario parameter to check restoration from the sandbox save. These hooks are disabled in production builds.

Keep upgrades replace the main tower silhouette: level 2 adds the broad Grand Tower, and level 3 raises the top-heavy Skycastle with three upper storeys, balconies, a clock, satellite turrets, and an oversized roof. The default camera eases outward and upward with each stage. Developer fixtures `scenario=keep1` and `scenario=keep2` supply resources to try the purchases; `scenario=full-valley` shows the final tower with all nine buildings.

The journey now has a 24-minute day at normal pace, extended golden evenings, cool dawn mist, and warm windows at night. Ten-minute weather fronts bring drifting mist, cloud cover, a passing shower, and gradual clearing. Exposed stone and roofs stay darker and smoother while drying. Rain sound follows the shower; reduced motion hides rain streaks and splashes. Menu → Settings → Light cycles through Journey, Golden evening, Night, and Dawn for a session lighting override. Weather continues independently of that override; both clocks rest with the journey.

Small buildings use stable selection volumes with bounded pixel forgiveness and warm hover feedback. Decorations are excluded from their targets. Resource details distinguish stopped production from limited supply, name missing inputs, and report actual output alongside capacity. The existing resource bar gives a compact supply hint, and gathering briefly lights the stone counter.

Additional developer fixtures: `scenario=starved` demonstrates two forges without essence. In the sandbox, `environmentTime=265` previews rain, `475` golden evening, `835` a rainy night, and `1325` dawn. `environmentSpeed=60` accelerates only the atmospheric timeline for transition inspection. These parameters are unavailable in production.

Morrow now leaves fading, route-anchored footprints. Landings lift soft dust, occasionally roll small stones outward, and press nearby verge grass away from his feet. Rain suppresses dust. These effects use fixed-size pools, and reduced motion removes dust, pebble motion, and reactive grass movement.

The road alternates sheltered groves, flowered meadows, and open overlooks. Tree density and bank relief blend across long stretches independently of the regional palette. Swallows lift from grove perches as Morrow approaches; roadside deer watch, turn, and retreat; nearby butterflies scatter outward. At night, occasional fireflies gather around Morrow before dispersing, and sparse moonflower patches open and glow. Encounters have no rewards, alerts, or extra HUD.

Living-landscape fixtures: `scenario=woodland`, `scenario=overlook`, and `scenario=encounters&environmentTime=1150`. Add `routeDistance=110` to the full-valley fixture to inspect all nine buildings in the woods. All fixture parameters require `sandbox=1` and development mode.

This remains an iteration demo: there is one handcrafted creature, a small building catalog, three region treatments, and one completion milestone. Combat, offline earnings, prestige, and additional chapters are outside this version.

## Landscape

The route now crosses a terraced waterfall valley, sandstone canyon, and moonlit highlands. Rivers, aqueduct ruins, natural arches, an observatory, and a summit sanctuary are generated in stable route coordinates. Upcoming regions appear spatially before the current region changes. Vegetation, cloud shadows, birds, water, mist, stars, and aurora provide motion and atmosphere; reduced motion freezes decorative animation.

Press **V** or Menu → Settings → Scenic view to see the landscape without the game panels. Press V again to restore your previous camera. Smaller screens use a lower pixel-ratio cap, fewer plants, and smaller shadow maps when loaded.

The route maintains nine surrounding sections and releases sections that leave the visible range. Automated checks cover terrain and color seams, the level foot-contact corridor, section bounds, and deterministic regeneration. Developer fixtures `scenario=green`, `scenario=canyon`, `scenario=highlands`, and `scenario=full-valley` (all with `sandbox=1`) allow visual inspection; the last includes all nine buildings. The normal game save is separate.

Rock outcrops use seeded fractured geometry, broad buttresses, fins, and fallen shards. Four tree families form groves and clearings; grass, ferns, and flowers grow in patches. Waterfalls project over cliff lips with curved cross-sections, rounded streams, spray, and widening foam mouths that merge into the river. Articulated bird flocks alternate flapping and gliding; butterflies cross the meadows and fireflies appear under night lighting.

Terrain and water share a continuous river profile with asymmetric banks, channels roughly 6–18 metres wide, deeper pools, wet margins, and beach shelves. River surfaces extend beneath the banks; sampled depth controls shallow/deep color. Reeds and bank stones use the rendered terrain surface, as does waterfall runoff. The level walking corridor remains intact, with a narrower worn path through the grass.

The water uses animated procedural shading and an approximate sky reflection. This version does not use expensive planar reflections or screen-space bloom. An original procedural soundtrack and ambient soundscape accompany the route; see Sound & atmosphere below.

### Meet Morrow

Press **C** or Menu → Settings → Meet Morrow to move closer to Morrow; press C again to return to your previous camera. The six-legged gait now includes toe flex and weight transfer, while a separate real-time clock drives breathing, glances, blinks, the cheek bell, and a connected five-segment tail. Gathering and construction prompt a small head perk. Pausing lowers raised feet into a supported idle pose while breathing continues. Reduced motion suppresses decorative sway and preserves travel.


## Sound & atmosphere

Sound begins with your first click/tap or gameplay key. Menu → Settings → Sound & atmosphere has a master mute and independent Music, Nature & atmosphere, and Footsteps & actions sliders. Volumes are saved separately from game progress, with an isolated namespace in the developer sandbox.

The original generative score uses slow extended chords, detuned sine pads, soft plucked harmonics, sparse flute phrases, stereo placement, and a diffuse reverb tail. Its phrase pattern leaves breathing room and shifts voicing in the highlands. Wind and water swell independently; canyon winds become stronger, while daytime bird phrases give way to softer night calls. The score follows the audio clock, so faster travel does not speed up the music.

Morrow's grouped footfalls follow the visible gait and soften with camera distance. Gathering has a stone tap; construction, upgrades, and the Crown Beacon have distinct harmonic gestures. Occasional harness chimes and working-forge taps add small details. Failed purchases do not play success cues. Pausing or opening Menu gently lowers music and nature, while travel/forge sounds stop. Hiding the tab fades and suspends audio; returning resumes the same soundscape. Everything is synthesized locally: no streaming service, audio downloads, or external soundtrack license is needed.

`npm test` includes audio preference and score checks. During development, open `/scripts/audio-check.html` and press Render and verify to render the actual graph in an OfflineAudioContext. This checks stereo output, finite samples, maximum-volume headroom, isolated channels, muted startup, paused footsteps, fade-to-mute, return after mute, and node cleanup. It also provides rendered previews for listening. This diagnostic page is excluded from the production build.
