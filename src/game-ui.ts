import { BEACON_COST, BUILDINGS, CREATURE_COST, EXPANSION_COSTS, KEEP_COSTS, LABELS, REGIONS, RESOURCES, type BuildingKind, type Cost } from './balance';
import { production, activateBeacon, awaken, beaconReason, bonus, build, buildReason, capacity, creatureReason, expand, expansionReason, gather, keepReason, netRates, objective, refundFor, regionIndex, removeBuilding, upgradeBuilding, upgradeKeep, afford, type GameState } from './game';
import type { Pick } from './settlement';
import type { GameAudio } from './audio/soundscape';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : Math.floor(n).toString();
export const costText = (c: Cost) => RESOURCES.filter(r => c[r]).map(r => `${Number(c[r]!.toFixed(1))} ${LABELS[r].toLowerCase()}`).join(' · ');
const rendered = new WeakMap<HTMLElement, string>();
const setHTML = (el: HTMLElement, text: string) => { if (rendered.get(el) !== text) {
    el.innerHTML = text;
    rendered.set(el, text);
} };
export type ViewAction = 'pace' | 'light' | 'reset' | 'scenic' | 'creature' | 'hide';
export function createGameUI(get: () => GameState, callbacks: {
    requestGather: (id?: number) => void;
    changed: () => void;
    selected: (id: number | 'keep' | 'beacon' | null) => void;
    reset: () => void;
    celebrate: () => void;
    view: (action: ViewAction) => void;
    pace: () => number;
    lighting: () => string;
    paused: () => boolean;
    audio: GameAudio;
}, welcomeKey: string) {
    let selected: number | 'keep' | 'beacon' | null = null, placing: BuildingKind | null = null, toastUntil = 0, confirmReset = false, summaryShown = false;
    let buildOpen = false, welcomeOpen = false, storageOK = true;
    const modal = $<HTMLDialogElement>('modal');
    function toast(message: string) { $('toast').textContent = message; $('toast').classList.add('visible'); toastUntil = performance.now() + 3400; }
    function commit(action: () => boolean, message: string) { if (!action()) {
        toast('Not enough resources, or this upgrade is still locked.');
        return false;
    } callbacks.changed(); render(); toast(message); return true; }
    function choose(id: typeof selected) { if (id !== null) callbacks.audio.cue('select'); selected = id; placing = null; buildOpen = false; callbacks.selected(id); callbacks.changed(); render(); if (id !== null) $('inspector').querySelector<HTMLButtonElement>('.close-inspector')?.focus(); }
    function doGather(id?: number) { callbacks.requestGather(id); }
    function completeGather(id: number, precise = false) { if (gather(get(), id, precise)) {
        callbacks.changed();
        render();
        $('gather').classList.remove('gathered');
        requestAnimationFrame(() => $('gather').classList.add('gathered'));
        const stone = $('resources').querySelector<HTMLElement>('.stone')!;
        stone.getAnimations().forEach(a => a.cancel());
        stone.animate([{ backgroundColor: '#f3d18a', color: '#354732' }, { backgroundColor: 'transparent' }], { duration: 550 });
        return true;
    } return false; }
    function showDialog(content: string) {
        const alreadyOpen = modal.open;
        modal.innerHTML = `<button class="dialog-close" data-dismiss="true" aria-label="Close menu">×</button>${content}`;
        if (!alreadyOpen) modal.showModal();
        else { const heading = $('dialog-title'); heading.tabIndex = -1; heading.focus(); }
    }
    function welcome() {
        welcomeOpen = true;
        showDialog(`<span class="eyebrow">THE WANDERING KEEP</span><div class="welcome-symbol" aria-hidden="true">✧</div><h2 id="dialog-title">A little keep.<br/><em>A long journey.</em></h2><p class="welcome-intro">Meet Morrow. An ancient creature carrying your home through a world worth slowing down for.</p><ol class="welcome-steps"><li><b>Gather a little stone</b><span>Hold a gold-marked rock to aim, then release to break off stone. Bright seams give +3; other hits give +2. Gather or E launches a quick strike. Your first quarry costs 20 stone.</span></li><li><b>Build a living settlement</b><span>Open Build, choose a building, then a glowing pad. Buildings produce resources as you wander.</span></li><li><b>Grow toward the beacon</b><span>Gardens make essence. Forges turn stone and essence into runestones. Upgrade your Keep to make room.</span></li></ol><p class="welcome-note">Drag to look around · Scroll or pinch to zoom<br/>The guide is always in Menu.</p><button id="begin-journey" class="primary wide" autofocus>${get().elapsed > 5 ? 'Continue journey' : 'Begin journey'} <span>→</span></button>`);
    }
    function finishWelcome() {
        if (!welcomeOpen) return;
        welcomeOpen = false;
        try { localStorage.setItem(welcomeKey, '1'); } catch { /* Welcome still dismisses without storage. */ }
    }
    modal.addEventListener('close', () => { if (!modal.open) finishWelcome(); });
    function audioControls() {
        const preferences = callbacks.audio.preferences;
        return `<details class="sound-settings" open><summary>Sound & atmosphere</summary><p id="audio-status">${callbacks.audio.status}</p><label class="setting-row"><span>Mute all sound</span><input id="mute-audio" type="checkbox" ${preferences.muted ? 'checked' : ''}></label>${(['music', 'ambience', 'effects'] as const).map(channel => `<label class="audio-slider"><span>${channel === 'music' ? 'Music' : channel === 'ambience' ? 'Nature & atmosphere' : 'Footsteps & actions'}</span><input type="range" data-audio="${channel}" min="0" max="100" step="1" value="${Math.round(preferences[channel] * 100)}" aria-label="${channel === 'music' ? 'Music volume' : channel === 'ambience' ? 'Ambience volume' : 'Effects volume'}"><output id="audio-${channel}-value">${Math.round(preferences[channel] * 100)}%</output></label>`).join('')}</details>`;
    }
    function openHelp(page: 'guide' | 'settings' | 'journey' = 'settings') {
        confirmReset = false;
        const s = get(), region = regionIndex(s), next = REGIONS[region + 1], q = objective(s);
        const content = page === 'guide' ? `<h2 id="dialog-title">Make yourself at home.</h2><details open><summary>Gather, build, grow</summary><p>Hold an outcrop to aim your tethered pick and release to strike. Aim at a golden seam for 3 stone instead of 2. Each hit breaks off a chunk; six strikes clear an outcrop. Gather or E launches a quick strike. Gather 20 stone for a Quarry Tower, then open Build and choose an empty pad. Quarries produce stone; Moss Gardens produce essence. Click a building to upgrade it. Open Keep to expand your platform and awaken Morrow.</p></details><details><summary>How production works</summary><p>Buildings share one inventory. Each runestone uses 4 stone + 3 essence. A forge waits when either runs out. Watchtowers add up to 30% production. Removing a building refunds 60% of construction and upgrade costs.</p></details><details><summary>Camera and shortcuts</summary><p>Drag to orbit; scroll or pinch to zoom. E gathers stone. Space pauses. Escape closes a panel or cancels placement. R resets the camera. V opens the scenic view, C brings you closer to Morrow, and H hides the interface.</p></details><button data-page="welcome" class="text-button">Replay the introduction →</button>`
            : page === 'journey' ? `<span class="eyebrow">${s.beacon ? 'CHAPTER COMPLETE' : 'YOUR NEXT STEP'}</span><h2 id="dialog-title">${q.title}</h2><p>${q.detail}</p><div class="journey-detail"><b>${REGIONS[region].name}</b><span>${Math.floor(s.distance)} m wandered</span><div class="journey-track">${REGIONS.map((r, i) => `<span class="${region >= i ? 'reached' : ''}" title="${r.name}"></span>`).join('')}</div><p>${next ? `${Math.max(0, Math.ceil(next.distance - s.distance))} m to ${next.name}` : 'The highlands stretch into the distance.'}</p><small>Production bonus +${Math.round((bonus(s) - 1) * 100)}%</small></div>`
            : `<h2 id="dialog-title">Settle into the journey.</h2>${audioControls()}<div class="setting-row"><span>Travel pace</span><button data-view="pace">${callbacks.pace()}×</button></div><label class="setting-row"><span>Reduce decorative motion</span><input id="reduce-motion" type="checkbox" ${s.settings.reducedMotion ? 'checked' : ''}></label><div class="view-actions"><button data-view="scenic">Scenic view <kbd>V</kbd></button><button data-view="creature">Meet Morrow <kbd>C</kbd></button><button data-view="light">Light: ${callbacks.lighting()}</button><button data-view="reset">Reset camera <kbd>R</kbd></button><button data-view="hide">Hide interface <kbd>H</kbd></button></div><p class="environment-note">A day lasts about 24 minutes at normal pace. Mist and showers pass through; wet stone dries as the sky clears. Light can follow the journey or stay at your favourite hour.</p><p id="save-status">${storageOK ? 'Saved on this device.' : 'Saving unavailable — keep this tab open.'} The journey rests while closed or hidden. No offline earnings.</p><button id="reset-save" class="danger text-button">Start a new journey</button>`;
        showDialog(`<div class="menu-tabs" aria-label="Menu sections">${(['settings', 'guide', 'journey'] as const).map(p => `<button data-page="${p}" aria-pressed="${p === page}">${p === 'guide' ? 'How to play' : p === 'journey' ? 'Journey' : 'Settings'}</button>`).join('')}</div>${content}<div class="dialog-actions"><button id="close-dialog" class="primary">Back to Morrow</button></div>`);
    }
    $('help').onclick = () => { callbacks.audio.cue('select'); openHelp(); };
    $('objective').onclick = () => openHelp('journey');
    $('toggle-build').onclick = () => {
        const open = !buildOpen;
        choose(null);
        buildOpen = open;
        render();
        if (open) $('close-build').focus();
    };
    $('close-build').onclick = () => { cancel(); $('toggle-build').focus(); };
    $('show-keep').onclick = () => choose(selected === 'keep' ? null : 'keep');
    $('gather').onclick = () => doGather();
    $('build-menu').onclick = e => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-build]'); if (!b)
        return; const kind = b.dataset.build as BuildingKind; const reason = buildReason(get(), kind); if (reason) {
        toast(reason);
        return;
    } placing = kind; selected = null; buildOpen = false; callbacks.selected(null); callbacks.changed(); render(); $('placement').querySelector<HTMLButtonElement>('[data-pad]')?.focus(); };
    $('placement').onclick = e => { const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button'); if (button?.dataset.pad !== undefined)
        place(Number(button.dataset.pad)); if (button?.id === 'cancel-placement')
        cancel(); };
    function place(pad: number) { if (!placing)
        return; const kind = placing; if (commit(() => build(get(), kind, pad), `${BUILDINGS[kind].name} is ready.`)) {
        placing = null;
        const b = get().buildings.find(b => b.pad === pad)!;
        choose(b.id);
    } }
    function cancel() { const wasBuilding = buildOpen || placing !== null, hadSelection = selected !== null; choose(null); if (wasBuilding) $('toggle-build').focus(); else if (hadSelection) $('show-keep').focus(); }
    $('inspector').onclick = e => {
        const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
        if (!button)
            return;
        const action = button.dataset.action;
        const s = get();
        if (action === 'keep')
            choose('keep');
        if (action === 'close')
            { choose(null); $('show-keep').focus(); }
        if (action === 'upgrade-keep')
            commit(() => upgradeKeep(s), `Keep upgraded to level ${s.keepLevel + 1}.`);
        if (action === 'expand')
            commit(() => expand(s), 'Three new construction pads unfolded.');
        if (action === 'awaken')
            commit(() => awaken(s), 'Morrow awakens. Travel speed increased by 35%.');
        if (action === 'beacon') {
            if (commit(() => activateBeacon(s), 'The Crown Beacon is alight!')) {
                callbacks.celebrate();
                window.setTimeout(() => { if (get() === s && s.beacon && !summaryShown && !modal.open)
                    showCompletion(); }, 6500);
            }
        }
        if (action === 'upgrade' && typeof selected === 'number')
            commit(() => upgradeBuilding(s, selected as number), 'Building upgraded.');
        if (action === 'remove' && typeof selected === 'number') {
            if (commit(() => removeBuilding(s, selected as number), 'Building removed. 60% of costs refunded.'))
                choose('keep');
        }
        if (action === 'summary')
            showCompletion();
    };
    modal.onclick = e => {
        const el = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
        if (el?.dataset.dismiss) { modal.close(); return; }
        if (el?.dataset.page === 'welcome') { welcome(); return; }
        if (el?.dataset.page) { openHelp(el.dataset.page as 'guide' | 'settings' | 'journey'); return; }
        if (el?.dataset.view) {
            const action = el.dataset.view as ViewAction;
            if (action === 'light') { callbacks.view(action); el.textContent = `Light: ${callbacks.lighting()}`; }
            else if (action === 'pace') { callbacks.view(action); el.textContent = `${callbacks.pace()}×`; }
            else { modal.close(); callbacks.view(action); }
            return;
        }
        if (el?.id === 'begin-journey') { finishWelcome(); modal.close(); $('gather').focus(); }
        if (el?.id === 'close-dialog')
            modal.close();
        if (el?.id === 'reset-save') {
            confirmReset = true;
            showDialog('<span class="eyebrow">START FRESH</span><h2 id="dialog-title">Begin a new journey?</h2><p>This clears your saved resources, buildings, and progress on this device.</p><div class="dialog-actions"><button id="close-dialog">Keep my journey</button><button id="confirm-reset" class="danger">Reset progress</button></div>');
        }
        if (el?.id === 'confirm-reset' && confirmReset) {
            modal.close();
            callbacks.reset();
            summaryShown = false;
            choose(null);
            welcome();
        }
    };
    modal.oninput = e => {
        const input = e.target as HTMLInputElement;
        if (!input.dataset.audio) return;
        const channel = input.dataset.audio as 'music' | 'ambience' | 'effects';
        callbacks.audio.setPreferences({ [channel]: Number(input.value) / 100 });
        $(`audio-${channel}-value`).textContent = `${input.value}%`;
        $('audio-status').textContent = callbacks.audio.status;
    };
    modal.onchange = e => {
        const soundInput = e.target as HTMLInputElement;
        if (soundInput.id === 'mute-audio') { callbacks.audio.setPreferences({ muted: soundInput.checked }); $('audio-status').textContent = callbacks.audio.status; }
 const input = e.target as HTMLInputElement; if (input.id === 'reduce-motion') {
        get().settings.reducedMotion = input.checked;
        callbacks.changed();
    } };
    function showCompletion() { summaryShown = true; const s = get(), minutes = Math.floor(s.beaconAt / 60), seconds = Math.floor(s.beaconAt % 60); modal.innerHTML = `<span class="eyebrow">THE FIRST CHAPTER · COMPLETE</span><div class="beacon-symbol">✧</div><h2 id="dialog-title">A light for the long road.</h2><p>The Crown Beacon has awakened Morrow's ancient heart. A little keep has become a walking settlement.</p><div class="summary"><span><b>${minutes}:${String(seconds).padStart(2, '0')}</b> journey time</span><span><b>${Math.floor(s.distance)} m</b> wandered</span><span><b>${s.buildings.length}</b> buildings</span></div><p class="summary-production">${RESOURCES.map(r => `${netRates(s)[r].toFixed(2)} ${LABELS[r].toLowerCase()}/s`).join(" · ")}</p><p>Your settlement keeps producing. There is more road ahead.</p><button id="close-dialog" class="primary">Keep wandering</button>`; modal.showModal(); }
    function button(label: string, action: string, reason: string, cost?: Cost) { return `<button class="upgrade" data-action="${action}" ${reason ? 'disabled' : ''} title="${reason || label}"><span>${label}</span><small>${cost ? costText(cost) : ''}</small>${reason && reason !== label ? `<em>${reason}</em>` : ''}</button>`; }
    function render() {
        const audioStatus = document.getElementById('audio-status');
        if (audioStatus && audioStatus.textContent !== callbacks.audio.status) audioStatus.textContent = callbacks.audio.status;
        const s = get(), stopped = callbacks.paused(), flow = production(s), rates = stopped ? {stone:0,essence:0,runes:0} : flow.rates, region = regionIndex(s), q = objective(s);
        const waiting = [...flow.buildings.values()].filter(b => b.missing.length);
        const missing = [...new Set(waiting.flatMap(b => b.missing))];
        const supply = !stopped && missing.length ? `Forges ${rates.runes < 1e-7 ? "waiting for" : "limited by"} ${missing.join(" and ")}` : "";
        setHTML($('resources'), RESOURCES.map(r => `<div class="resource ${r}" title="${r === 'runes' && supply ? supply : LABELS[r]}"><span class="resource-icon">${r === 'stone' ? '⬡' : r === 'essence' ? '❧' : '◇'}</span><div><span>${LABELS[r]}</span><b>${fmt(s.resources[r])}</b></div><small class="${rates[r] < 0 ? 'negative' : ''}">${r === 'runes' && supply ? `<span class="supply-hint">${rates.runes < 1e-7 ? 'Needs ' : 'Low '}${missing.join(' + ')}</span>` : `${rates[r] >= 0 ? '+' : ''}${rates[r].toFixed(2)}/s`}</small></div>`).join(''));
        setHTML($('objective'), `<span>Next</span> ${q.title} <span aria-hidden="true">↗</span>`);
        $<HTMLButtonElement>('gather').disabled = s.outcrops.length === 0;
        $('gather').title = s.outcrops.length ? 'Launch pick for 2 stone (E). Hold a rock and aim at a golden seam for 3.' : 'More outcrops are coming along the road';
        $('build-tray').hidden = !buildOpen;
        $('inspector').hidden = selected === null;
        $('toggle-build').setAttribute('aria-expanded', String(buildOpen));
        $('show-keep').setAttribute('aria-expanded', String(selected !== null));
        setHTML($('build-menu'), (Object.keys(BUILDINGS) as BuildingKind[]).map(kind => { const b = BUILDINGS[kind], reason = buildReason(s, kind); return `<button data-build="${kind}" title="${reason || b.description}" ${reason ? 'disabled' : ''} class="build-card ${placing === kind ? 'chosen' : ''}"><span class="build-icon">${b.icon}</span><span><b>${b.name}</b><small>${costText(b.costs[0])}</small><em>${reason || b.description}</em></span></button>`; }).join(''));
        $('placement').hidden = !placing;
        if (placing)
            setHTML($('placement'), `<b>Place ${BUILDINGS[placing].name}</b><span>Click a glowing pad, or choose one below.</span><div>${Array.from({ length: capacity(s) }, (_, i) => s.buildings.some(b => b.pad === i) ? '' : `<button data-pad="${i}" aria-label="Place on pad ${i + 1}">${i + 1}</button>`).join('')}<button id="cancel-placement">Cancel · Esc</button></div>`);
        if (typeof selected === 'number' && !s.buildings.some(b => b.id === selected))
            selected = 'keep';
        if (typeof selected === 'number') {
            const b = s.buildings.find(b => b.id === selected)!, spec = BUILDINGS[b.kind], cost = spec.costs[b.level], status = stopped ? 'Journey paused — resume to produce' : flow.buildings.get(b.id)!.status, output = flow.buildings.get(b.id)!;
            setHTML($('inspector'), `<button class="close-inspector" data-action="close" aria-label="Close building panel">×</button><button class="back-link" data-action="keep">← Central Keep</button><div class="eyebrow">PAD ${b.pad + 1} · LEVEL ${b.level} / 3</div><h2>${spec.name}</h2><p>${spec.description}</p><div class="machine-status ${status === 'Producing' ? 'active' : ''}">● ${status}</div><div class="production-detail">${b.kind === 'watchtower' ? `+${b.level * 10}% production (30% total cap)` : `${(stopped ? 0 : output.rate).toFixed(2)} / ${output.capacity.toFixed(2)} ${LABELS[spec.output!].toLowerCase()} per second`}${spec.recipe ? `<small>Each runestone uses 4 stone + 3 essence</small>${output.missing.length ? `<small class="supply-help">${output.missing.map(r => r === 'stone' ? 'Gather stone or improve your quarries.' : 'Build or upgrade a Moss Garden for more essence.').join(' ')} All forges share these supplies.</small>` : ''}` : ''}</div>${button(b.level === 3 ? 'Fully upgraded' : 'Upgrade to level ' + (b.level + 1), 'upgrade', b.level === 3 ? 'Maximum level' : afford(s, cost) ? '' : 'Gather more resources', cost)}<button class="remove" data-action="remove">Remove building<small>Refund: ${costText(refundFor(b))}</small></button>`);
        }
        else if (selected !== null) {
            setHTML($('inspector'), `<button class="close-inspector" data-action="close" aria-label="Close building panel">×</button><div class="eyebrow">YOUR SETTLEMENT · LEVEL ${s.keepLevel}</div><h2>${["The Central Keep", "The Grand Tower", "The Skycastle"][s.keepLevel - 1]}</h2><p>${["A hearth on Morrow’s back. Grow your home, then light a beacon for the road ahead.", "A grand upper hall, a wraparound balcony, and a view for miles.", "An outrageously tall home. Morrow appears remarkably unconcerned."][s.keepLevel - 1]}</p><div class="pad-count">${s.buildings.length} / ${capacity(s)} pads occupied</div>${button(s.keepLevel === 3 ? 'Keep fully upgraded' : (s.keepLevel === 1 ? 'Build the Grand Tower → 2' : 'Raise the Skycastle → 3'), 'upgrade-keep', keepReason(s), KEEP_COSTS[s.keepLevel - 1])}${button(s.expansions === 2 ? 'Both wings complete' : `Unfold ${s.expansions === 0 ? 'east' : 'west'} wing · +3 pads`, 'expand', expansionReason(s), EXPANSION_COSTS[s.expansions])}${button(s.creatureLevel === 2 ? 'Morrow is awakened' : 'Awaken Morrow · +35% travel', 'awaken', creatureReason(s), s.creatureLevel === 2 ? undefined : CREATURE_COST)}<div class="beacon-action">${s.beacon ? button('View your first chapter', 'summary', '') : button('✧ Light the Crown Beacon', 'beacon', beaconReason(s), BEACON_COST)}</div>`);
        }
        if (performance.now() > toastUntil)
            $('toast').classList.remove('visible');
    }
    render();
    return { render, toast, completeGather, gather: doGather, cancel, get placing() { return placing; }, pick(p: Pick) { if (p.type === 'outcrop')
            doGather(p.id); if (p.type === 'pad') {
            if (placing)
                place(p.pad);
            else
                toast('Choose a building from the build menu first.');
        } if (p.type === 'building') {
            if (placing)
                toast('This pad is occupied. Choose an empty pad.');
            else
                choose(p.id);
        } if (p.type === 'keep' || p.type === 'beacon') {
            if (placing)
                toast('Choose an empty construction pad.');
            else
                choose(p.type);
        } }, showWelcomeIfNeeded() { let seen = false; try { seen = localStorage.getItem(welcomeKey) === '1'; } catch {} if (!seen) welcome(); }, setSaving(ok: boolean) { if (storageOK && !ok) toast('Saving unavailable — keep this tab open.'); storageOK = ok; const status = document.getElementById('save-status'); if (status) status.textContent = ok ? 'Saved on this device. The journey rests while closed or hidden. No offline earnings.' : 'Saving unavailable — keep this tab open.'; } };
}
