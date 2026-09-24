import * as THREE from 'three';
import { faceWorldSize, traversalScale, type PortalFace } from '../core/portals.js';
import type { PortalPairDef } from '../core/types.js';
import { INK, PAPER } from './ink.js';

const FLIP = new THREE.Matrix4().makeRotationY(Math.PI);
/**
 * Le retournement d'une porte MIROIR : on n'inverse que la profondeur, la
 * latérale reste telle quelle — d'où l'échange de la gauche et de la droite.
 * Son déterminant vaut −1, ce qui a deux conséquences sur tout ce fichier :
 * le sens de parcours des triangles s'inverse, et la matrice ne peut plus se
 * décomposer en position/rotation. Les deux sont traitées plus bas.
 */
const MIROIR = new THREE.Matrix4().makeScale(1, 1, -1);

/** Surface du portail : la texture rendue, plaquée en projection écran. */
const createSurfaceMaterial = (map: THREE.Texture): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uInk: { value: INK },
      uPaper: { value: PAPER },
      // 0 : rien n'est dessiné, la porte n'est qu'une feuille blanche.
      // 1 : le monde d'en face est entièrement là.
      uTrace: { value: 1 },
      // La part de la cible réellement rendue : voir `PortalRenderer.rendre`.
      // Une porte qui fait un dixième de l'écran est rendue dans un dixième
      // de sa cible, et on la relit à cette échelle.
      uFraction: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: /* glsl */ `
      varying vec4 vClip;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vClip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = vClip;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uInk;
      uniform vec3 uPaper;
      uniform float uTrace;
      uniform vec2 uFraction;
      varying vec4 vClip;
      varying vec2 vUv;

      float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      void main() {
        // La texture a été rendue depuis la caméra virtuelle avec la MÊME
        // projection : on la relit donc en coordonnées écran, ce qui rend la
        // fenêtre exacte quel que soit l'angle de vue.
        //
        // AUCUN tremblement ici, volontairement. Le grain « dessiné » est
        // appliqué une seule fois, tout à la fin, sur l'image entière. Quand on
        // le mettait AUSSI sur la surface du portail, le contenu frémissait à
        // un rythme différent de ce qui l'entoure, et l'œil lisait deux feuilles
        // superposées au lieu d'une seule fenêtre. Une feuille, un tremblement.
        vec2 ecran = (vClip.xy / vClip.w) * 0.5 + 0.5;
        // La cible n'est remplie que sur une fraction de sa surface, celle
        // qu'il faut pour la taille de la porte à l'écran : on lit dedans.
        vec2 uv = ecran * uFraction;

        vec3 col = texture2D(uMap, uv).rgb;

        // ─── LE MONDE QUI SE DESSINE ─────────────────────────────────────
        //
        // Une porte peut n'être pas encore tracée. Elle est alors une feuille
        // vierge, et le monde d'en face y apparaît PAR TACHES, une à une,
        // jamais en fondu.
        //
        // Le fondu était le premier réflexe, et c'était le mauvais : un
        // dégradé se lit comme une transparence qu'on augmente — un effet
        // d'écran. Des taches qui tombent l'une après l'autre se lisent comme
        // une MAIN qui travaille. Le même coût, une intention complètement
        // différente.
        //
        // Chaque cellule d'une grille irrégulière reçoit son propre seuil ;
        // quand la trace le dépasse, la cellule bascule d'un coup. Le bord de
        // chaque tache est bruité, pour qu'aucune ne soit un carré.
        if (uTrace < 0.999) {
          vec2 cell = ecran * vec2(11.0, 15.0);
          vec2 id = floor(cell);
          vec2 f = fract(cell) - 0.5;
          float seuil = hash12(id);
          // Les taches naissent plutôt du bas, comme un pinceau qui remonte.
          seuil = seuil * 0.72 + (1.0 - ecran.y) * 0.28;
          float bord = 0.5 - length(f) * (0.75 + hash12(id + 7.3) * 0.5);
          // PAS D'ACCENT DANS UN NOM DE VARIABLE GLSL. Ce fichier est écrit en
          // français comme tout le projet, et cette variable s'appelait
          // « encrée » : le shader ne compilait plus, donc les surfaces de
          // portail ne se dessinaient plus du tout. Le jeu tournait, sans
          // aucun portail visible, et rien ne le disait hors de la console.
          // Le français s'arrête au bord des chaînes GLSL — les commentaires
          // le gardent, les identifiants non.
          float encree = step(seuil, uTrace) * step(-0.16, bord);
          col = mix(uPaper, col, encree);
          // La tache la plus fraîche est encore sombre : l'encre sèche ensuite.
          float fraiche = smoothstep(0.09, 0.0, uTrace - seuil) * encree;
          col = mix(col, uInk, fraiche * 0.55);
        }

        // Liseré d'encre sur le pourtour, pour que ce ne soit pas une découpe nette.
        vec2 e = min(vUv, 1.0 - vUv);
        float edge = smoothstep(0.0, 0.03, min(e.x, e.y));
        col = mix(uInk, col, edge);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

/**
 * LE DOS D'UNE PORTE : une feuille tendue dans le cadre.
 *
 * La surface ne se voit que de face ; de derrière, on voyait à travers le
 * cadre, comme par une fenêtre ouverte — et l'on pouvait y passer. Depuis que
 * le dos fait mur (voir `Simulation.dosDesPortes`), il doit se lire comme une
 * chose pleine : du papier, un liseré d'encre, et rien derrière.
 */
const createDosMaterial = (): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({
    uniforms: { uInk: { value: INK }, uPaper: { value: PAPER } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk;
      uniform vec3 uPaper;
      varying vec2 vUv;
      void main() {
        // Un papier un peu plus sourd que le ciel, pour qu'il se détache, et
        // une ombre portée par le cadre le long du bord.
        vec2 e = min(vUv, 1.0 - vUv);
        float bord = smoothstep(0.0, 0.025, min(e.x, e.y));
        float ombre = smoothstep(0.0, 0.18, min(e.x, e.y));
        vec3 col = mix(uPaper, uInk, 0.08 + 0.10 * (1.0 - ombre));
        col = mix(uInk, col, bord);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

/** Une face de portail côté rendu : sa surface, son cadre, sa cible de rendu. */
class PortalFaceView {
  readonly face: PortalFace;
  readonly group = new THREE.Group();
  readonly surface: THREE.Mesh;
  /** Le dos : voir `createDosMaterial`. */
  readonly dos: THREE.Mesh;
  readonly frame = new THREE.Group();
  /** Image finale, celle qu'on affiche. */
  readonly rt: THREE.WebGLRenderTarget;
  /** Image du niveau de profondeur précédent, pour les portails dans le portail. */
  readonly rtDeep: THREE.WebGLRenderTarget;
  readonly material: THREE.ShaderMaterial;
  readonly materialDeep: THREE.ShaderMaterial;
  readonly fallback: THREE.MeshBasicMaterial;
  twin!: PortalFaceView;
  /** Matériau du cadre, et sa teinte pleine — pour pouvoir la lui retirer. */
  private frameMat!: THREE.MeshBasicMaterial;
  private teinteCadre!: THREE.Color;

  /**
   * LE CADRE SE GRISE COMME LE MONDE.
   *
   * Les portails gardaient leur vermillon et leur indigo dans un village en
   * lavis : deux taches de couleur qu'on voyait à cent mètres, et les seules
   * qui restaient. On aurait pu les défendre — « ce sont eux qui portent la
   * mécanique » —, mais c'est faux : ce qui distingue les deux faces, c'est
   * leur TAILLE, l'une est quatre fois l'autre. Le signal est géométrique, pas
   * chromatique. Les griser ne coûte donc aucune lisibilité.
   *
   * Et ça rend la règle du jeu entière : dans ce monde, la couleur est ce qu'on
   * rapporte, jamais ce qui est déjà là.
   */
  /** Montre ou cache les montants — voir la passe de rendu d'un portail. */
  setCadreVisible(v: boolean): void {
    for (const m of this.posts) m.visible = v;
  }

  setCouleur(v: number): void {
    const gris =
      this.teinteCadre.r * 0.299 + this.teinteCadre.g * 0.587 + this.teinteCadre.b * 0.114;
    this.frameMat.color.setRGB(gris, gris, gris).lerp(this.teinteCadre, v);
  }

  private readonly posts: THREE.Mesh[] = [];

  constructor(face: PortalFace, color: number, width: number, height: number) {
    this.face = face;
    this.group.position.set(face.position.x, face.position.y, face.position.z);
    this.group.rotation.y = face.yaw;

    const makeTarget = (): THREE.WebGLRenderTarget => {
      const rt = new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: true,
      });
      // La cible contient déjà des octets encodés sRGB : le shader de surface
      // la relit telle quelle, sans reconversion.
      rt.texture.colorSpace = THREE.SRGBColorSpace;
      return rt;
    };
    this.rt = makeTarget();
    this.rtDeep = makeTarget();

    // Plan ancré par le BAS : les pieds se mappent ainsi sur les pieds.
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);

    this.material = createSurfaceMaterial(this.rt.texture);
    this.materialDeep = createSurfaceMaterial(this.rtDeep.texture);
    this.surface = new THREE.Mesh(geo, this.material);
    this.surface.frustumCulled = false;

    // Le dos regarde vers l'arrière, un centimètre derrière le plan : de face
    // on ne le voit jamais (sa face avant est de l'autre côté), de derrière il
    // ferme le cadre.
    this.dos = new THREE.Mesh(geo, createDosMaterial());
    this.dos.rotation.y = Math.PI;
    this.dos.position.z = -0.01;
    this.dos.frustumCulled = false;

    // ─── LE FOND DU PUITS ─────────────────────────────────────────
    //
    // Deux niveaux d'imbrication sont rendus pour de vrai. Au troisième, il faut
    // bien mettre QUELQUE CHOSE dans le rectangle, et c'était la teinte du
    // portail assombrie — un aplat rouge sombre. Signalé en jouant, et c'est
    // juste : dans le hall, où deux portes se font face, on descend vite de
    // trois crans et l'on tombe sur une porte pleine de peinture rouge au fond
    // d'un couloir de portails. Ce n'est pas de la profondeur, c'est un mur.
    //
    // La couleur est donc reprise à chaque image sur le BROUILLARD de la région
    // d'arrivée (voir `renderViews`). Le dernier niveau se dissout alors dans la
    // brume comme tout ce qui est trop loin pour être lu — ce qu'il est
    // exactement. On ne voit plus la limite : on voit de la distance.
    this.fallback = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).lerp(INK, 0.72),
    });

    // Cadre façon torii : deux montants et deux linteaux.
    const frameMat = new THREE.MeshBasicMaterial({ color });
    this.frameMat = frameMat;
    this.teinteCadre = new THREE.Color(color);
    const inkMat = new THREE.MeshBasicMaterial({ color: INK });
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), i === 3 ? inkMat : frameMat);
      m.frustumCulled = false;
      this.posts.push(m);
      this.frame.add(m);
    }

    this.group.add(this.surface, this.dos, this.frame);
  }

  /** Redimensionne la face. Appelé quand le joueur change d'échelle. */
  setSize(width: number, height: number): void {
    this.surface.scale.set(width, height, 1);
    this.dos.scale.set(width, height, 1);

    const t = width * 0.07;
    const [left, right, lintel, nuki] = this.posts;

    // Le cadre se tient ENTIÈREMENT du côté avant du plan. S'il l'enjambait —
    // ce qui était le cas —, sa moitié arrière se retrouverait dans l'autre
    // monde et viendrait masquer la vue : en traversant, on voyait l'épaisseur
    // du torii rouge alors qu'on est déjà de l'autre côté.
    this.frame.position.z = t * 0.5;

    // Les montants mordent un peu sur l'ouverture, comme une feuillure. C'est
    // ce léger débord qui rend le cadre visible DEPUIS l'intérieur de la vue :
    // sans lui, il tomberait pile à la limite et resterait invisible.
    const rebate = t * 0.32;

    left.scale.set(t, height * 1.04, t);
    left.position.set(-width * 0.5 + rebate - t * 0.5, height * 0.52, 0);

    right.scale.set(t, height * 1.04, t);
    right.position.set(width * 0.5 - rebate + t * 0.5, height * 0.52, 0);

    lintel.scale.set(width + t * 4.4, t * 1.15, t * 1.15);
    lintel.position.set(0, height - rebate + t * 0.575, 0);

    nuki.scale.set(width + t * 1.6, t * 0.5, t * 0.8);
    nuki.position.set(0, height * 0.86, 0);
  }
}

/**
 * Rendu des portails par cible de rendu.
 *
 * Pour chaque face visible, on place une caméra virtuelle derrière la face
 * jumelle, on rend la scène dedans, et on plaque le résultat sur la face. Le
 * facteur d'échelle appliqué à la position de la caméra virtuelle est
 * exactement celui qu'on subira en traversant : ce qu'on voit et ce qui nous
 * arrive sont donc gouvernés par la même constante.
 */
/**
 * Au-delà, une porte est de la brume : le brouillard le plus long du jeu
 * porte à trois cents mètres.
 */
const PORTEE_VUE = 320;
/**
 * En dessous de cet angle apparent (rayon sur distance), une porte fait
 * quelques pixels : on n'y rendrait rien de lisible. Le second niveau se
 * contente de moins encore — c'est une porte dans une porte.
 */
const ANGLE_MIN_1 = 0.004;
const ANGLE_MIN_2 = 0.012;

export class PortalRenderer {
  readonly views: PortalFaceView[] = [];
  readonly group = new THREE.Group();

  /** Caméra du premier niveau : ce qu'on voit à travers le portail. */
  private readonly camLevel1 = new THREE.PerspectiveCamera();
  /** Caméra du second niveau : ce qu'on voit à travers le portail DANS le portail. */
  private readonly camLevel2 = new THREE.PerspectiveCamera();
  private readonly clipPlane = new THREE.Plane();
  private readonly tmpMatrix = new THREE.Matrix4();
  private readonly tmpInverse = new THREE.Matrix4();
  private readonly tmpScaleMatrix = new THREE.Matrix4();
  private readonly tmpVec = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();
  private readonly tmpNormal = new THREE.Vector3();
  private ambience?: (position: THREE.Vector3) => void;

  constructor(faces: PortalFace[], pairs: PortalPairDef[], width: number, height: number) {
    const colorOf = (face: PortalFace): number => {
      const pair = pairs.find((p) => p.id === face.pairId)!;
      return face.kind === 'big' ? pair.colorBig : pair.colorSmall;
    };

    for (const face of faces) {
      const view = new PortalFaceView(face, colorOf(face), width, height);
      this.views.push(view);
      this.group.add(view.group);
    }
    for (const view of this.views) {
      view.twin = this.views.find((v) => v.face === view.face.twin)!;
    }
    this.applySizes();
  }

  /**
   * LE MONDE QUI SE DESSINE, côté commande.
   *
   * `trace` va de 0 (feuille vierge) à 1 (monde entier). On l'avance par petits
   * paliers plutôt qu'en continu : c'est ce qui donne le « clac, clac » — une
   * poignée de taches d'un coup, un silence, une autre poignée. Avancé
   * doucement et sans à-coup, l'effet redevient un fondu, et un fondu ne
   * raconte rien.
   */
  tracer(pairId: string, trace: number): void {
    for (const view of this.views) {
      if (view.face.pairId !== pairId) continue;
      view.material.uniforms.uTrace.value = trace;
      view.materialDeep.uniforms.uTrace.value = trace;
    }
  }

  /**
   * Grise ou rend leur couleur aux cadres — **région par région**.
   *
   * C'était un seul nombre pour tout le monde, et ça ne pouvait pas marcher dès
   * qu'un niveau contient à la fois des régions qui attendent une couleur et
   * des régions qui n'en attendent aucune : une seule région en attente
   * décolorait toutes les portes du niveau, y compris celles qui n'avaient rien
   * à voir avec elle.
   *
   * Trouvé en jouant sur le banc d'essai, où une seule station attend l'or et
   * où les onze autres se retrouvaient en noir et blanc.
   *
   * Et ce n'était pas qu'une affaire de goût : **la couleur d'une face dit dans
   * quel sens elle change la taille** — vermillon pour la grande, indigo pour la
   * petite. La griser retire au joueur l'information dont il a le plus besoin
   * pour lire une porte.
   */
  setCouleurCadres(v: number | ((face: PortalFace) => number)): void {
    for (const view of this.views) {
      view.setCouleur(typeof v === 'function' ? v(view.face) : v);
    }
  }

  /** Où en est le tracé d'une paire. 1 si elle n'a jamais été effacée. */
  traceDe(pairId: string): number {
    const view = this.views.find((v) => v.face.pairId === pairId);
    return view ? (view.material.uniforms.uTrace.value as number) : 1;
  }

  /**
   * Pose les faces à leur taille définitive. Appelé UNE fois : un portail est
   * un monument, il ne suit pas le joueur. Même source de vérité que la
   * détection de traversée — ce qu'on voit et ce qu'on franchit coïncident.
   */
  private applySizes(): void {
    for (const view of this.views) {
      const { width, height } = faceWorldSize(view.face);
      view.setSize(width, height);
    }
    this.group.updateMatrixWorld(true);
  }

  resize(width: number, height: number): void {
    for (const view of this.views) {
      view.rt.setSize(width, height);
      view.rtDeep.setSize(width, height);
    }
  }

  /**
   * Rend le contenu de chaque portail. À appeler AVANT le rendu de la scène
   * principale, sur la même scène.
   *
   * DEUX niveaux de profondeur, et ce n'est pas du luxe : depuis le fond de la
   * cour, en regardant par la petite porte, on aperçoit le grand torii lui-même
   * à une vingtaine de mètres. Avec un seul niveau il s'affichait en aplat
   * rouge plat au beau milieu de l'image. Avec deux, il montre ce qu'il y a
   * derrière lui, et l'aplat sourd ne survient qu'au troisième emboîtement —
   * en pratique invisible.
   *
   * ═══════════════════════════════════════════════════════════════════════
   * LE SECOND NIVEAU EST RENDU POUR CHAQUE PORTE VUE À TRAVERS, AVEC SA
   * PROPRE CAMÉRA — et c'est une correction.
   *
   * Il l'était avec une caméra passée deux fois par la MÊME porte : juste
   * quand une porte se voit elle-même (le torii par la porte indigo, dans le
   * hall), faux pour toute autre porte aperçue à travers — elle recevait une
   * image prise d'un point de vue sans rapport, souvent hors du monde. Le
   * joueur voyait, à travers une porte, les portes de la pièce d'en face en
   * noir ou en aplat de brume, qui ne « s'allumaient » qu'une fois la porte
   * franchie. Signalé en jouant : « une sensation de saccade ».
   *
   * Maintenant, pour chaque porte visible depuis le joueur, on cherche les
   * portes visibles DEPUIS SA CAMÉRA VIRTUELLE, on rend chacune avec la
   * caméra passée par la première porte PUIS par elle, et c'est cette image
   * qu'on plaque dans la vue. Et l'on ne rend que ce qui est visible : une
   * face derrière soi, ou hors du champ, ne coûte rien — la montée compte
   * vingt faces, et l'on en rendait quarante fois la scène par image.
   * ═══════════════════════════════════════════════════════════════════════
   */
  renderViews(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    ambience?: (position: THREE.Vector3) => void,
  ): void {
    const previousTarget = renderer.getRenderTarget();
    this.ambience = ambience;
    this.rendus = 0;
    this.ecrans = 0;

    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

    for (const view of this.views) {
      if (!this.visibleDepuis(view, camera, ANGLE_MIN_1)) continue;

      // Niveau 1 : la caméra du joueur passée une fois par le portail.
      this.computeVirtual(view, camera, this.camLevel1);
      this.camLevel1.matrixWorldInverse.copy(this.camLevel1.matrixWorld).invert();
      // Ce que cette vue tranche : tout ce qui est devant la face jumelle.
      this.setupClipPlane(view);

      // Niveau 2 : chaque porte visible depuis là, rendue avec la caméra
      // passée par CETTE porte puis par elle. La jumelle est exclue : on la
      // regarde par l'arrière, et sa surface est masquée dans cette vue. La
      // porte elle-même ne l'est pas — dans le hall, les deux faces se font
      // face et le torii se voit à travers la porte indigo.
      const profondes: PortalFaceView[] = [];
      for (const other of this.views) {
        if (other === view.twin) continue;
        if (this.visibleDepuis(other, this.camLevel1, ANGLE_MIN_2, this.clipPlane)) profondes.push(other);
      }
      for (const other of profondes) {
        this.computeVirtual(other, this.camLevel1, this.camLevel2);
        // Au troisième emboîtement, un aplat de brume : voir `fallback`.
        for (const v of this.views) v.surface.material = v.fallback;
        const q = this.fractionPour(other, this.camLevel1);
        this.rendre(renderer, scene, other, this.camLevel2, other.rtDeep, q);
        (other.materialDeep.uniforms.uFraction.value as THREE.Vector2).set(q, q);
      }

      for (const v of this.views) {
        v.surface.material = profondes.includes(v) ? v.materialDeep : v.fallback;
      }
      const q = this.fractionPour(view, camera);
      this.rendre(renderer, scene, view, this.camLevel1, view.rt, q);
      (view.material.uniforms.uFraction.value as THREE.Vector2).set(q, q);
    }

    // On rétablit les surfaces d'affichage pour le rendu de la scène principale.
    for (const view of this.views) view.surface.material = view.material;
    renderer.setRenderTarget(previousTarget);
  }

  /** Scènes rendues dans les portails à la dernière image. Pour mesurer. */
  rendus = 0;
  /** Pixels rendus dans les portails à la dernière image, en écrans entiers. */
  ecrans = 0;

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * UNE PORTE SE REND À LA TAILLE QU'ELLE FAIT À L'ÉCRAN.
   *
   * Chaque vue remplissait sa cible entière — un écran complet par porte
   * visible, et la cour du refus en montre quinze avec ses portes dans les
   * portes. Sur une bonne machine : 23 images par seconde là où l'on en
   * attend 120. Signalé en jouant, et mesuré.
   *
   * Or une porte qui fait un dixième de l'écran n'a besoin que d'un dixième
   * de l'image : la surface la relit en coordonnées écran, et ne regarde
   * jamais ailleurs que dans son rectangle. On rend donc chaque vue dans une
   * sous-fenêtre de sa cible, proportionnelle à la taille apparente de la
   * porte, et la surface lit à cette échelle (`uFraction`). Une porte de tout
   * l'écran garde toute sa cible ; une porte au loin coûte quelques pixels.
   * Le nombre de rendus ne change pas, leur poids si — et c'est le poids qui
   * comptait.
   *
   * `qualite` est un facteur global posé de l'extérieur : la boucle
   * principale le baisse quand les images s'allongent, et le remonte quand
   * elles s'accélèrent. C'est l'autre moitié de la réponse : le jeu tient sa
   * cadence sur l'appareil qu'on a, au prix d'un peu de flou dans les portes.
   * ═══════════════════════════════════════════════════════════════════════
   */
  qualite = 1;

  /** Fraction de la cible à rendre pour cette vue, vue de cette caméra. */
  private fractionPour(view: PortalFaceView, cam: THREE.PerspectiveCamera): number {
    const w = view.surface.scale.x;
    const h = view.surface.scale.y;
    this.tmpVec2.set(0, h * 0.5, 0);
    view.group.localToWorld(this.tmpVec2);
    const d = this.tmpVec2.distanceTo(this.tmpVec.setFromMatrixPosition(cam.matrixWorld));
    const rayon = Math.hypot(w, h) * 0.5;
    // Part de la hauteur de l'écran que couvre la sphère de la porte.
    const couverture = rayon / Math.max(d, 1e-3) / Math.tan((cam.fov * Math.PI) / 360);
    // Un peu plus que la couverture, pour que le filtrage ne floute pas, et
    // jamais moins qu'un huitième : une porte lointaine reste lisible.
    return Math.min(1, Math.max(0.125, (couverture * 1.25 + 0.04) * this.qualite));
  }

  private readonly frustum = new THREE.Frustum();
  private readonly projScreen = new THREE.Matrix4();
  private readonly sphere = new THREE.Sphere();
  private readonly tmpVec2 = new THREE.Vector3();
  private readonly tmpNormal2 = new THREE.Vector3();

  /**
   * Une face est-elle visible depuis cette caméra : devant elle (on ne voit
   * une porte que par sa face avant) et dans son champ. La sphère qui
   * enveloppe le rectangle suffit — elle contient tout ce qui pourrait se
   * voir, et une porte rendue pour rien coûte moins qu'une porte manquée.
   */
  private visibleDepuis(
    view: PortalFaceView,
    cam: THREE.Camera,
    angleMin: number,
    coupe?: THREE.Plane,
  ): boolean {
    view.group.getWorldDirection(this.tmpNormal2);
    this.tmpVec2.setFromMatrixPosition(cam.matrixWorld).sub(view.group.position);
    if (this.tmpVec2.dot(this.tmpNormal2) <= 0) return false;

    const w = view.surface.scale.x;
    const h = view.surface.scale.y;
    this.sphere.center.set(0, h * 0.5, 0);
    view.group.localToWorld(this.sphere.center);
    this.sphere.radius = Math.hypot(w, h) * 0.5;

    // Trop loin pour être autre chose que de la brume, ou trop petite à
    // l'écran pour qu'on y distingue quoi que ce soit : on ne rend pas.
    const d = this.sphere.center.distanceTo(this.tmpVec2.setFromMatrixPosition(cam.matrixWorld));
    if (d > PORTEE_VUE || this.sphere.radius < d * angleMin) return false;

    // Entièrement du côté tranché par le plan de coupe : invisible.
    if (coupe && coupe.distanceToPoint(this.sphere.center) < -this.sphere.radius) return false;

    this.projScreen.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreen);
    return this.frustum.intersectsSphere(this.sphere);
  }

  /** Rend ce qu'on voit par `view` avec la caméra donnée, dans la cible. */
  private rendre(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    view: PortalFaceView,
    renderCamera: THREE.PerspectiveCamera,
    target: THREE.WebGLRenderTarget,
    fraction: number,
  ): void {
    // On masque la SURFACE de la face jumelle, mais surtout PAS son cadre.
    //
    // La caméra virtuelle se tient juste derrière cette face : son cadre doit
    // donc encadrer la vue, exactement comme une fenêtre vue de tout près.
    // C'est ce qui manquait au moment de traverser — on voyait l'épaisseur du
    // torii rouge des deux côtés, alors que de l'autre côté c'est celle de la
    // porte indigo qu'on devrait voir. C'était le dernier détail qui trahissait
    // le passage.
    //
    // Sa surface, elle, n'a rien à faire là : la caméra la regarde par
    // l'arrière.
    view.twin.surface.visible = false;
    // Et son dos : la caméra virtuelle se tient précisément derrière elle, et
    // c'est de là que le dos se voit. Il fermerait la vue.
    view.twin.dos.visible = false;

    // ─── ET SON CADRE AVEC, SINON IL BARRE L'OUVERTURE ─────────────────
    //
    // Le cadre de la face jumelle est à cheval sur le plan de coupe : la
    // moitié qui reste du bon côté survit au découpage et se dessine EN
    // TRAVERS de la vue, comme une poutre noire posée sous le linteau.
    //
    // Signalé en jouant : « le cadre bleu est mal mis, il est en
    // superposition avec autre chose ». Ce n'était pas un cadre mal placé,
    // c'était le cadre d'EN FACE, vu de l'intérieur et tranché net.
    view.twin.setCadreVisible(false);

    this.setupClipPlane(view);
    renderer.clippingPlanes = [this.clipPlane];

    // L'ambiance de la région d'ARRIVÉE, pas celle où l'on se tient : c'est
    // ce qui fait qu'un portail donne à voir un autre ciel avant qu'on y
    // entre, et c'est là tout l'effet.
    this.ambience?.(renderCamera.position);

    // L'aplat de dernier recours prend la couleur du brouillard de LA RÉGION
    // QU'ON REGARDE — donc juste après l'appel ci-dessus, jamais avant. Un
    // portail qui donne sur un autre ciel doit s'éteindre dans CE ciel-là.
    const brume = (scene.fog as THREE.Fog | null)?.color;
    if (brume) for (const v of this.views) v.fallback.color.copy(brume);

    // ═══════════════════════════════════════════════════════════════════
    // UNE SEULE RÈGLE, ICI COMME POUR LA VUE PRINCIPALE.
    //
    // On retourne les matériaux dès que la caméra employée est GAUCHÈRE, et
    // c'est tout. Une caméra devient gauchère en passant par une réflexion —
    // donc à travers une porte miroir, ou parce que le joueur en a déjà
    // franchi un nombre impair. La caméra virtuelle d'une porte miroir est
    // construite dans `computeVirtual` ; on constate sa main et l'on en tire
    // la conséquence, sans rien compenser.
    // ═══════════════════════════════════════════════════════════════════
    const gauchere = renderCamera.matrixWorld.determinant() < 0;
    const retournes = gauchere ? PortalRenderer.materiauxDe(scene) : [];
    for (const m of retournes) {
      m.side = m.side === THREE.FrontSide ? THREE.BackSide : THREE.FrontSide;
    }

    // La sous-fenêtre : voir `fractionPour`. Le ciseau borne aussi
    // l'effacement, on ne paie que ce qu'on dessine.
    const pw = Math.max(1, Math.round(target.width * fraction));
    const ph = Math.max(1, Math.round(target.height * fraction));
    target.viewport.set(0, 0, pw, ph);
    target.scissor.set(0, 0, pw, ph);
    target.scissorTest = true;
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, renderCamera);
    this.rendus++;
    this.ecrans += (pw * ph) / (target.width * target.height);

    for (const m of retournes) {
      m.side = m.side === THREE.FrontSide ? THREE.BackSide : THREE.FrontSide;
    }

    renderer.clippingPlanes = [];
    view.twin.surface.visible = true;
    view.twin.dos.visible = true;
    view.twin.setCadreVisible(true);
  }

  /**
   * Tous les matériaux à un seul côté de la scène, trouvés une fois pour toutes.
   *
   * Les double face n'ont pas de sens à retourner. On ne parcourt la scène qu'à
   * la première caméra gauchère rencontrée, et jamais plus : un matériau ne
   * change pas d'identité une fois bâti, et bien des parties n'ont aucun miroir.
   *
   * Statique, parce que la vue principale en a besoin elle aussi dès que le
   * joueur a franchi un nombre impair de miroirs — et il n'y a aucune raison
   * de tenir deux catalogues de la même scène.
   */
  private static materiaux: THREE.Material[] = [];
  private static materiauxTrouves = false;
  static materiauxDe(scene: THREE.Scene): THREE.Material[] {
    if (PortalRenderer.materiauxTrouves) return PortalRenderer.materiaux;
    PortalRenderer.materiauxTrouves = true;
    const vus = new Set<THREE.Material>();
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      if (!m) return;
      for (const x of Array.isArray(m) ? m : [m]) {
        if (x.side !== THREE.DoubleSide) vus.add(x);
      }
    });
    PortalRenderer.materiaux = [...vus];
    return PortalRenderer.materiaux;
  }

  /**
   * Écarte la surface du portail quand l'œil la frôle.
   *
   * Une surface plane, sans épaisseur, est tranchée par le plan proche de la
   * caméra dès qu'on la touche presque : pendant une image on voit à travers,
   * et l'on se retrouve à moitié dans chaque monde. En la reculant juste ce
   * qu'il faut, elle reste toujours devant le plan proche. Le décalage
   * n'excède jamais quelques centimètres, et comme l'image est plaquée en
   * coordonnées écran, elle ne bouge pas d'un pixel pour autant.
   */
  updateSurfaceOffsets(camera: THREE.PerspectiveCamera): void {
    for (const view of this.views) {
      view.group.getWorldDirection(this.tmpNormal);
      const d = this.tmpVec.copy(camera.position).sub(view.group.position).dot(this.tmpNormal);
      // Uniquement quand on se tient DEVANT la face. Vu de derrière, d est
      // négatif et la formule reculait la surface d'autant : elle s'éloignait
      // en suivant le joueur, comme un cadre à la dérive. Derrière, il n'y a de
      // toute façon rien à protéger — la surface n'y est pas visible.
      view.surface.position.z = d > 0 ? Math.min(0, d - camera.near * 2.5) : 0;
    }
    this.group.updateMatrixWorld(true);
  }

  /**
   * Caméra virtuelle : la caméra du joueur, exprimée dans le repère de la face
   * regardée, retournée de 180°, mise à l'échelle, puis replacée dans le repère
   * de la face jumelle.
   */
  private computeVirtual(
    view: PortalFaceView,
    source: THREE.PerspectiveCamera,
    out: THREE.PerspectiveCamera,
  ): void {
    const s = traversalScale(view.face);
    this.tmpScaleMatrix.makeScale(s, s, s);

    this.tmpInverse.copy(view.group.matrixWorld).invert();
    this.tmpMatrix
      .copy(view.twin.group.matrixWorld)
      .multiply(view.face.miroir === true ? MIROIR : FLIP)
      .multiply(this.tmpScaleMatrix)
      .multiply(this.tmpInverse)
      .multiply(source.matrixWorld);

    // ═══════════════════════════════════════════════════════════════════════
    // LA RÉFLEXION SE LIT SUR LA MATRICE, JAMAIS SUR LA PORTE.
    //
    // On la lisait sur la porte — « miroir : oui ou non » —, et c'était faux
    // dès que la caméra SOURCE était elle-même gauchère : le joueur qui a
    // franchi un miroir, ou une caméra virtuelle déjà passée par un. Une porte
    // ordinaire prenait alors le chemin ordinaire, `decompose` négociait le
    // déterminant négatif en inversant une échelle qu'on remettait à 1, et la
    // réflexion disparaissait : la caméra virtuelle redevenait droitière, et
    // le contenu de la porte s'affichait inversé par rapport au monde qui
    // l'entoure. Signalé en jouant après la première salle chirale de la
    // montée : « voile blanc et bug de rendu sur le portail », « de gros soucis
    // sur les portails qui ont un effet miroir ». Mesuré : déterminant +1 en
    // sortie pour une source à −1.
    //
    // Le déterminant de la matrice composée dit la vérité dans tous les cas :
    // miroir ou pas, source gauchère ou pas, et même deux miroirs qui
    // s'annulent.
    // ═══════════════════════════════════════════════════════════════════════
    const reflechi = this.tmpMatrix.determinant() < 0;

    if (reflechi) {
      // ON NE DÉCOMPOSE PAS UNE RÉFLEXION.
      //
      // `decompose` suppose une matrice de déterminant positif ; devant un
      // déterminant négatif elle négocie en inversant une échelle, et comme on
      // remet ensuite l'échelle à 1, la rotation obtenue est fausse — la vue à
      // travers le miroir partirait de travers, sans qu'on comprenne pourquoi.
      //
      // On installe donc la matrice telle quelle et l'on coupe la
      // recomposition automatique. C'est aussi la raison pour laquelle ce
      // chemin est séparé : le cas ordinaire, lui, marche depuis longtemps et
      // n'avait aucune raison d'être touché.
      // ─── MAIS ON LUI RETIRE SON ÉCHELLE, ET C'EST INDISPENSABLE ─────────
      //
      // Le chemin ordinaire décompose puis remet l'échelle à 1 : la caméra
      // virtuelle voit donc des profondeurs en unités du monde, comme la vraie.
      // Le chemin du miroir installait la matrice TELLE QUELLE — facteur de
      // franchissement compris. Les profondeurs vues à travers étaient donc
      // multipliées par quatre.
      //
      // Ça ne se voit pas sur les formes, qui restent justes : la projection
      // compense. Ça se voit sur le TRAIT D'ENCRE, dont l'épaisseur est
      // délibérément proportionnelle à la profondeur pour rester constante à
      // l'écran. Quatre fois la profondeur, quatre fois le trait — puis retour
      // à la normale une fois passé.
      //
      // Signalé en jouant : « le trait est trop épais, et puis hop il devient
      // moins épais, c'est bizarre ». C'est le même défaut que celui des
      // pinceaux au tout début du projet, arrivé par l'autre bout : là on
      // gonflait un objet mis à l'échelle, ici on met la CAMÉRA à l'échelle.
      //
      // On normalise donc les trois colonnes de la base à la longueur 1. La
      // réflexion est préservée — on ne touche pas aux signes, seulement aux
      // longueurs — et le déterminant reste négatif, ce qui est le sujet même
      // de ce chemin.
      const e = this.tmpMatrix.elements;
      for (let c = 0; c < 3; c++) {
        const i = c * 4;
        const l = Math.hypot(e[i], e[i + 1], e[i + 2]) || 1;
        e[i] /= l;
        e[i + 1] /= l;
        e[i + 2] /= l;
      }

      out.matrixAutoUpdate = false;
      out.matrix.copy(this.tmpMatrix);
      out.matrixWorld.copy(this.tmpMatrix);
      out.matrixWorldInverse.copy(this.tmpMatrix).invert();
      // La position reste lisible pour qui la demande — le choix d'ambiance
      // s'en sert, et il n'a pas à savoir qu'il regarde à travers un miroir.
      out.position.setFromMatrixPosition(this.tmpMatrix);
    } else {
      out.matrixAutoUpdate = true;
      this.tmpMatrix.decompose(out.position, this.tmpQuat, this.tmpVec);
      out.quaternion.copy(this.tmpQuat);
      out.scale.set(1, 1, 1);
    }

    // Le champ de vision doit être identique, sinon la fenêtre « ment ».
    // On dérive de la caméra SOURCE et non de celle du joueur : en chaînant,
    // les facteurs d'échelle se composent tout seuls d'un niveau à l'autre.
    out.fov = source.fov;
    out.aspect = source.aspect;
    // ─── LE PLAN PROCHE SUIT L'ÉCHELLE, LE PLAN LOINTAIN NON ────────────────
    //
    // Les deux étaient multipliés par l'échelle de la traversée, ce qui paraît
    // symétrique et ne l'est pas. Signalé en jouant : « quand je passe le
    // portail, on voit des bâtiments en plus ». C'était exact, et voici
    // pourquoi.
    //
    // En franchissant la grande face on rétrécit de quatre : le plan lointain
    // de la vue tombait donc de 460 à 115 unités. Mais le BROUILLARD, lui, porte
    // à 300 dans le même monde. Tout ce qui se tenait entre 115 et 300 était
    // tranché net dans le portail et surgissait à l'instant de la traversée.
    // On ne voyait pas la même chose des deux côtés d'une porte qui promet
    // justement de montrer l'autre côté avant qu'on y entre.
    //
    // Le plan PROCHE doit suivre l'échelle — c'est ce qui permet à un joueur
    // minuscule de coller son œil aux choses. Le plan LOINTAIN, lui, mesure une
    // distance dans le monde, et le monde ne change pas de taille : il reste
    // celui qu'aura la vraie caméra une fois qu'on aura traversé.
    //
    // ET IL PEUT S'AVANCER JUSQU'AU PLAN DE LA JUMELLE, OU PRESQUE. Tout ce
    // qui se trouve entre la caméra virtuelle et la face jumelle est tranché
    // par le plan de coupe ; rien de visible n'est donc plus près que la face
    // elle-même, dont le point le plus proche est au moins aux deux tiers de
    // la distance perpendiculaire (le champ fait 72°). On pose le plan proche
    // à quatre dixièmes de cette distance : quand on regarde une porte de dix
    // mètres, la profondeur de la vue à travers est cent fois plus précise
    // que quand il restait collé à l'œil — et c'est dans les portes qu'on
    // voyait les couches du décor se disputer la profondeur. Collé à la face,
    // on retombe sur l'ancien plan, et rien ne change.
    view.twin.group.getWorldDirection(this.tmpNormal);
    const recul = Math.abs(this.tmpVec.copy(out.position).sub(view.twin.group.position).dot(this.tmpNormal));
    out.near = Math.max(source.near * s, 0.03, recul * 0.4);
    out.far = source.far;
    out.updateProjectionMatrix();
    // Une matrice de réflexion posée à la main serait aussitôt recalculée à
    // partir de la position et du quaternion : on ne rafraîchit donc que le cas
    // ordinaire.
    if (!reflechi) out.updateMatrixWorld(true);
  }

  /**
   * Plan de coupe posé sur la face jumelle : sans lui, tout ce qui se trouve
   * entre la caméra virtuelle et le portail viendrait polluer l'image.
   */
  private setupClipPlane(view: PortalFaceView): void {
    const twin = view.twin;
    twin.group.getWorldDirection(this.tmpNormal); // axe +Z du groupe = normale
    // Léger recul, proportionnel au portail, pour ne pas trancher son cadre.
    this.tmpVec
      .copy(twin.group.position)
      .addScaledVector(this.tmpNormal, -0.02 * twin.face.height);
    this.clipPlane.setFromNormalAndCoplanarPoint(this.tmpNormal, this.tmpVec);
  }
}
