import * as THREE from 'three';
import type { Carryable } from '../core/carryables.js';
import { PALETTE, createCelMaterial, createOutlineMaterial, syncInkUniforms } from './ink.js';
import { buildWorldGeometry } from './worldMesh.js';

/**
 * Affichage des caisses.
 *
 * La géométrie est RECONSTRUITE à sa taille réelle quand la caisse change de
 * dimension, plutôt que mise à l'échelle par une matrice. C'est volontaire : le
 * contour d'encre est calculé dans le repère de l'objet, donc une caisse
 * agrandie par matrice hériterait d'un trait quatre fois plus épais. Un
 * changement de taille n'arrive qu'à la traversée d'un portail — autant dire
 * jamais, à l'échelle d'une image.
 */
interface View {
  group: THREE.Group;
  mesh: THREE.Mesh;
  outlineMesh: THREE.Mesh;
  size: number;
}

export class CarryableViews {
  readonly group = new THREE.Group();
  private readonly views = new Map<string, View>();
  private readonly materials: { cel: THREE.ShaderMaterial; outline: THREE.ShaderMaterial }[] = [];

  build(items: Carryable[]): void {
    for (const item of items) {
      const cel = createCelMaterial(PALETTE[item.ink] ?? PALETTE[3]);
      const outline = createOutlineMaterial();
      // Une caisse est bien plus petite qu'un immeuble : sans trait plus fin,
      // elle disparaîtrait sous son propre contour.
      outline.uniforms.uThickness.value = 0.0038;
      this.materials.push({ cel, outline });

      const group = new THREE.Group();
      const geo = cubeGeometry(item.size);
      const outlineMesh = new THREE.Mesh(geo, outline);
      const mesh = new THREE.Mesh(geo, cel);
      outlineMesh.frustumCulled = false;
      mesh.frustumCulled = false;
      group.add(outlineMesh, mesh);
      this.group.add(group);

      this.views.set(item.id, { group, mesh, outlineMesh, size: item.size });
    }
  }

  update(items: Carryable[]): void {
    for (const item of items) {
      const view = this.views.get(item.id);
      if (!view) continue;

      if (view.size !== item.size) {
        const geo = cubeGeometry(item.size);
        view.mesh.geometry.dispose();
        view.mesh.geometry = geo;
        view.outlineMesh.geometry = geo;
        view.size = item.size;
      }

      view.group.position.set(item.position.x, item.position.y, item.position.z);
    }
  }

  syncInk(): void {
    for (const m of this.materials) {
      syncInkUniforms(m.cel);
      syncInkUniforms(m.outline);
    }
  }
}

/** Cube posé sur son assise : l'origine est au centre du bas, comme en simulation. */
const cubeGeometry = (size: number): THREE.BufferGeometry => {
  const h = size * 0.5;
  return buildWorldGeometry([{ min: [-h, 0, -h], max: [h, size, h], ink: 0 }]);
};
