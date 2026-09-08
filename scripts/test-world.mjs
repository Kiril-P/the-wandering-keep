import {build} from 'esbuild';
import assert from 'node:assert/strict';
const output=await build({stdin:{contents:"export * as THREE from 'three'; export {createWorld} from './src/world'; export {surfaceHeight,renderedHeight,SECTION_SIZE,TERRAIN_SEGMENTS,WATER_LEVEL,riverProfile,regionAt,createTerrain,waterfallSites,riverCenter} from './src/world/terrain'; export {waterfallPath,ribbon,riverSurface} from './src/world/water'; export {mountain} from './src/world/landmarks'; export {fracturedRock} from './src/world/geology'; export {createWildlife} from './src/world/wildlife';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {THREE,createWorld,surfaceHeight,renderedHeight,SECTION_SIZE,TERRAIN_SEGMENTS,WATER_LEVEL,riverProfile,regionAt,createTerrain,waterfallSites,riverCenter,waterfallPath,ribbon,riverSurface,mountain,fracturedRock,createWildlife}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
for(let x=-1800;x<500;x+=3.1)for(const z of [-4.9,-3.95,-2.75,0,2.75,3.95,4.9])assert.equal(surfaceHeight(x,z),-.08,'Walking/gathering corridor remains level');
const material=new THREE.MeshBasicMaterial();
for(const index of [-7,-5,-3,-2,-1,0,1]){
 const a=createTerrain(index*SECTION_SIZE,material),b=createTerrain((index+1)*SECTION_SIZE,material);
 const ap=a.geometry.attributes.position,bp=b.geometry.attributes.position,ac=a.geometry.attributes.color,bc=b.geometry.attributes.color;
 for(let row=0;row<ap.count/(TERRAIN_SEGMENTS+1);row++){
  const ai=row*(TERRAIN_SEGMENTS+1)+TERRAIN_SEGMENTS,bi=row*(TERRAIN_SEGMENTS+1);
  assert.equal(ap.getY(ai),bp.getY(bi),'Neighbor sections must share edge elevations');
  assert.equal(ap.getZ(ai),bp.getZ(bi));
  for(const getter of ['getX','getY','getZ']) {
   assert.ok(Math.abs(ac[getter](ai)-bc[getter](bi))<1e-6,'Neighbor colors must meet');
   assert.ok(Math.abs(a.geometry.attributes.normal[getter](ai)-b.geometry.attributes.normal[getter](bi))<1e-6,'Lighting normals must meet across terrain sections');
  }
 }
 a.geometry.dispose();b.geometry.dispose();
}
const scene=new THREE.Scene(),world=createWorld(scene);let maxMeshes=0;
for(const distance of [0,47,49,96,149,151,260,389,391,560,960,1800,0]){
 world.update(distance,distance*2,false);world.setRegion(regionAt(-distance));scene.updateMatrixWorld(true);
 assert.equal(world.stats.sections,9,'Only nine route sections may remain live');
 const sections=world.root.children.filter(o=>o.name.startsWith('Route section '));assert.equal(sections.length,9);
 let meshes=0;world.root.traverse(o=>{if(o.isMesh||o.isSprite)meshes++;});maxMeshes=Math.max(maxMeshes,meshes);
 for(const section of sections){
  const terrain=section.children.find(o=>o.name==='Continuous ridge and terraced valley');assert.ok(terrain);
  for(const value of terrain.geometry.attributes.position.array)assert.ok(Number.isFinite(value));
 }
}
const firstScene=new THREE.Scene(),first=createWorld(firstScene);first.update(560,0);
world.update(560,0);
const digest=w=>w.root.children.filter(o=>o.name.startsWith('Route section ')).sort((a,b)=>a.name.localeCompare(b.name)).map(section=>({name:section.name,x:section.position.x,trees:section.children.filter(o=>o.isInstancedMesh).map(o=>Array.from(o.instanceMatrix.array))}));
assert.deepEqual(digest(world),digest(first),'Reloading the same route reproduces vegetation and section placement');
console.log('PASS World seams, flat foot-contact corridor, region traversal, bounded sections, and deterministic reload',{maxMeshes,sections:world.stats.sections});

for(const origin of [-576,-384,-192,0,96])for(const side of [-1,1]) {
 for(const [x,width] of waterfallSites(origin,side)) {
  const path=waterfallPath(origin,x,side,width),end=path.at(-1);
  assert.equal(end.y,-10.54,'Waterfall mouth must finish just under the receiving river');
  assert.ok(Math.abs(end.z-side*riverCenter(origin+x,side))<1e-10,'Every fall must actually reach its river');
  path.forEach(p=>assert.ok(p.toArray().every(Number.isFinite)));
  const fall=ribbon(path,width,material,true),pos=fall.geometry.attributes.position,cols=pos.count/path.length;
  let depth=0;
  for(let row=0;row<path.length;row++) {
   const l=new THREE.Vector3().fromBufferAttribute(pos,row*cols),r=new THREE.Vector3().fromBufferAttribute(pos,row*cols+cols-1);
   const middle=new THREE.Vector3().fromBufferAttribute(pos,row*cols+Math.floor(cols/2));
   const line=new THREE.Line3(l,r),closest=new THREE.Vector3();line.closestPointToPoint(middle,true,closest);
   depth=Math.max(depth,middle.distanceTo(closest));
  }
  assert.ok(depth>.12,'A cascade must have a rounded cross-section rather than a flat strip');
  fall.geometry.dispose();
 }
}
const rocks=[1,2,3].map(seed=>fracturedRock(seed,new THREE.Color(0x70867c),seed%3));
assert.notDeepEqual(Array.from(rocks[0].attributes.position.array),Array.from(rocks[1].attributes.position.array),'Formation seeds must change geometry');
assert.deepEqual(Array.from(rocks[0].attributes.position.array),Array.from(fracturedRock(1,new THREE.Color(0x70867c),1).attributes.position.array),'Rock regeneration must be deterministic');
// Visible mountain sides must face outward, not expose the inside of a hollow mesh.
const ridge=new THREE.Group();mountain(ridge,0,0,45,35,0,812,0);
const mg=ridge.children[0].geometry,mp=mg.attributes.position,mn=mg.attributes.normal;let outward=0,total=0;
for(let i=0;i<mp.count-33;i+=3) {
 const center=new THREE.Vector3().fromBufferAttribute(mp,i).add(new THREE.Vector3().fromBufferAttribute(mp,i+1)).add(new THREE.Vector3().fromBufferAttribute(mp,i+2)).divideScalar(3);
 if(center.x*mn.getX(i)+center.z*mn.getZ(i)>0)outward++;
 total++;
}
assert.ok(outward/total>.95,'Mountain side faces must point outward');
const clock={value:0},night={value:0},lifeRoot=new THREE.Group(),wildlife=createWildlife(lifeRoot,clock,night);
wildlife.update(0);const start=wildlife.birds.map(b=>b.body.position.clone());
clock.value=4;wildlife.update(0);
assert.ok(wildlife.birds.every((b,i)=>b.body.position.distanceTo(start[i])>1),'Birds must travel through the valley');
const count=lifeRoot.children[0].children.length;
for(let i=0;i<120;i++){clock.value=i/12;wildlife.update(i*.1);}
assert.equal(lifeRoot.children[0].children.length,count,'Wildlife animation must retain a fixed population');
night.value=1;wildlife.update(0);assert.equal(wildlife.fireflies.visible,true);
night.value=0;wildlife.update(0);assert.equal(wildlife.fireflies.visible,false);
console.log('PASS Varied seeded rocks, outward mountain faces, rounded cascades reaching rivers, and bounded wildlife');
world.update(560,100,true);
const wildlifePose=()=>{
 const animals=world.root.getObjectByName('Valley wildlife');
 return animals.children.map(o=>({name:o.name,position:o.position.toArray(),rotation:o.quaternion.toArray(),instances:o.isInstancedMesh?Array.from(o.instanceMatrix.array):null}));
};
const quietWildlife=wildlifePose();world.update(560,200,true);
assert.deepEqual(wildlifePose(),quietWildlife,'Reduced motion must freeze wildlife at a fixed route position');
console.log('PASS World reduced-motion integration freezes decorative wildlife');

let minWidth=Infinity,maxWidth=0;
for(let x=-1800;x<500;x+=2.7)for(const side of [-1,1]) {
 const profile=riverProfile(x,side),width=profile.nearWidth+profile.farWidth;
 minWidth=Math.min(minWidth,width);maxWidth=Math.max(maxWidth,width);
 for(const edge of [profile.center-profile.nearWidth,profile.center+profile.farWidth]) {
  assert.ok(Math.abs(surfaceHeight(x,side*edge)-WATER_LEVEL)<1e-8,'Terrain must meet the shared waterline at both banks');
 }
 assert.ok(surfaceHeight(x,side*profile.center)<WATER_LEVEL-2,'The channel center must remain submerged');
 assert.ok(surfaceHeight(x,side*(profile.center-profile.nearWidth-1))>WATER_LEVEL,'The near beach must rise above water');
 assert.ok(surfaceHeight(x,side*(profile.center+profile.farWidth+1))>WATER_LEVEL,'The far beach must rise above water');
}
assert.ok(maxWidth-minWidth>7,'The journey must contain meaningfully different channel widths');
for(const origin of [-576,-384,-192,0,96])for(const side of [-1,1]) {
 const a=riverSurface(origin,side,material),b=riverSurface(origin+SECTION_SIZE,side,material),columns=a.userData.columns;
 const ap=a.geometry.attributes.position,bp=b.geometry.attributes.position,ad=a.geometry.attributes.aDepth,bd=b.geometry.attributes.aDepth;
 for(let j=0;j<columns;j++) {
  const ai=TERRAIN_SEGMENTS*columns+j;
  assert.equal(ap.getX(ai)+origin,bp.getX(j)+origin+SECTION_SIZE);
  assert.equal(ap.getY(ai),bp.getY(j));assert.equal(ap.getZ(ai),bp.getZ(j));
  assert.equal(ad.getX(ai),bd.getX(j),'Depth shading must meet across river sections');
 }
 for(let i=0;i<ap.count;i+=columns) {
  assert.ok(surfaceHeight(origin+ap.getX(i),ap.getZ(i))>WATER_LEVEL,'Water mesh edges must be buried beneath the bank');
  assert.ok(surfaceHeight(origin+ap.getX(i+columns-1),ap.getZ(i+columns-1))>WATER_LEVEL);
 }
 a.geometry.dispose();b.geometry.dispose();
 for(const [x,width] of waterfallSites(origin,side))for(const p of waterfallPath(origin,x,side,width)) {
  const profile=riverProfile(origin+p.x,side);
  if(Math.abs(p.z)>profile.center+profile.farWidth)
   assert.ok(p.y>Math.max(surfaceHeight(origin+p.x,p.z),renderedHeight(origin+p.x,p.z))+.05,'Runoff must clear the dry bank until it reaches the river');
 }
}
console.log('PASS Shared wet/dry banks, changing river widths, continuous water/depth seams, buried mesh edges, and waterfall bank clearance', {minWidth,maxWidth});
for(const origin of [-192,0,576]) {
 const ground=createTerrain(origin,material);ground.updateMatrixWorld(true);
 for(const x of [-45.75,-12.4,19.9])for(const z of [15.1,32.4,riverProfile(origin+x,-1).center+riverProfile(origin+x,-1).farWidth]) {
  const ray=new THREE.Raycaster(new THREE.Vector3(x,150,-z),new THREE.Vector3(0,-1,0));
  const hit=ray.intersectObject(ground)[0];assert.ok(hit);
  assert.ok(Math.abs(hit.point.y-renderedHeight(origin+x,-z))<1e-5,'Surface sampler must agree with raycasts against rendered triangles');
 }
 ground.geometry.dispose();
}
console.log('PASS Rendered-height sampler agrees with terrain raycasts');
