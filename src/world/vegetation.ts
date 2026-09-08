import { journeyAt } from './journey';
import * as THREE from 'three';
import { rand, box, rock, beam, M, consolidate } from '../art';
import { fracturedRock } from './geology';
import { blendColor, regionAt, renderedHeight, SECTION_SIZE, waterfallSites, riverProfile } from './terrain';
export function vegetationLibrary(time: {value:number},feet={value:Array.from({length:6},()=>new THREE.Vector3(1e5,1e5,1e5))}) {
    const wood = new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
    const leaf = new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9});
    const grass = new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:1});
    for (const [material,strength] of [[leaf,.16],[grass,.20]] as const) material.onBeforeCompile = shader => {
        shader.uniforms.windTime=time;shader.uniforms.morrowFeet=feet;
        shader.vertexShader='uniform float windTime;uniform vec3 morrowFeet[6];\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat wind=sin(windTime*1.1+instanceMatrix[3].x*.13+instanceMatrix[3].z*.2);\ntransformed.x+=wind*${strength}*max(0.0,position.y);
${material===grass?`vec3 anchor=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
vec3 push=vec3(0.);for(int foot=0;foot<6;foot++){vec3 d=anchor-morrowFeet[foot];float influence=(1.-smoothstep(.3,1.55,length(d.xz)))*(1.-smoothstep(.03,.4,morrowFeet[foot].y));push+=vec3(d.x,0.,d.z)/max(.2,length(d.xz))*influence;}
mat3 basis=mat3(instanceMatrix);vec3 localPush=vec3(dot(normalize(basis[0]),push),0.,dot(normalize(basis[2]),push));
transformed+=localPush*.9*max(0.,position.y);transformed.y*=1.-min(.65,length(push)*.45);`:''}
#endif`);
    };
    const variants: {trunkG:THREE.BufferGeometry;leafG:THREE.BufferGeometry}[]=[];
    for(let kind=0;kind<4;kind++) {
        const trunk=new THREE.Group(),canopy=new THREE.Group(),rng=rand(826+kind*97);
        const tall=kind===1?3.7:kind===2?3.8:2.6, lean=kind===3?.65:.12;
        beam(trunk,M.wood,new THREE.Vector3(),new THREE.Vector3(lean*.4,tall*.55,0),.13);
        beam(trunk,M.wood,new THREE.Vector3(lean*.4,tall*.55,0),new THREE.Vector3(lean,tall,0),.085);
        if(kind===2) {
            for(let tier=0;tier<5;tier++) {
                const geo=new THREE.ConeGeometry(1.2-tier*.19,1.55-tier*.15,7);
                geo.translate(lean,tall*.34+tier*.53,0);
                const crown=new THREE.Mesh(geo,M.leaves);crown.rotation.y=tier*.7;canopy.add(crown);
            }
        } else for(let i=0;i<(kind===1?9:6);i++) {
            const a=i*2.4,spread=kind===1?.36:kind===3?1.1:.85;
            const x=lean+Math.cos(a)*spread*(.6+rng()*.5),z=Math.sin(a)*spread;
            const y=kind===1?1.8+i*.22:tall-.55+rng()*.6;
            beam(trunk,M.wood,new THREE.Vector3(lean*.4,tall*.5,0),new THREE.Vector3(x,y,z),.045);
            rock(canopy,M.leaves,x,y,z,kind===1?.46:.65+rng()*.3,kind===1?.7:.35+rng()*.24,.5+rng()*.25);
            if(kind!==1)rock(canopy,M.leaves,x*.6+lean*.3,y+.36,z*.6,.65,.38,.62);
        }
        consolidate(trunk);consolidate(canopy);
        variants.push({trunkG:(trunk.children[0] as THREE.Mesh).geometry,leafG:(canopy.children[0] as THREE.Mesh).geometry});
    }
    const blade = new THREE.BufferGeometry();
    blade.setAttribute('position',new THREE.Float32BufferAttribute([-.13,0,0,.13,0,0,.08,.9,0,0,0,-.12,0,0,.12,.07,.7,0,-.09,0,-.08,.09,0,.08,-.13,.6,.07],3));blade.computeVertexNormals();
    const fernP:number[]=[];
    for(let frond=0;frond<7;frond++) {
        const angle=frond*2.4;
        const point=(distance:number,height:number,offset:number)=>[Math.cos(angle)*distance+Math.sin(angle)*offset,height,Math.sin(angle)*distance-Math.cos(angle)*offset];
        for(let leaf=1;leaf<6;leaf++) {
            const d=leaf*.12,y=Math.sin(leaf/6*Math.PI)*.38;
            for(const side of [-1,1]) fernP.push(...point(d,y,0),...point(d-.1,y+.04,side*(.16-leaf*.016)),...point(d+.11,y+.06,0));
        }
    }
    const fernG=new THREE.BufferGeometry();fernG.setAttribute('position',new THREE.Float32BufferAttribute(fernP,3));fernG.computeVertexNormals();
    const reedP:number[]=[],reedRng=rand(224);
    for(let stem=0;stem<7;stem++) {
        const angle=stem*2.4,h=.7+reedRng()*.9,x=Math.cos(angle)*.22,z=Math.sin(angle)*.22;
        reedP.push(x-.018,0,z,x+.018,0,z,x+.05,h,z);
        for(const side of [-1,1])reedP.push(x,h*.28,z,x+Math.cos(angle)*side*.25,h*.72,z+Math.sin(angle)*side*.25,x+.05,h*.83,z);
    }
    const reedG=new THREE.BufferGeometry();reedG.setAttribute('position',new THREE.Float32BufferAttribute(reedP,3));reedG.computeVertexNormals();
    const stoneG=fracturedRock(730,new THREE.Color(0xffffff),2), flowerG=new THREE.IcosahedronGeometry(1,0);
    return {wood,leaf,grass,variants,blade,fernG,reedG,stoneG,flowerG};
}
interface PlantPlacement {x:number;y:number;z:number;s:number;r:number;angle:number;kind?:number}
export function populateVegetation(root: THREE.Group, origin:number, lib:ReturnType<typeof vegetationLibrary>,density=1) {
    const rng=rand(Math.floor(origin)*7919+831), section=Math.round(origin/SECTION_SIZE), trees:PlantPlacement[]=[],blades:PlantPlacement[]=[],flowers:PlantPlacement[]=[],ferns:PlantPlacement[]=[],reeds:PlantPlacement[]=[],bankStones:PlantPlacement[]=[],stones:PlantPlacement[]=[];
    const transform=new THREE.Object3D();
    for(let i=0;i<126*density;i++){
        const x=(rng()-.5)*SECTION_SIZE,gx=x+origin, r=regionAt(gx);
        const side=i%2?1:-1, z=side*(i<18?8+rng()*9:i<55?[59,67,77][i%3]+rng():76+rng()*57);
        if(Math.abs(z)<95&&Math.abs(z)>52&&waterfallSites(origin,side).some(([site,w])=>Math.abs(x-site)<w+1.8))continue;
        if(Math.abs(z)<22 && (Math.abs(x)<13 || side>0 || (section%5+5)%5===0))continue;
        if(r>.55 && rng()<.55)continue;
        const grove=Math.sin(gx*.095+z*.077)+Math.sin(gx*.041-z*.13);
        if(grove<-.35 && rng()<.83)continue;
        const passage=journeyAt(gx);
        if(rng()<passage.overlook*.78)continue;
        const scale=(i<18?.65:.9)+rng()*1.35;
        const kind=r>1.5?(rng()<.65?2:1):r>.7?(rng()<.65?3:1):Math.floor(rng()*4);
        trees.push({x,y:renderedHeight(gx,z)-.16,z,s:scale,r,angle:rng()*6,kind});
    }
    // Long groves sit along the banks, framing the road without filling the foot corridor.
    for(let i=0;i<180*density;i++){
        const x=(rng()-.5)*SECTION_SIZE,gx=x+origin,passage=journeyAt(gx);
        if(rng()>passage.woodland)continue;
        const side=i%3===0?1:-1,z=side*(side>0?16+rng()*10:7.5+rng()*16);
        trees.push({x,y:renderedHeight(gx,z)-.15,z,s:1.1+rng()*1.6,r:regionAt(gx),angle:rng()*6,kind:i%4===0?2:0});
    }
    root.userData.perches=trees.filter(p=>p.z<0&&Math.abs(p.z)<20&&p.s>1.2).slice(0,4).map(p=>({x:p.x+origin,y:p.y+p.s*3.05,z:p.z}));
    for(let i=0;i<1800*density;i++){
        const x=(rng()-.5)*SECTION_SIZE,gx=x+origin,z=(rng()>.5?1:-1)*(2.95+rng()*14.6),r=regionAt(gx);
        const item={x,y:renderedHeight(gx,z),z,s:.2+rng()*.47,r,angle:rng()*6};
        const patch=Math.sin(gx*.29+z*.35)+Math.sin(gx*.11-z*.8);
        if(patch>-.7)blades.push({...item,s:item.s*(patch>.8?1.3:.75)});
        if(i%4===0&&journeyAt(gx).meadow>.4&&patch>.7)flowers.push({...item,y:item.y+item.s*.7,s:.035+rng()*.055});
        if(i%29===0&&r<.8&&Math.abs(z)>7&&patch>.1)ferns.push({...item,s:.65+rng()*.75});
        if(i%24===0)stones.push({...item,y:item.y-.08,s:.2+rng()*.6});
    }
    for(let i=0;i<100*density;i++) {
        const x=(rng()-.5)*SECTION_SIZE,gx=origin+x,side=i%2?1:-1,outer=i%4<2;
        if(waterfallSites(origin,side).some(([site,width])=>Math.abs(x-site)<width*1.2+1))continue;
        const profile=riverProfile(gx,side),beach=outer?profile.farBeach:profile.nearBeach;
        const edge=profile.center+(outer?profile.farWidth:-profile.nearWidth),direction=outer?1:-1;
        const r=regionAt(gx),patch=Math.sin(gx*.18+side)+Math.sin(gx*.071+side*2);
        const z=side*(edge+direction*(.25+rng()*1.5)),y=renderedHeight(gx,z);
        if(patch>-.25 && !(r>.65&&r<1.5&&rng()<.55))reeds.push({x,y:y-.12,z,s:.6+rng()*.75,r,angle:rng()*6});
        if(i%6===0) {
            const zz=side*(edge+direction*(.1+rng()*beach*.6));
            bankStones.push({x,y:renderedHeight(gx,zz)-.1,z:zz,s:.5+rng()*1.1,r,angle:rng()*6});
        }
        if(i%9===0&&patch>.1&&r<.8) {
            const zz=side*(edge+direction*(beach*.65+.5));
            trees.push({x,y:renderedHeight(gx,zz)-.12,z:zz,s:.3+rng()*.3,r,angle:rng()*6,kind:0});
        }
    }
    function batch(g:THREE.BufferGeometry,m:THREE.Material,items:PlantPlacement[],color:(r:number,i:number)=>THREE.Color,scaleY=1){
        const inst=new THREE.InstancedMesh(g,m,items.length);inst.userData.sharedWorldGeometry=true;
        items.forEach((p,i)=>{transform.position.set(p.x,p.y,p.z);transform.rotation.set(0,p.angle,0);transform.scale.set(p.s,p.s*scaleY,p.s);transform.updateMatrix();inst.setMatrixAt(i,transform.matrix);inst.setColorAt(i,color(p.r,i));});
        inst.instanceMatrix.needsUpdate=true;inst.receiveShadow=true;inst.castShadow=lib.variants.some(v=>v.trunkG===g||v.leafG===g);root.add(inst);return inst;
    }
    lib.variants.forEach((variant,kind)=>{
        const family=trees.filter(p=>p.kind===kind);
        batch(variant.trunkG,lib.wood,family,r=>blendColor(kind===1?0xa6a489:0x665d44,0x7e6045,0x566477,r));
        batch(variant.leafG,lib.leaf,family,(r,i)=>blendColor(kind===2?0x315e52:i%3?0x4d8059:0x83a65b,kind===3?0x9f9a68:0xb09c61,kind===2?0x415f72:0x789796,r));
    });
    const reedBatch=batch(lib.reedG,lib.grass,reeds,(r,i)=>blendColor(i%3?0x667c43:0xa4a36c,0x8e915d,0x78908e,r));reedBatch.name='Clustered shoreline reeds';
    const stonesBatch=batch(lib.stoneG,lib.wood,bankStones,r=>blendColor(0x657569,0x9a886a,0x6f8392,r),.62);stonesBatch.name='Water-worn bank stones';
    const grassBatch=batch(lib.blade,lib.grass,blades,(r,i)=>blendColor(i%3?0x799c4e:0xa1b65c,0xc5a36e,0x8babb0,r));grassBatch.name='Morrow-responsive verge grass';
    batch(lib.fernG,lib.grass,ferns,(r,i)=>blendColor(i%2?0x557c40:0x819c51,0xa29164,0x739592,r));
    batch(lib.flowerG,lib.leaf,flowers,(_,i)=>new THREE.Color(i%3?0xf2dea1:0xb3a3ce));
    batch(lib.stoneG,lib.wood,stones,r=>blendColor(0x8a9580,0xb48b69,0x7f96a2,r),.65);
}
