import type {
  BoxDef,
  CarryableDef,
  PortalPairDef,
  RegionDef,
  SocketDef,
  TableauDef,
  VeilleurDef,
} from '../../core/types.js';

/**
 * CONTRAT D'UNE SALLE DE LA SUITE.
 *
 * Une salle est un fichier autonome qui n'exporte que des DONNÉES. Elle ne
 * touche à aucun autre fichier — c'est ce qui permet d'en écrire plusieurs en
 * même temps sans qu'elles se percutent, et c'est l'assemblage final qui les
 * réunit et décide quelle porte relie laquelle.
 *
 * C'est le petit frère de `src/levels/regions/contrat.ts`, dont **les sept
 * règles s'appliquent toutes ici** et ne sont pas répétées : rester dans sa
 * parcelle, ne jamais faire coïncider deux faces, varier par la palette et
 * jamais par la technique, calibrer sur la taille du joueur, ne jamais piéger,
 * protéger le vide par des balustrades, et se rappeler que le Pinceau vole
 * quand le joueur, lui, marche.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUI S'AJOUTE, ET QUI EST PROPRE À LA SUITE
 *
 * 8. UNE SALLE REVISITE UN LIEU CONNU, À UNE TAILLE NOUVELLE. C'est ce qui
 *    distingue un voyage d'un couloir. Une salle qui ne revient sur rien est
 *    décorative, et elle sera coupée.
 *
 * 9. TOUTE SALLE QUI DEMANDE DE PENSER À UNE AUTRE TAILLE CONTIENT UN ÉTALON
 *    DE CETTE TAILLE. Le joueur ne doit jamais estimer à l'œil ce qu'il ne
 *    peut pas comparer. La petite face d'une porte mesure toujours la même
 *    chose : c'est le mètre-ruban du monde, et il est déjà planté dans le
 *    décor. Posez-en un là où l'on doit juger.
 *
 * 10. LE SPECTACULAIRE EST LA RÉCOMPENSE DE L'ERREUR. Une salle bien dessinée
 *     réserve son plus beau plan à qui s'est trompé. Se tromper doit coûter du
 *     temps et donner une image, jamais coûter une partie.
 *
 * 11. DEUX LOGEMENTS D'UNE MÊME SALLE N'ACCEPTENT JAMAIS LA MÊME TAILLE.
 *     Les tailles vivent sur un réseau de puissances de 4 avec 12 % de
 *     tolérance, donc des tailles distinctes ne se confondent jamais. Cette
 *     seule règle rend impossible la salle cassée sans retour — et ça compte
 *     double, puisqu'un logement ordinaire verrouille pour de bon.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LES NOMBRES QU'ON NE DEVINE PAS. Ils sont mesurés, pas calculés, et ils
 * contredisent l'intuition. Voir `MESURES.md` à la racine.
 *
 *   ── CE QU'ON MONTE (des HAUTEURS) ──
 *   enjambée      = 0,50 × sa taille      →  ×1/4 : 0,225   ×1 : 0,90   ×4 : 3,60
 *   saut, sommet  = 0,72 × sa taille      →  ×1/4 : 0,323   ×1 : 1,29   ×4 : 5,18
 *
 *   ── CE QU'ON FRANCHIT (des DISTANCES) — mesuré, et ce n'est pas le même
 *      nombre. Il manquait, et son absence a produit cinq idées de salles
 *      infaisables et trois consignes fausses avant que quelqu'un aille voir. ──
 *   saut, portée en marchant  →  ×1/4 : 1,24    ×1 : 4,95   ×4 : 19,82
 *   saut, portée en sprintant →  ×1/4 : 1,61    ×1 : 6,42   ×4 : 25,68
 *   saut, portée À L'ARRÊT    →  ZÉRO à toutes les tailles : sans élan, on
 *                                 monte et l'on retombe sur place.
 *   on soulève    ≤ 0,55 × sa taille      →  ×1/4 : 0,2475  ×1 : 0,99   ×4 : 3,96
 *   ON PEINT      ≤ 0,55 × sa taille      →  le même seuil, exactement
 *   portée de bras= 1,60 × sa taille      →  ×1/4 : 0,72    ×1 : 2,88   ×4 : 11,52
 *   on repose à   ≈ 2 × sa taille devant  →  à ×4, huit mètres plus loin
 *
 * CE DERNIER NOMBRE A DÉJÀ RENDU UNE SALLE INFAISABLE sans que rien ne le
 * laisse voir. Toute surface où l'on doit poser quelque chose en étant grand
 * doit être plus large que ça, et son `portee` généreux.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ET UNE CHOSE QU'ON CROIT SAVOIR ET QU'ON SAIT DE TRAVERS :
 *
 *     UN PORTAIL REDIMENSIONNE CE QU'ON VOIT À TRAVERS.
 *
 * `portalRenderer.computeVirtual` met la caméra virtuelle à l'échelle du
 * franchissement. Ce qu'on aperçoit par une porte est donc cadré EXACTEMENT
 * comme on le verra après l'avoir franchie — c'est la seule façon cohérente de
 * faire, sinon la scène sauterait d'un facteur quatre au moment du passage.
 *
 * CONSÉQUENCE POUR QUI DESSINE UNE SALLE QU'ON REGARDE SANS Y ENTRER : le bon
 * observateur n'est pas le joueur tel qu'il est de l'autre côté, **c'est le
 * joueur tel qu'il sera une fois entré**. Composer pour le premier donne une
 * image quatre fois trop grande ou quatre fois trop petite.
 *
 * Je l'avais écrit à l'envers dans une consigne, et l'autrice de la lucarne
 * bleue est allée lire le rendu plutôt que de me croire. C'est pour ça que
 * c'est ici : la prochaine main n'aura pas à le redécouvrir.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export interface SalleModule {
  /** Nom court, en minuscules : sert de clef de région et de préfixe d'identifiants. */
  nom: string;

  /** Palette et papier de la salle. Une salle, une ambiance. */
  region: RegionDef;

  /**
   * Parcelle réservée. Aucune boîte ne doit en sortir — c'est ce qui garantit
   * que deux salles écrites séparément ne se percuteront jamais, même si elles
   * sont bâties à des jours d'intervalle par des mains différentes.
   */
  bounds: { min: [number, number, number]; max: [number, number, number] };

  /** Le décor. Chaque boîte doit porter `region: <nom>`. */
  boxes: BoxDef[];

  /** Objets à porter, si la salle en propose. */
  carryables?: CarryableDef[];

  /**
   * Logements. Un CHEVALET est un logement comme un autre, avec `rend: true` —
   * il ne verrouille pas ce qu'on lui donne, parce que son contenu n'est pas un
   * progrès mais une décision, et qu'une décision doit pouvoir se reprendre.
   */
  sockets?: SocketDef[];

  /** Cadres au mur, si la salle est un atelier. Voir TableauDef. */
  tableaux?: TableauDef[];

  /** Pinceau de couleur endormi, si la salle est un bout de monde. */
  veilleurs?: VeilleurDef[];

  /**
   * Portes INTERNES à la salle. Les portes qui la relient aux autres sont
   * déclarées à l'assemblage, pas ici : leur position dépend des deux côtés.
   */
  portals?: PortalPairDef[];

  /** Stations du Pinceau traversant la salle, dans l'ordre du voyage. */
  stations: [number, number, number][];

  /**
   * Porte INTERNE par laquelle le Pinceau doit passer pour rejoindre chaque
   * station. Autant d'entrées que de stations ; `null` : il y va en droite
   * ligne. Absent : aucune station n'exige de porte.
   *
   * Il en faut dès qu'une salle a des stations des deux côtés d'une paroi. Le
   * Pinceau vole, lui — il n'a aucune raison de connaître les murs — et sans ça
   * il traverse vingt mètres de maçonnerie en ligne droite. On ne lit alors pas
   * « suis-moi », on lit « il s'est téléporté », et le joueur reste planté là
   * sans savoir par où passer. C'est déjà arrivé dans le monde central, avec
   * cinq cents mètres de vide au lieu de vingt de pierre.
   *
   * L'autrice de l'atelier du haut l'a signalé sans pouvoir le corriger : ses
   * stations descendent dans la cour, la porte est à elle, mais le guide
   * appartient à l'assemblage. Ce champ est la réponse — la salle nomme sa
   * propre porte, et l'assemblage n'a plus rien à deviner.
   */
  stationsPorte?: (string | null)[];

  /**
   * ═══════════════════════════════════════════════════════════════════════
   * LA TAILLE DU PINCEAU, JALON PAR JALON — et c'est un ÉTALON.
   *
   * L'assemblage donne à tous les jalons d'une salle la taille de son ENTRÉE.
   * C'était juste tant qu'une salle se jouait à une seule taille, et c'est faux
   * dès qu'elle en contient deux.
   *
   * L'autrice de la pièce sans étalon l'a trouvé en mesurant ce qui pouvait
   * trahir la taille du joueur, et son verdict est sans appel : sa salle est
   * faite de deux lobes identiques, l'un quatre fois l'autre, et **un Pinceau
   * d'un mètre au pied d'un rocher de douze annonce la taille du rocher, donc
   * la vôtre.** Il éteint la salle en trois secondes.
   *
   * Le guide est donc un instrument de mesure au même titre que la petite face
   * d'une porte — on ne l'avait jamais dit, parce qu'aucune salle n'avait
   * jusqu'ici deux tailles sous le même toit.
   *
   * Autant d'entrées que de stations ; absent, c'est l'entrée de la salle qui
   * décide, comme avant. **Ce sont des TAILLES et non des paliers** — 0,25, 1,
   * 4, 16 — parce que c'est ce qu'attend le rendu, et c'est la seule exception
   * de tout le projet. Elle a déjà produit un Pinceau de taille zéro, donc
   * invisible, dans trois salles à la fois.
   * ═══════════════════════════════════════════════════════════════════════
   */
  stationsEchelle?: number[];

  /**
   * Le raccord, tenu au mètre près : où l'on arrive, où l'on repart, et à
   * quelle échelle. C'est le seul contrat avec le reste du monde, et le seul
   * endroit où une erreur coûte à quelqu'un d'autre que soi.
   *
   * ═══════════════════════════════════════════════════════════════════════
   * `echelle` EST UN PALIER, PAS UN MULTIPLICATEUR.
   *
   *     −1 = ×1/4 (45 cm) · 0 = ×1 (1,80 m) · 1 = ×4 · 2 = ×16
   *
   * C'est la convention de `PlayerState.scaleLevel` et de `VeilleurDef`, donc
   * de tout le reste du jeu. Le contrat ne le disait pas, un auteur de salle a
   * écrit `0.25` en toute bonne foi et l'a signalé — la faute était dans le
   * contrat, pas dans la salle. Un contrat ambigu produit exactement autant de
   * versions qu'il a de lecteurs.
   * ═══════════════════════════════════════════════════════════════════════
   */
  entree: { position: [number, number, number]; echelle: number };
  sortie: { position: [number, number, number]; echelle: number };
}

