/**
 * Maths minimales pour `core/`.
 *
 * `core/` n'importe volontairement PAS Three.js : cette couche doit pouvoir
 * tourner telle quelle dans Node pour un futur serveur autoritaire.
 * On garde donc la convention de rotation de Three.js (Matrix4.makeRotationY)
 * pour que le rendu et la simulation soient d'accord au bit près.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const vec3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });

export const clone = (v: Vec3): Vec3 => ({ x: v.x, y: v.y, z: v.z });

export const copy = (out: Vec3, v: Vec3): Vec3 => {
  out.x = v.x;
  out.y = v.y;
  out.z = v.z;
  return out;
};

export const add = (a: Vec3, b: Vec3): Vec3 => vec3(a.x + b.x, a.y + b.y, a.z + b.z);

export const sub = (a: Vec3, b: Vec3): Vec3 => vec3(a.x - b.x, a.y - b.y, a.z - b.z);

export const scale = (v: Vec3, s: number): Vec3 => vec3(v.x * s, v.y * s, v.z * s);

export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

export const length = (v: Vec3): number => Math.sqrt(dot(v, v));

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/**
 * Rotation autour de Y, même convention que THREE.Matrix4.makeRotationY :
 *   [  cos, 0, sin ]
 *   [    0, 1,   0 ]
 *   [ -sin, 0, cos ]
 */
export const rotateY = (v: Vec3, angle: number): Vec3 => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
};

/** Vecteur unitaire « avant » pour un lacet donné — cohérent avec rotateY. */
export const yawToForward = (yaw: number): Vec3 => vec3(Math.sin(yaw), 0, Math.cos(yaw));

/** Ramène un angle dans ]-π, π]. Évite la dérive numérique après N traversées. */
export const wrapAngle = (a: number): number => {
  const t = (a + Math.PI) % (Math.PI * 2);
  return (t < 0 ? t + Math.PI * 2 : t) - Math.PI;
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LES ORIENTATIONS, EN MATRICES.
 *
 * L'orientation d'une pièce est stockée en angles d'Euler (ordre XYZ, celui
 * de Three.js) parce que c'est ce que le rendu consomme. Mais dès qu'on la
 * tourne librement — un quart de tour autour de la verticale, puis un autre
 * autour d'un axe couché — additionner des angles devient faux. On compose
 * donc des MATRICES, et l'on ne repasse en angles qu'à la fin. Mêmes
 * conventions que `THREE.Matrix4.makeRotationFromEuler` et
 * `THREE.Euler.setFromRotationMatrix`, pour que la simulation et le rendu
 * soient d'accord au bit près.
 *
 * Une matrice est rangée en neuf nombres, ligne par ligne.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

export const IDENTITE: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export const mulMat = (a: Mat3, b: Mat3): Mat3 => {
  const o = [0, 0, 0, 0, 0, 0, 0, 0, 0] as Mat3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      o[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return o;
};

export const appliquerMat = (m: Mat3, v: Vec3): Vec3 =>
  vec3(
    m[0] * v.x + m[1] * v.y + m[2] * v.z,
    m[3] * v.x + m[4] * v.y + m[5] * v.z,
    m[6] * v.x + m[7] * v.y + m[8] * v.z,
  );

/** Rx(a)·Ry(b)·Rz(c) : l'ordre XYZ de Three.js. */
export const eulerVersMat = (r: Vec3): Mat3 => {
  const a = Math.cos(r.x), b = Math.sin(r.x);
  const c = Math.cos(r.y), d = Math.sin(r.y);
  const e = Math.cos(r.z), f = Math.sin(r.z);
  return [
    c * e, -c * f, d,
    a * f + b * e * d, a * e - b * f * d, -b * c,
    b * f - a * e * d, b * e + a * f * d, a * c,
  ];
};

export const matVersEuler = (m: Mat3): Vec3 => {
  const m13 = clamp(m[2], -1, 1);
  const y = Math.asin(m13);
  if (Math.abs(m13) < 0.9999999) return vec3(Math.atan2(-m[5], m[8]), y, Math.atan2(-m[1], m[0]));
  return vec3(Math.atan2(m[7], m[4]), y, 0);
};

/** Rotation d'un angle autour de la verticale, en matrice. */
export const matLacet = (angle: number): Mat3 => {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
};

/** Un quart de tour exact autour d'un axe du monde, dans un sens ou l'autre. */
export const quartDeTour = (axe: 'x' | 'y' | 'z', sens: 1 | -1): Mat3 => {
  const s = sens;
  if (axe === 'x') return [1, 0, 0, 0, 0, -s, 0, s, 0];
  if (axe === 'y') return [0, 0, s, 0, 1, 0, -s, 0, 0];
  return [0, -s, 0, s, 0, 0, 0, 0, 1];
};

/** La transposée — l'inverse, pour une rotation. */
export const transposer = (m: Mat3): Mat3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

/** La réflexion sur l'axe x : c'est elle qui fait une main droite d'une gauche. */
export const REFLEXION_X: Mat3 = [-1, 0, 0, 0, 1, 0, 0, 0, 1];
