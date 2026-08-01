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

/** Durée d'une fuite, en secondes. */
const FLIGHT = 3.6;

/**
 * Épaisseur du trait d'encre du personnage. Un peu plus fine que celle du
 * décor (0,0052) : il est petit, et un contour trop gras le transformerait en
 * tache. Elle n'a plus à être corrigée de l'échelle — le shader mesure
 * désormais le trait en unités du MONDE (`src/render/ink.ts`).
 */
const TRAIT_PINCEAU = 0.004;

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
const buildBody = (
  materials: THREE.ShaderMaterial[],
  contours: THREE.ShaderMaterial[],
): THREE.Group => {
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
    contours.push(outline);
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
    TRAIT_PINCEAU,
  );
  // La virole, qui serre la touffe. Le seul éclat du personnage.
  piece([[[-0.25, 0.32, -0.25], [0.25, 0.5, 0.25]]], '#b08a48', TRAIT_PINCEAU);
  // La hampe, claire, qui s'amincit vers le haut.
  piece(
    [
      [[-0.17, 0.48, -0.17], [0.17, 1.45, 0.17]],
      [[-0.12, 1.43, -0.12], [0.12, 2.12, 0.12]],
      [[-0.15, 2.08, -0.15], [0.15, 2.26, 0.15]],
    ],
    '#dccbaa',
    TRAIT_PINCEAU,
  );

  g.scale.setScalar(0.55);
  return g;
};

export class Brush {
  readonly group = new THREE.Group();

  private readonly waypoints: THREE.Vector3[] = [];
  private readonly head: THREE.Group;
  /** Le signal qui le rend trouvable. Voir `buildHalo`. */
  private readonly halo: THREE.Mesh;
  private readonly haloMat: THREE.ShaderMaterial;
  private readonly body: THREE.Group;
  private readonly bodyMaterials: THREE.ShaderMaterial[] = [];
  /** Les seuls matériaux de contour, pour corriger leur épaisseur. Voir update. */
  private readonly contours: THREE.ShaderMaterial[] = [];
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

  /** Taille propre à chaque jalon. Voir LevelDef.guideEchelle. */
  private readonly echelles: number[];
  /** Porte à emprunter pour chaque jalon. Voir LevelDef.guidePorte. */
  private readonly portes: (string | null)[];
  private readonly faces: { pairId: string; kind: 'big' | 'small'; position: THREE.Vector3 }[];
  /** Face par laquelle il ressortira, s'il est en train de passer une porte. */
  private sortie: THREE.Vector3 | null = null;
  /**
   * Temps restant DANS la porte, en secondes.
   *
   * Il ressortait instantanément de l'autre côté, et l'on voyait donc le saut :
   * il entrait, et dans la même image il était à l'autre bout du monde. Le
   * halo, qui traverse le décor, rendait la chose encore plus visible. Un
   * portail ne se lit pas comme un passage si l'on voit les deux bouts en même
   * temps.
   *
   * Il disparaît donc pendant la traversée — corps ET halo. On le voit entrer,
   * il n'est plus là, il ressort ailleurs. C'est court, un tiers de seconde :
   * assez pour couper le lien visuel, trop peu pour qu'on le cherche.
   */
  private dansLaPorte = 0;

