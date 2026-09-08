import * as THREE from 'three';
import { sphere, mesh, beam, consolidate, rand } from '../art';
import { renderedHeight } from './terrain';

function createDeer(parent:THREE.Group){
    const root=new THREE.Group();root.name='Watchful roadside deer';parent.add(root);
    const coat=new THREE.MeshStandardMaterial({color:0xa38e6a,roughness:1}),dark=new THREE.MeshStandardMaterial({color:0x3b4238,roughness:1}),cream=new THREE.MeshStandardMaterial({color:0xd9ceb0,roughness:1});
    const body=new THREE.Group();root.add(body);
    // Long, light torso, high shoulders and a narrow face: a deer silhouette at game scale.
    sphere(body,coat,0,1.26,0,.78,.36,.29);
    sphere(body,coat,-.43,1.3,0,.32,.44,.3);sphere(body,coat,.48,1.25,0,.33,.4,.3);
    sphere(body,cream,.72,1.32,0,.13,.2,.2);
    const head=new THREE.Group();head.position.set(-.53,1.42,0);body.add(head);
    const neck=sphere(head,coat,-.12,.34,0,.2,.53,.205);neck.rotation.z=-.28;
    sphere(head,cream,-.25,.28,0,.085,.37,.145);
    sphere(head,coat,-.29,.77,0,.25,.19,.16);
    const muzzle=sphere(head,coat,-.5,.69,0,.23,.115,.12);muzzle.rotation.z=.2;
    sphere(head,dark,-.7,.65,0,.07,.065,.095);
    const ears:THREE.Group[]=[];
    for(const side of [-1,1]){
        const ear=new THREE.Group();ear.position.set(-.16,.88,side*.12);ear.rotation.x=side*.85;head.add(ear);
        sphere(ear,coat,0,.18,0,.085,.24,.06);sphere(ear,cream,-.017,.19,side*.026,.052,.17,.023);ears.push(ear);
        sphere(head,dark,-.38,.79,side*.145,.037,.04,.024);
        sphere(head,cream,-.39,.803,side*.165,.009,.012,.005);
        // Delicate forked antlers, kept behind the ears rather than a bulky crown.
        const a=new THREE.Vector3(-.12,.94,side*.11),b=new THREE.Vector3(.01,1.22,side*.2),c=new THREE.Vector3(.12,1.47,side*.3);
        beam(head,cream,a,b,.035);beam(head,cream,b,c,.025);
        beam(head,cream,b,new THREE.Vector3(-.17,1.4,side*.26),.021);
        beam(head,cream,c,new THREE.Vector3(.04,1.62,side*.34),.016);
    }
    const tail=sphere(body,cream,.79,1.36,0,.18,.09,.1);tail.rotation.z=.7;
    const legs=[];
    for(const x of [-.48,.46])for(const side of [-1,1]){
        const hip=new THREE.Vector3(x,1.16,side*.2),knee=new THREE.Vector3(),foot=new THREE.Vector3();
        const upper=beam(root,coat,hip,new THREE.Vector3(x,.49,side*.22),.055);
        const lower=beam(root,coat,new THREE.Vector3(x,.49,side*.22),new THREE.Vector3(x,.07,side*.24),.035);
        const hoof=sphere(root,dark,x,.06,side*.24,.07,.075,.06);
        legs.push({hip,knee,foot,upper,lower,hoof,phase:(x<0)===(side<0)?0:.5});
    }
    // Keep the head independent for the glance toward Morrow.
    const fixed=new THREE.Group();root.add(fixed);for(const child of [...body.children])if(child!==head&&child!==tail)fixed.attach(child);consolidate(fixed);
    return {root,head,legs,ears,tail};
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
    let lastTime=NaN,lastAnchor=NaN,gx=0,gz=-9,heading=0,travel=0;
    const planted=deer.legs.map(()=>({x:0,z:0,phase:-1}));
    type Obstacle={x:number;z:number;radius:number};
    function update(distance:number,time:number,reduced=false,obstacles:readonly Obstacle[]=[]){
        const anchor=Math.floor((distance+60)/190)*190+55,approach=distance-anchor;
        const dt=Number.isFinite(lastTime)?Math.max(0,Math.min(time-lastTime,.1)):0;lastTime=time;
        function clear(x:number,z:number){return obstacles.every(o=>Math.hypot(x-o.x,z-o.z)>o.radius+1.15);}
        if(anchor!==lastAnchor){
            lastAnchor=anchor;gx=-anchor;gz=-9;heading=Math.PI/2;travel=0;
            // Find a clear spawn, including the full body and antler envelope.
            let found=false;
            for(let r=0;r<12&&!found;r++)for(let i=0;i<16;i++){
                const x=-anchor+Math.cos(i*Math.PI/8)*r*.7,z=-9-Math.abs(Math.sin(i*Math.PI/8))*r*.7;
                if(clear(x,z)){gx=x;gz=z;found=true;break;}
            }
            planted.forEach(p=>p.phase=-1);
        }
        deer.root.visible=approach>-45&&approach<22;
        const retreat=approach>-9,cycle=(time+anchor*.13)%18;
        const walking=!reduced&&(retreat||cycle<11);
        const goalX=retreat?gx-3:-anchor+Math.sin(Math.floor((time+anchor*.13)/18)*2.4)*4;
        const goalZ=retreat?-23:-10+Math.cos(Math.floor((time+anchor*.13)/18)*1.7)*2;
        let moved=0;
        if(walking&&dt>0&&deer.root.visible){
            const desired=Math.atan2(goalZ-gz,-(goalX-gx));
            const turn=THREE.MathUtils.euclideanModulo(desired-heading+Math.PI,Math.PI*2)-Math.PI;
            const aimed=heading+THREE.MathUtils.clamp(turn,-dt*1.6,dt*1.6),speed=retreat?1.3:.42;
            // Test the swept body against every trunk; choose a clear turn before approaching it.
            for(const offset of [0,.45,-.45,.9,-.9,1.4,-1.4,Math.PI]){
                const angle=aimed+offset,dx=-Math.cos(angle),dz=Math.sin(angle);
                const look=.9+speed*dt;
                if(!clear(gx+dx*look,gz+dz*look)||!clear(gx+dx*speed*dt,gz+dz*speed*dt))continue;
                const bend=THREE.MathUtils.euclideanModulo(angle-heading+Math.PI,Math.PI*2)-Math.PI;
                heading+=THREE.MathUtils.clamp(bend,-dt*2,dt*2);
                const vx=-Math.cos(heading),vz=Math.sin(heading);
                if(clear(gx+vx*speed*dt,gz+vz*speed*dt)){gx+=vx*speed*dt;gz+=vz*speed*dt;moved=speed*dt;}
                break;
            }
        }
        travel+=moved;
        deer.root.position.set(gx+distance,renderedHeight(gx,gz),gz);deer.root.rotation.y=heading;
        const grazing=!retreat&&!walking&&!reduced;
        deer.head.rotation.z=THREE.MathUtils.damp(deer.head.rotation.z,grazing?1.8*(.85+.15*Math.sin(cycle*.6)**2):0,3,dt);
        deer.head.rotation.y=reduced?0:Math.sin(time*.7)*.09+(retreat?0:.18);
        deer.ears.forEach((ear,i)=>ear.rotation.z=reduced?0:Math.sin(time*1.7+i*3)*.09);
        deer.tail.rotation.y=reduced?0:Math.sin(time*2.1)*.14;
        deer.root.updateMatrixWorld(true);
        for(let i=0;i<deer.legs.length;i++){
            const leg=deer.legs[i],plant=planted[i],phase=(travel/.7+leg.phase)%1,stance=.65;
            const swing=moved>0&&phase>=stance;
            const offset=moved===0?0:phase<stance?-.27+phase/stance*.54:.27-THREE.MathUtils.smoothstep(phase,stance,1)*.54;
            const lift=swing?Math.sin((phase-stance)/(1-stance)*Math.PI)*.16:0;
            leg.foot.set(leg.hip.x+offset,0,leg.hip.z*1.2);worldFoot.copy(leg.foot).applyMatrix4(deer.root.matrixWorld);
            if(plant.phase<0||swing||plant.phase>=stance||moved===0){plant.x=worldFoot.x-distance;plant.z=worldFoot.z;}
            worldFoot.set(plant.x+distance,renderedHeight(plant.x,plant.z)+.065+lift,plant.z);
            leg.foot.copy(deer.root.worldToLocal(worldFoot));plant.phase=phase;
            leg.knee.copy(leg.hip).lerp(leg.foot,.52);leg.knee.x+=leg.hip.x<0?-.09:.16;
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
