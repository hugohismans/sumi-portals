/**
 * QUI EST ENCORE LÀ — et pourquoi ça ne se juge pas sur l'heure des autres.
 *
 * Chaque joueur publie sa fiche dix fois par seconde, avec un horodatage. Il
 * faut bien décider quand une fiche est celle d'un fantôme : quelqu'un dont
 * l'onglet a été tué sans que le serveur ait eu le temps de l'effacer.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE DÉFAUT QUI A COÛTÉ UNE PARTIE À DEUX
 *
 * On écrivait : `Date.now() - fiche.t > 20 secondes, donc parti`.
 *
 * Sauf que `Date.now()` est MA montre et que `fiche.t` a été écrit avec LA
 * SIENNE. Deux machines dont les horloges ne sont pas d'accord — ce qui est le
 * cas ordinaire, pas l'exception — se jugent l'une l'autre à travers cet écart.
 *
 * Et l'effet est ASYMÉTRIQUE, ce qui le rend très difficile à comprendre en
 * jouant. Si sa montre retarde de trente secondes sur la mienne :
 *
 *   - moi je calcule `maintenant − son_t` = +30 s → je le crois parti ;
 *   - lui calcule `son_maintenant − mon_t` = −30 s → il me voit très bien.
 *
 * « Lui me voit, moi je ne le vois pas. » Exactement ce qui a été rapporté, et
 * rien dans le code ne ressemblait à un bug de réseau.
 *
 * LA RÈGLE : ON NE COMPARE JAMAIS DEUX HORLOGES.
 *
 * On ne lit l'horodatage d'autrui que pour savoir s'il a CHANGÉ — ce qui ne
 * demande aucune montre commune, seulement une égalité. Et l'on mesure
 * l'ancienneté sur sa propre montre, depuis l'instant où l'on a vu ce
 * changement. Une fiche qui bouge est vivante ; une fiche figée depuis vingt
 * secondes à MA montre est morte. Les deux joueurs concluent alors la même
 * chose, quel que soit leur désaccord sur l'heure qu'il est.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Au-delà, on considère le joueur parti même si sa fiche traîne encore. */
export const STALE_MS = 20_000;

interface Suivi {
  /** Le dernier horodatage vu chez lui. Comparé, jamais soustrait au nôtre. */
  marque: number;
  /** Quand on l'a vu changer, à NOTRE montre. C'est la seule qui décide. */
  quand: number;
}

export class Fraicheur {
  private readonly suivis = new Map<string, Suivi>();

  /**
   * Trie les fiches vues à cet instant et renvoie les identifiants encore
   * vivants. `maintenant` est passé plutôt que lu ici : c'est ce qui rend la
   * chose vérifiable sans attendre vingt secondes pour de vrai.
   */
  vivants(fiches: Map<string, number>, maintenant: number): Set<string> {
    const vivants = new Set<string>();
    for (const [id, marque] of fiches) {
      const suivi = this.suivis.get(id);
      if (!suivi || suivi.marque !== marque) {
        // Première vue, ou fiche qui a bougé : elle est vivante à cet instant.
        this.suivis.set(id, { marque, quand: maintenant });
        vivants.add(id);
        continue;
      }
      if (maintenant - suivi.quand <= STALE_MS) vivants.add(id);
    }
    // Ce qui a disparu du serveur n'a plus à être suivi : sans ce ménage, la
    // table grossirait d'un joueur à chaque passage, indéfiniment.
    for (const id of [...this.suivis.keys()]) {
      if (!fiches.has(id)) this.suivis.delete(id);
    }
    return vivants;
  }

  /** Tout oublier. Au départ du lobby, pour ne pas ramener d'ancien suivi. */
  effacer(): void {
    this.suivis.clear();
  }
}
