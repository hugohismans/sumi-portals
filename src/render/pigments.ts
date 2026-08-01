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

const CLE = 'sumi.pigments';
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
const DUREE = 1.1;

interface Chantier {
  materiaux: THREE.ShaderMaterial[];
  avancement: number;
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
      this.chantiers.push({ materiaux, avancement: 0 });
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

  update(dt: number): void {
    if (this.chantiers.length === 0) return;
    for (const c of this.chantiers) {
      c.avancement = Math.min(1, c.avancement + dt / DUREE);
      // Départ franc, fin douce : 1 − (1 − t)³. L'encre prend d'un coup, puis
      // s'étale. L'inverse — hésiter puis remplir — se lisait comme une jauge.
      const t = 1 - Math.pow(1 - c.avancement, 3);
      for (const m of c.materiaux) {
        if (m.uniforms.uCouleur) m.uniforms.uCouleur.value = t;
      }
    }
    this.chantiers = this.chantiers.filter((c) => c.avancement < 1);
  }
}
