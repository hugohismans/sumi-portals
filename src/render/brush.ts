import * as THREE from 'three';
import type { PlayerState } from '../core/types.js';
import { INK } from './ink.js';

/**
 * LE PINCEAU — le guide du monde.
 *
 * Il ne parle pas, ne montre rien du doigt, n'attend jamais. Il file au loin en
 * laissant une traînée d'encre qui s'efface, et disparaît. Au joueur d'en tirer
 * quelque chose.
 *
 * C'est le seul guide que ce jeu s'autorise, et il explique le monde au lieu
 * de le commenter : si tout est tracé à l'encre ici, c'est que quelque chose
 * le dessine — et de temps en temps, on l'aperçoit.
 *
 * LA RÈGLE QUI COMPTE LE PLUS : **il ne vient que si l'on est perdu.** Pas sur
 * minuterie. Le jeu mesure si le joueur se rapproche du prochain jalon ; tant
 * qu'il progresse, le pinceau reste invisible. Un joueur qui trouve seul ne le
 * verra jamais de la partie, et c'est un respect qu'on lui doit.
 */

/** Sans progrès pendant ce temps, le joueur est considéré comme perdu. */
const PATIENCE = 17;

/** Durée d'un passage, en secondes. */
const FLIGHT = 3.4;

/** Un progrès plus petit que ça ne compte pas : on tourne en rond. */
const PROGRESS_EPSILON = 2;

/** Longueur de la traînée, en échantillons. */
const TRAIL = 48;

interface Sample {
  x: number;
  y: number;
  z: number;
  age: number;
}

export class Brush {
  readonly group = new THREE.Group();

  private readonly waypoints: THREE.Vector3[] = [];
  private readonly head: THREE.Mesh;
  private readonly ribbon: THREE.Mesh;
  private readonly ribbonGeo = new THREE.BufferGeometry();
  private readonly positions: Float32Array;
  private readonly ages: Float32Array;

  private samples: Sample[] = [];
  private flying = 0;
  private idle = 0;
  private bestDistance = Infinity;
  private target = 0;

  private readonly from = new THREE.Vector3();
  private readonly to = new THREE.Vector3();
  private readonly arc = new THREE.Vector3();
  private readonly prev = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();

