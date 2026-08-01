import { vec3, type Vec3 } from './math.js';
import type { Carryable } from './carryables.js';
import type { SocketDef } from './types.js';

/**
 * Les réceptacles — la boîte à formes.
 *
 * Un logement n'accepte qu'une caisse de LA bonne taille. Trop grosse, trop
 * petite : elle n'entre pas. Or la taille d'une caisse ne se règle que d'une
 * façon dans ce jeu — en la faisant traverser un portail. Le réceptacle
 * transforme donc le changement d'échelle en objectif concret, au lieu d'un
 * moyen d'atteindre une plateforme.
 *
 * C'est le plus gros multiplicateur de contenu du projet : une fois cette
 * brique posée, une énigme entière tient dans quelques lignes de données.
 *
 * Choix de conception : **une caisse logée s'y verrouille.** Elle ne se
 * ramasse plus. Sans ça, le joueur défait sans le vouloir ce qu'il vient de
 * réussir en frôlant la touche de saisie, et un progrès qu'on peut perdre par
 * accident n'est pas un progrès.
 */

/** Écart de taille toléré, en proportion. Assez large pour rester agréable. */
const DEFAULT_TOLERANCE = 0.12;

export interface Socket {
  id: string;
  /** Centre du bas du logement. */
  position: Vec3;
  /** Arête attendue. */
  size: number;
  /** Main exigée, s'il y en a une. */
  main?: 'L' | 'D';
  tolerance: number;
  /** Rayon d'accueil. Voir SocketDef.portee. */
  portee: number;
  /** Ce logement rend ce qu'on lui donne. Voir SocketDef.rend. */
  rend: boolean;
  ink: number;
  /** Identifiant de la caisse logée, ou null. */
  filledBy: string | null;
}

export class Sockets {
  readonly items: Socket[] = [];
  private readonly defs: SocketDef[];

  constructor(defs: SocketDef[] = []) {
    this.defs = defs;
    this.reset();
  }

  reset(): void {
    this.items.length = 0;
    for (const d of this.defs) {
      this.items.push({
        id: d.id,
        position: vec3(d.position[0], d.position[1], d.position[2]),
        size: d.size,
        main: d.main,
        tolerance: d.tolerance ?? DEFAULT_TOLERANCE,
        portee: d.portee ?? d.size * 0.75,
        rend: d.rend ?? false,
        ink: d.ink ?? 3,
        filledBy: null,
      });
    }
  }

  get total(): number {
    return this.items.length;
  }

  get filled(): number {
    return this.items.filter((s) => s.filledBy !== null).length;
  }

  get allFilled(): boolean {
    return this.items.length > 0 && this.filled === this.items.length;
  }

  /**
   * Les logements pourvus, par identifiant. C'est ce qui descelle les portails
   * conditionnés — voir `estScelle` dans portals.ts.
   *
   * Reconstruit à chaque appel : la liste tient sur les doigts d'une main, et
   * un ensemble mis en cache serait une source d'incohérence pour rien.
   */
  get pourvus(): ReadonlySet<string> {
    const out = new Set<string>();
    for (const s of this.items) if (s.filledBy !== null) out.add(s.id);
    return out;
  }

  /** La caisse est-elle à la bonne taille pour ce logement ? */
  fits(socket: Socket, c: Carryable): boolean {
    // La MAIN d'abord : c'est le refus le plus instructif du jeu. On présente
    // la pièce, elle a la bonne taille, elle a l'air juste — et elle n'entre
    // pas. Il n'y a qu'une façon de la retourner, et ce n'est pas en la
    // tournant.
    if (socket.main !== undefined && c.main !== socket.main) return false;
    return Math.abs(c.size - socket.size) <= socket.size * socket.tolerance;
  }

  /**
   * Cherche les caisses à loger, et les verrouille.
   *
   * On tolère un placement approximatif : exiger le centimètre près rendrait
   * le geste pénible, surtout au doigt. Une caisse posée « à peu près dedans »
   * s'aligne d'elle-même.
   */
  settle(carryables: Carryable[]): {
    locked: { socketId: string; carryableId: string }[];
    /** Chevalets dont on vient de reprendre la feuille. Voir SocketDef.rend. */
    liberes: string[];
  } {
    const locked: { socketId: string; carryableId: string }[] = [];
    const liberes: string[] = [];

    // ─── LES CHEVALETS RENDENT, ET SE VIDENT TOUT SEULS ───────────────────
    //
    // Une feuille posée sur un chevalet n'est pas verrouillée : on peut la
    // reprendre. Le logement doit donc constater lui-même qu'elle n'y est plus,
    // plutôt que d'attendre qu'on vienne le lui dire. À chaque image, il regarde
    // si ce qu'il tient est toujours là et toujours posé ; sinon il se vide, et
    // la porte que cette feuille avait ouverte se rescelle d'elle-même.
    for (const socket of this.items) {
      if (!socket.rend || socket.filledBy === null) continue;
      const c = carryables.find((x) => x.id === socket.filledBy);
      const parti =
        !c ||
        c.held ||
        Math.hypot(c.position.x - socket.position.x, c.position.z - socket.position.z) >
          socket.portee ||
        Math.abs(c.position.y - socket.position.y) > socket.portee;
      if (parti) {
        socket.filledBy = null;
        liberes.push(socket.id);
      }
    }

    for (const socket of this.items) {
      if (socket.filledBy !== null) continue;

      for (const c of carryables) {
        if (c.held || c.locked) continue;
        if (!this.fits(socket, c)) continue;

        const dx = c.position.x - socket.position.x;
        const dz = c.position.z - socket.position.z;
        const dy = c.position.y - socket.position.y;
        const reach = socket.portee;
        if (Math.hypot(dx, dz) > reach || Math.abs(dy) > reach) continue;

        // Elle s'aligne d'elle-même : le joueur a visé juste, le jeu finit le
        // geste plutôt que de lui reprocher quelques centimètres.
        c.position.x = socket.position.x;
        c.position.y = socket.position.y;
        c.position.z = socket.position.z;
        c.velocity.x = 0;
        c.velocity.y = 0;
        c.velocity.z = 0;
        c.rotation.x = 0;
        c.rotation.y = 0;
        c.rotation.z = 0;
        c.spin.x = 0;
        c.spin.y = 0;
        c.spin.z = 0;
        // Un chevalet ne verrouille pas : voir SocketDef.rend.
        c.locked = !socket.rend;
        socket.filledBy = c.id;
        locked.push({ socketId: socket.id, carryableId: c.id });
        break;
      }
    }

    return { locked, liberes };
  }
}
