import type { BoxDef, CarryableDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * L'ESCALIER POUR PLUS TARD — *construire pour une taille qu'on n'a pas.*
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LA CHAÎNE, NOIR SUR BLANC. On ne DESCEND pas l'escalier : on le REMONTE.
 *
 *   1. On arrive à ×4, sur le plateau. Quatre cubes de 0,80 traînent au bord
 *      de la fosse : à sept mètres vingt ce sont des galets, on les jette en
 *      bas d'un revers de main. On les espace à l'œil — à SON œil.
 *   2. On franchit la grande face de la porte interne. On ressort à ×1 PAR LA
 *      PETITE FACE, PLAQUÉE CONTRE LA PAROI OUEST DE LA FOSSE, trente mètres
 *      en contrebas de tout. Premier regard vers l'est, et il dit tout :
 *      quatre îlots, des gouffres.
 *   3. Au fond de la fosse s'ouvre une galerie, sous la butte. On y va, on y
 *      prend le jeton — 0,20, on le porte sans peine — et l'on revient.
 *   4. ET LÀ ON EST COINCÉ. La fosse fait 3,60, ses deux vires font 1,50
 *      chacune, et 1,50 est au-dessus du saut de 1,29. C'est mesuré, pas
 *      supposé : 180 montées, aucune sans cube. La seule sortie est l'escalier
 *      qu'on a bâti tout à l'heure, en pensant à la mauvaise taille. Les cubes
 *      sont là, avec nous ; on les rapproche à la main.
 *   5. On remonte, on loge le jeton dans le creux du plateau, et LA SORTIE
 *      DE LA SALLE EST EN HAUT, à ×1.
 *
 * La loi ne change pas d'un mot : on a pensé à la taille qu'on avait, pas à
 * celle qu'on allait avoir. Mais le verrou, lui, est devenu vrai — sauter dans
 * un trou n'a jamais demandé d'escalier à personne ; en sortir, si.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CE QUE LA SALLE REVISITE (règle 8) : LE CONDUIT, mis à l'envers. Là-bas on
 * tombait de quarante-deux mètres et la mesure décidait si l'on attrapait la
 * vire ; ici la paroi ne fait que 3,60 et la chute est gratuite — c'est la
 * remontée qui se paie, et elle se paie en prévoyance.
 *
 * LE LIEU, EN COUPE. Le nord (le plateau) est à droite :
 *
 *   y = 11,00  ███ LA BUTTE ███
 *   y =  0,00  ███████████████┬── toit ──┬───────────┬─── LE PLATEAU ────
 *   y = -1,00  ███ le jeton ██│          │           │   ← trouée, creux,
 *   y = -0,60  ███ est ici ███│  2,60 m  │      ┌────┘     sortie, à ×1
 *   y = -2,10  ███████████████│   sous   │  ┌───┘ vire B
 *   y = -3,60  ───────────────┴─plafond──┴──┘ vire A   ← LA FOSSE, 3,60
 *              └── galerie, 44 m ──┘└── fosse, 24 m ──┘
 *
 * LES DEUX VIRES SONT CONTINUES SUR LES CENT MÈTRES DE PAROI : on bâtit son
 * escalier où l'on veut. Rien n'est balisé, rien n'est réservé, on ne loge rien
 * dans la fosse — pas un creux, pas une marque, pas une bonne place. Le seul
 * juge est la hauteur de son propre pas.
 */

type V3 = [number, number, number];

/**
 * L'ARITHMÉTIQUE DE LA FOSSE, ET ELLE M'A FAIT REDESSINER.
 *
 * Une marche est infranchissable à ×1 dès qu'elle dépasse le saut, 1,29. Elle
 * redevient franchissable si l'on pose un cube de 0,80 devant : 0,80 sur le
 * cube (sous l'enjambée de 0,90), puis `hauteur − 0,80`, ce qui exige
 * `hauteur ≤ 1,70`. Une marche à cube vaut donc entre 1,30 et 1,70. TROIS
 * MARCHES DE CE GENRE COÛTERAIENT 3,90 m AU MINIMUM ; la fosse en fait 3,60.
 * Elle n'en admet donc, absolument, QUE DEUX. J'avais dessiné trois vires avant
 * de faire cette addition.
 *
 * D'où 1,50 + 1,50 + 0,60 = 3,60. Deux cubes suffisent — vérifié au banc, la
 * montée se fait en marchant, sans un saut — et l'on en donne quatre parce
 * qu'à ×4 on vise au décamètre et qu'un cube tombé de travers ne doit jamais
 * coûter un aller-retour. L'escalier fini se lit 0,80 · 0,70 · 0,80 · 0,70 ·
 * 0,60 : cinq marches dont aucune n'atteint l'enjambée. C'est « des marches de
 * 0,80 », et personne n'a eu à le dire.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * « ESPACÉES DE MOINS D'UN MÈTRE » EST UNE MESURE, PAS UNE FORMULE.
 *
 * 180 montées simulées : un joueur à ×1 court, sprinte et saute vers la vire,
 * cube posé à `d` mètres de la paroi. Six départs, trois cadences de saut.
 *
 *   d = 0     18/18   et la montée se fait EN MARCHANT, sans un saut
 *   d = 0,50  18/18   idem, en marchant
 *   d = 0,75  13/18   en marchant : échec. Le sprint-saut sauve encore
 *   d = 1 à 5  4-7/18 loterie. Ce n'est pas un chemin, c'est du bruit
 *   d ≥ 6      0/18   franc, net, définitif
 *
 * La paroi ne tolère qu'un DEMI-MÈTRE de jeu : au-delà on monte sur son cube et
 * l'on retombe dans la fente restée entre le cube et la pierre. C'est ça, un
 * îlot, et c'est ça qu'on ne voit pas avec des yeux de sept mètres vingt.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const FOND = -3.6;
const VIRE_A = -2.1;
const VIRE_B = -0.6;

/** 0,80 : sous les 0,99 qu'on soulève à ×1, sous les 3,96 à ×4. */
const CUBE = 0.8;
/** Le jeton, et sa taille est un verrou. Voir LE JETON NE REMONTE PAS SEUL. */
const JETON = 0.2;
const X_O = -268;
const X_E = -92;
/** La fosse et la galerie sont creusées entre ces deux méridiens. */
const F_O = -250;
const F_E = -150;
/** La trouée du parapet, et son milieu — le méridien de la salle. */
const TROUEE_O = -222;
const TROUEE_E = -208;
const MERIDIEN = -215;

/** Les plans en z, du sud (fond de la galerie) au nord (le plateau). */
const Z_BOUT = 1908;
const Z_TOIT = 1941;
const Z_BOUCHE = 1952;
const Z_PAROI = 1976;
const Z_A = 1978.6;
const Z_B = 1981.2;

/** Craie sèche, lichen, et le rouge d'un piquet de géomètre oublié. */
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
 * LE SOL, EN DIX NAPPES QUI S'ABOUTENT SANS JAMAIS SE RECOUVRIR.
 *
 * Toutes partagent des plans — cinq d'entre elles ont leur dessus à 0,00 — mais
 * jamais avec recouvrement : leurs tranches se touchent bord à bord, l'aire
 * commune est nulle et `facesConfondues` n'a rien à dire. Leurs DESSOUS, eux,
 * étaient tous à −12,00 : quinze mille mètres carrés de faces confondues sous
 * le monde, que personne n'aurait vues et que le vérificateur voyait très bien.
 *
 * LES DEUX VIRES FONT 2,60 DE LARGE, et c'est une correction. Elles en
 * faisaient 1,30 : un cube de 0,80 posé contre la paroi n'y laissait que 0,50
 * de dégagement, et le joueur — 0,68 de large à ×1 — ne pouvait pas se tenir
 * devant son propre cube pour monter dessus. À 2,60 il lui reste 1,80.
 */
const terrain = (): BoxDef[] => [
  // Le plateau, en trois morceaux qui cernent le trou. Le monde du géant.
  b([X_O, -12.06, Z_B], [X_E, 0, 2126], 0, { outline: false }),
  b([X_O, -12.07, 1904], [F_O, 0, Z_B], 0, { outline: false }),
  b([F_E, -12.08, 1904], [X_E, 0, Z_B], 0, { outline: false }),
  // LA BUTTE : onze mètres de roche pleine au-dessus de la galerie. Elle n'est
  // pas décorative — elle est LA SERRURE, et sa hauteur est calculée plus bas.
  b([F_O, -12.09, 1904], [F_E, 11.02, Z_BOUT], 2),
  b([F_O, -1, Z_BOUT], [F_E, 11, Z_TOIT], 2),
  // Le toit de l'avant-galerie, dessous à −1,00 : le plafond est donc à 2,60 du
  // sol, soit 0,80 AU-DESSUS DE LA TÊTE d'un joueur de 1,80. Aucun contact avec
  // le linteau, donc la catapulte de MESURES.md ne peut pas se déclencher —
  // c'est pour ça, et pas pour l'allure, que ce toit est si haut.
  b([F_O, -1, Z_TOIT], [F_E, 0, Z_BOUCHE], 1),
  // Le sol de la galerie, puis celui de la fosse : même niveau, deux boîtes.
  b([F_O, -12.1, Z_BOUT], [F_E, FOND, Z_BOUCHE], 1, { outline: false }),
  b([F_O, -12.11, Z_BOUCHE], [F_E, FOND, Z_PAROI], 0, { outline: false }),
  // Les deux vires, continues sur les cent mètres de paroi.
  b([F_O, -12.12, Z_PAROI], [F_E, VIRE_A, Z_A], 1),
  b([F_O, -12.13, Z_A], [F_E, VIRE_B, Z_B], 2),
];

/**
 * LE PARAPET, ET IL FAIT DEUX MÉTIERS.
 *
 * Le premier est celui du contrat des régions : on protège le vide. Le second
 * est le vrai. Il mesure 1,40 — au-dessus du saut de 1,29 à ×1, très au-dessous
 * de l'enjambée de 3,60 à ×4. Mesuré : à ×1, en sprintant et en sautant, on
 * s'arrête le nez dessus et l'on culmine à 1,22 ; à ×4, on passe par-dessus
 * sans que la vitesse baisse. Un géant l'enjambe sans le voir, un homme ne le
 * franchit nulle part — il ne s'ouvre qu'à LA TROUÉE, quatorze mètres, par où
 * l'on saute et par où l'on ressort. Deux bornes de 2,20 la signalent de loin,
 * et elles MORDENT sur le parapet de soixante centimètres, faute de quoi leurs
 * flancs se disputeraient le même plan.
 *
 * Entre le parapet et la lèvre, 2,80 m de banquette. C'est une correction : à
 * 1,40 elle était trop étroite pour qu'on longe la lèvre en cherchant le haut
 * de son escalier, et l'on ne sort pas d'une fosse en marchant sur un fil.
 */
const parapet = (): BoxDef[] => [
  b([F_O, -0.05, 1984], [TROUEE_O, 1.4, 1984.6], 2),
  b([TROUEE_E, -0.05, 1984], [F_E, 1.4, 1984.6], 2),
  b([-251.4, -0.05, Z_BOUCHE], [-250.8, 1.4, Z_B], 2),
  b([-149.2, -0.05, Z_BOUCHE], [-148.6, 1.4, Z_B], 2),
  b([F_O, -0.05, 1949.8], [F_E, 1.4, 1950.4], 2),
  b([-222.6, -0.06, 1983.7], [-221.4, 2.2, 1984.9], 3),
  b([-208.6, -0.08, 1983.66], [-207.4, 2.24, 1984.86], 3),
];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LE JETON NE REMONTE PAS SEUL, ET C'EST LA BUTTE QUI L'INTERDIT.
 *
 * `Carryables.targeted` ne fait AUCUN test d'occultation : une distance et un
 * cône de visée, rien de plus (`if (dist > reach + c.size * 0.5) continue;`).
 * On ramasse donc À TRAVERS LA ROCHE tout ce qui est à portée — et à ×4 la
 * portée vaut 1,80 × 4 × 1,60 = 11,52 m.
 *
 * Si le toit de la galerie était plat, un géant debout dessus serait à 3,59 m
 * du jeton, à travers un mètre de pierre, et il le cueillerait sans jamais
 * rapetisser. LA SALLE ENTIÈRE SERAIT MORTE, et rien dans le décor ne l'aurait
 * laissé voir : c'est le même genre de défaut que les quatorze mètres, une
 * constante de moteur qui traverse la géométrie sans la regarder.
 *
 * D'où la butte : onze mètres de roche pleine au-dessus du jeton. Les quatre
 * postes ×4 les plus proches ont été passés à `targeted`, et les quatre
 * répondent « hors de portée » — sommet de la butte à l'aplomb (14,59 m),
 * lisière du toit (19,3), fond de la fosse à la bouche (30), plateau ouest
 * (50). Un ×1 posté à deux mètres dans la galerie, lui, l'atteint. Et personne
 * ne grimpe la butte : onze mètres contre un saut de 5,18 à ×4.
 *
 * L'AUTRE VERROU EST LA TAILLE. `simulation.ts` fait
 * `held.size *= traversalScale(face)` : ce qu'on porte change de taille au
 * passage. Mesuré : le jeton passe de 0,20 à 0,80 quand on l'emporte par le
 * secours, et le creux — 0,20 à 12 % près — le refuse alors, comme il refuse un
 * cube. Vérifié aux trois tailles. Le secours sauve le corps, jamais le progrès.
 *
 * ET SYMÉTRIQUEMENT, LES CUBES SE JETTENT, ILS NE SE PORTENT PAS : emporté à
 * travers la grande face, un cube arrive en bas à 0,20 (mesuré) et ne vaut plus
 * rien comme marche. On le remonte, il redevient 0,80, on le rejette par-dessus
 * la lèvre. C'est la leçon du lavoir reprise à l'envers, pour un aller-retour.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const objets = (): CarryableDef[] => [
  // LE JETON, au fond de la galerie. Rien à comprendre, rien à manipuler : le
  // VOYAGE est l'énigme, l'objet n'est qu'un prétexte, et un prétexte compliqué
  // la brouillerait. Il est rouge : c'est la seule chose rouge en bas.
  { id: 'jeton-escalier', position: [-200, FOND + 0.01, 1922], size: JETON, ink: 3 },
  // LES QUATRE CUBES, en haut, en tas devant la trouée. C'est ce qui fait
  // exister l'erreur : à ×4 le tas se ramasse en quatre gestes et l'on jette
  // sans y penser. Personne ne fait quatre voyages en réfléchissant à une
  // échelle qu'il n'a pas encore prise.
  ...(
    [
      [-224, 0.01, 1989.4],
      [-219.2, 0.01, 1991.6],
      [-211.4, 0.01, 1988.8],
      [-206.6, 0.01, 1991],
    ] as V3[]
  ).map((position, i) => ({
    id: `cube-escalier-${i + 1}`,
    position,
    size: CUBE,
    ink: i % 2 === 0 ? 1 : 2,
  })),
];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LE PIÈGE DES QUATORZE MÈTRES, ET COMMENT JE M'EN SUIS ASSURÉ.
 *
 * On repose ce qu'on porte à DEUX FOIS SA TAILLE DEVANT SOI : 14,4 m à ×4. Un
 * géant qui lâche un cube au bord de la fosse ne le pose pas au pied de la
 * paroi, il l'envoie quatorze mètres plus loin. Ce nombre a déjà tué une salle
 * du projet sans que rien ne le laisse voir.
 *
 * 1. LA FOSSE FAIT 24 m DE LARGE, ET C'EST POUR ÇA. Un cube lâché depuis la
 *    lèvre nord atterrit à 14,4 m de la paroi, donc en plein fond, à 9,6 m
 *    encore de la bouche de la galerie. Il n'y a nulle part où le perdre.
 * 2. PEUT-ON, À ×4, POSER UN CUBE CONTRE LA PAROI ? Il faut se tenir à 14,4 m
 *    d'elle EN LA REGARDANT ; la fosse en offre 24, et l'on y descend puisque
 *    3,60 est à hauteur de genou pour un géant. La première version lui donnait
 *    dix mètres — une salle où un géant ne pouvait pas travailler.
 * 3. ET À ×1 ON REPOSE À 3,6 m : la vraie construction se fait petit, au
 *    décimètre au lieu du décamètre. D'où des cubes de 0,80, sous les 0,99
 *    qu'on soulève à ×1 — l'erreur se répare EN BAS, à la main, sans repasser
 *    aucune porte.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const cailloux = (): BoxDef[] => [
  // Le socle du creux, sur le plateau : 0,55, on y pose sans lever les bras.
  b([-216.2, -0.03, 1994.8], [-213.8, 0.55, 1997.2], 3),
  // Un bloc au fond, à quatorze mètres de la paroi et haut de 0,55 : RIEN DE CE
  // QU'ON ESCALADE DANS CETTE FOSSE N'A LE DROIT D'AIDER. D'où le décor si nu.
  b([-238, -3.9, 1957], [-233.4, -3.05, 1961.6], 2),
  // Et trois choses qui ne servent à rien : sans elles, cent soixante-seize
  // mètres de plateau vus à ×4 n'ont plus d'échelle du tout.
  b([-190, -0.04, 2020], [-181, 0.62, 2029], 1),
  b([-160, -0.07, 2078], [-151.4, 2.85, 2086.4], 2),
  b([-262, -0.09, 1930], [-256, 1.9, 1936], 2),
];

export const ESCALIER: SalleModule = {
  nom: 'escalier',
  region: REGION,
  bounds: { min: [-300, -40, 1900], max: [-60, 120, 2140] },

  boxes: [...terrain(), ...parapet(), ...cailloux()],
  carryables: objets(),

  sockets: [
    // LE CREUX DU PLATEAU. Un seul, donc la règle 11 ne peut pas être enfreinte
    // — mais elle sert quand même : 0,20 à 12 % près refuse les cubes de 0,80
    // ET le jeton grossi à 0,80 par un passage de porte (les trois cas passés
    // au banc). Il VERROUILLE, sans `rend` : c'est un progrès, pas une décision.
    // `portee` généreuse : on y arrive à ×1 en reposant à 3,6 m devant soi.
    { id: 'creux-escalier', position: [MERIDIEN, 0.55, 1996], size: JETON, ink: 3, portee: 2.4 },
  ],

  portals: [
    {
      /**
       * LA PORTE INTERNE, ET LE CHOIX DU SECOURS.
       *
       * ═══════════════════════════════════════════════════════════════════
       * LA PETITE FACE EST AU FOND DE LA FOSSE. Je l'avais refusée dans la
       * version précédente — rapetisser devenait un ascenseur. L'objection
       * tombe avec le retournement : DESCENDRE N'EST PLUS L'ÉNIGME, remonter
       * l'est. Et sans elle la salle est un piège, seul défaut que ce jeu ne
       * pardonne pas : un joueur qui saute dans la fosse sans y avoir jeté ses
       * cubes n'aurait AUCUNE remontée — 1,50, mesuré, cent quatre-vingts fois.
       *
       * Elle ne coûte rien à l'énigme, pour les deux raisons écrites plus
       * haut : la butte met le jeton hors de portée d'un géant, et un jeton qui
       * repasse la porte grossit à 0,80 et n'entre plus dans le creux. Le
       * fuyard remonte les mains vides et redescend. Punition juste et douce.
       *
       * J'ai supprimé l'éboulis de la version précédente : à ×1 il devenait la
       * remontée gratuite, donc la mort de la salle. Il n'en reste rien.
       * ═══════════════════════════════════════════════════════════════════
       *
       * `smallHeight: 2,80` est l'étalon de la règle 9, et il ne mesure pas le
       * joueur : il mesure LA PAROI. Debout au fond, la petite face et le bord
       * sont dans le même regard, 2,80 contre 3,60 — la fosse vaut une porte et
       * un quart, c'est-à-dire deux fois sa taille, c'est-à-dire non.
       *
       * La grande face vaut quatre fois plus, 11,20 × 7,60, plantée en plein
       * plateau, rien au-dessus d'elle. PAS DE LINTEAU, ici ni ailleurs : la
       * catapulte de MESURES.md ne peut pas se déclencher sur un passage à ciel
       * ouvert. On la contourne, on ne la combat pas.
       *
       * ═══════════════════════════════════════════════════════════════════
       * L'ORIENTATION DE LA PETITE FACE EST UNE CORRECTION DU BANC, et j'aurais
       * signé la première version sans la voir.
       *
       * Une face ne se franchit QUE DE FACE : on y entre contre sa normale,
       * jamais par-derrière. Mesuré — le même trajet pris à l'envers donne
       * « AUCUNE TRAVERSÉE » et le joueur continue tout droit jusqu'à sortir du
       * monde. Or la petite face regardait le nord : on en ressortait poussé
       * vers le nord, et LE PREMIER PAS NATUREL — repartir au sud, vers la
       * bouche de la galerie qui est de ce côté — la refranchissait à l'envers.
       * Le joueur redevenait géant dans la seconde suivant son arrivée.
       *
       * Elle regarde maintenant l'EST, plaquée contre la paroi ouest : on en
       * sort poussé vers l'intérieur, et la seule façon de la reprendre est
       * d'aller buter volontairement dans un mur qui ne mène nulle part. Un
       * secours doit se demander, pas se subir.
       * ═══════════════════════════════════════════════════════════════════
       *
       * Elle est aussi à trente-quatre mètres de la trouée : une caisse libre
       * qui traverse un plan de portail change de taille elle aussi
       * (`carryTraversal`), et les cubes jetés ne doivent pas tomber dedans.
       */
      id: 'escalier-rapetisser',
      colorBig: 0x7e7a6a,
      colorSmall: 0xc05a38,
      smallHeight: 2.8,
      smallWidth: 1.9,
      big: { position: [-180, 0.01, 2062], yaw: 0 },
      small: { position: [-248.5, FOND + 0.01, 1962], yaw: Math.PI / 2 },
    },
  ],

  stations: [
    // Le Pinceau vole, donc il coupe droit ; mais il descend AVEC le joueur et
    // s'enfonce dans la galerie — seule façon de dire qu'elle existe à
    // quelqu'un qui la regarde d'en haut sans pouvoir y entrer.
    [-180, 7, 2106],
    [-180, 5.5, 2064],
    [MERIDIEN, 2, 1986],
    [-246, -1.5, 1962],
    [-200, -2.4, 1922],
    [MERIDIEN, 1.2, 1996],
  ],

  /**
   * LE RACCORD.
   *
   * `echelle` EST UN PALIER : 1 = ×4, 0 = ×1. Pas un multiplicateur — écrire
   * `0.25` en pensant à ×1/4 est la faute la plus facile du projet.
   *
   * On entre à 1, à sept mètres vingt, au nord du plateau : la fosse est à cent
   * trente mètres devant et l'on ne sait pas encore qu'elle existe. On sort à 0,
   * à un mètre quatre-vingts, DIX MÈTRES AU NORD DU CREUX qu'on vient de garnir
   * — donc en haut, à l'endroit précis où l'on était géant vingt minutes plus
   * tôt. Le même sol, la même lumière, et l'on est quatre fois plus petit que
   * la personne qui a jeté ces cailloux.
   */
  entree: { position: [-180, 0.05, 2112], echelle: 1 },
  sortie: { position: [MERIDIEN, 0.05, 2006], echelle: 0 },
};
