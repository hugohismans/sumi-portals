/**
 * L'ENVERS, JOUÉ DE BOUT EN BOUT — la preuve que le chapitre se finit, et que
 * ses fautes se rattrapent.
 *
 * Une seule simulation, du départ au but, sans jamais poser le joueur nulle
 * part : on naît au sud du lavoir, on passe au plafond et l'on en revient, on
 * marche sur le mur du puits jusqu'au jeton, on bâtit un escalier sur le mur
 * nord de la cour, on descend dans la cuve couchée réveiller le violet, et
 * l'on vient se tenir sous le village pendu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE PILOTE MARCHE DANS SON REPÈRE. Sur un mur, « devant » n'est plus un cap
 * du monde : le lacet se lit autour du haut du joueur (`REPERES[haut]`). Les
 * gestes d'ici — marcher vers un point, le viser, bondir — projettent donc
 * chaque cible dans le repère du moment, exactement comme le ferait la souris
 * d'un joueur qui regarde le point. Rien d'autre ne change.
 *
 * LES SEULES LIBERTÉS, et ce sont celles du rendu :
 *   – `couleursConnues` : les quatre pigments rapportés des chapitres d'avant ;
 *   – `portesFermees.delete(...)` sur la porte dessinée du puits, APRÈS avoir
 *     constaté que son creux est garni — c'est le Pinceau qui la trace.
 * Pas de téléportation, pas de creux rempli à la main, pas de haut forcé.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { EYE_FRACTION, PLAYER_HEIGHT, PLAYER_RADIUS, TICK_DT, scaleOfLevel } from './constants.js';
import { Simulation } from './simulation.js';
import { REPERES, boiteVersLocal, vecteurHaut, versLocal, versMonde, vueDe, type Haut } from './pesanteur.js';
import { isClear } from './physics.js';
import { REACH } from './carryables.js';
import { vec3, type Vec3 } from './math.js';
import { ENVERS, SALLES_ENVERS } from '../levels/envers.js';
import { BASCULE } from '../levels/salles/bascule.js';
import { PUITS_COUCHE } from '../levels/salles/puitsCouche.js';
import { ESCALIER_MURAL } from '../levels/salles/escalierMural.js';
import { CUVE, CUVE_BORDS } from '../levels/salles/cuve.js';
import { LUCARNE_VIOLETTE, LUCARNE_VIOLETTE_ENVERS } from '../levels/salles/lucarneViolette.js';
import type { SalleModule } from '../levels/salles/contrat.js';
import type { Check } from './__pilote.js';
import type { BoxDef, InputCommand, TickEvents } from './types.js';

export type V3 = [number, number, number];

// ─── LES GESTES, DANS LE REPÈRE DU JOUEUR ────────────────────────────────────

export const ordreL = (sim: Simulation, o: Partial<InputCommand> = {}): InputCommand => ({
  forward: 0, strafe: 0, jump: false, sprint: false, interact: false, throwIt: false, yaw: sim.player.yaw, pitch: 0, ...o,
});
const repere = (sim: Simulation) => REPERES[sim.player.haut ?? '+y'];
export const enRepere = (sim: Simulation, p: V3 | Vec3): Vec3 =>
  versLocal(repere(sim), Array.isArray(p) ? vec3(p[0], p[1], p[2]) : vec3(p.x, p.y, p.z), vec3());
/** Le lacet qui, dans le repère du joueur, regarde vers ce point. */
export const lacetVers = (sim: Simulation, cible: V3): number => {
  const a = enRepere(sim, sim.player.position);
  const c = enRepere(sim, cible);
  return Math.atan2(c.x - a.x, c.z - a.z);
};
/** La distance au point, mesurée sur SON sol. */
export const ecartAuSol = (sim: Simulation, cible: V3): number => {
  const a = enRepere(sim, sim.player.position);
  const c = enRepere(sim, cible);
  return Math.hypot(c.x - a.x, c.z - a.z);
};
/** La hauteur des pieds le long du haut : sur un mur, la distance au mur. */
export const hauteurL = (sim: Simulation): number => enRepere(sim, sim.player.position).y;

const garder = (tout: TickEvents, e: TickEvents): void => {
  for (const k of Object.keys(e) as (keyof TickEvents)[]) {
    if (e[k] !== undefined) (tout as Record<string, unknown>)[k] = e[k];
  }
};
export const attendreL = (sim: Simulation, n: number): TickEvents => {
  const tout: TickEvents = {};
  for (let i = 0; i < n; i++) garder(tout, sim.step(ordreL(sim), TICK_DT));
  return tout;
};
/**
 * Marcher jusqu'à un point, au décimètre, en ralentissant à l'approche — le
 * joueur qui lâche la touche un peu avant d'arriver. S'arrête net à toute
 * traversée ou tout refus : un pilote qui passe une porte sans le vouloir doit
 * le dire, pas continuer de l'autre côté.
 */
export const avancerL = (sim: Simulation, cible: V3, tol = 0.25, ticks = 60 * 20): TickEvents => {
  const tout: TickEvents = {};
  for (let i = 0; i < ticks; i++) {
    const d = ecartAuSol(sim, cible);
    if (d < tol) break;
    const lent = d < scaleOfLevel(sim.player.scaleLevel) * 1.5 ? 0.15 : 1;
    const e = sim.step(ordreL(sim, { forward: lent, yaw: lacetVers(sim, cible) }), TICK_DT);
    garder(tout, e);
    if (e.traversed || e.refused) break;
  }
  garder(tout, attendreL(sim, 20));
  return tout;
};
/** Marcher vers un point AU-DELÀ d'une porte, jusqu'à la franchir (ou être refusé). */
export const franchirVers = (sim: Simulation, cible: V3, ticks = 60 * 6): TickEvents => {
  const tout: TickEvents = {};
  for (let i = 0; i < ticks; i++) {
    const e = sim.step(ordreL(sim, { forward: 1, yaw: lacetVers(sim, cible) }), TICK_DT);
    garder(tout, e);
    if (e.traversed || e.refused) break;
  }
  garder(tout, attendreL(sim, 40));
  return tout;
};
/** Regarder un point — lacet ET inclinaison, dans son repère — et appuyer sur E. */
export const agirL = (sim: Simulation, cible: V3): TickEvents => {
  const a = enRepere(sim, sim.player.position);
  const c = enRepere(sim, cible);
  const yaw = Math.atan2(c.x - a.x, c.z - a.z);
  const oeil = a.y + PLAYER_HEIGHT * EYE_FRACTION * scaleOfLevel(sim.player.scaleLevel);
  const pitch = Math.atan2(c.y - oeil, Math.hypot(c.x - a.x, c.z - a.z));
  const tout: TickEvents = {};
  garder(tout, sim.step(ordreL(sim, { yaw, pitch }), TICK_DT));
  garder(tout, sim.step(ordreL(sim, { yaw, pitch, interact: true }), TICK_DT));
  garder(tout, sim.step(ordreL(sim, { yaw, pitch }), TICK_DT));
  return tout;
};
/** Clic : lancer ce qu'on tient, d'un lacet et d'une inclinaison lus dans son repère. */
export const lancerL = (sim: Simulation, yaw: number, pitch: number): TickEvents => {
  const tout: TickEvents = {};
  garder(tout, sim.step(ordreL(sim, { yaw, pitch }), TICK_DT));
  garder(tout, sim.step(ordreL(sim, { yaw, pitch, throwIt: true }), TICK_DT));
  garder(tout, sim.step(ordreL(sim, { yaw, pitch }), TICK_DT));
  return tout;
};
/**
 * S'élancer vers un appui en tenant le saut, et TOUT LÂCHER dès qu'on y est
 * posé (voir `bondirVers` : un saut tenu fait rebondir jusqu'à tomber).
 */
