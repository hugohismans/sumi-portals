import * as THREE from 'three';
import { PLAYER_HEIGHT, scaleOfLevel } from '../core/constants.js';
import { wrapAngle } from '../core/math.js';
import type { PlayerState } from '../core/types.js';
import { colorForUid, type RemoteSnapshot } from '../net/presence.js';
import { Avatar } from './avatar.js';

/**
 * Les autres joueurs, à l'écran.
 *
 * Leurs positions n'arrivent que dix fois par seconde, alors qu'on dessine
 * soixante images. Affichées telles quelles, elles donneraient une saccade très
 * visible. On lisse donc en permanence vers la dernière position connue.
 *
 * Le lissage est exponentiel plutôt qu'une interpolation entre deux
 * instantanés : c'est un peu moins exact, mais ça n'introduit aucun retard
 * volontaire et ça encaisse sans broncher un message en retard ou perdu — ce
 * qui arrive tout le temps.
 *
 * Le PALIER D'ÉCHELLE, lui, n'est pas lissé : il change d'un coup. Voir
 * quelqu'un devenir quatre fois plus petit instantanément, c'est le sujet du
 * jeu ; l'étaler sur une demi-seconde le rendrait mou.
 */

/** Constante de temps du lissage. Plus c'est petit, plus c'est réactif et nerveux. */
const SMOOTHING = 0.11;

interface Tracked {
  avatar: Avatar;
  /** État affiché, qui poursuit la cible. */
  shown: PlayerState;
  /** Dernière position reçue du réseau. */
  target: { x: number; y: number; z: number; yaw: number };
  speedInBodies: number;
}

export class RemotePlayers {
  readonly group = new THREE.Group();
  private readonly tracked = new Map<string, Tracked>();

  /** Aligne la liste des personnages sur celle reçue du réseau. */
  sync(peers: Map<string, RemoteSnapshot>): void {
    for (const [uid, snap] of peers) {
      let t = this.tracked.get(uid);
      if (!t) {
        const avatar = new Avatar(colorForUid(uid));
        this.group.add(avatar.group);
        t = {
          avatar,
          // On apparaît directement au bon endroit : sans ça, chaque arrivant
          // traverserait la carte en glissant depuis l'origine.
          shown: {
            position: { x: snap.x, y: snap.y, z: snap.z },
            velocity: { x: 0, y: 0, z: 0 },
            yaw: snap.yaw,
            pitch: 0,
            scaleLevel: snap.lvl,
            grounded: snap.sol === 1,
          },
          target: { x: snap.x, y: snap.y, z: snap.z, yaw: snap.yaw },
          speedInBodies: 0,
        };
        this.tracked.set(uid, t);
      }
      t.target.x = snap.x;
      t.target.y = snap.y;
      t.target.z = snap.z;
      t.target.yaw = snap.yaw;
      t.shown.scaleLevel = snap.lvl;
      t.shown.grounded = snap.sol === 1;
      t.speedInBodies = snap.mv;
    }

    for (const [uid, t] of this.tracked) {
      if (peers.has(uid)) continue;
      this.group.remove(t.avatar.group);
      this.tracked.delete(uid);
    }
  }

  update(dt: number): void {
    // Facteur de lissage indépendant de la fréquence d'affichage : le rendu est
    // identique à 60 ou à 144 images par seconde.
    const k = 1 - Math.exp(-dt / SMOOTHING);

    for (const t of this.tracked.values()) {
      const p = t.shown.position;
      p.x += (t.target.x - p.x) * k;
      p.y += (t.target.y - p.y) * k;
      p.z += (t.target.z - p.z) * k;
      // Le plus court chemin angulaire, sinon un joueur qui passe de +179° à
      // -179° ferait un tour complet sur lui-même.
      t.shown.yaw += wrapAngle(t.target.yaw - t.shown.yaw) * k;

      const scale = scaleOfLevel(t.shown.scaleLevel);
      // La démarche est pilotée par la vitesse annoncée, pas par le déplacement
      // observé : le lissage écraserait les à-coups et les jambes traîneraient.
      const speed = t.speedInBodies * scale * PLAYER_HEIGHT;
      t.shown.velocity.x = speed;
      t.shown.velocity.z = 0;

      t.avatar.update(t.shown, scale, dt);
      // Les autres sont vus de l'extérieur : ils gardent leur tête.
      t.avatar.setHeadVisible(true);
    }
  }

  syncInk(): void {
    for (const t of this.tracked.values()) t.avatar.syncInk();
  }

  get count(): number {
    return this.tracked.size;
  }
}
