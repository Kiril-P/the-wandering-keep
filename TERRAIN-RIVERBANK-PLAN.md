# Terrain and riverbank pass

Scope: the terrain/riverbank priority from the audit. Preserve the level creature corridor, economy, saved progress, and existing scenery controls.

1. Give water and terrain one continuous river profile in global route coordinates: center, unequal bank widths, broad pools, constricted stretches, beach widths, and bed depth.
2. Sculpt terrain from that profile. Add wet margins and beach shelves, vary valley shoulders and cliff outlines, cut shallow erosion channels, and break up the road's uniform color. Increase sampling where the shore needs it.
3. Generate water with matching section endpoints and enough overlap beneath the banks to prevent visible strip edges. Shade the channel using sampled depth; retain waterfall mouths at the receiving river level.
4. Place reeds, shrubs, and stones on sampled bank surfaces, with clustered rather than uniform distribution.
5. Verify shared terrain/water seams, shoreline depth, dry walking corridor, deterministic reload, populated-scene performance, all three regions, orbit views, and portrait. Refine the actual renders before delivery.

Status: implemented and verified. Terrain and water seams, dry banks/submerged beds, rendered-surface raycasts, waterfall runoff clearance, and the existing simulation/rig checks pass. Inspected all three regions, oblique and portrait views, and an accelerated traversal beyond 3,000 metres. See VERIFICATION.md for measurements and the outlet regression found during visual QA.