  constructor(
    points: [number, number, number][] = [],
    echelles: number[] = [],
    portes: (string | null)[] = [],
    faces: { pairId: string; kind: 'big' | 'small'; position: THREE.Vector3 }[] = [],
  ) {
    for (const p of points) this.waypoints.push(new THREE.Vector3(p[0], p[1], p[2]));
    this.echelles = points.map((_, i) => echelles[i] ?? 1);
    this.portes = points.map((_, i) => portes[i] ?? null);
    this.faces = faces;
    this.echelle = this.echelles[0] ?? 1;

    this.head = new THREE.Group();
    this.body = buildBody(this.bodyMaterials, this.contours);
    this.head.add(this.body);

    // ─── LE SIGNAL ──────────────────────────────────────────────────────────
    //
    // Le pinceau se perdait dans le décor. Il est petit, il est de la couleur
    // du monde, et un joueur qui cherche où aller ne peut pas s'accrocher à
    // un trait d'encre de quarante centimètres au milieu d'un village.
    //
    // PAS DE FLÈCHE : une flèche est de l'interface posée sur un monde, et ce
    // jeu n'explique rien par-dessus l'image. Ce halo-ci APPARTIENT à la
    // scène — c'est le sceau d'encre qu'on voit partout ailleurs, mais posé
    // debout autour de lui, tourné vers le regard.
    //
    // Trois décisions qui le rendent lisible sans le rendre criard :
    //
    // 1. **Il ne grossit pas avec la distance, il grossit à l'écran.** Sa
    //    taille est corrigée par la distance à la caméra, si bien qu'il occupe
    //    toujours la même part de l'image. De près il est discret ; à deux
    //    cents mètres il est encore là. C'est le contraire d'un objet, et c'est
    //    exactement ce qu'on demande à un repère.
    // 2. **Il respire lentement**, une fois toutes les deux secondes et demie.
    //    Assez pour attirer l'œil qui balaie, trop peu pour agacer celui qui
    //    l'a trouvé.
    // 3. **C'est un anneau, pas un disque** : on voit le pinceau AU MILIEU. Un
    //    aplat l'aurait masqué, et masquer ce qu'on cherche pour indiquer où il
    //    est serait une drôle d'idée.
    this.haloMat = new THREE.ShaderMaterial({
      uniforms: { uInk: { value: INK }, uPhase: { value: 0 }, uVol: { value: 0 }, uForce: { value: 1 } },
      transparent: true,
      depthWrite: false,
      // ON LE VOIT À TRAVERS LE DÉCOR, et c'est une concession assumée.
      //
      // Le halo respectait la profondeur : dès que le pinceau passait derrière
      // une maison — c'est-à-dire la moitié du temps, puisqu'il vole par-dessus
      // ce qu'on doit contourner — il disparaissait complètement. On le
      // cherchait au lieu de le suivre, ce qui est exactement l'inverse de son
      // rôle.
      //
      // Le halo seul traverse les murs ; le pinceau, lui, reste caché derrière.
      // On sait donc toujours OÙ il est, sans jamais voir au travers du décor.
      // C'est la seule chose du jeu qui s'autorise ça, et elle le mérite.
      depthTest: false,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uInk;
        uniform float uPhase;
        uniform float uVol;
        uniform float uForce;
        varying vec2 vUv;
        void main() {
          float r = length(vUv - 0.5) * 2.0;
          // DEUX anneaux, pas un. Le second, plus large et plus pale, double la
          // surface qui accroche l'oeil sans epaissir le trait — un anneau
          // epais ferait tache, deux anneaux fins font cible.
          float a1 = smoothstep(0.52, 0.66, r) * smoothstep(0.80, 0.70, r);
          float a2 = smoothstep(0.86, 0.94, r) * smoothstep(1.0, 0.96, r);
          float anneau = a1 + a2 * 0.55;
          // La respiration, et une seconde onde plus lente qui empeche le
          // battement d'etre metronomique.
          float souffle = 0.62 + 0.38 * sin(uPhase) + 0.12 * sin(uPhase * 0.37);
          // EN VOL IL BAT PLUS FORT. C'est le moment ou l'on risque de le
          // perdre : il part, on regarde ailleurs, il est loin. Le battement
          // s'accentue pendant la fuite et redevient discret a l'arret.
          float force = (0.46 + uVol * 0.42) * uForce;
          gl_FragColor = vec4(uInk, anneau * souffle * force);
        }
      `,
    });
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.haloMat);
    this.halo.frustumCulled = false;
    this.halo.renderOrder = -1;

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

    this.group.add(this.head, this.halo, ribbon);
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

  /**
   * Le pose d'autorité à un jalon donné, sans lui faire faire le trajet.
   *
   * Réservé aux repères de mise au point (`src/debug/reperes.ts`) : on se
   * téléporte au milieu du voyage, et un guide resté au premier jalon donnerait
   * une scène que le joueur ne verra jamais — un pinceau minuscule au loin,
   * pendant qu'on croit vérifier le belvédère.
   */
  poser(station: number): void {
    const i = Math.max(0, Math.min(station, this.waypoints.length - 1));
    this.station = i;
    this.fleeing = 0;
    this.dansLaPorte = 0;
    this.sortie = null;
    this.echelle = this.echelles[i] ?? 1;
    this.samples = [];
    const p = this.waypoints[i];
    if (p) this.head.position.copy(p);
  }

  /** Là où il se tient. C'est, à tout instant, l'objectif du joueur. */
  get destination(): THREE.Vector3 | null {
    return this.waypoints[this.station] ?? null;
  }

  update(player: PlayerState, playerScale: number, dt: number, camera: THREE.Camera): void {
    if (this.waypoints.length === 0) return;

    // Dans la porte : invisible, immobile, et rien ne le relie aux deux mondes.
    if (this.dansLaPorte > 0) {
      this.dansLaPorte -= dt;
      this.head.visible = false;
      this.halo.visible = false;
      if (this.dansLaPorte <= 0 && this.sortie) {
        // Il ressort de l'autre côté et reprend sa route vers le jalon. La
        // traînée est coupée net : aucun trait d'encre ne doit relier deux
        // mondes en ligne droite, ce serait redire ce qu'on vient d'éviter.
        const cible = this.waypoints[Math.min(this.station + 1, this.waypoints.length - 1)];
        this.head.position.copy(this.sortie);
        this.from.copy(this.sortie);
        this.to.copy(cible);
        this.arc.set(0, Math.max(4, this.from.distanceTo(this.to) * 0.25), 0);
        this.sortie = null;
        this.fleeing = FLIGHT * 0.75;
        this.samples.length = 0;
        this.prev.copy(this.head.position);
        this.prevOriented.copy(this.head.position);
        this.head.visible = true;
        this.halo.visible = true;
      }
      for (const m of this.bodyMaterials) syncInkUniforms(m);
      return;
    }

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
        if (this.sortie && this.dansLaPorte <= 0) {
          // Il vient d'atteindre la face : il entre, et disparaît.
          this.dansLaPorte = 0.34;
          this.samples.length = 0;
          return;
        }
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
    // Sa taille est celle de l'ÉTAGE OÙ IL SE TIENT, déclarée jalon par jalon
    // dans le niveau. Elle ne dépend jamais de qui le regarde.
    //
    // Deux versions fausses avant celle-ci, et elles se trompaient de la même
    // façon. La première lui donnait la taille du joueur à chaque image : en
    // montant d'un étage on faisait grossir un objet posé deux étages plus bas.
    // La seconde ne le faisait que si le joueur était proche — mais on ressort
    // d'un portail juste à côté de lui, donc il se remettait à grossir au pire
    // moment, celui où l'on vient précisément de changer de taille.
    //
    // La règle juste tenait en une phrase : ce qui est dans le monde garde la
    // taille du monde. La même que pour les portails, et il aura fallu se
    // tromper deux fois pour la retrouver.
    //
    // La transition reste douce, mais elle n'a lieu qu'en vol : quand il change
    // d'étage, il change de taille en même temps qu'il s'y rend.
    // Le signal suit le pinceau, fait face au regard, et garde une taille
    // CONSTANTE À L'ÉCRAN : on corrige par la distance, donc il ne rapetisse
    // jamais au point de disparaître. C'est un repère, pas un objet du monde —
    // la seule chose du jeu qui ait le droit de ne pas obéir à l'échelle.
    // LE HALO SE CENTRE SUR LE CORPS, PAS SUR LE PIED.
    //
    // Le point d'ancrage du personnage est au bas de sa touffe, et son corps
    // s'élève au-dessus — de −0,70 à +2,26 en repère local, mis à l'échelle
    // 0,55. Centré sur l'ancrage, l'anneau se retrouvait donc nettement plus
    // bas que ce qu'il désigne : on voyait un cercle et, à côté, un pinceau.
    // Un repère décalé de ce qu'il repère est pire que pas de repère.
    this.halo.position.copy(this.head.position);
    this.halo.position.y += 0.43 * this.echelle;
    this.halo.quaternion.copy(camera.quaternion);
    const distance = this.halo.position.distanceTo(camera.position);
    // Deux planchers : il ne doit ni disparaître de près, ni devenir plus petit
    // que le personnage qu'il entoure — à ×16 le pinceau fait vingt-six mètres,
    // et un anneau plus étroit que lui ne l'entoure plus, il le barre.
    // ─── UN GRAND PINCEAU N'A PAS BESOIN QU'ON LE MONTRE ─────────────────────
    //
    // Le plancher `2,6 × échelle` existe pour qu'un anneau plus étroit que le
    // pinceau ne vienne pas le BARRER au lieu de l'entourer. Mais à ×16 il
    // donnait un cercle de quarante unités de large, tracé par-dessus le décor
    // puisque le halo ignore la profondeur : un gros rond gris sale au milieu
    // de l'écran, plus voyant que ce qu'il désignait.
    //
    // Le halo est un signal de RECHERCHE. Un pinceau de vingt mètres de haut
    // n'a rien à chercher : on le voit. On l'efface donc à mesure qu'il grandit
    // — plein à taille normale, éteint dès ×4. Le repère sert quand il est
    // utile et s'en va quand il ne l'est plus, ce qui est tout ce qu'on
    // demande à un repère.
    const discretion = 1 - Math.min(1, Math.max(0, (this.echelle - 1) / 3));
    this.haloMat.uniforms.uForce.value = discretion;
    this.halo.visible = this.halo.visible && discretion > 0.02;
    this.halo.scale.setScalar(Math.max(2.6 * this.echelle, distance * 0.11));
    this.haloMat.uniforms.uPhase.value += dt * (this.fleeing > 0 ? 5.5 : 2.5);
    this.haloMat.uniforms.uVol.value = this.fleeing > 0 ? 1 : 0;

    const voulue = this.echelles[this.station] ?? 1;
    this.echelle += (voulue - this.echelle) * Math.min(1, dt * 1.6);
    this.head.scale.setScalar(this.echelle);

    // L'épaisseur du trait était divisée ici par l'échelle du pinceau, pour
    // annuler la multiplication que lui faisait subir la matrice du modèle.
    // Le shader s'en charge désormais pour tout le monde (`src/render/ink.ts`),
    // décor mis à l'échelle compris — qui, lui, n'a jamais eu de rustine.
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
    const i = Math.min(this.station + 1, this.waypoints.length - 1);
    const next = this.waypoints[i];
    this.from.copy(this.head.position);
    this.sortie = null;

    // IL PASSE PAR LA PORTE, il ne traverse pas le vide.
    //
    // Quand le jalon suivant est derrière un portail, on ne vole pas jusqu'à
    // lui : on vole jusqu'à la FACE la plus proche de nous, on y disparaît, et
    // l'on ressort par la face jumelle. Le joueur voit donc où entrer — c'est
    // une invitation, et c'était tout le rôle de ce personnage.
    const porte = this.portes[i];
    if (porte) {
      const paire = this.faces.filter((f) => f.pairId === porte);
      if (paire.length === 2) {
        const [a, b] = paire;
        const entree = a.position.distanceTo(this.from) < b.position.distanceTo(this.from) ? a : b;
        const sortie = entree === a ? b : a;
        this.to.copy(entree.position);
        this.sortie = sortie.position.clone();
      } else {
        this.to.copy(next);
      }
    } else {
      this.to.copy(next);
    }

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
