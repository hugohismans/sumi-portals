import type { LevelDef, PortalPairDef } from '../core/types.js';
import type { SalleModule } from './salles/contrat.js';
import { TOITS } from './salles/toits.js';
import { REFUS } from './salles/refus.js';
import { BLANCHIMENT } from './salles/blanchiment.js';
import { ESCALIER } from './salles/escalier.js';
import { ATELIER_HAUT } from './salles/atelierHaut.js';
import { VALLEE } from './salles/vallee.js';

/**
 * LA MONTÉE — le second mouvement de la suite, et il rapporte l'or.
 *
 * La descente allait chercher le bleu en rapetissant jusqu'au fond d'une fente
 * entre deux pavés. Celle-ci fait l'inverse et n'enseigne pas la même chose :
 * on ne découvre plus un monde en s'y glissant, **on reconnaît le sien de plus
 * haut**. Les toits qu'on n'atteignait pas sont des marches ; la côte rouge
 * qu'on a traversée en dix minutes se franchit en huit enjambées.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ET UNE IDÉE NEUVE, QUI DORMAIT DEPUIS DES SEMAINES : LA MAIN.
 *
 * Les portails miroirs existaient, étaient écrits et vérifiés, et ne se
 * voyaient pas — on dessinait chaque objet avec un cube, et `main: 'L'` et
 * `main: 'D'` donnaient exactement le même cube à l'écran. Un creux refusant un
 * bloc de la bonne taille sans raison visible est la pire chose qu'une énigme
 * puisse faire ; la mécanique restait donc morte faute d'une forme.
 *
 * La vrille lui donne un corps, et deux salles l'enseignent l'une après
 * l'autre : `refus` fait croire au joueur qu'une porte corrige la taille, et
 * `blanchiment` lui montre qu'elle en corrigeait deux. La seconde est la
 * meilleure sensation que ce jeu sache produire — un système a des lois, et
 * l'on peut les déduire au lieu de les subir.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'ASSEMBLAGE EST ICI, ET NULLE PART AILLEURS, comme pour la descente : quelle
 * porte relie quelle salle, à quelle échelle, dans quel ordre. C'est la seule
 * chose qu'aucun auteur de salle ne peut voir depuis son coin.
 */

const SALLES: SalleModule[] = [TOITS, REFUS, BLANCHIMENT, ESCALIER, ATELIER_HAUT, VALLEE];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LA LOI DE L'ENCHAÎNEMENT : UNE PORTE NE VAUT QU'UN CRAN
 *
 * L'échelle de sortie d'une salle et l'échelle d'entrée de la suivante
 * diffèrent d'exactement un cran. Deux crans demandent deux portes, donc une
 * salle intermédiaire ; zéro cran n'est franchissable par aucune porte du tout.
 * C'est vérifié automatiquement — sans quoi l'on découvrirait le défaut en
 * jouant, devant une porte qui refuse sans aucune raison visible dans le monde.
 *
 * LA MONTÉE, EN PALIERS :
 *
 *     toits       (×4,   ×4)      on reconnaît le village par en haut
 *     refus       (×1,   ×4)      ↑ miroir interne
 *     blanchiment (×1,   ×1)      ↑ miroir + ↓ porte ordinaire, net zéro
 *     escalier    (×4,   ×1)      ↓ porte interne, et l'on bâtit avant
 *     atelierHaut (×4,   ×4)      la couleur, paliers 2 et 3
 *     vallee      (×16,  ×16)     la maquette, et l'or au bout
 *
 *         1 → 0 → 0 → 1 → 1 → 2       et entre chaque, exactement un cran.
 *
 * TROIS DE CES SALLES CHANGENT L'ÉCHELLE CHEZ ELLES, par une porte qu'elles
 * déclarent elles-mêmes — c'est neuf, la descente n'en avait aucune. C'est ce
 * qui rend possible une salle où l'on doit être grand ET petit sans en sortir :
 * bâtir un escalier en géant pour l'homme qu'on va redevenir n'a de sens que si
 * les deux tailles sont dans la même pièce.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export interface Raccord {
  /** Rang de la salle d'où l'on part, dans `SALLES`. */
  depuis: number;
  /** Rang de celle où l'on arrive. */
  vers: number;
  /** Écart d'échelle : +1 si l'on grandit, −1 si l'on rapetisse. */
  cran: number;
  /** Nom du logement ou du tableau qui la descelle, s'il y en a un. */
  condition?: string;
  /** Où planter la face de départ, si ce n'est pas la sortie déclarée. */
  depart?: [number, number, number];
}

