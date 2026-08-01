import * as THREE from 'three';
import type { PlayerState } from '../core/types.js';
import { INK, createCelMaterial, createOutlineMaterial, syncInkUniforms } from './ink.js';
import { buildWorldGeometry } from './worldMesh.js';

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
 * SA TAILLE EST CELLE DE L'ÉTAGE OÙ IL SE TIENT, pas la vôtre. Il a d'abord
 * suivi la vôtre en permanence, ce qui paraissait commode — il gardait la même
 * présence apparente partout. Mais en montant d'un étage on faisait alors
 * grossir un objet posé deux étages plus bas, et l'on voyait depuis le
 * belvédère un pinceau seize fois trop gros couché sur la terrasse.
 *
 * Il ne se met à votre échelle que lorsque vous êtes auprès de lui, et
 * progressivement. C'est la même règle que pour les portails : ce qui est dans
 * le monde garde la taille du monde, et c'est vous qui changez.
 */

/** Distance d'approche qui le fait décoller, en hauteurs de joueur. */
const CATCH = 9;

/**
 * Rayon, en tailles de pinceau, à l'intérieur duquel il se met à votre échelle.
 * Choisi plus court que la hauteur qui sépare deux étages du monde (30 puis 90)
 * : c'est ce qui garantit qu'on ne redimensionne jamais un pinceau qu'on
 * regarde d'en haut.
 */
const VOISINAGE = 20;

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

/**
 * LE CORPS DU PERSONNAGE.
 *
 * Un signe d'encre était propre, mais ce n'était pas quelqu'un. Un personnage
 * se reconnaît en ombre chinoise : il lui faut une silhouette. Celle-ci est
 * celle d'un pinceau, lue de bas en haut — la touffe encrée qui s'effile en
 * pointe, la virole qui la serre, la hampe claire qui s'élance.
 *
 * Bâti dans les MÊMES matériaux que le décor, donc cerné du même trait : il
 * appartient au monde au lieu d'y être posé.
 *
 * Il pointe vers le BAS au repos, comme un pinceau qu'on tient prêt à écrire.
 */
const buildBody = (materials: THREE.ShaderMaterial[]): THREE.Group => {
  const g = new THREE.Group();

  const piece = (
    boxes: [[number, number, number], [number, number, number]][],
    couleur: string,
    trait: number,
  ): void => {
    const cel = createCelMaterial(new THREE.Color(couleur));
    const outline = createOutlineMaterial();
    outline.uniforms.uThickness.value = trait;
    materials.push(cel, outline);
    const geo = buildWorldGeometry(boxes.map(([min, max]) => ({ min, max, ink: 0 })));
    const edge = new THREE.Mesh(geo, outline);
    const fill = new THREE.Mesh(geo, cel);
    edge.frustumCulled = false;
    fill.frustumCulled = false;
    g.add(edge, fill);
  };

  // La touffe : trois volumes qui se resserrent jusqu'à la pointe.
  piece(
    [
      [[-0.22, -0.04, -0.22], [0.22, 0.34, 0.22]],
      [[-0.14, -0.4, -0.14], [0.14, -0.02, 0.14]],
      [[-0.06, -0.7, -0.06], [0.06, -0.36, 0.06]],
    ],
    '#171310',
    0.004,
  );
  // La virole, qui serre la touffe. Le seul éclat du personnage.
  piece([[[-0.25, 0.32, -0.25], [0.25, 0.5, 0.25]]], '#b08a48', 0.004);
  // La hampe, claire, qui s'amincit vers le haut.
  piece(
    [
      [[-0.17, 0.48, -0.17], [0.17, 1.45, 0.17]],
      [[-0.12, 1.43, -0.12], [0.12, 2.12, 0.12]],
      [[-0.15, 2.08, -0.15], [0.15, 2.26, 0.15]],
    ],
    '#dccbaa',
    0.004,
  );

  g.scale.setScalar(0.55);
  return g;
};

export class Brush {
  readonly group = new THREE.Group();

  private readonly waypoints: THREE.Vector3[] = [];
  private readonly head: THREE.Group;
  private readonly body: THREE.Group;
  private readonly bodyMaterials: THREE.ShaderMaterial[] = [];
  private readonly ribbonGeo = new THREE.BufferGeometry();
  private readonly positions: Float32Array;
  private readonly ages: Float32Array;

  private samples: Sample[] = [];
  private fleeing = 0;
  private station = 0;
  /** Sa taille à lui, qui n'est pas la vôtre. Voir `update`. */
  private echelle = 1;
  private wander = 0;

  private readonly from = new THREE.Vector3();
  private readonly to = new THREE.Vector3();
  private readonly arc = new THREE.Vector3();
  private readonly prev = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private readonly dir = new THREE.Vector3();
  private readonly down = new THREE.Vector3(0, -1, 0);
  private readonly tiltAxis = new THREE.Vector3(0, 0, 1);
  private readonly aim = new THREE.Quaternion();
  private readonly prevOriented = new THREE.Vector3();

  constructor(points: [number, number, number][] = []) {
    for (const p of points) this.waypoints.push(new THREE.Vector3(p[0], p[1], p[2]));

    this.head = new THREE.Group();
    this.body = buildBody(this.bodyMaterials);
    this.head.add(this.body);

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
    // Sans cette amorce, la toute première image compare la position du
    // personnage à l'origine du monde : il se croit lancé à pleine vitesse et
    // apparaît couché.
    this.prevOriented.copy(this.head.position);
  }

