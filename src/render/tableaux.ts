import * as THREE from 'three';
import type { TableauDef } from '../core/types.js';
import { INK, createCelMaterial, createOutlineMaterial, syncInkUniforms } from './ink.js';
import { buildWorldGeometry } from './worldMesh.js';

/**
 * LE TABLEAU AU MUR — ce que la pièce devrait être.
 *
 * Un cadre d'encre, et dedans une image de la salle telle qu'elle sera quand
 * ses familles auront reçu les bonnes couleurs. On s'approche d'un objet, on
 * appuie, sa famille bascule ; quand tout concorde, la porte suivante peut se
 * dessiner.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * L'IMAGE EST UN VRAI RENDU, PRIS UNE SEULE FOIS
 *
 * Pas un dessin peint à la main, pas une texture à fabriquer : on rend la
 * SCÈNE ELLE-MÊME, depuis un point choisi, avec les familles déjà peintes —
 * puis on remet tout comme c'était. La machinerie existe déjà et sert à autre
 * chose depuis le début : c'est exactement ce que fait un portail, une fois par
 * image. Ici, une fois pour toutes.
 *
 * Trois conséquences, et elles décident de la qualité du moment :
 *
 * — **Le tableau ne peut pas mentir.** Il montre le même décor, avec le même
 *   trait, le même grain, la même trame. Un dessin fait à part finirait par
 *   diverger du niveau au premier déplacement de mur, et le joueur chercherait
 *   une différence qui n'existe que dans notre négligence.
 *
 * — **Il coûte zéro par image.** Un rendu au chargement, et ensuite c'est une
 *   texture comme une autre.
 *
 * — **Et il dit la vérité sur le point de vue.** Le tableau est peint depuis un
 *   endroit précis de la pièce ; s'en approcher fait converger la composition.
 *   C'est ce qui permettra, plus tard, une salle où trouver d'où quelqu'un
 *   regardait EST l'énigme — ce qui est, après tout, l'occupation d'un peintre.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Définition en pixels de chaque toile. Un tableau se regarde de près. */
const RESOLUTION = 512;

/** Profondeur du cadre, en fraction de sa largeur. Un cadre est mince. */
const EPAISSEUR = 0.05;

interface Toile {
  def: TableauDef;
  rt: THREE.WebGLRenderTarget;
  camera: THREE.PerspectiveCamera;
  /** La surface peinte. Masquée pendant la prise, sinon elle se photographie. */
  surface: THREE.Mesh;
}

export class Tableaux {
  readonly group = new THREE.Group();
  private readonly toiles: Toile[] = [];
  private readonly materiaux: THREE.ShaderMaterial[] = [];
  private pris = false;

  constructor(defs: TableauDef[] = []) {
    for (const def of defs) this.toiles.push(this.batir(def));
  }

  private batir(def: TableauDef): Toile {
    const [x, y, z] = def.position;
    const { largeur: L, hauteur: H, yaw } = def;

    const rt = new THREE.WebGLRenderTarget(RESOLUTION, RESOLUTION, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    // La toile. Volontairement sans éclairage ni trame : c'est une image, pas
    // une surface du monde, et elle porte déjà le grain de ce qu'elle montre.
    const surface = new THREE.Mesh(
      new THREE.PlaneGeometry(L, H),
      new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: false }),
    );
    surface.position.set(x, y, z);
    surface.rotation.y = yaw;
    surface.frustumCulled = false;

    // ─── LE CADRE ─────────────────────────────────────────────────────────
    //
    // Bâti dans les MÊMES matériaux que le décor, donc cerné du même trait. Un
    // cadre dessiné autrement se lirait comme un élément d'interface posé sur
    // le monde ; celui-ci est un objet de la pièce, accroché à un mur.
    //
    // Et c'est capital pour la lisibilité de la mécanique : le pigment arrive
    // en volant et balaie une région entière, le tableau est un objet qu'on
    // vient regarder. Si le joueur confond une fois ces deux systèmes de
    // couleur, le second est à jeter.
    const e = Math.max(0.02, L * EPAISSEUR);
    const cel = createCelMaterial(new THREE.Color('#3b3128'));
    const contour = createOutlineMaterial(INK);
    this.materiaux.push(cel, contour);

    const dl = L * 0.5 + e;
    const dh = H * 0.5 + e;
    const geo = buildWorldGeometry([
      { min: [-dl, -dh, -e], max: [dl, -dh + e, 0], ink: 2 },
      { min: [-dl, dh - e, -e], max: [dl, dh, 0], ink: 2 },
      { min: [-dl, -dh + e, -e], max: [-dl + e, dh - e, 0], ink: 2 },
      { min: [dl - e, -dh + e, -e], max: [dl, dh - e, 0], ink: 2 },
    ]);
    const bord = new THREE.Mesh(geo, cel);
    const trait = new THREE.Mesh(geo, contour);
    bord.frustumCulled = false;
    trait.frustumCulled = false;

    const cadre = new THREE.Group();
    cadre.add(trait, bord);
    cadre.position.set(x, y, z);
    cadre.rotation.y = yaw;

    // ─── LE POINT DE VUE ───────────────────────────────────────────────────
    //
    // Sans indication, le tableau est peint DEPUIS LE MUR QUI LE PORTE, en
    // regardant la pièce. C'est le choix le plus lisible : le joueur qui se
    // place devant le cadre et se retourne voit exactement la composition,
    // sans qu'on ait eu à le lui dire.
    const camera = new THREE.PerspectiveCamera(58, 1, 0.02, 400);
    const oeil = def.oeil;
    if (oeil && def.regarde) {
      camera.position.set(oeil[0], oeil[1], oeil[2]);
      camera.lookAt(def.regarde[0], def.regarde[1], def.regarde[2]);
    } else {
      // La normale du cadre pointe vers la pièce ; on recule de rien et l'on
      // regarde dans cette direction.
      const nx = Math.sin(yaw);
      const nz = Math.cos(yaw);
      camera.position.set(x + nx * 0.05, y, z + nz * 0.05);
      camera.lookAt(x + nx * 40, y - H * 0.15, z + nz * 40);
    }

    this.group.add(cadre, surface);
    return { def, rt, camera, surface };
  }

  /**
   * Prend l'image de chaque tableau, une fois pour toutes.
   *
   * `peindreCibles` doit poser sur les familles les couleurs attendues, et
   * `restaurer` les remettre en lavis. On les reçoit de l'extérieur parce que
   * les matériaux des familles appartiennent au décor, pas à nous — et parce
   * que ce qui sait quelle couleur attend quelle famille, c'est le niveau.
   */
  capturer(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    peindreCibles: (attendu: Record<string, string>) => void,
    restaurer: () => void,
  ): void {
    if (this.pris || this.toiles.length === 0) return;
    this.pris = true;

    const cible = renderer.getRenderTarget();
    // Les toiles se masquent le temps de la prise : sans ça, un tableau qui en
    // voit un autre photographie l'image de l'image, et deux tableaux face à
    // face se renverraient un couloir de cadres vides.
    for (const t of this.toiles) t.surface.visible = false;

    for (const t of this.toiles) {
      peindreCibles(t.def.attendu);
      renderer.setRenderTarget(t.rt);
      renderer.clear();
      renderer.render(scene, t.camera);
      restaurer();
    }

    for (const t of this.toiles) t.surface.visible = true;
    renderer.setRenderTarget(cible);
  }

  /** Propage les uniformes partagés du style d'encre. */
  syncInk(): void {
    for (const m of this.materiaux) syncInkUniforms(m);
  }

  dispose(): void {
    for (const t of this.toiles) t.rt.dispose();
  }
}
