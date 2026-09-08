import * as THREE from 'three';
import { M } from './art';
import type { Environment } from './environment';
const horizonDay=new THREE.Color(0xcbdacb),horizonGold=new THREE.Color(0xe6bb86),horizonNight=new THREE.Color(0x536b89),horizonDawn=new THREE.Color(0xb5c6d7),cloudHorizon=new THREE.Color(0x869ba5);
const topDay=new THREE.Color(0x639cab),topGold=new THREE.Color(0x919ba9),topNight=new THREE.Color(0x142745),cloudTop=new THREE.Color(0x5b7182);
export function skyColors(e:Environment,horizon:THREE.Color,zenith:THREE.Color){
    horizon.copy(horizonDay).lerp(horizonGold,e.golden*.8).lerp(horizonDawn,e.dawn*.6).lerp(horizonNight,e.night).lerp(cloudHorizon,e.overcast*.65*(1-e.night*.6));
    zenith.copy(topDay).lerp(topGold,e.golden).lerp(topNight,e.night).lerp(cloudTop,e.overcast*.8*(1-e.night*.65));
}
export function createLighting(scene:THREE.Scene,renderer:THREE.WebGLRenderer,sun:THREE.DirectionalLight,hemi:THREE.HemisphereLight,rim:THREE.DirectionalLight){
    const horizon=new THREE.Color(),zenith=new THREE.Color(),warm=new THREE.Color(0xffbb70),day=new THREE.Color(0xffe2af),moon=new THREE.Color(0xb7cdf5),cloud=new THREE.Color(0xc0d0df);
    const nightFill=new THREE.Color(0x96b3df);
    const glass=new THREE.Color(0x71877f),lit=new THREE.Color(0xffd58b);
    return {update(e:Environment){
        skyColors(e,horizon,zenith);(scene.background as THREE.Color).copy(horizon);
        const fog=scene.fog as THREE.Fog;fog.color.copy(horizon);fog.near=85-e.mist*32-e.overcast*13;fog.far=340-e.mist*110-e.overcast*70;
        sun.color.copy(day).lerp(warm,e.golden).lerp(moon,e.night).lerp(cloud,e.overcast*.7);
        sun.intensity=(2.7-e.night*1.95)*(1-e.overcast*.67);
        // Low evening light crosses wet roof and cliff faces as the shower clears.
        sun.position.set(-12,16-e.golden*9+e.night*3,9);
        hemi.color.set(0xd5e8e0).lerp(nightFill,e.night);
        hemi.intensity=1.35-e.night*.48-e.overcast*.16;rim.intensity=.85+e.night*.18;
        renderer.toneMappingExposure=.98+e.night*.04;
        M.window.color.copy(glass).lerp(lit,Math.min(1,e.night*1.5));M.window.emissiveIntensity=.12+Math.pow(e.night,.7)*2.8;
    }};
}
