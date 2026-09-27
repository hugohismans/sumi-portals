/**
 * LA PESANTEUR PAR AXE — vérifications. Appelées par `__check.ts`, sous Node.
 *
 * La plus forte est la COVARIANCE : un niveau tourné d'un bloc — chaque boîte,
 * chaque porte, le départ — et un joueur dont le haut a tourné avec lui
 * doivent, sous les MÊMES ordres, faire le même trajet au bit près. C'est ce
 * qui garantit qu'on marche sur un mur exactement comme sur un sol : mêmes
 * marches, mêmes linteaux, mêmes rattrapages, mêmes portes.
 */
import { EYE_FRACTION, PLAYER_HEIGHT, PLAYER_RADIUS, TICK_DT, scaleOfLevel } from './constants.js';
import { Simulation } from './simulation.js';
import {
  HAUTS,
  REPERES,
  VueTournee,
  boiteVersLocal,
  boiteVersMonde,
  hautDe,
  vecteurHaut,
  versLocal,
  versMonde,
  type Haut,
  type Repere,
} from './pesanteur.js';
import { REFLEXION_X, mulMat, quartDeTour, eulerVersMat, vec3, yawToForward, type Mat3, type Vec3 } from './math.js';
import { buildFaces, matriceDuHaut, rotationDeTraversee } from './portals.js';
import type { Check } from './__pilote.js';
import type { BoxDef, InputCommand, LevelDef, PortalFaceDef, TickEvents } from './types.js';
import type { Aabb } from './world.js';
import { World } from './world.js';
import { LEVEL_01 } from '../levels/level01.js';
import { MONDE } from '../levels/monde.js';
import { DESCENTE } from '../levels/descente.js';
import { MONTEE } from '../levels/montee.js';

