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
import { Fraicheur } from '../core/fraicheur.js';

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
  /**
   * Horodatage d'entrée dans la file d'attente du duo, ou 0 si l'on n'attend
   * pas. C'est l'ancienneté qui sert à apparier — voir core/salons.ts.
   */
  duo?: number;
  /** Salon rejoint, une fois apparié. Vide tant qu'on attend. */
  salon?: string;
  /** Les caisses dont ce joueur répond. Voir net/caisses.ts. */
  caisses?: Record<string, { x: number; y: number; z: number; s: number; m?: number }>;
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
  /**
   * Qui est encore là. Ne compare JAMAIS notre montre à celle des autres —
   * c'est ce qui faisait qu'un joueur en voyait un autre sans être vu de lui.
   * Voir `src/core/fraicheur.ts`.
   */
  private readonly fraicheur = new Fraicheur();

  /**
   * File d'attente du duo, publiée dans SA PROPRE fiche.
   *
   * C'est ce qui permet de tenir dans les règles d'accès existantes : elles
   * n'ouvrent en écriture que `lobby/$uid`, et la validation n'exige que la
   * présence de x, y, z, yaw, lvl et t — les clés supplémentaires passent. Pas
   * une règle à republier pour tout le rendez-vous à deux.
   */
  duoDepuis = 0;
  salon = '';
  /** Caisses publiées avec ma fiche. Renseigné par CaissesPartagees. */
  caisses: Record<string, { x: number; y: number; z: number; s: number; m?: number }> | undefined;
  private lastDuo = 0;
  private lastSalon = '';

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
      const maintenant = Date.now();
      const fiches = new Map<string, number>();
      const brutes = new Map<string, Omit<RemoteSnapshot, 'uid'>>();
      snap.forEach((child) => {
        const uid = child.key!;
        if (uid === this.uid) return; // on ne s'affiche pas soi-même deux fois
        const v = child.val() as Omit<RemoteSnapshot, 'uid'> | null;
        if (!v || typeof v.x !== 'number') return;
        fiches.set(uid, v.t);
        brutes.set(uid, v);
      });

      // Deuxième filet : une fiche figée est celle d'un joueur dont la
      // déconnexion n'a pas été signalée. On juge ça sur NOTRE montre et sur
      // le seul fait que son horodatage BOUGE, jamais en soustrayant son heure
      // à la nôtre — deux machines ne sont pas d'accord sur l'heure, et
      // l'écart rendait la disparition à sens unique.
      const vivants = this.fraicheur.vivants(fiches, maintenant);
      const next = new Map<string, RemoteSnapshot>();
      for (const uid of vivants) {
        const v = brutes.get(uid);
        if (v) next.set(uid, { ...v, uid });
      }
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
    // Entrer dans la file d'attente ou trouver son salon part IMMÉDIATEMENT :
    // à dix envois par seconde, attendre le prochain créneau rallongerait le
    // rendez-vous de cent millisecondes pour rien, et l'autre joueur est en
    // train de compter les secondes.
    const duoChanged = this.duoDepuis !== this.lastDuo || this.salon !== this.lastSalon;
    if (!scaleChanged && !duoChanged && this.accumulator < PUBLISH_PERIOD) return;

    this.accumulator = 0;
    this.lastLevel = state.scaleLevel;
    this.lastDuo = this.duoDepuis;
    this.lastSalon = this.salon;

    const paquet = {
      x: round(state.position.x),
      y: round(state.position.y),
      z: round(state.position.z),
      yaw: round(state.yaw),
      lvl: state.scaleLevel,
      mv: round(speedInBodies),
      sol: state.grounded ? 1 : 0,
      t: Date.now(),
      duo: this.duoDepuis,
      salon: this.salon,
      // `null` et non `undefined` : Firebase refuse `undefined` dans un objet,
      // alors que `null` efface proprement la clé côté serveur.
      caisses: this.caisses ?? null,
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
    this.fraicheur.effacer();
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.selfRef) await remove(this.selfRef).catch(() => undefined);
    this.selfRef = null;
  }
}

/** Deux décimales suffisent, et divisent par deux le poids des messages. */
const round = (v: number): number => Math.round(v * 100) / 100;
