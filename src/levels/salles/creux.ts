import type {
  BoxDef,
  CarryableDef,
  PortalPairDef,
  SocketDef,
} from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LES TROIS CREUX — la salle où l'on apprend à COMPTER LES PORTES.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE ENSEIGNE, EN UNE PHRASE
 *
 *     Le nombre de portes qu'un objet franchit est une variable.
 *
 * Jusqu'ici, une caisse traversait UNE porte et devenait la marche qui
 * manquait. Ici, trois perles rigoureusement identiques doivent finir à trois
 * tailles différentes, et la seule chose qui les distingue est le nombre de
 * seuils qu'on leur fait passer : zéro, un, deux. Il n'y a rien à deviner, il
 * y a à compter — et c'est exactement ce qu'on veut que le joueur emporte,
 * parce que toutes les salles d'après s'appuient dessus.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LE LIEU, ET CE QU'IL REVISITE (règle 8). C'est LA COUR de `level01.ts` —
 * celle où l'on tombe au premier quart d'heure de jeu, trois mètres de fond, la
 * margelle rouge, la petite porte indigo au fond. On la retrouve ici TROIS FOIS
 * EMBOÎTÉES : une cour creusée dans une cour creusée dans une cour. La margelle
 * y est devenue une balustrade, et c'est la mesure qui l'a imposée — on ne
 * borde pas de la même façon un trou de trois mètres et un puits de vingt-
 * quatre.
 *
 * LA FORME. Un puits à gradins, vu depuis la margelle du grand :
 *
 *     y =   0   ┌──────────── LA GRANDE COUR (×4), 96 × 96 ─────────────┐
 *               │                  ┌── le puits, 24 × 24 ──┐            │
 *     y = -24   │                  │  LA COUR MOYENNE (×1) │            │
 *               │                  │   ┌─ 6 × 6 ─┐         │            │
 *     y = -30   │                  │   │ LE PETIT│         │            │
 *               │                  │   │  CREUX  │         │            │
 *                                      (×1/4)
 *
 * Chaque gradin est QUATRE FOIS plus petit que celui du dessus et se tient
 * QUATRE FOIS plus haut au-dessus du suivant. Résultat : les trois cours ont
 * exactement les mêmes proportions pour qui s'y tient — treize fois sa taille
 * de large, trois fois et un tiers de creux. On ne les distingue donc PAS à
 * l'œil quand on y est ; on ne les distingue qu'en les voyant l'une dans
 * l'autre. C'est tout le sujet de la salle, et c'est la géométrie qui le dit.
 *
 * TOUT SE LIT DEPUIS LE BORD (le goût, et la règle 9). Les trois logements sont
 * alignés sur le MÊME MÉRIDIEN (x = 200) et à la même fraction de leur cour
 * (1,9 / 7,6 / 30,4 au sud du centre — exactement ×4 l'un de l'autre). Depuis
 * la margelle nord de la grande cour, la ligne de visée descend par les deux
 * puits et l'on voit les trois creux d'un seul coup d'œil, gigogne : 12,8 m,
 * 3,2 m, 0,8 m de dalle pâle. On ne va rien chercher, on regarde.
 *
 * L'ÉTALON (règle 9), et il est double :
 *   — chaque cour contient la porte de son étage, et la petite face d'une porte
 *     mesure TOUJOURS 1,556 fois la taille du joueur qui doit la passer (0,70
 *     pour 0,45 ; 2,80 pour 1,80 ; 11,20 pour 7,20). C'est le mètre-ruban.
 *   — chaque creux mesure TOUJOURS 0,286 fois la hauteur de la porte plantée à
 *     côté de lui. Le rapport creux/porte est donc le même aux trois étages :
 *     qui l'a vu une fois le reconnaît partout, et sait de loin quelle perle va
 *     dans quel trou.
 *   Et dans la cour moyenne, les DEUX portes ont rigoureusement la même taille
 *   (2,80 × 1,90) : celle qui descend d'un cran et celle qui monte d'un cran.
 *   C'est le dessin le plus honnête possible de « on est au milieu ».
 *
 * LE SPECTACULAIRE EST LA RÉCOMPENSE DE L'ERREUR (règle 10). L'erreur, ici,
 * c'est de monter la deuxième perle d'un cran de trop : on débouche alors dans
 * la grande cour, une perle de 3,20 dans les bras, et l'on découvre d'un coup
 * pourquoi on n'y arrivera pas — le creux qui l'attendait est vingt-quatre
 * mètres plus bas, et minuscule. On voit la salle entière depuis là. Puis on
 * redescend, et il ne s'est rien passé : le trajet est réversible tant que rien
 * n'est logé, et les trois perles sont interchangeables — se tromper de perle
 * est donc rigoureusement sans conséquence.
 */

