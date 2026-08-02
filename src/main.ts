import * as THREE from 'three';
import { PLAYER_HEIGHT, TICK_DT, scaleOfLevel } from './core/constants.js';
import { Simulation } from './core/simulation.js';
import { InputManager } from './input/input.js';
import { LEVEL_01 } from './levels/level01.js';
import { LEVEL_02 } from './levels/level02.js';
import { DALLE_GEANT, DALLE_MINUSCULE, RAYON_DALLE, construireDuo, roleDansSalon, type RoleDuo } from './levels/duo.js';
import { LOBBY } from './levels/lobby.js';
import { MONDE } from './levels/monde.js';
import { DESCENTE } from './levels/descente.js';
import { reve } from './levels/reve.js';
import { Ambiance } from './audio/ambiance.js';
import { retrouvailles, type Dalle } from './core/retrouvailles.js';
import { Cinematique } from './render/cinematique.js';
import { Talisman } from './render/talisman.js';
import { Pigments, clePigments } from './render/pigments.js';
import { REPERES_DESCENTE, REPERES_MONDE, changeDeMonde } from './debug/reperes.js';
import { PinceauPeintre } from './render/pinceauPeintre.js';
import { SceauFinal } from './render/sceauFinal.js';
import { Tracage } from './render/tracage.js';
import { Tableaux } from './render/tableaux.js';
import { CanevasView } from './render/canevasView.js';
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
  descente: () => DESCENTE,
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
  monde: '?niveau=descente',
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
/** Portée du brouillard par défaut. Une région peut la rapprocher — voir RegionDef. */
const BROUILLARD_LOIN = 300;
scene.fog = new THREE.Fog(PAPER.clone(), 34, BROUILLARD_LOIN);

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
// ─── ENTRER DANS L'AVENTURE, C'EST REPARTIR DU LAVIS ────────────────────────
//
// Les couleurs rapportées étaient gardées d'une partie à l'autre. Ça paraissait
// juste — rendre une couleur au monde est un acquis, pas un état de session —
// et c'était faux pour ce jeu-ci.
//
// Signalé en jouant : on entre dans le monde, les deux pinceaux sont DÉJÀ posés
// sur leurs stèles, tout est en couleur, et il n'y a plus rien à aller
// chercher. La première minute d'un jeu dont le sujet est de rendre ses
// couleurs à un monde gris ne peut pas être un monde déjà peint.
//
// Une mémoire n'a de sens que s'il existe un moyen de choisir où reprendre. Le
// jour où il y aura un menu de niveaux, elle en aura un ; aujourd'hui elle n'a
// qu'un effet, et c'est de gâcher l'entrée. On efface donc à chaque arrivée.
//
// Le mode débug garde la sienne : il écrit dans sa propre case (voir
// `src/render/pigments.ts`) et il en a besoin pour se poser au milieu du
// voyage.
if (PARAMS.get('neuf') || (MODE === 'monde' && !PARAMS.get('debug'))) {
  pigments.effacer();
}
const pigmentDe = new Map<string, string>();
for (const r of LEVEL.regions ?? []) if (r.pigment) pigmentDe.set(r.name, r.pigment);
/**
 * L'ACCENT D'UNE RÉGION peut appartenir à un autre pinceau que son corps.
 * C'est ce qui donne au vert la MATIÈRE du monde et au rouge ses ÉCLATS —
 * lesquels courent partout, y compris sous les pieds du joueur.
 */
const pigmentAccentDe = new Map<string, string>();
for (const r of LEVEL.regions ?? []) {
  if (r.pigmentAccent) pigmentAccentDe.set(r.name, r.pigmentAccent);
}
/** Boîte de chaque région : dit au front d'encre jusqu'où il doit courir. */
const bornesDeRegion = new Map<string, { min: [number, number, number]; max: [number, number, number] }>();
for (const r of LEVEL.regions ?? []) bornesDeRegion.set(r.name, { min: r.min, max: r.max });
pigments.appliquer(worldView.parRegion, pigmentDe, pigmentAccentDe);

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
// Les socles suivent le monde : gris tant qu'il l'est, et ils reprennent leur
// vermillon en même temps que lui. Un socle vide ne porte aucune couleur.
if (pigmentDe.size > 0) socketViews.setCouleur(pigments.nombre / 2);

// ─── LES PINCEAUX DE COULEUR ────────────────────────────────────────────────
//
// Un par socle. Il jaillit de l'objet qu'on vient d'y poser, part balayer le
// monde — et c'est PENDANT son vol que la teinte remonte —, puis revient
// flotter au-dessus de son socle et y reste.
//
// La couleur revenait toute seule, en fondu. Ça marchait, et ça ne racontait
// rien : un monde qui se repeint sans personne pour le peindre est un réglage,
// pas une scène. La galerie devient du même coup une collection — à mesure
// qu'on rapporte des couleurs, la place se peuple de pinceaux qui flottent
// au-dessus de leurs socles. C'est la jauge de progression du jeu, et elle est
// faite de personnages plutôt que de chiffres.
const tmpOeil = new THREE.Vector3();
const peintres = new Map<string, PinceauPeintre>();
/** Combien de couleurs le monde attend en tout. Voir AUX_SOCLES. */
let AUX_SOCLES_TOTAL = 0;
/** Celui qui est en train de peindre. Le front d'encre le suit. */
let peintreEnCours: PinceauPeintre | null = null;

