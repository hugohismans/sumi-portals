import type { LevelDef, PortalPairDef } from '../core/types.js';
import type { SalleModule } from './salles/contrat.js';
import { LAVOIR } from './salles/lavoir.js';
import { CONDUIT } from './salles/conduit.js';
import { CREUX } from './salles/creux.js';
import { ATELIER } from './salles/atelier.js';
import { BOL } from './salles/bol.js';
import { PLUIE } from './salles/pluie.js';

/**
 * LA DESCENTE — le premier mouvement de la suite, et il rapporte le bleu.
 *
 * Des salles qui s'enchaînent, où le Pinceau dessine lui-même la porte de la
 * suivante. Pas d'ascenseur, pas de sas, pas d'écran de victoire : on ne quitte
 * jamais le monde, on le regarde de plus près.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI TOUT TIENT DANS UN SEUL NIVEAU
 *
 * Une porte dessinée n'a de sens que si l'on voit à travers AVANT de passer.
 * Enchaîner par rechargement de page donnerait un écran blanc au milieu du
 * geste — c'est-à-dire un sas déguisé, exactement ce qu'on refuse.
 *
 * Chaque salle est donc une POCHE, plantée loin des autres, avec sa région, sa
 * palette et son brouillard. C'est ce que font déjà le jardin et la côte rouge
 * du monde central, à cinq cents unités de part et d'autre : les portes seules
 * les relient, et l'on ne voit jamais l'une depuis l'autre.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'ASSEMBLAGE EST ICI, ET NULLE PART AILLEURS. Quelle porte relie quelle
 * salle, à quelle échelle, dans quel ordre : c'est la seule chose qu'aucun
 * auteur de salle ne peut voir depuis son coin. C'est **la courbe**.
 */

/**
 * Les salles, dans l'ordre du voyage.
 *
 * Chacune est un fichier autonome sous `salles/`, conforme à `salles/contrat.ts`
 * et vérifiée en permanence par `src/core/__check.ts`.
 */
const SALLES: SalleModule[] = [LAVOIR, CONDUIT, CREUX, ATELIER, BOL, PLUIE];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LA LOI DE L'ENCHAÎNEMENT : UNE PORTE NE VAUT QU'UN CRAN
 *
 * Une paire de portails multiplie ou divise par quatre. Toujours, sans
 * exception, parce que c'est le verbe unique du jeu.
 *
 * Il en découle une contrainte que rien d'autre ne rappelle : **l'échelle de
 * sortie d'une salle et l'échelle d'entrée de la suivante doivent différer
 * d'exactement un cran.** Deux crans d'écart demandent deux portes, donc une
 * salle intermédiaire ; zéro cran d'écart n'est franchissable par aucune porte
 * du tout.
 *
 * C'est vérifié automatiquement plus bas. Sans cette vérification, on
 * découvrirait le défaut en jouant — devant une porte qui refuse, sans aucune
 * raison visible dans le monde, ce qui est la pire chose que ce jeu puisse
 * faire.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export interface Raccord {
  /** Rang de la salle d'où l'on part, dans `SALLES`. */
  depuis: number;
  /** Rang de celle où l'on arrive. Pas forcément la suivante : voir plus bas. */
  vers: number;
  /** Écart d'échelle : +1 si l'on grandit, −1 si l'on rapetisse. */
  cran: number;
  /** Nom du logement ou du tableau qui la descelle, s'il y en a un. */
  condition?: string;
  /**
   * Où planter la face de départ, si ce n'est pas la sortie déclarée de la
   * salle.
   *
   * Il en faut une dès qu'une salle a DEUX portes qui en partent : sans ça, les
   * deux se retrouvent au même endroit, exactement superposées, et l'on
   * traverse celle qu'on ne voulait pas — ou pire, on ne traverse rien du tout
   * parce que les deux plans se disputent le même point. Le premier assemblage
   * l'a fait, et rien dans le monde ne l'aurait expliqué au joueur.
   */
  depart?: [number, number, number];
}

