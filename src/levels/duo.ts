import type { BoxDef, CarryableDef, LevelDef, SocketDef } from '../core/types.js';

/**
 * LA CLAIRIÈRE — l'aventure à deux.
 *
 * Le but n'est pas d'atteindre une sortie. **Le but est de redevenir de la même
 * taille.** On commence géant et minuscule, on se voit sans pouvoir se
 * rejoindre, et tout le niveau consiste à converger.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI ÇA NE PEUT PAS SE JOUER SEUL
 *
 * Une énigme conçue pour une personne ne devient pas coopérative parce qu'on
 * est deux : elle devient juste plus facile. Ici, chacun tient la porte de
 * l'autre.
 *
 *   Le géant seul peut gravir la colonne — ses marches font 3, infranchissables
 *   pour quelqu'un qui enjambe 22 centimètres. Le logement qu'il y garnit
 *   descelle la porte DU MINUSCULE.
 *
 *   Le minuscule seul peut se glisser sous la dalle — la fente fait 50
 *   centimètres, et le géant en mesure sept mètres. Le logement qu'il y garnit
 *   descelle la porte DU GÉANT.
 *
 * Aucun des deux n'avance d'un pas sans l'autre, et aucun des deux ne peut
 * faire le travail de l'autre. Ce n'est pas une contrainte artificielle : c'est
 * la conséquence directe de leurs tailles.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LES DEUX JOUEURS VOIENT EXACTEMENT LE MÊME MONDE. Seuls le point de départ
 * et la taille initiale changent — tout le reste est partagé, sans quoi ils ne
 * pourraient pas se parler de ce qu'ils voient.
 *
 * CALIBRAGE, à ne pas modifier à vue :
 *   ×4    7,20 de haut · enjambe 3,60 · saute 5,18
 *   ×1    1,80 de haut · enjambe 0,90 · saute 1,30
 *   ×1/4  0,45 de haut · enjambe 0,22 · saute 0,32
 */

const box = (
  min: [number, number, number],
  max: [number, number, number],
  ink = 0,
  opts: { ghost?: boolean; outline?: boolean } = {},
): BoxDef => ({ min, max, ink, region: 'clairiere', ...opts });

/** Hauteur du parvis central. Tout ce qui s'y pose part de là. */
const PARVIS = 0.35;

// ─── Le parvis, et les deux dalles de la retrouvaille ────────────────────────
//
// Elles sont volontairement RAPPROCHÉES — 2,2 d'écart, soit trois fois le
// diamètre d'un joueur à taille normale. On doit finir côte à côte, pas aux
// deux bouts d'une esplanade : c'est le seul moment du niveau où les deux
// joueurs se touchent presque.
export const DALLE_GEANT: [number, number, number] = [-1.95, PARVIS, 0];
export const DALLE_MINUSCULE: [number, number, number] = [1.95, PARVIS, 0];
export const RAYON_DALLE = 1.15;

const parvis = (): BoxDef[] => [
  box([-14, -0.6, -14], [14, PARVIS, 14], 1, { outline: false }),
  // Un liseré qui MORD sur le parvis de 12 cm au lieu d'affleurer : deux faces
  // dans le même plan se disputent la profondeur et grésillent.
  box([-14.5, -0.6, -14.5], [14.5, PARVIS - 0.12, 14.5], 2, { outline: false }),

  // Les deux dalles. Elles ne se ressemblent pas tout à fait — l'une porte un
  // trait, l'autre deux — pour qu'on sache laquelle est la sienne sans qu'on
  // l'explique.
  box([-2.8, PARVIS, -0.9], [-1.1, PARVIS + 0.16, 0.9], 3),
  box([-2.4, PARVIS + 0.16, -0.45], [-1.5, PARVIS + 0.22, 0.45], 2),
  box([1.1, PARVIS, -0.9], [2.8, PARVIS + 0.16, 0.9], 3),
  box([1.5, PARVIS + 0.16, -0.5], [2.4, PARVIS + 0.22, -0.12], 2),
  box([1.5, PARVIS + 0.16, 0.12], [2.4, PARVIS + 0.22, 0.5], 2),
];

