import * as THREE from 'three';
import { M, mesh, rock, sphere, cyl, box, tube, beam, rand, consolidate, tuft, lantern } from './art';
import { createCastle } from './castle';
import { BASE_SPEED } from './balance';
// Shorter, more frequent steps retain the same ground speed and planted contact.
export const GAIT = { period: 3.2, stance: .68, stride: BASE_SPEED * 3.2 * .68 };
export const TRAVEL_SPEED = GAIT.stride / (GAIT.period * GAIT.stance);
export function createCreature() {
    const root = new THREE.Group();
    root.name = 'Morrow';
    const body = new THREE.Group();
    root.add(body);
    const shell = new THREE.Group();
    body.add(shell);
    const rng = rand(29);
    const belly = sphere(body, M.stoneDark, .25, 2.9, 0, 3.0, 1.13, 1.92);
    sphere(shell, M.stone, 0, 3.42, 0, 3.43, 1.3, 2.36);
    // Hexagonal scutes sampled onto an ellipsoidal shell create actual separated plates.
    const height = (x: number, z: number) => 3.42 + 1.32 * Math.sqrt(Math.max(.04, 1 - (x / 3.65) ** 2 - (z / 2.62) ** 2));
    for (let row = -3; row <= 3; row++)
        for (let col = -4; col <= 4; col++) {
            const x = col * .8 + (row % 2) * .4, z = row * .68;
            if ((x / 3.27) ** 2 + (z / 2.15) ** 2 > 1)
                continue;
            const verts: number[] = [];
            const centerY = height(x, z) + .1;
            const radius = .44; // Leave a seam between adjacent scutes, avoiding intersecting edges.
            for (let i = 0; i < 6; i++) {
                const a = i / 6 * Math.PI * 2 + Math.PI / 6, b = (i + 1) / 6 * Math.PI * 2 + Math.PI / 6;
                const x1 = x + Math.cos(a) * radius, z1 = z + Math.sin(a) * radius, x2 = x + Math.cos(b) * radius, z2 = z + Math.sin(b) * radius;
                const y1 = height(x1, z1), y2 = height(x2, z2);
                verts.push(x, centerY, z, x2, y2, z2, x1, y1, z1, x1, y1, z1, x2, y2, z2, x1, y1 - .14, z1, x1, y1 - .14, z1, x2, y2, z2, x2, y2 - .14, z2);
            }
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
            g.computeVertexNormals();
            mesh(shell, g, rng() > .65 ? M.shellLight : M.shell);
            if (rng() > .56 && Math.abs(z) > 1.1) {
                rock(shell, M.moss, x, centerY + .005, z, .33, .065, .26);
                tuft(shell, x, centerY - .035, z, .22, rng);
            }
        }
    // Rim stones overlap like armor, keeping the underside readable.
    for (let i = 0; i < 22; i++) {
        const a = i / 22 * Math.PI * 2;
        const scute = rock(shell, i % 3 ? M.stoneLight : M.stone, Math.cos(a) * 3.19, 3.19, Math.sin(a) * 2.12, .62, .36, .35);
        scute.rotation.y = -a;
        scute.rotation.z = Math.sin(a) * .11;
    }
    for (const s of [-1, 1]) {
        tube(shell, M.rune, [[-2.7, 3.54, s * 1.43], [-2.3, 3.78, s * 1.63], [-1.93, 3.62, s * 1.89], [-1.57, 3.69, s * 1.9]], .025);
        tube(shell, M.rune, [[.7, 3.73, s * 2.03], [1.1, 3.58, s * 2.02], [1.37, 3.67, s * 1.91], [1.7, 3.51, s * 1.89]], .023);
        for (let i = 0; i < 7; i++) {
            const x = -2.6 + i * .82;
            tube(shell, M.wood, [[x, 3.4, s * 2.12], [x - .08, 3.09, s * 2.26], [x + .07, 2.88, s * 2.22]], .025);
            if (i % 2 === 0)
                rock(shell, M.moss, x, 3.46, s * 2.08, .28, .13, .25);
        }
    }
    // Local +X bones form a real tapered chain. Rounded overlapping joints
    // cover the bend, and each armor plate travels with its own segment.
    const tail: { joint: THREE.Group; length: number; radius: number }[] = [];
    const lengths = [.65, .61, .55, .48, .43];
    const radii = [.46, .37, .29, .21, .13, .018];
    let tailParent = body;
    for (let i = 0; i < lengths.length; i++) {
        const joint = new THREE.Group();
        joint.name = `Tail joint ${i + 1}`;
        joint.position.set(i ? lengths[i - 1] : 2.63, i ? 0 : 2.83, 0);
        tailParent.add(joint);
        const art = new THREE.Group(); joint.add(art);
        const geometry = new THREE.CylinderGeometry(radii[i + 1], radii[i], lengths[i] + .05, 10);
        geometry.rotateZ(-Math.PI / 2); geometry.translate(lengths[i] / 2, 0, 0);
        mesh(art, geometry, M.stone);
        sphere(art, M.stoneDark, 0, 0, 0, radii[i] * .98, radii[i] * .94, radii[i] * .94);
        const plate = rock(art, M.stoneLight, lengths[i] * .4, radii[i] * .67, 0,
            lengths[i] * .64, radii[i] * .57, radii[i] * .9);
        plate.rotation.z = -.15;
        for (const side of [-1, 1])
            rock(art, M.shell, lengths[i] * .44, -.01, side * radii[i] * .69,
                lengths[i] * .49, radii[i] * .58, radii[i] * .35);
        if (i < 3) tube(art, M.rune, [[lengths[i] * .12, radii[i] * .86, 0],
            [lengths[i] * .4, radii[i] * 1.12, 0], [lengths[i] * .69, radii[i] * .76, 0]], .017);
        consolidate(art);
        tail.push({ joint, length: lengths[i], radius: radii[i] });
        tailParent = joint;
    }
    const neck = new THREE.Group();
    neck.position.set(-2.55, 2.9, 0);
    body.add(neck);
    sphere(neck, M.stone, -.42, -.12, 0, 1.0, .64, .77);
    for (let i = 0; i < 4; i++) {
        const ring = mesh(neck, new THREE.TorusGeometry(.56, .055, 5, 16), M.stoneDark, -.07 - i * .22, -.17, 0);
        ring.rotation.y = Math.PI / 2;
        ring.scale.y = 1.13;
    }
    const head = new THREE.Group();
    head.position.set(-1.0, -.05, 0);
    neck.add(head);
    const face = new THREE.Group();
    head.add(face);
    rock(face, M.stoneLight, -.34, .08, 0, .94, .65, .72);
    rock(face, M.stone, -.9, -.12, 0, .8, .4, .64);
    // A broad beak, jawline, flared cheeks, and nostrils make an expressive face.
    rock(face, M.stoneLight, -1.35, -.15, 0, .37, .23, .55);
    const jaw = new THREE.Group(); jaw.position.set(-.35, -.25, 0); head.add(jaw);
    rock(jaw, M.stoneDark, -.6, -.12, 0, .62, .12, .5);
    rock(jaw, M.stone, -.76, -.18, 0, .46, .075, .43);
    consolidate(jaw);
    const eyes: THREE.Group[] = [];
    tube(face, M.stoneDark, [[-1.55, -.27, -.37], [-1.67, -.26, 0], [-1.55, -.27, .37]], .027);
    for (const s of [-1, 1]) {
        rock(face, M.stone, -.19, -.14, s * .58, .35, .34, .22);
        sphere(face, M.dark, -.54, .13, s * .633, .24, .22, .065);
        const eye = new THREE.Group(); head.add(eye); eyes.push(eye);
        sphere(eye, M.brass, -.58, .145, s * .686, .123, .125, .033);
        sphere(eye, M.dark, -.615, .15, s * .712, .04, .09, .015);
        sphere(eye, M.window, -.645, .19, s * .726, .029, .028, .009);
        tube(face, M.stoneLight, [[-.86, .28, s * .62], [-.63, .39, s * .72], [-.35, .36, s * .69], [-.2, .25, s * .61]], .105);
        sphere(face, M.stoneDark, -1.4, .015, s * .33, .09, .055, .066);
        // Horn tips taper to a point instead of ending as cut-off tubes.
        const hornPath = new THREE.CatmullRomCurve3([
            new THREE.Vector3(.08, .31, s * .48), new THREE.Vector3(.16, .57, s * .68),
            new THREE.Vector3(.49, .82, s * .72), new THREE.Vector3(.7, .96, s * .60)]);
        const horn = new THREE.TubeGeometry(hornPath, 16, 1, 7, false);
        const hp = horn.attributes.position;
        for (let row = 0; row <= 16; row++) {
            const center = hornPath.getPointAt(row / 16), radius = .15 * (1 - row / 16) + .004;
            for (let col = 0; col <= 7; col++) {
                const index = row * 8 + col;
                hp.setXYZ(index, center.x + (hp.getX(index) - center.x) * radius,
                    center.y + (hp.getY(index) - center.y) * radius,
                    center.z + (hp.getZ(index) - center.z) * radius);
            }
        }
        horn.computeVertexNormals(); mesh(face, horn, M.stoneLight);
        rock(face, M.moss, .11, .57, s * .3, .28, .08, .19);
        tube(face, M.rune, [[.01, -.03, s * .752], [.1, -.2, s * .748], [.04, -.31, s * .713]], .021);
    }
    for (let i = 0; i < 8; i++)
        rock(face, i % 2 ? M.moss : M.mossLight, -.05 + rng() * .47, .56 + rng() * .04, (rng() - .5) * .58, .12, .07, .09);
    const lids: THREE.Mesh[] = [];
    for (const s of [-1, 1]) {
        const lid = sphere(head, M.stone, -.54, .36, s * .762, .25, .005, .044);
        lids.push(lid);
    }
    // A pendulum hangs from the cheek, with all pieces in the same moving frame.
    const bell = new THREE.Group(); bell.position.set(0, -.39, .49); head.add(bell);
    tube(bell, M.wood, [[0, 0, 0], [.025, -.19, .02], [0, -.35, 0]], .018);
    mesh(bell, new THREE.CylinderGeometry(.075, .13, .14, 8), M.brass, 0, -.41, 0);
    sphere(bell, M.brass, 0, -.5, 0, .03, .035, .03);
    consolidate(bell);
    consolidate(face);
    consolidate(shell);
    const castle = createCastle();
    castle.root.position.set(.25, 4.59, 0);
    body.add(castle.root);
    // Exterior saddle lanterns hang from supports at the shell's edge.
    const harness = new THREE.Group();
    body.add(harness);
    for (const s of [-1, 1]) {
        beam(harness, M.wood, new THREE.Vector3(.8, 4.7, s * .95), new THREE.Vector3(.65, 3.4, s * 2.28), .048);
        lantern(harness, .65, 3.28, s * 2.31);
    }
    consolidate(harness);
    type Leg = {
        hipLocal: THREE.Vector3;
        hip: THREE.Vector3;
        knee: THREE.Vector3;
        foot: THREE.Vector3;
        ankle: THREE.Vector3;
        toes: THREE.Group[];
        upper: THREE.Group;
        lower: THREE.Group;
        sole: THREE.Group;
        phase: number;
        side: number;
        baseX: number;
        lastPhase: number;
    };
    const legs: Leg[] = [];
    const legRoots = new THREE.Group();
    root.add(legRoots);
    function limb(length: number, thickness: number) { const g = new THREE.Group(); cyl(g, M.stone, 0, length * .5, 0, thickness, length); sphere(g, M.stoneDark, 0, .02, 0, thickness * .85, thickness * .9, thickness * .85); for (let i = 0; i < 3; i++) {
        rock(g, i % 2 ? M.stone : M.stoneLight, 0, length * (.22 + i * .27), 0, thickness * 1.17, length * .24, thickness * 1.1);
    } consolidate(g); legRoots.add(g); return g; }
    for (const s of [-1, 1])
        for (let i = 0; i < 3; i++) {
            const x = -2.15 + i * 2.03;
            const upper = limb(1.64, .39), lower = limb(1.56, .3), sole = new THREE.Group();
            legRoots.add(sole);
            rock(sole, M.stone, 0, .22, 0, .57, .36, .46);
            rock(sole, M.stoneLight, .04, .41, 0, .45, .19, .35);
            const toes: THREE.Group[] = [];
            box(sole, M.rune, 0, .46, 0, .05, .01, .26);
            consolidate(sole);
            for (let t = 0; t < 3; t++) {
                const toe = new THREE.Group(); toe.position.set(-.28, .14, (t - 1) * .24); sole.add(toe);
                rock(toe, M.stoneLight, -.13, -.02, 0, .26, .14, .12);
                rock(toe, M.stoneDark, -.29, -.04, 0, .11, .08, .10);
                consolidate(toe); toes.push(toe);
            }
            legs.push({ hipLocal: new THREE.Vector3(x, 2.86, s * 1.59), hip: new THREE.Vector3(), knee: new THREE.Vector3(), foot: new THREE.Vector3(), ankle: new THREE.Vector3(), toes, upper, lower, sole, phase: ((i + (s === 1 ? 1 : 0)) % 2) * .5, side: s, baseX: x, lastPhase: 0 });
        }
    const dir = new THREE.Vector3(), bend = new THREE.Vector3(), delta = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    let lastCycle = 0;
    function orient(g: THREE.Group, a: THREE.Vector3, b: THREE.Vector3) { g.position.copy(a); delta.subVectors(b, a).normalize(); g.quaternion.setFromUnitVectors(up, delta); }
    let reaction = 0, reactionTarget = 0, previousLife = 0;
    function react(strength = 1) { reactionTarget = Math.max(reactionTarget, THREE.MathUtils.clamp(strength, 0, 1)); }
    // Distance drives contact; a separate real-time clock keeps idle life at a
    // natural pace, even when the journey is paused or the player changes speed.
    function update(t: number, reduced = false, life = t, locomotion = 1) {
        const cycle = t / GAIT.period, gait = cycle * Math.PI * 2;
        const dt = Math.min(.1, Math.max(0, life - previousLife)); previousLife = life;
        reaction = THREE.MathUtils.damp(reaction, reactionTarget, 7, dt);
        reactionTarget = Math.max(0, reactionTarget - dt * .65);
        const movement = reduced ? 0 : THREE.MathUtils.clamp(locomotion, 0, 1);
        const breath = reduced ? 0 : Math.sin(life * 1.32);
        body.position.y = Math.sin(gait * 2) * .066 * movement + breath * .028;
        body.rotation.x = Math.sin(gait) * .024 * movement;
        body.rotation.z = Math.cos(gait * 2) * .014 * movement;
        belly.scale.y = 1.13 + breath * .022;
        belly.scale.z = 1.92 + breath * .018;
        neck.rotation.z = reduced ? 0 : Math.sin(gait * 2 - .7) * .022 * movement + breath * .012;
        head.rotation.y = reduced ? 0 : Math.sin(life * .37) * .11 + Math.sin(life * .14) * .035;
        head.rotation.z = reduced ? 0 : Math.sin(life * .63) * .045 + Math.sin(gait - .9) * .025 * movement + reaction * .12;
        head.position.y = -.05 + (reduced ? 0 : breath * .035 + reaction * .055);
        jaw.rotation.z = reduced ? 0 : .012 + (breath + 1) * .008;
        const pulse = (offset: number) => {
            const phase = ((life + offset) % 9.4 + 9.4) % 9.4;
            return phase < .28 ? Math.sin(phase / .28 * Math.PI) ** 2 : 0;
        };
        const blink = Math.max(pulse(2.1), pulse(2.56) * .94);
        lids.forEach(l => { l.scale.y = .004 + blink * .232; l.position.y = .362 - blink * .232; });
        eyes.forEach(eye => {
            eye.position.x = reduced ? 0 : Math.sin(life * .37) * .022;
            eye.position.y = reduced ? 0 : Math.sin(life * .23) * .012;
        });
        bell.rotation.z = reduced ? 0 : Math.sin(gait * 2 - 1) * .16 * movement + Math.sin(life * 1.32 - .7) * .035;
        bell.rotation.x = reduced ? 0 : Math.sin(gait - .8) * .1 * movement;
        tail.forEach(({ joint }, i) => {
            joint.rotation.y = reduced ? 0 : Math.sin(life * 1.1 - i * .52) * (.065 + i * .022) + Math.sin(gait - i * .48) * .04 * movement;
            joint.rotation.z = (i === 0 ? -.22 : .025) + (reduced ? 0 : Math.sin(life * .85 - i * .5) * .026 + reaction * .035);
        });
        root.updateMatrixWorld(true);
        for (const leg of legs) {
            const phase = (cycle + leg.phase) % 1;
            let x: number, y = 0, curl = 0;
            if (phase < GAIT.stance) {
                x = -GAIT.stride / 2 + phase / GAIT.stance * GAIT.stride;
            }
            else {
                const u = (phase - GAIT.stance) / (1 - GAIT.stance);
                const ease = u * u * (3 - 2 * u);
                x = GAIT.stride / 2 - ease * GAIT.stride;
                y = Math.sin(Math.PI * u) * .48 * locomotion;
                curl = Math.sin(Math.PI * u) ** 2 * movement;
            }
            leg.foot.set(leg.baseX + x, .02 + y, leg.side * 2.75);
            leg.sole.position.copy(leg.foot);
            leg.sole.rotation.z = curl * .12;
            leg.toes.forEach((toe, i) => toe.rotation.z = curl * (.22 + i * .025));
            leg.hip.copy(leg.hipLocal).applyMatrix4(body.matrixWorld);
            const ankle = leg.ankle.set(0, .41, 0).applyQuaternion(leg.sole.quaternion).add(leg.foot);
            const d = leg.hip.distanceTo(ankle), l1 = 1.64, l2 = 1.56;
            dir.subVectors(ankle, leg.hip).normalize();
            const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
            const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
            bend.set(.15, 0, leg.side);
            bend.addScaledVector(dir, -bend.dot(dir)).normalize();
            leg.knee.copy(leg.hip).addScaledVector(dir, a).addScaledVector(bend, h);
            orient(leg.upper, leg.hip, leg.knee);
            orient(leg.lower, leg.knee, ankle);
            leg.lastPhase = phase;
        }
        castle.update(t);
        lastCycle = cycle;
    }
    update(0);
    return { root, body, head, castle, legs, tail, eyes, lids, bell, update, react, get cycle() { return lastCycle; } };
}