type V3 = [number, number, number];

/**
 * Toute boîte d'ici porte `region: 'creux'` : c'est elle, et elle seule, qui
 * décide de la palette. Aucune ne peut l'oublier, puisqu'on ne construit rien
 * autrement que par ce constructeur.
 */
const box = (
  min: V3,
  max: V3,
  ink = 0,
  opts: { ghost?: boolean; outline?: boolean } = {},
): BoxDef => ({ min, max, ink, region: 'creux', ...opts });

// ═════════════════════════════════════════════════════════════════════════════
// LES NOMBRES DU JOUEUR, À TROIS TAILLES — rien n'est jugé à vue
// ═════════════════════════════════════════════════════════════════════════════
//
//              taille   enjambée   saut    largeur   soulève   pose à
//   ×1/4        0,45      0,225    0,323    0,17      0,2475    ~0,49
//   ×1          1,80      0,90     1,293    0,68      0,99      ~1,94
//   ×4          7,20      3,60     5,184    2,72      3,96      ~7,76
//
// « pose à » est calculé pour la perle de l'étage : on repose ce qu'on porte à
// 0,34 × sa propre échelle PLUS DEUX FOIS L'ARÊTE DE LA CAISSE devant soi. À ×4
// avec une perle de 3,20, cela fait 7,76 m — c'est ce nombre-là, et pas la
// taille du joueur, qui décide de la largeur des dalles et de la `portee` des
// logements. Voir plus bas : il a failli rendre le grand creux inatteignable.

// ═════════════════════════════════════════════════════════════════════════════
// LA PERLE MESURE 0,20 ET NON 0,25 — la seule cote de la consigne à corriger
// ═════════════════════════════════════════════════════════════════════════════
//
// À ×1/4, on ne soulève que 0,55 × 0,45 = 0,2475. Une perle de 0,25 dépasse ce
// seuil de deux millimètres et demi : elle ne se ramasse PAS, et la salle est
// morte au premier geste, sans que rien ne le laisse voir.
//
// 0,20 laisse 19 % de marge sous le seuil, et — c'est le point — la MÊME marge
// aux trois étages, puisque perle et seuil sont multipliés par quatre ensemble :
//
//   ×1/4 : perle 0,20  ≤ 0,2475      ×1 : 0,80 ≤ 0,99      ×4 : 3,20 ≤ 3,96
//
// La suite 0,20 / 0,80 / 3,20 garde par ailleurs les vertus arithmétiques de
// 0,25 / 1,00 / 4,00 : puissances de quatre exactes, donc aucune dérive en
// virgule flottante après un aller-retour, quel qu'en soit le nombre.
const PERLE = 0.2;

// ═════════════════════════════════════════════════════════════════════════════
// LA GÉOMÉTRIE DU PUITS
// ═════════════════════════════════════════════════════════════════════════════

/** Axe du puits. Les trois cours sont concentriques autour de lui. */
const CX = 200;
const CZ = 700;

/** Sol de chaque cour. */
const Y_G = 0; // la grande cour  (joueur ×4)
const Y_M = -24; // la cour moyenne (joueur ×1)
const Y_P = -30; // le petit creux  (joueur ×1/4)

/**
 * Demi-côté de chaque cour : 48 / 12 / 3, soit 13,3 fois la taille du joueur de
 * l'étage dans les trois cas. Les proportions sont identiques, l'échelle non —
 * c'est ce qui fait qu'on ne peut pas juger sa propre taille en regardant les
 * murs, et qu'il faut la porte pour trancher.
 */
const R_G = 48;
const R_M = 12;
const R_P = 3;

/**
 * LES DEUX CHUTES : 24 m du grand au moyen, 6 m du moyen au petit. Soit 3,33
 * fois la taille du joueur d'EN BAS dans les deux cas, donc 4,6 fois son saut.
 * Personne ne remonte un gradin à pied, à aucune échelle — et c'est la seule
 * chose qui garantisse qu'une cour ne contienne jamais qu'une seule taille de
 * joueur. Voir « la clôture », tout en bas de ce fichier.
 */