/** Vérifie qu'une salle respecte sa parcelle. Appelé par npm run check. */
export const verifierParcelleSalle = (m: SalleModule): string[] => {
  const fautes: string[] = [];
  const { min, max } = m.bounds;
  for (const b of m.boxes) {
    for (let i = 0; i < 3; i++) {
      if (b.min[i] < min[i] - 1e-6 || b.max[i] > max[i] + 1e-6) {
        fautes.push(
          `${m.nom} : une boîte sort de sa parcelle sur l'axe ${'xyz'[i]} ` +
            `(${b.min[i]}…${b.max[i]} hors de ${min[i]}…${max[i]})`,
        );
        break;
      }
    }
  }
  return fautes;
};

/**
 * Vérifie la règle 11 : deux logements d'une même salle n'acceptent jamais la
 * même taille.
 *
 * Le recouvrement se juge sur les tolérances réelles des deux logements, et non
 * sur une marge fixe : un logement peut assouplir la sienne, et deux tailles
 * qui se chevauchent alors rendraient possible un placement correct qui soit
 * malgré tout une faute.
 */
export const verifierTaillesDistinctes = (m: SalleModule): string[] => {
  const fautes: string[] = [];
  const s = m.sockets ?? [];
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length; j++) {
      const a = s[i];
      const b = s[j];
      const ta = a.size * (a.tolerance ?? 0.12);
      const tb = b.size * (b.tolerance ?? 0.12);
      if (Math.abs(a.size - b.size) <= ta + tb) {
        fautes.push(
          `${m.nom} : « ${a.id} » (${a.size}) et « ${b.id} » (${b.size}) ` +
            `acceptent la même taille — une caisse pourrait tomber dans le mauvais`,
        );
      }
    }
  }
  return fautes;
};