// ─── À l'ouest : la colonne du géant ─────────────────────────────────────────
//
// Trois marches de 3. Le géant les enjambe (3,60) ; le minuscule enjambe 22
// centimètres et n'en gravira jamais aucune, quoi qu'il tente. Le refus est
// physique, pas scripté — c'est ce qui le rend lisible.
const colonne = (): BoxDef[] => {
  const out: BoxDef[] = [];
  const x = -26;
  const paliers: [number, number][] = [
    [0, 3.0],
    [3.0, 6.05],
    [6.05, 9.1],
  ];
  let largeur = 7.5;
  for (const [y0, y1] of paliers) {
    out.push(box([x - largeur, -0.5, -largeur], [x + largeur, y1, largeur], 2));
    // Chaque gradin se rétrécit ET dépasse un peu du précédent : sans ce
    // décalage, les faces verticales de trois gradins tomberaient dans le même
    // plan.
    largeur -= 1.9;
    void y0;
  }
  // Le sommet, où se pose le logement. Légèrement en creux, pour qu'on voie de
  // loin qu'il attend quelque chose.
  out.push(box([x - 3.4, 9.1, -3.4], [x + 3.4, 9.45, 3.4], 1));
  return out;
};

// ─── À l'est : la fente du minuscule ─────────────────────────────────────────
//
// Une dalle posée sur deux murets, laissant un jour de 50 centimètres. Le
// minuscule (45 cm) passe dessous en se sachant à l'aise ; le géant (7,20 m)
// n'a même pas à essayer. Ouverte côté parvis seulement : on voit où ça mène.
const fente = (): BoxDef[] => {
  const out: BoxDef[] = [];
  const x0 = 17;
  const x1 = 32;
  // 80 centimètres de jour, pas 50. Le minuscule en mesure 45 : à 50, il lui
  // restait cinq centimètres au-dessus de la tête et le moindre ressaut du sol
  // l'éjectait sur le toit. Une contrainte doit être franche, jamais limite.
  // Un joueur à taille normale (1,80) n'entre toujours pas : c'est tout ce
  // qu'on demande à cette dalle.
  out.push(box([x0, 0.8, -6.2], [x1, 1.8, 6.2], 2)); // la dalle
  out.push(box([x0 - 0.1, -0.4, -6.5], [x1 + 0.4, 0.8, -6.0], 1)); // muret sud
  out.push(box([x0 - 0.1, -0.4, 6.0], [x1 + 0.4, 0.8, 6.5], 1)); // muret nord
  out.push(box([x1, -0.4, -6.2], [x1 + 0.4, 0.92, 6.2], 1)); // fond, côté est

  // Un repère à hauteur de géant, planté à côté : il ne peut pas entrer, mais
  // il doit pouvoir DÉSIGNER l'endroit. Sans ça, il ne saurait pas quoi dire à
  // l'autre.
  out.push(box([x0 - 3.2, -0.4, 7.4], [x0 - 2.0, 8.6, 8.6], 3));
  out.push(box([x0 - 3.9, 8.6, 6.7], [x0 - 1.3, 9.3, 9.3], 2));
  return out;
};

const decor = (): BoxDef[] => [
  // Le sol. Une seule dalle, donc aucune couture à encrer.
  box([-80, -8, -80], [80, 0, 80], 0, { outline: false }),
  ...parvis(),
  ...colonne(),
  ...fente(),
];

export const CARRYABLES_DUO: CarryableDef[] = [
  // La pierre du géant. À 2,4 d'arête, elle est très au-dessus de ce qu'un
  // joueur de 45 centimètres peut soulever : il déclenchera `tooHeavy`, et
  // comprendra en une seconde que ce n'est pas pour lui.
  { id: 'pierre-lourde', position: [-34, 0, 9], size: 2.4, ink: 2 },
  // Le galet du minuscule. Posé bien en vue sur le parvis, à l'entrée de la
  // fente : le géant le voit aussi, et c'est important — il doit savoir que
  // l'autre a de quoi travailler.
  { id: 'galet', position: [15.9, 0, 2.2], size: 0.28, ink: 3 },
];

export const SOCKETS_DUO: SocketDef[] = [
  // Au sommet de la colonne. Garni, il descelle la porte DU MINUSCULE.
  { id: 'socle-colonne', position: [-26, 9.45, 0], size: 2.4, ink: 3 },
  // Au fond de la fente. Garni, il descelle la porte DU GÉANT.
  { id: 'socle-fissure', position: [28.5, 0, 0], size: 0.28, ink: 3 },
];

