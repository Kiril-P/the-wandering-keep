import {build as bundle} from 'esbuild';
import assert from 'node:assert/strict';
const output=await bundle({stdin:{contents:"export * as THREE from 'three'; export * from './src/game'; export * from './src/selection'; export * from './src/environment'; export {createWeather} from './src/world/weather';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {THREE,freshState,tick,production,selectionVolume,createPicker,sampleEnvironment,DAY_SECONDS,WEATHER_SECONDS,createWeather}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
// Report exactly the output the next simulation tick will perform, including
// competition between forges and fractional inputs (not whole-recipe gates).
for(const stock of [{stone:0,essence:0,runes:0},{stone:.004,essence:12,runes:0},{stone:100,essence:100,runes:0}]){
    const s=freshState();s.resources=stock;s.buildings=[{id:3,kind:'quarry',level:1,pad:0},{id:4,kind:'garden',level:1,pad:1},{id:5,kind:'forge',level:3,pad:2},{id:6,kind:'forge',level:3,pad:3}];
    const before={...s.resources},flow=production(s);tick(s,.1);
    for(const r of ['stone','essence','runes'])assert.ok(Math.abs((s.resources[r]-before[r])/.1-flow.rates[r])<1e-9,r);
}
{
    const s=freshState();s.buildings=[{id:3,kind:'forge',level:1,pad:0}];s.resources={stone:2,essence:0,runes:0};
    assert.equal(production(s).buildings.get(3).status,'Waiting for essence');
    s.resources.essence=.1;assert.equal(production(s).buildings.get(3).status,'Producing');
    s.resources.essence=.001;assert.equal(production(s).buildings.get(3).status,'Limited by essence');
}
console.log('PASS Production feedback agrees with actual fractional conversion, competing forges, stopped and resumed inputs');
{
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1280/720,.1,100);camera.position.z=10;camera.lookAt(0,0,0);camera.updateMatrixWorld();
    const parent=new THREE.Group();scene.add(parent);
    const proxy=selectionVolume(parent,{type:'building',id:3},new THREE.Vector3(1,1,1),new THREE.Vector3());
    const keep=new THREE.Mesh(new THREE.BoxGeometry(5,5,1),new THREE.MeshBasicMaterial());keep.position.z=-2;keep.userData.pick={type:'keep'};scene.add(keep);
    // An unregistered decorative object physically in front is deliberately excluded.
    const decoration=new THREE.Mesh(new THREE.BoxGeometry(2,2,1));decoration.position.z=3;scene.add(decoration);
    scene.updateMatrixWorld(true);const picker=createPicker();
    const pick=(x=0,y=0)=>picker.pick([keep,proxy],camera,x,y,1280,720);
    assert.deepEqual(pick(),{type:'building',id:3});
    const edge=new THREE.Vector3(.5,0,.5).project(camera);
    assert.equal(pick(edge.x+6*2/1280)?.type,'building','near misses have pixel forgiveness');
    assert.equal(pick(edge.x+22*2/1280)?.type,'keep','padding is bounded');
    parent.visible=false;assert.equal(pick()?.type,'keep');parent.visible=true;
    keep.position.z=3;scene.updateMatrixWorld(true);assert.equal(pick()?.type,'keep','foreground Keep occludes a rear building');
    keep.visible=false;assert.equal(pick()?.type,'building','invisible variants never intercept');
}
console.log('PASS Forgiving selection, decoration exclusion, hidden parents, bounded padding, and Keep occlusion');
for(let t=0;t<DAY_SECONDS*3;t+=.25){
    const e=sampleEnvironment(t),next=sampleEnvironment(t+.25);
    for(const key of ['daylight','night','golden','dawn','overcast','rain','wetness','mist']){
        assert.ok(e[key]>=0&&e[key]<=1,key);
        assert.ok(Math.abs(e[key]-next[key])<.025,`${key} transition at ${t}`);
    }
}
assert.ok(sampleEnvironment(290).rain>.7);
assert.ok(sampleEnvironment(400).rain===0&&sampleEnvironment(400).wetness>.5,'stone stays wet after rain');
assert.ok(sampleEnvironment(550).wetness===0,'stone dries');
assert.ok(sampleEnvironment(1325).dawn>.8);
assert.ok(sampleEnvironment(835).night>.95);
assert.ok(sampleEnvironment(475).golden>.95);
for(const t of [0,WEATHER_SECONDS,DAY_SECONDS])assert.deepEqual(sampleEnvironment(t),sampleEnvironment(t),'deterministic reload');
console.log('PASS Slow day/night, dawn mist, continuous weather fronts, delayed drying and deterministic sampling');

{
    const root=new THREE.Group(),weather=createWeather(root,.6),rain=root.getObjectByName('Passing shower');
    const geometry=rain.geometry,materialCount=root.children.length;
    const shower=sampleEnvironment(290);
    weather.update(2,shower,false);assert.ok(rain.visible);assert.ok(geometry.drawRange.count>0);
    const first=Array.from(geometry.attributes.position.array);
    weather.update(3,shower,false);assert.notDeepEqual(Array.from(geometry.attributes.position.array),first);
    weather.update(3,shower,false);const paused=Array.from(geometry.attributes.position.array);weather.update(3,shower,false);assert.deepEqual(Array.from(geometry.attributes.position.array),paused);
    weather.update(4,shower,true);assert.equal(rain.visible,false,'reduced motion hides streaks');
    weather.update(5,sampleEnvironment(550),false);assert.equal(rain.visible,false,'clear skies have no rain');
    assert.equal(rain.geometry,geometry);assert.equal(root.children.length,materialCount,'bounded weather objects');
    weather.dispose();assert.equal(root.children.length,0);
}
console.log('PASS Bounded rain buffers, moving showers, paused clock, reduced motion, clear skies and cleanup');
