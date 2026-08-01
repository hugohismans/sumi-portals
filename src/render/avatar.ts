import * as THREE from 'three';
import { PLAYER_HEIGHT } from '../core/constants.js';
import type { PlayerState } from '../core/types.js';
import { createCelMaterial, createOutlineMaterial, syncInkUniforms } from './ink.js';
import { buildWorldGeometry } from './worldMesh.js';

/**
 * Le bonhomme bâton.
 *
 * Volontairement maigre : des traits, pas des volumes. Ce sont les contours
 * d'encre — les mêmes que ceux du décor — qui font tout le travail, si bien
 * qu'il a l'air tracé au crayon plutôt que modélisé.
 *
 * Il vit dans la scène comme n'importe quel objet, donc il apparaît TOUT SEUL
 * dans les vues de portail : on se voit soi-même, de dos et minuscule, à
 * travers le grand torii. C'est tout l'intérêt de l'avoir fait maintenant.
 *
 * Les proportions sont données pour une taille de 1,8 ; le groupe entier est
 * ensuite mis à l'échelle du joueur.
 */

const THIN = 0.055;
const HIP = 0.80;
const SHOULDER = 1.40;
const HEAD_Y = 1.56;

/** Un segment : rempli + contour, suspendu sous son articulation. */
const makeSegment = (
  length: number,
  thickness: number,
  cel: THREE.ShaderMaterial,
  outline: THREE.ShaderMaterial,
): THREE.Group => {
  const pivot = new THREE.Group();
  // La géométrie pend SOUS le pivot : tourner le pivot fait pivoter le membre
  // autour de son articulation, comme une épaule ou une hanche.
  const geo = buildWorldGeometry([
    { min: [-thickness / 2, -length, -thickness / 2], max: [thickness / 2, 0, thickness / 2] },
  ]);
  const fill = new THREE.Mesh(geo, cel);
  const edge = new THREE.Mesh(geo, outline);
  fill.frustumCulled = false;
  edge.frustumCulled = false;
  pivot.add(edge, fill);
  return pivot;
};

/** Un bloc posé, sans articulation (tête, bandeau). */
const makeBlock = (
  size: [number, number, number],
  cel: THREE.ShaderMaterial,
  outline: THREE.ShaderMaterial,
): THREE.Group => {
  const g = new THREE.Group();
  const [w, h, d] = size;
  const geo = buildWorldGeometry([
    { min: [-w / 2, -h / 2, -d / 2], max: [w / 2, h / 2, d / 2] },
  ]);
  const fill = new THREE.Mesh(geo, cel);
  const edge = new THREE.Mesh(geo, outline);
  fill.frustumCulled = false;
  edge.frustumCulled = false;
  g.add(edge, fill);
  return g;
};

export class Avatar {
  readonly group = new THREE.Group();

  private readonly cel: THREE.ShaderMaterial;
  private readonly outline: THREE.ShaderMaterial;
  private readonly bandCel: THREE.ShaderMaterial;

  private readonly body = new THREE.Group();
  private readonly legL: THREE.Group;
  private readonly legR: THREE.Group;
  private readonly armL: THREE.Group;
  private readonly armR: THREE.Group;
  /** Tête et bandeau : masqués à la première personne, ils sont dans l'œil. */
  private readonly headParts: THREE.Group[] = [];
  private readonly ribbon: THREE.Group;

  private phase = 0;

  constructor(color: number) {
    this.cel = createCelMaterial(new THREE.Color(color));
    this.outline = createOutlineMaterial();
    // Un bonhomme est bien plus petit qu'un immeuble : sans trait plus fin, il
    // disparaîtrait sous son propre contour.
    this.outline.uniforms.uThickness.value = 0.0034;

    const seg = (len: number, th = THIN) => makeSegment(len, th, this.cel, this.outline);

    this.legL = seg(HIP);
    this.legL.position.set(-0.085, HIP, 0);
    this.legR = seg(HIP);
    this.legR.position.set(0.085, HIP, 0);

    const torso = seg(SHOULDER - HIP, THIN * 1.5);
    torso.position.set(0, SHOULDER, 0);

    this.armL = seg(0.46);
    this.armL.position.set(-0.15, SHOULDER - 0.03, 0);
    this.armR = seg(0.46);
    this.armR.position.set(0.15, SHOULDER - 0.03, 0);

    const head = makeBlock([0.19, 0.21, 0.19], this.cel, this.outline);
    head.position.set(0, HEAD_Y, 0);

    // Bandeau de ninja : une bande sombre en travers du front.
    this.bandCel = createCelMaterial(new THREE.Color(0x1b1714));
    const band = makeBlock([0.205, 0.055, 0.205], this.bandCel, this.outline);
    band.position.set(0, HEAD_Y + 0.035, 0);

    // Le pan du bandeau, qui flotte derrière. C'est lui qui donne le mouvement.
    this.ribbon = makeSegment(0.34, 0.035, this.bandCel, this.outline);
    this.ribbon.position.set(0, HEAD_Y + 0.04, -0.09);

    this.headParts.push(head, band, this.ribbon);

    this.body.add(this.legL, this.legR, torso, this.armL, this.armR, head, band, this.ribbon);
    this.group.add(this.body);
  }

  /**
   * À la première personne, la tête est pile dans la caméra : on la retire
   * pour la vue principale, mais on la remet pour les vues de portail — sinon
   * on se verrait décapité à travers le portail.
   */
  setHeadVisible(visible: boolean): void {
    for (const part of this.headParts) part.visible = visible;
  }

  update(state: PlayerState, scale: number, dt: number): void {
    const p = state.position;
    this.group.position.set(p.x, p.y, p.z);
    this.group.rotation.y = state.yaw;
    this.group.scale.setScalar(scale);

    // Vitesse ramenée en « tailles de corps par seconde » : la démarche est
    // ainsi la même qu'on soit minuscule ou géant.
    const speed = Math.hypot(state.velocity.x, state.velocity.z) / (scale * PLAYER_HEIGHT);
    const gait = Math.min(1, speed / 3.4);

    this.phase += speed * dt * 5.2;

    const swing = Math.sin(this.phase) * 0.85 * gait;
    const counter = Math.sin(this.phase + Math.PI) * 0.62 * gait;

    if (state.grounded) {
      this.legL.rotation.x = swing;
      this.legR.rotation.x = -swing;
      this.armL.rotation.x = counter;
      this.armR.rotation.x = -counter;
      // Le buste monte et descend à deux fois la cadence des jambes.
      this.body.position.y = Math.abs(Math.sin(this.phase)) * 0.035 * gait;
    } else {
      // En l'air : jambes ramassées, bras levés. Lisible d'un coup d'œil.
      this.legL.rotation.x = 0.55;
      this.legR.rotation.x = -0.3;
      this.armL.rotation.x = -1.1;
      this.armR.rotation.x = -1.3;
      this.body.position.y = 0;
    }

    // Léger buste en avant à la course, et le pan du bandeau qui suit.
    this.body.rotation.x = -0.14 * gait;
    this.ribbon.rotation.x = -0.5 - 0.9 * gait + Math.sin(this.phase * 0.8) * 0.12;
  }

  /** Propage le grain « dessiné » comme pour le décor. */
  syncInk(): void {
    syncInkUniforms(this.cel);
    syncInkUniforms(this.bandCel);
    syncInkUniforms(this.outline);
  }
}
