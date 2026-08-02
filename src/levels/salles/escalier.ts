import type { BoxDef, CarryableDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * L'ESCALIER POUR PLUS TARD — *construire pour une taille qu'on n'a pas.*
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA CHAÎNE, NOIR SUR BLANC. C'est la salle entière, et rien d'autre.
 *
 *   1. On arrive À ×4, EN HAUT de la falaise. On mesure 7,20 m ; la falaise en
 *      fait 3,60. C'est une marche. Il n'y a rien à résoudre — et c'est le
 *      piège du lieu, parce qu'il n'y a rien à résoudre MAINTENANT.
 *   2. Quatre cubes de 0,80 traînent au bord. À cette taille ce sont des
 *      galets : on les ramasse à la main et on les jette en bas.
 *   3. On franchit LA GRANDE FACE de la porte interne, plantée sur le plateau.
 *      On ressort par LA PETITE FACE, plantée douze mètres plus loin dans la
 *      trouée du parapet, À ×1 et TOUJOURS EN HAUT.
 *   4. On se retourne. La falaise fait maintenant deux fois notre taille, et
 *      nos quatre « marches » sont quatre îlots posés au hasard du plancher.
 *   5. On redescend par l'escalier qu'on a bâti — et surtout on REMONTE par
 *      lui, ce qui est le vrai service qu'il rend.
 *   6. La porte de sortie de la salle est au pied de la falaise, et elle se
 *      franchit à ×1. C'est l'assemblage qui la plante ; ici on ne déclare que
 *      le point.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CE QUE LA SALLE REVISITE (règle 8). C'est LA FALAISE DU CONDUIT, retournée.
 * Là-bas, on tombait de quarante-deux mètres et la mesure décidait si l'on
 * attrapait la vire. Ici la paroi ne fait que trois mètres soixante, la chute
 * est gratuite, et c'est justement pour ça qu'elle est difficile : on ne peut
 * pas se planter, donc rien ne prévient. Le conduit punissait la vitesse ;
 * celle-ci punit l'inattention à l'échelle, qui est le sujet du jeu.
 *
 * LE LIEU, EN COUPE (le nord est à droite, vers le plateau) :
 *
 *   y =  1,40                              ┌──── parapet ────┐
 *   y =  0,00  ── LE BAS (×1) ──┐          │ LE PLATEAU (×4) │
 *   y = -0,60  ─────── vire B ──┤ 3,60     └─ trouée de 14 m ┘
 *   y = -2,10  ─────── vire A ──┤   de     ↑ la petite face y est plantée
 *   y = -3,60  ─────────────────┘ falaise  ↑ l'étalon de 2,80 (règle 9)
 *              └── 82 m de plancher nu ──┘
 *
 * LES DEUX VIRES SONT CONTINUES SUR TOUTE LA PAROI. On peut donc bâtir son
 * escalier n'importe où sur cent soixante-seize mètres de falaise : rien n'est
 * balisé, rien n'est réservé, et c'est ce qui rend la salle belle. On n'y loge
 * rien nulle part — pas un `socket`, pas un creux, pas une bonne place.
 */

type V3 = [number, number, number];

/**
 * L'ARITHMÉTIQUE DE LA FALAISE, ET ELLE M'A SURPRIS.
 *
 * Une marche est INFRANCHISSABLE à ×1 dès qu'elle dépasse le saut, 1,29. Elle
 * redevient franchissable si l'on pose un cube de 0,80 devant : on monte 0,80
 * sur le cube (sous l'enjambée de 0,90), puis `hauteur − 0,80` sur la marche,
 * ce qui exige `hauteur ≤ 1,70`. Une marche à cube vaut donc entre 1,30 et
 * 1,70, et l'on ne discute pas.
 *
 * TROIS MARCHES DE CE GENRE COÛTERAIENT AU MINIMUM 3,90 m. LA FALAISE EN FAIT
 * 3,60. Une falaise de 3,60 n'admet donc, de façon absolue, QUE DEUX marches à
 * cube. J'ai dessiné trois vires avant de faire cette addition, et les trois ne
 * pouvaient pas exister ensemble.
 *
 * D'où : 1,50 + 1,50 + 0,60 = 3,60.
 *   — 1,50 dépasse le saut de 21 cm (16 %), assez pour qu'on ne l'attrape
 *     jamais par accident en s'acharnant ;
 *   — 1,50 − 0,80 = 0,70, sous l'enjambée de 0,90 avec 20 cm de marge ;
 *   — la dernière, 0,60, est offerte : la falaise donne toujours sa dernière
 *     marche, et ça se sent en montant.
 *
 * L'escalier fini se lit donc : 0,80 · 0,70 · 0,80 · 0,70 · 0,60. Cinq marches
 * dont aucune n'atteint l'enjambée. C'est exactement « des marches de 0,80 »,
 * et personne n'a eu à le dire au joueur.
 */
const BAS = -3.6;
const VIRE_A = -2.1;
const VIRE_B = -0.6;
const HAUT = 0;

/** Le cube. 0,80 : sous 0,99 qu'on soulève à ×1, sous 3,96 qu'on soulève à ×4. */
const CUBE = 0.8;

/** Les bornes en x du lieu, et le méridien de la trouée. */
const X_O = -268;
const X_E = -92;
const TROUEE_O = -222;
const TROUEE_E = -208;
/** Le milieu de la trouée : c'est là qu'on ressort petit, et là qu'on bâtit. */
const MERIDIEN = -215;

/** Les quatre plans en z qui font la falaise. Le sud est en bas de la coupe. */
const Z_PIED = 1986;
const Z_A = 1988.6;
const Z_B = 1991.2;

/** Craie sèche, lichen gris, et le rouge d'un piquet de géomètre oublié. */
const REGION = {
  name: 'escalier',
  min: [-300, -40, 1900] as V3,
  max: [-60, 120, 2140] as V3,
  paper: '#f2eee4',
  colors: ['#e7e1d2', '#c6bda7', '#7e7a6a', '#c05a38'] as [string, string, string, string],
  ink: '#211e19',
  brouillard: 220,
};

const b = (min: V3, max: V3, ink = 0, opts: { outline?: boolean } = {}): BoxDef => ({
  min,
  max,
  ink,
  region: 'escalier',
  ...opts,
});

/**
 * LE SOL, EN QUATRE NAPPES QUI S'ABOUTENT.
 *
 * Elles partagent leurs faces en x — toutes vont de X_O à X_E — mais jamais
 * leur recouvrement : leurs tranches en z se touchent sans se chevaucher, donc
 * l'aire commune est nulle et `facesConfondues` n'a rien à dire. En revanche
 * leurs DESSOUS étaient tous à −12,00 dans la première version, et ça faisait
 * quinze mille mètres carrés de faces confondues sous le monde. D'où les deux
 * centimètres d'écart entre chacune : −12,00 / −12,02 / −12,04 / −12,06.
 * Personne ne verra jamais ces dessous ; le vérificateur, lui, les voyait.
 *
 * LES DEUX VIRES FONT 2,60 DE LARGE, et ce nombre a été corrigé. Elles en
 * faisaient 1,30 : un cube de 0,80 posé contre la paroi n'y laissait que 0,50
 * de dégagement, et le joueur — 0,68 de large à ×1 — ne pouvait pas se tenir
 * devant son propre cube pour monter dessus. À 2,60 il lui reste 1,80 de vire
 * libre, soit deux fois et demie sa largeur.
 */
const terrain = (): BoxDef[] => [
  // Le plancher du bas. Quatre-vingt-deux mètres de nu vers le sud, et c'est
  // une mesure de sécurité, pas un vide : voir LE PIÈGE DES QUATORZE MÈTRES.
  b([X_O, -12.0, 1904], [X_E, BAS, Z_PIED], 0, { outline: false }),
  // La vire basse, puis la haute. Ce sont les deux seules lignes d'encre du
  // lieu, et elles disent la falaise entière d'un coup d'œil depuis le bas.
  b([X_O, -12.02, Z_PIED], [X_E, VIRE_A, Z_A], 1),
  b([X_O, -12.04, Z_A], [X_E, VIRE_B, Z_B], 2),
  // Le plateau. Cent trente-cinq mètres de profondeur : à ×4 c'est un champ,
  // à ×1 ce serait un pays.
  b([X_O, -12.06, Z_B], [X_E, HAUT, 2126], 0, { outline: false }),
];

/**
 * LE PARAPET, ET IL FAIT DEUX MÉTIERS.
 *
 * Le premier est celui du contrat des régions : on protège le vide. Le second
 * est le vrai. Il mesure 1,40 — au-dessus du saut de 1,29 à ×1, très au-dessous
 * de l'enjambée de 3,60 à ×4. Un géant l'enjambe sans le voir ; un homme ne le
 * franchit nulle part. Il est posé EN RETRAIT du bord, si bien que le joueur
 * devenu petit ne peut plus s'approcher de la falaise que par LA TROUÉE — celle
 * où il vient de naître, celle où son escalier commence.
 *
 * Il ne ferme rien pour autant, et c'est délibéré : par la trouée, un joueur à
 * ×1 peut toujours se laisser tomber les 3,60 m. Rien dans ce moteur ne blesse
 * une chute (vérifié : il n'existe ni dégâts ni réapparition dans `physics.ts`),
 * donc PRÉTENDRE INTERDIRE LA DESCENTE SERAIT UN MENSONGE. Le parapet ne la
 * rend pas impossible, il la rend délibérée : il faut aller la chercher, à
 * l'endroit précis où l'on avait justement quelque chose à bâtir.
 */
const parapet = (): BoxDef[] => [
  b([X_O, -0.05, 1993.0], [TROUEE_O, 1.4, 1993.6], 2),
  b([TROUEE_E, -0.05, 1993.0], [X_E, 1.4, 1993.6], 2),
  // Deux bornes de pierre marquent la trouée. Elles montent à 2,20 : à ×4 elles
  // arrivent au genou et signalent, à ×1 elles encadrent. Elles MORDENT sur le
  // parapet de soixante centimètres — posées bout à bout, leurs flancs se
  // seraient disputé le même plan sur trois mètres carrés.
  b([-222.6, -0.06, 1992.7], [-221.4, 2.2, 1993.9], 3),
  b([-208.6, -0.08, 1992.66], [-207.4, 2.24, 1993.86], 3),
];

/**
 * L'ÉBOULIS — LA REMONTÉE, ET VOICI POURQUOI C'EST CELLE-LÀ.
 *
 * Le contrat interdit la salle-piège avant tout le reste. Deux réponses étaient
 * possibles ; j'ai pris la première et refusé la seconde.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * REFUSÉ — planter la petite face de la porte interne EN BAS de la falaise.
 * C'était la solution élégante : on rapetisse, on naît en bas, on remonte en
 * repassant la face à l'envers, et rien ne peut mal tourner. Sauf que
 * RAPETISSER DEVIENDRAIT ALORS UN ASCENSEUR : le joueur se retrouve en bas,
 * devant la porte de sortie, sans avoir jamais eu besoin de son escalier. La
 * salle tout entière disparaît le jour où on l'écrit comme ça.
 *
 * CHOISI — un éboulis, très loin, qui se remonte à pied à ×1.
 * Cinq gradins de 0,72 (sous l'enjambée de 0,90) sur 3,4 m de giron chacun,
 * appuyés contre la paroi À SOIXANTE-DIX-HUIT MÈTRES À L'EST de la trouée. Il
 * se monte et se descend à toutes les tailles, il ne se voit pas depuis
 * l'escalier, et il coûte cent soixante mètres aller-retour à qui n'a pas bâti.
 * C'est exactement la règle 10 : se tromper coûte du temps, jamais la partie.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Oui, il permet aussi de DESCENDRE à ×1 sans un seul cube. Je l'assume : une
 * pente qui monte est une pente qui descend, et il n'existe pas de chemin à
 * sens unique dans ce moteur. L'escalier reste le chemin court, celui qu'on a
 * sous les pieds, et le seul qu'on ait fait soi-même.
 *
 * Les cinq gradins se rétrécissent d'un mètre huit de chaque côté en montant :
 * c'est la forme d'un vrai cône d'éboulis, et surtout ça évite que leurs cinq
 * flancs ouest s'empilent dans le même plan sur vingt mètres carrés.
 */
const eboulis = (): BoxDef[] => {
  const out: BoxDef[] = [];
  // Les dessus : −2,88 / −2,16 / −1,44 / −0,72 / −0,02. Le dernier gradin
  // s'arrête deux centimètres sous le plateau, ce qui est à la fois la marche
  // gratuite qui finit la montée et la garantie qu'aucun dessus ne partage un
  // plan avec le plateau lui-même.
  const dessus = [-2.88, -2.16, -1.44, -0.72, -0.02];
  for (let i = 0; i < 5; i++) {
    out.push(
      b(
        [-141 + 0.9 * i, -4.2 - 0.02 * i, 1974 + 3.4 * i],
        [-103 - 0.9 * i, dessus[i], 1992.6 + 0.02 * i],
        i % 2 === 0 ? 1 : 2,
      ),
    );
  }
  return out;
};

/**
 * CE QU'ON N'A PAS À REGARDER. Trois rochers en bas, deux affleurements en
 * haut. Aucune fonction, et c'est le but : sans eux, un plancher de quatre-
 * vingts mètres à ×4 n'a plus d'échelle du tout et l'on ne sait plus si l'on
 * marche ou si l'on glisse.
 *
 * TOUS SONT TENUS HORS DU COULOIR DE POSE — x de −240 à −190, z de 1965 à 1986
 * — pour la raison expliquée juste en dessous.
 */
const cailloux = (): BoxDef[] => [
  b([-260, -3.9, 1930], [-254.4, -2.35, 1936.2], 2),
  b([-172, -3.92, 1949], [-165.5, -1.95, 1955.8], 1),
  b([-118, -3.94, 1918], [-110.2, -2.55, 1925.4], 2),
  // Une dalle affleurante sur le plateau : 0,62, sous l'enjambée à ×1, rien du
  // tout à ×4. On la traverse sans y penser dans les deux sens.
  b([-198, -0.03, 2010], [-186.4, 0.62, 2021.5], 1),
  // Et le gros bloc de l'entrée, à 2,85 : c'est le premier étalon de la salle.
  // Le joueur qui arrive à ×4 lui arrive à mi-cuisse ; le même bloc, revu à ×1
  // une minute plus tard, est un mur. Rien n'a bougé.
  b([-155, -0.04, 2085], [-146.2, 2.85, 2093.6], 2),
];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LE PIÈGE DES QUATORZE MÈTRES, ET COMMENT JE M'EN SUIS ASSURÉ.
 *
 * On repose ce qu'on porte à DEUX FOIS SA TAILLE DEVANT SOI. À ×4 cela fait
 * 14,4 m. Un joueur de sept mètres vingt qui lâche un cube au bord de la
 * falaise ne le pose pas au pied de la falaise : il le lance quatorze mètres
 * plus loin, en terrain découvert. C'est le nombre qui a déjà tué une salle du
 * projet sans que rien ne le laisse voir, et c'est le piège n° 1 d'ici.
 *
 * TROIS VÉRIFICATIONS, DANS L'ORDRE :
 *
 * 1. OÙ TOMBE UN CUBE LÂCHÉ DEPUIS LE HAUT ? Le bord est en z = 1991,2 ; face
 *    au sud, le cube part à z ≈ 1976,8. Le plancher du bas court de 1904 à
 *    1986 : le point d'arrivée est donc à SOIXANTE-DOUZE MÈTRES du bord sud, en
 *    pleine dalle, sans un trou ni une arête à moins de trente mètres. Aucun
 *    lâcher depuis le haut ne peut perdre un cube.
 *
 * 2. PEUT-ON, À ×4, POSER UN CUBE CONTRE LA PAROI ? Oui, et c'est là que la
 *    largeur du plancher devient une contrainte et non un décor : il faut
 *    pouvoir se tenir à 14,4 m de la paroi en la regardant. Le plancher offre
 *    82 m de recul depuis z = 1986 — cinq fois et demie ce qu'il faut. La
 *    première version lui en donnait dix-huit, et à ×4 c'était déjà une salle
 *    où l'on ne pouvait pas travailler.
 *
 * 3. ET SI UN CUBE ATTERRIT SUR UNE VIRE ? Il n'est pas perdu non plus. À ×4 le
 *    bras porte à 11,52 m et les deux vires sont à 0,60 et 2,10 sous le plateau
 *    : on les ramasse depuis le haut sans descendre. C'est d'ailleurs le seul
 *    endroit de la salle où être grand sert à récupérer quelque chose.
 *
 * ET LE MÊME NOMBRE, À ×1 : on repose à 3,6 m devant soi. C'est pour ça que la
 * VRAIE construction se fait petit et non grand — on vise au décimètre au lieu
 * du décamètre — et c'est pour ça que les cubes font 0,80 et non 1,20 : à 0,80
 * ils restent sous les 0,99 qu'on soulève à ×1, donc l'erreur se répare des
 * deux côtés de la porte. C'est la seule indulgence de la salle, et elle est
 * volontaire.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const cubes = (): CarryableDef[] =>
  // Ils sont posés EN HAUT, en tas devant la trouée, et non au pied de la
  // falaise. C'est ce qui fait exister l'erreur : à ×4 le tas se ramasse en
  // quatre gestes, et l'on jette sans y penser. Personne ne fait quatre voyages
  // en réfléchissant à ce qu'il n'a pas encore mesuré.
  (
    [
      [-219.0, 0.01, 1997.4],
      [-214.2, 0.01, 1999.8],
      [-210.6, 0.01, 1996.2],
      [-216.8, 0.01, 2002.6],
    ] as V3[]
  ).map((position, i) => ({
    id: `cube-escalier-${i + 1}`,
    position,
    size: CUBE,
    ink: i % 2 === 0 ? 3 : 1,
  }));

export const ESCALIER: SalleModule = {
  nom: 'escalier',
  region: REGION,
  bounds: { min: [-300, -40, 1900], max: [-60, 120, 2140] },

  boxes: [...terrain(), ...parapet(), ...eboulis(), ...cailloux()],

  carryables: cubes(),

  // PAS DE `sockets`, ET C'EST LE CŒUR DE LA SALLE. Nulle part on ne dit au
  // joueur où poser un cube ; il n'y a ni creux, ni marque, ni bonne place. La
  // seule chose qui juge son travail est la hauteur de son pas. Une salle de
  // disposition libre ne peut pas vérifier — elle peut seulement être vraie.

  portals: [
    {
      /**
       * LA PORTE INTERNE. Ses deux faces sont EN HAUT, et l'écart entre elles
       * est le seul luxe de la salle : soixante-dix-huit mètres, si bien qu'on
       * ne peut pas les confondre ni les franchir par accident, et si bien
       * qu'aucune ne se dispute un plan avec la porte de sortie, plantée trois
       * mètres soixante plus bas et trente mètres plus à l'ouest.
       *
       * `smallHeight: 2,80` — c'est l'étalon de la règle 9, et il ne mesure pas
       * le joueur : il mesure LA FALAISE. Debout dans la trouée, la petite face
       * et la paroi sont côte à côte, 2,80 contre 3,60. On voit d'un coup que
       * la falaise vaut une porte et un quart, c'est-à-dire deux fois sa propre
       * taille, c'est-à-dire non. Personne n'a besoin qu'on le lui dise.
       *
       * La GRANDE face en fait quatre fois plus — 11,20 × 7,60 — et c'est celle
       * qu'on franchit pour rapetisser. Elle est plantée en plein plateau, sans
       * rien au-dessus : PAS DE LINTEAU, ici ni ailleurs dans cette salle. Le
       * défaut de catapulte documenté dans MESURES.md ne peut pas se déclencher
       * sur un passage à ciel ouvert, et c'était le moyen le plus simple de le
       * contourner plutôt que de le combattre.
       */
      id: 'escalier-rapetisser',
      colorBig: 0x7e7a6a,
      colorSmall: 0xc05a38,
      smallHeight: 2.8,
      smallWidth: 1.9,
      // On la franchit en marchant vers le sud, c'est-à-dire vers la falaise
      // qu'on vient de regarder de haut.
      big: { position: [-180, 0.01, 2062], yaw: 0 },
      // Et l'on ressort ici, dans la trouée, DOS À LA FALAISE. Le premier geste
      // du joueur devenu petit est donc de se retourner — et c'est à cet
      // instant que la salle se déclare.
      small: { position: [MERIDIEN, 0.01, 1992.4], yaw: 0 },
    },
  ],

  stations: [
    // Le Pinceau vole, donc il coupe droit ; mais il descend AVEC le joueur, et
    // il s'arrête au ras de la vire A — là où il faudra poser le second cube.
    [-180, 7.0, 2106],
    [-180, 5.5, 2064],
    [MERIDIEN, 3.2, 1994.5],
    [MERIDIEN, -1.2, 1984],
    [-245, -1.8, 1969],
  ],

  /**
   * LE RACCORD.
   *
   * `echelle` EST UN PALIER : 1 = ×4, 0 = ×1. Ce n'est pas un multiplicateur, et
   * c'est la faute la plus facile du projet — écrire `0.25` en pensant à ×1/4.
   *
   * On entre à 1, donc à sept mètres vingt, au nord du plateau : la falaise est
   * à cent vingt mètres devant, invisible derrière sa propre courbure de
   * plateau, et l'on ne comprend pas encore qu'on est arrivé au-dessus de
   * quelque chose.
   *
   * On sort à 0, donc à un mètre quatre-vingts, AU PIED de la paroi : vingt
   * mètres de plancher devant elle, trente à l'ouest du méridien de la trouée.
   * Ces trente mètres ne sont pas décoratifs — ils tiennent la porte de sortie
   * hors du couloir de pose des cubes (x de −240 à −190), pour qu'aucun cube
   * lâché à ×4 ne vienne jamais s'échouer dans son plan.
   */
  entree: { position: [-180, 0.05, 2112], echelle: 1 },
  sortie: { position: [-245, -3.55, 1969], echelle: 0 },
};