  constructor(points: [number, number, number][] = []) {
    for (const p of points) this.waypoints.push(new THREE.Vector3(p[0], p[1], p[2]));

    // La tête : une pointe effilée, sombre. Volontairement minuscule — on doit
    // l'apercevoir, pas la contempler.
    this.head = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.9, 5),
      new THREE.MeshBasicMaterial({ color: INK }),
    );
    this.head.frustumCulled = false;

    // La traînée : un ruban tourné vers la caméra, qui s'affine et s'efface en
    // vieillissant. C'est un coup de pinceau, donc il doit mourir par la queue.
    this.positions = new Float32Array(TRAIL * 2 * 3);
    this.ages = new Float32Array(TRAIL * 2);
    this.ribbonGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.ribbonGeo.setAttribute('aAge', new THREE.BufferAttribute(this.ages, 1));
    const index: number[] = [];
    for (let i = 0; i < TRAIL - 1; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.ribbonGeo.setIndex(index);

    this.ribbon = new THREE.Mesh(
      this.ribbonGeo,
      new THREE.ShaderMaterial({
        uniforms: { uInk: { value: INK } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader: /* glsl */ `
          attribute float aAge;
          varying float vAge;
          void main() {
            vAge = aAge;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uInk;
          varying float vAge;
          void main() {
            // L'encre sèche vite : elle pâlit puis disparaît.
            float a = 1.0 - clamp(vAge, 0.0, 1.0);
            gl_FragColor = vec4(uInk, a * a * 0.85);
          }
        `,
      }),
    );
    this.ribbon.frustumCulled = false;

    this.group.add(this.head, this.ribbon);
    this.group.visible = false;
  }

  /**
   * Le fait venir sur-le-champ.
   *
   * Uniquement pour la mise au point : attendre dix-sept secondes à chaque
   * essai rend toute retouche du guide insupportable à régler.
   */
  summon(): void {
    this.idle = PATIENCE;
  }

  /** Recale le jalon visé sur la progression réelle du joueur. */
  private updateTarget(player: PlayerState): void {
    if (this.waypoints.length === 0) return;
    const p = player.position;
    const t = this.waypoints[this.target];
    const d = Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z);

    // Jalon atteint : on passe au suivant et l'on oublie l'attente.
    if (d < 14 && this.target < this.waypoints.length - 1) {
      this.target++;
      this.bestDistance = Infinity;
      this.idle = 0;
      return;
    }

    // Sinon : est-ce qu'on se rapproche ? C'est ça, « progresser ».
    if (d < this.bestDistance - PROGRESS_EPSILON) {
      this.bestDistance = d;
      this.idle = 0;
    }
  }

  update(player: PlayerState, playerScale: number, dt: number, camera: THREE.Camera): void {
    if (this.waypoints.length === 0) return;

    this.updateTarget(player);

    if (this.flying <= 0) {
      this.idle += dt;
      if (this.idle >= PATIENCE) {
        this.flying = FLIGHT;
        this.idle = 0;
        this.samples = [];
        this.beginFlight(player, playerScale);
      } else {
        this.group.visible = false;
        return;
      }
    }

    this.flying -= dt;
    this.group.visible = true;

    const t = 1 - Math.max(0, this.flying) / FLIGHT;
    // Trajectoire courbe : une ligne droite ferait mécanique, un arc fait vivant.
    const eased = t * t * (3 - 2 * t);
    this.head.position
      .copy(this.from)
      .lerp(this.to, eased)
      .addScaledVector(this.arc, Math.sin(Math.PI * t));

    this.pushSample(dt);
    this.rebuildRibbon(camera, playerScale);

    if (this.flying <= 0 && this.samples.every((s) => s.age > 1)) {
      this.group.visible = false;
    }
  }

  /** Prépare un passage : il vient de côté et repart vers le jalon. */
  private beginFlight(player: PlayerState, playerScale: number): void {
    const p = player.position;
    const t = this.waypoints[this.target];

    // Il surgit à la périphérie, jamais devant le nez : on doit l'apercevoir
    // du coin de l'œil, pas le recevoir en pleine face.
    const away = new THREE.Vector3(t.x - p.x, 0, t.z - p.z).normalize();
    const lateral = new THREE.Vector3(-away.z, 0, away.x);
    const reach = 9 * playerScale;

    this.from
      .set(p.x, p.y + 1.5 * playerScale, p.z)
      .addScaledVector(lateral, reach)
      .addScaledVector(away, -reach * 0.5);

    // Il ne va pas jusqu'au jalon : il file dans sa direction et s'évanouit.
    // Montrer la direction suffit ; conduire par la main serait le trahir.
    this.to
      .set(p.x, p.y + 2.2 * playerScale, p.z)
      .addScaledVector(away, Math.min(38 * playerScale, this.distanceTo(p, t) * 0.55));

    this.arc.set(0, 3.5 * playerScale, 0);
    this.head.position.copy(this.from);
    this.prev.copy(this.from);
  }

  private distanceTo(p: { x: number; y: number; z: number }, t: THREE.Vector3): number {
    return Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z);
  }

  private pushSample(dt: number): void {
    for (const s of this.samples) s.age += dt * 1.6;
    this.samples.unshift({
      x: this.head.position.x,
      y: this.head.position.y,
      z: this.head.position.z,
      age: 0,
    });
    if (this.samples.length > TRAIL) this.samples.length = TRAIL;

    // La pointe regarde où elle va.
    this.dir.copy(this.head.position).sub(this.prev);
    if (this.dir.lengthSq() > 1e-8) {
      this.head.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        this.dir.clone().normalize(),
      );
    }
    this.prev.copy(this.head.position);
  }

  /** Reconstruit le ruban, tourné vers la caméra et effilé vers la queue. */
  private rebuildRibbon(camera: THREE.Camera, playerScale: number): void {
    const pos = this.positions;
    const ages = this.ages;
    const n = this.samples.length;

    for (let i = 0; i < TRAIL; i++) {
      const s = this.samples[Math.min(i, n - 1)] ?? this.samples[0];
      if (!s) break;
      const next = this.samples[Math.min(i + 1, n - 1)] ?? s;

      this.dir.set(next.x - s.x, next.y - s.y, next.z - s.z);
      if (this.dir.lengthSq() < 1e-10) this.dir.set(0, 0, 1);
      this.side
        .set(s.x - camera.position.x, s.y - camera.position.y, s.z - camera.position.z)
        .cross(this.dir)
        .normalize();

      // Le trait s'affine en vieillissant : c'est ce qui le fait lire comme un
      // coup de pinceau et non comme un tube.
      const taper = Math.max(0, 1 - i / TRAIL);
      const w = 0.12 * playerScale * taper;

      const a = i * 2;
      pos[a * 3] = s.x + this.side.x * w;
      pos[a * 3 + 1] = s.y + this.side.y * w;
      pos[a * 3 + 2] = s.z + this.side.z * w;
      pos[(a + 1) * 3] = s.x - this.side.x * w;
      pos[(a + 1) * 3 + 1] = s.y - this.side.y * w;
      pos[(a + 1) * 3 + 2] = s.z - this.side.z * w;
      ages[a] = s.age;
      ages[a + 1] = s.age;
    }

    this.ribbonGeo.attributes.position.needsUpdate = true;
    this.ribbonGeo.attributes.aAge.needsUpdate = true;
    this.head.scale.setScalar(playerScale);
  }
}
