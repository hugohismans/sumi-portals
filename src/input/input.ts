import type { InputCommand } from '../core/types.js';

const LOOK_SENSITIVITY = 0.0022;

/** Au doigt, on balaie moins vite qu'à la souris pour le même geste. */
const TOUCH_LOOK_SENSITIVITY = 0.0042;

/** Rayon du manche virtuel, en pixels : au-delà, on va à fond. */
const STICK_RADIUS = 62;

/**
 * Faut-il basculer d'emblée en mode tactile ?
 *
 * On ne cherche PAS à deviner l'appareil. Renifler les navigateurs, c'est la
 * garantie que ça marchera sur un téléphone et pas sur l'autre — un iPad avec
 * clavier, un portable à écran tactile, un navigateur qui ment sur son
 * identité. On ne teste donc qu'un fait vérifiable et pertinent : la capture
 * de pointeur existe-t-elle ? Sinon, il n'y a pas d'autre choix que le doigt.
 *
 * Et de toute façon ce test n'est qu'une amorce : le premier contact tactile
 * réel bascule le jeu, quel que soit ce que l'appareil prétend être.
 */
const pointerLockUnavailable = (): boolean =>
  typeof Element === 'undefined' || !('requestPointerLock' in Element.prototype);

/**
 * Clavier + souris → commandes.
 *
 * On lit `event.code` (position physique de la touche) et non `event.key`,
 * ce qui fait marcher AZERTY et QWERTY sans configuration.
 */
export class InputManager {
  private readonly keys = new Set<string>();
  private mouseDown = false;
  /** Vrai dès qu'on joue au doigt. Peut basculer en cours de route. */
  touchOnly = pointerLockUnavailable();
  /** Prévenu au basculement, pour que l'interface se réorganise. */
  onTouchMode: (() => void) | null = null;
  private touchWired = false;
  private moveTouch: number | null = null;
  private lookTouch: number | null = null;
  private moveX = 0;
  private moveY = 0;
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

