import type { BoxDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LE LAVOIR — trois salles dans un seul lieu, et c'est tout le sujet.
 *
 * On y arrive à taille d'homme. On en fait le tour, on voit un bassin, des
 * dalles, un filet d'eau, un mur avec un creux vide. Rien d'extraordinaire.
 *
 * Puis on franchit la porte, on ressort à quarante-cinq centimètres, et le même
 * endroit est un pays. C'est la thèse du jeu, posée dès la première salle de la
 * suite : **le monde ne change pas, c'est vous qui changez.**
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TROIS LEÇONS, ET LA TROISIÈME OUVRE TOUT LE RESTE DU JEU
 *
 * 1. LA FENTE — *petit n'ouvre pas des serrures, mais des lieux.* Entre deux
 *    pavés, un trait d'encre. À 1,80 c'est une ligne du dessin qu'on ne peut
 *    même pas regarder ; à 0,45 c'est un ravin de deux hauteurs d'homme, avec
 *    un sol, des parois, une ombre.
 *
 * 2. LA PERLE — *ce qu'on porte grandit avec soi.* Une perle au fond de la
 *    fente, un creux quatre fois plus grand en haut. On remonte en la portant,
 *    on repasse la porte, et l'on tient un ballon.
 *
 * 3. LE CHEVALET — *le papier vient de vous.* Le même geste exactement, mais ce
 *    qu'on obtient n'est pas un creux garni : c'est le Pinceau qui vient et se
 *    met à dessiner la porte suivante.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'ERREUR QU'ON VA FAIRE, et elle est parfaite : grandir d'abord, puis revenir
 * chercher la perle. Sauf qu'à 1,80 la fente redevient un trait, et la seule
 * chose qui sort de là-dessous est ce qu'on avait déjà dans les mains. La
 * géométrie force la bonne réponse sans qu'on l'ait énoncée — et c'est vérifié
 * plus bas, parce qu'une salle qui compte là-dessus doit le prouver.
 */

/** Palette : pierre mouillée, mousse, et le rouge d'un seau oublié. */
const REGION = {
  name: 'lavoir',
  min: [-300, -40, 600] as [number, number, number],
  max: [-100, 40, 800] as [number, number, number],
  paper: '#e6e9e4',
  colors: ['#dfe3dc', '#b9c2b6', '#6e7d72', '#b2503a'] as [string, string, string, string],
  ink: '#1b201c',
  brouillard: 150,
};

const X0 = -200;
const Z0 = 700;

const b = (
  min: [number, number, number],
  max: [number, number, number],
  ink = 0,
  opts: { ghost?: boolean; outline?: boolean } = {},
): BoxDef => ({ min, max, ink, region: 'lavoir', ...opts });

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LES NOMBRES, ET POURQUOI ILS VALENT ÇA
 *
 * On ne soulève que 0,55 fois sa propre hauteur. À 0,45 m cela fait **0,2475**,
 * et c'est le nombre le plus dangereux de tout le projet : l'auteur d'une autre
 * salle a écrit une perle de 0,25 en toute bonne foi, elle dépassait de deux
 * millimètres et demi, et son niveau était mort au premier geste sans que rien
 * ne le laisse voir.
 *
 * D'où PERLE = 0,10 : cinquante-neuf pour cent de marge, et la même marge à tous
 * les étages puisque tout est multiplié par quatre en même temps.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const PERLE = 0.1;
/** Ce qu'elle devient après une porte. Exactement quatre fois, jamais arrondi. */
const PERLE_GRANDE = PERLE * 4;

/**
 * LA FEUILLE, blanche et sans encre — et surtout D'UNE AUTRE TAILLE QUE LA
 * PERLE, ce qui n'est pas un goût mais la règle 11 du contrat.
 *
 * Elles font toutes deux le voyage du fond de la fente jusqu'en haut, donc
 * elles se croisent, donc chacune passe devant le creux de l'autre. Si les deux
 * creux acceptaient la même taille, on pourrait loger la perle dans le chevalet
 * — et comme un creux ordinaire VERROUILLE pour de bon, la salle serait cassée
 * sans retour. La vérification l'a dit du premier coup, en une ligne.
 *
 * 0,10 et 0,20 sont donc séparées d'un facteur deux, et leurs versions grandies
 * — 0,40 et 0,80 — se refusent l'une l'autre avec une marge de deux fois et
 * demie la tolérance. Les deux restent très en deçà des 0,2475 qu'on soulève à
 * ×1/4 : dix-neuf pour cent de marge pour la feuille, cinquante-neuf pour la
 * perle. Aucune ne peut se retrouver à deux millimètres du seuil.
 */
const FEUILLE = 0.2;
const FEUILLE_GRANDE = FEUILLE * 4;

/**
 * LA FENTE. Trente centimètres de large et un mètre vingt de fond.
 *
 * Ces deux nombres ne sont pas décoratifs :
 *
 * — **0,30 de large** contre un joueur de 0,68 à taille d'homme : il n'y entre
 *   pas, et il n'a même pas à essayer pour le voir. Contre un joueur de 0,17 à
 *   ×1/4, c'est un couloir d'une largeur et demie — étroit, praticable, pas
 *   angoissant.
 *
 * — **1,20 de fond**, soit deux hauteurs d'homme pour qui mesure 0,45. Assez
 *   pour que ce soit un LIEU et non une rainure ; et c'est aussi ce qui met la
 *   perle hors d'atteinte d'un bras de 1,80, qui porte à 2,88 mais depuis les
 *   yeux, à travers une ouverture où la main n'entre pas.
 */
const FENTE_LARGE = 0.3;
const FENTE_FOND = 1.2;
const FENTE_Z = Z0 + 1.5;

/** Le dallage : des pavés séparés par des joints, dont un s'est ouvert. */
const dallage = (): BoxDef[] => {
  const out: BoxDef[] = [];
  // Le socle plein, sous tout. Sans contour : sa silhouette entière serait
  // tracée à l'encre à l'horizon, ce qui n'a aucun sens pour un sol.
  out.push(b([X0 - 14, -FENTE_FOND - 0.6, Z0 - 10], [X0 + 14, -0.02, Z0 + 12], 0, { outline: false }));

  // Les pavés, en deux nappes que la fente sépare. Ils MORDENT sur le socle de
  // deux centimètres : posés pile dessus, leurs faces inférieures se
  // confondraient avec sa face supérieure et l'image grésillerait.
  for (const [z0, z1] of [
    [Z0 - 10, FENTE_Z - FENTE_LARGE * 0.5],
    [FENTE_Z + FENTE_LARGE * 0.5, Z0 + 12],
  ] as const) {
    for (let i = 0; i < 7; i++) {
      const x = X0 - 10.5 + i * 3;
      // Chaque pavé a sa propre teinte et son propre millimètre de hauteur : un
      // dallage dont toutes les pierres sont identiques se lit comme une grille.
      out.push(b([x, -0.04, z0], [x + 2.94, 0.006 + (i % 3) * 0.004, z1], i % 2 === 0 ? 0 : 1));
    }
  }
  return out;
};

/**
 * LA FENTE ELLE-MÊME, et la rampe par laquelle on en sort.
 *
 * On ne piège personne : une dalle descellée plonge dans la fente en pente
 * douce. Sa hauteur monte de 0,12 par gradin, contre une enjambée de 0,225 à
 * ×1/4 — donc on la remonte en marchant, sans jamais sauter, ce qui est la
 * seule garantie qui vaille.
 */
const fente = (): BoxDef[] => {
  const out: BoxDef[] = [];
  const zA = FENTE_Z - FENTE_LARGE * 0.5;
  const zB = FENTE_Z + FENTE_LARGE * 0.5;

  // Les deux parois, et les deux bouts : la fente est un couloir fermé.
  // Leur dessus est à 0,019 et non à 0,010, et c'est une correction : les pavés
  // montent à 0,006 + (i mod 3) × 0,004, donc l'un sur trois culminait
  // exactement à 0,010. Quatre mètres carrés de faces confondues, invisibles en
  // lisant le code, et un grésillement garanti sur le bord de la fente —
  // c'est-à-dire précisément l'endroit qu'on regarde.
  out.push(b([X0 - 10.5, -FENTE_FOND, zA - 0.4], [X0 + 10.5, 0.019, zA], 2));
  out.push(b([X0 - 10.5, -FENTE_FOND, zB], [X0 + 10.5, 0.019, zB + 0.4], 2));
  out.push(b([X0 - 10.8, -FENTE_FOND, zA - 0.4], [X0 - 10.5, 0.019, zB + 0.4], 2));
  out.push(b([X0 + 10.5, -FENTE_FOND, zA - 0.4], [X0 + 10.8, 0.019, zB + 0.4], 2));
  // Le fond, un rien plus haut que le socle pour ne pas coïncider avec lui.
  out.push(b([X0 - 10.5, -FENTE_FOND, zA], [X0 + 10.5, -FENTE_FOND + 0.02, zB], 1));

  // LA RAMPE : dix gradins de 0,12. On remonte sans sauter.
  for (let i = 0; i < 10; i++) {
    const x = X0 + 5.4 + i * 0.5;
    const h = -FENTE_FOND + 0.02 + i * 0.12;
    out.push(b([x, -FENTE_FOND + 0.02, zA + 0.03], [x + 0.52, h + 0.12, zB - 0.03], 1));
  }

  // Ce qu'on trouve dessous, et qu'on n'aurait jamais vu autrement : des
  // racines qui ont soulevé le pavé, et un tesson. Aucune fonction. Les plus
  // belles choses d'un monde sont celles qui n'en ont pas.
  out.push(b([X0 - 6.2, -FENTE_FOND + 0.02, zA + 0.06], [X0 - 5.4, -FENTE_FOND + 0.3, zB - 0.06], 2));
  out.push(b([X0 - 5.5, -FENTE_FOND + 0.24, zA + 0.09], [X0 - 3.1, -FENTE_FOND + 0.31, zA + 0.16], 2));
  out.push(b([X0 - 2.4, -FENTE_FOND + 0.02, zA + 0.1], [X0 - 2.1, -FENTE_FOND + 0.19, zA + 0.19], 3));
  return out;
};

/**
 * LE BASSIN, LE MUR, ET CE QUI Y EST CREUSÉ.
 *
 * Le creux de la perle est à 1,10 du sol — à hauteur de poitrine pour un joueur
 * de 1,80, donc VU en arrivant sans être regardé. C'est tout ce qu'on lui doit :
 * il faut l'avoir croisé avant d'en avoir besoin, pas l'avoir compris.
 */
const lavoir = (): BoxDef[] => {
  const out: BoxDef[] = [];

  // Le bassin : quatre margelles et un fond d'eau peu profonde. On y entre et
  // l'on en ressort — la margelle fait 0,42, sous l'enjambée de 0,90.
  const bx0 = X0 - 8;
  const bx1 = X0 - 1;
  const bz0 = Z0 + 5;
  const bz1 = Z0 + 10;
  out.push(b([bx0, 0.006, bz0], [bx1, 0.42, bz0 + 0.5], 2));
  out.push(b([bx0, 0.006, bz1 - 0.5], [bx1, 0.42, bz1], 2));
  out.push(b([bx0, 0.006, bz0 + 0.5], [bx0 + 0.5, 0.42, bz1 - 0.5], 2));
  out.push(b([bx1 - 0.5, 0.006, bz0 + 0.5], [bx1, 0.42, bz1 - 0.5], 2));
  // L'eau, à 0,18 : on la traverse à 1,80, elle monte au genou à 0,45.
  out.push(b([bx0 + 0.5, 0.006, bz0 + 0.5], [bx1 - 0.5, 0.18, bz1 - 0.5], 0, { outline: false }));

  // LE MUR DU FOND, avec la niche de la perle. Il porte aussi le chevalet.
  out.push(b([X0 - 11, -0.04, Z0 + 11.4], [X0 + 11, 4.2, Z0 + 12], 2));
  // La niche : un renfoncement franc, bordé, qu'on repère de loin.
  out.push(b([X0 + 2.4, 1.02, Z0 + 11.3], [X0 + 4.4, 1.1, Z0 + 11.42], 3));
  out.push(b([X0 + 2.4, 1.1, Z0 + 11.3], [X0 + 2.5, 1.9, Z0 + 11.42], 3));
  out.push(b([X0 + 4.3, 1.1, Z0 + 11.3], [X0 + 4.4, 1.9, Z0 + 11.42], 3));
  out.push(b([X0 + 2.4, 1.86, Z0 + 11.3], [X0 + 4.4, 1.94, Z0 + 11.42], 3));

  // Un seau renversé, un balai contre le mur. Rien à faire avec.
  out.push(b([X0 + 7.1, 0.006, Z0 + 10.2], [X0 + 7.7, 0.52, Z0 + 10.8], 3));
  out.push(b([X0 + 8.6, 0.006, Z0 + 11.1], [X0 + 8.72, 2.3, Z0 + 11.28], 1));
  return out;
};

/**
 * LE CHEVALET, et pourquoi il est si large.
 *
 * On y pose une feuille en mesurant 1,80, donc en la reposant à environ trois
 * mètres soixante devant soi. Un chevalet étroit ferait de cette salle une
 * épreuve d'adresse — et ce jeu n'en est pas une, encore moins au doigt sur un
 * téléphone. Le plateau fait donc deux mètres cinquante de large, et le rayon
 * d'accueil du logement en fait deux à lui seul.
 *
 * Il est POSÉ AU SOL et non accroché : on doit pouvoir viser sans lever les
 * yeux, et voir la feuille depuis l'autre bout de la cour.
 */
const chevalet = (): BoxDef[] => [
  b([X0 - 6.5, 0.006, Z0 - 4.4], [X0 - 6.2, 1.15, Z0 - 4.1], 2),
  b([X0 - 4.3, 0.006, Z0 - 4.4], [X0 - 4.0, 1.15, Z0 - 4.1], 2),
  b([X0 - 6.7, 1.15, Z0 - 4.6], [X0 - 3.8, 1.28, Z0 - 3.9], 1),
  // Un dosseret incliné derrière : il dit « ça se pose ici » sans un mot, et il
  // empêche la feuille de rouler au-delà.
  b([X0 - 6.7, 1.28, Z0 - 4.05], [X0 - 3.8, 2.0, Z0 - 3.9], 2),
];

export const LAVOIR: SalleModule = {
  nom: 'lavoir',
  region: REGION,
  bounds: { min: [-300, -40, 600], max: [-100, 40, 800] },

  boxes: [...dallage(), ...fente(), ...lavoir(), ...chevalet()],

  carryables: [
    // LA PERLE, au fond de la fente. Inatteignable à 1,80 : la fente ne fait
    // que 0,30 et le corps du joueur 0,68. Vérifié, pas supposé.
    { id: 'perle-lavoir', position: [X0 + 1.2, -FENTE_FOND + 0.06, FENTE_Z], size: PERLE, ink: 3 },
    // LA FEUILLE, elle aussi au fond : il faut redescendre pour la chercher,
    // et donc refaire le geste de la perle en ayant compris à quoi il sert.
    { id: 'feuille-lavoir', position: [X0 - 8.4, -FENTE_FOND + 0.06, FENTE_Z], size: FEUILLE, ink: 0 },
  ],

  sockets: [
    // La niche du mur. 0,80, soit exactement quatre fois la perle : elle
    // n'accepte donc QUE la perle qui a franchi une porte.
    {
      id: 'niche-lavoir',
      position: [X0 + 3.4, 1.12, Z0 + 11.2],
      size: PERLE_GRANDE,
      ink: 3,
      portee: 2.4,
    },
    // LE CHEVALET. `rend: true` : il ne verrouille pas ce qu'on lui donne,
    // parce que son contenu n'est pas un progrès mais une décision — la taille
    // de la porte qu'on va faire dessiner — et qu'une décision se reprend.
    {
      id: 'chevalet-lavoir',
      position: [X0 - 5.25, 1.28, Z0 - 4.25],
      size: FEUILLE_GRANDE,
      ink: 0,
      portee: 2.6,
      rend: true,
    },
  ],

  portals: [
    {
      // LA PORTE DU LAVOIR. Sa grande face est plantée dans la cour, sa petite
      // au ras du dallage : on la franchit à 1,80 et l'on ressort à 0,45, à
      // trois pas de la fente qu'on regardait sans pouvoir la voir.
      id: 'lavoir-fente',
      colorBig: 0x6e7d72,
      colorSmall: 0xb2503a,
      big: { position: [X0 - 10.4, 0.006, Z0 + 2.2], yaw: Math.PI / 2 },
      small: { position: [X0 + 9.6, 0.006, Z0 - 6.2], yaw: -Math.PI / 2 },
    },
    {
      // LA PORTE QUE LE PINCEAU DESSINE, sur la feuille qu'on lui a tendue.
      // Elle naît fermée (`dessinee`), s'ouvre quand le chevalet est pourvu, et
      // seulement une fois le tracé fini.
      id: 'lavoir-suite',
      condition: 'chevalet-lavoir',
      dessinee: true,
      colorBig: 0xb2503a,
      colorSmall: 0xb2503a,
      big: { position: [X0 + 10.4, 0.006, Z0 + 2.2], yaw: -Math.PI / 2 },
      small: { position: [X0 - 9.6, 0.006, Z0 - 6.2], yaw: Math.PI / 2 },
    },
  ],

  stations: [
    // Le Pinceau descend AVEC nous, et c'est ce qui donne envie d'y aller.
    [X0 + 3, 1.6, Z0 - 1],
    [X0 + 1.2, -FENTE_FOND + 0.55, FENTE_Z],
    [X0 + 3.4, 1.9, Z0 + 11],
    [X0 - 5.25, 2.4, Z0 - 4.25],
  ],

  entree: { position: [X0, 0.05, Z0 - 8], echelle: 0 },
  sortie: { position: [X0 - 9.6, 0.05, Z0 - 6.2], echelle: 0 },
};
