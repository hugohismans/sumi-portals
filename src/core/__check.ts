/**
 * Vérification du niveau sans rendu.
 *
 * Possible uniquement parce que `core/` n'importe pas Three.js : on rejoue la
 * partie en pilotant un joueur fictif, et on vérifie que le chemin prévu marche
 * ET que les impasses tiennent. Une énigme dont on ne vérifie que la solution
 * est à moitié testée : ce sont les raccourcis qui la cassent.
 *
 *   npm run check
 */
import { PLAYER_HEIGHT, SCALE_MAX_LEVEL, SCALE_MIN_LEVEL, TICK_DT, scaleOfLevel } from './constants.js';
import { Fraicheur, STALE_MS } from './fraicheur.js';
import { estUnSaut } from './saut.js';
import { Familles } from './familles.js';
import { buildFaces, canPass, estScelle, transformPoint, transformVector, traversalLevelDelta } from './portals.js';
import { partenaireDe, salonDe, type Attendant } from './salons.js';
import { retrouvailles, type Dalle } from './retrouvailles.js';
import { facesConfondues } from './coplanaires.js';
import { verifierParcelleSalle, verifierTaillesDistinctes, type SalleModule } from '../levels/salles/contrat.js';
import { CREUX } from '../levels/salles/creux.js';
import { PLUIE } from '../levels/salles/pluie.js';
import { LAVOIR } from '../levels/salles/lavoir.js';
import { ATELIER } from '../levels/salles/atelier.js';
import { CONDUIT } from '../levels/salles/conduit.js';
import { BOL } from '../levels/salles/bol.js';
import { DESCENTE, RACCORDS_DESCENTE, SALLES_DESCENTE, ecartDeRaccord } from '../levels/descente.js';
import { MONTEE, RACCORDS_MONTEE, SALLES_MONTEE } from '../levels/montee.js';

/**
 * Les salles déjà bâties, les deux mouvements confondus. On en ajoute une ligne
 * par livraison ; tout le reste des vérifications suit sans qu'on y touche.
 *
 * LES DEUX MOUVEMENTS PARTAGENT LE MÊME CONTRAT, donc les mêmes vérifications,
 * et c'est ce qui rend la suite tenable : la montée n'a rien coûté de plus que
 * six lignes ici. Le jour où il y aura quarante salles, elles seront toujours
 * vérifiées par ce seul bloc.
 */
const SALLES_LIVREES: SalleModule[] = [
  LAVOIR,
  CONDUIT,
  CREUX,
  ATELIER,
  BOL,
  PLUIE,
  ...SALLES_MONTEE,
];
import { CaissesPartagees } from '../net/caisses.js';
import type { RemoteSnapshot } from '../net/presence.js';
import {
  DALLE_GEANT,
  DALLE_MINUSCULE,
  RAYON_DALLE,
  construireDuo,
} from '../levels/duo.js';
import { Simulation } from './simulation.js';
import type { LevelDef, TickEvents } from './types.js';
import { LEVEL_01 } from '../levels/level01.js';
import { LEVEL_02 } from '../levels/level02.js';
import { LOBBY } from '../levels/lobby.js';
import { Sockets } from './sockets.js';
import { World } from './world.js';
import { isClear } from './physics.js';
import { REACH } from './carryables.js';
import { conditionsDe } from './portals.js';
import { FORMES } from '../levels/formes.js';
import {
  REPERES_DESCENTE,
  REPERES_FORMES,
  REPERES_LOBBY,
  REPERES_MONDE,
  REPERES_MONTEE,
} from '../debug/reperes.js';
import { MONDE } from '../levels/monde.js';
import { reve } from '../levels/reve.js';
import { verifierParcelle } from '../levels/regions/contrat.js';
import { BELVEDERE } from '../levels/regions/belvedere.js';
import { JARDIN } from '../levels/regions/jardin.js';
import { TERRASSE } from '../levels/regions/terrasse.js';

// Ce fichier est le seul du projet à tourner sous Node ; on déclare le strict
// minimum plutôt que de tirer @types/node dans une base de code navigateur.
declare const process: { exit(code: number): never };

/** Hauteur du fond de la cour, cf. levels/level01.ts. */
const COURT_FLOOR_Y = -3.0;

let failures = 0;

