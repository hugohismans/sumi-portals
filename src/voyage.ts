/**
 * LA MÉMOIRE DU VOYAGE.
 *
 * Le hall n'a qu'une arche pour l'aventure, et elle menait toujours au monde.
 * Tant que le jeu n'avait qu'un chapitre, c'était juste. Il en a cinq — le
 * monde, la descente, la montée, la mesure, la boîte à formes — enchaînés par
 * le lien du panneau de fin. Mais ce lien n'existe que dans l'onglet où l'on
 * vient de finir : on ferme, on revient le lendemain, on franchit l'arche…
 * et l'on est de retour au monde, tout gris, comme si rien n'avait eu lieu.
 *
 * Ce module se souvient des chapitres finis, et l'arche reprend au premier
 * qu'on n'a pas fini. Quand tout est fini, on repart du monde : c'est là
 * qu'est le sacre, et c'est là que rejouer a un sens.
 *
 * Comme pour les couleurs (`src/render/pigments.ts`), le mode débug écrit
 * dans sa propre case : les séances de test ne doivent pas faire croire à un
 * joueur qu'il a fini ce qu'il n'a pas joué.
 */
const CLE_JEU = 'sumi.voyage';
const CLE_DEBUG = 'sumi.voyage.debug';
const CLE = new URLSearchParams(location.search).get('debug') ? CLE_DEBUG : CLE_JEU;

/** Les chapitres de l'aventure, dans l'ordre où on les joue. */
export const CHAPITRES = ['monde', 'descente', 'montee', 'mesure', 'formes'] as const;
export type Chapitre = (typeof CHAPITRES)[number];

const estChapitre = (mode: string): mode is Chapitre => (CHAPITRES as readonly string[]).includes(mode);

export class Voyage {
  /** Les chapitres finis, d'une partie à l'autre. */
  static finis(): Set<Chapitre> {
    try {
      const brut = localStorage.getItem(CLE);
      const liste = brut ? (JSON.parse(brut) as unknown) : [];
      return new Set(Array.isArray(liste) ? liste.map(String).filter(estChapitre) : []);
    } catch {
      // Navigation privée, quota plein, stockage refusé : on joue sans
      // mémoire plutôt que de ne pas jouer du tout.
      return new Set();
    }
  }

  /** Un chapitre vient d'être fini. Les modes qui n'en sont pas sont ignorés. */
  static finir(mode: string): void {
    if (!estChapitre(mode)) return;
    const finis = Voyage.finis();
    finis.add(mode);
    try {
      localStorage.setItem(CLE, JSON.stringify([...finis]));
    } catch {
      /* sans mémoire, le lien de fin suffit pour cette séance */
    }
  }

  /**
   * Le chapitre où l'arche mène : le premier qu'on n'a pas fini. Tout fini,
   * on repart du monde — et y entrer efface tout (voir main.ts), donc
   * l'aventure se rejoue entière, pas en boucle sur sa dernière salle.
   */
  static prochain(): Chapitre {
    const finis = Voyage.finis();
    return CHAPITRES.find((c) => !finis.has(c)) ?? 'monde';
  }

  /** Vrai quand les cinq chapitres ont été finis au moins une fois. */
  static acheve(): boolean {
    const finis = Voyage.finis();
    return CHAPITRES.every((c) => finis.has(c));
  }

  /** Tout oublier. Pour revoir le début du jeu tel qu'il est vraiment. */
  static effacer(): void {
    try {
      localStorage.removeItem(CLE);
    } catch {
      /* rien à faire */
    }
  }
}