// ─── L'ossature : un socle, et deux anneaux posés dessus ─────────────────────
//
// On ne creuse pas une boîte : on empile des anneaux qui laissent un trou au
// milieu. Chaque anneau est découpé en QUATRE pièces DISJOINTES (ouest, est,
// nord, sud) et non en quatre pièces qui se recouvrent : deux dalles qui se
// chevauchent auraient leurs dessus exactement dans le même plan, sur des
// dizaines de mètres carrés, et c'est le grésillement qu'on chasse partout.
// Des pièces jointives ne partagent qu'une arête — surface nulle, donc rien à
// se disputer.
const anneau = (
  xo0: number,
  xo1: number,
  zo0: number,
  zo1: number,
  xi0: number,
  xi1: number,
  zi0: number,
  zi1: number,
  yBas: number,
  yHaut: number,
  ink: number,
): BoxDef[] => [
  box([xo0, yBas, zo0], [xi0, yHaut, zo1], ink, { outline: false }),
  box([xi1, yBas, zo0], [xo1, yHaut, zo1], ink, { outline: false }),
  box([xi0, yBas, zo0], [xi1, yHaut, zi0], ink, { outline: false }),
  box([xi0, yBas, zi1], [xi1, yHaut, zo1], ink, { outline: false }),
];

/**
 * UNE BALUSTRADE — le vide se protège par des barreaux, jamais par un mur
 * (règle 6). On est venu voir en contrebas ; un parapet plein rendrait le
 * voyage inutile, et c'est justement en contrebas que se trouve la moitié de
 * l'énigme.
 *
 * Les deux seules cotes qui comptent, et elles se calculent :
 *   — HAUTEUR = 0,90 × la taille du joueur de l'étage. Son saut n'en fait que
 *     0,72 : il ne monte pas dessus. Ses yeux sont à 0,92 : il voit par-dessus.
 *     L'intervalle entre 0,72 et 0,92 est étroit, il n'est pas négociable, et
 *     c'est lui qui donne 0,90.
 *   — VIDE ENTRE DEUX MONTANTS < un diamètre de joueur (0,378 × sa taille). On
 *     prend 0,25 × sa taille, soit les deux tiers : on passe la tête et le
 *     regard, jamais le corps.
 *
 * Les montants sont RETIRÉS de l'arête du trou et PLANTÉS dans la dalle : sans
 * le retrait, leur flanc tomberait dans le plan de la paroi du puits ; sans
 * l'enfoncement, leur dessous serait dans le plan du sol. Deux fautes classiques
 * pour le prix d'une.
 *
 * Chaque montant est aussi un poil plus haut que le précédent (`pas`). Quarante
 * barreaux au même niveau, ce sont quarante dessus dans le même plan — le défaut
 * qu'on vient d'éviter deux lignes plus haut, réintroduit par la boucle.
 */
const balustrade = (
  xa: number,
  xb: number,
  za: number,
  zb: number,
  yBas: number,
  yHaut: number,
  demi: number,
  vide: number,
  pas: number,
  ink: number,
): BoxDef[] => {
  const out: BoxDef[] = [];
  let i = 0;
  const poser = (cx: number, cz: number): void => {
    out.push(box([cx - demi, yBas, cz - demi], [cx + demi, yHaut + i * pas, cz + demi], ink));
    i++;
  };
  const pasAxe = 2 * demi + vide;
  // Les deux files est-ouest tiennent toute la longueur, COINS COMPRIS.
  const nz = Math.max(1, Math.round((zb - za) / pasAxe));
  for (let k = 0; k <= nz; k++) {
    const cz = za + ((zb - za) * k) / nz;
    poser(xa, cz);
    poser(xb, cz);
  }
  // Les deux files nord-sud sautent les coins : deux montants au même endroit,
  // ce sont deux cubes exactement superposés — le pire cas possible.
  const nx = Math.max(1, Math.round((xb - xa) / pasAxe));
  for (let k = 1; k < nx; k++) {
    const cx = xa + ((xb - xa) * k) / nx;
    poser(cx, za);
    poser(cx, zb);
  }
  return out;
};

/**
 * UNE PORTE — deux jambages et un linteau autour d'une face de portail.
 *
 * Le portail lui-même n'est qu'un plan ; le cadre est ce qui le rend VISIBLE de
 * loin, et donc utilisable comme étalon. Toutes les faces de cette salle sont
 * perpendiculaires à x, ce qui permet un seul constructeur au lieu de deux.
 *
 * L'ouverture est 12 % plus large que la face du portail : le moteur n'y laisse
 * passer qu'un joueur large de 0,9 fois la face, on ne se cogne donc jamais au
 * jambage en entrant. Le jambage MONTE DANS le linteau (0,55 de son épaisseur)
 * au lieu de s'arrêter dessous : son dessus se retrouve enterré, donc jamais
 * coplanaire avec le dessous du linteau. Et le linteau déborde des jambages en
 * x comme en z, pour la même raison, dans l'autre sens.
 */