const check = (label: string, ok: boolean, detail = ''): void => {
  if (ok) console.log(`  ok   ${label}`);
  else {
    failures++;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

const near = (a: number, b: number, eps: number): boolean => Math.abs(a - b) < eps;

const pos = (sim: Simulation): string => {
  const p = sim.player.position;
  return `(${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}) niveau ${sim.player.scaleLevel}`;
};

/** Fait marcher le joueur vers un point et rapporte ce qui s'est passé. */
const walkTo = (
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
const settle = (sim: Simulation, ticks = 180): void => {
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
const bondirVers = (sim: Simulation, cible: [number, number, number]): void => {
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

// =============================================================================
console.log('\n— Maths des portails —');
{
  const sim = new Simulation(LEVEL_01);
  const big = sim.faces.find((f) => f.kind === 'big')!;
  const small = sim.faces.find((f) => f.kind === 'small')!;

  // Aller-retour : sans cette propriété, traverser deux fois ferait dériver le
  // joueur, et l'erreur s'accumulerait à chaque passage.
  const p = { x: big.position.x + 3, y: big.position.y + 1.2, z: big.position.z - 8 };
  const through = transformPoint(big, p);
  const back = transformPoint(small, through);
  check(
    'aller-retour sans dérive',
    near(back.x, p.x, 1e-9) && near(back.y, p.y, 1e-9) && near(back.z, p.z, 1e-9),
  );

  const d0 = Math.hypot(p.x - big.position.x, p.y - big.position.y, p.z - big.position.z);
  const d1 = Math.hypot(
    through.x - small.position.x,
    through.y - small.position.y,
    through.z - small.position.z,
  );
  check('la grande face divise la distance par 4', near(d1 * 4, d0, 1e-6), `${d0} → ${d1}`);
}

// =============================================================================
console.log('\n— Le chemin prévu —');
{
  const sim = new Simulation(LEVEL_01);

  walkTo(sim, [16, 0, 4], 60 * 6);
  walkTo(sim, [15, COURT_FLOOR_Y, 0], 60 * 5);
  settle(sim, 30);
  check('on tombe dans la cour à ×1', sim.player.position.y < -2.5, pos(sim));

  const t1 = walkTo(sim, [24, COURT_FLOOR_Y, 0], 60 * 6, { stopOnEvent: true });
  check('la porte indigo fait grandir', t1.traversed?.newLevel === 1, pos(sim));
  check('on ressort sur la place, au sol', near(sim.player.position.y, 0, 0.8), pos(sim));

  const win = walkTo(sim, [-18, 3.3, -10], 60 * 20);
  check('à ×4, la tour se monte à pied', sim.player.position.y > 3.0, pos(sim));
  check('objectif atteint', win.reachedGoal === true, pos(sim));
}

// =============================================================================
console.log('\n— Les impasses doivent tenir —');
{
  // À taille normale, la tour doit rester un mur : c'est tout l'intérêt.
  const sim = new Simulation(LEVEL_01);
  sim.player.position = { x: -5, y: 0.2, z: -10 };
  walkTo(sim, [-18, 0, -10], 60 * 12, { jump: true });
  settle(sim);
  check(
    'la tour reste infranchissable à ×1',
    !sim.goalReached && sim.player.position.y < 2.0,
    pos(sim),
  );

  // Tombé dans la cour à ×1, on ne remonte pas : la porte est la seule issue.
  const trapped = new Simulation(LEVEL_01);
  trapped.player.position = { x: 15, y: COURT_FLOOR_Y + 0.2, z: 0 };
  walkTo(trapped, [4, COURT_FLOOR_Y, 0], 60 * 12, { jump: true });
  settle(trapped);
  check('on ne sort pas de la cour à pied à ×1', trapped.player.position.y < -2.5, pos(trapped));

  // À ×4 en revanche, on en ressort d'une enjambée. C'est vital : à cette
  // taille la petite porte est trop étroite, donc si la cour retenait aussi,
  // le joueur serait piégé pour de bon.
  const big = new Simulation(LEVEL_01);
  big.player.scaleLevel = 1;
  big.player.position = { x: 15, y: COURT_FLOOR_Y + 0.2, z: 0 };
  walkTo(big, [2, 0, 0], 60 * 12);
  settle(big);
  check('à ×4, on ressort de la cour d’une enjambée', big.player.position.y > -0.5, pos(big));

  // Le sprint ne doit ouvrir aucun raccourci : il multiplie la vitesse, jamais
  // le saut. Un obstacle calibré sur la hauteur doit tenir à pleine course.
  const dashTower = new Simulation(LEVEL_01);
  dashTower.player.position = { x: -2, y: 0.2, z: -10 };
  walkTo(dashTower, [-18, 0, -10], 60 * 12, { jump: true, sprint: true });
  settle(dashTower);
  check(
    'en sprint non plus, la tour ne se monte pas à ×1',
    !dashTower.goalReached && dashTower.player.position.y < 2.0,
    pos(dashTower),
  );

  const dashCourt = new Simulation(LEVEL_01);
  dashCourt.player.position = { x: 15, y: COURT_FLOOR_Y + 0.2, z: 0 };
  walkTo(dashCourt, [4, COURT_FLOOR_Y, 0], 60 * 12, { jump: true, sprint: true });
  settle(dashCourt);
  check(
    'en sprint non plus, on ne s’échappe pas de la cour à ×1',
    dashCourt.player.position.y < -2.5,
    pos(dashCourt),
  );
}

// =============================================================================
console.log('\n— Ce sont les tailles de portail qui bornent, pas un compteur —');
{
  // Terrain d'essai nu : on veut éprouver la règle, pas le tracé du niveau.
  const flat: LevelDef = {
    name: 'essai',
    spawn: [0, 0.2, 12],
    spawnYaw: 0,
    boxes: [{ min: [-60, -4, -60], max: [60, 0, 60] }],
    portals: [
      {
        id: 'essai',
        colorBig: 0,
        colorSmall: 0,
        // Écarté sur x, mais bien POSÉ SUR LE SOL d'essai : hors de la dalle,
        // le joueur tomberait dans le vide au lieu d'atteindre le portail.
        big: { position: [40, 0, 0], yaw: 0 },
        // Normale +Z : le joueur, posté en z positif, l'aborde donc par l'AVANT.
        // Un portail ne s'entre que par sa face avant.
        small: { position: [0, 0, 0], yaw: 0 },
      },
    ],
    goal: { position: [0, -900, 0], radius: 1 },
  };

  const atSmall = (level: number): TickEvents => {
    const sim = new Simulation(flat);
    sim.player.scaleLevel = level;
    sim.player.position = { x: 0, y: 0.2, z: 12 };
    return walkTo(sim, [0, 0, -30], 60 * 12, { stopOnEvent: true });
  };

  check('à ×1, on entre dans la petite porte', atSmall(0).traversed?.newLevel === 1);

  // Le cœur de la règle : à ×4 on mesure 7,2 pour une porte haute de 2,8. On
  // n'y rentre plus, donc on ne peut plus grandir. Ce n'est pas un palier
  // arbitraire, c'est une porte trop petite — et ça se voit.
  const blocked = atSmall(1);
  check(
    'à ×4, la petite porte ne fait plus grandir',
    blocked.traversed === undefined,
    JSON.stringify(blocked),
  );

  // Le grand torii, lui, reste franchissable à ×4 : c'est le chemin du retour,
  // celui qui garantit qu'on n'est jamais coincé à la taille maximale.
  const back = new Simulation(flat);
  back.player.scaleLevel = 1;
  back.player.position = { x: 40, y: 0.2, z: 14 };
  const e = walkTo(back, [40, 0, -30], 60 * 14, { stopOnEvent: true });
  check('à ×4, le grand torii reste franchissable', e.traversed?.newLevel === 0, JSON.stringify(e));
}

// =============================================================================
console.log('\n— Raccord de la traversée —');
{
  // L'œil doit se raccorder exactement : un joueur posé au sol devant une face
  // doit ressortir posé au sol devant l'autre. Sinon on « flotte » à l'arrivée
  // et on sent le saut.
  const sim = new Simulation(LEVEL_01);
  sim.player.position = { x: 15, y: COURT_FLOOR_Y, z: 0 };
  settle(sim, 20);
  const before = sim.player.position.y;
  const t = walkTo(sim, [24, COURT_FLOOR_Y, 0], 60 * 6, { stopOnEvent: true });
  check('la traversée a bien eu lieu', t.traversed !== undefined, pos(sim));
  check(
    'on ressort les pieds au sol, sans flotter ni s’enfoncer',
    near(sim.player.position.y, 0, 0.05),
    `avant ${before.toFixed(2)} → après ${sim.player.position.y.toFixed(3)}`,
  );
}

// =============================================================================
console.log('\n— « La caisse » : la caisse grandit avec son porteur —');
{
  /**
   * Appuie une fois sur la touche d'action, front montant compris.
   *
   * `pitch` compte : depuis que la caisse se tient au bout du regard, on la
   * pose là où l'on vise. Face à un mur et l'œil à l'horizontale, elle n'a
   * nulle part où aller — un joueur baisse les yeux, le test aussi.
   */
  const appuyer = (sim: Simulation, pitch = 0): TickEvents => {
    const base = {
      forward: 0,
      strafe: 0,
      jump: false,
      sprint: false,
      yaw: sim.player.yaw,
      pitch,
    };
    sim.step({ ...base, interact: false, throwIt: false }, TICK_DT);
    const e = sim.step({ ...base, interact: true, throwIt: false }, TICK_DT);
    sim.step({ ...base, interact: false, throwIt: false }, TICK_DT);
    return e;
  };

  const sim = new Simulation(LEVEL_02);
  const caisse = () => sim.carryables.items[0];

  check('la caisse démarre à 0,75', near(caisse().size, 0.75, 1e-6), `${caisse().size}`);

  walkTo(sim, [4, 0, 6.8], 60 * 5);
  const prise = appuyer(sim);
  check('on la soulève à taille normale', prise.carry?.taken === true, JSON.stringify(prise));

  // Le trajet vers la porte indigo, caisse en main.
  walkTo(sim, [13, 0, 0], 60 * 8);
  const t = walkTo(sim, [22, 0, 0], 60 * 6, { stopOnEvent: true });
  check('on traverse la porte indigo en la portant', t.traversed?.newLevel === 1, pos(sim));
  check(
    'la caisse a grandi dans les mêmes proportions',
    near(caisse().size, 3.0, 1e-6),
    `${caisse().size}`,
  );
  check('elle est toujours en main', caisse().held === true);

  // On la repose. Le pilote automatique ne cherche pas à viser : on baisse
  // simplement les yeux, et on vérifie que la pose aboutit quelque part.
  appuyer(sim, -0.9);
  check('on la repose à ×4', caisse().held === false);
  settle(sim, 120);
  check('elle retombe au sol', caisse().position.y < 0.05, `${caisse().position.y}`);
}

// =============================================================================
console.log('\n— « La caisse » : une fois agrandie, elle ouvre la tour —');
{
  // On éprouve ici la PROPRIÉTÉ du niveau, pas l'adresse du pilote automatique :
  // une caisse de trois unités au pied de la tour la rend franchissable à ×4.
  // Scripter tout le trajet rendrait le test fragile pour rien — le chemin, lui,
  // est déjà couvert par les vérifications précédentes.
  const sim = new Simulation(LEVEL_02);
  sim.player.scaleLevel = 1;
  const caisse = sim.carryables.items[0];
  caisse.size = 3;
  caisse.position = { x: -10.2, y: 0, z: -8 };
  sim.player.position = { x: -5, y: 0.2, z: -8 };

  const win = walkTo(sim, [-16, 6, -8], 60 * 24, { jump: true });
  check('à ×4, la caisse agrandie mène à la tour', sim.player.position.y > 5.5, pos(sim));
  check('objectif atteint', win.reachedGoal === true, pos(sim));
}

// =============================================================================
console.log('\n— Une caisse lancée traverse aussi —');
{
  // Sur terrain nu : on éprouve la règle, pas le tracé.
  const flat: LevelDef = {
    name: 'essai',
    spawn: [0, 0.2, 12],
    spawnYaw: 0,
    boxes: [{ min: [-60, -4, -60], max: [60, 0, 60] }],
    carryables: [{ id: 'c', position: [0, 1.2, 4], size: 0.6 }],
    portals: [
      {
        id: 'essai',
        colorBig: 0,
        colorSmall: 0,
        big: { position: [40, 0, 0], yaw: 0 },
        small: { position: [0, 0, 0], yaw: 0 }, // normale +Z, abordée depuis z positif
      },
    ],
    goal: { position: [0, -900, 0], radius: 1 },
  };

  const sim = new Simulation(flat);
  const c = sim.carryables.items[0];
  // Lancée droit sur la petite porte, à hauteur de son ouverture.
  c.velocity = { x: 0, y: 0, z: -14 };

  let traversee = false;
  for (let i = 0; i < 120 && !traversee; i++) {
    const avant = c.size;
    sim.step(
      { forward: 0, strafe: 0, jump: false, sprint: false, interact: false, throwIt: false, yaw: 0, pitch: 0 },
      TICK_DT,
    );
    if (c.size !== avant) traversee = true;
  }

  check('la caisse lancée franchit bien le portail', traversee, `taille ${c.size}`);
  check('et en ressort quatre fois plus grande', near(c.size, 2.4, 1e-6), `${c.size}`);
  check('du côté de la grande face', c.position.x > 30, `x=${c.position.x.toFixed(1)}`);

  // Trop grosse pour la petite porte : elle doit rebondir, pas passer.
  const sim2 = new Simulation(flat);
  const gros = sim2.carryables.items[0];
  gros.size = 2.6; // la petite porte fait 1,9 de large
  gros.position = { x: 0, y: 0, z: 4 };
  gros.velocity = { x: 0, y: 0, z: -14 };
  for (let i = 0; i < 120; i++) {
    sim2.step(
      { forward: 0, strafe: 0, jump: false, sprint: false, interact: false, throwIt: false, yaw: 0, pitch: 0 },
      TICK_DT,
    );
  }
  // Le cas vicieux : portée, la caisse est tendue devant soi, donc elle passe
  // le plan AVANT son porteur. Lâchée à cet instant, elle doit traverser — et
  // non rester coincée derrière, à la mauvaise taille.
  const sim3 = new Simulation(flat);
  const lachee = sim3.carryables.items[0];
  lachee.held = true;
  // Joueur devant le plan, caisse déjà derrière : la situation exacte du bug.
  sim3.player.position = { x: 0, y: 0.2, z: 1.2 };
  sim3.player.yaw = Math.PI; // face à la porte
  lachee.position = { x: 0, y: 0.8, z: -0.4 };
  const base3 = {
    forward: 0, strafe: 0, jump: false, sprint: false, yaw: Math.PI, pitch: 0,
  };
  sim3.step({ ...base3, interact: false, throwIt: false }, TICK_DT);
  sim3.step({ ...base3, interact: true, throwIt: false }, TICK_DT);
  check(
    'lâchée alors qu’elle est déjà passée, la caisse traverse quand même',
    lachee.size !== 0.6,
    `taille ${lachee.size}`,
  );

  check(
    'trop grosse pour la porte, elle rebondit au lieu de passer',
    near(gros.size, 2.6, 1e-6) && gros.position.z > 0,
    `taille ${gros.size}, z=${gros.position.z.toFixed(1)}`,
  );
}

// =============================================================================
console.log('\n— « La caisse » : pas de raccourci —');
{
  // Sans la caisse, la tour doit rester imprenable à TOUTES les tailles
  // atteignables. C'est ce qui fait de la caisse la solution, et non un décor.
  for (const level of [0, 1]) {
    const sim = new Simulation(LEVEL_02);
    sim.player.scaleLevel = level;
    sim.player.position = { x: -4, y: 0.2, z: -8 };
    walkTo(sim, [-16, 0, -8], 60 * 16, { jump: true, sprint: true });
    settle(sim);
    check(
      `sans la caisse, la tour tient à ×${scaleOfLevel(level)}`,
      !sim.goalReached && sim.player.position.y < 5,
      pos(sim),
    );
  }

  // Et la caisse d'origine, simplement traînée jusqu'au pied de la tour sans
  // être passée par un portail, ne doit rien changer.
  const sim = new Simulation(LEVEL_02);
  const caisse = sim.carryables.items[0];
  caisse.position = { x: -11.4, y: 0, z: -8 };
  sim.player.position = { x: -8, y: 0.2, z: -8 };
  walkTo(sim, [-16, 0, -8], 60 * 16, { jump: true, sprint: true });
  settle(sim);
  check(
    'la caisse d’origine, non agrandie, ne suffit pas',
    !sim.goalReached && sim.player.position.y < 5,
    pos(sim),
  );

  // À taille minuscule, on ne soulève plus rien.
  const petit = new Simulation(LEVEL_02);
  petit.player.scaleLevel = -1;
  check(
    'à ×1/4, la caisse est trop grosse pour être soulevée',
    !petit.carryables.canLift(petit.carryables.items[0], scaleOfLevel(-1)),
  );
}

// =============================================================================
console.log('\n— Le monde : la spirale monte, et chaque étage voit le précédent —');
{
  const sim = new Simulation(MONDE);

  // Étage 1 → 2. La petite porte du village dépose sur la terrasse.
  walkTo(sim, [0, 0, -34], 60 * 8);
  const t1 = walkTo(sim, [0, 0, -48], 60 * 8, { stopOnEvent: true });
  check('la porte du village fait grandir', t1.traversed?.newLevel === 1, pos(sim));
  check('on ressort sur la terrasse, 30 m plus haut', near(sim.player.position.y, 30, 1.5), pos(sim));

  // C'est LE moment du voyage : de là, le village est en contrebas.
  check(
    'et le village est bien en dessous',
    sim.player.position.y - 0 >= 25,
    `${sim.player.position.y}`,
  );

  // Étage 2 → 3. Une paire quatre fois plus grande prend le relais.
  //
  // ELLE NAÎT FERMÉE : c'est la porte que le Pinceau dessine, et depuis qu'elle
  // le déclare dans les données, la simulation la scelle d'elle-même au
  // démarrage. Ce test-ci vérifie la SPIRALE, pas le tracé — il ouvre donc la
  // porte comme le Pinceau le ferait, en une ligne, et le tracé est vérifié
  // ailleurs. Une porte scellée qui s'ouvrait toute seule était le défaut ;
  // qu'elle casse ce test est la preuve qu'il est corrigé.
  sim.portesFermees.delete('ascension-2');
  walkTo(sim, [0, 30, 60], 60 * 16);
  const t2 = walkTo(sim, [0, 30, 88], 60 * 14, { stopOnEvent: true });
  check('la seconde porte fait grandir encore', t2.traversed?.newLevel === 2, pos(sim));
  check('on ressort sur le belvédère', near(sim.player.position.y, 120, 3), pos(sim));
  check(
    'la terrasse ET le village sont en dessous',
    sim.player.position.y - 30 >= 80,
    `${sim.player.position.y}`,
  );
}

// =============================================================================
console.log('\n— Le monde : on ne reste jamais piégé —');
{
  // Un joueur qui saute de la terrasse revient à ×4 dans le village, où la
  // petite porte est désormais trop étroite pour lui. Sans l'escalier calibré,
  // il serait bloqué là pour de bon.
  const sim = new Simulation(MONDE);
  sim.player.scaleLevel = 1;
  sim.player.position = { x: 65, y: 0.3, z: -26 };
  walkTo(sim, [65, 30, 58], 60 * 40);
  settle(sim, 60);
  check(
    'à ×4, l’escalier ramène du village à la terrasse',
    sim.player.position.y > 26,
    pos(sim),
  );

  // Et le même escalier doit rester un mur à taille normale, sinon le portail
  // ne servirait à rien.
  const petit = new Simulation(MONDE);
  petit.player.position = { x: 65, y: 0.3, z: -26 };
  walkTo(petit, [65, 30, 58], 60 * 40, { jump: true, sprint: true });
  settle(petit, 60);
  check(
    'à ×1, ce même escalier reste infranchissable',
    petit.player.position.y < 6,
    pos(petit),
  );
}

// =============================================================================
console.log('\n— Le monde : on ne tombe pas dans le vide —');
{
  // Les parapets doivent tenir à la taille de LEUR étage : c'est le saut du
  // joueur de cet étage qu'ils doivent dépasser, pas celui d'un joueur normal.
  const bord = (level: number, from: [number, number, number], vers: [number, number, number]) => {
    const sim = new Simulation(MONDE);
    sim.player.scaleLevel = level;
    sim.player.position = { x: from[0], y: from[1], z: from[2] };
    walkTo(sim, vers, 60 * 25, { jump: true, sprint: true });
    settle(sim, 90);
    return sim.player.position.y;
  };

  check(
    'à ×4, le parapet de la terrasse retient',
    bord(1, [-40, 30.3, 60], [-40, 30, 20]) > 26,
    'chute depuis la terrasse',
  );
  check(
    'à ×16, le parapet du belvédère retient',
    bord(2, [-140, 120.3, 220], [-140, 120, 150]) > 110,
    'chute depuis le belvédère',
  );
}

// =============================================================================
console.log('\n— Le monde : la première énigme, le toit de la maison basse —');
{
  // C'est le cœur de la boucle : le pinceau s'y pose, on le voit, et l'on ne
  // peut pas l'atteindre. Il faut aller grandir ailleurs et revenir.
  const monter = (level: number) => {
    const sim = new Simulation(MONDE);
    sim.player.scaleLevel = level;
    sim.player.position = { x: -24, y: 0.3, z: -6 };
    walkTo(sim, [-24, 3.4, -20], 60 * 20, { jump: true, sprint: true });
    settle(sim, 90);
    return sim.player.position.y;
  };

  check('à ×1, le toit est hors d’atteinte', monter(0) < 1.5, `${monter(0).toFixed(2)}`);
  check('à ×4, ce même toit n’est plus qu’une marche', monter(1) > 3.0, `${monter(1).toFixed(2)}`);
}

// =============================================================================
console.log('\n— Le jardin : le détour minuscule —');
{
  // La porte verte est plantée à l'écart, dans le village. On la franchit vers
  // l'ouest et l'on ressort à quarante-cinq centimètres, à l'autre bout du
  // monde. Ce qu'on vérifie ici n'est pas qu'elle marche — c'est qu'elle ne
  // piège pas : un détour dont on ne revient pas serait pire que pas de détour.
  // `stopOnEvent` est indispensable ici : sans lui, l'assistant continue de
  // viser la cible d'origine APRÈS la téléportation, repasse aussitôt la porte
  // en sens inverse, et le test conclut que rien ne s'est passé. C'est le test
  // qui mentait, pas le monde.
  const aller = new Simulation(MONDE);
  aller.player.position = { x: -18, y: 0.3, z: -32 };
  walkTo(aller, [-40, 0, -32], 60 * 12, { stopOnEvent: true });
  check(
    'la porte verte dépose au jardin, quatre fois plus petit',
    aller.player.scaleLevel === -1 && aller.player.position.x > 300,
    `échelle ${aller.player.scaleLevel}, ${pos(aller)}`,
  );

  // On s'enfonce d'abord dans le jardin, puis on revient : le détour doit
  // pouvoir se parcourir, pas seulement s'effleurer.
  walkTo(aller, [360, 0, 0], 60 * 90, { stopOnEvent: true });
  const auLoin = aller.player.position.x;
  walkTo(aller, [280, 0, 0], 60 * 120, { stopOnEvent: true });
  check(
    'et l’on en revient au village, redevenu normal',
    aller.player.scaleLevel === 0 && aller.player.position.x < 0,
    `parti jusqu’à x=${auLoin.toFixed(0)}, revenu ${pos(aller)}`,
  );

  // Le jardin a son propre sol : celui du village s'arrête bien avant. Une
  // région posée dans le vide laisserait tomber le joueur indéfiniment.
  const debout = new Simulation(MONDE);
  debout.player.scaleLevel = -1;
  debout.player.position = { x: 340, y: 4, z: 0 };
  settle(debout, 120);
  check(
    'on tient debout dans le jardin, il n’est pas posé sur le vide',
    debout.player.grounded && debout.player.position.y > -1,
    pos(debout),
  );
}

// =============================================================================
console.log('\n— Le rendez-vous à deux —');
{
  // Ce qu'on vérifie ici n'est pas « ça marche » mais « les deux joueurs
  // trouvent LA MÊME RÉPONSE sans se parler ». C'est toute la conception : s'ils
  // voient la même file, ils concluent la même chose, et il n'y a rien à
  // négocier.
  const file: Attendant[] = [
    { uid: 'zoe', depuis: 1000 },
    { uid: 'alice', depuis: 2000 },
  ];
  check(
    'deux joueurs isolés trouvent le même salon, chacun de son côté',
    salonDe('zoe', file) === salonDe('alice', file) && salonDe('zoe', file) !== null,
    `${salonDe('zoe', file)}`,
  );

  // L'ordre dans lequel la base nous livre la liste ne doit rien changer :
  // Firebase ne garantit pas l'ordre, et s'y fier serait un bug qui n'apparaît
  // qu'en production.
  check(
    'l’ordre de livraison de la liste ne change rien',
    salonDe('zoe', file) === salonDe('zoe', [...file].reverse()),
    `${salonDe('zoe', [...file].reverse())}`,
  );

  // Le vrai piège, et la raison du tri par ancienneté : un nouveau venu ne doit
  // pas défaire une paire déjà formée. Trié par identifiant, « aaa » se serait
  // glissé en tête et aurait volé le partenaire des deux premiers.
  const avant = salonDe('zoe', file);
  const apres = salonDe('zoe', [...file, { uid: 'aaa', depuis: 3000 }]);
  check(
    'un nouveau venu ne défait pas une paire déjà formée',
    avant === apres,
    `${avant} → ${apres}`,
  );

  // Quatre joueurs donnent deux salons distincts, et personne n'est dans deux.
  const quatre: Attendant[] = [
    { uid: 'd', depuis: 10 },
    { uid: 'c', depuis: 20 },
    { uid: 'b', depuis: 30 },
    { uid: 'a', depuis: 40 },
  ];
  const salons = new Set(quatre.map((x) => salonDe(x.uid, quatre)));
  check(
    'quatre joueurs donnent deux salons, et deux seulement',
    salons.size === 2 && !salons.has(null),
    `${[...salons].join(' | ')}`,
  );

  // Un joueur seul attend. Il ne doit surtout pas partir jouer tout seul dans
  // un monde conçu pour deux — il y serait bloqué au premier verrou.
  check(
    'un joueur seul reste en attente',
    salonDe('a', [{ uid: 'a', depuis: 1 }]) === null,
    'aucun salon',
  );

  // Impair : les deux premiers partent, le troisième garde sa place en tête de
  // file et sera le premier servi au prochain arrivant.
  const trois: Attendant[] = [
    { uid: 'x', depuis: 1 },
    { uid: 'y', depuis: 2 },
    { uid: 'z', depuis: 3 },
  ];
  check(
    'à trois, le dernier arrivé attend le suivant',
    salonDe('z', trois) === null && salonDe('x', trois) === salonDe('y', trois),
    `${salonDe('x', trois)}`,
  );

  check(
    'et l’on sait qui est en face',
    partenaireDe('x', trois) === 'y' && partenaireDe('y', trois) === 'x',
    `${partenaireDe('x', trois)}`,
  );
}

// =============================================================================
console.log('\n— La clairière : ce qu’une personne seule ne peut pas faire —');
{
  const DUO = construireDuo('geant');

  /** Un joueur posé quelque part, à l'échelle qu'on veut. */
  const joueur = (niveau: number, x: number, y: number, z: number): Simulation => {
    const s = new Simulation(DUO);
    s.player.scaleLevel = niveau;
    s.player.position = { x, y, z };
    return s;
  };

  // --- Les deux routes sont exclusives, et le sont PHYSIQUEMENT --------------
  // C'est le cœur du niveau : on ne l'obtient par aucun script, seulement par
  // des dimensions. Si ces quatre vérifications passent, la coopération est
  // garantie par la géométrie et non par une règle qu'on aurait pu oublier.
  const geantColonne = joueur(1, -56, 0.5, 0);
  walkTo(geantColonne, [-34, 9.45, 0], 60 * 30, { jump: true });
  settle(geantColonne, 60);
  check(
    'à ×4, le géant gravit la colonne',
    geantColonne.player.position.y > 9,
    pos(geantColonne),
  );

  const petitColonne = joueur(-1, -56, 0.5, 0);
  walkTo(petitColonne, [-34, 9.45, 0], 60 * 60, { jump: true, sprint: true });
  settle(petitColonne, 60);
  check(
    'à ×1/4, la même colonne est un mur — marches de 3, enjambée de 0,22',
    petitColonne.player.position.y < 1,
    pos(petitColonne),
  );

  const petitFente = joueur(-1, 16, 0, 0);
  walkTo(petitFente, [28.5, 0, 0], 60 * 90);
  settle(petitFente, 30);
  check(
    'à ×1/4, le minuscule se glisse sous la dalle',
    petitFente.player.position.x > 26 && petitFente.player.position.y < 0.5,
    pos(petitFente),
  );

  // Ce qu'on vérifie n'est pas que le géant reste à distance — il peut très
  // bien MARCHER SUR la dalle, et c'est même une jolie image : il arpente le
  // toit du monde de l'autre. Ce qu'il ne doit pas pouvoir, c'est atteindre le
  // logement, qui est dessous.
  const geantFente = joueur(1, 14, 0.5, 0);
  walkTo(geantFente, [28.5, 0, 0], 60 * 30, { jump: true, sprint: true });
  settle(geantFente, 30);
  check(
    'à ×4, la fente lui reste fermée — il passe par-dessus, jamais dessous',
    geantFente.player.position.y > 1.5,
    pos(geantFente),
  );

  // --- Les portes scellées ---------------------------------------------------
  const ferme = joueur(1, -18, 0.5, 0);
  const refus = walkTo(ferme, [-2, 0.35, 0], 60 * 20, { stopOnEvent: true });
  check(
    'la porte du géant reste close tant que la fente est vide',
    refus.refused?.reason === 'scelle' && ferme.player.scaleLevel === 1,
    `${refus.refused?.reason ?? 'aucun refus'}`,
  );

  // Et la même, une fois que l'AUTRE joueur a fait son travail à l'autre bout
  // du monde. C'est la seule chose qui change entre les deux essais.
  const ouvert = joueur(1, -18, 0.5, 0);
  ouvert.sockets.items.find((s) => s.id === 'socle-fissure')!.filledBy = 'galet';
  const passe = walkTo(ouvert, [-2, 0.35, 0], 60 * 20, { stopOnEvent: true });
  check(
    'et elle s’ouvre dès que le minuscule l’a garnie',
    passe.traversed?.pairId === 'porte-du-geant' && ouvert.player.scaleLevel === 0,
    `échelle ${ouvert.player.scaleLevel}`,
  );

  const ouvert2 = joueur(-1, 20, 0, 0);
  ouvert2.sockets.items.find((s) => s.id === 'socle-colonne')!.filledBy = 'pierre-lourde';
  const passe2 = walkTo(ouvert2, [2, 0.35, 0], 60 * 90, { stopOnEvent: true });
  check(
    'symétriquement, la porte du minuscule s’ouvre grâce au géant',
    passe2.traversed?.pairId === 'porte-du-minuscule' && ouvert2.player.scaleLevel === 0,
    `échelle ${ouvert2.player.scaleLevel}`,
  );

  // --- LE PARCOURS ENTIER, PIERRE EN MAIN ------------------------------------
  //
  // Les vérifications ci-dessus garnissaient les logements à la main. Elles
  // prouvaient que les portes s'ouvrent, pas que le niveau se TERMINE. Ici on
  // fait le trajet complet : trouver la pierre, la soulever, la porter en haut
  // de la colonne, l'y déposer, et constater que la porte d'en face s'est
  // desscellée. C'est le seul test qui puisse dire « ce niveau est jouable ».
  const geant = joueur(1, -56, 0.5, 6);

  // Aller jusqu'à la pierre et la saisir. La saisie se déclenche au front
  // montant, donc la maintenir enfoncée pendant la marche ne la ramasse qu'une
  // fois — c'est justement ce qu'on veut.
  walkTo(geant, [-56, 0, 12], 60 * 12);
  const prise = walkTo(geant, [-56, 0, 12], 60 * 3, { interact: true });
  check(
    'le géant soulève la pierre — elle n’est pas trop lourde pour lui',
    prise.carry?.taken === true && geant.carryables.held !== null,
    `${prise.carry?.taken ? 'en main' : (prise.tooHeavy ? 'trop lourde' : 'rien')}`,
  );

  // La porter au sommet. On se poste à huit mètres EN DEÇÀ du logement et l'on
  // regarde vers lui : c'est exactement la portée du bras à cette taille, donc
  // la pierre atterrit dessus. C'est aussi ce que fera un joueur, à tâtons.
  walkTo(geant, [-42, 9.45, 0], 60 * 40, { jump: true });
  settle(geant, 30);
  walkTo(geant, [-41.9, 9.45, 0], 60 * 4);
  const depot = walkTo(geant, [-26, 9.45, 0], 60 * 4, { interact: true });
  settle(geant, 120);
  void depot;

  const colonneGarnie = geant.sockets.items.find((s) => s.id === 'socle-colonne')!;
  check(
    'il la loge au sommet de la colonne',
    colonneGarnie.filledBy === 'pierre-lourde',
    `${colonneGarnie.filledBy ?? 'vide'}, joueur ${pos(geant)}`,
  );

  // Et le minuscule, à l'autre bout du monde, trouve sa porte ouverte.
  check(
    'et la porte du minuscule s’en trouve desscellée, à l’autre bout du monde',
    geant.sockets.pourvus.has('socle-colonne'),
    'le niveau est terminable',
  );

  // --- La retrouvaille -------------------------------------------------------
  const dalles: [Dalle, Dalle] = [
    { centre: DALLE_GEANT, rayon: RAYON_DALLE },
    { centre: DALLE_MINUSCULE, rayon: RAYON_DALLE },
  ];
  const sur = (d: [number, number, number], lvl: number) => ({
    position: { x: d[0], y: d[1], z: d[2] },
    scaleLevel: lvl,
  });

  check(
    'chacun sur sa dalle, à la même taille : c’est gagné',
    retrouvailles(sur(DALLE_GEANT, 0), sur(DALLE_MINUSCULE, 0), dalles),
    'les deux à ×1',
  );
  check(
    'mais pas s’ils n’ont pas la même taille',
    !retrouvailles(sur(DALLE_GEANT, 1), sur(DALLE_MINUSCULE, 0), dalles),
    'l’un à ×4, l’autre à ×1',
  );
  // Le piège qu'il fallait fermer : un joueur seul qui viendrait poser un pied
  // sur chaque dalle ne doit rien déclencher. La victoire exige deux personnes.
  check(
    'et surtout pas si une seule personne occupe les deux dalles',
    !retrouvailles(sur(DALLE_GEANT, 0), sur(DALLE_GEANT, 0), dalles),
    'deux fois la même dalle',
  );
}

// =============================================================================
console.log('\n— Les caisses partagées —');
{
  // net/caisses.ts n'importe Firebase que pour des types, donc il tourne ici
  // tel quel. C'est précieux : la synchronisation d'objets est exactement le
  // genre de code dont les défauts n'apparaissent qu'à deux, sur deux machines,
  // une fois sur dix.
  const sim = new Simulation(construireDuo('geant'));
  const part = new CaissesPartagees();
  const pair = (
    lot: Record<string, { x: number; y: number; z: number; s: number; m?: number }>,
  ): Map<string, RemoteSnapshot> =>
    new Map([
      ['autre', { uid: 'autre', x: 0, y: 0, z: 0, yaw: 0, lvl: 0, mv: 0, sol: 1, t: Date.now(), caisses: lot }],
    ]);

  // Ce que publie un joueur qui n'a rien touché : rien du tout. Publier des
  // caisses dont on n'est pas responsable, c'est se disputer avec l'autre à
  // dix envois par seconde.
  check('sans rien avoir ramassé, on ne publie aucune caisse', part.aPublier(sim.carryables) === undefined, '');

  part.reclamer('galet');
  const publie = part.aPublier(sim.carryables);
  check(
    'une fois ramassée, elle part avec sa taille',
    publie !== undefined && 'galet' in publie && !('pierre-lourde' in publie),
    Object.keys(publie ?? {}).join(', '),
  );

  // Le pair déplace une caisse dont je ne réponds pas : je la suis.
  part.appliquer(pair({ 'pierre-lourde': { x: 5, y: 1, z: -3, s: 2.4 } }), sim.carryables);
  const pierre = sim.carryables.items.find((c) => c.id === 'pierre-lourde')!;
  check(
    'on suit les caisses dont l’autre répond',
    pierre.position.x === 5 && pierre.position.z === -3,
    `${pierre.position.x}, ${pierre.position.z}`,
  );

  // Le cas qui tranche : le pair annonce qu'il TIENT le galet, dont je me
  // croyais responsable. Celui qui l'a vraiment en main gagne, sinon les deux
  // publient en même temps et la caisse tremble entre deux positions.
  part.appliquer(pair({ galet: { x: 9, y: 0, z: 9, s: 0.28, m: 1 } }), sim.carryables);
  const apres = part.aPublier(sim.carryables);
  check(
    'celui qui tient la caisse l’emporte sur celui qui l’a tenue',
    apres === undefined || !('galet' in apres),
    `${Object.keys(apres ?? {}).join(', ') || 'plus rien'}`,
  );

  // Une caisse logée est acquise : ni le réseau ni personne ne la ressort.
  const logee = sim.carryables.items.find((c) => c.id === 'pierre-lourde')!;
  logee.locked = true;
  part.appliquer(pair({ 'pierre-lourde': { x: -99, y: 0, z: -99, s: 2.4 } }), sim.carryables);
  check(
    'une caisse déjà logée ne bouge plus, quoi qu’annonce le réseau',
    logee.position.x === 5,
    `${logee.position.x}`,
  );
}

// =============================================================================
console.log('\n— Le hall : les trois leçons —');
{
  // Chaque jalon du hall enseigne UNE chose, et le prouve par un refus. Ce
  // qu'on vérifie ici n'est pas que la leçon marche — c'est qu'elle ne s'apprend
  // pas autrement. Un plot qu'on pourrait escalader à taille normale
  // n'enseignerait rien du tout.
  const au = (niveau: number, x: number, y: number, z: number): Simulation => {
    const s = new Simulation(LOBBY);
    s.player.scaleLevel = niveau;
    s.player.position = { x, y, z };
    return s;
  };

  const petitPlot = au(0, -3, 0.3, 20);
  walkTo(petitPlot, [-8, 2.72, 20], 60 * 14, { jump: true, sprint: true });
  settle(petitPlot, 40);
  check(
    'à ×1, le plot du hall est hors d’atteinte — même en sautant, même lancé',
    petitPlot.player.position.y < 1.4,
    pos(petitPlot),
  );

  const grandPlot = au(1, -3, 0.5, 20);
  walkTo(grandPlot, [-8, 2.72, 20], 60 * 14);
  settle(grandPlot, 40);
  check(
    'à ×4, on y monte d’une enjambée — la porte indigo était la réponse',
    grandPlot.player.position.y > 2.5,
    pos(grandPlot),
  );

  const grandFente = au(0, -14, 0.3, 9);
  walkTo(grandFente, [-26, 0.1, 9], 60 * 20, { jump: true });
  settle(grandFente, 30);
  check(
    'à ×1, la fente basse ne s’ouvre pas — 1,80 ne passe pas sous 0,75',
    grandFente.player.position.x > -18,
    pos(grandFente),
  );

  const petitFente = au(-1, -14, 0.1, 9);
  walkTo(petitFente, [-26, 0.1, 9], 60 * 60);
  settle(petitFente, 30);
  check(
    'à ×1/4, on s’y glisse — le torii vermillon était la réponse',
    petitFente.player.position.x < -22 && petitFente.player.position.y < 0.6,
    pos(petitFente),
  );
}
// =============================================================================
console.log('\n— Le jardin : la pomme de pin, et la route de l’encrier —');
{
  // ON VA CHERCHER L'ENCRIER À PIED, PAR LE CHEMIN LE PLUS LARGE QUI EXISTE.
  //
  // L'itinéraire vient de qui a bâti le lieu, et il l'a cherché par balayage
  // plutôt que deviné : son point le plus serré laisse 1,50 m de chaque côté,
  // soit un couloir de 3 m pour un joueur qui en fait 0,17. Dix-huit fois sa
  // largeur — c'est franc, et c'est ce qu'on veut d'un chemin obligatoire.
  const petit = new Simulation(MONDE);
  petit.player.scaleLevel = -1;
  petit.player.position = { x: 310, y: 0.2, z: 0 };
  for (const p of [
    [401, 0, 23],
    [420.5, 0, 27],
    [446.5, 0, 27.5],
    [501.5, 0, 27.5],
    [516.5, 0, 0],
  ] as [number, number, number][]) {
    walkTo(petit, p, 60 * 130);
  }
  settle(petit, 60);
  check(
    'à ×1/4, on atteint l’encrier à pied, sans un seul saut',
    Math.hypot(petit.player.position.x - 516.5, petit.player.position.z) < 6,
    pos(petit),
  );

  // LA POMME DE PIN : on y monte, et une chute ne coûte que du temps.
  //
  // Le bond entre écailles est de 0,26 — au-dessus de l'enjambée (0,225), donc
  // on ne monte jamais en marchant, et la chute est réellement possible ; sous
  // le saut (0,32), donc elle reste franchissable. C'est cet intervalle de six
  // centimètres qui fait tout le morceau.
  // LE TALUS SE REMONTE À PIED. C'est la seule partie de l'ascension que ce
  // fichier peut vérifier, et c'est la plus importante : c'est par là qu'on
  // revient après une chute. Des crans de 0,14, sous l'enjambée de 0,225 — donc
  // on remonte en marchant, sans avoir à réussir quoi que ce soit.
  const grimpeur = new Simulation(MONDE);
  grimpeur.player.scaleLevel = -1;
  grimpeur.player.position = { x: 336, y: 0.2, z: -11 };
  walkTo(grimpeur, [336, 0.7, -17], 60 * 120);
  settle(grimpeur, 60);
  check(
    'à ×1/4, le talus se remonte à pied — c’est par là qu’on revient après une chute',
    grimpeur.player.position.y > 0.5,
    pos(grimpeur),
  );

  // LA SPIRALE ELLE-MÊME N'EST PAS VÉRIFIÉE ICI, et je préfère l'écrire.
  // Elle monte en lacets — gauche-droite, puis droite-gauche, cinq volées — et
  // l'assistant de marche de ce fichier ne sait aller qu'en ligne droite. Elle
  // a été éprouvée par qui l'a bâtie, qui a provoqué cinquante-huit chutes
  // depuis chaque appui : cinquante-huit rattrapées par la vire du dessous. Ce
  // n'est pas rien, mais ce n'est pas non plus vérifié ici, et le prétendre
  // serait pire que de le taire.

  // ET SURTOUT : on ne meurt pas, on ne sort pas du monde, on retombe dedans.
  // C'est la seule chose que le joueur avait demandée pour cette ascension.
  const chuteur = new Simulation(MONDE);
  chuteur.player.scaleLevel = -1;
  chuteur.player.position = { x: 336, y: 8.6, z: -22 };
  settle(chuteur, 300);
  check(
    'et une chute du sommet est rattrapée par le relief, jamais mortelle',
    chuteur.player.grounded && chuteur.player.position.y > -1,
    pos(chuteur),
  );
}



// =============================================================================
console.log('\n— La côte rouge : le versant des fours —');
{
  // On franchit la porte de l'ouest et l'on doit se retrouver à ×4 dans un
  // monde qui a son propre sol — une région posée sur le vide laisserait
  // tomber le joueur indéfiniment, et rien dans le fichier ne le dirait.
  const aller = new Simulation(MONDE);
  aller.player.position = { x: -44, y: 0.3, z: -30 };
  walkTo(aller, [-64, 0, -30], 60 * 12, { stopOnEvent: true });
  check(
    'la porte de l’ouest dépose sur la côte rouge, quatre fois plus grand',
    aller.player.scaleLevel === 1 && aller.player.position.x < -300,
    `échelle ${aller.player.scaleLevel}, ${pos(aller)}`,
  );

  // Et l'on traverse la région à pied, d'un bout à l'autre.
  //
  // EN CONTOURNANT, et c'est le sujet même du lieu : le dernier four barre la
  // voie et ne se gravit pas depuis le bol. Un premier essai en ligne droite
  // butait dessus — ce n'était pas un défaut de la région, c'était son énigme,
  // et un test qui va tout droit ne teste que sa propre naïveté.
  settle(aller, 90);
  check(
    'on y tient debout — la région porte son propre sol',
    aller.player.grounded && aller.player.position.y > -1,
    pos(aller),
  );

  // LA TRAVERSÉE, PAR L'ITINÉRAIRE DU LIEU ET NON EN LIGNE DROITE.
  //
  // Un premier essai allait tout droit et butait sur la tablette d'un séchoir,
  // haute de 4,80 : au-dessus de l'enjambée (3,60), sous le saut (5,18). Ce
  // n'était pas un défaut de la région, c'était son seul vrai obstacle — et un
  // pilote qui ne saute jamais et pousse perpendiculairement à un mur plat n'a
  // aucune composante tangentielle : il s'arrête au lieu de glisser.
  //
  // Mais en cherchant la route, on a trouvé PIRE et invisible : le couloir sud
  // ne faisait que 4,50 pour un joueur de 2,72 de diamètre. Une porte que
  // personne n'aurait trouvée, qu'aucune vérification de faces ni de parcelle
  // ne peut voir, et qui marchait pour celui qui connaissait son plan. Élargie
  // à 11,50.
  //
  // On suit donc les six points du lieu : nord du premier séchoir, sud des deux
  // autres, puis le bol. Si un jour quelqu'un remet une ligne droite ici, elle
  // se rebloquera au même endroit — et ce sera le bon comportement.
  for (const point of [
    [-410, 0, 7],
    [-424, 0, -11],
    [-452, 0, -11],
    [-490, 0, -6],
    [-510, 0, 0],
  ] as [number, number, number][]) {
    walkTo(aller, point, 60 * 40);
  }
  settle(aller, 60);
  check(
    'on la traverse de la porte au fond, par le chemin du lieu',
    aller.player.position.x < -495 && aller.player.grounded,
    pos(aller),
  );

  // Et l'on en revient — par le même chemin, à l'envers. C'est le seul retour
  // possible et il doit tenir : une région dont on ne sort pas est pire qu'une
  // région qui n'existe pas.
  for (const point of [
    [-490, 0, -6],
    [-452, 0, -11],
    [-424, 0, -11],
    [-410, 0, 7],
  ] as [number, number, number][]) {
    walkTo(aller, point, 60 * 40);
  }
  walkTo(aller, [-300, 0, 0], 60 * 80, { stopOnEvent: true });
  check(
    'et l’on en revient au village, redevenu normal',
    aller.player.scaleLevel === 0 && aller.player.position.x > -100,
    `échelle ${aller.player.scaleLevel}, ${pos(aller)}`,
  );
}

// =============================================================================
// =============================================================================
console.log('\n— Le rêve : cent graines, aucune impasse —');
{
  // Un générateur ne se relit pas, il s'éprouve. On en fabrique cent et l'on
  // vérifie sur chacun ce qui rendrait le rêve injouable — pas ce qui le
  // rendrait joli.
  let boitesFolles = 0;
  let anneauxRompus = 0;
  let horsBornes = 0;

  for (let g = 1; g <= 100; g++) {
    const r = reve(g);

    for (const b of r.boxes) {
      if (b.min[0] >= b.max[0] || b.min[1] >= b.max[1] || b.min[2] >= b.max[2]) boitesFolles++;
    }

    // Chaque salle doit avoir une porte pour entrer et une pour sortir, sinon
    // l'anneau est rompu et l'on se retrouve enfermé quelque part.
    if (r.portals.length !== 11) anneauxRompus++;

    // Et l'échelle doit rester dans les bornes du moteur tout au long du tour.
    // Si elle en sortait, une porte refuserait le passage au beau milieu du
    // rêve et l'on serait bloqué sans comprendre pourquoi.
    let niveau = 0;
    for (let i = 0; i < r.portals.length; i++) {
      niveau += i % 2 === 0 ? -1 : +1;
      if (niveau < -2 || niveau > 2) horsBornes++;
    }
  }

  check('cent rêves, aucune boîte dégénérée', boitesFolles === 0, `${boitesFolles} fautives`);
  check('cent rêves, aucun anneau rompu', anneauxRompus === 0, `${anneauxRompus} rompus`);
  check(
    'et l’échelle ne sort jamais des bornes en faisant le tour',
    horsBornes === 0,
    `${horsBornes} débordements`,
  );

  // La même graine doit rendre exactement le même rêve : c'est ce qui permet
  // d'envoyer une adresse à quelqu'un.
  check(
    'la même graine rend le même rêve',
    JSON.stringify(reve(4242).boxes) === JSON.stringify(reve(4242).boxes) &&
      JSON.stringify(reve(4242).boxes) !== JSON.stringify(reve(4243).boxes),
    'deux tirages identiques, un troisième différent',
  );

  // Et enfin, dans le monde pour de vrai : on marche droit devant depuis le
  // point de départ, et l'on doit changer de salle ET de taille.
  const songe = new Simulation(reve(7));
  const passage = walkTo(songe, [0, 0, 60], 60 * 20, { stopOnEvent: true });
  check(
    'on marche droit devant, et l’on change de salle et de taille',
    passage.traversed !== undefined && songe.player.scaleLevel !== 0,
    `${passage.traversed?.pairId ?? 'rien'}, échelle ${songe.player.scaleLevel}`,
  );
}

// =============================================================================
console.log('\n— Le miroir : la gauche et la droite —');
{
  // La chiralité ne se vérifie pas à l'œil, elle se vérifie au SIGNE DU
  // DÉTERMINANT. On transporte trois vecteurs formant un trièdre direct et l'on
  // regarde s'il reste direct. Une rotation le préserve, une réflexion
  // l'inverse — et aucune suite de rotations ne rattrapera jamais ça.
  const paire = (miroir: boolean) =>
    buildFaces([
      {
        id: 'essai',
        colorBig: 0,
        colorSmall: 0,
        miroir,
        big: { position: [0, 0, 0], yaw: 0 },
        small: { position: [100, 0, 0], yaw: Math.PI / 2 },
      },
    ])[0];

  const triProduit = (f: ReturnType<typeof paire>): number => {
    const ex = transformVector(f, { x: 1, y: 0, z: 0 }, false);
    const ey = transformVector(f, { x: 0, y: 1, z: 0 }, false);
    const ez = transformVector(f, { x: 0, y: 0, z: 1 }, false);
    // Produit mixte : ex · (ey × ez).
    return (
      ex.x * (ey.y * ez.z - ey.z * ez.y) -
      ex.y * (ey.x * ez.z - ey.z * ez.x) +
      ex.z * (ey.x * ez.y - ey.y * ez.x)
    );
  };

  check(
    'une porte ordinaire garde le trièdre direct',
    triProduit(paire(false)) > 0.9,
    `${triProduit(paire(false)).toFixed(3)}`,
  );
  check(
    'une porte miroir l’inverse — c’est ÇA, la chiralité',
    triProduit(paire(true)) < -0.9,
    `${triProduit(paire(true)).toFixed(3)}`,
  );

  // Et la propriété qui fait toute l'énigme : deux passages rendent la forme
  // d'origine. Sans elle, le joueur ne pourrait pas défaire son erreur.
  const m = paire(true);
  const p = { x: 3.5, y: 1.2, z: -7.25 };
  const retour = transformPoint(m.twin, transformPoint(m, p));
  check(
    'deux passages au miroir rendent la forme d’origine',
    near(retour.x, p.x, 1e-9) && near(retour.y, p.y, 1e-9) && near(retour.z, p.z, 1e-9),
    `(${retour.x.toFixed(2)}, ${retour.y.toFixed(2)}, ${retour.z.toFixed(2)})`,
  );
}

// =============================================================================
console.log('\n— Rien ne naît enterré dans la pierre —');
{
  // UNE VÉRIFICATION QUI MANQUAIT, ET QUI M'AURAIT ÉVITÉ UNE ACCUSATION.
  //
  // J'ai posé l'encrier du jardin dans une boîte qui existait déjà, puis
  // reproché à l'agent qui travaillait dessus d'avoir enterré mon objet. Il
  // avait raison, j'avais tort, et la faute datait du jour où j'ai écrit la
  // quête : la seule chose à rapporter du jeu était inatteignable, et rien ne
  // le disait.
  //
  // Aucune des vérifications existantes ne pouvait le voir. Elles regardaient
  // les tailles, les portes, les parcelles, les faces — jamais si un objet a la
  // place d'exister là où on le pose.
  const dansUnSolide = (
    niveau: LevelDef,
    p: [number, number, number],
  ): string | null => {
    for (const b of niveau.boxes) {
      if (b.ghost) continue;
      if (
        p[0] > b.min[0] && p[0] < b.max[0] &&
        p[1] > b.min[1] && p[1] < b.max[1] &&
        p[2] > b.min[2] && p[2] < b.max[2]
      ) {
        return `${JSON.stringify(b.min)}→${JSON.stringify(b.max)}`;
      }
    }
    return null;
  };

  for (const [nom, niveau] of [
    ['le monde', MONDE],
    ['le hall', LOBBY],
    ['la clairière', construireDuo('geant')],
    ['la cour', LEVEL_01],
    ['la caisse', LEVEL_02],
  ] as const) {
    const fautes: string[] = [];
    for (const c of niveau.carryables ?? []) {
      // Le centre du CUBE, pas son point d'ancrage : c'est lui qui doit avoir
      // de la place.
      const centre: [number, number, number] = [
        c.position[0],
        c.position[1] + c.size * 0.5,
        c.position[2],
      ];
      const dans = dansUnSolide(niveau, centre);
      if (dans) fautes.push(`${c.id} enterré dans ${dans}`);
    }
    for (const s of niveau.sockets ?? []) {
      const centre: [number, number, number] = [
        s.position[0],
        s.position[1] + s.size * 0.5,
        s.position[2],
      ];
      const dans = dansUnSolide(niveau, centre);
      if (dans) fautes.push(`${s.id} enterré dans ${dans}`);
    }
    check(
      `dans ${nom}, aucun objet ni logement n'est enterré`,
      fautes.length === 0,
      fautes[0] ?? '',
    );
  }
}

// =============================================================================
// =============================================================================
console.log('\n— Aucune face confondue et exposée —');
{
  // Le défaut le plus fréquent du projet, enfin vérifié. Il a mordu quatre
  // fois : sur des bordures, sur des garde-corps, puis sur tout le haut d'un
  // escalier — où deux dalles au même niveau donnaient une écharpe grésillante
  // en travers de la terrasse, que seul un joueur pouvait voir.
  //
  // LE SEUIL EST DESCENDU DE 2 m² À 0,25. À deux mètres carrés, il laissait
  // passer les margelles d'un étang et les angles d'un garde-corps — des
  // surfaces d'un mètre carré, mais qu'on longe de près et qui grésillaient
  // sous les yeux du joueur. La taille d'une face confondue ne dit rien de sa
  // visibilité : c'est la distance à laquelle on la regarde qui compte, et un
  // rebord, on marche dessus.
  for (const [nom, niveau] of [
    ['le monde', MONDE],
    ['le hall', LOBBY],
    ['la clairière', construireDuo('geant')],
    ['la cour', LEVEL_01],
    ['la caisse', LEVEL_02],
    ['un rêve', reve(7)],
  ] as const) {
    const fautes = facesConfondues(niveau.boxes, 0.25);
    check(`${nom} n'a aucune face confondue`, fautes.length === 0, fautes[0] ?? '');
  }
}

// =============================================================================
console.log('\n— Les pinceaux endormis : une couleur vit à une TAILLE —');
{
  // LE CŒUR DU JEU, ET IL TIENT EN UNE RÈGLE.
  //
  // On ne ramasse pas un objet : on réveille quelqu'un. Et il ne s'éveille que
  // pour un joueur de la taille du monde où il dort — trop grand, il est
  // minuscule entre nos doigts ; trop petit, on ne peut pas le lever.
  //
  // C'est ce qui relie le VERBE du jeu (changer de taille) à son BUT (rendre
  // les couleurs). Sans cette règle, la couleur serait simplement au bout d'un
  // monde, et l'on pourrait la remplacer par une clé sans que rien change.
  const veilleurs = MONDE.veilleurs!;
  const vert = veilleurs.find((v) => v.id === 'pinceau-vert')!;
  const rouge = veilleurs.find((v) => v.id === 'pinceau-rouge')!;

  /** Va au pinceau et appuie sur E. */
  const reveiller = (niveau: number, v: typeof vert): TickEvents => {
    const sim = new Simulation(MONDE);
    sim.player.scaleLevel = niveau;
    sim.player.position = { x: v.position[0], y: v.position[1] + 0.4, z: v.position[2] };
    settle(sim, 30);
    return walkTo(sim, [v.position[0], v.position[1], v.position[2]], 10, { interact: true });
  };

  check(
    'le pinceau vert s’éveille pour un joueur à sa taille',
    reveiller(vert.echelle, vert).eveil?.id === 'pinceau-vert',
    `échelle exigée ${vert.echelle}`,
  );
  check(
    'et refuse un joueur venu trop petit — il est trop grand pour lui',
    reveiller(vert.echelle - 1, vert).eveilRefuse?.trop === 'petit',
    'venu un cran trop bas',
  );
  check(
    'et refuse aussi un géant — il est minuscule entre ses doigts',
    reveiller(vert.echelle + 1, vert).eveilRefuse?.trop === 'grand',
    'venu un cran trop haut',
  );
  check(
    'le pinceau rouge s’éveille pour un joueur à ×4, la taille où sa porte dépose',
    reveiller(rouge.echelle, rouge).eveil?.id === 'pinceau-rouge',
    `échelle exigée ${rouge.echelle}`,
  );

  // Et l'on ne réveille personne de loin : il faut être allé jusqu'à lui.
  const loin = new Simulation(MONDE);
  loin.player.scaleLevel = vert.echelle;
  loin.player.position = { x: vert.position[0] - 40, y: 0.4, z: vert.position[2] };
  const rien = walkTo(loin, [vert.position[0] - 40, 0, vert.position[2]], 10, { interact: true });
  check(
    'on ne le réveille pas de loin : il faut être allé jusqu’à lui',
    rien.eveil === undefined && rien.eveilRefuse === undefined,
    `à 40 unités pour un rayon de ${vert.radius}`,
  );

  // Une porte non dessinée fait mur, et s'ouvre une fois tracée. C'est la
  // mécanique dont vivra toute la suite de niveaux.
  const vierge = new Simulation(MONDE);
  vierge.portesFermees.add('ascension-2');
  vierge.player.scaleLevel = 1;
  vierge.player.position = { x: 0, y: 30.3, z: 62 };
  const barre = walkTo(vierge, [0, 30, 80], 60 * 20, { stopOnEvent: true });
  check(
    'une porte non dessinée ne se traverse pas',
    barre.refused?.reason === 'scelle' && vierge.player.scaleLevel === 1,
    `${barre.refused?.reason ?? 'aucun refus'}`,
  );
  vierge.portesFermees.delete('ascension-2');
  const ouverte = walkTo(vierge, [0, 30, 80], 60 * 20, { stopOnEvent: true });
  check(
    'une fois dessinée, elle laisse passer',
    ouverte.traversed?.pairId === 'ascension-2',
    `${ouverte.traversed?.pairId ?? 'rien'}`,
  );

  // L'éperon : du sommet du monde jusqu'à la pointe de l'Aiguille, et retour.
  const geant = new Simulation(MONDE);
  geant.player.scaleLevel = 2;
  geant.player.position = { x: 0, y: 121, z: 210 };
  walkTo(geant, [0, 114.2, 0], 60 * 60);
  settle(geant, 60);
  check(
    'à ×16, l’éperon mène du belvédère à la pointe de l’Aiguille',
    Math.hypot(geant.player.position.x, geant.player.position.z) < 20 &&
      geant.player.position.y > 112,
    pos(geant),
  );
  // ET C'EST LÀ QUE LE JEU S'ACHÈVE. Le plan de fin partait quand on rendait la
  // dernière couleur — donc au ras du sol, en franchissant une porte, sans avoir
  // rien gravi. On gagnait en marchant tout droit.
  check(
    'et c’est la pointe, et non le belvédère, qui achève le voyage',
    geant.goalReached,
    pos(geant),
  );
  walkTo(geant, [0, 120, 220], 60 * 60);
  settle(geant, 60);
  check(
    'et l’on en revient — on ne reste pas perché là-haut',
    geant.player.position.z > 190 && geant.player.position.y > 118,
    pos(geant),
  );
}

// ─── Les regions restent dans leur parcelle ──────────────────────────────────
//
// C'est la garantie qui rend la fabrication en parallèle possible : tant que
// chaque région tient dans la boîte qu'on lui a réservée, deux régions écrites
// séparément ne peuvent pas s'interpénétrer, quoi qu'elles contiennent. Sans
// cette vérification, la règle n'est qu'un vœu dans un commentaire.
// =============================================================================
console.log('\n— LE VOYAGE ENTIER, dans l’ordre, en une seule partie —');
{
  // LA VÉRIFICATION QUI MANQUAIT, et la seule qui pouvait attraper le défaut
  // qu'elle a servi à corriger.
  //
  // Tout le reste de ce fichier éprouve des MORCEAUX : cette porte s'ouvre, ce
  // socle accepte cette taille, cette région se traverse. Chacun passait, et
  // pourtant le parcours ne tenait pas — parce qu'on entre dans la côte rouge à
  // taille normale et dans le jardin en étant déjà géant, et que l'ordre des
  // jalons les mettait tous les deux au même moment du voyage.
  //
  // Aucun test par morceaux ne peut voir ça. Celui-ci joue la partie du début à
  // la fin, dans l'ordre, avec un seul joueur, et vérifie qu'à l'arrivée les
  // DEUX couleurs sont rendues.
  const j = new Simulation(MONDE);

  /** Va jusqu'au pinceau endormi et appuie sur E. */
  const reveiller = (sim: Simulation, cible: [number, number, number]): boolean => {
    walkTo(sim, cible, 12);
    settle(sim, 20);
    return walkTo(sim, cible, 10, { interact: true }).eveil !== undefined;
  };

  // ── Le village, à taille d'homme ────────────────────────────────────────
  walkTo(j, [39, 0, -33], 60 * 30);
  check('on fait le tour du village à ×1', j.player.scaleLevel === 0, pos(j));

  // ── La côte rouge : on y va PETIT, et c'est le seul détour qui l'exige ──
  //
  // LE VILLAGE NE SE TRAVERSE PAS EN LIGNE DROITE : il est plein de maisons, et
  // l'assistant de marche de ce fichier fonce sur sa cible sans savoir
  // contourner. Ces points ne sont pas devinés — ils viennent d'une recherche
  // de chemin sur une grille, avec 1,20 de marge autour du joueur. C'est donc
  // aussi la preuve qu'un chemin large existe.
  for (const p of [
    [22, 0, -32],
    [22, 0, -50],
    [-6, 0, -50],
    [-30, 0, -48],
    [-30, 0, -40],
    [-48, 0, -40],
    [-48, 0, -30],
  ] as [number, number, number][]) {
    walkTo(j, p, 60 * 30);
  }
  walkTo(j, [-62, 0, -30], 60 * 14, { stopOnEvent: true });
  check(
    'la porte de l’ouest s’ouvre à taille normale, et fait grandir',
    j.player.scaleLevel === 1 && j.player.position.x < -300,
    `échelle ${j.player.scaleLevel}, ${pos(j)}`,
  );

  for (const p of [
    [-410, 0, 7],
    [-424, 0, -11],
    [-452, 0, -11],
    [-490, 0, -6],
    [-500, 0, 0],
  ] as [number, number, number][]) {
    walkTo(j, p, 60 * 40);
  }
  settle(j, 40);
  check(
    'on réveille le pinceau rouge, au fond du chantier',
    reveiller(j, [-500, 0, 0]),
    pos(j),
  );

  // Retour par le même chemin, à l'envers.
  for (const p of [
    [-490, 0, -6],
    [-452, 0, -11],
    [-424, 0, -11],
    [-410, 0, 7],
  ] as [number, number, number][]) {
    walkTo(j, p, 60 * 40);
  }
  walkTo(j, [-300, 0, 0], 60 * 60, { stopOnEvent: true });
  check(
    'et l’on revient au village, redevenu normal, le pinceau à nos côtés',
    j.player.scaleLevel === 0 && j.eveilles.has('pinceau-rouge'),
    `échelle ${j.player.scaleLevel}, ${j.eveilles.size} pinceau(x) éveillé(s)`,
  );

  // Le pinceau repeint le monde de lui-même en rentrant : c'est du rendu, pas
  // de la simulation, donc ce fichier n'a rien à y vérifier. Ce qui compte ici
  // est qu'on soit revenu, à la bonne taille, avec lui.

  for (const p of [
    [-48, 0, -40],
    [-30, 0, -40],
    [-30, 0, -48],
    [-6, 0, -50],
    [22, 0, -50],
    [22, 0, -32],
    [0, 0, -18],
  ] as [number, number, number][]) {
    walkTo(j, p, 60 * 30);
  }

  // ── La terrasse : on grandit pour de bon ────────────────────────────────
  walkTo(j, [0, 0, -50], 60 * 30, { stopOnEvent: true });
  check(
    'la petite porte du village fait grandir, et dépose sur la terrasse',
    j.player.scaleLevel === 1 && j.player.position.y > 25,
    `échelle ${j.player.scaleLevel}, ${pos(j)}`,
  );

  // ── Le jardin : on y va GRAND, ce qui n'était possible qu'ici ───────────
  walkTo(j, [65, 30, 55], 60 * 60);
  walkTo(j, [65, 0, -26], 60 * 90);
  settle(j, 60);
  check(
    'on redescend au village en géant',
    j.player.scaleLevel === 1 && j.player.position.y < 5,
    `échelle ${j.player.scaleLevel}, ${pos(j)}`,
  );

  // À ×4 le joueur fait 2,72 de diamètre : il ne passe plus où passait le
  // joueur normal, et en revanche il ENJAMBE tout ce qui mesure moins de 3,60.
  // La route est donc entièrement différente, et elle a été cherchée avec ses
  // dimensions à lui.
  for (const p of [
    [52, 0, -26],
    [52, 0, -34],
    [22, 0, -34],
    [22, 0, -22],
    [-26, 0, -22],
    [-26, 0, -32],
  ] as [number, number, number][]) {
    walkTo(j, p, 60 * 30);
  }
  walkTo(j, [-44, 0, -32], 60 * 20, { stopOnEvent: true });
  check(
    'la porte verte, prise en géant, dépose à taille d’homme dans le jardin',
    j.player.scaleLevel === 0 && j.player.position.x > 300,
    `échelle ${j.player.scaleLevel}, ${pos(j)}`,
  );

  // LA MARCHE JUSQU'AU PIED DU TAS. Onze points, aucun saut : c'est le couloir
  // le plus LARGE qui existe, cherché par balayage plutôt que deviné. Son point
  // le plus serré laisse 3,50 m de chaque côté, soit dix fois la largeur du
  // joueur. Un chemin obligatoire doit être franc, sinon on le rate sans
  // comprendre qu'on l'a raté.
  for (const p of [
    [362.5, 0, 13.5],
    [411, 0, 14.5],
    [412, 0, 15.5],
    [471, 0, 26.5],
    [474, 0, 29.5],
    [506.5, 0, 29.5],
    [506.5, 0, 17],
    [508, 0, 1.5],
    [508, 0, -8],
    [507.3, 0, -12],
  ] as [number, number, number][]) {
    walkTo(j, p, 60 * 60);
  }

  // L'ÉPREUVE. Vingt bonds, cinq volées de trois feuilles séparées par une vire,
  // et chaque volée repart en sens inverse. Vingt mètres de montée.
  //
  // CE QUI REND LA CHUTE ACCEPTABLE : les appuis d'une volée SURPLOMBENT la vire
  // d'où elle est partie. Tomber vous repose donc au départ de la volée que vous
  // venez de rater, et vous la rejouez sans faire un pas. C'est la différence
  // entre une épreuve et une punition.
  for (const p of [
    [507.3, 0.83, -16.9], [510, 1.83, -16.9], [512.7, 2.83, -16.9], [512.7, 3.83, -18.9],
    [512.7, 4.83, -20.9], [510, 5.83, -20.9], [507.3, 6.83, -20.9], [507.3, 7.83, -22.9],
    [507.3, 8.83, -24.9], [510, 9.83, -24.9], [512.7, 10.83, -24.9], [512.7, 11.83, -26.9],
    [512.7, 12.83, -28.9], [510, 13.83, -28.9], [507.3, 14.83, -28.9], [507.3, 15.83, -30.9],
    [507.3, 16.83, -32.9], [510, 17.83, -32.9], [512.7, 18.83, -32.9], [512.7, 19.83, -34.9],
    [510, 19.83, -36],
  ] as [number, number, number][]) {
    bondirVers(j, p);
  }
  settle(j, 40);
  check(
    'on gravit le tas de feuilles et l’on réveille le pinceau vert à son sommet',
    reveiller(j, [510, 19.83, -36]),
    pos(j),
  );

  // ── CE QUI REND L'ÉPREUVE ACCEPTABLE, et qu'aucun trajet ne prouve ────────
  //
  // Le parcours ci-dessus montre qu'on sait MONTER. Il ne dit rien de ce qui
  // arrive quand on RATE — et c'est là, pas ailleurs, que se joue la différence
  // entre une épreuve et une punition. Deux propriétés, éprouvées à part.
  {
    const SOL_TAS = -0.17;
    const vire = (k: number): number => SOL_TAS + (k + 1) * 4.0;
    const face = [-18.0, -22.0, -26.0, -30.0, -34.0];

    // 1. LES APPUIS SURPLOMBENT LA VIRE D'OÙ LEUR VOLÉE EST PARTIE. On lâche
    //    donc le joueur dans le vide entre deux feuilles, des deux côtés de
    //    chacune, et l'on regarde où il se repose.
    let bonnes = 0;
    let total = 0;
    let pire = 0;
    for (let k = 0; k < 5; k++) {
      const depart = k === 0 ? SOL_TAS : vire(k - 1);
      const sens = k % 2 === 0 ? 1 : -1;
      for (let i = 1; i <= 3; i++) {
        for (const ecart of [-1.35, 1.35]) {
          const chute = new Simulation(MONDE);
          chute.player.position = {
            x: 510 + sens * (i - 2) * 2.7 + ecart,
            y: depart + i * 1.0 + 0.15,
            z: face[k] + 1.1,
          };
          settle(chute, 400);
          total++;
          if (Math.abs(chute.player.position.y - depart) < 0.35) bonnes++;
          pire = Math.max(pire, depart + i * 1.0 - chute.player.position.y);
        }
      }
    }
    check(
      'tomber du tas vous repose au départ de la volée que vous ratiez',
      bonnes === total,
      `${bonnes}/${total}, dégringolade maximale ${pire.toFixed(2)} m sur une tour de 20`,
    );

    // 2. LA COULÉE NE SE REMONTE PAS. Ses marches font 2,60 pour un saut de
    //    1,293 : sans ce nombre-là, tout le tas se contournerait par le dos.
    //    On essaie de la remonter en sprintant, ce qui est le pire cas.
    const bas = new Simulation(MONDE);
    bas.player.position = { x: 510, y: 0.2, z: -41.5 };
    for (let i = 0; i < 14; i++) {
      walkTo(bas, [510 + (i % 2 === 0 ? -2 : 2), 0, -38.5], 60 * 5, { jump: true, sprint: true });
    }
    settle(bas, 60);
    check(
      'et la coulée ne se remonte pas : elle sort du tas, elle n’y mène pas',
      bas.player.position.y < 2.0,
      pos(bas),
    );
  }

  // LE RETOUR PASSE AILLEURS, et c'est un choix.
  //
  // Redescendre le tas par où l'on est monté serait une punition infligée à qui
  // vient de réussir : vingt bonds, tous déjà compris, avec en prime la peur de
  // tomber d'en haut. Le dos du tas porte donc LA COULÉE, sept feuilles en
  // cascade où l'on se laisse tomber.
  //
  // Ses marches font 2,60, au-dessus du saut de 1,293 : elle descend et ne
  // remonte pas, donc elle n'escamote pas l'épreuve. C'est ce nombre-là, et lui
  // seul, qui empêche le raccourci.
  for (const p of [
    [508, 0, -44.5],
    [503, 0, -44.5],
    [503, 0, -17.5],
    [510, 0, 0],
    [501.5, 0, 27.5],
    [446.5, 0, 27.5],
    [420.5, 0, 27],
    [401, 0, 23],
    [312, 0, 0],
  ] as [number, number, number][]) {
    walkTo(j, p, 60 * 60);
  }
  walkTo(j, [300, 0, 0], 60 * 40, { stopOnEvent: true });
  check(
    'et l’on revient au village, géant, le second pinceau à nos côtés',
    j.player.scaleLevel === 1 && j.eveilles.has('pinceau-vert'),
    `échelle ${j.player.scaleLevel}, ${j.eveilles.size} pinceau(x) éveillé(s)`,
  );

  // ── ET LA CONCLUSION ────────────────────────────────────────────────────
  check(
    'LE VOYAGE ENTIER TIENT DEBOUT — les deux pinceaux ont été réveillés',
    j.eveilles.size === (MONDE.veilleurs?.length ?? 0),
    `${j.eveilles.size} sur ${MONDE.veilleurs?.length ?? 0}`,
  );
}

{
  console.log('\n— On ne juge la présence des autres que sur SA PROPRE montre —');

  // LE CAS RÉEL, rapporté en jouant à deux : « lui me voit, moi je ne le vois
  // pas ». La fraîcheur d'une fiche était jugée en soustrayant l'horodatage de
  // l'autre à sa propre heure ; deux montres qui ne sont pas d'accord se
  // rendent donc invisibles L'UNE À L'AUTRE, mais dans un seul sens.
  //
  // Ici, Bruno retarde de trente secondes sur Alice. Avant correction, Alice
  // l'effaçait dès la première image. On rejoue les deux points de vue.
  const RETARD = 30_000;
  const alice = new Fraicheur();
  const bruno = new Fraicheur();

  let vus = alice.vivants(new Map([['bruno', 1_000_000 - RETARD]]), 1_000_000);
  check('Alice voit Bruno alors que sa montre retarde d’une demi-minute', vus.has('bruno'), [...vus].join(','));

  vus = bruno.vivants(new Map([['alice', 1_000_000]]), 1_000_000 - RETARD);
  check('et Bruno voit Alice, dont la montre avance d’autant', vus.has('alice'), [...vus].join(','));

  // Il publie dix fois par seconde : tant que sa fiche BOUGE, il est là — et le
  // décalage ne joue aucun rôle, puisqu'on ne compare que des égalités.
  let t = 1_000_000;
  for (let i = 0; i < 400; i++) {
    t += 100;
    vus = alice.vivants(new Map([['bruno', t - RETARD]]), t);
  }
  check('quarante secondes plus tard, Bruno est toujours là', vus.has('bruno'), `à t+${(t - 1_000_000) / 1000}s`);

  // Et le fantôme disparaît quand même : sa fiche, elle, ne bouge plus.
  const fige = t - RETARD;
  vus = alice.vivants(new Map([['bruno', fige]]), t + STALE_MS - 1);
  check('mais une fiche figée vit encore juste avant l’échéance', vus.has('bruno'), '');
  vus = alice.vivants(new Map([['bruno', fige]]), t + STALE_MS + 1);
  check('et le fantôme disparaît une fois l’échéance passée', !vus.has('bruno'), [...vus].join(','));

  // Le ménage : ce qui a quitté le serveur ne doit pas rester suivi à vie.
  const seul = new Fraicheur();
  seul.vivants(new Map([['a', 1], ['b', 1]]), 0);
  seul.vivants(new Map([['a', 2]]), 100);
  const revenu = seul.vivants(new Map([['a', 3], ['b', 1]]), 200);
  check('un joueur qui revient est neuf, pas un fantôme d’avant', revenu.has('b'), [...revenu].join(','));
}

{
  console.log('\n— Une porte franchie par un autre ne se lisse pas —');

  // Rapporté en jouant à deux : celui qui traverse voit un passage fluide,
  // celui qui regarde voit l'autre glisser à travers la pierre en rapetissant.
  // Le lissage poursuit la position publiée ; il ne sait pas ce qu'est une
  // porte. On lui apprend à distinguer marcher de franchir.
  const ici = { x: 0, y: 0, z: -40 };

  check(
    'marcher entre deux envois n’est pas un saut',
    !estUnSaut(ici, { x: 0.4, y: 0, z: -39.2 }, 0, 0),
    '',
  );
  check(
    'tomber vite n’en est pas un non plus',
    !estUnSaut(ici, { x: 0, y: -4, z: -40 }, 0, 0),
    '',
  );
  check(
    'mais franchir les deux faces du village en est un',
    estUnSaut(ici, { x: 0, y: 30, z: 110 }, 1, 0),
    '',
  );
  check(
    'et changer d’échelle suffit, même sans bouger',
    estUnSaut(ici, ici, 1, 0),
    'on ne change de taille que par une porte',
  );

  // Le seuil suit l'échelle : un géant couvre seize fois plus de terrain qu'un
  // minuscule dans le même dixième de seconde. Un seuil fixe aurait pris ses
  // enjambées pour des téléportations.
  check(
    'à ×16, une enjambée de géant reste une enjambée',
    !estUnSaut(ici, { x: 12, y: 0, z: -40 }, 2, 2),
    '',
  );
  check(
    'et à ×1/4 la même distance est forcément une porte',
    estUnSaut(ici, { x: 12, y: 0, z: -40 }, -1, -1),
    '',
  );
}


{
  console.log('\n— On ne peint que ce qu’on pourrait tenir —');

  // La couleur devient une mécanique par UNE loi, et c'est celle-ci. Le seuil
  // est exactement celui de la caisse : le joueur a passé une heure à apprendre
  // que ce qui dépasse un peu la moitié de sa hauteur ne se soulève pas, et il
  // apprend en une seconde que ça ne se peint pas non plus.
  const boites = [
    // Sept pots de 0,90 : peignables à 1,80, pas à 45 cm.
    ...Array.from({ length: 7 }, (_, i) => ({
      min: [i * 2, 0, 0] as [number, number, number],
      max: [i * 2 + 0.9, 0.9, 0.9] as [number, number, number],
      famille: 'pots',
    })),
    // Une claie de 3,60 : hors de portée à 1,80, peignable à ×4.
    { min: [-1, 0, -1] as [number, number, number], max: [2.6, 3.6, -0.6] as [number, number, number], famille: 'mur' },
  ];
  const tableau = {
    id: 'atelier',
    position: [0, 2, -1] as [number, number, number],
    yaw: 0,
    largeur: 1.2,
    hauteur: 0.9,
    attendu: { pots: 'rouge' },
  };

  const f = new Familles(boites, [tableau]);

  check('une famille regroupe tous ses membres', f.noms.length === 2, f.noms.join(', '));
  check('et sa taille est celle du PLUS GRAND', Math.abs(f.taille('mur') - 3.6) < 0.001, `${f.taille('mur')}`);

  check('à 1,80 on peint des pots de 0,90', f.peignable('pots', 1), '');
  check('et l’on ne peint pas une claie de 3,60', !f.peignable('mur', 1), '');
  check('à 45 cm, même les pots sont hors de portée', !f.peignable('pots', 0.25), '');
  check('et à ×4 la claie devient peignable', f.peignable('mur', 4), 'la palette est partitionnée par la taille');

  // LE SEUIL EXACT, écrit une fois pour qu'on cesse de le deviner : un peu plus
  // de la moitié de sa propre hauteur. C'est ce nombre qui décide, pour chaque
  // salle, quelle taille il faut être pour y peindre quoi.
  //   ×1/4 → 0,2475   ×1 → 0,99   ×4 → 3,96   ×16 → 15,84
  const grand = new Familles(
    [{ min: [0, 0, 0], max: [3.97, 1, 1], famille: 'juste-trop' }],
    [],
  );
  check(
    'et le seuil est exactement 0,55 fois sa hauteur',
    !grand.peignable('juste-trop', 4) && new Familles([{ min: [0, 0, 0], max: [3.95, 1, 1], famille: 'x' }], []).peignable('x', 4),
    '3,96 m à ×4 : 3,95 passe, 3,97 non',
  );

  // LE TABLEAU. Tant que la pièce ne lui ressemble pas, il ne dit rien.
  check('un tableau non satisfait ne descelle rien', f.verifier().length === 0, '');
  f.peindre('pots', 'vert');
  check('la mauvaise couleur ne suffit pas', f.verifier().length === 0, 'pots en vert, attendu rouge');
  f.peindre('pots', 'rouge');
  const neufs = f.verifier();
  check('la bonne couleur satisfait le tableau', neufs.includes('atelier'), neufs.join(','));
  check('et il ne se satisfait qu’une fois', f.verifier().length === 0, '');

  // ON REPEINT AUTANT QU'ON VEUT, mais une porte ouverte reste ouverte. Une
  // couleur est une décision, donc elle se reprend ; un passage gagné par la
  // réflexion ne doit pas se refermer parce qu'on a continué à jouer après.
  f.peindre('pots', 'vert');
  check('repeindre par-dessus est permis', f.teintes.get('pots') === 'vert', '');
  check('mais le tableau reste satisfait', f.satisfaits.has('atelier'), 'un progrès ne se défait pas par accident');
}


{
  console.log('\n— L’établi du hall se résout vraiment —');

  // Le hall n'enseignait rien qu'on puisse FAIRE : on regardait un inconnu
  // rapetisser, on franchissait une porte, on partait. L'établi est un bac à
  // sable — deux billes identiques, deux creux de tailles différentes — et il
  // n'a de valeur que s'il se résout. Un creux qu'on ne peut pas garnir dans la
  // toute première salle est la pire promesse qu'on puisse faire.
  const hall = new Simulation(LOBBY);

  /** Un appui franc sur la touche d'action, front montant compris. */
  const agir = (sim: Simulation, pitch = -0.35): void => {
    const base = {
      forward: 0, strafe: 0, jump: false, sprint: false,
      yaw: sim.player.yaw, pitch,
    };
    sim.step({ ...base, interact: false, throwIt: false }, TICK_DT);
    sim.step({ ...base, interact: true, throwIt: false }, TICK_DT);
    sim.step({ ...base, interact: false, throwIt: false }, TICK_DT);
  };
  const tient = (sim: Simulation): boolean => sim.carryables.held !== null;

  // La bille qui reste : elle est déjà de la bonne taille, c'est la leçon
  // gratuite. On la porte de trois pas et on la pose.
  walkTo(hall, [2.6, 0, 33.2], 60 * 40);
  agir(hall);
  check('on prend une bille sur l’établi', tient(hall), pos(hall));
  walkTo(hall, [3.2, 0, 31.6], 60 * 20);
  agir(hall);
  settle(hall, 30);
  check(
    'et le petit creux l’accepte telle quelle',
    hall.sockets.pourvus.has('creux-petit'),
    [...hall.sockets.pourvus].join(',') || 'aucun',
  );

  // LA SECONDE DOIT FRANCHIR UNE PORTE. On la prend, on entre par la petite
  // face, on ressort géant en la tenant — elle vaut alors 1,20 — et l'on va la
  // poser dans le grand creux sans jamais avoir rapetissé.
  walkTo(hall, [3.8, 0, 33.2], 60 * 40);
  agir(hall);
  check('on prend la seconde bille', tient(hall), pos(hall));
  const avant = hall.carryables.items.find((c) => c.id === 'bille-b')?.size ?? 0;

  // Le couloir libre entre les repères de taille : ils sont plantés partout
  // entre z = 10 et z = 24, et le premier essai s'est cogné dans l'un d'eux.
  //
  // ET L'ON ENTRE DANS LA PETITE FACE PAR L'OUEST. Elle regarde l'ouest, donc
  // on y pénètre en marchant vers l'EST — le premier essai la traversait à
  // rebours et ne déclenchait rien. C'est le genre de chose qu'un test dit tout
  // de suite et qu'on chercherait longtemps en jouant.
  for (const p of [[3, 0, 22], [3, 0, 10], [2, 0, 5]] as [number, number, number][]) {
    walkTo(hall, p, 60 * 60);
  }
  walkTo(hall, [12, 0, 5], 60 * 40, { stopOnEvent: true });
  settle(hall, 20);
  const apres = hall.carryables.items.find((c) => c.id === 'bille-b')?.size ?? 0;
  check(
    'la porte multiplie par quatre ce qu’on tient',
    hall.player.scaleLevel === 1 && Math.abs(apres - avant * 4) < 0.01,
    `${avant.toFixed(2)} → ${apres.toFixed(2)}, joueur à ×${scaleOfLevel(hall.player.scaleLevel)}`,
  );

  // Le géant traverse le hall jusqu'à l'établi. Il ressort de la grande face au
  // nord-ouest, à (−8, −5), et le grand creux est au sud-est.
  for (const p of [[-4, 0, 8], [6, 0, 26], [15, 0, 31]] as [number, number, number][]) {
    walkTo(hall, p, 60 * 120);
  }
  agir(hall);
  settle(hall, 40);
  check(
    'et le géant loge la grosse bille dans le grand creux',
    hall.sockets.pourvus.has('creux-grand'),
    `${[...hall.sockets.pourvus].join(',') || 'aucun'} — ${pos(hall)}`,
  );

  // LA RÉCOMPENSE. Le cabinet est scellé tant que le grand creux est vide : on
  // voit la porte, on voit qu'elle ne s'ouvre pas, et l'on voit à trois pas de
  // là ce qui l'ouvrira. Rien n'est écrit nulle part.
  const scelle = new Simulation(LOBBY);
  check(
    'le cabinet est scellé tant que rien n’est logé',
    estScelle(scelle.faces.find((f) => f.pairId === 'cabinet')!, scelle.conditionsRemplies),
    '',
  );
  check(
    'et il s’ouvre une fois le grand creux garni',
    !estScelle(hall.faces.find((f) => f.pairId === 'cabinet')!, hall.conditionsRemplies),
    '',
  );
}


{
  console.log('\n— Les salles de la descente tiennent leur contrat —');

  // Chaque salle est écrite seule, par une main qui ne voit pas les autres.
  // C'est ce qui permet d'en bâtir plusieurs en même temps — et c'est aussi ce
  // qui rend ces vérifications-ci indispensables : personne ne relit tout.
  //
  // Les auteurs les font passer eux-mêmes avec un banc jetable ; celles-ci sont
  // PERMANENTES. Une salle correcte le jour de sa livraison ne le reste pas
  // toute seule : on déplacera un mur, on ajoutera un logement, et il n'y aura
  // plus personne pour s'en souvenir.
  for (const salle of SALLES_LIVREES) {
    const parcelle = verifierParcelleSalle(salle);
    check(`${salle.nom} : tout tient dans sa parcelle`, parcelle.length === 0, parcelle[0] ?? '');

    // Deux faces exactement dans le même plan se disputent la profondeur et
    // grésillent. C'est le défaut le plus fréquent du projet — il a mordu six
    // fois — et le seul qu'on ne voie pas en lisant le code.
    const confondues = facesConfondues(salle.boxes, 0.25);
    check(
      `${salle.nom} : aucune face n’en recouvre une autre`,
      confondues.length === 0,
      confondues[0] ?? `${salle.boxes.length} boîtes`,
    );

    // Un logement ordinaire verrouille pour de bon : deux logements qui
    // accepteraient la même taille rendraient possible une faute irréparable.
    const tailles = verifierTaillesDistinctes(salle);
    check(`${salle.nom} : deux creux n’acceptent jamais la même taille`, tailles.length === 0, tailles[0] ?? '');

    // L'échelle est un PALIER, pas un multiplicateur. Le contrat était muet
    // là-dessus et une salle a été livrée avec `0.25` là où il fallait `−1`.
    // Un contrat ambigu produit autant de versions qu'il a de lecteurs.
    const paliers = [salle.entree.echelle, salle.sortie.echelle];
    check(
      `${salle.nom} : les échelles de raccord sont des paliers entiers`,
      paliers.every((e) => Number.isInteger(e) && e >= -2 && e <= 2),
      `entrée ${paliers[0]}, sortie ${paliers[1]}`,
    );

    // Une salle sans station est une salle où le Pinceau ne passe pas, donc
    // une salle où le joueur n'a aucune raison d'aller.
    check(`${salle.nom} : le Pinceau la traverse`, salle.stations.length > 0, `${salle.stations.length} jalons`);
  }

  // ─── LA LOI DE L'ENCHAÎNEMENT : UNE PORTE NE VAUT QU'UN CRAN ────────────
  //
  // Une paire de portails multiplie ou divise par quatre. Toujours, parce que
  // c'est le verbe unique du jeu. Il en découle une contrainte que rien
  // d'autre ne rappelle : la sortie d'une salle et l'entrée de la suivante
  // doivent différer d'EXACTEMENT un cran.
  //
  // Deux crans d'écart demandent deux portes, donc une salle intermédiaire ;
  // zéro cran n'est franchissable par aucune porte du tout. Sans cette
  // vérification, on découvrirait le défaut en jouant — devant une porte qui
  // refuse, sans aucune raison visible dans le monde.
  for (const [salles, raccords] of [
    [SALLES_DESCENTE, RACCORDS_DESCENTE],
    [SALLES_MONTEE, RACCORDS_MONTEE],
  ] as const) {
    for (const r of raccords) {
      const a = salles[r.depuis];
      const b = salles[r.vers];
      const ecart = ecartDeRaccord(a, b);
      check(
        `de ${a.nom} à ${b.nom}, une seule porte suffit`,
        Math.abs(ecart) === 1 && ecart === r.cran,
        `écart de ${ecart} cran(s), raccord déclaré à ${r.cran}`,
      );
    }

    // ET AUCUNE SALLE ORPHELINE. Une salle bâtie, vérifiée, et que personne ne
    // peut atteindre est le pire gaspillage possible — et rien d'autre ne le
    // dirait : elle passe toutes les autres vérifications sans broncher.
    const vues = new Set<number>([0]);
    for (const r of raccords) vues.add(r.vers);
    const perdues = salles.filter((_, i) => !vues.has(i)).map((s) => s.nom);
    check(
      `les ${salles.length} salles de « ${salles[0].nom}… » sont toutes atteignables`,
      perdues.length === 0,
      perdues.join(', '),
    );
  }
  // On ne réclame pas encore la chaîne complète : les dernières salles ne sont
  // pas nées. Mais on exige que ce qui est déclaré soit VRAI, et que les
  // raccords se suivent sans trou — un raccord isolé au milieu du tableau
  // serait une salle inatteignable qu'on croirait reliée.
  // ET TOUTE SALLE EST ATTEIGNABLE. Une salle bâtie, vérifiée, et que personne
  // ne peut atteindre est le pire gaspillage possible — et rien d'autre ne le
  // dirait : elle passe toutes les autres vérifications sans broncher.
  const atteintes = new Set<number>([0]);
  for (const r of RACCORDS_DESCENTE) atteintes.add(r.vers);
  const orphelines = SALLES_DESCENTE.filter((_, i) => !atteintes.has(i)).map((s) => s.nom);
  // ET UNE PORTE À DESSINER NAÎT FERMÉE, DÈS LE DÉMARRAGE. Le scellement ne
  // vivait que dans la remise à zéro, qui n'est jamais appelée au lancement :
  // on commençait la partie avec toutes les portes dessinées déjà ouvertes.
  {
    const neuve = new Simulation(DESCENTE);
    const aDessiner = (DESCENTE.portals ?? []).filter((p) => p.dessinee).map((p) => p.id);
    check(
      'les portes à dessiner naissent fermées, sans qu’on ait rien remis à zéro',
      aDessiner.length > 0 && aDessiner.every((id) => neuve.portesFermees.has(id)),
      `${aDessiner.join(', ') || 'aucune'} — fermées : ${[...neuve.portesFermees].join(', ') || 'aucune'}`,
    );
  }

  // ET DEUX PORTES NE SE PLANTENT PAS AU MÊME ENDROIT. Une salle qui a deux
  // sorties les mettait exactement l'une sur l'autre : on traversait celle
  // qu'on ne voulait pas, ou rien du tout, et le monde n'en disait rien.
  {
    const vues = new Map<string, string>();
    for (const f of new Simulation(DESCENTE).faces) {
      const clef = `${f.position.x.toFixed(2)},${f.position.y.toFixed(2)},${f.position.z.toFixed(2)}`;
      const avant = vues.get(clef);
      check(
        `la face ${f.pairId}/${f.kind} n’en recouvre aucune autre`,
        avant === undefined,
        `elle est plantée sur ${avant ?? ''} en ${clef}`,
      );
      if (avant === undefined) vues.set(clef, `${f.pairId}/${f.kind}`);
    }
  }
  check(
    'aucune salle n’est laissée hors du monde',
    orphelines.length === 0,
    orphelines.join(', '),
  );

  // ET LES PARCELLES NE SE CHEVAUCHENT PAS. C'est la garantie qui rend le
  // travail en parallèle possible : deux salles bâties le même soir par deux
  // mains différentes ne peuvent pas se percuter, quoi qu'elles contiennent.
  for (let i = 0; i < SALLES_LIVREES.length; i++) {
    for (let j = i + 1; j < SALLES_LIVREES.length; j++) {
      const a = SALLES_LIVREES[i];
      const b = SALLES_LIVREES[j];
      const separees = [0, 1, 2].some(
        (k) => a.bounds.max[k] <= b.bounds.min[k] || b.bounds.max[k] <= a.bounds.min[k],
      );
      check(`${a.nom} et ${b.nom} ne se chevauchent pas`, separees, '');
    }
  }
}


{
  console.log('\n— Aucune porte ne refuse sans que le monde le dise —');

  // Signalé en jouant : « il y a des portails que je n’arrive pas à traverser,
  // ça me dit que ma taille est trop extrême alors que je devrais pouvoir ».
  //
  // C'était vrai, et le message était du vocabulaire de moteur. La cause tient
  // en une ligne : à ×1/16, TOUTE grande face du hall mènerait à ×1/64, qui
  // n'existe pas. Trois portes refusaient donc d'un coup, sans qu'aucune ne
  // porte la moindre marque.
  //
  // On ne supprime pas ce refus — il est vrai, et il dit quelque chose de beau
  // sur le monde. On vérifie seulement qu'il n'arrive QUE là où on l'attend :
  // aux deux bouts de l'échelle, et nulle part ailleurs.
  for (const [nom, niveau] of [['le hall', LOBBY], ['le monde', MONDE], ['la descente', DESCENTE]] as const) {
    const sim = new Simulation(niveau);
    const fautes: string[] = [];
    for (const f of sim.faces) {
      // TOUS les paliers du jeu, et non plus trois. La butée basse est passée
      // de −2 à −5 pour qu'on puisse rapetisser aussi loin qu'on veut : c'est
      // le monde qui doit dire non, en devenant impraticable, et jamais une
      // règle énoncée devant une porte manifestement ouverte.
      for (let palier = SCALE_MIN_LEVEL; palier <= SCALE_MAX_LEVEL; palier++) {
        const suivant = palier + traversalLevelDelta(f);
        if (suivant >= SCALE_MIN_LEVEL && suivant <= SCALE_MAX_LEVEL) continue;
        // On ne compte QUE les refus qu'on ne peut pas voir. Si le corps ne
        // rentre pas de toute façon, le monde a déjà dit non, et il l'a dit
        // avec une porte trop petite — ce qui est la bonne façon de le dire.
        if (!canPass(f, scaleOfLevel(palier))) continue;
        fautes.push(`${f.pairId}/${f.kind} à ×${scaleOfLevel(palier)}`);
      }
    }
    // Une seule exception est légitime : au tout dernier cran, une grande face
    // n'a effectivement plus où mener. C'est le fond du monde, il est loin, et
    // le message le dit maintenant en parlant du monde et non du programme.
    const inattendues = fautes.filter((f) => !f.endsWith(`×${scaleOfLevel(SCALE_MIN_LEVEL)}`));
    check(
      `dans ${nom}, aucune porte ne bute sur la limite avant le tout dernier cran`,
      inattendues.length === 0,
      inattendues.slice(0, 3).join(', '),
    );
  }
}


{
  console.log('\n— Une forme se compare par son NOM, jamais par sa géométrie —');

  // LES OBJETS COMPOSITES. Une pièce est une liste de boîtes, comme le décor,
  // et `buildWorldGeometry` la bâtit sans une ligne de plus. Mais un logement,
  // lui, ne teste JAMAIS une géométrie : il compare quatre valeurs — la forme,
  // la taille, la main, et la teinte le jour venu.
  //
  // C'est ce qui rend la boîte à formes possible en données pures. Et c'est
  // aussi ce qui garantit qu'un refus est explicable : le creux dessine ce
  // qu'il attend, la pièce a un nom, et les deux se lisent.
  const enL = [
    { min: [-0.5, -0.5, -0.2] as [number, number, number], max: [0.1, 0.1, 0.2] as [number, number, number] },
    { min: [-0.5, 0.1, -0.2] as [number, number, number], max: [-0.1, 0.5, 0.2] as [number, number, number] },
  ];

  const salle: LevelDef = {
    name: 'formes',
    spawn: [0, 0.2, -3],
    spawnYaw: 0,
    boxes: [{ min: [-8, -1, -8], max: [8, 0, 8], ink: 0 }],
    portals: [],
    carryables: [
      { id: 'equerre-g', position: [-1, 0.1, 0], size: 0.5, forme: 'equerre', main: 'L', pieces: enL },
      { id: 'equerre-d', position: [1, 0.1, 0], size: 0.5, forme: 'equerre', main: 'D', pieces: enL },
      { id: 'cube', position: [0, 0.1, 1], size: 0.5 },
    ],
    sockets: [
      { id: 'creux-equerre-g', position: [0, 0, 3], size: 0.5, forme: 'equerre', main: 'L' },
    ],
    goal: { position: [0, -900, 0], radius: 1 },
  };

  const sim = new Simulation(salle);
  const creux = sim.sockets.items[0];
  const par = (id: string) => sim.carryables.items.find((c) => c.id === id)!;

  check('le creux accepte l’équerre gauche', sim.sockets.fits(creux, par('equerre-g')), '');
  check(
    'et refuse la même équerre en main droite',
    !sim.sockets.fits(creux, par('equerre-d')),
    'aucune rotation ne transforme une main en l’autre : il faut un miroir',
  );
  check(
    'et refuse un cube de la bonne taille',
    !sim.sockets.fits(creux, par('cube')),
    'même taille, même main, mauvaise forme',
  );

  // LA COLLISION RESTE LA BOÎTE ENGLOBANTE. La forme est pour l'œil et pour la
  // serrure, jamais pour la physique — une pièce en L se cogne comme un cube.
  // Le jour où l'on voudrait mieux, on aurait des coques tournantes à écrire et
  // un jeu instable.
  check(
    'une pièce composite garde la taille d’un cube pour la physique',
    par('equerre-g').size === 0.5 && par('cube').size === 0.5,
    'la forme ne change pas la boîte de collision',
  );

  // ET LA MAIN BASCULE AU MIROIR, ce qui est déjà vérifié ailleurs — mais
  // désormais ça se VOIT, puisque la géométrie se reflète avec elle.
  const g = par('equerre-g');
  g.main = g.main === 'L' ? 'D' : 'L';
  check(
    'une fois passée au miroir, l’équerre gauche ne rentre plus',
    !sim.sockets.fits(creux, g),
    'et c’est la même pièce, retournée',
  );
}


{
  console.log('\n— Le sprint court, il ne vole pas —');

  // LE NOMBRE LE PLUS DANGEREUX DU JEU POUR LA CONCEPTION.
  //
  // Un cran d'échelle multiplie la portée par 2. Le sprint la multipliait par
  // 1,8, en l'air comme au sol : un joueur à ×1/4 qui sprinte récupérait donc
  // 90 % de la portée d'un joueur à ×1 qui marche, et toute fenêtre d'énigme
  // fondée sur la taille tenait dans dix pour cent.
  //
  // Le sprint garde tout au sol, où il ne sert qu'à traverser un lieu sans
  // s'ennuyer, et presque rien en l'air, où il décidait de ce qu'on peut
  // franchir.
  const banc: LevelDef = {
    name: 'banc',
    spawn: [0, 0.2, -30],
    spawnYaw: 0,
    boxes: [{ min: [-400, -1, -400], max: [400, 0, 0], ink: 0 }],
    portals: [],
    goal: { position: [0, -900, 0], radius: 1 },
  };

  /** Portée d'un saut lancé, pour une chute donnée en unités du monde. */
  const portee = (niveau: number, sprint: boolean, chute: number): number => {
    const sim = new Simulation(banc);
    sim.player.scaleLevel = niveau;
    sim.player.position = { x: 0, y: 0, z: -30 };
    const cmd = {
      forward: 1, strafe: 0, jump: false, sprint,
      interact: false, throwIt: false, yaw: 0, pitch: 0,
    };
    // Trois secondes d'élan, puis le saut au bord.
    for (let i = 0; i < 180; i++) sim.step(cmd, TICK_DT);
    sim.player.position = { x: 0, y: 0, z: -0.05 };
    sim.step({ ...cmd, jump: true }, TICK_DT);
    const depart = sim.player.position.y;
    let n = 0;
    while (sim.player.position.y > depart - chute && n++ < 6000) sim.step(cmd, TICK_DT);
    return sim.player.position.z + 0.05;
  };

  const CHUTE = 30;
  const marcheNormale = portee(0, false, CHUTE);
  const sprintPetit = portee(-1, true, CHUTE);

  // LA MESURE QUI COMPTE. Sous la même chute, un joueur quatre fois plus petit
  // qui sprinte doit rester très en deçà d'un joueur normal qui marche —
  // sinon l'échelle ne décide plus de rien.
  check(
    'un ×1/4 qui sprinte n’atteint pas un ×1 qui marche',
    sprintPetit < marcheNormale * 0.7,
    `${sprintPetit.toFixed(2)} contre ${marcheNormale.toFixed(2)} — ` +
      `${((sprintPetit / marcheNormale) * 100).toFixed(0)} %`,
  );

  // Et le sprint garde un sens : il ne doit pas devenir décoratif.
  const gain = portee(0, true, CHUTE) / marcheNormale;
  check(
    'mais sauter en courant vaut toujours mieux que sauter à l’arrêt',
    gain > 1.1 && gain < 1.35,
    `×${gain.toFixed(2)} en l’air`,
  );

  // LA LOI D'ÉCHELLE, et elle vaut DEUX et non quatre — je l'avais écrite à
  // quatre, la mesure m'a corrigé. Sous une même chute du monde, le grand a
  // plus de temps ET plus de vitesse, mais le temps varie comme la racine :
  // la portée double par cran, elle ne quadruple pas. C'est exactement pour ça
  // que le sprint était dangereux — il multipliait par 1,8 ce qu'un cran ne
  // multipliait que par 2.
  const rapport = portee(0, false, CHUTE) / portee(-1, false, CHUTE);
  check(
    'et un cran d’échelle vaut toujours le double de portée',
    Math.abs(rapport - 2) < 0.35,
    `×${rapport.toFixed(2)} pour la même chute du monde`,
  );
}


{
  console.log('\n— Un seuil bas se franchit sous un linteau bas —');

  // LE DÉFAUT : on ne relevait le joueur que d'une marche ENTIÈRE — 0,90 m à
  // ×1 — et l'on exigeait que son corps soit libre à cette hauteur-là. Sous un
  // linteau, la tête entrait dans le linteau, la marche était refusée, et
  // l'obstacle réel faisait six centimètres.
  //
  // Le joueur butait sur un seuil qu'il aurait dû enjamber sans le voir. Rien
  // au monde ne pouvait le lui expliquer, et c'est exactement le genre de faute
  // qu'un auteur de salle ne peut pas soupçonner : sa géométrie est juste.
  const passage = (hauteurSeuil: number, hauteurLibre: number): LevelDef => ({
    name: 'seuil',
    spawn: [0, 0.2, -3],
    spawnYaw: 0,
    boxes: [
      { min: [-8, -1, -8], max: [8, 0, 8], ink: 0 },
      // Le seuil, en travers du passage.
      { min: [-2, 0, -0.15], max: [2, hauteurSeuil, 0.15], ink: 1 },
      // Le linteau, juste au-dessus de la tête.
      { min: [-2, hauteurLibre, -0.6], max: [2, hauteurLibre + 0.5, 0.6], ink: 2 },
      // Les deux jambages, pour que ce soit une porte et non un obstacle isolé —
      // et ils vont jusqu'au bout du terrain. Au premier essai ils s'arrêtaient
      // à deux mètres cinquante : le marcheur passait tranquillement à côté, et
      // le test disait qu'un mur d'un mètre se franchissait. Un obstacle qu'on
      // peut contourner ne mesure rien du tout.
      { min: [-8, 0, -0.6], max: [-1.2, hauteurLibre + 0.5, 0.6], ink: 2 },
      { min: [1.2, 0, -0.6], max: [8, hauteurLibre + 0.5, 0.6], ink: 2 },
    ],
    portals: [],
    goal: { position: [0, -900, 0], radius: 1 },
  });

  const franchit = (niveau: LevelDef): boolean => {
    const sim = new Simulation(niveau);
    walkTo(sim, [0, 0, 3], 60 * 20);
    return sim.player.position.z > 1;
  };

  // Un seuil de six centimètres sous un linteau à 1,95 : un joueur de 1,80 doit
  // passer, et il ne doit même pas s'en rendre compte.
  check(
    'un seuil de 6 cm se franchit sous un linteau de 1,95',
    franchit(passage(0.06, 1.95)),
    'la marche se sondait à 0,90 : la tête entrait dans le linteau',
  );

  // Et vingt centimètres aussi, qui est la hauteur d'une vraie marche de porte.
  // Le linteau monte à 2,20 : sous 1,95, un seuil de 0,20 ne laisse que 1,75 de
  // jour pour un corps d'1,80, et le passage est RÉELLEMENT fermé. Le premier
  // essai le croyait ouvert — il ne passait que par la catapulte du linteau.
  check(
    'et un seuil de 20 cm également',
    franchit(passage(0.2, 2.2)),
    '',
  );

  // ─── LA CATAPULTE DU LINTEAU, enfin vérifiée ────────────────────────────
  //
  // Ces deux lignes étaient impossibles à écrire hier, et le commentaire qu'elles
  // remplacent expliquait pourquoi : la résolution d'une descente posait le
  // corps sur le DESSUS de tout ce qu'il pénétrait, et un joueur arrêté au ras
  // d'une porte basse touche son linteau. Il se retrouvait posé dessus, puis
  // marchait par-dessus le mur.
  //
  // La correction tient en une phrase — une descente ne peut pas faire monter —
  // et elle est dans `physics.ts`, sur la passe de gravité elle-même. Ce qui se
  // vérifie ici est donc ce que le joueur voit : **un mur reste un mur.**

  // Un linteau à 1,50 ne laisse pas passer un corps d'1,80. Sans seuil du tout,
  // pour qu'aucune marche ne vienne brouiller la mesure : c'est le jour sous le
  // linteau, et lui seul, qui doit fermer.
  check(
    'un linteau de 1,50 ferme le passage à un joueur de 1,80',
    !franchit(passage(0, 1.5)),
    'la catapulte du linteau : on se posait dessus et on passait par-dessus',
  );

  // ET LE CAS QUI COMPTE POUR LES SALLES : un seuil de vingt centimètres sous
  // un linteau à 1,90 ne laisse que 1,70 de jour à un corps d'1,80. C'est
  // FERMÉ, et ça doit se sentir comme un mur — pas comme un tremplin.
  check(
    'un seuil de 20 cm sous un linteau de 1,90 reste fermé',
    !franchit(passage(0.2, 1.9)),
    'on montait sur le linteau et on passait par-dessus',
  );

  // LE RATTRAPAGE DES CHUTES SURVIT, et c'est ce qui a tué trois des cinq
  // tentatives précédentes. Un pas de temps qui traverse une dalle doit poser le
  // joueur dessus ; s'il ne le fait pas, on tombe à l'infini — mesuré à
  // y = −208 221 la nuit où l'on filtrait par la hauteur.
  {
    const dalle: LevelDef = {
      name: 'dalle',
      spawn: [0, 40, 0],
      spawnYaw: 0,
      boxes: [{ min: [-8, 0, -8], max: [8, 1, 8], ink: 0 }],
      portals: [],
      goal: { position: [0, -900, 0], radius: 1 },
    };
    const sim = new Simulation(dalle);
    const immobile = {
      forward: 0,
      strafe: 0,
      jump: false,
      sprint: false,
      yaw: 0,
      pitch: 0,
      interact: false,
      throwIt: false,
    };
    for (let i = 0; i < 60 * 8; i++) sim.step(immobile, 1 / 60);
    check(
      'on se pose sur la dalle après quarante mètres de chute',
      Math.abs(sim.player.position.y - 1) < 0.05,
      `y = ${sim.player.position.y.toFixed(1)}`,
    );
  }
}


// =============================================================================
{
  console.log('\n— La montée : la main est une serrure qu’aucune taille n’ouvre —');

  // ─── LE THÉORÈME DU BLANCHIMENT, ET IL EST VÉRIFIABLE ────────────────────
  //
  // Un creux qui exige l'AUTRE MAIN et la TAILLE D'ORIGINE ne s'ouvre par aucun
  // nombre de passages au miroir. La démonstration tient en deux lignes :
  //
  //   la main    bascule à chaque passage miroir  → il en faut un nombre IMPAIR
  //   la taille  se multiplie par 4 à chaque cran → il faut une somme NULLE
  //
  // Un nombre impair de ±1 ne fait jamais zéro. La salle est donc impossible si
  // elle ne contient que des miroirs — mathématiquement, pas par difficulté.
  // Il lui faut une SECONDE paire, ordinaire, qui change la taille sans toucher
  // à la main : un passage de chaque, en sens contraires, et le compte tombe.
  //
  // C'est exactement la faute qu'un auteur de salle commettra un jour en toute
  // bonne foi — il aura dessiné un beau lieu, posé un miroir, réglé son creux,
  // et livré une salle que personne ne peut finir. Rien ne le dirait : elle
  // passe toutes les autres vérifications sans broncher, et l'on ne s'en
  // apercevrait qu'en jouant, après une demi-heure à faire la navette.
  for (const salle of SALLES_LIVREES) {
    for (const s of salle.sockets ?? []) {
      if (s.main === undefined) continue;
      const impossible = (salle.carryables ?? []).some(
        (c) => c.main !== undefined && c.main !== s.main && Math.abs(c.size - s.size) < 1e-6,
      );
      if (!impossible) continue;

      const portes = salle.portals ?? [];
      check(
        `${salle.nom} : « ${s.id} » veut l’autre main à taille égale, et la salle en donne le moyen`,
        portes.some((p) => p.miroir) && portes.some((p) => !p.miroir),
        `${portes.filter((p) => p.miroir).length} miroir(s), ${portes.filter((p) => !p.miroir).length} ordinaire(s) — il faut au moins un de chaque`,
      );
    }
  }

  // ─── LES FILS QUI PENDENT ENTRE DEUX FICHIERS ───────────────────────────
  //
  // Une salle déclare son logement et son tableau ; l'assemblage décide ce
  // qu'ils descellent. Personne ne voit les deux à la fois, et c'est le seul
  // endroit du projet où l'on peut écrire un nom qui ne désigne rien : la
  // salle compile, l'assemblage compile, la porte reste scellée POUR TOUJOURS,
  // et le joueur cherche pendant vingt minutes une clef qui n'existe pas.
  //
  // Deux salles de la montée y sont passées la même nuit — l'escalier, dont le
  // dernier verrou n'appartenait pas à la salle, et l'atelier du haut, dont
  // deux tableaux se ressemblent et dont un seul rend le voyage obligatoire.
  {
    const noms = new Set<string>();
    for (const s of SALLES_MONTEE) {
      for (const k of s.sockets ?? []) noms.add(k.id);
      for (const t of s.tableaux ?? []) noms.add(t.id);
    }
    const fantomes = RACCORDS_MONTEE.map((r) => r.condition).filter(
      (c): c is string => c !== undefined && !noms.has(c),
    );
    check(
      'chaque porte scellée de la montée nomme un verrou qui existe',
      fantomes.length === 0,
      fantomes.join(', '),
    );
  }

  // ET LE PINCEAU PASSE PAR DES PORTES QUI EXISTENT. Même famille de faute,
  // même invisibilité : un `stationsPorte` mal orthographié fait voler le guide
  // à travers vingt mètres de pierre, et l'on ne lit plus « suis-moi » mais
  // « il s'est téléporté ».
  {
    const fautes: string[] = [];
    for (const s of SALLES_MONTEE) {
      if (!s.stationsPorte) continue;
      if (s.stationsPorte.length !== s.stations.length) {
        fautes.push(`${s.nom} : ${s.stationsPorte.length} portes pour ${s.stations.length} jalons`);
        continue;
      }
      const siennes = new Set((s.portals ?? []).map((p) => p.id));
      for (const id of s.stationsPorte) {
        if (id !== null && !siennes.has(id)) fautes.push(`${s.nom} : « ${id} » n’est pas une de ses portes`);
      }
    }
    check('le guide de la montée ne passe que par des portes réelles', fautes.length === 0, fautes[0] ?? '');
  }

  // ET UNE PORTE À DESSINER NAÎT FERMÉE, ici comme dans la descente. Le
  // scellement ne vivait que dans la remise à zéro, qui n'est jamais appelée au
  // lancement : on commençait la partie avec toutes les portes déjà ouvertes,
  // et une ligne écrite à la main dans `main.ts` masquait le défaut pour le
  // monde central. C'est le genre de faute qui ne se voit que sur un niveau
  // neuf, donc précisément quand plus personne ne la cherche.
  {
    const neuve = new Simulation(MONTEE);
    const aDessiner = (MONTEE.portals ?? []).filter((p) => p.dessinee).map((p) => p.id);
    check(
      'les portes dessinées de la montée naissent fermées',
      aDessiner.length > 0 && aDessiner.every((id) => neuve.portesFermees.has(id)),
      `${aDessiner.join(', ') || 'aucune'} — fermées : ${[...neuve.portesFermees].join(', ') || 'aucune'}`,
    );
  }

  // ET DEUX PORTES NE SE PLANTENT PAS AU MÊME ENDROIT. Trois salles de la
  // montée déclarent une porte CHEZ ELLES, ce qu'aucune salle de la descente ne
  // faisait : chacune a donc désormais deux faces à elle plus celles des
  // raccords, et le risque de superposition a triplé d'un coup. Deux plans qui
  // se disputent le même point font traverser celui qu'on ne voulait pas — ou
  // rien du tout, et le monde n'en dit rien.
  {
    const vues = new Map<string, string>();
    const doublons: string[] = [];
    for (const f of new Simulation(MONTEE).faces) {
      const clef = `${f.position.x.toFixed(2)},${f.position.y.toFixed(2)},${f.position.z.toFixed(2)}`;
      const deja = vues.get(clef);
      if (deja) doublons.push(`${deja} et ${f.pairId}/${f.kind} en ${clef}`);
      else vues.set(clef, `${f.pairId}/${f.kind}`);
    }
    check('aucune porte de la montée n’en recouvre une autre', doublons.length === 0, doublons[0] ?? '');
  }

  // LE POINT DE DÉPART EST LIBRE. Une salle dont l'entrée est dans la roche est
  // une partie qui ne commence pas — et ça s'est déjà produit, dans un lavoir
  // dont la dalle de base passait sous tout le reste. Aucune vérification ne
  // l'avait trouvé : il a fallu s'y téléporter.
  {
    const sim = new Simulation(MONTEE);
    check(
      'on ne naît pas dans la pierre, sur les toits',
      sim.player.position.y > -50,
      `y = ${sim.player.position.y.toFixed(2)}`,
    );
  }
}

// =============================================================================
{
  console.log('\n— Un logement compare quatre valeurs, jamais une géométrie —');

  // LA QUATRIÈME COMPARAISON. La main, la forme et la taille existaient ; la
  // teinte était annoncée « le jour venu » dans un commentaire de `sockets.ts`
  // depuis des semaines. La boîte à formes l'exige — cinq creux dont chacun ne
  // demande qu'une seule chose, et un cinquième qui les demande toutes.
  //
  // On vérifie les quatre SÉPARÉMENT, parce que c'est la séparation qui fait
  // l'énigme : un creux qui refuserait pour deux raisons à la fois n'apprendrait
  // rien, et le joueur tirerait au sort au lieu de raisonner.
  const creux = new Sockets([
    { id: 'la-teinte', position: [0, 0, 0], size: 0.5, teinte: 3 },
    { id: 'tout', position: [9, 0, 0], size: 0.5, teinte: 3, forme: 'vrille', main: 'L' },
  ]);
  const piece = (ink: number, forme?: string, main?: 'L' | 'D', size = 0.5) =>
    ({ id: 'p', size, ink, forme, main }) as unknown as Parameters<Sockets['fits']>[1];

  const teinte = creux.items[0];
  const tout = creux.items[1];

  check('le creux de la teinte accepte la pièce rouge', creux.fits(teinte, piece(3)), '');
  check('et refuse exactement la même pièce en gris', !creux.fits(teinte, piece(1)), '');
  // ET IL NE REGARDE QUE ÇA. Un creux qui n'exige ni forme ni main doit accepter
  // n'importe quelle forme et n'importe quelle main — sinon la boîte à formes
  // n'a plus cinq leçons mais une seule, répétée cinq fois.
  check(
    'et il se moque de la forme et de la main',
    creux.fits(teinte, piece(3, 'vrille', 'D')) && creux.fits(teinte, piece(3, 'coude', 'L')),
    '',
  );

  check('le cinquième creux exige les quatre à la fois', creux.fits(tout, piece(3, 'vrille', 'L')), '');
  for (const [quoi, p] of [
    ['la teinte', piece(1, 'vrille', 'L')],
    ['la forme', piece(3, 'coude', 'L')],
    ['la main', piece(3, 'vrille', 'D')],
    ['la taille', piece(3, 'vrille', 'L', 2)],
  ] as const) {
    check(`et il refuse dès que ${quoi} manque`, !creux.fits(tout, p), '');
  }
}

// =============================================================================
{
  console.log('\n— On ne ramasse plus à travers les murs —');

  // ─── LA GÉOMÉTRIE D'ABORD, SUR UN CAS QU'ON PEUT LIRE ───────────────────
  const cloison: LevelDef = {
    name: 'cloison',
    spawn: [0, 0.2, -3],
    spawnYaw: 0,
    boxes: [
      { min: [-20, -1, -20], max: [20, 0, 20], ink: 0 },
      // Un pan de mur étroit, de x −0,4 à +0,4, épais de 40 cm. Étroit exprès :
      // il faut qu'un pas de côté suffise à le contourner SANS sortir des
      // 2,88 m de portée, sinon le contre-essai échouerait pour une raison qui
      // n'a rien à voir avec l'occultation.
      { min: [-0.4, 0, -0.2], max: [0.4, 4, 0.2], ink: 1 },
    ],
    portals: [],
    goal: { position: [0, -900, 0], radius: 1 },
  };
  const w = new World(cloison);
  check('un mur en travers coupe le segment', !w.segmentLibre({ x: 0, y: 1, z: -2 }, { x: 0, y: 1, z: 2 }), '');
  check('à côté du mur, le segment passe', w.segmentLibre({ x: 6, y: 1, z: -2 }, { x: 6, y: 1, z: 2 }), '');
  check('par-dessus le mur aussi', w.segmentLibre({ x: 0, y: 5, z: -2 }, { x: 0, y: 5, z: 2 }), '');
  // Un segment qui s'arrête AVANT le mur ne le touche pas : le test porte bien
  // sur un segment et non sur une demi-droite. Sans ça, tout objet aligné avec
  // un mur lointain deviendrait insaisissable.
  check('un segment qui s’arrête avant le mur est libre', w.segmentLibre({ x: 0, y: 1, z: -2 }, { x: 0, y: 1, z: -1 }), '');
  // Et un segment parallèle au mur, DANS son plan, est bien bloqué : c'est le
  // cas dégénéré de la division par zéro, celui qu'on écrit de travers.
  check('parallèle et dans le mur : bloqué', !w.segmentLibre({ x: -3, y: 1, z: 0 }, { x: 3, y: 1, z: 0 }), '');
  check('parallèle et à côté : libre', w.segmentLibre({ x: -3, y: 1, z: 1 }, { x: 3, y: 1, z: 1 }), '');

  // ─── PUIS LE JEU, SUR UNE CAISSE DERRIÈRE UNE CLOISON ───────────────────
  {
    const derriere: LevelDef = {
      ...cloison,
      carryables: [{ id: 'cachee', position: [0, 0, 1.2], size: 0.3, ink: 3 }],
    };
    const sim = new Simulation(derriere);
    // Le joueur est de l'autre côté du mur, à 2,4 m de la caisse : bien dans
    // les 2,88 m de portée, et le nez sur la cloison.
    const vise = (x: number) => {
      sim.player.position = { x, y: 0, z: -1.2 };
      sim.player.yaw = 0;
      return sim.carryables.targeted(sim.player.position, 0, 1, sim.world)?.id ?? null;
    };
    check('la caisse derrière la cloison ne se prend plus', vise(0) === null, '');
    // ET LE CONTRE-ESSAI, qui est la moitié qui compte : en se décalant au bout
    // du mur, on la voit et on la reprend. Sans lui, une fonction qui refuse
    // TOUT passerait la vérification précédente.
    check('en contournant le mur, elle se reprend', vise(1.2) === 'cachee', vise(1.2) ?? 'rien');
  }

  // ─── ET LE GARDE PERMANENT : RIEN N'EST ENTERRÉ ─────────────────────────
  //
  // C'est la vérification qui protège l'avenir. Le correctif ne casse rien
  // aujourd'hui — mesuré : 4 688 postes de prise balayés sur les cinq niveaux,
  // 11,3 % traversaient de la pierre, et AUCUNE caisse ne devenait
  // insaisissable. Mais rien n'empêche quelqu'un d'écrire demain une salle où
  // l'objet est derrière un mur, de la vérifier à la main sans occultation, et
  // de livrer une salle qu'on ne peut pas finir.
  //
  // On exige donc, pour chaque caisse : **il existe au moins un endroit d'où un
  // joueur debout la voit et l'atteint.** Balayage grossier — huit directions,
  // deux distances, les quatre paliers — parce qu'on ne cherche pas à mesurer
  // le confort, seulement à prouver qu'il reste une prise.
  for (const [nom, niveau] of [
    ['le hall', LOBBY],
    ['le monde', MONDE],
    ['la descente', DESCENTE],
    ['la montée', MONTEE],
    ['la boîte à formes', FORMES],
  ] as const) {
    const monde = new World(niveau);
    const sim = new Simulation(niveau);
    const enterrees: string[] = [];

    for (const c of sim.carryables.items) {
      if (c.locked) continue;
      let vue = false;
      for (const palier of [-1, 0, 1, 2] as const) {
        if (vue) break;
        const s = scaleOfLevel(palier);
        if (c.size > PLAYER_HEIGHT * s * 0.55) continue;
        const reach = PLAYER_HEIGHT * s * REACH;
        for (let d = 0; d < 8 && !vue; d++) {
          const a = (d / 8) * Math.PI * 2;
          for (const part of [0.4, 0.8]) {
            const p = {
              x: c.position.x + Math.sin(a) * reach * part,
              y: c.position.y,
              z: c.position.z + Math.cos(a) * reach * part,
            };
            if (!isClear(monde, p, s)) continue;
            const yaw = Math.atan2(c.position.x - p.x, c.position.z - p.z);
            if (sim.carryables.targeted(p, yaw, s, monde)?.id === c.id) {
              vue = true;
              break;
            }
          }
        }
      }
      if (!vue) enterrees.push(c.id);
    }
    check(
      `dans ${nom}, chaque objet reste attrapable de quelque part`,
      enterrees.length === 0,
      enterrees.join(', '),
    );
  }
}

// =============================================================================
{
  console.log('\n— Un creux qui refuse dit ce qui cloche —');

  // ─── LE REFUS MUET, ET POURQUOI IL PASSAIT AVANT TOUT LE RESTE ──────────
  //
  // `fits` rendait un booléen. Le joueur présentait une pièce, elle était
  // refusée, et il n'apprenait RIEN : la taille ? la forme ? la teinte ? la
  // main ? Quatre inconnues font seize combinaisons, donc on essayait au hasard
  // au lieu de raisonner.
  //
  // Trois lecteurs extérieurs ont buté là-dessus sans se concerter, et l'autrice
  // de la boîte à formes avait écrit la même phrase la veille en livrant. C'est
  // le seul point du projet où une critique du dehors et une trouvaille du
  // dedans se recouvrent mot pour mot.
  const creux = new Sockets([
    { id: 'exigeant', position: [0, 0, 0], size: 0.5, forme: 'vrille', main: 'L', teinte: 3 },
  ]);
  const k = creux.items[0];
  const piece = (o: { size?: number; ink?: number; forme?: string; main?: 'L' | 'D' }) =>
    ({
      id: 'p',
      size: o.size ?? 0.5,
      ink: o.ink ?? 3,
      forme: o.forme ?? 'vrille',
      main: o.main ?? 'L',
    }) as unknown as Parameters<Sockets['raisonDuRefus']>[1];

  check('une pièce juste n’a aucune raison d’être refusée', creux.raisonDuRefus(k, piece({})) === null, '');
  check('trop grosse le dit', creux.raisonDuRefus(k, piece({ size: 2 })) === 'trop-grand', '');
  check('trop menue aussi, et ce n’est pas la même chose', creux.raisonDuRefus(k, piece({ size: 0.1 })) === 'trop-petit', '');
  check('la forme le dit', creux.raisonDuRefus(k, piece({ forme: 'te' })) === 'forme', '');
  check('la teinte le dit', creux.raisonDuRefus(k, piece({ ink: 1 })) === 'teinte', '');
  check('la main le dit', creux.raisonDuRefus(k, piece({ main: 'D' })) === 'main', '');

  // ─── ET L'ORDRE EST LA PÉDAGOGIE ────────────────────────────────────────
  //
  // On ne dit qu'UNE chose à la fois : en dire deux, c'est n'en dire aucune. Il
  // faut donc trancher quand une pièce est fausse sur plusieurs points, et
  // l'ordre choisi n'est pas celui de `fits`.
  //
  // La taille d'abord, parce que le joueur la VOIT déjà : commencer par ce
  // qu'il avait sous les yeux lui apprend que le signal dit vrai, et c'est à ce
  // prix qu'il croira les trois autres. La main en dernier, parce qu'elle est
  // la seule invisible : on ne l'entend donc que lorsque tout le reste est
  // juste, c'est-à-dire au moment exact où la leçon peut porter.
  check(
    'fausse sur tout, c’est la taille qu’on entend — la seule qu’on voyait déjà',
    creux.raisonDuRefus(k, piece({ size: 4, forme: 'te', ink: 1, main: 'D' })) === 'trop-grand',
    '',
  );
  check(
    'la bonne taille mais tout le reste faux : la forme',
    creux.raisonDuRefus(k, piece({ forme: 'te', ink: 1, main: 'D' })) === 'forme',
    '',
  );
  check(
    'la forme juste : la teinte',
    creux.raisonDuRefus(k, piece({ ink: 1, main: 'D' })) === 'teinte',
    '',
  );
  check(
    'et la main ne s’entend qu’en dernier, quand tout le reste est juste',
    creux.raisonDuRefus(k, piece({ main: 'D' })) === 'main',
    '',
  );

  // ─── UN CREUX QUI N'EXIGE RIEN NE REPROCHE RIEN ─────────────────────────
  //
  // Le pendant du refus qui parle : un creux muet sur un attribut doit rester
  // muet. Sans ça, la boîte à formes n'aurait plus cinq leçons mais une seule.
  const large = new Sockets([{ id: 'large', position: [0, 0, 0], size: 0.5 }]);
  check(
    'un creux qui n’exige que la taille se tait sur les trois autres',
    large.raisonDuRefus(large.items[0], piece({ forme: 'te', ink: 0, main: 'D' })) === null,
    '',
  );

  // ─── ET LE JEU L'ANNONCE VRAIMENT, EN SIMULATION ────────────────────────
  //
  // Tout ce qui précède teste une fonction. Ce qui suit teste le JEU : on prend
  // une pièce de la boîte à formes, on la pose devant un creux qui n'est pas le
  // sien, et l'on attend que l'événement sorte. Sans ça, la fonction pourrait
  // être parfaite et n'être jamais appelée.
  {
    const sim = new Simulation(FORMES);
    const perle = sim.carryables.items.find((c) => c.id === 'perle')!;
    const cible = sim.sockets.items.find((s) => s.id === 'creux-taille')!;
    perle.position.x = cible.position.x;
    perle.position.y = cible.position.y;
    perle.position.z = cible.position.z;
    const immobile = {
      forward: 0, strafe: 0, jump: false, sprint: false,
      yaw: 0, pitch: 0, interact: false, throwIt: false,
    };
    // On simule la dépose : le décompte s'arme à la main, puisqu'on n'a pas de
    // joueur pour appuyer sur la touche.
    (sim as unknown as { refusEnAttente: { id: string; ticks: number } }).refusEnAttente = {
      id: 'perle',
      ticks: 2,
    };
    let dit: string | undefined;
    for (let i = 0; i < 10 && !dit; i++) {
      const e = sim.step(immobile, TICK_DT);
      if (e.logementRefuse) dit = e.logementRefuse.raison;
    }
    check(
      'posée dans le mauvais creux, la perle s’entend dire « trop petite »',
      dit === 'trop-petit',
      dit ?? 'rien du tout',
    );
  }
}

// =============================================================================
{
  console.log('\n— La boîte à formes : une seule case par ligne et par colonne —');

  // ─── LA TABLE D'UNICITÉ, ET C'EST TOUTE LA SALLE ────────────────────────
  //
  // Cinq pièces, cinq creux, une contrainte chacun et les quatre sur le
  // dernier. Pour que la salle enseigne quoi que ce soit, il faut que **chaque
  // pièce n'ait qu'une seule destination possible** — et « possible » veut dire
  // : à toutes les tailles qu'elle peut prendre en franchissant des portes, et
  // dans les deux mains.
  //
  // Sans ça, deux désastres. Le petit : le joueur loge une pièce dans un creux
  // qui n'était pas le sien, la salle se résout par accident, et il n'a rien
  // appris. Le grand : **un creux ordinaire verrouille pour de bon**, donc la
  // pièce est perdue, donc la salle est morte sans retour — et « ne jamais
  // piéger » est le seul défaut que ce jeu ne se pardonne pas.
  //
  // On balaie donc sept crans d'échelle et les deux mains, et l'on exige un
  // seul creux atteignable par pièce. C'est une vérification qu'aucune relecture
  // humaine ne remplace : elle compte 5 × 5 × 7 × 2 = 350 cas.
  {
    const creux = new Sockets(FORMES.sockets ?? []);
    const pieces = FORMES.carryables ?? [];
    const accueils = new Map<string, Set<string>>();

    for (const def of pieces) {
      const atteints = new Set<string>();
      for (let k = -3; k <= 3; k++) {
        for (const main of ['L', 'D'] as const) {
          // Une pièce sans main déclarée n'en prend jamais : on ne teste alors
          // que son état réel, sinon on inventerait des cas impossibles.
          if (def.main === undefined && main === 'D') continue;
          const c = {
            id: def.id,
            size: def.size * Math.pow(4, k),
            ink: def.ink ?? 3,
            forme: def.forme,
            main: def.main === undefined ? undefined : main,
          } as unknown as Parameters<Sockets['fits']>[1];
          for (const s of creux.items) if (creux.fits(s, c)) atteints.add(s.id);
        }
      }
      accueils.set(def.id, atteints);
      check(
        `« ${def.id} » n’a qu’une seule destination possible`,
        atteints.size === 1,
        atteints.size === 0 ? 'aucune — elle ne sert à rien' : `${[...atteints].join(', ')}`,
      );
    }

    // ET RÉCIPROQUEMENT : chaque creux a exactement un client. Un creux que deux
    // pièces peuvent remplir laisserait la cinquième sans logement — la salle
    // serait infaisable, et l'on ne le découvrirait qu'à la dernière pièce.
    for (const s of creux.items) {
      const clients = [...accueils].filter(([, v]) => v.has(s.id)).map(([k]) => k);
      check(`« ${s.id} » n’accepte qu’une seule pièce`, clients.length === 1, clients.join(', '));
    }
  }

  // LA SORTIE ATTEND LES CINQ. `condition` ne savait nommer qu'un verrou, et
  // l'autrice de la salle l'a signalé en livrant plutôt que de faire semblant :
  // avec un verrou unique, un joueur qui remplit le bon en premier sort en
  // laissant quatre trous béants. Le coffre attend maintenant ses cinq creux —
  // on ne rentre dans la boîte que lorsque tout y est rentré, ce qui est à la
  // lettre la règle du jouet.
  {
    const sortie = (FORMES.portals ?? []).find((p) => p.id === 'porte-coffre');
    const verrous = sortie ? conditionsDe(sortie) : undefined;
    const tous = (FORMES.sockets ?? []).map((s) => s.id);
    check(
      'le coffre n’accepte de s’ouvrir que sur les cinq creux',
      verrous !== undefined && tous.every((id) => verrous.includes(id)),
      `${verrous?.length ?? 0} verrou(s) pour ${tous.length} creux`,
    );
  }

  const confondues = facesConfondues(FORMES.boxes, 0.25);
  check('la boîte à formes n’a aucune face confondue', confondues.length === 0, confondues[0] ?? '');
  check(
    'et l’on n’y naît pas dans la pierre',
    new Simulation(FORMES).player.position.y > -50,
    '',
  );
}

// =============================================================================
{
  console.log('\n— Aucun repère ne laisse le joueur coincé —');

  // ─── LE DÉFAUT DES COORDONNÉES ÉCRITES À LA MAIN ────────────────────────
  //
  // Un repère est une paire de nombres tapés en lisant un fichier de niveau. Il
  // n'a aucun lien avec la géométrie : le jour où quelqu'un déplace un mur, le
  // repère continue de viser l'ancien endroit et l'on se réveille à l'intérieur
  // d'un rocher, immobile, sans rien comprendre. C'est exactement ce qui est
  // arrivé au pinceau vert, déplacé dans une table et pas dans l'autre.
  //
  // Les repères de la montée demandent leur position aux salles elles-mêmes et
  // ne peuvent pas dériver. Ceux du hall, du monde et de la descente sont
  // écrits à la main — donc vérifiés ici, à chaque fois, pour toujours.
  for (const [nom, niveau, liste] of [
    ['le hall', LOBBY, REPERES_LOBBY],
    ['le monde', MONDE, REPERES_MONDE],
    ['la descente', DESCENTE, REPERES_DESCENTE],
    ['la montée', MONTEE, REPERES_MONTEE],
    ['la boîte à formes', FORMES, REPERES_FORMES],
  ] as const) {
    // ON NE DEMANDE PAS D'ÊTRE À L'AIR LIBRE, ON DEMANDE DE POUVOIR MARCHER.
    //
    // La première version exigeait `isClear`, et elle refusait cinq repères qui
    // marchent parfaitement : quand on dépose le corps à quelques centimètres
    // dans une dalle, la gravité de l'image suivante le repose dessus et
    // personne ne s'aperçoit de rien. Un repère « dans » la pointe de l'Aiguille
    // pose en réalité le joueur SUR elle, ce qui est exactement le but.
    //
    // Ce qui compte n'est donc pas la propreté du point mais **ce qu'il advient
    // du joueur** : au bout d'une seconde et demie, est-il debout, quelque part,
    // et peut-il avancer ? Une vérification qui décrit l'état visé au lieu de la
    // géométrie ne se trompe pas de reproche.
    const perdus: string[] = [];
    for (const r of liste) {
      const sim = new Simulation(niveau);
      sim.player.position = { x: r.position[0], y: r.position[1], z: r.position[2] };
      sim.player.scaleLevel = r.echelle;
      sim.player.yaw = r.lacet;
      const immobile = {
        forward: 0,
        strafe: 0,
        jump: false,
        sprint: false,
        yaw: r.lacet,
        pitch: 0,
        interact: false,
        throwIt: false,
      };
      for (let i = 0; i < 90; i++) sim.step(immobile, TICK_DT);
      const pose = sim.player.position;
      if (!sim.player.grounded || pose.y < -100) {
        perdus.push(`« ${r.titre} » finit à y=${pose.y.toFixed(1)}${sim.player.grounded ? '' : ', en l’air'}`);
        continue;
      }
      // ET IL PEUT AVANCER. Un corps coincé entre deux boîtes est « au sol » et
      // parfaitement immobile — c'est le pire des deux mondes, puisque rien ne
      // le signale.
      const avant = { x: pose.x, z: pose.z };
      for (let i = 0; i < 45; i++) sim.step({ ...immobile, forward: 1 }, TICK_DT);
      const d = Math.hypot(sim.player.position.x - avant.x, sim.player.position.z - avant.z);
      if (d < 0.3 * scaleOfLevel(r.echelle)) perdus.push(`« ${r.titre} » ne peut pas marcher (${d.toFixed(2)} m)`);
    }
    check(
      `${nom} : ses ${liste.length} repères laissent tous le joueur debout et libre`,
      perdus.length === 0,
      perdus.join(' · '),
    );
  }
}

// =============================================================================
console.log('\n— Les trois tableaux du guide sont alignés —');
{
  // Un décalage entre `guide`, `guideEchelle` et `guidePorte` ne se voit pas à
  // la compilation : il donne un pinceau de la mauvaise taille au mauvais
  // endroit, ou qui traverse une porte pour rien. On compte donc.
  for (const [nom, niveau] of [
    ['le monde', MONDE],
    ['le hall', LOBBY],
  ] as const) {
    const g = niveau.guide?.length ?? 0;
    const e = niveau.guideEchelle?.length ?? g;
    const p = niveau.guidePorte?.length ?? g;
    check(`dans ${nom}, autant d’échelles et de portes que de jalons`, e === g && p === g, `${g} jalons, ${e} échelles, ${p} portes`);
  }

  // ─── ET `guideEchelle` EST UNE TAILLE, PAS UN PALIER ────────────────────
  //
  // C'est la seule exception de tout le projet : partout ailleurs une échelle
  // s'écrit en paliers — −1, 0, 1, 2 — et ici en multiplicateurs : 0,25 · 1 · 4
  // · 16. J'ai rempli la montée avec des paliers, et la faute était silencieuse
  // et grave : **une salle à ×1 donnait un Pinceau de taille zéro**, donc
  // invisible, donc pas de guide du tout, dans trois des six salles. Rien ne
  // l'aurait dit — un guide absent ressemble à un guide qu'on n'a pas rejoint.
  //
  // C'est la même confusion que celle qui a fait écrire `0.25` à un auteur de
  // salle là où il fallait `−1`, dans l'autre sens. Une seule vérification
  // attrape les deux : une taille est strictement positive, et un palier vaut
  // zéro une fois sur quatre.
  for (const [nom, niveau] of [
    ['le monde', MONDE],
    ['le hall', LOBBY],
    ['la descente', DESCENTE],
    ['la montée', MONTEE],
  ] as const) {
    const e = niveau.guideEchelle;
    if (!e) continue;
    const fautives = e.filter((v) => !(v > 0));
    check(
      `dans ${nom}, les tailles du guide sont des multiplicateurs et non des paliers`,
      fautives.length === 0,
      `${fautives.length} valeur(s) nulle(s) ou négative(s) sur ${e.length}`,
    );
  }

  // ET LE GUIDE PASSE PAR OÙ DORT CHAQUE PINCEAU.
  //
  // J'ai déplacé le veilleur vert au sommet du tas de feuilles sans déplacer le
  // jalon qui l'y mène, et rien ne l'a dit : le jeu compilait, les tests
  // passaient, et l'on marchait jusqu'à un pinceau qui n'écoutait plus rien.
  // Un veilleur sans jalon à sa porte est un morceau du jeu qu'on ne trouvera
  // jamais.
  for (const v of MONDE.veilleurs ?? []) {
    const proche = (MONDE.guide ?? []).some(
      (j) => Math.hypot(j[0] - v.position[0], j[1] - v.position[1], j[2] - v.position[2]) < v.radius + 2,
    );
    check(`le guide mène jusqu’à ${v.id}`, proche, `dort en ${v.position.join(', ')}`);
  }

  // ET IL MÈNE JUSQU'AU BOUT. Un guide qui s'arrête avant la fin laisse le
  // joueur au belvédère sans raison de deviner qu'il reste à prendre l'éperon.
  {
    const dernier = (MONDE.guide ?? [])[(MONDE.guide?.length ?? 1) - 1];
    const but = MONDE.goal;
    const d = Math.hypot(dernier[0] - but.position[0], dernier[2] - but.position[2]);
    check(
      'et le dernier jalon du guide se tient sur le but',
      d < but.radius,
      `${d.toFixed(1)} unités du but, rayon ${but.radius}`,
    );
  }
}


{
  console.log('\n— Les régions tiennent dans leur parcelle —');
  for (const m of [TERRASSE, BELVEDERE, JARDIN]) {
    const fautes = verifierParcelle(m);
    check(`${m.region.name} ne déborde pas`, fautes.length === 0, fautes[0] ?? '');
  }
}

console.log(failures === 0 ? '\nTout passe.\n' : `\n${failures} vérification(s) en échec.\n`);
process.exit(failures === 0 ? 0 : 1);
