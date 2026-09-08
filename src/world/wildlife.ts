import * as THREE from 'three';
import { rand, sphere, mesh, consolidate } from '../art';
import { encounterEnvelope } from './journey';
import { surfaceHeight } from './terrain';

export function createWildlife(root:THREE.Group,time:{value:number},night:{value:number}) {
    const wildlife=new THREE.Group();wildlife.name='Valley wildlife';root.add(wildlife);
    const feather=new THREE.MeshStandardMaterial({color:0x405756,roughness:1,side:THREE.DoubleSide});
    const pale=new THREE.MeshStandardMaterial({color:0xbfc6b0,roughness:1,side:THREE.DoubleSide});
    const beakM=new THREE.MeshStandardMaterial({color:0x99825a,roughness:1});
    const wingG=new THREE.BufferGeometry();
    // Swept shoulders, tapered flight feathers and a trailing edge give birds
    // an actual silhouette, including while gliding with extended wings.
    wingG.setAttribute('position',new THREE.Float32BufferAttribute([
        0,0,.12,.42,.04,.18,.96,-.02,-.32,
        0,0,.12,.96,-.02,-.32,.66,0,-.22,
        0,0,.12,.66,0,-.22,.34,0,-.3,
        0,0,.12,.34,0,-.3,0,0,-.16],3));wingG.computeVertexNormals();
    const birds:{body:THREE.Group;wings:THREE.Group[];flock:number;index:number;phase:number}[]=[];
    const rng=rand(907);
    for(let flock=0;flock<3;flock++) for(let i=0;i<(flock===2?2:6);i++) {
        const body=new THREE.Group();body.name=flock===2?'Circling kite':'Valley swallow';wildlife.add(body);
        const skin=flock===1?pale:feather,core=new THREE.Group();body.add(core);
        sphere(core,skin,0,0,0,.12,.115,.33);
        sphere(core,skin,0,.065,.29,.11,.105,.14);
        const beak=mesh(core,new THREE.ConeGeometry(.045,.16,5),beakM,0,.05,.43);beak.rotation.x=Math.PI/2;
        const tailG=new THREE.BufferGeometry();tailG.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-.23,-.19,0,-.62,0,0,-.48,0,0,-.23,0,0,-.48,.19,0,-.62],3));tailG.computeVertexNormals();mesh(core,tailG,skin);consolidate(core);
        const wings=[];
        for(const side of [-1,1]) {const joint=new THREE.Group();joint.position.x=side*.07;body.add(joint);const wing=new THREE.Mesh(wingG,skin);wing.scale.x=side;joint.add(wing);wings.push(joint);}
        body.scale.setScalar(flock===2?1.5:.65+rng()*.2);
        birds.push({body,wings,flock,index:i,phase:rng()*6});
    }
    const butterflyG=new THREE.BufferGeometry();
    const bp:number[]=[];
    for(const side of [-1,1])bp.push(0,0,.04,side*.27,0,.19,side*.23,0,-.11,0,0,.04,side*.23,0,-.11,side*.09,0,-.21);
    butterflyG.setAttribute('position',new THREE.Float32BufferAttribute(bp,3));butterflyG.computeVertexNormals();
    const butterflyM=new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,transparent:true,roughness:1});
    butterflyM.onBeforeCompile=shader=>{
        shader.uniforms.wildlifeTime=time;
        shader.vertexShader='uniform float wildlifeTime;attribute float aWingPhase;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float flap=sin(wildlifeTime*12.+aWingPhase)*1.1;
        transformed.x=position.x*cos(flap);transformed.y=abs(position.x)*sin(flap);`);
    };
    butterflyG.setAttribute('aWingPhase',new THREE.InstancedBufferAttribute(new Float32Array(Array.from({length:22},()=>rng()*6.28)),1));
    const butterflies=new THREE.InstancedMesh(butterflyG,butterflyM,22);butterflies.name='Meadow butterflies';wildlife.add(butterflies);
    for(let i=0;i<22;i++)butterflies.setColorAt(i,new THREE.Color([0xe4b56b,0xc0b3df,0xf0e2b4][i%3]));
    const seeds=Array.from({length:40},(_,i)=>({x:(rng()-.5)*140,z:(rng()>.5?1:-1)*(i<8?2.9+rng()*2.3:7+rng()*13),phase:rng()*6,s:.6+rng()*.7}));
    const fireG=new THREE.BufferGeometry(),firePositions=new Float32Array(40*3);
    fireG.setAttribute('position',new THREE.BufferAttribute(firePositions,3));
    fireG.setAttribute('aPhase',new THREE.Float32BufferAttribute(seeds.map(p=>p.phase),1));
    const gatheringLight={value:0};
    const fireM=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:time,uNight:night,uGather:gatheringLight},
        vertexShader:`uniform float uTime;uniform float uNight;uniform float uGather;attribute float aPhase;varying float vAlpha;
        void main(){vAlpha=uNight*(.25+.75*pow(.5+.5*sin(uTime*1.8+aPhase*4.),3.));vec4 p=modelViewMatrix*vec4(position,1.);
        gl_Position=projectionMatrix*p;gl_PointSize=clamp((85.+uGather*150.)/-p.z,2.,11.);}`,
        fragmentShader:`varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.8,1.,.55,(pow(max(0.,1.-r),2.)*.4+exp(-r*r*15.)*.8)*vAlpha);}`});
    const fireflies=new THREE.Points(fireG,fireM);fireflies.name='Evening fireflies';wildlife.add(fireflies);
    const liftBirds=Array.from({length:5},(_,i)=>{const body=birds[0].body.clone(true);body.name='Startled grove swallow';body.scale.setScalar(.8);wildlife.add(body);return {body,wings:[body.children[1],body.children[2]],index:i};});
    let perch:{x:number;y:number;z:number}|null=null,lastDistance=0;
    const transform=new THREE.Object3D();
    function update(distance:number,perches:{x:number;y:number;z:number}[]=[],reduced=false,rain=0,elapsed=time.value) {
        const t=time.value;
        for(const bird of birds) {
            const {body,wings,flock,index,phase}=bird;
            const a=t*(flock===2?.055:.075)+flock*2, radius=flock===2?23:38;
            const angle=a,dx=-Math.sin(angle)*radius,dz=Math.cos(angle)*radius*.42;
            const norm=Math.hypot(dx,dz),rank=Math.ceil(index/2),side=index%2?1:-1;
            const trailing=rank*2.8,lateral=rank*side*1.9;
            body.position.set(Math.cos(angle)*radius+(flock-1)*32-dx/norm*trailing+dz/norm*lateral,
                (flock===2?34:flock===1?18:26)+Math.sin(angle*2)*1.2+Math.sin(time.value*.9+phase)*.18+index*.15,
                (flock===1?46:-62)+Math.sin(angle)*radius*.42-dz/norm*trailing-dx/norm*lateral);
            body.rotation.y=Math.atan2(dx,dz);body.rotation.z=Math.sin(angle)*.22;
            const burst=THREE.MathUtils.smoothstep(Math.sin(t*.6+phase),-.1,.4);
            const flap=flock===2?Math.sin(t*1.5+phase)*.09:Math.sin(t*5.5+phase)*.58*burst;
            wings[0].rotation.z=-flap-.07;wings[1].rotation.z=flap+.07;
        }
        if(Math.abs(distance-lastDistance)>10)perch=null;lastDistance=distance;
        if(perch&&perch.x+distance>40)perch=null;
        if(!perch)perch=perches.filter(p=>p.x+distance<-12&&p.x+distance>-70).sort((a,b)=>b.x-a.x)[0]??null;
        for(const bird of liftBirds){
            bird.body.visible=!!perch;if(!perch)continue;
            const flight=reduced?0:Math.max(0,perch.x+distance+12-bird.index*.6),rise=THREE.MathUtils.smoothstep(flight,0,3);
            bird.body.position.set(perch.x+distance+Math.sin(bird.index*2.4)*.7+flight*.35,perch.y+Math.cos(bird.index)*.15+rise*.6+flight*.7,perch.z+Math.cos(bird.index*2.4)*.7-flight*.9);
            bird.body.rotation.y=Math.PI*.83;bird.wings[0].rotation.z=flight>0?Math.sin(t*9+bird.index)*.7:-1.3;bird.wings[1].rotation.z=-bird.wings[0].rotation.z;
        }
        const gathering=reduced?0:encounterEnvelope(elapsed)*night.value*(1-rain);gatheringLight.value=gathering;
        seeds.forEach((seed,i)=>{
            const x=((seed.x+distance+120)%240)-120,z=seed.z+Math.sin(t*.7+seed.phase)*.7;
            const y=surfaceHeight(x-distance,z)+1+Math.sin(t*1.3+seed.phase)*.5;
            const angle=t*.36+seed.phase+i*.8;
            firePositions[i*3]=THREE.MathUtils.lerp(x,Math.cos(angle)*(4.2+i%3*.25),gathering);
            firePositions[i*3+1]=THREE.MathUtils.lerp(y,3+Math.sin(angle*.7+i)*1.8,gathering);
            firePositions[i*3+2]=THREE.MathUtils.lerp(z,Math.sin(angle)*4.1,gathering);
            if(i<22){const scatter=reduced?0:1-THREE.MathUtils.smoothstep(Math.hypot(x,z),3,8);
                transform.position.set(x+Math.sin(t+seed.phase)*.6+Math.sign(x)*scatter*.9,y+scatter*1.5,z+Math.sign(z)*scatter*2);transform.rotation.set(0,t*.4+seed.phase,Math.sin(t+seed.phase)*.2);transform.scale.setScalar(seed.s*(i<8?1.4:1));transform.updateMatrix();butterflies.setMatrixAt(i,transform.matrix);}
        });
        butterflies.instanceMatrix.needsUpdate=true;butterflies.computeBoundingSphere();
        fireG.attributes.position.needsUpdate=true;fireG.computeBoundingSphere();
        butterflyM.opacity=1-night.value;fireflies.visible=night.value>.02;
    }
    return {update,birds,liftBirds,butterflies,fireflies};
}
