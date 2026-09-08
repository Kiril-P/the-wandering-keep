import * as THREE from 'three';
import { rand, M } from '../art';
import type { Environment } from '../environment';
import { geologyMaterial } from './geology';

/** Local rain volume: two draw calls, bounded buffers, no geometry regenerated per frame. */
export function createWeather(root: THREE.Group, density = 1) {
    const rng=rand(3928), count=Math.round(760*density), positions=new Float32Array(count*6), seeds=Array.from({length:count},()=>[rng(),rng(),rng()]);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const material=new THREE.LineBasicMaterial({color:0xc1dae0,transparent:true,opacity:0,depthWrite:false});
    const rain=new THREE.LineSegments(geometry,material);rain.frustumCulled=false;rain.name='Passing shower';root.add(rain);
    // Small road splashes remain below the castle, never attached to its picking hierarchy.
    const splashPositions=new Float32Array(100*3), splashGeometry=new THREE.BufferGeometry();splashGeometry.setAttribute('position',new THREE.BufferAttribute(splashPositions,3));
    const splashMaterial=new THREE.PointsMaterial({color:0xd9e6de,size:.07,transparent:true,opacity:0,depthWrite:false});
    const splashes=new THREE.Points(splashGeometry,splashMaterial);splashes.frustumCulled=false;root.add(splashes);
    const stone=[M.stone,M.stoneLight,M.stoneDark,M.mortar,M.cream,M.creamLight,M.roof,M.roofLight,M.roofDark,geologyMaterial];
    const dry=stone.map(m=>({color:m.color.clone(),roughness:m.roughness}));
    return { update(time:number,e:Environment,reduced:boolean) {
        material.opacity=e.rain*(reduced?.10:.26); rain.visible=e.rain>.01 && !reduced;
        geometry.setDrawRange(0, Math.floor(count*e.rain)*2);
        if(rain.visible){
            const p=geometry.attributes.position;
            for(let i=0;i<count;i++){
                const [a,b,c]=seeds[i],fall=(b+time*.65)%1;
                const x=(a-.5)*65+fall*3, y=32-fall*34,z=(c-.5)*44;
                p.setXYZ(i*2,x,y,z);p.setXYZ(i*2+1,x+.1,y-.85,z+.035);
            }
            p.needsUpdate=true;
        }
        splashes.visible=e.rain>.05&&!reduced;splashMaterial.opacity=e.rain*.38;
        if(splashes.visible){const p=splashGeometry.attributes.position;for(let i=0;i<100;i++){const [a,b,c]=seeds[i];const age=(b+time*1.9)%1;p.setXYZ(i,(a-.5)*40,.045+Math.sin(age*Math.PI)*.13,(c-.5)*3.1);}p.needsUpdate=true;}
        stone.forEach((m,i)=>{m.roughness=THREE.MathUtils.lerp(dry[i].roughness,.29,e.wetness);m.color.copy(dry[i].color).multiplyScalar(1-e.wetness*.12);});
    },dispose(){geometry.dispose();material.dispose();splashGeometry.dispose();splashMaterial.dispose();rain.removeFromParent();splashes.removeFromParent();stone.forEach((m,i)=>{m.color.copy(dry[i].color);m.roughness=dry[i].roughness;});} };
}
