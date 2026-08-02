import type { BoxDef, CarryableDef, PortalPairDef, SocketDef } from '../../core/types.js';
import type { SalleModule } from './contrat.js';

/**
 * LE CREUX QUI REFUSE — la première salle où un objet a une MAIN.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE ENSEIGNE, ET CE QU'ELLE CACHE
 *
 * Ce qu'elle enseigne :  une porte corrige la taille.
 * Ce qu'elle cache    :  cette porte-là en a corrigé DEUX.
 *
 * Le joueur trouve une vrille et un creux à sa forme. Il la présente, elle
 * refuse — visiblement trop petite. Il la porte à travers la porte du fond, il
 * revient, elle entre. Il en conclut « la porte l'a agrandie », et il a
 * parfaitement raison.
 *
 * Il ignore que la porte était un MIROIR, et que le creux exigeait aussi la
 * main droite. Les deux corrections sont arrivées dans le même geste, et rien
 * ne permet de les démêler ici.
 *
 * C'est délibéré. Une leçon qu'on croit avoir comprise se retient mieux qu'une
 * leçon qu'on subit — et le blanchiment, la salle d'après, sépare les deux
 * effets en exigeant la taille d'origine ET l'autre main. Cette salle-ci est le
 * brouillon de celle-là, et l'erreur du joueur en est le premier trait.
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
 * Cinq corrections ont été essayées et ont toutes cassé autre chose. Tant qu'il
 * vit, on dessine des salles qui n'ont pas de linteau bas : c'est gratuit, et
 * c'est plus honnête que d'espérer que le joueur ne se colle pas au mur.
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

/** La cour : soixante mètres sur soixante, murs à douze. */
const X0 = -30;
const X1 = 30;
const Z0 = 1670;
const Z1 = 1730;
const MUR = 12;

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
 * Une salle voisine est morte pour deux millimètres et demi sur ce seuil-là.
 * Quarante centimètres est un choix de couard, et c'est le bon.
 */
const VRILLE_PETITE = 0.4;
const VRILLE_GRANDE = VRILLE_PETITE * 4;

const CREUX = { x: 0, y: 0.9, z: 1676 };

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
];

/**
 * LE CREUX. Il exige trois choses et n'en montre qu'une.
 *
 * `forme` — la vrille : elle est dessinée en creux, on voit ce qu'il attend.
 * `size`  — 1,60 : quatre fois ce qu'on tient, et cet écart-là saute aux yeux.
 * `main`  — 'D'  : invisible, et c'est tout le sujet de la salle suivante.
 *
 * `portee` est large parce qu'un joueur à ×4 repose ce qu'il porte À QUATORZE
 * MÈTRES DEVANT LUI. Viser un socle de trois mètres à quatorze mètres de
 * distance est une épreuve d'adresse, et ce jeu n'en est pas une — encore moins
 * au doigt sur un téléphone. Ce nombre a déjà rendu une salle entière
 * infaisable sans que rien ne le laisse voir.
 */
const SOCKETS: SocketDef[] = [
  {
    id: 'creux-refus',
    forme: 'vrille',
    main: 'D',
    position: [CREUX.x, CREUX.y, CREUX.z],
    size: VRILLE_GRANDE,
    portee: 18,
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
 * `miroir: true` fait basculer la main de ce qu'on porte. Le joueur ne le voit
 * pas : la vrille gauche et la vrille droite se ressemblent tant qu'on ne les
 * compare pas. Elle vient pourtant de changer de forme dans ses bras.
 *
 * ELLE N'A PAS DE `condition` : on la franchit tant qu'on veut, dans les deux
 * sens. Repasser rend la vrille à sa main et à sa taille d'origine, et rien
 * n'est perdu. C'est la règle « ne jamais piéger », appliquée à la lettre — et
 * ici elle est plus qu'une prudence : le joueur qui fait l'aller-retour vient
 * de découvrir tout seul que deux passages s'annulent, ce qui est exactement le
 * théorème dont il aura besoin à la salle suivante.
 */
const PORTALS: PortalPairDef[] = [
  {
    id: 'miroir-refus',
    miroir: true,
    colorBig: 0x8a5a3b,
    colorSmall: 0x2f4b7c,
    smallHeight: 2.8,
    smallWidth: 1.9,
    // Normale −x : on marche vers l'est pour la franchir.
    small: { position: [28, 0.05, 1700], yaw: -Math.PI / 2 },
    // Normale +x : on en ressort en marchant vers l'est, face à la cour.
    big: { position: [-28, 0.05, 1690], yaw: Math.PI / 2 },
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
