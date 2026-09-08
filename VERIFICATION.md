# Playable chapter verification

Verified on 8 September 2026 in the Codex in-app browser.

- `npm test`: all seven economy/progression checks pass. A fresh-state strategy reaches the beacon in 19.55 simulated minutes at normal pace, gathering manually only for the first quarry.
- `npm run build`: TypeScript and production build pass. Vite reports its standard warning for the 592 KB main chunk (157 KB gzip).
- Browser: gathered from a 3D outcrop, cancelled placement without spending, placed a quarry on a 3D pad, built the production chain, upgraded buildings and Keep, expanded both wings, awakened Morrow, crossed the three regions, and activated the beacon.
- Persistence: buildings, resources, platform upgrades, and activated beacon restore after reload. Sandbox saves are isolated from the ordinary game.
- Crowded layout: all nine pads populated; upper-level buildings and dedicated beacon remain visible. Removing a building frees its pad and reports the 60% refund.
- Responsive interface: inspected at 390 × 844; settlement panel opens/closes, settings fit, reduced-motion checkbox works, reset cancellation preserves progress, and confirmed reset clears the sandbox.
- Completion: beacon is visible before the delayed chapter summary; summary shows journey time, distance, building count, and production. No browser warnings or errors in the final fixture check.

The nine-building desktop sample at 1280 × 720 recorded 8.33 ms average animation-frame interval, 383 draw calls, and 115,038 triangles. Rendering caps device pixel ratio at 1.65. This is one development-browser sample, not a cross-device performance guarantee; background-tab samples were slower.

The accelerated browser journey and seeded visual fixtures establish interaction and appearance. The separate deterministic simulation establishes the reported normal-speed completion time. Human playtesting is still needed to judge pacing and satisfaction.

## Movement and model fixes — 8 September 2026

The scene now presents the fractional time between economy ticks to the rig, scenery, machinery, and smoke. Gait cycles take 3.2 seconds instead of 4.8, with stride shortened proportionally so progression speed stays unchanged. The revised roof has a continuous deck and separate tiles, the chimney and its smoke socket are lowered together, and the Moss Garden has a stone-edged bed, supported upper shelf, cistern, and mounted irrigation wheel. Construction saddles now connect to the shell or wing deck.

Verified front and rear views with all nine pads occupied, including garden levels 1–3 and reloaded placement. A 1280 × 800 browser sample at pixel ratio 1 recorded 269 distinct leg poses across 269 active render frames, averaging 8.33 ms per frame (474 draw calls, 129,470 triangles). This checks that animation is no longer stepping at the economy's 10 Hz. No runtime errors were reported.

`npm test` also checks six-leg ground contact, joint reach, and travel-speed agreement at all three paces and both awakening levels. The seven economy/progression checks continue to pass. Production build passes.

## Rune Forge lookalike — 8 September 2026

Inspected the user's running scene and traced the Forge purchase through the scene graph. The ground objects were pre-existing roadside markers with pale stacked blocks and a chimney-like cap. Buying a Forge created exactly one elevated building and no new ground geometry. Replaced the misleading roadside silhouette with a single slanted, weathered waystone bearing a dark chevron.

Added a settlement lifecycle check covering Forge previews/cancellation, placement on all nine pads, all three levels, removal, and restoration. It checks building count, elevated geometry bounds, and unchanged ground-mesh ownership. The check passes before and after the art change: it establishes that this was a visual ambiguity, rather than evidence of a duplicate-purchase bug. Browser placement after the change showed the Forge on the platform and distinct roadside stones, with no console errors. All tests and production build pass.

## Scenery overhaul — 8 September 2026

Implemented a continuous ridge with asymmetric river valleys, terraced waterfalls and source pools, layered mountains, instanced vegetation, an aqueduct, sandstone arch/observatory, and highland sanctuary. Added animated water shading, wind, cloud shadows, mist, moon/stars/aurora, regional lighting transitions, and a scenic camera toggle that restores the previous camera. Scene generation now lives in focused modules under `src/world/`.

Browser inspection covered the three regions, a nine-building settlement, front and elevated/orbit views, desktop gameplay panels, and portrait/scenic composition at 390 × 844. Reworked the cliff silhouettes, removed vegetation/rock intersections along waterfalls, softened cloud textures, and added a readable objective backdrop after inspecting the actual renders. The walking corridor remains level and uses the same presentation-distance clock as scenery. No browser shader errors or runtime warnings appeared in the inspected scenes.

