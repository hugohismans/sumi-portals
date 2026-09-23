import type { BoxDef, CarryableDef, PortalPairDef, SocketDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';
import { mainDEncre } from '../mains.js';
import { VRILLE } from './refus.js';

/**
 * LE BLANCHIMENT — et c'est la meilleure sensation que ce jeu puisse produire.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE THÉORÈME, ET IL EST VRAI
 *
 * Le creux veut la vrille À SA TAILLE D'ORIGINE ET DE L'AUTRE MAIN.
 *
 * Deux portes, et elles n'obéissent pas à la même loi :
 *
 *     le MIROIR   — une chatière, qu'on ne franchit pas mais qu'on peut viser.
 *                   Ce qu'on y LANCE change de main ET de taille.
 *     la porte    — ordinaire. Ce qui la passe, porté ou lancé, change de
 *                   taille et garde sa main.
 *
 * La main ne change donc qu'au miroir, et jamais sans la taille ; la taille se
 * corrige à la porte, sans toucher à la main. Un lancer à travers la chatière
 * donne l'autre main et quatre fois la taille ; un passage par la porte
 * ordinaire, en sens inverse, rend la taille et garde la main. Le compte tombe
 * juste, et il ne tombe juste QUE comme ça :
 *
 *     chatière  ↑  ×4, main basculée       L 0,50  →  D 2,00
 *     ordinaire ↓  ×1/4, main intacte      D 2,00  →  D 0,50
 *
 * Le joueur ne calcule pas ça. Il essaie, il constate, et à un moment il VOIT
 * que les deux portes ne font pas la même chose. Ce moment-là est tout le jeu :
 * un système a des lois, et l'on peut les déduire au lieu de les subir.
 *
 * POURQUOI UNE CHATIÈRE, ET NON UNE PORTE. La règle du miroir a changé — voir
 * `refus.ts` : porter une pièce à travers un miroir ne la retourne plus, seul
 * le lancer le fait. Avec un miroir qu'on FRANCHIT, le théorème mourait : on
 * lance la vrille à travers (D 2,00), on la rapporte en la portant par la même
 * porte (D 0,50), et la seconde paire ne sert à rien. Il faut que le miroir
 * soit une chose qu'on ne peut que viser. Sa petite face fait 1,20 : un homme
 * de 1,80 n'y entre pas, un géant encore moins, et l'autre face, de 4,80,
 * n'admet pas un géant de 7,20 — celui qui tient la pièce trop lourde pour un
 * homme. Le refus est visible dans le monde : une ouverture trop basse.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'ERREUR QU'ON VA FAIRE, ET ELLE EST PARFAITE. On vient d'apprendre à lancer
 * une vrille dans un miroir. On la lance : elle ressort D 2,00, trop lourde. On
 * cherche comment grandir, on trouve la porte ordinaire, on grandit, on la
 * prend — et l'on court au creux avec une vrille quatre fois trop grosse. Le
 * creux dit « elle déborde ». On la rapporte par la porte ordinaire, dans
 * l'autre sens, sans y penser : elle rentre. On n'a pas calculé, on a corrigé
 * la taille, et la main était déjà juste. C'est en repensant à la salle qu'on
 * comprend ce qu'on a fait.
 *
 * Et celui qui commence par porter la vrille intacte par la porte ordinaire
 * apprend la leçon dans l'autre ordre : L 2,00 déborde, L 0,50 « n'entre pas,
 * la tourner n'y changera rien » — la main, dite en dernier, quand c'est la
 * seule explication possible.
 *
 * LA QUEUE À LA COMÈTE, et il faut la dessiner exprès. On ne finit pas l'énigme
 * là où on l'a commencée : on ressort de la porte ordinaire à l'autre bout de
 * la cour, à taille d'homme, la vrille dans les bras. **LE CREUX EST DE CE
 * CÔTÉ-LÀ**, à dix mètres du débouché, et on le voit en arrivant.
 *
 * LE LIEU, ET CE QU'IL REVISITE (règle 8). La cour du creux qui refuse, en
 * plus long : mêmes murs, même dalle, même absence de toit. On la reconnaît
 * tout de suite, et l'on cherche donc tout de suite le miroir — qui est bien
 * là, à sa place, réduit à une chatière au pied du mur, et qui ne suffit plus.
 * Reprendre le décor d'une salle pour en démentir la leçon vaut mieux qu'un
 * panneau.
 *
 * UN CIEL DE VERRE, comme à la cour d'avant, et pour la même raison : ce qui
 * sort d'une grande face sort quatre fois plus vite, et la vrille est la seule
 * clef de la porte de sortie. Ici la chatière est au sol et ne laisse passer
 * que des lancers plats, mais on ne parie pas la salle sur un angle.
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

/** Verre : ça arrête le corps, ça arrête la pièce, ça ne se dessine pas. */
const verre = (min: [number, number, number], max: [number, number, number]): BoxDef =>
  ({ min, max, region: 'blanchiment', invisible: true });

const X0 = 170;
const X1 = 230;
const Z0 = 1670;
const Z1 = 1730;
const MUR = 12;
/** Dix-huit, comme au refus : au-dessus de la pièce qu'un géant tient en levant les yeux. */
const CIEL = 18;

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
 *
 * ET 0,50 PASSE LA CHATIÈRE avec de la marge : une pièce passe une face si elle
 * tient dans 96 % de sa hauteur et 90 % de sa largeur, soit 1,15 sur 1,08 pour
 * une ouverture de 1,20. Un homme de 1,80, lui, ne passe pas.
 */
const GRANDE = TAILLE * 4;

/** Le creux, au débouché de la porte ordinaire. */
const CREUX = { x: 216, y: 0.6, z: 1716 };

/**
 * LA CHATIÈRE ET SA GRANDE SŒUR, contre le mur ouest, soixante centimètres
 * devant la pierre — assez pour que le cadre respire, trop peu pour qu'on
 * passe derrière.
 */
const CHATIERE = 1.2;
const PETITE = { x: X0 + 0.6, z: 1720 };
const GRANDE_FACE = { x: X0 + 0.6, z: 1682 };

const decor = (): BoxDef[] => [
  b([X0 - 2, -3, Z0 - 2], [X1 + 2, 0, Z1 + 2], 1),

  b([X0 - 2, 0, Z0 - 2], [X0, MUR, Z1 + 2], 2),
  b([X1, 0, Z0 - 2], [X1 + 2, MUR, Z1 + 2], 2),
  b([X0, 0, Z0 - 2], [X1, MUR, Z0], 2),
  b([X0, 0, Z1], [X1, MUR, Z1 + 2], 2),

  // Le ciel de verre et ses rehausses, qui mordent de dix centimètres dans la
  // pierre pour qu'aucune face ne soit confondue avec celle d'un mur.
  verre([X0 - 2, MUR - 0.1, Z0 - 2], [X0, CIEL, Z1 + 2]),
  verre([X1, MUR - 0.1, Z0 - 2], [X1 + 2, CIEL, Z1 + 2]),
  verre([X0, MUR - 0.1, Z0 - 2], [X1, CIEL, Z0]),
  verre([X0, MUR - 0.1, Z1], [X1, CIEL, Z1 + 2]),
  verre([X0 - 2, CIEL - 0.1, Z0 - 2], [X1 + 2, CIEL + 0.5, Z1 + 2]),

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
   * Tant qu'on est petit, on ne voit qu'une moitié de cour. On lance la vrille
   * dans la chatière, elle ressort trop lourde, et l'on cherche comment
   * grandir sans savoir qu'il existe autre chose que ce miroir. C'est en
   * longeant le mur qu'on trouve la brèche, et derrière elle la seconde porte —
   * au moment exact où l'on en a besoin. Une fois grand, la tête au-dessus de
   * la lame, on voit les deux bouts d'un coup, et la cour se lit entière.
   *
   * Une brèche à son extrémité nord laisse passer à pied depuis le début, pour
   * qui longe le mur : rien n'est fermé, et le joueur qui explore avant de
   * réfléchir a le droit d'arriver le premier.
   */
  b([199, 0, Z0 + 2], [201, 5, 1718], 2),

  // ─── LES MAINS SUR LE MUR OUEST ────────────────────────────────────────
  //
  // De part et d'autre de la chatière, deux mains de trente-six centimètres ;
  // de part et d'autre de la grande face, deux mains quatre fois plus grandes.
  // Toutes de la MÊME main, l'encre tournée vers l'est d'où l'on vient. À un
  // ou deux centimètres devant le mur, jamais dessus.
  ...mainDEncre('blanchiment', X0 + 0.05, 0.1, PETITE.z - 1.05, true, 0.3, 1),
  ...mainDEncre('blanchiment', X0 + 0.05, 0.1, PETITE.z + 1.05, true, 0.3, 1),
  ...mainDEncre('blanchiment', X0 + 0.05, 0.4, GRANDE_FACE.z - 4.2, true, 1.2, 1),
  ...mainDEncre('blanchiment', X0 + 0.05, 0.4, GRANDE_FACE.z + 4.2, true, 1.2, 1),
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
 * LES DEUX PORTES, ET ELLES NE SE RESSEMBLENT PLUS.
 *
 * Elles se ressemblaient, et c'était le sujet : rien ne devait dire laquelle
 * retourne la gauche et la droite. Depuis que seul le lancer retourne, la
 * différence doit être dans le monde, et elle l'est : l'une est une chatière
 * qu'on ne franchit pas, l'autre une porte. Ce qu'elles FONT reste à
 * découvrir en le faisant — c'est la seule pédagogie que ce jeu accepte.
 *
 * LES QUATRE FACES SONT LOIN LES UNES DES AUTRES — trente-huit mètres en z,
 * cinquante-huit en x. Deux faces plantées au même point se disputent le même
 * plan : on traverse celle qu'on ne voulait pas, ou l'on ne traverse rien du
 * tout. C'est arrivé au premier assemblage de la descente.
 */
const PORTALS: PortalPairDef[] = [
  {
    // LE MIROIR, réduit à une chatière contre le mur ouest. On y lance la
    // vrille en visant vers l'ouest ; elle ressort par la grande face trente-
    // huit mètres plus au sud, vers l'est, quatre fois plus grosse et de
    // l'autre main. Un homme n'y entre pas (1,80 contre 1,20), un géant n'entre
    // pas dans la grande (7,20 contre 4,80). Un homme entre dans la grande, et
    // en ressort quart de lui-même par la chatière : ça ne casse rien, et ça se
    // défait en la repassant.
    id: 'miroir-blanchiment',
    miroir: true,
    colorBig: 0xc8492e,
    colorSmall: 0x2f4b7c,
    smallHeight: CHATIERE,
    smallWidth: CHATIERE,
    small: { position: [PETITE.x, 0.05, PETITE.z], yaw: Math.PI / 2 },
    big: { position: [GRANDE_FACE.x, 0.05, GRANDE_FACE.z], yaw: Math.PI / 2 },
  },
  {
    // LA PORTE ORDINAIRE, contre le mur est. On la franchit par sa PETITE face
    // pour aller chercher, géant, la vrille trop lourde ; et par sa GRANDE face
    // pour la rendre à sa taille de départ sans toucher à sa main. On en
    // ressort à dix mètres du creux, ce qui n'est pas une commodité mais la
    // règle : le logement doit être du côté où l'on arrive.
    id: 'ordinaire-blanchiment',
    colorBig: 0xc8492e,
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
  // On arrive par le mur sud, donc face au nord, la cour devant soi — et non
  // face au mur, la cour dans le dos. On repart par le mur nord, vers le nord.
  entree: { position: [176, 0.05, 1676], echelle: 0, lacet: 0 },
  sortie: { position: [206, 0.05, 1726], echelle: 0, lacet: 0 },
};

/** La taille attendue par le creux, pour les vérifications. */
export const BLANCHIMENT_TAILLE = TAILLE;
export const BLANCHIMENT_GRANDE = GRANDE;
export const BLANCHIMENT_CHATIERE = CHATIERE;
