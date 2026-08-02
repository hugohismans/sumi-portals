import * as THREE from 'three';
import { INK, syncInkUniforms } from './ink.js';

/**
 * LA PLUIE — et ce qu'elle devient quand on mesure quarante-cinq centimètres.
 *
 * Une goutte de pluie fait quelques millimètres. Pour un joueur à ×1, c'est un
 * grain qu'on ne dessine pas ; pour un joueur à ×1/4, c'est encore un grain.
 * Une pluie « à l'échelle » ne se voit donc jamais, et une pluie qui se voit
 * n'est jamais à l'échelle.
 *
 * On tranche : **la goutte est un objet du monde, pas un effet d'écran.** Elle
 * fait quatre centimètres, toujours. À hauteur d'homme on la devine à peine ;
 * à quarante-cinq centimètres c'est une bille qui tombe, et quand elle s'écrase
 * elle laisse une tache aussi large qu'un pied.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ET C'EST LA SEULE FAÇON DE FAIRE PASSER LA LEÇON DE LA SALLE
 *
 * La cour de pluie ne demande rien. Elle installe une chose, en douce : **à
 * cette taille, tout ce qui tombe tombe vite.** Le temps de chute varie comme
 * l'inverse de la racine de l'échelle — un joueur minuscule voit donc le monde
 * lui tomber dessus deux fois plus vite qu'un joueur normal, et quatre fois
 * plus vite qu'un géant.
 *
 * Si les gouttes tombaient à une vitesse d'écran, la leçon serait fausse et le
 * puits de quarante mètres, trois salles plus loin, serait une trahison. Elles
 * tombent donc avec la MÊME loi que le joueur, `√(2d/g)`, avec la même
 * gravité — et l'on voit vingt fois ce qu'on devra comprendre plus tard sans
 * qu'on nous l'ait jamais dit.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Combien de gouttes vivantes à la fois. Une averse d'encre, pas un rideau. */
const GOUTTES = 90;

/** Taille d'une goutte, en unités du monde. Quatre centimètres. */
const CALIBRE = 0.04;

/**
 * Gravité, la même que celle du joueur (`src/core/physics.ts`).
 *
 * On ne l'importe pas : ce module ne doit rien devoir au noyau, et un nombre
 * copié qui doit rester égal à un autre est justement ce qu'on refuse partout
 * ailleurs. Ici l'exception est sûre — si les deux divergeaient un jour, la
 * pluie tomberait un peu plus ou un peu moins vite et personne ne pourrait le
 * mesurer. Ce n'est pas une règle du jeu, c'est une impression.
 */
const G = 26;

/** Durée de vie d'une éclaboussure, en secondes. */
const SECHAGE = 1.1;

interface Goutte {
  x: number;
  y: number;
  z: number;
  /** Vitesse verticale, négative. */
  v: number;
  /** Hauteur du sol sous elle : c'est là qu'elle s'écrasera. */
  sol: number;
  /** Vrai si elle tombe dans l'eau. La tache n'est pas la même. */
  eau: boolean;
}

/**
 * UNE SURFACE OÙ LA PLUIE S'ÉCRASE.
 *
 * Une cour n'est pas un plan. Il y a des terrasses, une goulotte, un lac, une
 * margelle de puits, le toit d'un auvent, l'assise d'un banc. Sans cette table,
 * les gouttes traversent tout et éclaboussent le sol à travers un toit.
 *
 * ET IL N'Y A PAS DE LISTE D'ABRIS, ce qui est le point important. Un toit
 * déclaré comme surface d'impact ordinaire ARRÊTE la pluie, donc il ne tombe
 * rien dessous, donc c'est sec. La zone sèche n'est pas une règle, c'est une
 * conséquence — et le joueur qui se met à l'abri voit la pluie s'arrêter net
 * au-dessus de sa tête, ce qui est le seul argument qui vaille.
 *
 * L'ordre compte : la PREMIÈRE surface qui contient le point gagne. Elles se
 * recouvrent en plan, et c'est voulu.
 */
