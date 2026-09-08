import * as THREE from 'three';
import { sphere, mesh, beam, consolidate, rand } from '../art';
import { renderedHeight } from './terrain';

function createDeer(parent:THREE.Group){
    const root=new THREE.Group();root.name='Watchful roadside deer';parent.add(root);
    const coat=new THREE.MeshStandardMaterial({color:0xa38e6a,roughness:1}),dark=new THREE.MeshStandardMaterial({color:0x3b4238,roughness:1}),cream=new THREE.MeshStandardMaterial({color:0xd9ceb0,roughness:1});
    const body=new THREE.Group();root.add(body);
    sphere(body,coat,0,1.06,0,.75,.38,.3);sphere(body,cream,.45,1.12,0,.28,.29,.29);
    const neck=sphere(body,coat,-.57,1.47,0,.22,.61,.23);neck.rotation.z=-.36;
    const head=new THREE.Group();head.position.set(-.81,1.97,0);body.add(head);
    sphere(head,coat,0,0,0,.3,.19,.18);sphere(head,dark,-.25,-.055,0,.1,.075,.115);
    for(const side of [-1,1]){const ear=sphere(head,coat,.08,.23,side*.14,.075,.26,.09);ear.rotation.x=side*.55;sphere(head,dark,-.12,.055,side*.162,.032,.034,.02);}
    const tail=sphere(body,cream,.72,1.22,0,.15,.1,.14);tail.rotation.z=.55;
    const legs=[];
    for(const x of [-.48,.46])for(const side of [-1,1]){
        const hip=new THREE.Vector3(x,.97,side*.2),knee=new THREE.Vector3(),foot=new THREE.Vector3();
        const upper=beam(root,coat,hip,new THREE.Vector3(x,.49,side*.22),.055);
        const lower=beam(root,coat,new THREE.Vector3(x,.49,side*.22),new THREE.Vector3(x,.07,side*.24),.035);
        const hoof=sphere(root,dark,x,.06,side*.24,.07,.075,.06);
        legs.push({hip,knee,foot,upper,lower,hoof,phase:(x<0)===(side<0)?0:.5});
    }
    // Keep the head independent for the glance toward Morrow.
    const fixed=new THREE.Group();root.add(fixed);for(const child of [...body.children])if(child!==head)fixed.attach(child);consolidate(fixed);
    return {root,head,legs};
}
export function createEncounters(root:THREE.Group,night:{value:number}){
    const deer=createDeer(root),rng=rand(913),transform=new THREE.Object3D();
    const petals:number[]=[];
    for(let p=0;p<6;p++){
        const a=p*Math.PI/3,b=a+.5,tip=[Math.cos(a)*.28,.44,Math.sin(a)*.28];
        petals.push(0,.3,0,Math.cos(b)*.16,.37,Math.sin(b)*.16,...tip,0,.3,0,...tip,Math.cos(a-.5)*.16,.37,Math.sin(a-.5)*.16);
    }
    const flowerG=new THREE.BufferGeometry();flowerG.setAttribute('position',new THREE.Float32BufferAttribute(petals,3));flowerG.computeVertexNormals();
    const flowerM=new THREE.MeshStandardMaterial({color:0xb8d4b1,emissive:0x8fcaa6,emissiveIntensity:0,roughness:.6,side:THREE.DoubleSide});
    flowerM.onBeforeCompile=shader=>{shader.uniforms.flowerNight=night;shader.vertexShader='uniform float flowerNight;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    float opening=smoothstep(.12,.8,flowerNight);transformed.xz*=.13+.87*opening;transformed.y+=(1.-opening)*length(position.xz)*.9;`);};
    const flowers=new THREE.InstancedMesh(flowerG,flowerM,48);flowers.name='Dusk-opening moonflowers';flowers.frustumCulled=false;root.add(flowers);
    const stemG=new THREE.CylinderGeometry(.015,.021,.3,5).translate(0,.15,0),stemM=new THREE.MeshStandardMaterial({color:0x456948});
    const stems=new THREE.InstancedMesh(stemG,stemM,48);stems.frustumCulled=false;root.add(stems);
    const seeds=Array.from({length:48},()=>({x:(rng()-.5)*15,z:(rng()>.5?1:-1)*(5.7+rng()*3.3),s:.7+rng()*.8}));
    let lastPatch=NaN;
    const worldFoot=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
    function fit(segment:THREE.Mesh,a:THREE.Vector3,b:THREE.Vector3){segment.position.copy(a).add(b).multiplyScalar(.5);segment.scale.y=a.distanceTo(b);direction.subVectors(b,a).normalize();segment.quaternion.setFromUnitVectors(up,direction);}
    function update(distance:number,time:number,reduced=false){
        // Roughly one watchful deer every six minutes at ordinary walking pace.
        const anchor=Math.floor((distance+60)/190)*190+55,approach=distance-anchor;
        const retreat=reduced?0:Math.max(0,approach+9)*1.6;
        const z=-9-retreat,x=approach;
        deer.root.visible=approach>-45&&approach<22;
        deer.root.position.set(x,renderedHeight(x-distance,z),z);deer.root.rotation.y=Math.PI/2+(reduced?0:THREE.MathUtils.smoothstep(approach,-9,-5)*Math.PI);
        deer.head.rotation.y=reduced?0:THREE.MathUtils.smoothstep(approach,-26,-15)*.55*(1-THREE.MathUtils.smoothstep(approach,-9,-2));
        deer.root.updateMatrixWorld(true);
        for(const leg of deer.legs){
            const phase=(retreat*.65/.66+leg.phase)%1,stance=.65;
            const offset=retreat===0?0:phase<stance?-.33+phase/stance*.66:.33-THREE.MathUtils.smoothstep(phase,stance,1)*.66;
            const lift=retreat===0||phase<stance?0:Math.sin((phase-stance)/(1-stance)*Math.PI)*.17;
            leg.foot.set(leg.hip.x+offset,0,leg.hip.z*1.2);worldFoot.copy(leg.foot).applyMatrix4(deer.root.matrixWorld);
            leg.foot.y=renderedHeight(worldFoot.x-distance,worldFoot.z)-deer.root.position.y+.055+lift;
            leg.knee.copy(leg.hip).lerp(leg.foot,.52);leg.knee.x+=.13;
            fit(leg.upper,leg.hip,leg.knee);fit(leg.lower,leg.knee,leg.foot);leg.hoof.position.copy(leg.foot);
        }
        const patch=Math.floor((distance+50)/210)*210+42;
        if(patch!==lastPatch){
            seeds.forEach((seed,i)=>{const gx=-patch+seed.x;transform.position.set(gx,renderedHeight(gx,seed.z)-.012,seed.z);transform.rotation.set(0,i*2.4,0);transform.scale.setScalar(seed.s);transform.updateMatrix();flowers.setMatrixAt(i,transform.matrix);stems.setMatrixAt(i,transform.matrix);});
            flowers.instanceMatrix.needsUpdate=true;stems.instanceMatrix.needsUpdate=true;lastPatch=patch;
        }
        flowers.position.x=stems.position.x=distance;flowerM.emissiveIntensity=night.value*1.35;
    }
    return {update,deer,flowers};
}