/**
 * LES FAMILLES QU'ON EST EN TRAIN DE PEINDRE, une par une.
 *
 * Sept objets qui basculeraient au même instant se liraient comme un
 * interrupteur. Sept objets peints l'un après l'autre par quelqu'un qui
 * traverse la pièce disent ce qu'est une famille sans qu'un mot ait été
 * prononcé — et le délai empêche de marteler la touche, donc de résoudre par
 * tâtonnement au lieu de raisonner.
 */
const DUREE_TOUCHE = 0.22;
interface CoupDePinceau {
  materiaux: THREE.ShaderMaterial[];
  teinte: THREE.Color;
  reste: number;
}
const coupsEnCours: CoupDePinceau[] = [];

/** Pose la teinte d'une famille, après le petit délai qui la fait voir. */
const peindreFamille = (famille: string, pigment: string): void => {
  const mats = worldView.parFamille.get(famille);
  const teinte = TEINTE_DU_PIGMENT[pigment];
  if (!mats || !teinte) return;
  coupsEnCours.push({
    materiaux: mats,
    teinte: new THREE.Color(teinte),
    reste: DUREE_TOUCHE,
  });
};
/** Quel veilleur correspond à quel pinceau. */
/**
 * Vers où lever les yeux quand une couleur revient. Voir l'usage, plus bas :
 * chaque pinceau repeint une moitié du monde qui n'est pas celle où l'on se
 * tient, et sans un mot le geste se joue derrière la tête du joueur.
 */
const OU_REGARDER: Record<string, string> = {
  rouge: 'Il rend au monde ses éclats.',
  vert: 'Il rend au monde sa matière.',
};

const PINCEAU_DE_VEILLEUR = new Map<string, string>([
  ['pinceau-vert', 'socle-vert'],
  ['pinceau-rouge', 'socle-rouge'],
]);
/**
 * LE MONDE OÙ L'ON RENTRE. C'est là que les pinceaux se mettent au travail,
 * quelle que soit la partie du monde qu'ils repeignent.
 *
 * Ils attendaient d'être dans la région qu'ils repeignent, et c'était faux : le
 * pinceau rouge repeint les hauteurs, donc il patientait jusqu'à ce qu'on monte
 * sur la terrasse. On le ramenait, on traversait tout le village, il ne se
 * passait rien — puis la couleur arrivait dix minutes plus tard, sans rapport
 * apparent avec ce qu'on venait de faire.
 *
 * Ils peignent maintenant dès qu'on remet les pieds au village, qui est le
 * foyer. On voit la terrasse se colorer au-dessus de soi, ce qui est d'ailleurs
 * plus beau que d'être dedans quand ça arrive.
 */
const REGION_MAISON = '';

/**
 * LA TEINTE DE CHAQUE PIGMENT, quand une fée la pose sur une famille.
 *
 * Ce sont les mêmes couleurs que les corps des pinceaux : ce qu'on voit voler
 * et ce qui se dépose sont la même encre, sinon le geste ne se lirait pas.
 */