A final nine-building valley sample at 1440 × 900, pixel ratio 1, recorded 8.33 ms average frame interval, 557 draw calls, 987,582 triangles, 298 renderer geometries, and four textures. Portrait testing at 390 × 844 with nine buildings also recorded approximately 8.33 ms in this desktop browser. These are observed development-machine samples, not measurements on physical mobile hardware.

An accelerated traversal crossed all three regions and passed 1,100 metres with nine sections retained. Renderer geometry counts fluctuated around 299–309 rather than increasing on each section change; textures remained at four. The final asymmetry pass was then rechecked in the valley and through the automated route test.

`npm test` passes the seven economic/progression checks plus gait, Forge lifecycle, and world-generation checks. The world check exercises a 1,800-metre traversal, matching terrain heights/colors at section boundaries, a level foot-contact corridor, exactly nine live sections, finite geometry, and deterministic vegetation after regeneration. The production build passes; the existing large-bundle advisory remains.

Water reflections are approximated in the shader. Bloom and ambient audio were not added. The next art iteration can deepen erosion detail, more varied landmark arrangements, and richer water interaction without changing the game economy.

## Morrow creature refinement — 8 September 2026

Replaced the blunt, exposed tail tube with five tapered, articulated segments and overlapping armor. Rounded joints stay connected through the wave motion; the tail remains within the rear-leg corridor. Horns now taper to fine tips, and shell scutes have separated edges to avoid overlapping faces.

Added breathing in the body and underside, gentle weight transfer, delayed neck/head movement, eye glances, sweeping eyelids, a moving jaw, a swinging cheek bell, and articulated toes. Gathering and successful construction trigger a restrained head perk. The independent life clock continues while the journey is paused; raised feet blend down to a supported idle pose. Reduced motion suppresses decorative sway. The C / Meet Morrow view includes desktop and portrait framing and restores the prior camera on exit.

Automated motion checks cover every pace and awakening level, tail joint continuity/ground and leg clearance over 20 seconds, finite rig transforms, eyelid coverage, idle breathing, and joint reach across pause/resume blends at 40 gait phases. Planted-foot drift remains below 4e-15 metres and limb-length error below 2e-15 metres. Existing economy, settlement lifecycle, and terrain checks also pass.

Browser inspection covered the face, rear, opposite side, moving tail, open and closed eyes, walking and paused poses, reduced motion, and a nine-building settlement. Daylight and moonlit views both preserve the face, shell, and tail details. Inspected the creature camera at 1280 × 720 and 390 × 844, including returning to the controls. A populated desktop sample at pixel ratio 1.65 recorded 8.32 ms average frame interval, 626 draw calls, 1,196,672 triangles, 369 renderer geometries, and four textures. All 269 sampled active frames had distinct foot positions. No browser warnings or errors were reported. This is a development-desktop measurement, not a physical-mobile benchmark.

## Scenery variation, cascades, and wildlife — 8 September 2026

Replaced dense rows of repeated rounded cliff stones with seeded fractured formations: broad buttresses, narrow fins, low slabs, and fallen shards, separated by open shelves. The canyon arch now has rock abutments instead of stacked identical blocks; the sanctuary has a shaped foundation. Terrain shelf heights vary continuously along the route. Mountain profiles vary in breadth and lean, and their previously inward-facing side triangles and open summits are corrected.

Vegetation uses four tree silhouettes (broadleaf, slender, conifer, and spreading), grove/clearing placement, patchy grass, ferns, and clustered flowers. Birds have bodies, beaks, forked tails, articulated wings, flock spacing, banking, and alternating flap/glide periods. Added meadow butterflies and fireflies that fade in with night lighting. Populations are fixed and animation reuses objects.

Waterfalls now have curved cross-sections, projecting plunges at cliff lips, rounded streams, animated droplets and mist, broken foam ripples, and widening mouths that fade into the lower river. River surfaces have subtle displacement. Section cleanup disposes spray point geometry as well as meshes.

Visual checks covered the valley, canyon, highlands, an oblique river view, a fully populated platform, and portrait at 390 × 844. The final nine-building valley sample at 1280 × 720, pixel ratio 1.65, recorded 8.33 ms average frame interval, 666 draw calls, 482,984 triangles, 438 renderer geometries, and three textures. An accelerated traversal passed 4,600 metres with nine sections retained; after the region transition, sampled geometry counts stayed around 455–462 and textures at three. These are desktop-browser measurements, including the portrait emulation, rather than physical-phone benchmarks. No browser shader or runtime errors were reported.

`npm test` and `npm run build` pass. Added checks for deterministic rock variation, outward mountain faces, non-flat waterfall cross-sections, river-mouth endpoint agreement, fixed wildlife population, day/night firefly visibility, and reduced-motion integration. Existing terrain seam, route regeneration, economy, settlement, and creature tests continue to pass. The existing production bundle size advisory remains.

