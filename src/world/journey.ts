import { MathUtils } from 'three';
const ramp=(a:number,b:number,x:number)=>MathUtils.smoothstep(x,a,b);
const pulse=(a:number,b:number,c:number,d:number,x:number)=>ramp(a,b,x)*(1-ramp(c,d,x));
/** Continuous route coordinates, independent of streaming section boundaries. */
export function journeyAt(x:number){
    const progress=((-x%360)+360)%360;
    const woodland=pulse(42,78,142,182,progress);
    const overlook=pulse(185,215,275,312,progress);
    return {woodland,overlook,meadow:1-woodland-overlook};
}
export const encounterEnvelope=(time:number)=>pulse(22,32,48,63,((time%210)+210)%210);