const TEINTE_DU_PIGMENT: Record<string, string> = {
  rouge: '#c8492e',
  vert: '#4c7a3f',
  bleu: '#2f6a8c',
  or: '#c99a3c',
};
if (MODE === 'monde') {
  // Chaque pinceau : son socle de repos, sa couleur, ET l'endroit de son monde
  // où il dort, planté, en attendant qu'on vienne le prendre. La taille dont il
  // y est planté est celle du joueur qui l'y trouvera.
  // ─── LES TAILLES RACONTENT LE VOYAGE ──────────────────────────────────────
  //
  // Chaque pinceau dort à la taille de SON monde, et revient à la taille que la
  // porte lui donne. C'est la même loi que pour tout le reste ici : ce qui
  // traverse une porte est multiplié ou divisé par quatre.
  //
  //   Le VERT dort à 0,55 dans un jardin qu'on parcourt à ×1. On en ressort par
  //   la petite face, donc quatre fois plus grand : il arrive à 2,20 et occupe
  //   le grand socle.
  //
  //   Le ROUGE dort à 2,20 sur une côte qu'on parcourt à ×4. On en ressort par
  //   la grande face, donc quatre fois plus petit : il arrive à 0,55 et occupe
  //   le petit socle.
  //
  // Les deux socles, plantés vides sur la place dès la première minute,
  // annonçaient cet écart avant qu'on ait fait un seul voyage. Ils étaient
  // faux jusqu'ici — les deux pinceaux s'y posaient à la même taille, et l'on
  // perdait toute l'histoire que leur écart racontait.
  //
  // OÙ IL DORT N'EST PAS ÉCRIT ICI. Ça l'a été, et ça a coûté une partie
  // injouable : j'ai déplacé le veilleur vert au sommet du tas de feuilles sans
  // déplacer le pinceau qu'on voit, resté planté vingt mètres plus bas. On
  // marchait jusqu'à lui, on appuyait sur E, et il ne se passait RIEN — pas
  // même un refus, puisqu'on était hors de portée de la seule chose qui écoute.
  //
  // La position vient donc du veilleur lui-même (`src/core/types.ts`), qui est
  // ce que la simulation écoute. Deux tables parallèles finissent toujours par
  // diverger ; une seule ne le peut pas.
  const AUX_SOCLES: [string, string, [number, number, number], string, number, number][] = [
    ['socle-vert', 'vert', [-16, 1.5, -6], '#4c7a3f', 0.55, 2.2],
    ['socle-rouge', 'rouge', [-3.5, 0.9, -17.5], '#c8492e', 2.2, 0.55],
  ];
  /** Le veilleur qui correspond à un socle : l'inverse de PINCEAU_DE_VEILLEUR. */
  const veilleurDuSocle = new Map<string, [number, number, number]>();
  for (const v of LEVEL.veilleurs ?? []) {
    const socle = PINCEAU_DE_VEILLEUR.get(v.id);
    if (socle) veilleurDuSocle.set(socle, v.position);
  }
  AUX_SOCLES_TOTAL = AUX_SOCLES.length;
  for (const [socle, pigment, ou, teinte, tailleDort, tailleRepos] of AUX_SOCLES) {
    const dort = veilleurDuSocle.get(socle);
    if (!dort) continue;
    const p = new PinceauPeintre(ou, teinte, tailleRepos);
    // Il dort dans son monde, bien visible, à la taille de qui viendra le
    // chercher. Le cube qui porte la physique, lui, est masqué : on ramassait
    // un cube rouge POUR OBTENIR un pinceau rouge, deux objets pour une idée.
    if (!pigments.a(pigment)) p.planter(dort, tailleDort);
    p.onPeint = () => {
      // L'ENCRE PART DE LUI. C'est toute la différence entre voir une couleur
      // apparaître et voir quelqu'un la poser : le front s'ouvre à l'endroit
      // exact où le pinceau donne son coup, puis le suit image par image.
      pigments.rendre(pigment, worldView.parRegion, pigmentDe, pigmentAccentDe, p.group.position, bornesDeRegion);
      peintreEnCours = p;
      socketViews.setCouleur(pigments.nombre / 2);
      portals.setCouleurCadres(pigments.nombre / 2);
      ambiance.progression(pigments.nombre, 3);

      // ON DIT OÙ REGARDER, et ce n'est pas un détail d'interface.
      //
      // Chaque pinceau repeint SA moitié du monde, et ce n'est pas celle où l'on
      // se tient : le rouge prend les hauteurs, le vert le village. On revenait
      // donc du monde rouge, on rendait sa couleur, on regardait droit devant
      // soi — et rien ne changeait, parce que tout se passait au-dessus et
      // derrière. Le plus beau moment du jeu se jouait hors champ.
      const reste = AUX_SOCLES.length - pigments.nombre;
      flash(
        reste > 0
          ? `Le ${pigment} revient au monde. ${OU_REGARDER[pigment] ?? 'Regarde-le peindre.'} Il en manque ${reste}.`
          : `${OU_REGARDER[pigment] ?? ''} Le monde est entier. Il reste à porter l'encre à la pointe.`,
        7,
      );

      // ON NE GAGNE PAS EN RENDANT LA DERNIÈRE COULEUR.
      //
      // Le plan de fin partait ici, c'est-à-dire à l'instant où l'on franchissait
      // une porte, au ras du sol, sans avoir rien gravi — et il arrivait par
      // surprise pendant qu'on regardait le pinceau peindre, en écrasant le seul
      // geste qu'on était venu voir.
      //
      // Rendre les couleurs et ACHEVER LE VOYAGE sont deux choses. Le monde a
      // retrouvé sa palette ; il reste à porter l'encre là-haut. La suite se
      // joue à la pointe de l'Aiguille (voir `events.reachedGoal`).
    };
    // Déjà rapporté dans une partie précédente : il flotte, sans refaire la fête.
    if (pigments.a(pigment)) p.poserDejaAcquis();
    peintres.set(socle, p);
    scene.add(p.group);
  }
}

// Les cadres accrochés aux murs des ateliers. Leur image est prise une seule
// fois, juste après la construction du monde : c'est un vrai rendu de la scène
// avec les familles déjà peintes, donc le tableau ne peut pas mentir sur ce
// qu'il montre — et il ne coûte rien par image.
const tableaux = new Tableaux(LEVEL.tableaux);
scene.add(tableaux.group);

// Les toiles sur lesquelles on dessine. Voir `src/core/canevas.ts` : le trait
// fait la POINTE, donc un géant qui ramasse un petit stylo trace un fil.
const canevas = new CanevasView(LEVEL.canevas);
scene.add(canevas.group);
/** A-t-on tracé pendant ce pas ? Sert à couper le trait quand on relâche. */
let aTrace = false;

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
const brush = new Brush(
  LEVEL.guide,
  LEVEL.guideEchelle,
  LEVEL.guidePorte,
  // On lui donne les faces telles que la simulation les a construites : même
  // source de vérité que la traversée du joueur, donc il entre exactement là où
  // le joueur entrera.
  sim.faces.map((f) => ({
    pairId: f.pairId,
    kind: f.kind,
    position: new THREE.Vector3(f.position.x, f.position.y, f.position.z),
    hauteur: f.height,
    normale: new THREE.Vector3(f.normal.x, f.normal.y, f.normal.z),
  })),
);
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
/** L'encrier qui vient se poser sur la pointe, quand les couleurs sont rendues. */
const sceau = new SceauFinal([0, 114.2, 0]);
if (MODE === 'monde') scene.add(sceau.group);
let coupsPoses = 0;

