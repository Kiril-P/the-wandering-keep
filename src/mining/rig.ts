import * as THREE from 'three';
import type { OutcropArt } from './outcrop';
export function createMining(body:THREE.Group,scene:THREE.Scene,getArt:(id:number)=>OutcropArt|undefined,ids:()=>number[],impact:(id:number,precise:boolean)=>boolean){
    const iron=new THREE.MeshStandardMaterial({color:0x56605a,metalness:.55,roughness:.48}),wood=new THREE.MeshStandardMaterial({color:0x986c3e}),gold=new THREE.MeshBasicMaterial({color:0xffd47f});
    const mount=new THREE.Group();mount.position.set(-1,4.85,1.65);body.add(mount);
    const base=new THREE.Mesh(new THREE.BoxGeometry(.7,.18,.65),wood);mount.add(base);
    const spool=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.5,12),iron);spool.rotation.z=Math.PI/2;spool.position.y=.28;mount.add(spool);
    const pick=new THREE.Group(),handle=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.65,7),wood),head=new THREE.Mesh(new THREE.BoxGeometry(.65,.12,.13),iron);head.position.y=.25;pick.add(handle,head);scene.add(pick);
    const cargo=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,0),new THREE.MeshStandardMaterial({color:0x92968a}));pick.add(cargo);cargo.visible=false;
    const cableG=new THREE.BufferGeometry(),positions=new Float32Array(17*3);cableG.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const cable=new THREE.Line(cableG,new THREE.LineBasicMaterial({color:0xc7a16d}));cable.frustumCulled=false;scene.add(cable);
    const reticle=new THREE.Mesh(new THREE.TorusGeometry(.3,.035,6,32),gold);scene.add(reticle);reticle.visible=false;
    const chips=Array.from({length:18},()=>{const mesh=new THREE.Mesh(cargo.geometry,cargo.material);mesh.visible=false;scene.add(mesh);return {mesh,v:new THREE.Vector3()};});
    let phase:'idle'|'aiming'|'outbound'|'returning'='idle',id=0,t=0,precise=false,chipTime=0;
    const local=new THREE.Vector3(),target=new THREE.Vector3(),anchor=new THREE.Vector3(),start=new THREE.Vector3(),normal=new THREE.Vector3(0,1,0),z=new THREE.Vector3(0,0,1);
    function aim(ray:THREE.Raycaster){const art=getArt(id);if(!art)return;art.root.updateWorldMatrix(true,true);const hit=ray.intersectObjects(art.chunks.filter(c=>c.visible))[0];if(!hit){precise=false;return;}local.copy(art.root.worldToLocal(hit.point.clone()));normal.copy(hit.face!.normal).transformDirection(hit.object.matrixWorld);precise=art.weakPoints.some(p=>p.point.distanceTo(local)<.43);}
    function begin(next:number,ray?:THREE.Raycaster){if(phase!=='idle')return false;const art=getArt(next);if(!art)return false;id=next;local.set(0,art.height*.48,.6);precise=false;phase='aiming';if(ray)aim(ray);return true;}
    function release(){if(phase==='aiming'){phase='outbound';t=0;start.copy(anchor);}}
    function cancel(){phase='idle';cargo.visible=false;reticle.visible=false;}
    return {begin,aim,release,cancel,get aiming(){return phase==='aiming';},get busy(){return phase!=='idle';},get hint(){return phase==='aiming' ? precise?'Seam lined up · release for +3 stone':'Aim at a golden seam · release to strike' : phase==='outbound'?'Pick away…':phase==='returning'?'Reeling in stone':'';},quickStrike(next?:number){if(begin(next??ids()[0]))release();},
        update(dt:number,reduced=false){
            mount.updateWorldMatrix(true,false);mount.getWorldPosition(anchor);anchor.y+=.32;
            const art=getArt(id);if(phase==='aiming'||phase==='outbound'){if(!art){cancel();}else{art.root.updateWorldMatrix(true,false);target.copy(local).applyMatrix4(art.root.matrixWorld);}}
            reticle.visible=phase==='aiming';reticle.position.copy(target).addScaledVector(normal,.04);reticle.quaternion.setFromUnitVectors(z,normal);gold.color.setHex(precise?0xc2ffad:0xffd47f);
            if(phase==='idle'||phase==='aiming')pick.position.copy(anchor);
            if(phase==='outbound'){
                t+=dt/(reduced?.16:.3);pick.position.lerpVectors(start,target,Math.min(t,1));pick.position.y+=Math.sin(Math.min(t,1)*Math.PI)*.6;pick.rotation.z=t*4;
                if(t>=1){phase='returning';t=0;start.copy(target);const color=art?.color.clone();cargo.visible=impact(id,precise);if(cargo.visible){if(color)(cargo.material as THREE.MeshStandardMaterial).color.copy(color);chipTime=.75;chips.forEach((c,i)=>{c.mesh.visible=!reduced;c.mesh.position.copy(target);c.mesh.scale.setScalar(.18+(i%4)*.12);c.v.set(Math.sin(i*2.4)*2,1.4+i%3,Math.cos(i*2.4)*2);});}}
            }else if(phase==='returning'){t+=dt/.65;pick.position.lerpVectors(start,anchor,Math.min(t,1));pick.position.y+=Math.sin(Math.min(t,1)*Math.PI)*.5;spool.rotation.x+=dt*12;if(t>=1)cancel();}
            cable.visible=phase==='outbound'||phase==='returning';for(let i=0;i<17;i++){const a=i/16;positions[i*3]=THREE.MathUtils.lerp(anchor.x,pick.position.x,a);positions[i*3+1]=THREE.MathUtils.lerp(anchor.y,pick.position.y,a)-Math.sin(a*Math.PI)*.25;positions[i*3+2]=THREE.MathUtils.lerp(anchor.z,pick.position.z,a);}cableG.attributes.position.needsUpdate=true;
            if(chipTime>0){chipTime-=dt;chips.forEach(c=>{c.v.y-=dt*5;c.mesh.position.addScaledVector(c.v,dt);c.mesh.scale.multiplyScalar(Math.exp(-dt*2));if(chipTime<=0)c.mesh.visible=false;});}
        }};
}
