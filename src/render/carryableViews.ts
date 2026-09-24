import * as THREE from 'three';
import type { Carryable } from '../core/carryables.js';
import {
  faceWorldSize,
  transformPoint,
  traversalScale,
  deltaDeRotation,
  type PortalFace,
} from '../core/portals.js';
import { PALETTE, createCelMaterial, createOutlineMaterial, syncInkUniforms } from './ink.js';
import { buildWorldGeometry } from './worldMesh.js';

/**
 * Affichage des caisses.
 *
 * La géométrie est RECONSTRUITE à sa taille réelle quand la caisse change de
 * dimension, plutôt que mise à l'échelle par une matrice. C'est volontaire : le
 * contour d'encre est calculé dans le repère de l'objet, donc une caisse
 * agrandie par matrice hériterait d'un trait quatre fois plus épais. Un
 * changement de taille n'arrive qu'à la traversée d'un portail — autant dire
 * jamais, à l'échelle d'une image.
 *
 * LE DOUBLE : une caisse à cheval sur le plan d'un portail est dessinée DEUX
 * fois. La vraie, tranchée au ras du plan, garde la moitié qui n'a pas encore
 * traversé ; un double, transporté de l'autre côté et tranché en sens inverse,
 * montre la moitié qui a déjà franchi. Sans lui, la caisse paraissait coupée
 * net — la moitié engagée dans le portail n'était dessinée nulle part.
 */
interface View {
  group: THREE.Group;
  mesh: THREE.Mesh;
  outlineMesh: THREE.Mesh;
  cel: THREE.ShaderMaterial;
  outline: THREE.ShaderMaterial;

  ghost: THREE.Group;
  ghostMeshes: THREE.Mesh[];
  ghostCel: THREE.ShaderMaterial;
  ghostOutline: THREE.ShaderMaterial;

