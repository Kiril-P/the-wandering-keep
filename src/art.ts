import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export const rand = (seed: number) => { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
export const mat = (color: number, roughness = .85, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
export const M = { stone: mat(0x69756b), stoneLight: mat(0x8b9782), stoneDark: mat(0x48584e), shell: mat(0x788572), shellLight: mat(0x96a18a), moss: mat(0x596e38), mossLight: mat(0x7c8b48), grass: mat(0x8a9453), cream: mat(0xc7bd99), creamLight: mat(0xe2d5b2), mortar: mat(0x8e927e), roof: mat(0x8e4940), roofLight: mat(0xae6550), roofDark: mat(0x623f35), wood: mat(0x62523d), darkWood: mat(0x403d30), brass: mat(0xb59b59, .45, .55), iron: mat(0x404c47, .57, .4), leaves: mat(0x48644a), leavesLight: mat(0x6f8050), dark: mat(0x263b34), cloth: mat(0xb66649), window: new THREE.MeshStandardMaterial({ color: 0xffd58b, emissive: 0xffa84e, emissiveIntensity: .75, roughness: .35 }), rune: new THREE.MeshStandardMaterial({ color: 0xa6d5b8, emissive: 0x68c79e, emissiveIntensity: .6, roughness: .65 }) };
const boxG = new THREE.BoxGeometry(1, 1, 1), icoG = new THREE.IcosahedronGeometry(1, 1), sphereG = new THREE.SphereGeometry(1, 16, 12), cylG = new THREE.CylinderGeometry(1, 1, 1, 10);
export const sharedGeometries = new Set<THREE.BufferGeometry>([boxG, icoG, sphereG, cylG]);
export function mesh(parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { const a = new THREE.Mesh(g, m); a.position.set(x, y, z); a.scale.set(sx, sy, sz); a.castShadow = true; a.receiveShadow = true; parent.add(a); return a; }
export const box = (p: THREE.Object3D, m: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => mesh(p, boxG, m, x, y, z, sx, sy, sz);
export const rock = (p: THREE.Object3D, m: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => mesh(p, icoG, m, x, y, z, sx, sy, sz);
export const sphere = (p: THREE.Object3D, m: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => mesh(p, sphereG, m, x, y, z, sx, sy, sz);
export const cyl = (p: THREE.Object3D, m: THREE.Material, x: number, y: number, z: number, r: number, h: number) => mesh(p, cylG, m, x, y, z, r, h, r);
const up = new THREE.Vector3(0, 1, 0);
export function beam(p: THREE.Object3D, m: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, r: number) { const o = cyl(p, m, 0, 0, 0, r, 1); fitSegment(o, a, b); return o; }
export function fitSegment(o: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) { o.position.copy(a).add(b).multiplyScalar(.5); o.scale.y = a.distanceTo(b); o.quaternion.setFromUnitVectors(up, new THREE.Vector3().subVectors(b, a).normalize()); }
export function tube(p: THREE.Object3D, m: THREE.Material, points: number[][], r: number) { return mesh(p, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(a => new THREE.Vector3(...a))), 12, r, 6, false), m); }
export function consolidate(root: THREE.Group) { root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(); const sets = new Map<THREE.Material, THREE.BufferGeometry[]>(); const removals: THREE.Object3D[] = []; root.traverse(o => { if (o instanceof THREE.Mesh && !Array.isArray(o.material)) {
    const g = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    g.deleteAttribute('uv');
    const list = sets.get(o.material) || [];
    list.push(g);
    sets.set(o.material, list);
    removals.push(o);
} }); for (const o of removals)
    o.removeFromParent(); for (const [m, gs] of sets) {
    const g = mergeGeometries(gs.map(g => g.index ? g.toNonIndexed() : g));
    if (g) {
        const combined = mesh(root, g, m);
        combined.userData.ownedGeometry = true;
    }
    gs.forEach(g => g.dispose());
} }
export function arch(p: THREE.Object3D, m: THREE.Material, x: number, y: number, z: number, w: number, h: number, depth = .08) { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0); const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 }); return mesh(p, g, m, x, y, z); }
export function tuft(p: THREE.Object3D, x: number, y: number, z: number, size: number, rng: () => number) { for (let i = 0; i < 3; i++) {
    const o = mesh(p, new THREE.ConeGeometry(.055, size, 3), i % 2 ? M.moss : M.mossLight, x + (rng() - .5) * .18, y + size * .4, z + (rng() - .5) * .18);
    o.rotation.z = (rng() - .5) * .6;
    o.rotation.x = (rng() - .5) * .6;
} }
export function lantern(p: THREE.Object3D, x: number, y: number, z: number) { cyl(p, M.brass, x, y + .24, z, .018, .18); box(p, M.iron, x, y, z, .22, .32, .22); box(p, M.window, x, y, z, .185, .245, .185); for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    cyl(p, M.iron, x + Math.cos(a) * .14, y, z + Math.sin(a) * .14, .018, .33);
} mesh(p, new THREE.ConeGeometry(.2, .12, 4), M.iron, x, y + .22, z); }