  /**
   * Appelé à l'instant où il s'envole, avec le numéro du jalon atteint et leur
   * nombre total. C'est le seul moment du jeu où l'on peut dire au joueur
   * « tu avances » — le rendu ne s'en charge pas, le son si.
   */
  onEnvol: ((etape: number, total: number) => void) | null = null;

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
      // À l'arrêt il RESPIRE, il ne tourne plus. Le mouvement circulaire
      // remplissait l'air d'un gribouillis permanent : une tache d'encre qui
      // monte et descend doucement se remarque tout aussi bien, et reste
      // propre.
      this.wander += dt;
      const st = this.waypoints[this.station];
      this.head.position.set(
        st.x,
        st.y + (2.4 + Math.sin(this.wander * 1.5) * 0.32) * playerScale,
        st.z,
      );
      // Et surtout : pas de traînée à l'arrêt. Elle n'a de sens qu'en vol.
      this.samples.length = 0;

      // Rejoint : il repart. Le voyage avance parce qu'on l'a rattrapé.
      const p = player.position;
      const d = Math.hypot(p.x - st.x, p.y - st.y, p.z - st.z);
      if (d < CATCH * playerScale && this.station < this.waypoints.length - 1) {
        this.takeOff();
        this.onEnvol?.(this.station, this.waypoints.length);
      }
    }

    if (this.fleeing > 0) this.pushSample(dt);
    this.rebuildRibbon(camera, playerScale);

    // LE PINCEAU N'EST PAS UN ACCESSOIRE DU JOUEUR, C'EST UN HABITANT DU LIEU.
    //
    // Il adoptait la taille du joueur à chaque image, où qu'il se trouve. En
    // montant d'un étage on faisait donc grossir un objet posé deux étages plus
    // bas : depuis le belvédère, on voyait sur la terrasse un pinceau seize
    // fois trop gros. C'est la même faute de logique que les portails qui
    // grandissaient avec nous, et elle se corrige de la même façon — ce qui est
    // dans le monde garde la taille du monde.
    //
    // Il ne se met donc à votre échelle que lorsque vous êtes AUPRÈS DE LUI,
    // et le fait progressivement. De loin, il garde la taille de l'étage où il
    // se tient. Le seuil est proportionnel à sa propre taille : à ×1 vingt
    // mètres, à ×16 trois cents — soit, dans les deux cas, « la pièce où l'on
    // est » et pas l'étage d'en dessous.
    const dx = player.position.x - this.head.position.x;
    const dy = player.position.y - this.head.position.y;
    const dz = player.position.z - this.head.position.z;
    const loin = Math.hypot(dx, dy, dz) > VOISINAGE * this.echelle;
    if (!loin) {
      this.echelle += (playerScale - this.echelle) * Math.min(1, dt * 2.5);
    }
    this.head.scale.setScalar(this.echelle);
    this.orient(dt);
    for (const m of this.bodyMaterials) syncInkUniforms(m);
  }

  /**
   * L'attitude du personnage.
   *
   * En vol il PIQUE : la pointe part la première, la hampe suit — c'est
   * l'inclinaison qui donne l'élan, bien plus qu'une trajectoire rapide. Au
   * repos il se redresse et oscille doucement, comme un pinceau qu'on tient.
   *
   * Le redressement est progressif : une bascule instantanée ferait mécanique,
   * et c'est précisément ce qu'on cherche à éviter.
   */
  private orient(dt: number): void {
    this.dir.copy(this.head.position).sub(this.prevOriented);
    const moving = this.dir.lengthSq() > 1e-7;
    if (moving) {
      // La touffe (−Y en repère local) montre la direction du vol.
      this.dir.normalize();
      this.aim.setFromUnitVectors(this.down, this.dir);
    } else {
      // Au repos : debout, avec un balancement lent.
      this.aim.setFromAxisAngle(this.tiltAxis, Math.sin(this.wander * 1.1) * 0.16);
    }
    this.body.quaternion.slerp(this.aim, 1 - Math.exp(-dt / 0.14));
    this.prevOriented.copy(this.head.position);
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

    this.prev.copy(this.head.position);
  }

  /** Reconstruit le ruban, tourné vers la caméra et effilé vers la queue. */
  private rebuildRibbon(camera: THREE.Camera, playerScale: number): void {
    const pos = this.positions;
    const ages = this.ages;
    const n = this.samples.length;
    if (n === 0) {
      // Ruban replié sur un point : invisible, sans avoir à masquer l'objet.
      this.positions.fill(0);
      this.ribbonGeo.attributes.position.needsUpdate = true;
      return;
    }

    for (let i = 0; i < TRAIL; i++) {
      const s = this.samples[Math.min(i, n - 1)];
      const next = this.samples[Math.min(i + 1, n - 1)];

      this.dir.set(next.x - s.x, next.y - s.y, next.z - s.z);
      if (this.dir.lengthSq() < 1e-10) this.dir.set(0, 0, 1);
      this.side
        .set(s.x - camera.position.x, s.y - camera.position.y, s.z - camera.position.z)
        .cross(this.dir);
      // Quand le regard s'aligne avec la trajectoire, ce produit s'effondre et
      // le ruban se retournait d'un coup — c'était le « ça saute ». On retombe
      // alors sur une perpendiculaire stable plutôt que sur du bruit.
      if (this.side.lengthSq() < 1e-8) this.side.set(0, 1, 0).cross(this.dir);
      this.side.normalize();

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
