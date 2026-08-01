import * as THREE from 'three';
import type { BoxDef, LevelDef } from '../core/types.js';
import { createCelMaterial, createOutlineMaterial } from './ink.js';

/**
 * Fusionne toutes les boîtes du niveau en une seule géométrie.
 *
 * On stocke le centre de chaque boîte dans un attribut `aCenter` : c'est ce qui
 * permet au shader de contour de gonfler chaque sommet vers l'extérieur de SA
 * boîte, arêtes comprises, sans avoir besoin de normales lissées.
 */
const FACES: { n: [number, number, number]; v: [number, number, number][] }[] = [
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

export const buildWorldGeometry = (boxes: BoxDef[]): THREE.BufferGeometry => {
  const vertexCount = boxes.length * 24;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const centers = new Float32Array(vertexCount * 3);
  const inks = new Float32Array(vertexCount);
  const indices = new Uint32Array(boxes.length * 36);

  let vi = 0;
  let ii = 0;

  for (const b of boxes) {
    const [x0, y0, z0] = b.min;
    const [x1, y1, z1] = b.max;
    const cx = (x0 + x1) * 0.5;
    const cy = (y0 + y1) * 0.5;
    const cz = (z0 + z1) * 0.5;
    const ink = b.ink ?? 0;

    for (const face of FACES) {
      const base = vi;
      for (const [ux, uy, uz] of face.v) {
        positions[vi * 3] = ux ? x1 : x0;
        positions[vi * 3 + 1] = uy ? y1 : y0;
        positions[vi * 3 + 2] = uz ? z1 : z0;
        normals[vi * 3] = face.n[0];
        normals[vi * 3 + 1] = face.n[1];
        normals[vi * 3 + 2] = face.n[2];
        centers[vi * 3] = cx;
        centers[vi * 3 + 1] = cy;
        centers[vi * 3 + 2] = cz;
        inks[vi] = ink;
        vi++;
      }
      indices[ii++] = base;
      indices[ii++] = base + 1;
      indices[ii++] = base + 2;
      indices[ii++] = base;
      indices[ii++] = base + 2;
      indices[ii++] = base + 3;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('aCenter', new THREE.BufferAttribute(centers, 3));
  geo.setAttribute('aInk', new THREE.BufferAttribute(inks, 1));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeBoundingSphere();
  return geo;
};

export interface WorldView {
  group: THREE.Group;
  /** Tous les matériaux du décor, pour leur propager le grain d'encre. */
  materials: THREE.ShaderMaterial[];
}

/**
 * Construit le décor, UNE PASSE PAR RÉGION.
 *
 * Chaque région a ses propres encres, donc ses propres matériaux — c'est ce qui
 * permet à un portail d'ouvrir sur un univers de couleurs entièrement
 * différentes, visibles avant même d'y entrer.
 *
 * On regroupe malgré tout par région plutôt que par boîte : une région entière
 * tient en deux appels de dessin, et le nombre de régions se compte sur les
 * doigts d'une main.
 */
export const buildWorldView = (level: LevelDef): WorldView => {
  const group = new THREE.Group();
  const materials: THREE.ShaderMaterial[] = [];

  const parRegion = new Map<string, typeof level.boxes>();
  for (const b of level.boxes) {
    const clef = b.region ?? '';
    const lot = parRegion.get(clef);
    if (lot) lot.push(b);
    else parRegion.set(clef, [b]);
  }

  for (const [clef, boxes] of parRegion) {
    const region = level.regions?.find((r) => r.name === clef);
    const palette = region
      ? (region.colors.map((c) => new THREE.Color(c)) as THREE.Color[])
      : undefined;
    const encre = region?.ink ? new THREE.Color(region.ink) : undefined;

    const cel = createCelMaterial(undefined, palette, encre);
    const outline = createOutlineMaterial(encre);
    materials.push(cel, outline);

    // Deux géométries distinctes : les aplats couvrent tout, mais les contours
    // sautent les boîtes marquées `outline: false` — sinon les coutures entre
    // dalles de sol se retrouveraient encrées en plein terrain.
    const celGeo = buildWorldGeometry(boxes);
    const outlineGeo = buildWorldGeometry(boxes.filter((b) => b.outline !== false));

    const edge = new THREE.Mesh(outlineGeo, outline);
    const fill = new THREE.Mesh(celGeo, cel);
    edge.frustumCulled = false;
    fill.frustumCulled = false;
    group.add(edge, fill);
  }

  return { group, materials };
};

/** Marqueur d'objectif : un sceau vermillon qui pulse doucement. */
export const buildGoalMarker = (level: LevelDef): THREE.Object3D => {
  const group = new THREE.Group();
  group.position.set(...level.goal.position);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.42, 6, 28),
    new THREE.MeshBasicMaterial({ color: 0xb8563a }),
  );
  ring.rotation.x = Math.PI / 2;

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.25, 0),
    new THREE.MeshBasicMaterial({ color: 0x211c17 }),
  );

  group.add(ring, core);
  group.userData.ring = ring;
  group.userData.core = core;
  return group;
};
