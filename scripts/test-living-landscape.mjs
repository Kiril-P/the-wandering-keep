import {build} from 'esbuild';
import assert from 'node:assert/strict';
const output=await build({stdin:{contents:"export * as THREE from 'three';export * from './src/world/footsteps';export * from './src/world/journey';export * from './src/world/encounters';export * from './src/creature';export {createWildlife} from './src/world/wildlife';export {renderedHeight} from './src/world/terrain';export {vegetationLibrary,populateVegetation} from './src/world/vegetation';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {THREE,createFootsteps,journeyAt,encounterEnvelope,createCreature,TRAVEL_SPEED,createEncounters,createWildlife,renderedHeight,vegetationLibrary,populateVegetation}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const root=new THREE.Group(),feet=createFootsteps(root),creature=createCreature();
for(let i=0;i<=900;i++){const t=i/60;creature.update(t,false,t,1);feet.update(creature.legs,t*TRAVEL_SPEED,t);}
assert.ok(feet.count>=24&&feet.count<=30,'One mark per landing');
const count=feet.count,initial=Array.from(feet.prints.instanceMatrix.array);
for(let i=0;i<50;i++)feet.update(creature.legs,15*TRAVEL_SPEED,15);
assert.equal(feet.count,count,'Paused legs never generate duplicate contacts');assert.deepEqual(Array.from(feet.prints.instanceMatrix.array),initial);
const matrix=new THREE.Matrix4();feet.prints.getMatrixAt(0,matrix);const anchored=matrix.elements[12]-15*TRAVEL_SPEED;
creature.update(15.01);feet.update(creature.legs,15.01*TRAVEL_SPEED,15.01);feet.prints.getMatrixAt(0,matrix);assert.ok(Math.abs(matrix.elements[12]-15.01*TRAVEL_SPEED-anchored)<1e-5,'Footprint remains in route coordinates');
for(let i=901;i<9000;i++){const t=i/60;creature.update(t);feet.update(creature.legs,t*TRAVEL_SPEED,t);}
assert.equal(feet.prints.count,64);assert.equal(feet.dust.geometry.attributes.position.count,144);assert.equal(feet.pebbles.count,16);
feet.update(creature.legs,149.99*TRAVEL_SPEED,149.99,true);assert.equal(feet.dust.visible,false);assert.equal(feet.pebbles.visible,false);assert.ok(feet.feet.value.every(p=>p.x>1000));
console.log('PASS Contact-triggered footprints, route anchoring, pause, bounded long-session pools and reduced motion');
assert.equal(journeyAt(-110).woodland,1);assert.equal(journeyAt(-240).overlook,1);assert.equal(journeyAt(0).meadow,1);
for(let x=-1000;x<1000;x+=.1){const a=journeyAt(x),b=journeyAt(x+.1);assert.ok(Math.abs(a.woodland-b.woodland)<.01);assert.ok(Math.abs(a.overlook-b.overlook)<.01);assert.ok(Math.abs(a.meadow+a.woodland+a.overlook-1)<1e-10);}
const lib=vegetationLibrary({value:0}),forest=new THREE.Group(),overlook=new THREE.Group();populateVegetation(forest,-96,lib,.6);populateVegetation(overlook,-240,lib,.6);
const trees=g=>g.children.filter(o=>o.isInstancedMesh&&lib.variants.some(v=>v.leafG===o.geometry)).reduce((n,o)=>n+o.count,0);
assert.ok(trees(forest)>trees(overlook)*2,'A sheltered stretch must differ substantially from its reveal');
assert.ok(forest.getObjectByName('Morrow-responsive verge grass'));
console.log('PASS Continuous woodland/meadow/overlook transitions and contrasting tree populations');
const eRoot=new THREE.Group(),night={value:1},encounters=createEncounters(eRoot,night);
encounters.update(35,37);const looking=encounters.deer.root.rotation.y;encounters.update(52,40);assert.notEqual(encounters.deer.root.rotation.y,looking,'Deer turns away before retreating');
encounters.deer.root.updateMatrixWorld(true);
for(const leg of encounters.deer.legs){const p=leg.hoof.getWorldPosition(new THREE.Vector3());assert.ok(p.y>=renderedHeight(p.x-52,p.z)+.045,'Hooves stay above rendered ground');}
const frozen=encounters.deer.root.position.clone();encounters.update(52,40);assert.deepEqual(encounters.deer.root.position,frozen);
encounters.update(180,45);assert.equal(encounters.deer.root.visible,false,'Leave quiet gaps between deer');
assert.equal(encounters.flowers.count,48);assert.equal(encounterEnvelope(37),1);assert.equal(encounterEnvelope(100),0);
const clock={value:37},w=createWildlife(new THREE.Group(),clock,night);w.update(40,[],false,0,37);
const fire=w.fireflies.geometry.attributes.position;for(let i=0;i<fire.count;i++){assert.ok(Math.abs(fire.getX(i))<4.8);assert.ok(Math.abs(fire.getZ(i))<4.2);}
w.update(40,[],false,0,100);assert.ok(Array.from(fire.array).some(v=>Math.abs(v)>10),'Fireflies disperse after the rare gathering');
const perches=[{x:-30,y:6,z:-10}];w.update(0,perches);const perched=w.liftBirds[0].body.position.y;
for(let d=1;d<=24;d++)w.update(d,perches);assert.ok(w.liftBirds[0].body.position.y>perched+4,'Swallows lift from an actual grove perch as Morrow approaches');
console.log('PASS Watch/retreat deer, grounded hooves, sparse flower/firefly encounters and reactive perched birds');
