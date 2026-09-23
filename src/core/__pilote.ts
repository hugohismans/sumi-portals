/**
 * LE PILOTE — les gestes d'un joueur fictif, pour qui rejoue les niveaux.
 *
 * Ce module ne vit que sous Node, comme `__check.ts` : c'est possible parce
 * que `core/` n'importe pas Three.js. Les traversées complètes des voyages
 * (`__pilote_*.ts`) et le harnais s'en servent tous ; il n'a pas de compteur
 * d'échecs, c'est `check` qui le tient, et on le lui passe.
 */
import { EYE_FRACTION, PLAYER_HEIGHT, TICK_DT, scaleOfLevel } from './constants.js';
import type { Simulation } from './simulation.js';
import type { InputCommand, TickEvents } from './types.js';
import type { Vec3 } from './math.js';

/** Un verdict : libellé, vrai ou faux, et le détail qui aide quand c'est faux. */
export type Check = (label: string, ok: boolean, detail?: string) => void;

export const near = (a: number, b: number, eps: number): boolean => Math.abs(a - b) < eps;

export const pos = (sim: Simulation): string => {
  const p = sim.player.position;
  return `(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}) niveau ${sim.player.scaleLevel}`;
};

/** Fait marcher le joueur vers un point et rapporte ce qui s'est passé. */
export const walkTo = (
  sim: Simulation,
  target: [number, number, number],
  ticks: number,
  opts: { jump?: boolean; sprint?: boolean; interact?: boolean; stopOnEvent?: boolean } = {},
): TickEvents => {
  const collected: TickEvents = {};
  for (let i = 0; i < ticks; i++) {
    const p = sim.player.position;
    const dx = target[0] - p.x;
    const dz = target[2] - p.z;
    const dist = Math.hypot(dx, dz);
    const e = sim.step(
      {
        forward: dist > scaleOfLevel(sim.player.scaleLevel) * 0.5 ? 1 : 0,
        strafe: 0,
        jump: opts.jump ?? false,
        sprint: opts.sprint ?? false,
        interact: opts.interact ?? false,
        throwIt: false,
        yaw: Math.atan2(dx, dz),
        pitch: 0,
      },
      TICK_DT,
    );
    if (e.traversed) collected.traversed = e.traversed;
    if (e.refused) collected.refused = e.refused;
    if (e.reachedGoal) collected.reachedGoal = e.reachedGoal;
    if (e.carry) collected.carry = e.carry;
    if (e.tooHeavy) collected.tooHeavy = e.tooHeavy;
    if (e.socketFilled) collected.socketFilled = e.socketFilled;
    if (e.eveil) collected.eveil = e.eveil;
    if (e.eveilRefuse) collected.eveilRefuse = e.eveilRefuse;
    if (opts.stopOnEvent && (e.traversed || e.refused || e.reachedGoal)) break;
  }
  return collected;
};

/** Laisse le joueur retomber et s'immobiliser avant de conclure. */
export const settle = (sim: Simulation, ticks = 180): void => {
  for (let i = 0; i < ticks; i++) {
    sim.step(
      {
        forward: 0,
        strafe: 0,
        jump: false,
        sprint: false,
        interact: false,
        throwIt: false,
        yaw: sim.player.yaw,
        pitch: 0,
      },
      TICK_DT,
    );
  }
};

/**
 * MONTE SUR UN APPUI, puis LÂCHE LA TOUCHE.
 *
 * `walkTo(..., { jump: true })` maintient le saut enfoncé pendant toute la
 * durée qu'on lui donne. Sur un trajet au sol c'est sans conséquence ; sur une
 * plateforme, c'est fatal — et il a fallu une épreuve entière pour le
 * comprendre.
 *
 * Une fois l'appui atteint, `forward` retombe à zéro, mais la touche de saut,
 * elle, reste appuyée. Le joueur rebondit donc sur place pendant les trente-six
 * secondes qui restent. Or un rebond conserve l'élan horizontal : il oscille
 * autour de sa cible, dérive, et finit par tomber d'une feuille large de deux
 * mètres. Mesuré : la même épreuve, avec le même pilote, donne 1/21 en
 * accordant 40 s par appui et 21/21 en n'en accordant que 4. Ce n'était pas la
 * géométrie qui était fausse, c'était la durée.
 *
 * D'où ce pilote-ci : il s'élance en tenant le saut, et DÈS QU'IL EST POSÉ sur
 * l'appui visé, il lâche tout et se laisse immobiliser. C'est ce que fait un
 * joueur, et c'est la seule façon honnête de vérifier un parcours de
 * plateformes : sans timing au millième, mais sans rebond parasite non plus.
 */