  size: number;
  ghostSize: number;
  /** Main dessinée en ce moment. Voir `update`. */
  main?: 'L' | 'D';
  /** Masquée : elle existe et se comporte, mais on ne la dessine jamais. */
  masque?: boolean;
  /** Le cerne au sol qui dit « ça se ramasse ». Voir `createHaloMaterial`. */
  halo: THREE.Mesh;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LE CERNE — ce qui se ramasse se distingue du décor.
 *
 * Une pièce posée est dessinée exactement comme une pierre du décor : même
 * cel, même trait, même palette. C'est voulu pour l'image, et c'est un
 * problème pour le jeu. Signalé en jouant : « c'est pas très clair ce qui est
 * ramassable ou non, faudrait une espèce de mini halo pour qu'on comprenne
 * que c'est pas un élément du décor mais un objet ramassable. »
 *
 * Un cerne d'encre au sol, autour de la pièce, qui respire lentement — comme
 * le trait qu'un pinceau laisse en tournant autour d'une chose posée sur le
 * papier. Il n'existe que pour ce qu'on peut prendre : une pièce tenue, une
 * pièce logée dans son creux ou une pièce en l'air n'en ont pas. Double face
 * et sans écriture de profondeur, pour qu'il se pose sur n'importe quel sol
 * sans grésiller et se lise d'où qu'on soit — y compris gauchère.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const createHaloMaterial = (): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({
    color: 0x22201c,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

export class CarryableViews {
  readonly group = new THREE.Group();
  private readonly views = new Map<string, View>();
  /** Un seul matériau pour tous les cernes : ils respirent ensemble. */
  private readonly haloMat = createHaloMaterial();
  private readonly haloGeo = new THREE.RingGeometry(0.66, 0.84, 48);

  /**
   * REND UNE CAISSE INVISIBLE, en la laissant exister.
   *
   * Deux objets du jeu ne sont pas des caisses : ce sont des pinceaux de
   * couleur, et on les dessine comme tels (voir render/pinceauPeintre.ts).
   * Ramasser un cube rouge POUR OBTENIR un pinceau rouge, c'était deux objets
   * pour une seule idée.
   *
   * Mais le cube reste : c'est lui qui porte la physique, la taille qui change
   * en traversant les portes, et l'emboîtement dans le socle. On lui retire son
   * apparence, pas son existence — l'alternative aurait été de refaire tout le
   * découpage de géométrie aux portails pour une forme non cubique, ce qui est
   * un vrai chantier et pas un réglage.
   */
  masquer(id: string): void {
    const v = this.views.get(id);
    if (!v) return;
    v.group.visible = false;
    v.ghost.visible = false;
    v.halo.visible = false;
    v.masque = true;
  }
  private readonly planeHere = new THREE.Plane();
  private readonly planeThere = new THREE.Plane();
  private readonly tmpNormal = new THREE.Vector3();
  private readonly tmpPoint = new THREE.Vector3();

  build(items: Carryable[]): void {
    for (const item of items) {
      const tint = PALETTE[item.ink] ?? PALETTE[3];
      const make = () => {
        const cel = createCelMaterial(tint);
        const outline = createOutlineMaterial();
        // Une caisse est bien plus petite qu'un immeuble : sans trait plus fin,
        // elle disparaîtrait sous son propre contour.
        outline.uniforms.uThickness.value = 0.0038;
        return { cel, outline };
      };

      const geo = carryableGeometry(item);
      const real = make();
      const group = new THREE.Group();
      const outlineMesh = new THREE.Mesh(geo, real.outline);
      const mesh = new THREE.Mesh(geo, real.cel);
      outlineMesh.frustumCulled = false;
      mesh.frustumCulled = false;
      group.add(outlineMesh, mesh);

      // Le double a sa PROPRE géométrie, taillée à la bonne dimension. Le
      // grossir par une matrice étirerait aussi son contour d'encre, et la
      // couture entre les deux moitiés sauterait aux yeux : trait épais d'un
      // côté, trait fin de l'autre.
      const spectre = make();
      const ghost = new THREE.Group();
      const ghostGeo = carryableGeometry(item);
      const ghostOutlineMesh = new THREE.Mesh(ghostGeo, spectre.outline);
      const ghostMesh = new THREE.Mesh(ghostGeo, spectre.cel);
      ghostOutlineMesh.frustumCulled = false;
      ghostMesh.frustumCulled = false;
      ghost.add(ghostOutlineMesh, ghostMesh);
      ghost.visible = false;

      // Le cerne vit à part, à plat : le groupe de la pièce culbute avec elle.
      const halo = new THREE.Mesh(this.haloGeo, this.haloMat);
      halo.rotation.x = -Math.PI / 2;
      halo.frustumCulled = false;
      halo.renderOrder = 1;

      this.group.add(group, ghost, halo);
      this.views.set(item.id, {
        group,
        mesh,
        outlineMesh,
        cel: real.cel,
        outline: real.outline,
        ghost,
        ghostMeshes: [ghostOutlineMesh, ghostMesh],
        ghostCel: spectre.cel,
        ghostOutline: spectre.outline,
        size: item.size,
        ghostSize: item.size,
        main: item.main,
        halo,
      });
    }
  }

  update(items: Carryable[], faces: PortalFace[], temps = 0): void {
    // La respiration du cerne : lente, et jamais éteinte — un cerne qui
    // disparaît par moments se lirait comme un clignotement.
    const souffle = 0.5 + 0.5 * Math.sin(temps * 2.2);
    this.haloMat.opacity = 0.22 + 0.16 * souffle;
    const ampleur = 1 + 0.07 * souffle;

    for (const item of items) {
      const view = this.views.get(item.id);
      if (!view) continue;
      // Masquée : elle continue d'exister et de se comporter, on ne la dessine
      // simplement jamais. C'est un pinceau de couleur qui la représente.
      if (view.masque) continue;

      // Le cerne : seulement autour de ce qu'on peut prendre, posé au sol.
      view.halo.visible = !item.held && !item.locked && item.grounded;
      if (view.halo.visible) {
        view.halo.position.set(item.position.x, item.position.y + 0.02 + item.size * 0.01, item.position.z);
        const r = item.size * ampleur;
        view.halo.scale.set(r, r, 1);
      }

      // On rebâtit quand la taille change, mais aussi quand la MAIN bascule :
      // c'est ce passage-là qui rend la chiralité visible, et il arrive au
      // moment précis où l'objet franchit un portail miroir.
      if (view.size !== item.size || view.main !== item.main) {
        view.main = item.main;
        const geo = carryableGeometry(item);
        view.mesh.geometry.dispose();
        view.mesh.geometry = geo;
        view.outlineMesh.geometry = geo;
        view.size = item.size;
      }

      // La simulation situe la caisse par le centre de son ASSISE ; l'affichage
      // la centre pour que la culbute tourne autour du milieu du cube et non
      // autour d'un coin du bas.
      const cx = item.position.x;
      const cy = item.position.y + item.size * 0.5;
      const cz = item.position.z;
      view.group.position.set(cx, cy, cz);
      // La rotation est purement visuelle : la collision reste une boîte droite.
      view.group.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);

      this.updateGhost(view, item, faces, cx, cy, cz);
    }
  }

  /** Cherche un portail que la caisse chevauche, et dresse son double. */
  private updateGhost(
    view: View,
    item: Carryable,
    faces: PortalFace[],
    cx: number,
    cy: number,
    cz: number,
  ): void {
    const half = item.size * 0.72; // un peu large : mieux vaut doubler trop tôt

    for (const face of faces) {
      const n = face.normal;
      const d = (cx - face.position.x) * n.x + (cy - face.position.y) * n.y + (cz - face.position.z) * n.z;
      // Devant : rien à dédoubler. Loin derrière : ce n'est plus ce portail.
      // Entre les deux, on double — y compris quand la caisse est ENTIÈREMENT
      // passée, ce qui arrive tout le temps puisqu'on la tend devant soi : elle
      // franchit le plan avant son porteur. Sans ce cas, elle réapparaissait
      // brutalement du mauvais côté au lieu de rester vue à travers le portail.
      if (d > half || d < -(half + item.size * 3)) continue;

      // Grossièrement dans l'ouverture ? Sinon la caisse passe à côté du cadre
      // et n'a aucune raison d'être dédoublée.
      const { width, height } = faceWorldSize(face);
      const lat = Math.hypot(cx - face.position.x, cz - face.position.z);
      const up = cy - face.position.y;
      if (lat > width * 0.5 + item.size || up < -item.size || up > height + item.size) continue;

      const s = traversalScale(face);
      const there = transformPoint(face, { x: cx, y: cy, z: cz });

      // Géométrie retaillée plutôt que mise à l'échelle : c'est ce qui donne au
      // double exactement la même épaisseur de trait que la moitié restée ici.
      const wanted = item.size * s;
      if (Math.abs(view.ghostSize - wanted) > 1e-6) {
        // Le double porte la MAIN QU'IL AURA DE L'AUTRE CÔTÉ. Sur un portail
        // miroir, ce n'est pas la même que celle d'ici — et c'est exactement ce
        // qu'on veut montrer : la moitié qui a franchi le plan est déjà
        // retournée, l'autre pas encore. On voit la chiralité s'opérer au
        // milieu de l'objet.
        const mainLa = face.miroir && item.main !== undefined
          ? item.main === 'L' ? 'D' : 'L'
          : item.main;
        const geo = carryableGeometry({ ...item, size: wanted, main: mainLa });
        view.ghostMeshes[0].geometry.dispose();
        for (const m of view.ghostMeshes) m.geometry = geo;
        view.ghostSize = wanted;
      }

      view.ghost.position.set(there.x, there.y, there.z);
      // Le double tourne comme l'objet tournera : par une porte ordinaire,
      // avec son porteur ; par un miroir, du complément qui, joint à la main
      // basculée, fait la réflexion entière (voir `yawDeltaMiroir`).
      view.ghost.rotation.set(
        item.rotation.x,
        item.rotation.y + deltaDeRotation(face),
        item.rotation.z,
      );
      view.ghost.visible = true;

      // La vraie garde le côté d'où elle vient ; le double, celui où elle va.
      this.tmpNormal.set(n.x, n.y, n.z);
      this.tmpPoint.set(face.position.x, face.position.y, face.position.z);
      this.planeHere.setFromNormalAndCoplanarPoint(this.tmpNormal, this.tmpPoint);
      setPlanes(view.cel, view.outline, [this.planeHere]);

      const twin = face.twin;
      this.tmpNormal.set(twin.normal.x, twin.normal.y, twin.normal.z);
      this.tmpPoint.set(twin.position.x, twin.position.y, twin.position.z);
      this.planeThere.setFromNormalAndCoplanarPoint(this.tmpNormal, this.tmpPoint);
      setPlanes(view.ghostCel, view.ghostOutline, [this.planeThere]);
      return;
    }

    view.ghost.visible = false;
    setPlanes(view.cel, view.outline, null);
  }

  syncInk(): void {
    for (const v of this.views.values()) {
      syncInkUniforms(v.cel);
      syncInkUniforms(v.outline);
      syncInkUniforms(v.ghostCel);
      syncInkUniforms(v.ghostOutline);
    }
  }
}

const setPlanes = (
  a: THREE.ShaderMaterial,
  b: THREE.ShaderMaterial,
  planes: THREE.Plane[] | null,
): void => {
  a.clippingPlanes = planes;
  b.clippingPlanes = planes;
};

/** Cube centré sur son origine, pour que la rotation se fasse autour du milieu. */
/**
 * La géométrie d'un objet portable — un cube, ou la forme qu'il déclare.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * `main` REFLÈTE LA GÉOMÉTRIE, ET C'EST TOUTE LA CHIRALITÉ
 *
 * Une forme chirale ne peut pas être superposée à son reflet — comme une main
 * gauche et une main droite. Aucune rotation ne transforme l'une en l'autre :
 * il faut un miroir.
 *
 * Les portails miroirs faisaient déjà basculer `main` à chaque passage. Ça ne
 * se voyait pas, parce que tous les objets étaient des cubes. Il suffisait de
 * refléter la liste de boîtes sur un axe — `x → −x` — pour que la mécanique
 * devienne visible, et donc jouable.
 *
 * On reflète les COORDONNÉES et non la matrice du modèle : une échelle négative
 * inverserait l'orientation des faces, et l'objet se retrouverait retourné à
 * l'envers, éclairé par l'intérieur, cerné d'un contour qui disparaît. C'est le
 * même piège que dans la vue à travers un portail miroir, où il a déjà coûté
 * une soirée.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const carryableGeometry = (item: Carryable): THREE.BufferGeometry => {
  const h = item.size * 0.5;
  if (!item.pieces || item.pieces.length === 0) {
    return buildWorldGeometry([{ min: [-h, -h, -h], max: [h, h, h], ink: 0 }]);
  }
  const miroir = item.main === 'D';
  return buildWorldGeometry(
    item.pieces.map((b) => {
      const x0 = b.min[0] * item.size;
      const x1 = b.max[0] * item.size;
      return {
        min: [miroir ? -x1 : x0, b.min[1] * item.size, b.min[2] * item.size],
        max: [miroir ? -x0 : x1, b.max[1] * item.size, b.max[2] * item.size],
        ink: b.ink ?? 0,
      };
    }),
  );
};
