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
        vec2 uv = (vClip.xy / vClip.w) * 0.5 + 0.5;

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
          vec2 cell = uv * vec2(11.0, 15.0);
          vec2 id = floor(cell);
          vec2 f = fract(cell) - 0.5;
          float seuil = hash12(id);
          // Les taches naissent plutôt du bas, comme un pinceau qui remonte.
          seuil = seuil * 0.72 + (1.0 - uv.y) * 0.28;
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

/** Une face de portail côté rendu : sa surface, son cadre, sa cible de rendu. */
class PortalFaceView {
  readonly face: PortalFace;
  readonly group = new THREE.Group();
  readonly surface: THREE.Mesh;
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

    this.group.add(this.surface, this.frame);
  }

  /** Redimensionne la face. Appelé quand le joueur change d'échelle. */
  setSize(width: number, height: number): void {
    this.surface.scale.set(width, height, 1);

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
   */
  renderViews(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    ambience?: (position: THREE.Vector3) => void,
  ): void {
    const previousTarget = renderer.getRenderTarget();
    this.ambience = ambience;

    // Passe profonde : les portails vus dans les portails sont des aplats.
    this.renderPass(renderer, scene, camera, 'deep');
    // Passe visible : ils montrent maintenant le résultat de la passe profonde.
    this.renderPass(renderer, scene, camera, 'final');

    // On rétablit les surfaces d'affichage pour le rendu de la scène principale.
    for (const view of this.views) view.surface.material = view.material;
    renderer.setRenderTarget(previousTarget);
  }

  private renderPass(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    level: 'deep' | 'final',
  ): void {
    for (const view of this.views) {
      for (const other of this.views) {
        other.surface.material = level === 'deep' ? other.fallback : other.materialDeep;
      }
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
      // l'arrière, et le seul portail encore visible dans la vue d'une face
      // reste cette face elle-même — ce qui rend la chaîne de caméras
      // ci-dessous exactement juste.
      view.twin.surface.visible = false;

      // Niveau 1 : la caméra du joueur passée une fois par le portail.
      this.computeVirtual(view, camera, this.camLevel1);
      let renderCamera = this.camLevel1;

      if (level === 'deep') {
        // Niveau 2 : on repasse par le MÊME portail. C'est ce second passage
        // qui manquait — sans lui, les deux passes partageaient une seule
        // caméra et le portail finissait par se montrer lui-même, d'où l'aplat
        // en plein milieu de l'image.
        this.computeVirtual(view, this.camLevel1, this.camLevel2);
        renderCamera = this.camLevel2;
      }

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

      // LE PIÈGE DU MIROIR, et il n'a rien d'évident.
      //
      // Une porte miroir transporte la caméra par une RÉFLEXION, dont le
      // déterminant est négatif. Or un déterminant négatif retourne le sens de
      // parcours des triangles : ce que la carte graphique tenait pour la face
      // avant devient la face arrière, et inversement. Sans rien faire, tout le
      // décor vu à travers le miroir serait dessiné à l'envers — on verrait
      // l'intérieur des murs et le vide à la place des volumes.
      //
      // La parade tient en une ligne : on inverse la convention de parcours
      // pendant cette passe, et on la remet aussitôt après. Three.js ne gère
      // pas `frontFace` dans son suivi d'état, donc l'appel direct ne risque
      // pas d'être écrasé.
      const gl = renderer.getContext();
      const reflechi = view.face.miroir === true;
      if (reflechi) gl.frontFace(gl.CW);

      renderer.setRenderTarget(level === 'deep' ? view.rtDeep : view.rt);
      renderer.clear();
      renderer.render(scene, renderCamera);

      if (reflechi) gl.frontFace(gl.CCW);

      renderer.clippingPlanes = [];
      view.twin.surface.visible = true;
    }
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

    const reflechi = view.face.miroir === true;

    this.tmpInverse.copy(view.group.matrixWorld).invert();
    this.tmpMatrix
      .copy(view.twin.group.matrixWorld)
      .multiply(reflechi ? MIROIR : FLIP)
      .multiply(this.tmpScaleMatrix)
      .multiply(this.tmpInverse)
      .multiply(source.matrixWorld);

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
    out.near = source.near * s;
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
