import * as THREE from 'three';
import { rand } from '../art';
import { fracturedRock } from '../world/geology';
import { selectionVolume } from '../selection';
import type { Outcrop } from '../game';
export const OUTCROP_NAMES=['Split granite','Honey sandstone','Slate stack','Quartz outcrop'];
const stoneMaterials=[0x85948d,0xb8976c,0x627784,0xa5aaa0].map(color=>new THREE.MeshStandardMaterial({color,roughness:.87,vertexColors:true}));
const seamMaterial=new THREE.MeshBasicMaterial({color:0xf4ca72,toneMapped:false});
const crackMaterial=new THREE.MeshBasicMaterial({color:0x30382e,side:THREE.DoubleSide});
const ringG=new THREE.TorusGeometry(.23,.028,5,28),markG=new THREE.OctahedronGeometry(.08);
const haloG=new THREE.RingGeometry(1.42,1.48,48),haloM=new THREE.MeshBasicMaterial({color:0xf0c875,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false});
export function createOutcrop(o:Outcrop){
    const root=new THREE.Group(),variant=o.id%4,rng=rand(o.id*937+172),height=[2.2,1.8,2.1,2.55][variant];
    root.name=OUTCROP_NAMES[variant];root.userData.pick={type:'outcrop',id:o.id};
    const chunks:THREE.Mesh[]=[];
    // Six overlapping geological pieces give each successful strike a real piece to remove.
    for(let i=0;i<6;i++){
        const angle=i*2.4,radius=i===5?0:.45+rng()*.25;
        const g=fracturedRock(o.id*73+i,new THREE.Color(0xffffff),variant===2?1:variant===3?2:0);
        const chunk=new THREE.Mesh(g,stoneMaterials[variant]);chunk.position.set(Math.cos(angle)*radius,-.02,Math.sin(angle)*radius*.8);
        const h=height*(i===5?1:.55+rng()*.4);
        chunk.scale.set(variant===2?1.65:1.0+rng()*.55,h,variant===2?.95:1.05+rng()*.3);
        chunk.rotation.y=rng()*Math.PI;chunk.castShadow=chunk.receiveShadow=true;root.add(chunk);chunks.push(chunk);
    }
    const halo=new THREE.Mesh(haloG,haloM);halo.rotation.x=-Math.PI/2;halo.position.y=.12;root.add(halo);
    const proxy=selectionVolume(root,{type:'outcrop',id:o.id},new THREE.Vector3(2.85,height+.3,2.6),new THREE.Vector3(0,height/2,0));
    const crackG=new THREE.BufferGeometry(),cracks=new THREE.Mesh(crackG,crackMaterial);root.add(cracks);
    const markers=Array.from({length:3},()=>{const g=new THREE.Group();g.add(new THREE.Mesh(ringG,seamMaterial),new THREE.Mesh(markG,seamMaterial));root.add(g);return g;});
    const weakPoints:{point:THREE.Vector3;normal:THREE.Vector3}[]=[];
    const ray=new THREE.Raycaster(),direction=new THREE.Vector3(),origin=new THREE.Vector3();
    let previous=-1;
    function surface(x:number,y:number,face:number){
        origin.set(face===2?-5:x,y,face===2?x:face===0?5:-5);direction.set(face===2?1:0,0,face===2?0:face===0?-1:1);
        origin.applyMatrix4(root.matrixWorld);direction.transformDirection(root.matrixWorld);ray.set(origin,direction);
        const hit=ray.intersectObjects(chunks.filter(c=>c.visible),false)[0];
        if(!hit)return null;
        const point=root.worldToLocal(hit.point.clone()),normal=hit.face!.normal.clone().transformDirection(hit.object.matrixWorld).transformDirection(root.matrixWorld.clone().invert());
        point.addScaledVector(normal,.025);return {point,normal};
    }
    function damage(hits:number){
        if(previous===hits)return;previous=hits;
        chunks.forEach((c,i)=>c.visible=i>=6-hits);root.updateWorldMatrix(true,true);weakPoints.length=0;
        const positions:number[]=[];
        markers.forEach((marker,face)=>{
            const center=surface(0,height*.48,face)??surface(0,height*.3,face);marker.visible=!!center;
            if(!center)return;
            weakPoints.push(center);marker.position.copy(center.point).addScaledVector(center.normal,.025);marker.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),center.normal);
            for(let branch=0;branch<6-hits;branch++){
                const a=branch*1.9+.5,points=[];
                for(let j=0;j<5;j++){const d=j*.19,p=surface(Math.cos(a)*d+(j%2?.06:0),height*.48+Math.sin(a)*d,face);if(p)points.push(p.point);}
                for(let j=1;j<points.length;j++){
                    const a=points[j-1],b=points[j],width=new THREE.Vector3().subVectors(b,a).cross(center.normal).normalize().multiplyScalar(.022);
                    const p=a.clone().add(width),q=a.clone().sub(width),r=b.clone().add(width),s=b.clone().sub(width);
                    positions.push(...p.toArray(),...q.toArray(),...r.toArray(),...q.toArray(),...s.toArray(),...r.toArray());
                }
            }
        });
        crackG.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));crackG.computeBoundingSphere();
    }
    damage(o.hits);
    return {root,chunks,proxy,weakPoints,damage,height,color:stoneMaterials[variant].color,
        dispose(){chunks.forEach(c=>c.geometry.dispose());crackG.dispose();root.removeFromParent();}};
}
export type OutcropArt=ReturnType<typeof createOutcrop>;
