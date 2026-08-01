import type { BoxDef, LevelDef, PortalPairDef } from '../core/types.js';

/**
 * LE RÊVE — des salles qui se fabriquent toutes seules.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE PRINCIPE : ON ENGENDRE DE L'ESPACE, PAS DES ÉNIGMES.
 *
 * Fabriquer des énigmes au hasard donne des énigmes fades ou insolubles —
 * c'est l'écueil le plus connu du genre. Engendrer un dédale de salles à
 * traverser, en revanche, est simple et robuste, et c'est exactement ce qu'on
 * demande à un rêve : l'égarement, pas la réflexion.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CE QUI REND LE LIEU INQUIÉTANT N'EST PAS UN EFFET, C'EST UNE CONTRAINTE DU
 * MOTEUR RETOURNÉE À NOTRE AVANTAGE.
 *
 * Dans ce jeu, un portail change TOUJOURS la taille — il n'existe pas de porte
 * neutre. Une salle sur deux se traverse donc à ×1, l'autre à ×1/4, sans qu'on
 * ait rien programmé pour ça. Et comme l'anneau compte un nombre IMPAIR de
 * salles, l'alternance ne se referme pas : on revient à son point de départ,
 * on reconnaît la pièce jusqu'au moindre pilier — et l'on n'a plus la même
 * taille. C'est la logique exacte d'un rêve, et elle sort gratuitement de la
 * mécanique de base.
 *
 * Les salles sont posées très loin les unes des autres. On aurait pu les faire
 * se chevaucher — à travers un portail, on n'en voit jamais deux à la fois —
 * mais les murs, eux, se percuteraient pour de bon : l'invisibilité ne
 * dispense pas de la physique.
 */

/**
 * Générateur à graine. Deux fois la même graine, deux fois le même rêve —
 * c'est ce qui permet de partager une adresse, et de revenir sur un cauchemar
 * qu'on a aimé.
 */
