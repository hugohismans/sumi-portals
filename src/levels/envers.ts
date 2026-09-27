import { scaleOfLevel } from '../core/constants.js';
import type { LevelDef, PortalPairDef } from '../core/types.js';
import { LACET_PAR_DEFAUT, opposer, type SalleModule } from './salles/contrat.js';
import { BASCULE } from './salles/bascule.js';
import { PUITS_COUCHE } from './salles/puitsCouche.js';
import { ESCALIER_MURAL } from './salles/escalierMural.js';
import { CUVE } from './salles/cuve.js';
import { LUCARNE_VIOLETTE } from './salles/lucarneViolette.js';

/**
 * L'ENVERS — le quatrième mouvement, et il rapporte le violet.
 *
 * La descente allait chercher le bleu en rapetissant, la montée l'or en
 * grandissant, la mesure retirait l'étalon et le rendait. Celui-ci ne touche
 * pas à la taille : TOUT S'Y JOUE À ×1. Il change autre chose, qu'on croyait
 * aussi fixe que le monde — LE BAS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UNE SEULE PORTE NOUVELLE, ET CINQ SALLES POUR LA LIRE
 *
 * La porte violette est plane : elle ne change pas la taille. Elle change la
 * pesanteur, comme elle change la vitesse — le haut de qui la traverse tourne
 * du même angle que la face jumelle par rapport à la face d'entrée. Une face
 * debout dont la jumelle pend au plafond met les pieds au plafond ; une face
 * debout dont la jumelle est couchée contre un mur fait du mur le sol.
 *
 *     bascule          (libre)   le plafond est un sol, et il est meublé
 *     puitsCouche      (exige)   ce qu'on PORTE tourne avec soi
 *     escalierMural    (exige)   ce qu'on POSE garde le bas qu'on avait
 *     cuve             (libre)   le pinceau dort où seul un mur est un sol
 *     lucarneViolette  (libre)   le village pend au plafond, on lève les yeux
 *
 * Chaque salle n'a QU'UNE porte violette, aux cadres violets des deux côtés,
 * et un fil à plomb pendu à chaque linteau vers les pieds de qui en ressort :
 * sous une face couchée, il pend de côté, vers le mur — on lit « ici, le bas
 * est là » avant d'avoir essayé. Peu de faces par salle : chacune est une vue.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LA LOI DES RACCORDS, et elle est plus stricte que d'habitude : UN RACCORD NE
 * CHANGE JAMAIS LA PESANTEUR. Ses deux faces sont debout, planes, à l'encre ;
 * on y entre debout, on en ressort debout. Et chaque salle est bâtie pour
 * qu'on n'atteigne JAMAIS une face de raccord dans une autre pesanteur que la
 * sienne : couché contre un mur, on ne rencontre ni l'entrée ni la sortie —
 * sans quoi l'on arriverait couché dans la salle suivante, qui n'a pas été
 * bâtie pour ça. Toutes les salles sont closes sur leurs six faces : dans
 * chaque pesanteur qu'on y prend, tout ce qui tombe tombe sur quelque chose.
 *
 *     0 → 0 → 0 → 0 → 0       quatre portes planes, et pas un cran
 */
const SALLES: SalleModule[] = [BASCULE, PUITS_COUCHE, ESCALIER_MURAL, CUVE, LUCARNE_VIOLETTE];

/** La couleur des portes planes de raccord : l'encre du trait, qui ne promet rien. */
const ENCRE = 0x22201c;

export interface Raccord {
  depuis: number;
  vers: number;
  cran: number;
  condition?: string | string[];
  depart?: [number, number, number];
}

/**
 * Ce qui relie les salles. Une seule porte est scellée : celle du puits, par
 * son creux — on n'en sort qu'en ayant rapporté le jeton du mur. L'escalier ne
 * scelle rien : sa sortie est à 4,20, et c'est l'escalier qui l'ouvre. La cuve
 * non plus : on peut passer à la lucarne sans le pinceau, mais le chapitre ne
 * s'achève pas sans sa couleur (`RAPPORTE`), et la lucarne le dit.
 */
