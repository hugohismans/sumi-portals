import * as THREE from 'three';
import { createCelMaterial, createOutlineMaterial, syncInkUniforms } from './ink.js';
import { buildWorldGeometry } from './worldMesh.js';

/**
 * L'ENCRIER QUI SE POSE TOUT SEUL SUR LA POINTE.
 *
 * Dès la première minute, une maquette au pied de l'Aiguille montre une petite
 * aiguille surmontée d'un encrier. On lève les yeux, la vraie pointe est vide,
 * et l'on a compris ce qu'il faut faire — sans qu'un mot ait été écrit.
 *
 * Or la maquette MENTAIT. Quand les objectifs ont été déplacés vers les socles
 * de la place, le sommet de l'Aiguille est resté sans rien : la seule chose du
 * jeu qui annonce le but promettait quelque chose d'impossible, et l'éperon
 * jeté depuis le belvédère menait à un chapiteau où il n'y avait rien à faire.
 *
 * Voici la promesse tenue. Quand les deux couleurs sont rendues, l'encrier
 * apparaît là-haut — non pas posé par le joueur, mais **par le Pinceau**, qui
 * l'y monte pendant que la caméra prend du recul. C'est lui qu'on a suivi tout
 * le jeu ; c'est à lui de finir le geste.
 *
 * Il monte en tournant, et se pose sans à-coup : rien ne doit ressembler à un
 * objet qui apparaît, tout doit ressembler à quelque chose qu'on dépose.
 */

const MONTEE = 3.4;

export class SceauFinal {
  readonly group = new THREE.Group();
  private readonly materiaux: THREE.ShaderMaterial[] = [];
  private readonly cible: THREE.Vector3;
  private temps = -1;

  constructor(sommet: [number, number, number]) {
    this.cible = new THREE.Vector3(...sommet);

    // Le même encrier que celui de la maquette, à l'échelle du sommet : un
    // corps trapu, une lèvre débordante, un couvercle. Bâti dans les matériaux
    // du décor, donc cerné du même trait que tout le reste.
    const cel = createCelMaterial(new THREE.Color('#2a2320'));
    const outline = createOutlineMaterial();
    outline.uniforms.uThickness.value = 0.0045;
    this.materiaux.push(cel, outline);

    const geo = buildWorldGeometry([
      { min: [-2.3, 0, -2.3], max: [2.3, 3.1, 2.3], ink: 0 },
      { min: [-2.9, 2.7, -2.9], max: [2.9, 3.7, 2.9], ink: 0 },
      { min: [-1.5, 3.5, -1.5], max: [1.5, 4.4, 1.5], ink: 0 },
    ]);
    const edge = new THREE.Mesh(geo, outline);
    const fill = new THREE.Mesh(geo, cel);
    edge.frustumCulled = false;
    fill.frustumCulled = false;

    this.group.add(edge, fill);
    this.group.visible = false;
  }

  /** Les deux couleurs sont rendues : le Pinceau monte le poser. */
  declencher(): void {
    if (this.temps >= 0) return;
    this.temps = 0;
    this.group.visible = true;
  }

  get enCours(): boolean {
    return this.temps >= 0;
  }

  update(dt: number): void {
    if (this.temps < 0) return;
    this.temps += dt;

    // Il arrive par en dessous, comme porté, et ralentit en approchant — c'est
    // ce ralenti qui fait « posé » plutôt que « apparu ».
    const t = Math.min(1, this.temps / MONTEE);
    const doux = 1 - Math.pow(1 - t, 3);
    this.group.position.set(
      this.cible.x,
      this.cible.y - (1 - doux) * 26,
      this.cible.z,
    );
    // Un demi-tour pendant la montée, qui s'arrête net quand il touche.
    this.group.rotation.y = (1 - doux) * Math.PI;

    for (const m of this.materiaux) syncInkUniforms(m);
  }
}
