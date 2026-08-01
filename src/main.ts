import * as THREE from 'three';
import { PLAYER_HEIGHT, TICK_DT, scaleOfLevel } from './core/constants.js';
import { Simulation } from './core/simulation.js';
import { InputManager } from './input/input.js';
import { LEVEL_01 } from './levels/level01.js';
import { LEVEL_02 } from './levels/level02.js';
import { DALLE_GEANT, DALLE_MINUSCULE, RAYON_DALLE, construireDuo, roleDansSalon, type RoleDuo } from './levels/duo.js';
import { LOBBY } from './levels/lobby.js';
import { MONDE } from './levels/monde.js';
import { reve } from './levels/reve.js';
import { Ambiance } from './audio/ambiance.js';
import { retrouvailles, type Dalle } from './core/retrouvailles.js';
import { Cinematique } from './render/cinematique.js';
import { Talisman } from './render/talisman.js';
import { Pigments } from './render/pigments.js';
import { Tracage } from './render/tracage.js';
import { AttenteDuo } from './net/attente.js';
import { CaissesPartagees } from './net/caisses.js';
import { Presence, type RemoteSnapshot } from './net/presence.js';
import { BOIL_HZ, PAPER, inkUniforms, syncInkUniforms } from './render/ink.js';
import { PaperPass } from './render/paperPass.js';
import { PortalRenderer } from './render/portalRenderer.js';
import { Avatar } from './render/avatar.js';
import { Brush } from './render/brush.js';
import { CarryableViews } from './render/carryableViews.js';
import { Feuilles } from './render/feuilles.js';
import { SocketViews } from './render/socketViews.js';
import { RemotePlayers } from './render/remotePlayers.js';
import { buildGoalMarker, buildWorldView } from './render/worldMesh.js';

// --- Choix du niveau -----------------------------------------------------------
// Le passage d'un niveau à l'autre se fait par rechargement de la page plutôt
// que par reconstruction de la scène à chaud. C'est volontairement rustique :
// une seconde de chargement entre le hall et une énigme est indolore, et ça
// évite tout un mécanisme de démontage qui n'apporterait rien pour l'instant.
const PARAMS = new URLSearchParams(location.search);
const MODE = PARAMS.get('niveau');
/**
 * Le rôle du duo voyage dans l'adresse plutôt que d'être déduit à l'exécution.
 *
 * C'est délibéré : le niveau se construit au chargement du module, alors que
 * l'identifiant du joueur n'arrive qu'après une connexion asynchrone. Chaque
 * client calcule son rôle AVANT de basculer, et l'emporte avec lui.
 */
const SALON = PARAMS.get('salon') ?? '';
const ROLE: RoleDuo = PARAMS.get('role') === 'minuscule' ? 'minuscule' : 'geant';
/**
 * LES NIVEAUX SONT DES FONCTIONS, PAS DES OBJETS.
 *
 * Ils étaient construits tous les cinq au chargement du module — y compris
 * quand on ne faisait qu'entrer dans le hall. Le monde, ses quinze cents
 * boîtes, la clairière et un rêve entier étaient fabriqués pour rien, à chaque
 * ouverture de la page.
 *
 * Ici on n'en construit qu'UN : celui qu'on va jouer. Le jour où il y aura
 * cent niveaux, il s'en construira toujours un seul. C'est la propriété qui
 * rend la suite possible — un niveau n'est que de la donnée, et de la donnée
 * qu'on ne demande pas ne coûte rien.
 */
const NIVEAUX: Record<string, () => typeof LEVEL_01> = {
  monde: () => MONDE,
  cour: () => LEVEL_01,
  caisse: () => LEVEL_02,
  duo: () => construireDuo(ROLE),
  reve: () => reve(Number(PARAMS.get('graine')) || 1),
};
const EN_AVENTURE = MODE !== null && MODE in NIVEAUX;
const EN_DUO = MODE === 'duo' && SALON !== '';
const LEVEL = EN_AVENTURE ? NIVEAUX[MODE!]() : LOBBY;
/** Enchaînement des énigmes. Le hall suit la fin de la dernière. */
const NIVEAU_SUIVANT: Record<string, string> = {
  monde: './',
  cour: '?niveau=caisse',
  caisse: '?niveau=monde',
};

// --- Simulation ---------------------------------------------------------------
const sim = new Simulation(LEVEL);

// --- Rendu --------------------------------------------------------------------
// Pas de tampon de profondeur logarithmique : il exige que CHAQUE shader écrive
// lui-même sa profondeur, ce que des matériaux maison ne font pas — le tri des
// surfaces s'effondre et les contours disparaissent. On règle le problème
// autrement, en faisant suivre le plan proche ET le plan lointain de l'échelle
// du joueur (voir applyScale) : leur rapport reste alors constant.
const renderer = new THREE.WebGLRenderer({ antialias: true });
// Les caisses à cheval sur un portail sont tranchées par des plans qui leur
// sont propres — d'où le découpage local, en plus du plan global des portails.
renderer.localClippingEnabled = true;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(PAPER, 1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = PAPER.clone();
// Le brouillard est réglé UNE fois et ne bouge plus jamais.
//
// Il suivait l'échelle du joueur, et c'était une erreur : en rapetissant,
// « l'air » devenait quatre fois plus épais, si bien que les mêmes bâtiments
// changeaient de couleur au moment précis de la traversée. Or l'air ne
// s'épaissit pas parce qu'on a rapetissé — une même distance, c'est la même
// quantité d'air. Le décor doit garder exactement la teinte qu'il avait.
scene.fog = new THREE.Fog(PAPER.clone(), 34, 300);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.02, 460);
camera.rotation.order = 'YXZ';