const f3 = (v: Vec3): string => `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
function ordre(o: Partial<InputCommand>): InputCommand {
  return { forward: 0, strafe: 0, jump: false, sprint: false, interact: false, throwIt: false, yaw: 0, pitch: 0, ...o };
}
const boite = (b: BoxDef): Aabb => ({ minX: b.min[0], minY: b.min[1], minZ: b.min[2], maxX: b.max[0], maxY: b.max[1], maxZ: b.max[2] });
const neuve = (): Aabb => ({ minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 });
const ecart = (a: Mat3, b: Mat3): number => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
/** Au contact d'une face : jamais dedans, et pas plus loin qu'un cheveu de virgule. */
const auContact = (v: number, face: number): boolean => v >= face && v - face < 1e-12;

// ─── Un niveau tourné d'un bloc ───────────────────────────────────────────────
const tupleVers = (r: Repere, t: [number, number, number]): [number, number, number] => {
  const w = versMonde(r, vec3(t[0], t[1], t[2]), vec3());
  return [w.x, w.y, w.z];
};
/** Une face en repère EXACT (normale et haut explicites), tournée si `r`. */
const faceExacte = (d: PortalFaceDef, r: Repere | null): PortalFaceDef => {
  const n0 = d.normale !== undefined ? vecteurHaut(d.normale) : yawToForward(d.yaw);
  const v0 = vecteurHaut(d.haut ?? '+y');
  const n = r ? versMonde(r, n0, vec3()) : n0;
  const v = r ? versMonde(r, v0, vec3()) : v0;
  return { position: r ? tupleVers(r, d.position) : d.position, yaw: d.yaw, normale: hautDe(n, 1e-9)!, haut: hautDe(v, 1e-9)! };
};
/**
 * Le niveau tourné par le repère de `h` (null : non tourné, mais ses faces
 * passent tout de même en repère exact, pour comparer à calcul égal). On
 * retire ce qui n'a pas de sens pour la comparaison : les pièces, les
 * logements, les seuils, les verrous.
 */
const tourner = (l: LevelDef, h: Haut | null): LevelDef => {
  const r = h ? REPERES[h] : null;
  return {
    ...l,
    boxes: l.boxes.map((b) => {
      if (!r) return b;
      const w = boiteVersMonde(r, boite(b), neuve());
      return { ...b, min: [w.minX, w.minY, w.minZ], max: [w.maxX, w.maxY, w.maxZ] };
    }),
    spawn: r ? tupleVers(r, l.spawn) : l.spawn,
    spawnHaut: h ?? undefined,
    portals: l.portals.map((p) => ({ ...p, condition: undefined, dessinee: undefined, big: faceExacte(p.big, r), small: faceExacte(p.small, r) })),
    carryables: [],
    sockets: [],
    seuils: undefined,
    veilleurs: undefined,
    rappel: undefined,
    canevas: undefined,
    goal: { position: r ? tupleVers(r, l.goal.position) : l.goal.position, radius: l.goal.radius },
  };
};
const aleatoire = (graine: number) => () => {
  graine = (graine * 1664525 + 1013904223) >>> 0;
  return graine / 4294967296;
};

// ─── La salle d'essai ─────────────────────────────────────────────────────────
/**
 * Une boîte de 40 × 30 × 40. Une porte DEBOUT au milieu, face au sud ; sa
 * jumelle COUCHÉE contre le mur ouest, son haut vers +x, face au sud. On
 * franchit la première en marchant vers le nord, et le mur ouest est le sol.
 */
export const SALLE_BASCULE = (lacetA = 0, condition?: string): LevelDef => {
  const B = (min: [number, number, number], max: [number, number, number]): BoxDef => ({ min, max });
  return {
    name: 'bascule',
    spawn: [0, 0, 5],
    spawnYaw: Math.PI,
    boxes: [
      B([-21, -1, -21], [21, 0, 21]), // sol
      B([-21, 30, -21], [21, 31, 21]), // plafond
      B([-21, 0, -21], [-20, 30, 21]), // mur ouest : le futur sol
      B([20, 0, -21], [21, 30, 21]), // mur est
      B([-21, 0, -21], [21, 30, -20]), // mur nord
      B([-21, 0, 20], [21, 30, 21]), // mur sud
      B([-20, 5, 6], [-19.6, 15, 7]), // une marche de 40 cm plantée dans le mur ouest
      B([-20, 20, -12], [-17, 23, -9]), // un bloc sur le mur ouest, à peindre
    ],
    portals: [
      {
        id: 'bascule',
        colorBig: 0,
        colorSmall: 0,
        plane: true,
        ...(condition ? { condition } : {}),
        big: { position: [0, 0.05, -2], yaw: lacetA },
        small: { position: [-19.95, 10, 0], yaw: 0, haut: '+x', normale: '+z' },
      },
    ],
    carryables: [
      { id: 'cube', position: [1.5, 0, 4], size: 0.6 },
      // Posé sur le mur ouest dès le départ : position = centre de sa face d'appui.
      { id: 'mural', position: [-20, 18, 12], size: 0.8, haut: '+x' },
      { id: 'gros', position: [4, 0, 4], size: 0.9 },
    ],
    goal: { position: [0, -100, 0], radius: 0.1 },
  };
};
/** La base de la caméra, R_haut · Ry(yaw + π) · Rx(pitch) : ce que main.ts pose. */
const baseDeVue = (h: Haut | undefined, yaw: number, pitch: number, gauchere = false): Mat3 => {
  const cy = Math.cos(yaw + Math.PI);
  const sy = Math.sin(yaw + Math.PI);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  // Gauchère : main.ts nie l'échelle latérale de la caméra (`camera.scale.x`).
  const S: Mat3 = [gauchere ? -1 : 1, 0, 0, 0, 1, 0, 0, 0, 1];
  return mulMat(matriceDuHaut(h), mulMat([cy, 0, sy, 0, 1, 0, -sy, 0, cy], mulMat([1, 0, 0, 0, cp, -sp, 0, sp, cp], S)));
};
/** Le lacet qui, dans le repère `h`, regarde vers la direction du monde `w`. */
const lacetVers = (h: Haut, w: Vec3): number => {
  const l = versLocal(REPERES[h], w, vec3());
  return Math.atan2(l.x, l.z);
};
const prendre = (sim: Simulation, yaw: number): TickEvents => {
  const t: TickEvents = {};
  for (let i = 0; i < 3; i++) Object.assign(t, sim.step(ordre({ yaw, interact: i === 1 }), TICK_DT));
  return t;
};
const passer = (sim: Simulation, yaw: number, ticks = 360): boolean => {
  for (let t = 0; t < ticks; t++) if (sim.step(ordre({ forward: 1, yaw }), TICK_DT).traversed) return true;
  return false;
};
const attendre = (sim: Simulation, ticks: number, yaw = sim.player.yaw): void => {
  for (let i = 0; i < ticks; i++) sim.step(ordre({ yaw }), TICK_DT);
};

export const verifierPesanteur = (check: Check): void => {
  // ===========================================================================
  console.log('\n— La pesanteur : les repères sont exacts —');
  {
    let exacts = true;
    let memesTouches = true;
    const w = new World(LEVEL_01);
    for (const h of HAUTS) {
      const r = REPERES[h];
      const m = matriceDuHaut(h);
      const det =
        m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
      if (det !== 1 || hautDe(vec3(m[1], m[4], m[7])) !== h) exacts = false;
      for (const b of LEVEL_01.boxes) {
        const a = boite(b);
        const aller = boiteVersMonde(r, boiteVersLocal(r, a, neuve()), neuve());
        if (aller.minX !== a.minX || aller.maxX !== a.maxX || aller.minY !== a.minY || aller.maxY !== a.maxY || aller.minZ !== a.minZ || aller.maxZ !== a.maxZ) exacts = false;
      }
      // La vue tournée trouve exactement les boîtes que trouve le monde.
      const vue = new VueTournee(w, r);
      const q = { minX: -3, minY: -1, minZ: -3, maxX: 5, maxY: 2, maxZ: 5 };
      const brut = w.query(q, []).length;
      const vu = vue.query(boiteVersLocal(r, q, neuve()), []).length;
      if (brut !== vu) memesTouches = false;
    }
    check('six repères, six rotations exactes, et l’aller-retour d’une boîte ne perd pas un bit', exacts);
    check('le monde vu de biais touche exactement les mêmes boîtes', memesTouches);
  }

  // ===========================================================================
  console.log('\n— La physique ne sait pas où est le bas : même trajet au bit près, dans cinq repères —');
  {
    const niveaux: [string, LevelDef][] = [['level01', LEVEL_01], ['monde', MONDE], ['descente', DESCENTE], ['montee', MONTEE]];
    let pas = 0;
    let rattrapes = 0;
    for (const [nom, lvl] of niveaux) {
      const base = tourner(lvl, null);
      for (const h of HAUTS) {
        if (h === '+y') continue;
        const rot = tourner(lvl, h);
        const r = REPERES[h];
        let faute = '';
        // Deux marches au hasard, et une troisième qui part HORS du monde : elle
        // tombe, se fait rattraper au départ, et rejoue le rattrapage en repère.
        for (let graine = 1; graine <= 3 && !faute; graine++) {
          const a = new Simulation(base);
          const b = new Simulation(rot);
          const alea = aleatoire(graine * 7919 + nom.length);
          const palier = Math.floor(alea() * 5) - 2;
          const dehors = graine === 3 ? 5000 : 0;
          const dx = (alea() - 0.5) * 30 + dehors;
          const dz = (alea() - 0.5) * 30;
          a.player.position = vec3(lvl.spawn[0] + dx, lvl.spawn[1] + 2, lvl.spawn[2] + dz);
          a.player.scaleLevel = palier;
          b.player.position = versMonde(r, a.player.position, vec3());
          b.player.scaleLevel = palier;
          let cmd = ordre({});
          for (let t = 0; t < 1500; t++) {
            if (t % 25 === 0) {
              cmd = ordre({
                forward: alea() < 0.8 ? 1 : alea() < 0.5 ? -1 : 0,
                strafe: alea() < 0.3 ? (alea() < 0.5 ? -1 : 1) : 0,
                jump: alea() < 0.35,
                sprint: alea() < 0.4,
                yaw: cmd.yaw + (alea() - 0.5) * 2.5,
                pitch: (alea() - 0.5) * 1.2,
              });
            }
            const ea = a.step(cmd, TICK_DT);
            const eb = b.step(cmd, TICK_DT);
            pas++;
            if (ea.rattrape) rattrapes++;
            const lp = versLocal(r, b.player.position, vec3());
            const lv = versLocal(r, b.player.velocity, vec3());
            const pa = a.player.position;
            const va = a.player.velocity;
            const hb = hautDe(versLocal(r, vecteurHaut(b.player.haut ?? '+y'), vec3()), 1e-9);
            const pareil =
              lp.x === pa.x && lp.y === pa.y && lp.z === pa.z &&
              lv.x === va.x && lv.y === va.y && lv.z === va.z &&
              b.player.yaw === a.player.yaw && b.player.scaleLevel === a.player.scaleLevel &&
              b.player.grounded === a.player.grounded && hb === (a.player.haut ?? '+y') &&
              !!ea.traversed === !!eb.traversed && !!ea.rattrape === !!eb.rattrape && !!ea.refused === !!eb.refused;
            if (!pareil) {
              faute = `graine ${graine}, pas ${t} : ${f3(pa)} contre ${f3(lp)}`;
              break;
            }
          }
        }
        check(`${nom}, haut ${h} : mêmes ordres, même trajet, au bit près`, faute === '', faute);
      }
    }
    check('la comparaison a vraiment couru, rattrapages compris', pas === 4 * 5 * 3 * 1500 && rattrapes >= 20, `${pas} pas, ${rattrapes} rattrapages`);
  }

  // ===========================================================================
  console.log('\n— Le chemin prévu du premier niveau, au plafond et sur les quatre murs —');
  {
    const trajet = (h: Haut): { pas: Vec3[]; evts: string[] } => {
      const sim = new Simulation(tourner(LEVEL_01, h === '+y' ? null : h));
      const r = REPERES[h];
      sim.player.position = versMonde(r, vec3(...LEVEL_01.spawn), vec3());
      const pas: Vec3[] = [];
      const evts: string[] = [];
      const vers = (cible: [number, number, number], ticks: number, stop = false): void => {
        for (let i = 0; i < ticks; i++) {
          const p = versLocal(r, sim.player.position, vec3());
          const dx = cible[0] - p.x;
          const dz = cible[2] - p.z;
          const e = sim.step(ordre({ forward: Math.hypot(dx, dz) > scaleOfLevel(sim.player.scaleLevel) * 0.5 ? 1 : 0, yaw: Math.atan2(dx, dz) }), TICK_DT);
          pas.push(versLocal(r, sim.player.position, vec3()));
          if (e.traversed) evts.push(`porte:${e.traversed.newLevel}`);
          if (e.reachedGoal) evts.push('but');
          if (stop && e.traversed) break;
        }
      };
      vers([16, 0, 4], 360);
      vers([15, -3, 0], 300);
      vers([24, -3, 0], 360, true);
      vers([-18, 3.3, -10], 1200);
      return { pas, evts };
    };
    const ref = trajet('+y');
    check('debout : on grandit par la porte indigo et l’on atteint le but', ref.evts.join() === 'porte:1,but', ref.evts.join());
    for (const h of HAUTS) {
      if (h === '+y') continue;
      const t = trajet(h);
      let faute = -1;
      for (let i = 0; i < ref.pas.length && faute < 0; i++) {
        const a = ref.pas[i];
        const b = t.pas[i];
        if (!b || a.x !== b.x || a.y !== b.y || a.z !== b.z) faute = i;
      }
      check(`haut ${h} : la même partie, porte comprise, au bit près`, faute < 0 && t.evts.join() === ref.evts.join(), faute >= 0 ? `pas ${faute}` : t.evts.join());
    }
  }

  // ===========================================================================
  console.log('\n— La porte qui bascule : le mur devient le sol —');
  {
    const sim = new Simulation(SALLE_BASCULE());
    check('on part debout', sim.player.haut === undefined);
    sim.player.position = vec3(0, 0, 4);
    let transport: { avant: Mat3; rot: Mat3 } | null = null;
    for (let t = 0; t < 360 && !transport; t++) {
      const avant = baseDeVue(sim.player.haut, sim.player.yaw, 0.3);
      if (sim.step(ordre({ forward: 1, yaw: Math.PI, pitch: 0.3 }), TICK_DT).traversed) {
        transport = { avant, rot: rotationDeTraversee(sim.faces.find((x) => x.kind === 'big')!) };
      }
    }
    check('on franchit la porte debout, et l’on en ressort le haut vers +x', transport !== null && sim.player.haut === '+x', String(sim.player.haut));
    if (transport) {
      const apres = baseDeVue(sim.player.haut, sim.player.yaw, sim.player.pitch);
      const d = ecart(apres, mulMat(transport.rot, transport.avant));
      check('la vue d’après est la vue d’avant transportée : aucun roulis à rattraper', d < 1e-9, `écart ${d}`);
      const h = vecteurHaut(sim.player.haut!);
      check('la droite de l’écran reste perpendiculaire au haut', Math.abs(apres[0] * h.x + apres[3] * h.y + apres[6] * h.z) < 1e-12);
    }
    attendre(sim, 90);
    check('posé sur le mur ouest, au contact exact', sim.player.grounded && sim.player.position.x === -20, f3(sim.player.position));
    const oeil = sim.eyePosition();
    check('l’œil est à 1,656 m du mur, le long de +x', Math.abs(oeil.x - (-20 + PLAYER_HEIGHT * EYE_FRACTION)) < 1e-12, f3(oeil));

    const yaw0 = sim.player.yaw;
    const z0 = sim.player.position.z;
    for (let i = 0; i < 120; i++) sim.step(ordre({ forward: 1, yaw: yaw0 }), TICK_DT);
    check('on marche sur le mur, les pieds y restent', sim.player.grounded && sim.player.position.x === -20 && sim.player.position.z > z0 + 5, f3(sim.player.position));

    let loin = -20;
    sim.step(ordre({ jump: true, yaw: yaw0 }), TICK_DT);
    for (let i = 0; i < 90; i++) {
      sim.step(ordre({ yaw: yaw0 }), TICK_DT);
      loin = Math.max(loin, sim.player.position.x);
    }
    const ref = new Simulation(SALLE_BASCULE());
    ref.player.position = vec3(5, 0, 10);
    attendre(ref, 30, 0);
    ref.step(ordre({ jump: true }), TICK_DT);
    let hRef = 0;
    for (let i = 0; i < 90; i++) {
      ref.step(ordre({}), TICK_DT);
      hRef = Math.max(hRef, ref.player.position.y);
    }
    check('un saut décolle du mur de la hauteur d’un saut au sol, et l’on y retombe', Math.abs(loin + 20 - hRef) < 1e-9 && sim.player.grounded && sim.player.position.x === -20, `${loin + 20} contre ${hRef}`);

    // L'ancien sol est un MUR pour qui marche sur le mur.
    for (let i = 0; i < 300; i++) sim.step(ordre({ forward: 1, sprint: true, yaw: lacetVers('+x', vec3(0, -1, 0)) }), TICK_DT);
    check('l’ancien sol fait mur : on s’y arrête sans le traverser', sim.player.position.y >= PLAYER_RADIUS - 1e-12 && sim.player.position.y < PLAYER_RADIUS + 0.01 && sim.player.position.x === -20, f3(sim.player.position));

    sim.player.position = vec3(-20, 10, 3);
    sim.player.velocity = vec3(0, 0, 0);
    attendre(sim, 30, yaw0);
    let monte = false;
    for (let i = 0; i < 180; i++) {
      sim.step(ordre({ forward: 1, yaw: lacetVers('+x', vec3(0, 0, 1)) }), TICK_DT);
      if (sim.player.position.x === -19.6 && sim.player.grounded) monte = true;
    }
    check('une marche de 40 cm plantée dans le mur se monte en marchant', monte, f3(sim.player.position));
  }

  // ===========================================================================
  console.log('\n— À toutes les tailles, le mur tient —');
  for (let palier = -3; palier <= 1; palier++) {
    const sim = new Simulation(SALLE_BASCULE());
    const s = scaleOfLevel(palier);
    sim.player.haut = '+x';
    sim.player.scaleLevel = palier;
    sim.player.position = vec3(-20 + 0.5 * s, 12, -10 + s);
    attendre(sim, 120, 0);
    const pose = sim.player.grounded && sim.player.position.x === -20;
    const p0 = { ...sim.player.position };
    for (let i = 0; i < 60; i++) sim.step(ordre({ forward: 1, sprint: true, yaw: 0.4 }), TICK_DT);
    const w = versMonde(REPERES['+x'], yawToForward(0.4), vec3());
    const d = vec3(sim.player.position.x - p0.x, sim.player.position.y - p0.y, sim.player.position.z - p0.z);
    const le = d.x * w.x + d.y * w.y + d.z * w.z;
    check(`×${s} : posé sur le mur, on y marche droit devant soi`, pose && sim.player.position.x === -20 && le > 2 * s, `${f3(sim.player.position)} avancée ${le.toFixed(3)}`);
  }

  // ===========================================================================
  console.log('\n— L’aller-retour rend debout —');
  for (const lacet of [0, Math.PI / 2, 0.3]) {
    const sim = new Simulation(SALLE_BASCULE(lacet));
    const A = sim.faces.find((x) => x.kind === 'big')!;
    const n = A.normal;
    sim.player.position = vec3(A.position.x + n.x * 0.3, 0, A.position.z + n.z * 0.3);
    const aller = passer(sim, Math.atan2(-n.x, -n.z), 120);
    const hautLa = sim.player.haut;
    const retour = passer(sim, sim.player.yaw + Math.PI, 120);
    check(`porte debout au lacet ${lacet.toFixed(2)} : +x en passant, +y en revenant`, aller && retour && hautLa === '+x' && sim.player.haut === undefined, `${aller} ${retour} ${hautLa} ${sim.player.haut}`);
  }
  {
    const faces = buildFaces(SALLE_BASCULE(0.3).portals);
    const I = mulMat(rotationDeTraversee(faces[1]), rotationDeTraversee(faces[0]));
    check('traverser puis retraverser : la rotation composée est l’identité', ecart(I, [1, 0, 0, 0, 1, 0, 0, 0, 1]) < 1e-15, `écart ${ecart(I, [1, 0, 0, 0, 1, 0, 0, 0, 1])}`);
  }

  // ===========================================================================
  console.log('\n— Un miroir qui bascule : la main ET le haut —');
  {
    const lvl = SALLE_BASCULE();
    lvl.portals[0].miroir = true;
    const sim = new Simulation(lvl);
    const cube = sim.carryables.items.find((c) => c.id === 'cube')!;
    sim.player.position = vec3(1.5, 0, 6);
    attendre(sim, 20, Math.PI);
    prendre(sim, Math.PI);
    cube.rotation.x = 0.3;
    cube.rotation.y = 0.7;
    cube.rotation.z = -0.2;
    const R0 = eulerVersMat(cube.rotation);
    sim.player.position = vec3(0, 0, 4);
    let transport: { avant: Mat3; rot: Mat3 } | null = null;
    for (let t = 0; t < 360 && !transport; t++) {
      const avant = baseDeVue(sim.player.haut, sim.player.yaw, 0.3, sim.player.gauchere);
      if (sim.step(ordre({ forward: 1, strafe: 0.3, yaw: Math.PI + 0.2, pitch: 0.3 }), TICK_DT).traversed) {
        transport = { avant, rot: rotationDeTraversee(sim.faces.find((x) => x.kind === 'big')!) };
      }
    }
    check('par un miroir couché, on ressort le haut +x ET gaucher', transport !== null && sim.player.haut === '+x' && sim.player.gauchere);
    if (transport) {
      const apres = baseDeVue(sim.player.haut, sim.player.yaw, sim.player.pitch, sim.player.gauchere);
      const d = ecart(apres, mulMat(transport.rot, transport.avant));
      check('la vue d’après est la vue d’avant réfléchie et basculée, sans raccord', d < 1e-9, `écart ${d}`);
      const attendue = mulMat(mulMat(transport.rot, R0), REFLEXION_X);
      const d2 = ecart(eulerVersMat(cube.rotation), attendue);
      check('la pièce tenue tourne comme la porte, main retournée comprise (M·R·D)', d2 < 1e-9, `écart ${d2}`);
    }
  }

  // ===========================================================================
  console.log('\n— Le rattrapage suit la pesanteur —');
  {
    const lvl = SALLE_BASCULE();
    lvl.boxes[2] = { min: [-21, 0, -21], max: [-20, 30, 10] };
    lvl.boxes.push({ min: [-21, 0, 14], max: [-20, 30, 21] });
    const sim = new Simulation(lvl);
    sim.player.haut = '+x';
    sim.player.position = vec3(-20, 12, 5);
    attendre(sim, 60, 0);
    const sud = lacetVers('+x', vec3(0, 0, 1));
    let rattrape = false;
    let minX = 0;
    for (let i = 0; i < 480 && !rattrape; i++) {
      rattrape = !!sim.step(ordre({ forward: 1, yaw: sud }), TICK_DT).rattrape;
      minX = Math.min(minX, sim.player.position.x);
    }
    check('par un trou du mur, on tombe le long de −x jusqu’au seuil, et l’on est rattrapé', rattrape && minX < -40, `minX ${minX.toFixed(1)}`);
    check('reposé sur le mur, le haut toujours +x', sim.player.haut === '+x' && sim.player.position.x === -20, `${sim.player.haut} ${f3(sim.player.position)}`);
    const depart = new Simulation({ ...SALLE_BASCULE(), spawn: [-20, 12, -5], spawnHaut: '+x' });
    const h0 = depart.player.haut;
    depart.player.haut = undefined;
    depart.reset();
    check('`spawnHaut` : on naît le haut qu’il dit, et on le retrouve à la remise à zéro', h0 === '+x' && depart.player.haut === '+x');
  }

  // ===========================================================================
  console.log('\n— Ce qu’on porte, ce qu’on pose, ce qu’on lance —');
  {
    const sim = new Simulation(SALLE_BASCULE());
    const cube = sim.carryables.items.find((c) => c.id === 'cube')!;
    sim.player.position = vec3(1.5, 0, 6);
    attendre(sim, 20, Math.PI);
    prendre(sim, Math.PI);
    check('on prend le cube, debout', cube.held);
    sim.player.position = vec3(0, 0, 4);
    const passe = passer(sim, Math.PI);
    attendre(sim, 60);
    const r = REPERES['+x'];
    const c = versLocal(r, vec3(cube.position.x, cube.position.y + cube.size / 2, cube.position.z), vec3());
    const p = versLocal(r, sim.player.position, vec3());
    const fwd = yawToForward(sim.player.yaw);
    const devant = (c.x - p.x) * fwd.x + (c.z - p.z) * fwd.z;
    const travers = (c.x - p.x) * fwd.z - (c.z - p.z) * fwd.x;
    check('passé la porte, le cube tenu est DEVANT, dans le repère du mur', passe && devant > 0.5 && Math.abs(travers) < 1e-9, `devant ${devant.toFixed(3)}`);
    check('et à hauteur de poitrine, le long du nouveau haut', c.y - p.y > 0.3 && c.y - p.y < 1.8, `${(c.y - p.y).toFixed(3)}`);

    // LES QUARTS DE TOUR « À VOLONTÉ » SE DONNENT AUTOUR DE NOTRE HAUT.
    const R0 = eulerVersMat(cube.rotation);
    sim.step(ordre({ yaw: sim.player.yaw, quartLacet: 1 }), TICK_DT);
    const R1 = eulerVersMat(cube.rotation);
    check('un quart de tour à gauche-droite tourne la pièce autour de +x, notre haut', ecart(R1, mulMat(quartDeTour('x', 1), R0)) < 1e-9, `écart ${ecart(R1, mulMat(quartDeTour('x', 1), R0))}`);

    sim.step(ordre({ yaw: sim.player.yaw, pitch: -0.3, interact: true }), TICK_DT);
    attendre(sim, 90);
    check('posé sur le mur, le cube prend le haut +x', !cube.held && cube.haut === '+x', `${cube.held} ${cube.haut}`);
    check('et repose AU CONTACT du mur, sans y entrer d’un ulp', cube.grounded && auContact(cube.position.x - cube.size / 2, -20), `${cube.position.x - cube.size / 2}`);
    prendre(sim, sim.player.yaw);
    check('on le reprend sur le mur', cube.held);
    sim.step(ordre({ yaw: sim.player.yaw, pitch: 0.2, throwIt: true }), TICK_DT);
    let maxX = -Infinity;
    for (let i = 0; i < 240; i++) {
      sim.step(ordre({ yaw: sim.player.yaw }), TICK_DT);
      maxX = Math.max(maxX, cube.position.x);
    }
    check('lancé, il s’élève le long de +x, puis retombe sur le mur', maxX > -19 && cube.grounded && auContact(cube.position.x - cube.size / 2, -20), `max ${maxX.toFixed(2)} fin ${f3(cube.position)}`);

    // Posé par le niveau sur le mur : il y reste, au contact.
    const mural = sim.carryables.items.find((x) => x.id === 'mural')!;
    check('une pièce que le niveau pose sur le mur (`haut: +x`) y reste, au contact exact', mural.haut === '+x' && mural.grounded && auContact(mural.position.x - mural.size / 2, -20) && Math.abs(mural.position.y + mural.size / 2 - 18) < 1e-12, f3(mural.position));

    const sim2 = new Simulation(SALLE_BASCULE());
    const c2 = sim2.carryables.items.find((x) => x.id === 'cube')!;
    sim2.player.position = vec3(1.5, 0, 6);
    attendre(sim2, 20, Math.PI);
    prendre(sim2, Math.PI);
    sim2.player.position = vec3(0, 0, 1.5);
    attendre(sim2, 10, Math.PI);
    sim2.step(ordre({ yaw: Math.PI, pitch: 0.1, throwIt: true }), TICK_DT);
    let hautVu: Haut | undefined;
    for (let i = 0; i < 240; i++) {
      sim2.step(ordre({ yaw: Math.PI }), TICK_DT);
      if (c2.haut) hautVu = c2.haut;
    }
    check('lancé debout par la porte, il ressort de la couchée le haut +x, et tombe sur le mur', hautVu === '+x' && c2.grounded && auContact(c2.position.x - c2.size / 2, -20), `${hautVu} ${f3(c2.position)}`);
  }

  // ===========================================================================
  console.log('\n— Peindre depuis un mur, et une porte couchée qui retient —');
  {
    const sim = new Simulation(SALLE_BASCULE());
    sim.player.haut = '+x';
    sim.player.position = vec3(-20, 21.5, -3);
    attendre(sim, 30, 0);
    // Le bloc à peindre est au nord, sur le mur : on le regarde droit devant.
    sim.player.yaw = lacetVers('+x', vec3(0, 0, -1));
    const oeil = sim.eyePosition();
    const cible = vec3(-18.5, 21.5, -10.5);
    const loc = versLocal(REPERES['+x'], vec3(cible.x - oeil.x, cible.y - oeil.y, cible.z - oeil.z), vec3());
    sim.player.yaw = Math.atan2(loc.x, loc.z);
    sim.player.pitch = Math.atan2(loc.y, Math.hypot(loc.x, loc.z));
    const vise = sim.viserPeinture();
    check('le rayon du pinceau part du regard TOURNÉ : on vise le bloc planté sur le mur', vise !== null && vise.index === 7, JSON.stringify(vise));

    // Une porte couchée scellée : la pièce tenue bute contre elle.
    const scel = new Simulation(SALLE_BASCULE(0, 'jamais'));
    const gros = scel.carryables.items.find((x) => x.id === 'gros')!;
    gros.held = true;
    scel.player.haut = '+x';
    scel.player.position = vec3(-20, 10, 4);
    attendre(scel, 30, 0);
    const nord = lacetVers('+x', vec3(0, 0, -1));
    let retenue: TickEvents['pieceRetenue'];
    let refus: TickEvents['refused'];
    for (let i = 0; i < 240; i++) {
      const e = scel.step(ordre({ forward: 1, yaw: nord }), TICK_DT);
      retenue ??= e.pieceRetenue;
      refus ??= e.refused;
    }
    check('une porte couchée scellée retient la pièce tenue, et le dit', retenue?.raison === 'scellee' && scel.player.haut === '+x', JSON.stringify(retenue ?? refus ?? null));
  }

  // ===========================================================================
  console.log('\n— Le dos d’une porte couchée, et une trappe au sol —');
  {
    const sim = new Simulation(SALLE_BASCULE());
    sim.player.haut = '+x';
    sim.player.position = vec3(-20, 10, -3);
    attendre(sim, 30, 0);
    let trav = false;
    let dits = 0;
    let zMax = -Infinity;
    for (let i = 0; i < 180; i++) {
      const e = sim.step(ordre({ forward: 1, yaw: lacetVers('+x', vec3(0, 0, 1)) }), TICK_DT);
      trav ||= !!e.traversed;
      if (e.dos) dits++;
      zMax = Math.max(zMax, sim.player.position.z);
    }
    check('le dos d’une porte couchée arrête au ras du plan qui marche sur le mur, et le dit une fois', !trav && dits === 1 && Math.abs(zMax + PLAYER_RADIUS) < 1e-9, `${trav} ${dits} ${zMax}`);

    const B = (min: [number, number, number], max: [number, number, number]): BoxDef => ({ min, max });
    const trappe = new Simulation({
      name: 'trappe',
      spawn: [0, 0, 5],
      spawnYaw: 0,
      boxes: [
        B([-10, -1, -10], [-1, 0, 10]), B([1, -1, -10], [10, 0, 10]), B([-1, -1, -10], [1, 0, -1.5]), B([-1, -1, 1.5], [1, 0, 10]),
        B([-10, -40, -10], [10, -39, 10]),
        B([40, -1, -10], [60, 0, 10]),
        B([40, 20, -10], [49, 21, 10]), B([51, 20, -10], [60, 21, 10]), B([49, 20, -10], [51, 21, -1.5]), B([49, 20, 1.5], [51, 21, 10]),
      ],
      portals: [{
        id: 'trappe', colorBig: 0, colorSmall: 0, plane: true,
        big: { position: [0, -0.02, -1.4], yaw: 0, normale: '+y', haut: '+z' },
        small: { position: [50, 20.02, -1.4], yaw: 0, normale: '-y', haut: '+z' },
      }],
      goal: { position: [0, -100, 0], radius: 0.1 },
    });
    trappe.player.position = vec3(0, 3, 0);
    let passe = false;
    let vAvant = 0;
    for (let i = 0; i < 240 && !passe; i++) {
      vAvant = trappe.player.velocity.y;
      passe = !!trappe.step(ordre({}), TICK_DT).traversed;
    }
    check('une trappe au sol se franchit en tombant ; sa jumelle au plafond garde le haut', passe && trappe.player.haut === undefined && trappe.player.position.x > 45, f3(trappe.player.position));
    check('et la vitesse de chute est conservée', trappe.player.velocity.y < -1 && Math.abs(trappe.player.velocity.y - vAvant) < 26 * TICK_DT + 1e-9, `${vAvant} → ${trappe.player.velocity.y}`);
    attendre(trappe, 240);
    check('on atterrit dans la salle d’arrivée', trappe.player.grounded && trappe.player.position.y === 0, f3(trappe.player.position));
  }

  // ===========================================================================
  console.log('\n— Les portes du jeu sont prêtes pour qui marche aux murs —');
  {
    // Une porte debout plantée de biais ne saurait pas où mettre un haut
    // couché : elle refuserait (`'pesanteur'`). Aucune ne l'est.
    const niveaux: [string, LevelDef][] = [['level01', LEVEL_01], ['monde', MONDE], ['descente', DESCENTE], ['montee', MONTEE]];
    const biais: string[] = [];
    for (const [nom, l] of niveaux) {
      for (const p of l.portals) {
        for (const d of [p.big, p.small]) {
          const k = d.yaw / (Math.PI / 2);
          if (d.normale === undefined && Math.abs(k - Math.round(k)) > 1e-9) biais.push(`${nom}:${p.id}`);
        }
      }
    }
    check('toutes les faces sont plantées au quart de tour exact', biais.length === 0, biais.slice(0, 4).join(' '));
    let refuse = false;
    try {
      buildFaces([{ id: 'x', colorBig: 0, colorSmall: 0, big: { position: [0, 0, 0], yaw: 0.3, haut: '+x' }, small: { position: [0, 0, 0], yaw: 0 } }]);
    } catch {
      refuse = true;
    }
    check('une face couchée plantée de biais est refusée à la construction', refuse);
  }
};
