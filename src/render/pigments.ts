import type * as THREE from 'three';

/**
 * LE MONDE COMMENCE EN LAVIS, ET L'ON VA CHERCHER SES COULEURS.
 *
 * Au départ tout est gris — pas noir, pas éteint : un lavis d'encre, où les
 * valeurs sont là mais où la couleur manque. Chaque monde visité en rend une,
 * et le monde central se repeint par morceaux.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI ÇA NE COÛTE PRESQUE RIEN
 *
 * Parce que la palette de chaque région était DÉJÀ un uniforme de shader, et
 * que le décor était DÉJÀ découpé par région pour cette raison. Griser, c'est
 * mélanger chaque teinte vers sa propre luminance ; rendre la couleur, c'est
 * défaire ce mélange. Pas un décor à refaire, pas une texture à doubler, pas
 * un dessin en double exemplaire.
 *
 * On désature vers la LUMINANCE et non vers une moyenne des canaux : un gris
 * moyen aplatirait tout au même ton, alors que la luminance garde la hiérarchie
 * du clair et du sombre. Le dessin reste entièrement lisible — il lui manque
 * seulement la couleur, ce qui est exactement le sujet.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LE RETOUR DE LA COULEUR CLAQUE, mais ne bascule pas. Une bascule instantanée
 * se lirait comme un interrupteur ; une montée lente se lisait comme une jauge,
 * ce qui était le défaut de la première version. Ici l'encre PREND d'un coup
 * puis s'étale — voir DUREE et sa courbe.
 */

/**
 * OÙ L'ON RANGE LES COULEURS RAPPORTÉES.
 *
 * Deux clés, et la seconde n'est pas un luxe. Les repères de mise au point
 * écrivent l'état des pigments avant de recharger — c'est ce qui leur permet de
 * rebâtir le monde exactement comme une vraie partie l'aurait bâti. Tant qu'ils
 * écrivaient dans la clé du jeu, ils ÉCRASAIENT la partie en cours : on faisait
 * trois sauts de vérification, on rouvrait le jeu pour de bon, et le village
 * était déjà rouge sans qu'on ait rien fait. Un outil de mise au point qui abîme
 * ce qu'il sert à vérifier est pire qu'inutile.
 */
const CLE_JEU = 'sumi.pigments';
const CLE_DEBUG = 'sumi.pigments.debug';
const CLE = new URLSearchParams(location.search).get('debug') ? CLE_DEBUG : CLE_JEU;

/** La clé en usage. Les repères en ont besoin pour écrire au bon endroit. */
export const clePigments = (): string => CLE;
/**
 * DURÉE DU RETOUR D'UNE COULEUR.
 *
 * Elle valait 2,4 secondes, avec une courbe douce aux deux bouts. C'était joli
 * et ça ne claquait pas : la teinte montait si progressivement qu'on ne pouvait
 * pas dire à quel instant elle était arrivée, et le geste du pinceau qui la
 * portait ne se raccrochait à rien.
 *
 * 1,1 seconde, et surtout une courbe qui DÉMARRE FORT et finit en douceur. Les
 * trois quarts de la couleur arrivent dans le premier tiers du temps — comme
 * de l'encre qui prend d'un coup et s'étale ensuite. C'est ce départ franc
 * qu'on lit comme un coup de pinceau, et non comme un réglage qui monte.
 */
const DUREE = 2.4;

interface Chantier {
  materiaux: THREE.ShaderMaterial[];
  avancement: number;
  /**
   * Jusqu'où l'encre doit aller pour avoir tout couvert.
   *
   * Calculé depuis la boîte de la région et le point de départ : c'est la
   * distance au coin le plus éloigné. En deçà, il resterait un morceau gris
   * quand le chantier se termine, et l'on verrait la couleur y apparaître d'un
   * coup à la dernière image — exactement le défaut qu'on cherche à supprimer.
   */
  portee: number;
}

export class Pigments {
  /** Régions actuellement en train de se repeindre. */
  private chantiers: Chantier[] = [];
  private readonly acquis: Set<string>;

  constructor() {
    this.acquis = new Set(Pigments.lire());
  }

  /** Les pigments déjà rapportés, d'une partie à l'autre. */
  static lire(): string[] {
    try {
      const brut = localStorage.getItem(CLE);
      return brut ? (JSON.parse(brut) as string[]) : [];
    } catch {
      // Navigation privée, quota plein, stockage refusé : on joue sans
      // mémoire plutôt que de ne pas jouer du tout.
      return [];
    }
  }

  a(pigment: string): boolean {
    return this.acquis.has(pigment);
  }

  get nombre(): number {
    return this.acquis.size;
  }

