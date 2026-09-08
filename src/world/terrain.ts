import { journeyAt } from './journey';
import * as THREE from 'three';
export const SECTION_SIZE = 96;
export const smooth = (a: number, b: number, x: number) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const regionAt = (x: number) => smooth(100, 200, -x) + smooth(330, 450, -x);
export function blendColor(a: number, b: number, c: number, region: number) {
    return new THREE.Color(a).lerp(new THREE.Color(b), Math.min(1, region)).lerp(new THREE.Color(c), Math.max(0, region - 1));
}
export const WATER_LEVEL = -10.5;
export const TERRAIN_SEGMENTS = 64;
function hash(x:number,z:number) { let h=Math.imul(x,374761393)^Math.imul(z,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295*2-1; }
export function landNoise(x:number,z:number) {
    const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iz),hash(ix+1,iz),u),THREE.MathUtils.lerp(hash(ix,iz+1),hash(ix+1,iz+1),u),v);
}
// All dimensions are in route coordinates; no section-local random values can
// create a discontinuity in the river, its banks, or its bed at a seam.
export function riverProfile(x:number,side=-1) {
    const phase=side<0?0:2.7;
    const center=(side<0?39:43)+Math.sin(x*(side<0?.025:.019)+phase)*(side<0?5.5:7)
        +landNoise(x*.032,side*7)*1.5;
    const pool=smooth(-.4,.65,landNoise(x*.012,side*13));
    const ripple=landNoise(x*.14,side*3)*.65;
    const nearWidth=3.5+pool*5.6+landNoise(x*.055,side*5)*.7+ripple;
    const farWidth=3.9+pool*4.4+landNoise(x*.063,side*11)*.9-ripple*.55;
    const nearBeach=2.2+pool*2.2+smooth(-.5,.6,landNoise(x*.033,side*19))*3.1;
    const farBeach=1.7+smooth(-.4,.6,landNoise(x*.042,side*23))*3;
    return {center,nearWidth,farWidth,nearBeach,farBeach,depth:2.2+pool*2.6,pool};
}
export const riverCenter = (x:number,side=-1) => riverProfile(x,side).center;
export const cliffShift = (x:number,side:number) => Math.sin(x*.042+(side>0?1.8:0))*2.1+Math.sin(x*.12)*.7+landNoise(x*.033,side*29)*2.4;
export function waterfallSites(origin:number,side=-1): number[][] {
    const r=regionAt(origin);
    if(side>0)return [[17+Math.sin(origin*.017)*13,r<.65?3.2:r<1.5?1.1:2.0]];
    if(r<.65)return Math.round(origin/SECTION_SIZE)%3===0 ? [[-31,3.6],[-15,2.2],[1,4.6]] : [[-11+Math.sin(origin)*13,2.5]];
    return [[-32,r<1.5?1.3:2.5]];
}
function baseHeight(x: number, z: number) {
    const a=Math.abs(z),side=Math.sign(z);
    if(a<=5)return -.08;
    const shoulder=smooth(5,12,a),floorEnd=27+landNoise(x*.024,side*31)*3.5;
    const valley=-9*smooth(9+landNoise(x*.038,side*17),floorEnd,a);
    const cliffZ=a+cliffShift(x,side);
    const terraces=((7.5+landNoise(x*.032,side*37)*2.2)*smooth(53.5,57.5,cliffZ)
        +(6.8+landNoise(x*.043,side*41)*1.8)*smooth(62,65.5,cliffZ)
        +(8.6+landNoise(x*.027,side*43)*2.4)*smooth(70,74,cliffZ))*(z>0?.72:1);
    const rolling=(landNoise(x*.027,z*.035)*5.5+landNoise(x*.091,z*.082)*1.1)*shoulder;
    const erosion=-Math.pow(Math.max(0,1-Math.abs(landNoise(x*.052+Math.sin(a*.09)*.35,side*47)*5)),3)
        *2.6*smooth(8,15,a)*(1-smooth(26,33,a));
    const passage=journeyAt(x);
    const nearBank=shoulder*(1-smooth(22,31,a));
    let height=-.08+valley+terraces+rolling+erosion+nearBank*(passage.woodland*1.8-passage.overlook*3.2);
    // The wet margin, beach and submerged bed form one surface. Their waterline
    // is independent of surrounding hills, avoiding detached water-strip edges.
    if(a>5&&a<85) {
        const profile=riverProfile(x,side),delta=a-profile.center;
        const half=delta<0?profile.nearWidth:profile.farWidth;
        const beach=delta<0?profile.nearBeach:profile.farBeach;
        const edge=Math.abs(delta)-half;
        if(edge<=0)height=WATER_LEVEL-profile.depth*Math.pow(Math.max(0,1-(delta/half)**2),.8);
        else if(edge<beach+5) {
            const bank=WATER_LEVEL+.25*smooth(0,1.2,edge)+1.6*smooth(.3,beach+1,edge);
            height=THREE.MathUtils.lerp(bank,height,smooth(beach,beach+5,edge));
        }
    }
    return height;
}
export function sourceLevel(x:number,z:number){return baseHeight(x,z)+.12;}
export function surfaceHeight(x:number,z:number){
    let y=baseHeight(x,z);
    if(Math.abs(z)>79&&Math.abs(z)<91){
        const origin=Math.round(x/SECTION_SIZE)*SECTION_SIZE;
        for(const [site] of waterfallSites(origin,Math.sign(z))){
            const xx=origin+site,r=Math.hypot((x-xx)/5,(Math.abs(z)-85)/7);
            if(r<1)y=THREE.MathUtils.lerp(sourceLevel(xx,Math.sign(z)*85)-1,y,smooth(.5,1,r));
        }
    }
    return y;
}
const coarseZ = [-360,-300,-240,-190,-150,-120,-100,-90,-82,-78,-74,-73,-72,-71,-70,-68,-65,-64,-63,-62,-60,-57,-56,-55,-54,-52,-48,-44,-40,-36,-32,-28,-24,-20,-16,-12,-9,-7,-5,0,5,7,9,12,16,20,24,28,32,36,40,44,48,52,54,55,56,57,60,62,63,64,65,68,70,71,72,73,74,78,82,90,100,120,150,190,240,300,360];
const zs = [...new Set([...coarseZ, ...Array.from({length:61},(_,i)=>i+22), ...Array.from({length:61},(_,i)=>-i-22), ...Array.from({length:21},(_,i)=>i*.5-5)])].sort((a,b)=>a-b);
// Sample the triangles that are actually drawn. Narrow gullies can sit below
// the analytic height field's linear mesh interpolation between vertices.
export function renderedHeight(x:number,z:number) {
    const step=SECTION_SIZE/TERRAIN_SEGMENTS,x0=Math.floor(x/step)*step,tx=(x-x0)/step;
    let lo=0,hi=zs.length-1;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(zs[mid]<=z)lo=mid;else hi=mid;}
    const z0=zs[lo],z1=zs[hi],tz=THREE.MathUtils.clamp((z-z0)/(z1-z0),0,1);
    const y00=surfaceHeight(x0,z0),y10=surfaceHeight(x0+step,z0),y01=surfaceHeight(x0,z1),y11=surfaceHeight(x0+step,z1);
    return tx+tz<=1?y00+tx*(y10-y00)+tz*(y01-y00):y11+(1-tx)*(y01-y11)+(1-tz)*(y10-y11);
}
export function createTerrain(origin: number, material: THREE.Material) {
    const positions: number[] = [], colors: number[] = [], normals: number[] = [], indices: number[] = [];
    const nx = TERRAIN_SEGMENTS;
    for (let j = 0; j < zs.length; j++) for (let i = 0; i <= nx; i++) {
        const x = i / nx * SECTION_SIZE - SECTION_SIZE / 2, gx = x + origin, z = zs[j], y = surfaceHeight(gx,z), r = regionAt(gx);
        positions.push(x,y,z);
        const dz=(surfaceHeight(gx,z+.3)-surfaceHeight(gx,z-.3))/.6;
        const dx=(surfaceHeight(gx+.3,z)-surfaceHeight(gx-.3,z))/.6;
        const length=Math.hypot(dx,1,dz);normals.push(-dx/length,1/length,-dz/length);
        const slope = Math.hypot(dx,dz);
        const grass = blendColor(0x6f9659,0xbb925c,0x586d7d,r);
        const cliff = blendColor(0x576e68,0xb67550,0x586b7e,r);
        const color = grass.lerp(cliff,smooth(.45,2,slope));
        if(Math.abs(z)>5&&Math.abs(z)<85) {
            const river=riverProfile(gx,Math.sign(z)),delta=Math.abs(z)-river.center;
            const edge=Math.abs(delta)-(delta<0?river.nearWidth:river.farWidth);
            const beach=delta<0?river.nearBeach:river.farBeach;
            const sand=blendColor(0xb5b38a,0xccab7d,0x9caeaa,r);
            const wet=blendColor(0x596f60,0x8b8063,0x526e7d,r);
            const bed=blendColor(0x527b65,0x83856a,0x526f80,r);
            if(edge<0)color.copy(bed).lerp(wet,smooth(-1.8,0,edge));
            else color.lerp(wet.lerp(sand,smooth(0,1.4,edge)),1-smooth(beach*.7,beach+2,edge));
        }
        if (Math.abs(z)<5) {
            const center=landNoise(gx*.026,51)*.65,half=2.0+landNoise(gx*.065,53)*.45;
            const offset=Math.abs(z-center),wear=1-smooth(half-.55,half+.65,offset);
            const earth=blendColor(0xb7a680,0xc2a17a,0x889d97,r);
            earth.multiplyScalar(.98+landNoise(gx*.12,z*.7)*.06);
            color.lerp(earth,wear);
        }
        color.multiplyScalar(.97 + Math.sin(gx * .81 + z * .65) * .025);
        colors.push(color.r,color.g,color.b);
        if (j < zs.length-1 && i < nx) { const a=j*(nx+1)+i,b=a+nx+1; indices.push(a,b,a+1,a+1,b,b+1); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    const mesh = new THREE.Mesh(g,material);mesh.receiveShadow=true;mesh.name='Continuous ridge and terraced valley';return mesh;
}
export function terrainMaterial(time: { value: number }) {
    const material = new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96});
    material.onBeforeCompile = shader => {
        shader.uniforms.landscapeTime = time;
        shader.vertexShader = 'varying vec3 vLandscapePosition;\n'+shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvLandscapePosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
        shader.fragmentShader = 'uniform float landscapeTime; varying vec3 vLandscapePosition;\n'+shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat cloudShade=smoothstep(0.35,0.8,sin(vLandscapePosition.x*.022-landscapeTime*.012)*sin(vLandscapePosition.z*.026+landscapeTime*.007));\ndiffuseColor.rgb*=(1.0-cloudShade*.13)*(.95+.05*sin(vLandscapePosition.y*3.0+sin(vLandscapePosition.x*.21)));');
    };
    return material;
}