export interface Surface {
  min: [number, number];
  max: [number, number];
  y: number;
  eau: boolean;
}

interface Tache {
  x: number;
  y: number;
  z: number;
  /** 0 fraîche, 1 sèche. */
  age: number;
  rayon: number;
}

const alea = (a: number, b: number): number => a + Math.random() * (b - a);

export class Gouttes {
  readonly group = new THREE.Group();

  private readonly gouttes: Goutte[] = [];
  private readonly taches: Tache[] = [];

  private readonly geoGouttes = new THREE.BufferGeometry();
  private readonly posGouttes: Float32Array;
  private readonly matGoutte: THREE.ShaderMaterial;

  private readonly geoTaches = new THREE.BufferGeometry();
  private readonly posTaches: Float32Array;
  private readonly ageTaches: Float32Array;
  /** Le coin du quad, en clair. Voir le commentaire du shader. */
  private readonly coinTaches: Float32Array;
  private readonly matTache: THREE.ShaderMaterial;

  /** Où il pleut, et jusqu'où. Hors de cette boîte, pas une goutte. */
  private readonly min: THREE.Vector3;
  private readonly max: THREE.Vector3;
  private readonly sol: number;
  private readonly surfaces: Surface[];

  /**
   * `zone` : la boîte où il pleut, en unités du monde. `sol` : la hauteur où
   * les gouttes s'écrasent. Une salle plate suffit ; un relief demanderait de
   * connaître le décor, et ce module n'a pas à le connaître.
   */
  constructor(
    zone: { min: [number, number, number]; max: [number, number, number] },
    sol: number,
    /** Le relief. Sans lui, la pluie tombe à travers les toits. Voir Surface. */
    surfaces: Surface[] = [],
  ) {
    this.min = new THREE.Vector3(...zone.min);
    this.max = new THREE.Vector3(...zone.max);
    this.sol = sol;
    this.surfaces = surfaces;

    for (let i = 0; i < GOUTTES; i++) {
      this.gouttes.push({ x: 0, y: 0, z: 0, v: 0, sol, eau: false });
      this.semer(i, true);
    }

    // ─── LES GOUTTES : un quadrilatère étiré vers le bas ────────────────────
    //
    // Étiré, et pas rond. Une goutte qui tombe vite se lit comme un TRAIT, et
    // c'est ce trait qui dit la vitesse ; une bille ronde à la même vitesse ne
    // dit rien du tout et se lit comme du bruit.
    this.posGouttes = new Float32Array(GOUTTES * 4 * 3);
    const idxG: number[] = [];
    for (let i = 0; i < GOUTTES; i++) {
      const a = i * 4;
      idxG.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.geoGouttes.setAttribute('position', new THREE.BufferAttribute(this.posGouttes, 3));
    this.geoGouttes.setIndex(idxG);

    this.matGoutte = new THREE.ShaderMaterial({
      uniforms: { uInk: { value: INK }, uSeed: { value: 0 }, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uInk;
        void main() {
          // Pale : une pluie aussi noire que le trait volerait la lecture des
          // contours, et une averse ne doit jamais couvrir le dessin.
          gl_FragColor = vec4(uInk, 0.34);
        }
      `,
    });

    const meshG = new THREE.Mesh(this.geoGouttes, this.matGoutte);
    meshG.frustumCulled = false;
    meshG.renderOrder = 3;

    // ─── LES ÉCLABOUSSURES : un disque à plat, qui sèche ────────────────────
    this.posTaches = new Float32Array(GOUTTES * 4 * 3);
    this.ageTaches = new Float32Array(GOUTTES * 4);
    // ─── PAS DE `gl_VertexID` ICI ────────────────────────────────────────────
    //
    // Il n'existe qu'en GLSL ES 3.00, et Three compile en 1.00 par défaut. Un
    // shader qui ne compile pas ne se voit QUE dans un navigateur : c'est ce
    // qui a fait disparaître tous les portails du jeu pendant une soirée, sans
    // qu'aucune vérification puisse le dire. On passe donc par un attribut.
    this.coinTaches = new Float32Array(GOUTTES * 4 * 2);
    for (let i = 0; i < GOUTTES * 4; i++) {
      this.coinTaches[i * 2] = i % 2;
      this.coinTaches[i * 2 + 1] = Math.floor((i % 4) / 2);
    }
    const idxT: number[] = [];
    for (let i = 0; i < GOUTTES; i++) {
      const a = i * 4;
      idxT.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.geoTaches.setAttribute('position', new THREE.BufferAttribute(this.posTaches, 3));
    this.geoTaches.setAttribute('aAge', new THREE.BufferAttribute(this.ageTaches, 1));
    this.geoTaches.setAttribute('aCoin', new THREE.BufferAttribute(this.coinTaches, 2));
    this.geoTaches.setIndex(idxT);

    this.matTache = new THREE.ShaderMaterial({
      uniforms: { uInk: { value: INK }, uSeed: { value: 0 }, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        attribute float aAge;
        attribute vec2 aCoin;
        varying float vAge;
        varying vec2 vUv;
        void main() {
          vAge = aAge;
          vUv = aCoin;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uInk;
        varying float vAge;
        varying vec2 vUv;
        void main() {
          // Un anneau, pas un disque : l'eau qui s'écrase chasse le pigment
          // vers le bord, et c'est cette couronne qu'on lit comme un impact.
          float r = length(vUv - 0.5) * 2.0;
          float anneau = smoothstep(0.55, 0.92, r) * (1.0 - smoothstep(0.92, 1.0, r));
          float sec = 1.0 - clamp(vAge, 0.0, 1.0);
          // Elle s'ouvre en séchant : le rayon utile grandit avec l'âge, ce qui
          // donne l'onde plutôt qu'une tache qui pâlit sur place.
          gl_FragColor = vec4(uInk, anneau * sec * sec * 0.5);
        }
      `,
    });

    const meshT = new THREE.Mesh(this.geoTaches, this.matTache);
    meshT.frustumCulled = false;
    meshT.renderOrder = 2;

    this.group.add(meshT, meshG);
  }

  /** Renaît en haut de la zone, à un endroit tiré au sort. */
  private semer(i: number, premiere = false): void {
    const g = this.gouttes[i];
    g.x = alea(this.min.x, this.max.x);
    g.z = alea(this.min.z, this.max.z);
    // À la première image, on étale les gouttes sur toute la hauteur : sinon
    // l'averse commence par un rideau parfaitement aligné, ce qui se voit.
    g.y = premiere ? alea(this.sol, this.max.y) : this.max.y;
    g.v = 0;
    // On décide de ce qu'elle va toucher AU DÉPART, une seule fois : elle tombe
    // droit, donc le résultat ne changera pas, et faire la recherche à chaque
    // image pour quatre-vingt-dix gouttes serait payer soixante fois pour rien.
    g.sol = this.sol;
    g.eau = false;
    for (const s of this.surfaces) {
      if (g.x < s.min[0] || g.x > s.max[0] || g.z < s.min[1] || g.z > s.max[1]) continue;
      g.sol = s.y;
      g.eau = s.eau;
      break;
    }
  }

  update(dt: number, camera: THREE.Camera): void {
    const pas = Math.min(dt, 0.05);

    for (let i = 0; i < GOUTTES; i++) {
      const g = this.gouttes[i];
      g.v -= G * pas;
      g.y += g.v * pas;
      if (g.y <= g.sol) {
        // Elle s'écrase. La tache prend la place de la plus vieille : on n'en
        // entretient jamais plus que de gouttes, et le coût est donc borné.
        this.taches[i] = {
          x: g.x,
          y: g.sol + 0.005,
          z: g.z,
          age: 0,
          // L'éclaboussure est bien plus large que la goutte — c'est ce rapport
          // qui la rend lisible, et il est celui de l'eau sur la pierre.
          // Sur l'eau, l'onde porte plus loin et s'ouvre plus vite : c'est ce
          // qui distingue une flaque d'un pavé, sans qu'on ait rien à dessiner.
          rayon: CALIBRE * (g.eau ? alea(6, 9) : alea(3.5, 5.5)),
        };
        this.semer(i);
      }
    }

    for (const t of this.taches) {
      if (t) t.age += pas / SECHAGE;
    }

    this.ecrireGouttes(camera);
    this.ecrireTaches();
  }

  /** Chaque goutte : un ruban vertical, d'autant plus long qu'elle va vite. */
  private ecrireGouttes(camera: THREE.Camera): void {
    const p = this.posGouttes;
    const cam = camera.position;

    for (let i = 0; i < GOUTTES; i++) {
      const g = this.gouttes[i];
      // Le ruban fait face à la caméra : on prend la perpendiculaire à la
      // ligne œil→goutte, dans le plan horizontal.
      const dx = g.x - cam.x;
      const dz = g.z - cam.z;
      const n = Math.hypot(dx, dz) || 1;
      const sx = (-dz / n) * CALIBRE * 0.5;
      const sz = (dx / n) * CALIBRE * 0.5;
      // La longueur suit la vitesse : immobile elle est ronde, lancée elle
      // s'étire. C'est ce qui fait lire la chute au lieu de la deviner.
      const longueur = CALIBRE * (1 + Math.abs(g.v) * 0.09);

      const o = i * 12;
      p[o] = g.x - sx; p[o + 1] = g.y; p[o + 2] = g.z - sz;
      p[o + 3] = g.x + sx; p[o + 4] = g.y; p[o + 5] = g.z + sz;
      p[o + 6] = g.x - sx; p[o + 7] = g.y + longueur; p[o + 8] = g.z - sz;
      p[o + 9] = g.x + sx; p[o + 10] = g.y + longueur; p[o + 11] = g.z + sz;
    }
    this.geoGouttes.attributes.position.needsUpdate = true;
  }

  /** Chaque éclaboussure : un carré à plat sur le sol, qui s'ouvre en séchant. */
  private ecrireTaches(): void {
    const p = this.posTaches;
    const a = this.ageTaches;

    for (let i = 0; i < GOUTTES; i++) {
      const t = this.taches[i];
      const o = i * 12;
      const oa = i * 4;
      if (!t || t.age >= 1) {
        // Repliée sur un point : invisible sans qu'on ait à trier quoi que ce
        // soit, et sans coûter un appel de dessin de plus.
        for (let k = 0; k < 12; k++) p[o + k] = 0;
        for (let k = 0; k < 4; k++) a[oa + k] = 1;
        continue;
      }
      // Elle s'ouvre : c'est l'onde, et c'est ce qui la distingue d'une tache
      // qui pâlirait sur place.
      const r = t.rayon * (0.45 + t.age * 0.9);
      p[o] = t.x - r; p[o + 1] = t.y; p[o + 2] = t.z - r;
      p[o + 3] = t.x + r; p[o + 4] = t.y; p[o + 5] = t.z - r;
      p[o + 6] = t.x - r; p[o + 7] = t.y; p[o + 8] = t.z + r;
      p[o + 9] = t.x + r; p[o + 10] = t.y; p[o + 11] = t.z + r;
      for (let k = 0; k < 4; k++) a[oa + k] = t.age;
    }
    this.geoTaches.attributes.position.needsUpdate = true;
    this.geoTaches.attributes.aAge.needsUpdate = true;
  }

  syncInk(): void {
    syncInkUniforms(this.matGoutte);
    syncInkUniforms(this.matTache);
  }

  dispose(): void {
    this.geoGouttes.dispose();
    this.geoTaches.dispose();
    this.matGoutte.dispose();
    this.matTache.dispose();
  }
}