const alea = (graine: number): (() => number) => {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Salles de l'anneau. Impair, et c'est tout l'effet — voir plus haut. */
const SALLES = 11;
/** Écart entre deux salles. Assez grand pour qu'aucune n'en touche une autre. */
const PAS = 400;
/** Hauteur sous plafond : il faut y loger une grande face de 11,2. */
const PLAFOND = 12.5;
const MUR = 2;
/** Largeur de l'embrasure. Le portail se tient dedans, pas dans le mur. */
const PORTE = 8;

const box = (
  min: [number, number, number],
  max: [number, number, number],
  ink = 0,
  opts: { outline?: boolean } = {},
): BoxDef => ({ min, max, ink, region: 'reve', ...opts });

/**
 * Une salle : sol, plafond, quatre murs, et deux embrasures — celle par
 * laquelle on entre, au sud, celle par laquelle on sort, au nord.
 *
 * Les murs sont posés en trois morceaux de part et d'autre de l'embrasure
 * plutôt qu'en un seul percé : un trou dans une boîte n'existe pas, et
 * superposer deux boîtes pour simuler un vide ferait grésiller leurs faces
 * communes.
 */
const salle = (
  cx: number,
  cz: number,
  demiX: number,
  demiZ: number,
  rng: () => number,
): BoxDef[] => {
  const out: BoxDef[] = [];
  const x0 = cx - demiX;
  const x1 = cx + demiX;
  const z0 = cz - demiZ;
  const z1 = cz + demiZ;

  out.push(box([x0 - MUR, -3, z0 - MUR], [x1 + MUR, 0, z1 + MUR], 0, { outline: false }));
  out.push(box([x0 - MUR, PLAFOND, z0 - MUR], [x1 + MUR, PLAFOND + MUR, z1 + MUR], 2, { outline: false }));

  // Murs est et ouest, pleins.
  out.push(box([x0 - MUR, 0, z0], [x0, PLAFOND, z1], 1));
  out.push(box([x1, 0, z0], [x1 + MUR, PLAFOND, z1], 1));

  // Murs sud et nord, percés d'une embrasure centrale.
  for (const [za, zb] of [
    [z0 - MUR, z0],
    [z1, z1 + MUR],
  ] as const) {
    out.push(box([x0 - MUR, 0, za], [-PORTE / 2 + cx, PLAFOND, zb], 1));
    out.push(box([PORTE / 2 + cx, 0, za], [x1 + MUR, PLAFOND, zb], 1));
    // Linteau au-dessus de l'embrasure. Il déborde sur les jambages EN LARGEUR
    // (30 cm) mais aussi EN PROFONDEUR (25 cm de chaque côté du mur), et c'est
    // le second débord qui manquait : sans lui, ses faces avant et arrière
    // tombaient exactement dans le plan du mur, et chaque embrasure du rêve
    // grésillait pile à hauteur d'œil. Quatre-vingt-huit fois par rêve.
    out.push(box([-PORTE / 2 + cx - 0.3, 11.6, za - 0.25], [PORTE / 2 + cx + 0.3, PLAFOND, zb + 0.25], 2));
  }

  // Le mobilier du vide : quelques piliers, et rien d'autre. Un lieu vide n'est
  // pas un lieu sans rien — c'est un lieu où le peu qui reste n'explique pas
  // pourquoi il est là.
  const piliers = 2 + Math.floor(rng() * 4);
  for (let i = 0; i < piliers; i++) {
    const px = cx + (rng() - 0.5) * (demiX * 1.5);
    const pz = cz + (rng() - 0.5) * (demiZ * 1.5);
    const r = 0.8 + rng() * 1.4;
    out.push(box([px - r, 0, pz - r], [px + r, PLAFOND, pz + r], 2));
  }

  return out;
};

/**
 * Un rêve entier.
 *
 * `graine` fixe tout : la taille des salles, la place des piliers, le sens de
 * l'alternance. La même graine rend exactement le même rêve.
 */
export const reve = (graine: number): LevelDef => {
  const rng = alea(graine);
  const boxes: BoxDef[] = [];
  const portals: PortalPairDef[] = [];

  const centres: [number, number][] = [];
  const demis: [number, number][] = [];

  for (let i = 0; i < SALLES; i++) {
    const demiX = 16 + rng() * 12;
    const demiZ = 16 + rng() * 12;
    const cx = i * PAS;
    const cz = 0;
    centres.push([cx, cz]);
    demis.push([demiX, demiZ]);
    boxes.push(...salle(cx, cz, demiX, demiZ, rng));
  }

  for (let i = 0; i < SALLES; i++) {
    const j = (i + 1) % SALLES;
    const [cx] = centres[i];
    const [, demiZ] = demis[i];
    const [nx] = centres[j];
    const [, nDemiZ] = demis[j];

    // Alternance des faces : une porte sur deux fait rapetisser, l'autre
    // regrandir. C'est ce qui borne l'échelle sans qu'on ait rien à surveiller.
    const grandeDabord = i % 2 === 0;

    // La face de sortie se tient dans l'embrasure NORD de la salle i, celle
    // d'entrée dans l'embrasure SUD de la salle j.
    const sortie: [number, number, number] = [cx, 0, demiZ + MUR / 2];
    const entree: [number, number, number] = [nx, 0, -(nDemiZ + MUR / 2)];

    portals.push({
      id: `songe-${i}`,
      colorBig: 0x8a6b9a,
      colorSmall: 0x4a6b7c,
      smallHeight: 2.8,
      smallWidth: 1.9,
      // LES DEUX LACETS NE SONT PAS LES MÊMES, et c'est ce qui a d'abord cloché.
      // La face de SORTIE regarde vers l'intérieur de la salle (normale -Z,
      // lacet π) : c'est de là que vient le joueur, et un portail ne se
      // déclenche qu'abordé par sa face avant. Posée dans l'autre sens, on la
      // traversait par le dos et il ne se passait rien.
      // La face d'ENTRÉE, elle, regarde vers l'intérieur de la salle suivante
      // (normale +Z, lacet 0), pour qu'on y soit déposé en marchant vers le nord.
      ...(grandeDabord
        ? {
            big: { position: sortie, yaw: Math.PI },
            small: { position: entree, yaw: 0 },
          }
        : {
            small: { position: sortie, yaw: Math.PI },
            big: { position: entree, yaw: 0 },
          }),
    });
  }

  return {
    name: `Rêve nº${graine}`,
    spawn: [0, 0.3, 0],
    spawnYaw: Math.PI,
    regions: [
      {
        name: 'reve',
        min: [-500, -50, -500],
        max: [SALLES * PAS + 500, 200, 500],
        // Un blanc sale qui tire sur le vert, et des murs à peine plus sombres
        // que le sol. On ne distingue presque rien des angles : c'est ce qui
        // rend un lieu vide désagréable, bien plus que l'obscurité.
        paper: '#dcdcd0',
        colors: ['#d2d2c4', '#c6c7b6', '#9fa392', '#8a6b9a'],
        ink: '#26261f',
      },
    ],
    boxes,
    portals,
    goal: { position: [0, -9000, 0], radius: 1 },
    hints: [
      {
        position: [0, 0, 0],
        radius: 20,
        text: 'Onze salles, et elles se referment en anneau. Reviens à celle-ci — tu la reconnaîtras, mais tu n’auras plus la même taille.',
      },
    ],
  };
};