const RACCORDS: Raccord[] = [
  { depuis: 0, vers: 1, cran: 0 },
  { depuis: 1, vers: 2, cran: 0, condition: 'creux-puits' },
  { depuis: 2, vers: 3, cran: 0 },
  { depuis: 3, vers: 4, cran: 0 },
];

export const ecartDeRaccord = (a: SalleModule, b: SalleModule): number => b.entree.echelle - a.sortie.echelle;

const raccorder = (r: Raccord): PortalPairDef => {
  const a = SALLES[r.depuis];
  const b = SALLES[r.vers];
  const [ax, ay, az] = r.depart ?? a.sortie.position;
  const [bx, by, bz] = b.entree.position;
  const lacetDepart = opposer(a.sortie.lacet ?? LACET_PAR_DEFAUT);
  const lacetArrivee = b.entree.lacet ?? LACET_PAR_DEFAUT;
  const departEstGrand = r.cran < 0;
  // Zéro cran : une porte PLANE, deux faces de la même taille, à l'encre.
  const plane = r.cran === 0;
  return {
    id: `envers-${a.nom}-${b.nom}`,
    condition: r.condition,
    dessinee: r.condition !== undefined,
    plane,
    colorBig: plane ? ENCRE : 0xc8492e,
    colorSmall: plane ? ENCRE : 0x2f4b7c,
    smallHeight: 2.8 * Math.pow(4, Math.min(a.sortie.echelle, b.entree.echelle)),
    smallWidth: 1.9 * Math.pow(4, Math.min(a.sortie.echelle, b.entree.echelle)),
    // La face de départ REGARDE le joueur qui vient ; la face d'arrivée lui
    // tourne le dos — il en ressort en marchant droit dans la salle. Toutes
    // debout : un raccord ne tourne jamais la pesanteur.
    big: departEstGrand
      ? { position: [ax, ay, az], yaw: lacetDepart }
      : { position: [bx, by, bz], yaw: lacetArrivee },
    small: departEstGrand
      ? { position: [bx, by, bz], yaw: lacetArrivee }
      : { position: [ax, ay, az], yaw: lacetDepart },
  };
};

const assembler = (): LevelDef => ({
  name: 'L’envers',
  spawn: BASCULE.entree.position,
  spawnYaw: BASCULE.entree.lacet ?? 0,
  spawnScale: BASCULE.entree.echelle,
  // On naît debout. Le bas ne tourne qu'aux portes violettes.
  spawnHaut: '+y',
  regions: SALLES.map((s) => s.region),
  boxes: SALLES.flatMap((s) => s.boxes),
  carryables: SALLES.flatMap((s) => s.carryables ?? []),
  sockets: SALLES.flatMap((s) => s.sockets ?? []),
  tableaux: SALLES.flatMap((s) => s.tableaux ?? []),
  veilleurs: SALLES.flatMap((s) => s.veilleurs ?? []),
  averse: SALLES.flatMap((s) => (s.averse ? [s.averse] : [])),
  portals: [...SALLES.flatMap((s) => s.portals ?? []), ...RACCORDS.map(raccorder)],
  guide: SALLES.flatMap((s) => s.stations),
  // Des TAILLES, jamais des paliers : ici, 1 partout.
  guideEchelle: SALLES.flatMap((s) => s.stationsEchelle ?? s.stations.map(() => scaleOfLevel(s.entree.echelle))),
  guidePorte: SALLES.flatMap((s) => s.stationsPorte ?? s.stations.map(() => null)),
  // LE BUT EST SOUS L'AIGUILLE PENDUE, dans la lucarne — pas sur le pinceau,
  // qui dort une salle plus tôt : on le réveille, on vient ici, et le violet se
  // pose sous nos yeux au moment où l'on lève la tête.
  goal: {
    position: LUCARNE_VIOLETTE.sortie.position,
    radius: 6 * Math.pow(4, LUCARNE_VIOLETTE.sortie.echelle),
  },
});

export const ENVERS: LevelDef = assembler();

/** Les salles et leurs raccords, pour les vérifications. */
export const SALLES_ENVERS = SALLES;
export const RACCORDS_ENVERS = RACCORDS;
