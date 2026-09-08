import * as THREE from 'three';
import { M, mesh, box, cyl, beam, arch, consolidate, lantern } from './art';
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Upper storeys deliberately outgrow their little masonry stem. */
export function createTowerUpgrade(level: 2 | 3) {
    const root = new THREE.Group();
    root.name = `Keep tower level ${level}`;
    const grand = level === 3, radius = grand ? 2.7 : 1.65, floor = 4.5, ceiling = grand ? 9.5 : 7.15;
    cyl(root, M.mortar, 0, 1.95, 0, .67, 3.9);
    for (let row = 0; row < 13; row++) {
        cyl(root, row % 3 ? M.cream : M.creamLight, 0, .16 + row * .29, 0, .695, .24);
        for (let seam = 0; seam < 8; seam++) {
            const a = (seam + row % 2 * .5) / 8 * Math.PI * 2;
            box(root, M.mortar, Math.sin(a) * .694, .16 + row * .29, Math.cos(a) * .694, .022, .24, .025).rotation.y = a;
        }
    }
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        const g = new THREE.Group(); g.position.set(Math.sin(a) * .7, 2.2, Math.cos(a) * .7); g.rotation.y = a; root.add(g);
        arch(g, M.darkWood, 0, 0, 0, .34, .75); arch(g, M.window, 0, .06, .09, .23, .61, .025);
    }
    // Broad corbels explain the gloriously unreasonable upper-storey overhang.
    const profile = [[.68, 3.45], [.84, 3.6], [radius * .62, 3.85], [radius * .93, 4.15], [radius, floor], [radius, ceiling - .2], [radius * .95, ceiling]];
    mesh(root, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 16), M.cream);
    for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2, x = Math.sin(a), z = Math.cos(a);
        beam(root, M.wood, v(x * .7, 3.3, z * .7), v(x * (radius + .08), 4.5, z * (radius + .08)), .085);
    }
    const balcony = (y: number, r: number) => {
        cyl(root, M.wood, 0, y, 0, r, .17);
        cyl(root, M.brass, 0, y - .12, 0, r * .98, .055);
        for (let i = 0; i < 20; i++) {
            const a = i / 20 * Math.PI * 2;
            cyl(root, M.darkWood, Math.sin(a) * (r - .09), y + .38, Math.cos(a) * (r - .09), .035, .65);
        }
        for (const height of [.19, .65]) {
            const rail = mesh(root, new THREE.TorusGeometry(r - .09, .04, 5, 40), M.wood, 0, y + height, 0);
            rail.rotation.x = Math.PI / 2;
        }
    };
    balcony(floor, radius + .3);
    const rows = grand ? 3 : 2;
    for (let row = 0; row < rows; row++) {
        const y = floor + .35 + row * (grand ? 1.53 : 1.1);
        cyl(root, M.wood, 0, y - .18, 0, radius + .055, .12);
        for (let i = 0; i < 8; i++) {
            const a = (i + .5) / 8 * Math.PI * 2;
            const g = new THREE.Group(); g.position.set(Math.sin(a) * radius, y, Math.cos(a) * radius); g.rotation.y = a; root.add(g);
            const w = grand ? .66 : .49, h = grand ? 1.08 : .76;
            arch(g, M.darkWood, 0, 0, .015, w + .16, h + .14, .12);
            arch(g, M.creamLight, 0, .055, .145, w + .055, h + .025, .045);
            arch(g, M.window, 0, .1, .2, w - .08, h - .09, .025);
            box(g, M.wood, 0, h * .46, .24, .048, h * .75, .035);
            box(g, M.wood, 0, h * .47, .24, w - .02, .045, .035);
            box(g, M.creamLight, 0, .025, .21, w + .29, .09, .29);
        }
        for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2;
            box(root, M.wood, Math.sin(a) * radius, y + .4, Math.cos(a) * radius, .11, grand ? 1.4 : 1, .11).rotation.y = a;
        }
    }
    if (grand) balcony(7.48, radius + .42);
    cyl(root, M.creamLight, 0, ceiling, 0, radius + .16, .25);
    cyl(root, M.darkWood, 0, ceiling + .19, 0, radius + .35, .2);
    const roofBase = ceiling + .3, roofRadius = radius + .65, roofHeight = grand ? 4.8 : 3.05, courses = grand ? 14 : 10;
    for (let row = 0; row < courses; row++) {
        const u = row / courses, next = (row + 1) / courses;
        const bottom = roofRadius * (1 - u) ** .82, top = Math.max(.035, roofRadius * (1 - next) ** .82 - .055);
        const x = grand ? .7 * u ** 2 : .24 * u ** 2;
        mesh(root, new THREE.CylinderGeometry(top, bottom, roofHeight / courses + .035, 16), row % 4 === 0 ? M.roofLight : row % 4 === 3 ? M.roofDark : M.roof, x, roofBase + (row + .5) * roofHeight / courses, 0);
    }
    // Tiny attached turrets exaggerate the scale of the main upper chamber.
    if (grand) {
        for (const [x, z, y] of [[-2.72, -.65, 7.85], [2.72, .65, 8.55], [-.8, 2.75, 8.2]]) {
            const turret = new THREE.Group(); turret.position.set(x, y, z); root.add(turret);
            mesh(turret, new THREE.CylinderGeometry(.47, .12, .95, 8), M.wood, 0, -.28, 0);
            cyl(turret, M.creamLight, 0, .6, 0, .49, 1.5);
            cyl(turret, M.wood, 0, 1.25, 0, .63, .13);
            arch(turret, M.darkWood, 0, .32, .48, .3, .59);
            arch(turret, M.window, 0, .37, .575, .2, .46, .02);
            mesh(turret, new THREE.ConeGeometry(.8, 1.55, 10), M.roof, 0, 2.05, 0);
            cyl(turret, M.brass, 0, 2.95, 0, .025, .32);
        }
        // Oversized clock: it reads from the gameplay camera, not just up close.
        const clock = new THREE.Group(); clock.position.set(0, 8.35, radius + .18); root.add(clock);
        mesh(clock, new THREE.CircleGeometry(.71, 40), M.darkWood);
        mesh(clock, new THREE.CircleGeometry(.6, 40), M.creamLight, 0, 0, .025);
        mesh(clock, new THREE.TorusGeometry(.65, .065, 6, 40), M.brass, 0, 0, .06);
        for (let i = 0; i < 12; i++) {
            const a = i / 12 * Math.PI * 2;
            box(clock, M.darkWood, Math.sin(a) * .49, Math.cos(a) * .49, .08, .035, .1, .035).rotation.z = -a;
        }
        beam(clock, M.wood, v(0, 0, .1), v(-.22, .2, .1), .035);
        beam(clock, M.wood, v(0, 0, .115), v(.13, .43, .115), .025);
        // One last little room perched on the enormous crooked hat.
        cyl(root, M.creamLight, .64, 14.83, 0, .38, .8);
        for (const z of [-.39, .39]) arch(root, M.window, .64, 14.54, z, .2, .43, .03);
        mesh(root, new THREE.ConeGeometry(.64, 1.25, 10), M.roofDark, .64, 15.84, 0);
    }
    for (const x of [-1, 1]) {
        const banner = new THREE.Group(); banner.position.set(x * radius * .73, floor + 1.1, radius * .72); banner.rotation.y = x * .65; root.add(banner);
        box(banner, M.cloth, 0, -.4, .05, grand ? .65 : .42, grand ? 1.65 : 1.05, .035);
        box(banner, M.brass, 0, .22, .05, grand ? .85 : .61, .065, .065);
        lantern(banner, 0, -.16, .14);
    }
    consolidate(root);
    const flagSocket = grand ? v(.64, 16.18, 0) : v(.24, roofBase + roofHeight - .2, 0);
    return { root, flagSocket };
}
