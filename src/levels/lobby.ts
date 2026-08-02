import type { BoxDef, LevelDef } from '../core/types.js';

/**
 * LE HALL — un lieu d'expérience, pas un couloir.
 *
 * C'est la première chose qu'on voit du jeu, et le seul endroit où plusieurs
 * joueurs se croisent. Il n'a rien à gagner, rien à finir, aucun score : c'est
 * un BAC À SABLE, et tout ce qui suit découle de cette phrase-là.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ON APPREND ICI, ET DANS QUEL ORDRE ON LE RENCONTRE
 *
 *   1. On appuie, et quelque chose répond.   → le levier de rappel, planté
 *      droit devant le point d'arrivée, entre le joueur et les trois arches.
 *   2. LA TAILLE EST DANS LA MAIN.           → le chevalet, à vingt pas sur la
 *      gauche, et ses deux premiers stylos posés côte à côte : le même geste,
 *      deux traits, parce que les deux pointes n'ont pas la même taille.
 *   3. On prend, on lance, on repose.        → le bac aux galets.
 *   4. Il y a des choses trop lourdes.       → le bloc de 1,70, dans le même
 *      bac, qui refuse et dit ainsi « grandis ».
 *   5. Deux portes changent la taille.       → le torii vermillon et la porte
 *      indigo, déjà là, au milieu de tout, avec un stylo posé contre chacune.
 *   6. Ce qu'on porte change avec soi.       → l'établi, au sud : deux billes
 *      identiques, deux creux de tailles différentes.
 *   7. On peut aussi devenir minuscule.      → la perle, le creux menu et la
 *      maisonnette scellée, à l'est.
 *   8. On choisit par où l'on part.          → les trois arches, au nord.
 *
 * Aucun de ces huit points n'est écrit nulle part. Le niveau ne déclare plus
 * un seul `hints` : ils disaient en toutes lettres ce que la géométrie dit
 * déjà (« l'une te fera grand, l'autre te fera petit »), et ce jeu n'explique
 * jamais rien. Une taille, un creux vide de la bonne dimension, un objet posé
 * là où il faut — c'est tout le vocabulaire, et il suffit.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LE CHEVALET EST LE CŒUR DU HALL, et c'est la seule chose du jeu qui met sa
 * thèse dans la main du joueur au lieu de la lui montrer. Tout le reste de ce
 * fichier lui est subordonné : la place des stylos, l'orientation de la toile,
 * la distance à laquelle on la voit en arrivant. Voir `chevalet()`.
 *
 * LE LEVIER DE RAPPEL EST CE QUI AUTORISE TOUT LE RESTE. Un logement ordinaire
 * verrouille pour de bon, ce qui est la bonne règle partout ailleurs — mais
 * dans un lieu où il n'y a rien à gagner, elle transformerait le terrain de jeu
 * en salle qu'on peut abîmer. On le plante donc BIEN EN VUE, sur le chemin que
 * tout le monde prend, et l'on peut essayer n'importe quoi.
 *
 * Les deux faces du grand portail sont volontairement DÉCALÉES et ne se
 * regardent pas : face à face, elles se refléteraient l'une l'autre à l'infini,
 * ce qui est spectaculaire mais coûteux, et surtout on traverserait l'une en
 * voulant atteindre l'autre.
 */

const box = (
  min: [number, number, number],
  max: [number, number, number],
  ink = 0,
  opts: { ghost?: boolean; outline?: boolean } = {},
): BoxDef => ({ min, max, ink, ...opts });

const FAR = 70;

/**
 * Repères de taille. Sans eux, changer d'échelle ne se verrait pas.
 *
 * ATTENTION, CE SONT LES OCCUPANTS LES PLUS ENCOMBRANTS DU HALL. Le plus haut
 * (19,20 m) fait DOUZE MÈTRES de base, et ils sont plantés partout entre
 * z = −14 et z = 24. Leurs emprises réelles, calculées une fois pour toutes
 * pour n'avoir plus jamais à les redéduire (w = max(0,6 ; h × 0,32)) :
 *
 *   ( −20, 16) x −20,6…−19,4   z  15,4…16,6
 *   ( −14, 18) x −14,6…−13,4   z  17,4…18,6
 *   (  −8, 20) x  −8,8…−7,2    z  19,2…20,8
 *   (   0, 22) x  −1,5… 1,5    z  20,5…23,5
 *   (   8, 20) x   4,9…11,1    z  16,9…23,1
 *   (  16, 17) x   9,9…22,1    z  10,9…23,1   ← le géant
 *   ( −24,−14) x −25,0…−23,0   z −15,0…−13,0
 *   (  22,−12) x  20,1…23,9    z −13,9…−10,1
 *   (  26,  8) x  22,2…29,8    z   4,2…11,8
 *   ( −28,  4) x −28,6…−27,4   z   3,4… 4,6
 *
 * Un logement a déjà été enterré dans l'un d'eux sans que personne le voie ;
 * c'est `npm run check` qui l'a dit, pas l'œil. Toute construction nouvelle se
 * confronte à cette table AVANT d'être écrite.
 */
const markers = (): BoxDef[] => {
  const out: BoxDef[] = [];
  const spots: [number, number, number][] = [
    // x, z, hauteur — un escalier de repères, du pavé à la tour
    [-20, 16, 0.5],
    [-14, 18, 1.2],
    [-8, 20, 2.4],
    [0, 22, 4.8],
    [8, 20, 9.6],
    [16, 17, 19.2],
    [-24, -14, 3],
    [22, -12, 6],
    [26, 8, 12],
    [-28, 4, 1.8],
  ];
  for (const [x, z, h] of spots) {
    const w = Math.max(0.6, h * 0.32);
    out.push(box([x - w, -0.5, z - w], [x + w, h, z + w], 1 + ((h * 7) % 2 | 0)));
    out.push(box([x - w - 0.22, h - 0.08, z - w - 0.22], [x + w + 0.22, h + 0.3, z + w + 0.22], 2));
  }
  return out;
};

/**
 * Une arche : deux montants et un linteau, à l'échelle d'un humain.
 *
 * `cx` est le milieu du passage, `w` sa demi-largeur. La traverse basse est
 * volontairement DÉCALÉE en profondeur (t * 0,9 contre t) : deux faces
 * exactement dans le même plan se disputent la profondeur et grésillent.
 */
const arche = (cx: number, z: number, w: number, h: number, ink: number, t = 0.45): BoxDef[] => [
  box([cx - w - t, -0.4, z - t], [cx - w, h, z + t], ink),
  box([cx + w, -0.4, z - t], [cx + w + t, h, z + t], ink),
  box([cx - w - t * 2.4, h, z - t * 1.3], [cx + w + t * 2.4, h + t * 1.2, z + t * 1.3], ink),
  // La traverse basse rentre de 4 cm dans les montants au lieu d'affleurer :
  // à l'identique, ses joues gauche et droite se confondaient avec les leurs.
  box([cx - w - t + 0.04, h * 0.82, z - t * 0.9], [cx + w + t - 0.04, h * 0.82 + t * 0.45, z + t * 0.9], 2),
];

/**
 * LES TROIS SORTIES DU HALL.
 *
 * Elles ne portent aucune inscription, et c'est délibéré : **elles se
 * distinguent par leur forme.** Une seule ouverture pour partir seul, deux
 * ouvertures jumelles pour partir à deux, une arche de guingois pour le rêve.
 * On comprend laquelle mène où avant d'avoir lu quoi que ce soit — comme on
 * comprend la règle des portails en regardant un inconnu rapetisser.
 *
 * Les pavés au sol répètent le même signe : un devant la première, deux côte à
 * côte devant la deuxième, une poignée dispersée devant la troisième.
 */
const SEUIL_Z = -24;
// Le solo est AU MILIEU, face au point d'arrivée. C'est l'arche qu'on franchit
// sans réfléchir, en marchant droit devant — et c'est la seule qui fonctionne
// toujours. Mettre le duo là aurait laissé un joueur seul attendre dans le vide
// pour n'avoir fait que marcher tout droit.
export const ARCHE_SOLO_X = 0;
export const ARCHE_DUO_X = -27;
export const ARCHE_REVE_X = 27;

