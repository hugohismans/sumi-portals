/**
 * L'APPARIEMENT À DEUX, SANS SERVEUR ET SANS NÉGOCIATION.
 *
 * Le problème habituel : deux clients veulent se mettre d'accord sur « qui joue
 * avec qui », personne ne fait autorité, et tout le monde écrit en même temps.
 * On finit par écrire un verrou distribué, et un verrou distribué mal fait est
 * pire que pas de verrou du tout.
 *
 * L'astuce : **ne pas se mettre d'accord.** Chaque client voit la même liste
 * d'attente, applique la même règle, et trouve donc le même résultat tout seul.
 * Aucun message échangé, aucune course, rien à verrouiller. Si les deux joueurs
 * voient la même chose, ils concluent la même chose.
 *
 * LA RÈGLE : on trie par ordre d'arrivée, et l'on apparie deux par deux.
 *
 * Le tri se fait par ANCIENNETÉ, pas par identifiant, et c'est le point
 * important. Trier par identifiant paraît plus simple, mais un nouveau venu
 * dont l'identifiant est « petit » se glisserait au début de la file et
 * DÉFERAIT une paire déjà formée derrière lui. Trié par ancienneté, un nouveau
 * venu arrive toujours en queue : les paires déjà formées ne bougent jamais.
 *
 * Ce fichier ne connaît ni Firebase ni le réseau — c'est ce qui permet de le
 * vérifier entièrement sous Node, dans npm run check.
 */

export interface Attendant {
  uid: string;
  /** Horodatage de l'entrée dans la file, en millisecondes. */
  depuis: number;
}

/**
 * Nom du salon d'une paire. Trié, donc identique quel que soit le joueur qui
 * le calcule — c'est ce qui fait que les deux se retrouvent au même endroit.
 */
export const nomDeSalon = (a: string, b: string): string =>
  a < b ? `${a}~${b}` : `${b}~${a}`;

/** Les paires formées, dans l'ordre. Les impairs restent en file. */
export const apparier = (attendants: Attendant[]): [string, string][] => {
  const file = [...attendants].sort(
    (x, y) => x.depuis - y.depuis || (x.uid < y.uid ? -1 : x.uid > y.uid ? 1 : 0),
  );
  const paires: [string, string][] = [];
  for (let i = 0; i + 1 < file.length; i += 2) {
    paires.push([file[i].uid, file[i + 1].uid]);
  }
  return paires;
};

/**
 * Le salon d'un joueur donné, ou `null` s'il attend encore.
 * C'est la seule fonction que le reste du programme appelle.
 */
export const salonDe = (uid: string, attendants: Attendant[]): string | null => {
  for (const [a, b] of apparier(attendants)) {
    if (a === uid || b === uid) return nomDeSalon(a, b);
  }
  return null;
};

/** L'autre joueur de mon salon, si j'en ai un. */
export const partenaireDe = (uid: string, attendants: Attendant[]): string | null => {
  for (const [a, b] of apparier(attendants)) {
    if (a === uid) return b;
    if (b === uid) return a;
  }
  return null;
};
