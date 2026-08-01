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
import { PLAYER_HEIGHT, TICK_DT, scaleOfLevel } from './constants.js';
import { buildFaces, transformPoint, transformVector } from './portals.js';
import { partenaireDe, salonDe, type Attendant } from './salons.js';
import { retrouvailles, type Dalle } from './retrouvailles.js';
import { facesConfondues } from './coplanaires.js';
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
console.log('\n— L’encrier : la quête du monde —');
{
  const PORTEE = (echelle: number) => PLAYER_HEIGHT * echelle * 0.55;
  const encrier = MONDE.carryables!.find((c) => c.id === 'encrier')!;
  const braise = MONDE.carryables!.find((c) => c.id === 'braise')!;
  const socle = MONDE.sockets!.find((s) => s.id === 'socle-vert')!;
  const socleRouge = MONDE.sockets!.find((s) => s.id === 'socle-rouge')!;

  // LE COEUR DE L’ENIGME. Entrer dans le jardin sans avoir grandi d’abord vous
  // y depose a un quart de taille : on traverse ce monde immense, on trouve
  // l’encrier, et on ne peut pas le soulever. Rien ne l’explique, tout se voit.
  check(
    'a ×1/4, l’encrier est trop lourd — venir petit ne mène nulle part',
    encrier.size > PORTEE(0.25),
    `${encrier.size} > ${PORTEE(0.25).toFixed(3)}`,
  );
  check(
    'a ×1, il se souleve — il fallait passer une porte avant',
    encrier.size <= PORTEE(1),
    `${encrier.size} <= ${PORTEE(1).toFixed(2)}`,
  );

  // Le retour doit rester possible a chaque porte. Un centimetre de plus et
  // l’encrier restait coince, la quete morte sans un message.
  const sim = new Simulation(MONDE);
  const petite = (id: string) => sim.faces.find((f) => f.pairId === id && f.kind === 'small')!;
  for (const [id, taille, etape] of [
    ['descente-jardin', encrier.size, 'sort du jardin'],
    ['ascension-1', encrier.size * 4, 'peut passer par la porte du village'],
    ['ascension-2', encrier.size * 4, 'peut passer par celle de la terrasse'],
  ] as const) {
    const f = petite(id);
    check(
      `l’encrier ${etape} — ${taille.toFixed(2)} dans une porte de ${f.width.toFixed(2)}`,
      taille <= f.width * 0.9 && taille <= f.height * 0.96,
      `${taille.toFixed(2)} / ${(f.width * 0.9).toFixed(2)}`,
    );
  }

  // LA PROPRIETE QUI SAUVE LA QUETE, et elle n’etait pas voulue au depart :
  // l’encrier suit toujours son porteur, donc sa taille finale ne depend que de
  // la taille du joueur en haut — jamais du chemin suivi. Or on peut monter du
  // village au belvedere de deux facons (porte puis escalier, ou l’inverse).
  // Les deux donnent exactement le meme encrier, et le socle du sommet accepte
  // donc l’un comme l’autre. Sans cela, un joueur ayant pris le bon chemin dans
  // le mauvais ordre se serait retrouve avec un objet inutilisable.
  // L'encrier suit son porteur : parti du jardin à ×1, il arrive au village à
  // ×4, donc quatre fois plus gros.
  const arrivee = encrier.size * 4;
  check(
    'au sommet, le socle attend exactement la taille du voyage entier',
    Math.abs(arrivee - socle.size) <= socle.size * 0.12,
    `arrive a ${arrivee.toFixed(2)}, attendu ${socle.size}`,
  );
  check(
    'un objet qui n’aurait pas fait le trajet n’y entre pas',
    Math.abs(arrivee / 4 - socle.size) > socle.size * 0.12,
    `${(arrivee / 4).toFixed(2)} refuse`,
  );
  // Et il reste soulevable la-haut : un objet qu’on lache et qu’on ne peut plus
  // reprendre, au bout de tout le voyage, serait la pire fin possible.
  // On ressort du jardin à ×4 — c'est la traversée qui nous a regrandis en même
  // temps qu'elle a grossi l'encrier. Une première version comparait sa taille
  // à la portée d'un joueur de 1,80 et criait au piège : elle avait oublié que
  // le porteur avait grandi avec ce qu'il porte.
  check(
    'et il reste soulevable au village, où l’on est redevenu géant',
    arrivee <= PORTEE(4),
    `${arrivee.toFixed(2)} <= ${PORTEE(4).toFixed(2)}`,
  );

  // LA BRAISE, ET L'OPPOSITION QUI FAIT TOUT LE PROPOS.
  //
  // Sur la côte rouge on est GRAND, donc on en revient avec du MENU ; dans le
  // jardin on est PETIT, donc on en revient avec du GROS. Les deux socles
  // plantés sur la place depuis la première minute annonçaient cet écart avant
  // qu'on ait fait un seul voyage.
  check(
    'la braise se soulève à ×4, là où on la trouve',
    braise.size <= PORTEE(4),
    `${braise.size} <= ${PORTEE(4).toFixed(2)}`,
  );
  const braiseAuVillage = braise.size / 4;
  check(
    'et elle arrive menue au village, exactement à la taille du petit socle',
    Math.abs(braiseAuVillage - socleRouge.size) <= socleRouge.size * 0.12,
    `${braiseAuVillage} pour un socle de ${socleRouge.size}`,
  );
  check(
    'les deux couleurs ne peuvent pas se tromper de socle',
    Math.abs(arrivee - socleRouge.size) > socleRouge.size * 0.12 &&
      Math.abs(braiseAuVillage - socle.size) > socle.size * 0.12,
    `${arrivee} vs ${socleRouge.size}, ${braiseAuVillage} vs ${socle.size}`,
  );

  // La porte vierge fait mur tant que le pinceau ne l’a pas dessinee. C’est le
  // meme refus qu’une porte trop etroite : le joueur n’a pas a connaitre la
  // difference, il voit seulement qu’il ne passe pas.
  const vierge = new Simulation(MONDE);
  vierge.portesFermees.add('ascension-2');
  vierge.player.scaleLevel = 1;
  vierge.player.position = { x: 0, y: 30.3, z: 62 };
  const barre = walkTo(vierge, [0, 30, 80], 60 * 20, { stopOnEvent: true });
  check(
    'une porte non dessinee ne se traverse pas',
    barre.refused?.reason === 'scelle' && vierge.player.scaleLevel === 1,
    `${barre.refused?.reason ?? 'aucun refus'}`,
  );

  // Et une fois tracee, elle s’ouvre — sans quoi le jeu serait sans issue.
  vierge.portesFermees.delete('ascension-2');
  const ouverte = walkTo(vierge, [0, 30, 80], 60 * 20, { stopOnEvent: true });
  check(
    'une fois dessinee, elle laisse passer',
    ouverte.traversed?.pairId === 'ascension-2',
    `${ouverte.traversed?.pairId ?? 'rien'}`,
  );

  // L’eperon : du sommet du monde jusqu’a la pointe de l’Aiguille, et retour.
  const geant = new Simulation(MONDE);
  geant.player.scaleLevel = 2;
  geant.player.position = { x: 0, y: 121, z: 210 };
  walkTo(geant, [0, 114.2, 0], 60 * 60);
  settle(geant, 60);
  check(
    'a ×16, l’eperon mene du belvedere a la pointe de l’Aiguille',
    Math.hypot(geant.player.position.x, geant.player.position.z) < 20 &&
      geant.player.position.y > 112,
    pos(geant),
  );

  walkTo(geant, [0, 120, 220], 60 * 60);
  settle(geant, 60);
  check(
    'et l’on en revient — on ne reste pas perche la-haut',
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
{
  console.log('\n— Les régions tiennent dans leur parcelle —');
  for (const m of [TERRASSE, BELVEDERE, JARDIN]) {
    const fautes = verifierParcelle(m);
    check(`${m.region.name} ne déborde pas`, fautes.length === 0, fautes[0] ?? '');
  }
}

console.log(failures === 0 ? '\nTout passe.\n' : `\n${failures} vérification(s) en échec.\n`);
process.exit(failures === 0 ? 0 : 1);
