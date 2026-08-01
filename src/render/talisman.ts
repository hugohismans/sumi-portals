import * as THREE from 'three';
import { INK } from './ink.js';

/**
 * LE SCEAU DE LA RETROUVAILLE.
 *
 * Il s'écrit tout seul, trait après trait, entre les deux joueurs. C'est la
 * seule animation du jeu qui récompense quelque chose, et elle ne dure que
 * quelques secondes — un sceau qu'on regarde se tracer, puis qui reste.
 *
 * Le parti pris : **les traits apparaissent DANS L'ORDRE où une main les
 * tracerait**, jamais tous ensemble. Un sceau qui surgit d'un bloc se lit comme
 * un logo ; un sceau qui s'écrit se lit comme un geste. C'est toute la
 * différence, et elle ne coûte qu'un décalage par trait.
 *
 * Chaque trait est une boîte fine qu'on fait CROÎTRE dans sa longueur, ce qui
 * imite le passage du pinceau sans qu'il faille dessiner quoi que ce soit.
 */

const VERMILLON = new THREE.Color('#c8492e');

/** Un trait : d'où il part, dans quelle direction, sur quelle longueur. */
interface Trait {
  mesh: THREE.Mesh;
  /** Longueur finale. On l'atteint en croissant depuis zéro. */
  longueur: number;
  /** Retard avant que le pinceau ne l'attaque, en secondes. */
  retard: number;
  /** Axe de croissance, en repère local du groupe. */
  axe: 'x' | 'y';
  /** Extrémité par laquelle le trait commence. */
  depart: THREE.Vector3;
}

const DUREE_TRAIT = 0.26;

export class Talisman {
  readonly group = new THREE.Group();
  private traits: Trait[] = [];
  private cadre: THREE.Mesh;
  private temps = -1;

  constructor(centre: [number, number, number]) {
    this.group.position.set(centre[0], centre[1] + 2.2, centre[2]);
    this.group.visible = false;

    // Le cadre du sceau : un carré plein vermillon, qui s'ouvre le premier et
    // sert de fond à tout le reste. Les sceaux d'encre fonctionnent comme ça —
    // le rouge d'abord, les traits ensuite, réservés dedans.
    this.cadre = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 1.9, 0.04),
      new THREE.MeshBasicMaterial({ color: VERMILLON, transparent: true, opacity: 0.94 }),
    );
    this.group.add(this.cadre);

    // Six traits, ordonnés comme on écrirait un caractère : les horizontales de
    // haut en bas, puis les verticales de gauche à droite. Ce n'est pas un vrai
    // caractère — juste sa grammaire de tracé, qui suffit à faire illusion.
    const t: [number, number, number, number, 'x' | 'y'][] = [
      [-0.62, 0.52, 1.24, 0.0, 'x'],
      [-0.42, 0.14, 0.84, 0.22, 'x'],
      [-0.62, -0.24, 1.24, 0.44, 'x'],
      [-0.62, -0.58, 1.24, 0.66, 'x'],
      [-0.2, 0.62, 1.06, 0.88, 'y'],
      [0.28, 0.4, 0.72, 1.1, 'y'],
    ];
    for (const [x, y, longueur, retard, axe] of t) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(axe === 'x' ? 1 : 0.13, axe === 'y' ? 1 : 0.13, 0.05),
        new THREE.MeshBasicMaterial({ color: INK }),
      );
      mesh.position.z = 0.045;
      mesh.visible = false;
      this.group.add(mesh);
      this.traits.push({ mesh, longueur, retard, axe, depart: new THREE.Vector3(x, y, 0.045) });
    }
  }

  /** À l'instant où les deux joueurs se retrouvent. */
  declencher(): void {
    if (this.temps >= 0) return;
    this.temps = 0;
    this.group.visible = true;
  }

  get enCours(): boolean {
    return this.temps >= 0;
  }

  /**
   * `regard` : on oriente le sceau vers la caméra à chaque image. Il est plat,
   * et un sceau vu par la tranche n'est plus un sceau.
   */
  update(dt: number, regard: THREE.Vector3): void {
    if (this.temps < 0) return;
    this.temps += dt;

    // Le cadre s'ouvre en premier, en un tiers de seconde.
    const ouverture = Math.min(1, this.temps / 0.34);
    const e = 1 - Math.pow(1 - ouverture, 3);
    this.cadre.scale.set(e, e, 1);

    for (const t of this.traits) {
      const avance = (this.temps - 0.3 - t.retard) / DUREE_TRAIT;
      if (avance <= 0) continue;
      t.mesh.visible = true;
      const k = Math.min(1, avance) * t.longueur;
      if (t.axe === 'x') {
        t.mesh.scale.x = k;
        t.mesh.position.set(t.depart.x + k * 0.5, t.depart.y, t.depart.z);
      } else {
        t.mesh.scale.y = k;
        t.mesh.position.set(t.depart.x, t.depart.y - k * 0.5, t.depart.z);
      }
    }

    // Une fois écrit, il respire très lentement. Assez pour rester vivant, trop
    // peu pour attirer l'œil quand on a fini de le regarder.
    if (this.temps > 2.6) {
      const s = 1 + Math.sin((this.temps - 2.6) * 1.4) * 0.018;
      this.group.scale.setScalar(s);
    }

    this.group.lookAt(regard);
  }
}
