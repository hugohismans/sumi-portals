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
  /**
   * Avancement du REFUS, de 1 à 0.
   *
   * Le sceau récompense ce qui entre ; il n'y avait rien pour ce qui n'entre
   * pas. Une pièce refusée restait posée à côté d'un trou parfaitement
   * impassible, et le joueur ne savait même pas qu'il avait été entendu.
   */
  refus: number;
}

export class SocketViews {
  readonly group = new THREE.Group();
  private readonly views = new Map<string, View>();
  private readonly materials: THREE.ShaderMaterial[] = [];
  /** Les matériaux de chaque logement, pour pouvoir le teindre seul. */
  private readonly vues = new Map<string, THREE.ShaderMaterial[]>();
  private readonly socketsParId = new Map<string, Socket>();

  /**
   * LES SOCLES SONT GRIS COMME LE MONDE, tant qu'il n'a pas retrouvé ses
   * couleurs. Ils ont leurs propres matériaux, hors du système de régions — ils
   * restaient donc vermillon au milieu d'un village en lavis, quatre taches
   * rouges qu'on voyait à cent mètres et qui ne voulaient rien dire.
   *
   * La règle du jeu est simple : **tout est gris, sauf ce qui porte une
   * couleur.** Un socle vide n'en porte aucune. Il la prendra en se remplissant.
   */
  setCouleur(v: number | ((s: Socket) => number)): void {
    if (typeof v !== 'function') {
      for (const m of this.materials) {
        if (m.uniforms.uCouleur) m.uniforms.uCouleur.value = v;
      }
      return;
    }
    // RÉGION PAR RÉGION. Un seul nombre pour tout le monde décolorait les creux
    // d'un niveau entier dès qu'UNE région y attendait une couleur — voir la
    // note jumelle dans `portalRenderer.setCouleurCadres`.
    for (const [id, view] of this.vues) {
      const k = v(this.socketsParId.get(id)!);
      for (const m of view) if (m.uniforms.uCouleur) m.uniforms.uCouleur.value = k;
    }
  }

  build(sockets: Socket[]): void {
    for (const s of sockets) {
      const cel = createCelMaterial(PALETTE[s.ink] ?? PALETTE[3]);
      const outline = createOutlineMaterial();
      outline.uniforms.uThickness.value = 0.004;
      this.materials.push(cel, outline);
      this.vues.set(s.id, [cel, outline]);
      this.socketsParId.set(s.id, s);

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
      this.views.set(s.id, { group, seal, filled: false, bloom: 0, refus: 0 });
    }
  }

  /**
   * LE CREUX SE RÉTRACTE — un refus, et c'est tout ce qu'il fait.
   *
   * Il n'annonce PAS lequel des quatre attributs cloche : ça, c'est la phrase
   * qui le dit. Il annonce qu'il a vu la pièce et qu'il l'a écartée, ce qui
   * n'était dit nulle part — une pièce reposée à côté d'un trou impassible ne
   * permettait même pas de savoir si le jeu avait remarqué le geste.
   *
   * Le mouvement est un tressaillement bref : le trait d'encre se contracte,
   * puis revient. Pas de clignotement, pas de rouge — un cadre qui se rétracte
   * une demi-seconde se lit comme un refus dans n'importe quelle langue, et
   * l'on ne dépense pas la couleur, qui est le sujet du jeu.
   */
  refuser(id: string): void {
    const v = this.views.get(id);
    if (v) v.refus = 1;
  }

  update(sockets: Socket[], dt: number, time: number): void {
    for (const s of sockets) {
      const v = this.views.get(s.id);
      if (!v) continue;

      // Le tressaillement du refus. Il décroît en un peu moins d'une seconde,
      // et son amplitude reste faible : on veut que l'œil l'attrape, pas que le
      // décor tremble.
      if (v.refus > 0) {
        v.refus = Math.max(0, v.refus - dt * 1.6);
        const t = Math.sin(v.refus * Math.PI * 3) * v.refus;
        v.group.scale.setScalar(1 - 0.11 * Math.abs(t));
      } else if (v.group.scale.x !== 1) {
        v.group.scale.setScalar(1);
      }

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
