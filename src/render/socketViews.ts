import * as THREE from 'three';
import type { Socket } from '../core/sockets.js';
import { INK, PALETTE, createCelMaterial, createOutlineMaterial, syncInkUniforms } from './ink.js';
import { buildWorldGeometry } from './worldMesh.js';

/**
 * Affichage des réceptacles.
 *
 * Un logement vide se lit comme un CREUX : quatre arêtes d'encre posées au sol,
 * qui dessinent l'empreinte de ce qu'on attend. Sa taille est l'énoncé de
 * l'énigme — on doit voir d'un coup d'œil si la caisse qu'on porte est trop
 * grosse ou trop petite.
 *
 * Rempli, il se scelle : un sceau vermillon monte et tourne. Ce retour immédiat
 * n'est pas décoratif. Sans lui, le joueur qui échoue ne sait pas si c'est la
 * taille, la position ou l'objet qui ne va pas, et il tâtonne au lieu de
 * raisonner.
 */
interface View {
  group: THREE.Group;
  seal: THREE.Group;
  filled: boolean;
  /** Avancement de l'animation de scellement, de 0 à 1. */
  bloom: number;
}

export class SocketViews {
  readonly group = new THREE.Group();
  private readonly views = new Map<string, View>();
  private readonly materials: THREE.ShaderMaterial[] = [];

  build(sockets: Socket[]): void {
    for (const s of sockets) {
      const cel = createCelMaterial(PALETTE[s.ink] ?? PALETTE[3]);
      const outline = createOutlineMaterial();
      outline.uniforms.uThickness.value = 0.004;
      this.materials.push(cel, outline);

      const group = new THREE.Group();
      group.position.set(s.position.x, s.position.y, s.position.z);

      // L'empreinte au sol : quatre barreaux qui cernent le vide. On montre le
      // manque, pas un objet — c'est ce qui donne envie d'y mettre quelque chose.
      const t = Math.max(0.04, s.size * 0.09);
      const h = s.size * 0.5;
      const bars: [number, number, number, number, number, number][] = [
        [-h - t, 0, -h - t, h + t, t, -h],
        [-h - t, 0, h, h + t, t, h + t],
        [-h - t, 0, -h, -h, t, h],
        [h, 0, -h, h + t, t, h],
      ];
      for (const [x0, y0, z0, x1, y1, z1] of bars) {
        const geo = buildWorldGeometry([{ min: [x0, y0, z0], max: [x1, y1, z1], ink: 0 }]);
        group.add(new THREE.Mesh(geo, outline), new THREE.Mesh(geo, cel));
      }

      // Quatre montants d'angle : ils donnent la HAUTEUR attendue, sans quoi on
      // ne saurait pas si la caisse doit être un pavé ou un cube.
      for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
        const geo = buildWorldGeometry([
          {
            min: [sx * h - (sx < 0 ? 0 : t), 0, sz * h - (sz < 0 ? 0 : t)],
            max: [sx * h + (sx < 0 ? t : 0), s.size, sz * h + (sz < 0 ? t : 0)],
            ink: 0,
          },
        ]);
        group.add(new THREE.Mesh(geo, outline), new THREE.Mesh(geo, cel));
      }
      for (const m of group.children) (m as THREE.Mesh).frustumCulled = false;

      const seal = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(s.size * 0.5, s.size * 0.08, 6, 24),
        new THREE.MeshBasicMaterial({ color: 0xc8492e }),
      );
      ring.rotation.x = Math.PI / 2;
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(s.size * 0.2, 0),
        new THREE.MeshBasicMaterial({ color: INK }),
      );
      seal.add(ring, core);
      seal.position.y = s.size * 0.62;
      seal.visible = false;
      group.add(seal);

      this.group.add(group);
      this.views.set(s.id, { group, seal, filled: false, bloom: 0 });
    }
  }

  update(sockets: Socket[], dt: number, time: number): void {
    for (const s of sockets) {
      const v = this.views.get(s.id);
      if (!v) continue;

      const filled = s.filledBy !== null;
      if (filled && !v.filled) v.filled = true;

      if (v.filled && v.bloom < 1) v.bloom = Math.min(1, v.bloom + dt * 2.2);
      v.seal.visible = v.bloom > 0;
      if (v.bloom > 0) {
        // Le sceau se dessine en montant, puis tourne doucement. Le mouvement
        // attire l'œil au bon moment sans réclamer d'attention ensuite.
        const e = 1 - Math.pow(1 - v.bloom, 3);
        v.seal.scale.setScalar(e);
        v.seal.rotation.y = time * 0.6;
        v.seal.position.y = s.size * (0.32 + 0.3 * e);
      }
    }
  }

  syncInk(): void {
    for (const m of this.materials) syncInkUniforms(m);
  }
}