export const bondirL = (sim: Simulation, cible: V3, ticks = 60 * 6): void => {
  for (let i = 0; i < ticks; i++) {
    const a = enRepere(sim, sim.player.position);
    const c = enRepere(sim, cible);
    const d = Math.hypot(c.x - a.x, c.z - a.z);
    if (d < 0.45 && sim.player.grounded && a.y > c.y - 0.2) break;
    sim.step(ordreL(sim, { forward: d > 0.25 ? 1 : 0, jump: true, yaw: Math.atan2(c.x - a.x, c.z - a.z) }), TICK_DT);
  }
  attendreL(sim, 24);
};

export const ouEst = (sim: Simulation): string => {
  const p = sim.player.position;
  return `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}) haut ${sim.player.haut ?? '+y'}${sim.player.grounded ? '' : ', en l’air'}`;
};
const piece = (sim: Simulation, id: string) => sim.carryables.items.find((c) => c.id === id)!;

// ─── LE CHAPITRE ─────────────────────────────────────────────────────────────

export const piloterEnvers = (check: Check): void => {
  console.log('\n— L’envers : le chapitre entier, dans l’ordre, en une seule partie —');
  const sim = new Simulation(ENVERS);
  sim.couleursConnues = ['rouge', 'vert', 'bleu', 'or'];
  attendreL(sim, 30);
  check('on naît debout au sud du lavoir, face au nord', sim.player.grounded && sim.player.haut === undefined && Math.abs(sim.player.yaw) < 1e-9, ouEst(sim));

  // ═══════════════════════════════════════════════════════════════════════
  // L'ENVERS — la porte violette, seule : au plafond et retour, un galet en main.
  // ═══════════════════════════════════════════════════════════════════════
  {
    avancerL(sim, [-498.6, 0, 3893.9], 0.2);
    const prise = agirL(sim, [-497.6, 0.17, 3893.9]);
    // Le plus proche du regard, parmi les trois du sol.
    const galet = prise.carry?.id ?? '';
    check('l’envers : on prend un galet du sol', ['galet-bascule-1', 'galet-bascule-2', 'galet-bascule-3'].includes(galet) && prise.carry!.taken, JSON.stringify(prise.carry ?? null));
    avancerL(sim, [-500, 0, 3895.3], 0.15);
    const a = franchirVers(sim, [-500, 0, 3899]);
    check(
      'l’envers : par A, debout au sol, on ressort de B les pieds au plafond',
      a.traversed?.pairId === 'bascule-porte' && sim.player.haut === '-y' && sim.player.grounded && sim.player.position.y === 7,
      `${JSON.stringify(a.traversed ?? null)} ${ouEst(sim)}`,
    );
    check('l’envers : et le galet est venu avec nous, dans les mains', galet !== '' && sim.carryables.held?.id === galet, sim.carryables.held?.id ?? 'rien en main');
    // On s'écarte de B avant tout : elle regarde le nord, et un pas vers le sud la reprend.
    avancerL(sim, [-500, 7, 3905], 0.2);
    const g = piece(sim, galet || 'galet-bascule-1');
    lancerL(sim, sim.player.yaw, 0.35);
    attendreL(sim, 150);
    check(
      'l’envers : lancé du plafond, le galet « tombe vers le haut » et s’y pose',
      !g.held && g.haut === '-y' && g.grounded && g.position.y + g.size === 7,
      `haut ${g.haut ?? '+y'}, ${g.grounded ? 'posé' : 'en vol'}, dessus à ${(g.position.y + g.size).toFixed(3)}`,
    );
    // Le banc du plafond : on y monte, la tête en bas.
    avancerL(sim, [-496.3, 7, 3904.2], 0.2);
    check('l’envers : on monte sur le banc du plafond — il porte, la tête en bas', sim.player.grounded && Math.abs(sim.player.position.y - 6.52) < 1e-6, ouEst(sim));
    // Au bout de l'allée, AU-DESSUS de la sortie : on la survole sans jamais y tomber.
    avancerL(sim, [-500, 7, 3906.6], 0.2);
    const survol = franchirVers(sim, [-500, 7, 3912], 60 * 2);
    for (let i = 0; i < 20; i++) sim.step(ordreL(sim, { jump: true, yaw: sim.player.yaw }), TICK_DT);
    attendreL(sim, 40);
    check(
      'l’envers : au plafond, au-dessus de la sortie, on saute et l’on bute au mur — la sortie reste hors d’atteinte',
      survol.traversed === undefined && sim.player.haut === '-y' && sim.player.grounded,
      `${JSON.stringify(survol.traversed ?? null)} ${ouEst(sim)}`,
    );
    // Retour : B par devant, en marchant vers le sud.
    avancerL(sim, [-500, 7, 3904.6], 0.15);
    const b = franchirVers(sim, [-500, 7, 3899]);
    check(
      'l’envers : on reprend B par devant, et l’on retombe debout devant A',
      b.traversed?.pairId === 'bascule-porte' && b.traversed.from === 'small' && sim.player.haut === undefined && sim.player.grounded && sim.player.position.y === 0,
      `${JSON.stringify(b.traversed ?? null)} ${ouEst(sim)}`,
    );
    // On contourne A (son dos regarde le nord) et l'on va à la sortie.
    avancerL(sim, [-501.6, 0, 3896.2], 0.3);
    avancerL(sim, [-501.6, 0, 3899], 0.3);
    avancerL(sim, [-500, 0, 3905], 0.15);
    const s = franchirVers(sim, [-500, 0, 3909]);
    check(
      'l’envers → le puits couché : par la porte du nord, debout, on arrive au fond du puits',
      s.traversed?.pairId === 'envers-bascule-puitsCouche' && sim.player.haut === undefined,
      `${JSON.stringify(s.traversed ?? null)} ${ouEst(sim)}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LE PUITS COUCHÉ — le jeton du mur, rapporté debout.
  // ═══════════════════════════════════════════════════════════════════════
  {
    // D'abord les fautes : la sortie est scellée, et le jeton ne se cueille pas d'en bas.
    avancerL(sim, [-298, 0, 3903.3], 0.15);
    const scellee = franchirVers(sim, [-298, 0, 3908], 60 * 2);
    check('puits : la sortie est scellée tant que le creux est vide', scellee.refused?.reason === 'scelle', JSON.stringify(scellee.refused ?? scellee.traversed ?? null));
    avancerL(sim, [-298, 0, 3898.2], 0.3);
    avancerL(sim, [-304.3, 0, 3898.2], 0.2);
    let cueilli = false;
    for (let i = 0; i < 6 && !cueilli; i++) {
      sim.step(ordreL(sim, { jump: true, yaw: sim.player.yaw }), TICK_DT);
      for (let t = 0; t < 12; t++) sim.step(ordreL(sim, { yaw: sim.player.yaw }), TICK_DT);
      cueilli = agirL(sim, [-304.85, 20, 3900]).carry !== undefined;
      attendreL(sim, 40);
    }
    check('puits : du fond, même en sautant, le jeton à vingt mètres ne se prend pas', !cueilli && sim.carryables.held === null, ouEst(sim));

    // Puis le bon geste : la porte du fond, le mur.
    avancerL(sim, [-300, 0, 3899.3], 0.15);
    const a = franchirVers(sim, [-300, 0, 3904]);
    check(
      'puits : par la porte du fond, on ressort couché sur le mur ouest — le mur est le sol',
      a.traversed?.pairId === 'puitsCouche-porte' && sim.player.haut === '+x' && sim.player.grounded && sim.player.position.x === -305,
      `${JSON.stringify(a.traversed ?? null)} ${ouEst(sim)}`,
    );
    avancerL(sim, [-305, 21.1, 3900], 0.2);
    const prise = agirL(sim, [-304.85, 20, 3900]);
    check('puits : vingt mètres plus haut, le jeton est posé sur notre sol, et on le prend', prise.carry?.id === 'jeton-puits' && prise.carry.taken, `${JSON.stringify(prise.carry ?? null)} ${ouEst(sim)}`);
    avancerL(sim, [-305, 6, 3900], 0.2);
    const b = franchirVers(sim, [-305, 1, 3900]);
    check(
      'puits : on reprend la jumelle par devant, et l’on ressort debout au fond, le jeton en main',
      b.traversed?.pairId === 'puitsCouche-porte' && sim.player.haut === undefined && sim.carryables.held?.id === 'jeton-puits',
      `${JSON.stringify(b.traversed ?? null)} ${ouEst(sim)}`,
    );
    avancerL(sim, [-298, 0, 3899.4], 0.3);
    avancerL(sim, [-296.44, 0, 3903], 0.08);
    const pose = agirL(sim, [-295.5, 1.1, 3903]);
    const plein = { ...pose, ...attendreL(sim, 90) };
    const j = piece(sim, 'jeton-puits');
    check(
      'puits : posé sur son socle, le jeton — qui tombe désormais comme nous — garnit le creux',
      pose.carry?.taken === false && j.haut === undefined && plein.socketFilled?.socketId === 'creux-puits' && sim.conditionsRemplies.has('creux-puits'),
      `${JSON.stringify(pose.carry ?? null)} ${JSON.stringify(plein.socketFilled ?? null)} jeton en (${j.position.x.toFixed(2)}, ${j.position.y.toFixed(2)}, ${j.position.z.toFixed(2)})`,
    );
    // Le Pinceau trace la porte : on le fait pour lui, APRÈS avoir vu le verrou levé.
    if (sim.conditionsRemplies.has('creux-puits')) sim.portesFermees.delete('envers-puitsCouche-escalierMural');
    avancerL(sim, [-298, 0, 3903.3], 0.15);
    const s = franchirVers(sim, [-298, 0, 3908]);
    check(
      'puits → escalier mural : la sortie dessinée s’ouvre, et l’on arrive debout dans la cour',
      s.traversed?.pairId === 'envers-puitsCouche-escalierMural' && sim.player.haut === undefined,
      `${JSON.stringify(s.traversed ?? null)} ${ouEst(sim)}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // L'ESCALIER MURAL — la colonne d'abord, puis la diagonale.
  // ═══════════════════════════════════════════════════════════════════════
  {
    const BALCON: V3 = [-103.2, 4.2, 3903.8];
    // La faute du sol : on court et l'on saute vers le balcon.
    avancerL(sim, [-101.5, 0, 3902.6], 0.3);
    bondirL(sim, BALCON, 60 * 3);
    check('escalier mural : du sol, le balcon à 4,20 ne s’atteint pas', sim.player.position.y < 1, ouEst(sim));

    /**
     * Porter un cube par la porte, le poser couché au mur nord, et revenir
     * debout. `approche` : d'où on le prend, au sol, du côté où il y a de la
     * place ; on rejoint ensuite la porte par le couloir x = −99, entre le
     * tas et la face d'arrivée (dont le dos fait mur).
     */
    const poserAuMur = (id: string, approche: V3, x: number, yCentre: number): { traverse: boolean; retour: boolean; colle: boolean } => {
      const c = piece(sim, id);
      if (sim.player.position.z > 3900) avancerL(sim, [-99.0, 0, 3901.5], 0.3);
      avancerL(sim, [-99.0, 0, approche[2]], 0.3);
      avancerL(sim, approche, 0.15);
      agirL(sim, [c.position.x, c.position.y + c.size / 2, c.position.z]);
      avancerL(sim, [-99.0, 0, approche[2]], 0.3);
      avancerL(sim, [-99.0, 0, 3898.4], 0.3);
      avancerL(sim, [-97.5, 0, 3898.4], 0.15);
      const aller = franchirVers(sim, [-97.5, 0, 3903]);
      // Couché, le pied du mur est « devant » : on se poste un bras et une
      // caisse avant le point voulu, et l'on pose en regardant droit devant.
      avancerL(sim, [x, yCentre + 1.94, 3905], 0.05);
      const yaw = lacetVers(sim, [x, yCentre - 5, 3905]);
      sim.step(ordreL(sim, { yaw }), TICK_DT);
      sim.step(ordreL(sim, { yaw, interact: true }), TICK_DT);
      attendreL(sim, 60);
      const colle = !c.held && c.haut === '-z' && c.grounded && Math.abs(c.position.z + c.size / 2 - 3905) < 1e-9;
      avancerL(sim, [-97.5, 5.2, 3905], 0.15);
      const retour = franchirVers(sim, [-97.5, 8, 3905]);
      avancerL(sim, [-99.0, 0, 3898.4], 0.3);
      return {
        traverse: aller.traversed?.pairId === 'escalierMural-porte' && aller.traversed.from === 'big',
        retour: retour.traversed?.pairId === 'escalierMural-porte' && sim.player.haut === undefined,
        colle,
      };
    };

    // LA COLONNE — deux cubes l'un « devant » l'autre, sur la même verticale.
    const c1 = poserAuMur('cube-mural-1', [-101.2, 0, 3896.3], -97.0, 0.41);
    check(
      'escalier mural : on porte un cube par la porte, on le pose sur le mur nord — il y reste collé',
      c1.traverse && c1.colle && c1.retour,
      `${JSON.stringify(c1)} ${ouEst(sim)}`,
    );
    const c2 = poserAuMur('cube-mural-2', [-98.9, 0, 3897.2], -97.0, 1.2);
    check('escalier mural : le deuxième, droit « devant » le premier — la colonne', c2.colle && c2.retour, JSON.stringify(c2));
    // Debout, on essaie de monter : la colonne n'a pas de marche.
    avancerL(sim, [-99.0, 0, 3901.5], 0.3);
    avancerL(sim, [-97.0, 0, 3903.2], 0.15);
    let plusHaut = 0;
    for (let i = 0; i < 3; i++) {
      bondirL(sim, [-97.0, 1.6, 3904.6], 60 * 2);
      plusHaut = Math.max(plusHaut, sim.player.position.y);
      avancerL(sim, [-97.0, 0, 3903.0], 0.2);
    }
    check('escalier mural : LA COLONNE — un pilier de 1,60 aux flancs lisses, on n’y monte pas', plusHaut < 1.0, `pieds au plus haut à ${plusHaut.toFixed(2)}`);

    // On la défait : le deuxième cube se reprend sur le mur et se repose de côté.
    avancerL(sim, [-99.0, 0, 3901.5], 0.3);
    avancerL(sim, [-99.0, 0, 3898.4], 0.3);
    avancerL(sim, [-97.5, 0, 3898.4], 0.15);
    franchirVers(sim, [-97.5, 0, 3903]);
    avancerL(sim, [-97.0, 3.1, 3905], 0.1);

    const reprise = agirL(sim, [-97.0, 1.2, 3904.6]);
    check('escalier mural : couché sur le mur, on reprend le cube mal posé', reprise.carry?.id === 'cube-mural-2' && reprise.carry.taken, `${JSON.stringify(reprise.carry ?? null)} ${ouEst(sim)}`);
    avancerL(sim, [-98.2, 1.2 + 1.94, 3905], 0.05);
    {
      const yaw = lacetVers(sim, [-98.2, -4, 3905]);
      sim.step(ordreL(sim, { yaw }), TICK_DT);
      sim.step(ordreL(sim, { yaw, interact: true }), TICK_DT);
      attendreL(sim, 60);
    }
    avancerL(sim, [-97.5, 5.2, 3905], 0.15);
    franchirVers(sim, [-97.5, 8, 3905]);
    avancerL(sim, [-99.0, 0, 3898.4], 0.3);
    const c3 = poserAuMur('cube-mural-3', [-101.6, 0, 3900.1], -99.4, 2.0);
    const c4 = poserAuMur('cube-mural-4', [-99.2, 0, 3898.5], -100.6, 2.8);
    check('escalier mural : les deux derniers, en diagonale, un pas de côté chacun', c3.colle && c4.colle && c3.retour && c4.retour, `${JSON.stringify(c3)} ${JSON.stringify(c4)}`);
    const marches = ['cube-mural-1', 'cube-mural-2', 'cube-mural-3', 'cube-mural-4'].map((id) => {
      const c = piece(sim, id);
      return `${id.slice(-1)}: x ${c.position.x.toFixed(2)} dessus ${(c.position.y + c.size).toFixed(2)}`;
    });

    // DEBOUT, ON MONTE.
    avancerL(sim, [-99.0, 0, 3901.5], 0.3);
    avancerL(sim, [-96.9, 0, 3903.4], 0.15);
    avancerL(sim, [-97.0, 0.8, 3904.55], 0.15);
    const m1 = sim.player.position.y;
    const suite: number[] = [];
    for (const [x, y] of [[-98.2, 1.6], [-99.4, 2.4], [-100.6, 3.2]] as const) {
      bondirL(sim, [x, y, 3904.55]);
      suite.push(sim.player.position.y);
    }
    check(
      'escalier mural : debout, les cubes collés au mur font un escalier — 0,80 · 1,60 · 2,40 · 3,20',
      // Au décimètre : on pose couché à l'œil, pas au millimètre.
      Math.abs(m1 - 0.8) < 0.06 && suite.every((y, i) => Math.abs(y - 0.8 * (i + 2)) < 0.06),
      `${[m1, ...suite].map((y) => y.toFixed(2)).join(' · ')} — ${marches.join(' ; ')}`,
    );
    bondirL(sim, BALCON);
    check('escalier mural : et du dernier, un saut d’un mètre jusqu’au balcon', Math.abs(sim.player.position.y - 4.2) < 1e-6, ouEst(sim));
    avancerL(sim, [-106.2, 4.2, 3903.75], 0.15);
    const s = franchirVers(sim, [-110, 4.2, 3903.75]);
    check(
      'escalier mural → cuve : par le tunnel du balcon, vers l’ouest, debout',
      s.traversed?.pairId === 'envers-escalierMural-cuve' && sim.player.haut === undefined,
      `${JSON.stringify(s.traversed ?? null)} ${ouEst(sim)}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LA CUVE — le pinceau dort au mur ; on ne l'atteint qu'en y marchant.
  // ═══════════════════════════════════════════════════════════════════════
  {
    const PINCEAU: V3 = [93.3, 1.3, 3900];
    // La faute : faire le tour de la cuve, debout, et appeler.
    let reveille = false;
    for (const poste of [[98.8, 0, 3900], [94.2, 0, 3896.2], [94.2, 0, 3903.8]] as V3[]) {
      avancerL(sim, [102.2, 0, sim.player.position.z], 0.3);
      avancerL(sim, [102.2, 0, poste[2]], 0.3);
      avancerL(sim, poste, 0.2);
      reveille ||= agirL(sim, PINCEAU).eveil !== undefined;
    }
    avancerL(sim, [102.2, 0, sim.player.position.z], 0.3);
    check('cuve : debout, on fait le tour de la cuve — ses parois cachent le pinceau, et il ne s’éveille pas', !reveille && !sim.eveilles.has('pinceau-violet'), ouEst(sim));
    avancerL(sim, [102.2, 0, 3896.8], 0.3);
    avancerL(sim, [100.5, 0, 3897.3], 0.15);
    const a = franchirVers(sim, [100.5, 0, 3901]);
    check(
      'cuve : par la porte du sol, on ressort couché sur le mur ouest, la cuve devant soi',
      a.traversed?.pairId === 'cuve-porte' && sim.player.haut === '+x' && sim.player.grounded,
      `${JSON.stringify(a.traversed ?? null)} ${ouEst(sim)}`,
    );
    avancerL(sim, [93, 5.5, 3900], 0.2);
    const auBord = agirL(sim, PINCEAU);
    check('cuve : au bord de la fosse, pas encore — il faut y descendre', auBord.eveil === undefined, ouEst(sim));
    avancerL(sim, [93, 2.2, 3900], 0.2);
    const eveil = agirL(sim, PINCEAU);
    check('cuve : au fond de la fosse couchée, le violet s’éveille, à taille d’homme', eveil.eveil?.id === 'pinceau-violet' && sim.eveilles.has('pinceau-violet'), `${JSON.stringify(eveil.eveil ?? eveil.eveilRefuse ?? null)} ${ouEst(sim)}`);
    avancerL(sim, [93, 5.2, 3897.5], 0.2);
    avancerL(sim, [93, 6.6, 3896.3], 0.15);
    const b = franchirVers(sim, [93, 6.6, 3892]);
    check(
      'cuve : on reprend la porte couchée par devant, et l’on revient debout',
      b.traversed?.pairId === 'cuve-porte' && sim.player.haut === undefined && sim.player.grounded,
      `${JSON.stringify(b.traversed ?? null)} ${ouEst(sim)}`,
    );
    avancerL(sim, [102.2, 0, 3897.5], 0.3);
    avancerL(sim, [103, 0, 3904.0], 0.15);
    const s = franchirVers(sim, [103, 0, 3909]);
    check(
      'cuve → lucarne violette : on arrive debout sous le village pendu',
      s.traversed?.pairId === 'envers-cuve-lucarneViolette' && sim.player.haut === undefined,
      `${JSON.stringify(s.traversed ?? null)} ${ouEst(sim)}`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LA LUCARNE VIOLETTE — on lève les yeux : le village, et son envers pendu.
  // ═══════════════════════════════════════════════════════════════════════
  {
    const s = avancerL(sim, [300, 0, 3896.7], 0.3);
    check(
      'lucarne violette : au pied de la table, sous l’envers pendu, le but — et le violet a été réveillé avant',
      (s.reachedGoal === true || sim.goalReached) && sim.eveilles.has('pinceau-violet') && sim.player.haut === undefined,
      `${sim.goalReached ? 'but atteint' : 'but manqué'} ${ouEst(sim)}`,
    );
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// LES SALLES, UNE À UNE — les fautes voulues, les raccourcis qui doivent
// échouer, et chaque pesanteur qu'on y prend passée au crible.
//
// Ici, et ici seulement, on POSE le joueur : ce ne sont plus des parties mais
// des épreuves, comme les blocs de salle du harnais. Le pilote, lui, ne pose
// jamais personne.
// ═════════════════════════════════════════════════════════════════════════════

/** Poser le joueur, pieds à `p`, avec ce haut et ce lacet (lu dans son repère). */
const poser = (sim: Simulation, p: V3, haut: Haut | undefined, yaw = 0): void => {
  sim.player.position = { x: p[0], y: p[1], z: p[2] };
  sim.player.velocity = { x: 0, y: 0, z: 0 };
  sim.player.scaleLevel = 0;
  sim.player.haut = haut === undefined || haut === '+y' ? undefined : haut;
  sim.player.yaw = yaw;
  sim.player.grounded = false;
};

/** Un générateur déterministe : les épreuves se rejouent à l'identique. */
const hasard = (graine: number) => {
  let s = graine >>> 0;
  return (): number => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

/** De combien le corps est-il dans la pierre, au pire, mesuré dans son repère ? */
const enfoncement = (sim: Simulation): number => {
  const r = REPERES[sim.player.haut ?? '+y'];
  const p = versLocal(r, sim.player.position, vec3());
  const rayon = PLAYER_RADIUS;
  let pire = 0;
  const b = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
  for (const s of sim.world.solids) {
    boiteVersLocal(r, s, b);
    const px = Math.min(p.x + rayon - b.minX, b.maxX - (p.x - rayon));
    const py = Math.min(p.y + PLAYER_HEIGHT - b.minY, b.maxY - p.y);
    const pz = Math.min(p.z + rayon - b.minZ, b.maxZ - (p.z - rayon));
    if (px > 0 && py > 0 && pz > 0) pire = Math.max(pire, Math.min(px, py, pz));
  }
  return pire;
};

const dansLaBoite = (p: Vec3, min: V3, max: V3): boolean =>
  p.x >= min[0] && p.x <= max[0] && p.y >= min[1] && p.y <= max[1] && p.z >= min[2] && p.z <= max[2];

interface Epreuve {
  salle: SalleModule;
  /** L'intérieur de la salle, où l'on tire les départs au hasard. */
  interieur: { min: V3; max: V3 };
  /** Les pesanteurs qu'on peut y avoir, et une ou deux entrées réalistes pour chacune. */
  hauts: { haut: Haut; departs: V3[] }[];
}

const EPREUVES: Epreuve[] = [
  {
    salle: BASCULE,
    interieur: { min: [-505, 0, 3892], max: [-495, 7, 3908] },
    hauts: [
      { haut: '+y', departs: [[-500, 0.05, 3893.5], [-500, 0.05, 3896.9]] },
      { haut: '-y', departs: [[-500, 6.95, 3903.1]] },
    ],
  },
  {
    salle: PUITS_COUCHE,
    interieur: { min: [-305, 0, 3894], max: [-295, 24, 3906] },
    hauts: [
      { haut: '+y', departs: [[-298, 0.05, 3895.5], [-300, 0.05, 3900.9]] },
      { haut: '+x', departs: [[-304.95, 3.5, 3900], [-304.6, 20.5, 3900]] },
    ],
  },
  {
    salle: ESCALIER_MURAL,
    interieur: { min: [-106, 0, 3895], max: [-94, 9, 3905] },
    hauts: [
      { haut: '+y', departs: [[-97, 0.05, 3896.5], [-103.5, 4.3, 3903.75]] },
      { haut: '-z', departs: [[-97.5, 6.4, 3904.9], [-104, 5.5, 3904.9]] },
    ],
  },
  {
    salle: CUVE,
    interieur: { min: [93, 0, 3893], max: [107, 10, 3907] },
    hauts: [
      { haut: '+y', departs: [[103, 0.05, 3894.5], [100.5, 0.05, 3898.4]] },
      { haut: '+x', departs: [[93.05, 6.6, 3895.1], [93.4, 2.4, 3900]] },
    ],
  },
  {
    salle: LUCARNE_VIOLETTE,
    interieur: { min: [290, 0, 3886], max: [310, 16, 3914] },
    hauts: [{ haut: '+y', departs: [[300, 0.05, 3887.5], [300, 0.55, 3900.5]] }],
  },
];

/** Les faces de raccord : jamais franchies dans une autre pesanteur que debout. */
const RACCORDS_IDS = new Set(ENVERS.portals.filter((p) => p.id.startsWith('envers-')).map((p) => p.id));

/**
 * LE CRIBLE — des parcours au hasard, dans chaque salle et chaque pesanteur
 * qu'on y prend : marcher, courir, sauter, tourner, prendre, poser, lancer.
 * On exige qu'aucun ne tombe du monde, qu'aucun ne sorte de sa salle sans
 * passer une porte, qu'aucun ne franchisse un raccord couché ou la tête en
 * bas, et qu'à la fin chacun puisse encore bouger.
 *
 * Le harnais en joue une poignée à chaque `npm run check` ; au banc, on en a
 * joué des millions (voir `REPRISE.md`). `trace`, facultatif, reçoit chaque
 * image : c'est par là qu'on rejoue un parcours fautif pour le comprendre.
 */
export const cribler = (
  parcours: number,
  images: number,
  graine = 1,
  trace?: (sim: Simulation, quoi: string, t: number, e: TickEvents) => void,
): { essais: number; fautes: string[]; pieces: string[]; rendues: number } => {
  const fautes: string[] = [];
  const pieces: string[] = [];
  let essais = 0;
  let rendues = 0;
  for (const ep of EPREUVES) {
    for (const { haut, departs } of ep.hauts) {
      for (let k = 0; k < parcours; k++) {
        const alea = hasard(graine * 7919 + k * 131 + ep.salle.nom.length * 17 + haut.charCodeAt(1));
        const sim = new Simulation(ENVERS);
        sim.couleursConnues = ['rouge', 'vert', 'bleu', 'or'];
        // Les portes dessinées ouvertes : le crible juge la géométrie, pas les verrous.
        for (const p of ENVERS.portals) sim.portesFermees.delete(p.id);
        // Un départ réaliste une fois sur deux, sinon n'importe où dans la salle,
        // pourvu que le corps y tienne dans ce repère.
        let depart: V3 = departs[k % departs.length];
        if (k % 2 === 1) {
          for (let t = 0; t < 40; t++) {
            const { min, max } = ep.interieur;
            const essai: V3 = [0, 1, 2].map((i) => min[i] + 0.5 + alea() * (max[i] - min[i] - 1)) as V3;
            poser(sim, essai, haut);
            if (enfoncement(sim) === 0) { depart = essai; break; }
          }
        }
        poser(sim, depart, haut, alea() * Math.PI * 2);
        // ON SE POSE D'ABORD, sans rien toucher : un corps lâché en l'air au
        // hasard n'est pas un état qu'un joueur peut atteindre (la tête en bas
        // à un mètre du sol, par exemple). Seule la chute droite vers SON sol
        // le rend réel ; si elle passe une porte, ce départ n'en était pas un.
        let reel = true;
        for (let t = 0; t < 120 && reel; t++) {
          const e = sim.step(ordreL(sim), TICK_DT);
          if (e.traversed || e.rattrape) reel = false;
          if (sim.player.grounded) break;
        }
        if (!reel || !sim.player.grounded) continue;
        const nomDepart = `${ep.salle.nom} ${haut} (${depart.map((v) => v.toFixed(1)).join(', ')})`;
        let cmd = ordreL(sim);
        let fini = false;
        for (let t = 0; t < images && !fini; t++) {
          if (t % 25 === 0) {
            cmd = ordreL(sim, {
              forward: alea() < 0.75 ? 1 : alea() < 0.5 ? -1 : 0,
              strafe: alea() < 0.3 ? (alea() < 0.5 ? -1 : 1) : 0,
              jump: alea() < 0.35,
              sprint: alea() < 0.4,
              yaw: sim.player.yaw + (alea() - 0.5) * 2.6,
              pitch: (alea() - 0.5) * 1.6,
              interact: alea() < 0.12,
              throwIt: alea() < 0.06,
            });
          } else if (t % 25 === 1) {
            // Une touche d'action tenue ne se déclenche qu'au front : on la relâche.
            cmd = { ...cmd, interact: false, throwIt: false };
          }
          const e = sim.step(cmd, TICK_DT);
          essais++;
          trace?.(sim, nomDepart, t, e);
          if (e.rattrape) {
            fautes.push(`${nomDepart} : tombé du monde à l’image ${t}, ${ouEst(sim)}`);
            fini = true;
          }
          // UNE PIÈCE PEUT TOMBER DU MONDE — lancée alors que la main la tenait dans
          // la pierre (voir le rapport : la collision la recale au bout du mur).
          // Le rattrapage la rend ; on exige qu'il la rende DANS le chapitre,
          // hors de la pierre, là où une main la retrouvera.
          if (e.pieceRattrapee) {
            const c = sim.carryables.items.find((x) => x.id === e.pieceRattrapee!.id)!;
            const centre = vec3(c.position.x, c.position.y + c.size / 2, c.position.z);
            const chezSoi = SALLES_ENVERS.some((sl) => dansLaBoite(centre, sl.bounds.min, sl.bounds.max));
            const dedans = sim.world.solids.some((b) => centre.x > b.minX && centre.x < b.maxX && centre.y > b.minY && centre.y < b.maxY && centre.z > b.minZ && centre.z < b.maxZ);
            rendues++;
            if (!chezSoi || dedans) pieces.push(`${nomDepart} : ${c.id} rendue hors du chapitre ou dans la pierre, (${centre.x.toFixed(1)}, ${centre.y.toFixed(1)}, ${centre.z.toFixed(1)})`);
          }
          if (e.traversed) {
            if (RACCORDS_IDS.has(e.traversed.pairId)) {
              if (sim.player.haut !== undefined) fautes.push(`${nomDepart} : raccord ${e.traversed.pairId} franchi avec le haut ${sim.player.haut}`);
              fini = true; // on a quitté la salle, debout : c'est permis
            }
          }
          if (!fini && !dansLaBoite(sim.player.position, ep.salle.bounds.min, ep.salle.bounds.max)) {
            fautes.push(`${nomDepart} : sorti de la parcelle sans porte, ${ouEst(sim)}`);
            fini = true;
          }
        }
        if (fini) continue;
        // À LA FIN, ON DOIT POUVOIR BOUGER. Posé, puis huit directions, puis un saut.
        attendreL(sim, 60);
        const pris = enfoncement(sim);
        if (pris > 0.01) fautes.push(`${nomDepart} : fini ${pris.toFixed(3)} m dans la pierre, ${ouEst(sim)}`);
        const a = enRepere(sim, sim.player.position);
        let bouge = false;
        for (let d = 0; d < 8 && !bouge; d++) {
          for (let i = 0; i < 30; i++) sim.step(ordreL(sim, { forward: 1, yaw: (d * Math.PI) / 4, jump: i < 2 }), TICK_DT);
          const b = enRepere(sim, sim.player.position);
          bouge = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) > 0.3;
        }
        if (!bouge) fautes.push(`${nomDepart} : coincé, ${ouEst(sim)}`);
      }
    }
  }
  return { essais, fautes, pieces, rendues };
};

export const verifierSallesEnvers = (check: Check): void => {
  console.log('\n— L’envers, salle par salle : les fautes, les raccourcis, les pesanteurs —');

  // ─── LE CHAPITRE, SES PORTES ────────────────────────────────────────────
  {
    const violettes = ENVERS.portals.filter((p) => !p.id.startsWith('envers-'));
    const raccords = ENVERS.portals.filter((p) => p.id.startsWith('envers-'));
    check(
      'l’envers : chaque salle a au plus une porte violette, plane, violette des deux côtés',
      violettes.length === 4 &&
        violettes.every((p) => p.plane === true && p.colorBig === 0x7a4c8a && p.colorSmall === 0x7a4c8a) &&
        SALLES_ENVERS.every((s) => (s.portals ?? []).length <= 1),
      violettes.map((p) => p.id).join(', '),
    );
    check(
      'l’envers : les raccords ne tournent jamais la pesanteur — deux faces debout, planes',
      raccords.length === 4 &&
        raccords.every((p) => p.plane === true && [p.big, p.small].every((f) => (f.haut ?? '+y') === '+y' && f.normale === undefined)),
      raccords.map((p) => p.id).join(', '),
    );
    // Chaque face violette : une jumelle d'un autre haut, et un fil à plomb pendu à son linteau.
    const fautes: string[] = [];
    for (const p of violettes) {
      if ((p.big.haut ?? '+y') === (p.small.haut ?? '+y')) fautes.push(`${p.id} : les deux faces ont le même haut`);
      for (const f of [p.big, p.small]) {
        const v = vecteurHaut(f.haut ?? '+y');
        const n = f.normale ? vecteurHaut(f.normale) : { x: Math.round(Math.sin(f.yaw)), y: 0, z: Math.round(Math.cos(f.yaw)) };
        const linteau = { x: f.position[0] + v.x * 2.78 + n.x * 0.35, y: f.position[1] + v.y * 2.78 + n.y * 0.35, z: f.position[2] + v.z * 2.78 + n.z * 0.35 };
        const bas = { x: f.position[0] + v.x * 1.0 + n.x * 0.35, y: f.position[1] + v.y * 1.0 + n.y * 0.35, z: f.position[2] + v.z * 1.0 + n.z * 0.35 };
        const fil = ENVERS.boxes.some((b) => b.ghost === true && dansLaBoite(linteau, b.min, b.max) && dansLaBoite(bas, b.min, b.max));
        if (!fil) fautes.push(`${p.id} : pas de fil à plomb sous le linteau de la face ${f.haut ?? '+y'}`);
      }
    }
    check('l’envers : chaque face violette a son fil à plomb, tendu vers les pieds de qui en ressort', fautes.length === 0, fautes.join(' · '));
    // Le pinceau, sa couleur, et la maquette qui l'attend.
    const lucarne = LUCARNE_VIOLETTE.region;
    const violets = (ENVERS.regions ?? []).filter((r) => r.pigment === 'violet' || r.pigmentAccent === 'violet');
    check(
      'l’envers : un seul pinceau violet, à ×1, et une seule région qui attend sa couleur — la lucarne, dont l’accent est l’or déjà rapporté',
      (ENVERS.veilleurs ?? []).length === 1 && ENVERS.veilleurs![0].id === 'pinceau-violet' && ENVERS.veilleurs![0].echelle === 0 &&
        violets.length === 1 && violets[0] === lucarne && lucarne.pigmentAccent === 'or',
      `${(ENVERS.veilleurs ?? []).map((v) => v.id).join(', ')} ; ${violets.map((r) => r.name).join(', ')}`,
    );
    const but = ENVERS.goal;
    const dort = ENVERS.veilleurs![0].position;
    check(
      'l’envers : le but est à la sortie de la lucarne, pas sur le pinceau',
      but.position.every((v, i) => v === LUCARNE_VIOLETTE.sortie.position[i]) && Math.hypot(but.position[0] - dort[0], but.position[2] - dort[2]) > 100,
      JSON.stringify(but),
    );
  }

  // ─── CHAQUE PIÈCE SE PREND DE QUELQUE PART, DANS SON PROPRE REPÈRE ──────
  //
  // Le balayage général (« chaque objet reste attrapable de quelque part »)
  // se tient debout. Les galets du plafond se prennent la tête en bas, le
  // jeton du puits couché sur le mur : on refait donc le même balayage — huit
  // directions, deux distances — dans le repère du haut de chaque pièce, et
  // l'on exige un poste libre d'où la main l'atteint, sans pierre entre deux.
  {
    const sim = new Simulation(ENVERS);
    const enterrees: string[] = [];
    for (const c of sim.carryables.items) {
      const h: Haut = c.haut ?? '+y';
      const r = REPERES[h];
      const vue = vueDe(sim.world, h);
      const centre = versLocal(r, vec3(c.position.x, c.position.y + c.size / 2, c.position.z), vec3());
      const sol = centre.y - c.size / 2;
      let vue_ = false;
      for (let d = 0; d < 8 && !vue_; d++) {
        const a = (d / 8) * Math.PI * 2;
        for (const part of [0.4, 0.8]) {
          const l = vec3(centre.x + Math.sin(a) * PLAYER_HEIGHT * REACH * part, sol, centre.z + Math.cos(a) * PLAYER_HEIGHT * REACH * part);
          if (!isClear(vue, l, 1)) continue;
          const monde = versMonde(r, l, vec3());
          const yaw = Math.atan2(centre.x - l.x, centre.z - l.z);
          if (sim.carryables.targeted(monde, yaw, 1, sim.world, h)?.id === c.id) { vue_ = true; break; }
        }
      }
      if (!vue_) enterrees.push(`${c.id} (${h})`);
    }
    check('l’envers : chaque pièce se prend de quelque part, debout, la tête en bas ou couché — dans son propre repère', enterrees.length === 0, enterrees.join(', '));
  }

  // ─── L'ENVERS : le plafond est le sol, tourné — jamais reflété ─────────
  {
    const cle = (b: BoxDef): string => [...b.min, ...b.max].map((v) => v.toFixed(6)).join(',');
    const tourne = (b: BoxDef): BoxDef => ({ ...b, min: [b.min[0], 7 - b.max[1], 7800 - b.max[2]], max: [b.max[0], 7 - b.min[1], 7800 - b.min[2]] });
    const meubles = BASCULE.boxes.slice(6);
    const toutes = new Set(meubles.map(cle));
    const orphelins = meubles.filter((b) => !toutes.has(cle(tourne(b))));
    check(
      'l’envers : tout ce qui est au sol est au plafond, tourné d’un demi-tour — mains d’encre et fils à plomb compris',
      orphelins.length === 0 && meubles.length > 20,
      `${orphelins.length} sans jumelle sur ${meubles.length}`,
    );
    const galets = (BASCULE.carryables ?? []);
    const sol = galets.filter((g) => (g.haut ?? '+y') === '+y');
    check(
      'l’envers : chaque galet du sol a son jumeau collé au plafond',
      sol.length === 3 && sol.every((g) => galets.some((h) => h.haut === '-y' && h.position[0] === g.position[0] && h.position[1] === 7 && h.position[2] === 7800 - g.position[2])),
      galets.map((g) => `${g.id}:${g.haut ?? '+y'}`).join(' '),
    );

    // Du sol, même en sautant sous B, on n'y entre pas ; au plafond, même en sautant sur A, non plus.
    const sim = new Simulation(ENVERS);
    let passe = false;
    let tete = 0;
    poser(sim, [-500, 0.05, 3903.3], undefined, Math.PI);
    for (let i = 0; i < 60 * 6; i++) {
      const e = sim.step(ordreL(sim, { jump: true, forward: i % 60 < 30 ? 0.3 : -0.3, yaw: Math.PI }), TICK_DT);
      passe ||= !!e.traversed;
      tete = Math.max(tete, sim.player.position.y + PLAYER_HEIGHT);
    }
    check('l’envers : debout sous B, on saute et l’on ne l’atteint pas', !passe && tete < 4.15, `tête à ${tete.toFixed(2)}`);
    poser(sim, [-500, 6.95, 3896.7], '-y', 0);
    passe = false;
    let oeil = 7;
    for (let i = 0; i < 60 * 6; i++) {
      const e = sim.step(ordreL(sim, { jump: true, forward: i % 60 < 30 ? 0.3 : -0.3, yaw: 0 }), TICK_DT);
      passe ||= !!e.traversed;
      oeil = Math.min(oeil, sim.eyePosition().y);
    }
    check('l’envers : la tête en bas au-dessus de A, on saute et l’on ne l’atteint pas', !passe && oeil > 2.85, `œil au plus bas à ${oeil.toFixed(2)}`);

    // Un galet lancé du sol par A arrive au plafond ; un galet du plafond lancé par B revient au sol.
    const g2 = new Simulation(ENVERS);
    poser(g2, [-500, 0.05, 3893.2], undefined, 0);
    attendreL(g2, 10);
    avancerL(g2, [-498.5, 0, 3894.6], 0.15);
    agirL(g2, [-498.5, 0.17, 3894.6 + 0.0001]);
    const tenu = g2.carryables.held;
    avancerL(g2, [-500, 0, 3894.2], 0.1);
    lancerL(g2, lacetVers(g2, [-500, 0, 3899]), 0.12);
    attendreL(g2, 150);
    check(
      'l’envers : un galet lancé par A ressort de B et « tombe » au plafond',
      tenu !== null && !tenu.held && tenu.haut === '-y' && tenu.grounded && Math.abs(tenu.position.y + tenu.size - 7) < 1e-9,
      tenu ? `haut ${tenu.haut ?? '+y'} dessus ${(tenu.position.y + tenu.size).toFixed(3)}` : 'rien pris',
    );
    const g3 = new Simulation(ENVERS);
    poser(g3, [-497.6, 6.95, 3907.3], '-y', 0);
    attendreL(g3, 20);
    const prise = agirL(g3, [-497.6, 6.83, 3906.1]);
    const haut = g3.carryables.held;
    avancerL(g3, [-500, 7, 3906.4], 0.15);
    lancerL(g3, lacetVers(g3, [-500, 7, 3899]), 0.12);
    attendreL(g3, 150);
    check(
      'l’envers : un galet du plafond, pris la tête en bas et lancé par B, revient debout au sol',
      prise.carry?.id === 'galet-bascule-4' && haut !== null && haut.haut === undefined && haut.grounded && haut.position.y === 0,
      haut ? `${haut.id} haut ${haut.haut ?? '+y'} en y ${haut.position.y.toFixed(3)}` : JSON.stringify(prise.carry ?? null),
    );
  }

  // ─── LE PUITS COUCHÉ ────────────────────────────────────────────────────
  {
    // Du fond, sous la jumelle couchée, on saute sur place en neuf points de
    // son emprise : la tête ne la touche pas, et l'on n'y entre pas.
    const sim = new Simulation(ENVERS);
    let passe = false;
    let tete = 0;
    for (const x of [-304.6, -303.6, -302.4]) {
      for (const z of [3899.2, 3900, 3900.8]) {
        poser(sim, [x, 0.05, z], undefined, 0);
        attendreL(sim, 10);
        for (let i = 0; i < 90; i++) {
          const e = sim.step(ordreL(sim, { jump: i < 3 }), TICK_DT);
          passe ||= !!e.traversed;
          tete = Math.max(tete, sim.player.position.y + PLAYER_HEIGHT);
        }
      }
    }
    check('puits : du fond, en sautant sous la jumelle couchée, on ne la touche ni ne la traverse', !passe && tete < 3.4, `tête à ${tete.toFixed(2)}`);
    // Couché sur le mur, on lance le jeton DANS la jumelle : il ressort debout de la porte du fond.
    const j = new Simulation(ENVERS);
    poser(j, [-304.95, 21.2, 3900], '+x', 0);
    attendreL(j, 30);
    agirL(j, [-304.85, 20, 3900]);
    const jeton = j.carryables.held;
    avancerL(j, [-305, 6.2, 3900], 0.15);
    lancerL(j, lacetVers(j, [-305, 0, 3900]), -0.25);
    attendreL(j, 180);
    check(
      'puits : lancé couché dans la jumelle, le jeton ressort debout de la porte du fond',
      jeton !== null && !jeton.held && jeton.haut === undefined && jeton.grounded && jeton.position.y === 0,
      jeton ? `haut ${jeton.haut ?? '+y'} en (${jeton.position.x.toFixed(2)}, ${jeton.position.y.toFixed(2)}, ${jeton.position.z.toFixed(2)})` : 'rien pris',
    );
    // Posé couché sur le mur, il y reste — et un creux n'en veut pas tant qu'il est couché.
    const k = new Simulation(ENVERS);
    poser(k, [-304.95, 21.2, 3900], '+x', 0);
    attendreL(k, 30);
    agirL(k, [-304.85, 20, 3900]);
    avancerL(k, [-305, 12, 3900], 0.15);
    const pose = agirL(k, [-305, 9, 3900]);
    attendreL(k, 90);
    const jk = piece(k, 'jeton-puits');
    check(
      'puits : posé couché, le jeton reste collé au mur, au contact',
      pose.carry?.taken === false && jk.haut === '+x' && jk.grounded && Math.abs(jk.position.x - jk.size / 2 - -305) < 1e-9,
      `haut ${jk.haut ?? '+y'} x ${jk.position.x.toFixed(4)}`,
    );
  }

  // ─── L'ESCALIER MURAL ───────────────────────────────────────────────────
  {
    // AU SOL, ON N'EMPILE PAS : un cube lâché sur un autre le traverse et finit au sol.
    const sim = new Simulation(ENVERS);
    poser(sim, [-102.4, 0.05, 3897.6], undefined, Math.PI / 2);
    attendreL(sim, 20);
    agirL(sim, [-101.2, 0.41, 3897.6]);
    const porte = sim.carryables.held;
    avancerL(sim, [-102.2, 0, 3898.5], 0.1);
    // On le lâche au-dessus du cube 3, en regardant son dessus.
    agirL(sim, [-101.6, 1.4, 3898.8]);
    attendreL(sim, 90);
    check(
      'escalier mural : au sol, un cube lâché sur un autre ne s’y empile pas — il retombe au sol',
      porte !== null && !porte.held && porte.grounded && porte.position.y < 0.02,
      porte ? `en y ${porte.position.y.toFixed(3)}` : 'rien pris',
    );
    // COUCHÉ SUR LE MUR NORD, ON N'ENTRE PAS DANS LE TUNNEL DE SORTIE.
    const t = new Simulation(ENVERS);
    let passe = false;
    let ouest = 0;
    for (const y of [4.6, 5.6, 6.6]) {
      poser(t, [-104, y, 3904.9], '-z', -Math.PI / 2);
      attendreL(t, 20);
      for (let i = 0; i < 60 * 3; i++) {
        const e = t.step(ordreL(t, { forward: 1, sprint: i % 50 < 25, jump: i % 40 < 3, yaw: lacetVers(t, [-112, y, 3905]) }), TICK_DT);
        passe ||= !!e.traversed || !!e.refused;
        ouest = Math.min(ouest, t.player.position.x + 106);
      }
    }
    check(
      'escalier mural : couché sur le mur nord, on bute à l’entrée du tunnel — la porte de sortie ne se rencontre jamais',
      !passe && ouest > -0.01,
      `${passe ? 'porte touchée' : 'rien'} ; au plus loin ${ouest.toFixed(2)} m dans le tunnel`,
    );
    // DEBOUT, SANS CUBES, NI DE LA CONSOLE NI DU SOL ON N'ATTEINT LE BALCON.
    const c = new Simulation(ENVERS);
    let haut = 0;
    for (const depart of [[-95.0, 0.85, 3904.6], [-100.5, 0.05, 3902.8], [-101.6, 0.05, 3902.0]] as V3[]) {
      poser(c, depart, undefined, 0);
      attendreL(c, 20);
      for (let i = 0; i < 60 * 4; i++) {
        c.step(ordreL(c, { forward: 1, sprint: true, jump: true, yaw: lacetVers(c, [-104, 4.2, 3903.7]) }), TICK_DT);
        haut = Math.max(haut, c.player.grounded ? c.player.position.y : 0);
      }
    }
    check('escalier mural : sans escalier, le balcon ne s’atteint ni du sol ni de la console', haut < 1, `plus haut appui ${haut.toFixed(2)}`);
  }

  // ─── LA CUVE ────────────────────────────────────────────────────────────
  {
    const v = ENVERS.veilleurs![0];
    const sim = new Simulation(ENVERS);
    // Debout : tous les postes du sol hors de la cuve, au quart de mètre.
    let plusPres = Infinity;
    for (let x = 93.35; x <= 106.65; x += 0.25) {
      for (let z = 3893.35; z <= 3906.65; z += 0.25) {
        if (x < CUVE_BORDS.est + CUVE_BORDS.paroi + 0.34 && z > CUVE_BORDS.sud - CUVE_BORDS.paroi - 0.34 && z < CUVE_BORDS.nord + CUVE_BORDS.paroi + 0.34) continue;
        poser(sim, [x, 0, z], undefined);
        if (enfoncement(sim) > 0) continue;
        plusPres = Math.min(plusPres, Math.hypot(x - v.position[0], 0 - v.position[1], z - v.position[2]));
      }
    }
    // Couché au mur, hors de la fosse : au-dessus de la lèvre, et de part et d'autre.
    let plusPresMur = Infinity;
    for (let y = 0.35; y <= 9.65; y += 0.25) {
      for (let z = 3893.35; z <= 3906.65; z += 0.25) {
        const dansLaFosse = y < CUVE_BORDS.levre + 0.34 && z > CUVE_BORDS.sud - CUVE_BORDS.paroi - 0.34 && z < CUVE_BORDS.nord + CUVE_BORDS.paroi + 0.34;
        if (dansLaFosse) continue;
        poser(sim, [93, y, z], '+x');
        if (enfoncement(sim) > 0) continue;
        plusPresMur = Math.min(plusPresMur, Math.hypot(93 - v.position[0], y - v.position[1], z - v.position[2]));
      }
    }
    check(
      'cuve : debout autour de la cuve, ou couché au mur hors de la fosse, on reste hors de portée du pinceau',
      plusPres > v.radius + 0.3 && plusPresMur > v.radius + 0.3,
      `au plus près ${plusPres.toFixed(2)} m debout, ${plusPresMur.toFixed(2)} m couché, rayon ${v.radius}`,
    );
    // Et la cuve ne se grimpe pas : on court et l'on saute contre ses parois.
    let lèvre = 0;
    for (const [depart, cap] of [[[99.5, 0.05, 3900], [95, 0, 3900]], [[95.5, 0.05, 3895.3], [95.5, 0, 3900]], [[95.5, 0.05, 3904.8], [95.5, 0, 3900]]] as [V3, V3][]) {
      poser(sim, depart, undefined);
      attendreL(sim, 20);
      for (let i = 0; i < 60 * 4; i++) {
        sim.step(ordreL(sim, { forward: 1, sprint: true, jump: true, yaw: lacetVers(sim, cap) }), TICK_DT);
        if (sim.player.grounded) lèvre = Math.max(lèvre, sim.player.position.y);
      }
    }
    check('cuve : debout, on ne monte pas sur la lèvre à quatre mètres', lèvre < 1, `plus haut appui ${lèvre.toFixed(2)}`);
  }

  // ─── LA LUCARNE VIOLETTE ────────────────────────────────────────────────
  {
    const { hauteur, z } = LUCARNE_VIOLETTE_ENVERS;
    const cle = (b: BoxDef): string => [...b.min, ...b.max].map((v) => v.toFixed(6)).join(',');
    const tourne = (b: BoxDef): BoxDef => ({ ...b, min: [b.min[0], hauteur - b.max[1], 2 * z - b.max[2]], max: [b.max[0], hauteur - b.min[1], 2 * z - b.min[2]] });
    const maquettes = LUCARNE_VIOLETTE.boxes.slice(6);
    const toutes = new Set(maquettes.map(cle));
    const seules = maquettes.filter((b) => !toutes.has(cle(tourne(b))));
    check(
      'lucarne violette : au plafond pend l’envers exact du village de la table — un demi-tour, pas un reflet',
      seules.length === 0 && maquettes.length > 200,
      `${seules.length} sans jumelle sur ${maquettes.length}`,
    );
    const pendu = maquettes.filter((b) => b.min[1] > hauteur / 2);
    const bas = Math.min(...pendu.map((b) => b.min[1]));
    check('lucarne violette : l’envers pend hors d’atteinte — son point le plus bas bien au-dessus du saut', bas > 8, `point le plus bas à ${bas.toFixed(2)} m`);
    // Sur la table, on marche dans le village debout ; de là, on ne touche pas l'envers.
    const sim = new Simulation(ENVERS);
    let haut = 0;
    for (const depart of [[300, 0.5, 3899.3], [298.5, 0.5, 3902], [301.5, 0.5, 3904]] as V3[]) {
      poser(sim, depart, undefined, 0);
      attendreL(sim, 20);
      for (let i = 0; i < 60 * 4; i++) {
        sim.step(ordreL(sim, { forward: 1, jump: i % 30 < 3, yaw: (i / 50) * 1.7 }), TICK_DT);
        haut = Math.max(haut, sim.player.position.y + PLAYER_HEIGHT);
      }
    }
    check('lucarne violette : debout sur la table, dans le village, la tête reste loin de l’envers', haut < bas - 2, `tête au plus haut à ${haut.toFixed(2)}`);
  }

  // ─── LE CRIBLE ──────────────────────────────────────────────────────────
  {
    const t0 = Date.now();
    const { essais, fautes, pieces, rendues } = cribler(8, 60 * 12);
    check(
      `l’envers, au hasard : chaque salle, chaque pesanteur — personne ne tombe du monde, ne sort sans porte, ne passe un raccord couché, ni ne reste coincé (${essais} images, ${Date.now() - t0} ms)`,
      fautes.length === 0,
      fautes.slice(0, 3).join(' · '),
    );
    check(`l’envers, au hasard : une pièce tombée du monde revient toujours dans le chapitre, hors de la pierre (${rendues} rendue(s))`, pieces.length === 0, pieces.slice(0, 3).join(' · '));
  }
};
