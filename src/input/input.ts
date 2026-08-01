import type { InputCommand } from '../core/types.js';

const LOOK_SENSITIVITY = 0.0022;

/**
 * Clavier + souris → commandes.
 *
 * On lit `event.code` (position physique de la touche) et non `event.key`,
 * ce qui fait marcher AZERTY et QWERTY sans configuration.
 */
export class InputManager {
  private readonly keys = new Set<string>();
  private yaw: number;
  private pitch = 0;
  locked = false;
  onReset: (() => void) | null = null;
  onLockChange: ((locked: boolean) => void) | null = null;
  onCapture: (() => void) | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    initialYaw: number,
  ) {
    this.yaw = initialYaw;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'KeyR') this.onReset?.();
      if (e.code === 'KeyC') this.onCapture?.();
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) this.keys.clear();
      this.onLockChange?.(this.locked);
    });

    // Chrome refuse la capture pendant une seconde environ après une sortie par
    // Échap. On retente une fois plutôt que d'abandonner : sinon le joueur
    // clique, rien ne se passe, et il croit le jeu bloqué.
    document.addEventListener('pointerlockerror', () => this.retryLock());

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * LOOK_SENSITIVITY;
      this.pitch -= e.movementY * LOOK_SENSITIVITY;
      const limit = Math.PI / 2 - 0.02;
      this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
    });
  }

  private retryHandle: number | null = null;

  requestLock(): void {
    if (this.locked) return;
    try {
      // Selon les navigateurs, l'appel renvoie une promesse ou rien du tout.
      const result = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      if (result && typeof result.catch === 'function') result.catch(() => this.retryLock());
    } catch {
      this.retryLock();
    }
  }

  /** Nouvelle tentative après le délai de garde imposé par le navigateur. */
  private retryLock(): void {
    if (this.retryHandle !== null) return;
    this.retryHandle = window.setTimeout(() => {
      this.retryHandle = null;
      if (this.locked) return;
      try {
        const result = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
        if (result && typeof result.catch === 'function') result.catch(() => {});
      } catch {
        /* On laisse la main au joueur : il lui reste le clic. */
      }
    }, 1400);
  }

  /** Recale l'orientation après une traversée (le portail fait pivoter le regard). */
  setYaw(yaw: number): void {
    this.yaw = yaw;
  }

  setPitch(pitch: number): void {
    this.pitch = pitch;
  }

  private axis(negative: string[], positive: string[]): number {
    let v = 0;
    for (const c of positive) if (this.keys.has(c)) v += 1;
    for (const c of negative) if (this.keys.has(c)) v -= 1;
    return Math.max(-1, Math.min(1, v));
  }

  sample(): InputCommand {
    return {
      forward: this.axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']),
      strafe: this.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']),
      jump: this.keys.has('Space'),
      sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      // Maintenue telle quelle : c'est la simulation qui détecte le front, pour
      // que le comportement soit identique en local et sur un futur serveur.
      interact: this.keys.has('KeyE'),
      yaw: this.yaw,
      pitch: this.pitch,
    };
  }
}
