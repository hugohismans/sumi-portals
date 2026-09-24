import { IDENTITE, appliquerMat, eulerVersMat, vec3, type Mat3, type Vec3 } from './math.js';
import type { Carryable } from './carryables.js';
import type { SocketDef } from './types.js';

/** Les blocs d'une forme, en unités de −0,5 à +0,5 — ceux d'une pièce. */
export type Blocs = { min: [number, number, number]; max: [number, number, number] }[];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LA FORME TELLE QU'ELLE EST POSÉE — pour comparer une pièce à son dessin.
 *
 * Deux pièces de même forme et de même main coïncident dans un creux si leurs
 * blocs, une fois tournés, occupent les mêmes places. On ne compare donc pas
 * des angles — une forme symétrique a plusieurs bonnes orientations, et des
 * angles d'Euler différents peuvent décrire la même —, mais des ENSEMBLES de
 * blocs : chacun réduit à son centre et à ses demi-côtés, arrondis, triés.
 *
 * La main droite reflète la forme sur son axe x AVANT la rotation : c'est la
 * convention du rendu (`carryableGeometry`) et du dessin du creux.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export const cleDeForme = (blocs: Blocs, droite: boolean, R: Mat3): string => {
  // Une rotation quelconque (une pièce qui roule encore) ne coïncide avec
  // rien : on n'arrondit que ce qui est déjà presque un quart de tour.
  const r = R.map((v) => (Math.abs(v - Math.round(v)) < 0.02 ? Math.round(v) : v)) as Mat3;
  const g = (v: number) => Math.round(v * 24) / 24;
  const cles = blocs.map((b) => {
    const mn = [g(b.min[0]), g(b.min[1]), g(b.min[2])];
    const mx = [g(b.max[0]), g(b.max[1]), g(b.max[2])];
    const centre = vec3((mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2);
    const demi = vec3((mx[0] - mn[0]) / 2, (mx[1] - mn[1]) / 2, (mx[2] - mn[2]) / 2);
    if (droite) centre.x = -centre.x;
    const c = appliquerMat(r, centre);
    const d = appliquerMat(r, demi);
    const k = (v: number) => Math.round(v * 48);
    return [k(c.x), k(c.y), k(c.z), Math.abs(k(d.x)), Math.abs(k(d.y)), Math.abs(k(d.z))].join(',');
  });
  return cles.sort().join(';');
};

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

/**
 * CE QUI CLOCHE, quand un logement refuse.
 *
 * La taille se dédouble — « trop grand » et « trop petit » — parce que c'est la
 * seule des quatre valeurs qui ait un SENS. Une forme n'est pas trop à gauche,
 * une main n'est pas trop droite ; mais une pièce trop grosse et une pièce trop
 * menue demandent des gestes opposés, et le joueur a besoin de savoir lequel.
 * Le refus d'un pinceau endormi dit déjà « trop grand » ou « trop petit » pour
 * exactement cette raison : on reprend son vocabulaire plutôt que d'en inventer
 * un second.
 */
/** `lancee` : tout est juste, mais la pièce a été LANCÉE, pas posée. Voir `Carryable.lancee`. */
/** `orientation` : tout est juste, mais la pièce n'est pas dans le sens de son dessin. */
export type RaisonDuRefus = 'trop-grand' | 'trop-petit' | 'forme' | 'teinte' | 'main' | 'orientation' | 'lancee';

export interface Socket {
  id: string;
  /** Centre du bas du logement. */
  position: Vec3;
  /** Arête attendue. */
  size: number;
  /** Main exigée, s'il y en a une. */
  main?: 'L' | 'D';
  /** Forme exigée, s'il y en a une. Voir SocketDef.forme. */
  forme?: string;
  /** Teinte EXIGÉE de la pièce, s'il y en a une. Voir `fits`. */
  teinte?: number;
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
  /** Les blocs de chaque forme connue du niveau. Voir `dansLeSens`. */
  private readonly formes: ReadonlyMap<string, Blocs>;
  /** La clé du dessin de chaque creux à forme, calculée une fois. */
  private readonly dessins = new Map<string, string>();

  constructor(defs: SocketDef[] = [], formes: ReadonlyMap<string, Blocs> = new Map()) {
    this.defs = defs;
    this.formes = formes;
    this.reset();
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LA PIÈCE EST-ELLE DANS LE SENS DE SON DESSIN ?
   *
   * Un creux qui attend une forme la dessine (voir `SocketViews`), et il la
   * dessine dans UNE orientation : il faut y poser la pièce dans ce sens-là.
   * C'est ce qui rend la main lisible. Tant qu'on ne pouvait pas tourner la
   * pièce, « la tourner n'y changera rien » était une phrase qu'on devait
   * croire sur parole ; maintenant on la tourne, on passe les vingt-quatre
   * orientations, et l'on VOIT qu'aucune n'épouse le dessin. Signalé en
   * jouant : « on devrait pouvoir faire des rotations… puis il faut poser
   * avec la bonne orientation également ».
   *
   * Vrai pour tout creux qui n'attend pas de forme connue : un cube n'a pas
   * de sens.
   * ═══════════════════════════════════════════════════════════════════════
   */
  dansLeSens(socket: Socket, c: Carryable): boolean {
    if (socket.forme === undefined || !c.pieces) return true;
    const blocs = this.formes.get(socket.forme);
    if (!blocs) return true;
    let dessin = this.dessins.get(socket.id);
    if (dessin === undefined) {
      dessin = cleDeForme(blocs, socket.main === 'D', IDENTITE);
      this.dessins.set(socket.id, dessin);
    }
    return cleDeForme(c.pieces, c.main === 'D', eulerVersMat(c.rotation)) === dessin;
  }

  reset(): void {
    this.items.length = 0;
    for (const d of this.defs) {
      this.items.push({
        id: d.id,
        position: vec3(d.position[0], d.position[1], d.position[2]),
        size: d.size,
        main: d.main,
        forme: d.forme,
        teinte: d.teinte,
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
    // LA FORME, et elle se compare par son NOM. Un creux ne teste jamais une
    // géométrie : quatre comparaisons de valeurs suffisent — la forme, la
    // taille, la main, et la teinte le jour venu. C'est ce qui rend la boîte à
    // formes possible en données pures, sans une ligne de calcul.
    if (socket.forme !== undefined && c.forme !== socket.forme) return false;
    // LA TEINTE — « le jour venu » était écrit juste au-dessus depuis des
    // semaines, et le jour est arrivé avec la boîte à formes. Quatrième et
    // dernière comparaison, du même genre que les trois autres : une valeur
    // contre une valeur, jamais une géométrie.
    //
    // Elle est SÉPARÉE de `SocketDef.ink`, qui dit de quelle couleur le creux
    // est DESSINÉ. Les confondre paraissait économique et aurait été un piège :
    // un creux qui n'exige rien doit pouvoir se peindre comme il veut, et un
    // creux qui exige le rouge n'est pas forcément rouge lui-même — il peut
    // être un trait d'encre autour d'un vide, ce qui est plus joli et plus
    // lisible qu'une tache de la couleur qu'on attend.
    if (socket.teinte !== undefined && c.ink !== socket.teinte) return false;
    if (Math.abs(c.size - socket.size) > socket.size * socket.tolerance) return false;
    // LE SENS, en dernier : voir `dansLeSens`.
    return this.dansLeSens(socket, c);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * POURQUOI CE LOGEMENT REFUSE — et c'est la seule chose qui manquait.
   *
   * `fits` rend un booléen. Un joueur qui présente une pièce et la voit refusée
   * n'apprend donc RIEN : est-ce la taille ? la forme ? la teinte ? la main ?
   * Il essaie au hasard au lieu de raisonner, et quatre inconnues font seize
   * combinaisons.
   *
   * Trois modèles à qui l'on a décrit ce jeu ont buté là-dessus sans se
   * concerter — « des formulaires déguisés », « l'invisible n'est jamais
   * spectaculaire », « les serrures immatérielles ruinent la promesse
   * géométrique » — et l'autrice de la boîte à formes avait écrit exactement la
   * même phrase la veille en livrant sa salle. C'est le seul point du projet où
   * une critique extérieure et une trouvaille interne se recouvrent mot pour
   * mot, et c'est pour ça qu'il passe avant tout le reste.
   *
   * ─── L'ORDRE N'EST PAS CELUI DE `fits`, ET C'EST DÉLIBÉRÉ ─────────────────
   *
   * `fits` teste la main en premier : l'ordre y est sans importance, puisque
   * seul le OUI/NON compte. Ici l'ordre EST la pédagogie, parce qu'on ne dit
   * qu'une chose à la fois — en dire deux, c'est n'en dire aucune.
   *
   *   1. LA TAILLE, parce que le joueur la voit déjà. Commencer par ce qu'il
   *      avait sous les yeux lui apprend que le signal dit vrai, et c'est à ce
   *      prix qu'il croira les trois autres.
   *   2. LA FORME, qui se voit aussi, mais demande d'y regarder.
   *   3. LA TEINTE, qui se voit sans se comparer.
   *   4. LA MAIN EN DERNIER, parce qu'elle est la seule invisible. On ne
   *      l'entend donc que lorsque tout le reste est juste — c'est-à-dire au
   *      moment exact où la leçon peut porter.
   *
   * Une pièce fausse sur deux points se voit corriger la première, puis se fait
   * refuser une seconde fois. Ce n'est pas une lourdeur : c'est un escalier, et
   * chaque marche enseigne une chose de plus.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  raisonDuRefus(socket: Socket, c: Carryable): RaisonDuRefus | null {
    if (Math.abs(c.size - socket.size) > socket.size * socket.tolerance) {
      return c.size > socket.size ? 'trop-grand' : 'trop-petit';
    }
    if (socket.forme !== undefined && c.forme !== socket.forme) return 'forme';
    if (socket.teinte !== undefined && c.ink !== socket.teinte) return 'teinte';
    if (socket.main !== undefined && c.main !== socket.main) return 'main';
    // 5. LE SENS, après la main : une pièce de la mauvaise main n'a pas de bon
    //    sens, et le dire serait mentir — elle passerait les vingt-quatre sans
    //    jamais entrer. On ne parle du sens que quand c'est la dernière chose
    //    qui cloche, c'est-à-dire quand tourner la pièce suffira.
    if (!this.dansLeSens(socket, c)) return 'orientation';
    return null;
  }

  /**
   * Le logement le plus proche qui REFUSERAIT cette pièce, et pourquoi.
   *
   * Chaque logement juge avec SA propre portée d'accueil — la même que celle
   * qui lui sert à happer ce qu'il accepte. Un creux qui se donne un large
   * rayon parce qu'un géant le garnit de quatorze mètres parle donc aussi de
   * loin qu'il attrape, et les deux distances ne peuvent pas diverger.
   *
   * On ne parle jamais d'un logement déjà pourvu : il n'attend plus rien.
   */
  /**
   * Le logement libre, à portée, qui PRENDRAIT cette pièce si elle avait été
   * posée. Sert à répondre à une pièce lancée qui s'arrête au bon endroit :
   * le creux ne la prend pas, et il faut le dire — un silence là-dessus se
   * lirait comme une panne.
   */
  logementQuiAccepterait(c: Carryable): Socket | null {
    let best: { socket: Socket; d: number } | null = null;
    for (const socket of this.items) {
      if (socket.filledBy !== null || !this.fits(socket, c)) continue;
      const d = Math.hypot(c.position.x - socket.position.x, c.position.z - socket.position.z);
      if (d > socket.portee || Math.abs(c.position.y - socket.position.y) > socket.portee) continue;
      if (!best || d < best.d) best = { socket, d };
    }
    return best?.socket ?? null;
  }

  refusLePlusProche(c: Carryable): { socket: Socket; raison: RaisonDuRefus } | null {
    let best: { socket: Socket; raison: RaisonDuRefus; d: number } | null = null;
    for (const socket of this.items) {
      if (socket.filledBy !== null) continue;
      const d = Math.hypot(
        c.position.x - socket.position.x,
        c.position.y - socket.position.y,
        c.position.z - socket.position.z,
      );
      if (d > socket.portee) continue;
      const raison = this.raisonDuRefus(socket, c);
      if (raison === null) continue;
      if (!best || d < best.d) best = { socket, raison, d };
    }
    return best ? { socket: best.socket, raison: best.raison } : null;
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
        // UN CREUX NE HAPPE PAS UNE PIÈCE EN VOL. Il attend qu'elle se soit
        // posée : sans ça, une vrille lancée à travers une porte et qui
        // passait à portée d'un creux en pleine course s'y logeait d'un coup —
        // l'énigme résolue par un lancer, sans qu'on ait jamais rien porté.
        // Poser une pièce est une question ; la lancer n'en est pas une.
        if (!c.grounded || Math.hypot(c.velocity.x, c.velocity.z) > 1) continue;
        // Et une pièce LANCÉE n'en est pas une non plus, même arrêtée : elle
        // attend qu'on la reprenne et qu'on la pose. Voir `Carryable.lancee`.
        if (c.lancee) continue;
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
