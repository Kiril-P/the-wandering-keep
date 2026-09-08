import * as THREE from 'three';
import { createTowerUpgrade } from './keep-tower';
import { M, box, cyl, mesh, arch, beam, tube, rock, rand, consolidate, lantern, tuft } from './art';
export function createCastle() {
    const root = new THREE.Group();
    root.name = 'Hearthkeep';
    const staticArt = new THREE.Group();
    root.add(staticArt);
    const rng = rand(154);
    // The low terrace ties the architecture to the curved shell.
    mesh(staticArt, new THREE.CylinderGeometry(2.15, 2.35, .32, 12), M.mortar, 0, 0, 0, 1, 1, .77);
    mesh(staticArt, new THREE.CylinderGeometry(2.18, 2.18, .12, 12), M.cream, .0, .2, 0, 1, 1, .77);
    for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        box(staticArt, M.wood, Math.cos(a) * 1.9, -.24, Math.sin(a) * 1.4, .18, .65, .18).rotation.z = -Math.cos(a) * .23;
    }
    const hall = new THREE.Group();
    staticArt.add(hall);
    hall.position.set(-.35, .26, .15);
    box(hall, M.mortar, 0, 1.0, 0, 2.35, 2, 1.95);
    // Staggered masonry retains visible joints and varied stone sizes.
    for (let row = 0; row < 7; row++) {
        for (const side of [-1, 1])
            for (let j = 0; j < 7; j++) {
                let x = -1.05 + j * .35 + (row % 2) * .15;
                if (x > 1.16)
                    continue;
                box(hall, rng() > .35 ? M.cream : M.creamLight, x, .15 + row * .285, side * .989, .325, .266, .09);
            }
        for (const side of [-1, 1])
            for (let j = 0; j < 6; j++) {
                let z = -.82 + j * .32 + (row % 2) * .13;
                if (z > .95)
                    continue;
                box(hall, rng() > .35 ? M.cream : M.creamLight, side * 1.185, .15 + row * .285, z, .09, .266, .3);
            }
    }
    box(hall, M.creamLight, 0, .15, 0, 2.5, .18, 2.1);
    box(hall, M.wood, 0, 1.96, 0, 2.48, .14, 2.08);
    // Warm arched entry and limestone arch stones.
    arch(hall, M.darkWood, -.35, .24, 1.048, .6, 1.14);
    for (let j = 0; j < 5; j++)
        box(hall, M.wood, -.58 + j * .115, .64, 1.14, .085, .69, .018);
    box(hall, M.iron, -.35, .55, 1.17, .58, .045, .025);
    box(hall, M.iron, -.35, .99, 1.17, .58, .04, .025);
    for (let i = 0; i < 9; i++) {
        const a = i / 8 * Math.PI;
        const s = box(hall, M.creamLight, -.35 + Math.cos(a) * .39, 1.06 + Math.sin(a) * .39, 1.08, .16, .2, .17);
        s.rotation.z = a - Math.PI / 2;
    }
    for (const side of [-1, 1])
        for (let i = 0; i < 3; i++)
            box(hall, M.creamLight, -.35 + side * .39, .4 + i * .24, 1.08, .14, .22, .17);
    cyl(hall, M.brass, -.16, .74, 1.19, .035, .045).rotation.x = Math.PI / 2;
    for (let s = 0; s < 3; s++)
        box(hall, M.creamLight, -.35, .06 - s * .08, 1.2 + s * .13, .93, .13, .3);
    function windowAt(x: number, y: number, z: number, rotation = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotation; hall.add(g); arch(g, M.wood, 0, 0, 0, .46, .68, .05); arch(g, M.window, 0, .055, .057, .33, .56, .015); box(g, M.wood, 0, .28, .09, .035, .49, .028); box(g, M.wood, 0, .29, .09, .34, .035, .028); box(g, M.creamLight, 0, -.015, .09, .6, .09, .19); }
    windowAt(.63, .98, 1.065);
    windowAt(-.55, 1.03, -1.075, Math.PI);
    windowAt(.6, 1.03, -1.075, Math.PI);
    windowAt(1.245, .9, .28, Math.PI / 2);
    windowAt(-1.245, .9, -.1, -Math.PI / 2);
    // Timber gables and overlapping terracotta roof courses.
    const gable = new THREE.BufferGeometry();
    gable.setAttribute('position', new THREE.Float32BufferAttribute([-1.2, 2, 1, 1.2, 2, 1, 0, 3.07, 1, -1.2, 2, -1, 0, 3.07, -1, 1.2, 2, -1], 3));
    gable.computeVertexNormals();
    mesh(hall, gable, M.cream);
    for (const z of [-1.04, 1.04]) {
        beam(hall, M.wood, new THREE.Vector3(-1.25, 1.96, z), new THREE.Vector3(0, 3.1, z), .065);
        beam(hall, M.wood, new THREE.Vector3(1.25, 1.96, z), new THREE.Vector3(0, 3.1, z), .065);
        box(hall, M.wood, 0, 2.41, z, .08, .85, .08);
    }
    // Continuous roof decking beneath separated tiles: no coplanar overlaps.
    const pitch = Math.atan(.86), slopeLength = Math.hypot(1, .86);
    for (const side of [-1, 1]) {
        const deck = box(hall, M.roofDark, side * .7175, 3.12 - .7175 * .86 - .035, -.02, 1.435 * slopeLength, .065, 2.59);
        deck.rotation.z = -side * pitch;
        for (let row = 0; row < 7; row++) {
            const x = side * (row + .5) * .205;
            for (let col = 0; col < 8; col++) {
                const tile = box(hall, (row + col) % 4 === 0 ? M.roofLight : M.roof, x, 3.12 - Math.abs(x) * .86 + .035, -1.14 + col * .32, .258, .065, .303);
                tile.rotation.z = -side * pitch;
            }
        }
    }
    beam(hall, M.roofDark, new THREE.Vector3(0, 3.19, -1.37), new THREE.Vector3(0, 3.19, 1.37), .075);
    // A small timber awning, held by explicit brackets.
    const awning = box(hall, M.roofDark, -.35, 1.63, 1.3, .98, .09, .68);
    awning.rotation.x = .18;
    for (const x of [-.8, .1])
        beam(hall, M.wood, new THREE.Vector3(x, 1.12, 1.05), new THREE.Vector3(x, 1.56, 1.53), .04);
    lantern(hall, -.98, 1.09, 1.35);
    // Side turret is part of the single keep, with banded masonry and a tiled cone.
    const tower = new THREE.Group();
    tower.position.set(1.05, .2, -.6);
    root.add(tower);
    tower.name = 'Keep tower level 1';
    cyl(tower, M.mortar, 0, 1.9, 0, .64, 3.8);
    for (let row = 0; row < 12; row++)
        for (let i = 0; i < 10; i++) {
            const a = (i + (row % 2) * .5) / 10 * Math.PI * 2;
            const b = box(tower, (row + i) % 3 ? M.cream : M.creamLight, Math.sin(a) * .62, .16 + row * .3, Math.cos(a) * .62, .38, .28, .115);
            b.rotation.y = a;
        }
    for (const y of [.15, 1.15, 2.35, 3.5])
        cyl(tower, M.creamLight, 0, y, 0, .69, .1);
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        const g = new THREE.Group();
        g.position.set(Math.sin(a) * .678, 2.59, Math.cos(a) * .678);
        g.rotation.y = a;
        tower.add(g);
        arch(g, M.darkWood, 0, 0, 0, .34, .58);
        arch(g, M.window, 0, .05, .09, .23, .46, .02);
        box(g, M.wood, 0, .24, .115, .027, .42, .025);
    }
    cyl(tower, M.wood, 0, 3.64, 0, .81, .19);
    for (let row = 0; row < 8; row++) {
        const r = .93 - row * .1;
        mesh(tower, new THREE.CylinderGeometry(Math.max(.03, r - .118), r, .19, 12), row % 3 ? M.roof : M.roofLight, 0, 3.82 + row * .19, 0);
    }

    // Chimney, iron rain cap, climbing ivy, terrace cargo.
    const chimney = new THREE.Group();
    chimney.position.y = -.28;
    hall.add(chimney);
    box(chimney, M.mortar, -.67, 3.12, -.58, .36, .99, .38);
    for (let row = 0; row < 5; row++)
        for (let side = 0; side < 2; side++)
            box(chimney, M.cream, -.77 + side * .2, 2.75 + row * .19, -.375, .18, .17, .06);
    box(chimney, M.creamLight, -.67, 3.63, -.58, .46, .14, .48);
    box(chimney, M.dark, -.67, 3.71, -.58, .3, .015, .32);
    for (let i = 0; i < 32; i++) {
        const y = rng() * 1.95;
        const x = 1.02 + Math.sin(y * 6) * .09;
        rock(hall, i % 3 ? M.leaves : M.mossLight, x, y, 1.08, .11, .13, .035);
    }
    for (let i = 0; i < 14; i++) {
        const a = rng() * Math.PI * 2;
        tuft(staticArt, Math.cos(a) * 1.94, .28, Math.sin(a) * 1.44, .17 + rng() * .15, rng);
    }
    for (const pos of [[-1.7, .48, .3], [-1.61, .48, -.3]]) {
        cyl(staticArt, M.wood, ...pos as [
            number,
            number,
            number
        ], .22, .48);
        for (const yy of [-.14, .14])
            cyl(staticArt, M.iron, pos[0], pos[1] + yy, pos[2], .228, .04);
    }
    box(staticArt, M.wood, -.95, .47, -1.28, .43, .42, .38);
    for (const z of [-1.49, -1.08])
        box(staticArt, M.darkWood, -.95, .47, z, .44, .05, .025);
    // A terrace rail, leaving the doorway clear.
    for (let i = 0; i < 9; i++) {
        const a = Math.PI * .08 + i * Math.PI * .1;
        cyl(staticArt, M.wood, Math.cos(a) * 2.08, .59, Math.sin(a) * 1.55, .038, .65);
    }
    for (const y of [.48, .83]) {
        const pts = [];
        for (let i = 0; i < 15; i++) {
            const a = Math.PI * .08 + i / 14 * Math.PI * .8;
            pts.push([Math.cos(a) * 2.08, y, Math.sin(a) * 1.55]);
        }
        tube(staticArt, M.wood, pts, .025);
    }
    // One continuous mast starts inside the final roof course. Keep the animated
    // socket in castle space, matching the turret transform before consolidation.
    const flagPole = new THREE.Group();
    flagPole.name = 'Turret flag socket';
    flagPole.position.copy(tower.position).add(new THREE.Vector3(0, 5.08, 0));
    root.add(flagPole);
    const mast = cyl(flagPole, M.brass, 0, .48, 0, .033, 1.12);
    mast.name = 'Embedded flag mast';
    rock(flagPole, M.brass, 0, .16, 0, .085, .12, .085);
    const flagG = new THREE.PlaneGeometry(.72, .32, 24, 8);
    flagG.translate(.36, 0, 0);
    // The emblem is woven into the cloth, so it cannot hover off a waving plane.
    const colors = new Float32Array(flagG.attributes.position.count * 3);
    const cloth = new THREE.Color(0xffffff), emblem = new THREE.Color(M.creamLight.color.r / M.cloth.color.r, M.creamLight.color.g / M.cloth.color.g, M.creamLight.color.b / M.cloth.color.b);
    for (let i = 0; i < flagG.attributes.position.count; i++) {
        const x = flagG.attributes.position.getX(i), y = flagG.attributes.position.getY(i);
        const radius = Math.hypot(x - .23, y);
        (radius > .05 && radius < .10 ? emblem : cloth).toArray(colors, i * 3);
    }
    flagG.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const flagM = M.cloth.clone();
    flagM.side = THREE.DoubleSide;
    flagM.vertexColors = true;
    const flag = mesh(flagPole, flagG, flagM, 0, .8, 0);
    flag.name = 'Pinned turret pennant';
    const initial = Float32Array.from(flagG.attributes.position.array);
    consolidate(staticArt);
    consolidate(tower);
    const towers = new Map<number, { root: THREE.Group; flagSocket: THREE.Vector3 }>([[1, { root: tower, flagSocket: new THREE.Vector3(0, 5.08, 0) }]]);
    let currentLevel = 1;
    function setLevel(level: number) {
        const next = Math.max(1, Math.min(3, Math.floor(level)));
        if (next === currentLevel) return;
        if (!towers.has(next)) {
            const stage = createTowerUpgrade(next as 2 | 3);
            stage.root.position.copy(tower.position);
            root.add(stage.root); towers.set(next, stage);
        }
        towers.forEach((stage, key) => stage.root.visible = key === next);
        const stage = towers.get(next)!;
        flagPole.position.copy(stage.root.position).add(stage.flagSocket);
        flagPole.scale.setScalar(next === 3 ? 1.55 : next === 2 ? 1.25 : 1);
        currentLevel = next;
    }
    return { root, setLevel, get level() { return currentLevel; }, chimney: new THREE.Vector3(-1.02, 3.69, -.43), update(t: number) {
        const p = flagG.attributes.position;
        for (let i = 0; i < p.count; i++) {
            const x = initial[i * 3];
            p.setZ(i, Math.sin(x * 7 - t * 2.7) * .11 * (x / .72));
        }
        p.needsUpdate = true;
        flagG.computeVertexNormals();
    } };
}
