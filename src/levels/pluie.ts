import { scaleOfLevel } from '../core/constants.js';
import type { LevelDef } from '../core/types.js';
import { PLUIE } from './salles/pluie.js';

/**
 * LA COUR DE PLUIE, SEULE.
 *
 * Elle était un détour de la descente, depuis le lavoir — une porte au fond du
 * bassin, une cour qu'on traverse à quarante-cinq centimètres, et l'on revenait
 * par où l'on était venu. Elle ne demandait rien et ne rapportait rien : elle
 * installait en douce qu'à cette taille tout ce qui tombe tombe vite. Joué, le
 * détour se lisait comme une erreur de chemin. Signalé en jouant.
 *
 * Elle vit donc ici, à part, comme le banc d'essai : on y entre par le seuil
 * ouest, à ×1/4, on traverse la cour sous l'averse, et le seuil est en est le
 * but. Rien à résoudre, et c'est le sujet — voir `salles/pluie.ts`.
 */
export const PLUIE_SEULE: LevelDef = {
  name: 'La cour de pluie',
  spawn: PLUIE.entree.position,
  spawnYaw: PLUIE.entree.lacet ?? 0,
  spawnScale: PLUIE.entree.echelle,
  regions: [PLUIE.region],
  boxes: PLUIE.boxes,
  carryables: PLUIE.carryables ?? [],
  sockets: PLUIE.sockets ?? [],
  tableaux: PLUIE.tableaux ?? [],
  veilleurs: PLUIE.veilleurs ?? [],
  averse: PLUIE.averse ? [PLUIE.averse] : [],
  portals: PLUIE.portals ?? [],
  guide: PLUIE.stations,
  guideEchelle: PLUIE.stationsEchelle ?? PLUIE.stations.map(() => scaleOfLevel(PLUIE.entree.echelle)),
  guidePorte: PLUIE.stationsPorte ?? PLUIE.stations.map(() => null),
  // Le but : le seuil est, au bout de l'axe. Un rayon d'une taille de joueur.
  goal: { position: PLUIE.sortie.position, radius: 6 * Math.pow(4, PLUIE.sortie.echelle) },
};