const worldView = buildWorldView(LEVEL);
scene.add(worldView.group);

// ─── LE LAVIS, ET LES COULEURS QU'ON LUI REND ───────────────────────────────
//
// Le monde commence en gris. Chaque pigment rapporté d'ailleurs repeint la part
// du monde qui l'attendait. On garde la trace d'une partie à l'autre : rendre
// une couleur est un acquis, pas un état de session.
const pigments = new Pigments();
const pigmentDe = new Map<string, string>();
for (const r of LEVEL.regions ?? []) if (r.pigment) pigmentDe.set(r.name, r.pigment);
pigments.appliquer(worldView.parRegion, pigmentDe);

const goalMarker = buildGoalMarker(LEVEL);
scene.add(goalMarker);

// Les autres joueurs. Vide hors du hall, mais toujours dans la scène : ils
// apparaîtront ainsi tout seuls dans les vues de portail, sans un mot de plus.
const remotePlayers = new RemotePlayers();
scene.add(remotePlayers.group);

const carryableViews = new CarryableViews();
carryableViews.build(sim.carryables.items);
scene.add(carryableViews.group);

const socketViews = new SocketViews();
socketViews.build(sim.sockets.items);
scene.add(socketViews.group);

// Quelques feuilles portées par le vent, qui laissent une traînée d'encre. Une
// douzaine, pas davantage : une planche encrée tire sa force de ses vides.
const feuilles = new Feuilles();
scene.add(feuilles.group);

// Le sceau de la retrouvaille, entre les deux dalles. Invisible partout
// ailleurs : il n'a de sens que dans l'aventure à deux.
const talisman = new Talisman([
  (DALLE_GEANT[0] + DALLE_MINUSCULE[0]) * 0.5,
  DALLE_GEANT[1],
  DALLE_GEANT[2],
]);
if (EN_DUO) scene.add(talisman.group);

// Le Pinceau. Il vit dans le monde, se laisse rejoindre, puis file plus loin.
const brush = new Brush(LEVEL.guide);
// Le seul retour du jeu qui dise « tu avances ». Le son du pinceau existait
// depuis longtemps mais n'était branché nulle part : on le rattrapait, il
// repartait, et il ne se passait rien. L'arpège, lui, monte d'un jalon à
// l'autre — on entend sa propre progression sans jamais lire un compteur.
brush.onEnvol = (etape, total) => {
  ambiance.pinceau();
  ambiance.progression(etape, total);
  flash(`Le pinceau repart. ${etape} sur ${total - 1}.`, 2.2);
};
scene.add(brush.group);

// ─── LA PORTE QUI N'EST PAS ENCORE DESSINÉE ────────────────────────────────
//
// La seconde porte du monde n'existe pas au départ : son cadre est planté, mais
// la toile est vierge et l'on ne traverse pas une toile vierge. Le pinceau vous
// y attend, et quand vous l'avez rejoint, il la dessine — par taches, avec un
// bruit à chaque coup — et le belvédère apparaît dedans avant qu'on y aille.
//
// C'est ce qui donne enfin un SENS au fait d'avoir couru après lui : il ne
// montrait pas le chemin, il le fabriquait.
const PORTE_A_DESSINER = 'ascension-2';
/** Le jalon devant cette porte. Repéré par sa POSITION, pas par son rang :
 *  ajouter une station ailleurs dans le guide ne doit rien casser ici. */
const JALON_PORTE: [number, number, number] = [0, 30, 58];
const tracage = new Tracage();
/** Le plan de fin. Ne se déclenche qu'une fois, et seulement dans le monde. */
const sacre = new Cinematique();
let coupsPoses = 0;

if (MODE === 'monde') sim.portesFermees.add(PORTE_A_DESSINER);

// Le bonhomme du joueur local. Il vit dans la scène comme n'importe quel objet,
// donc il apparaît tout seul dans les vues de portail : on se voit soi-même, de
// dos et minuscule, à travers le grand torii.
const avatar = new Avatar(0x4c6b3c);
scene.add(avatar.group);

const portals = new PortalRenderer(
  sim.faces,
  LEVEL.portals,
  window.innerWidth,
  window.innerHeight,
);
scene.add(portals.group);

// La toile de la seconde porte part vierge. Il faut le faire ICI, une fois le
// renderer de portails construit — d'où la séparation avec la déclaration plus
// haut, qui n'a besoin que de la simulation.
if (MODE === 'monde') portals.tracer(PORTE_A_DESSINER, 0);

const paper = new PaperPass(window.innerWidth, window.innerHeight);

