import * as THREE from 'three';
import { SECTION_SIZE, createTerrain, terrainMaterial } from './world/terrain';
import { vegetationLibrary, populateVegetation } from './world/vegetation';
import { waterMaterial, rivers } from './world/water';
import { landmarks, sanctuaryGlow } from './world/landmarks';
import { createAtmosphere } from './world/atmosphere';
import { createWeather } from './world/weather';
import { sampleEnvironment, type Environment } from './environment';
import { createFootsteps, type FootContact } from './world/footsteps';
import { createEncounters } from './world/encounters';
import { createWildlife } from './world/wildlife';
export function createWorld(scene:THREE.Scene,options:{density?:number}={}){
    const root=new THREE.Group();root.name='The long road';scene.add(root);
    const time={value:0},night={value:0};
    const groundM=terrainMaterial(time),waterM=waterMaterial(time,night),fallsM=waterMaterial(time,night,true);
    const footsteps=createFootsteps(root),encounters=createEncounters(root,night);
    const vegetation=vegetationLibrary(time,footsteps.feet),atmosphere=createAtmosphere(root,time,night),wildlife=createWildlife(root,time,night);
    const weather=createWeather(root,options.density??1);
    let environment=sampleEnvironment(0);
    let obstacles:{x:number;z:number;radius:number}[]=[];
    const sections=new Map<number,THREE.Group>();
    function section(index:number){
        const group=new THREE.Group(),origin=index*SECTION_SIZE;group.name=`Route section ${index}`;
        group.add(createTerrain(origin,groundM));rivers(group,origin,waterM);populateVegetation(group,origin,vegetation,options.density??1);landmarks(group,origin,fallsM,waterM);root.add(group);return group;
    }
    function release(group:THREE.Group){group.traverse(o=>{if((o instanceof THREE.Mesh||o instanceof THREE.Points)&&!o.userData.sharedWorldGeometry)o.geometry.dispose();if(o instanceof THREE.InstancedMesh)o.dispose();});group.removeFromParent();}
    return {root,footsteps,encounters,reactToFeet(contacts:readonly FootContact[],distance:number,elapsed:number,reduced=false){footsteps.update(contacts,distance,elapsed,reduced,environment.wetness);},setEnvironment(value:Environment){environment=value;night.value=value.night;},setRegion(value:number,lighting=THREE.MathUtils.clamp(value-1,0,1)){night.value=lighting;},update(distance:number,elapsed:number,reduced=false,beacon=false){
        time.value=reduced?0:elapsed;
        sanctuaryGlow.emissiveIntensity=.35+night.value*.15+(beacon?.5:0);
        let sectionsChanged=false;
        const center=Math.round(-distance/SECTION_SIZE);
        for(const [index,group] of sections)if(Math.abs(index-center)>4){release(group);sections.delete(index);sectionsChanged=true;}
        for(let index=center-4;index<=center+4;index++){
            let group=sections.get(index);if(!group){group=section(index);sections.set(index,group);sectionsChanged=true;}group.position.x=index*SECTION_SIZE+distance;
        }
        if(sectionsChanged)obstacles=[...sections.values()].flatMap(s=>s.userData.obstacles??[]).filter(o=>Math.abs(o.z)<30);
        atmosphere.update(environment);weather.update(elapsed,environment,reduced);wildlife.update(distance,[...sections.values()].flatMap(s=>s.userData.perches??[]),reduced,environment.rain,elapsed);encounters.update(distance,elapsed,reduced,obstacles);
    },get stats(){return {sections:sections.size};}};
}