// La porte du monde est marquée `dessinee` comme les autres : la simulation
// la scelle elle-même au démarrage. La ligne qui le faisait à la main a disparu,
// et c'est elle qui masquait le défaut — la descente, elle, n'avait personne.

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
// Les cadres des portails se grisent avec le reste : dans ce monde, la couleur
// est ce qu'on rapporte, jamais ce qui est déjà là.
if (pigmentDe.size > 0) portals.setCouleurCadres(pigments.nombre / 2);

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
/** Vrai pendant le plan de fin, où l'on voit beaucoup plus loin que d'habitude. */
let sacreLarge = false;

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

// ─── LA CARTE DE TITRE DIT OÙ L'ON EN EST ───────────────────────────────────
//
// Les cinq pinceaux du dessin étaient décoratifs : l'un encré, les autres gris,
// toujours les mêmes. Ils disent maintenant la vérité — un pinceau est encré si
// et seulement si l'on a rapporté sa couleur.
//
// C'est la seule chose qu'on doive à quelqu'un qui revient : voir en une image
// où il en était. Et c'est aussi ce qui explique, avant même d'entrer, pourquoi
// le monde qu'il va retrouver n'est plus tout à fait gris.
{
  const acquis = new Set(Pigments.lire());
  for (const brosse of document.querySelectorAll<SVGElement>('#pinceaux svg')) {
    const pigment = brosse.dataset.pigment;
    brosse.classList.toggle('encre', pigment !== undefined && acquis.has(pigment));
  }

}

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

// ─── LE SON REPART QUAND ON REVIENT DANS L'APPLICATION ──────────────────────
//
// Signalé sur iPhone : on quitte le jeu, on y revient, et le son ne repart pas —
// parfois. Mettre une page en arrière-plan SUSPEND son AudioContext sur mobile,
// et rien ne le réveille de soi-même : le graphe est intact, les horloges
// avancent, et plus un son ne sort.
//
// Le « parfois » vient de la durée de l'absence : c'est le pire genre de défaut,
// celui qu'on ne reproduit pas à volonté. On branche donc la reprise sur TOUT ce
// qui ressemble à un retour, et l'appel ne coûte rien si le son tourne déjà.
for (const evenement of ['visibilitychange', 'focus', 'pageshow'] as const) {
  window.addEventListener(evenement, () => {
    if (document.visibilityState === 'visible') ambiance.reprendre();
  });
}
// Et sur le premier contact, parce que sur iOS c'est parfois le seul geste que
// le système accepte comme une vraie reprise.
for (const evenement of ['pointerdown', 'touchstart', 'keydown'] as const) {
  window.addEventListener(evenement, () => ambiance.reprendre(), { passive: true });
}

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

// ─── LES REPÈRES DE MISE AU POINT ───────────────────────────────────
//
// `?debug=1` : une liste des moments qui méritent d'être regardés, et une
// touche par ligne. Voir `src/debug/reperes.ts` pour ce qu'elle contient et
// pourquoi certains sauts rechargent la page.
//
// Rien de tout ça ne s'active en partie normale : le panneau reste `hidden` et
// aucune touche n'est écoutée.
/**
 * Chaque monde a ses repères. Le tableau est choisi une fois pour toutes ici, et
 * tout le panneau suit — ajouter un monde, c'est ajouter une ligne.
 */
const REPERES = MODE === 'descente' ? REPERES_DESCENTE : REPERES_MONDE;

