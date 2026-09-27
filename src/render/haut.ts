import * as THREE from 'three';
import { matriceDuHaut } from '../core/portals.js';
import { estDebout, type Haut } from '../core/pesanteur.js';

/**
 * LE REPÈRE D'UN HAUT, EN QUATERNION — celui de `REPERES` dans
 * `core/pesanteur.ts`, pour le rendu. Tout ce qui se dessine « debout » dans
 * le repère d'un joueur ou d'une pièce — la caméra, le bonhomme, un pinceau
 * planté dans un mur — prend ce quaternion à GAUCHE de sa rotation d'origine.
 */
const cache = new Map<Haut, THREE.Quaternion>();

/** Écrit le quaternion du haut dans `out`. L'identité pour '+y' ou `undefined`. */
export const quaternionDuHaut = (h: Haut | undefined, out: THREE.Quaternion): THREE.Quaternion => {
  if (estDebout(h)) return out.identity();
  let q = cache.get(h!);
  if (!q) {
    const m = matriceDuHaut(h);
    q = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1),
    );
    cache.set(h!, q);
  }
  return out.copy(q);
};
