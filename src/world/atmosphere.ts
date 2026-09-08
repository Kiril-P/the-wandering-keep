import * as THREE from 'three';
import { rand } from '../art';
import { sampleEnvironment, type Environment } from '../environment';
import { skyColors } from '../lighting';
export function createAtmosphere(root:THREE.Group,time:{value:number},night:{value:number}){
    const horizon={value:new THREE.Color()},zenith={value:new THREE.Color()},mistiness={value:0};
    const skyM=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uNight:night,uHorizon:horizon,uZenith:zenith},vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform vec3 uHorizon;uniform vec3 uZenith;varying vec3 vDirection;void main(){vec3 d=normalize(vDirection);float h=smoothstep(-.13,.68,d.y);gl_FragColor=vec4(mix(uHorizon,uZenith,h),1.);#include <colorspace_fragment>}`});
    // Shader preprocessor directives must begin on their own line.
    skyM.fragmentShader=skyM.fragmentShader.replace('#include','\n#include');
    const sky=new THREE.Mesh(new THREE.SphereGeometry(530,32,20),skyM);sky.renderOrder=-100;root.add(sky);
    const moon=new THREE.Mesh(new THREE.SphereGeometry(8,32,24),new THREE.MeshBasicMaterial({color:0xf4edd2,transparent:true,opacity:0}));moon.position.set(-110,86,-250);root.add(moon);
    const cloudPixels=new Uint8Array(64*64*4);
    for(let y=0;y<64;y++)for(let x=0;x<64;x++){
        const xx=x/63,yy=y/63;let density=0;
        for(const [cx,cy,rx,ry] of [[.24,.49,.22,.25],[.44,.54,.27,.34],[.67,.49,.27,.27],[.52,.4,.38,.19]]){
            const d=((xx-cx)/rx)**2+((yy-cy)/ry)**2;density=Math.max(density,Math.max(0,1-d)**1.6);
        }
        const i=(y*64+x)*4;cloudPixels[i]=cloudPixels[i+1]=cloudPixels[i+2]=255;cloudPixels[i+3]=Math.round(density*210);
    }
    const texture=new THREE.DataTexture(cloudPixels,64,64);texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;
    const cloudMat=new THREE.SpriteMaterial({map:texture,color:0xe9eee0,transparent:true,opacity:.85,depthWrite:false,fog:false});
    const seaMat=new THREE.SpriteMaterial({map:texture,color:0xaebecb,transparent:true,opacity:0,depthWrite:false});
    const clouds=new THREE.Group(),sea=new THREE.Group();root.add(clouds,sea);const rng=rand(477);
    for(let i=0;i<26;i++){
        const cloud=new THREE.Sprite(cloudMat);cloud.position.set((rng()-.5)*560,52+rng()*37,(rng()-.5)*570);cloud.scale.set(55+rng()*45,16+rng()*12,1);clouds.add(cloud);
    }
    for(let i=0;i<24;i++){
        const cloud=new THREE.Sprite(seaMat);cloud.position.set((rng()-.5)*500,-3+rng()*2,(i%2?1:-1)*(34+rng()*20));cloud.scale.set(55+rng()*30,8+rng()*4,1);sea.add(cloud);
    }
    const mistM=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uTime:time,uNight:night,uMist:mistiness},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uTime;uniform float uNight;uniform float uMist;void main(){float a=pow(max(0.,1.-length((vUv-.5)*2.)),2.);a*=.035+uMist*.23;a*=.65+.35*sin(vUv.x*24.+uTime*.12+sin(vUv.y*16.));gl_FragColor=vec4(mix(vec3(.87,.92,.79),vec3(.57,.70,.82),uNight),a);}`});
    for(const side of [-1,1])for(let i=0;i<4;i++){
        const mist=new THREE.Mesh(new THREE.PlaneGeometry(270,22),mistM);mist.position.set(0,0+i*3,side*(46+i*8));mist.userData.drift=i+side;root.add(mist);
    }
    const auroraNight={value:0};
    const auroraG=new THREE.PlaneGeometry(410,40,100,8);
    const auroraM=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{uTime:time,uNight:auroraNight},vertexShader:`uniform float uTime;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.y+=sin(p.x*.024+uTime*.06)*12.;p.z+=sin(p.x*.018+uTime*.04)*18.;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform float uNight;varying vec2 vUv;void main(){float a=sin(vUv.y*3.14159)*pow(1.-vUv.y,2.)*sin(vUv.x*3.14159);a*=.6+.4*sin(vUv.x*280.);gl_FragColor=vec4(mix(vec3(.23,.8,.65),vec3(.45,.39,.8),vUv.y),a*uNight*.48);}`});
    for(const side of [-1,1]){const a=new THREE.Mesh(auroraG,auroraM);a.position.set(0,78,side*280);root.add(a);}
    const starsG=new THREE.BufferGeometry(),starsP:number[]=[];
    for(let i=0;i<420;i++){const a=rng()*Math.PI*2,y=.15+rng()*.85,r=Math.sqrt(1-y*y);starsP.push(Math.cos(a)*r*450,y*450,Math.sin(a)*r*450);}
    starsG.setAttribute('position',new THREE.Float32BufferAttribute(starsP,3));
    const starsM=new THREE.PointsMaterial({color:0xc2d9e8,size:1.1,transparent:true,opacity:0,depthWrite:false,fog:false});root.add(new THREE.Points(starsG,starsM));
    const mistBands=root.children.filter(c=>c.userData.drift!==undefined);
    return {update(e:Environment=sampleEnvironment(time.value)){
        skyColors(e,horizon.value,zenith.value);mistiness.value=e.mist;auroraNight.value=night.value*(1-e.overcast);
        moon.visible=night.value>.15; (moon.material as THREE.MeshBasicMaterial).opacity=night.value*(1-e.overcast*.85);
        starsM.opacity=night.value*.72*(1-e.overcast);
        clouds.position.x=Math.sin(time.value*.003)*65;
        cloudMat.color.setRGB(1-night.value*.48-e.overcast*.23,1-night.value*.37-e.overcast*.21,1-night.value*.23-e.overcast*.16);
        cloudMat.opacity=.75+e.overcast*.2;seaMat.opacity=night.value*.28+e.mist*.2;
        mistBands.forEach(m=>m.position.x=Math.sin(time.value*.009+m.userData.drift)*32);

    }};
}
