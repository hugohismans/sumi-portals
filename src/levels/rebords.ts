import type { BoxDef } from '../core/types.js';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LES REBORDS INVISIBLES — la règle 6 du contrat, tenue là où elle ne l'était
 * pas : « le vide se protège par des balustrades plus hautes que son saut ».
 *
 * Signalé en jouant : « je me suis glitché hors du sol ». La chasse du 26 a
 * cherché le glitch pendant quarante millions d'images et n'a trouvé aucun
 * trou dans la physique qui y mène : on sortait du sol en marchant au bout
 * d'une dalle sans bord, tout simplement. Le rattrapage rendait la chute sans
 * conséquence ; il ne la rendait pas voulue.
 *
 * Quatre murs autour d'une dalle, juste au-dehors de son dessus — ils ne
 * mordent jamais sur ce qu'on foule — et `invisible` : ils arrêtent le corps,
 * la main et les pièces lancées, et ne se dessinent pas. Là où tomber n'a
 * jamais de sens, le bord du monde se sent sans se voir.
 *
 * `hauteur` se compte depuis le dessus de la dalle, et doit dépasser le saut
 * (1,29 × la taille) à la plus grande taille qu'on atteint sur cette dalle.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const rebordsInvisibles = (
  min: [number, number],
  max: [number, number],
  dessus: number,
  hauteur: number,
  region?: string,
  epaisseur = 1,
): BoxDef[] => {
  const [x0, z0] = min;
  const [x1, z1] = max;
  const bas = dessus - 1;
  const haut = dessus + hauteur;
  const e = epaisseur;
  const mur = (a: [number, number, number], b: [number, number, number]): BoxDef => ({
    min: a,
    max: b,
    ink: 0,
    invisible: true,
    ...(region !== undefined ? { region } : {}),
  });
  return [
    mur([x0 - e, bas, z0 - e], [x1 + e, haut, z0]),
    mur([x0 - e, bas, z1], [x1 + e, haut, z1 + e]),
    mur([x0 - e, bas, z0], [x0, haut, z1]),
    mur([x1, bas, z0], [x1 + e, haut, z1]),
  ];
};