const arches = (): BoxDef[] => {
  const out: BoxDef[] = [];

  // Seul — une porte franche, sans ornement. La plus simple des trois.
  out.push(...arche(ARCHE_SOLO_X, SEUIL_Z, 2.6, 5.0, 3));
  out.push(box([ARCHE_SOLO_X - 1.1, -0.35, -19.2], [ARCHE_SOLO_X + 1.1, 0.16, -17.4], 2));

  // À deux — deux passages jumeaux sous un même linteau. Le montant du milieu
  // est mince : on voit à travers, on comprend qu'il en faut deux.
  out.push(...arche(ARCHE_DUO_X - 2.9, SEUIL_Z, 2.1, 5.4, 3));
  out.push(...arche(ARCHE_DUO_X + 2.9, SEUIL_Z, 2.1, 5.4, 3));
  // Linteau commun, posé PAR-DESSUS les deux. Il mord de 20 cm en largeur, et
  // surtout il DESCEND de 10 cm dans les deux arches (5,3 au lieu de 5,4) :
  // posé pile sur leur sommet, sa face inférieure se confondait avec la leur.
  out.push(box([ARCHE_DUO_X - 6.0, 5.3, SEUIL_Z - 0.75], [ARCHE_DUO_X + 6.0, 6.1, SEUIL_Z + 0.75], 2));
  out.push(box([ARCHE_DUO_X - 2.6, -0.35, -19.2], [ARCHE_DUO_X - 0.5, 0.16, -17.4], 2));
  out.push(box([ARCHE_DUO_X + 0.5, -0.35, -19.2], [ARCHE_DUO_X + 2.6, 0.16, -17.4], 2));

  // Rêve — de guingois. Montants de hauteurs inégales, linteau qui ne repose
  // pas d'aplomb, un fragment qui flotte au-dessus sans rien toucher. Rien
  // n'est cassé : c'est dessiné comme ça.
  const rx = ARCHE_REVE_X;
  out.push(box([rx - 3.05, -0.4, SEUIL_Z - 0.45], [rx - 2.6, 5.6, SEUIL_Z + 0.45], 3));
  out.push(box([rx + 2.6, -0.4, SEUIL_Z - 0.6], [rx + 3.05, 4.3, SEUIL_Z + 0.3], 3));
  out.push(box([rx - 3.5, 4.9, SEUIL_Z - 0.7], [rx + 2.2, 5.5, SEUIL_Z + 0.2], 2));
  out.push(box([rx + 1.4, 5.9, SEUIL_Z - 0.2], [rx + 3.6, 6.4, SEUIL_Z + 0.7], 3, { ghost: true }));
  for (const [dx, dz] of [[-1.9, -1.4], [0.3, -2.2], [1.8, -0.6], [-0.6, 0.4]] as const) {
    out.push(box([rx + dx - 0.5, -0.35, -18.4 + dz], [rx + dx + 0.5, 0.13, -17.5 + dz], 2));
  }

  return out;
};

/**
 * L'ESTRADE, LES DEUX DALLES, ET LE LEVIER.
 *
 * ─── L'estrade ───────────────────────────────────────────────────────────
 * Elle ne fait que 22 cm de haut, et ce nombre est calculé : l'enjambée vaut
 * la moitié de sa taille, donc 22,5 cm à ×1/4. Un joueur minuscule monte donc
 * dessus, de justesse mais toujours. À un centimètre de plus, l'estrade serait
 * devenue une falaise pour un quart des tailles du jeu, et le point de
 * rendez-vous du hall aurait été interdit à ceux qui viennent de rapetisser.
 *
 * ─── Les deux dalles ─────────────────────────────────────────────────────
 * Elles sont posées dessus, à 2,60 l'une de l'autre, et elles ne se
 * ressemblent pas tout à fait : l'une porte un trait, l'autre deux. C'est le
 * dessin EXACT des dalles de la clairière (`src/levels/duo.ts`), où se joue la
 * seule fin de partie qu'une personne seule ne peut pas déclencher.
 *
 * Ici elles ne déclenchent rien — le hall ne sait pas encore lire deux
 * présences. Elles ne PROMETTENT rien non plus, et c'est la seule chose qui
 * compte : ce sont deux pierres, on monte dessus, on se fait face. Un solitaire
 * n'a rien devant quoi rester planté en se demandant si c'est cassé. Le jour où
 * le moteur saura dire « deux joueurs, même taille, une dalle chacun », il n'y
 * aura pas une boîte à déplacer.
 *
 * ─── Le levier ───────────────────────────────────────────────────────────
 * Il est à (0 ; −3), c'est-à-dire DROIT DEVANT le point d'arrivée, entre le
 * joueur et les trois arches. Tout le monde passe dessus en marchant vers le
 * nord ; c'est donc le premier bouton du jeu, et il n'a rien à casser puisqu'au
 * premier appui il n'y a rien à remettre en place.
 *
 * Son rayon vaut 1,60 et pas davantage, pour une raison qui n'est pas
 * esthétique : **le rappel est testé AVANT les caisses et il rend la main.**
 * Un joueur qui appuie sur E dans la bulle du levier ne repose pas ce qu'il
 * porte — il rappelle tout. La bulle doit donc éviter les dalles (leur bord le
 * plus proche est à 2,15 m) et rester loin de tout ce qu'on manipule.
 */
const PLACE = (): BoxDef[] => [
  // L'estrade et son liseré. Le liseré s'arrête 12 cm SOUS le dessus de
  // l'estrade au lieu d'affleurer : deux dessus dans le même plan se disputent
  // la profondeur et grésillent.
  box([-4.6, -0.4, -1.4], [4.6, 0.22, 1.4], 1),
  box([-5.1, -0.4, -1.9], [5.1, 0.1, 1.9], 2),

  // Dalle « un trait ».
  box([-2.15, 0.22, -0.9], [-0.45, 0.38, 0.9], 3),
  box([-1.75, 0.38, -0.45], [-0.85, 0.44, 0.45], 2),
  // Dalle « deux traits ».
  box([0.45, 0.22, -0.9], [2.15, 0.38, 0.9], 3),
  box([0.85, 0.38, -0.5], [1.75, 0.44, -0.12], 2),
  box([0.85, 0.38, 0.12], [1.75, 0.44, 0.5], 2),

  // Le levier : un socle, un fût, un bras qui penche, un contrepoids. Le bras
  // est fait de deux marches parce qu'on ne dispose que de boîtes droites — et
  // deux marches suffisent à dire « ça pivote », ce qu'un fût seul ne dit pas.
  box([-0.9, -0.4, -3.9], [0.9, 0.12, -2.1], 1),
  box([-0.13, 0.12, -3.13], [0.13, 1.52, -2.87], 2),
  box([0.13, 1.16, -3.1], [0.62, 1.3, -2.9], 3),
  box([0.55, 1.28, -3.12], [1.02, 1.44, -2.88], 3),
  box([0.92, 1.34, -3.2], [1.28, 1.7, -2.8], 2),
];

/**
 * LE BAC AUX GALETS — le premier objet qu'on touche.
 *
 * À sept mètres du point d'arrivée, sur la droite, une dalle basse avec quatre
 * pierres dessus. Il n'y a pas de creux à côté, pas de cible, rien à réussir :
 * on prend, on lance (clic), on repose. C'est ce qui manquait le plus au hall —
 * un objet à portée de main dans les dix premières secondes.
 *
 * LES QUATRE TAILLES SONT UNE LEÇON, ET LA DERNIÈRE EST UN REFUS.
 * On soulève au plus 0,55 × sa propre taille, soit 0,99 m à taille normale.
 *
 *   0,22  le seul que porte un joueur minuscule (sa limite est 0,2475)
 *   0,50  un galet ordinaire
 *   0,90  lourd, mais ça passe encore — on sent la limite approcher
 *   1,70  REFUSÉ à ×1. Il faut mesurer 3,10 m pour le lever, donc grandir.
 *
 * Le quatrième est le plus utile des quatre : il enseigne « deviens plus grand »
 * en une seconde, sans un mot, et sa réponse est à vingt mètres de là.
 *
 * PAS DE REBORD, et ce n'est pas un oubli. Un rebord de 40 cm aurait enfermé
 * pour de bon un joueur à ×1/4 tombé dedans : il enjambe 0,225 et saute 0,323.
 * Une dalle plate ne piège personne, à aucune taille.
 */
