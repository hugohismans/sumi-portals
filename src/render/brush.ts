import * as THREE from 'three';
import type { PlayerState } from '../core/types.js';
import { INK } from './ink.js';

/**
 * LE PINCEAU — et, à travers lui, le jeu tout entier.
 *
 * Ce n'est pas un système d'indices : c'est un PERSONNAGE, présent dans le
 * monde en permanence. Il se tient quelque part, trace de petites boucles
 * d'encre, et vous laisse approcher. Puis il file vers l'endroit suivant.
 *
 * D'où vient le jeu : **il vole, vous non.** Il franchit en droite ligne ce
 * qu'il vous faudra contourner, escalader, ou changer de taille pour atteindre.
 * L'écart entre son chemin et le vôtre, c'est l'énigme — et elle n'a jamais
 * besoin d'être énoncée, puisqu'on voit très bien où il est allé.
 *
 * Une première version le faisait surgir après un délai d'attente, quand le
 * joueur semblait perdu. C'était un élément d'interface déguisé en créature.
 * Il vit désormais dans le monde, sans minuterie : on peut le suivre des yeux,
 * le perdre, le retrouver. C'est un compagnon, pas une notification.
 *
 * Sa taille suit celle du joueur, et c'est délibéré : il garde la même présence
 * apparente à toutes les échelles. Il n'appartient pas au système de tailles —
 * il est ce qui dessine le monde, pas ce qui l'habite.
 */

/** Distance d'approche qui le fait décoller, en hauteurs de joueur. */
const CATCH = 9;

/** Durée d'une fuite, en secondes. */
const FLIGHT = 3.6;

/** Longueur de la traînée, en échantillons. */
const TRAIL = 56;

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
  private readonly ribbonGeo = new THREE.BufferGeometry();
  private readonly positions: Float32Array;
  private readonly ages: Float32Array;

  private samples: Sample[] = [];
  private fleeing = 0;
  private station = 0;
  private wander = 0;

  private readonly from = new THREE.Vector3();
  private readonly to = new THREE.Vector3();
  private readonly arc = new THREE.Vector3();
  private readonly prev = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor(points: [number, number, number][] = []) {
    for (const p of points) this.waypoints.push(new THREE.Vector3(p[0], p[1], p[2]));

    // La touffe : une goutte d'encre effilée. Assez grosse pour se repérer de
    // loin — c'est une cible qu'on poursuit, pas un détail à dénicher.
    this.head = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 1.9, 6),
      new THREE.MeshBasicMaterial({ color: INK }),
    );
    this.head.frustumCulled = false;

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

    const ribbon = new THREE.Mesh(
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
            // L'encre sèche vite : elle pâlit, puis disparaît.
            float a = 1.0 - clamp(vAge, 0.0, 1.0);
            gl_FragColor = vec4(uInk, a * a * 0.9);
          }
        `,
      }),
    );
    ribbon.frustumCulled = false;

    this.group.add(this.head, ribbon);
    if (this.waypoints.length > 0) this.head.position.copy(this.waypoints[0]);
    this.prev.copy(this.head.position);
  }

  /** Le fait filer tout de suite, pour la mise au point. */
  summon(): void {
    if (this.station < this.waypoints.length - 1) this.takeOff();
  }

  /** Là où il se tient. C'est, à tout instant, l'objectif du joueur. */
  get destination(): THREE.Vector3 | null {
    return this.waypoints[this.station] ?? null;
  }

  update(player: PlayerState, playerScale: number, dt: number, camera: THREE.Camera): void {
    if (this.waypoints.length === 0) return;

    if (this.fleeing > 0) {
      this.fleeing -= dt;
      const t = 1 - Math.max(0, this.fleeing) / FLIGHT;
      // Trajectoire haute et courbe : il passe visiblement PAR-DESSUS ce que le
      // joueur devra contourner. C'est ce survol qui pose l'énigme sans un mot.
      const eased = t * t * (3 - 2 * t);
      this.head.position
        .copy(this.from)
        .lerp(this.to, eased)
        .addScaledVector(this.arc, Math.sin(Math.PI * t));
      if (this.fleeing <= 0) {
        this.station = Math.min(this.station + 1, this.waypoints.length - 1);
      }
    } else {
      // À l'arrêt il flotte et tourne. Un point immobile se confond avec le
      // décor ; un point qui bouge accroche l'œil à travers tout un village.
      this.wander += dt;
      const st = this.waypoints[this.station];
      const r = 1.1 * playerScale;
      this.head.position.set(
        st.x + Math.cos(this.wander * 1.6) * r,
        st.y + 2.4 * playerScale + Math.sin(this.wander * 2.2) * 0.4 * playerScale,
        st.z + Math.sin(this.wander * 1.2) * r,
      );

      // Rejoint : il repart. Le voyage avance parce qu'on l'a rattrapé.
      const p = player.position;
      const d = Math.hypot(p.x - st.x, p.y - st.y, p.z - st.z);
      if (d < CATCH * playerScale && this.station < this.waypoints.length - 1) {
        this.takeOff();
      }
    }

    this.pushSample(dt);
    this.rebuildRibbon(camera, playerScale);
    this.head.scale.setScalar(playerScale);
  }

  /** Départ vers l'endroit suivant. */
  private takeOff(): void {
    const next = this.waypoints[Math.min(this.station + 1, this.waypoints.length - 1)];
    this.from.copy(this.head.position);
    this.to.copy(next);
    this.arc.set(0, Math.max(8, this.from.distanceTo(this.to) * 0.25), 0);
    this.fleeing = FLIGHT;
    this.prev.copy(this.head.position);
  }

  private pushSample(dt: number): void {
    for (const s of this.samples) s.age += dt * 1.5;
    this.samples.unshift({
      x: this.head.position.x,
      y: this.head.position.y,
      z: this.head.position.z,
      age: 0,
    });
    if (this.samples.length > TRAIL) this.samples.length = TRAIL;

    this.dir.copy(this.head.position).sub(this.prev);
    if (this.dir.lengthSq() > 1e-8) {
      this.head.quaternion.setFromUnitVectors(this.up, this.dir.normalize());
    }
    this.prev.copy(this.head.position);
  }

  /** Reconstruit le ruban, tourné vers la caméra et effilé vers la queue. */
  private rebuildRibbon(camera: THREE.Camera, playerScale: number): void {
    const pos = this.positions;
    const ages = this.ages;
    const n = this.samples.length;
    if (n === 0) return;

    for (let i = 0; i < TRAIL; i++) {
      const s = this.samples[Math.min(i, n - 1)];
      const next = this.samples[Math.min(i + 1, n - 1)];

      this.dir.set(next.x - s.x, next.y - s.y, next.z - s.z);
      if (this.dir.lengthSq() < 1e-10) this.dir.set(0, 0, 1);
      this.side
        .set(s.x - camera.position.x, s.y - camera.position.y, s.z - camera.position.z)
        .cross(this.dir)
        .normalize();

      // Le trait s'affine vers la queue : c'est ce qui le fait lire comme un
      // coup de pinceau et non comme un tube.
      const w = 0.2 * playerScale * Math.max(0, 1 - i / TRAIL);

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
  }
}
