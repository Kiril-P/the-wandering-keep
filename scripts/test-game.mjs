import {build as bundle} from 'esbuild';
import assert from 'node:assert/strict';
const output=await bundle({entryPoints:['src/game.ts'],bundle:true,platform:'node',format:'esm',write:false});
const game=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const checks=[];
function test(name,fn){fn();checks.push(name);console.log('PASS',name);}
const advance=(s,seconds)=>{for(let i=0;i<Math.round(seconds*10);i++)game.tick(s,.1);};
test('Purchases, placement validation, cancellation invariants, and refund accounting',()=>{
 const s=game.freshState();assert.equal(game.build(s,'quarry',0),false);s.resources.stone=100;
 assert.equal(game.build(s,'quarry',0),true);assert.equal(s.resources.stone,80);assert.equal(game.build(s,'garden',0),false);assert.equal(game.build(s,'garden',3),false);assert.equal(s.resources.stone,80);
 s.resources.essence=10;assert.equal(game.upgradeBuilding(s,s.buildings[0].id),true);assert.equal(s.resources.stone,20);const id=s.buildings[0].id;
 assert.equal(game.removeBuilding(s,id),true);assert.equal(s.resources.stone,68);assert.equal(s.resources.essence,6);assert.equal(s.buildings.length,0);assert.equal(game.removeBuilding(s,id),false);
});
test('Forge recipes conserve inputs, stop on starvation, and resume on fresh inputs',()=>{
 const s=game.freshState();s.buildings=[{id:1,kind:'forge',pad:0,level:1}];s.resources={stone:4,essence:3,runes:0};advance(s,20);assert.ok(Math.abs(s.resources.runes-1)<1e-8);assert.ok(s.resources.stone<1e-8);assert.ok(s.resources.essence<1e-8);assert.match(game.buildingStatus(s,s.buildings[0]),/Waiting/);advance(s,5);assert.ok(Math.abs(s.resources.runes-1)<1e-8);s.resources.stone=4;s.resources.essence=3;advance(s,10);assert.ok(Math.abs(s.resources.runes-2)<1e-8);
});
test('Production and distance agree across fixed timestep resolutions',()=>{
 const a=game.freshState(),b=game.freshState();for(const s of [a,b]){s.buildings=[{id:1,kind:'quarry',pad:0,level:2},{id:2,kind:'garden',pad:1,level:2},{id:3,kind:'forge',pad:2,level:2}];}
 advance(a,60);for(let i=0;i<1200;i++)game.tick(b,.05);for(const r of ['stone','essence','runes'])assert.ok(Math.abs(a.resources[r]-b.resources[r])<1e-7);assert.ok(Math.abs(a.distance-b.distance)<1e-7);
});
test('Unlock conditions, expansion capacity, and capped watchtower bonus',()=>{
 const s=game.freshState();s.resources={stone:10000,essence:10000,runes:10000};assert.equal(game.expand(s),false);assert.equal(game.build(s,'watchtower',0),false);assert.equal(game.activateBeacon(s),false);assert.equal(game.upgradeKeep(s),true);assert.equal(game.expand(s),true);assert.equal(game.capacity(s),6);assert.equal(game.upgradeKeep(s),false);s.distance=151;assert.equal(game.upgradeKeep(s),true);assert.equal(game.expand(s),true);assert.equal(game.capacity(s),9);assert.equal(game.expand(s),false);s.buildings=[{id:4,kind:'watchtower',pad:0,level:3},{id:5,kind:'watchtower',pad:1,level:3}];assert.ok(Math.abs(game.bonus(s)-1.4)<1e-8);
});
test('Save/load restores economic and visual progression and rejects malformed state',()=>{
 const s=game.freshState();s.resources={stone:120.5,essence:4.2,runes:2};game.build(s,'quarry',0);advance(s,2);const loaded=game.deserialize(game.serialize(s));assert.ok(loaded);assert.deepEqual(loaded.resources,s.resources);assert.deepEqual(loaded.buildings,s.buildings);assert.deepEqual(loaded.outcrops,s.outcrops);assert.equal(loaded.spawnClock,s.spawnClock);assert.equal(loaded.distance,s.distance);assert.equal(loaded.elapsed,s.elapsed);assert.equal(game.deserialize('{'),null);assert.equal(game.deserialize(JSON.stringify({...s,keepLevel:99})),null);assert.equal(game.deserialize(JSON.stringify({...s,resources:{stone:-1,essence:0,runes:0}})),null);assert.equal(game.deserialize(JSON.stringify({...s,buildings:[...s.buildings,...s.buildings]})),null);
});
test('A full platform leaves the dedicated beacon socket available',()=>{
 const s=game.freshState();s.resources={stone:10000,essence:10000,runes:10000};s.keepLevel=3;s.expansions=2;s.distance=400;
 for(let pad=0;pad<9;pad++)assert.equal(game.build(s,'quarry',pad),true);
 assert.equal(game.build(s,'garden',9),false);assert.equal(game.activateBeacon(s),true);assert.equal(s.buildings.length,9);
 const id=s.buildings[0].id;assert.equal(game.upgradeBuilding(s,id),true);assert.equal(game.upgradeBuilding(s,id),true);const resources={...s.resources};assert.equal(game.upgradeBuilding(s,id),false);assert.deepEqual(s.resources,resources);
});
let completion;
test('A fresh journey reaches the Crown Beacon through the full intended progression',()=>{
 const s=game.freshState();const milestones=[];const buy=(kind,pad)=>{if(game.build(s,kind,pad)){milestones.push([Math.round(s.elapsed),kind,pad]);return true;}return false;};let stage=0;
 for(let step=0;step<20000&&!s.beacon;step++){
  // Manual gathering only establishes the first tower; all further resources are automated.
  if(!s.buildings.length&&s.resources.stone<20)game.gather(s);
  const free=()=>Array.from({length:game.capacity(s)},(_,i)=>i).find(i=>!s.buildings.some(b=>b.pad===i));
  if(stage===0&&buy('quarry',0))stage++;
  else if(stage===1&&buy('garden',1))stage++;
  else if(stage===2&&buy('forge',2))stage++;
  else if(stage===3&&game.upgradeBuilding(s,s.buildings.find(b=>b.kind==='quarry').id))stage++;
  else if(stage===4&&game.upgradeBuilding(s,s.buildings.find(b=>b.kind==='garden').id))stage++;
  else if(stage===5&&game.upgradeKeep(s)){milestones.push([Math.round(s.elapsed),'keep2']);stage++;}
  else if(stage===6&&game.expand(s)){milestones.push([Math.round(s.elapsed),'east wing']);stage++;}
  else if(stage===7&&buy('garden',free()))stage++;
  else if(stage===8&&buy('quarry',free()))stage++;
  else if(stage===9&&buy('watchtower',free()))stage++;
  else if(stage===10&&game.upgradeBuilding(s,s.buildings.find(b=>b.kind==='forge').id))stage++;
  else if(stage===11&&game.upgradeKeep(s)){milestones.push([Math.round(s.elapsed),'keep3']);stage++;}
  else if(stage===12&&game.expand(s)){milestones.push([Math.round(s.elapsed),'west wing']);stage++;}
  else if(stage===13&&buy('forge',free()))stage++;
  else if(stage===14&&game.awaken(s)){milestones.push([Math.round(s.elapsed),'awaken']);stage++;}
  else if(stage===15&&game.activateBeacon(s)){milestones.push([Math.round(s.elapsed),'beacon']);stage++;}
  game.tick(s,.1);
  for(const n of Object.values(s.resources))assert.ok(Number.isFinite(n)&&n>=0);
 }
 console.log('Progression milestones',JSON.stringify(milestones));assert.equal(s.beacon,true,`Stage ${stage} was not completed: ${JSON.stringify(s.resources)}`);assert.equal(s.expansions,2);assert.equal(s.keepLevel,3);assert.equal(game.regionIndex(s),2);assert.ok(s.elapsed>=900&&s.elapsed<=1200,`Expected 15–20 minutes, got ${(s.elapsed/60).toFixed(1)}`);
 const finalResources={...s.resources};assert.equal(game.activateBeacon(s),false);assert.deepEqual(s.resources,finalResources);const restored=game.deserialize(game.serialize(s));assert.ok(restored?.beacon);assert.equal(restored.beaconAt,s.beaconAt);assert.equal(restored.creatureLevel,2);completion={minutes:s.elapsed/60,buildings:s.buildings.length,resources:s.resources};
});
console.log(JSON.stringify({checks:checks.length,completion},null,2));
