import { audioPreferences, DEFAULT_AUDIO, frequency, PHRASE_SECONDS, phraseNotes, type AudioPreferences } from './score';
export type SoundCue = 'gather' | 'build' | 'upgrade' | 'beacon' | 'select';
export type SoundEnvironment = { region: number; night: number; paused: boolean; menu: boolean; distance: number; cycle: number; forge: boolean; rain?: number };
const INITIAL_ENV: SoundEnvironment = { region: 0, night: 0, paused: false, menu: false, distance: 32, cycle: 0, forge: false };
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
function random(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }

/** The synthesis graph also runs in OfflineAudioContext for deterministic mix checks. */
export class Soundscape {
    readonly music: GainNode;
    readonly ambience: GainNode;
    readonly effects: GainNode;
    readonly master: GainNode;
    private readonly musicInput: GainNode;
    private readonly noise: AudioBuffer;
    private readonly water: GainNode;
    private readonly rain: GainNode;
    private readonly wind: GainNode;
    private readonly windFilter: BiquadFilterNode;
    private readonly sources = new Set<AudioScheduledSourceNode>();
    private readonly permanent: AudioNode[] = [];
    private readonly rng = random(73801);
    private preferences: AudioPreferences = { ...DEFAULT_AUDIO };
    private environment = { ...INITIAL_ENV };
    private nextPhrase = .1;
    private phrase = 0;
    private musicSleeping = false;
    private nextBird = 4;
    private nextForge = 8;
    private nextMix = 0;
    private lastStep = -1;
    private lastCue = new Map<string, number>();
    private disposed = false;
    constructor(readonly context: BaseAudioContext) {
        const c = context;
        this.music = c.createGain(); this.ambience = c.createGain(); this.effects = c.createGain(); this.master = c.createGain();
        // Start silent: saved zero-volume channels must never leak on first wake.
        this.music.gain.value = 0; this.ambience.gain.value = 0; this.effects.gain.value = 0;
        this.musicInput = c.createGain();
        const dry = c.createGain(), wet = c.createGain(), reverb = c.createConvolver();
        dry.gain.value = .86; wet.gain.value = .28;
        reverb.buffer = this.impulse(3.8);
        this.musicInput.connect(dry).connect(this.music);
        this.musicInput.connect(reverb).connect(wet).connect(this.music);
        this.music.connect(this.master); this.ambience.connect(this.master); this.effects.connect(this.master);
        const rumbleCut = c.createBiquadFilter(), compressor = c.createDynamicsCompressor(), output = c.createGain();
        rumbleCut.type = 'highpass'; rumbleCut.frequency.value = 32;
        compressor.threshold.value = -18; compressor.knee.value = 18; compressor.ratio.value = 2.5;
        compressor.attack.value = .02; compressor.release.value = .7; output.gain.value = .8;
        this.master.connect(rumbleCut).connect(compressor).connect(output).connect(c.destination);
        this.master.gain.value = 0;
        this.noise = this.noiseBuffer(12);
        this.windFilter = c.createBiquadFilter(); this.windFilter.type = 'bandpass'; this.windFilter.Q.value = .45; this.windFilter.frequency.value = 320;
        this.wind = c.createGain(); this.wind.gain.value = .08;
        const windPan = c.createStereoPanner(); windPan.pan.value = -.25;
        this.loopNoise(.91).connect(this.windFilter).connect(this.wind).connect(windPan).connect(this.ambience);
        this.water = c.createGain(); this.water.gain.value = .055;
        const waterLow = c.createBiquadFilter(), waterHigh = c.createBiquadFilter(), waterPan = c.createStereoPanner();
        waterLow.type = 'lowpass'; waterLow.frequency.value = 2600; waterHigh.type = 'highpass'; waterHigh.frequency.value = 650; waterPan.pan.value = .4;
        this.loopNoise(1.03).connect(waterHigh).connect(waterLow).connect(this.water).connect(waterPan).connect(this.ambience);
        this.rain=c.createGain();this.rain.gain.value=0;
        const rainHigh=c.createBiquadFilter(),rainLow=c.createBiquadFilter();
        rainHigh.type='highpass';rainHigh.frequency.value=1100;rainLow.type='lowpass';rainLow.frequency.value=6500;
        this.loopNoise(1.19).connect(rainHigh).connect(rainLow).connect(this.rain).connect(this.ambience);
        this.permanent.push(this.rain,rainHigh,rainLow);
        // Two slow, non-synchronised swells avoid an obvious repeating noise loop.
        const windSwell = c.createOscillator(), windDepth = c.createGain(); windSwell.frequency.value = .047; windDepth.gain.value = .022;
        windSwell.connect(windDepth).connect(this.wind.gain); this.track(windSwell); windSwell.start();
        const waterSwell = c.createOscillator(), waterDepth = c.createGain(); waterSwell.frequency.value = .071; waterDepth.gain.value = .012;
        waterSwell.connect(waterDepth).connect(this.water.gain); this.track(waterSwell); waterSwell.start();
        this.permanent.push(this.music, this.ambience, this.effects, this.master, this.musicInput, dry, wet, reverb, rumbleCut, compressor, output, this.windFilter, this.wind, windPan, this.water, waterLow, waterHigh, waterPan, windDepth, waterDepth);
        this.nextPhrase = c.currentTime + .12; this.nextBird = c.currentTime + 4; this.nextForge = c.currentTime + 8;
        this.setPreferences(this.preferences);
    }
    private noiseBuffer(seconds: number) {
        const b = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * seconds), this.context.sampleRate), p = b.getChannelData(0), rng = random(451);
        let brown = 0;
        for (let i = 0; i < p.length; i++) { brown = (brown + .035 * (rng() * 2 - 1)) / 1.015; p[i] = brown * 2.5 + (rng() * 2 - 1) * .15; }
        // Blend the loop seam rather than clicking once per buffer.
        const n = Math.floor(this.context.sampleRate * .1);
        for (let i = 0; i < n; i++) { const fade = Math.sin(i / n * Math.PI / 2); p[i] *= fade; p[p.length - 1 - i] *= fade; }
        return b;
    }
    private impulse(seconds: number) {
        const c = this.context, b = c.createBuffer(2, c.sampleRate * seconds, c.sampleRate), rng = random(1009);
        for (let channel = 0; channel < 2; channel++) {
            const p = b.getChannelData(channel); let smooth = 0;
            for (let i = 0; i < p.length; i++) { smooth = smooth * .65 + (rng() * 2 - 1) * .35; p[i] = smooth * (1 - i / p.length) ** 3.5 * Math.min(1, i / (c.sampleRate * .025)); }
        }
        return b;
    }
    private track(source: AudioScheduledSourceNode, cleanup: AudioNode[] = []) {
        this.sources.add(source);
        source.onended = () => { source.disconnect(); this.sources.delete(source); cleanup.forEach(n => n.disconnect()); };
    }
    private loopNoise(rate: number) {
        const source = this.context.createBufferSource(); source.buffer = this.noise; source.loop = true; source.playbackRate.value = rate;
        this.track(source); source.start(0, this.rng() * 8); return source;
    }
    private smooth(param: AudioParam, value: number, time: number, seconds = .6) {
        param.cancelAndHoldAtTime(time); param.setTargetAtTime(value, time, seconds);
    }
    setPreferences(preferences: AudioPreferences, time = this.context.currentTime) {
        this.preferences = audioPreferences(preferences);
        if (this.musicSleeping && !this.preferences.muted && this.preferences.music > 0) { this.nextPhrase = time + .08; this.musicSleeping = false; }
        this.mix(time);
    }
    private mix(time: number) {
        const p = this.preferences, e = this.environment;
        this.smooth(this.master.gain, p.muted ? 0 : 1, time, .35);
        this.smooth(this.music.gain, p.music ** 1.4 * .7 * (e.menu ? .72 : e.paused ? .8 : 1), time);
        this.smooth(this.ambience.gain, p.ambience ** 1.4 * .9 * (e.menu ? .6 : e.paused ? .8 : 1), time);
        this.smooth(this.effects.gain, p.effects ** 1.4 * .7, time, .08);
        this.smooth(this.wind.gain, .07 + Math.min(1, e.region) * .06 + (e.rain || 0)*.04, time, 2);
        this.smooth(this.rain.gain, (e.rain || 0)*.38, time, 2);
        this.smooth(this.windFilter.frequency, 320 + Math.min(1, e.region) * 160, time, 2);
        this.smooth(this.water.gain, .045 + .035 * clamp(30 / e.distance, .4, 1.3) - .012 * e.night, time, 2);
    }
    /** Low, warm partials: no bright saw wave or unfiltered synthetic lead. */
    private tone(note: number, time: number, length: number, volume: number, pan: number, voice: 'pad' | 'pluck' | 'flute', bus = this.musicInput) {
        if (this.disposed || this.sources.size > 170) return;
        const c = this.context, gain = c.createGain(), filter = c.createBiquadFilter(), stereo = c.createStereoPanner();
        filter.type = 'lowpass'; filter.frequency.value = voice === 'pad' ? 1150 : 3200; filter.Q.value = .4; stereo.pan.value = pan;
        const attack = voice === 'pad' ? 2.8 : voice === 'flute' ? .45 : .012;
        gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(volume, time + attack);
        if (voice === 'pad') { gain.gain.linearRampToValueAtTime(volume * .85, time + length - 4); gain.gain.linearRampToValueAtTime(0, time + length); }
        else { gain.gain.exponentialRampToValueAtTime(.00001, time + length); gain.gain.linearRampToValueAtTime(0, time + length + .03); }
        gain.connect(filter).connect(stereo).connect(bus);
        const partials = voice === 'pad' ? [[1, .72, -4], [1, .28, 4], [2, .08, 0]] : voice === 'flute' ? [[1, 1, 0], [2, .08, 0]] : [[1, 1, 0], [2, .23, 0], [3, .075, 2], [4, .025, -2]];
        let remaining = partials.length;
        for (const [ratio, amplitude, detune] of partials) {
            const osc = c.createOscillator(), level = c.createGain();
            osc.type = 'sine'; osc.frequency.value = frequency(note) * ratio; osc.detune.value = detune; level.gain.value = amplitude;
            osc.connect(level).connect(gain); this.sources.add(osc);
            osc.onended = () => { osc.disconnect(); level.disconnect(); this.sources.delete(osc); if (--remaining === 0) { gain.disconnect(); filter.disconnect(); stereo.disconnect(); } };
            osc.start(time); osc.stop(time + length + .05);
        }
    }
    private texture(time: number, length: number, volume: number, hz: number, pan = 0) {
        if (this.sources.size > 170) return;
        const c = this.context, source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain(), stereo = c.createStereoPanner();
        source.buffer = this.noise; filter.type = 'bandpass'; filter.frequency.value = hz; filter.Q.value = .7; stereo.pan.value = pan;
        gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(volume, time + .014); gain.gain.exponentialRampToValueAtTime(.00001, time + length);
        source.connect(filter).connect(gain).connect(stereo).connect(this.effects);
        this.track(source, [filter, gain, stereo]); source.start(time, this.rng() * 8); source.stop(time + length + .02);
    }
    private bird(time: number, night: number) {
        const c = this.context, pan = this.rng() * 1.5 - .75, base = night > .5 ? 2350 : 1500 + this.rng() * 650;
        const count = night > .5 ? 3 : 2;
        for (let i = 0; i < count; i++) {
            const t = time + i * .24, osc = c.createOscillator(), gain = c.createGain(), stereo = c.createStereoPanner();
            stereo.pan.value = pan; osc.frequency.setValueAtTime(base, t); osc.frequency.exponentialRampToValueAtTime(base * (night > .5 ? 1.04 : 1.45), t + .075); osc.frequency.exponentialRampToValueAtTime(base * .94, t + .18);
            gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(night > .5 ? .007 : .012, t + .025); gain.gain.linearRampToValueAtTime(0, t + .19);
            osc.connect(gain).connect(stereo).connect(this.ambience); this.track(osc, [gain, stereo]); osc.start(t); osc.stop(t + .2);
        }
    }
    cue(cue: SoundCue, time = this.context.currentTime) {
        if (this.disposed || this.preferences.muted || this.preferences.effects === 0) return;
        const cooldown = cue === 'gather' ? .075 : cue === 'select' ? .1 : .3;
        if (time - (this.lastCue.get(cue) ?? -10) < cooldown) return;
        this.lastCue.set(cue, time);
        if (cue === 'gather') {
            this.texture(time, .14, .15, 1300, (this.rng() - .5) * .3);
            this.tone(74 + (this.rng() > .5 ? 0 : 2), time, .42, .055, 0, 'pluck', this.effects);
        } else if (cue === 'select') this.tone(62, time, .14, .022, 0, 'pluck', this.effects);
        else {
            this.texture(time, .35, .12, 220);
            const notes = cue === 'beacon' ? [50, 57, 62, 66, 69, 74, 78] : cue === 'build' ? [62, 66, 69] : [66, 69, 74];
            notes.forEach((note, i) => this.tone(note, time + i * (cue === 'beacon' ? .38 : .13), cue === 'beacon' ? 5 : 1.7, cue === 'beacon' ? .055 : .065, (i / notes.length - .5) * .65, 'pluck', this.effects));
        }
    }
    update(environment: SoundEnvironment, time = this.context.currentTime) {
        if (this.disposed) return;
        this.environment = environment;
        if (time >= this.nextMix) { this.mix(time); this.nextMix = time + .25; }
        // Schedule on the audio clock, never the accelerated simulation clock.
        if (time + .35 >= this.nextPhrase) {
            const start = Math.max(time + .04, this.nextPhrase), score = phraseNotes(this.phrase, environment.region);
            if (!this.preferences.muted && this.preferences.music > 0) {
                score.chord.forEach((note, i) => this.tone(note, start + i * .08, 21, i === 0 ? .075 : .044, (i - 2) * .22, 'pad'));
                score.melody.forEach(({ note, offset, strength }, i) => this.tone(note, start + offset, 3.8, .085 * strength, i % 2 ? .28 : -.22, 'pluck'));
                if (this.phrase % 2 === 1) this.tone(score.chord[2] + 12, start + 7.4, 5.5, .036, -.38, 'flute');
            }
            this.musicSleeping = this.preferences.muted || this.preferences.music === 0;
            this.phrase++; this.nextPhrase = start + PHRASE_SECONDS;
        }
        if (time >= this.nextBird && (environment.rain || 0) < .45) {
            if (!this.preferences.muted && this.preferences.ambience > 0) this.bird(time + .02, environment.night);
            this.nextBird = time + 11 + this.rng() * 16 + environment.region * 3;
        }
        const step = Math.floor(environment.cycle * 2);
        if (step !== this.lastStep) {
            if (this.lastStep >= 0 && !environment.paused && !environment.menu && !this.preferences.muted && this.preferences.effects > 0 && time - (this.lastCue.get('step') ?? -10) > .28) {
                const near = clamp(23 / environment.distance, .25, 1.1);
                this.texture(time, .3, .26 * near, 115, step % 2 ? -.2 : .2);
                this.tone(31, time, .3, .06 * near, 0, 'pluck', this.effects);
                if (step % 6 === 0) this.tone(81, time + .1, .7, .009 * near, .15, 'pluck', this.effects);
                this.lastCue.set('step', time);
            }
            this.lastStep = step;
        }
        if (time >= this.nextForge) {
            if (environment.forge && !environment.paused && !environment.menu) this.cueForge(time);
            this.nextForge = time + 8 + this.rng() * 9;
        }
    }
    private cueForge(time: number) {
        if (this.preferences.muted || this.preferences.effects === 0) return;
        this.texture(time, .16, .065, 1800, -.2);
        this.tone(86, time, .5, .012 * clamp(24 / this.environment.distance, .3, 1), -.2, 'pluck', this.effects);
    }
    fadeOut(time = this.context.currentTime) { this.smooth(this.master.gain, 0, time, .045); }
    get activeSources() { return this.sources.size; }
    dispose() {
        this.disposed = true;
        for (const source of this.sources) { try { source.stop(); } catch {} source.disconnect(); }
        this.sources.clear(); this.permanent.forEach(n => n.disconnect());
    }
}

