import type { BoxDef, CarryableDef, PortalPairDef, SocketDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';
import { VRILLE } from './refus.js';

/**
 * LE BLANCHIMENT — et c'est la meilleure sensation que ce jeu puisse produire.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE THÉORÈME, ET IL EST VRAI
 *
 * Le creux veut la vrille À SA TAILLE D'ORIGINE ET DE L'AUTRE MAIN.
 *
 * Le joueur va d'abord faire la navette dans le miroir. C'est le geste que la
 * salle précédente lui a appris, et il ne peut pas marcher : un passage change
 * la main ET la taille, deux passages rendent tout à zéro. Il n'existe aucun
 * nombre de passages au miroir qui change la main sans changer la taille.
 * Ce n'est pas une salle difficile, c'est une salle IMPOSSIBLE — telle quelle.
 *
 * D'où la seconde paire, à l'autre bout de la cour, et elle est ORDINAIRE :
 * elle change la taille et laisse la main tranquille. Un passage au miroir, un
 * passage à la porte ordinaire en sens inverse, et le compte tombe juste :
 *
 *     miroir    ↑  ×4, main basculée      L 0,50  →  D 2,00
 *     ordinaire ↓  ×1/4, main intacte     D 2,00  →  D 0,50
 *
 * Le joueur ne calcule pas ça. Il essaie, il constate, et à un moment il VOIT
 * que les deux portes ne font pas la même chose. Ce moment-là est tout le jeu :
 * un système a des lois, et l'on peut les déduire au lieu de les subir.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LA QUEUE À LA COMÈTE, et il faut la dessiner exprès. On porte la vrille
 * soi-même, donc on subit exactement les mêmes passages qu'elle. On ne finit
 * donc pas l'énigme là où on l'a commencée — on ressort de la porte ordinaire à
 * l'autre bout de la cour, à taille d'homme, la vrille dans les bras.
 *
 * **LE CREUX EST DE CE CÔTÉ-LÀ.** Une salle qui rate ce détail reste faisable
 * et se sent injuste, ce qui est pire qu'infaisable : on aurait résolu l'énigme
 * et il faudrait encore traverser la cour en portant sa réponse. Le creux est
 * donc à dix mètres du débouché de la porte ordinaire, et on le voit en
 * arrivant.
 *
 * LE LIEU, ET CE QU'IL REVISITE (règle 8). La cour du creux qui refuse, en
 * plus long : mêmes murs, même dalle, même absence de toit. On la reconnaît
 * tout de suite, et l'on cherche donc tout de suite le miroir — qui est bien
 * là, à sa place, et qui ne suffit plus. Reprendre le décor d'une salle pour en
 * démentir la leçon vaut mieux qu'un panneau.
 */

const REGION = {
  name: 'blanchiment',
  min: [100, -40, 1600] as [number, number, number],
  max: [300, 60, 1800] as [number, number, number],
  paper: '#f1efe8',
  // La même pierre qu'à la cour d'avant, lavée. C'est ce qui la fait
  // reconnaître : une salle qui se cite doit se citer jusque dans sa palette.
  colors: ['#eae7de', '#cbc5b5', '#837e6e', '#8a5a3b'] as [string, string, string, string],
  ink: '#22201c',
  brouillard: 190,
};

const b = (
  min: [number, number, number],
  max: [number, number, number],
  ink = 0,
  opts: { ghost?: boolean; outline?: boolean } = {},
): BoxDef => ({ min, max, ink, region: 'blanchiment', ...opts });

const X0 = 170;
const X1 = 230;
const Z0 = 1670;
const Z1 = 1730;
const MUR = 12;

/**
 * LA VRILLE, la même qu'à la salle d'avant — importée, jamais recopiée.
 *
 * Deux tables parallèles décrivant le même objet ont déjà coûté une nuit à ce
 * projet : le pinceau vert avait été déplacé dans l'une et pas dans l'autre, et
 * il était devenu impossible à ramasser sans que rien ne l'explique. Une forme,
 * une définition, un seul endroit où se tromper.
 */
const TAILLE = 0.5;

/**
 * POURQUOI 0,50 ET PAS 0,40 COMME À LA SALLE D'AVANT.
 *
 * Elle grossit ici jusqu'à 2,00 m au milieu du parcours. On soulève 3,96 m à
 * ×4 : quarante-neuf pour cent de marge. Et à taille d'homme, 0,50 contre les
 * 0,99 qu'on peut soulever : la même marge exactement, aux deux bouts. Une
 * vrille qui se refuserait à être portée à l'un des deux étages tuerait la
 * salle au moment précis où le joueur croit avoir compris.
 */
const GRANDE = TAILLE * 4;

/** Le creux, au débouché de la porte ordinaire. */
const CREUX = { x: 216, y: 0.6, z: 1716 };

const decor = (): BoxDef[] => [
  b([X0 - 2, -3, Z0 - 2], [X1 + 2, 0, Z1 + 2], 1),

  b([X0 - 2, 0, Z0 - 2], [X0, MUR, Z1 + 2], 2),
  b([X1, 0, Z0 - 2], [X1 + 2, MUR, Z1 + 2], 2),
  b([X0, 0, Z0 - 2], [X1, MUR, Z0], 2),
  b([X0, 0, Z1], [X1, MUR, Z1 + 2], 2),

  // Le socle du creux : 0,60 m, la hauteur d'un banc. Plus bas que celui de la
  // cour d'avant, et exprès — on arrive ici les bras chargés après un détour de
  // cent mètres, et un creux qu'on remplit sans lever les bras est une petite
  // gentillesse qu'on peut se permettre.
  b([CREUX.x - 1.1, 0, CREUX.z - 1.1], [CREUX.x + 1.1, CREUX.y, CREUX.z + 1.1], 2),

  /**
   * LE MUR DE REFEND, et il fait tout le travail de mise en scène.
   *
   * Une lame de pierre en travers de la cour, haute de cinq mètres — donc
   * au-dessus de la tête à ×1, à mi-cuisse à ×4. Elle sépare le bout du miroir
   * du bout de la porte ordinaire.
   *
   * Tant qu'on est petit, on ne voit qu'une moitié de cour, et l'on s'acharne
   * dans le miroir parce qu'on ignore qu'il existe autre chose. C'est en
   * ressortant du miroir à ×4, la tête au-dessus de la lame, qu'on découvre la
   * seconde porte — et l'on la découvre au moment exact où l'on en a besoin.
   * La solution n'est pas cachée : elle est simplement à une taille qu'on
   * n'avait pas encore.
   *
   * Une brèche à son extrémité nord laisse passer à pied depuis le début, pour
   * qui longe le mur : rien n'est fermé, et le joueur qui explore avant de
   * réfléchir a le droit d'arriver le premier.
   */
  b([199, 0, Z0 + 2], [201, 5, 1718], 2),
];

/**
 * LE CREUX. Il exige la forme, la TAILLE D'ORIGINE et l'AUTRE MAIN.
 *
 * `size: 0,50` — c'est exactement ce qu'on tient au départ, et c'est ça qui
 * rend la salle impossible par la seule taille : il n'y a rien à corriger de ce
 * côté-là. Le joueur qui présente sa vrille intacte se voit refuser sans qu'un
 * seul écart de dimension soit visible, et il n'a plus qu'une hypothèse.
 *
 * `portee` reste généreux — on arrive ici à taille d'homme, qui repose à 3,6 m
 * devant lui, mais on peut aussi y venir à ×4 en s'étant trompé, et un socle
 * qu'on ne peut pas garnir depuis l'endroit où l'on est ne dit rien de sa
 * raison de refuser.
 */
const SOCKETS: SocketDef[] = [
  {
    id: 'creux-blanchiment',
    forme: 'vrille',
    main: 'D',
    position: [CREUX.x, CREUX.y, CREUX.z],
    size: TAILLE,
    portee: 5,
    ink: 3,
  },
];

const CARRYABLES: CarryableDef[] = [
  {
    id: 'vrille-blanchiment',
    position: [180, 0, 1690],
    size: TAILLE,
    pieces: VRILLE,
    forme: 'vrille',
    main: 'L',
    ink: 3,
  },
];

/**
 * LES DEUX PORTES, ET ELLES SE RESSEMBLENT.
 *
 * Rien ne les distingue au premier regard : même encre, même carrure, même
 * façon de se tenir contre le mur. C'est voulu. Si l'une portait une marque
 * disant « celle-ci retourne la gauche et la droite », la salle serait une
 * consigne à exécuter au lieu d'une loi à découvrir.
 *
 * Ce qui les distingue est ce qu'elles FONT, et l'on ne peut l'apprendre qu'en
 * les faisant. C'est la seule pédagogie que ce jeu accepte.
 *
 * LES QUATRE FACES SONT LOIN LES UNES DES AUTRES — trente-huit mètres en z,
 * cinquante-deux en x. Deux faces plantées au même point se disputent le même
 * plan : on traverse celle qu'on ne voulait pas, ou l'on ne traverse rien du
 * tout. C'est arrivé au premier assemblage de la descente, et rien dans le
 * monde ne l'aurait expliqué au joueur.
 */
const PORTALS: PortalPairDef[] = [
  {
    // LE MIROIR, contre le mur ouest. Celui qu'on connaît, celui qui ne suffit
    // plus. On entre par la petite en marchant vers l'ouest ; on ressort par la
    // grande trente-huit mètres plus au sud, quatre fois plus grand, la main
    // basculée sans qu'on l'ait vu.
    id: 'miroir-blanchiment',
    miroir: true,
    colorBig: 0x8a5a3b,
    colorSmall: 0x2f4b7c,
    smallHeight: 2.8,
    smallWidth: 1.9,
    small: { position: [174, 0.05, 1720], yaw: Math.PI / 2 },
    big: { position: [174, 0.05, 1682], yaw: Math.PI / 2 },
  },
  {
    // LA PORTE ORDINAIRE, contre le mur est. On la franchit par sa GRANDE face
    // — celle qui rapetisse — et elle rend la vrille à sa taille de départ sans
    // toucher à sa main. On en ressort à dix mètres du creux, ce qui n'est pas
    // une commodité mais la règle : le logement doit être du côté où l'on
    // arrive.
    id: 'ordinaire-blanchiment',
    colorBig: 0x8a5a3b,
    colorSmall: 0x2f4b7c,
    smallHeight: 2.8,
    smallWidth: 1.9,
    big: { position: [226, 0.05, 1682], yaw: -Math.PI / 2 },
    small: { position: [226, 0.05, 1720], yaw: -Math.PI / 2 },
  },
];

export const BLANCHIMENT: SalleModule = {
  nom: 'blanchiment',
  region: REGION,
  bounds: { min: [100, -40, 1600], max: [300, 60, 1800] },
  boxes: decor(),
  carryables: CARRYABLES,
  sockets: SOCKETS,
  portals: PORTALS,

  stations: [
    [178, 4, 1676],
    [186, 6.5, 1700],
    [200, 8, 1712],
    [216, 4, 1716],
    [222, 5, 1728],
  ],

  /**
   * ON ENTRE ET L'ON SORT À TAILLE D'HOMME — mais pas au même bout de la cour,
   * et c'est le seul souvenir que le voyage laisse dans le corps.
   *
   * `echelle` EST UN PALIER : −1 = ×1/4, 0 = ×1, 1 = ×4, 2 = ×16.
   */
  entree: { position: [176, 0.05, 1676], echelle: 0 },
  sortie: { position: [206, 0.05, 1726], echelle: 0 },
};

/** La taille attendue par le creux, pour les vérifications. */
export const BLANCHIMENT_TAILLE = TAILLE;
export const BLANCHIMENT_GRANDE = GRANDE;
