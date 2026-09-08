import * as THREE from 'three';
import { rand } from '../art';

export const geologyMaterial = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .98});

// Broken planes and offset strata, with a buried base. Each seed describes an
// entire formation; this avoids scaling the same pebble into every cliff face.
export function fracturedRock(seed: number, color: THREE.Color, profile = 0) {
    const rng = rand(seed), sides = 7 + Math.floor(rng() * 3);
    const positions: number[] = [], colors: number[] = [], rings: THREE.Vector3[][] = [];
    const lean = (rng() - .5) * .65, twist = rng() * Math.PI;
    const widths = profile === 1 ? [1, 1.06, .98, .93, .74]
        : profile === 2 ? [1, .83, .92, .52, .23] : [1, 1.13, .91, .72, .46];
    const radial = Array.from({length:sides}, () => .75 + rng() * .43);
    for (let j = 0; j < 5; j++) {
        const level = [0, .13, .43, .76, 1][j];
        rings.push(radial.map((radius, i) => {
            const a = i / sides * Math.PI * 2 + twist;
            const shelf = widths[j] * radius * (1 + (rng() - .5) * .15);
            return new THREE.Vector3(Math.cos(a) * shelf * .5 + lean * level,
                level + (j === 0 ? 0 : (rng() - .5) * .12), Math.sin(a) * shelf * .5);
        }));
    }
    const triangle = (a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3, shade:number) => {
        for (const p of [a,b,c]) { positions.push(p.x,p.y,p.z); const tint=color.clone().multiplyScalar(shade); colors.push(tint.r,tint.g,tint.b); }
    };
    for (let j=0;j<4;j++) for(let i=0;i<sides;i++) {
        const n=(i+1)%sides, shade=.83+rng()*.24+(j%2)*.025;
        triangle(rings[j][i],rings[j+1][i],rings[j][n],shade);
        triangle(rings[j][n],rings[j+1][i],rings[j+1][n],shade*.98);
    }
    const top = new THREE.Vector3(lean, 1.02, 0);
    for (let i=0;i<sides;i++) triangle(rings[4][i],top,rings[4][(i+1)%sides],1.04+rng()*.07);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
