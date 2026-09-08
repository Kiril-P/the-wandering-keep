import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rand } from '../art';
export type FootContact={foot:THREE.Vector3;lastPhase:number};
/** Route-anchored circular pools keep footprints and debris bounded on a long journey. */
export function createFootsteps(root:THREE.Group){
    const feet={value:Array.from({length:6},()=>new THREE.Vector3(1e5,1e5,1e5))};
    const previous=Array(6).fill(-1),rng=rand(636),transform=new THREE.Object3D();
    const stampParts=[new THREE.CircleGeometry(1,24).rotateX(-Math.PI/2).scale(.47,1,.37)];
    for(let i=0;i<3;i++)stampParts.push(new THREE.CircleGeometry(1,12).rotateX(-Math.PI/2).scale(.23,1,.1).translate(-.4,0,(i-1)*.25));
    const stampG=mergeGeometries(stampParts);stampParts.forEach(g=>g.dispose());
    const stampAlpha=new THREE.InstancedBufferAttribute(new Float32Array(64),1);stampG.setAttribute('aFade',stampAlpha);
    const stampM=new THREE.MeshBasicMaterial({color:0x514834,transparent:true,opacity:.23,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
    stampM.onBeforeCompile=shader=>{shader.vertexShader='attribute float aFade;varying float vFade;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFade=aFade;');shader.fragmentShader='varying float vFade;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vFade;');};
    const prints=new THREE.InstancedMesh(stampG,stampM,64);prints.name='Morrow footprints';prints.frustumCulled=false;root.add(prints);
    const stamps=Array.from({length:64},()=>({x:0,z:0,born:-100}));let stampIndex=0,steps=0;
    const dustG=new THREE.BufferGeometry(),dustP=new Float32Array(144*3),dustA=new Float32Array(144);
    dustG.setAttribute('position',new THREE.BufferAttribute(dustP,3));dustG.setAttribute('aFade',new THREE.BufferAttribute(dustA,1));
    const dustM=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uWet:{value:0}},vertexShader:`attribute float aFade;varying float vFade;void main(){vFade=aFade;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(130./-p.z,2.,22.);}`,fragmentShader:`varying float vFade;uniform float uWet;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.71,.65,.48,pow(max(0.,1.-r),2.)*vFade*.2*(1.-uWet*.9));}`});
    const dust=new THREE.Points(dustG,dustM);dust.name='Soft footfall dust';dust.frustumCulled=false;root.add(dust);
    const puffs=Array.from({length:144},()=>({x:0,z:0,born:-100,vx:0,vz:0}));let puffIndex=0;
    const pebbleG=new THREE.IcosahedronGeometry(.1,0),pebbleM=new THREE.MeshStandardMaterial({color:0x7c826c,roughness:.95});
    const pebbles=new THREE.InstancedMesh(pebbleG,pebbleM,16);pebbles.name='Weight-shifted pebbles';pebbles.frustumCulled=false;root.add(pebbles);
    const stones=Array.from({length:16},()=>({x:0,z:0,born:-100,side:1}));let stoneIndex=0,lastDistance=NaN,lastTime=NaN;
    function update(contacts:readonly FootContact[],distance:number,time:number,reduced=false,wetness=0){
        const jump=!Number.isFinite(lastDistance)||Math.abs(distance-lastDistance)>5||time<lastTime;
        if(jump){previous.fill(-1);stamps.forEach(p=>p.born=-100);puffs.forEach(p=>p.born=-100);stones.forEach(p=>p.born=-100);}
        contacts.forEach((leg,i)=>{
            feet.value[i].copy(leg.foot);if(reduced)feet.value[i].set(1e5,1e5,1e5);
            if(!jump&&distance>lastDistance&&previous[i]>.6&&leg.lastPhase<.2){
                const x=leg.foot.x-distance,z=leg.foot.z;
                Object.assign(stamps[stampIndex++%64],{x,z,born:time});steps++;
                if(!reduced){for(let j=0;j<6;j++)Object.assign(puffs[puffIndex++%144],{x:x+(rng()-.5)*.7,z:z+(rng()-.5)*.6,born:time,vx:(rng()-.5)*.6,vz:(rng()-.5)*.7});
                    if(steps%5===0)Object.assign(stones[stoneIndex++%16],{x:x+.2,z:z+Math.sign(z)*.3,born:time,side:Math.sign(z)});
                }
            }
            previous[i]=leg.lastPhase;
        });
        lastDistance=distance;lastTime=time;
        stamps.forEach((p,i)=>{const age=time-p.born,fade=age>=0?1-THREE.MathUtils.smoothstep(age,12,36):0;transform.position.set(p.x+distance,-.069,p.z);transform.rotation.set(0,0,0);transform.scale.setScalar(fade>0?1:0);transform.updateMatrix();prints.setMatrixAt(i,transform.matrix);stampAlpha.setX(i,fade);});prints.instanceMatrix.needsUpdate=true;stampAlpha.needsUpdate=true;
        puffs.forEach((p,i)=>{const age=Math.max(0,time-p.born);dustP[i*3]=p.x+distance+p.vx*age;dustP[i*3+1]=.07+age*.19;dustP[i*3+2]=p.z+p.vz*age;dustA[i]=Math.max(0,1-age/2.7);});
        dustG.attributes.position.needsUpdate=true;dustG.attributes.aFade.needsUpdate=true;dustM.uniforms.uWet.value=wetness;dust.visible=!reduced;
        stones.forEach((p,i)=>{const age=Math.max(0,time-p.born),roll=Math.min(1,age/1.2);transform.position.set(p.x+distance+roll*.26,-.01+Math.sin(roll*Math.PI)*.18,p.z+p.side*roll*.55);transform.rotation.set(roll*3,roll*2,0);transform.scale.setScalar(age<18?1:0);transform.updateMatrix();pebbles.setMatrixAt(i,transform.matrix);});pebbles.instanceMatrix.needsUpdate=true;pebbles.visible=!reduced;
    }
    return {feet,update,prints,dust,pebbles,get count(){return steps;}};
}
