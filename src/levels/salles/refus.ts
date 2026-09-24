import type { BoxDef, CarryableDef, PortalPairDef, SocketDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';
import { mainDEncre } from '../mains.js';

/**
 * LE CREUX QUI REFUSE — la première salle où un objet a une MAIN.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE ENSEIGNE, ET UNE SEULE CHOSE À LA FOIS
 *
 * Le joueur trouve une vrille et un creux à sa forme, À SA TAILLE. Il la
 * présente, elle refuse, et le creux le dit tout de suite : « bonne taille,
 * bon dessin, et elle n'entre pas ; la tourner n'y changera rien. » C'est la
 * première fois qu'un objet a une main, et c'est ici qu'on l'apprend.
 *
 * LA PORTE DU FOND EST UN MIROIR, ET IL EST PLAN. Il ne change pas la taille,
 * et c'est une correction : il la changeait, et le joueur ne pouvait pas
 * savoir laquelle des deux choses venait de lui arriver. Signalé en jouant :
 * « l'effet miroir n'est pas très clair, il ne devrait pas être couplé avec
 * un changement de taille dans un premier temps. » Ici, la réflexion est la
 * seule chose qui se passe. La taille viendra à la salle suivante, quand la
 * main sera acquise.
 *
 * LA RÈGLE, ET C'EST DE LA PHYSIQUE : ce qui traverse un miroir est réfléchi,
 * porté ou lancé. On porte la vrille à travers ; on ressort à l'autre bout de
 * la cour et LE MONDE EST RETOURNÉ autour de soi — la pile de pierres qui
 * était à gauche est à droite, la main d'encre est de l'autre main. La vrille
 * dans les bras, elle, n'a pas bougé : on s'est réfléchi avec elle. Mais le
 * creux est du monde, et le monde a basculé : elle y entre. Voir
 * `Simulation.teleport`, et `PlayerState.gauchere` pour le monde qui bascule.
 *
 * On ne calcule rien. On voit le monde se retourner, on constate que la
 * pièce rentre, et l'on tient la leçon des deux salles suivantes : une main
 * ne se corrige pas en tournant, elle se corrige au miroir.
 *
 * LES MAINS SUR LES MURS disent la règle sans un mot : une de chaque côté de
 * chaque face, de la MÊME main, et en regardant par le miroir on voit côte à
 * côte celle qui est devant soi et celle d'en face, retournée. Voir
 * `src/levels/mains.ts`.
 *
 * ET UNE PILE DE PIERRES QUI N'EST PAS SYMÉTRIQUE, au débouché du miroir :
 * trois blocs en équerre. C'est elle qu'on regarde pour VOIR que le monde
 * s'est retourné — une cour vide et symétrique ne le montrerait pas.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LE LIEU, ET CE QU'IL REVISITE (règle 8). Une cour de tailleur de pierre, à
 * ciel ouvert — la même carrure que la cour du village où l'on tombe au premier
 * quart d'heure, mais murée haut et vidée de tout. On y entre à taille d'homme
 * et l'on en sort à taille d'homme : ici, rien ne grandit, tout se retourne.
 *
 * POURQUOI PAS DE TOIT. Une cour ouverte, jamais un couloir. Le moteur a un
 * défaut connu et documenté — voir `MESURES.md` § « LA CATAPULTE DU LINTEAU » —
 * qui projette sur son linteau un joueur arrêté au ras d'une porte trop basse.
 * Tant qu'il vit, on dessine des salles qui n'ont pas de linteau bas.
 *
 * MAIS UN CIEL DE VERRE, à dix-huit mètres. La vrille est la seule clef de la
 * porte de sortie, et rien ne rattrape une pièce tombée hors du monde ; un
 * homme ne lance pas par-dessus douze mètres de mur, mais on ne parie pas la
 * salle sur un angle. On s'y cogne, on ne le voit pas, et la vrille retombe
 * toujours dans la cour. Voir « Le verre » au banc d'essai.
 */

const REGION = {
  name: 'refus',
  min: [-100, -40, 1600] as [number, number, number],
  max: [100, 60, 1800] as [number, number, number],
  paper: '#eceae3',
  // Pierre de taille sèche, poussière, et le brun d'un outil laissé là. Pas
  // d'or : le mouvement II va le chercher, il ne l'a pas encore.
  colors: ['#e4e1d8', '#c3bdae', '#7d7869', '#8a5a3b'] as [string, string, string, string],
  ink: '#22201c',
  brouillard: 190,
};

const b = (
  min: [number, number, number],
  max: [number, number, number],
  ink = 0,
  opts: { ghost?: boolean; outline?: boolean } = {},
): BoxDef => ({ min, max, ink, region: 'refus', ...opts });

/** Verre : ça arrête le corps, ça arrête la pièce, ça ne se dessine pas. */
const verre = (min: [number, number, number], max: [number, number, number]): BoxDef =>
  ({ min, max, region: 'refus', invisible: true });

/** La cour : soixante mètres sur soixante, murs à douze. */
const X0 = -30;
const X1 = 30;
const Z0 = 1670;
const Z1 = 1730;
const MUR = 12;
const CIEL = 18;

/** L'encre du trait : la couleur des portes qui ne changent pas la taille. */
const ENCRE = 0x22201c;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LA VRILLE — la première forme du jeu qui ne soit pas un cube.
 *
 * Quatre cubes en escalier hélicoïdal : on part, on tourne à droite, on monte.
 * C'est le tétracube « vis », et c'est la plus petite forme chirale qui existe
 * en cubes collés — aucune rotation ne superpose la vis droite à la vis gauche,
 * il faut un miroir. C'est un fait de géométrie, pas une règle du jeu, et c'est
 * précisément pour ça qu'on peut bâtir une énigme dessus sans jamais l'énoncer.
 *
 * UN CUBE N'A PAS DE MAIN GAUCHE. Les portails miroirs existaient, étaient
 * écrits et vérifiés depuis des semaines, et ne se voyaient pas : `main: 'L'` et
 * `main: 'D'` dessinaient exactement le même cube. La mécanique était morte
 * faute d'une forme. Cette vrille est cette forme.
 *
 * Les cellules se CHEVAUCHENT d'un centimètre au lieu de se toucher. Deux faces
 * exactement confondues scintillent — c'est le défaut le plus vu du projet, et
 * il est vérifié automatiquement sur le décor. Autant ne pas le réintroduire
 * dans les objets.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const E = 0.01;
const cellule = (
  i: number,
  j: number,
  k: number,
): { min: [number, number, number]; max: [number, number, number]; ink?: number } => ({
  min: [-0.5 + 0.5 * i - E, -0.5 + 0.5 * j - E, -0.5 + 0.5 * k - E],
  max: [0.5 * i + E, 0.5 * j + E, 0.5 * k + E],
  ink: 3,
});

/** La vis, en unités de −0,5 à +0,5 : on va en x, puis en y, puis en z. */
export const VRILLE = [cellule(0, 0, 0), cellule(1, 0, 0), cellule(1, 1, 0), cellule(1, 1, 1)];

/**
 * LA TAILLE DE LA VRILLE : 0,40, et elle ne change pas de toute la salle.
 * On ne soulève que 0,55 fois sa propre hauteur, 0,99 m à ×1 : soixante pour
 * cent de marge, aux deux bouts de la cour puisque c'est la même taille.
 */
const VRILLE_TAILLE = 0.4;

const CREUX = { x: 0, y: 0.9, z: 1676 };

/** Les deux faces du miroir, plantées deux mètres devant leur mur. */
const EST = { x: 28, z: 1700 };
const OUEST = { x: -28, z: 1690 };

/**
 * LE DÉCOR. Une dalle, quatre murs, un socle, une pile de pierres.
 *
 * Le vide est presque le sujet : on doit lire la cour d'un seul regard pour la
 * reconnaître retournée en ressortant du miroir. La seule chose qu'on ajoute
 * est ce qui donne à lire le retournement.
 */
const decor = (): BoxDef[] => [
  // La dalle, épaisse — on ne traverse pas un plancher.
  b([X0 - 2, -3, Z0 - 2], [X1 + 2, 0, Z1 + 2], 1),

  // Les quatre murs, à douze mètres : une cour, pas une place.
  b([X0 - 2, 0, Z0 - 2], [X0, MUR, Z1 + 2], 2),
  b([X1, 0, Z0 - 2], [X1 + 2, MUR, Z1 + 2], 2),
  b([X0, 0, Z0 - 2], [X1, MUR, Z0], 2),
  b([X0, 0, Z1], [X1, MUR, Z1 + 2], 2),

  // LE CIEL DE VERRE, et les rehausses de verre qui le raccordent aux murs.
  // Elles mordent de dix centimètres dans la pierre : deux faces exactement
  // confondues se disputent la profondeur, même quand l'une est invisible.
  verre([X0 - 2, MUR - 0.1, Z0 - 2], [X0, CIEL, Z1 + 2]),
  verre([X1, MUR - 0.1, Z0 - 2], [X1 + 2, CIEL, Z1 + 2]),
  verre([X0, MUR - 0.1, Z0 - 2], [X1, CIEL, Z0]),
  verre([X0, MUR - 0.1, Z1], [X1, CIEL, Z1 + 2]),
  verre([X0 - 2, CIEL - 0.1, Z0 - 2], [X1 + 2, CIEL + 0.5, Z1 + 2]),

  // LE SOCLE DU CREUX : 0,90 m, la hauteur d'un plan de travail, la seule
  // chose de la cour dont un joueur à taille d'homme connaisse la mesure par
  // le corps.
  b([CREUX.x - 1.6, 0, CREUX.z - 1.6], [CREUX.x + 1.6, CREUX.y, CREUX.z + 1.6], 2),

  // LA PILE DE PIERRES, contre le mur ouest, au débouché du miroir : trois
  // blocs d'un mètre en équerre, deux au sol et un posé en travers. Elle n'est
  // pas symétrique, et c'est tout son emploi — vue par le miroir, puis vue
  // en arrivant, elle est retournée, et c'est la preuve que le monde l'est.
  b([-27.4, 0, 1694.1], [-26.4, 1.0, 1695.1], 1),
  b([-26.3, 0, 1694.2], [-25.3, 1.02, 1695.2], 1),
  b([-27.3, 1.03, 1694.6], [-26.3, 2.03, 1695.6], 1),

  // ─── LES MAINS SUR LES MURS ────────────────────────────────────────────
  //
  // De part et d'autre de chaque face, à sa taille : deux mains de quarante-
  // cinq centimètres, l'encre tournée vers la cour. Toutes de la MÊME main :
  // ce qu'on compare est ici et là-bas, et en regardant par une face on voit
  // celles d'en face, retournées.
  //
  // Elles sont posées à quelques centimètres devant le mur, jamais dessus :
  // une face confondue avec celle du mur grésillerait.
  ...mainDEncre('refus', X1 - 0.05, 0.125, EST.z - 1.6, true, 0.25, -1),
  ...mainDEncre('refus', X1 - 0.05, 0.125, EST.z + 1.6, true, 0.25, -1),
  ...mainDEncre('refus', X0 + 0.05, 0.125, OUEST.z - 1.6, true, 0.25, 1),
  ...mainDEncre('refus', X0 + 0.05, 0.125, OUEST.z + 1.6, true, 0.25, 1),
];

/**
 * LE CREUX. Il exige trois choses, et n'en refuse qu'une.
 *
 * `forme` — la vrille : elle est dessinée en creux, on voit ce qu'il attend.
 * `size`  — 0,40 : exactement ce qu'on tient. Rien à corriger de ce côté-là.
 * `main`  — 'D'  : invisible, et c'est tout le sujet — le creux ne le dit
 *           que parce que la taille et le dessin sont justes, au moment exact
 *           où c'est la seule explication possible.
 *
 * `portee` : un homme repose ce qu'il porte à un peu plus d'un mètre devant
 * lui ; cinq mètres laissent poser sans viser. Une vrille LANCÉE qui s'arrête
 * à portée n'y entre pas toute seule — poser est une question, lancer non.
 */
const SOCKETS: SocketDef[] = [
  {
    id: 'creux-refus',
    forme: 'vrille',
    main: 'D',
    position: [CREUX.x, CREUX.y, CREUX.z],
    size: VRILLE_TAILLE,
    portee: 5,
    ink: 3,
  },
];

const CARRYABLES: CarryableDef[] = [
  {
    id: 'vrille-refus',
    position: [-14, 0, 1700],
    size: VRILLE_TAILLE,
    pieces: VRILLE,
    forme: 'vrille',
    main: 'L',
    ink: 3,
  },
];

/**
 * LA PORTE DU FOND, et c'est un miroir plan.
 *
 * Ses deux faces sont dans la MÊME cour, à cinquante-six mètres l'une de
 * l'autre, de la même taille et de la même couleur — l'encre, qui n'annonce
 * aucune taille. On entre par la face est, on ressort par la face ouest, au
 * même endroit et dans le même décor : rien d'autre n'a bougé, et pourtant la
 * cour est retournée. C'est la démonstration la plus courte que le jeu sache
 * faire, et elle ne coûte pas une ligne d'explication.
 *
 * `miroir: true` retourne ce qui la traverse, porté ou lancé. `plane: true`
 * lui interdit de faire quoi que ce soit d'autre.
 *
 * ELLE N'A PAS DE `condition` : on la franchit tant qu'on veut, dans les deux
 * sens. Deux passages s'annulent : rien n'est jamais perdu. C'est la règle
 * « ne jamais piéger », appliquée à la lettre — et le joueur qui essaie tout
 * vient de découvrir seul le théorème dont il aura besoin à la salle suivante.
 */
const PORTALS: PortalPairDef[] = [
  {
    id: 'miroir-refus',
    miroir: true,
    plane: true,
    colorBig: ENCRE,
    colorSmall: ENCRE,
    smallHeight: 2.8,
    smallWidth: 1.9,
    // Normale −x : on marche vers l'est pour la franchir.
    small: { position: [EST.x, 0.05, EST.z], yaw: -Math.PI / 2 },
    // Normale +x : on en ressort en marchant vers l'est, face à la cour.
    big: { position: [OUEST.x, 0.05, OUEST.z], yaw: Math.PI / 2 },
  },
];

export const REFUS: SalleModule = {
  nom: 'refus',
  region: REGION,
  bounds: { min: [-100, -40, 1600], max: [100, 60, 1800] },
  boxes: decor(),
  carryables: CARRYABLES,
  sockets: SOCKETS,
  portals: PORTALS,

  // Le Pinceau vole, lui. Il coupe la cour en diagonale, passe au-dessus du
  // creux, et sort par où l'on sortira.
  stations: [
    [-20, 4, 1722],
    [-6, 6, 1702],
    [0, 3.2, 1678],
    [10, 7, 1712],
    [14, 5, 1726],
  ],

  /**
   * ON ENTRE ET L'ON SORT À TAILLE D'HOMME. La salle n'enseigne que la main.
   *
   * `echelle` EST UN PALIER : −1 = ×1/4, 0 = ×1, 1 = ×4, 2 = ×16.
   */
  entree: { position: [-22, 0.05, 1724], echelle: 0 },
  // La porte est dans le mur nord : on la franchit en marchant vers le nord.
  // Sans ce mot, l'assemblage la plantait face au nord et l'on ne pouvait
  // la passer qu'en se glissant entre elle et le mur, puis en revenant.
  sortie: { position: [14, 0.05, 1726], echelle: 0, lacet: 0 },
};

/** La cote de la vrille, pour les vérifications. */
export const REFUS_PETITE = VRILLE_TAILLE;