const BAC_X = 9.6;
const BAC_Z = -1.0;
const bacAuxGalets = (): BoxDef[] => [
  box([BAC_X - 2.9, -0.4, BAC_Z - 2.9], [BAC_X + 2.9, 0.08, BAC_Z + 2.9], 2),
  box([BAC_X - 2.6, -0.4, BAC_Z - 2.6], [BAC_X + 2.6, 0.16, BAC_Z + 2.6], 1),
];

/**
 * LE CHEVALET — la thèse du jeu, mise dans la main.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI C'EST LÀ, ET POURQUOI C'EST GRAND
 *
 * Tout *Lavis* tient dans une phrase : le monde ne change pas, c'est vous qui
 * changez. Le hall la MONTRAIT — un plot hors d'atteinte, une fente trop basse,
 * un inconnu qui rapetisse. Une toile la FAIT FAIRE : on ramasse un stylo, on
 * appuie, et le trait qui sort a une épaisseur qu'on n'a pas choisie.
 *
 * Et surtout : les traits RESTENT. Un joueur de quarante-cinq centimètres et un
 * géant de sept mètres écrivent sur le même mur, et leurs deux écritures se
 * retrouvent côte à côte. C'est le seul objet du hall dont on peut lire
 * l'histoire — la sienne, et celle des autres.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ─── LA PLACE, ET LES DEGRÉS QU'IL A FALLU COMPTER ────────────────────────
 * On arrive en (0 ; 6) le regard tourné vers le nord. La toile est en
 * (−8,6 ; −13,5), face au sud : à vingt mètres, un peu à gauche, vue de face.
 * Les trois arches restent droit devant, la toise à droite. **La première image
 * du jeu est un grand mur blanc couvert de dessins d'inconnus, avec trois
 * portes derrière.** C'est ce qu'il faut dire d'un hall à plusieurs, et aucun
 * texte ne le dirait mieux.
 *
 * Elle était d'abord en x = −10,4, et LE TORII VERMILLON EN CACHAIT LA MOITIÉ.
 * Ce n'est pas une impression : depuis le point d'arrivée, la grande face
 * (plan x = −8, de z = −8,8 à z = −1,2, haute de 11,20) occupe la tranche
 * angulaire 28°–48° à gauche du nord. La toile, elle, s'étalait de 12° à 40° —
 * quarante-trois pour cent de sa surface tombaient derrière le portail.
 *
 * Ramenée à −8,6, elle court de 7° à 37° : il n'en reste caché que l'extrémité
 * ouest, et le recouvrement fait un tiers de ce qu'il était. On ne peut pas
 * faire mieux sans la coller devant l'arche du solo (qui tient ±6°) ou devant
 * celle du duo (40°–48°) : les trois seules bandes libres du champ visuel sont
 * étroites, et celle-ci est la plus large.
 *
 * ET CE QUI RESTE DERRIÈRE LE TORII EST UN GAIN. Un portail vermillon planté en
 * travers d'un grand mur blanc, c'est une invitation à faire trois pas de côté ;
 * une toile vue en entier depuis le point d'arrivée serait une affiche.
 *
 * ─── LES DEUX NOMBRES DE LA TOILE ─────────────────────────────────────────
 * 12,40 de large sur 7,20 de haut. La hauteur n'est pas un chiffre rond :
 * **c'est exactement la taille d'un joueur à ×4.** Le géant est donc la mesure
 * de la toile, un joueur normal en fait le quart, un joueur minuscule le
 * seizième — et cela se lit sur le mur sans qu'on ait rien à comparer.
 *
 * Le bord bas est à 0,25 pour dégager le tablier de pierre qui court devant.
 *
 * ─── QUI PEUT ATTEINDRE QUOI ──────────────────────────────────────────────
 * La portée du stylo vaut 4,5 fois sa propre taille (`core/canevas.ts`) :
 *
 *   ×1/4   2,03 m   →  il faut coller la toile, et l'on n'atteint que le bas
 *   ×1     8,10 m   →  on recule de six mètres et l'on couvre tout
 *   ×4    32,40 m   →  on peint depuis l'autre bout de la place
 *
 * Ce n'est pas une gêne, c'est LA composition du mur : le bas se couvre de
 * cheveux d'ange, le haut de barres. La stratification se fait toute seule, et
 * personne n'a eu à l'organiser.
 *
 * ─── LA GOMME ────────────────────────────────────────────────────────────
 * Une cuve sombre posée sur le tablier, au pied ouest de la toile. Sombre parce
 * que c'est la seule chose du hall qui DÉFAIT, et qu'elle doit se distinguer
 * d'un socle où l'on pose. Son rayon vaut 1,40 : assez pour qu'on l'atteigne
 * sans viser, assez peu pour qu'elle soit à trois mètres et demi du stylo le
 * plus proche.
 *
 * ATTENTION, ELLE EST TESTÉE AVANT TOUT LE RESTE. Un appui sur E dans sa bulle
 * n'attrape rien et ne repose rien : il efface. Aucun stylo, aucun creux et
 * aucun levier ne doit se trouver dedans.
 */
const TOILE_X = -8.6;
const TOILE_Z = -13.5;
const TOILE_L = 12.4;
const TOILE_H = 7.2;
/** Centre de la toile : bord bas à 0,25, donc centre à 0,25 + 3,60. */
const TOILE_Y = 3.85;

const chevalet = (): BoxDef[] => [
  // Le mur porteur, glissé DERRIÈRE le châssis que dessine le rendu (il déborde
  // de 3,5 % de la largeur, soit 43 cm ici). Sa face avant est à −13,90, donc
  // 4 cm dans le châssis : de quoi enterrer la face arrière du cadre au lieu de
  // la laisser se disputer un plan avec elle.
  //
  // Il existe pour une raison de jeu, pas de dessin : sans mur, la toile est un
  // plan qu'on TRAVERSE, et l'on se promène dans son propre dessin.
  box([-15.0, -0.4, -14.6], [-2.2, 8.1, -13.9], 1),
  // Les deux poteaux et la traverse : un châssis planté dans la place, pas un
  // panneau accroché à un bâtiment. Le hall n'a pas de bâtiment.
  //
  // Le poteau est s'arrête à x = −1,30 et pas plus loin : on marche du point
  // d'arrivée vers l'arche du solo en ligne droite le long de x = 0, et il faut
  // laisser passer un corps (0,68 de large) sans qu'il ait à contourner.
  box([-15.9, -0.4, -14.7], [-15.2, 8.1, -14.0], 2),
  box([-2.0, -0.4, -14.7], [-1.3, 8.1, -14.0], 2),
  box([-16.2, 8.1, -14.85], [-1.0, 8.7, -13.85], 1),

  // Le tablier : deux mètres quatre-vingts de pierre plate devant la toile,
  // où traînent les stylos. Seize centimètres de haut — un joueur à ×1/4
  // enjambe 22,5, donc il y monte ; personne ne s'y coince. Et rien de bas ne
  // le surplombe : voir l'avertissement sous `toise()`.
  box([-16.0, -0.4, -13.4], [-1.2, 0.16, -10.6], 1),

  // La cuve de la gomme, posée SUR le tablier (départ à 0,16 : sa face
  // inférieure est enterrée dedans plutôt que de flotter dans le même plan).
  box([-15.0, 0.16, -12.6], [-13.4, 0.34, -11.0], 1),
  box([-14.7, 0.34, -12.3], [-13.7, 0.44, -11.3], 2),
];

