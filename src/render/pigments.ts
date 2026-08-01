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
 * LE RETOUR DE LA COULEUR NE SE FAIT PAS D'UN COUP. Une bascule instantanée
 * lirait comme un interrupteur ; ici la teinte monte en un peu plus de deux
 * secondes, avec une amorce lente — le temps qu'un pinceau mettrait à couvrir
 * une surface. C'est la seule chose qui distingue « on m'a rendu une couleur »
 * de « un réglage a changé ».
 */

const CLE = 'sumi.pigments';
const DUREE = 2.4;

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
      // Amorce lente puis remplissage franc : la couleur hésite, puis prend.
      const t = c.avancement * c.avancement * (3 - 2 * c.avancement);
      for (const m of c.materiaux) {
        if (m.uniforms.uCouleur) m.uniforms.uCouleur.value = t;
      }
    }
    this.chantiers = this.chantiers.filter((c) => c.avancement < 1);
  }
}
