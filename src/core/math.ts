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