// --- Son -----------------------------------------------------------------------
// Entièrement synthétisé, sans un seul fichier à télécharger — le jeu reste un
// site statique. Il ne démarre qu'au premier geste : les navigateurs
// l'interdisent avant, et c'est une bonne chose.
const ambiance = new Ambiance();
/** Cadence des pas, en foulées par seconde et par taille de corps. */
let stepPhase = 0;
/** Retard vertical de l'œil sur le corps, après une marche. Toujours ≤ 0. */
let lissageMarche = 0;

// --- Entrées ------------------------------------------------------------------
const input = new InputManager(renderer.domElement, LEVEL.spawnYaw);

// --- Interface ----------------------------------------------------------------
const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const overlay = el('overlay');
const winPanel = el('win');
const scaleValue = el('scale-value');
const scaleSub = el('scale-sub');
const hintBox = el('hint');
const peersBox = el('peers');
const suiteEl = el<HTMLAnchorElement>('suite');
const fpsBox = el('fps');

const SCALE_LABELS: Record<number, [string, string]> = {
  [-2]: ['×1/16', 'seize fois plus petit'],
  [-1]: ['×1/4', 'quatre fois plus petit'],
  [0]: ['×1', 'taille normale'],
  [1]: ['×4', 'quatre fois plus grand'],
};

let hintText = '';
let flashUntil = 0;

const setHint = (text: string): void => {
  if (text === hintText) return;
  hintText = text;
  hintBox.textContent = text;
  hintBox.classList.toggle('show', text.length > 0);
};

const flash = (text: string, seconds = 2.4): void => {
  setHint(text);
  flashUntil = performance.now() + seconds * 1000;
};

// Le panneau réapparaît dès que la souris est relâchée (Échap, changement
// d'onglet, retour sur la page). Sans ça il disparaissait au premier clic et
// plus rien ne permettait de reprendre la main : le jeu semblait figé.
overlay.addEventListener('click', () => input.requestLock());

// --- Tactile ---------------------------------------------------------------
// Sur téléphone, il n'y a pas de capture de souris : le pouce gauche déplace,
// le côté droit fait pivoter le regard, et trois boutons font le reste.
//
// Le basculement peut survenir À TOUT MOMENT — au premier doigt posé, ou après
// un refus de capture — et pas seulement au démarrage. On s'abonne donc plutôt
// que de tester une fois pour toutes.
input.onTouchMode = () => {
  document.body.classList.add('touch');
  input.bindTouchButton(el('btn-take'), 'KeyE');
  input.bindTouchButton(el('btn-throw'), 'Mouse0');
  input.bindTouchButton(el('btn-jump'), 'Space');
};

// Filet de sécurité : un doigt posé sur le panneau d'accueil bascule aussi. Sur
// iPhone, le « clic » n'arrive parfois jamais, et l'on restait devant un écran
// muet — tandis qu'un contact tactile, lui, est toujours signalé.
overlay.addEventListener('touchstart', () => input.enableTouchMode(), { passive: true });

input.onLockChange = (locked) => {
  overlay.classList.toggle('hidden', locked);
  if (locked) {
    overlay.classList.add('resumed');
    // Premier geste du joueur : c'est le seul moment où le son peut démarrer.
    ambiance.demarrer();
  }
};

/**
 * Touche C : copie le point de vue exact dans le presse-papiers.
 *
 * Sert à signaler un défaut visuel. Une capture d'écran montre CE QU'ON voit ;
 * cette ligne-là permet de se replacer au centimètre et au degré près pour
 * regarder la même chose. Les deux ensemble, et un bug « je ne sais pas
 * comment l'expliquer » devient reproductible.
 */
input.onCapture = () => {
  const p = sim.player.position;
  const line =
    `__game.tp(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}, ` +
    `${sim.player.scaleLevel}, ${sim.player.yaw.toFixed(3)}, ${sim.player.pitch.toFixed(3)})`;
  console.log(line);
  void navigator.clipboard?.writeText(line).then(
    () => flash('Point de vue copié — colle-le dans la conversation.'),
    () => flash('Point de vue affiché dans la console (F12).'),
  );
};

// Tous les rappels sont branchés : on peut réveiller les commandes.
input.start();

input.onReset = () => {
  sim.reset();
  input.setYaw(LEVEL.spawnYaw);
  winPanel.classList.remove('show');
  applyScale(true);
};

// --- Réseau --------------------------------------------------------------------
// Le hall est peuplé, et l'aventure à deux l'est nécessairement. Les autres
// niveaux se jouent seul, et n'ouvrent donc aucune connexion.
const presence = new Presence();
const attenteDuo = new AttenteDuo();
const caisses = new CaissesPartagees();
let presenceActive = false;
let transitionEnCours = false;