/**
 * LES SOCLES DES DEUX STYLOS DE VOYAGE, ET CELUI DE LA PERLE.
 *
 * Ils sont regroupés ici parce qu'ils obéissent tous les trois à la même règle,
 * et qu'elle est la plus utile de ce fichier :
 *
 *     UN OBJET SE POSE CONTRE LA PORTE QUI LE CONCERNE.
 *
 * Un stylo qui a franchi une porte n'a plus la même taille, donc plus le même
 * trait. Sa position de départ n'est pas de la décoration : c'est l'énoncé.
 *
 *   contre la PORTE INDIGO (8 ; 5), celle qui fait grandir → un petit stylo
 *   contre le TORII VERMILLON (−8 ; −5), celui qui fait rapetisser → un énorme
 *   contre le torii aussi → la perle, dont on veut la version minuscule
 *
 * On voit l'objet et la porte dans le même coup d'œil. Il n'y a rien à deviner :
 * il n'y a qu'à essayer, et le levier est là pour ça.
 */
const socles = (): BoxDef[] => [
  // Devant la porte indigo, en diagonale : on cadre l'objet et la porte
  // ensemble. Reculé à z ≤ 3,70 pour laisser libre le couloir de z = 5, par
  // lequel on entre dans cette porte-là.
  box([4.6, -0.4, 1.9], [6.4, 0.16, 3.7], 1),

  // ─── Les deux socles du torii vermillon, et les cinq mètres entre eux ─────
  //
  // La grande face occupe z −8,8…−1,2. On y adosse DEUX choses, et il a fallu
  // les écarter de cinq mètres après les avoir vues se gêner :
  //
  //   AU SUD (z ≈ −7,8), la dalle du stylo indigo. Ce qui s'y pose fait 2,40
  //   d'arête — c'est un mur de deux mètres quarante, pas un bibelot, et l'on
  //   ne hisse pas un meuble sur un piédestal. Elle est décalée vers l'EST
  //   jusqu'à x = −4,80 pour dégager la diagonale qui mène du point d'arrivée
  //   au chevalet : à x = −5,50 on la frôlait en marchant vers la toile, et
  //   raser un cube de deux mètres quarante quand on va dessiner est le genre
  //   de frottement qu'on ne remarque qu'après l'avoir subi vingt fois.
  //
  //   AU NORD (z ≈ −2,6), le socle de la perle, à hauteur de hanche.
  //
  // La première version les avait mis côte à côte, et le stylo BARRAIT le
  // chemin de la perle vers la porte : on prenait la perle, on marchait vers
  // l'ouest, et l'on butait sur un cube de 2,40 qu'aucune enjambée ne passe.
  // Ce sont les deux objets les plus lourds du hall, et ils ne doivent jamais
  // se trouver dans la même travée.
  box([-6.1, -0.4, -9.2], [-3.5, 0.16, -6.4], 1),

  // Le chapeau du socle de la perle déborde de 20 cm : posé à fleur, il se
  // disputerait le plan du socle et grésillerait.
  box([-3.8, -0.4, -3.5], [-2.0, 0.5, -1.7], 1),
  box([-4.0, 0.5, -3.7], [-1.8, 0.62, -1.5], 2),
];

/**
 * LA TOISE — trois trous, trois tailles, et le seul étalon du hall.
 *
 * Un écran de pierre planté au nord-est, percé de trois ouvertures dont les
 * hauteurs sont EXACTEMENT les trois corps du jeu, avec la marge mesurée dans
 * `MESURES.md` (à ×1 on passe dès 0,70 × 1,80 ; à ×4 dès 2,74 × 7,22) :
 *
 *   0,50 × 0,50   seul un joueur à ×1/4 (0,17 × 0,45) s'y glisse
 *   0,90 × 1,95   un joueur normal passe, un géant n'y pense même pas
 *   3,20 × 7,60   la porte du géant
 *
 * Elle ne sert à rien. On ne va nulle part en la traversant, on peut la
 * contourner par les deux bouts, et c'est voulu : ce n'est pas une serrure,
 * c'est un MIROIR. On s'y présente, et l'on voit de quelle taille on est.
 *
 * C'est aussi la plus belle image que deux joueurs puissent faire dans ce hall :
 * l'un franchit le grand trou pendant que l'autre franchit le petit, et personne
 * n'a eu besoin d'expliquer quoi que ce soit. Un joueur seul, lui, y voit trois
 * trous et en essaie trois — ce qui est déjà un jeu.
 *
 * Placée à z = −7,1 : le repère de (22 ; −12) occupe z −13,9…−10,1 et celui de
 * (26 ; 8) occupe z 4,2…11,8. La bande est libre entre les deux.
 */