/**
 * Le monde, identique pour les deux joueurs.
 * Seuls le départ et la taille initiale diffèrent — voir `construireDuo`.
 */
const COMMUN: Omit<LevelDef, 'spawn' | 'spawnYaw'> = {
  name: 'La clairière',
  regions: [
    {
      // Une clairière de fin de journée : des verts éteints, une lumière basse.
      // Ni le village ni les hauteurs — c'est un lieu à part, et ça se voit
      // avant même d'y avoir fait trois pas.
      name: 'clairiere',
      min: [-90, -20, -90] as [number, number, number],
      max: [90, 60, 90] as [number, number, number],
      paper: '#e6e4d2',
      colors: ['#dfe0c9', '#c2c9a8', '#8a9a76', '#c05a3c'] as [string, string, string, string],
      ink: '#1d221a',
    },
  ],
  boxes: decor(),
  carryables: CARRYABLES_DUO,
  sockets: SOCKETS_DUO,

  portals: [
    {
      // LA PORTE DU GÉANT. Scellée tant que le minuscule n'a pas garni la
      // fente. Il la voit d'emblée, il la trouve fermée, et il comprend que la
      // clé n'est pas de son côté du monde.
      id: 'porte-du-geant',
      colorBig: 0xc8492e,
      colorSmall: 0x2f4b7c,
      condition: 'socle-fissure',
      smallHeight: 2.8,
      smallWidth: 1.9,
      // Grande face à l'ouest : 11,2 de haut, le géant (7,20) y entre debout.
      big: { position: [-13, PARVIS, 0], yaw: -Math.PI / 2 },
      // Petite face au bord du parvis : il en ressort à taille normale, à trois
      // pas de sa dalle.
      small: { position: [-5.6, PARVIS, 0], yaw: Math.PI / 2 },
    },
    {
      // LA PORTE DU MINUSCULE. Scellée tant que le géant n'a pas garni la
      // colonne. Taillée pour lui : 70 centimètres de haut, ce qui en fait une
      // fissure invisible pour qui mesure sept mètres.
      id: 'porte-du-minuscule',
      colorBig: 0xc8492e,
      colorSmall: 0x2f4b7c,
      condition: 'socle-colonne',
      smallHeight: 0.7,
      smallWidth: 0.48,
      // HORS DU PARVIS, et c'est le détail qui a failli couler le niveau : le
      // parvis forme une bordure de 35 centimètres, et le minuscule en enjambe
      // 22. Posée dessus, sa porte lui aurait été à jamais inaccessible — il
      // aurait tourné autour sans comprendre. Elle est donc au ras du sol, du
      // côté d'où il arrive.
      small: { position: [15, 0, 0], yaw: Math.PI / 2 },
      // Il ressort par une face de 2,8 — soit, à taille normale, une porte tout
      // à fait ordinaire. La même ouverture, et deux mondes.
      big: { position: [5.6, PARVIS, 0], yaw: -Math.PI / 2 },
    },
  ],

  // Rien à « atteindre » : la victoire est la retrouvaille, et elle se juge à
  // deux. L'objectif est donc repoussé hors du monde pour ne jamais tomber.
  goal: { position: [0, -9000, 0] as [number, number, number], radius: 1 },
};

export type RoleDuo = 'geant' | 'minuscule';

/**
 * Le niveau, vu par l'un ou par l'autre.
 *
 * Le rôle se déduit du nom du salon (les deux identifiants triés) : le premier
 * est le géant. Les deux clients trouvent donc le même partage sans avoir à se
 * le dire — même principe que l'appariement lui-même.
 */
export const construireDuo = (role: RoleDuo): LevelDef => ({
  ...COMMUN,
  // Ils se font face de part et d'autre du parvis, à quatorze mètres. C'est
  // court, et c'est voulu : la première image du niveau doit être une tour qui
  // regarde une fourmi, et une fourmi qui lève les yeux.
  spawn: role === 'geant' ? [-7, PARVIS, 7] : [3.2, PARVIS, -3.2],
  spawnYaw: role === 'geant' ? (Math.PI * 3) / 4 : -Math.PI / 4,
  spawnScale: role === 'geant' ? 1 : -1,
});

/** Le géant est celui dont l'identifiant vient en premier dans le salon. */
export const roleDansSalon = (salon: string, uid: string): RoleDuo =>
  salon.split('~')[0] === uid ? 'geant' : 'minuscule';
