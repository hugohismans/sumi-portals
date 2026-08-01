import * as THREE from 'three';

/**
 * Le style « sumi-e / BD ».
 *
 * Toute l'astuce du rendu dessiné tient dans UN détail : `uSeed` n'est pas
 * rafraîchi à 60 Hz mais à 10 Hz. Le tremblement des traits et le grain du
 * papier se figent donc par paliers, exactement comme une animation dessinée
 * image par image. À 60 Hz, l'œil lit « bruit ». À 10 Hz, il lit « main ».
 */
export const BOIL_HZ = 10;

export const PAPER = new THREE.Color('#efe7d6');
export const INK = new THREE.Color('#211c17');

/**
 * Aplats d'encre. Peu de teintes, franches, et surtout CLAIRES : sur une
 * planche encrée, c'est le trait noir qui porte le dessin, pas la valeur des
 * surfaces. Des aplats trop foncés et tout vire à la boue.
 */
export const PALETTE = [
  new THREE.Color('#e7ddc7'), // 0 — sol, presque le papier
  new THREE.Color('#dccbaa'), // 1 — façades
  new THREE.Color('#ab9f88'), // 2 — volumes sombres, toitures
  new THREE.Color('#c05a3c'), // 3 — accents vermillon
];

/** Uniformes partagés par tous les matériaux d'encre. Mis à jour une fois/frame. */
export const inkUniforms = {
  uSeed: { value: 0 },
  uTime: { value: 0 },
  uPalette: { value: PALETTE },
  uInk: { value: INK },
  uPaper: { value: PAPER },
  uLightDir: { value: new THREE.Vector3(0.45, 0.82, 0.35).normalize() },
  uResolution: { value: new THREE.Vector2(1, 1) },
};

const HASH = /* glsl */ `
  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
`;

/**
 * Matériau d'aplat : éclairage quantifié en trois valeurs, plus une trame de
 * points façon manga dans les ombres. Aucune transition douce nulle part.
 */
