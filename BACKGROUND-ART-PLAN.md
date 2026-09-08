# The Wandering Keep — background art plan

Status: implemented as the first procedural scenery pass on 8 September 2026. See README.md and VERIFICATION.md for controls, implementation details, and measured checks. Water uses an approximate reflection; bloom and ambient audio are deferred.

## Visual ambition

The landscape should be the reason someone stops scrolling to watch this game. Morrow is a small, warm home travelling through an ancient, enormous world. Aim for an animated storybook landscape with sculpted forms, rich natural materials, and cinematic light.

The first signature view: Morrow walks along a grassy ridge above a deep green valley. A river catches the sun far below. Three waterfalls descend through moss-covered cliffs; their mist gathers beneath a broken aqueduct. Beyond it, forested terraces lead to mountains that fade through several layers of blue haze. Wind moves through the near grass, and a flock passes in front of the distant falls.

The scene must already work as a still image before adding particles or camera effects. Its beauty comes first from landforms, scale, composition, and light.

## What needs to change

The current world uses a large flat plane, five repeating strips of scattered vegetation, low distant rock masses, and a small aqueduct. Regions mainly change colors and toggle a few props. The fog hides much of the horizon, and the camera spends a large part of the image looking at empty ground. These choices make the environment feel like a small set surrounding the creature.

Replace this with a continuous landscape organised into near detail, a middle-distance valley, large landmarks, distant mountain ranges, and sky. Keep scenery coherent when orbiting: hills and cliffs must have real backs and sides, and the opposite view must also contain a composed landscape.

## Composition and camera

- Start by tuning the default camera so Morrow occupies roughly 35–45% of the image height, leaving room for a readable horizon and a major landmark. Test the actual interface at the same time; the main waterfall must not sit behind an opaque inspector panel.
- Use the path, river, and cliff edges to guide the eye through the frame. Place the largest landmark away from the keep's roofline, so its silhouette remains legible.
- Create quiet areas of sky, mist, or distant water behind the castle and resource targets. Rich scenery should still allow a player to distinguish an empty pad from a building.
- Introduce a scenic view toggle with a wider camera and hidden interface. Orbit remains under player control; avoid automatic camera swings during building placement.
- Compose a separate portrait framing: a taller waterfall and mountain composition rather than a cropped version of the desktop panorama.

## Three distinct landscapes

| Region | Landscape and signature landmark | Light, color, and movement |
| --- | --- | --- |
| **The Green March** | Rolling ridges, terraced woodland, a winding river, stepped waterfalls, and a vast broken aqueduct crossing the valley. Wildflowers and wind-bent grass near the path. | Late afternoon amber sunlight, jade water, cool blue-green shadows, soft cloud shadows moving across distant slopes. |
| **Amber Canyon** | Eroded sandstone walls with visible strata, broad natural arches, a narrow oasis, and a ruined observatory carved into a distant mesa. Dry grasses replace lush vegetation. | Copper cliffs against a pale turquoise sky, warm reflected light, occasional dust ribbons and distant gliding birds. |
| **Moonlit Highlands** | Tall slate peaks rising above a low cloud sea, silver lakes, hanging gardens, and an ancient circular sanctuary on a far summit. Sparse crystal seams embedded in rock. | Indigo and silver with restrained mint light, moon reflections, drifting low cloud, and a slow, faint aurora above the highest peaks. |

Transitions should be spatial: the next region's geology appears on the horizon before the road enters it. Vegetation thins or changes in mixed transition stretches. Lighting and atmosphere blend with the crossing. Large features must not abruptly appear when a region index changes.

## Build order

### 1. Prove the waterfall-valley view

Build one deliberately composed Green March vista. Deliver sculpted valley terrain, a clear ridge route, three mountain depth layers, the large aqueduct silhouette, basic river and waterfall surfaces, and the revised camera/light setup. Use broad shapes initially. Inspect a still at gameplay size, portrait size, and from the opposite side.

