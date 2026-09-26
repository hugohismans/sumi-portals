import {
  AIR_CONTROL,
  EYE_FRACTION,
  GRAVITY,
  GROUND_FRICTION,
  JUMP_SPEED,
  MOVE_SPEED,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  SCALE_MAX_LEVEL,
  SCALE_MIN_LEVEL,
  SPRINT_EN_L_AIR,
  SPRINT_MULTIPLIER,
  scaleOfLevel,
} from './constants.js';
import { Carryables, lookDirection } from './carryables.js';
import { Sockets } from './sockets.js';
import { Familles } from './familles.js';
import { surLaGomme, viser } from './canevas.js';
import { clamp, eulerVersMat, matVersEuler, mulMat, quartDeTour, rotateY, vec3, wrapAngle, yawToForward, type Mat3, type Vec3 } from './math.js';
import { moveAndCollide, playerAabb, reposerSurLeSol } from './physics.js';
import {
  buildFaces,
  canPass,
  estScelle,
  signedDistance,
  transformPoint,
  transformVector,
  traversalLevelDelta,
  traversalScale,
  transporterRotation,
  withinFaceRect,

  type PortalFace,
} from './portals.js';
import type { InputCommand, LevelDef, PlayerState, TickEvents } from './types.js';
import { World, type Aabb } from './world.js';
import { aabbOfCarryable, type Carryable } from './carryables.js';

/**
 * Une porte miroir échange la gauche et la droite de ce qui la traverse.
 *
 * D'où la seule règle de l'énigme chirale : on ne rattrape pas une mauvaise
 * main en tournant l'objet, il faut le repasser au miroir. Deux passages le
 * rendent à sa forme d'origine — sans quoi le joueur ne pourrait pas défaire
 * son erreur.
 */
/**
 * Le délai, en pas de simulation, entre la dépose et la réponse du creux.
 *
 * Une demi-seconde. C'est le temps qu'il faut à une pièce lâchée à hauteur d'œil
 * pour toucher le sol à taille d'homme, et c'est aussi la durée en dessous de
 * laquelle une phrase ressemble à un clignotement plutôt qu'à une réponse.
 */
const REFUS_DELAI = 30;

/**
 * L'ordre de la molette : douze quarts de tour autour des axes du monde, deux
 * fois, et l'on a vu les vingt-quatre orientations d'un cube, chacune une
 * seule fois. Voir `Simulation.tournerLaPiece` — et le harnais, qui le
 * vérifie.
 */
export const TOUR_DE_MOLETTE: readonly ('x' | 'y' | 'z')[] = ['y', 'y', 'y', 'x', 'y', 'x', 'y', 'z', 'y', 'x', 'y', 'x'];

const retournerLaMain = (c: Carryable, face: PortalFace): void => {
  if (!face.miroir || c.main === undefined) return;
  c.main = c.main === 'L' ? 'D' : 'L';
};

/**
 * Ce qui passe une porte tourne avec elle — comme son porteur. Et par un
 * miroir, la main bascule ET le lacet change de sens : voir
 * `transporterRotation`, qui explique pourquoi une main retournée ne suffit
 * pas.
 */
const tournerAvecLaPorte = (c: Carryable, face: PortalFace): void => {
  retournerLaMain(c, face);
  const r = transporterRotation(face, c.rotation);
  c.rotation.x = r.x;
  c.rotation.y = r.y;
  c.rotation.z = r.z;
};

/**
 * La simulation. Aucun import Three.js dans ce fichier ni dans ses dépendances :
 * cette classe doit pouvoir tourner dans Node pour un serveur autoritaire, avec
 * les clients qui prédisent localement et se réconcilient.
 */