const porte = (cx: number, cy: number, cz: number, h: number, w: number, ink: number): BoxDef[] => {
  const p = w * 0.3; // profondeur du cadre, en x
  const e = w * 0.28; // épaisseur d'un jambage, en z
  const j = w * 0.56; // demi-ouverture : 12 % de plus que la demi-face
  const bas = cy - h * 0.02; // planté dans la dalle
  const hautJ = cy + h + e * 0.55; // le jambage traverse le linteau
  return [
    box([cx - p * 0.5, bas, cz - j - e], [cx + p * 0.5, hautJ, cz - j], ink),
    box([cx - p * 0.5, bas, cz + j], [cx + p * 0.5, hautJ, cz + j + e], ink),
    box(
      [cx - p * 0.6, cy + h, cz - j - e - w * 0.03],
      [cx + p * 0.6, cy + h + e, cz + j + e + w * 0.03],
      ink,
    ),
  ];
};

/**
 * LA DALLE D'UN CREUX — le trou lui-même, et la seule chose qu'on doit voir.
 *
 * Un vrai bassin (une margelle avec un fond) serait plus joli et parfaitement
 * nuisible : la perle rebondirait sur le rebord au lieu de tomber dedans. C'est
 * donc une dalle pâle affleurante — 4 fois l'arête attendue de large, 5 % de
 * l'arête de relief. Le relief est là pour qu'on la voie de trente mètres ; il
 * reste vingt fois sous l'enjambée de l'étage, donc on ne le sent pas sous le
 * pied et rien ne peut buter dessus.
 *
 * La largeur, elle, n'est pas cosmétique : elle donne l'échelle du creux à qui
 * le regarde du gradin d'au-dessus. Trois dalles pâles de 0,8 / 3,2 / 12,8
 * empilées dans l'axe du puits, c'est la suite 1 : 4 : 16 dessinée au sol.
 */
const dalleDuCreux = (x: number, ySol: number, z: number, taille: number, ink: number): BoxDef =>
  box(
    [x - taille * 2, ySol - taille * 0.37, z - taille * 2],
    [x + taille * 2, ySol + taille * 0.05, z + taille * 2],
    ink,
  );

/** Dessus de la dalle d'un creux : c'est là que la perle se pose, donc là que le logement l'attend. */
const poseDuCreux = (ySol: number, taille: number): number => ySol + taille * 0.05;

// ═════════════════════════════════════════════════════════════════════════════
// LES TROIS CREUX, ALIGNÉS SUR LE MÊME MÉRIDIEN
// ═════════════════════════════════════════════════════════════════════════════
//
// 1,9 puis 7,6 puis 30,4 mètres au sud du centre : exactement ×4 d'un étage au
// suivant, comme tout le reste. Vus depuis la margelle nord de la grande cour,
// les trois s'enfilent dans l'axe des deux puits.
const CREUX_P: V3 = [CX, Y_P, CZ + 1.9];
const CREUX_M: V3 = [CX, Y_M, CZ + 7.6];
const CREUX_G: V3 = [CX, Y_G, CZ + 30.4];

// ═════════════════════════════════════════════════════════════════════════════
// LES QUATRE FACES DE PORTAIL
// ═════════════════════════════════════════════════════════════════════════════
//
// Deux paires imbriquées, et le mot n'est pas décoratif : la GRANDE face de la
// paire du bas et la PETITE face de la paire du haut mesurent toutes deux
// 2,80 × 1,90 et se tiennent dans la même cour, face à face de part et d'autre
// du puits. C'est la salle qui dit « tu es au milieu » sans un mot.
//
//   paire « creux-bas »  : petite 0,70 × 0,475 dans le petit creux
//                          grande 2,80 × 1,90  dans la cour moyenne
//   paire « creux-haut » : petite 2,80 × 1,90  dans la cour moyenne
//                          grande 11,20 × 7,60 dans la grande cour
//
// Les hauteurs valent 1,556 fois la taille du joueur de l'étage, c'est-à-dire
// exactement le rapport de la porte d'origine du jeu (2,80 pour 1,80). Une
// porte taillée autrement cesserait d'être un étalon.
const BAS_H = 0.7;
const BAS_W = 0.475;
const HAUT_H = 2.8;
const HAUT_W = 1.9;

