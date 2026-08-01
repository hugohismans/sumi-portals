import * as THREE from 'three';
import { INK, PAPER, inkUniforms } from './ink.js';

/**
 * Passe finale : le papier.
 *
 * Elle s'applique à l'image ENTIÈRE, contenu des portails compris — sinon la
 * fenêtre du portail aurait un grain différent du reste et trahirait l'illusion.
 */
export class PaperPass {
  readonly target: THREE.WebGLRenderTarget;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: THREE.ShaderMaterial;

  constructor(width: number, height: number) {
    this.target = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
    });
    this.target.texture.colorSpace = THREE.SRGBColorSpace;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.target.texture },
        uResolution: { value: new THREE.Vector2(width, height) },
        uSeed: { value: 0 },
        uPaper: { value: PAPER },
        uInk: { value: INK },
      },
      depthTest: false,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform vec2 uResolution;
        uniform float uSeed;
        uniform vec3 uPaper;
        uniform vec3 uInk;
        varying vec2 vUv;

        float hash12(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }

        void main() {
          // Ondulation de la feuille. Par blocs et figée à 10 Hz : c'est ce qui
          // donne la sensation que chaque image est redessinée à la main.
          vec2 block = floor(vUv * uResolution * 0.05);
          vec2 w = vec2(hash12(block + uSeed), hash12(block + uSeed + 13.0)) - 0.5;
          vec2 uv = vUv + w * 1.6 / uResolution;

          vec3 col = texture2D(tDiffuse, uv).rgb;

          // Grain du papier.
          float g = hash12(floor(vUv * uResolution) + uSeed * 3.0);
          col *= 0.945 + g * 0.11;

          // Fibres du papier : longues et couchées, donc très étirées en x et
          // fines en y. L'inverse donnerait des rayures verticales de store.
          vec2 fib = floor(vec2(vUv.x * uResolution.x * 0.010, vUv.y * uResolution.y * 1.0));
          float f = hash12(fib + uSeed * 0.5);
          col = mix(col, uPaper, smoothstep(0.94, 1.0, f) * 0.13);

          // Lavis sombre dans les coins, comme une planche encrée.
          float v = smoothstep(0.92, 0.30, length(vUv - 0.5));
          col = mix(mix(col, uInk, 0.16), col, v);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene.add(quad);
  }

  resize(width: number, height: number): void {
    this.target.setSize(width, height);
    this.material.uniforms.uResolution.value.set(width, height);
  }

  /** Compose la cible principale vers l'écran. */
  render(renderer: THREE.WebGLRenderer): void {
    this.material.uniforms.uSeed.value = inkUniforms.uSeed.value;
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.camera);
  }
}
