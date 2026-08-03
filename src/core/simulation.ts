import {
  AIR_CONTROL,
  EYE_FRACTION,
  GRAVITY,
  GROUND_FRICTION,
  JUMP_SPEED,
  MOVE_SPEED,
  PLAYER_HEIGHT,
  SCALE_MAX_LEVEL,
  SCALE_MIN_LEVEL,
  SPRINT_EN_L_AIR,
  SPRINT_MULTIPLIER,
  scaleOfLevel,
} from './constants.js';
import { Carryables } from './carryables.js';
import { Sockets } from './sockets.js';
import { Familles } from './familles.js';
import { surLaGomme, viser } from './canevas.js';
import { clamp, rotateY, vec3, wrapAngle, yawToForward, type Vec3 } from './math.js';
import { moveAndCollide } from './physics.js';
import {
  buildFaces,
  canPass,
  estScelle,
  signedDistance,
  transformPoint,
  transformVector,
  traversalLevelDelta,
  traversalScale,
  withinFaceRect,

  type PortalFace,
} from './portals.js';
import type { InputCommand, LevelDef, PlayerState, TickEvents } from './types.js';
import { World } from './world.js';
import type { Carryable } from './carryables.js';

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

const retournerLaMain = (c: Carryable, face: PortalFace): void => {
  if (!face.miroir || c.main === undefined) return;
  c.main = c.main === 'L' ? 'D' : 'L';
};

