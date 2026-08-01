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
  SPRINT_MULTIPLIER,
  scaleOfLevel,
} from './constants.js';
import { Carryables } from './carryables.js';
import { Sockets } from './sockets.js';
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
  /** Pinceaux déjà réveillés : on ne les réveille pas deux fois. */
  readonly eveilles = new Set<string>();

  /** Front montant de la touche d'action : on saisit au clic, pas en continu. */
  private interactHeld = false;
  private throwHeld = false;

  constructor(level: LevelDef) {
    this.world = new World(level);
    this.faces = buildFaces(level.portals);
    this.carryables = new Carryables(level.carryables);
    this.sockets = new Sockets(level.sockets);
    this.player = this.spawnState();
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
    };
  }

  reset(): void {
    this.player = this.spawnState();
    this.carryables.reset();
    this.sockets.reset();
    this.goalReached = false;
    this.seuilFranchi = false;
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
    const sprint = input.sprint ? SPRINT_MULTIPLIER : 1;
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
        this.portesFermees.has(face.pairId) || estScelle(face, this.sockets.pourvus)
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
        events.refused = { pairId: face.pairId, face: face.kind, reason };
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
    const logees = this.sockets.settle(this.carryables.items);
    if (logees.length > 0) {
      events.socketFilled = logees[0];
      if (!wasAllFilled && this.sockets.allFilled) events.allSocketsFilled = true;
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
      return;
    }

    const target = this.carryables.targeted(this.player.position, this.player.yaw, scale);
    if (!target) return;

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

  /** Lancer au clic. Front montant, comme la saisie. */
  private handleThrow(pressed: boolean, scale: number, events: TickEvents): void {
    const justPressed = pressed && !this.throwHeld;
    this.throwHeld = pressed;
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
      retournerLaMain(held, face);
      this.carryables.followCarrier(held, pl.position, pl.yaw, pl.pitch, newScale);
    }
  }
}