/** Boîte de travail pour la sortie des pièces par les portes. */
const seuilScratch: Aabb = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
const sondeAppui: Aabb = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
const corpsAppui: Aabb = { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
const touchesAppui: Aabb[] = [];

/** Un endroit où l'on s'est tenu debout, et la taille qu'on y faisait. */
interface Appui {
  x: number;
  y: number;
  z: number;
  echelle: number;
}
/** Combien d'appuis on garde : assez pour remonter hors d'un piège, pas davantage. */
const APPUIS_GARDES = 8;

/** Une pièce passe-t-elle par cette face ? La même marge que pour le joueur. */
const pieceFits = (face: PortalFace, size: number): boolean =>
  size <= face.height * 0.96 && size <= face.width * 0.9;

export class Simulation {
  readonly world: World;
  readonly faces: PortalFace[];
  readonly carryables: Carryables;
  readonly sockets: Sockets;
  player: PlayerState;
  goalReached = false;
  /** Un seuil ne se franchit qu'une fois : au-delà, la page part ailleurs. */
  seuilFranchi = false;
  /**
   * Portes qui ne sont PAS ENCORE DESSINÉES.
   *
   * Une porte peut exister dans le monde sans que le monde d'en face y soit
   * tracé. Elle est alors une feuille vierge, et l'on ne traverse pas une
   * feuille vierge. C'est le pinceau qui l'ouvre en la dessinant.
   *
   * C'est le rendu qui décide quand — ce fichier ne sait pas ce qu'est une
   * tache d'encre. Il se contente de refuser, comme il refuse une porte trop
   * étroite : le joueur n'a pas à connaître la différence.
   */
  readonly portesFermees = new Set<string>();

  /**
   * La pièce qu'on vient de poser, et le décompte avant que le creux ne réponde.
   *
   * Un seul en vol à la fois : on ne pose qu'un objet à la fois, et deux refus
   * qui se chevauchent seraient deux phrases qui se coupent la parole.
   */
  private refusEnAttente: { id: string; ticks: number } | null = null;

  /**
   * Le dernier endroit où l'on se tenait debout, et la taille qu'on y faisait.
   *
   * On l'échantillonne toutes les douze images plutôt qu'à chaque pas : c'est
   * assez fin pour qu'on revienne à deux enjambées de là où l'on est tombé, et
   * ça évite d'écrire trois positions par seconde pour rien. La TAILLE compte
   * autant que le lieu — être reposé au bon endroit dans la mauvaise peau
   * rendrait le rattrapage plus déroutant que la chute.
   */
  private appuis: Appui[] = [];
  /** Images passées debout D'AFFILÉE : un saut, une chute, une glissade remettent à zéro. */
  private depuisAppui = 0;
  /** Rattrapages depuis le dernier appui sûr : deux d'affilée disent que l'appui est un piège. */
  private rattrapagesSansAppui = 0;
  /** Où le dernier rattrapage a reposé le joueur, combien de fois de suite, et quand. */
  private dernierRetour: { x: number; y: number; z: number; fois: number; tick: number } | null = null;
  /** L'horloge des rattrapages, en pas de simulation. */
  private pas = 0;
  /** Pinceaux déjà réveillés : on ne les réveille pas deux fois. */
  readonly eveilles = new Set<string>();
  /**
   * Les familles de couleur et les tableaux qui les jugent. Voir
   * `src/core/familles.ts` : on peint tout ce qu'on atteint, et un tableau
   * n'est que le même geste.
   */
  readonly familles: Familles;
  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LES COULEURS QU'ON A RAPPORTÉES, dans l'ordre du voyage.
   *
   * Les pigments vivent du côté du rendu, qui remplit ce tableau depuis la
   * mémoire des couleurs : ici on ne connaît que la règle, pas l'inventaire.
   * Chacune devient un pinceau de la trousse (voir `pinceaux`).
   *
   * Il y eut une fée qui peignait pour soi au village, puis une touche qui
   * « disait » la couleur suivante à une famille, et seulement à ce qu'on
   * aurait pu tenir. Signalé en jouant : ce n'était pas clair. On choisit
   * désormais un pinceau et l'on peint au clic, n'importe quoi, et une énigme
   * de couleur se résout par le même geste qu'on fait pour le plaisir.
   * ═══════════════════════════════════════════════════════════════════════
   */
  couleursConnues: string[] = [];

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * L'INVENTAIRE DES PINCEAUX, et celui qu'on tient.
   *
   * Un pinceau par couleur rapportée, dans l'ordre du voyage, et l'EAU en
   * dernier : elle lave ce qu'on a peint et le rend au lavis. Sans elle,
   * peindre « comme on le souhaite » serait peindre pour toujours.
   *
   * Mains vides, on choisit à la molette ou au chiffre (1, 2, 3…) et l'on
   * peint au clic. Voir `peindreCeQuOnVise`.
   * ═══════════════════════════════════════════════════════════════════════
   */
  get pinceaux(): string[] {
    return this.couleursConnues.length > 0 ? [...this.couleursConnues, 'eau'] : [];
  }
  /** Le pinceau choisi, ou null si l'on n'en a aucun. Toujours un de `pinceaux`. */
  get pinceauTenu(): string | null {
    const liste = this.pinceaux;
    if (liste.length === 0) return null;
    return this.pinceau !== null && liste.includes(this.pinceau) ? this.pinceau : liste[0];
  }
  pinceau: string | null = null;
  /**
   * Les boîtes du décor peintes une à une, hors famille, par leur rang dans le
   * niveau. Une famille garde sa teinte dans `familles.teintes`.
   */
  readonly peintures = new Map<number, string>();

  /** Le pas qui suit une porte : voir `moveAndCollide`, `apresPorte`. */
  private apresPorte = false;
  /** Front montant de la touche d'action : on saisit au clic, pas en continu. */
  private interactHeld = false;
  private throwHeld = false;

  constructor(level: LevelDef) {
    this.world = new World(level);
    this.faces = buildFaces(level.portals);
    this.carryables = new Carryables(level.carryables);
    // Les creux à forme comparent la pièce à leur dessin : ils ont besoin des
    // blocs de chaque forme, qu'on prend sur les pièces du niveau.
    const formes = new Map<string, NonNullable<Carryable['pieces']>>();
    for (const c of level.carryables ?? []) {
      if (c.forme && c.pieces && !formes.has(c.forme)) formes.set(c.forme, c.pieces);
    }
    this.sockets = new Sockets(level.sockets, formes);
    this.familles = new Familles(level.boxes, level.tableaux);
    this.player = this.spawnState();
    this.scellerLesPortesADessiner();
  }

  private spawnState(): PlayerState {
    const s = this.world.level.spawn;
    return {
      position: vec3(s[0], s[1], s[2]),
      velocity: vec3(0, 0, 0),
      yaw: this.world.level.spawnYaw,
      pitch: 0,
      scaleLevel: this.world.level.spawnScale ?? 0,
      grounded: false,
      gauchere: false,
    };
  }

  reset(): void {
    this.player = this.spawnState();
    this.carryables.reset();
    this.sockets.reset();
    this.familles.reset();
    this.peintures.clear();
    this.apresPorte = false;
    this.goalReached = false;
    this.seuilFranchi = false;
    this.scellerLesPortesADessiner();
  }

  /**
   * Une porte qui doit être dessinée naît FERMÉE.
   *
   * Appelée au démarrage ET à chaque remise à zéro — et c'est le démarrage qui
   * manquait. Le scellement ne vivait que dans `reset()`, qui n'est jamais
   * appelé au lancement : on commençait donc la partie avec toutes les portes
   * dessinées déjà ouvertes. Le monde central n'en souffrait pas, parce qu'une
   * ligne écrite à la main dans `main.ts` refermait la sienne ; la descente,
   * elle, n'avait personne pour le faire.
   *
   * Deux endroits qui doivent faire la même chose finissent toujours par ne
   * plus la faire. Il n'y en a plus qu'un.
   */
  /**
   * Peut-on reposer quelqu'un ici ? Le sol sous le CENTRE du corps, au ras
   * des pieds — un joueur posé sur une arête y tient tant qu'il ne bouge pas,
   * et glisse au premier pas — et le corps hors de la pierre. Le décor fixe
   * seulement : une caisse peut être déplacée, et l'appui avec elle.
   */
  private appuiSur(p: Vec3, scale: number): boolean {
    const r = PLAYER_RADIUS * scale * 0.25;
    sondeAppui.minX = p.x - r;
    sondeAppui.maxX = p.x + r;
    sondeAppui.minZ = p.z - r;
    sondeAppui.maxZ = p.z + r;
    sondeAppui.minY = p.y - 0.05 * scale;
    sondeAppui.maxY = p.y - 1e-6;
    let porte = false;
    for (const h of this.world.queryStatic(sondeAppui, touchesAppui)) {
      if (h.maxY >= p.y - 0.02 * scale) porte = true;
    }
    if (!porte) return false;
    const marge = 0.01 * scale;
    playerAabb(p, scale, corpsAppui);
    corpsAppui.minX += marge;
    corpsAppui.maxX -= marge;
    corpsAppui.minY += marge;
    corpsAppui.maxY -= marge;
    corpsAppui.minZ += marge;
    corpsAppui.maxZ -= marge;
    return this.world.queryStatic(corpsAppui, touchesAppui).length === 0;
  }

  /** Note un appui sûr. Tout près du dernier, il le remplace : on garde des endroits, pas des pas. */
  private noterAppui(p: Vec3, echelle: number, scale: number): void {
    const dernier = this.appuis[this.appuis.length - 1];
    if (
      dernier &&
      dernier.echelle === echelle &&
      Math.hypot(p.x - dernier.x, p.y - dernier.y, p.z - dernier.z) < PLAYER_HEIGHT * scale
    ) {
      dernier.x = p.x;
      dernier.y = p.y;
      dernier.z = p.z;
    } else {
      this.appuis.push({ x: p.x, y: p.y, z: p.z, echelle });
      if (this.appuis.length > APPUIS_GARDES) this.appuis.shift();
    }
    this.rattrapagesSansAppui = 0;
  }

  /**
   * Où reposer le joueur qui tombe hors du décor. Le dernier appui sûr, sauf
   * s'il s'est révélé un piège ; `null` s'il n'en reste aucun — le départ du
   * niveau, alors.
   */
  private choisirRetour(): Appui | null {
    // Deux rattrapages sans appui entre eux : reposé là, on n'a pas pu y tenir.
    if (this.rattrapagesSansAppui > 0) this.appuis.pop();
    this.rattrapagesSansAppui++;
    // Trois retours au même endroit en moins d'une demi-minute : on y tient,
    // mais on n'en sort qu'en retombant.
    const r0 = this.appuis[this.appuis.length - 1];
    const d = this.dernierRetour;
    if (
      r0 &&
      d &&
      this.pas - d.tick < 30 * 60 &&
      Math.hypot(r0.x - d.x, r0.y - d.y, r0.z - d.z) < PLAYER_HEIGHT * scaleOfLevel(r0.echelle) &&
      d.fois >= 2
    ) {
      this.appuis.pop();
    }
    // Une caisse posée là depuis : on ne repose personne dedans.
    while (this.appuis.length > 0) {
      const r = this.appuis[this.appuis.length - 1];
      if (this.world.query(playerAabb(r, scaleOfLevel(r.echelle), corpsAppui), touchesAppui).length === 0) break;
      this.appuis.pop();
    }
    const retour = this.appuis[this.appuis.length - 1] ?? null;
    const memeEndroit =
      retour !== null &&
      d !== null &&
      this.pas - d.tick < 30 * 60 &&
      Math.hypot(retour.x - d.x, retour.y - d.y, retour.z - d.z) < PLAYER_HEIGHT * scaleOfLevel(retour.echelle);
    this.dernierRetour = retour
      ? { x: retour.x, y: retour.y, z: retour.z, fois: memeEndroit ? d!.fois + 1 : 1, tick: this.pas }
      : null;
    return retour;
  }

  private scellerLesPortesADessiner(): void {
    this.portesFermees.clear();
    this.refusEnAttente = null;
    this.appuis = [];
    this.depuisAppui = 0;
    this.rattrapagesSansAppui = 0;
    this.dernierRetour = null;
    for (const p of this.world.level.portals ?? []) {
      if (p.dessinee) this.portesFermees.add(p.id);
    }
  }

  /**
   * Ce qui descelle une porte : les logements pourvus ET les tableaux
   * satisfaits. Le joueur n'a pas à connaître la différence — dans les deux
   * cas il a fait quelque chose, et dans les deux cas la porte s'ouvre.
   */
  get conditionsRemplies(): ReadonlySet<string> {
    const out = new Set(this.sockets.pourvus);
    for (const id of this.familles.satisfaits) out.add(id);
    return out;
  }

  get scale(): number {
    return scaleOfLevel(this.player.scaleLevel);
  }

  /**
   * Position des yeux. C'est aussi le point qui déclenche la traversée.
   *
   * On a d'abord utilisé le centre du corps, et c'est ce qui donnait la
   * sensation d'être « dans les deux mondes à la fois » : l'œil franchissait le
   * plan du portail avant ou après le corps, donc pendant quelques images on
   * voyait déjà l'autre côté sans y être, ou l'inverse. En déclenchant sur
   * l'œil, l'image d'avant et celle d'après se raccordent exactement.
   */
  eyePosition(): Vec3 {
    const p = this.player.position;
    return vec3(p.x, p.y + PLAYER_HEIGHT * EYE_FRACTION * this.scale, p.z);
  }

  /** Un tick de simulation, à pas fixe. */
  step(input: InputCommand, dt: number): TickEvents {
    const events: TickEvents = {};
    const pl = this.player;
    const scale = this.scale;

    pl.yaw = wrapAngle(input.yaw);
    pl.pitch = clamp(input.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);

    // --- Caisses ---------------------------------------------------------------
    // Les caisses posées deviennent des obstacles AVANT le déplacement du
    // joueur : c'est ce qui permet de monter sur celle qu'on vient de déposer.
    this.carryables.publishSolids(this.world);
    this.handleInteract(input.interact, scale, events);
    this.handleThrow(input.throwIt, scale, events);
    this.tournerLaPiece(input, events);

    // --- Direction souhaitée ---------------------------------------------------
    const forward = yawToForward(pl.yaw);
    const right = rotateY(forward, -Math.PI / 2);
    let wishX = forward.x * input.forward + right.x * input.strafe;
    let wishZ = forward.z * input.forward + right.z * input.strafe;
    const wishLen = Math.hypot(wishX, wishZ);
    if (wishLen > 1e-4) {
      wishX /= wishLen;
      wishZ /= wishLen;
    }

    // Vitesse, gravité et saut sont TOUS multipliés par l'échelle. Résultat :
    // le ressenti du déplacement est identique à toutes les tailles, seul le
    // monde paraît changer de dimension.
    // ─── LE SPRINT COURT, IL NE VOLE PAS ─────────────────────────────────
    //
    // Il multipliait tout par 1,8, y compris en l'air. Or un cran d'échelle ne
    // multiplie la portée que par 2 : un joueur à ×1/4 qui sprintait récupérait
    // donc **90 % de la portée d'un joueur à ×1 qui marche**, et toute fenêtre
    // d'énigme fondée sur la taille tenait dans cet écart de dix pour cent.
    //
    // C'est ce qui rendait le conduit facile, et ça aurait rendu impossible
    // toute la montée — « l'escalier pour plus tard » et « le blanchiment » se
    // calibrent sur des écarts d'échelle, et il n'y en avait plus.
    //
    // Le sprint garde donc toute sa valeur AU SOL, où il ne sert qu'à traverser
    // un lieu sans s'ennuyer, et il n'en garde presque rien EN L'AIR, où il
    // décidait de ce qu'on peut franchir. Un saut redevient une affaire de
    // taille et non de touche tenue.
    //
    // 1,15 et non 1 : sauter en courant doit valoir un peu mieux que sauter à
    // l'arrêt, sans quoi l'élan ne raconterait plus rien. Un ×1/4 qui sprinte
    // atteint maintenant 58 % de la portée d'un ×1 qui marche, au lieu de 90.
    // La fenêtre passe de dix points à quarante.
    const sprint = input.sprint ? (pl.grounded ? SPRINT_MULTIPLIER : SPRINT_EN_L_AIR) : 1;
    const targetSpeed = MOVE_SPEED * sprint * scale * Math.min(1, wishLen);

    if (pl.grounded) {
      const friction = Math.max(0, 1 - GROUND_FRICTION * dt);
      pl.velocity.x *= friction;
      pl.velocity.z *= friction;
      const accel = GROUND_FRICTION * dt;
      pl.velocity.x += (wishX * targetSpeed - pl.velocity.x) * accel;
      pl.velocity.z += (wishZ * targetSpeed - pl.velocity.z) * accel;
    } else {
      pl.velocity.x += wishX * targetSpeed * AIR_CONTROL * dt * 6;
      pl.velocity.z += wishZ * targetSpeed * AIR_CONTROL * dt * 6;
      const speed = Math.hypot(pl.velocity.x, pl.velocity.z);
      const maxAir = targetSpeed * 1.25 + 0.001;
      if (speed > maxAir) {
        pl.velocity.x *= maxAir / speed;
        pl.velocity.z *= maxAir / speed;
      }
    }

    if (input.jump && pl.grounded) {
      pl.velocity.y = JUMP_SPEED * scale;
      pl.grounded = false;
    }

    pl.velocity.y -= GRAVITY * scale * dt;

    // --- Déplacement -----------------------------------------------------------
    const prevEye = this.eyePosition();
    const prevPos = vec3(pl.position.x, pl.position.y, pl.position.z);

    const move = moveAndCollide(
      this.world,
      pl.position,
      pl.velocity,
      scale,
      dt,
      pl.grounded,
      this.apresPorte,
    );
    this.apresPorte = false;
    pl.grounded = move.grounded;
    const dos = this.dosDesPortes(prevPos, scale);
    if (dos) events.dos = { pairId: dos.pairId };

    // ═══════════════════════════════════════════════════════════════════════
    // LE RATTRAPAGE — la règle « on ne piège jamais » cesse d'être une promesse
    // que chaque auteur de salle doit tenir tout seul.
    //
    // Elle était vraie salle par salle, à la main : le conduit s'est payé une
    // boucle de reprise, l'escalier un secours, le creux une rampe. À chaque
    // fois de la géométrie écrite pour un cas qui ne devrait pas arriver, et à
    // chaque fois la question reposée au suivant. Et malgré ça, **rien ne
    // rattrapait une chute hors du décor** : le joueur tombait indéfiniment,
    // mesuré à y = −208 221 la nuit où un correctif de collision avait ouvert
    // un trou. La promesse ne tenait donc pas, elle tenait par habitude.
    //
    // CE N'EST PAS UNE PUNITION, ET C'EST TOUT LE SUJET. Pas de dégâts, pas
    // d'écran, pas de compteur : on est reposé là où l'on se tenait la dernière
    // fois debout, **avec ce qu'on porte**. « Se tromper coûte du temps et
    // donne une image, jamais une partie » — la loi n° 5, appliquée par le
    // moteur au lieu d'être redemandée à chaque salle.
    //
    // LE SEUIL SUIT LA TAILLE, et il le faut : vingt mètres sous le décor,
    // c'est une éternité pour un joueur de 45 cm et un clignement d'œil pour un
    // géant de 28,80. Un seuil fixe aurait donné une chute de huit secondes au
    // minuscule et un rattrapage instantané au grand — c'est-à-dire deux jeux
    // différents, ce qu'on refuse partout ailleurs.
    // ═══════════════════════════════════════════════════════════════════════
    //
    // ─── ET L'ON NE REPOSE JAMAIS DEUX FOIS DANS LE MÊME PIÈGE ────────────
    //
    // Signalé en jouant : « je me suis glitché hors du sol, ça me fait
    // réapparaître hors du sol encore ; je réapparais, je reglisse, et ça me
    // remet au bord du terrain en boucle ». L'appui s'échantillonnait toutes
    // les douze images passées debout — pas d'affilée : le compteur survivait
    // aux chutes, et la première image posée sur une arête, en tombant,
    // pouvait devenir l'appui. On y était reposé, on en reglissait, on
    // retombait, et l'on y revenait, sans fin : rien ne notait un meilleur
    // endroit, et rien ne renonçait à celui-là.
    //
    // Trois règles, maintenant. Un appui ne se note qu'après douze images
    // debout D'AFFILÉE, avec le sol sous le CENTRE du corps (pas sous un
    // bord) et le corps hors de la pierre (voir `appuiSur`). On en garde
    // plusieurs, du plus ancien au plus récent. Et deux rattrapages sans appui
    // sûr entre eux, ou trois retours au même endroit en moins d'une demi-
    // minute, disent que cet endroit est un piège : on l'oublie, et l'on
    // remonte d'un cran — jusqu'au départ du niveau s'il le faut.
    this.pas++;
    if (!pl.grounded) this.depuisAppui = 0;
    else if (++this.depuisAppui > 12) {
      this.depuisAppui = 0;
      if (this.appuiSur(pl.position, scale)) this.noterAppui(pl.position, pl.scaleLevel, scale);
    }
    if (pl.position.y < this.world.plancher - 20 * scale) {
      const retour = this.choisirRetour();
      if (retour) {
        pl.position.x = retour.x;
        pl.position.y = retour.y;
        pl.position.z = retour.z;
        pl.scaleLevel = retour.echelle;
      } else {
        // Jamais posé le pied nulle part : on ne peut que revenir au départ.
        const d = this.world.level.spawn;
        pl.position.x = d[0];
        pl.position.y = d[1];
        pl.position.z = d[2];
        pl.scaleLevel = this.world.level.spawnScale ?? 0;
      }
      pl.velocity.x = 0;
      pl.velocity.y = 0;
      pl.velocity.z = 0;
      pl.grounded = false;
      this.depuisAppui = 0;
      events.rattrape = true;
      const porte = this.carryables.held;
      if (porte) {
        this.carryables.followCarrier(
          porte,
          pl.position,
          pl.yaw,
          pl.pitch,
          scaleOfLevel(pl.scaleLevel),
        );
      }
    }

    // --- Traversée de portail --------------------------------------------------
    const newEye = this.eyePosition();
    const crossing = this.findCrossing(prevEye, newEye);
    if (crossing) {
      const face = crossing.face;
      const nextLevel = pl.scaleLevel + traversalLevelDelta(face);

      // Un portail trop petit pour nous fait simplement mur. C'est ça qui borne
      // la taille maximale, et ça se comprend sans qu'on ait rien à expliquer.
      // Une porte scellée fait mur exactement comme une porte trop petite. Le
      // joueur n'a pas à connaître la différence : dans les deux cas, il ne
      // passe pas, et dans les deux cas la raison est visible dans le monde.
      const reason: 'tooBig' | 'scaleLimit' | 'scelle' | null =
        this.portesFermees.has(face.pairId) || estScelle(face, this.conditionsRemplies)
          ? 'scelle'
          : !canPass(face, scale)
            ? 'tooBig'
            : nextLevel < SCALE_MIN_LEVEL || nextLevel > SCALE_MAX_LEVEL
              ? 'scaleLimit'
              : null;

      if (reason) {
        pl.position.x = prevPos.x;
        pl.position.y = prevPos.y;
        pl.position.z = prevPos.z;
        const n = face.normal;
        const along = pl.velocity.x * n.x + pl.velocity.y * n.y + pl.velocity.z * n.z;
        if (along < 0) {
          pl.velocity.x -= n.x * along;
          pl.velocity.y -= n.y * along;
          pl.velocity.z -= n.z * along;
        }
        events.refused = {
          pairId: face.pairId,
          face: face.kind,
          reason,
          versLePetit: nextLevel < SCALE_MIN_LEVEL,
        };
      } else {
        this.teleport(face, newEye, nextLevel);
        events.traversed = { pairId: face.pairId, from: face.kind, newLevel: nextLevel };
      }
    } else {
      // ON PASSE AU-DESSUS D'UNE PORTE TROP BASSE, et il faut le dire aussi.
      // La chatière du blanchiment fait 1,20 : l'œil d'un homme passe
      // au-dessus de son rectangle, aucune face n'est franchie, et c'est le
      // mur qui l'arrête sans un mot. Le joueur voyait une ouverture et un
      // mur, jamais la phrase qui les relie. Si l'œil franchit le plan dans
      // la largeur de la porte mais au-dessus d'elle, la porte a refusé —
      // on ne déplace personne, le mur s'en charge.
      //
      // Mais seulement s'il y a un mur derrière : un géant qui enjambe un torii
      // en plein air passe aussi « au-dessus » de sa petite face, et rien ne
      // l'arrête — lui dire « trop grand pour cette porte » en pleine rue du
      // village serait faux. On regarde donc s'il y a de la pierre juste
      // derrière le plan, à portée du corps.
      const dessus = this.findCrossing(prevEye, newEye, 4);
      if (dessus && !canPass(dessus.face, scale)) {
        const n = dessus.face.normal;
        const t = dessus.t;
        const hit = vec3(
          prevEye.x + (newEye.x - prevEye.x) * t,
          prevEye.y + (newEye.y - prevEye.y) * t,
          prevEye.z + (newEye.z - prevEye.z) * t,
        );
        const portee = PLAYER_RADIUS * scale * 2 + 0.8;
        const derriere = vec3(hit.x - n.x * portee, hit.y, hit.z - n.z * portee);
        if (!this.world.segmentLibre(hit, derriere)) {
          events.refused = { pairId: dessus.face.pairId, face: dessus.face.kind, reason: 'tooBig', versLePetit: false };
        }
      }
    }

    // --- Caisses : suivi du porteur, puis chute des autres ----------------------
    const held = this.carryables.held;
    if (held) {
      this.carryables.followCarrier(held, pl.position, pl.yaw, pl.pitch, this.scale);
      // ═══════════════════════════════════════════════════════════════════
      // CE QU'ON PORTE BUTE CONTRE UNE PORTE QU'IL NE PASSE PAS.
      //
      // Signalé en jouant, au blanchiment : géant, la vrille de deux mètres
      // en main, devant une petite face. La pièce se tient à bout de bras :
      // elle atteignait le plan de la porte bien avant l'œil, y entrait, et
      // le rendu la tranchait au plan en montrant sa moitié « passée » de
      // l'autre côté, quatre fois plus grande — une pièce qui ne passe pas,
      // coupée en deux dans le cadre. On bute donc avec elle, comme contre un
      // mur : le pas qui l'y ferait entrer est refusé. Et si elle y entre
      // quand même — on a tourné la tête —, elle est ramenée devant le plan.
      // Une pièce qui passe, elle, passe toujours la première : c'est ainsi
      // qu'on dépose ou qu'on lance par une porte trop petite pour soi.
      // ═══════════════════════════════════════════════════════════════════
      const bute = this.porteQuiRetient(held);
      if (bute && !events.traversed) {
        if (pl.position.x !== prevPos.x || pl.position.z !== prevPos.z) {
          pl.position.x = prevPos.x;
          pl.position.z = prevPos.z;
          pl.velocity.x = 0;
          pl.velocity.z = 0;
          this.carryables.followCarrier(held, pl.position, pl.yaw, pl.pitch, this.scale);
        }
        const encore = this.porteQuiRetient(held);
        if (encore) {
          const n = encore.face.normal;
          const pousse = (held.size * 0.5 + 0.02 - encore.devant) * encore.cote;
          held.position.x += n.x * pousse;
          held.position.y += n.y * pousse;
          held.position.z += n.z * pousse;
        }
        events.pieceRetenue = { pairId: bute.face.pairId, raison: bute.raison, joueurPasse: bute.raison === 'dos' ? false : canPass(bute.face, this.scale) };
      }
    }
    // Les caisses libres franchissent les portails comme le joueur : on note
    // leur centre avant le déplacement pour détecter le passage du plan.
    const before = this.carryables.items.map((c) => {
      if (c.held) return null;
      // Une caisse qu'on vient de lâcher repart de l'œil du porteur : voir
      // Carryable.releasedAt.
      const from = c.releasedAt ?? vec3(c.position.x, c.position.y + c.size * 0.5, c.position.z);
      c.releasedAt = null;
      return from;
    });
    this.carryables.step(this.world, dt);
    this.carryTraversal(before);

    // ─── UNE PIÈCE TOMBÉE HORS DU MONDE REVIENT, comme le joueur ──────────
    //
    // Vingt mètres sous le plancher du monde, comme lui. Le seuil ne suit pas
    // la taille de la pièce : sa gravité est celle du monde, la chute dure le
    // même temps pour toutes. On la repose où elle reposait, telle qu'elle y
    // reposait — voir `Carryable.appui`.
    for (const c of this.carryables.items) {
      if (c.held || c.locked) continue;
      if (c.position.y >= this.world.plancher - 20) continue;
      this.carryables.rattraper(c);
      events.pieceRattrapee = { id: c.id };
    }

    // Les caisses reposées cherchent leur logement. Après la chute, donc : une
    // caisse doit avoir atterri avant de pouvoir s'emboîter.
    const wasAllFilled = this.sockets.allFilled;
    const { locked: logees, liberes } = this.sockets.settle(this.carryables.items);
    if (liberes.length > 0) events.socketVide = { socketId: liberes[0] };
    if (logees.length > 0) {
      events.socketFilled = logees[0];
      if (!wasAllFilled && this.sockets.allFilled) events.allSocketsFilled = true;
    }

    // ─── LE CREUX RÉPOND ──────────────────────────────────────────────────
    //
    // Une demi-seconde après la dépose, et pas avant : la pièce doit avoir fini
    // de tomber, faute de quoi l'on parlerait d'un logement qu'elle est en
    // train de dépasser. Le délai n'est pas qu'une précaution de physique — il
    // fait du refus un événement au lieu d'un clignotement, et il empêche de
    // marteler la touche pour balayer les quatre réponses en trois secondes.
    //
    // Si la pièce trouve son logement entre-temps, la question n'a plus lieu
    // d'être posée : on l'oublie sans rien dire.
    // UNE PIÈCE LANCÉE QUI S'ARRÊTE DANS LE CREUX N'Y ENTRE PAS — et il faut
    // le dire, une fois : le joueur la voit reposer au bon endroit et le jeu se
    // taire, ce qui se lit comme une panne. Le refus doit raconter le monde.
    for (const c of this.carryables.items) {
      if (!c.lancee || c.lanceeDite || c.held || c.locked || !c.grounded) continue;
      if (Math.hypot(c.velocity.x, c.velocity.z) > 1) continue;
      const s = this.sockets.logementQuiAccepterait(c);
      if (!s) continue;
      c.lanceeDite = true;
      events.logementRefuse = { socketId: s.id, carryableId: c.id, raison: 'lancee' };
    }

    if (this.refusEnAttente) {
      const attente = this.refusEnAttente;
      if (logees.some((l) => l.carryableId === attente.id)) {
        this.refusEnAttente = null;
      } else if (--attente.ticks <= 0) {
        this.refusEnAttente = null;
        const c = this.carryables.items.find((x) => x.id === attente.id);
        if (c && !c.held && !c.locked) {
          const r = this.sockets.refusLePlusProche(c);
          if (r) {
            events.logementRefuse = { socketId: r.socket.id, carryableId: c.id, raison: r.raison };
          }
        }
      }
    }

    // --- Objectif --------------------------------------------------------------
    if (!this.goalReached) {
      const g = this.world.level.goal;
      const dx = pl.position.x - g.position[0];
      const dy = pl.position.y - g.position[1];
      const dz = pl.position.z - g.position[2];
      if (dx * dx + dy * dy + dz * dz < g.radius * g.radius) {
        this.goalReached = true;
        events.reachedGoal = true;
      }
    }

    // --- Seuils du hall ---------------------------------------------------------
    // Trois arches, trois destins. On ne teste que la distance horizontale :
    // sauter en franchissant une arche doit compter comme la franchir.
    if (!this.seuilFranchi && this.world.level.seuils) {
      for (const s of this.world.level.seuils) {
        const dx = pl.position.x - s.position[0];
        const dz = pl.position.z - s.position[2];
        if (dx * dx + dz * dz < s.radius * s.radius) {
          this.seuilFranchi = true;
          events.seuil = { mode: s.mode, label: s.label };
          break;
        }
      }
    }

    return events;
  }

  /**
   * Saisir ou reposer, au front montant de la touche.
   *
   * On signale explicitement le refus « trop lourd » : sans ça, la touche
   * resterait sans effet et le joueur croirait à une panne au lieu de
   * comprendre qu'il doit d'abord grandir.
   */
  private handleInteract(pressed: boolean, scale: number, events: TickEvents): void {
    const justPressed = pressed && !this.interactHeld;
    this.interactHeld = pressed;
    if (!justPressed) return;

    // ─── RÉVEILLER UN PINCEAU ────────────────────────────────────────────────
    //
    // Avant les caisses, parce qu'un pinceau endormi n'est pas un objet à
    // ramasser : c'est quelqu'un qu'on rencontre. S'il est là, il a la priorité
    // sur tout le reste — on ne veut pas qu'un caillou traînant à côté vole le
    // geste.
    // La gomme d'un canevas : on efface en appuyant à son pied. Avant le reste,
    // pour la même raison que le levier de rappel — c'est ce qui débloque.
    for (const t of this.world.level.canevas ?? []) {
      if (!surLaGomme(t, this.player.position)) continue;
      events.effacee = { canevas: t.id };
      return;
    }

    // ─── LE LEVIER DE RAPPEL, EN PREMIER ──────────────────────────────────
    //
    // Avant les pinceaux et avant les caisses : c'est le seul geste qui doit
    // marcher même quand tout le reste est bloqué, puisque c'est justement ce
    // qu'il sert à débloquer.
    const rappel = this.world.level.rappel;
    if (rappel) {
      const dx = this.player.position.x - rappel.position[0];
      const dy = this.player.position.y - rappel.position[1];
      const dz = this.player.position.z - rappel.position[2];
      if (dx * dx + dy * dy + dz * dz <= rappel.radius * rappel.radius) {
        this.carryables.reset();
        this.sockets.reset();
        events.rappele = true;
        return;
      }
    }

    for (const v of this.world.level.veilleurs ?? []) {
      if (this.eveilles.has(v.id)) continue;
      const dx = this.player.position.x - v.position[0];
      const dy = this.player.position.y - v.position[1];
      const dz = this.player.position.z - v.position[2];
      if (dx * dx + dy * dy + dz * dz > v.radius * v.radius) continue;

      // L'ÉCHELLE EXIGÉE : c'est elle qui relie le verbe du jeu à son but. Une
      // couleur ne vit pas au bout d'un monde, elle vit à une TAILLE.
      if (this.player.scaleLevel !== v.echelle) {
        events.eveilRefuse = {
          id: v.id,
          trop: this.player.scaleLevel > v.echelle ? 'grand' : 'petit',
        };
        return;
      }
      this.eveilles.add(v.id);
      events.eveil = { id: v.id };
      return;
    }

    const held = this.carryables.held;
    if (held) {
      const placed = this.carryables.placeForDrop(
        held,
        this.world,
        this.player.position,
        this.player.yaw,
        this.player.pitch,
        scale,
      );
      // ET UNE PORTE FERMÉE FAIT MUR À CE QU'ON POSE. Une pièce tenue à bout
      // de bras est souvent DÉJÀ de l'autre côté du plan d'une porte quand on
      // se tient devant — et l'on se tient devant une porte scellée précisément
      // avec la clef dans les mains. Posée là, elle revenait à l'œil du porteur
      // par le rebond de `carryTraversal`, apparaissait dans sa tête et tombait
      // entre ses pieds, où on ne peut plus la viser. Trouvé par la relecture.
      // On refuse comme pour un mur : la pièce reste en main.
      const porteDevant = placed
        ? this.findCrossing(
            this.eyePosition(),
            vec3(held.position.x, held.position.y + held.size * 0.5, held.position.z),
          )
        : null;
      const porteFermee =
        porteDevant !== null &&
        (this.portesFermees.has(porteDevant.face.pairId) ||
          estScelle(porteDevant.face, this.conditionsRemplies) ||
          !pieceFits(porteDevant.face, held.size));
      if (!placed || porteFermee) {
        // On garde la caisse en main plutôt que de la faire surgir n'importe
        // où : un refus clair vaut mieux qu'un objet qui pousse le joueur.
        this.carryables.followCarrier(
          held,
          this.player.position,
          this.player.yaw,
          this.player.pitch,
          scale,
        );
        events.noRoom = true;
        return;
      }
      held.held = false;
      held.lancee = false;
      held.velocity.y = 0;
      held.releasedAt = this.eyePosition();
      events.carry = { id: held.id, taken: false };
      // ON POSE, DONC ON DEMANDE. Reposer une pièce à côté d'un creux est une
      // question, et jusqu'ici elle restait sans réponse. On arme ici le délai
      // au bout duquel le creux dira ce qui cloche — voir `REFUS_DELAI`.
      this.refusEnAttente = { id: held.id, ticks: REFUS_DELAI };
      return;
    }

    const target = this.carryables.targeted(this.player.position, this.player.yaw, scale, this.world);
    // Rien à prendre : la touche d'action ne PEINT plus. On peint au clic,
    // avec le pinceau choisi dans l'inventaire — voir `peindreCeQuOnVise`.
    if (!target) return;

    if (!this.carryables.canLift(target, scale)) {
      events.tooHeavy = { id: target.id };
      return;
    }

    target.held = true;
    target.lancee = false;
    target.lanceeDite = false;
    events.carry = { id: target.id, taken: true };
  }

  /**
   * Traversée des caisses libres.
   *
   * Une caisse lancée dans un portail le franchissait sans rien déclencher :
   * elle passait derrière comme si le plan n'existait pas. Elle subit désormais
   * exactement le même traitement que le joueur — même transformation, même
   * changement de taille — et pour la même raison : ce qu'on voit à travers le
   * portail et ce qui arrive en le traversant doivent obéir à une seule règle.
   *
   * Une caisse trop grosse pour la face, elle, rebondit. C'est la règle qui
   * borne déjà la taille du joueur, appliquée aux objets : on ne fait pas
   * passer un meuble par une chatière.
   */
  /**
   * La porte contre laquelle bute la pièce tenue, s'il y en a une : une face
   * qu'elle ne passe pas (trop grosse, scellée, ou vue de dos), dont elle
   * touche le plan à l'intérieur du cadre. `devant` est la distance de son
   * centre au plan, du côté de l'œil ; `cote`, ce côté.
   */
  private porteQuiRetient(
    c: Carryable,
  ): { face: PortalFace; devant: number; cote: 1 | -1; raison: 'tropGrosse' | 'scellee' | 'dos' } | null {
    const oeil = this.eyePosition();
    const demi = c.size * 0.5;
    const centre = vec3(c.position.x, c.position.y + demi, c.position.z);
    let pire: { face: PortalFace; devant: number; cote: 1 | -1; raison: 'tropGrosse' | 'scellee' | 'dos' } | null = null;
    for (const face of this.faces) {
      const cote: 1 | -1 = signedDistance(face, oeil) >= 0 ? 1 : -1;
      const scellee = this.portesFermees.has(face.pairId) || estScelle(face, this.conditionsRemplies);
      const raison = cote < 0 ? 'dos' : scellee ? 'scellee' : !pieceFits(face, c.size) ? 'tropGrosse' : null;
      if (raison === null) continue;
      const devant = signedDistance(face, centre) * cote;
      if (devant >= demi + 0.02) continue;
      // Et DANS le cadre, élargi de la demi-pièce : à côté d'une porte, c'est
      // un mur, et une pièce tenue traverse les murs comme avant.
      const n = face.normal;
      const lat = Math.hypot(n.x, n.z) || 1;
      const u = ((centre.x - face.position.x) * n.z - (centre.z - face.position.z) * n.x) / lat;
      const v = centre.y - face.position.y;
      if (Math.abs(u) > face.width * 0.5 + demi || v < -demi || v > face.height + demi) continue;
      // L'œil lui-même doit être en face du cadre : une porte loin sur le côté
      // n'a rien à retenir.
      const uo = ((oeil.x - face.position.x) * n.z - (oeil.z - face.position.z) * n.x) / lat;
      if (Math.abs(uo) > face.width * 0.5 + demi + c.size * 4) continue;
      if (!pire || devant < pire.devant) pire = { face, devant, cote, raison };
    }
    return pire;
  }

  private carryTraversal(before: (Vec3 | null)[]): void {
    const items = this.carryables.items;
    for (let i = 0; i < items.length; i++) {
      const c = items[i];
      const from = before[i];
      if (!from || c.held) continue;

      const to = vec3(c.position.x, c.position.y + c.size * 0.5, c.position.z);
      // Par l'avant, elle passe ou bute ; par l'arrière, elle bute toujours —
      // le dos d'une porte fait mur aux pièces comme au joueur.
      const devant = this.findCrossing(from, to);
      const crossing = devant ?? this.findCrossing(from, to, 1, -1);
      if (!crossing) continue;
      const parDerriere = devant === null;

      const face = crossing.face;
      const fits = pieceFits(face, c.size);
      // UNE PORTE SCELLÉE FAIT MUR AUX PIÈCES COMME AU JOUEUR. Elle ne le
      // faisait qu'au joueur : une graine lancée — ou simplement posée — vers
      // la sortie scellée du grain passait de l'autre côté, dans une salle où
      // l'on ne pouvait pas encore aller, et le mouvement tout entier était
      // mort. Trouvé par la relecture, dans la salle qui suit précisément
      // celle où l'on apprend à lancer sa pièce à travers une porte.
      const scellee = this.portesFermees.has(face.pairId) || estScelle(face, this.conditionsRemplies);

      if (!fits || scellee || parDerriere) {
        // Elle s'arrête DEVANT le plan, là où elle l'a touché — pas à son
        // point de départ, qui est l'œil du porteur quand on vient de la
        // lâcher : elle apparaissait dans sa tête et tombait entre ses pieds.
        // Vue de derrière, la normale est l'autre : on repart d'où l'on vient.
        const n = parDerriere
          ? vec3(-face.normal.x, -face.normal.y, -face.normal.z)
          : face.normal;
        const recul = c.size * 0.5 + 0.02;
        const t = crossing.t;
        c.position.x = from.x + (to.x - from.x) * t + n.x * recul;
        c.position.y = from.y + (to.y - from.y) * t + n.y * recul - c.size * 0.5;
        c.position.z = from.z + (to.z - from.z) * t + n.z * recul;
        const along = c.velocity.x * n.x + c.velocity.y * n.y + c.velocity.z * n.z;
        if (along < 0) {
          // Rebond amorti sur la face, plutôt qu'un arrêt sec.
          c.velocity.x -= n.x * along * 1.4;
          c.velocity.y -= n.y * along * 1.4;
          c.velocity.z -= n.z * along * 1.4;
        }
        continue;
      }

      const s = traversalScale(face);
      const newCenter = transformPoint(face, to);
      const newVel = transformVector(face, c.velocity, true);
      c.size *= s;
      // Lancée à travers un miroir, elle change de main comme si on l'y avait
      // portée. Rien ne justifierait qu'un objet jeté échappe à la géométrie.
      tournerAvecLaPorte(c, face);
      c.position.x = newCenter.x;
      c.position.z = newCenter.z;
      // ═══════════════════════════════════════════════════════════════════
      // ON NE RESSORT JAMAIS DANS LE PLANCHER DE L'AUTRE CÔTÉ.
      //
      // Une face est plantée quelques centimètres au-dessus de son sol — deux
      // plans confondus grésillent. Une pièce qui GLISSE au sol à travers une
      // petite face a donc son centre un peu au-dessus du seuil ; multiplié
      // par quatre, cet écart met le bas de la pièce dans le plancher de
      // l'autre côté. La dépénétration par axe faisait le reste : au premier
      // pas horizontal, elle résolvait le chevauchement avec la DALLE le long
      // de cet axe et catapultait la pièce au bord du monde, d'où elle
      // retraversait la porte à l'envers. Trouvé par le pilote du
      // blanchiment, qui voyait sa vrille ressortir de la bonne taille et de
      // la même main, trente mètres plus loin.
      //
      // On bornait au « seuil de la jumelle moins cinq centimètres », et
      // c'était juste pour les faces plantées à cinq centimètres — pas pour
      // celles de la rive (un), du lavoir (six millimètres) ni de l'atelier
      // (SOUS son sol). La relecture a revu la catapulte sur la rive. La
      // borne est donc maintenant la vraie : le dessus du plancher que la
      // pièce chevauche, quel que soit l'endroit où la face a été plantée.
      // Le joueur subit le même écart et son corps le rattrape ; une pièce
      // n'a pas de corps, alors on la pose au ras du sol, jamais dedans.
      // ═══════════════════════════════════════════════════════════════════
      c.position.y = newCenter.y - c.size * 0.5;
      c.position.y = this.world.dessusDuSol(aabbOfCarryable(c, seuilScratch), c.size * 0.5);
      c.velocity.x = newVel.x;
      c.velocity.y = newVel.y;
      c.velocity.z = newVel.z;
    }
  }

  /**
   * Lancer au clic — SAUF si l'on tient un stylo, auquel cas on trace.
   *
   * C'est le seul objet du jeu qui change ce que fait un bouton, et c'est
   * assumé : on tient un stylo comme on tient une arme dans un jeu de tir, et
   * personne n'a jamais eu besoin qu'on lui explique à quoi sert la gâchette.
   *
   * Et le trait se pose EN CONTINU tant qu'on appuie, contrairement au lancer
   * qui n'obéit qu'au front montant : on ne dessine pas par clics, on dessine
   * en promenant la main.
   */
  private handleThrow(pressed: boolean, scale: number, events: TickEvents): void {
    const justPressed = pressed && !this.throwHeld;
    this.throwHeld = pressed;

    const stylo = this.carryables.held;
    if (pressed && stylo?.encre) {
      const impact = viser(
        this.world.level.canevas ?? [],
        this.eyePosition(),
        this.player.yaw,
        this.player.pitch,
        scale,
        stylo.size,
      );
      if (impact) events.trace = { ...impact, encre: stylo.encre };
      return;
    }

    if (!justPressed) return;

    const held = this.carryables.held;
    if (!held) {
      // MAINS VIDES, LE CLIC PEINT. Voir `peindreCeQuOnVise`.
      this.peindreCeQuOnVise(scale, events);
      return;
    }
    held.releasedAt = this.eyePosition();
    this.carryables.throwIt(held, this.player.yaw, this.player.pitch, scale);
    events.thrown = { id: held.id };
  }

  /**
   * La portée du pinceau, en mètres à taille d'homme : on peint ce qu'on
   * atteint, et l'on atteint quatre fois plus loin à ×4. C'est ce qui garde
   * un sens aux voyages de taille dans les ateliers — un homme ne touche pas
   * les tuiles d'un toit, un géant si — sans plus jamais interdire un geste
   * qu'on ne comprend pas.
   */
  static readonly PORTEE_PINCEAU = 10;

  /**
   * Ce que le regard désigne : la première boîte VISIBLE du décor sur le
   * rayon de l'œil — le verre ne se peint pas, il se traverse. Rend son rang,
   * sa distance et si elle est à portée du pinceau. Sert au clic, et au rendu
   * pour teinter le viseur.
   */
  viserPeinture(): { index: number; distance: number; aPortee: boolean } | null {
    const scale = this.scale;
    const o = this.eyePosition();
    const d = lookDirection(this.player.yaw, this.player.pitch);
    const loin = Simulation.PORTEE_PINCEAU * scale * 4;
    let meilleur = -1;
    let tMin = loin;
    const boxes = this.world.level.boxes;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.invisible) continue;
      let t0 = 0;
      let t1 = tMin;
      for (let a = 0; a < 3 && t0 <= t1; a++) {
        const oa = a === 0 ? o.x : a === 1 ? o.y : o.z;
        const da = a === 0 ? d.x : a === 1 ? d.y : d.z;
        const mn = b.min[a];
        const mx = b.max[a];
        if (Math.abs(da) < 1e-9) {
          if (oa < mn || oa > mx) t0 = t1 + 1;
          continue;
        }
        let ta = (mn - oa) / da;
        let tb = (mx - oa) / da;
        if (ta > tb) [ta, tb] = [tb, ta];
        if (ta > t0) t0 = ta;
        if (tb < t1) t1 = tb;
      }
      // Un œil DANS une boîte (un géant la tête dans un plafond bas) ne la
      // peint pas : on veut ce qu'on voit, pas ce dans quoi l'on est.
      if (t0 <= t1 && t0 > 1e-4 && t0 < tMin) {
        tMin = t0;
        meilleur = i;
      }
    }
    if (meilleur < 0) return null;
    // UNE PORTE ARRÊTE LE PINCEAU. On y voit un autre lieu, mais le rayon, lui,
    // continuerait tout droit dans celui-ci et peindrait ce qui est derrière
    // le cadre — une chose qu'on ne voit pas. On ne peint pas à travers.
    for (const f of this.faces) {
      const n = f.normal;
      const den = d.x * n.x + d.y * n.y + d.z * n.z;
      if (Math.abs(den) < 1e-6) continue;
      const t = ((f.position.x - o.x) * n.x + (f.position.y - o.y) * n.y + (f.position.z - o.z) * n.z) / den;
      if (t <= 0 || t >= tMin) continue;
      const px = o.x + d.x * t - f.position.x;
      const py = o.y + d.y * t - f.position.y;
      const pz = o.z + d.z * t - f.position.z;
      // La droite de la face est horizontale et perpendiculaire à sa normale.
      const lateral = (px * n.z - pz * n.x) / Math.max(1e-9, Math.hypot(n.x, n.z));
      if (Math.abs(lateral) <= f.width / 2 && py >= 0 && py <= f.height) return null;
    }
    return { index: meilleur, distance: tMin, aPortee: tMin <= Simulation.PORTEE_PINCEAU * scale };
  }

  /**
   * MAINS VIDES, LE CLIC PEINT ce qu'on vise avec le pinceau choisi. Une boîte
   * d'une famille peint toute la famille — et c'est là qu'un tableau se
   * satisfait, par le même geste que tout le reste. L'eau lave.
   */
  private peindreCeQuOnVise(_scale: number, events: TickEvents): void {
    const pinceau = this.pinceauTenu;
    if (pinceau === null) return;
    const vise = this.viserPeinture();
    if (!vise) return;
    if (!vise.aPortee) {
      events.peintureTropLoin = { index: vise.index };
      return;
    }
    const famille = this.world.level.boxes[vise.index].famille;
    if (famille) {
      if (pinceau === 'eau') this.familles.laver(famille);
      else this.familles.peindre(famille, pinceau);
      events.peinte = { famille, pigment: pinceau, index: vise.index };
      const neufs = this.familles.verifier();
      if (neufs.length > 0) events.tableauSatisfait = { id: neufs[0] };
      return;
    }
    if (pinceau === 'eau') this.peintures.delete(vise.index);
    else this.peintures.set(vise.index, pinceau);
    events.boitePeinte = { index: vise.index, pigment: pinceau };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * TOURNER LA PIÈCE QU'ON TIENT — par quarts de tour, et c'est tout.
   *
   * Deux gestes, parce qu'ils ne servent pas à la même chose :
   *
   *   LA MOLETTE passe EN REVUE. Chaque cran est un quart de tour autour d'un
   *   axe du monde, dans un ordre qui visite les vingt-quatre orientations
   *   d'un cube avant de revenir au départ : « yyyxyxyzyxyx », deux fois. On
   *   l'a cherché : avec la verticale et un seul axe couché, aucun ordre ne
   *   passe une fois et une seule par chacune — il en faut trois. C'est le
   *   geste de la leçon : avec la mauvaise main, on les essaie toutes, et
   *   aucune n'épouse le dessin.
   *
   *   LES FLÈCHES tournent À VOLONTÉ, par rapport à ce qu'on voit : gauche et
   *   droite autour de la verticale, haut et bas en basculant la pièce vers
   *   l'avant ou vers soi — autour de l'axe du monde le plus proche de la
   *   droite du joueur, pour que le quart de tour reste exact.
   *
   * L'orientation vit dans le monde, pas dans la main : se retourner en tenant
   * la pièce ne la tourne pas, et c'est ce qui permet de la comparer au
   * dessin du creux en tournant autour.
   * ═══════════════════════════════════════════════════════════════════════
   */
  private tournerLaPiece(input: InputCommand, events: TickEvents): void {
    const c = this.carryables.held;
    const crans = input.tourner ?? 0;
    // MAINS VIDES, la molette et les chiffres choisissent le pinceau.
    if (!c) {
      const liste = this.pinceaux;
      if (liste.length === 0) return;
      let i = Math.max(0, liste.indexOf(this.pinceau ?? ''));
      if (input.choisir !== undefined && input.choisir >= 1 && input.choisir <= liste.length) i = input.choisir - 1;
      else if (crans !== 0) i = (((i + crans) % liste.length) + liste.length) % liste.length;
      else return;
      if (liste[i] !== this.pinceau) {
        this.pinceau = liste[i];
        events.pinceauChoisi = { pinceau: this.pinceau };
      }
      return;
    }
    const lacet = input.quartLacet ?? 0;
    const bascule = input.quartBascule ?? 0;
    if (!c || (crans === 0 && lacet === 0 && bascule === 0)) return;

    let R = eulerVersMat(c.rotation);
    // On part d'un quart de tour exact : les angles d'Euler portent un peu de
    // bruit, et il ne doit pas s'accumuler cran après cran.
    R = R.map((v) => (Math.abs(v - Math.round(v)) < 0.02 ? Math.round(v) : v)) as Mat3;

    for (let i = 0; i < Math.abs(crans); i++) {
      if (crans > 0) {
        R = mulMat(quartDeTour(TOUR_DE_MOLETTE[c.tour % 12], 1), R);
        c.tour = (c.tour + 1) % 24;
      } else {
        c.tour = (c.tour + 23) % 24;
        R = mulMat(quartDeTour(TOUR_DE_MOLETTE[c.tour % 12], -1), R);
      }
    }
    for (let i = 0; i < Math.abs(lacet); i++) R = mulMat(quartDeTour('y', lacet > 0 ? 1 : -1), R);
    if (bascule !== 0) {
      // L'axe couché le plus proche de la droite du joueur, orienté pour que
      // le haut de la pièce parte vers l'avant.
      const f = yawToForward(this.player.yaw);
      const [axe, sens]: ['x' | 'z', 1 | -1] =
        Math.abs(f.z) >= Math.abs(f.x) ? ['x', f.z >= 0 ? 1 : -1] : ['z', f.x >= 0 ? -1 : 1];
      for (let i = 0; i < Math.abs(bascule); i++) {
        R = mulMat(quartDeTour(axe, (bascule > 0 ? sens : -sens) as 1 | -1), R);
      }
    }

    const r = matVersEuler(R);
    c.rotation.x = r.x;
    c.rotation.y = r.y;
    c.rotation.z = r.z;
    c.tourne++;
    events.tourne = { id: c.id };
  }

  /**
   * Première face franchie par le segment [from → to], de l'avant vers
   * l'arrière — ou, avec `sens` à −1, de l'arrière vers l'avant : c'est le
   * dos de la porte, et l'on ne le franchit pas, on s'y cogne.
   */
  private findCrossing(
    from: Vec3,
    to: Vec3,
    hauteurs = 1,
    sens: 1 | -1 = 1,
  ): { face: PortalFace; t: number } | null {
    let best: { face: PortalFace; t: number } | null = null;
    for (const face of this.faces) {
      const d0 = signedDistance(face, from) * sens;
      const d1 = signedDistance(face, to) * sens;
      if (d0 <= 0 || d1 > 0) continue; // pas de franchissement dans ce sens
      const t = d0 / (d0 - d1);
      if (!withinFaceRect(face, from, to, t, hauteurs)) continue;
      if (!best || t < best.t) best = { face, t };
    }
    return best;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LE DOS D'UNE PORTE FAIT MUR.
   *
   * On ne franchit une porte que par sa face avant ; par l'arrière, rien ne
   * se passait — on traversait le cadre comme un fantôme, on se retrouvait
   * devant, et l'on franchissait en revenant. Toutes les portes plantées en
   * plein air en souffraient, et la montée en compte une douzaine. Signalé
   * en jouant : « on traverse les portails par derrière ».
   *
   * La règle est celle d'une feuille tendue dans un cadre : de derrière, on
   * s'y cogne. Un mur À SENS UNIQUE, tout de même : on n'interdit que de se
   * RAPPROCHER du plan en venant de derrière, dans l'emprise du rectangle,
   * corps compris ; s'en écarter, ou en sortir par le côté, reste libre —
   * personne ne reste coincé contre une porte.
   *
   * Et personne n'arrive par là : qui franchit une porte ressort DEVANT sa
   * jumelle, à la distance exacte où il a dépassé le plan (voir
   * `transformPoint` — c'est ce qui rend le passage continu à l'œil). Le dos
   * d'une porte n'est donc jamais franchi par personne, dans aucun sens.
   * ═══════════════════════════════════════════════════════════════════════
   */
  private dosDesPortes(prev: Vec3, scale: number): PortalFace | null {
    const pl = this.player;
    const r = PLAYER_RADIUS * scale;
    const h = PLAYER_HEIGHT * scale;
    let bute: PortalFace | null = null;
    for (const face of this.faces) {
      const d0 = signedDistance(face, prev);
      if (d0 >= 0) continue;
      const d1 = signedDistance(face, pl.position);
      if (d1 <= d0 || d1 <= -r) continue;
      const local = rotateY(
        vec3(pl.position.x - face.position.x, pl.position.y - face.position.y, pl.position.z - face.position.z),
        -face.yaw,
      );
      if (Math.abs(local.x) > face.width * 0.5 + r) continue;
      if (local.y + h < 0 || local.y > face.height) continue;
      // On garde la distance d'avant, ou l'on s'arrête le corps contre le
      // plan si l'on venait de plus loin.
      const cible = Math.max(d0, -r);
      const n = face.normal;
      // On ne le dit que si l'on poussait vraiment dessus : un joueur qui
      // frôle le plan par-derrière n'a pas besoin qu'on lui parle.
      if (d1 - cible > 1e-4) bute = face;
      pl.position.x -= n.x * (d1 - cible);
      pl.position.z -= n.z * (d1 - cible);
      const along = pl.velocity.x * n.x + pl.velocity.z * n.z;
      if (along > 0) {
        pl.velocity.x -= n.x * along;
        pl.velocity.z -= n.z * along;
      }
    }
    return bute;
  }

  private teleport(face: PortalFace, eye: Vec3, nextLevel: number): void {
    const pl = this.player;
    const newEye = transformPoint(face, eye);
    const newVel = transformVector(face, pl.velocity, true);
    const newScale = scaleOfLevel(nextLevel);

    pl.scaleLevel = nextLevel;
    // UN MIROIR CHANGE LA MAIN DU MONDE. Voir `PlayerState.gauchere`.
    if (face.miroir === true) pl.gauchere = !pl.gauchere;
    // On repasse des yeux aux pieds, avec la NOUVELLE taille. Comme la hauteur
    // d'œil est proportionnelle à la taille, un joueur posé au sol devant une
    // face ressort exactement posé au sol devant l'autre.
    pl.position.x = newEye.x;
    pl.position.y = newEye.y - PLAYER_HEIGHT * EYE_FRACTION * newScale;
    pl.position.z = newEye.z;
    pl.velocity.x = newVel.x;
    pl.velocity.y = newVel.y;
    pl.velocity.z = newVel.z;
    // LE CAP SE DÉDUIT DU REGARD TRANSPORTÉ, il ne s'additionne pas.
    //
    // Pour une porte ordinaire, ajouter `yawDelta` revient au même — mais une
    // porte miroir est une RÉFLEXION, et une réflexion ne correspond à aucun
    // angle de rotation : il n'y a rien à additionner. En transportant le
    // vecteur du regard puis en relisant sa direction, les deux cas se traitent
    // de la même façon, et c'est le miroir qui dicte la forme la plus générale.
    const regard = transformVector(face, yawToForward(pl.yaw), false);
    pl.yaw = Math.atan2(regard.x, regard.z);
    pl.grounded = false;
    // ARRIVÉ DANS LA PIERRE, ON EN SORT PAR LE DESSUS, une fois, tout de suite.
    // Une face est plantée à quelques centimètres de son sol, et cet écart ne
    // suit pas la taille : un joueur minuscule ressortait entier dans
    // l'estrade d'arrivée, l'œil dans la pierre. On le repose sur ce qui le
    // contient si c'est à moins de sa propre hauteur (au moins celle d'un
    // homme) et que la place est libre — voir `reposerSurLeSol`.
    reposerSurLeSol(this.world, pl.position, newScale, PLAYER_HEIGHT * Math.max(newScale, 1));
    this.apresPorte = true;

    // La caisse portée subit exactement le même sort que son porteur. C'est
    // toute la mécanique : elle ressort quatre fois plus grande, ou quatre fois
    // plus petite, et garde ensuite cette taille une fois posée.
    const held = this.carryables.held;
    if (held) {
      held.size *= traversalScale(face);
      // ═══════════════════════════════════════════════════════════════════
      // CE QU'ON PORTE SE RÉFLÉCHIT AVEC SOI, ET C'EST LA RÈGLE JUSTE.
      //
      // Elle a été écrite dans les deux sens, et le second était faux. On a
      // d'abord retourné la pièce portée ; puis, quand le monde s'est mis à
      // basculer avec le joueur, on a cessé de la retourner — « leur écart
      // reste nul, donc rien ne change ». L'écart entre la pièce et son
      // porteur reste nul, c'est vrai. Mais `main` n'est pas mesurée par
      // rapport au porteur : elle est mesurée dans le monde, comme celle du
      // creux qui l'attend. Et dans le monde, une pièce qui traverse un miroir
      // est réfléchie, qu'on la tienne ou qu'on la lance — c'est la géométrie,
      // elle ne regarde pas qui la porte.
      //
      // La preuve était sous les yeux du joueur : à l'écran, la pièce portée
      // CHANGEAIT DE FORME en franchissant le miroir. La caméra devient
      // gauchère et dessine tout en image miroir ; une pièce dont la main
      // n'avait pas bougé apparaissait donc retournée, seule dans un monde qui
      // avait basculé avec le joueur. Signalé : « la forme change toute seule
      // alors qu'elle devrait ne pas changer — on passe d'un monde de main
      // gauche à un monde de main droite. » Exactement : c'est le monde qui
      // doit paraître retourné, et la pièce tenue rester la même. Réfléchie
      // dans le monde et vue par une caméra réfléchie, elle garde sa forme.
      //
      // Conséquence sur l'énigme, et elle est plus simple : porter une pièce à
      // travers un miroir suffit à la retourner par rapport au creux. Le
      // lancer la retourne aussi (voir `carryTraversal`), sans qu'on ait à
      // passer soi-même.
      //
      // ET ELLE TOURNE AVEC SOI. Sa main bascule, mais une main retournée
      // sur son propre axe n'est pas encore la réflexion que le monde a
      // subie : il manque un demi-tour, ou un quart, selon la porte. Sans
      // lui, la vrille tenue se présentait à l'envers en ressortant du
      // miroir — signalé : « celui-ci change d'orientation ». Voir
      // `transporterRotation`.
      // ═══════════════════════════════════════════════════════════════════
      tournerAvecLaPorte(held, face);
      this.carryables.followCarrier(held, pl.position, pl.yaw, pl.pitch, newScale);
    }
  }
}
