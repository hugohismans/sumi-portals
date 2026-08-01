import * as THREE from 'three';
import { INK, syncInkUniforms } from './ink.js';

/**
 * DES FEUILLES DANS LE VENT.
 *
 * Sur une planche encrée, l'air ne se dessine pas : il se DEVINE, à ce qu'il
 * emporte. Une poignée de feuilles qui dérivent et laissent une traînée qui
 * sèche suffit à faire respirer tout un plan.
 *
 * Le vrai sujet de ce fichier n'est donc pas l'effet, c'est sa RETENUE. Une
 * planche à l'encre tire sa force de ses vides ; remplir l'air de particules,
 * c'est transformer un dessin en neige. Trois cents feuilles feraient un
 * effet de météo, et le joueur cesserait de voir les énigmes — qui, ici, se
 * lisent à l'œil nu, dans les silhouettes et les alignements. Une dizaine de
 * feuilles fait exactement l'inverse : on les remarque une par une, elles
 * traversent le champ puis s'en vont, et le vide revient.
 *
 * Conséquence technique heureuse : à ce compte-là, tout tient dans deux
 * mailles, remplies à même leurs tampons. Rien n'est reconstruit, rien n'est
 * alloué par image — le jeu redessine déjà la scène cinq fois par image pour
 * les portails, il n'a pas de budget à donner à un décor d'ambiance.
 */

/**
 * Le nombre de feuilles vivantes. Douze, et pas davantage.
 *
 * En dessous de huit, l'air redevient mort : on peut regarder plusieurs
 * secondes sans rien voir passer. Au-delà d'une quinzaine, l'œil arrête de
 * suivre les feuilles individuellement et lit une texture — c'est le moment
 * précis où l'effet se banalise et où le décor commence à concurrencer les
 * énigmes. Douze tient le milieu : il y en a presque toujours une dans le
 * champ, jamais deux qui se croisent au même endroit.
 */
const FEUILLES = 12;

/**
 * Échantillons de traînée par feuille. Douze points sur une trajectoire lente,
 * c'est déjà une courbe franche ; en mettre trente ne ferait qu'allonger un
 * trait que l'on veut voir SÉCHER, pas s'accumuler.
 */
const TRAINEE = 12;

/**
 * Intervalle de dépôt d'encre, en secondes. On n'échantillonne pas à 60 Hz :
 * le trait serait un tube parfaitement lisse. À 20 Hz, les points sont assez
 * espacés pour que la courbure se voie, comme les à-coups d'un poignet.
 */
const DEPOT = 0.05;

/**
 * Vitesse de séchage de l'encre. Réglée pour que le plus vieil échantillon
 * soit exactement transparent au moment où il sort du tampon : sans cela, la
 * queue du trait disparaîtrait d'un coup, et ce clignotement est la chose la
 * plus visible du monde sur un fond clair.
 */
const SECHAGE = 1.75;

/**
 * Durée de vie d'une feuille, en secondes. Tirée au hasard dans cette plage,
 * et jamais fixe : à durée commune, les douze feuilles réémises ensemble à la
 * première image disparaîtraient ensemble à la seizième seconde, et l'air se
 * viderait d'un coup toutes les seize secondes.
 */
const VIE_MIN = 11;
const VIE_MAX = 20;

/** Fondu d'entrée et de sortie. Aucune feuille ne doit apparaître d'un coup. */
const FONDU = 0.9;

interface Feuille {
  readonly pos: THREE.Vector3;
  readonly rot: THREE.Quaternion;
  readonly axe: THREE.Vector3;
  /** Vitesse de rotation propre, en tours/s. */
  vrille: number;
  /** Phase du balancement latéral, pour que deux feuilles ne tanguent jamais ensemble. */
  phase: number;
  /** Amplitude du balancement, propre à la feuille. */
  ampleur: number;
  /** Vitesse de chute propre. */
  chute: number;
  /** Taille de la feuille, avant échelle joueur. */
  taille: number;
  age: number;
  vie: number;
}

const alea = (a: number, b: number): number => a + Math.random() * (b - a);

export class Feuilles {
  readonly group = new THREE.Group();

  private readonly feuilles: Feuille[] = [];