/**
 * Ce qui relie les salles.
 *
 * Deux portes seulement sont scellées, et ce sont les deux salles chirales :
 * on ne quitte le creux qui refuse qu'en ayant logé la vrille, et l'on ne
 * quitte le blanchiment qu'en ayant compris pourquoi la navette ne suffit pas.
 * Les quatre autres s'ouvrent d'elles-mêmes — trois d'entre elles ne demandent
 * rien, et une salle qui ne demande rien ne doit pas faire semblant.
 */
const RACCORDS: Raccord[] = [
  { depuis: 0, vers: 1, cran: -1 },
  { depuis: 1, vers: 2, cran: -1, condition: 'creux-refus' },
  { depuis: 2, vers: 3, cran: +1, condition: 'creux-blanchiment' },
  // ─── ET CE `condition`-CI N'EST PAS UNE DÉCORATION ────────────────────────
  //
  // C'est le dernier verrou de l'escalier, et son autrice ne pouvait pas le
  // poser : elle déclare le logement, l'assemblage décide s'il ferme quelque
  // chose. Sans lui, la salle se traverse sans avoir rien bâti — on descend par
  // le secours, on remonte par le secours, et l'escalier n'a jamais servi.
  //
  // C'est le genre de fil qui pend entre deux fichiers et que personne ne voit
  // rompre : la salle passe toutes ses vérifications, l'assemblage aussi, et
  // c'est l'ÉNIGME qui manque, pas le code.
  { depuis: 3, vers: 4, cran: +1, condition: 'creux-escalier' },
  // ET CELUI-CI SE CONDITIONNE SUR LE TABLEAU DE LA COUR, PAS SUR CELUI DE
  // L'ŒIL — c'est la seule chose qui rende le voyage obligatoire.
  //
  // L'atelier du haut porte deux tableaux. Celui de l'œil (palier 3) se
  // satisfait sans jamais descendre : trois familles, toutes sur le toit. Celui
  // de la cour (palier 2) demande les pots ET les tuiles, donc ×1 ET ×4, donc
  // les deux étages. Sceller la sortie sur le mauvais des deux rendrait
  // facultative la moitié de la salle, et personne ne le verrait : les deux
  // tableaux existent, les deux se remplissent, et c'est la LEÇON qui manque.
  //
  // Son autrice l'a écrit en gras dans son en-tête sans pouvoir le corriger —
  // un tableau appartient à la salle, la porte qu'il descelle appartient ici.
  { depuis: 4, vers: 5, cran: +1, condition: 'haut-tableau-cour' },
];

/** Écart d'échelle entre la sortie d'une salle et l'entrée de la suivante. */
export const ecartDeRaccord = (a: SalleModule, b: SalleModule): number =>
  b.entree.echelle - a.sortie.echelle;

/**
 * Fabrique la porte qui relie deux salles.
 *
 * Sa GRANDE face est du côté où l'on est grand, sa PETITE du côté où l'on est
 * petit — ce n'est pas un détail d'habillage : c'est la règle du monde, et un
 * joueur qui la voit inversée une seule fois cesse de faire confiance à ce
 * qu'il regarde.
 */
