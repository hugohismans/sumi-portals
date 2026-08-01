import * as THREE from 'three';
import { createCelMaterial, createOutlineMaterial, syncInkUniforms } from './ink.js';
import { buildWorldGeometry } from './worldMesh.js';

/**
 * LE PINCEAU DE COULEUR QUI VIENT REPEINDRE LE MONDE.
 *
 * La couleur revenait toute seule, en fondu, dès qu'on avait posé l'objet sur
 * son socle. Ça marchait, et ça ne racontait rien : un monde qui se repeint
 * sans personne pour le peindre est un réglage, pas une scène.
 *
 * Ici, **un pinceau de la couleur rapportée jaillit du socle** et part balayer
 * le monde. C'est pendant son vol, et seulement pendant, que la teinte remonte.
 * On ne voit plus une couleur apparaître : on voit quelqu'un la poser.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TROIS DÉCISIONS, ET ELLES FONT TOUT
 *
 * **Il jaillit vers le HAUT avant de partir.** Une chose qui part à
 * l'horizontale glisse ; une chose qui bondit d'abord a décidé de partir. C'est
 * le seul moment vif du jeu, et il dure un tiers de seconde.
 *
 * **Il balaie en arc, pas en ligne droite.** Un aller simple d'un point à un
 * autre se lit comme un déplacement. Un arc large, qui revient, se lit comme un
 * GESTE — celui d'une main qui couvre une surface.
 *
 * **Il revient se poser au-dessus de son socle et y reste.** La galerie devient
 * une collection : à mesure qu'on rapporte des couleurs, la place se peuple de
 * pinceaux qui flottent au-dessus de leurs socles. C'est la jauge de
 * progression du jeu, et elle est faite de personnages plutôt que de chiffres.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Durées des trois temps, en secondes. */
const BOND = 0.34;
const BALAYAGE = 4.2;
const RETOUR = 1.6;

/**
 * Le corps, tenu par sa TOUFFE : c'est la seule partie qui porte la couleur du
 * monde d'où il vient. La hampe et la virole restent celles de tous les
 * pinceaux du jeu — ils sont de la même famille, ils ne diffèrent que par
 * l'encre qu'ils portent.
 */
const buildCorps = (teinte: string, materiaux: THREE.ShaderMaterial[]): THREE.Group => {
  const g = new THREE.Group();
  const piece = (
    boxes: [[number, number, number], [number, number, number]][],
    couleur: string,
  ): void => {
    const cel = createCelMaterial(new THREE.Color(couleur));
    const outline = createOutlineMaterial();
    outline.uniforms.uThickness.value = 0.004;
    materiaux.push(cel, outline);
    const geo = buildWorldGeometry(boxes.map(([min, max]) => ({ min, max, ink: 0 })));
    const edge = new THREE.Mesh(geo, outline);
    const fill = new THREE.Mesh(geo, cel);
    edge.frustumCulled = false;
    fill.frustumCulled = false;
    g.add(edge, fill);
  };

  piece(
    [
      [[-0.22, -0.04, -0.22], [0.22, 0.34, 0.22]],
      [[-0.14, -0.4, -0.14], [0.14, -0.02, 0.14]],
      [[-0.06, -0.7, -0.06], [0.06, -0.36, 0.06]],
    ],
    teinte,
  );
  piece([[[-0.25, 0.32, -0.25], [0.25, 0.5, 0.25]]], '#b08a48');
  piece(
    [
      [[-0.17, 0.48, -0.17], [0.17, 1.45, 0.17]],
      [[-0.12, 1.43, -0.12], [0.12, 2.12, 0.12]],
    ],
    '#dccbaa',
  );
  return g;
};

/** Amorti aux deux bouts, pour qu'aucun mouvement ne démarre ni ne s'arrête sec. */
const doux = (t: number): number => t * t * (3 - 2 * t);