if (!EN_AVENTURE || EN_DUO) {
  presence
    .join()
    .then(() => {
      presenceActive = true;
      // En duo, on garde son salon publié : c'est ce qui permet à chacun de
      // reconnaître SON partenaire parmi tous les joueurs connectés, sans
      // ouvrir le moindre chemin nouveau dans la base.
      if (EN_DUO) presence.salon = SALON;
    })
    .catch((e: Error) => {
      // Le hall reste parfaitement jouable seul : le réseau est un supplément,
      // jamais une condition. Une panne de Firebase ne doit pas fermer le jeu.
      console.warn('Réseau indisponible :', e);
      flash(
        EN_DUO
          ? 'Connexion perdue — impossible de rejoindre ton partenaire.'
          : 'Hall hors ligne — tu es seul, mais le jeu marche.',
        5,
      );
    });

  // Départ propre quand on ferme l'onglet. Le serveur efface aussi la fiche de
  // son côté, mais autant ne pas dépendre uniquement de lui.
  window.addEventListener('pagehide', () => void presence.leave());
}

/**
 * Franchir un seuil du hall.
 *
 * Trois arches, trois destins. Celui du duo ne part pas tout de suite : il
 * faut être deux, et l'attente se passe DANS le hall — on continue à jouer avec
 * les portails pendant ce temps. Une salle d'attente muette est insupportable
 * au bout de vingt secondes.
 */
function franchirSeuil(mode: 'solo' | 'duo' | 'reve'): void {
  if (transitionEnCours) return;

  if (mode === 'solo') {
    transitionEnCours = true;
    flash('Départ pour l’Aventure…', 4);
    void presence.leave().finally(() => {
      location.search = '?niveau=monde';
    });
    return;
  }

  if (mode === 'reve') {
    // Une graine tirée au sort à chaque passage : personne ne rêve deux fois
    // la même chose, mais l'adresse garde la graine — on peut donc revenir sur
    // un rêve qu'on a aimé, ou l'envoyer à quelqu'un.
    const graine = 1 + Math.floor(Math.random() * 99_999);
    transitionEnCours = true;
    flash('Tu t’endors…', 4);
    void presence.leave().finally(() => {
      location.search = `?niveau=reve&graine=${graine}`;
    });
    return;
  }

  // À deux : on se met en attente et l'on reste libre de ses mouvements.
  if (!presenceActive) {
    flash('Le hall est hors ligne — impossible de trouver quelqu’un.', 4);
    sim.seuilFranchi = false;
    return;
  }
  attenteDuo.demarrer(presence);
  flash('Tu attends sous l’arche. Reste dans le hall, joue en attendant.', 4);
  // Le seuil se réarme : on peut ressortir de la file en s'éloignant, et la
  // repasser plus tard. S'engager ne doit pas être un aller sans retour.
  sim.seuilFranchi = false;
}

// --- La retrouvaille ------------------------------------------------------------
/**
 * La seule fin de partie du jeu qu'on ne peut pas déclencher seul.
 *
 * La règle vit dans core/retrouvailles.ts et se vérifie sans réseau ; ici il
 * n'y a que la lecture du partenaire et l'affichage. On tolère une donnée un
 * peu vieille — elle arrive dix fois par seconde, et exiger la simultanéité
 * parfaite ferait rater des retrouvailles pourtant réussies.
 */
const DALLES: [Dalle, Dalle] = [
  { centre: DALLE_GEANT, rayon: RAYON_DALLE },
  { centre: DALLE_MINUSCULE, rayon: RAYON_DALLE },
];
let retrouves = false;

function surveillerRetrouvailles(pairs: Map<string, RemoteSnapshot>): void {
  if (retrouves) return;
  const autre = pairs.values().next().value as RemoteSnapshot | undefined;
  if (!autre) return;

  const ensemble = retrouvailles(
    { position: sim.player.position, scaleLevel: sim.player.scaleLevel },
    { position: { x: autre.x, y: autre.y, z: autre.z }, scaleLevel: autre.lvl },
    DALLES,
  );
  if (!ensemble) return;

  retrouves = true;
  talisman.declencher();
  ambiance.retrouvaille();
  flash('Vous voilà de la même taille. C’était tout ce qu’il fallait.', 8);
}

// --- Échelle ------------------------------------------------------------------
let renderedLevel = Number.NaN;

/**
 * Le peu qui dépend de la taille du joueur.
 *
 * Presque rien, en fait, et c'est voulu : le décor doit garder rigoureusement
 * la même apparence de part et d'autre d'une traversée. Seul le joueur change.
 * Ni le brouillard, ni les portails, ni les couleurs ne bougent.
 */
function applyScale(force = false): void {
  const level = sim.player.scaleLevel;
  if (!force && level === renderedLevel) return;
  renderedLevel = level;

  const scale = scaleOfLevel(level);

  // Le plan proche suit l'échelle — un joueur minuscule doit pouvoir coller son
  // œil aux choses — mais avec un plancher, sinon l'écart proche/lointain
  // devient tel que la profondeur perd toute précision et que les surfaces se
  // mettent à clignoter.
  camera.near = Math.max(0.02, 0.02 * scale);
  // Le plan lointain, lui, est FIXE et va au-delà du brouillard : s'il suivait
  // l'échelle, un joueur rapetissé verrait le décor lointain se faire trancher
  // net au lieu de se fondre dans le papier.
  camera.far = 460;
  camera.updateProjectionMatrix();

  const [value, sub] = SCALE_LABELS[level] ?? [`×${scale}`, ''];
  scaleValue.textContent = value;
  scaleSub.textContent = sub;
}