if (PARAMS.get('debug') && (MODE === 'monde' || MODE === 'descente')) {
  const panneau = el('debug');
  panneau.hidden = false;

  /**
   * Y va. Deux chemins, et le second n'est pas un pis-aller : voir l'en-tête de
   * `reperes.ts`. Si l'état des couleurs demandé n'est pas celui qu'on a sous
   * les yeux, on recharge — sinon on regarderait un monde bâtard qu'aucune
   * partie honnête ne produit.
   */
  const allerA = (i: number): void => {
    const r = REPERES[i];
    if (!r) return;

    if (changeDeMonde(r.pigments, Pigments.lire())) {
      try {
        localStorage.setItem(clePigments(), JSON.stringify(r.pigments));
      } catch {
        /* sans mémoire, le repère arrive dans l'état courant : tant pis */
      }
      location.search = `?niveau=${MODE}&debug=1&repere=${i}`;
      return;
    }

    sim.player.position = { x: r.position[0], y: r.position[1], z: r.position[2] };
    sim.player.velocity = { x: 0, y: 0, z: 0 };
    sim.player.scaleLevel = r.echelle;
    sim.player.yaw = r.lacet;
    sim.player.pitch = 0;
    input.setYaw(r.lacet);
    input.setPitch(0);
    applyScale(true);

    // On laisse la physique poser le joueur. Les hauteurs de la liste sont
    // écrites à la main, donc approximatives ; une demi-seconde de chute libre
    // les corrige, et l'on n'arrive jamais les pieds dans le sol ni suspendu.
    const immobile = {
      forward: 0,
      strafe: 0,
      jump: false,
      sprint: false,
      interact: false,
      throwIt: false,
      yaw: r.lacet,
      pitch: 0,
    };
    for (let k = 0; k < 30 && !sim.player.grounded; k++) sim.step(immobile, TICK_DT);

    brush.poser(r.jalon);
    // Le pinceau de couleur déjà réveillé, et pendu à nos basques : c'est ce
    // qui permet de se poser devant la porte du retour et de juger le geste en
    // franchissant, au lieu de refaire le monde entier à chaque essai.
    if (r.eveille && !sim.eveilles.has(r.eveille)) {
      sim.eveilles.add(r.eveille);
      const socle = PINCEAU_DE_VEILLEUR.get(r.eveille);
      const e = sim.eyePosition();
      if (socle) peintres.get(socle)?.reveiller(new THREE.Vector3(e.x, e.y, e.z));
    }
    flash(r.verifier, 9);
    for (const b of panneau.querySelectorAll('button')) b.classList.remove('ici');
    panneau.querySelectorAll('button')[i]?.classList.add('ici');

    if (r.sacre) {
      sceau.declencher();
      sacre.jouer([0, 74, 0], camera.position);
      ambiance.retrouvaille();
      document.exitPointerLock();
    }
  };

  // Les touches sont lues par `code`, donc par POSITION physique : la rangée du
  // haut marche à l'identique en AZERTY, où ces touches produisent & é " ' (.
  const TOUCHES = [
    'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7',
    'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'BracketLeft', 'BracketRight',
  ];
  const LEGENDES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', '[', ']'];

  panneau.innerHTML = '<h3>Repères — ?debug=1</h3>';
  REPERES.forEach((r, i) => {
    const b = document.createElement('button');
    const t = document.createElement('b');
    const k = document.createElement('kbd');
    k.textContent = LEGENDES[i] ?? '·';
    t.append(k, r.titre);
    const s = document.createElement('small');
    s.textContent = r.verifier;
    b.append(t, s);
    b.addEventListener('click', () => {
      allerA(i);
      // Le bouton garde le clavier s'il garde le foyer : la barre d'espace le
      // rejouerait au lieu de faire sauter. Et le clic ayant fait perdre la
      // capture de la souris, on la reprend — un clic EST le geste qu'il faut
      // pour ça, donc c'est le seul endroit où on a le droit de le demander.
      b.blur();
      input.requestLock();
    });
    panneau.appendChild(b);
  });

  // On replie la liste avec H, ou en cliquant son titre. Sur un écran étroit
  // elle couvre la moitié de ce qu'on est venu regarder.
  const replier = (): void => {
    panneau.classList.toggle('replie');
  };
  panneau.querySelector('h3')?.addEventListener('click', replier);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyH') replier();
    const i = TOUCHES.indexOf(e.code);
    if (i >= 0 && i < REPERES.length) allerA(i);
  });

  // Arrivée par rechargement : le saut a été demandé dans la page précédente,
  // et c'est ici qu'il s'achève, une fois le monde rebâti dans le bon état.
  //
  // ON NE MASQUE PAS LA CARTE DE TITRE. J'ai essayé : elle oblige à un clic de
  // plus à chaque saut qui recharge, et l'escamoter paraît donc une politesse.
  // C'en est une jusqu'à ce qu'on veuille bouger — car la capture de la souris
  // ne s'obtient QUE sur un geste de l'utilisateur, et cette carte est le seul
  // endroit où ce geste est attendu. Sans elle : on arrive au bon endroit et
  // l'on ne peut plus faire un pas.
  //
  // Elle s'affiche donc dans sa forme courte, celle d'une reprise.
  const demande = Number(PARAMS.get('repere'));
  if (PARAMS.has('repere') && demande >= 0 && demande < REPERES.length) {
    overlay.classList.add('resumed');
    allerA(demande);
  }
}

// --- Ambiance par région --------------------------------------------------------
/**
 * Le ciel et le brouillard de la région où se trouve un point donné.
 *
 * Appelé pour la caméra du joueur, mais AUSSI pour chaque caméra virtuelle de
 * portail : c'est ce qui fait qu'on aperçoit les couleurs de l'autre monde à
 * travers la porte, avant même de la franchir.
 */