## Shared terrain and riverbanks — 8 September 2026

Implemented the plan in TERRAIN-RIVERBANK-PLAN.md. Water and terrain now use one continuous route-space river profile with unequal banks, wider pools, narrow reaches, bed depth, wet margins, and beach shelves. Sampled widths across the test route range from 5.65 to 18.38 metres. Water meshes overlap beneath dry banks; per-vertex depth distinguishes the shallows from the channel. Valley shoulders, cliff outlines, and shallow erosion channels vary through continuous noise. The worn road is narrower and irregular, while the entire creature contact corridor remains level.

Added clustered reeds, bank stones, and low shrubs. Vegetation placement and waterfall runoff use a sampler of the rendered terrain triangles. Visual inspection in the canyon exposed an outlet disappearing behind a bank even though the analytic height check passed. A test against rendered triangle heights reproduced that defect, then passed after the runoff clearance fix. River-mouth fading now begins at the sampled shoreline. Terrain normals are calculated in shared world coordinates so lighting also meets across section boundaries.

Automated checks cover wet/dry banks, submerged channel centers, width variation, river position/depth seams, buried water-mesh edges, runoff clearance, and agreement between the surface sampler and terrain raycasts. Existing terrain/color/normal seams, deterministic regeneration, wildlife, economy, settlement, and rig checks pass. The TypeScript/production build passes with the existing bundle-size advisory.

Browser checks covered the valley, canyon, highlands, an oblique view along both rivers, nine-building settlement, and portrait at 390 × 844. The full-valley sample during the pass at 1280 × 720, pixel ratio 1.65, recorded 8.33 ms average frame interval, 700 draw calls, and 744,700 triangles. After the rendered-surface fix, a seven-building highland sample recorded 8.33 ms, 576 draw calls, and 435,952 triangles. An accelerated traversal passed 3,120 metres with nine sections retained; later samples held around 456–466 renderer geometries and three textures. No shader/runtime errors were reported in the inspected scenes. These are development-desktop measurements, not physical-mobile benchmarks.

## Quiet HUD, welcome flow, and supported flag — 8 September 2026

The default interface now consists of resources, pause/Menu, one compact next-step link, and a Gather / Build / Keep dock. Construction and building details are mutually exclusive panels opened on demand. Escape cancels placement or closes the active panel and restores focus. Gathering gives a brief button response instead of a recurring text toast. Menu contains Settings, How to play, and Journey; production recipes, camera shortcuts, route details, reduced motion, and reset confirmation live there.

The introduction explains gather/build/grow once per storage namespace and can be replayed from How to play. Closing it preserves the current save. Game simulation already pauses for dialogs; the welcome uses that same path. The existing save schema is unchanged. Sandbox verification used its separate save namespace.

Replaced the two-piece flag support with one mast embedded in the turret roof. The emblem is now part of the animated cloth's vertex colors, so no independent ring can hover away from the flag. A regression check raycasts the consolidated roof and verifies mast penetration and pinned cloth vertices across animated castle poses.

Browser checks at 1280 × 720 and 390 × 844 covered introduction/replay, introduction dismissal across reload, the quiet HUD, construction tray, gathering 20 stone and buying a quarry, selected-building details, Keep details, placement cancellation, keyboard focus, Settings/How to play/Journey navigation, pace, reduced-motion persistence, reset cancellation, and scenic view/return. Front and reverse close views confirmed flag support in motion, including a nine-building settlement. Browser logs had no errors or warnings. A nine-building desktop sample reported 8.33 ms average frame interval, 700 draw calls, 746,518 triangles, and three textures at pixel ratio 1.65; this is a development-machine observation, not a physical-phone benchmark.

`npm test` passes, including the new flag attachment check. `npm run build` passes with the existing bundle-size advisory.

## Music and ambient soundscape — 8 September 2026

Added an original procedural Web Audio score: four extended chords with overlapping slow attacks/releases, detuned warm partials, sparse plucked motifs, occasional flute phrases, and a seeded stereo reverb. Phrase variation spans multiple chord cycles; highland voicings shift toward the relative minor. Music runs on the audio clock independently of journey speed.

Layered continuously filtered wind and water with independent slow swells, infrequent stereo bird/night phrases, gait-triggered footfalls, faint harness chimes, and occasional forge taps gated by available inputs. Gather, build, upgrade, selection, and beacon cues connect to successful game actions. Camera distance softens creature details. Menu/pause ducks the music and atmosphere and stops new travel/forge cues. Hidden tabs fade the master and suspend the audio context. First playback follows a user gesture. Hot reload/page lifecycle cleanup releases the graph; saved audio preferences do not alter the existing game save schema.