/** Petite face de la paire du bas : contre le mur ouest du petit creux. */
const P_PORTE_X = 198.0;
/** Grande face de la paire du bas : branche ouest de l'anneau moyen. */
const M_PORTE_BAS_X = 190.5;
/** Petite face de la paire du haut : branche est de l'anneau moyen. */
const M_PORTE_HAUT_X = 209.5;
/** Grande face de la paire du haut : loin à l'est dans la grande cour. */
const G_PORTE_X = 232.0;
const G_PORTE_Z = 682.0;

// ═════════════════════════════════════════════════════════════════════════════
// LE DÉCOR
// ═════════════════════════════════════════════════════════════════════════════

const decor = (): BoxDef[] => {
  const out: BoxDef[] = [];

  // ─── LE SOCLE ──────────────────────────────────────────────────────────────
  // La roche dans laquelle tout est creusé. Son DESSUS est le sol du petit
  // creux ; on ne le voit donc que par la fenêtre de 6 × 6 que lui laissent les
  // deux anneaux. Une seule boîte : pas de couture, pas de plan disputé.
  out.push(
    box([CX - R_G, -38, CZ - R_G], [CX + R_G, Y_P, CZ + R_G], 2, { outline: false }),
  );

  // ─── L'ANNEAU MOYEN ────────────────────────────────────────────────────────
  // Il descend 0,9 m DANS le socle : son dessous y est enterré, donc invisible
  // et jamais coplanaire avec le dessus du socle. Il déborde aussi de 0,6 m sous
  // l'anneau supérieur, pour la même raison appliquée aux flancs.
  out.push(
    ...anneau(
      CX - R_M - 0.6, CX + R_M + 0.6, CZ - R_M - 0.6, CZ + R_M + 0.6,
      CX - R_P, CX + R_P, CZ - R_P, CZ + R_P,
      Y_P - 0.9, Y_M,
      1,
    ),
  );

  // ─── L'ANNEAU SUPÉRIEUR ────────────────────────────────────────────────────
  // Même principe, 0,6 m dans le socle — et pas 0,9, pour que les deux anneaux
  // n'aient pas leur dessous dans le même plan.
  out.push(
    ...anneau(
      CX - R_G, CX + R_G, CZ - R_G, CZ + R_G,
      CX - R_M, CX + R_M, CZ - R_M, CZ + R_M,
      Y_P - 0.6, Y_G,
      1,
    ),
  );

  // ─── L'ENCEINTE DE LA GRANDE COUR ──────────────────────────────────────────
  //
  // Ici, et ici seulement, un MUR PLEIN : dehors il n'y a rien à voir, et la
  // règle 6 protège une vue, pas une bordure. Neuf mètres au-dessus de la dalle,
  // contre un saut de 5,18 : le joueur ×4 ne sort pas de sa cour.
  //
  // Le mur est RENTRÉ de 0,4 m sur l'arête du socle. Posé à ras, sa face
  // extérieure serait exactement dans le plan du flanc de l'anneau — quatre-
  // vingt-seize mètres de faces confondues, la plus grosse faute possible.
  // La lisière de 0,4 m qu'on laisse dehors est à dix mètres au-dessus du vide
  // et derrière un mur infranchissable : personne n'y posera jamais le pied.
  const M0 = CX - R_G + 0.4;
  const M1 = CX + R_G - 0.4;
  const N0 = CZ - R_G + 0.4;
  const N1 = CZ + R_G - 0.4;
  out.push(box([M0, -1, N0], [M0 + 2, 9, N1], 2));
  out.push(box([M1 - 2, -1, N0], [M1, 9, N1], 2));
  // Les faces nord et sud sont 10 cm plus hautes et plus profondément plantées :
  // sans cet écart, leur dessus tomberait dans le plan de celui des deux autres.
  out.push(box([M0 + 2, -1.1, N0], [M1 - 2, 9.1, N0 + 2], 2));
  out.push(box([M0 + 2, -1.1, N1 - 2], [M1 - 2, 9.1, N1], 2));

  // ─── LES DEUX BALUSTRADES ──────────────────────────────────────────────────
  //
  // Celle du haut : joueur de 7,20, saut 5,18, diamètre 2,72.
  //   hauteur 6,50 (0,90 × 7,20)  →  au-dessus du saut, sous les yeux (6,62)
  //   vide 1,73 (mesuré, 25,6 / 11 - 0,60)  →  les deux tiers d'un diamètre
  //   retrait 0,5 m de l'arête, montants plantés de 0,50 dans la dalle
  out.push(
    ...balustrade(
      CX - R_M - 0.8, CX + R_M + 0.8, CZ - R_M - 0.8, CZ + R_M + 0.8,
      -0.5, 6.5, 0.3, 1.8, 0.02, 3,
    ),
  );
  // Celle du bas : joueur de 1,80, saut 1,293, diamètre 0,68.
  //   hauteur 1,62 (0,90 × 1,80), vide 0,45, retrait 0,225, plantée de 0,20.
  // Elle est aussi ce qui empêche une perle de 0,80 de tomber dans le petit
  // creux : 0,80 ne passe pas entre deux montants distants de 0,45, et le moteur
  // refuse de poser une caisse qui chevaucherait un solide. Le vide calibré sur
  // le joueur protège donc aussi la caisse, gratuitement.
  out.push(
    ...balustrade(
      CX - R_P - 0.3, CX + R_P + 0.3, CZ - R_P - 0.3, CZ + R_P + 0.3,
      Y_M - 0.2, Y_M + 1.62, 0.075, 0.45, 0.004, 3,
    ),
  );

  // ─── LES QUATRE PORTES ─────────────────────────────────────────────────────
  out.push(...porte(P_PORTE_X, Y_P, CZ, BAS_H, BAS_W, 3));
  out.push(...porte(M_PORTE_BAS_X, Y_M, CZ, HAUT_H, HAUT_W, 3));
  out.push(...porte(M_PORTE_HAUT_X, Y_M, CZ, HAUT_H, HAUT_W, 3));
  out.push(...porte(G_PORTE_X, Y_G, G_PORTE_Z, HAUT_H * 4, HAUT_W * 4, 3));

  // ─── LES TROIS DALLES PÂLES ────────────────────────────────────────────────
  // Le seul aplat clair de la salle, et il ne sert qu'à une chose : dire de
  // loin quelle taille est attendue là.
  out.push(dalleDuCreux(CREUX_P[0], Y_P, CREUX_P[2], PERLE, 0));
  out.push(dalleDuCreux(CREUX_M[0], Y_M, CREUX_M[2], PERLE * 4, 0));
  out.push(dalleDuCreux(CREUX_G[0], Y_G, CREUX_G[2], PERLE * 16, 0));

  return out;
};

