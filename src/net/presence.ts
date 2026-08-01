import {
  onDisconnect,
  onValue,
  ref,
  remove,
  set,
  type DatabaseReference,
} from 'firebase/database';
import type { PlayerState } from '../core/types.js';
import { getNet, signIn } from './connection.js';

/**
 * Présence des joueurs dans le lobby.
 *
 * Modèle volontairement simple : chacun publie sa propre position, personne ne
 * fait autorité. Un tricheur pourrait donc mentir sur la sienne — entre gens
 * qui se baladent dans un hall, on s'en moque. Le jour où ça comptera, la
 * simulation sait déjà tourner côté serveur (voir src/core/).
 *
 * Les clés sont courtes (x, y, z, yaw, lvl…) parce qu'elles transitent dix fois
 * par seconde et par joueur : « scaleLevel » coûterait cinq fois plus que
 * « lvl » pour la même information.
 */

/** Cadence de publication. 10 Hz : mesuré confortable pour un aller-retour de 60 ms. */
const PUBLISH_HZ = 10;
const PUBLISH_PERIOD = 1 / PUBLISH_HZ;

/** Au-delà, on considère le joueur parti même si sa fiche traîne encore. */
const STALE_MS = 20_000;

export interface RemoteSnapshot {
  uid: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Palier d'échelle. */
  lvl: number;
  /** Vitesse horizontale en tailles de corps par seconde — pour la démarche. */
  mv: number;
  /** 1 si au sol. */
  sol: number;
  t: number;
}

/** Palette des joueurs. Teintes d'encre, lisibles sur le papier crème. */
const COLORS = [
  0x4c6b3c, 0x8a4b6b, 0x3d5a80, 0xa1663a,
  0x5c4b8a, 0x2f6b63, 0x8a3b3b, 0x6b6b2f,
];

/** Couleur déterministe : un joueur garde la sienne d'une session à l'autre. */
export const colorForUid = (uid: string): number => {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
};

export class Presence {
  uid = '';
  private selfRef: DatabaseReference | null = null;
  private unsubscribe: (() => void) | null = null;
  private accumulator = 0;
  private lastLevel = Number.NaN;
  private peers = new Map<string, RemoteSnapshot>();

  /** Rejoint le lobby et commence à écouter les autres. */
  async join(): Promise<void> {
    this.uid = await signIn();
    const { db } = getNet();
    this.selfRef = ref(db, `lobby/${this.uid}`);

    // Filet de sécurité : si l'onglet se ferme, plante ou perd le réseau, le
    // serveur efface la fiche tout seul. Sans ça, le lobby se remplirait de
    // fantômes immobiles.
    await onDisconnect(this.selfRef).remove();

    const lobbyRef = ref(db, 'lobby');
    this.unsubscribe = onValue(lobbyRef, (snap) => {
      const now = Date.now();
      const next = new Map<string, RemoteSnapshot>();
      snap.forEach((child) => {
        const uid = child.key!;
        if (uid === this.uid) return; // on ne s'affiche pas soi-même deux fois
        const v = child.val() as Omit<RemoteSnapshot, 'uid'> | null;
        if (!v || typeof v.x !== 'number') return;
        // Deuxième filet : une fiche qui n'a pas bougé depuis longtemps est
        // celle d'un joueur dont la déconnexion n'a pas été signalée.
        if (now - v.t > STALE_MS) return;
        next.set(uid, { ...v, uid });
      });
      this.peers = next;
    });
  }

  /** Instantané courant des autres joueurs. */
  getPeers(): Map<string, RemoteSnapshot> {
    return this.peers;
  }

  /**
   * Publie sa position, au plus dix fois par seconde — sauf changement
   * d'échelle, qui part tout de suite : c'est l'événement le plus visible du
   * jeu, il ne doit pas attendre le prochain envoi.
   */
  publish(state: PlayerState, dt: number, speedInBodies: number): void {
    if (!this.selfRef) return;

    this.accumulator += dt;
    const scaleChanged = state.scaleLevel !== this.lastLevel;
    if (!scaleChanged && this.accumulator < PUBLISH_PERIOD) return;

    this.accumulator = 0;
    this.lastLevel = state.scaleLevel;

    const paquet = {
      x: round(state.position.x),
      y: round(state.position.y),
      z: round(state.position.z),
      yaw: round(state.yaw),
      lvl: state.scaleLevel,
      mv: round(speedInBodies),
      sol: state.grounded ? 1 : 0,
      t: Date.now(),
    };

    // Un envoi raté est signalé UNE fois. Une version antérieure avalait
    // l'erreur en silence : la publication ne partait pas et rien, nulle part,
    // ne le disait. Un « catch » muet dans un chemin qui s'exécute dix fois par
    // seconde, c'est une panne qu'on ne peut pas diagnostiquer.
    void set(this.selfRef, paquet).catch((e: Error) => {
      if (this.publishError) return;
      this.publishError = e.message;
      console.error('[présence] publication refusée :', e.message, paquet);
    });
  }

  /** Message de la première publication refusée, s'il y en a eu une. */
  publishError = '';

  /** Départ volontaire. */
  async leave(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.selfRef) await remove(this.selfRef).catch(() => undefined);
    this.selfRef = null;
  }
}

/** Deux décimales suffisent, et divisent par deux le poids des messages. */
const round = (v: number): number => Math.round(v * 100) / 100;
