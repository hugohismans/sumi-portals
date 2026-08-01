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
import { clamp, rotateY, vec3, wrapAngle, yawToForward, type Vec3 } from './math.js';
import { moveAndCollide } from './physics.js';
import {
  buildFaces,
  canPass,
  signedDistance,
  transformPoint,
  transformVector,
  traversalLevelDelta,
  withinFaceRect,
  yawDelta,
  type PortalFace,
} from './portals.js';
import type { InputCommand, LevelDef, PlayerState, TickEvents } from './types.js';
import { World } from './world.js';

/**
 * La simulation. Aucun import Three.js dans ce fichier ni dans ses dépendances :
 * cette classe doit pouvoir tourner dans Node pour un serveur autoritaire, avec
 * les clients qui prédisent localement et se réconcilient.
 */
export class Simulation {
  readonly world: World;
  readonly faces: PortalFace[];
  player: PlayerState;
  goalReached = false;

  constructor(level: LevelDef) {
    this.world = new World(level);
    this.faces = buildFaces(level.portals);
    this.player = this.spawnState();
  }

  private spawnState(): PlayerState {
    const s = this.world.level.spawn;
    return {
      position: vec3(s[0], s[1], s[2]),
      velocity: vec3(0, 0, 0),
      yaw: this.world.level.spawnYaw,
      pitch: 0,
      scaleLevel: 0,
      grounded: false,
    };
  }

  reset(): void {
    this.player = this.spawnState();
    this.goalReached = false;
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
      const reason: 'tooBig' | 'scaleLimit' | null = !canPass(face, scale)
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

    return events;
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
    pl.yaw = wrapAngle(pl.yaw + yawDelta(face));
    pl.grounded = false;
  }
}