// ═════════════════════════════════════════════════════════════════════════════
// LES TROIS LOGEMENTS
// ═════════════════════════════════════════════════════════════════════════════
//
// RÈGLE 11 — deux logements d'une même salle n'acceptent jamais la même taille.
// Ici les trois sont sur le réseau des puissances de quatre : 0,20 / 0,80 /
// 3,20. Avec 12 % de tolérance, ils acceptent respectivement [0,176 ; 0,224],
// [0,704 ; 0,896] et [2,816 ; 3,584] — trois intervalles séparés par des
// gouffres. Aucune perle ne peut tomber dans le mauvais creux, et c'est ce qui
// rend la salle impossible à casser sans retour, alors même qu'un logement
// ordinaire verrouille pour de bon.
//
// LA `portee`, ET L'ERREUR QU'ELLE ÉVITE. Un joueur repose ce qu'il porte à
// 0,34 × son échelle plus deux fois l'arête de la caisse devant lui. Au grand
// creux, cela fait 7,76 m : viser un socle à sept mètres soixante-seize est un
// exercice d'adresse, et ce jeu n'en est pas un. On donne donc au grand creux
// 9 m de rayon d'accueil — plus que la distance de dépose, ce qui garantit que
// le geste aboutit qu'on soit à deux mètres ou à seize du creux. Le défaut par
// défaut aurait été 2,40 : la perle serait tombée cinq mètres à côté, à chaque
// fois, sans que rien ne l'explique.
//
// Et la dalle sud de la grande cour fait 36 m de profondeur, soit quatre fois et
// demie la distance de dépose : il y a la place de se poster n'importe où autour
// du creux, ce qui est la seconde moitié de la même précaution.
const logements: SocketDef[] = [
  {
    id: 'creux-petit',
    position: [CREUX_P[0], poseDuCreux(Y_P, PERLE), CREUX_P[2]],
    size: PERLE,
    // 0,75 : une fois et demie la distance de dépose à ×1/4 (0,49), et bien
    // moins que la distance qui sépare le creux des perles au départ (1,80 pour
    // la plus proche) — aucune ne se loge toute seule au premier tick.
    portee: 0.75,
    ink: 3,
  },
  {
    id: 'creux-moyen',
    position: [CREUX_M[0], poseDuCreux(Y_M, PERLE * 4), CREUX_M[2]],
    size: PERLE * 4,
    // 3,00 : une fois et demie la distance de dépose à ×1 (1,94). Le creux est
    // à 4,2 m de la balustrade du petit puits, donc une perle logée là ne peut
    // pas être happée depuis le bord, ni l'inverse.
    portee: 3.0,
    ink: 3,
  },
  {
    id: 'creux-grand',
    position: [CREUX_G[0], poseDuCreux(Y_G, PERLE * 16), CREUX_G[2]],
    size: PERLE * 16,
    portee: 9.0,
    ink: 3,
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// LES TROIS PERLES
// ═════════════════════════════════════════════════════════════════════════════
//
// Identiques, alignées, au sol du petit creux, entre la porte et le creux. On
// les voit toutes les trois d'un coup en arrivant — et l'on voit aussi qu'il
// n'y en a qu'un seul creux pour elles trois. La question de la salle est posée
// avant qu'on ait fait un pas.
//
// Elles sont espacées de 1,00 m, soit cinq fois leur arête et plus que la portée
// de saisie à ×1/4 (0,72) : on en prend une, jamais deux, et l'on n'hésite
// jamais sur laquelle.
const perles: CarryableDef[] = [0, 1, 2].map((i) => ({
  id: `creux-perle-${'abc'[i]}`,
  position: [199.0, Y_P, CZ - 1.6 + i * 1.0],
  size: PERLE,
  ink: 3,
}));

// ═════════════════════════════════════════════════════════════════════════════
// LES DEUX PAIRES DE PORTES
// ═════════════════════════════════════════════════════════════════════════════
//
// Elles sont INTERNES à la salle : leurs deux faces sont chez moi, donc c'est
// ici qu'elles se déclarent, et pas à l'assemblage.
//
// L'ORIENTATION EST LA MOITIÉ DU TRAVAIL, et elle se raisonne à l'envers : on
// ne franchit une face que par SON AVANT, et l'on ressort DEVANT sa jumelle, en
// marchant dans le sens de la normale de celle-ci. Une face mal tournée dépose
// donc le joueur dos à la salle, et son premier pas le renvoie d'où il vient.
// Ici, les quatre normales pointent toutes vers l'intérieur de la cour où elles
// débouchent, et chacune a devant elle de quoi courir :
//
//   creux-bas.grande   (190,5 ; normale +x) → on ressort en 198,0 vers l'est,
//                                              5 m de petit creux devant soi
//   creux-bas.petite   (198,0 ; normale +x) → on ressort en 190,5 vers l'est,
//                                              6 m d'anneau moyen devant soi
//   creux-haut.petite  (209,5 ; normale -x) → on ressort en 232 vers l'ouest,
//                                              20 m de grande cour devant soi
//   creux-haut.grande  (232 ;   normale -x) → on ressort en 209,5 vers l'ouest,
//                                              6 m d'anneau moyen devant soi
const portes: PortalPairDef[] = [
  {
    id: 'creux-bas',
    colorBig: 0xc8492e,
    colorSmall: 0x2f4b7c,
    // 0,70 × 0,475 : exactement la porte d'origine du jeu divisée par quatre.
    // Un joueur de 0,45 y passe (il lui faut 0,469) ; un joueur de 1,80 s'y
    // cogne. C'est cette seule cote qui interdit au moyen de descendre chez le
    // petit autrement qu'en rapetissant.
    smallHeight: BAS_H,
    smallWidth: BAS_W,
    big: { position: [M_PORTE_BAS_X, Y_M, CZ], yaw: Math.PI / 2 },
    small: { position: [P_PORTE_X, Y_P, CZ], yaw: Math.PI / 2 },
  },
  {
    id: 'creux-haut',
    colorBig: 0xc8492e,
    colorSmall: 0x2f4b7c,
    // 2,80 × 1,90 : la porte d'origine, telle quelle. Sa grande face fait donc
    // 11,20 × 7,60, ce qu'il faut pour qu'un joueur de 7,20 revienne — sans
    // quoi la grande cour serait un cul-de-sac, et la salle un piège.
    smallHeight: HAUT_H,
    smallWidth: HAUT_W,
    big: { position: [G_PORTE_X, Y_G, G_PORTE_Z], yaw: -Math.PI / 2 },
    small: { position: [M_PORTE_HAUT_X, Y_M, CZ], yaw: -Math.PI / 2 },
  },
];

/**
 * LA CLÔTURE — pourquoi aucune cour ne contient jamais deux tailles de joueur,
 * et pourquoi c'est CELA qui rend la salle infaillible.
 *
 * On n'entre dans une cour que par une porte, jamais par le haut (les deux
 * chutes valent 4,6 sauts pour qui devrait les remonter, et les balustrades
 * empêchent d'y tomber). Or :
 *
 *   — on n'arrive dans LE PETIT CREUX que par la grande face de « creux-bas »,
 *     qui divise par quatre : on y est donc toujours à ×1/4 ;
 *   — on n'arrive dans LA COUR MOYENNE que par la petite face de « creux-bas »
 *     (×4 depuis ×1/4) ou la grande face de « creux-haut » (÷4 depuis ×4) : on
 *     y est donc toujours à ×1 ;
 *   — on n'arrive dans LA GRANDE COUR que par la petite face de « creux-haut »,
 *     qui multiplie par quatre : on y est donc toujours à ×4.
 *
 * Chaque cour n'accueille qu'une taille, et cette taille est précisément celle
 * pour laquelle sa porte de sortie est taillée. Il n'existe donc aucun état d'où
 * l'on ne puisse repartir — la démonstration ne dépend d'aucune vérification, de
 * l'adresse de personne, ni du bon vouloir du décor : elle est dans la forme.
 */

export const CREUX: SalleModule = {
  nom: 'creux',

  region: {
    name: 'creux',
    min: [100, -40, 600],
    max: [300, 60, 800],
    // Une carrière de pierre bleue, à l'ombre d'elle-même. Le papier reste le
    // papier — même trait, mêmes aplats, même grain que partout ailleurs : seule
    // la palette change (règle 3). Elle s'assombrit à mesure qu'on descend, ce
    // qui est la seule façon de faire lire trois étages superposés en aplats.
    paper: '#e8edef',
    colors: [
      '#dbe3e6', // 0 — la pierre pâle : les trois dalles de creux, et rien d'autre
      '#adbcc4', // 1 — le gris de taille : les deux gradins
      '#5a707c', // 2 — l'ombre du fond : le socle, l'enceinte
      '#c2703a', // 3 — la terre cuite : balustrades, portes, perles. L'accent.
    ],
    ink: '#18232a',
    // La parcelle fait 200 de côté ; 260 la laisse entièrement lisible tout en
    // effaçant ce qui pourrait flotter au-delà.
    brouillard: 260,
  },

  bounds: { min: [100, -40, 600], max: [300, 60, 800] },

  boxes: decor(),

  carryables: perles,

  sockets: logements,

  portals: portes,

  stations: [
    // 1. Au-dessus de la margelle nord : c'est de là qu'on voit les trois creux
    //    l'un dans l'autre, et c'est la seule chose à comprendre.
    [CX, 4.0, CZ - R_M - 3],
    // 2. Dans la cour moyenne, entre les deux portes jumelles. Le Pinceau vole,
    //    le joueur non : il y est en trois secondes, on y est en deux portes.
    [CX, Y_M + 2.5, CZ],
    // 3. Au ras du petit creux, là où dorment les trois perles.
    [CREUX_P[0], Y_P + 0.5, CREUX_P[2]],
    // 4. Puis il remonte, dans l'ordre où l'on garnit : moyen, puis grand.
    [CREUX_M[0], Y_M + 2.0, CREUX_M[2]],
    [CREUX_G[0], Y_G + 4.0, CREUX_G[2]],
  ],

  // On arrive GÉANT, sur la margelle nord, et la salle entière est sous les
  // pieds. C'est la seule image qui pose l'énigme sans un mot : trois creux
  // gigognes, trois perles identiques tout au fond, et deux portes pour
  // descendre. On repart par le fond de la grande cour, une fois le dernier
  // creux comblé — au même palier, parce que la salle est une descente qu'on
  // remonte, et non un couloir.
  entree: { position: [CX, Y_G + 0.4, CZ - R_M - 6], echelle: 1 },
  sortie: { position: [CX, Y_G + 0.4, CZ + 42], echelle: 1 },
};

/**
 * Les cotes du calibrage, rassemblées pour que personne ne retouche un nombre
 * « à l'œil ». Chacune a une raison écrite plus haut ; aucune n'est ronde par
 * hasard.
 */
export const CALIBRAGE_CREUX = {
  perle: PERLE,
  tailles: [PERLE, PERLE * 4, PERLE * 16],
  /** Ce qu'on soulève à chaque étage. La perle en fait 81 % — même marge partout. */
  seuilsDeLevage: [0.2475, 0.99, 3.96],
  /** Ce qu'on repose devant soi, perle en main. Décide de la `portee` des creux. */
  distancesDeDepose: [0.485, 1.94, 7.76],
  /** Hauteur des deux chutes, en tailles du joueur d'en bas : 3,33 dans les deux cas. */
  chutes: [Y_G - Y_M, Y_M - Y_P],
};
