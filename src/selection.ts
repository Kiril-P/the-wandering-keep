import * as THREE from 'three';
import type { Pick } from './settlement';

const proxyGeometry = new THREE.BoxGeometry(1, 1, 1);
const proxyMaterial = new THREE.MeshBasicMaterial({ visible: false });
/** A stable interaction volume; moving leaves, flags and particles are never pick targets. */
export function selectionVolume(parent: THREE.Object3D, pick: Pick, size: THREE.Vector3, center: THREE.Vector3) {
    const proxy = new THREE.Mesh(proxyGeometry, proxyMaterial);
    proxy.name = 'Selection volume'; proxy.userData.pick = pick; proxy.userData.selectionOnly = true;
    proxy.scale.copy(size); proxy.position.copy(center); parent.add(proxy);
    return proxy;
}
export function visibleInTree(object: THREE.Object3D) {
    for (let node: THREE.Object3D | null = object; node; node = node.parent) if (!node.visible) return false;
    return true;
}
export function createPicker() {
    const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
    function hits(targets: THREE.Object3D[], camera: THREE.Camera, x: number, y: number) {
        pointer.set(x, y); ray.setFromCamera(pointer, camera);
        return ray.intersectObjects(targets, true).filter(h => visibleInTree(h.object));
    }
    const identify = (object: THREE.Object3D): Pick | null => {
        for (let node: THREE.Object3D | null = object; node; node = node.parent) if (node.userData.pick) return node.userData.pick;
        return null;
    };
    return { pick(targets: THREE.Object3D[], camera: THREE.Camera, x: number, y: number, width: number, height: number, touch = false): Pick | null {
        const direct = hits(targets, camera, x, y)[0];
        const directPick = direct ? identify(direct.object) : null;
        if (directPick && directPick.type !== 'keep') return directPick;
        // Rescue near misses on small buildings before falling back to the much larger Keep.
        // Foreground Keep surfaces still occlude buildings on its far side.
        const smallTargets = targets.filter(o => o.userData.pick?.type === 'building');
        for (const radius of [4, touch ? 13 : 9]) {
            let best: THREE.Intersection | undefined;
            for (let i = 0; i < 8; i++) {
                const angle = i * Math.PI / 4;
                const hit = hits(smallTargets, camera, x + Math.cos(angle) * radius * 2 / width, y + Math.sin(angle) * radius * 2 / height)[0];
                if (!hit || identify(hit.object)?.type !== 'building' || (direct && hit.distance > direct.distance + .35)) continue;
                if (!best || hit.distance < best.distance) best = hit;
            }
            if (best) return identify(best.object);
        }
        return directPick;
    } };
}
