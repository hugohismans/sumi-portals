import type { BoxDef, PortalPairDef, TableauDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * L'ATELIER DE LAVIS — le séchoir des potiers, et la première fois qu'une
 * couleur est une énigme.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE ENSEIGNE, ET C'EST TOUT CE QU'ELLE ENSEIGNE
 *
 *     On ne peint que ce qu'on pourrait tenir.
 *
 * Un tableau au mur montre la pièce telle qu'elle devrait être : les claies en
 * rouge, et rien d'autre de changé. On n'a que le rouge. Il n'y a QU'UN SEUL
 * GESTE POSSIBLE dans la pièce, et c'est le bon :
 *
 *   — les claies mesurent 0,90 → 0,90 ≤ 0,99, on les peint à ×1 ;
 *   — les pans de mur mesurent 4,00 → jamais, à aucune taille d'ici ;
 *   — et RIEN D'AUTRE n'appartient à une famille : ni les pots, ni les
 *     tréteaux, ni la grande jarre, ni les lattes du toit.
 *
 * L'ERREUR VOULUE est d'essayer de peindre le mur. On reçoit alors le refus du
 * « trop lourd » — le même seuil, au nombre près, que celui de la caisse, donc
 * une sensation que le joueur connaît depuis une heure. La loi de la main
 * s'installe en une seconde sans qu'un mot ait été dit, et sans qu'on ait rien
 * pu casser.
 *
 * DEUX FAMILLES DÉCLARÉES, UNE SEULE INCONNUE. Le carnet interdit deux
 * inconnues simultanées : quatre états font seize combinaisons et le joueur
 * tire au sort au lieu de raisonner. Ici la seconde famille n'est pas une
 * inconnue, c'est une PORTE FERMÉE : `atelier-mur` ne peut JAMAIS recevoir de
 * couleur à la taille où l'on se tient, donc l'espace des états accessibles
 * compte deux éléments (claies en lavis, claies en rouge) et non quatre. Le
 * mur ne figure pas non plus dans `attendu` : le tableau ne demande qu'une
 * chose. Une contrainte à la fois ; le cumul viendra beaucoup plus tard.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * RÈGLE 8 — QUEL LIEU CONNU ELLE REVISITE, ET À QUELLE TAILLE NOUVELLE.
 * La côte rouge (`levels/regions/rouge.ts`) est un chantier de potiers
 * abandonné : quatre fours en ruche, une cour de tessons, et TROIS SÉCHOIRS —
 * des tables de plaques d'argile mises à sécher, hautes de 2,70, 3,00 et 4,30,
 * si larges qu'elles forcent la voie des chariots à serpenter autour d'elles.
 * On les a contournées ; on ne les a jamais regardées.
 *
 * Ici, le même objet tient sur deux tréteaux et mesure 0,90 : la moitié de sa
 * propre taille. Un séchoir qui était un obstacle du paysage est devenu une
 * chose qu'on pourrait soulever d'une main — donc, et c'est toute la salle, une
 * chose qu'on peut peindre. Et le rouge qu'on va y poser est le pigment
 * rapporté de ce chantier-là. L'objet et la couleur viennent du même souvenir.
 *
 * RÈGLE 9 — L'ÉTALON. Il est dans le mur est, et il est double. La porte de
 * sortie est une GRANDE face de portail de 2,80 × 1,90 : très exactement la
 * porte que le joueur a franchie partout depuis le début (`PORTAL_SMALL_H/W`
 * de `core/constants.ts`). Le pan de mur qui la borde monte à 4,00, soit 1,43
 * fois cette porte : on n'estime pas le mur à l'œil, on le mesure contre la
 * seule règle graduée du monde. Et six mètres plus au sud, au ras du sol, un
 * TROU DE SOURIS de 0,70 × 0,475 — la même porte au quart — dit d'avance de
 * quelle taille on ressortira.
 *
 * RÈGLE 10 — LE SPECTACULAIRE EST LA RÉCOMPENSE DE L'ERREUR. Le mur qui appelle
 * le plus la main est celui du fond, derrière la grande jarre : c'est le point
 * de fuite de la pièce et du tableau, et c'est là que le jour rasant vient
 * mourir. Qui se trompe s'est déplacé jusqu'au plus beau plan de la salle, y a
 * perdu quatre secondes, et n'y a rien perdu d'autre — une couleur se reprend,
 * et de toute façon aucune n'a été posée.
 *
 * RÈGLE 11 — aucun logement ici. Rien à porter, rien à loger : la salle ne
 * demande qu'un pas et une touche.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE PLAN, du sud (le tableau) au nord (la jarre)
 *
 *   z=1308  ┌───────────── mur nord, aveugle ─────────────┐
 *           │                 [LA JARRE]  ·o·             │
 *           │  ▭ claie                                    │
 *   z=1305  │                              ╔═══════════╗  │ ← la porte dessinée
 *           │  ▭ claie          ▭ claie    ║ 2,80×1,90 ║  │   (grande face)
 *   z=1303  │                              ╚═══════════╝  │
 *           │  ▭ claie          ▭ claie                   │
 *   z=1301  │  ▭ claie          ▭ claie                   │
 *           │                                  ▫ 0,70     │ ← le trou de souris
 *   z=1299  │→ entrée                                     │   (petite face)
 *           │  2,20 × 3,00                                │
 *   z=1297  │              [ T A B L E A U ]              │
 *           └─────────────── mur sud ─────────────────────┘
 *          x=-2,48                                     x=+2,48
 *
 * LE POINT DE VUE DU TABLEAU N'EST PAS DÉCLARÉ, ET C'EST DÉLIBÉRÉ. Sans `oeil`,
 * `render/tableaux.ts` peint la toile DEPUIS SON PROPRE MUR, en regardant la
 * pièce le long de la normale du cadre. C'est le seul point de vue qu'un joueur
 * puisse retrouver sans le chercher : il va lire le tableau, il se retourne, et
 * la composition se referme sur elle-même. Pour la salle qui INAUGURE la
 * mécanique, faire de l'angle de vue une question serait une seconde inconnue.
 * Le champ de la prise est de 58° et sa toile est carrée : d'où un cadre carré
 * (1,10 × 1,10), sans quoi l'image serait étirée par le rendu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * L'OBJET QUI DIT « C'EST CETTE PIÈCE-CI » — LA GRANDE JARRE
 *
 * C'est le seul vrai risque de la salle : que le joueur regarde une image et ne
 * comprenne pas qu'elle montre la pièce où il se tient. Le remède est un objet
 * RECONNAISSABLE, IMMOBILE, et présent au même endroit dans les deux vues.
 *
 * La jarre est plantée sur l'axe du cadre (x = 0), au fond de l'allée, à dix
 * mètres de l'objectif : c'est le POINT DE FUITE des deux vues à la fois. Elle
 * monte à 1,55 quand tout le reste de la pièce plafonne à 0,84 — c'est la seule
 * silhouette verticale du séchoir, donc la seule qu'on ne puisse confondre avec
 * rien. Elle n'appartient à AUCUNE famille : elle reste grise dans le tableau
 * comme dans la pièce, et c'est justement ce qui en fait un repère — l'unique
 * chose qui ne change pas entre les deux images, alors que sept claies, elles,
 * changent. Enfin, les trois sébiles empilées à sa DROITE et nulle part
 * ailleurs cassent la symétrie : on sait de quel côté on regarde.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA COULEUR, ET POURQUOI CETTE RÉGION N'A PAS DE `pigment`
 *
 * Une région à `pigment` naît en lavis gris et se repeint d'un coup quand on
 * rapporte sa couleur. Ce serait ici la ruine de l'énigme : le rouge arriverait
 * par le décor au lieu d'arriver par le geste, et les claies seraient déjà
 * rouges avant qu'on ait touché la moindre touche.
 *
 * L'atelier n'a donc pas de `pigment` : sa palette EST un lavis, quatre gris
 * chauds d'argile et de torchis, et elle est peinte d'emblée. Résultat : la
 * seule couleur qui puisse apparaître dans cette pièce est celle qu'une fée y
 * pose, sur la famille qu'on lui désigne. Le lavis n'est plus un état d'attente,
 * c'est la matière du lieu.
 */

type V3 = [number, number, number];

/** Nom de la salle : clef de région, et préfixe de tous les identifiants. */
const NOM = 'atelier';

/**
 * Toute boîte d'ici porte `region: 'atelier'`, et aucune ne peut l'oublier
 * puisqu'on ne construit rien autrement que par ce constructeur.
 */
const box = (
  min: V3,
  max: V3,
  ink = 1,
  opts: { ghost?: boolean; outline?: boolean; famille?: string } = {},
): BoxDef => ({ min, max, ink, region: NOM, ...opts });

// ═════════════════════════════════════════════════════════════════════════════
// LES DEUX FAMILLES, ET LES DEUX SEULS NOMBRES QUI COMPTENT
// ═════════════════════════════════════════════════════════════════════════════
//
// LE SEUIL, écrit une fois pour qu'on cesse de le deviner :
//
//     on peint  ≤  0,55 × sa propre hauteur      (= celui de la caisse, exact)
//     ×1/4 : 0,2475      ×1 : 0,99      ×4 : 3,96      ×16 : 15,84
//
// La palette accessible est donc PARTITIONNÉE PAR LA TAILLE, et c'est de là que
// vient toute la mécanique.

/**
 * LA CLAIE MESURE 0,90 — 91 % du seuil de ×1, et c'est la cote de la salle.
 *
 * Une claie de 1,00 ne se peindrait pas (1,00 > 0,99) et la salle serait morte
 * au premier geste, sans que rien ne le laisse voir. Une claie de 0,45 se
 * peindrait aussi bien, mais elle ne dirait plus rien : à la moitié de la
 * taille du joueur, on lit « objet », pas « objet que je pourrais lever ». 0,90
 * est exactement la moitié de sa hauteur — un plateau qu'on soulève des deux
 * mains, à la limite visible de ce qu'un corps porte. C'est le seul endroit de
 * l'échelle où la règle se VOIT avant de s'apprendre.
 *
 * Et le geste, lui, ne sera jamais permis nulle part ailleurs : à ×1/4 le seuil
 * tombe à 0,2475, et la claie devient à son tour intouchable.
 */
const CLAIE = 0.9;

/**
 * LE PAN DE MUR MESURE 4,00 — et les quatre centimètres qui manquent sont le
 * cœur du raisonnement.
 *
 * Le seuil vaut 3,96 à ×4. Un mur de 4,00 est donc refusé même à un joueur de
 * sept mètres vingt : il ne s'agit pas d'un mur « qu'on peindra plus tard, en
 * grandissant », c'est un mur que ce monde-ci ne peint pas. Un mur de 3,90
 * aurait promis une solution qui n'existe pas dans la salle, et le joueur aurait
 * cherché à grandir au lieu d'apprendre la règle.
 *
 * En toute rigueur, il céderait à ×16 (seuil 15,84). On ne peut pas y arriver :
 * on entre ici à ×1, la seule porte de la salle en sort à ×1/4, et il n'existe
 * dans cette parcelle aucune paire qui monte. Les deux seules tailles que la
 * salle connaisse sont donc ×1 et ×1/4, et le mur est refusé aux deux.
 *
 * C'est aussi une hauteur de séchoir vraie : 4,00, soit 2,2 fois le joueur et
 * 1,43 fois la porte de sortie plantée dedans, qui sert d'étalon (règle 9).
 */
const HAUT_MUR = 4.0;

const F_CLAIES = 'atelier-claies';
const F_MUR = 'atelier-mur';

// ═════════════════════════════════════════════════════════════════════════════
// LES NOMBRES DU JOUEUR — rien n'est jugé à vue
// ═════════════════════════════════════════════════════════════════════════════
//
//              taille   enjambée   saut     largeur   soulève / peint
//   ×1          1,80      0,90      1,293     0,68      0,99
//   ×1/4        0,45      0,225     0,323     0,17      0,2475
//
// On traverse la salle à ×1 d'un bout à l'autre. Le ×1/4 n'existe qu'APRÈS la
// porte dessinée, dans la cour est — voir « LA SORTIE » plus bas.

/** Franchi sans sauter, à ×1. Toute marche d'ici lui reste très inférieure. */
const ENJAMBEE = 0.9;
/** Au-delà, c'est un mur. Ne sert ici qu'à INTERDIRE : murets, enceintes. */
const SAUT = 1.293;

// ═════════════════════════════════════════════════════════════════════════════
// LA GÉOMÉTRIE DU SÉCHOIR
// ═════════════════════════════════════════════════════════════════════════════
//
// Une nef de 4,20 × 11,00, murs de torchis à 4,00, toit de lattes à claire-voie.
// La largeur n'est pas décorative : le séchoir est étroit POUR LE TABLEAU. Le
// champ de la prise est de 58°, donc la moitié du champ ouvre à 0,554 par mètre
// de profondeur ; une nef plus large aurait rejeté hors cadre les claies du
// premier plan, et le tableau n'aurait plus montré ce qu'il demande. Ici la
// claie la plus proche (z = 1300,7) est déjà entièrement dans le champ, et les
// sept y sont.

/** Sol de la nef. C'est le zéro de toute la salle. */
const SOL = 0;

/** Faces intérieures de la nef. */
const X_INT = 2.1;
const Z_SUD = 1296.6;
const Z_NORD = 1307.6;

/** Épaisseurs : est/ouest et nord/sud DIFFÈRENT, pour que rien ne se répète. */
const EP_EO = 0.38;
const EP_NS = 0.42;

/** Emprise en x des murs nord et sud : ils EMBRASSENT les deux autres. */
const X_NS0 = -2.62;
const X_NS1 = 2.6;
/** Emprise en z des murs est et ouest : leurs bouts s'enterrent dans les deux autres. */
const Z_EO0 = 1296.36;
const Z_EO1 = 1307.72;

/**
 * UN PAN DE MUR — et quatre décalages minuscules qui valent une heure de
 * traque de grésillement.
 *
 * Chaque pan est bâti à la MÊME hauteur exacte (4,00, la cote de la famille) et
 * à un NIVEAU différent : il descend de `gradin` par rang. Deux pans voisins
 * n'ont donc jamais leur dessus ni leur dessous dans le même plan, et la crête
 * du mur ondule de quelques millimètres — ce que fait un vrai mur de torchis.
 * Son épaisseur enfle aussi de 2 mm par rang, des deux côtés à la fois, pour
 * que les faces intérieures et extérieures ne se répètent pas non plus.
 *
 * Les pans se CHEVAUCHENT de 6 cm le long du mur (`larg` > `pas`) : deux
 * briques qui se mordent, jamais deux briques qui se touchent bout à bout.
 *
 * `sautes` désigne les rangs à ne pas bâtir : ce sont les ouvertures. Elles
 * tombent donc toujours sur des bords de pan, ce qui évite les échardes de
 * dix centimètres qu'un découpage arbitraire laisserait debout.
 */
const pans = (
  sens: 'x' | 'z',
  t0: number,
  pas: number,
  larg: number,
  n: number,
  q0: number,
  q1: number,
  yHaut: number,
  gradin: number,
  sautes: readonly number[],
): BoxDef[] => {
  const out: BoxDef[] = [];
  for (let k = 0; k < n; k++) {
    if (sautes.includes(k)) continue;
    const a = t0 + k * pas;
    const b = a + larg;
    const e0 = q0 - 0.002 * k;
    const e1 = q1 + 0.002 * k;
    const y1 = yHaut - gradin * k;
    const y0 = y1 - HAUT_MUR;
    out.push(
      sens === 'x'
        ? box([a, y0, e0], [b, y1, e1], 2, { famille: F_MUR })
        : box([e0, y0, a], [e1, y1, b], 2, { famille: F_MUR }),
    );
  }
  return out;
};

// ─── LES DEUX TRAMES DE PANS ────────────────────────────────────────────────
//
// Nord/sud : 6 rangs de 0,92, au pas de 0,86 → 5,22 m, de −2,62 à 2,60.
// Est/ouest : 10 rangs de 1,19, au pas de 1,13 → 11,36 m, de 1296,36 à 1307,72.
const LARG_NS = 0.92;
const N_NS = 6;
/** Déduit, jamais recopié : la trame doit finir EXACTEMENT sur le bord du mur. */
const PAS_NS = (X_NS1 - X_NS0 - LARG_NS) / (N_NS - 1); // 0,86
const LARG_EO = 1.19;
const N_EO = 10;
const PAS_EO = (Z_EO1 - Z_EO0 - LARG_EO) / (N_EO - 1); // 1,13

/** Bord amont d'un rang est/ouest. Sert aussi à situer les ouvertures. */
const rangEO = (k: number): [number, number] => [Z_EO0 + k * PAS_EO, Z_EO0 + k * PAS_EO + LARG_EO];

// ═════════════════════════════════════════════════════════════════════════════
// LES TROIS OUVERTURES
// ═════════════════════════════════════════════════════════════════════════════
//
// L'ENTRÉE, mur ouest, rangs 1 et 2 sautés → un jour net de 2,20 × 3,00 entre
// le bord aval du rang 0 et le bord amont du rang 3. La petite face standard
// d'un portail mesure 1,90 × 2,80 : il reste 15 cm de jour de chaque côté et
// 20 cm sous le linteau, donc l'assemblage peut y planter sa paire de raccord
// sans toucher à ce fichier.
//
// LA SORTIE, mur est, rangs 7 et 8 sautés → le même jour de 2,20 × 3,00, qui
// reçoit la GRANDE face de la porte dessinée (2,80 × 1,90).
//
// LE TROU DE SOURIS, mur est, rang 3, taillé à la main : 0,60 de large et 0,78
// sous linteau, pour une petite face de 0,70 × 0,475. C'est par là qu'on
// ressort de la salle, haut de quarante-cinq centimètres.
const OUV_OUEST: readonly number[] = [1, 2];
const OUV_EST: readonly number[] = [7, 8];
const RANG_SOURIS = 3;

/** Jour libre d'une ouverture faite de rangs sautés. */
const jour = (sautes: readonly number[]): [number, number] => [
  rangEO(sautes[0] - 1)[1],
  rangEO(sautes[sautes.length - 1] + 1)[0],
];

const JOUR_OUEST = jour(OUV_OUEST); // [1297,55 ; 1299,75]
const JOUR_EST = jour(OUV_EST); //    [1304,33 ; 1306,53]

/** Axe de la porte dessinée, et axe du trou de souris. */
const Z_PORTE = (JOUR_EST[0] + JOUR_EST[1]) * 0.5;
const Z_SOURIS = 1300.35;

/**
 * L'AXE DE LA GRANDE JARRE. C'est une constante de module et non un nombre
 * enterré dans le décor, parce que DEUX choses en dépendent : la jarre
 * elle-même, et la station du Pinceau qui vient s'y poser. L'objet qui sert de
 * repère entre les deux vues ne doit pas pouvoir se déplacer d'un seul côté.
 */
const Z_JARRE = 1306.6;

/** Hauteur de dessous de linteau des deux grandes ouvertures. */
const H_LINTEAU = 3.0;

// ═════════════════════════════════════════════════════════════════════════════
// LES SEPT CLAIES — la seule chose peignable de la salle
// ═════════════════════════════════════════════════════════════════════════════
//
// QUATRE À GAUCHE, TROIS À DROITE, et l'asymétrie n'est pas un caprice : c'est
// la deuxième amarre du tableau. Une pièce symétrique se reconnaît mal, parce
// qu'elle se reconnaît des deux côtés à la fois. Quatre contre trois, on sait
// d'un coup d'œil qu'on regarde bien dans le même sens que le peintre.
//
// Elles MORDENT de 4 cm dans le mur, elles ne s'y appuient pas : à ras, le flanc
// de la claie et la face intérieure du mur seraient dans le même plan sur toute
// leur hauteur. En les enfonçant, ce flanc-là est enterré et ne se voit jamais.
// Cela garantit aussi qu'aucun joueur ne peut se glisser ENTRE la claie et le
// mur, donc qu'il n'existe pas de position d'où le mur soit plus proche que la
// claie devant laquelle on se tient (voir `Familles.visee`, qui départage à la
// distance du centre).
//
const CLAIE_X = 1.82;

/**
 * LE PLATEAU EST À 0,98, ET CE SONT LES HUIT CENTIMÈTRES AU-DESSUS DE 0,90 QUI
 * COMPTENT — c'est une correction, pas un dessin.
 *
 * Il était d'abord à 0,72, la hauteur d'un plan de travail. Or 0,90 est la
 * MARCHE que le joueur franchit sans sauter (`STEP_FRACTION`) : à 0,72, on ne
 * bute pas dans une claie, ON MONTE DESSUS, sans l'avoir voulu, simplement en
 * longeant le mur d'un peu trop près. Et debout sur le plateau, la claie est
 * sous ses pieds : `Familles.visee` écarte tout ce qui n'est pas devant soi
 * (produit scalaire < 0,25), donc la seule famille encore visée est LE MUR. Le
 * joueur appuie sur la touche en croyant peindre la claie sur laquelle il se
 * tient, et reçoit le refus. Le banc d'essai l'a fait trois fois de suite avant
 * qu'on le cherche.
 *
 * À 0,98, on ne monte plus dessus par mégarde : c'est huit centimètres au-dessus
 * de la marche automatique. On peut encore y sauter (le saut en fait 1,293),
 * mais un saut est une intention, pas un accident, et rien là-haut ne se casse
 * ni ne s'atteint — le plus haut perchoir de la nef reste à trois mètres sous la
 * crête des murs.
 *
 * C'est aussi la hauteur juste : un séchoir de potier se charge à hauteur de
 * ceinture, sans se baisser, et l'on voit ce qui sèche dessus en marchant.
 */
const CLAIE_H = 0.98;
/** Ouest : quatre. Est : trois, et le trou de souris passe entre les deux premières. */
const CLAIES_OUEST = [1300.9, 1302.4, 1303.9, 1305.4];
const CLAIES_EST = [1301.5, 1302.65, 1303.8];

/**
 * UNE CLAIE : un plateau et ses deux ridelles, sur deux piles de briques.
 *
 * Les trois pièces du plateau portent la famille ; les deux piles, non. C'est
 * la lecture la plus honnête de ce qu'on peint : on ne peint pas « le meuble »,
 * on peint LA CLAIE — le clayon de bois qu'un potier soulève et transporte. Les
 * piles sont de la maçonnerie, elles restent grises dans le tableau, et cette
 * distinction se voit sans qu'on l'explique.
 *
 * AUCUNE ARÊTE NE DÉPASSE 0,90, ce qui est la seule contrainte dure de la
 * salle : `Familles.taille` prend le PLUS GRAND membre, donc une ridelle de
 * 0,94 aurait porté la famille entière au-dessus du seuil et rendu la salle
 * insoluble. Le plateau fait 0,90 en z (la cote de la famille), les ridelles
 * 0,86 — retirées de 2 cm à chaque bout, ce qui les met du même coup hors du
 * plan des bouts du plateau.
 */
const claie = (cx: number, cz: number, i: number): BoxDef[] => {
  const bas = SOL + CLAIE_H;
  // La longueur se CONSTRUIT — z0, puis z0 + CLAIE — au lieu de se déduire de
  // deux bornes symétriques. À mille trois cents mètres de l'origine, un double
  // ne distingue plus que 2,3·10⁻¹³ : la cote lue par `Familles.taille` vaut
  // 0,900000000000091 et non 0,900000000000000, et aucune écriture ne la rendra
  // exacte ici. Le résidu est de 9·10⁻¹⁴ pour une marge de 0,09 sous le seuil —
  // un milliard de fois plus petit — donc il ne décide de rien. On l'écrit pour
  // que personne ne le prenne un jour pour un bogue.
  const z0 = cz - CLAIE * 0.5;
  return [
    // Le plateau. 0,90 en z : c'est LUI, la taille de la famille.
    box([cx - 0.32, bas, z0], [cx + 0.32, bas + 0.05, z0 + CLAIE], 3, {
      famille: F_CLAIES,
    }),
    // Les deux ridelles. Elles mordent de 2,5 cm dans le plateau (leur dessous
    // est sous son dessus) et débordent de 1 cm sur ses flancs : aucune de leurs
    // six faces ne tombe dans un plan déjà occupé.
    box([cx - 0.33, bas + 0.025, cz - 0.43], [cx - 0.26, bas + 0.115, cz + 0.43], 3, {
      famille: F_CLAIES,
    }),
    box([cx + 0.26, bas + 0.03, cz - 0.43], [cx + 0.33, bas + 0.12, cz + 0.43], 3, {
      famille: F_CLAIES,
    }),
    // Les deux piles de briques. Elles montent 1,5 cm DANS le plateau, et leur
    // dessus se décale d'un rang à l'autre : deux piles ne partagent jamais leur
    // niveau supérieur.
    box([cx - 0.24, SOL - 0.3, cz - 0.36], [cx + 0.24, bas + 0.015 + 0.002 * i, cz - 0.24], 2),
    box([cx - 0.24, SOL - 0.3, cz + 0.24], [cx + 0.24, bas + 0.018 + 0.002 * i, cz + 0.36], 2),
  ];
};

/** Une graine fixe : le désordre des pots est le même à chaque partie. */
const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

/**
 * UN POT QUI SÈCHE. Deux boîtes — une panse et une lèvre plus étroite — parce
 * qu'un cube seul ne se lit pas comme une poterie, et que trois boîtes par pot
 * coûteraient cent cinquante boîtes pour rien.
 *
 * AUCUN POT N'APPARTIENT À UNE FAMILLE, et c'est une décision, pas un oubli :
 * une seconde famille peignable ferait deux inconnues, donc quatre états, donc
 * un joueur qui essaie au lieu de comprendre. Les pots restent gris dans le
 * tableau comme dans la pièce — et ce gris-là, posé sur des claies devenues
 * rouges, est ce qui rend la bascule lisible.
 */
const pot = (cx: number, cy: number, cz: number, r: number, h: number): BoxDef[] => [
  box([cx - r, cy - 0.015, cz - r], [cx + r, cy + h * 0.62, cz + r], 0),
  box(
    [cx - r * 0.66, cy + h * 0.55, cz - r * 0.66],
    [cx + r * 0.66, cy + h, cz + r * 0.66],
    0,
  ),
];

// ═════════════════════════════════════════════════════════════════════════════
// LE DÉCOR
// ═════════════════════════════════════════════════════════════════════════════

const decor = (): BoxDef[] => {
  const out: BoxDef[] = [];

  // ─── L'AIRE DE TERRE BATTUE ────────────────────────────────────────────────
  // Une seule dalle : pas de couture, donc pas de trait d'encre en travers du
  // sol. Elle déborde sous les quatre murs et de six centimètres au-delà — ce
  // débord est le socle du séchoir, et c'est aussi lui qui empêche le dessous
  // des pans d'être jamais à l'air libre.
  //
  // Elle s'arrête à 2,52 côté est, et non à 2,56 comme ailleurs : le trou de
  // souris débouche par là, et le joueur haut de quarante-cinq centimètres qui
  // en sort doit poser le pied sur la cour, pas sur une margelle de six
  // centimètres large de quatre. Deux centimètres de socle suffisent à enterrer
  // la face extérieure du mur ; quatre auraient fait une marche à tâtons.
  out.push(box([-2.56, SOL - 1.2, 1296.1], [2.52, SOL, 1308.1], 1, { outline: false }));

  // LE JOUR RASANT. Une bande d'argile pâle en travers de l'aire, dans l'axe de
  // la porte ouest : la lumière de fin d'après-midi entre à hauteur d'homme et
  // se couche sur le sol. Elle ne dépasse le pavé que de 1,2 cm — 0,7 % de la
  // taille du joueur, soixante-quinze fois sous l'enjambée : on ne la sent pas
  // sous le pied, et rien ne peut buter dessus.
  out.push(box([-2.1, SOL - 0.4, 1297.62], [0.85, SOL + 0.012, 1299.68], 0));

  // ─── LES QUATRE MURS ───────────────────────────────────────────────────────
  // Quatre trames, quatre niveaux de crête, quatre pas de gradin : c'est ce qui
  // garantit qu'aucun pan d'un mur ne partage son dessus avec un pan d'un autre
  // dans les quatre angles, là où ils s'interpénètrent.
  out.push(...pans('x', X_NS0, PAS_NS, LARG_NS, N_NS, Z_SUD - EP_NS, Z_SUD, 3.94, 0.004, []));
  out.push(...pans('x', X_NS0, PAS_NS, LARG_NS, N_NS, Z_NORD, Z_NORD + EP_NS, 3.925, 0.0045, []));
  out.push(
    ...pans('z', Z_EO0, PAS_EO, LARG_EO, N_EO, -X_INT - EP_EO, -X_INT, 3.95, 0.003, OUV_OUEST),
  );
  out.push(
    ...pans('z', Z_EO0, PAS_EO, LARG_EO, N_EO, X_INT, X_INT + EP_EO, 3.935, 0.0035, [
      RANG_SOURIS,
      ...OUV_EST,
    ]),
  );

  // ─── LES DEUX LINTEAUX ─────────────────────────────────────────────────────
  // Ils couvrent l'ouverture d'un seul tenant, et non pan par pan : deux
  // linteaux mitoyens auraient partagé leur dessous sur toute la profondeur du
  // mur. Ils débordent de 4 cm à l'intérieur et de 2 cm à l'extérieur — un
  // linteau se voit, sinon ce n'est pas un linteau — et montent 3 cm plus haut
  // que la crête des pans voisins.
  //
  // Ils portent la famille : c'est du mur. Leur plus grande arête vaut 2,32,
  // donc ils ne changent rien à la taille de la famille, qui reste celle des
  // pans — 4,00.
  const [ao0, ao1] = [rangEO(OUV_OUEST[0])[0], rangEO(OUV_OUEST[1])[1]];
  out.push(
    box([-X_INT - EP_EO - 0.02, H_LINTEAU, ao0], [-X_INT + 0.04, 3.97, ao1], 2, {
      famille: F_MUR,
    }),
  );
  const [ae0, ae1] = [rangEO(OUV_EST[0])[0], rangEO(OUV_EST[1])[1]];
  out.push(
    box([X_INT - 0.04, H_LINTEAU + 0.02, ae0], [X_INT + EP_EO + 0.02, 3.99, ae1], 2, {
      famille: F_MUR,
    }),
  );

  // ─── LE TROU DE SOURIS ─────────────────────────────────────────────────────
  // Le rang 3 du mur est, refendu à la main : deux jambages pleine hauteur et
  // un linteau. Le jour libre fait 0,60 × 0,78 pour une petite face de
  // 0,70 × 0,475 — `withinFaceRect` tolère 2 cm de débord latéral, il en reste
  // encore quatre de chaque côté.
  //
  // Les jambages font toujours 4,00 de haut : ils appartiennent au mur, ils ne
  // changent pas sa taille. Le linteau, lui, fait 3,14 — plus grand que la
  // claie, mais sans effet, puisque `Familles.taille` ne retient que le maximum.
  const [rs0, rs1] = rangEO(RANG_SOURIS);
  const ySouris = 3.935 - 0.0035 * RANG_SOURIS;
  const xs0 = X_INT - 0.002 * RANG_SOURIS;
  const xs1 = X_INT + EP_EO + 0.002 * RANG_SOURIS;
  out.push(
    box([xs0, ySouris - HAUT_MUR, rs0], [xs1, ySouris, Z_SOURIS - 0.3], 2, { famille: F_MUR }),
  );
  out.push(
    box([xs0, ySouris - HAUT_MUR, Z_SOURIS + 0.3], [xs1, ySouris, rs1], 2, { famille: F_MUR }),
  );
  out.push(
    box([xs0 - 0.01, SOL + 0.78, Z_SOURIS - 0.35], [xs1 + 0.01, ySouris - 0.015, Z_SOURIS + 0.35], 2, {
      famille: F_MUR,
    }),
  );

  // ─── LE SEUIL DE LA PORTE OUEST ────────────────────────────────────────────
  // Sans lui, il n'y a pas de sol dans l'épaisseur du mur et l'on tombe en
  // franchissant sa propre porte. Il dépasse le pavé de 2,5 cm : on le sent
  // sous le pied, on ne bute pas dedans (l'enjambée en fait 0,90).
  out.push(box([-2.52, SOL - 0.6, JOUR_OUEST[0] + 0.05], [-2.04, SOL + 0.025, JOUR_OUEST[1] - 0.05], 2));

  // ─── LA CHARPENTE ──────────────────────────────────────────────────────────
  // Quatre entraits en travers, huit lattes dans la longueur posées dessus. Un
  // séchoir n'est pas une grange : il faut que l'air passe, donc le toit est une
  // claire-voie et la salle est ouverte au ciel entre les lattes. C'est aussi
  // par là que tombe le jour rasant du soir.
  //
  // Tout est à 3,54 et plus haut, c'est-à-dire hors d'atteinte : un joueur de
  // 1,80 monté sur une claie (0,77) et sautant de 1,293 culmine à 2,06. Rien
  // ici ne se grimpe, et les bouts des pièces sont enterrés dans les murs.
  for (let j = 0; j < 4; j++) {
    const cz = 1298.5 + j * 2.7;
    out.push(box([-2.4, 3.56 + 0.01 * j, cz], [2.4, 3.79 + 0.01 * j, cz + 0.2], 3));
  }
  for (let i = 0; i < 8; i++) {
    const cx = -2.0 + i * 0.57;
    out.push(box([cx, 3.76 + 0.004 * i, Z_EO0 + 0.04], [cx + 0.1, 3.86 + 0.004 * i, Z_EO1 + 0.08], 3));
  }

  // ─── LES SEPT CLAIES, ET CE QUI SÈCHE DESSUS ───────────────────────────────
  const r = rng(18310427);
  const poser = (cx: number, cz: number, i: number): void => {
    out.push(...claie(cx, cz, i));
    // Deux ou trois pots par claie, jamais alignés : un séchoir rangé au cordeau
    // se lit comme une étagère de magasin, et l'on cesse de croire au lieu.
    const n = 2 + (i % 2);
    for (let p = 0; p < n; p++) {
      const rr = 0.075 + r() * 0.045;
      out.push(
        ...pot(
          cx - 0.16 + r() * 0.32,
          SOL + CLAIE_H + 0.05,
          cz - 0.3 + ((p + 0.5) / n) * 0.6 + (r() - 0.5) * 0.06,
          rr,
          0.11 + r() * 0.1,
        ),
      );
    }
  };
  CLAIES_OUEST.forEach((cz, i) => poser(-CLAIE_X, cz, i));
  CLAIES_EST.forEach((cz, i) => poser(CLAIE_X, cz, i + 4));

  // ─── LA GRANDE JARRE ───────────────────────────────────────────────────────
  // Voir l'en-tête : c'est l'objet qui dit « c'est cette pièce-ci ». Sur l'axe
  // du cadre, au fond de l'allée, seule chose verticale du séchoir, dans aucune
  // famille — donc identique dans le tableau et dans la pièce.
  //
  // Six assises qui rentrent et ressortent : une jarre n'est pas un cylindre, et
  // la silhouette est tout ce qu'on lui demande. 1,55 de haut, soit 0,86 fois la
  // taille du joueur : elle ne se grimpe pas (il faudrait 1,55 pour un saut de
  // 1,293), et de toute façon rien au-dessus n'est atteignable.
  const jz = Z_JARRE;
  out.push(box([-0.62, SOL - 0.25, jz - 0.62], [0.62, SOL + 0.13, jz + 0.62], 1));
  out.push(box([-0.36, SOL + 0.1, jz - 0.36], [0.36, SOL + 0.42, jz + 0.36], 2));
  out.push(box([-0.49, SOL + 0.38, jz - 0.49], [0.49, SOL + 1.08, jz + 0.49], 2));
  out.push(box([-0.34, SOL + 1.04, jz - 0.34], [0.34, SOL + 1.34, jz + 0.34], 2));
  out.push(box([-0.2, SOL + 1.3, jz - 0.2], [0.2, SOL + 1.5, jz + 0.2], 2));
  out.push(box([-0.27, SOL + 1.46, jz - 0.27], [0.27, SOL + 1.55, jz + 0.27], 2));

  // LES TROIS SÉBILES, à sa DROITE et nulle part ailleurs. C'est la brisure de
  // symétrie qui dit dans quel sens on regarde — un séchoir symétrique se
  // reconnaîtrait aussi bien à l'envers, ce qui ne sert à rien.
  for (let k = 0; k < 3; k++) {
    out.push(
      box(
        [0.72 + 0.02 * k, SOL + k * 0.09, jz - 0.24 - 0.015 * k],
        [1.14 - 0.02 * k, SOL + 0.11 + k * 0.09, jz + 0.2 + 0.015 * k],
        0,
      ),
    );
  }

  // ─── LE PARVIS D'ARGILE, À L'OUEST ─────────────────────────────────────────
  //
  // POURQUOI IL EXISTE, ET CE N'EST PAS DU DÉCOR. L'ouverture ouest reçoit à
  // l'assemblage la face de raccord de la salle précédente. Une face de portail
  // n'est pas un mur : le joueur qui la longe, ou qui la manque de trente
  // centimètres, sort par la porte. Sans sol derrière, il tombe hors du monde.
  //
  // Le parvis est donc une cour close de six mètres sur six, dont le seul
  // chemin est la porte par laquelle on y est venu. On y entre, on regarde, on
  // rentre : rien n'y est perdu et rien n'y est gagné. Ses murets montent à 1,90
  // au-dessus de son sol, c'est-à-dire 1,47 fois le saut du joueur — la question
  // ne se pose pas, et il n'y a rien à escalader pour la reposer.
  out.push(box([-8.4, SOL - 1.16, 1296.6], [-2.4, SOL - 0.05, 1302.6], 1, { outline: false }));
  out.push(box([-8.42, SOL - 0.9, 1296.56], [-8.0, SOL + 1.85, 1302.64], 2));
  out.push(box([-8.04, SOL - 0.9, 1302.2], [-2.44, SOL + 1.82, 1302.62], 2));
  out.push(box([-8.04, SOL - 0.9, 1296.62], [-2.44, SOL + 1.79, 1297.04], 2));

  // ─── LA COUR DE L'EST, OÙ L'ON RESSORT HAUT DE QUARANTE-CINQ CENTIMÈTRES ───
  //
  // Six centimètres sous l'aire du séchoir : une marche pour nous, treize pour
  // cent de sa taille pour celui qui sort du trou de souris, et bien sous son
  // enjambée de 0,225. Ses murets montent à 0,85 au-dessus d'elle, soit 2,6 fois
  // le saut à ×1/4 : la cour est close, et l'on n'en repart que par la petite
  // face — ce qui ramène à ×1 dans le séchoir. Aucun cul-de-sac.
  //
  // Ce qu'on y voit, et c'est le dernier plan de la salle : le mur qu'on n'a pas
  // pu peindre fait maintenant huit fois et demie votre taille, et la porte par
  // laquelle vous êtes entré, à six mètres au nord, en fait six. Le tas de
  // tessons au milieu de la cour est un éboulis. On n'a rien expliqué.
  out.push(box([2.4, SOL - 1.14, 1297.2], [9.6, SOL - 0.06, 1306.4], 1, { outline: false }));
  out.push(box([9.2, SOL - 0.8, 1297.16], [9.62, SOL + 0.79, 1306.44], 2));
  out.push(box([2.44, SOL - 0.8, 1306.02], [9.24, SOL + 0.76, 1306.42], 2));
  out.push(box([2.44, SOL - 0.8, 1297.22], [9.24, SOL + 0.73, 1297.62], 2));

  // Le tas de tessons. Rien ne dépasse 6 cm — un quart de l'enjambée de celui
  // qui passe par là : c'est du décor au sol, jamais un obstacle, jamais une
  // prise pour sortir de la cour.
  const rt = rng(9110293);
  for (let k = 0; k < 7; k++) {
    const tx = 5.0 + rt() * 2.6;
    const tz = 1300.4 + rt() * 3.4;
    const s = 0.22 + rt() * 0.3;
    out.push(box([tx, SOL - 0.2, tz], [tx + s, SOL - 0.06 + 0.014 + rt() * 0.045, tz + s * 0.7], 0));
  }

  return out;
};

// ═════════════════════════════════════════════════════════════════════════════
// LE TABLEAU
// ═════════════════════════════════════════════════════════════════════════════
//
// LE CADRE SORT DU MUR DE CINQ CENTIMÈTRES. Le premier avait été posé au ras de
// la face intérieure : `render/tableaux.ts` bâtit son cadre en RETRAIT du plan
// de la toile (les quatre montants vont de −e à 0 en profondeur), donc il était
// enfoncé dans la maçonnerie et l'on ne voyait rien. Cinq centimètres suffisent,
// et c'est aussi l'épaisseur d'un vrai cadre.
//
// IL EST CARRÉ, ET CE N'EST PAS UN GOÛT. La prise se fait dans une cible de
// 512 × 512 avec une caméra de rapport 1 ; une toile de 1,60 × 0,90 étirerait
// cette image d'un facteur 1,8 en largeur, et le tableau mentirait sur la seule
// chose qu'on lui demande — montrer la pièce. 1,10 × 1,10, centré à 1,60, donc
// à hauteur de l'œil (1,656) : on ne se penche ni ne se hausse pour le lire.
//
// CE QU'IL MONTRE. Champ de 58°, donc un demi-champ qui ouvre de 0,554 par
// mètre. Le mur du fond est à 11,00 : le champ y fait 6,10 de large pour une nef
// de 4,20, elle y est donc tout entière. Les sept claies, dont la plus proche est
// à 4,10, y sont toutes ; la jarre est à 10,00, sur l'axe, au point de fuite.
// La porte de sortie (z = 1305,43) y est aussi — encore scellée, encore un simple
// trou dans le mur, et c'est très bien : le tableau montre l'endroit d'où l'on
// sortira avant qu'il n'existe.
const tableau: TableauDef = {
  id: 'atelier-tableau',
  position: [0, 1.6, Z_SUD + 0.05],
  // Normale = (sin yaw, 0, cos yaw). yaw = 0 → +z, c'est-à-dire vers la nef.
  yaw: 0,
  largeur: 1.1,
  hauteur: 1.1,
  // UNE SEULE FAMILLE ATTENDUE. Le mur n'y figure pas : il n'est pas une
  // question, il est un refus. Voir l'en-tête, « deux familles, une inconnue ».
  attendu: { [F_CLAIES]: 'rouge' },
};

// ═════════════════════════════════════════════════════════════════════════════
// LA PORTE DESSINÉE
// ═════════════════════════════════════════════════════════════════════════════
//
// Elle est scellée par le TABLEAU et non par un logement : `Simulation.
// conditionsRemplies` réunit les logements pourvus et les tableaux satisfaits
// sous la même clef, et le joueur n'a pas à connaître la différence. Quand la
// pièce ressemble à l'image, la condition tombe ; `dessinee` fait alors venir le
// Pinceau, qui trace la porte tache par tache, et l'on ne passe qu'une fois le
// dessin fini.
//
// ═══════════════════════════════════════════════════════════════════════════
// POURQUOI L'ON RESSORT À ×1/4, ET POURQUOI C'EST FORCÉ
//
// Une paire de portails divise ou multiplie par quatre : il n'existe pas de
// porte qui laisse la taille intacte. Puisque la sortie de la salle EST cette
// porte, `entree.echelle` et `sortie.echelle` ne peuvent pas être égales. Reste
// à choisir le sens, et les deux arguments vont dans le même :
//
//   — le mouvement s'appelle LA DESCENTE, et l'on n'y quitte jamais le monde :
//     on le regarde de plus près. Rapetisser EST le regarder de plus près ;
//   — un monde de sortie taillé pour un joueur de 0,45 tient dans quelques
//     mètres carrés. Bâtir la même chose pour un joueur de 7,20 aurait demandé
//     une esplanade de quarante mètres, c'est-à-dire un second acte — et cette
//     salle n'a le droit qu'à une leçon.
//
// LES DEUX FACES SONT SUR LE MÊME MUR, à six mètres l'une de l'autre, et c'est
// le dessin qui explique le mécanisme : une porte de grange de 2,80 et, plus au
// sud, au ras du sol, exactement la même porte au quart, 0,70. On entre par
// l'une, on sort par l'autre, haut comme elle. La règle 9 n'est plus une cote
// écrite dans un fichier, c'est deux objets côte à côte sur la même paroi.
//
// L'ORIENTATION SE RAISONNE À L'ENVERS (`Simulation.findCrossing` : d0 > 0 et
// d1 ≤ 0). On franchit une face en marchant CONTRE sa normale, en venant de son
// avant, et l'on ressort DEVANT sa jumelle en marchant DANS le sens de la
// normale de celle-ci.
//
//   grande face (x = 2,20 ; normale −x) : on l'aborde depuis l'ouest, c'est-à-
//     dire depuis la nef, en marchant vers l'est. On ressort devant la petite,
//     donc à l'est de 2,56, dans la cour, en marchant vers l'est. Sept mètres
//     de cour devant soi.
//   petite face (x = 2,56 ; normale +x) : on l'aborde depuis l'est, c'est-à-dire
//     depuis la cour, en marchant vers l'ouest. On ressort devant la grande,
//     donc à l'ouest de 2,20, dans la nef, en marchant vers l'ouest. Quatre
//     mètres d'allée devant soi.
//
// Le retour est donc toujours ouvert, et c'est ce qui interdit à la cour d'être
// un piège : `Familles.satisfaits` ne se vide jamais, donc la porte ne se
// rescelle jamais derrière soi.
const PORTE_H = 0.7;
const PORTE_L = 0.475;

const portes: PortalPairDef[] = [
  {
    id: 'atelier-porte',
    colorBig: 0xc8492e,
    colorSmall: 0x2f4b7c,
    // 0,70 × 0,475 : la porte d'origine du jeu divisée par quatre, donc une
    // GRANDE face de 2,80 × 1,90 — celle que le joueur a franchie partout. Un
    // joueur de 1,80 y passe (il lui faut 1,875 de haut) ; un joueur de 0,45
    // passe dans la petite (il lui faut 0,469).
    smallHeight: PORTE_H,
    smallWidth: PORTE_L,
    condition: tableau.id,
    dessinee: true,
    big: { position: [2.2, SOL, Z_PORTE], yaw: -Math.PI / 2 },
    small: { position: [2.56, SOL - 0.06, Z_SOURIS], yaw: Math.PI / 2 },
  },
];

export const ATELIER: SalleModule = {
  nom: NOM,

  region: {
    name: NOM,
    min: [-100, -40, 1200],
    max: [100, 40, 1400],
    // UN LAVIS, ET PAS UNE RÉGION EN ATTENTE DE SA COULEUR. Voir l'en-tête :
    // pas de `pigment`, donc rien ne se repeindra tout seul, et la seule couleur
    // que cette pièce puisse recevoir est celle qu'une fée pose sur une famille.
    // Quatre gris chauds — argile crue, terre battue, torchis, bois gris — et le
    // papier légèrement crème d'un atelier plein de poussière.
    paper: '#f2eee6',
    colors: [
      '#e9e4da', // 0 — la poussière d'argile : le jour rasant, les pots crus, les tessons
      '#c6bfb2', // 1 — la terre battue de l'aire, du parvis, de la cour
      '#8d867a', // 2 — le torchis des murs, la pierre, l'ombre
      '#6e6558', // 3 — le bois gris : la charpente, et LES CLAIES. L'accent.
    ],
    ink: '#2a2620',
    // La salle tient dans vingt-cinq mètres ; 90 la garde entièrement lisible et
    // efface tout ce qui pourrait flotter au-delà de la parcelle.
    brouillard: 90,
  },

  bounds: { min: [-100, -40, 1200], max: [100, 40, 1400] },

  boxes: decor(),

  tableaux: [tableau],

  portals: portes,

  stations: [
    // 1. Devant le tableau, à hauteur d'homme. C'est la seule chose à regarder
    //    en entrant, et le Pinceau va s'y poser avant qu'on ait fait trois pas.
    [0, 1.72, 1298.2],
    // 2. Au-dessus de la première claie de l'ouest. Il vole, le joueur marche :
    //    il est déjà là quand on arrive, et il désigne la seule chose peignable
    //    de la pièce sans qu'un mot soit dit.
    [-CLAIE_X, 1.35, CLAIES_OUEST[0]],
    // 3. Sur l'épaule de la grande jarre, au point de fuite. Qui le suit jusque-
    //    là se retourne, voit l'allée dans l'axe, et reconnaît le tableau.
    [0, 1.95, Z_JARRE - 0.5],
    // 4. Devant l'ouverture est, là où le dessin viendra.
    [1.6, 1.5, Z_PORTE],
    // 5. Dehors, dans la cour, au ras des tessons.
    [4.6, 0.35, Z_SOURIS],
  ],

  // ON ENTRE À ×1, par la porte ouest, à deux pas du tableau — il est à quarante
  // degrés sur la droite, et c'est la première chose qu'on voit en tournant la
  // tête. ON SORT À ×1/4, par le trou de souris du mur est : voir « pourquoi
  // l'on ressort à ×1/4 » plus haut. Le raccord de la salle suivante se plante
  // dans la cour, où l'on arrive haut de quarante-cinq centimètres.
  entree: { position: [-1.9, SOL + 0.12, 1298.65], echelle: 0 },
  sortie: { position: [4.2, SOL - 0.04, Z_SOURIS], echelle: -1 },
};

/**
 * Les cotes du calibrage, rassemblées pour que personne ne retouche un nombre
 * « à l'œil ». Chacune a sa raison écrite plus haut ; aucune n'est ronde par
 * hasard, et deux d'entre elles décident si la salle existe.
 */
export const CALIBRAGE_ATELIER = {
  /** La seule arête peignable de la salle. 91 % du seuil de ×1. */
  claie: CLAIE,
  /** La seule arête qui ne le soit à aucune taille d'ici. 101 % du seuil de ×4. */
  mur: HAUT_MUR,
  /** On peint ce qu'on soulèverait : 0,55 × sa hauteur. ×1/4, ×1, ×4. */
  seuilsDePeinture: [0.2475, 0.99, 3.96],
  enjambee: ENJAMBEE,
  saut: SAUT,
  /** Les deux faces de la porte dessinée, en mètres. */
  porte: { petite: [PORTE_L, PORTE_H], grande: [PORTE_L * 4, PORTE_H * 4] },
};
