import { build as bundle } from 'esbuild';
import assert from 'node:assert/strict';

const output = await bundle({
  stdin: {
    contents: "export * as THREE from 'three'; export { createCreature } from './src/creature'; export { createWorld } from './src/world'; export { createSettlement } from './src/settlement'; export * from './src/game';",
    resolveDir: process.cwd(),
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
});
const { THREE, createCreature, createWorld, createSettlement, freshState, build, upgradeBuilding, removeBuilding, serialize, deserialize } = await import(
  'data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].text).toString('base64')
);

function setup(state) {
  const scene = new THREE.Scene(), creature = createCreature();
  scene.add(creature.root);
  createWorld(scene);
  const settlement = createSettlement(creature.body, scene, creature.castle.root, creature.castle.setLevel);
  settlement.sync(state, null);
  return { scene, creature, settlement };
}

const state = freshState();
state.resources = { stone: 10000, essence: 10000, runes: 10000 };
state.keepLevel = 3;
state.expansions = 2;
const { scene, creature, settlement } = setup(state);
function groundMeshes() {
  const ids = [];
  scene.traverse(object => {
    if (!object.isMesh) return;
    for (let parent = object; parent; parent = parent.parent) {
      if (parent === creature.root) return;
    }
    ids.push(object.uuid);
  });
  return ids.sort();
}
const originalGround = groundMeshes();
// Check the actual consolidated roof, including the animated castle transforms.
function checkFlagAttachment() {
  scene.updateMatrixWorld(true);
  const castle = creature.castle.root;
  const mast = castle.getObjectByName('Embedded flag mast');
  const flag = castle.getObjectByName('Pinned turret pennant');
  assert.ok(mast && flag, 'The pennant has one supported mast');
  mast.geometry.computeBoundingBox();
  const localBounds = mast.geometry.boundingBox;
  const mastBottom = castle.worldToLocal(mast.localToWorld(new THREE.Vector3(0, localBounds.min.y, 0)));
  const origin = castle.localToWorld(new THREE.Vector3(mastBottom.x + .02, mastBottom.y + 3, mastBottom.z));
  const direction = new THREE.Vector3(0, -1, 0).transformDirection(castle.matrixWorld);
  const hit = new THREE.Raycaster(origin, direction).intersectObject(castle.getObjectByName(`Keep tower level ${creature.castle.level}`), true)[0];
  assert.ok(hit, 'Mast must sit directly over solid roof geometry');
  const roofTop = castle.worldToLocal(hit.point.clone());
  assert.ok(mastBottom.y < roofTop.y - .1, 'Mast embeds in the roof instead of floating above it');
  const positions = flag.geometry.attributes.position;
  let pinned = 0;
  for (let i = 0; i < positions.count; i++) {
    if (Math.abs(positions.getX(i)) > 1e-6) continue;
    const point = new THREE.Vector3().fromBufferAttribute(positions, i);
    mast.worldToLocal(flag.localToWorld(point));
    assert.ok(Math.hypot(point.x, point.z) < .034, 'Cloth hoist stays on the mast throughout the wave');
    assert.ok(point.y >= localBounds.min.y && point.y <= localBounds.max.y, 'Pole supports the entire hoist');
    pinned++;
  }
  assert.ok(pinned > 1);
}

function checkPlacement(view = settlement, currentScene = scene, currentState = state) {
  currentScene.updateMatrixWorld(true);
  const buildings = view.targets.filter(object => object.userData.pick?.type === 'building');
  assert.equal(buildings.length, currentState.buildings.length, 'One visible building per purchase');
  for (const building of buildings) {
    assert.ok(new THREE.Box3().setFromObject(building).min.y > 3.9, 'Forge geometry must stay above the shell/deck');
  }
}

function checkSlotHighlights(placing) {
  const pads = settlement.targets.filter(o => o.userData.pick?.type === 'pad');
  for (const pad of pads) {
    const index = pad.userData.pick.pad;
    const available = index < 3 + state.expansions * 3 && !state.buildings.some(b => b.pad === index);
    assert.equal(pad.visible, available, 'Only empty unlocked slots are available');
    assert.equal(pad.children[0].visible, placing && available, 'Only available slots highlight during placement');
    if (available) {
      const socket = settlement.root.children.find(o => o.isMesh && o.geometry.type === 'CylinderGeometry' && o.position.x === pad.position.x && o.position.z === pad.position.z);
      assert.ok(socket, 'Each slot has a physical supporting socket');
      socket.geometry.computeBoundingBox();
      assert.ok(pad.position.y > socket.position.y + socket.geometry.boundingBox.max.y, 'Slot fill must sit above the wooden surface');
    }
  }
}
for (const expansions of [0, 1, 2]) {
  state.expansions = expansions;
  settlement.sync(state, 'forge'); checkSlotHighlights(true);
  settlement.sync(state, null); checkSlotHighlights(false);
}

// Match the UI's preview -> purchase sync -> selection/preview removal sequence.
for (let pad = 0; pad < 9; pad++) {
  settlement.sync(state, 'forge');
  checkSlotHighlights(true);
  settlement.preview(pad);
  settlement.sync(state, null); // cancelled preview
  checkSlotHighlights(false);
  assert.deepEqual(groundMeshes(), originalGround);
  settlement.sync(state, 'forge');
  assert.equal(build(state, 'forge', pad), true);
  settlement.sync(state, 'forge');
  checkSlotHighlights(true);
  settlement.sync(state, null);
  checkSlotHighlights(false);
  const id = state.buildings.at(-1).id;
  for (let level = 1; level <= 3; level++) {
    if (level > 1) assert.equal(upgradeBuilding(state, id), true);
    settlement.sync(state, null);
    creature.update(pad * .43 + level);
    settlement.update(state, pad * .43 + level);
    checkPlacement();
    checkFlagAttachment();
    assert.deepEqual(groundMeshes(), originalGround, 'Purchases/upgrades must never add ground geometry');
  }
}
const restored = deserialize(serialize(state));
assert.ok(restored);
const loaded = setup(restored);
checkPlacement(loaded.settlement, loaded.scene, restored);
for (const building of [...state.buildings]) {
  assert.equal(removeBuilding(state, building.id), true);
  settlement.sync(state, null);
  checkPlacement();
}
assert.deepEqual(groundMeshes(), originalGround);
console.log('PASS Rune Forge placement, preview cancellation, all pads and levels, reload, and removal create no ground duplicates');

console.log('PASS Flag mast embeds in the consolidated roof and cloth remains pinned during motion');

console.log('PASS Visible slot surfaces, unlocked/occupied filtering, selection, purchase, full platform, and cancellation highlights');

const heights = [], widths = [];
for (const level of [1, 2, 3]) {
  state.keepLevel = level;
  settlement.sync(state, null);
  scene.updateMatrixWorld(true);
  const stage = creature.castle.root.getObjectByName(`Keep tower level ${level}`);
  const bounds = new THREE.Box3().setFromObject(stage);
  heights.push(bounds.max.y - bounds.min.y); widths.push(bounds.max.x - bounds.min.x);
  assert.equal(creature.castle.level, level);
  assert.equal(creature.castle.root.children.filter(o => o.name.startsWith('Keep tower level') && o.visible).length, 1);
  checkFlagAttachment();
}
assert.ok(heights[1] > heights[0] * 1.8, 'Level 2 adds a clearly taller upper chamber');
assert.ok(heights[2] > heights[0] * 3, 'Level 3 is a cartoonishly tall tower');
assert.ok(widths[2] > widths[0] * 3, 'Level 3 upper storeys dramatically overhang the original turret');
for (const level of [1, 3, 2, 3, 3]) { state.keepLevel = level; settlement.sync(state, null); }
assert.equal(creature.castle.root.children.filter(o => o.name.startsWith('Keep tower level')).length, 3, 'Repeated sync/reload transitions reuse stage geometry');
console.log('PASS Keep stage silhouettes, single active stage, cached transitions, and flag attachment', { heights, widths });