export const bondirVers = (sim: Simulation, cible: [number, number, number]): void => {
  for (let i = 0; i < 60 * 6; i++) {
    const p = sim.player.position;
    const dx = cible[0] - p.x;
    const dz = cible[2] - p.z;
    const dist = Math.hypot(dx, dz);
    // Posé sur l'appui : on relâche, sinon on rebondit jusqu'à en tomber.
    if (dist < 0.6 && sim.player.grounded && p.y > cible[1] - 0.25) break;
    sim.step(
      {
        forward: dist > 0.4 ? 1 : 0,
        strafe: 0,
        jump: true,
        sprint: false,
        interact: false,
        throwIt: false,
        yaw: Math.atan2(dx, dz),
        pitch: 0,
      },
      TICK_DT,
    );
  }
  settle(sim, 24);
};

/**
 * LE PILOTE QUI JOUE, ET NON QUI COMPTE. Ces gestes servent à toute salle qui
 * se résout en portant, posant ou lançant : on fait la faute que fera le
 * joueur, on entend le creux la nommer, puis on fait le geste juste.
 */
export const ordre = (sim: Simulation, o: Partial<InputCommand> = {}): InputCommand => ({
  forward: 0, strafe: 0, jump: false, sprint: false, interact: false, throwIt: false,
  yaw: sim.player.yaw, pitch: 0, ...o,
});
export const poserA = (sim: Simulation, x: number, y: number, z: number, palier: number): void => {
  sim.player.position = { x, y, z };
  sim.player.velocity = { x: 0, y: 0, z: 0 };
  sim.player.scaleLevel = palier;
  sim.player.grounded = true;
};
/** Laisse le monde tourner et rapporte tout ce qui s'y est dit. */
export const attendre = (sim: Simulation, ticks: number): TickEvents => {
  const tout: TickEvents = {};
  for (let i = 0; i < ticks; i++) Object.assign(tout, sim.step(ordre(sim), TICK_DT));
  return tout;
};
export const versLePoint = (sim: Simulation, cible: [number, number, number]): number =>
  Math.atan2(cible[0] - sim.player.position.x, cible[2] - sim.player.position.z);
/** E, face à quelque chose : prendre ce qu'on vise, ou poser ce qu'on tient. */
export const agirVers = (sim: Simulation, cible: [number, number, number]): TickEvents => {
  const yaw = versLePoint(sim, cible);
  const tout: TickEvents = {};
  sim.step(ordre(sim, { yaw }), TICK_DT);
  Object.assign(tout, sim.step(ordre(sim, { yaw, interact: true }), TICK_DT));
  Object.assign(tout, sim.step(ordre(sim, { yaw }), TICK_DT));
  return tout;
};
/** Clic : lancer ce qu'on tient dans la direction du regard. */
export const lancer = (sim: Simulation, yaw: number, pitch: number): void => {
  sim.step(ordre(sim, { yaw, pitch }), TICK_DT);
  sim.step(ordre(sim, { yaw, pitch, throwIt: true }), TICK_DT);
  sim.step(ordre(sim, { yaw, pitch }), TICK_DT);
};
export const piece = (sim: Simulation, id: string) => sim.carryables.items.find((c) => c.id === id)!;
export const dansLaCour = (c: { position: Vec3 }, x0: number, x1: number, z0: number, z1: number): boolean =>
  c.position.x > x0 && c.position.x < x1 && c.position.z > z0 && c.position.z < z1 && c.position.y > -0.5;
/** E, en regardant un point — le regard commande la hauteur de la dépose. */
export const poserVers = (sim: Simulation, cible: [number, number, number]): TickEvents => {
  const p = sim.player.position;
  const oeilY = p.y + PLAYER_HEIGHT * EYE_FRACTION * scaleOfLevel(sim.player.scaleLevel);
  const yaw = Math.atan2(cible[0] - p.x, cible[2] - p.z);
  const pitch = Math.atan2(cible[1] - oeilY, Math.hypot(cible[0] - p.x, cible[2] - p.z));
  const tout: TickEvents = {};
  sim.step(ordre(sim, { yaw, pitch }), TICK_DT);
  Object.assign(tout, sim.step(ordre(sim, { yaw, pitch, interact: true }), TICK_DT));
  Object.assign(tout, sim.step(ordre(sim, { yaw, pitch }), TICK_DT));
  return tout;
};