/** Browser lifecycle and preferences stay outside the synthesizer and game save. */
export function createSoundscape(storageKey: string) {
    let preferences = { ...DEFAULT_AUDIO };
    try { preferences = audioPreferences(JSON.parse(localStorage.getItem(storageKey) || 'null')); } catch {}
    let context: AudioContext | null = null, synth: Soundscape | null = null, disposed = false, suspension: number | undefined;
    let environment = { ...INITIAL_ENV };
    let failure = false;
    const wake = () => {
        if (disposed || preferences.muted || document.hidden) return;
        try {
            if (!context) { context = new AudioContext({ latencyHint: 'playback' }); synth = new Soundscape(context); synth.setPreferences(preferences); }
            clearTimeout(suspension);
            // Resume is attempted in the same trusted gesture that starts play.
            void context.resume().then(() => { failure = false; if (document.hidden) { synth?.fadeOut(); void context?.suspend().catch(() => {}); } else synth?.setPreferences(preferences); }).catch(() => { failure = true; });
        } catch { failure = true; }
    };
    const gesture = (event: Event) => {
        if (event instanceof KeyboardEvent && (event.repeat || event.metaKey || event.ctrlKey || event.altKey || ['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key))) return;
        if (!context || context.state !== 'running') wake();
    };
    const visibility = () => {
        clearTimeout(suspension);
        if (document.hidden) {
            synth?.fadeOut();
            suspension = window.setTimeout(() => { if (document.hidden && context?.state === 'running') void context.suspend().catch(() => {}); }, 180);
        } else if (context) wake();
    };
    document.addEventListener('pointerdown', gesture, true); document.addEventListener('keydown', gesture, true);
    document.addEventListener('visibilitychange', visibility);
    const dispose = () => {
        disposed = true; clearTimeout(suspension); synth?.dispose(); if (context) void context.close().catch(() => {});
        document.removeEventListener('pointerdown', gesture, true); document.removeEventListener('keydown', gesture, true); document.removeEventListener('visibilitychange', visibility);
    };
    // Preserve the graph across a back-forward-cache pause; rebuild after a real reload.
    const pagehide = (e: PageTransitionEvent) => { if (e.persisted) { synth?.fadeOut(); void context?.suspend(); } else dispose(); };
    const pageshow = (e: PageTransitionEvent) => { if (e.persisted && context) wake(); };
    addEventListener('pagehide', pagehide); addEventListener('pageshow', pageshow);
    return {
        get preferences() { return { ...preferences }; },
        get status() { return failure ? 'Sound could not start. Try unmuting again.' : preferences.muted ? 'Sound is muted.' : context?.state === 'running' ? 'Sound is on. Headphones bring out the detail.' : 'Sound begins when you interact with the game.'; },
        setPreferences(next: Partial<AudioPreferences>) {
            preferences = audioPreferences({ ...preferences, ...next });
            try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch {}
            synth?.setPreferences(preferences);
            if (!preferences.muted) wake();
        },
        cue(cue: SoundCue) { if (context?.state === 'running' && !document.hidden) synth?.cue(cue); },
        update(next: SoundEnvironment) { environment = next; if (context?.state === 'running' && !document.hidden) synth?.update(environment); },
        dispose() { dispose(); removeEventListener('pagehide', pagehide); removeEventListener('pageshow', pageshow); },
    };
}
export type GameAudio = ReturnType<typeof createSoundscape>;
