import { selectionVolume } from './selection';
import * as THREE from 'three';
import { M, box, cyl, rock, sphere, mesh, beam, tube, consolidate, lantern, rand, sharedGeometries } from './art';
import { PADS, type BuildingKind } from './balance';
import { capacity, production, type GameState, type Building } from './game';
export type Pick = {
    type: 'pad';
    pad: number;
} | {
    type: 'building';
    id: number;
} | {
    type: 'outcrop';
    id: number;
} | {
    type: 'keep';
} | {
    type: 'beacon';
};
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
function roof(p: THREE.Object3D, x: number, y: number, z: number, r: number) { mesh(p, new THREE.CylinderGeometry(.03, r, .6, 6), M.roof, x, y, z); cyl(p, M.brass, x, y + .4, z, .025, .2); }
function model(kind: BuildingKind, level: number) {
    const root = new THREE.Group(), fixed = new THREE.Group();
    root.add(fixed);
    const moving: ((t: number, active: boolean) => void)[] = [];
    mesh(fixed, new THREE.CylinderGeometry(.48, .54, .16, 8), M.mortar, 0, .08, 0);
    mesh(fixed, new THREE.CylinderGeometry(.51, .51, .045, 8), M.creamLight, 0, .18, 0);
    if (kind === 'quarry') {
        for (const x of [-.25, .25])
            for (const z of [-.23, .23]) {
                box(fixed, M.wood, x, .66, z, .08, .96, .08);
                beam(fixed, M.wood, v(x, .25, z), v(-x, 1.0, z), .022);
            }
        box(fixed, M.wood, 0, 1.08, 0, .71, .12, .65);
        cyl(fixed, M.iron, 0, 1.2, 0, .14, .32);
        const crane = new THREE.Group();
        root.add(crane);
        crane.position.y = 1.24;
        beam(crane, M.brass, v(-.3, 0, 0), v(.63, .31, 0), .047);
        beam(crane, M.iron, v(-.3, .03, 0), v(.1, .42, 0), .024);
        beam(crane, M.iron, v(.1, .42, 0), v(.63, .31, 0), .024);
        const cable = cyl(crane, M.darkWood, .62, .06, 0, .014, .48);
        const bucket = mesh(crane, new THREE.CylinderGeometry(.14, .11, .22, 8), M.iron, .62, -.24, 0);
        const wheel = mesh(fixed, new THREE.TorusGeometry(.19, .03, 4, 12), M.brass, -.3, .88, .33);
        for (let i = 0; i < 5; i++) {
            const a = i / 5 * Math.PI * 2;
            beam(fixed, M.brass, v(-.3, .88, .33), v(-.3 + Math.cos(a) * .18, .88 + Math.sin(a) * .18, .33), .017);
        }
        box(fixed, M.wood, -.27, .35, .15, .3, .32, .34);
        for (let i = 0; i < 4; i++)
            rock(fixed, M.stoneLight, -.32 + (i % 2) * .12, .49, .08 + Math.floor(i / 2) * .12, .095, .07, .08);
        moving.push((t, a) => { crane.rotation.y = a ? Math.sin(t * 1.1) * .65 : 0; bucket.position.y = -.24 + (a ? Math.sin(t * 2) * .1 : 0); cable.scale.y = a ? .43 + Math.sin(t * 2) * .1 : .48; });
        if (level >= 2) {
            cyl(fixed, M.iron, -.31, .76, -.29, .12, .33);
            roof(fixed, -.15, 1.51, -.22, .35);
        }
        if (level === 3) {
            box(fixed, M.wood, .3, .38, -.24, .32, .39, .35);
            mesh(fixed, new THREE.OctahedronGeometry(.1), M.rune, .3, .66, -.24);
        }
    }
    if (kind === 'garden') {
        // A solid, stone-edged moss bed sits directly on the common foundation.
        box(fixed, M.wood, 0, .29, 0, .84, .2, .76);
        box(fixed, M.darkWood, 0, .405, 0, .72, .045, .64);
        for (const x of [-.39, .39])
            box(fixed, M.cream, x, .37, 0, .09, .22, .8);
        for (const z of [-.35, .35])
            box(fixed, M.creamLight, 0, .37, z, .75, .22, .09);
        const plant = (x: number, y: number, z: number, seed: number) => {
            rock(fixed, M.moss, x, y, z, .18, .065, .15);
            const sprig = new THREE.Group();
            sprig.position.set(x, y - .045, z);
            root.add(sprig);
            for (let j = 0; j < 3; j++) {
                const a = j * 2.1 + seed;
                const leaf = rock(sprig, j % 2 ? M.mossLight : M.leavesLight, Math.cos(a) * .07, .09 + j * .025, Math.sin(a) * .07, .09, .14, .04);
                leaf.rotation.z = Math.cos(a) * .55;
                leaf.rotation.y = -a;
            }
            cyl(sprig, M.wood, .015, .125, 0, .022, .31);
            sphere(sprig, M.rune, .015, .27, 0, .08, .04, .08);
            moving.push(t => sprig.rotation.z = Math.sin(t * 1.1 + seed) * .045);
        };
        for (const x of [-.22, .22])
            for (const z of [-.18, .16])
                plant(x, .445, z, x * 7 + z * 3);
        // Cistern, pipe and axle explain how the little irrigation wheel is held.
        cyl(fixed, M.wood, -.25, .67, -.25, .13, .4);
        for (const y of [.51, .8])
            cyl(fixed, M.brass, -.25, y, -.25, .137, .035);
        tube(fixed, M.brass, [[-.25, .87, -.25], [-.25, .95, -.25], [.42, .95, -.25], [.49, .77, -.12]], .022);
        for (const x of [.4, .57]) {
            box(fixed, M.wood, x, .33, 0, .06, .4, .07);
            beam(fixed, M.wood, v(.35, .21, -.25), v(x, .53, 0), .025);
        }
        beam(fixed, M.iron, v(.33, .53, 0), v(.61, .53, 0), .03);
        const wheel = new THREE.Group();
        wheel.position.set(.49, .53, 0);
        root.add(wheel);
        mesh(wheel, new THREE.TorusGeometry(.21, .03, 4, 12), M.wood).rotation.y = Math.PI / 2;
        for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2, y = Math.sin(a) * .21, z = Math.cos(a) * .21;
            beam(wheel, M.brass, v(0, 0, 0), v(0, y, z), .013);
            box(wheel, M.wood, 0, y, z, .11, .055, .09).rotation.x = -a;
        }
        moving.push((t, a) => { if (a) wheel.rotation.x = t * .6; });
        if (level >= 2) {
            // The upper bed has posts and braces down to the foundation.
            for (const x of [-.3, .3]) {
                box(fixed, M.wood, x, .56, -.23, .06, .7, .06);
                beam(fixed, M.wood, v(x, .47, .2), v(x, .81, -.23), .02);
            }
            box(fixed, M.wood, 0, .83, -.19, .74, .12, .29);
            box(fixed, M.darkWood, 0, .9, -.19, .64, .035, .22);
            for (const x of [-.22, 0, .22])
                plant(x, .94, -.19, x * 9);
        }
        if (level === 3) {
            tube(fixed, M.brass, [[-.38, .21, -.32], [-.38, 1.18, -.32], [0, 1.4, -.32], [.38, 1.18, -.32], [.38, .21, -.32]], .026);
            for (let i = 0; i < 5; i++)
                rock(fixed, M.leaves, -.33 + i * .16, 1.25 + Math.sin(i / 4 * Math.PI) * .12, -.32, .12, .08, .08);
            lantern(fixed, 0, 1.05, -.32);
        }
    }
    if (kind === 'forge') {
        box(fixed, M.stone, 0, .45, -.09, .75, .62, .65);
        box(fixed, M.cream, 0, .8, -.09, .82, .11, .72);
        box(fixed, M.dark, 0, .43, .25, .38, .3, .04);
        const glow = box(root, M.window, 0, .44, .28, .26, .18, .015);
        for (const x of [-.18, .18])
            box(fixed, M.iron, x, .43, .3, .025, .26, .025);
        box(fixed, M.mortar, -.23, 1.12, -.21, .19, .7, .2);
        box(fixed, M.creamLight, -.23, 1.48, -.21, .26, .08, .27);
        const press = new THREE.Group();
        press.position.set(.2, .94, .1);
        root.add(press);
        beam(press, M.wood, v(-.1, 0, 0), v(.35, 0, 0), .04);
        box(press, M.iron, .35, -.04, 0, .19, .19, .18);
        box(fixed, M.iron, .41, .59, .09, .26, .13, .24);
        cyl(fixed, M.wood, .25, .87, .1, .025, .42);
        moving.push((t, a) => { press.rotation.z = a ? Math.max(0, Math.sin(t * 3)) * .5 : 0; glow.visible = a; });
        if (level >= 2) {
            cyl(fixed, M.brass, .35, .53, -.29, .14, .51);
            tube(fixed, M.iron, [[.35, .82, -.29], [.35, 1.0, -.29], [0, 1.0, -.29], [0, .78, -.29]], .035);
        }
        if (level === 3) {
            roof(fixed, .05, 1.69, -.19, .4);
            for (const x of [-.4, .4])
                mesh(fixed, new THREE.OctahedronGeometry(.10), M.rune, x, .7, .29);
        }
    }
    if (kind === 'watchtower') {
        const h = 1.0 + level * .25;
        cyl(fixed, M.mortar, 0, h / 2 + .18, 0, .29, h);
        for (let row = 0; row < level + 3; row++)
            cyl(fixed, M.cream, 0, .26 + row * .25, 0, .31, .12);
        cyl(fixed, M.wood, 0, h + .2, 0, .45, .16);
        for (let i = 0; i < 6; i++) {
            const a = i / 6 * Math.PI * 2;
            cyl(fixed, M.wood, Math.cos(a) * .38, h + .44, Math.sin(a) * .38, .022, .41);
        }
        roof(fixed, 0, h + .95, 0, .56);
        const telescope = new THREE.Group();
        telescope.position.set(0, h + .52, 0);
        root.add(telescope);
        const tube = cyl(telescope, M.brass, 0, 0, .26, .065, .46);
        tube.rotation.x = Math.PI / 2;
        sphere(telescope, M.rune, 0, 0, .51, .058, .058, .018);
        moving.push(t => telescope.rotation.y = t * .22);
    }
    consolidate(fixed);
    return { root, update(t: number, active: boolean) { moving.forEach(f => f(t, active)); } };
}
function dispose(root: THREE.Object3D) { root.traverse(o => { if (o instanceof THREE.Mesh) {
    if (!o.userData.selectionOnly && !sharedGeometries.has(o.geometry))
        o.geometry.dispose();
    if (!Array.isArray(o.material) && o.material.userData.preview)
        o.material.dispose();
} }); root.removeFromParent(); }
export function createSettlement(body: THREE.Group, scene: THREE.Scene, keep: THREE.Group, setKeepLevel: (level: number) => void) {
    const root = new THREE.Group();
    body.add(root);
    keep.userData.pick = { type: 'keep' } satisfies Pick;
    let ghost: ReturnType<typeof model> | null = null, ghostKind: BuildingKind | null = null, ghostPad = 0;
    const models = new Map<number, {
        key: string;
        visual: ReturnType<typeof model>;
        proxy: THREE.Mesh;
    }>();
    const pads: THREE.Mesh[] = [];
    const sockets: THREE.Mesh[] = [];
    const slotHighlights: THREE.Mesh[] = [];
    const slotFill = new THREE.MeshBasicMaterial({ color: 0xffd77b, transparent: true, opacity: .55, depthWrite: false, toneMapped: false });
    const slotOutline = new THREE.MeshBasicMaterial({ color: 0xffde82, depthWrite: false, toneMapped: false });
    const padGeometry = new THREE.CircleGeometry(.49, 32);
    const outlineGeometry = new THREE.TorusGeometry(.59, .055, 6, 40);
    const slotGlow = new THREE.MeshBasicMaterial({ color: 0xffdc7b, transparent: true, opacity: .2, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const glowGeometry = new THREE.CylinderGeometry(.55, .59, .34, 32, 1, true);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x9dbb8a, transparent: true, opacity: .45, roughness: 1 });
    const chooseMat = new THREE.MeshStandardMaterial({ color: 0xf6d680, emissive: 0x94722c, emissiveIntensity: .5, transparent: true, opacity: .9 });
    for (let i = 0; i < 9; i++) {
        const p = PADS[i];
        // Seat each model on a real socket; the first three saddles sink into
        // the curved shell and the outer sockets meet the plank deck.
        const socketHeight = i < 3 ? .4 : .11;
        const socket = mesh(root, new THREE.CylinderGeometry(.54, .5, socketHeight, 8), M.wood, p[0], p[1] - socketHeight / 2 + .012, p[2]);
        sockets.push(socket);
        if (i < 3) {
            // The shell falls away under the outer edge of a flat saddle.
            // Four feet bridge that slope instead of leaving a suspended rim.
            for (const dx of [-.34, .34]) for (const dz of [-.34, .34]) {
                const x = p[0] + dx, z = p[2] + dz;
                const shellY = 3.42 + 1.32 * Math.sqrt(Math.max(.04, 1 - (x / 3.65) ** 2 - (z / 2.62) ** 2)) - .2;
                beam(root, M.wood, v(x, shellY, z), v(x, p[1] - .05, z), .055);
            }
        }
        const pad = mesh(root, padGeometry, padMat, ...p as [
            number,
            number,
            number
        ]);
        // Sockets end at p.y + .012; the old marker was buried inside the wood.
        pad.position.y += .035;
        pad.rotation.x = -Math.PI / 2;
        pad.castShadow = pad.receiveShadow = false;
        const outline = mesh(pad, outlineGeometry, slotOutline, 0, 0, .015);
        outline.name = `Available slot ${i + 1}`;
        outline.castShadow = outline.receiveShadow = false;
        outline.visible = false;
        const glow = mesh(outline, glowGeometry, slotGlow, 0, 0, .17);
        glow.rotation.x = Math.PI / 2;
        glow.castShadow = glow.receiveShadow = false;
        slotHighlights.push(outline);
        pad.userData.pick = { type: 'pad', pad: i } satisfies Pick;
        pads.push(pad);
    }
    const wings: THREE.Group[] = [];
    for (const s of [1, -1]) {
        const g = new THREE.Group();
        root.add(g);
        for (let i = 0; i < 18; i++)
            box(g, M.wood, -2.25 + i * .265, 4.26, s * 2.67, .25, .17, 1.18);
        for (const x of [-2, -.7, .7, 2]) {
            beam(g, M.wood, v(x, 3.4, s * 1.65), v(x, 4.24, s * 3.2), .065);
            cyl(g, M.wood, x, 4.55, s * 3.19, .045, .59);
        }
        for (const y of [4.42, 4.77])
            beam(g, M.wood, v(-2.3, y, s * 3.19), v(2.3, y, s * 3.19), .029);
        consolidate(g);
        wings.push(g);
    }
    const keepUpgrades = [new THREE.Group(), new THREE.Group()];
    for (const g of keepUpgrades)
        keep.add(g);
    for (const s of [-1, 1]) {
        box(keepUpgrades[0], M.cloth, -.15, 1.53, s * 1.21, .30, .64, .025);
        box(keepUpgrades[0], M.brass, -.15, 1.85, s * 1.22, .39, .04, .04);
        lantern(keepUpgrades[0], .75, 1.15, s * 1.16);
    }
    for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        const x = Math.cos(a) * 1.9, z = Math.sin(a) * 1.4;
        box(keepUpgrades[1], M.creamLight, x, .48, z, .28, .45, .27);
        if (i % 2 === 0)
            mesh(keepUpgrades[1], new THREE.OctahedronGeometry(.08), M.rune, x, .79, z);
    }
    keepUpgrades.forEach(consolidate);
    const beacon = new THREE.Group();
    beacon.position.set(-2.75, 4.35, 0);
    root.add(beacon);
    beacon.userData.pick = { type: 'beacon' } satisfies Pick;
    cyl(beacon, M.cream, 0, .12, 0, .35, .24);
    const beaconTop = new THREE.Group();
    beacon.add(beaconTop);
    cyl(beaconTop, M.creamLight, 0, .66, 0, .14, 1.1);
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        beam(beaconTop, M.brass, v(Math.cos(a) * .29, .25, Math.sin(a) * .29), v(Math.cos(a) * .21, 1.35, Math.sin(a) * .21), .028);
    }
    const crystal = mesh(beaconTop, new THREE.OctahedronGeometry(.27), M.rune, 0, 1.61, 0, .75, 1.4, .75);
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 2; i++) {
        const ring = mesh(beaconTop, new THREE.TorusGeometry(.43 + i * .08, .022, 6, 36), M.brass, 0, 1.58, 0);
        rings.push(ring);
    }
    const crown = mesh(beaconTop, new THREE.ConeGeometry(.12, .28, 6), M.brass, 0, 2.0, 0);
    const selection = mesh(root, new THREE.RingGeometry(.53, .57, 40), chooseMat);
    selection.rotation.x = -Math.PI / 2;
    selection.visible = false;
    const outcropModels = new Map<number, THREE.Group>();
    const rng = rand(338);
    let selected: number | 'keep' | 'beacon' | null = null;
    let hovered: number | 'keep' | 'beacon' | null = null;
    const hoverOriginals = new Map<THREE.Mesh, THREE.Material>();
    const hoverMaterials = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    function setHovered(id: typeof hovered) {
        if (id === hovered) return;
        hoverOriginals.forEach((material, mesh) => mesh.material = material); hoverOriginals.clear();
        hoverMaterials.forEach(m => m.dispose()); hoverMaterials.clear(); hovered = id;
        const object = typeof id === 'number' ? models.get(id)?.visual.root : id === 'keep' ? keep : id === 'beacon' ? beacon : null;
        object?.traverse(o => {
            if (!(o instanceof THREE.Mesh) || !(o.material instanceof THREE.MeshStandardMaterial) || o.userData.selectionOnly) return;
            const original = o.material;
            let highlighted = hoverMaterials.get(original);
            if (!highlighted) {
                highlighted = original.clone(); highlighted.color.lerp(new THREE.Color(0xffdc8b), .22);
                // Emission adds a legible warm wash even on the night-facing side.
                highlighted.emissive.lerp(new THREE.Color(0xaa772e), .38); highlighted.emissiveIntensity = Math.max(.55, original.emissiveIntensity);
                hoverMaterials.set(original, highlighted);
            }
            hoverOriginals.set(o, original); o.material = highlighted;
        });
    }
    const beaconProxy = selectionVolume(beacon, {type:'beacon'}, v(.8,2.2,.8), v(0,1.1,0));

    function preview(pad: number, valid = true) { if (!ghost)
        return; ghostPad = pad; ghost.root.position.set(...PADS[pad] as [
        number,
        number,
        number
    ]); ghost.root.visible = true; ghost.root.traverse(o => { if (o instanceof THREE.Mesh && !Array.isArray(o.material)) {
        const m = o.material as THREE.MeshStandardMaterial;
        m.color.set(valid ? 0xc6d5a0 : 0xe78969);
    } }); }
    function sync(s: GameState, placing: BuildingKind | null) {
        if (hovered === 'keep' && keep.userData.level !== s.keepLevel) setHovered(null);
        keep.userData.level = s.keepLevel;
        setKeepLevel(s.keepLevel);
        if (placing !== ghostKind) {
            if (ghost)
                dispose(ghost.root);
            ghost = placing ? model(placing, 1) : null;
            ghostKind = placing;
            if (ghost) {
                const materials = new Map<THREE.Material, THREE.Material>();
                ghost.root.traverse(o => { if (o instanceof THREE.Mesh && !Array.isArray(o.material)) {
                    const original = o.material as THREE.Material;
                    const m = materials.get(original) ?? original.clone();
                    if (!materials.has(original)) {
                        m.transparent = true;
                        m.opacity = .4;
                        m.depthWrite = false;
                        m.userData.preview = true;
                        materials.set(original, m);
                    }
                    o.material = m;
                    o.castShadow = false;
                } });
                root.add(ghost.root);
                const first = PADS.findIndex((_, i) => i < capacity(s) && !s.buildings.some(b => b.pad === i));
                preview(Math.max(0, first));
            }
        }
        for (const [id, { visual }] of models)
            if (!s.buildings.some(b => b.id === id)) {
                if (hovered === id) setHovered(null);
                dispose(visual.root);
                models.delete(id);
            }
        for (const b of s.buildings) {
            const key = b.kind + ':' + b.level;
            const old = models.get(b.id);
            if (old?.key === key)
                continue;
            if (old) { if (hovered === b.id) setHovered(null); dispose(old.visual.root); }
            const visual = model(b.kind, b.level);
            const bounds = new THREE.Box3().setFromObject(visual.root), size = bounds.getSize(v(0,0,0)), center = bounds.getCenter(v(0,0,0));
            size.x = Math.max(1.05, size.x + .12); size.z = Math.max(1.05, size.z + .12); size.y += .12;
            const proxy = selectionVolume(visual.root, {type:'building',id:b.id}, size, center);
            visual.root.position.set(...PADS[b.pad] as [
                number,
                number,
                number
            ]);
            visual.root.userData.pick = { type: 'building', id: b.id } satisfies Pick;
            root.add(visual.root);
            models.set(b.id, { key, visual, proxy });
        }
        pads.forEach((p, i) => {
            p.visible = i < capacity(s) && !s.buildings.some(b => b.pad === i);
            p.material = placing ? slotFill : padMat;
            slotHighlights[i].visible = !!placing && p.visible;
        });
        sockets.forEach((socket, i) => socket.visible = i < capacity(s));
        wings.forEach((w, i) => w.visible = s.expansions > i);
        keepUpgrades.forEach((g, i) => g.visible = s.keepLevel > i + 1);
        beaconTop.visible = s.beacon;
        for (const [id, g] of outcropModels)
            if (!s.outcrops.some(o => o.id === id)) {
                dispose(g);
                outcropModels.delete(id);
            }
        for (const o of s.outcrops)
            if (!outcropModels.has(o.id)) {
                const g = new THREE.Group();
                scene.add(g);
                g.userData.pick = { type: 'outcrop', id: o.id } satisfies Pick;
                for (let i = 0; i < 5; i++) {
                    const r = .24 + rng() * .23;
                    rock(g, i % 2 ? M.stoneLight : M.stone, (rng() - .5) * .75, r * .65, (rng() - .5) * .6, r, r * .8, r);
                }
                const halo = mesh(g, new THREE.RingGeometry(.57, .61, 32), chooseMat, 0, .025, 0);
                halo.rotation.x = -Math.PI / 2;
                const shard = mesh(g, new THREE.OctahedronGeometry(.14), M.brass, 0, .79, 0, .7, 1, .7);
                shard.userData.marker = true;
                consolidate(g);
                selectionVolume(g, {type:'outcrop',id:o.id}, v(1.2,.85,1.1), v(0,.42,0));
                outcropModels.set(o.id, g);
            }
        const b = s.buildings.find(b => b.id === selected);
        selection.visible = !!b;
        if (b)
            selection.position.set(PADS[b.pad][0], PADS[b.pad][1] + .025, PADS[b.pad][2]);
    }
    return { root, sync, preview, setHovered,
        hidePreview() { if (ghost) ghost.root.visible = false; },
        get pickTargets() { return [keep, beaconProxy, ...pads.filter(p => p.visible), ...[...models.values()].map(m => m.proxy), ...[...outcropModels.values()].flatMap(g => g.children.filter(c => c.userData.selectionOnly))]; },
        setSelected(id: typeof selected) { selected = id; }, get targets() { return [keep, beacon, ...pads, ...[...models.values()].map(m => m.visual.root), ...[...outcropModels.values()]]; }, update(s: GameState, t: number, distance = s.distance) { const flow = production(s); for (const b of s.buildings)
            models.get(b.id)?.visual.update(t, (flow.buildings.get(b.id)?.rate ?? 0) > 1e-7); for (const o of s.outcrops) {
            const g = outcropModels.get(o.id);
            if (g) {
                g.position.set(-6 + distance - o.born, .025, o.side * 3.95);
                g.scale.setScalar(.77 + o.hits * .038);
            }
        } crystal.rotation.y = t * .7; rings.forEach((r, i) => { r.rotation.set(Math.PI / 2 + Math.sin(t * .5 + i) * .4, t * .3 * (i ? 1 : -1), i * .8); }); crown.rotation.y = t * .3; }, clear() { setHovered(null); if (ghost)
            dispose(ghost.root); ghost = null; ghostKind = null; slotHighlights.forEach(h => h.visible = false); pads.forEach(p => p.material = padMat); models.forEach(m => dispose(m.visual.root)); models.clear(); outcropModels.forEach(dispose); outcropModels.clear(); } };
}
