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
import { TICK_DT, scaleOfLevel } from './constants.js';
import { transformPoint } from './portals.js';
import { Simulation } from './simulation.js';
import type { LevelDef, TickEvents } from './types.js';
import { LEVEL_01 } from '../levels/level01.js';
import { LEVEL_02 } from '../levels/level02.js';

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

console.log(failures === 0 ? '\nTout passe.\n' : `\n${failures} vérification(s) en échec.\n`);
process.exit(failures === 0 ? 0 : 1);