  /**
   * Pose l'état de départ : gris pour les régions dont le pigment manque,
   * couleur pleine pour les autres.
   *
   * Les régions qui ne réclament aucun pigment ne sont jamais grisées — les
   * mondes où l'on VA chercher les couleurs les ont, forcément, sinon il n'y
   * aurait rien à y prendre.
   */
  appliquer(parRegion: Map<string, THREE.ShaderMaterial[]>, pigmentDe: Map<string, string>): void {
    for (const [region, materiaux] of parRegion) {
      const pigment = pigmentDe.get(region);
      const peint = pigment === undefined || this.acquis.has(pigment);
      for (const m of materiaux) {
        if (m.uniforms.uCouleur) m.uniforms.uCouleur.value = peint ? 1 : 0;
        // Pas de front au chargement : une région est peinte ou elle ne l'est
        // pas. Le front n'existe que pendant le geste qui la peint.
        if (m.uniforms.uRayon) m.uniforms.uRayon.value = 0;
      }
    }
  }

  /**
   * On rapporte un pigment : les régions qui l'attendaient se repeignent.
   * Renvoie `false` si on l'avait déjà, pour ne pas rejouer la fête.
   */
  rendre(
    pigment: string,
    parRegion: Map<string, THREE.ShaderMaterial[]>,
    pigmentDe: Map<string, string>,
    /** D'où part l'encre : la position du pinceau à l'instant du geste. */
    depart?: THREE.Vector3,
    /** Boîte de chaque région, pour savoir jusqu'où le front doit aller. */
    bornes?: Map<string, { min: [number, number, number]; max: [number, number, number] }>,
  ): boolean {
    if (this.acquis.has(pigment)) return false;
    this.acquis.add(pigment);
    try {
      localStorage.setItem(CLE, JSON.stringify([...this.acquis]));
    } catch {
      /* sans mémoire, mais la partie en cours se repeint quand même */
    }

    for (const [region, materiaux] of parRegion) {
      if (pigmentDe.get(region) !== pigment) continue;
      const b = bornes?.get(region);
      let portee = 900;
      if (b && depart) {
        // La distance au coin le plus éloigné de la boîte. On la prend sur les
        // huit coins plutôt qu'au centre : une région longue et basse comme les
        // hauteurs du monde a un centre tout proche et un bout à quatre cents
        // mètres, et c'est ce bout-là qui décide de la durée du geste.
        portee = 0;
        for (let i = 0; i < 8; i++) {
          const x = i & 1 ? b.max[0] : b.min[0];
          const y = i & 2 ? b.max[1] : b.min[1];
          const z = i & 4 ? b.max[2] : b.min[2];
          portee = Math.max(portee, Math.hypot(x - depart.x, y - depart.y, z - depart.z));
        }
        portee *= 1.14; // de quoi absorber la frange bruitée du front
      }
      for (const m of materiaux) {
        if (m.uniforms.uCentre && depart) m.uniforms.uCentre.value.copy(depart);
        if (m.uniforms.uRayon) m.uniforms.uRayon.value = 0;
        if (m.uniforms.uCouleur) m.uniforms.uCouleur.value = 0;
      }
      this.chantiers.push({ materiaux, avancement: 0, portee });
    }
    return true;
  }

  /** Tout oublier. Pour revoir le début du jeu tel qu'il est vraiment. */
  effacer(): void {
    this.acquis.clear();
    try {
      localStorage.removeItem(CLE);
    } catch {
      /* rien à faire */
    }
  }

  /**
   * `pinceau` : où il se trouve à cette image. Le front part de lui et le suit,
   * ce qui est toute la différence entre voir une couleur apparaître et voir
   * quelqu'un la poser.
   */
  update(dt: number, pinceau?: THREE.Vector3): void {
    if (this.chantiers.length === 0) return;
    for (const c of this.chantiers) {
      c.avancement = Math.min(1, c.avancement + dt / DUREE);
      // Départ franc, fin douce : 1 − (1 − t)³. L'encre prend d'un coup puis
      // s'épuise, comme un lavis qui rencontre la fibre. L'inverse — hésiter
      // puis remplir — se lisait comme une jauge qui se remplit.
      const t = 1 - Math.pow(1 - c.avancement, 3);
      const fini = c.avancement >= 1;
      for (const m of c.materiaux) {
        if (pinceau && m.uniforms.uCentre) m.uniforms.uCentre.value.copy(pinceau);
        if (m.uniforms.uRayon) m.uniforms.uRayon.value = fini ? 0 : c.portee * t;
        // La teinte pleine n'est posée qu'à la toute fin, et d'un coup : tant
        // que le front court, c'est LUI qui décide de ce qui est peint. Les
        // faire monter ensemble redonnerait la jauge d'avant, par-dessous.
        if (m.uniforms.uCouleur) m.uniforms.uCouleur.value = fini ? 1 : 0;
      }
    }
    this.chantiers = this.chantiers.filter((c) => c.avancement < 1);
  }
}