/**
 * Ce qui relie les salles.
 *
 * La condition est presque toujours le CHEVALET de la salle qu'on quitte : on
 * ne passe qu'en ayant tendu la page. C'est la mécanique qui porte tout le
 * mouvement, et elle se lit ici d'un coup d'œil.
 */
const RACCORDS: Raccord[] = [
  { depuis: 0, vers: 1, cran: -1, condition: 'chevalet-lavoir' },
  { depuis: 1, vers: 2, cran: +1 },
  { depuis: 2, vers: 3, cran: -1 },
  { depuis: 3, vers: 4, cran: +1 },
  // ET UN DÉTOUR, qui repart du lavoir. Voir plus bas.
  { depuis: 0, vers: 5, cran: -1, depart: [-203, 0.05, 706.4] },
];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * L'ORDRE N'EST PAS CELUI QUE J'AVAIS PRÉVU, ET C'EST L'ARITHMÉTIQUE QUI L'A
 * DÉCIDÉ.
 *
 * Les six salles ont pour paliers (entrée, sortie) :
 *
 *     lavoir (×1, ×1) · conduit (×1/4, ×1) · creux (×4, ×4)
 *     atelier (×1, ×1/4) · bol (×1, ×1/4) · pluie (×1/4, ×1/4)
 *
 * Trois d'entre elles s'abordent par une échelle qui exige un prédécesseur
 * quittant à ×1 — le conduit, les creux et la pluie. Or DEUX SALLES SEULEMENT
 * se quittent à ×1 : le lavoir et le conduit. Une file unique en laisse donc
 * forcément une dehors, et aucune manière d'ordonner les six ne l'évite. Ce
 * n'est pas un manque d'imagination, c'est un compte.
 *
 * D'où la cour de pluie en DÉTOUR, à partir du lavoir. Elle ne demande rien,
 * elle ne rapporte rien, et elle installe en douce ce qui comptera dans le
 * puits : à cette taille, tout ce qui tombe tombe vite. Une salle qui
 * n'enseigne qu'en passant est exactement ce qu'on peut se permettre de rendre
 * facultatif — et le joueur qui la manque perdra deux essais de plus dans le
 * conduit, ce qui est une punition juste et douce.
 *
 * Le voyage devient donc : le lavoir, puis le puits, puis la cour à trois
 * gradins, puis l'atelier, puis le bol où dort le bleu. Et sur le côté, pour
 * qui regarde, une cour sous la pluie.
 * ═══════════════════════════════════════════════════════════════════════════
 */

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

  // On rapetisse en franchissant une GRANDE face ; on grandit en franchissant
  // une petite. La face plantée dans la salle de départ suit donc le signe.
  const departEstGrand = r.cran < 0;

  return {
    id: `raccord-${a.nom}-${b.nom}`,
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
  name: 'La descente',
  spawn: SALLES[0].entree.position,
  spawnYaw: 0,
  spawnScale: SALLES[0].entree.echelle,
  regions: SALLES.map((s) => s.region),
  boxes: SALLES.flatMap((s) => s.boxes),
  carryables: SALLES.flatMap((s) => s.carryables ?? []),
  sockets: SALLES.flatMap((s) => s.sockets ?? []),
  tableaux: SALLES.flatMap((s) => s.tableaux ?? []),
  veilleurs: SALLES.flatMap((s) => s.veilleurs ?? []),
  portals: [...SALLES.flatMap((s) => s.portals ?? []), ...RACCORDS.map(raccorder)],
  guide: SALLES.flatMap((s) => s.stations),
  // LE BUT EST LÀ OÙ DORT LE BLEU, et non au bout du tableau : la cour de pluie
  // est un détour, et finir un voyage dans un détour n'aurait aucun sens.
  goal: {
    position: BOL.sortie.position,
    radius: 6 * Math.pow(4, BOL.sortie.echelle),
  },
});

export const DESCENTE: LevelDef = assembler();

/** Les salles et leurs raccords, pour les vérifications. */
export const SALLES_DESCENTE = SALLES;
export const RACCORDS_DESCENTE = RACCORDS;
