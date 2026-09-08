import * as THREE from 'three';
import { rand } from '../art';
import { riverCenter, surfaceHeight, renderedHeight, SECTION_SIZE, sourceLevel, cliffShift, riverProfile, WATER_LEVEL, TERRAIN_SEGMENTS } from './terrain';
export function waterMaterial(time:{value:number},night:{value:number},falls=false) {
    return new THREE.ShaderMaterial({
        uniforms:{...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),uTime:time,uNight:night,uFalls:{value:falls?1:0}},
        vertexShader:`attribute float aDepth;uniform float uTime; uniform float uFalls; varying vec2 vUv; varying vec3 vWorld; varying vec3 vSurfaceNormal; varying float vDepth;
        #include <fog_pars_vertex>
        void main(){vUv=uv;vDepth=aDepth; vec3 shaped=position;
        shaped.z+=uFalls*sin(uv.x*21.+uv.y*53.-uTime*3.)*.085*sin(uv.x*3.14159)*sin(uv.y*3.14159);
        vec4 p=modelMatrix*vec4(shaped,1.);
        p.y+=(1.-uFalls)*sin(p.x*1.8+p.z*2.4-uTime*1.7)*.035*smoothstep(0.,.7,aDepth);
        vWorld=p.xyz;vSurfaceNormal=normalize(mat3(modelMatrix)*normal);vec4 mvPosition=viewMatrix*p;gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
        }`,
        fragmentShader:`uniform float uTime;uniform float uNight;uniform float uFalls;varying vec2 vUv;varying vec3 vWorld;varying vec3 vSurfaceNormal; varying float vDepth;
        #include <fog_pars_fragment>
        void main(){
          if(uFalls>.5 && abs(vUv.x-.5)>.49-.018*sin(vUv.y*115.+uTime*1.5)) discard;
          float wave=sin(vWorld.x*1.8+vWorld.z*2.4-uTime*1.7)*sin(vWorld.x*.65-vWorld.z*1.1+uTime*.65);
          vec3 n=normalize(vec3(cos(vWorld.x*.8+uTime)*.12,1.,sin(vWorld.z*1.2-uTime*.7)*.13));
          vec3 eye=normalize(cameraPosition-vWorld);
          float glint=pow(max(0.,dot(n,normalize(eye+vec3(-.4,.8,.3)))),130.);
          float shore=1.-smoothstep(.05,1.7,vDepth);
          vec3 water=mix(vec3(.035,.20,.21),vec3(.18,.42,.32),shore*.7+.15+.07*wave);
          water=mix(water,vec3(.035,.12,.19),uNight*.9);
          water=mix(water,mix(vec3(.32,.49,.52),vec3(.07,.13,.24),uNight),pow(1.-max(0.,dot(n,eye)),3.)*.36);
          water+=vec3(.9,.87,.62)*glint*.35;
          water=mix(water,mix(vec3(.66,.79,.64),vec3(.3,.42,.5),uNight),shore*.26);
          float streak=smoothstep(.2,.9,sin(vUv.x*110.+sin(vUv.x*43.)*2.+sin(vUv.y*18.-uTime*4.)*.15)*.5+.5);
          float flow=sin(vUv.y*150.-uTime*10.+vUv.x*13.)*.5+.5;
          vec3 cascade=mix(vec3(.06,.34,.33),vec3(.58,.82,.77),.20+streak*.29+flow*.12);
          cascade=mix(cascade,cascade*vec3(.58,.75,1.),uNight*.7);
          float bodyShade=.70+.30*abs(dot(normalize(vSurfaceNormal),normalize(vec3(-.4,.8,.3))));
          cascade*=bodyShade;
          float mouth=smoothstep(.80,1.,vUv.y);
          float edge=smoothstep(0.,.06,vUv.x)*smoothstep(0.,.06,1.-vUv.x);
          gl_FragColor=vec4(mix(water,cascade,uFalls*(1.-mouth)),mix(1.,edge*(1.-smoothstep(.91,1.,vUv.y)),uFalls));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,fog:true,side:THREE.DoubleSide,transparent:falls,depthWrite:!falls,
    });
}
const mergeUV=(u:number,start:number)=>u<start?u/start*.8:.8+(u-start)/(1-start)*.2;
export function ribbon(points:THREE.Vector3[],width:number,material:THREE.Material,vertical=false,mergeStart=.8){
    const p:number[]=[],uv:number[]=[],idx:number[]=[],columns=vertical?12:8;
    for(let i=0;i<points.length;i++){
        const pt=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
        const tangent=new THREE.Vector3().subVectors(next,prev).normalize();
        const across=vertical?new THREE.Vector3(1,0,0):new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
        const fraction=i/(points.length-1),progress=mergeUV(fraction,mergeStart),mouth=THREE.MathUtils.smoothstep(progress,.78,1);
        for(let col=0;col<columns;col++){
            const u=col/(columns-1),side=u*2-1;
            const span=width*(vertical?(.92+.09*Math.sin(i*.24))*(1+mouth*1.8):1);
            const round=vertical?Math.sin(u*Math.PI)*(.14+Math.abs(tangent.y)*width*.10)*(1-mouth):0;
            p.push(pt.x+across.x*span*.5*side,pt.y+round*(1-Math.abs(tangent.y)),
                pt.z+across.z*span*.5*side-round*Math.sign(pt.z)*Math.abs(tangent.y));
            uv.push(u,progress);
            if(i<points.length-1&&col<columns-1){const a=i*columns+col;idx.push(a,a+columns,a+1,a+1,a+columns,a+columns+1);}
        }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.setAttribute('aDepth',new THREE.Float32BufferAttribute(new Float32Array(p.length/3).fill(2),1));g.computeVertexNormals();
    const m=new THREE.Mesh(g,material);m.name=vertical?'Terraced waterfall':'Valley river';return m;
}
export function riverSurface(origin:number,side:number,material:THREE.Material) {
    const p:number[]=[],uv:number[]=[],depth:number[]=[],index:number[]=[],columns=17;
    for(let i=0;i<=TERRAIN_SEGMENTS;i++) {
        const x=-SECTION_SIZE/2+i/TERRAIN_SEGMENTS*SECTION_SIZE,gx=origin+x,profile=riverProfile(gx,side);
        for(let j=0;j<columns;j++) {
            const u=j/(columns-1),cross=u*2-1;
            // Extra width is buried beneath the bank. The terrain silhouette,
            // rather than a visible mesh boundary, determines the water's edge.
            const offset=cross*(cross<0?profile.nearWidth+3:profile.farWidth+3);
            const z=side*(profile.center+offset);
            p.push(x,WATER_LEVEL,z);uv.push(u,gx/14);
            depth.push(Math.max(0,WATER_LEVEL-surfaceHeight(gx,z)));
            if(i<TERRAIN_SEGMENTS&&j<columns-1){const a=i*columns+j;
                if(side<0)index.push(a,a+columns,a+1,a+1,a+columns,a+columns+1);
                else index.push(a,a+1,a+columns,a+1,a+columns+1,a+columns);
            }
        }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('aDepth',new THREE.Float32BufferAttribute(depth,1));
    g.setIndex(index);g.computeVertexNormals();
    const water=new THREE.Mesh(g,material);water.name='Valley river';water.userData.columns=columns;return water;
}
export function rivers(root:THREE.Group,origin:number,material:THREE.Material){
    for(const side of [-1,1])root.add(riverSurface(origin,side,material));
}
const effectLibrary = new WeakMap<THREE.Material,{foam:THREE.ShaderMaterial;spray:THREE.ShaderMaterial}>();
function effects(material:THREE.Material) {
    const found=effectLibrary.get(material);if(found)return found;
    const uniforms=(material as THREE.ShaderMaterial).uniforms;
    const foam=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
        uniforms:{uTime:uniforms.uTime,uNight:uniforms.uNight},
        vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader:`varying vec2 vUv;uniform float uTime;uniform float uNight;void main(){
            vec2 q=(vUv-.5)*2.;float d=length(q);float angle=atan(q.y,q.x);
            float rings=pow(.5+.5*sin(d*27.-uTime*2.5+sin(angle*7.+d*12.)*1.8+sin(q.x*17.)*.6),5.);
            float lace=.5+.5*sin(q.x*31.+uTime)*sin(q.y*27.-uTime*.7);
            float a=(rings*.26+lace*.42)*smoothstep(1.,.68,d)*smoothstep(.03,.2,d);
            gl_FragColor=vec4(mix(vec3(.76,.88,.78),vec3(.44,.63,.69),uNight),a);
            #include <colorspace_fragment>
        }`});
    const spray=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
        uniforms:{uTime:uniforms.uTime,uNight:uniforms.uNight},
        vertexShader:`attribute float aDepth;uniform float uTime;attribute float aPhase;attribute float aSize;varying float vAlpha;
        void main(){float age=fract(uTime*.23+aPhase);vec3 p=position;
        p.y+=age*(aSize>1.?2.8:1.3)-age*age*(aSize>1.?0.:2.1);p.x+=sin(aPhase*61.)*age*1.5;
        p.z+=cos(aPhase*43.)*age;vAlpha=sin(age*3.14159)*(aSize>1.?.13:.5);
        vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(aSize*600./-mv.z,1.,75.);}`,
        fragmentShader:`uniform float uNight;varying float vAlpha;void main(){float r=length((gl_PointCoord-.5)*2.);
        gl_FragColor=vec4(mix(vec3(.80,.91,.84),vec3(.41,.59,.65),uNight),pow(max(0.,1.-r),2.)*vAlpha);
        #include <colorspace_fragment>
        }`});
    const result={foam,spray};effectLibrary.set(material,result);return result;
}
export function waterfallPath(origin:number,x:number,side:number,width:number) {
    const poolLevel=sourceLevel(origin+x,side*85),center=riverCenter(origin+x,side),points:THREE.Vector3[]=[];
    for(let i=0;i<=120;i++) {
        const u=i/120,z=side*(87-u*(87-center));
        const wander=Math.sin(u*Math.PI)*Math.sin(u*8+x)*width*.14;
        const xx=x+wander,profile=riverProfile(origin+xx,side);
        const farBank=profile.center+profile.farWidth;
        const mouth=THREE.MathUtils.smoothstep(farBank-Math.abs(z),.15,profile.farWidth*.85);
        // The leading edge projects beyond each lip; the curved cross-section
        // supplies volume instead of a single flat quad on the cliff face.
        let y=Math.abs(z)>81?poolLevel:surfaceHeight(origin+xx,z+side*.65)+.23;
        for(const band of [55,63,72]) {
            const shift=cliffShift(origin+xx,side), lip=band+3-shift,base=band-3-shift;
            if(Math.abs(z)<lip && Math.abs(z)>base) {
                const plunge=(lip-Math.abs(z))/(lip-base);
                const upper=surfaceHeight(origin+xx,side*lip)+.23,lower=surfaceHeight(origin+xx,side*base)+.23;
                y=Math.max(y,THREE.MathUtils.lerp(upper,lower,plunge*plunge));
            }
        }
        y=Math.max(WATER_LEVEL+.04,y,surfaceHeight(origin+xx,z)+.12,renderedHeight(origin+xx,z)+.14);
        y=THREE.MathUtils.lerp(y,WATER_LEVEL-.04,mouth);
        points.push(new THREE.Vector3(xx,y,z));
    }
    return points;
}
export function waterfall(root:THREE.Group,origin:number,x:number,side:number,width:number,material:THREE.Material,poolMaterial:THREE.Material){
    const poolLevel=sourceLevel(origin+x,side*85),fx=effects(material),rng=rand(origin+x*173+side*919);
    const poolGeometry=new THREE.CircleGeometry(1,32);poolGeometry.rotateX(-Math.PI/2);poolGeometry.setAttribute('aDepth',new THREE.Float32BufferAttribute(new Float32Array(poolGeometry.attributes.position.count).fill(1.6),1));
    const pool=new THREE.Mesh(poolGeometry,poolMaterial);pool.position.set(x,poolLevel,side*85);pool.scale.set(3.3,1,4.8);root.add(pool);
    const points=waterfallPath(origin,x,side,width);
    const joinIndex=points.findIndex(p=>{
        const profile=riverProfile(origin+p.x,side);return Math.abs(p.z)<profile.center+profile.farWidth-.15;
    });
    const mergeStart=Math.max(.1,Math.min(.97,joinIndex/(points.length-1)));
    const curtain=ribbon(points,width,material,true,mergeStart);root.add(curtain);
    // Separate rounded streams catch side light and break up the curtain edge.
    for(const lane of [-.36,.28]) {
        const curve=new THREE.CatmullRomCurve3(points.map((p,i)=>p.clone().add(new THREE.Vector3(
            width*lane+Math.sin(i*.17+lane)*width*.03,.055,-side*.08))));
        const jetG=new THREE.TubeGeometry(curve,100,width*.065,5,false);
        jetG.setAttribute('aDepth',new THREE.Float32BufferAttribute(new Float32Array(jetG.attributes.position.count).fill(2),1));
        const uv=jetG.attributes.uv;
        const lengths=curve.getLengths(120),joinLength=lengths[Math.max(0,joinIndex)]/lengths[120];
        for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getY(i),mergeUV(uv.getX(i),Math.min(.97,Math.max(.1,joinLength))));
        const jet=new THREE.Mesh(jetG,material);jet.name='Rounded falling stream';root.add(jet);
    }
    const mouth=points[points.length-1];
    const positions:number[]=[],phases:number[]=[],sizes:number[]=[];
    for(const z of [52,60,68,Math.abs(mouth.z)+1.5]){
        const receiving=Math.abs(z-mouth.z*side)<3;
        const yy=receiving?WATER_LEVEL+.04:surfaceHeight(origin+x,side*z)+.27;
        const foam=new THREE.Mesh(new THREE.PlaneGeometry(1,1),fx.foam);
        foam.rotation.x=-Math.PI/2;foam.position.set(x,yy+.06,side*z);
        foam.scale.set(width*(receiving?3.3:1.8),receiving?6:2.8,1);foam.name='Cascade foam and expanding ripples';root.add(foam);
        for(let i=0;i<28;i++) {
            positions.push(x+(rng()-.5)*width*1.3,yy+.12,side*z+(rng()-.5)*1.1);
            phases.push(rng());sizes.push(i<8?1.5+rng()*2:.10+rng()*.10);
        }
    }
    const sprayG=new THREE.BufferGeometry();sprayG.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    sprayG.setAttribute('aPhase',new THREE.Float32BufferAttribute(phases,1));sprayG.setAttribute('aSize',new THREE.Float32BufferAttribute(sizes,1));
    const spray=new THREE.Points(sprayG,fx.spray);spray.name='Waterfall spray';root.add(spray);
    return mouth;
}
