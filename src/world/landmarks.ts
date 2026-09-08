import * as THREE from 'three';
import { M, box, cyl, mesh, rock, beam, consolidate, rand } from '../art';
import { blendColor, regionAt, surfaceHeight, waterfallSites, cliffShift } from './terrain';
import { waterfall } from './water';
import { fracturedRock, geologyMaterial } from './geology';
export function mountain(root:THREE.Group,x:number,z:number,height:number,radius:number,region:number,seed:number,layer:number){
    const rng=rand(seed),p:number[]=[],c:number[]=[],rings:number[][][]=[];
    const broad=rng()>.5, skew=(rng()-.5)*radius*.75;
    const levels=[[-.2,1],[.12,.95],[.4,broad?.85:.64],[.73,broad?.56:.30],[1,broad?.23:.025]];
    for(let j=0;j<levels.length;j++){
        const ring=[];for(let i=0;i<11;i++){const a=i/11*Math.PI*2,r=radius*levels[j][1]*(.8+rng()*.35);ring.push([x+Math.cos(a)*r+skew*j/4,levels[j][0]*height+14+(j===0?0:Math.sin(a*2+seed)*height*(j===4?.012:.065)+(rng()-.5)*height*(j===4?.015:.065)),z+Math.sin(a)*r]);}rings.push(ring);
    }
    const base=blendColor(0x5e847f,0xad816d,0x657b9c,region).lerp(new THREE.Color(0xb3c8c4),layer*.18);
    const cap=blendColor(0xc4d3c5,0xdbb894,0xd5e1e4,region);
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<11;i++)for(const tri of [[rings[j][i],rings[j+1][i],rings[j][(i+1)%11]],[rings[j][(i+1)%11],rings[j+1][i],rings[j+1][(i+1)%11]]]){
        const shade=.83+rng()*.25;
        for(const v of tri){p.push(...v);const color=base.clone().lerp(cap,THREE.MathUtils.smoothstep(v[1],height*.7+14,height*.94+14)).multiplyScalar(shade);c.push(color.r,color.g,color.b);}
    }
    const summit=[x+skew,height*(broad?1.06:1.025)+14,z];
    for(let i=0;i<11;i++) {
        const shade=.91+rng()*.13;
        for(const v of [rings[4][i],summit,rings[4][(i+1)%11]]) {
            p.push(...v);const color=cap.clone().multiplyScalar(shade);c.push(color.r,color.g,color.b);
        }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.computeVertexNormals();
    const m=new THREE.Mesh(g,mountainMaterial);m.name='Layered mountain ridge';root.add(m);
}
const mountainMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
const cliffStone=new THREE.MeshStandardMaterial({color:0x70867c,roughness:1});
const ruinStone=new THREE.MeshStandardMaterial({color:0xbcbda3,roughness:.95});
const canyonStone=new THREE.MeshStandardMaterial({color:0xb67b55,roughness:1});
const moonStone=new THREE.MeshStandardMaterial({color:0x97acbb,roughness:.75});
function archShape(outer:number,inner:number){const s=new THREE.Shape();s.absarc(0,0,outer,0,Math.PI,false);s.absarc(0,0,inner,Math.PI,0,true);s.closePath();return s;}
function aqueduct(root:THREE.Group,origin:number,x:number,z:number){
    const g=new THREE.Group();root.add(g);const top=27,spacing=6.8;
    for(let i=0;i<7;i++){
        const xx=x+i*spacing,base=surfaceHeight(origin+xx,z)-.8;
        box(g,ruinStone,xx,(base+top-3.4)/2,z,1.1,top-3.4-base,1.9);
        box(g,cliffStone,xx,top-3.4,z,1.65,.48,2.3);
        box(g,ruinStone,xx,base+.5,z,1.8,1.8,2.6);
        if(i<6){mesh(g,new THREE.ExtrudeGeometry(archShape(3.95,2.82),{depth:1.6,bevelEnabled:false,curveSegments:16}),ruinStone,xx+spacing/2,top-3.4,z-.8);box(g,cliffStone,xx+spacing/2,top+.18,z,spacing,.5,2.15);}
        if(i<5){box(g,ruinStone,xx+2,top+.85,z-.9,4,.85,.24);box(g,ruinStone,xx+2,top+.85,z+.9,4,.85,.24);}
        if(i%2===0)rock(g,M.moss,xx,base+1,z+.8,.8,.2,1.0);
    }
    // Broken end and scattered masonry explain the ruin's age.
    for(let i=0;i<5;i++)rock(g,ruinStone,x+44+i, surfaceHeight(origin+x+44+i,z)+.4,z+(i%2)*1.7,1.3,.6,.9);
    consolidate(g);g.name='The Old Kings Aqueduct';
}
function canyonArch(root:THREE.Group,origin:number,x:number,z:number){
    const g=new THREE.Group();root.add(g);const base=surfaceHeight(origin+x,z)-1;
    for(const side of [-1,1]) {
        const xx=x+side*10,ground=surfaceHeight(origin+xx,z)-1.5;
        mesh(g,fracturedRock(origin+side*127, new THREE.Color(0xb67b55),1),geologyMaterial,
            xx,ground,z,8.8,base+14-ground,7.5);
        for(let i=0;i<3;i++) {
            const sx=xx+side*(3+i*.6),sz=z+2+i;
            mesh(g,fracturedRock(origin+side*421+i,new THREE.Color(0xaa795a),2),geologyMaterial,
                sx,surfaceHeight(origin+sx,sz)-.3,sz,1.8+i*.4,.8+i*.35,1.8);
        }
    }
    const weatheredArch=new THREE.Shape();
    for(let i=0;i<=16;i++){const a=i/16*Math.PI,r=13+Math.sin(i*1.7)*.8;const xx=Math.cos(a)*r,yy=Math.sin(a)*r;if(i===0)weatheredArch.moveTo(xx,yy);else weatheredArch.lineTo(xx,yy);}
    for(let i=16;i>=0;i--){const a=i/16*Math.PI,r=8+Math.sin(i*2.1)*.45;weatheredArch.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
    weatheredArch.closePath();
    mesh(g,new THREE.ExtrudeGeometry(weatheredArch,{depth:5,bevelEnabled:true,bevelSize:.35,bevelThickness:.5,bevelSegments:1}),canyonStone,x,base+9,z-2.5);
    const observatory=new THREE.Group();g.add(observatory);observatory.position.set(x+22,surfaceHeight(origin+x+22,z-4)-1,z-4);
    mesh(observatory,new THREE.CylinderGeometry(5.8,10,12,7),canyonStone,0,6,0);
    for(const y of [2,5,8,11])cyl(observatory,ruinStone,0,y,0,9.5-y*.28,.15);
    cyl(observatory,ruinStone,0,12,0,5.0,.75);
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;cyl(observatory,ruinStone,Math.cos(a)*3.5,14,Math.sin(a)*3.5,.26,4);}
    const ring=mesh(observatory,new THREE.TorusGeometry(3,.12,6,36),M.brass,0,17,0);ring.rotation.x=.8;
    consolidate(g);g.name='Sandstone arch and mesa observatory';
}
export const sanctuaryGlow=new THREE.MeshStandardMaterial({color:0x8ed5cc,emissive:0x4aa7a0,emissiveIntensity:.35,roughness:.5});
function sanctuary(root:THREE.Group,origin:number,x:number,z:number){
    const g=new THREE.Group();root.add(g);const base=surfaceHeight(origin+x,z);
    const foundation=fracturedRock(origin+Math.floor(x)*713,new THREE.Color(0x8197a9),1);
    const vertices=foundation.attributes.position;
    for(let i=0;i<vertices.count;i++)if(vertices.getY(i)>.9)vertices.setY(i,.94);
    foundation.computeVertexNormals();
    mesh(g,foundation,geologyMaterial,x,base-4,z,26,12.4,20);cyl(g,moonStone,x,base+8,z,8,.9);
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;const xx=x+Math.cos(a)*6,zz=z+Math.sin(a)*6;cyl(g,moonStone,xx,base+12,zz,.45,8);box(g,moonStone,xx,base+16,zz,1.4,.6,1.4);}
    const ring=mesh(g,new THREE.TorusGeometry(6,.38,6,50),moonStone,x,base+16.5,z);ring.rotation.x=Math.PI/2;
    const crystal=mesh(g,new THREE.OctahedronGeometry(2.1),sanctuaryGlow,x,base+11,z,1,2,1);
    crystal.userData.sanctuary=true;consolidate(g);g.name='Sanctuary above the cloud sea';
}
export function landmarks(root:THREE.Group,origin:number,fallMaterial:THREE.Material,poolMaterial:THREE.Material){
    const rng=rand(origin*331+77),r=regionAt(origin),falls=waterfallSites(origin);
    for(const side of [-1,1])for(let layer=0;layer<3;layer++)for(let i=0;i<2;i++){
        const x=-36+i*57+(rng()-.5)*12,z=side*(150+layer*82),region=regionAt(origin+x);
        mountain(root,x,z,28+layer*19+rng()*18+Math.max(0,region-1)*12,33+layer*10,region,origin+side*721+layer*19+i,layer);
    }
    const cliffs=new THREE.Group();root.add(cliffs);
    
    for (const side of [-1, 1]) for (let bandIndex = 0; bandIndex < 3; bandIndex++) {
        const band = [55, 63, 72][bandIndex];
        // Leave open grassy shelves between outcrop groups. Wide buttresses,
        // narrow fractured fins and low talus have different silhouettes.
        for (let cluster = 0; cluster < 5; cluster++) {
            const center = -42 + cluster * 19 + (rng() - .5) * 13;
            if (rng() < .18) continue;
            const count = 1 + Math.floor(rng() * 3);
            for (let j = 0; j < count; j++) {
                const x = center + (j - (count - 1) / 2) * (3 + rng() * 3), gx = origin + x;
                const w = 3.5 + rng() * 6.5;
                if (Math.abs(x) + w * .7 > 47) continue;
                if (waterfallSites(origin, side).some(([site,width]) => Math.abs(site-x)<width*.7+w+1.8)) continue;
                const shift=cliffShift(gx,side), z=side*(band-shift);
                const top=surfaceHeight(gx,side*(band+3-shift));
                const bottom=surfaceHeight(gx,side*(band-3-shift));
                const height=Math.max(2,top-bottom)+1+rng()*1.8;
                const color=blendColor(0x63796b,0xad7454,0x718797,regionAt(gx));
                const formation=mesh(cliffs,fracturedRock(origin*373+side*731+bandIndex*89+cluster*7+j,color,j%3),
                    geologyMaterial,x,bottom-1.5,z,w*(j%3===0?1.4:j%3===2?1.5:1),height*(j%3===2?.52:.93),3+rng()*3);
                formation.rotation.y=(rng()-.5)*.6;
                if (r<.7 && rng()>.5) rock(cliffs,M.moss,x,top-.15,z+side*1.6,w*.28,.1,.65);
                // Fallen shards accumulate at the foot of selected formations.
                if(j===0)for(let k=0;k<2;k++) {
                    const xx=x+(rng()-.5)*w,zz=z-side*(3+rng()*2),size=.7+rng()*1.5;
                    mesh(cliffs,fracturedRock(origin+cluster*23+k+bandIndex*331,color,2),geologyMaterial,
                        xx,surfaceHeight(origin+xx,zz)-.3,zz,size*1.8,size*.7,size);
                }
            }
        }
    }
    consolidate(cliffs);
    // Features live at fixed route coordinates; upcoming biomes enter the view naturally.
    if(r<.65){
        const major = Math.round(origin / 96) % 3 === 0;
        for(const side of [-1,1]){
            for(const [x,w] of waterfallSites(origin,side)) waterfall(root,origin,x,side,w,fallMaterial,poolMaterial);
            if (major && side<0) aqueduct(root,origin,-36,side*84);
        }
    }else if(r<1.5){
        if(Math.abs(Math.round(origin/96))%2===1){canyonArch(root,origin,-10,-87);canyonArch(root,origin,8,91);}
        for(const side of [-1,1]){const [x,w]=waterfallSites(origin,side)[0];waterfall(root,origin,x,side,w,fallMaterial,poolMaterial);}
    }else{
        if(Math.abs(Math.round(origin/96))%2===0){sanctuary(root,origin,-12,-88);sanctuary(root,origin,18,94);}
        for(const side of [-1,1]){const [x,w]=waterfallSites(origin,side)[0];waterfall(root,origin,x,side,w,fallMaterial,poolMaterial);}
        const crystals=new THREE.Group();root.add(crystals);
        for(let i=0;i<12;i++){const x=(rng()-.5)*84,z=(i%2?1:-1)*(12+rng()*8);mesh(crystals,new THREE.OctahedronGeometry(.4+rng()*.55),M.rune,x,surfaceHeight(origin+x,z)+.3,z,.6,1.5,.6);}
        consolidate(crystals);
    }
}
