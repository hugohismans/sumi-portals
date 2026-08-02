import type { LevelDef, PortalPairDef } from '../core/types.js';
import type { SalleModule } from './salles/contrat.js';

/**
 * LA DESCENTE — le premier mouvement de la suite, et il rapporte le bleu.
 *
 * Neuf salles qui s'enchaînent, où le Pinceau dessine lui-même la porte de la
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
 * TROIS LOIS DE TRACÉ, non négociables, qui décident de ce qu'on accepte ici :
 *
 * 1. Chaque salle revisite un lieu connu, à une taille nouvelle. Une salle qui
 *    ne revient sur rien est décorative.
 * 2. Toute salle qui demande de penser à une autre taille contient un étalon de
 *    cette taille. La petite face d'une porte mesure toujours la même chose.
 * 3. Le spectaculaire est la récompense de l'erreur.
 *
 * L'assemblage — quelle porte relie quelle salle, à quelle échelle, dans quel
 * ordre — est ici et nulle part ailleurs. C'est la seule chose qu'aucun auteur
 * de salle ne peut voir depuis son coin : la COURBE.
 */

/**
 * Les salles, dans l'ordre du voyage. Vide tant qu'elles arrivent ; chacune est
 * un fichier autonome sous `salles/`, conforme à `salles/contrat.ts`.
 */
const SALLES: SalleModule[] = [];

/** Portes de raccord, déclarées ici parce qu'elles appartiennent aux deux côtés. */
const RACCORDS: PortalPairDef[] = [];

/**
 * Assemble les salles en un monde.
 *
 * On concatène plutôt qu'on ne compose : une salle n'est que de la donnée, et
 * c'est cette propriété qui rend la suite possible. Cent salles se chargeront
 * comme une, puisqu'on n'en construit jamais qu'un niveau à la fois.
 */
const assembler = (): LevelDef => ({
  name: 'descente',
  spawn: SALLES[0]?.entree.position ?? [0, 0.3, 0],
  spawnYaw: 0,
  spawnScale: SALLES[0]?.entree.echelle ?? 0,
  regions: SALLES.map((s) => s.region),
  boxes: SALLES.flatMap((s) => s.boxes),
  carryables: SALLES.flatMap((s) => s.carryables ?? []),
  sockets: SALLES.flatMap((s) => s.sockets ?? []),
  tableaux: SALLES.flatMap((s) => s.tableaux ?? []),
  veilleurs: SALLES.flatMap((s) => s.veilleurs ?? []),
  portals: [...SALLES.flatMap((s) => s.portals ?? []), ...RACCORDS],
  guide: SALLES.flatMap((s) => s.stations),
  goal: { position: SALLES[SALLES.length - 1]?.sortie.position ?? [0, 0, 0], radius: 6 },
});

export const DESCENTE: LevelDef = assembler();

/** Les salles assemblées, pour les vérifications. */
export const SALLES_DESCENTE = SALLES;