Menu exposes master mute and independent music, nature, and action volumes. Browser checks covered trusted-gesture startup, live slider changes, mute/unmute, persisted mute and a 35% music setting after reload, restoring defaults, gathering/pause, and a populated scene. Inspected the settings layout at 390 × 844, including the added close button. Browser warning/error logs were empty.

The development-only `/scripts/audio-check.html` renders the production synthesis graph using OfflineAudioContext. Nine scenarios pass: mixed journey, isolated music/nature/actions, all channels at maximum, muted startup, paused footsteps with other channels at zero, fade to mute, and return after mute. All rendered samples are finite. The sampled full-volume mix peaks at approximately 0.178 (about 15 dB below digital clipping); the default mix peaks at 0.084. Muted startup and isolated paused footsteps produce exact silence; the faded tail rounds to zero at six decimal places. Source population peaked at 86 in these renders, and disposal leaves zero tracked sources. These are signal and lifecycle checks; the final subjective mix should still be judged on the user's headphones/speakers.

The offline checks caught and fixed a brief startup leak from zero-volume channels. Gain buses now initialize at zero before fading to saved preferences. Pad envelopes and noise seams use continuous fades. Unmuting after a skipped phrase restarts music promptly rather than waiting for the next full phrase boundary.

`npm test` and `npm run build` pass. The existing bundle-size advisory remains. No sampled recordings or third-party audio assets were added.

## Available construction slots — 8 September 2026

Selecting a construction type now shows a gold fill, raised outline, and short translucent rim on every empty, unlocked slot. Markers sit above their wooden sockets instead of underneath the surface. The highlight geometry belongs to the slot's existing pick target, so its visible outline can also be clicked. Occupied and locked slots never highlight; placement, cancellation, and reset clear the treatment. Shared geometry/materials keep the additional placement-only drawing bounded.

Moved the temporary placement panel above the castle because its previous position covered the slots at the default camera. Browser inspection covered a developed settlement and placing a Rune Forge by clicking the highlighted outline directly. Settlement regression checks cover three/six/nine unlocked slots, occupied slots, full capacity, purchase/cancellation, and the fill height above each wooden socket. The settlement tests and production build pass (existing bundle-size advisory remains).

## Keep tower progression — 8 September 2026

Keep levels now select three distinct tower models. The Grand Tower has a wide upper hall and wraparound balcony; the Skycastle adds three windowed floors, two balconies, a clock, satellite turrets, and a large crooked roof on the narrow stem. Variants are created once, consolidated by material, and reused. The animated flag attaches to the active roof. Keep labels describe the new stages, and the default camera follows the growing silhouette on purchase and saved-state load.

Targeted vegetation adjustments lower shell tufts into Morrow's scutes and root garden stems inside their beds. No general clipping audit was performed.

Automated settlement checks verify one active variant per stage, cached reuse, increasing dimensions, and flag attachment through animated poses. Measured tower heights are 5.27, 10.56, and 16.52 units; widths are 1.88, 4.64, and 7.04 units. The full test suite passes. The production build passes with the existing bundle-size advisory.

Browser verification used the isolated sandbox: purchased both Keep upgrades through the UI, checked the camera transitions and inspector, then loaded the nine-building full-valley fixture. The final tower and attached flag fit at 1280 × 720 and 390 × 844. Browser error/warning logs were empty. Viewport settings were restored and the test tab closed; the normal save was untouched.

## Selection, production feedback, weather, and daylight — 8 September 2026

Buildings now expose stable selection volumes, with 9-pixel mouse and 13-pixel touch near-miss recovery. The foreground Keep still occludes rear targets; decorative meshes and hidden variants do not steal small-building picks. Hover adds a warm material wash and restores the original materials on exit. Placement and clicking use the same picker, while construction ghosts stay outside its targets.

Production feedback samples the next simulation tick using the same producer-first and shared-input order. It distinguishes waiting from limited throughput, names missing inputs, and displays actual output against capacity. Pausing shows zero rates and an explicit explanation. Gathering flashes the stone counter and existing button without adding a gathering toast.

The saved journey clock drives a 24-minute day and continuous weather fronts. Sky, directional/fill lighting, fog, window emission, clouds, stars, rain, and surface wetness respond together. Showers add a filtered rain sound layer and suppress bird calls. Stone retains wetness during clearing and then dries. Rain uses two bounded draw calls; reduced motion hides streaks/splashes and freezes drifting decorative layers. The session light override lives in Settings.

