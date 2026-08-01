import * as THREE from 'three';
import { faceWorldSize, traversalScale, type PortalFace } from '../core/portals.js';
import type { PortalPairDef } from '../core/types.js';
import { INK } from './ink.js';

const FLIP = new THREE.Matrix4().makeRotationY(Math.PI);

/** Surface du portail : la texture rendue, plaquée en projection écran. */
const createSurfaceMaterial = (map: THREE.Texture): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uInk: { value: INK },
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
      varying vec4 vClip;
      varying vec2 vUv;

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

    // Aplat de dernier recours, au troisième niveau d'imbrication seulement.
    // Teinté d'encre et non de la couleur vive du portail : à cette profondeur
    // il vaut mieux une tache sourde qu'un aplat criard qui saute aux yeux.
    this.fallback = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).lerp(INK, 0.72),
    });

    // Cadre façon torii : deux montants et deux linteaux.
    const frameMat = new THREE.MeshBasicMaterial({ color });
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
  ): void {
    const previousTarget = renderer.getRenderTarget();

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

      renderer.setRenderTarget(level === 'deep' ? view.rtDeep : view.rt);
      renderer.clear();
      renderer.render(scene, renderCamera);

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

    this.tmpInverse.copy(view.group.matrixWorld).invert();
    this.tmpMatrix
      .copy(view.twin.group.matrixWorld)
      .multiply(FLIP)
      .multiply(this.tmpScaleMatrix)
      .multiply(this.tmpInverse)
      .multiply(source.matrixWorld);

    this.tmpMatrix.decompose(out.position, this.tmpQuat, this.tmpVec);
    out.quaternion.copy(this.tmpQuat);
    out.scale.set(1, 1, 1);

    // Le champ de vision doit être identique, sinon la fenêtre « ment ».
    // On dérive de la caméra SOURCE et non de celle du joueur : en chaînant,
    // les facteurs d'échelle se composent tout seuls d'un niveau à l'autre.
    out.fov = source.fov;
    out.aspect = source.aspect;
    out.near = source.near * s;
    out.far = source.far * s;
    out.updateProjectionMatrix();
    out.updateMatrixWorld(true);
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