const raccorder = (r: Raccord): PortalPairDef => {
  const a = SALLES[r.depuis];
  const b = SALLES[r.vers];
  const [ax, ay, az] = r.depart ?? a.sortie.position;
  const [bx, by, bz] = b.entree.position;

  const departEstGrand = r.cran < 0;

  return {
    id: `montee-${a.nom}-${b.nom}`,
    condition: r.condition,
    dessinee: r.condition !== undefined,
    colorBig: 0xc8492e,
    colorSmall: 0x2f4b7c,
    // La taille de la petite face suit celle du joueur qui la franchit : une
    // porte taillée pour un géant est infranchissable par qui vient petit, et
    // c'est la faute la plus facile à commettre en assemblant.
    smallHeight: 2.8 * Math.pow(4, Math.min(a.sortie.echelle, b.entree.echelle)),
    smallWidth: 1.9 * Math.pow(4, Math.min(a.sortie.echelle, b.entree.echelle)),
    big: departEstGrand
      ? { position: [ax, ay, az], yaw: 0 }
      : { position: [bx, by, bz], yaw: Math.PI },
    small: departEstGrand
      ? { position: [bx, by, bz], yaw: Math.PI }
      : { position: [ax, ay, az], yaw: 0 },
  };
};

/**
 * Assemble les salles en un monde.
 *
 * On concatène plutôt qu'on ne compose : une salle n'est que de la donnée, et
 * c'est cette propriété qui rend la suite possible. Cent salles se chargeront
 * comme une, puisqu'on n'en construit jamais qu'un niveau à la fois.
 */
const assembler = (): LevelDef => ({
  name: 'La montée',
  spawn: TOITS.entree.position,
  spawnYaw: 0,
  spawnScale: TOITS.entree.echelle,
  regions: SALLES.map((s) => s.region),
  boxes: SALLES.flatMap((s) => s.boxes),
  carryables: SALLES.flatMap((s) => s.carryables ?? []),
  sockets: SALLES.flatMap((s) => s.sockets ?? []),
  tableaux: SALLES.flatMap((s) => s.tableaux ?? []),
  veilleurs: SALLES.flatMap((s) => s.veilleurs ?? []),
  portals: [...SALLES.flatMap((s) => s.portals ?? []), ...RACCORDS.map(raccorder)],
  guide: SALLES.flatMap((s) => s.stations),
  /**
   * LA TAILLE DU PINCEAU, JALON PAR JALON — et sans elle la vallée est ratée.
   *
   * Le guide est dessiné à ×1 par défaut. Dans la descente c'était sans
   * conséquence : on y vit entre ×1/4 et ×1, et un pinceau d'un mètre reste un
   * pinceau. Ici on marche à ×16, où le joueur mesure 28,80 — un guide d'un
   * mètre est alors **un fétu qu'on ne voit pas**, et le seul repère du plus
   * grand plan du jeu disparaît au moment où il sert le plus.
   *
   * L'autrice de la vallée l'a signalé sans pouvoir le corriger : la taille du
   * guide ne se décide pas depuis une salle, elle se décide ici. Chaque jalon
   * prend donc le palier de la salle qui le porte — c'est-à-dire exactement la
   * taille du joueur qui le regardera.
   */
  guideEchelle: SALLES.flatMap((s) => s.stations.map(() => s.entree.echelle)),
  /**
   * Par où le Pinceau PASSE. Voir `SalleModule.stationsPorte` : une salle dont
   * les stations sont des deux côtés d'une paroi doit nommer sa porte, sinon le
   * guide traverse la pierre et cesse d'être un guide.
   */
  guidePorte: SALLES.flatMap((s) => s.stationsPorte ?? s.stations.map(() => null)),
  // LE BUT EST LÀ OÙ DORT L'OR, sur la corniche au bout de la vallée. Le rayon
  // suit l'échelle du lieu : six mètres à taille d'homme, quatre-vingt-seize à
  // ×16, où le joueur en fait vingt-huit — un but qu'on ne peut pas manquer en
  // posant le pied à côté.
  goal: {
    position: VALLEE.sortie.position,
    radius: 6 * Math.pow(4, VALLEE.sortie.echelle),
  },
});

export const MONTEE: LevelDef = assembler();

/** Les salles et leurs raccords, pour les vérifications. */
export const SALLES_MONTEE = SALLES;
export const RACCORDS_MONTEE = RACCORDS;