**Gate:** the image has an unmistakable foreground, middle distance, and horizon; the valley feels far larger than Morrow; the waterfall and aqueduct are recognizable at normal zoom. Resolve weak composition here before producing more scenery.

### 2. Make the landscape feel alive

Add layered cliff faces, exposed rock edges, grassy shelves, branching trees with clustered canopies, flower patches, riverbanks, and selective ruin detail. Give waterfalls a broad flowing sheet, broken edge streams, foam at their bases, and restrained mist. The river needs changing surface normals, depth-dependent color, and convincing reflected light.

Use slow coherent wind across vegetation, drifting cloud shadows, sparse bird flocks, and occasional leaves. Keep particle density low. Anchor every waterfall to a visible source and receiving pool; attach every plant and ruin to an actual surface.

**Gate:** the view is convincing through motion and under alternate lighting, with no floating props, water seams, foliage shimmer, or excessive glow.

### 3. Turn the vista into a journey

Replace the obvious five-strip repetition with seeded route sections containing authored arrangements. Use several section types: open overlook, woodland passage, ruin approach, river bend, and cliff reveal. Alternate enclosed stretches with open views; a larger landmark should become visible, approach gradually, and recede over time.

Give distant features longer spatial lifetimes than nearby grass and rocks. Generate from stable route coordinates, pool sections, and recycle only outside the visible area. Preserve distinct scenery after save/load. Check a full uninterrupted journey, not only the first camera view.

**Gate:** no visible pop-in or ground seams at supported orbit angles and zoom distances; the same arrangement does not visibly repeat every few seconds.

### 4. Build the other regions to the same standard

Create a complete canyon vista and a complete highland vista using their own terrain profiles, vegetation families, water treatments, and monuments. Develop the transition sections only after both adjacent regions work independently. Let the Crown Beacon add a subtle distant response in the highland sanctuary without washing out the scene.

**Gate:** each region can be identified from an unlabelled screenshot, even without its lighting tint.

### 5. Finish and measure

Tune atmospheric depth, sky gradients, cloud shapes, shadows, exposure, and restrained bloom. Add optional ambient sound later: distant water, wind, and birds would reinforce scale, but visual completion comes first.

Inspect with an empty platform and a fully occupied nine-building platform. Test desktop and portrait, all camera extremes, pause/resume, reduced motion, biome transitions, and reload. Record frame time, draw calls, triangles, pixel ratio, and memory over a long traversal.

## Implementation boundaries

- Keep `src/world.ts` as a small scene interface. Split terrain/route sampling, vegetation construction, landmarks, water, and atmosphere into focused modules under `src/world/` as those systems are introduced.
- Use a shared surface sampler for terrain, prop placement, riverbanks, and path edges. Preserve a level walking corridor initially so the existing planted-foot rig remains correct; the surrounding valley can descend dramatically. Uneven footing requires a separate rig change.
- Give all near-world objects the same presentation-distance clock as the creature. Derive apparent distant movement from actual spatial depth; avoid independent scrolling that makes landmarks slide against the ground.
- Extend camera range and retune fog together when increasing landscape scale. Maintain atmospheric separation through color and value as well as fog, so distant geometry remains visible.
- Use instancing for repeated vegetation, pooled route sections, shared materials, and simplified distant geometry. Limit shadow casting to useful nearby forms. Start water with an inexpensive animated surface and reflection approximation; profile before introducing render-to-texture reflections.
- Target a stable 60 fps on the development desktop at a declared viewport and pixel ratio, measured with nine buildings and the richest vista. Treat mobile as a separate measured quality tier. Reduce shadow resolution, foliage density, and reflection cost before sacrificing terrain silhouette or landmark scale.
- Keep randomisation seeded and production/save logic unchanged. Background scenery must not resemble purchasable buildings or clickable resource markers.

## First implementation milestone

Complete **one beautiful, moving waterfall valley** with the existing creature in it. This is the benchmark for the rest of the world. The following milestone is continuous travel through that landscape; the canyon and highlands follow once the visual and streaming foundations are proven.
