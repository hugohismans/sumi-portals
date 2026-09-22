import type { BoxDef } from '../core/types.js';

/**
 * UNE MAIN D'ENCRE — l'étalon de la chiralité, comme la petite face d'une porte
 * est l'étalon de la taille.
 *
 * La porte donne à lire une TAILLE sans qu'on l'explique : sa petite face fait
 * toujours 2,80. Rien ne donnait à lire une MAIN, et la règle du miroir était
 * donc vraie et invisible — deux lecteurs extérieurs avaient prédit qu'on
 * conclurait à un bug avant de conclure à la réflexion. Le joueur l'a demandé
 * en une phrase : « des trucs chiraux, des mains, une flèche — qu'on voie
 * qu'elle était dans un sens puis dans l'autre. »
 *
 * Une main est l'objet chiral que tout le monde sait lire. ON EN POSE UNE DE
 * CHAQUE CÔTÉ DE CHAQUE OUVERTURE, et les deux d'une même face sont de la MÊME
 * main : ce qu'on compare est ici et là-bas, jamais gauche et droite d'un même
 * mur. Une paire dépareillée donnerait à lire une symétrie du décor au lieu
 * d'une propriété du passage. Celles de la petite face sont quatre fois plus
 * petites — c'est le même objet, à un cran d'échelle.
 *
 * En regardant par le miroir, on voit donc côte à côte celle qui est devant soi
 * et celle d'en face, retournée. La leçon tient dans un seul coup d'œil :
 *
 *     ce qui traverse change de main — donc lance ta pièce à travers.
 *
 * LE POUCE EST TOUT. C'est lui qui porte la chiralité : quatre doigts alignés
 * sont symétriques, le pouce décide du côté. Il est donc plus court, plus épais,
 * et franchement écarté — assez pour se lire de loin et à contre-jour.
 *
 * On la dessine à plat contre un panneau, dans le plan (y, z), face à l'axe des
 * x — c'est l'orientation de toutes les portes miroirs du jeu. Née au banc
 * d'essai, elle vit ici pour que le creux qui refuse et le blanchiment en
 * reçoivent exactement la même, et non une copie qui divergerait.
 */
const DOIGTS: [number, number][] = [
  // écart depuis l'axe de la paume, longueur du doigt
  [-0.3, 0.62],
  [-0.1, 0.72],
  [0.1, 0.68],
  [0.28, 0.52],
];

export const mainDEncre = (
  region: string,
  x: number,
  y: number,
  z: number,
  gauche: boolean,
  ech = 1,
  /** Vers où l'encre regarde : +1 pour l'est, −1 pour l'ouest. */
  vers = 1,
): BoxDef[] => {
  const b = (min: [number, number, number], max: [number, number, number], ink: number): BoxDef => ({
    min,
    max,
    ink,
    region,
  });
  const m = (gauche ? 1 : -1) * vers;
  const e = (v: number) => v * ech;
  const out: BoxDef[] = [];
  // Le panneau : un aplat clair pour que l'encre s'y détache.
  const px = (a: number, bb: number): [number, number] =>
    vers > 0 ? [x + e(a), x + e(bb)] : [x - e(bb), x - e(a)];
  const [p0, p1] = px(-0.03, 0);
  out.push(b([p0, y - e(0.25), z - e(0.62)], [p1, y + e(1.55), z + e(0.62)], 1));
  // La paume.
  const [a0, a1] = px(0, 0.05);
  out.push(b([a0, y + e(0.1), z - e(0.42)], [a1, y + e(0.78), z + e(0.42)], 3));
  // Le poignet, qui donne le sens de lecture.
  const [w0, w1] = px(0, 0.049);
  out.push(b([w0, y - e(0.16), z - e(0.2)], [w1, y + e(0.11), z + e(0.2)], 3));
  // Les quatre doigts, alignés au-dessus de la paume.
  for (const [d, l] of DOIGTS) {
    const [d0, d1] = px(0, 0.051);
    out.push(
      b(
        [d0, y + e(0.77), z + e(m * d) - e(0.075)],
        [d1, y + e(0.77 + l), z + e(m * d) + e(0.075)],
        3,
      ),
    );
  }
  // LE POUCE : court, épais, écarté. C'est lui qu'on lit.
  const [t0, t1] = px(0, 0.052);
  out.push(b([t0, y + e(0.3), z + e(m * 0.44)], [t1, y + e(0.62), z + e(m * 0.72)], 3));
  return out;
};
