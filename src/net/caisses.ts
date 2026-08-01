import type { Carryables } from '../core/carryables.js';
import type { Presence, RemoteSnapshot } from './presence.js';

/**
 * LES CAISSES PARTAGÉES, SANS SERVEUR ET SANS CHEMIN NOUVEAU.
 *
 * Deux joueurs dans le même monde doivent voir les mêmes objets, sinon le
 * premier pose une pierre dans un logement et le second ne voit rien se
 * produire. C'est la condition sans laquelle rien de coopératif ne tient.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE MODÈLE : UN PROPRIÉTAIRE PAR CAISSE, ET IL PUBLIE CHEZ LUI.
 *
 * Chacun publie l'état des caisses dont il est propriétaire DANS SA PROPRE
 * FICHE, `lobby/$uid/caisses`. C'est ce qui permet de tenir dans les règles
 * d'accès existantes, qui n'ouvrent en écriture que la fiche du joueur — pas
 * une ligne de configuration à republier pour tout le jeu à deux.
 *
 * On devient propriétaire en RAMASSANT, et on le reste après avoir reposé,
 * jusqu'à ce qu'un autre ramasse. Deux joueurs ne peuvent pas tenir la même
 * caisse en même temps, donc le conflit ne peut naître que dans l'intervalle
 * d'un aller-retour réseau — et il se résout par une règle d'une ligne : celui
 * qui la TIENT l'emporte sur celui qui l'a seulement tenue.
 *
 * LES LOGEMENTS NE SE SYNCHRONISENT PAS. Leur état se déduit de la position
 * des caisses, identiquement chez tout le monde. C'est moins de réseau, et
 * surtout aucune divergence possible entre deux vérités.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Ce qui transite pour une caisse. Clés courtes : ça part dix fois par seconde. */
export interface CaisseRes {
  x: number;
  y: number;
  z: number;
  /** Arête. Elle change en traversant un portail, donc elle voyage aussi. */
  s: number;
  /** 1 si elle est dans les mains de son propriétaire. */
  m?: number;
}

const rond = (v: number): number => Math.round(v * 100) / 100;

export class CaissesPartagees {
  /** Les caisses dont je réponds. Je suis seul à publier celles-là. */
  private miennes = new Set<string>();

  /** Ramasser, c'est s'approprier. */
  reclamer(id: string): void {
    this.miennes.add(id);
  }

  /** Ce que je publie dans ma fiche. */
  aPublier(carryables: Carryables): Record<string, CaisseRes> | undefined {
    if (this.miennes.size === 0) return undefined;
    const out: Record<string, CaisseRes> = {};
    for (const c of carryables.items) {
      if (!this.miennes.has(c.id)) continue;
      out[c.id] = {
        x: rond(c.position.x),
        y: rond(c.position.y),
        z: rond(c.position.z),
        s: rond(c.size),
        ...(c.held ? { m: 1 } : {}),
      };
    }
    return out;
  }

  /**
   * Appliquer ce que publient les autres.
   *
   * Une caisse qu'un pair TIENT en main me fait céder la propriété
   * immédiatement : c'est la règle qui tranche les rares cas où deux joueurs
   * croient tous deux l'avoir. Celui qui l'a vraiment dans les mains gagne.
   *
   * Une caisse déjà logée n'est plus touchée par personne : elle est figée pour
   * de bon, et laisser le réseau la déplacer défairait un progrès acquis.
   */
  appliquer(pairs: Map<string, RemoteSnapshot>, carryables: Carryables): void {
    for (const p of pairs.values()) {
      const lot = p.caisses;
      if (!lot) continue;
      for (const [id, r] of Object.entries(lot)) {
        if (r.m) this.miennes.delete(id);
        else if (this.miennes.has(id)) continue;

        const c = carryables.items.find((x) => x.id === id);
        if (!c || c.locked || c.held) continue;

        c.position.x = r.x;
        c.position.y = r.y;
        c.position.z = r.z;
        c.size = r.s;
        // Elle est pilotée à distance : sa vitesse locale n'a plus de sens, et
        // la laisser courir la ferait dériver entre deux nouvelles.
        c.velocity.x = 0;
        c.velocity.y = 0;
        c.velocity.z = 0;
      }
    }
  }

  /** À brancher sur la publication de présence. */
  brancher(presence: Presence, carryables: Carryables): void {
    presence.caisses = this.aPublier(carryables);
  }
}
