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

/** Durées, en secondes. */
const EVEIL = 0.7;
const BOND = 0.34;
const BALAYAGE = 2.8;
const RETOUR = 1.6;

/** Rayon de l'orbite autour du joueur, en tailles de joueur. */
const ORBITE = 1.5;

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
  /**
   * LES QUATRE ÂGES DU PINCEAU DE COULEUR.
   *
   *   dormant  — il attend dans son monde, invisible jusqu'à ce qu'on le prenne
   *   compagnon — il tourne autour de vous et vous suit partout
   *   peintre  — il vous quitte pour aller repeindre, et la couleur monte
   *   posé     — il flotte au-dessus de son socle, pour de bon
   *
   * C'est l'âge de COMPAGNON qui manquait, et c'était le plus important. Le
   * pinceau jaillissait du socle au moment où l'on y posait l'objet : trop
   * tard, et au mauvais endroit. On ne l'avait jamais rencontré. Maintenant on
   * le prend là où il vit, il nous accompagne tout le trajet du retour, et
   * c'est de cette compagnie que naît l'envie de le ramener.
   */
  private etat: 'dormant' | 'compagnon' | 'peintre' | 'pose' = 'dormant';
  private temps = -1;
  private aPeint = false;
  /** Planté et visible, avant qu'on l'ait pris. */
  private plante = false;
  private readonly cible = new THREE.Vector3();

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

  /**
   * IL DORT DANS SON MONDE, planté et bien visible.
   *
   * On ramassait un cube rouge POUR OBTENIR un pinceau rouge : deux objets pour
   * une seule idée, et rien à l'arrivée qui donne envie d'aller voir. Le cube
   * existe toujours — c'est lui qui porte la physique, la taille qui change en
   * traversant les portes, et l'emboîtement final — mais on ne le dessine plus.
   * C'est le pinceau qu'on voit, planté dans le sol, la touffe en l'air.
   */
  planter(ou: [number, number, number], echelle: number): void {
    if (this.etat !== 'dormant') return;
    this.group.position.set(ou[0], ou[1], ou[2]);
    this.corps.scale.setScalar(echelle);
    // Planté : légèrement de biais, comme un pinceau qu'on a laissé là.
    this.corps.rotation.set(0, 0.6, 0.22);
    this.group.visible = true;
    this.plante = true;
  }

  /**
   * ON VIENT DE LE PRENDRE, au fond de son monde. Il s'éveille et se met à
   * tourner autour de nous. À partir de là il ne nous quitte plus — jusqu'à ce
   * qu'on rentre, et qu'il ait du travail.
   */
  reveiller(ou: THREE.Vector3): void {
    if (this.etat !== 'dormant') return;
    this.etat = 'compagnon';
    this.temps = 0;
    this.plante = false;
    this.group.position.copy(ou);
    this.group.visible = true;
  }

  /** De retour au monde gris : il nous quitte et part peindre. */
  declencher(): void {
    if (this.etat !== 'compagnon') return;
    this.etat = 'peintre';
    this.temps = 0;
  }

  get suitLeJoueur(): boolean {
    return this.etat === 'compagnon';
  }

  get aDejaPeint(): boolean {
    return this.aPeint;
  }

  /** Déjà rapporté lors d'une partie précédente : il flotte, sans refaire la fête. */
  poserDejaAcquis(): void {
    this.etat = 'peintre';
    this.temps = BOND + BALAYAGE + RETOUR;
    this.aPeint = true;
    this.group.visible = true;
  }

  get enCours(): boolean {
    return this.etat !== 'dormant' || this.plante;
  }

  update(dt: number, echelleJoueur: number, oeil: THREE.Vector3): void {
    // Planté : il respire sur place, et c'est tout. Assez pour qu'on le
    // remarque de loin, trop peu pour qu'il ait l'air de bouger.
    if (this.etat === 'dormant') {
      if (!this.plante) return;
      this.temps += dt;
      this.corps.rotation.z = 0.22 + Math.sin(this.temps * 1.1) * 0.05;
      for (const m of this.materiaux) syncInkUniforms(m);
      return;
    }
    this.temps += dt;

    // ─── COMPAGNON ────────────────────────────────────────────────────────
    //
    // Il tourne autour du joueur, un peu en arrière et un peu au-dessus, à un
    // rayon proportionnel à sa taille : à ×4 comme à ×1/4, il occupe la même
    // place dans le champ de vision. Il suit AVEC DU RETARD, en glissant vers
    // sa position voulue — un suiveur qui colle est une interface, un suiveur
    // qui traîne est une créature.
    if (this.etat === 'compagnon') {
      const a = this.temps * 1.15;
      const r = ORBITE * echelleJoueur;
      this.cible.set(
        oeil.x + Math.sin(a) * r,
        oeil.y + 0.35 * echelleJoueur + Math.sin(this.temps * 1.7) * 0.12 * echelleJoueur,
        oeil.z + Math.cos(a) * r,
      );
      this.group.position.lerp(this.cible, Math.min(1, dt * 3.2));
      this.corps.scale.setScalar(0.42 * echelleJoueur);
      this.corps.rotation.y += dt * 1.4;
      // Il se redresse en une demi-seconde après l'éveil, sans à-coup.
      this.corps.rotation.z = Math.max(0, 1 - this.temps / EVEIL) * 0.9;
      for (const m of this.materiaux) syncInkUniforms(m);
      return;
    }

    if (this.temps < BOND) {
      // LE BOND. Il monte vite, en tournant sur lui-même.
      const t = this.temps / BOND;
      // Il part d'où il était — dans les airs, à côté du joueur — et non du
      // socle : il vous quitte, il ne surgit pas de nulle part.
      this.group.position.y += doux(t) * 4.5 * echelleJoueur * dt * 6;
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
      // Il part VITE et ralentit : le coup est donné au début, comme une main
      // qui frappe la surface puis accompagne. Un arc à vitesse constante se
      // lisait comme un déplacement.
      const e = 1 - Math.pow(1 - t, 2.6);
      const rayon = 30 * echelleJoueur * Math.sin(e * Math.PI);
      const angle = e * Math.PI * 1.9;
      this.group.position.set(
        this.socle.x + Math.sin(angle) * rayon,
        this.socle.y + 5.5 + Math.sin(t * Math.PI * 2) * 4.5 * echelleJoueur,
        this.socle.z + Math.cos(angle) * rayon,
      );
      // Il pique dans le sens de sa course : la touffe la première.
      this.corps.rotation.z = 0.5 + Math.sin(e * Math.PI * 3) * 0.55;
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
