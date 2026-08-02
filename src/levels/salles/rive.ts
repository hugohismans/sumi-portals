import type { BoxDef, CarryableDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LA RIVE OPPOSÉE — *poser la main où l'on ne posera jamais le pied.*
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * D'ABORD, LES DEUX NOMBRES QUI M'ONT ÉTÉ DONNÉS FAUX, ET QUE J'AI MESURÉS.
 *
 * 1. « ON REPOSE CE QU'ON PORTE À DEUX FOIS SA TAILLE DEVANT SOI. » Non.
 *    `holdPoint`, dans `core/carryables.ts`, écrit exactement ceci :
 *
 *        écart horizontal = PLAYER_RADIUS × échelle + 2 × l'arête de la caisse
 *                         = 0,34 × échelle + 2 × arête
 *
 *    La taille du JOUEUR n'y entre que par son rayon, 1,36 m à ×4 — l'épaisseur
 *    de son propre corps, celle-là même qui le tient à distance du bord contre
 *    lequel il s'appuie. **Tout le reste est la caisse.** Mesuré : arête 3,90 →
 *    9,160 · 3,60 → 8,560 · 2,40 → 6,160 · 1,20 → 3,760 ; à ×1, 0,90 → 2,140.
 *
 *    Conséquence, et c'est elle qui dessine la salle : la plus grosse chose
 *    qu'un géant soulève fait 3,96 (0,55 × 7,20), donc **sa portée de dépose ne
 *    dépasse jamais 9,28 m**, et quatorze mètres n'existent nulle part. Avec une
 *    arête de 3,60 : 8,56 depuis les pieds, dont 1,36 mangés par son corps, soit
 *    **7,20 m au-delà de la lèvre** — sa propre taille, l'étalon dont le joueur
 *    se sert sans le savoir.
 *
 * 2. « LE SAUT FRANCHIT 1,29 m À ×1, 5,18 À ×4. » Non plus, et c'est plus grave.
 *    0,72 × sa taille est la HAUTEUR d'un saut (8,20² / 2×26 = 1,2932 : la
 *    formule tombe juste), pas sa portée. Mesuré, deux dalles au même niveau :
 *    ×1, **4,39 m** en marchant et 5,57 en sprintant ; ×4, **17,56** et
 *    **22,28**. Un bras de mer de quatorze mètres se franchit d'un bond à ×4.
 *
 *    La dissociation qu'on m'a décrite est donc **fausse à l'horizontale** : le
 *    saut (17,56) dépasse le bras (11,52) et écrase la dépose (8,56). ELLE EST
 *    VRAIE À LA VERTICALE, ET ÉNORME — la plus haute marche qu'on monte à ×4
 *    vaut **4,90 m**, la plus haute dépose bras levé **21,93 m**. On pose quatre
 *    fois et demie plus haut qu'on ne grimpe. Ce n'est pas la largeur de l'eau
 *    qui interdit l'autre rive, c'est sa HAUTEUR ; la largeur ne l'aurait jamais
 *    interdite.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LA CHAÎNE, NOIR SUR BLANC.
 *
 *   1. On arrive à ×4 (7,20 m) à l'ouest du quai. Trente mètres d'eau, et en
 *      face une falaise. Vers l'est, un éperon de la falaise vient toucher le
 *      quai : il ne reste entre les deux qu'une PASSE DE 2,40 m — et l'on fait
 *      2,72 de large. On ne descend pas là. On regarde.
 *   2. Dans la face de l'éperon, six mètres plus haut, une baie de 4,80 de haut,
 *      et au fond une serrure qui attend une arête de 3,60. Six mètres, c'est-
 *      à-dire un mètre dix au-dessus des 4,90 qu'on escalade.
 *   3. Sur le quai traînent trois galets de 0,90. On en prend un, on tend le
 *      bras : il se pose à 3,16 m, tombe dans la passe, et l'on va le repêcher
 *      à la main sans bouger les pieds. **Première leçon, et gratuite.**
 *   4. Quarante mètres à l'ouest, une grande porte. On la franchit — c'est
 *      L'ERREUR, et c'est aussi la solution : on ressort à ×1 à l'autre bout du
 *      quai, la rive est devenue un océan, et le galet un coffre (0,90 contre
 *      1,80, tout juste sous les 0,99 qu'on soulève à cette taille).
 *   5. On le prend et l'on RENTRE PAR LA PETITE FACE. Elle multiplie par quatre
 *      ce qu'on porte : on ressort géant, un bloc de 3,60 dans les bras.
 *   6. On revient à la lèvre, on lève les yeux de vingt-trois degrés, on lâche.
 *      La pièce entre dans une baie où l'on n'entrera jamais — 4,80 de haut,
 *      et l'on en fait 7,20 — et l'on entend le clic de l'autre côté de l'eau.
 *
 * CE QUE LA SALLE REVISITE (règle 8) : LE CONDUIT. Là-bas, « ×4 ne rentre pas :
 * il lui faut 2,74 de large, l'ouverture en fait 2,40 », et le géant héritait
 * d'une terrasse d'où contempler une porte trop petite pour lui. La même loi est
 * ici retournée d'un quart de tour — l'ouverture est trop BASSE — et cette fois
 * **il fait quand même ce qu'il y avait à faire dedans**, sa main y allant sans
 * lui.
 *
 * « LES TROIS PRISES » : SA PHRASE OUI, SES COTES NON. Les fusionner telles
 * quelles était impossible par arithmétique — la portée de dépose vaut 2 ×
 * l'arête, donc **atteindre loin exige une grosse pièce, et une grosse pièce ne
 * passe pas par une petite fenêtre** : les deux moitiés de l'idée se mangent.
 * J'ai gardé *seul l'objet devait passer* et jeté les 2,40 : la baie fait 9,60
 * de large (la largeur ne sert qu'à viser — mesuré, elle donne cinq mètres et
 * demi de quai au lieu de trois) et 4,80 de HAUT, ce qui n'arrête rien de ce
 * qu'on porte et arrête le porteur. Le refus est vertical, pas latéral.
 */

type V3 = [number, number, number];

/**
 * LES COTES, ET CE QUI LES A DÉCIDÉES.
 *
 * Z_LEVRE → Z_EPERON : LA PASSE, 2,40 m. Le corps d'un ×4 fait 2,72 (MESURES) ;
 * il ne peut donc pas y descendre, et c'est le seul verrou qui compte. Sans lui,
 * un géant se planterait AU PIED de la serrure et la garnirait de tout près :
 * `placeForDrop` ne teste aucune occultation, seulement si le point d'arrivée
 * est libre — une pose ne s'interdit jamais par un mur, seulement par
 * l'impossibilité de se tenir là.
 *
 * Z_LEVRE → Z_FALAISE : LE CHENAL, 30 m — au-dessus des 22,28 m d'un sprint-saut
 * à ×4. Ce n'est pourtant PAS ce qui garde la salle : la falaise fait
 * quatre-vingts mètres, il n'y aurait de toute façon rien où se poser. Les
 * trente mètres sont là pour l'œil du petit, à qui ils font seize corps.
 *
 * Y_TABLETTE = 6,00 EST UN COMPROMIS, PAS UN OPTIMUM. Il faut être au-dessus de
 * 4,90, la plus haute marche qu'un ×4 escalade (mesuré, élan et sprint compris),
 * sinon on monte dans la baie — vérifié aussi en posant la pièce au sol et en
 * grimpant dessus, où 3,60 + 4,90 = 8,50 mettrait 6,00 à portée si le linteau
 * n'était pas là. Et il faut rester le PLUS BAS POSSIBLE, parce que `targeted`
 * regarde depuis 4,32 m et non depuis les yeux du rendu, si bien qu'une ligne
 * partie de si bas rase le seuil : mesuré, un galet posé dans la baie ne se
 * repêche du quai que jusqu'à z = 3484,9, deux mètres et demi après la gueule.
 * 6,00 laisse 1,10 de marge sur l'escalade sans enfoncer la baie plus avant dans
 * l'ombre. Ce qui subsiste de risque est écrit au-dessus des galets.
 *
 * Y_LINTEAU − Y_TABLETTE = 4,80. Le passage de la baie : la pièce fait 3,60 et
 * passe avec 1,20 de jeu, le joueur fait 7,20 et ne passe pas. C'est LE nombre
 * de la salle. J'ai essayé d'écourter la baie en z pour réduire sa part d'ombre :
 * 5,40 de profondeur au lieu de 6,80 ramène la fenêtre de visée de cinq angles à
 * UN SEUL et supprime toute latitude en travers. La profondeur ne se négocie pas.
 *
 * Y_FOND = −4,00 : on ressort d'une fosse à parois droites jusqu'à 4,90 à ×4
 * (mesuré), donc un géant tombé au chenal en remonte partout tout seul. À ×1 on
 * n'en remonte pas — d'où la grève.
 */
const Z_LEVRE = 3480;
const Z_EPERON = 3482.4;
const Z_BAIE = 3489.2;
const Z_FALAISE = 3510;
const Y_FOND = -4;
const Y_TABLETTE = 6;
const Y_LINTEAU = 10.8;
const Y_CIEL = 80;
/** L'éperon, et la baie percée dedans. Le méridien de la salle est x = 210. */
const EP_O = 194;
const EP_E = 226;
const BAIE_O = 205.2;
const BAIE_E = 214.8;
/** Le fond de la passe. Il est haut, et c'est une correction. Voir `terrain`. */
const Y_PASSE = -1;
const MERIDIEN = 210;
/** L'arête de la pièce une fois grandie, et sa portée de dépose : 1,36 + 7,20. */
const PIECE = 3.6;
const GALET = 0.9;

/** Granit mouillé, sel séché, et le rouge d'une bouée. */
const REGION = {
  name: 'rive',
  min: [0, -80, 3400] as V3,
  max: [300, 80, 3600] as V3,
  paper: '#eef1ef',
  colors: ['#dde5e2', '#aebbb7', '#687673', '#b4552c'] as [string, string, string, string],
  ink: '#1a201f',
  brouillard: 300,
};

const b = (min: V3, max: V3, ink = 0, opts: { outline?: boolean } = {}): BoxDef => ({
  min,
  max,
  ink,
  region: 'rive',
  ...opts,
});

/**
 * LE QUAI, LE CHENAL, LA PASSE ET LA FALAISE — quatre nappes, pas une de plus.
 * Leurs DESSOUS sont échelonnés au centième : au même plan, ils feraient des
 * milliers de mètres carrés de faces confondues sous le monde — la leçon de
 * l'escalier, reprise telle quelle.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA PASSE A UN FOND HAUT — UN MÈTRE, PAS QUATRE — ET LE BANC L'A IMPOSÉ APRÈS
 * M'AVOIR REFUSÉ LA CORRECTION ÉVIDENTE.
 *
 * `targeted` teste désormais l'occultation, et **l'œil qu'elle emploie n'est pas
 * celui du rendu** : `hauteur × échelle × 0,6`, soit 4,32 m à ×4 là où les yeux
 * sont à 6,62. Une ligne partie de si bas vers un objet quatre mètres sous le
 * quai replonge sous le sol AVANT d'avoir dépassé la lèvre. Mesuré sur la
 * première version : trente postes au fond de la passe, **neuf invisibles**, une
 * bande de soixante-dix centimètres collée au mur — là même où tombe un galet
 * lâché d'un pas en arrière. Or à ×4 on n'entre pas dans la passe : ce galet-là
 * était perdu pour de bon, et la salle avec lui.
 *
 * J'ai d'abord posé une banquette d'amarrage de 1,20 le long du mur. Le banc a
 * répondu **0 poste sur 30** : en dépassant, elle masquait à son tour tout le
 * fond derrière elle — un rattrapage qui recrée le défaut un mètre plus loin. Le
 * fond REMONTÉ règle les deux d'un coup : 100 postes sur 100 saisissables depuis
 * la lèvre. Elle se remonte à ×1 (1,225 mesuré) et, à ×1/4, on en sort par ses
 * deux bouts en tombant dans le chenal, d'où la grève ramène. Elle reste
 * infranchissable à ×4 pour la seule raison qui compte : 2,40 de large contre un
 * corps de 2,72.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const terrain = (): BoxDef[] => [
  b([0, -40.01, 3400], [300, 0, Z_LEVRE], 0, { outline: false }),
  b([0, -40.02, Z_LEVRE], [300, Y_FOND, Z_FALAISE], 1, { outline: false }),
  b([EP_O, -40.05, Z_LEVRE], [EP_E, Y_PASSE, Z_EPERON], 3),
  b([0, -40.04, Z_FALAISE], [300, Y_CIEL, 3600], 2),
];

/**
 * LA GRÈVE — vingt marches de 0,20, et la hauteur n'est pas décorative.
 *
 * Elle existe pour une seule raison : **un ×1 ne remonte pas quatre mètres**, il
 * n'en monte que 1,225 (mesuré). Un ×4 tombé dans le chenal en ressort partout
 * tout seul ; un ×1 venu regarder l'eau de trop près serait enfermé. Et 0,20
 * plutôt que 0,80 : on PEUT descendre à ×1/4 ici — il suffit d'entrer dans la
 * grande porte en étant déjà petit — et l'on n'y escalade que 0,306. Une marche
 * de 0,20 se monte EN MARCHANT à toutes les tailles du jeu, l'enjambée valant
 * 0,225 même au plus bas ; vérifié aux deux, 3,1 s à ×1 et 12,4 s à ×1/4. Vingt
 * marches m'ont coûté six lignes ; une salle qui enferme au quatrième cran
 * m'aurait coûté la salle. Elle est à l'est, sous le nez de la petite face :
 * c'est là qu'un joueur minuscule se retrouve, donc là qu'il tombera à l'eau.
 */
const greve = (): BoxDef[] =>
  Array.from({ length: 20 }, (_, i) =>
    b(
      [228 + 1.4 * i, -40.1 - 0.001 * i, Z_LEVRE],
      [228 + 1.4 * (i + 1), Y_FOND + 0.2 * (i + 1), Z_FALAISE],
      i % 2 === 0 ? 1 : 2,
      { outline: false },
    ),
  );

/**
 * L'ÉPERON, EN CINQ BLOCS QUI CERNENT UN VIDE.
 *
 * Le vide est la baie : x 205,2→214,8 · y 6,00→10,80 · z 3482,4→3489,2. Les cinq
 * blocs le pavent sans se recouvrir — leurs faces communes sont toujours un
 * `min` contre un `max`, jamais deux `min`, et `facesConfondues` ne compare que
 * les faces DU MÊME CÔTÉ. C'est vérifié, pas espéré.
 *
 * IL MONTE À QUATRE-VINGTS MÈTRES PAR PRÉCAUTION, PAS PAR ALLURE. Une caisse
 * lancée (clic gauche) part à 7 × 1,80 × 4 = 50,4 m/s ; tenue bras levé elle
 * quitte la main à 21,9 m et culmine vers 80. Toute surface horizontale sous
 * cette cote est un endroit où l'on perd la pièce pour de bon. Il n'y en a donc
 * aucune : l'éperon et la falaise montent jusqu'au plafond de la parcelle, et le
 * seul plan horizontal hors du quai est le sol de la baie — là où la pièce doit
 * finir de toute façon.
 *
 * IL FAIT TRENTE-DEUX MÈTRES DE LARGE, ET C'EST LE SECOND VERROU. Depuis l'eau,
 * un géant pose à 8,56 m de lui plus les 4,80 d'accueil du creux, soit 13,36 ;
 * l'eau la plus proche de la serrure est à 17,4 m en x, derrière l'épaisseur de
 * l'éperon. Balayage de 6 × 11 × 16 postes dans le chenal, toutes hauteurs de
 * visée : **zéro pose réussie**. On ne garnit cette serrure que depuis le quai.
 */
const eperon = (): BoxDef[] => [
  b([EP_O, -40.03, Z_EPERON], [BAIE_O, Y_CIEL, Z_FALAISE], 2),
  b([BAIE_E, -40.031, Z_EPERON], [EP_E, Y_CIEL, Z_FALAISE], 2),
  // Sous la baie, la tablette où la pièce se pose ; au-dessus, le linteau et les
  // soixante-neuf mètres qui l'écrasent ; puis le fond — la pièce lâchée depuis
  // la lèvre occupe 3485,4→3489,0, il reste vingt centimètres, et c'est assez.
  b([BAIE_O, -40.032, Z_EPERON], [BAIE_E, Y_TABLETTE, Z_FALAISE], 1),
  b([BAIE_O, Y_LINTEAU, Z_EPERON], [BAIE_E, Y_CIEL, Z_FALAISE], 2),
  b([BAIE_O, Y_TABLETTE, Z_BAIE], [BAIE_E, Y_LINTEAU, Z_FALAISE], 1),
];

/**
 * CE QUI DONNE L'ÉCHELLE, ET RIEN D'AUTRE.
 *
 * Règle 9 : la petite face de la porte interne fait 2,80 et se dresse sur le
 * quai, à vingt-deux mètres à l'est de la serrure, dans le même regard qu'elle.
 * Tout s'y lit : la passe vaut moins d'une porte, la baie s'ouvre à deux portes
 * du sol, la falaise en fait vingt-huit. Rien à estimer. Les bornes d'amarrage
 * ne servent qu'à ça non plus — sans elles, trois cents mètres de quai vus de
 * sept mètres vingt n'ont plus de taille.
 */
const bornes = (): BoxDef[] => [
  b([88, -0.04, 3470], [90.8, 2.2, 3472.8], 3),
  b([148, -0.05, 3474], [150.8, 2.2, 3476.8], 3),
  b([268, -0.06, 3468], [270.8, 2.2, 3470.8], 3),
  // Un bollard couché près des galets : à ×1 c'est un mur, à ×4 un jouet.
  b([236, -0.07, 3448], [244, 1.1, 3450.4], 1),
];

/**
 * LES TROIS GALETS, ET POURQUOI TROIS.
 *
 * Un seul aurait suffi à l'énigme. Trois parce que le clic gauche LANCE, que
 * lancer est le premier geste d'un joueur à qui l'on met un caillou dans les
 * mains, et qu'il existe **un seul endroit du décor d'où un galet ne revient
 * pas** : le fond de la baie. C'est le défaut connu de cette salle, et il est
 * mesuré — passé z = 3484,9, un galet sort du champ de `targeted`, dont l'œil à
 * 4,32 m rase le seuil de la baie. Partout ailleurs tout se rattrape : la passe
 * se repêche du bout des doigts depuis la lèvre (100 postes sur 100, et 154
 * lâchers sur 154), le chenal se descend par la grève, rien ne se pose sur la
 * falaise. Il faut donc rater trois lancers dans un trou de neuf mètres sur
 * quatre pour casser la salle. L'escalier donne quatre cubes pour la même raison.
 *
 * 0,90 EST UN VERROU À DEUX BOUTS. Sous les 0,99 qu'on soulève à ×1, donc un
 * homme l'emporte ; quatre fois trop petit pour la serrure, donc un géant n'en
 * fait rien tant qu'il ne l'a pas passé par la petite face. Et à ×4 sa portée de
 * dépose tombe à 0,34 × 4 + 2 × 0,90 = 3,16 m : le géant ne peut même pas le
 * PRÉSENTER à la serrure. Je le dis franchement — **le creux ne dira donc jamais
 * « trop petit » à qui tient un galet**, sauf à celui qui le lance dans la baie.
 * La leçon ordinaire est visuelle : le galet dans la main, la serrure en face,
 * et un rapport de quatre qui se voit d'un coup d'œil.
 */
const galets = (): CarryableDef[] =>
  ([[232, 0.01, 3456], [229.2, 0.01, 3453.4], [234.8, 0.01, 3454.2]] as V3[]).map((position, i) => ({
    id: `galet-rive-${i + 1}`,
    position,
    size: GALET,
    ink: i === 0 ? 3 : 1,
  }));

export const RIVE: SalleModule = {
  nom: 'rive',
  region: REGION,
  bounds: { min: [0, -80, 3400], max: [300, 80, 3600] },

  boxes: [...terrain(), ...greve(), ...eperon(), ...bornes()],
  carryables: galets(),

  sockets: [
    /**
     * LA SERRURE, ET SES DEUX NOMBRES.
     *
     * `size: 3,60` — c'est-à-dire un galet passé une fois par la petite face, et
     * rien d'autre : 0,90 est refusé à 12 % près, 14,4 aussi. Un seul creux dans
     * la salle, donc la règle 11 ne peut pas être enfreinte ; elle sert quand
     * même, puisque c'est elle qui interdit d'y loger le galet nu.
     *
     * `portee: 4,80` est CALCULÉE, et bornée des deux côtés. Par le bas : le
     * lâcher d'un joueur collé à la lèvre tombe à z = 3487,20, soit 1,40 m
     * devant le creux, et la marge lui ouvre une bande de 4,80 m le long de
     * l'eau — mesuré, 5,6 m en profondeur et 5,6 en travers — au lieu de
     * l'exercice d'adresse que serait un creux serré à huit mètres. Par le
     * haut : **elle doit rester sous 6,00**, la hauteur du sol de la baie, faute
     * de quoi une pièce simplement POSÉE SUR LE QUAI se trouve à moins de
     * `portee` en vertical et se fait happer à travers la pierre. J'ai essayé
     * 6,48 pour élargir la visée : c'est exactement ce qui est arrivé.
     */
    { id: 'serrure-rive', position: [MERIDIEN, Y_TABLETTE, 3485.8], size: PIECE, ink: 3, portee: 4.8 },
  ],

  portals: [
    {
      /**
       * LA PORTE INTERNE — l'erreur et la solution sont le même geste.
       *
       * LA GRANDE FACE regarde l'EST, quarante mètres à l'ouest de la serrure :
       * on y entre en marchant vers l'ouest, c'est-à-dire en rebroussant chemin,
       * en abandonnant — et l'on en ressort grandi POUSSÉ VERS L'EST, le nez sur
       * l'éperon qu'on doit garnir. La porte remet elle-même le joueur dans le
       * sens de la marche ; c'est la correction que l'autrice de l'escalier a
       * payée au banc et que je n'ai eu qu'à copier.
       *
       * LA PETITE FACE regarde le SUD : on en sort en s'éloignant de l'eau, vers
       * les galets, et le premier pas naturel ne la refranchit donc pas. Il faut
       * se retourner pour redevenir grand — un changement de taille se demande.
       *
       * ELLE NE SE FRANCHIT PAS À ×4 (2,80 contre 7,20), ce qui rend sa position
       * sans danger : le géant qui la traverse par mégarde n'existe pas. La
       * grande admet tout le monde ; un joueur déjà petit qui y entre descend à
       * ×1/4, ce qui ne casse rien — la grève se monte à cette taille aussi — et
       * se défait en refranchissant la petite. `smallHeight: 2,80` est la cote
       * canonique : le mètre-ruban du monde, contre lequel la salle se lit.
       */
      id: 'rive-marnage',
      colorBig: 0x687673,
      colorSmall: 0xb4552c,
      smallHeight: 2.8,
      smallWidth: 1.9,
      big: { position: [170, 0.01, 3462], yaw: Math.PI / 2 },
      small: { position: [232, 0.01, 3468], yaw: Math.PI },
    },
  ],

  /**
   * LE PINCEAU. Tout tient sur le quai et au-dessus de l'eau : aucune station
   * n'est derrière une paroi ni derrière une porte, les deux faces de la porte
   * interne étant sur la même rive. **`stationsPorte` est donc inutile ici**, et
   * je l'ai vérifié station par station plutôt que de l'omettre par oubli — la
   * troisième entre dans la baie par sa gueule, en ligne droite depuis la
   * deuxième, sans traverser un centimètre de pierre.
   */
  stations: [
    [40, 9, 3444],
    [MERIDIEN, 9, 3476],
    [MERIDIEN, 8.4, 3484],
    [232, 5, 3457],
    [170, 6.5, 3462],
    [MERIDIEN, 3.5, 3477],
  ],

  /**
   * LE RACCORD.
   *
   * `echelle` EST UN PALIER : 1 = ×4. On entre géant et l'on sort géant — la
   * salle ne change pas d'étage, elle change de POINT DE VUE, et la porte
   * interne fait l'aller-retour au-dedans.
   *
   * On entre tout à l'ouest, à cent quatre-vingts mètres de la serrure, là où le
   * chenal fait ses trente mètres pleins : la première image est de l'eau et une
   * falaise, et l'on ne sait pas encore qu'elle a une serrure. On sort au
   * méridien, vingt-deux mètres au sud de la lèvre, dos à l'eau — à l'endroit
   * exact d'où l'on vient de tendre le bras.
   */
  entree: { position: [26, 0.05, 3428], echelle: 1 },
  sortie: { position: [MERIDIEN, 0.05, 3458], echelle: 1 },
};