  // Les feuilles : un quad par feuille, écrit en coordonnées monde.
  private readonly geoFeuilles = new THREE.BufferGeometry();
  private readonly posFeuilles = new Float32Array(FEUILLES * 4 * 3);
  private readonly alphaFeuilles = new Float32Array(FEUILLES * 4);
  private readonly matFeuille: THREE.ShaderMaterial;

  // Les traînées : un ruban par feuille, dans une seule maille.
  private readonly geoTrainee = new THREE.BufferGeometry();
  private readonly posTrainee = new Float32Array(FEUILLES * TRAINEE * 2 * 3);
  private readonly ageTrainee = new Float32Array(FEUILLES * TRAINEE * 2);
  private readonly matTrainee: THREE.ShaderMaterial;

  /**
   * Les échantillons de traînée, à plat : (x, y, z, âge) par point, le plus
   * récent en tête. Un tableau typé unique plutôt que des objets — on le
   * décale avec `copyWithin`, donc zéro allocation par image.
   */
  private readonly echantillons = new Float32Array(FEUILLES * TRAINEE * 4);

  private temps = 0;
  private horloge = 0;

  // Vecteurs de travail. Réutilisés, jamais recréés.
  private readonly vent = new THREE.Vector3();
  private readonly travers = new THREE.Vector3();
  private readonly u = new THREE.Vector3();
  private readonly v = new THREE.Vector3();
  private readonly d = new THREE.Vector3();
  private readonly cote = new THREE.Vector3();
  private readonly pivot = new THREE.Quaternion();

  constructor() {
    for (let i = 0; i < FEUILLES; i++) {
      this.feuilles.push({
        pos: new THREE.Vector3(),
        rot: new THREE.Quaternion(),
        axe: new THREE.Vector3(),
        vrille: 0,
        phase: 0,
        ampleur: 0,
        chute: 0,
        taille: 0,
        // Nées périmées : la toute première image les réémet toutes autour de
        // la caméra, où qu'elle se trouve, plutôt que de les laisser empilées
        // à l'origine du monde.
        age: VIE_MAX + 1,
        vie: VIE_MAX,
      });
    }

    // --- maille des feuilles -------------------------------------------------
    // Le coin sert de coordonnée locale au fragment : c'est lui qui découpe la
    // silhouette. La géométrie ne porte donc aucune forme — une feuille reste
    // quatre points, et le dessin est fait par le shader.
    const coins = new Float32Array(FEUILLES * 4 * 2);
    const indexF: number[] = [];
    for (let i = 0; i < FEUILLES; i++) {
      const c = i * 8;
      coins[c] = -1; coins[c + 1] = -1;
      coins[c + 2] = 1; coins[c + 3] = -1;
      coins[c + 4] = 1; coins[c + 5] = 1;
      coins[c + 6] = -1; coins[c + 7] = 1;
      const b = i * 4;
      indexF.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    this.geoFeuilles.setAttribute('position', new THREE.BufferAttribute(this.posFeuilles, 3));
    this.geoFeuilles.setAttribute('aCoin', new THREE.BufferAttribute(coins, 2));
    this.geoFeuilles.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphaFeuilles, 1));
    this.geoFeuilles.setIndex(indexF);

