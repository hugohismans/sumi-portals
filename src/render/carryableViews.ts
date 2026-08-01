import * as THREE from 'three';
import type { Carryable } from '../core/carryables.js';
import {
  faceWorldSize,
  transformPoint,
  traversalScale,
  yawDelta,
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
}

export class CarryableViews {
  readonly group = new THREE.Group();
  private readonly views = new Map<string, View>();
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

      const geo = cubeGeometry(item.size);
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
      const ghostGeo = cubeGeometry(item.size);
      const ghostOutlineMesh = new THREE.Mesh(ghostGeo, spectre.outline);
      const ghostMesh = new THREE.Mesh(ghostGeo, spectre.cel);
      ghostOutlineMesh.frustumCulled = false;
      ghostMesh.frustumCulled = false;
      ghost.add(ghostOutlineMesh, ghostMesh);
      ghost.visible = false;

      this.group.add(group, ghost);
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
      });
    }
  }

  update(items: Carryable[], faces: PortalFace[]): void {
    for (const item of items) {
      const view = this.views.get(item.id);
      if (!view) continue;

      if (view.size !== item.size) {
        const geo = cubeGeometry(item.size);
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
        const geo = cubeGeometry(wanted);
        view.ghostMeshes[0].geometry.dispose();
        for (const m of view.ghostMeshes) m.geometry = geo;
        view.ghostSize = wanted;
      }

      view.ghost.position.set(there.x, there.y, there.z);
      view.ghost.rotation.set(
        item.rotation.x,
        item.rotation.y + yawDelta(face),
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
const cubeGeometry = (size: number): THREE.BufferGeometry => {
  const h = size * 0.5;
  return buildWorldGeometry([{ min: [-h, -h, -h], max: [h, h, h], ink: 0 }]);
};