Automated checks cover exact agreement between displayed output and simulation, fractional/competing forge inputs, near-miss picking, hidden parents, foreground occlusion, continuous day/weather transitions, delayed drying, bounded rain buffers, pause/reduced-motion behavior, and weather cleanup. `npm test` and `npm run build` pass; the existing bundle-size advisory remains.

Browser checks covered a nine-building rainy valley, clearing golden light, rainy night with lit windows, and dawn. Selected a small Watchtower at normal tower zoom and a Rune Forge on desktop and at 390 × 844. In the starved fixture, a forge reported “Waiting for essence”; placing a Moss Garden through its highlighted 3D socket resumed output at 0.17 / 0.42 runestones per second and changed the explanation to “Limited by essence.” Pause and gathering feedback were checked in the same session. Settings light cycling works. The populated rainy scene at 1280 × 720, pixel ratio 1.65, recorded 8.33 ms average frame interval, 712 draw calls, and 757,244 triangles on the development desktop; this is not a physical-phone benchmark.

All eleven offline audio scenarios pass, including maximum rain (peak 0.282) and exactly silent muted rain. Source cleanup succeeds. Browser logs showed no shader/runtime errors during the inspected scenes. The normal game save was not used for test purchases.

## Morrow's footprint and a living journey — 8 September 2026

Actual gait contact transitions now trigger one ground imprint per landing. Prints retain route coordinates while the terrain scrolls, fade over 36 seconds, and share a 64-instance pool. Dust uses 144 particles and the occasional shifted pebble uses a 16-instance pool. Wetness suppresses dust; paused feet do not repeatedly emit. Verge grass reaches closer to the foot corridor and bends away from the six contact positions in its shared shader.

Continuous route masks blend between meadow, wooded passage, and overlook. Wooded banks gain near-road groves and canopy shadows; overlooks thin the tree population and lower the near-bank relief to open the valley view. The existing flat foot corridor, river surfaces, and section seams remain covered by the terrain tests.

Five reactive swallows use actual grove perch positions and lift as Morrow approaches. A roadside deer watches before turning away and retreating, with hoof positions sampled against rendered terrain. Nearby butterflies scatter upward and outward. A short firefly gathering can occur at night every 210 seconds, softened by rain, with long quiet gaps. Forty-eight moonflowers form occasional roadside patches and open through the existing night-lighting transition. Flower placement heights are cached per patch; geometry is reused.

The new living-landscape tests cover contact counting, print anchoring, pause, fixed pool sizes over a long run, reduced motion, route continuity, contrasting forest/overlook populations, deer retreat and grounded hooves, sparse firefly windows, and birds leaving perches. The full test suite and production build pass, with the existing bundle-size advisory.

Browser inspection covered the wooded passage, open golden overlook, night flowers/fireflies and deer, and the full nine-building Skycastle in woodland at 1280 × 720 and 390 × 844. The populated desktop sample recorded 8.33 ms average frame interval, 706 draw calls, 938,210 triangles, nine retained sections, and pixel ratio 1.65. These are development-machine observations, not a physical-phone benchmark. Inspected logs contained no shader/runtime warnings or errors. Test fixtures remained separate from the normal save.

### Interactive outcrop mining

- Four seeded outcrop families (granite, sandstone, slate, quartz), approximately 1.8–2.55 units tall, with stable selection proxies and six removable pieces.
- Hold an outcrop, aim at a golden seam, and release: tethered pick launches, impact exposes fractures and scatters chips, then the winch retrieves stone. Ordinary strikes award 2; seam strikes award 3. Gather/E targets the nearest passing outcrop. No timing penalty.
- Automated mining checks cover one award per flight, seam bonuses, cancellation, final-piece disposal, partial-damage save restoration, and distinct family bounds. Full test suite and production build pass.
- In-browser checks: early and upgraded Keep compositions, narrow and desktop layouts, pointer strike, keyboard strike, cable animation and chunk removal. No browser errors/warnings observed. Existing production bundle-size advisory remains.

### Deer refinement

- Reworked proportions, tapered muzzle, alert ears, forked antlers and narrower rump marking; animated head lowering, ear flicks and tail.
- Quiet encounters alternate slow wandering with grazing. Turns are rate-limited; retreat and wandering use trunk clearance from the actual vegetation placements, including safe spawn selection. Stance hooves retain landscape-space contact points.
- Full automated suite and production build pass. Added a 60-second dense-trunk wandering regression, plus reduced-motion stability. Browser inspected from close front/side and rear views; no runtime errors observed. `?sandbox=1&scenario=encounters&deerCamera=1` provides a development-only tracking view.
