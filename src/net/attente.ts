import { salonDe, type Attendant } from '../core/salons.js';
import type { Presence } from './presence.js';

/**
 * LA SALLE D'ATTENTE EST LE HALL LUI-MÊME.
 *
 * On n'enferme personne dans un écran « recherche d'une partie… ». On annonce
 * son intention et l'on continue à jouer avec les portails du hall — c'est
 * d'ailleurs le meilleur moment pour apprendre la règle du jeu, puisqu'on n'a
 * rien d'autre à faire. Une salle d'attente muette devient insupportable au
 * bout de vingt secondes ; celle-ci ne l'est jamais, parce que ce n'en est pas
 * une.
 *
 * Tout le rendez-vous tient dans core/salons.ts, qui ne connaît pas le réseau.
 * Ici il n'y a que de la plomberie : publier son ancienneté, lire celle des
 * autres, et poser la question à la fonction.
 */
export class AttenteDuo {
  actif = false;
  /** Une fois trouvé, il ne se reperd jamais. Voir plus bas. */
  salon: string | null = null;
  private debut = 0;

  /** Entrer dans la file. L'ancienneté publiée est ce qui sert à apparier. */
  demarrer(presence: Presence): void {
    if (this.actif) return;
    this.actif = true;
    this.debut = Date.now();
    presence.duoDepuis = this.debut;
  }

  /** Ressortir de la file — on a changé d'avis, on s'éloigne de l'arche. */
  annuler(presence: Presence): void {
    if (!this.actif || this.salon) return;
    this.actif = false;
    this.debut = 0;
    presence.duoDepuis = 0;
  }

  /** Depuis combien de temps on patiente, en secondes. */
  get secondes(): number {
    return this.debut ? (Date.now() - this.debut) / 1000 : 0;
  }

  /** Combien d'autres joueurs attendent en ce moment. */
  compagnons(presence: Presence): number {
    let n = 0;
    for (const p of presence.getPeers().values()) {
      if (p.duo && !p.salon) n++;
    }
    return n;
  }

  /**
   * Appelé à chaque image. Renvoie le salon dès qu'il est formé, puis toujours
   * le même.
   *
   * Le verrouillage du résultat n'est pas une précaution de style : quand la
   * paire se forme, les deux joueurs quittent le hall et leurs fiches
   * disparaissent. Sans verrou, celui qui recalcule une image trop tard se
   * retrouverait seul dans la file et conclurait qu'il n'a plus de partenaire —
   * juste après en avoir trouvé un.
   */
  update(presence: Presence): string | null {
    if (!this.actif) return null;
    if (this.salon) return this.salon;

    const file: Attendant[] = [{ uid: presence.uid, depuis: this.debut }];
    for (const p of presence.getPeers().values()) {
      if (p.duo && !p.salon) file.push({ uid: p.uid, depuis: p.duo });
    }

    const trouve = salonDe(presence.uid, file);
    if (trouve) {
      this.salon = trouve;
      // On l'annonce avant de partir, pour que les suivants dans la file nous
      // voient sortir plutôt que de nous compter encore.
      presence.salon = trouve;
    }
    return trouve;
  }
}