export const createCelMaterial = (
  solidColor?: THREE.Color,
  palette?: THREE.Color[],
  ink?: THREE.Color,
): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        ...inkUniforms,
        // Teinte propre à l'objet, qui court-circuite la palette du décor.
        // C'est ce qui donne sa couleur à chaque joueur.
        uSolid: { value: solidColor ?? new THREE.Color() },
        uUseSolid: { value: solidColor ? 1 : 0 },
        // Palette propre à la région, sinon celle du monde par défaut.
        uPalette: { value: palette ?? PALETTE },
        uInk: { value: ink ?? INK },
      },
    ]),
    fog: true,
    clipping: true,
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      #include <clipping_planes_pars_vertex>

      attribute float aInk;
      varying vec3 vNormalW;
      varying float vInk;

      void main() {
        vInk = aInk;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vec4 mvPosition = viewMatrix * worldPosition;
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      #include <clipping_planes_pars_fragment>
      ${HASH}

      uniform vec3 uPalette[4];
      uniform vec3 uSolid;
      uniform float uUseSolid;
      uniform vec3 uInk;
      uniform vec3 uLightDir;
      uniform float uSeed;

      varying vec3 vNormalW;
      varying float vInk;

      void main() {
        #include <clipping_planes_fragment>

        int idx = int(vInk + 0.5);
        vec3 base = uPalette[0];
        if (idx == 1) base = uPalette[1];
        else if (idx == 2) base = uPalette[2];
        else if (idx == 3) base = uPalette[3];
        base = mix(base, uSolid, uUseSolid);

        vec3 n = normalize(vNormalW);

        // Éclairage « planche dessinée » : la valeur est portée surtout par
        // l'orientation haut/bas, pas par la direction de la lumière. C'est
        // volontaire — avec un éclairage directionnel franc, deux murs
        // verticaux voisins tombaient de part et d'autre d'un seuil et se
        // retrouvaient dans deux tons différents sans raison lisible.
        // Ici : dessus clair, murs d'un seul ton, dessous sombre.
        float up = n.y * 0.5 + 0.5;
        float key = dot(n, normalize(uLightDir)) * 0.5 + 0.5;
        float lit = up * 0.72 + key * 0.28;

        // Trois valeurs franches — jamais de dégradé. Les seuils sont placés de
        // part et d'autre du paquet des surfaces verticales, pas dedans.
        float band = lit > 0.75 ? 1.0 : (lit > 0.40 ? 0.66 : 0.30);
        vec3 col = mix(uInk, base, 0.44 + band * 0.56);

        // Un souffle de directionnel par-dessus l'aplat : assez pour que les
        // volumes ne soient pas complètement plats, trop peu pour créer un seuil.
        col *= 0.95 + key * 0.10;

        // Trame de manga, réservée à la valeur la plus sombre. Si on la laisse
        // déborder sur les demi-teintes, elle couvre toute l'image et se lit
        // comme un moirage, pas comme une trame.
        if (band < 0.5) {
          vec2 jitter = vec2(hash12(vec2(uSeed, 3.1)), hash12(vec2(uSeed, 7.7))) * 2.0;
          vec2 g = (gl_FragCoord.xy + jitter) / 7.0;
          vec2 rg = vec2(g.x + g.y, g.y - g.x) * 0.70711;
          vec2 c = fract(rg) - 0.5;
          float dots = smoothstep(0.34, 0.22, length(c));
          col = mix(col, uInk, dots * 0.40);
        }

        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }
    `,
  });

/**
 * Contour à coque inversée : on redessine la géométrie en faces arrière,
 * gonflée vers l'extérieur. L'épaisseur est proportionnelle à la profondeur,
 * donc constante à l'écran — indispensable ici, sinon un joueur minuscule se
 * retrouverait avec des traits gros comme des immeubles.
 */
export const createOutlineMaterial = (ink?: THREE.Color): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        ...inkUniforms,
        uInk: { value: ink ?? INK },
        uThickness: { value: 0.0052 },
        uWobble: { value: 0.8 },
      },
    ]),
    fog: true,
    clipping: true,
    side: THREE.BackSide,
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      #include <clipping_planes_pars_vertex>
      ${HASH}

      attribute vec3 aCenter;
      uniform float uThickness;
      uniform float uWobble;
      uniform float uSeed;

      void main() {
        // Profondeur du sommet NON gonflé : c'est elle qui pilote l'épaisseur.
        vec4 baseWorld = modelMatrix * vec4(position, 1.0);
        float depth = max(-(viewMatrix * baseWorld).z, 0.02);

        // Expansion en coin : propre sur une boîte, y compris aux arêtes.
        vec3 dir = sign(position - aCenter);

        float n1 = hash13(position * 0.63 + uSeed * 1.7);
        float n2 = hash13(position * 1.41 + uSeed * 2.3 + 19.0);

        float t = uThickness * depth * (1.0 + (n1 - 0.5) * uWobble);
        vec4 worldPosition = modelMatrix * vec4(position + dir * t, 1.0);
        vec4 mvPosition = viewMatrix * worldPosition;

        // Tremblement latéral : c'est lui qu'on lit comme « tracé à la main ».
        mvPosition.xy += (vec2(n1, n2) - 0.5) * depth * 0.0016;

        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      #include <clipping_planes_pars_fragment>
      uniform vec3 uInk;
      void main() {
        #include <clipping_planes_fragment>
        gl_FragColor = vec4(uInk, 1.0);
        #include <fog_fragment>
      }
    `,
  });

/** Propage les uniformes partagés vers un matériau donné. */
export const syncInkUniforms = (mat: THREE.ShaderMaterial): void => {
  mat.uniforms.uSeed.value = inkUniforms.uSeed.value;
  mat.uniforms.uTime.value = inkUniforms.uTime.value;
  if (mat.uniforms.uResolution) {
    mat.uniforms.uResolution.value.copy(inkUniforms.uResolution.value);
  }
};