applyScale(true);

// --- Ambiance par région --------------------------------------------------------
/**
 * Le ciel et le brouillard de la région où se trouve un point donné.
 *
 * Appelé pour la caméra du joueur, mais AUSSI pour chaque caméra virtuelle de
 * portail : c'est ce qui fait qu'on aperçoit les couleurs de l'autre monde à
 * travers la porte, avant même de la franchir.
 */
const fogRef = scene.fog as THREE.Fog;
const papierParDefaut = PAPER.clone();

/**
 * LE CIEL SE GRISE COMME LE RESTE, et ça règle un défaut qu'on voyait sans
 * savoir le nommer.
 *
 * Le papier — donc le ciel et le brouillard — changeait franchement d'une
 * région à l'autre : on descendait l'escalier et l'on passait d'un bleu froid à
 * une crème chaude en trois pas. C'était brutal, et surtout ça n'avait aucun
 * sens à ce moment du jeu.
 *
 * Désaturé avec le décor, le problème s'évanouit tout seul : au départ, le
 * village et l'étage sont le MÊME lavis gris, et l'escalier ne fait plus
 * basculer quoi que ce soit. Les deux papiers ne se distinguent qu'une fois
 * leurs couleurs rapportées — c'est-à-dire quand le joueur a compris pourquoi.
 */
const teinteSansCouleur = new THREE.Color();

function applyAmbience(p: THREE.Vector3): void {
  let paper = papierParDefaut;
  let couleur = 1;
  for (const r of LEVEL.regions ?? []) {
    if (
      p.x >= r.min[0] && p.x <= r.max[0] &&
      p.y >= r.min[1] && p.y <= r.max[1] &&
      p.z >= r.min[2] && p.z <= r.max[2]
    ) {
      paper = new THREE.Color(r.paper);
      // On suit le pigment de la région AU MÊME RYTHME que ses aplats : c'est
      // le premier matériau de la région qui fait foi, ce qui garantit que le
      // ciel et le sol se repeignent ensemble, jamais l'un après l'autre.
      const mats = worldView.parRegion.get(r.name);
      const u = mats?.[0]?.uniforms.uCouleur;
      if (u) couleur = u.value as number;
      break;
    }
  }
  if (couleur < 0.999) {
    const gris = paper.r * 0.299 + paper.g * 0.587 + paper.b * 0.114;
    teinteSansCouleur.setRGB(gris, gris, gris);
    paper.lerp(teinteSansCouleur, 1 - couleur);
  }
  (scene.background as THREE.Color).copy(paper);
  fogRef.color.copy(paper);
}

// --- Redimensionnement ---------------------------------------------------------
function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  portals.resize(w, h);
  paper.resize(w, h);
  inkUniforms.uResolution.value.set(w, h);
}
window.addEventListener('resize', resize);
// Sur téléphone, la barre d'adresse se replie en cours de partie et la rotation
// change tout : deux événements que `resize` seul ne couvre pas partout.
window.addEventListener('orientationchange', () => setTimeout(resize, 120));
window.visualViewport?.addEventListener('resize', resize);
resize();

// --- Boucle -------------------------------------------------------------------
let last = performance.now();
let accumulator = 0;
let boilTimer = 0;
let fpsFrames = 0;
let fpsSince = performance.now();
const BOIL_PERIOD = 1 / BOIL_HZ;