    this.matFeuille = new THREE.ShaderMaterial({
      uniforms: { uInk: { value: INK }, uSeed: { value: 0 }, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        attribute vec2 aCoin;
        attribute float aAlpha;
        varying vec2 vCoin;
        varying float vAlpha;
        void main() {
          vCoin = aCoin;
          vAlpha = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uInk;
        varying vec2 vCoin;
        varying float vAlpha;
        void main() {
          // Une amande : large au milieu, pointue aux deux bouts. C'est la
          // forme qu'on obtient d'un seul appui de pinceau, donc la seule qui
          // ait l'air d'avoir été PEINTE plutôt que découpée.
          float bord = (1.0 - vCoin.x * vCoin.x);
          float dedans = smoothstep(0.0, 0.18, bord - abs(vCoin.y));
          // La nervure : un léger creux clair au centre, qui suffit à faire
          // lire « feuille » et pas « tache ».
          float nervure = smoothstep(0.05, 0.0, abs(vCoin.y)) * smoothstep(0.9, 0.5, abs(vCoin.x));
          float a = dedans * vAlpha * (1.0 - nervure * 0.55);
          if (a < 0.01) discard;
          gl_FragColor = vec4(uInk, a * 0.92);
        }
      `,
    });

    const meshFeuilles = new THREE.Mesh(this.geoFeuilles, this.matFeuille);
    // Les sommets sont écrits en monde : la sphère englobante calculée par
    // Three serait fausse dès la deuxième image et ferait disparaître le lot.
    meshFeuilles.frustumCulled = false;
    meshFeuilles.renderOrder = 3;

    // --- maille des traînées -------------------------------------------------
    const indexT: number[] = [];
    for (let i = 0; i < FEUILLES; i++) {
      const base = i * TRAINEE * 2;
      for (let j = 0; j < TRAINEE - 1; j++) {
        const a = base + j * 2;
        indexT.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    this.geoTrainee.setAttribute('position', new THREE.BufferAttribute(this.posTrainee, 3));
    this.geoTrainee.setAttribute('aAge', new THREE.BufferAttribute(this.ageTrainee, 1));
    this.geoTrainee.setIndex(indexT);

    this.matTrainee = new THREE.ShaderMaterial({
      uniforms: { uInk: { value: INK }, uSeed: { value: 0 }, uTime: { value: 0 } },
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
          // Le carré fait pâlir vite puis lentement : l'encre fraîche reste
          // franche derrière la feuille, et la queue s'évanouit sans seuil.
          float a = 1.0 - clamp(vAge, 0.0, 1.0);
          // Plafond bas : une traînée aussi noire que le décor volerait la
          // lecture des contours du monde.
          gl_FragColor = vec4(uInk, a * a * 0.42);
        }
      `,
    });

    const meshTrainee = new THREE.Mesh(this.geoTrainee, this.matTrainee);
    meshTrainee.frustumCulled = false;
    meshTrainee.renderOrder = 3;

    this.group.add(meshTrainee, meshFeuilles);
  }

  /**
   * Le pas de simulation.
   *
   * On n'entretient jamais un monde de particules : on entretient une poignée
   * de feuilles AUTOUR DE L'ŒIL. Dès qu'une feuille s'éloigne, elle est
   * réémise en amont du vent. Le joueur a donc toujours la même densité,
   * qu'il traverse un couloir ou une plaine, et le coût ne dépend d'aucune
   * dimension du niveau.
   */
  update(dt: number, camera: THREE.Camera, playerScale: number): void {
    // Un pas borné : après une pause ou un chargement, `dt` peut valoir
    // plusieurs secondes et téléporterait toutes les feuilles d'un coup.
    const pas = Math.min(dt, 0.05);
    this.temps += pas;

    const oeil = camera.position;
    // Tout est exprimé en échelles joueur. Le jeu fait grandir et rapetisser :
    // à taille fixe, les feuilles seraient des grains invisibles pour un
    // géant, et des barges pour une fourmi.
    const rayon = 26 * playerScale;
    const plafond = 14 * playerScale;
    const plancher = 12 * playerScale;

    // Le vent tourne très lentement — sur une minute environ. Assez pour que
    // la direction ne soit jamais mémorisable, trop peu pour qu'on voie
    // l'ensemble des feuilles virer en même temps.
    const cap = Math.sin(this.temps * 0.11) * 0.7 + 0.8;
    this.vent.set(Math.cos(cap), 0, Math.sin(cap));
    this.travers.set(-this.vent.z, 0, this.vent.x);
    const souffle = (1.1 + Math.sin(this.temps * 0.37) * 0.35) * playerScale;

    for (let i = 0; i < FEUILLES; i++) {
      const f = this.feuilles[i];
      f.age += pas;

      // Première image, fin de vie, ou sortie du voisinage : on remet la
      // feuille en amont plutôt que de la suivre au loin.
      const dx = f.pos.x - oeil.x;
      const dz = f.pos.z - oeil.z;
      const dy = f.pos.y - oeil.y;
      if (
        f.age > f.vie ||
        dx * dx + dz * dz > rayon * rayon ||
        dy < -plancher ||
        dy > plafond
      ) {
        this.replacer(i, oeil, playerScale);
        continue;
      }

      // Chute lente et balancée. Une feuille ne tombe jamais droit : elle
      // glisse d'un côté, s'arrête, repart de l'autre. C'est ce va-et-vient,
      // pas la vitesse, qui la fait lire comme portée par l'air.
      const bal = Math.sin(this.temps * 1.35 + f.phase);
      f.pos.addScaledVector(this.vent, souffle * pas);
      f.pos.addScaledVector(this.travers, bal * f.ampleur * playerScale * pas);
      // Le tangage vertical est indexé sur le balancement : la feuille freine
      // sa chute quand elle est à plat dans son virage, exactement comme une
      // vraie surface qui prend appui sur l'air.
      f.pos.y -= (f.chute + bal * 0.22) * playerScale * pas;

      // Rotation propre, autour d'un axe qui n'est ni vertical ni horizontal :
      // une feuille tournoie de biais, elle ne pivote pas comme une roue.
      this.pivot.setFromAxisAngle(f.axe, f.vrille * pas * Math.PI * 2);
      f.rot.multiply(this.pivot);
    }

    // Dépôt d'encre à cadence fixe, indépendante du nombre d'images par
    // seconde : sinon le trait s'allongerait sur une machine rapide.
    this.horloge += pas;
    const emet = this.horloge >= DEPOT;
    if (emet) this.horloge -= DEPOT;

    this.vieillirTrainees(pas, emet);
    this.ecrireFeuilles(playerScale);
    this.ecrireTrainees(camera, playerScale);
  }

  /** Propage les uniformes partagés du style d'encre. */
  syncInk(): void {
    syncInkUniforms(this.matFeuille);
    syncInkUniforms(this.matTrainee);
  }

  /** Libère les tampons GPU. */
  dispose(): void {
    this.geoFeuilles.dispose();
    this.geoTrainee.dispose();
    this.matFeuille.dispose();
    this.matTrainee.dispose();
  }

  /**
   * Réémission d'une feuille en amont du vent.
   *
   * Elle réapparaît haut et en arrière, jamais devant : ce qui doit se voir,
   * c'est une feuille qui TRAVERSE le champ, pas une qui s'y matérialise.
   */
  private replacer(i: number, oeil: THREE.Vector3, playerScale: number): void {
    const f = this.feuilles[i];
    const recul = alea(9, 20) * playerScale;
    const ecart = alea(-13, 13) * playerScale;

    f.pos.set(
      oeil.x - this.vent.x * recul + this.travers.x * ecart,
      oeil.y + alea(2.5, 11) * playerScale,
      oeil.z - this.vent.z * recul + this.travers.z * ecart,
    );

    f.axe.set(alea(-1, 1), alea(0.3, 1), alea(-1, 1)).normalize();
    f.rot.setFromAxisAngle(f.axe, alea(0, Math.PI * 2));
    // Un tour toutes les deux à cinq secondes : plus vite, la feuille
    // scintille en passant par la tranche et devient un clignotement.
    f.vrille = alea(0.2, 0.5) * (Math.random() < 0.5 ? -1 : 1);
    f.phase = alea(0, Math.PI * 2);
    f.ampleur = alea(0.9, 2.1);
    f.chute = alea(0.45, 0.85);
    // Écart de tailles volontairement large : des feuilles identiques se
    // lisent comme un motif, donc comme un effet.
    f.taille = alea(0.06, 0.13);
    f.age = 0;
    f.vie = alea(VIE_MIN, VIE_MAX);

    // La traînée repart du néant : sans cette remise à zéro, un trait d'encre
    // relierait l'ancien emplacement au nouveau en travers de l'écran.
    const base = i * TRAINEE * 4;
    for (let j = 0; j < TRAINEE; j++) {
      const o = base + j * 4;
      this.echantillons[o] = f.pos.x;
      this.echantillons[o + 1] = f.pos.y;
      this.echantillons[o + 2] = f.pos.z;
      this.echantillons[o + 3] = 1; // âge saturé : invisible
    }
  }

  /** Vieillit l'encre, et dépose éventuellement un nouveau point. */
  private vieillirTrainees(pas: number, emet: boolean): void {
    const e = this.echantillons;
    const pasTrainee = TRAINEE * 4;

    for (let i = 0; i < FEUILLES; i++) {
      const base = i * pasTrainee;
      for (let j = 0; j < TRAINEE; j++) e[base + j * 4 + 3] += pas * SECHAGE;

      if (!emet) continue;
      // Décalage en place : le plus récent en tête, le plus vieux tombe.
      e.copyWithin(base + 4, base, base + pasTrainee - 4);
      const f = this.feuilles[i];
      e[base] = f.pos.x;
      e[base + 1] = f.pos.y;
      e[base + 2] = f.pos.z;
      e[base + 3] = 0;
    }
  }

  /** Écrit les quatre coins de chaque feuille, orientés par sa rotation propre. */
  private ecrireFeuilles(playerScale: number): void {
    const p = this.posFeuilles;
    const a = this.alphaFeuilles;

    for (let i = 0; i < FEUILLES; i++) {
      const f = this.feuilles[i];
      const t = f.taille * playerScale;

      // Deux axes du plan de la feuille, tirés de sa rotation. Elle n'est PAS
      // face caméra : une feuille doit pouvoir se présenter par la tranche et
      // disparaître un instant. C'est ce qui la distingue d'un sprite.
      this.u.set(1, 0, 0).applyQuaternion(f.rot).multiplyScalar(t);
      this.v.set(0, 0.55, 0).applyQuaternion(f.rot).multiplyScalar(t);

      const alpha =
        Math.min(1, f.age / FONDU) * Math.min(1, Math.max(0, (f.vie - f.age) / FONDU));

      const b = i * 12;
      p[b] = f.pos.x - this.u.x - this.v.x;
      p[b + 1] = f.pos.y - this.u.y - this.v.y;
      p[b + 2] = f.pos.z - this.u.z - this.v.z;
      p[b + 3] = f.pos.x + this.u.x - this.v.x;
      p[b + 4] = f.pos.y + this.u.y - this.v.y;
      p[b + 5] = f.pos.z + this.u.z - this.v.z;
      p[b + 6] = f.pos.x + this.u.x + this.v.x;
      p[b + 7] = f.pos.y + this.u.y + this.v.y;
      p[b + 8] = f.pos.z + this.u.z + this.v.z;
      p[b + 9] = f.pos.x - this.u.x + this.v.x;
      p[b + 10] = f.pos.y - this.u.y + this.v.y;
      p[b + 11] = f.pos.z - this.u.z + this.v.z;

      const q = i * 4;
      a[q] = alpha;
      a[q + 1] = alpha;
      a[q + 2] = alpha;
      a[q + 3] = alpha;
    }

    this.geoFeuilles.attributes.position.needsUpdate = true;
    this.geoFeuilles.attributes.aAlpha.needsUpdate = true;
  }

  /** Déplie chaque traînée en ruban tourné vers la caméra, effilé vers la queue. */
  private ecrireTrainees(camera: THREE.Camera, playerScale: number): void {
    const e = this.echantillons;
    const p = this.posTrainee;
    const g = this.ageTrainee;
    const oeil = camera.position;

    for (let i = 0; i < FEUILLES; i++) {
      const base = i * TRAINEE * 4;
      const largeur = this.feuilles[i].taille * playerScale * 0.55;

      for (let j = 0; j < TRAINEE; j++) {
        const o = base + j * 4;
        const n = base + Math.min(j + 1, TRAINEE - 1) * 4;
        const x = e[o];
        const y = e[o + 1];
        const z = e[o + 2];

        this.d.set(e[n] - x, e[n + 1] - y, e[n + 2] - z);
        if (this.d.lengthSq() < 1e-12) this.d.set(0, 0, 1);
        this.cote.set(x - oeil.x, y - oeil.y, z - oeil.z).cross(this.d);
        // Quand le regard s'aligne avec la trajectoire, ce produit s'effondre
        // et le ruban se retourne d'un coup. On retombe alors sur une
        // perpendiculaire stable plutôt que sur du bruit.
        if (this.cote.lengthSq() < 1e-10) this.cote.set(0, 1, 0).cross(this.d);
        this.cote.normalize();

        // Le trait s'affine vers la queue : c'est ce qui le fait lire comme un
        // coup de pinceau qui se lève, et non comme un tube.
        const w = largeur * (1 - j / TRAINEE);

        const a = (i * TRAINEE + j) * 2;
        p[a * 3] = x + this.cote.x * w;
        p[a * 3 + 1] = y + this.cote.y * w;
        p[a * 3 + 2] = z + this.cote.z * w;
        p[(a + 1) * 3] = x - this.cote.x * w;
        p[(a + 1) * 3 + 1] = y - this.cote.y * w;
        p[(a + 1) * 3 + 2] = z - this.cote.z * w;
        g[a] = e[o + 3];
        g[a + 1] = e[o + 3];
      }
    }

    this.geoTrainee.attributes.position.needsUpdate = true;
    this.geoTrainee.attributes.aAge.needsUpdate = true;
  }
}
