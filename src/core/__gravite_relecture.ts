/**
 * LA RELECTURE DE LA PESANTEUR — ce qu'elle a trouvé, gardé ici pour de bon.
 * Appelées par `__check.ts`, sous Node.
 *
 * La covariance de `__gravite.ts` prouve qu'un monde tourné d'un bloc se joue
 * comme le monde droit. Elle ne voit pas ce qui ne tourne PAS avec lui : un
 * bout de moteur qui remet x et z à leur valeur d'avant, comme si l'horizontale
 * était toujours x-z. Chaque bloc ci-dessous est un défaut reproduit par la
 * relecture, sous la forme où il se jouait, et qui ne doit pas revenir.
 */
import { TICK_DT } from './constants.js';
import { Simulation } from './simulation.js';
import { REPERES, versLocal, type Haut } from './pesanteur.js';
import { vec3, type Vec3 } from './math.js';
import type { Check } from './__pilote.js';
import type { InputCommand, LevelDef, PortalFaceDef } from './types.js';

function ordre(o: Partial<InputCommand>): InputCommand {
  return { forward: 0, strafe: 0, jump: false, sprint: false, interact: false, throwIt: false, yaw: 0, pitch: 0, ...o };
}
/** Le lacet qui regarde vers `w` pour un joueur dont le haut est `h`. */
const lacetVers = (h: Haut, w: Vec3): number => {
  const l = versLocal(REPERES[h], w, vec3());
  return Math.atan2(l.x, l.z);
};
const f3 = (v: Vec3): string => `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
const SANS_BUT = { position: [0, -100, 0] as [number, number, number], radius: 0.1 };

/** Une salle close de 80 m, haute de 60 : rien n'en sort sans une faute. */
const SALLE_CLOSE = [
  { min: [-41, -1, -41], max: [41, 0, 41] },
  { min: [-41, 60, -41], max: [41, 61, 41] },
  { min: [-41, 0, -41], max: [-40, 60, 41] },
  { min: [40, 0, -41], max: [41, 60, 41] },
  { min: [-41, 0, -41], max: [41, 60, -40] },
  { min: [-41, 0, 40], max: [41, 60, 41] },
] as LevelDef['boxes'];

export const verifierRelecturePesanteur = (check: Check): void => {
  console.log('\n— La relecture de la pesanteur : ce qui ne tournait pas avec le monde —');

  // ─── 1. CE QU'ON PORTE BUTE CONTRE UNE PORTE, SUR UN MUR AUSSI ──────────
  //
  // Le pas refusé remettait x et z à leur valeur d'avant. Sur le mur ouest
  // (haut +x), x est la VERTICALE : on marchait le long de y à travers une
  // porte que la pièce tenue ne passait pas, et l'on flottait, immobile, dès
  // que la pièce touchait une porte scellée pendant une chute.
  {
    const couche = (condition?: string): LevelDef => ({
      name: 'bute-couchee',
      spawn: [-20, 0, 0],
      spawnYaw: 0,
      spawnHaut: '+x',
      boxes: [{ min: [-21, -30, -30], max: [-20, 30, 30] }],
      portals: [
        {
          id: 'p',
          colorBig: 0,
          colorSmall: 0,
          plane: true,
          smallWidth: 1.0,
          ...(condition ? { condition } : {}),
          big: { position: [-19.95, 5, 0], yaw: 0, haut: '+x', normale: '-y' },
          small: { position: [-19.95, -20, 10], yaw: 0, haut: '+x', normale: '+y' },
        },
      ],
      carryables: [{ id: 'gros', position: [-20, 0, 0], size: 0.95, haut: '+x' }],
      goal: SANS_BUT,
    });
    const lacet = lacetVers('+x', vec3(0, 1, 0));
    let sim = new Simulation(couche());
    sim.carryables.items[0].held = true;
    sim.player.position = vec3(-20, 1, 0);
    let passe = false;
    let retenue = 0;
    for (let i = 0; i < 30; i++) sim.step(ordre({ yaw: lacet }), TICK_DT);
    for (let i = 0; i < 300; i++) {
      const e = sim.step(ordre({ forward: 1, yaw: lacet }), TICK_DT);
      if (e.traversed) passe = true;
      if (e.pieceRetenue) retenue++;
    }
    check(
      'sur un mur, la pièce trop grosse arrête le porteur devant la porte',
      !passe && retenue > 0 && sim.player.position.y < 5,
      `passé ${passe}, retenue ${retenue}, ${f3(sim.player.position)}`,
    );

    sim = new Simulation(couche('jamais'));
    sim.carryables.items[0].held = true;
    sim.carryables.items[0].size = 0.9;
    sim.player.position = vec3(-18.5, 2.6, 0);
    for (let i = 0; i < 120; i++) sim.step(ordre({ yaw: lacet }), TICK_DT);
    check(
      'sur un mur, une pièce qui frôle une porte scellée ne retient pas la chute',
      sim.player.grounded && Math.abs(sim.player.position.x + 20) < 1e-9,
      `hauteur ${(sim.player.position.x + 20).toFixed(4)}, au sol ${sim.player.grounded}`,
    );
  }

  // ─── 2. L'IMAGE D'UN RATTRAPAGE NE RACONTE AUCUN PAS ────────────────────
  //
  // Le segment d'œil de cette image-là court du fond du vide jusqu'au point
  // d'appui : il traversait une trappe au plafond, et l'on ressortait en
  // l'air, haut +z, à l'instant d'être reposé debout. Et le pas refusé d'une
  // pièce qui bute renvoyait au point de chute — une seconde chute, et le bon
  // appui perdu.
  {
    const sim = new Simulation({
      name: 'rattrapage-trappe',
      spawn: [0, 10, 0],
      spawnYaw: Math.PI / 2,
      boxes: [
        { min: [-6, 9, -6], max: [6, 10, 6] },
        { min: [40, -1, -10], max: [60, 0, 10] },
      ],
      portals: [
        {
          id: 'trappe',
          colorBig: 0,
          colorSmall: 0,
          plane: true,
          smallWidth: 3.5,
          smallHeight: 4,
          big: { position: [4.75, 8.95, -2], yaw: 0, normale: '-y', haut: '+z' },
          small: { position: [50, 0.05, 0], yaw: 0 },
        },
      ],
      goal: SANS_BUT,
    });
    for (let i = 0; i < 60; i++) sim.step(ordre({ yaw: Math.PI / 2 }), TICK_DT);
    let rattrape = false;
    let aussiPasse = false;
    for (let t = 0; t < 600 && !rattrape; t++) {
      const e = sim.step(ordre({ forward: sim.player.position.x < 7 ? 1 : 0, yaw: Math.PI / 2 }), TICK_DT);
      if (e.rattrape) {
        rattrape = true;
        aussiPasse = !!e.traversed;
      }
    }
    check(
      'rattrapé sous une trappe : reposé debout, sans la franchir en chemin',
      rattrape && !aussiPasse && sim.player.haut === undefined && sim.player.position.y === 10,
      `rattrapé ${rattrape}, passé ${aussiPasse}, haut ${sim.player.haut ?? '+y'}, ${f3(sim.player.position)}`,
    );
  }
  for (const haut of ['+y', '+x'] as const) {
    const debout = haut === '+y';
    const sim = new Simulation({
      name: 'rattrapage-bute',
      spawn: debout ? [0, 0, -8] : [-20, 0, -8],
      spawnYaw: 0,
      ...(debout ? {} : { spawnHaut: '+x' as const }),
      boxes: [debout ? { min: [-5, -1, -10], max: [5, 0, 10] } : { min: [-21, -5, -10], max: [-20, 5, 10] }],
      portals: [
        {
          id: 'p',
          colorBig: 0,
          colorSmall: 0,
          plane: true,
          condition: 'jamais',
          big: debout
            ? { position: [0, 0.05, 5], yaw: Math.PI }
            : { position: [-19.95, 0, 5], yaw: 0, haut: '+x', normale: '-z' },
          small: debout
            ? { position: [0, 0.05, -9], yaw: 0 }
            : { position: [-19.95, 0, -9], yaw: 0, haut: '+x', normale: '+z' },
        },
      ],
      carryables: [{ id: 'k', position: debout ? [0, 0, 0] : [-20, 0, 0], size: 0.9, ...(debout ? {} : { haut: '+x' as const }) }],
      goal: SANS_BUT,
    });
    const lacet = debout ? 0 : lacetVers('+x', vec3(0, 0, 1));
    sim.carryables.items[0].held = true;
    sim.player.position = debout ? vec3(0, 0, 2.9) : vec3(-20, 0, 2.9);
    for (let i = 0; i < 60; i++) sim.step(ordre({ yaw: lacet }), TICK_DT);
    sim.player.position = debout ? vec3(30, 0, 30) : vec3(-20, 30, 30);
    sim.player.velocity = vec3(0, 0, 0);
    let rattrapages = 0;
    for (let i = 0; i < 800; i++) if (sim.step(ordre({ yaw: lacet }), TICK_DT).rattrape) rattrapages++;
    check(
      `haut ${haut} : rattrapé devant une porte scellée, pièce en main, on y reste`,
      rattrapages === 1 && sim.player.position.z === 2.9,
      `${rattrapages} rattrapages, ${f3(sim.player.position)}`,
    );
  }

  // ─── 3. « IL FAUDRAIT RAPETISSER » — À QUI TIENT DEBOUT CONTRE LE MUR ────
  {
    const sim = new Simulation({
      name: 'joueur-passe',
      spawn: [-20, 0, 0],
      spawnYaw: 0,
      spawnHaut: '+x',
      boxes: [{ min: [-21, -30, -30], max: [-20, 30, 30] }],
      portals: [
        {
          id: 'p',
          colorBig: 0,
          colorSmall: 0,
          plane: true,
          smallWidth: 1.0,
          big: { position: [-19.95, 0, 5], yaw: 0, haut: '+x', normale: '-z' },
          small: { position: [-19.95, 0, -20], yaw: 0, haut: '+x', normale: '+z' },
        },
      ],
      carryables: [{ id: 'gros', position: [-20, 0, 0], size: 0.95, haut: '+x' }],
      goal: SANS_BUT,
    });
    sim.carryables.items[0].held = true;
    sim.player.position = vec3(-20, 0, 1);
    const lacet = lacetVers('+x', vec3(0, 0, 1));
    let ev: { joueurPasse: boolean } | null = null;
    for (let i = 0; i < 200 && !ev; i++) ev = sim.step(ordre({ forward: 1, yaw: lacet }), TICK_DT).pieceRetenue ?? null;
    check('sur un mur, la pièce retenue dit que le porteur, lui, passerait', ev?.joueurPasse === true, JSON.stringify(ev));
  }

  // ─── 5 & 6. UNE PIÈCE RESSORT DANS LA SALLE, PAS DANS SON SOL NI SON MUR ─
  //
  // Une bille qui glisse par une petite face ressortait de la grande quinze
  // centimètres dans le plancher ; une caisse lancée vers une jumelle plaquée
  // contre un mur ressortait à moitié dedans. Au premier pas, la dalle ou le
  // mur les résolvait par l'autre bout — hors de la salle, puis rattrapées.
  const dansLaSalle = (p: Vec3): boolean =>
    Math.abs(p.x) <= 40 && Math.abs(p.z) <= 40 && p.y >= -1e-9 && p.y <= 60;
  for (const [nom, petite, piece] of [
    ['petite face debout', { position: [20, 0.05, 0], yaw: 0 }, { id: 'k', position: [20, 0, 1.0], size: 0.07 }],
    [
      'petite face couchée contre le mur ouest',
      { position: [-39.95, 20, 0], yaw: 0, haut: '+x', normale: '+z' },
      { id: 'k', position: [-40, 20, 1.0], size: 0.07, haut: '+x' },
    ],
  ] as const) {
    const sim = new Simulation({
      name: 'petite-piece',
      spawn: [0, 0, 30],
      spawnYaw: 0,
      boxes: SALLE_CLOSE,
      portals: [{ id: 'A', colorBig: 0, colorSmall: 0, big: { position: [0, 0.05, -2], yaw: 0 }, small: petite as PortalFaceDef }],
      carryables: [piece] as LevelDef['carryables'],
      goal: SANS_BUT,
    });
    const c = sim.carryables.items[0];
    for (let i = 0; i < 30; i++) sim.step(ordre({}), TICK_DT);
    c.velocity.z = -6;
    let arrivee = false;
    let sortie = false;
    let rattrapee = false;
    for (let i = 0; i < 300 && !rattrapee; i++) {
      const s0 = c.size;
      const e = sim.step(ordre({}), TICK_DT);
      if (c.size !== s0) arrivee = true;
      if (!dansLaSalle(c.position)) sortie = true;
      if (e.pieceRattrapee) rattrapee = true;
    }
    check(
      `${nom} : la bille agrandie ressort au ras du sol, et reste dans la salle`,
      arrivee && !sortie && !rattrapee,
      `arrivée ${arrivee}, sortie ${sortie}, rattrapée ${rattrapee}, ${f3(c.position)}`,
    );
  }
  for (const [nom, jumelle] of [
    ['debout', { position: [0, 0.05, -39.95], yaw: 0 }],
    ['à l’envers', { position: [0, 59.95, -39.95], yaw: 0, haut: '-y', normale: '+z' }],
    ['couchée', { position: [-39.95, 20, -39.95], yaw: 0, haut: '+x', normale: '+z' }],
  ] as const) {
    const sim = new Simulation({
      name: 'jumelle-plaquee',
      spawn: [10, 0, 15],
      spawnYaw: 0,
      boxes: SALLE_CLOSE,
      portals: [
        { id: 'C', colorBig: 0, colorSmall: 0, plane: true, big: { position: [10, 0.05, 20], yaw: Math.PI }, small: jumelle as PortalFaceDef },
      ],
      carryables: [{ id: 'c3', position: [10, 0, 16], size: 0.6 }],
      goal: SANS_BUT,
    });
    const c = sim.carryables.items[0];
    for (let i = 0; i < 20; i++) sim.step(ordre({}), TICK_DT);
    for (let i = 0; i < 3; i++) sim.step(ordre({ interact: i === 1 }), TICK_DT);
    sim.player.position = vec3(10, 0, 17);
    sim.step(ordre({}), TICK_DT);
    sim.step(ordre({ pitch: -0.2, throwIt: true }), TICK_DT);
    let arrivee = false;
    let sortie = false;
    let rattrapee = false;
    for (let i = 0; i < 300 && !rattrapee; i++) {
      const z0 = c.position.z;
      const e = sim.step(ordre({}), TICK_DT);
      if (Math.abs(c.position.z - z0) > 5) arrivee = true;
      if (!dansLaSalle(c.position)) sortie = true;
      if (e.pieceRattrapee) rattrapee = true;
    }
    check(
      `jumelle ${nom} plaquée contre un mur : la caisse lancée ressort devant, dans la salle`,
      arrivee && !sortie && !rattrapee,
      `arrivée ${arrivee}, sortie ${sortie}, rattrapée ${rattrapee}, ${f3(c.position)}`,
    );
  }
};
