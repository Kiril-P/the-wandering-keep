import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCreature, TRAVEL_SPEED } from './creature';
import { createWorld } from './world';
import { regionAt } from './world/terrain';
import { createSettlement } from './settlement';
import { createGameUI } from './game-ui';
import { deserialize, freshState, regionIndex, serialize, tick, production, type GameState } from './game';
import { SAVE_KEY, BASE_SPEED } from './balance';
import { M, rand } from './art';
import './style.css';
import { createSoundscape } from './audio/soundscape';
import { createPicker } from './selection';
import { LIGHT_MODES, sampleEnvironment, type LightMode } from './environment';
import { createLighting } from './lighting';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
try {
    boot();
}
catch (error) {
    $('loading').classList.add('done');
    $('error').hidden = false;
    $('error').textContent = 'The game could not start. Please use a browser with WebGL enabled. ' + String(error);
    console.error(error);
}
function boot() {
    const params = new URLSearchParams(location.search);
    // Development scenarios use separate storage and are stripped from production builds.
    const sandbox = import.meta.env.DEV && params.get('sandbox') === '1';
    const saveKey = SAVE_KEY + (sandbox ? '-sandbox' : '');
    const sound = createSoundscape(saveKey + '-audio-v1');
    if (import.meta.hot) import.meta.hot.dispose(() => sound.dispose());
    const testSpeed = sandbox ? Math.max(1, Math.min(60, Number(params.get('testSpeed')) || 1)) : 1;
    let state: GameState = freshState(), storageOK = true;
    try {
        state = deserialize(localStorage.getItem(saveKey)) || freshState();
    }
    catch {
        storageOK = false;
    }
    if (sandbox && params.has('scenario')) {
        state = freshState();
        const scenario = params.get('scenario');
        if (scenario === 'keep1' || scenario === 'keep2') { state.keepLevel = scenario === 'keep2' ? 2 : 1; state.distance = 160; state.resources = { stone: 2000, essence: 1000, runes: 500 }; }
        if (['settlement','beacon','canyon','highlands','full-valley'].includes(scenario || '')) {
            state.keepLevel = 3;
            state.expansions = 2;
            state.creatureLevel = 2;
            state.distance = scenario === 'beacon' ? 389 : scenario === 'highlands' ? 560 : scenario === 'full-valley' ? 0 : scenario === 'canyon' ? 260 : 160;
            state.elapsed = 750;
            state.nextId = 100;
            state.resources = { stone: 480, essence: 160, runes: 80 };
            state.buildings = [{ id: 10, kind: 'quarry', pad: 0, level: 3 }, { id: 11, kind: 'garden', pad: 1, level: 3 }, { id: 12, kind: 'forge', pad: 2, level: 3 }, { id: 13, kind: 'watchtower', pad: 3, level: 2 }, { id: 14, kind: 'garden', pad: 4, level: 2 }, { id: 15, kind: 'quarry', pad: 6, level: 2 }, { id: 16, kind: 'forge', pad: 7, level: 2 }];
            if (scenario === 'full-valley') state.buildings.push({id:17,kind:'garden',pad:5,level:3},{id:18,kind:'watchtower',pad:8,level:3});
        }
    }
    if(sandbox && params.get('scenario') === 'starved') {
        state = freshState();state.keepLevel=2;state.expansions=1;state.nextId=20;
        state.buildings=[{id:10,kind:'forge',pad:0,level:3},{id:11,kind:'quarry',pad:1,level:1},{id:12,kind:'forge',pad:2,level:1}];
        state.resources={stone:100,essence:0,runes:20};
    }
    if(sandbox && ['woodland','overlook','encounters'].includes(params.get('scenario')||'')){
        state=freshState();state.distance=params.get('scenario')==='woodland'?110:params.get('scenario')==='overlook'?240:40;
        state.elapsed=params.get('scenario')==='encounters'?37:0;state.resources={stone:500,essence:200,runes:80};
    }
    if(sandbox && params.has('routeDistance')) state.distance=Math.max(0,Number(params.get('routeDistance'))||0);
    const environmentOffset=sandbox?Math.max(0,Number(params.get('environmentTime'))||0)-state.elapsed:0;
    const environmentSpeed=sandbox?Math.max(1,Math.min(120,Number(params.get('environmentSpeed'))||1)):1;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth<800?1.25:1.65));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    $('scene').appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe1e5cf);
    scene.fog = new THREE.Fog(0xe1e5cf, 85, 340);
    const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 600);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .06;
    controls.enablePan = false;
    controls.minDistance = 10;
    controls.maxDistance = 48;
    controls.minPolarAngle = .35;
    controls.maxPolarAngle = Math.PI * .475;
    controls.rotateSpeed = .7;
    // Frame the keep itself, with enough room below for Morrow and the platform.
    const home = new THREE.Vector3(-10, 12, 21), target = new THREE.Vector3(0, 6.4, 0);
    let cameraTween: {
        start: THREE.Vector3;
        end: THREE.Vector3;
        t: number;
        startTarget?: THREE.Vector3;
        endTarget?: THREE.Vector3;
    } | null = null;
    function resetCamera(immediate = false) {
        const level = state.keepLevel - 1, compact = innerWidth < 800;
        const aim = target.clone(); aim.y = [6.4, 8.5, 11.5][level];
        const base = compact ? new THREE.Vector3(7.2, 10.5, 30) : home.clone();
        const scale = (compact ? [1, 1.12, 1.33] : [1, 1.25, 1.65])[level];
        const dest = base.sub(target).multiplyScalar(scale).add(aim);
        if (immediate) { camera.position.copy(dest); controls.target.copy(aim); cameraTween = null; }
        else cameraTween = { start: camera.position.clone(), end: dest, t: 0, startTarget: controls.target.clone(), endTarget: aim };
    }
    resetCamera(true);
    let viewMode: 'scenic' | 'creature' | null = null;
    let wasCompact = innerWidth < 800;
    function resize() { renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<800?1.25:1.65)); const compact = innerWidth < 800; if (compact !== wasCompact) {
        if (viewMode === 'creature') {
            controls.target.set(0, 4.2, 0);
            camera.position.copy(compact ? new THREE.Vector3(-18, 10, 25) : new THREE.Vector3(-11, 7, 13));
            cameraTween = null;
        } else if (!viewMode) resetCamera(true);
        wasCompact = compact;
    } camera.aspect = innerWidth / innerHeight; camera.clearViewOffset(); if (compact)
        camera.setViewOffset(innerWidth, innerHeight, 0, -innerHeight * .065, innerWidth, innerHeight); camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); }
    resize();
    addEventListener('resize', resize);
    const hemi = new THREE.HemisphereLight(0xd5e8e0, 0x8a8657, 2.0);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe2a6, 3.1);
    sun.position.set(-9, 16, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(innerWidth<800?1024:2048, innerWidth<800?1024:2048);
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
    sun.shadow.normalBias = .055;
    sun.shadow.bias = -.00015;
    sun.shadow.radius = 3;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xd8e5c9, 1.2);
    rim.position.set(5, 9, -9);
    scene.add(rim);
    const lighting = createLighting(scene,renderer,sun,hemi,rim);
    const creature = createCreature();
    scene.add(creature.root);
    const world = createWorld(scene,{density:innerWidth<800?.6:1});
    const settlement = createSettlement(creature.body, scene, creature.castle.root, creature.castle.setLevel);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(28,43,26,0.35)');
    grad.addColorStop(.5, 'rgba(28,43,26,0.18)');
    grad.addColorStop(1, 'rgba(28,43,26,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = .004;
    scene.add(shadow);
    const smokeGroup = new THREE.Group();
    scene.add(smokeGroup);
    const smokeMat = new THREE.MeshStandardMaterial({ color: 0xe4dfce, transparent: true, opacity: .19, roughness: 1, depthWrite: false }), smokeGeo = new THREE.IcosahedronGeometry(1, 1), smoke: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i++) {
        const puff = new THREE.Mesh(smokeGeo, smokeMat);
        smokeGroup.add(puff);
        smoke.push(puff);
    }
    const smokeOrigin = new THREE.Vector3(), tempVector = new THREE.Vector3();
    const rng = rand(551), celebrationPositions = new Float32Array(90 * 3), celebrationDirections = Array.from({ length: 90 }, () => new THREE.Vector3((rng() - .5) * 7, 1 + rng() * 5, (rng() - .5) * 7));
    const celebrationG = new THREE.BufferGeometry();
    celebrationG.setAttribute('position', new THREE.BufferAttribute(celebrationPositions, 3));
    const celebrationM = new THREE.PointsMaterial({ color: 0xffe4a4, size: .085, transparent: true, opacity: 1, depthWrite: false });
    const celebrationPoints = new THREE.Points(celebrationG, celebrationM);
    scene.add(celebrationPoints);
    celebrationPoints.visible = false;
    let celebration = 0, paused = false, pace = 1, lightMode: LightMode = 'Journey', lightMix = 0, hidden = false, last = performance.now(), accumulator = 0, uiClock = 0, saveClock = 0, lastRegion = regionIndex(state), frames = 0, frameTotal = 0, frameSamples = 0;
    let lastLandscapeSegment=Math.round(-state.distance/96);
    let lastFootX = creature.legs[0].foot.x, motionFrames = 0, changedPoses = 0;
    const systemReduced = matchMedia('(prefers-reduced-motion: reduce)');
    let ui: ReturnType<typeof createGameUI>;
    function save() { try {
        localStorage.setItem(saveKey, serialize(state));
        storageOK = true;
    }
    catch {
        storageOK = false;
    } ui?.setSaving(storageOK); }
    let previousKeepLevel = state.keepLevel;
    let previousGathered = state.totalGathered, previousBuildingCount = state.buildings.length, previousBeacon = state.beacon;
    let previousConstruction = state.keepLevel + state.expansions + state.creatureLevel + state.buildings.reduce((n, b) => n + b.level, 0);
    function changed() {
        const construction = state.keepLevel + state.expansions + state.creatureLevel + state.buildings.reduce((n, b) => n + b.level, 0);
        if (state.beacon && !previousBeacon) sound.cue('beacon');
        else if (construction > previousConstruction) { creature.react(1); sound.cue(state.buildings.length > previousBuildingCount ? 'build' : 'upgrade'); }
        else if (state.totalGathered > previousGathered) { creature.react(.45); sound.cue('gather'); }
        previousBuildingCount = state.buildings.length; previousBeacon = state.beacon;
        previousConstruction = construction; previousGathered = state.totalGathered;
        settlement.sync(state, ui?.placing || null);
        if (state.keepLevel !== previousKeepLevel && !viewMode) resetCamera();
        previousKeepLevel = state.keepLevel;
        save();
    }
    ui = createGameUI(() => state, { audio: sound, pace: () => pace, paused: () => paused, lighting: () => lightMode, view: action => {
        if (action === 'pace') pace = pace === 1 ? 1.5 : pace === 1.5 ? .5 : 1;
        else if (action === 'light') lightMode = LIGHT_MODES[(LIGHT_MODES.indexOf(lightMode)+1)%LIGHT_MODES.length];
        else if (action === 'reset') resetCamera();
        else if (action === 'hide') toggleUI();
        else toggleView(action);
    }, changed, selected: id => settlement.setSelected(id), celebrate: () => { celebration = 8; creature.react(1); }, reset: () => { settlement.clear(); state = freshState(); accumulator = 0; lastRegion = 0; lightMode = 'Journey'; celebration = 0; changed(); resetCamera(); } }, saveKey + '-welcome-v1');
    settlement.sync(state, null);
    ui.setSaving(storageOK);
    function togglePause() { paused = !paused; $('pause-label').textContent = paused ? 'Resume' : 'Pause'; $('pause-icon').textContent = paused ? '▷' : 'Ⅱ'; $('pause').setAttribute('aria-label', paused ? 'Resume journey' : 'Pause journey'); $('pause').title = `${paused ? 'Resume' : 'Pause'} journey (Space)`; }
    $('pause').onclick = togglePause;
    const savedCamera = new THREE.Vector3(), savedTarget = new THREE.Vector3();
    function showInterface(hide:boolean) {
        hidden=hide;
        $('overlay').classList.toggle('hidden',hidden);$('overlay').inert=hidden;
        $('overlay').setAttribute('aria-hidden',String(hidden));$('show').hidden=!hidden;
        $('show').innerHTML=viewMode?`Return to settlement <kbd>${viewMode === 'scenic' ? 'V' : 'C'}</kbd>`:'Show interface <kbd>H</kbd>';
        if(hidden)$('show').focus();
    }
    function toggleView(mode: 'scenic' | 'creature') {
        if (viewMode === mode) {
            viewMode = null;
            controls.target.copy(savedTarget);
            cameraTween = {start: camera.position.clone(), end: savedCamera.clone(), t: 0};
        } else {
            if (!viewMode) { savedCamera.copy(camera.position); savedTarget.copy(controls.target); }
            viewMode = mode;
            controls.target.set(0, mode === 'scenic' ? 15 : 4.2, 0);
            const end = mode === 'scenic' ? new THREE.Vector3(9, 20, 43)
                : innerWidth < 800 ? new THREE.Vector3(-18, 10, 25) : new THREE.Vector3(-11, 7, 13);
            cameraTween = {start: camera.position.clone(), end, t: 0};
        }
        showInterface(viewMode !== null);
    }
    function toggleUI(){if(viewMode)toggleView(viewMode);else showInterface(!hidden);}
    $('show').onclick = toggleUI;
    addEventListener('keydown', e => { const el = e.target as HTMLElement; if (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
        return; if (e.key === 'Escape' && !$<HTMLDialogElement>('modal').open)
        ui.cancel(); if ($<HTMLDialogElement>('modal').open)
        return; if (e.code === 'Space' && el.tagName !== 'BUTTON') {
        e.preventDefault();
        togglePause();
    } if (e.key.toLowerCase() === 'v')
        toggleView('scenic'); if (e.key.toLowerCase() === 'c')
        toggleView('creature'); if (e.key.toLowerCase() === 'h')
        toggleUI(); if (e.key.toLowerCase() === 'r')
        resetCamera(); if (e.key.toLowerCase() === 'e' && !e.repeat)
        ui.gather(); });
    controls.addEventListener('start', () => cameraTween = null);
    const picker=createPicker();
    let down:{x:number;y:number}|null=null, hoverPoint:{x:number;y:number}|null=null, hoverClock=0;
    function pickAt(x:number,y:number,touch=false){
        const rect=renderer.domElement.getBoundingClientRect();
        scene.updateMatrixWorld(true);
        return picker.pick(settlement.pickTargets,camera,(x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1,rect.width,rect.height,touch);
    }
    function clearHover(){hoverPoint=null;settlement.setHovered(null);renderer.domElement.style.cursor='';settlement.hidePreview();}
    function updateHover(){
        if(!hoverPoint || down || viewMode || $<HTMLDialogElement>('modal').open)return;
        const p=pickAt(hoverPoint.x,hoverPoint.y);
        renderer.domElement.style.cursor=p?'pointer':'';
        settlement.setHovered(ui.placing?null:p?.type==='building'?p.id:p?.type==='keep'||p?.type==='beacon'?p.type:null);
        if(ui.placing){
            const pad=p?.type==='pad'?p.pad:p?.type==='building'?state.buildings.find(b=>b.id===p.id)?.pad:undefined;
            if(pad!==undefined)settlement.preview(pad,p?.type==='pad');else settlement.hidePreview();
        }
    }
    renderer.domElement.addEventListener('pointerdown',e=>{if(e.button===0){down={x:e.clientX,y:e.clientY};settlement.setHovered(null);}});
    renderer.domElement.addEventListener('pointerup',e=>{
        const clicked=down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<=6;down=null;
        if(!clicked||viewMode)return;
        const p=pickAt(e.clientX,e.clientY,e.pointerType==='touch');if(p)ui.pick(p);
        if(e.pointerType==='touch')clearHover();else updateHover();
    });
    renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;hoverPoint={x:e.clientX,y:e.clientY};hoverClock=.1;});
    renderer.domElement.addEventListener('pointerleave',clearHover);
    renderer.domElement.addEventListener('pointercancel',()=>{down=null;clearHover();});
    addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', () => { last = performance.now(); if (document.hidden)
        save(); });
    let regionBlend = lastRegion, lifeTime = state.elapsed, locomotion = 1;
    function frame(now: number) {
        const raw = Math.max(0, (now - last) / 1000), dt = Math.min(raw, .1);
        last = now;
        const active = !(paused || document.hidden || $<HTMLDialogElement>('modal').open);
        accumulator += active ? dt * pace * testSpeed : 0;
        let simulated = false;
        while (accumulator >= .1) {
            tick(state, .1);
            accumulator -= .1;
            simulated = true;
        }
        const region = regionIndex(state);
        if (region !== lastRegion) {
            lastRegion = region;
            ui.toast(region === 1 ? 'Amber Canyon · production +10%' : 'Moonlit Highlands · production +20%');
            save();
        }
        if (simulated)
            settlement.sync(state, ui.placing);
        const reduced = systemReduced.matches || state.settings.reducedMotion;
        // Render the unconsumed fraction of the fixed step as well. All moving
        // scenery and planted feet must share this clock to avoid sliding.
        const visualTime = state.elapsed + accumulator;
        const visualDistance = state.distance + accumulator * BASE_SPEED * (state.creatureLevel === 2 ? 1.35 : 1);
        if (!document.hidden) lifeTime += dt;
        locomotion = THREE.MathUtils.damp(locomotion, active ? 1 : 0, 9, dt);
        creature.update(visualDistance / TRAVEL_SPEED, reduced, lifeTime, locomotion);
        if (import.meta.env.DEV && active && frames > 30 && frames < 300) {
            motionFrames++;
            if (Math.abs(creature.legs[0].foot.x - lastFootX) > 1e-8) changedPoses++;
        }
        lastFootX = creature.legs[0].foot.x;
        settlement.update(state, visualTime, visualDistance);
        const environment = sampleEnvironment((visualTime+environmentOffset)*environmentSpeed,lightMode);
        lightMix=environment.night;
        world.setEnvironment(environment);
        world.update(visualDistance, visualTime, reduced, state.beacon);
        world.reactToFeet(creature.legs,visualDistance,visualTime,reduced);
        regionBlend = THREE.MathUtils.damp(regionBlend, regionAt(-visualDistance), 1, dt);

        uiClock += dt;
        saveClock += active ? dt : 0;
        if (uiClock > .2) {
            ui.render();
            uiClock = 0;
        }
        if (saveClock > 5) {
            save();
            saveClock = 0;
        }
        if (cameraTween) {
            cameraTween.t = Math.min(1, cameraTween.t + dt * (reduced ? 20 : 1.1));
            camera.position.lerpVectors(cameraTween.start, cameraTween.end, 1 - Math.pow(1 - cameraTween.t, 3));
            if (cameraTween.startTarget && cameraTween.endTarget) controls.target.lerpVectors(cameraTween.startTarget, cameraTween.endTarget, 1 - Math.pow(1 - cameraTween.t, 3));
            if (cameraTween.t === 1)
                cameraTween = null;
        }
        sound.update({ region: regionBlend, night: lightMix, rain: environment.rain, paused, menu: $<HTMLDialogElement>('modal').open, distance: camera.position.distanceTo(controls.target), cycle: creature.cycle, forge: state.buildings.some(b => b.kind === 'forge' && (production(state).buildings.get(b.id)?.rate ?? 0)>1e-7) });
        document.body.classList.toggle('dusk', lightMix > .5);
        lighting.update(environment);
        M.rune.emissiveIntensity = .6 + lightMix * 1.7 + (state.creatureLevel - 1) * .5 + (state.beacon ? .6 : 0);
        creature.castle.root.updateWorldMatrix(true, false);
        smokeOrigin.copy(creature.castle.chimney).applyMatrix4(creature.castle.root.matrixWorld);
        for (let i = 0; i < smoke.length; i++) {
            const age = (visualTime * .24 + i / 12) % 1;
            smoke[i].position.copy(smokeOrigin).add(tempVector.set(age * 1.8, age * 2.1, Math.sin(age * 5 + i) * .14));
            smoke[i].scale.setScalar(.1 + age * .36);
            smoke[i].visible = age < .94;
        }
        if (celebration > 0) {
            celebration = Math.max(0, celebration - dt);
            const progress = (8 - celebration) / 8;
            celebrationPoints.visible = true;
            celebrationM.opacity = 1 - progress;
            const p = celebrationG.attributes.position;
            celebrationDirections.forEach((d, i) => p.setXYZ(i, d.x * progress, 5 + d.y * progress, d.z * progress));
            p.needsUpdate = true;
            M.rune.emissiveIntensity += Math.sin(progress * Math.PI) * 2;
        }
        else
            celebrationPoints.visible = false;
        controls.update();
        hoverClock+=dt;if(hoverClock>=.08){hoverClock=0;updateHover();}
        renderer.render(scene, camera);
        if(import.meta.env.DEV && Math.round(-visualDistance/96)!==lastLandscapeSegment){
            lastLandscapeSegment=Math.round(-visualDistance/96);
            console.info('Scenery traversal',JSON.stringify({distance:Math.round(visualDistance),sections:world.stats.sections,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}));
        }
        frames++;
        if (raw < .2 && frames > 30) {
            frameTotal += raw * 1000;
            frameSamples++;
        }
        if (frames === 300)
            console.info('Castle performance', JSON.stringify({ averageFrameMs: frameTotal / frameSamples, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, viewport: [innerWidth, innerHeight], pixelRatio: renderer.getPixelRatio(), buildings: state.buildings.length, worldSections: world.stats.sections, geometries:renderer.info.memory.geometries, textures:renderer.info.memory.textures, motionFrames, changedPoses }));
        if (frames === 3) {
            $('loading').classList.add('done');
            $('loading').setAttribute('aria-hidden', 'true');
            ui.showWelcomeIfNeeded();
        }
    }
    renderer.setAnimationLoop(frame);
}