/**
 * La simulation. Aucun import Three.js dans ce fichier ni dans ses dépendances :
 * cette classe doit pouvoir tourner dans Node pour un serveur autoritaire, avec
 * les clients qui prédisent localement et se réconcilient.
 */
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
  private dernierAppui: { x: number; y: number; z: number } | null = null;
  private appuiEchelle = 0;
  private depuisAppui = 0;
  /** Pinceaux déjà réveillés : on ne les réveille pas deux fois. */
  readonly eveilles = new Set<string>();
  /**
   * Les familles de couleur et les tableaux qui les jugent. Voir
   * `src/core/familles.ts` — la loi tient en dix mots : on ne peint que ce
   * qu'on pourrait tenir.
   */
  readonly familles: Familles;
  /**
   * La couleur que le joueur SAIT DIRE en ce moment : celle de la fée qui
   * l'accompagne. Posée de l'extérieur, parce que les pigments rapportés
   * vivent du côté du rendu — ici on ne connaît que la règle, pas l'inventaire.
   *
   * Une fée ne porte que sa couleur. Ce n'est pas « tu as la clé rouge »,
   * c'est « tu as le rouge, donc le rouge est ce que tu sais dire ».
   */
  couleurEnMain: string | null = null;

  /** Front montant de la touche d'action : on saisit au clic, pas en continu. */
  private interactHeld = false;
  private throwHeld = false;

  constructor(level: LevelDef) {
    this.world = new World(level);
    this.faces = buildFaces(level.portals);
    this.carryables = new Carryables(level.carryables);
    this.sockets = new Sockets(level.sockets);
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
  private scellerLesPortesADessiner(): void {
    this.portesFermees.clear();
    this.refusEnAttente = null;
    this.dernierAppui = null;
    this.depuisAppui = 0;
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
    );
    pl.grounded = move.grounded;

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
    if (pl.grounded && ++this.depuisAppui > 12) {
      this.depuisAppui = 0;
      this.dernierAppui = { x: pl.position.x, y: pl.position.y, z: pl.position.z };
      this.appuiEchelle = pl.scaleLevel;
    }
    if (pl.position.y < this.world.plancher - 20 * scale) {
      const retour = this.dernierAppui;
      if (retour) {
        pl.position.x = retour.x;
        pl.position.y = retour.y;
        pl.position.z = retour.z;
        pl.scaleLevel = this.appuiEchelle;
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
    }

    // --- Caisses : suivi du porteur, puis chute des autres ----------------------
    const held = this.carryables.held;
    if (held) {
      this.carryables.followCarrier(held, pl.position, pl.yaw, pl.pitch, this.scale);
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
      if (!placed) {
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
    if (!target) {
      // ─── RIEN À PRENDRE : ALORS PEUT-ÊTRE À PEINDRE ───────────────────
      //
      // La même touche que réveiller, prendre et poser. C'est délibéré : une
      // commande de plus pour peindre serait une commande de plus à apprendre,
      // et désigner un objet à travers la pièce serait une visée — donc
      // quelque chose de pénible au doigt sur un téléphone.
      const famille = this.familles.visee(this.player.position, this.player.yaw, scale);
      if (!famille || this.couleurEnMain === null) return;
      if (!this.familles.peignable(famille, scale)) {
        // Le refus est une leçon, pas une panne : c'est le seuil du « trop
        // lourd », déjà connu, et il enseigne en une seconde que la palette
        // dépend de la taille qu'on a.
        events.peintureRefusee = { famille };
        return;
      }
      this.familles.peindre(famille, this.couleurEnMain);
      events.peinte = { famille, pigment: this.couleurEnMain };
      const neufs = this.familles.verifier();
      if (neufs.length > 0) events.tableauSatisfait = { id: neufs[0] };
      return;
    }

    if (!this.carryables.canLift(target, scale)) {
      events.tooHeavy = { id: target.id };
      return;
    }

    target.held = true;
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
  private carryTraversal(before: (Vec3 | null)[]): void {
    const items = this.carryables.items;
    for (let i = 0; i < items.length; i++) {
      const c = items[i];
      const from = before[i];
      if (!from || c.held) continue;

      const to = vec3(c.position.x, c.position.y + c.size * 0.5, c.position.z);
      const crossing = this.findCrossing(from, to);
      if (!crossing) continue;

      const face = crossing.face;
      const fits = c.size <= face.height * 0.96 && c.size <= face.width * 0.9;

      if (!fits) {
        c.position.x = from.x;
        c.position.y = from.y - c.size * 0.5;
        c.position.z = from.z;
        const n = face.normal;
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
      retournerLaMain(c, face);
      c.position.x = newCenter.x;
      c.position.y = newCenter.y - c.size * 0.5;
      c.position.z = newCenter.z;
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
    if (!held) return;
    held.releasedAt = this.eyePosition();
    this.carryables.throwIt(held, this.player.yaw, this.player.pitch, scale);
    events.thrown = { id: held.id };
  }

  /** Première face franchie par le segment [from → to], de l'avant vers l'arrière. */
  private findCrossing(from: Vec3, to: Vec3): { face: PortalFace; t: number } | null {
    let best: { face: PortalFace; t: number } | null = null;
    for (const face of this.faces) {
      const d0 = signedDistance(face, from);
      const d1 = signedDistance(face, to);
      if (d0 <= 0 || d1 > 0) continue; // pas de franchissement avant → arrière
      const t = d0 / (d0 - d1);
      if (!withinFaceRect(face, from, to, t)) continue;
      if (!best || t < best.t) best = { face, t };
    }
    return best;
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

    // La caisse portée subit exactement le même sort que son porteur. C'est
    // toute la mécanique : elle ressort quatre fois plus grande, ou quatre fois
    // plus petite, et garde ensuite cette taille une fois posée.
    const held = this.carryables.held;
    if (held) {
      held.size *= traversalScale(face);
      // ═══════════════════════════════════════════════════════════════════
      // CE QU'ON PORTE NE SE RETOURNE PAS, ET C'EST LA RÈGLE JUSTE.
      //
      // Il se retournait, et c'était un mensonge — mis au jour par le joueur en
      // une phrase : « si le monde change de forme, la serrure a changé de
      // forme aussi ; donc porter la pièce à travers ne change rien. »
      //
      // Il a raison, et c'est de la physique élémentaire : depuis qu'un miroir
      // bascule le MONDE et pas seulement l'objet, celui qu'on tient subit
      // exactement la même réflexion que soi. Leur écart reste nul. Prétendre
      // qu'il a tourné serait faire dire au jeu le contraire de ce qu'il montre.
      //
      // LA SEULE FAÇON DE RETOURNER UNE PIÈCE EST DONC DE LA LANCER À TRAVERS
      // ET DE LA RATTRAPER DE L'AUTRE CÔTÉ. Elle se réfléchit, on ne se
      // réfléchit pas, et l'écart devient réel — et visible, ce qui n'était
      // jamais le cas avant. Le lancer, qui n'avait qu'un usage décoratif,
      // devient le geste central de la chiralité.
      //
      // La bascule d'un objet LANCÉ est intacte : voir `carryTraversal`.
      // ═══════════════════════════════════════════════════════════════════
      this.carryables.followCarrier(held, pl.position, pl.yaw, pl.pitch, newScale);
    }
  }
}