function frame(now: number): void {
  requestAnimationFrame(frame);

  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;

  // --- Simulation à pas fixe --------------------------------------------------
  accumulator += dt;
  let guard = 0;
  while (accumulator >= TICK_DT && guard++ < 8) {
    const raw = input.sample();
    // Souris relâchée : on garde l'orientation mais on coupe les déplacements.
    const command = input.locked ? raw : { ...raw, forward: 0, strafe: 0, jump: false };
    const avantY = sim.player.position.y;
    const events = sim.step(command, TICK_DT);
    accumulator -= TICK_DT;

    // ─── LE LISSAGE DES MARCHES ─────────────────────────────────────────────
    //
    // Monter une marche TÉLÉPORTE le joueur vers le haut. Ce n'est pas un
    // défaut de la physique : elle soulève le corps de la hauteur d'enjambée,
    // vérifie qu'il passe, puis le repose — c'est net, stable, et c'est ce
    // qu'on veut d'un moteur. Mais l'œil, lui, fait un bond, et l'on monte un
    // escalier par saccades.
    //
    // On NE TOUCHE DONC PAS À LA SIMULATION — la corriger reviendrait à rendre
    // instable quelque chose qui marche. On retarde seulement le REGARD : au
    // moment du bond, l'œil garde son ancienne hauteur, puis rattrape le corps
    // en un dixième de seconde. Le personnage a déjà monté, le joueur le voit
    // monter. C'est ce que font tous les jeux à la première personne, et c'est
    // invisible tant qu'on ne l'a pas enlevé.
    if (!events.traversed && sim.player.grounded) {
      const montee = sim.player.position.y - avantY;
      // Borné à l'enjambée : au-delà, ce n'est plus une marche mais un
      // ascenseur, une chute rattrapée ou une téléportation, et retarder le
      // regard n'aurait aucun sens.
      const marcheMax = PLAYER_HEIGHT * 0.5 * scaleOfLevel(sim.player.scaleLevel);
      if (montee > 0.01 && montee <= marcheMax * 1.05) {
        lissageMarche = Math.max(-marcheMax, lissageMarche - montee);
      }
    }

    if (events.traversed) {
      ambiance.portail();
      // Le portail a fait pivoter le regard : on recale la souris dessus,
      // sinon le prochain mouvement annulerait la rotation.
      input.setYaw(sim.player.yaw);
      applyScale();
    }
    if (events.refused) {
      flash(
        events.refused.reason === 'tooBig'
          ? 'Trop grand pour cette porte. Il faudrait rapetisser.'
          : 'Le portail refuse : échelle extrême atteinte.',
      );
    }
    if (events.carry && !events.carry.taken) ambiance.caisse();
    if (events.socketFilled) ambiance.caisse();
    if (events.carry) {
      // Ramasser, c'est s'approprier : à partir de maintenant, c'est moi qui
      // publie cette caisse, et l'autre joueur suit ce que j'en fais.
      if (events.carry.taken) caisses.reclamer(events.carry.id);

      flash(events.carry.taken ? 'Caisse en main. E pour la reposer.' : 'Caisse reposée.', 1.6);
    }
    // LE SACRE. L'encrier se pose sur la pointe de l'Aiguille, et le monde
    // répond. C'est la seule fin du jeu, et la seule fois où l'on retire au
    // joueur la maîtrise de sa caméra — quatorze secondes, pour lui montrer
    // d'où il vient.
    // POSER UNE COULEUR SUR SON SOCLE LA REND AU MONDE. Le geste et son effet
    // sont au même endroit : on lâche l'objet, et la moitié du monde qui
    // l'attendait se repeint sous nos yeux. On avait d'abord donné la couleur
    // au RAMASSAGE, et c'était moins bien — le joueur voyait le monde changer
    // en tournant le dos à ce qu'il venait de faire.
    const PIGMENT_DE_SOCLE: Record<string, string> = {
      'socle-vert': 'vert',
      'socle-rouge': 'rouge',
    };
    const pigment = events.socketFilled
      ? PIGMENT_DE_SOCLE[events.socketFilled.socketId]
      : undefined;

    if (pigment && pigments.rendre(pigment, worldView.parRegion, pigmentDe)) {
      ambiance.progression(pigments.nombre, 3);
      const reste = Object.keys(PIGMENT_DE_SOCLE).length - pigments.nombre;
      flash(
        reste > 0
          ? `Le ${pigment} revient au monde. Regarde autour de toi. Il en manque ${reste}.`
          : 'La dernière couleur est rendue. Le monde est entier.',
        7,
      );
      // LA FIN : le monde a retrouvé toutes ses couleurs. C'est la seule chose
      // qu'on lui demandait, et c'est le seul moment où l'on retire au joueur
      // la maîtrise de sa caméra — pour lui montrer ce qu'il vient de repeindre.
      if (reste === 0) {
        sacre.jouer([0, 60, 0], camera.position);
        ambiance.retrouvaille();
        document.exitPointerLock();
      }
    } else if (events.socketFilled) {
      flash(
        sim.sockets.allFilled
          ? 'Tous les logements sont pourvus.'
          : `Emboîté. ${sim.sockets.filled} sur ${sim.sockets.total}.`,
        2.4,
      );
    }
    if (events.tooHeavy) {
      flash('Bien trop grosse à cette taille. Il faudrait grandir.', 2.6);
    }
    if (events.seuil) {
      franchirSeuil(events.seuil.mode);
    }
    if (events.reachedGoal) {
      suiteEl.setAttribute('href', NIVEAU_SUIVANT[MODE!] ?? './');
      suiteEl.textContent = MODE === 'caisse' ? 'retour au hall' : 'niveau suivant';
      winPanel.classList.add('show');
      // On rend la souris, sinon le lien du panneau est inatteignable.
      document.exitPointerLock();
    }
  }

  // --- Caméra -----------------------------------------------------------------
  // Pendant le sacre, elle ne suit plus le joueur : elle prend du recul autour
  // de l'Aiguille et redescend vers le village. Tout le reste du jeu continue
  // de tourner derrière — le vent, les feuilles, les portails.
  // Le retard de l'œil se résorbe en un dixième de seconde, proportionnellement
  // à la taille du joueur : un géant monte de grandes marches, et le rattrapage
  // doit se sentir pareil à toutes les échelles.
  if (lissageMarche < 0) {
    lissageMarche = Math.min(0, lissageMarche + dt * 9 * sim.scale);
  }

  if (!sacre.update(dt, camera)) {
    const eye = sim.eyePosition();
    camera.position.set(eye.x, eye.y + lissageMarche, eye.z);
    camera.rotation.set(sim.player.pitch, sim.player.yaw + Math.PI, 0);
  }

  // --- Grain « dessiné », figé à 10 Hz ----------------------------------------
  boilTimer += dt;
  if (boilTimer >= BOIL_PERIOD) {
    boilTimer %= BOIL_PERIOD;
    inkUniforms.uSeed.value = Math.random() * 512;
  }
  inkUniforms.uTime.value += dt;
  for (const m of worldView.materials) syncInkUniforms(m);
  const scale = scaleOfLevel(sim.player.scaleLevel);

  // --- Son ---------------------------------------------------------------------
  // Le pas est déclenché par la DISTANCE parcourue, pas par une minuterie : on
  // entend donc une foulée par pas réel, et la cadence suit naturellement la
  // vitesse — marche, course, et toutes les tailles.
  ambiance.setEchelle(scale);
  if (sim.player.grounded) {
    const parcouru = Math.hypot(sim.player.velocity.x, sim.player.velocity.z) * dt;
    stepPhase += parcouru / (scale * PLAYER_HEIGHT);
    if (stepPhase >= 0.55) {
      stepPhase = 0;
      ambiance.pas();
    }
  }
  ambiance.update(dt);

  avatar.update(sim.player, scale, dt);
  avatar.syncInk();
  carryableViews.update(sim.carryables.items, sim.faces);
  carryableViews.syncInk();
  socketViews.update(sim.sockets.items, dt, inkUniforms.uTime.value);
  socketViews.syncInk();
  brush.update(sim.player, scale, dt, camera);

  // Le pinceau a-t-il atteint le jalon planté devant la porte vierge ?
  if (MODE === 'monde' && sim.portesFermees.has(PORTE_A_DESSINER) && !tracage.enCours) {
    const d = brush.destination;
    if (
      d &&
      Math.hypot(d.x - JALON_PORTE[0], d.y - JALON_PORTE[1], d.z - JALON_PORTE[2]) < 1 &&
      Math.hypot(
        sim.player.position.x - JALON_PORTE[0],
        sim.player.position.z - JALON_PORTE[2],
      ) <
        14 * scale
    ) {
      tracage.commencer(PORTE_A_DESSINER);
      flash('Le pinceau se met à écrire. Regarde la porte.', 4);
    }
  }

  const trace = tracage.update(
    dt,
    () => ambiance.tache(coupsPoses++),
    (paire) => {
      sim.portesFermees.delete(paire);
      ambiance.progression(1, 2);
      flash('La porte est dessinée. Elle s’ouvre.', 5);
    },
  );
  if (trace !== null) portals.tracer(tracage.pairEnCours ?? PORTE_A_DESSINER, trace);
  feuilles.update(dt, camera, scale);
  pigments.update(dt);
  if (talisman.enCours) talisman.update(dt, camera.position);
  feuilles.syncInk();

  // --- Les autres joueurs -----------------------------------------------------
  if (presenceActive) {
    // La vitesse est transmise en tailles de corps par seconde : le destinataire
    // peut alors animer la démarche sans rien savoir de l'échelle de l'émetteur.
    const speedInBodies =
      Math.hypot(sim.player.velocity.x, sim.player.velocity.z) / (scale * PLAYER_HEIGHT);
    // On renseigne ses caisses AVANT de publier : sans quoi le paquet partirait
    // avec l'état de l'image précédente, et une caisse posée arriverait chez
    // l'autre un dixième de seconde en retard sur le bruit qu'elle fait.
    if (EN_DUO) caisses.brancher(presence, sim.carryables);
    presence.publish(sim.player, dt, speedInBodies);

    // Le hall et le duo partagent le même chemin dans la base — c'est ce qui
    // évite d'avoir à republier des règles d'accès. On trie donc à l'arrivée :
    // dans le hall on ignore ceux qui sont partis jouer, et en duo on ne
    // regarde que son partenaire.
    const tous = presence.getPeers();
    const visibles = new Map<string, RemoteSnapshot>();
    for (const [uid, p] of tous) {
      if (EN_DUO ? p.salon === SALON : !p.salon) visibles.set(uid, p);
    }
    remotePlayers.sync(visibles);

    if (EN_DUO) {
      caisses.appliquer(visibles, sim.carryables);
      surveillerRetrouvailles(visibles);
    }

    // --- Le rendez-vous à deux ------------------------------------------------
    if (attenteDuo.actif && !transitionEnCours) {
      const salon = attenteDuo.update(presence);
      if (salon) {
        transitionEnCours = true;
        flash('Quelqu’un a passé la même arche. On y va.', 3);
        // Une seconde avant de basculer : sans elle, le message n'a pas le
        // temps d'être lu et le départ paraît être un plantage.
        const role = roleDansSalon(salon, presence.uid);
        window.setTimeout(() => {
          location.search =
            `?niveau=duo&salon=${encodeURIComponent(salon)}&role=${role}`;
        }, 1000);
      } else {
        const autres = attenteDuo.compagnons(presence);
        flash(
          autres === 0
            ? `En attente d’un second joueur — ${attenteDuo.secondes.toFixed(0)} s. ` +
                'Joue avec les portails en attendant.'
            : `${autres} autre(s) sous l’arche — ça vient.`,
          0.5,
        );
      }
    }
    peersBox.textContent =
      remotePlayers.count === 0
        ? 'seul dans le hall'
        : remotePlayers.count === 1
          ? '1 autre joueur'
          : `${remotePlayers.count} autres joueurs`;
  }
  remotePlayers.update(dt);
  remotePlayers.syncInk();
  // Les surfaces de portail ne reçoivent PAS le grain : il est appliqué une
  // seule fois sur l'image finale, sinon le portail vibre comme un calque à part.

  // --- Objectif ---------------------------------------------------------------
  const ring = goalMarker.userData.ring as THREE.Mesh;
  ring.rotation.z += dt * 0.7;
  const pulse = 1 + Math.sin(inkUniforms.uTime.value * 2.2) * 0.07;
  goalMarker.scale.setScalar(pulse);

  // --- Cadence ----------------------------------------------------------------
  // Affichée en clair : c'est la seule mesure qui dise si le rendu tient sur un
  // appareil donné, et elle vaut mieux qu'une impression.
  fpsFrames++;
  if (now - fpsSince >= 700) {
    fpsBox.textContent = `${Math.round((fpsFrames * 1000) / (now - fpsSince))} images/s`;
    fpsFrames = 0;
    fpsSince = now;
  }

  // --- Indices ----------------------------------------------------------------
  updateHints(now);

  // --- Rendu ------------------------------------------------------------------
  camera.updateMatrixWorld(true);
  // À faire AVANT le rendu des vues : la surface doit déjà être écartée quand
  // les caméras virtuelles travaillent.
  portals.updateSurfaceOffsets(camera);
  applyAmbience(camera.position);

  // Bonhomme entier dans les vues de portail — sinon on s'y verrait décapité.
  avatar.setHeadVisible(true);
  portals.renderViews(renderer, scene, camera, applyAmbience);

  // Mais pas de tête dans la vue principale : elle est pile dans la caméra.
  // Le buste et les jambes, eux, restent visibles quand on baisse les yeux.
  //
  // Sauf pendant le sacre : la caméra est à trois cents mètres de là, et un
  // personnage décapité au milieu du plan de fin serait une belle sortie.
  avatar.setHeadVisible(sacre.actif);
  // Retour à l'ambiance de là où l'on se tient réellement.
  applyAmbience(camera.position);
  renderer.setRenderTarget(paper.target);
  renderer.clear();
  renderer.render(scene, camera);
  paper.render(renderer);
}