const fogRef = scene.fog as THREE.Fog;
const finPanel = document.getElementById('fin')!;
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
  let portee = BROUILLARD_LOIN;
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
      if (r.brouillard) portee = r.brouillard;
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
  // Le plan de fin ouvre le brouillard en grand : on ne le lui reprend pas.
  if (!sacreLarge) fogRef.far = portee;
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
      // ─── ET LA DESCENTE AUSSI ────────────────────────────────────────────
      //
      // Signalé en jouant : « quand tu montes un escalier la tête monte
      // doucement, mais quand tu le descends ça fait clac clac clac ».
      //
      // C'était exact, et c'est moi qui n'avais traité qu'un sens. En
      // descendant une marche, le corps tombe de la hauteur entière en une
      // image, et l'œil avec lui : on lit une saccade, pas un pas.
      //
      // Le retard est simplement de signe inverse — l'œil reste EN HAUT et
      // redescend, au lieu de rester en bas et de remonter. Une seule
      // constante gouverne les deux, donc monter et descendre ont exactement
      // la même douceur, ce qui est la seule chose qui compte ici.
      if (montee < -0.01 && montee >= -marcheMax * 1.05) {
        lissageMarche = Math.min(marcheMax, lissageMarche - montee);
      }
    }

    if (events.traversed) {
      ambiance.portail();
      // Le portail a fait pivoter le regard : on recale la souris dessus,
      // sinon le prochain mouvement annulerait la rotation.
      input.setYaw(sim.player.yaw);
      applyScale();
      // Le feuillage repart d'ici. Sans ça, dans le hall où les deux faces sont
      // à seize unitès l'une de l'autre, aucune feuille ne sortait du voisinage
      // et l'on abandonnait derrière soi un petit tas de traînées d'encre à
      // l'ancienne échelle, autour de la porte qu'on venait de quitter.
      feuilles.traverser(camera.position, scaleOfLevel(sim.player.scaleLevel));
    }
    // ─── UN REFUS DOIT RACONTER LE MONDE, PAS LE MOTEUR ────────────────────
    //
    // « Échelle extrême atteinte » était du vocabulaire de programme : ça
    // n'apprenait rien, et l'on restait devant une porte manifestement ouverte
    // qui disait non sans raison. Signalé en jouant, à ×1/16 dans le hall, où
    // TOUTES les grandes portes refusent d'un coup.
    //
    // Or la raison est belle et elle était là : à cette taille, il n'y a plus
    // rien de plus petit. La porte ne refuse pas le joueur — elle n'a nulle
    // part où le mener. Il suffisait de le dire.
    if (events.refused) {
      flash(
        events.refused.reason === 'tooBig'
          ? 'Trop grand pour cette porte. Il faudrait rapetisser.'
          : events.refused.versLePetit
            ? 'Plus petit, il n’y a plus rien. Cette porte ne mène nulle part.'
            : 'Plus grand, il n’y a plus rien. Cette porte ne mène nulle part.',
        3.4,
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
    // La couleur ne se rend plus en posant un objet : c'est le PINCEAU qui la
    // rend, en vol, quand on rentre au village avec lui. Voir la boucle des
    // peintres plus bas — ce bloc n'a plus à décider de rien.
    // ─── ON NE COMPTE PAS DANS UN BAC À SABLE ─────────────────────────────
    //
    // « Emboîté. 2 sur 3 » fabrique un score, donc un but, donc une façon de
    // rater — dans la seule salle du jeu qui n'en doit avoir aucun. Un niveau
    // qui déclare un levier de rappel dit précisément qu'il n'y a rien à
    // gagner ; on se tait alors, et le socle qui s'allume suffit.
    if (events.socketFilled && !LEVEL.rappel) {
      flash(`Emboîté. ${sim.sockets.filled} sur ${sim.sockets.total}.`, 2.4);
    }
    if (events.tooHeavy && !LEVEL.rappel) {
      flash('Bien trop grosse à cette taille. Il faudrait grandir.', 2.6);
    }
    if (events.seuil) {
      franchirSeuil(events.seuil.mode);
    }

    // ─── ON RÉVEILLE UN PINCEAU ────────────────────────────────────────────
    //
    // Pas un ramassage : une rencontre. Il s'éveille, se met à tourner autour
    // de nous et ne nous quitte plus jusqu'au retour au village. C'est cette
    // compagnie sur tout le trajet qui donne envie de le ramener, bien plus
    // qu'un objectif affiché.
    if (events.eveil) {
      const socle = PINCEAU_DE_VEILLEUR.get(events.eveil.id);
      const e = sim.eyePosition();
      if (socle) peintres.get(socle)?.reveiller(new THREE.Vector3(e.x, e.y, e.z));
      ambiance.pinceau();
      flash('Il s’éveille, et il te suit. Ramène-le au monde gris.', 6);
    }
    // Et le refus, qui est une leçon et non une panne : il faut ÊTRE de la
    // taille du monde où il dort. On le dit, parce qu'un pinceau qui frémit
    // sans se lever ressemblerait sinon à un bogue.
    if (events.eveilRefuse) {
      flash(
        events.eveilRefuse.trop === 'grand'
          ? 'Il est minuscule entre tes doigts. Il faudrait rapetisser pour le prendre.'
          : 'Il est bien trop grand pour toi. Il faudrait grandir pour le prendre.',
        4,
      );
    }
    // ON A REPRIS LA FEUILLE : la porte qu'elle portait se rescelle, et son
    // dessin s'efface. Le joueur voit son choix se défaire, ce qui est
    // exactement ce qu'il faut — rien à expliquer, et rien d'irréversible.
    if (events.socketVide) {
      for (const paire of LEVEL.portals) {
        if (!paire.dessinee || paire.condition !== events.socketVide.socketId) continue;
        sim.portesFermees.add(paire.id);
        tracage.annuler();
        portals.tracer(paire.id, 0);
      }
    }
    if (events.trace) {
      canevas.tracer(
        events.trace.canevas,
        events.trace.u,
        events.trace.v,
        events.trace.rayon,
        events.trace.encre,
      );
      aTrace = true;
    }
    if (events.effacee) {
      canevas.effacer(events.effacee.canevas);
      ambiance.tache(0);
      flash('La toile est nette.', 3);
    }
    if (events.rappele) {
      ambiance.tache(0);
      flash('Tout est remis en place.', 3);
    }
    if (events.peinte) {
      peindreFamille(events.peinte.famille, events.peinte.pigment);
      ambiance.tache(0);
    }
    // Le refus est une leçon, pas une panne : même seuil que le « trop lourd »,
    // et il enseigne en une seconde que la palette dépend de la taille qu'on a.
    if (events.peintureRefusee) {
      flash('C’est trop grand pour toi. Il faudrait grandir pour le peindre.', 4);
    }
    if (events.tableauSatisfait) {
      ambiance.progression(1, 2);
      flash('La pièce ressemble au tableau.', 5);
    }
    if (events.reachedGoal) {
      // LE SACRE, et c'est ici qu'il appartient : en haut, après l'ascension.
      // L'encre remonte à la pointe de l'Aiguille, qui est la plume de ce monde,
      // et la caméra quitte le corps du joueur pour lui montrer tout ce qu'il a
      // traversé pour l'y porter. C'est le seul moment du jeu où on lui retire
      // la maîtrise de son regard.
      if (MODE === 'monde' && pigments.nombre >= AUX_SOCLES_TOTAL) {
        sceau.declencher();
        sacre.jouer([0, 74, 0], camera.position);
        ambiance.retrouvaille();
        document.exitPointerLock();
      } else {
        suiteEl.setAttribute('href', NIVEAU_SUIVANT[MODE!] ?? './');
        suiteEl.textContent = MODE === 'caisse' ? 'retour au hall' : 'niveau suivant';
        winPanel.classList.add('show');
        // On rend la souris, sinon le lien du panneau est inatteignable.
        document.exitPointerLock();
      }
    }
  }

  // --- Caméra -----------------------------------------------------------------
  // Pendant le sacre, elle ne suit plus le joueur : elle prend du recul autour
  // de l'Aiguille et redescend vers le village. Tout le reste du jeu continue
  // de tourner derrière — le vent, les feuilles, les portails.
  // Le retard de l'œil se résorbe en un dixième de seconde, proportionnellement
  // à la taille du joueur : un géant monte de grandes marches, et le rattrapage
  // doit se sentir pareil à toutes les échelles.
  // Il se résorbe DANS LES DEUX SENS, à la même vitesse : monter une marche et
  // la descendre doivent se sentir pareil, et c'est la seule chose qui compte.
  if (lissageMarche !== 0) {
    const pas = dt * 9 * sim.scale;
    lissageMarche =
      lissageMarche < 0
        ? Math.min(0, lissageMarche + pas)
        : Math.max(0, lissageMarche - pas);
  }

  // ─── LE PLAN DE FIN VOIT PLUS LOIN QUE LE JEU ────────────────────────────
  //
  // Le brouillard s'arrête à 300 mètres et le plan lointain à 460 : parfait
  // pour jouer, désastreux pour un plan qui recule à trois cents mètres et doit
  // montrer le belvédère, qui est à quatre cents. Sans ça, la caméra s'éloigne
  // et le monde qu'on vient de repeindre s'efface dans le papier — exactement
  // ce qu'on voulait donner à voir.
  //
  // On ouvre donc les deux pendant le sacre, et on les referme après. Le
  // brouillard reste présent, mais très au fond : il tient l'horizon sans
  // manger le sujet.
  if (sacre.actif && !sacreLarge) {
    sacreLarge = true;
    fogRef.near = 400;
    fogRef.far = 3400;
    camera.far = 3800;
    camera.updateProjectionMatrix();
  } else if (!sacre.actif && sacreLarge) {
    sacreLarge = false;
    fogRef.near = 34;
    fogRef.far = BROUILLARD_LOIN;
    applyScale(true);
  }

  // LE TITRE ARRIVE APRÈS CE QU'IL NOMME. On laisse le plan montrer le monde
  // pendant les deux tiers de sa durée, et le mot ne vient qu'ensuite — quand
  // on a déjà vu, et qu'on n'a plus qu'à lire.
  if (sacre.actif && sacre.avancement > 0.62) finPanel.classList.add('show');

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
  // LA COULEUR QU'ON SAIT DIRE, à cette image : celle de la fée qui nous
  // accompagne. Une fée ne porte que sa couleur — ce n'est pas « tu as la clé
  // rouge », c'est « tu as le rouge, donc le rouge est ce que tu sais dire ».
  sim.couleurEnMain = null;
  for (const [socle, p] of peintres) {
    if (!p.suitLeJoueur) continue;
    sim.couleurEnMain = socle.replace('socle-', '');
    break;
  }

  brush.update(sim.player, scale, dt, camera);

  // ─── LES PORTES QUI SE DESSINENT SUR UNE FEUILLE ───────────────────────
  //
  // Une paire marquée `dessinee` attend deux choses : que son chevalet soit
  // pourvu, et que le Pinceau ait fini de tracer. La première est du ressort de
  // la simulation, la seconde du nôtre — d'où ce guet, qui remplace le câblage
  // en dur d'une seule porte du monde.
  if (!tracage.enCours) {
    for (const paire of LEVEL.portals) {
      if (!paire.dessinee || !paire.condition) continue;
      if (!sim.portesFermees.has(paire.id)) continue;
      if (!sim.conditionsRemplies.has(paire.condition)) continue;
      tracage.commencer(paire.id);
      flash('Le pinceau se met à écrire. Regarde la porte.', 4);
      break;
    }
  }

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
  // L'image des tableaux, prise à la première image utile — pas avant, parce
  // qu'il faut que le décor soit construit et ses uniformes posés.
  if (LEVEL.tableaux && LEVEL.tableaux.length > 0) {
    tableaux.capturer(
      renderer,
      scene,
      (attendu) => {
        for (const [famille, pigment] of Object.entries(attendu)) {
          const mats = worldView.parFamille.get(famille);
          const teinte = TEINTE_DU_PIGMENT[pigment];
          if (!mats || !teinte) continue;
          for (const m of mats) {
            if (m.uniforms.uSolid) m.uniforms.uSolid.value.set(teinte);
            if (m.uniforms.uUseSolid) m.uniforms.uUseSolid.value = 1;
          }
        }
      },
      () => {
        // On remet les familles telles qu'elles étaient AVANT la prise : celles
        // que le joueur a déjà peintes gardent leur teinte, les autres
        // retrouvent le lavis. Sinon le tableau se peindrait lui-même la salle.
        for (const [famille, mats] of worldView.parFamille) {
          const teinte = TEINTE_DU_PIGMENT[sim.familles.teintes.get(famille) ?? ''];
          for (const m of mats) {
            if (m.uniforms.uUseSolid) m.uniforms.uUseSolid.value = teinte ? 1 : 0;
            if (teinte && m.uniforms.uSolid) m.uniforms.uSolid.value.set(teinte);
          }
        }
      },
    );
    tableaux.syncInk();
  }

  canevas.update(aTrace);
  aTrace = false;
  feuilles.update(dt, camera, scale);
  pigments.update(dt, peintreEnCours?.group.position);

  // Les coups de pinceau en attente : chacun se pose à son tour, et la famille
  // se colore sous les yeux du joueur au lieu de basculer d'un bloc.
  for (let i = coupsEnCours.length - 1; i >= 0; i--) {
    const c = coupsEnCours[i];
    c.reste -= dt;
    if (c.reste > 0) continue;
    for (const m of c.materiaux) {
      if (m.uniforms.uSolid) m.uniforms.uSolid.value.copy(c.teinte);
      if (m.uniforms.uUseSolid) m.uniforms.uUseSolid.value = 1;
    }
    coupsEnCours.splice(i, 1);
  }
  if (sceau.enCours) sceau.update(dt);
  // Les pinceaux de couleur : ils tournent autour du joueur tant qu'ils
  // l'accompagnent, puis s'en détachent pour peindre.
  const oeilPeintre = sim.eyePosition();
  tmpOeil.set(oeilPeintre.x, oeilPeintre.y, oeilPeintre.z);
  for (const p of peintres.values()) {
    if (!p.enCours) continue;
    // IL PEINT EN RENTRANT, pas en arrivant sur son socle. Dès que le joueur
    // remet les pieds dans la région grise que ce pinceau doit repeindre, il
    // s'en détache et part au travail. C'est le moment juste : on revient d'un
    // monde en couleurs, on retrouve le sien en lavis, et la couleur arrive
    // avec soi.
    if (p.suitLeJoueur) {
      const region = (LEVEL.regions ?? []).find((r) => r.name === REGION_MAISON);
      const dedans =
        region !== undefined &&
        tmpOeil.x >= region.min[0] && tmpOeil.x <= region.max[0] &&
        tmpOeil.z >= region.min[2] && tmpOeil.z <= region.max[2];
      if (dedans) {
        p.declencher();
        flash('Il te quitte. Regarde-le peindre.', 5);
      }
    }
    p.update(dt, scale, tmpOeil);
  }
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
    // ─── LE HALL PARTAGE SES OBJETS, LUI AUSSI ────────────────────────────
    //
    // La synchronisation n'existait que pour l'aventure à deux, et dans le hall
    // chacun avait donc sa copie privée de tout : deux joueurs se voyaient
    // marcher et rapetisser, mais l'un ne voyait pas l'autre déplacer une
    // bille. Le seul lieu du jeu où l'on se croise était aussi le seul où l'on
    // ne pouvait rien se montrer.
    //
    // C'est un `||` de plus, et c'est ce qui fait du hall un endroit où être à
    // deux veut dire quelque chose.
    if (EN_DUO || !EN_AVENTURE) caisses.brancher(presence, sim.carryables);
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

    if (EN_DUO || !EN_AVENTURE) caisses.appliquer(visibles, sim.carryables);
    if (EN_DUO) surveillerRetrouvailles(visibles);

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
  pigments,
  peintres,
  worldView,
  bornesDeRegion,
  pigmentDe,
  pigmentAccentDe,
  /**
   * Rejoue le geste d'un pinceau depuis la console, sans avoir à aller le
   * chercher au fond de son monde. C'est le seul moyen de REGARDER l'animation
   * autant de fois qu'il faut pour la régler.
   *
   *   __game.peindre('rouge')
   */
  peindre(pigment: string) {
    const p = peintres.get(`socle-${pigment}`);
    if (!p) return `pas de pinceau ${pigment}`;
    pigments.effacer();
    pigments.appliquer(worldView.parRegion, pigmentDe, pigmentAccentDe);
    p.reveiller(camera.position.clone());
    p.declencher();
    return `le ${pigment} peint`;
  },
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