const TOISE_Z = -7.1;
const toise = (): BoxDef[] => {
  const z0 = TOISE_Z - 0.3;
  const z1 = TOISE_Z + 0.3;
  const HAUT = 8.4;
  // Chaque joint vertical est un couple max/min et jamais deux fois la même
  // borne : c'est ce qui évite que deux montants se disputent le même plan.
  const pans: [number, number, number][] = [
    // x0, x1, y de départ du plein (0 = pilier plein)
    [14.0, 15.0, 0],
    [15.0, 15.5, 0.5], // linteau du trou minuscule
    [15.5, 17.2, 0],
    [17.2, 18.1, 1.95], // linteau du trou ordinaire
    [18.1, 20.6, 0],
    [20.6, 23.8, 7.6], // linteau du trou de géant
    [23.8, 27.0, 0],
  ];
  const out = pans.map(([x0, x1, y0]) =>
    box([x0, y0 === 0 ? -0.4 : y0, z0], [x1, HAUT, z1], y0 === 0 ? 1 : 2),
  );
  // La couronne, qui déborde de 30 cm de chaque côté : sans elle l'écran est
  // une plaque, avec elle c'est un monument.
  out.push(box([13.7, HAUT, z0 - 0.15], [27.3, HAUT + 0.5, z1 + 0.15], 2));
  return out;
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ET PAS UN CENTIMÈTRE DE DALLAGE AU PIED DE LA TOISE — mesuré, pas supposé.
 *
 * Il y avait ici un parvis de six centimètres, purement décoratif. Il rendait
 * les TROIS ouvertures infranchissables, et voici pourquoi :
 *
 *   `moveAndCollide` ne franchit une marche qu'en soulevant le corps ENTIER
 *   d'une marche pleine — la moitié de sa taille — et en vérifiant qu'il tient
 *   là-haut. Pas de six centimètres : de quatre-vingt-dix à ×1, de trois
 *   mètres soixante à ×4.
 *
 * Sous un linteau, ce corps soulevé n'a nulle part où aller. Une marche de six
 * centimètres posée dans l'embrasure d'une porte de 1,95 demande donc 2,70 de
 * hauteur libre pour être gravie. Le joueur s'arrête net, sans rien comprendre,
 * devant un trou manifestement assez grand pour lui.
 *
 * MESURÉ : à ×1/4 on s'arrêtait à 9 cm de l'ouverture, à ×1 à 34 cm, à ×4 à
 * 1,36 m. Trois échecs, une seule cause, et rien à l'œil ne la désignait.
 *
 * LA RÈGLE GÉNÉRALE, à retenir pour toute salle de ce jeu : **le sol doit être
 * plat sur toute la profondeur d'un passage bas, et sur une largeur de corps de
 * part et d'autre.** Un seuil, un liseré, une bordure — tout ce qui se franchit
 * ailleurs sans y penser devient un mur sous un linteau.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * LA FENTE BASSE — la leçon « rapetisse », et elle n'a pas un mot.
 *
 * Une dalle posée sur deux murets, 75 centimètres de jour. Un joueur à taille
 * normale mesure 1,80 : il n'a même pas à essayer. Rapetissé une fois, il en
 * mesure 45 et passe à l'aise. Le pinceau attend au fond, bien en vue depuis
 * l'extérieur — c'est ça qui donne envie, pas une consigne.
 *
 * Ouverte du seul côté du torii vermillon, celui qui fait rapetisser. On
 * regarde la fente, on regarde la porte qui est juste à côté, et l'on a compris.
 */
const fenteBasse = (): BoxDef[] => [
  box([-31, 0.75, 5.6], [-18, 1.7, 12.4], 2),
  box([-31.2, -0.4, 5.2], [-17.6, 0.75, 5.9], 1),
  box([-31.2, -0.4, 12.1], [-17.6, 0.75, 12.8], 1),
  box([-31.6, -0.4, 5.2], [-31, 0.9, 12.8], 1),
];

/**
 * LE BOUQUET — neuf tiges plantées à l'ouest, et elles ne servent à rien.
 *
 * Aucune n'est franchissable, aucune ne cache quoi que ce soit, aucune ne
 * s'allume. C'est un objet qu'on regarde, et le hall en avait besoin : les plus
 * belles choses d'un monde sont celles qui n'ont pas de fonction.
 *
 * Elles sont hautes de 1,4 à 9,0 m, ce qui n'est pas décoratif non plus : de
 * loin elles font une gerbe, et quand on est devenu géant on les regarde d'en
 * haut comme un pinceau posé sur une table. La même chose, deux tailles, deux
 * images — c'est le sujet du jeu.
 *
 * Les hauteurs et les rayons sont écrits un par un plutôt que calculés : deux
 * tiges dont les faces tomberaient par hasard dans le même plan grésilleraient,
 * et une formule ne me laisse aucun moyen de le garantir.
 */
const bouquet = (): BoxDef[] => {
  const cx = -17;
  const cz = 1;
  const tiges: [number, number, number, number][] = [
    // dx, dz, hauteur, demi-épaisseur
    [0.0, 0.0, 9.0, 0.29],
    [1.31, 0.47, 6.4, 0.22],
    [-0.83, 1.24, 5.1, 0.19],
    [-1.47, -0.62, 7.3, 0.24],
    [0.68, -1.53, 3.8, 0.16],
    [2.24, -0.91, 2.6, 0.13],
    [-2.11, 1.86, 2.05, 0.11],
    [1.02, 2.31, 1.7, 0.1],
    [-0.36, -2.44, 1.4, 0.09],
  ];
  return tiges.map(([dx, dz, h, e], i) =>
    box([cx + dx - e, -0.4, cz + dz - e], [cx + dx + e, h, cz + dz + e], 1 + (i % 3)),
  );
};

/**
 * L'ÉTABLI — de quoi jouer, sans rien à gagner.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEUX CREUX, DEUX BILLES IDENTIQUES, ET RIEN À DEVINER
 *
 * Les billes font toutes deux 0,30. Les creux font 0,30 et 1,20. L'une reste
 * où elle est ; l'autre doit franchir une porte, et elle en ressort quatre fois
 * plus grosse.
 *
 * Ce n'est pas une énigme, c'est un BAC À SABLE, et c'est délibéré : on
 * comprend ici, sans conséquence et sans qu'on nous l'ait dit, la règle sur
 * laquelle reposera toute la suite du jeu — **le nombre de portes qu'un objet
 * franchit est une variable.**
 *
 * DEUX ET PAS TROIS, et la raison est mécanique. Un troisième creux de 4,80
 * demanderait de faire franchir DEUX portes à une bille ; or le hall n'a
 * qu'une paire de cette taille, et un joueur devenu géant ne repasse pas par sa
 * petite face — il n'y entre plus. Un creux qu'on ne peut pas garnir serait une
 * promesse fausse, et une promesse fausse dans la première salle est le pire
 * départ possible.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'ÉTABLI EST AU SUD, au-delà de z = 26, et ce n'est pas un goût : les repères
 * de taille sont plantés partout entre z = −14 et z = 24 (voir la table dans
 * `markers`). La première version du grand creux était enterrée dans l'un
 * d'eux.
 *
 * Le grand creux, celui qui exige deux passages, ouvre une petite porte vers un
 * cabinet où l'on voit ce qui attend. C'est l'une des deux récompenses du hall,
 * et elle ne donne aucun avantage : elle donne une envie.
 */
const CREUX_Z = 32;
const etabli = (): BoxDef[] => [
  // Le plateau, à hauteur de hanche : on y pose sans se baisser.
  box([1.4, -0.4, CREUX_Z - 2.2], [6.6, 0.62, CREUX_Z + 2.2], 1),
  box([1.2, 0.62, CREUX_Z - 2.4], [6.8, 0.78, CREUX_Z + 2.4], 2),

  // Le socle du grand creux est AU SOL et LARGE, et ce n'est pas un détail :
  // on y pose une bille de 1,20 en mesurant sept mètres, donc en la reposant à
  // plusieurs mètres devant soi. Un plateau étroit rendrait le geste impossible
  // sans que rien ne le laisse voir — la faute a déjà coûté un niveau entier.
  box([12, -0.4, CREUX_Z - 6], [24, 0.3, CREUX_Z + 6], 1),
  box([11.7, 0.3, CREUX_Z - 6.3], [24.3, 0.5, CREUX_Z + 6.3], 2),

  // Le cabinet, muré : on n'y entre que par la petite porte, et seulement une
  // fois le grand creux garni. De l'extérieur on n'en voit que le toit.
  box([40, -0.4, 26], [56, 0.2, 42], 0),
  box([40, 0.2, 26], [56, 7, 26.7], 2),
  box([40, 0.2, 41.3], [56, 7, 42], 2),
  box([40, 0.2, 26.7], [40.7, 7, 41.3], 2),
  box([55.3, 0.2, 26.7], [56, 7, 41.3], 2),
  box([39.6, 7, 25.6], [56.4, 7.9, 42.4], 3),

  // Dedans : une Aiguille en réduction, la plume du monde qu'on ira remplir, et
  // cinq creux vides à ses pieds dont les tailles annoncent cinq voyages. Rien
  // n'est expliqué. On regarde, on se demande, on part.
  box([47.4, 0.2, 33.4], [48.6, 5.4, 34.6], 2),
  box([46.9, 5.4, 32.9], [49.1, 5.7, 35.1], 1),
  box([47.6, 5.7, 33.6], [48.4, 6.1, 34.4], 3),
  ...[
    [44.6, 0.34], [45.9, 0.5], [47.3, 0.8], [48.9, 1.2], [50.6, 0.62],
  ].map(([x, d]) => box([x - d * 0.7, 0.2, 30.2], [x + d * 0.7, 0.2 + d * 0.55, 30.2 + d * 1.4], 1)),
];

/**
 * LA MAISONNETTE — la moitié manquante du hall.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE HALL N'AVAIT QU'UNE DIRECTION. On y apprenait à devenir grand — le plot
 * hors d'atteinte, l'établi, le cabinet — et le sens inverse ne menait nulle
 * part : on rapetissait pour se glisser sous une dalle, et c'était tout. La
 * moitié du verbe du jeu n'avait aucune destination.
 *
 * Voici la sienne, et elle est le miroir exact du cabinet :
 *
 *   LA PERLE (0,40) est posée sur un socle à cinq mètres du torii vermillon.
 *   On la prend, on marche cinq pas vers l'ouest, on traverse — et l'on ressort
 *   haut de 45 cm avec une bille de dix centimètres dans les mains.
 *
 *   LE CREUX MENU (0,10) l'attend à quelques mètres de l'arrivée. À taille
 *   normale, c'est une fossette sur une pierre qu'on ne remarque pas ; à ×1/4
 *   c'est un bassin. **Un creux dit sa taille rien qu'en existant**, et celui-ci
 *   dit : « il faudra être petit ».
 *
 *   Garni, il descelle L'ARCHE, plantée seule au milieu du sol. Elle fait 2,48
 *   de haut : un joueur normal y entre debout, un géant n'y entre pas. On la
 *   franchit, et l'on se retrouve à l'intérieur d'une cabane fermée de tous les
 *   côtés, quatre fois plus petit qu'en y entrant.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LA PORTE EST TAILLÉE POUR CE QU'ELLE DOIT REFUSER (les seuils sont ceux de
 * `canPass` : hauteur ≤ 0,96 × la face, largeur ≤ 0,90 × la face) —
 *
 *   petite face 0,62 × 0,42  →  0,45 passe (marge 0,145), 1,80 est refusé
 *   grande face 2,48 × 1,68  →  1,80 passe (marge 0,58),  7,20 est refusé
 *
 * ON N'Y RESTE JAMAIS COINCÉ, et je l'ai vérifié dans les deux sens : quelle
 * que soit la taille à laquelle on entre (×1 ou ×1/4, donc ×1/4 ou ×1/16 une
 * fois dedans), la petite face intérieure est toujours franchissable et ramène
 * dehors d'un cran plus grand. Une cabane sans issue dans la toute première
 * salle serait impardonnable.
 *
 * LES DEUX FACES SONT ÉCARTÉES DES MURS DE 60 CM, et ce n'est pas de la
 * décoration : le franchissement se déclenche quand l'ŒIL coupe le plan, or
 * l'œil est à l'aplomb du centre du joueur, que la collision arrête AVANT le
 * mur. Une face plaquée contre une paroi ne se traverse jamais. C'est déjà la
 * raison pour laquelle les deux portes du hall et celle du cabinet sont plantées
 * en plein air.
 *
 * ON ATTERRIT DROIT DEVANT LA PORTE INDIGO, ET C'EST INÉVITABLE. Un portail
 * projette la face d'en face sur la sienne au quart : qui entre dans le torii
 * vermillon, où qu'il l'aborde, ressort quelque part entre z = 4,05 et z = 5,95
 * devant la petite face — c'est-à-dire dans son embrasure. Marcher droit vers
 * l'est la retraverse aussitôt, et l'on redevient géant sans avoir rien
 * demandé. Mesuré, et impossible à corriger par un placement : la fenêtre
 * d'arrivée EST le rectangle de la porte.
 *
 * Ce n'est pas un défaut, c'est le hall qui enseigne sa propre géométrie en une
 * seconde : on rebondit une fois, on comprend, on fait un pas de côté. Deux
 * choses le rendent inoffensif —
 *
 *   on ressort de la petite face LE REGARD TOURNÉ VERS L'OUEST, donc le dos à
 *   l'endroit où l'on retomberait ;
 *
 *   et le creux menu se garnit AUSSI à taille normale. Une bille de 0,10 se
 *   soulève à ×1 (limite 0,99) et se repose à 54 cm devant soi, pour une portée
 *   d'accueil de 90. Qui aura laissé la perle rapetissée au sol et sera remonté
 *   par la porte indigo peut revenir la chercher grand. Vérifié dans les deux
 *   sens : il n'y a pas UN chemin, il y en a deux.
 *
 * LA FENÊTRE (0,50 × 0,90, à hauteur d'œil d'un joueur normal) est le seul
 * endroit du hall où l'on regarde quelqu'un vivre à une autre taille que la
 * sienne. Un joueur à ×1 s'y penche et voit, dans une pièce qu'il ne peut pas
 * habiter, une silhouette de quarante-cinq centimètres se promener entre les
 * tiges. Elle est trop étroite pour lui (il lui faut 0,70) et son seuil est à
 * 90 cm, hors de portée d'un saut à ×1/4 (0,323) : personne ne passe par là,
 * dans aucun sens. On ne fait que regarder — et c'est exactement ce qu'on
 * voulait.
 *
 * L'EMPRISE : x 15,0…20,6 et z 4,6…10,0, toiture comprise jusqu'à 10,3. Le
 * grand repère de (16 ; 17) commence à z = 10,856 ; il reste 55 cm. C'est
 * serré, et c'est pour cela que c'est écrit ici.
 */
const MAISON_X = 17.8;
const maisonnette = (): BoxDef[] => {
  const out: BoxDef[] = [];

  // ─── L'arche scellée, plantée seule sur le sol ────────────────────────────
  // Le plan de la grande face est en x = 13,2 ; elle fait 1,68 de large, donc
  // elle occupe z 7,36…9,04. Les montants se posent juste en dehors.
  //
  // ET SES MONTANTS NE SONT PAS VERMILLON. Ils l'ont été, et l'arche se lisait
  // alors comme un second torii — or le vermillon, dans ce jeu, veut dire une
  // chose et une seule : « celle-ci te rapetisse de quatre ». Deux portes de la
  // même couleur qui ne font pas la même chose, c'est un mensonge de peintre.
  // La couleur de celle-ci lui vient de son liseré de portail, qui est vert.
  out.push(box([13.0, -0.4, 7.06], [13.4, 2.6, 7.36], 2));
  out.push(box([13.0, -0.4, 9.04], [13.4, 2.6, 9.34], 2));
  out.push(box([12.85, 2.6, 6.96], [13.55, 3.1, 9.44], 1));

  // ─── La pierre au creux menu ──────────────────────────────────────────────
  // 14 cm de haut : un joueur à ×1/4 y monte (il enjambe 22,5), un joueur
  // normal ne la voit même pas comme une marche. Décalée d'un mètre au sud du
  // passage pour qu'on ne marche pas dessus en entrant.
  out.push(box([11.5, -0.4, 6.3], [12.7, 0.14, 7.5], 1));

  // ─── La cabane ────────────────────────────────────────────────────────────
  // Murs de 40 cm, intérieur 4,80 × 4,60 × 3,28. À ×1/4 c'est une halle de
  // dix-neuf mètres ; à ×1/16 c'en est une de soixante-dix.
  const S0 = 4.6;
  const S1 = 5.0; // face intérieure du mur sud
  const N0 = 9.6; // face intérieure du mur nord
  const N1 = 10.0;
  const O0 = 15.0;
  const O1 = 15.4;
  const E0 = 20.2;
  const E1 = 20.6;
  const HAUT = 3.4;

  // Mur sud, percé de la fenêtre en x 17,4…17,9 et y 0,90…1,80.
  out.push(box([O0, -0.4, S0], [17.4, HAUT, S1], 1));
  out.push(box([17.9, -0.4, S0], [E1, HAUT, S1], 1));
  out.push(box([17.4, -0.4, S0], [17.9, 0.9, S1], 1));
  out.push(box([17.4, 1.8, S0], [17.9, HAUT, S1], 1));

  out.push(box([O0, -0.4, N0], [E1, HAUT, N1], 1));
  out.push(box([O0, -0.4, S1], [O1, HAUT, N0], 1));
  out.push(box([E0, -0.4, S1], [E1, HAUT, N0], 1));
  // Le sol intérieur, 12 cm au-dessus du sol du hall. C'est le seuil de la
  // fenêtre vu de l'intérieur, et c'est aussi ce qui donne au lieu son air de
  // pièce plutôt que de cour couverte.
  out.push(box([O1, -0.4, S1], [E0, 0.12, N0], 0));
  // La toiture déborde de 30 cm sur les quatre côtés et enterre du même coup
  // tous les dessus de murs, qui sinon se disputeraient leur plan commun.
  out.push(box([O0 - 0.3, HAUT, S0 - 0.3], [E1 + 0.3, HAUT + 0.5, N1 + 0.3], 2));

  // ─── Dedans : la spirale de tiges ─────────────────────────────────────────
  // Elle ne sert à rien non plus, et c'est la deuxième chose du hall dont c'est
  // le seul mérite. Vue par la fenêtre à ×1, c'est un hérisson posé sur un
  // plancher. Vue de l'intérieur à ×1/4, c'est un bosquet. Vue à ×1/16, c'est
  // une forêt dix fois plus haute que soi. Trois lieux pour un objet.
  const rangee: [number, number, number, number][] = [
    // dx, dz, hauteur, demi-épaisseur
    [0.0, 0.0, 1.62, 0.055],
    [0.41, -0.29, 1.34, 0.048],
    [-0.13, 0.62, 1.11, 0.042],
    [-0.74, -0.22, 0.93, 0.037],
    [0.36, 0.97, 0.77, 0.033],
    [1.13, -0.51, 0.64, 0.029],
    [-1.02, 0.86, 0.53, 0.026],
    [-0.61, -1.19, 0.44, 0.023],
    [1.44, 0.63, 0.36, 0.02],
    [0.24, -1.51, 0.3, 0.018],
    [-1.62, -0.34, 0.25, 0.016],
    [1.09, 1.53, 0.2, 0.014],
    [-1.28, 1.41, 0.17, 0.013],
    [1.81, -0.72, 0.14, 0.012],
  ];
  for (const [dx, dz, h, e] of rangee) {
    const x = MAISON_X + dx;
    const z = 7.3 + dz;
    out.push(box([x - e, 0.12, z - e], [x + e, 0.12 + h, z + e], 3));
  }

  return out;
};

export const LOBBY: LevelDef = {
  name: 'Le hall',
  spawn: [0, 0.2, 6],
  spawnYaw: Math.PI, // regard vers le nord : le levier, puis les trois arches

  boxes: [
    // Sol. Une seule dalle, donc aucune couture — mais sans contour tout de
    // même, sinon sa silhouette entière serait tracée à l'encre à l'horizon.
    box([-FAR, -6, -FAR], [FAR, 0, FAR], 0, { outline: false }),

    ...PLACE(),
    ...chevalet(),
    ...socles(),
    ...bacAuxGalets(),
    ...toise(),
    ...arches(),
    ...maisonnette(),
    ...etabli(),
    ...markers(),
    ...fenteBasse(),
    ...bouquet(),
  ],

  /**
   * LE HALL EST UN APPRENTISSAGE, et le pinceau en est le maître.
   *
   * Six jalons, et chacun enseigne exactement une chose :
   *
   *   1. Il est là, à trois pas, à hauteur d'homme. On marche, on l'atteint.
   *      C'est la règle du jeu en une seconde : on le rejoint, il repart.
   *   2. Il se pose sur le tablier du chevalet, à côté des deux stylos. Le
   *      Pinceau devant une toile n'a besoin d'aucune légende.
   *   3. Il se pose sur un plot de 2,70. On enjambe 0,90 et l'on saute 1,30 :
   *      c'est hors d'atteinte. Mais la porte indigo rend quatre fois plus
   *      grand, et un géant enjambe 3,60. Leçon « grandis ».
   *   4. Il se glisse sous une dalle qui laisse 75 centimètres. Un géant n'y
   *      pense même pas, un joueur normal non plus. Le torii vermillon rend
   *      quatre fois plus petit. Leçon « rapetisse ».
   *   5. Il attend devant l'arche scellée de la maisonnette, minuscule. Sa
   *      taille est la consigne : ce n'est pas un endroit où l'on entre grand.
   *   6. Il se pose devant les trois arches, et l'on n'a plus qu'à choisir.
   *
   * À la fin de ce parcours, le joueur a appris les deux sens du changement de
   * taille, il sait que le pinceau se rejoint, et il sait qu'il le retrouvera
   * ailleurs. Aucune de ces trois choses n'a été écrite.
   */
  guide: [
    [4, 0.4, 3],
    [TOILE_X, 0.7, -11.4],
    [-8, 2.72, 20],
    [-26, 0.1, 9],
    [12.2, 0.35, 8.2],
    [0, 0.4, -18],
  ],

  // Il se met à la taille de l'endroit où il se pose : normal sur la place et
  // devant la toile, grand sur le plot qu'on ne rejoint qu'en géant, minuscule
  // sous la dalle où seul un joueur rapetissé se glisse, minuscule encore
  // devant une porte où seul un petit a affaire. Sa taille est donc, à elle
  // seule, la consigne — on voit ce qu'il faut devenir pour aller le chercher.
  guideEchelle: [1, 1, 4, 0.25, 0.25, 1],

  portals: [
    {
      id: 'hall',
      colorBig: 0xc8492e, // vermillon
      colorSmall: 0x2f4b7c, // indigo
      big: { position: [-8, 0, -5], yaw: Math.PI / 2 }, // normale +X, regarde l'est
      small: { position: [8, 0, 5], yaw: -Math.PI / 2 }, // normale -X, regarde l'ouest
    },
    {
      // LE CABINET. Scellé tant que le grand creux est vide — donc tant qu'on
      // n'a pas fait franchir une porte à une bille en la portant. On voit la
      // porte, on voit qu'elle ne s'ouvre pas, et l'on voit à trois pas de là
      // ce qui l'ouvrira. Rien n'est écrit.
      id: 'cabinet',
      condition: 'creux-grand',
      colorBig: 0xb08a48,
      colorSmall: 0xb08a48,
      smallHeight: 2.4,
      smallWidth: 1.6,
      big: { position: [26.5, 0, CREUX_Z], yaw: -Math.PI / 2 },
      small: { position: [48, 0.2, 40.6], yaw: Math.PI },
    },
    {
      // LA MAISONNETTE. Le pendant exact du cabinet, dans l'autre sens : celle-ci
      // se mérite en devenant petit, pas en devenant grand.
      //
      // Les deux faces regardent le SUD toutes les deux (yaw = π). Elles ne
      // peuvent donc pas se voir l'une l'autre — la seconde tourne le dos à la
      // première — et l'on évite le tunnel de reflets sans avoir à les écarter.
      id: 'maisonnette',
      condition: 'creux-menu',
      colorBig: 0x4c6b3c,
      colorSmall: 0x4c6b3c,
      smallHeight: 0.62,
      smallWidth: 0.42,
      // En plein air, abordée en marchant vers l'est.
      big: { position: [13.2, 0, 8.2], yaw: -Math.PI / 2 },
      // À l'intérieur, à 60 cm du mur du fond : voir la note sur l'œil.
      small: { position: [MAISON_X, 0.12, 9.0], yaw: Math.PI },
    },
  ],

  /**
   * LES OBJETS DU HALL.
   *
   * Trois familles, et aucune n'a le même rôle :
   *
   *   LES GALETS (0,22 · 0,50 · 0,90 · 1,70) n'ont AUCUN creux qui les attende.
   *   Ils sont là pour être pris, lancés, portés d'un bout à l'autre et changés
   *   de taille en chemin. Un bac à sable a besoin d'objets qui ne demandent
   *   rien, et c'est la majorité d'entre eux.
   *
   *   LES BILLES (0,30, deux fois) démontrent l'unique règle : elles ne se
   *   distinguent que par le nombre de portes qu'on leur fera franchir.
   *
   *   LA PERLE (0,40) est la clef de la maisonnette. Sa taille n'est pas ronde
   *   par hasard : divisée par quatre elle donne 0,10, et 0,10 est franchement
   *   hors du creux de 0,30 de l'établi (qui tolère 0,264…0,336). Aucun
   *   placement correct ne peut être une faute, et aucune faute ne peut
   *   ressembler à un placement correct.
   */
  carryables: [
    { id: 'bille-a', position: [2.6, 0.8, CREUX_Z + 1.2], size: 0.3, ink: 3 },
    { id: 'bille-b', position: [3.8, 0.8, CREUX_Z + 1.2], size: 0.3, ink: 3 },
    // Une caisse à part, sans creux qui l'attende : celle-là ne sert à rien
    // qu'à être portée d'un bout à l'autre et à changer de taille en chemin.
    { id: 'caisse-libre', position: [-2, 0.3, 27], size: 0.6, ink: 2 },

    // Le bac, à sept mètres du point d'arrivée. Les quatre pierres sont posées
    // à des endroits distincts du plateau pour qu'aucune n'en recouvre une
    // autre au départ — deux caisses imbriquées se repoussent en tremblant.
    { id: 'galet-menu', position: [BAC_X - 1.5, 0.16, BAC_Z - 1.6], size: 0.22, ink: 3 },
    { id: 'galet', position: [BAC_X - 0.3, 0.16, BAC_Z - 2.0], size: 0.5, ink: 1 },
    { id: 'pierre', position: [BAC_X - 1.2, 0.16, BAC_Z + 1.4], size: 0.9, ink: 2 },
    // Celui-ci refuse à ×1 : on soulève 0,99, il en fait 1,70. Il faut devenir
    // géant. C'est la seule chose du hall qui dise « non », et elle le dit bien.
    { id: 'bloc', position: [BAC_X + 1.2, 0.16, BAC_Z + 0.4], size: 1.7, ink: 2 },

    // La perle, sur son socle à cinq mètres du torii vermillon, du côté par où
    // l'on y entre. On la prend, on marche vers l'ouest, on traverse.
    { id: 'perle', position: [-2.9, 0.62, -2.6], size: 0.4, ink: 3 },

    // ═══════════════════════════════════════════════════════════════════════
    // LES QUATRE STYLOS
    //
    // Le trait fait la POINTE, pas le porteur : l'épaisseur suit la taille du
    // stylo. Sur une toile de 12,40, le rayon du trait vaut 0,34 × l'arête du
    // stylo, ce qui donne directement la largeur du trait EN MÈTRES SUR LE MUR :
    //
    //   0,05  →  3 cm     un cheveu
    //   0,20  →  14 cm    la plume ordinaire
    //   0,60  →  41 cm    un pinceau de peintre en bâtiment
    //   2,40  →  1,63 m   sept traits suffisent à barrer la toile entière
    //
    // LES DEUX PREMIERS SONT CÔTE À CÔTE SUR LE TABLIER, à soixante-dix
    // centimètres l'un de l'autre. C'est la démonstration entière du jeu, et
    // elle se fait sans faire trois pas : on prend l'un, on trace, on le
    // repose, on prend l'autre, on trace. Le geste est le même et le trait ne
    // l'est pas.
    //
    // LES DEUX AUTRES SONT CONTRE LES PORTES, et c'est la deuxième leçon : un
    // stylo change de taille comme tout le reste. Le vermillon se prend à ×1 et
    // ressort à 2,40 par la porte indigo. L'indigo, lui, est REFUSÉ à ×1 — on
    // soulève 0,99 et il en fait 2,40 — et il est posé exactement à l'endroit
    // où l'on ATTERRIT quand on devient géant. On l'a vu, on n'a pas pu le
    // prendre, et on se retrouve à côté de lui avec des mains de sept mètres.
    //
    // AUCUN NE PEUT TOMBER PAR ERREUR DANS UN CREUX, à sa taille de départ ni à
    // une porte de là : 0,20 · 0,05 · 0,60 · 2,40 et leurs quarts et quadruples
    // restent tous en dehors des fenêtres de 0,10, 0,30 et 1,20 (12 % de
    // tolérance). Seul un stylo qu'on aurait fait rapetisser DEUX fois pourrait
    // s'y loger, et le levier de rappel est là pour ça.
    // ═══════════════════════════════════════════════════════════════════════
    { id: 'stylo-noir', position: [-10.8, 0.16, -12.0], size: 0.2, ink: 2, encre: '#1d1a16' },
    { id: 'stylo-menu', position: [-10.1, 0.16, -12.0], size: 0.05, ink: 3, encre: '#4c7a3f' },
    { id: 'stylo-vermillon', position: [5.5, 0.16, 2.8], size: 0.6, ink: 3, encre: '#c8492e' },
    { id: 'stylo-indigo', position: [-4.8, 0.16, -7.8], size: 2.4, ink: 2, encre: '#2f4b7c' },
  ],

  /**
   * LA TOILE. Voir `chevalet()` pour la place, les dimensions et la gomme.
   *
   * `yaw: 0` la fait regarder vers +Z, c'est-à-dire vers le SUD, c'est-à-dire
   * vers le point d'arrivée. On n'écrit que sur l'avant d'une toile (le moteur
   * refuse le dos et refuse aussi les angles rasants) : elle doit donc tourner
   * son visage vers là d'où viennent les gens, et c'est le cas.
   */
  canevas: [
    {
      id: 'toile',
      position: [TOILE_X, TOILE_Y, TOILE_Z],
      yaw: 0,
      largeur: TOILE_L,
      hauteur: TOILE_H,
      // Au pied ouest, sur le tablier. 1,40 de rayon : on l'atteint sans viser,
      // et le stylo le plus proche est à trois mètres et demi.
      gomme: { position: [-14.2, 0.16, -11.8], radius: 1.4 },
    },
  ],

  /**
   * LES TROIS CREUX, dans l'ordre des puissances de quatre.
   *
   * Aucun n'accepte la taille d'un autre. La tolérance vaut 12 %, et 0,10 ·
   * 0,30 · 1,20 sont séparés d'un facteur trois au moins : aucun placement
   * correct ne peut être une faute (règle 11 du contrat des salles, qui vaut
   * ici comme ailleurs).
   *
   * Et de toute façon, ici, une faute ne coûte rien : le levier est à trente
   * mètres et remet tout en place. C'est le seul endroit du jeu où c'est vrai.
   */
  sockets: [
    // Rayon d'accueil très large pour un si petit creux, et c'est voulu : un
    // établi ne doit jamais être une épreuve de visée.
    { id: 'creux-petit', position: [3.2, 0.78, CREUX_Z - 1.4], size: 0.3, ink: 3, portee: 2.2 },
    // Le grand est AU SOL et son rayon d'accueil est très large, et ce n'est pas
    // un ornement : on vient le garnir en mesurant sept mètres, donc en reposant
    // ce qu'on porte à plusieurs mètres devant soi. Viser un creux d'un mètre
    // vingt à cette distance serait une épreuve d'adresse, et ce jeu n'en est
    // pas une.
    { id: 'creux-grand', position: [18, 0.5, CREUX_Z], size: 1.2, ink: 3, portee: 4.5 },
    // Le creux menu. Sa portée par défaut vaudrait 7,5 cm, ce qui serait une
    // épreuve d'adresse au doigt sur un téléphone. Un joueur à ×1/4 qui tient
    // une bille de 0,10 la repose à 28 cm devant lui (rayon du corps + deux
    // fois la bille) : 90 cm lui laisse tout le loisir de se tromper d'un pas.
    { id: 'creux-menu', position: [12.1, 0.14, 6.9], size: 0.1, ink: 3, portee: 0.9 },
  ],

  /**
   * LE LEVIER DE RAPPEL. Voir la note de `PLACE` pour le choix du rayon : il
   * doit couvrir le levier sans mordre sur les dalles, parce qu'un appui dans
   * sa bulle rappelle tout au lieu de reposer ce qu'on tient.
   */
  rappel: { position: [0, 0, -3.0], radius: 1.6 },

  // Dans le hall il n'y a rien à gagner : l'objectif est repoussé hors du
  // terrain pour ne jamais se déclencher. Ce sont les trois seuils qui mènent
  // quelque part.
  goal: { position: [0, -900, 0], radius: 1 },

  seuils: [
    { position: [ARCHE_SOLO_X, 0, SEUIL_Z], radius: 3.0, mode: 'solo', label: 'Seul' },
    { position: [ARCHE_DUO_X, 0, SEUIL_Z], radius: 5.6, mode: 'duo', label: 'À deux' },
    { position: [ARCHE_REVE_X, 0, SEUIL_Z], radius: 3.0, mode: 'reve', label: 'Le rêve' },
  ],

  // AUCUN INDICE. Il y en avait quatre, et ils disaient en toutes lettres ce
  // que la géométrie dit déjà : « deux portes, l'une te fera grand », « deux
  // ouvertures jumelles, on n'y va pas seul ». Le jeu n'explique jamais rien.
  // Une forme, une taille, un creux vide — et l'on comprend, ou l'on essaie.
};
