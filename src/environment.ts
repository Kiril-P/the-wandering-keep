// One saved journey clock drives every atmospheric layer. Sampling is independent
// of frame rate, so reopening a save reproduces its weather and time of day.
export const DAY_SECONDS = 24 * 60;
export const WEATHER_SECONDS = 600;
export type LightMode = 'Journey' | 'Golden evening' | 'Night' | 'Dawn';
export const LIGHT_MODES: LightMode[] = ['Journey', 'Golden evening', 'Night', 'Dawn'];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const pulse = (a: number, b: number, c: number, d: number, t: number) => ease(a,b,t) * (1-ease(c,d,t));
export function sampleEnvironment(seconds: number, mode: LightMode = 'Journey') {
    const phase = mode === 'Golden evening' ? .63 : mode === 'Night' ? .88 : mode === 'Dawn' ? .22 : ((seconds / DAY_SECONDS + .3) % 1 + 1) % 1;
    const daylight = ease(.16,.31,phase) * (1-ease(.68,.81,phase));
    const night = 1-daylight;
    const golden = pulse(.45,.56,.67,.77,phase) + pulse(.17,.21,.24,.31,phase)*.55;
    const dawn = pulse(.12,.2,.27,.36,phase);
    const front = ((seconds % WEATHER_SECONDS) + WEATHER_SECONDS) % WEATHER_SECONDS;
    const strength = .8 + .2*Math.sin(Math.floor(seconds / WEATHER_SECONDS)*1.73+.8);
    const overcast = pulse(125,205,315,440,front)*strength;
    const rain = pulse(210,255,295,350,front)*strength;
    const wetness = pulse(212,275,370,510,front)*strength;
    const mist = Math.max(dawn*.72, pulse(65,125,160,235,front)*.62, pulse(305,355,420,505,front)*.5);
    return {phase, daylight, night, golden, dawn, overcast, rain, wetness, mist};
}
export type Environment = ReturnType<typeof sampleEnvironment>;
