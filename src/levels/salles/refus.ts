import type { BoxDef, CarryableDef, PortalPairDef, SocketDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';
import { mainDEncre } from '../mains.js';

/**
 * LE CREUX QUI REFUSE — la première salle où un objet a une MAIN.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE ENSEIGNE, ET COMMENT ELLE A CHANGÉ DE LEÇON
 *
 * Le joueur trouve une vrille et un creux à sa forme. Il la présente, elle
 * refuse — visiblement trop petite. Il la porte par la porte du fond, il
 * ressort quatre fois plus grand, elle a la bonne taille… et elle refuse
 * encore. Le creux le dit : « bonne taille, bon dessin, et elle n'entre pas ;
 * la tourner n'y changera rien. » C'est la première fois qu'un objet a une
 * main, et c'est ici qu'on l'apprend.
 *
 * LA RÈGLE, DEPUIS QUE LE MONDE BASCULE AVEC SOI : porter une pièce à travers
 * un miroir ne la retourne PAS. On se réfléchit avec elle, l'écart reste nul,
 * et prétendre qu'elle a tourné ferait dire au jeu le contraire de ce qu'il
 * montre. La seule façon de retourner une pièce est de LA LANCER à travers et
 * de la rattraper de l'autre côté — elle se réfléchit, on ne se réfléchit pas,
 * et l'écart devient réel. Voir `Simulation.teleport`.
 *
 * Cette salle a d'abord été écrite autour du portage, et la règle l'a rendue
 * fausse d'un coup : la vrille portée ressortait de la même main, et le creux
 * refusait sans que rien dans le monde ne le justifie — le pire défaut que ce
 * jeu puisse avoir. Elle est réécrite autour du lancer. Ce qu'elle cachait
 * (« la porte a corrigé DEUX choses ») est devenu ce qu'elle montre : la porte
 * corrige la taille de tout ce qui passe, et la main de ce qu'on jette.
 *
 * LES MAINS SUR LES MURS disent la règle sans un mot : une de chaque côté de
 * chaque ouverture, de la MÊME main, et en regardant par le miroir on voit
 * côte à côte celle qui est devant soi et celle d'en face, retournée. Voir
 * `src/levels/mains.ts`.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LE LIEU, ET CE QU'IL REVISITE (règle 8). Une cour de tailleur de pierre, à
 * ciel ouvert — la même carrure que la cour du village où l'on tombe au premier
 * quart d'heure, mais murée haut et vidée de tout. On y entre à taille d'homme
 * et l'on en sort quatre fois plus grand, sans jamais avoir quitté la cour : ce
 * sont les murs qui rapetissent.
 *
 * POURQUOI PAS DE TOIT. Une cour ouverte, jamais un couloir. Le moteur a un
 * défaut connu et documenté — voir `MESURES.md` § « LA CATAPULTE DU LINTEAU » —
 * qui projette sur son linteau un joueur arrêté au ras d'une porte trop basse.
 * Tant qu'il vit, on dessine des salles qui n'ont pas de linteau bas.
 *
 * MAIS UN CIEL DE VERRE. Une pièce lancée à travers une porte ressort quatre
 * fois plus grande ET quatre fois plus vite — c'est la loi du monde, la même
 * qui fait qu'un géant marche vite. Lancée un peu vers le haut, elle ressort
 * à quarante mètres par seconde de la grande face et passe par-dessus douze
 * mètres de mur. Rien ne rattrape une pièce tombée hors du monde, et cette
 * pièce est la seule clef de la porte de sortie. D'où une coque invisible à
 * treize mètres, au-dessus de tout ce qu'un joueur atteint (un ×4 qui saute
 * met sa tête à 12,38) : on s'y cogne, on ne la voit pas, et la vrille
 * retombe toujours dans la cour. Voir « Le verre » au banc d'essai.
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
/** Le ciel de verre. Au-dessus de la tête d'un ×4 qui saute (12,38). */
const CIEL = 13;

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
 * LA TAILLE DE LA VRILLE, et la seule marge qui compte.
 *
 * On ne soulève que 0,55 fois sa propre hauteur : 0,99 m à ×1, 3,96 m à ×4.
 * La vrille fait 0,40 en arrivant et 1,60 après la porte — donc soixante pour
 * cent de marge des deux côtés, et la même marge aux deux étages puisque tout
 * est multiplié par quatre en même temps.
 *
 * Et 1,60 ne se soulève PAS à ×1 (0,99) : c'est ce qui oblige à suivre la
 * pièce par la porte après l'avoir lancée. On ne récupère sa clef qu'en
 * devenant ce que le lieu demande.
 */
const VRILLE_PETITE = 0.4;
const VRILLE_GRANDE = VRILLE_PETITE * 4;

const CREUX = { x: 0, y: 0.9, z: 1676 };

/** Les deux faces du miroir, plantées deux mètres devant leur mur. */
const PETITE = { x: 28, z: 1700 };
const GRANDE = { x: -28, z: 1690 };

/**
 * LE DÉCOR. Une dalle, quatre murs, un socle, et rien d'autre.
 *
 * Le vide est le sujet : on doit voir la cour rétrécir autour de soi en
 * ressortant du miroir, et le moindre encombrement brouillerait la comparaison.
 * La seule chose qu'on ajoute est ce qui sert d'étalon.
 */
const decor = (): BoxDef[] => [
  // La dalle, épaisse : à ×4 on pèse lourd et l'on ne traverse pas un plancher.
  b([X0 - 2, -3, Z0 - 2], [X1 + 2, 0, Z1 + 2], 1),

  // Les quatre murs. Douze mètres : un joueur de 7,20 m ne voit pas par-dessus,
  // et c'est ce qui fait que la cour a l'air d'avoir rapetissé plutôt que de
  // s'être ouverte.
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

  // LE SOCLE DU CREUX. Sa hauteur est l'étalon de la règle 9 : 0,90 m, la
  // hauteur d'un plan de travail, la seule chose de la cour dont un joueur à
  // taille d'homme connaisse la mesure par le corps. Quand il ressort à ×4 et
  // qu'elle lui arrive à la cheville, il n'a rien à calculer.
  b([CREUX.x - 1.6, 0, CREUX.z - 1.6], [CREUX.x + 1.6, CREUX.y, CREUX.z + 1.6], 2),

  // Une pile de pierres de taille contre le mur ouest, au débouché du miroir.
  // Elle ne sert à rien qu'à donner une échelle au retour : trois blocs d'un
  // mètre, hauts comme la moitié d'un homme, hauts comme un orteil de géant.
  b([-27.4, 0, 1694.1], [-26.4, 1.0, 1695.1], 1),
  b([-26.3, 0, 1694.2], [-25.3, 1.02, 1695.2], 1),
  b([-27.3, 1.03, 1694.6], [-26.3, 2.03, 1695.6], 1),

  // ─── LES MAINS SUR LES MURS ────────────────────────────────────────────
  //
  // Sur le mur EST, de part et d'autre de la petite face, à sa taille : deux
  // mains de quarante-cinq centimètres, l'encre tournée vers l'ouest d'où l'on
  // vient. Sur le mur OUEST, de part et d'autre de la grande, quatre fois plus
  // grandes, l'encre tournée vers l'est. Toutes de la MÊME main : ce qu'on
  // compare est ici et là-bas, et en regardant par la petite face on voit les
  // grandes d'en face, retournées.
  //
  // Elles sont posées QUATRE centimètres devant le mur, jamais dessus : une
  // face confondue avec celle du mur grésillerait.
  ...mainDEncre('refus', X1 - 0.05, 0.125, PETITE.z - 1.6, true, 0.25, -1),
  ...mainDEncre('refus', X1 - 0.05, 0.125, PETITE.z + 1.6, true, 0.25, -1),
  ...mainDEncre('refus', X0 + 0.05, 0.5, GRANDE.z - 6.4, true, 1, 1),
  ...mainDEncre('refus', X0 + 0.05, 0.5, GRANDE.z + 6.4, true, 1, 1),
];

/**
 * LE CREUX. Il exige trois choses, et les dit une par une.
 *
 * `forme` — la vrille : elle est dessinée en creux, on voit ce qu'il attend.
 * `size`  — 1,60 : quatre fois ce qu'on tient, et cet écart-là saute aux yeux.
 * `main`  — 'D'  : invisible, et c'est tout le sujet — le creux ne le dit
 *           qu'en dernier, quand la taille et le dessin sont justes, au moment
 *           exact où c'est la seule explication possible.
 *
 * `portee` est large parce qu'un joueur à ×4 repose ce qu'il porte LOIN DEVANT
 * LUI — 1,36 de corps plus deux fois l'arête, soit quatre mètres et demi pour
 * cette vrille. Viser un socle de trois mètres à cette distance est une épreuve
 * d'adresse, et ce jeu n'en est pas une — encore moins au doigt sur un
 * téléphone. Huit mètres laissent le géant poser d'où il se tient ; dix-huit,
 * l'ancienne valeur, faisaient qu'une vrille LANCÉE à travers le miroir et
 * retombée n'importe où dans la moitié sud de la cour s'y logeait toute seule.
 */
const SOCKETS: SocketDef[] = [
  {
    id: 'creux-refus',
    forme: 'vrille',
    main: 'D',
    position: [CREUX.x, CREUX.y, CREUX.z],
    size: VRILLE_GRANDE,
    portee: 8,
    ink: 3,
  },
];

const CARRYABLES: CarryableDef[] = [
  {
    id: 'vrille-refus',
    position: [-14, 0, 1700],
    size: VRILLE_PETITE,
    pieces: VRILLE,
    forme: 'vrille',
    main: 'L',
    ink: 3,
  },
];

/**
 * LA PORTE DU FOND, et c'est un miroir.
 *
 * Ses deux faces sont dans la MÊME cour, à cinquante-six mètres l'une de
 * l'autre : on entre par la petite contre le mur est, on ressort par la grande
 * contre le mur ouest, quatre fois plus grand, au même endroit et dans le même
 * décor. Rien d'autre n'a bougé, donc c'est forcément soi qui a changé — c'est
 * la démonstration la plus courte que le jeu sache faire, et elle ne coûte pas
 * une ligne d'explication.
 *
 * `miroir: true` retourne ce qu'on LANCE à travers, et ce qu'on lance ressort
 * par la grande face, quatre fois plus gros, à l'autre bout de la cour — trop
 * lourd pour un homme. On va le chercher en passant soi-même la porte.
 *
 * ELLE N'A PAS DE `condition` : on la franchit tant qu'on veut, dans les deux
 * sens, et l'on peut relancer la vrille autant de fois qu'il faut. Deux
 * lancers s'annulent, un aller-retour rend la taille : rien n'est jamais
 * perdu. C'est la règle « ne jamais piéger », appliquée à la lettre — et le
 * joueur qui essaie tout vient de découvrir seul le théorème dont il aura
 * besoin à la salle suivante.
 */
const PORTALS: PortalPairDef[] = [
  {
    id: 'miroir-refus',
    miroir: true,
    colorBig: 0xc8492e,
    colorSmall: 0x2f4b7c,
    smallHeight: 2.8,
    smallWidth: 1.9,
    // Normale −x : on marche vers l'est pour la franchir, on lance vers l'est.
    small: { position: [PETITE.x, 0.05, PETITE.z], yaw: -Math.PI / 2 },
    // Normale +x : on en ressort en marchant vers l'est, face à la cour — et
    // la vrille lancée en ressort de même, quatre fois plus vite.
    big: { position: [GRANDE.x, 0.05, GRANDE.z], yaw: Math.PI / 2 },
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
   * ON ENTRE À TAILLE D'HOMME ET L'ON SORT GÉANT, sans avoir changé de pièce.
   *
   * `echelle` EST UN PALIER : −1 = ×1/4, 0 = ×1, 1 = ×4, 2 = ×16.
   */
  entree: { position: [-22, 0.05, 1724], echelle: 0 },
  sortie: { position: [14, 0.05, 1726], echelle: 1 },
};

/** Les cotes de la vrille, pour les vérifications. */
export const REFUS_PETITE = VRILLE_PETITE;
export const REFUS_GRANDE = VRILLE_GRANDE;
