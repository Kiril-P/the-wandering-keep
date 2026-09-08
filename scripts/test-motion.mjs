import { build } from 'esbuild';
import assert from 'node:assert/strict';

const output = await build({
  stdin: {
    contents: "export { createCreature, GAIT, TRAVEL_SPEED } from './src/creature'; export { BASE_SPEED } from './src/balance';",
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const { createCreature, GAIT, TRAVEL_SPEED, BASE_SPEED } = await import(
  'data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].text).toString('base64')
);
assert.ok(Math.abs(TRAVEL_SPEED - BASE_SPEED) < 1e-12, 'Gait must match the economy travel speed');
const creature = createCreature();
let maxDrift = 0, maxJointError = 0;
for (const pace of [.5, 1, 1.5]) {
  for (const awakening of [1, 1.35]) {
    const previous = [];
    for (let frame = 0; frame < 1200; frame++) {
      const time = frame / 120 * pace * awakening;
      creature.update(time);
      creature.legs.forEach((leg, i) => {
        const phase = (time / GAIT.period + leg.phase) % 1;
        const groundX = leg.foot.x - time * TRAVEL_SPEED;
        const last = previous[i];
        if (last && last.phase < GAIT.stance && phase < GAIT.stance && phase >= last.phase) {
          maxDrift = Math.max(maxDrift, Math.abs(groundX - last.groundX));
        }
        const ankle = leg.ankle;
        maxJointError = Math.max(maxJointError,
          Math.abs(leg.hip.distanceTo(leg.knee) - 1.64),
          Math.abs(leg.knee.distanceTo(ankle) - 1.56));
        assert.ok(leg.foot.y >= .0199, 'A foot must not penetrate the ground');
        previous[i] = { phase, groundX };
      });
    }
  }
}
assert.ok(maxDrift < 1e-10, 'Planted feet must stay attached to moving ground');
assert.ok(maxJointError < 1e-10, 'The rig must preserve both limb lengths');
console.log('PASS Six-leg ground contact and joint reach at every pace and awakening level', { maxDrift, maxJointError });

// Check the moving anatomy itself, including extremes between gait samples.
let tailMotion = 0, previousTip;
for (let frame = 0; frame < 2400; frame++) {
  const life = frame / 120;
  if (frame === 200) creature.react(1);
  creature.update(life, false, life);
  creature.root.updateMatrixWorld(true);
  creature.tail.forEach(({ joint, length, radius }, i) => {
    const start = joint.position.clone().set(0, 0, 0).applyMatrix4(joint.matrixWorld);
    const end = start.clone().set(length, 0, 0).applyMatrix4(joint.matrixWorld);
    assert.ok(start.y - radius > 1.1 && end.y > 1.3, 'Tail must clear the ground throughout its swing');
    assert.ok(Math.abs(start.z) + radius < 1.25, 'Tail must stay inside the rear leg corridor');
    if (i) {
      const parent = creature.tail[i - 1];
      const socket = start.clone().set(parent.length, 0, 0).applyMatrix4(parent.joint.matrixWorld);
      assert.ok(start.distanceTo(socket) < 1e-10, 'Articulated tail joints must stay connected');
    }
    if (i === creature.tail.length - 1) {
      if (previousTip) tailMotion += end.distanceTo(previousTip);
      previousTip = end.clone();
    }
  });
  creature.root.traverse(o => assert.ok(o.matrixWorld.elements.every(Number.isFinite), 'Every animated transform must remain finite'));
}
assert.ok(tailMotion > 2, 'Tail must have visible movement');
// A stopped journey settles airborne feet but keeps an independent idle pose.
const stopTime = GAIT.period * .84;
creature.update(stopTime, false, 21, 0);
const idleHeight = creature.body.position.y;
creature.update(stopTime, false, 22, 0);
assert.notEqual(creature.body.position.y, idleHeight, 'Paused Morrow should continue breathing');
creature.legs.forEach(leg => {
  assert.equal(leg.foot.y, .02, 'Stopped feet must rest on the ground');
  assert.equal(leg.sole.rotation.z, 0, 'Stopped soles must lie flat');
  assert.ok(Math.abs(leg.knee.distanceTo(leg.ankle) - 1.56) < 1e-10);
});
creature.update(3, true, 24, 1);
const quietPose = [creature.body.position.y, creature.head.rotation.y, creature.bell.rotation.z, ...creature.tail.map(t => t.joint.rotation.y)];
creature.update(3, true, 26, 1);
assert.deepEqual([creature.body.position.y, creature.head.rotation.y, creature.bell.rotation.z, ...creature.tail.map(t => t.joint.rotation.y)], quietPose, 'Reduced motion must suppress decorative sway');
console.log('PASS Connected tail, clearance, idle breathing, planted pause, finite transforms, and reduced motion');
// The actual lid must sweep over the visible eye, then reopen fully.
creature.update(0, false, 7.44, 0);
creature.lids.forEach(lid => {
  assert.ok(lid.position.y - lid.scale.y < -.09, 'Closed lid must cover the lower eye');
  assert.ok(lid.position.y + lid.scale.y > .35, 'Closed lid must cover the upper eye');
});
creature.update(0, false, 8, 0);
creature.lids.forEach(lid => assert.ok(lid.position.y - lid.scale.y > .35, 'Open lid must clear the eye'));
// Cover every possible stop phase and the complete settle/resume ramp.
for (let phase = 0; phase < 1; phase += .025) {
  for (const motion of [0, .1, .5, 1]) {
    creature.update(phase * GAIT.period, false, phase * 10, motion);
    for (const leg of creature.legs) {
      assert.ok(Math.abs(leg.hip.distanceTo(leg.knee) - 1.64) < 1e-10);
      assert.ok(Math.abs(leg.knee.distanceTo(leg.ankle) - 1.56) < 1e-10);
      if (!motion) assert.equal(leg.foot.y, .02);
    }
  }
}
console.log('PASS Eyelid coverage and joint reach throughout pause/resume transitions');