export class PinceauPeintre {
  readonly group = new THREE.Group();
  private readonly materiaux: THREE.ShaderMaterial[] = [];
  private readonly socle: THREE.Vector3;
  private readonly corps: THREE.Group;
  private temps = -1;
  private aPeint = false;

  /** Appelé quand il commence réellement à peindre. C'est lui qui rend la couleur. */
  onPeint: (() => void) | null = null;

  constructor(socle: [number, number, number], teinte: string, echelle = 1) {
    this.socle = new THREE.Vector3(...socle);
    this.corps = buildCorps(teinte, this.materiaux);
    this.corps.scale.setScalar(echelle);
    this.group.add(this.corps);
    this.group.position.copy(this.socle);
    this.group.visible = false;
  }

  /** L'objet vient d'être posé : le pinceau en jaillit. */
  declencher(): void {
    if (this.temps >= 0) return;
    this.temps = 0;
    this.group.visible = true;
  }

  /** Déjà rapporté lors d'une partie précédente : il flotte, sans refaire la fête. */
  poserDejaAcquis(): void {
    this.temps = BOND + BALAYAGE + RETOUR;
    this.aPeint = true;
    this.group.visible = true;
  }

  get enCours(): boolean {
    return this.temps >= 0;
  }

  update(dt: number, echelleJoueur: number): void {
    if (this.temps < 0) return;
    this.temps += dt;

    if (this.temps < BOND) {
      // LE BOND. Il monte vite, en tournant sur lui-même.
      const t = this.temps / BOND;
      this.group.position.set(this.socle.x, this.socle.y + doux(t) * 5.5, this.socle.z);
      this.corps.rotation.y = t * Math.PI * 2.4;
      this.corps.rotation.z = doux(t) * 0.5;
      return;
    }

    if (this.temps < BOND + BALAYAGE) {
      const t = (this.temps - BOND) / BALAYAGE;
      // C'est ICI que la couleur revient, et pas avant : on la voit monter sous
      // lui pendant qu'il balaie, jamais après coup.
      if (!this.aPeint) {
        this.aPeint = true;
        this.onPeint?.();
      }
      // L'ARC. Il s'éloigne, tourne, et revient — un geste de main, pas un
      // déplacement. Le rayon suit l'échelle du joueur pour que le balayage
      // couvre toujours « ce qu'on voit », à toutes les tailles.
      const rayon = 26 * echelleJoueur * Math.sin(t * Math.PI);
      const angle = t * Math.PI * 1.8;
      this.group.position.set(
        this.socle.x + Math.sin(angle) * rayon,
        this.socle.y + 5.5 + Math.sin(t * Math.PI * 2) * 4.5 * echelleJoueur,
        this.socle.z + Math.cos(angle) * rayon,
      );
      // Il pique dans le sens de sa course : la touffe la première.
      this.corps.rotation.z = 0.5 + Math.sin(t * Math.PI * 3) * 0.35;
      this.corps.rotation.y = angle;
      return;
    }

    // LE REPOS. Il revient au-dessus de son socle et y flotte, pour de bon.
    //
    // Le retour part du point où le balayage l'a laissé — donc juste au-dessus
    // du socle, puisque l'arc y ramène — et se contente de redescendre à sa
    // hauteur de repos en se redressant. Une trajectoire de plus serait un
    // mouvement de trop : il a fini son travail, il se pose.
    const t = Math.min(1, (this.temps - BOND - BALAYAGE) / RETOUR);
    const d = doux(t);
    const flotte = Math.sin(this.temps * 0.9) * 0.16;
    this.group.position.set(
      this.socle.x,
      this.socle.y + (1 - d) * 5.5 + d * (2.4 + flotte),
      this.socle.z,
    );
    // Il se redresse, et tourne très lentement sur lui-même — assez pour rester
    // vivant, trop peu pour attirer l'œil de quelqu'un qui joue.
    this.corps.rotation.z = (1 - d) * 0.5;
    this.corps.rotation.y += dt * 0.35;

    for (const m of this.materiaux) syncInkUniforms(m);
  }
}