/**
 * Trappe de débogage : permet de se poser n'importe où, à n'importe quelle
 * échelle, depuis la console. Indispensable pour inspecter un portail sans
 * avoir à rejouer tout le niveau.
 *
 *   __game.tp(14, -11.8, 0, 0)   // fond du puits, taille normale
 */
(window as unknown as Record<string, unknown>).__game = {
  sim,
  camera,
  portals,
  avatar,
  brush,
  /** Fait venir le Pinceau tout de suite, sans attendre d'être perdu. */
  pinceau() {
    brush.summon();
    return 'le pinceau arrive';
  },
  presence,
  remotePlayers,
  get presenceActive() {
    return presenceActive;
  },
  /** Éprouve la liaison Firebase de bout en bout. Voir src/net/connection.ts. */
  async testReseau() {
    const { testConnection } = await import('./net/connection.js');
    const r = await testConnection();
    console.table(r);
    return r;
  },
  /**
   * Pose un second bonhomme, figé, à un endroit donné. Sert à juger l'allure du
   * personnage de face — et à préfigurer ce que donnera le multijoueur.
   */
  dummy(x: number, y: number, z: number, color = 0x8a4b6b, yaw = 0) {
    const other = new Avatar(color);
    other.update(
      {
        position: { x, y, z },
        velocity: { x: 0, y: 0, z: 0 },
        yaw,
        pitch: 0,
        scaleLevel: 0,
        grounded: true,
      },
      1,
      0,
    );
    scene.add(other.group);
    return other;
  },
  tp(
    x: number,
    y: number,
    z: number,
    level = sim.player.scaleLevel,
    yaw?: number,
    pitch?: number,
  ) {
    sim.player.position = { x, y, z };
    sim.player.velocity = { x: 0, y: 0, z: 0 };
    sim.player.scaleLevel = level;
    if (yaw !== undefined) {
      sim.player.yaw = yaw;
      input.setYaw(yaw);
    }
    if (pitch !== undefined) {
      sim.player.pitch = pitch;
      input.setPitch(pitch);
    }
    applyScale(true);
  },
};

function updateHints(now: number): void {
  if (now < flashUntil) return;
  if (sim.goalReached) {
    setHint('');
    return;
  }
  const p = sim.player.position;
  let found = '';
  for (const h of LEVEL.hints ?? []) {
    const dx = p.x - h.position[0];
    const dy = p.y - h.position[1];
    const dz = p.z - h.position[2];
    if (dx * dx + dy * dy + dz * dz < h.radius * h.radius) {
      found = h.text;
      break;
    }
  }
  setHint(found);
}

requestAnimationFrame(frame);
