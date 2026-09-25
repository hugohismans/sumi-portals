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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'UN CHAPITRE RAPPORTE, ET CE QU'IL FAUT AVOIR POUR Y ENTRER.
 *
 * Signalé en jouant : « je suis arrivé à la montée sans débloquer le bleu ».
 * Le pinceau bleu dort dans le bol, la fin de la descente est dans la salle
 * d'après, et rien n'obligeait à le réveiller : on finissait le chapitre les
 * mains vides, le hall le marquait fini, et la montée — dont l'atelier du
 * haut demande des tuiles bleues — devenait infinissable.
 *
 * Un chapitre n'est donc fini QU'AVEC sa couleur, et l'on sait quelles
 * couleurs il faut pour qu'un chapitre soit jouable jusqu'au bout.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const RAPPORTE: Partial<Record<Chapitre, readonly string[]>> = {
  monde: ['vert', 'rouge'],
  descente: ['bleu'],
  montee: ['or'],
};
/** Les couleurs sans lesquelles un chapitre ne peut pas s'achever. */
export const EXIGE: Partial<Record<Chapitre, readonly string[]>> = {
  // L'atelier de lavis veut ses claies en rouge.
  descente: ['rouge'],
  // L'atelier du haut veut ses pots en rouge et ses tuiles en bleu.
  montee: ['rouge', 'bleu'],
};
/** Où l'on va chercher chaque couleur. */
export const OU_DORT: Record<string, { chapitre: Chapitre; phrase: string }> = {
  vert: { chapitre: 'monde', phrase: 'Il dort au sommet du tas de feuilles, dans le jardin du monde.' },
  rouge: { chapitre: 'monde', phrase: 'Il dort sur le chantier des potiers, dans le monde.' },
  bleu: { chapitre: 'descente', phrase: 'Il dort au fond de la descente, dans le bol, devant la dernière porte.' },
  or: { chapitre: 'montee', phrase: 'Il dort au bout de la vallée, dans la montée.' },
};

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
  static prochain(acquis: readonly string[] = []): Chapitre {
    return CHAPITRES.find((c) => !Voyage.estFini(c, acquis)) ?? 'monde';
  }

  /** Vrai quand les cinq chapitres ont été finis au moins une fois. */
  static acheve(acquis: readonly string[] = []): boolean {
    return CHAPITRES.every((c) => Voyage.estFini(c, acquis));
  }

  /**
   * Un chapitre est fini s'il a été mené au bout ET qu'on en a rapporté la
   * couleur. Une partie d'avant ce correctif pouvait avoir « fini » la
   * descente sans le bleu : on l'y renvoie au lieu de la laisser bloquée plus
   * loin.
   */
  static estFini(c: Chapitre, acquis: readonly string[]): boolean {
    if (!Voyage.finis().has(c)) return false;
    return (RAPPORTE[c] ?? []).every((p) => acquis.includes(p));
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