    // Clic gauche pour lancer — mais seulement souris capturée, sinon le clic
    // qui sert à revenir dans le jeu enverrait la caisse au loin.
    document.addEventListener('mousedown', (e) => {
      if (this.locked && e.button === 0) this.mouseDown = true;
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
    window.addEventListener('blur', () => {
      this.mouseDown = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * LOOK_SENSITIVITY;
      this.pitch -= e.movementY * LOOK_SENSITIVITY;
      const limit = Math.PI / 2 - 0.02;
      this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
    });

    // Le vrai déclencheur : un doigt qui se pose. Aucun reniflage d'appareil
    // ne vaut cette preuve directe, et elle marche partout, sans exception.
    window.addEventListener(
      'touchstart',
      () => this.enableTouchMode(),
      { passive: true, once: true },
    );

    if (this.touchOnly) this.enableTouchMode();
  }

  /** Bascule en commandes tactiles. Sans effet si c'est déjà fait. */
  enableTouchMode(): void {
    if (this.touchWired) return;
    this.touchWired = true;
    this.touchOnly = true;
    this.setupTouch();
    this.onTouchMode?.();
    // Le panneau d'accueil attend une capture de souris qui ne viendra jamais :
    // on entre directement, sinon le joueur reste bloqué devant.
    if (!this.locked) {
      this.locked = true;
      this.onLockChange?.(true);
    }
  }

  /**
   * Commandes tactiles.
   *
   * Partage de l'écran : le pouce gauche mène le déplacement — le manche naît
   * là où le doigt se pose, plutôt qu'à un endroit fixe, ce qui évite d'avoir
   * à viser une zone sans la regarder. Le côté droit fait pivoter le regard.
   * Les boutons, eux, sont en HTML : ils gèrent seuls leur propre survol et
   * leur zone de contact.
   */
  private setupTouch(): void {
    const start = new Map<number, { x: number; y: number }>();

    const onStart = (e: TouchEvent): void => {
      for (const t of Array.from(e.changedTouches)) {
        const gauche = t.clientX < window.innerWidth * 0.45;
        if (gauche && this.moveTouch === null) {
          this.moveTouch = t.identifier;
          start.set(t.identifier, { x: t.clientX, y: t.clientY });
        } else if (!gauche && this.lookTouch === null) {
          this.lookTouch = t.identifier;
          start.set(t.identifier, { x: t.clientX, y: t.clientY });
        }
      }
    };

    const onMove = (e: TouchEvent): void => {
      for (const t of Array.from(e.changedTouches)) {
        const origin = start.get(t.identifier);
        if (!origin) continue;

        if (t.identifier === this.moveTouch) {
          const dx = t.clientX - origin.x;
          const dy = t.clientY - origin.y;
          const len = Math.hypot(dx, dy) || 1;
          const amp = Math.min(1, len / STICK_RADIUS);
          this.moveX = (dx / len) * amp;
          this.moveY = (-dy / len) * amp;
        } else if (t.identifier === this.lookTouch) {
          this.yaw -= (t.clientX - origin.x) * TOUCH_LOOK_SENSITIVITY;
          this.pitch -= (t.clientY - origin.y) * TOUCH_LOOK_SENSITIVITY;
          const limit = Math.PI / 2 - 0.02;
          this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
          // Le regard suit le doigt en continu : l'origine se déplace avec lui.
          origin.x = t.clientX;
          origin.y = t.clientY;
        }
      }
      e.preventDefault();
    };

    const onEnd = (e: TouchEvent): void => {
      for (const t of Array.from(e.changedTouches)) {
        start.delete(t.identifier);
        if (t.identifier === this.moveTouch) {
          this.moveTouch = null;
          this.moveX = 0;
          this.moveY = 0;
        }
        if (t.identifier === this.lookTouch) this.lookTouch = null;
      }
    };

    const surface = document.getElementById('touch-surface') ?? document.body;
    surface.addEventListener('touchstart', onStart as EventListener, { passive: true });
    surface.addEventListener('touchmove', onMove as EventListener, { passive: false });
    surface.addEventListener('touchend', onEnd as EventListener, { passive: true });
    surface.addEventListener('touchcancel', onEnd as EventListener, { passive: true });
  }

  /** Boutons tactiles : maintenus tant que le doigt reste dessus. */
  bindTouchButton(el: HTMLElement, code: string): void {
    const down = (e: Event): void => {
      e.preventDefault();
      this.keys.add(code);
      if (code === 'Mouse0') this.mouseDown = true;
    };
    const up = (): void => {
      this.keys.delete(code);
      if (code === 'Mouse0') this.mouseDown = false;
    };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: true });
    el.addEventListener('touchcancel', up, { passive: true });
  }

  private retryHandle: number | null = null;
  private lockFailures = 0;

  requestLock(): void {
    if (this.locked) return;
    // Sur téléphone, il n'y a pas de capture de pointeur : on entre simplement
    // dans le jeu. Sans ce cas, l'appel échouait en silence et le panneau
    // d'accueil restait à l'écran pour toujours — le jeu paraissait mort.
    if (this.touchOnly) {
      this.locked = true;
      this.onLockChange?.(true);
      return;
    }
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
    // Un refus persistant signifie que cet appareil n'en veut pas : plutôt que
    // de laisser le joueur devant un panneau qui ne répond pas, on lui donne
    // les commandes tactiles. Mieux vaut un jeu jouable qu'un jeu conforme.
    if (this.lockFailures++ >= 2) {
      this.enableTouchMode();
      return;
    }
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
      forward: this.moveY || this.axis(['KeyS', 'ArrowDown'], ['KeyW', 'ArrowUp']),
      strafe: this.moveX || this.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']),
      jump: this.keys.has('Space'),
      sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      // Maintenue telle quelle : c'est la simulation qui détecte le front, pour
      // que le comportement soit identique en local et sur un futur serveur.
      interact: this.keys.has('KeyE'),
      throwIt: this.mouseDown || this.keys.has('Mouse0'),
      yaw: this.yaw,
      pitch: this.pitch,
    };
  }
}
