# Où j'en suis

Note de passation, à lire en premier si tu reprends ce projet dans une session
neuve. Le reste du contexte est dans les messages de commit, dans `IDEES.md` et
dans `CONCEPTION.md`, tous écrits pour être lus par un humain.

## Le jeu : *Lavis*

Un lavis est un dessin à l'encre diluée. C'est littéralement l'état du monde au
début de la partie : **tout est gris, et la quête est d'aller chercher les
couleurs.**

La mécanique est celle des portails qui changent votre taille. Deux portes
reliées, de dimensions différentes : franchir la grande vous fait ressortir
quatre fois plus petit par la petite, et l'inverse. Vue à la première personne,
style encre et manga. Ça tourne dans un navigateur, y compris sur téléphone.

Le fil est **le Pinceau** : un personnage qui vole de jalon en jalon. Il passe
là où on ne peut pas marcher, et c'est cet écart qui fait l'énigme.

## État au 25 septembre 2026

`npm run check` : **831 vérifications, tout passe.** `npm run build` passe.
Chaque monde a été ouvert dans un navigateur sans tête : aucune erreur console,
aucune erreur de shader.

**Les cinq chapitres s'enchaînent, et le hall s'en souvient.** On finit un
chapitre, le panneau dit où l'on va (« Descendre », « Monter », « Aller se
mesurer », « La boîte à formes »), et si l'on ferme l'onglet, l'arche « Seul »
du hall reprend au premier chapitre qu'on n'a pas fini (`src/voyage.ts`). La
carte de titre porte le nom du chapitre, et ses pinceaux s'encrent au fil des
couleurs rapportées — les quatre.

Le jeu est un hall et **trois voyages enchaînés**, plus un examen final :

```
hall  →  monde (rouge, vert)  →  descente (bleu)  →  montée (or)
      →  mesure (rien : on perd la taille, on la retrouve)  →  boîte à formes
```

- **https://hugohismans.github.io/sumi-portals/** — le hall, trois arches.
  *Le site se publie depuis `main` à chaque poussée (`.github/workflows/deploy.yml`) ;
  depuis le 24 septembre on pousse directement sur `main`, le site est donc à jour.*
- `?niveau=monde` — le voyage d'introduction. Il repart toujours du gris
  (`&neuf=1` ne sert qu'avec `&debug=1`).
- `?niveau=descente` — six salles, on y cherche le bleu.
- `?niveau=pluie` — la cour de pluie, seule : elle était un détour de la
  descente et se lisait comme une erreur de chemin.
- `?niveau=montee` — sept salles, on y cherche l'or.
- `?niveau=mesure` — **NEUF** : trois salles, on y perd la taille.
- `?niveau=formes` — la boîte à formes, l'examen.
- `?niveau=banc` — le banc d'essai, douze stations (treize jalons du Pinceau),
  une par chose que personne n'a vue. **C'est par là qu'il faut commencer.**
- `?niveau=reve&graine=7` — le rêve génératif.
- `?niveau=duo&salon=…&role=geant|minuscule` — l'aventure à deux, jamais
  essayée à deux vraies machines.

**`?debug=1` — LES REPÈRES.** Sur le hall, le monde, la descente, la montée,
la mesure, la boîte à formes, le banc et la cour de pluie (pas sur la cour, la
caisse, le duo ni le rêve). Une touche **du pavé numérique** par moment du voyage
(la rangée du haut choisit le pinceau ; sans pavé, on clique la ligne), chaque ligne
dit ce qu'il faut regarder là et POURQUOI on le regarde.
`H` replie la liste. Certains sauts RECHARGENT la page, voir
`src/debug/reperes.ts`.

**LE PROTOCOLE EST DANS LE JEU.** Trois touchers sur l'affichage de la taille,
en haut à gauche, en moins d'une seconde et demie : les mondes en une ligne, la
liste des choses à faire dans l'ordre, une case à cocher par ligne (elle survit
au rechargement), un bouton pour copier le rapport. `PROTOCOLE.md` en est la
version longue.

## Ce qui a changé ces deux nuits (après le 4 août)

Lis les messages de commit : ils disent le pourquoi. En bref, dans l'ordre :

1. **Il pleut dans la cour de pluie.** Le moteur de gouttes existait depuis le
   premier commit et n'était branché nulle part ; la salle était livrée, reliée,
   au protocole, et sèche. La salle déclare son averse (`AverseDef`), les trois
   sources coulent (nappe, jet, égouttement), et le harnais tombe du ciel en
   cent points de chaque abri pour prouver qu'il n'y pleut pas.
2. **Les deux salles chirales de la montée se jouent au lancer.** *(Défait le
   24 septembre — voir plus bas : la règle était fausse, tout se porte.)* Il
   en reste les **mains d'encre** de part et d'autre de chaque ouverture, le
   **ciel de verre** sur les deux cours, et un pilote qui joue les deux salles
   jusqu'à la porte de sortie.
   *Deux défauts du moteur trouvés en chemin :* une pièce glissée au sol à
   travers une petite face ressortait quinze centimètres dans le plancher
   (corrigé : on ne ressort jamais sous le seuil de la face jumelle) ; un
   creux happait une pièce en vol (corrigé : il attend qu'elle se soit posée).
3. **Le troisième mouvement existe.** La rive et le grain, écrits en août et
   reliés à rien, sont assemblés dans `src/levels/mesure.ts` avec un petit
   palier neuf, le seuil. La montée y mène, et la mesure mène à la boîte à
   formes. Un pilote joue le mouvement de bout en bout.
4. **Trois trous du harnais** : la côte rouge n'était pas contrôlée sur sa
   parcelle, la lucarne bleue échappait au contrat des salles, le banc d'essai
   n'était dans aucune vérification.
5. Cette note, et `PROTOCOLE.md`, mis à jour au fil de la nuit.
6. **Une pièce tombée hors du monde revient**, comme le joueur : vingt mètres
   sous le plancher, elle est reposée là où elle reposait la dernière fois,
   telle qu'elle y reposait — taille et main d'avant le lancer. C'est une loi
   du moteur (`Carryable.appui`), et le ciel de verre des deux cours chirales
   n'est plus qu'une ceinture par-dessus les bretelles.
7. **On sait dire les couleurs qu'on a rapportées, et la montée est
   finissable.** Les fées n'existent que dans le village ; dans la descente et
   la montée personne ne suivait le joueur, rien ne pouvait être peint, et la
   porte de la vallée — scellée par le tableau de l'atelier du haut — ne
   s'ouvrait jamais. Un pilote joue maintenant les deux ateliers : appuyer sur
   E devant une famille lui dit la couleur suivante parmi celles qu'on a
   rapportées (rouge, vert, bleu), et une couleur se reprend.
8. **Le joueur a un fil.** Le lien de fin dit le geste et non « niveau
   suivant » ; la carte de titre dit le chapitre ; le hall se souvient des
   chapitres finis et son arche reprend au suivant (`src/voyage.ts`, mémoire
   `sumi.voyage`, effacée quand on rentre dans le monde, qui est le début).
9. **Une relecture adversariale de tout ce qui précède**, et ses douze
   trouvailles corrigées. La grosse : une porte scellée ne faisait mur qu'au
   joueur — une graine lancée ou posée vers la sortie scellée du grain passait
   dans le seuil et le troisième mouvement était mort. Puis : la borne de
   sortie des pièces (fausse dès qu'une face n'est pas plantée à cinq
   centimètres — le galet de la rive était catapulté) ; le refus qui se
   résolvait au lancer (un creux ne prend plus qu'une pièce POSÉE) ; le ciel
   de verre sous la main d'un géant (dix-huit mètres) ; la pose à travers un
   mur ; la pluie semée sous les toits ; la chatière qui ne refusait pas ; la
   porte scellée qui disait « ne mène nulle part ».
10. **Chaque porte sait dans quel sens on la passe.** L'assemblage plantait
    tous les raccords face au nord : trois sorties ne se quittaient qu'en se
    glissant entre la porte et le mur pour revenir sur ses pas, et quatre
    entrées posaient le joueur face à un mur, la salle dans le dos. Le contrat
    des salles porte un `lacet` par porte, sept salles le déclarent, et le
    harnais franchit les quatorze raccords depuis l'intérieur.
11. **La descente et la montée sont jouées de bout en bout** par un pilote
    chacune (`src/core/__pilote_descente.ts`, `src/core/__pilote_montee.ts`),
    du spawn au but, dans une seule simulation, sans téléportation — comme la
    mesure l'était déjà (68 et 52 vérifications, une seconde chacune). Chaque
    pilote a été relu adversarialement : pas de triche, et trois défauts de
    niveau que la relecture a prouvés sont corrigés — la feuille logée sur le
    chevalet du lavoir finissait perchée sur le dosseret (le plateau est
    creusé vers le nord), les sorties de l'escalier et de l'atelier du haut
    regardaient à l'envers (`lacet`). Un fait à connaître pour l'escalier : un
    géant POSE un cube trois mètres devant lui — depuis la lèvre, il tombe sur
    les vires, pas au fond — et un lancer de géant survole la fosse ; le texte
    de la salle disait encore « quatorze mètres », c'est corrigé.
12. **Une seconde relecture adversariale, sur tout ce qui précède.** Huit
    trouvailles, toutes corrigées et vérifiées : la pointe du monde sans les
    couleurs ne « finit » plus rien (le but se réarme, on dit ce qui manque) ;
    la carte de titre ne se pose plus sur le sacre ; les liens de fin et
    l'arche gardent le mode débug, donc le hall en débug n'efface plus la
    vraie partie ; « Reprendre du début » quand la suite est le monde, et
    « Tout est rapporté » seulement avec les quatre couleurs ; une pièce
    lancée qui s'arrête dans un creux s'entend refuser (« Lancée, elle
    n'entre pas. Reprends-la, et pose-la ») ; E devant une porte scellée
    garde la pièce en main au lieu de la faire apparaître dans la tête ; une
    pièce lancée sur une porte fermée retombe devant ; le refus « trop grand »
    au-dessus d'une porte ne parle que contre un mur (plus de message quand
    un géant enjambe le torii) ; et le lancer voyage sur le réseau, sans quoi
    le creux se pourvoyait chez le spectateur et pas chez le lanceur.

## Tester un chapitre seul, sans refaire ce qui précède

Chaque chapitre s'ouvre par son adresse. Deux mots utiles :

- **`couleurs=rouge,vert`** pose la mémoire des couleurs avant d'entrer :
  c'est ce qu'on aurait en arrivant par le jeu, et l'atelier de la descente ne
  se peint qu'avec le rouge et le vert, celui de la montée demande le bleu.
  Sans ce mot, un chapitre ouvert directement est infinissable. `couleurs=`
  (vide) efface.
- **`debug=1&repere=N`** pose le joueur au moment N du chapitre, à la bonne
  taille, avec les bonnes couleurs (les repères les sèment eux-mêmes), et la
  liste des moments s'affiche (`H` la replie). Le débug a sa propre mémoire :
  il n'abîme pas la partie.

```
hall         ./
monde        ?niveau=monde
descente     ?niveau=descente&couleurs=rouge,vert
montée       ?niveau=montee&couleurs=rouge,vert,bleu
mesure       ?niveau=mesure&couleurs=rouge,vert,bleu,or
formes       ?niveau=formes&couleurs=rouge,vert,bleu,or
banc         ?niveau=banc
pluie        ?niveau=pluie
rêve         ?niveau=reve&graine=7
```

## Par où commencer demain matin, dans l'ordre du risque

Tout ce qui suit est PROUVÉ en simulation et n'a été vu qu'en captures
d'écran fixes, à une image par seconde. Personne n'a joué. Voir `PROTOCOLE.md`
pour le détail de chaque station.

0. **Le fil, tel qu'un joueur le suivra** : le hall, l'arche « Seul », le
   monde jusqu'au sacre, « Descendre », la descente jusqu'au bleu, « Monter »…
   et, entre deux, fermer l'onglet, rouvrir le hall, voir la carte dire
   « Suite : la montée » et l'arche y mener.
1. **`?niveau=banc&debug=1`** — le banc d'essai, douze stations en une marche.
   Il dit en une demi-heure si les corrections du moteur tiennent à l'œil.
2. **`?niveau=montee&debug=1`, touches `2` et `3`** — le creux qui refuse et le
   blanchiment, réécrits le 24 septembre. Le geste à juger : porter la vrille
   par le miroir plan, voir la cour basculer et la vrille garder sa forme, la
   POSER, elle entre ; puis au blanchiment, miroir et porte ordinaire dans
   l'ordre qu'on veut. Et le refus qui parle, phrase par phrase. Puis la touche `5`, l'atelier du haut :
   dire le rouge aux pots, le bleu aux tuiles, et voir la porte de la vallée
   se dessiner.
3. **`?niveau=mesure&debug=1`** — le troisième mouvement, jamais joué. La rive
   (lever les yeux de 23° et lâcher), le grain (est-ce qu'on ne sait VRAIMENT
   plus quelle taille on fait ?), le seuil.
4. **`?niveau=pluie&debug=1`** — la cour de pluie, seule, sous la pluie. La
   nappe de l'auvent, le jet du puits, l'égouttement du banc.
5. **`?niveau=monde`** — l'introduction de bout en bout, parce que le moteur a
   bougé sous elle (deux correctifs de physique cette nuit).
6. Les lucarnes, la boîte à formes, le duo à deux machines : voir `RECAP.md`
   § 5, toujours valable.

## Le parcours de l'introduction, et pourquoi il est dans cet ordre

```
hall : trois leçons sans un mot
  le pinceau à trois pas → on le rejoint
  sur un plot de 2,70    → hors d'atteinte : GRANDIS
  sous une dalle de 0,75 → ni géant ni normal : RAPETISSE
  devant trois arches    → on choisit

village (×1), tout est gris
  tour du propriétaire : puits, marché, étang
  CÔTE ROUGE   ×1 → ×4 là-bas → on y RÉVEILLE le pinceau rouge (touche E)
               il nous suit comme une fée → retour à ×1
  terrasse     ×1 → ×4
  le toit du village, revu en géant   ← le cœur du jeu
  JARDIN       ×4 → ×1 là-bas → vingt bonds sur le tas de feuilles,
               et le pinceau vert dort à son sommet → retour à ×4
  la seconde porte, que le pinceau dessine tache par tache
  belvédère    ×4 → ×16
  l'éperon, la pointe de l'Aiguille, le sacre
```

**L'ORDRE N'EST PAS UN GOÛT.** On entre dans la côte rouge par une PETITE face :
il faut mesurer 1,80. On entre utilement dans le jardin par une GRANDE face, en
étant DÉJÀ à ×4. Le rouge d'abord, le vert ensuite.

**ON NE RAMASSE RIEN : ON RÉVEILLE QUELQU'UN.** Chaque pinceau dort au bout de
son monde, et il n'accepte que la taille de son monde. C'est cette règle, et
elle seule, qui relie le VERBE du jeu (changer de taille) à son BUT (rendre les
couleurs). Voir `veilleurs` dans `src/core/types.ts`.

## Les trois voyages, en paliers

```
descente   lavoir ×1 · conduit ×1/4→×1 · creux ×4 · atelier ×1→×1/4 ·
           bol ×1→×1/4 · lucarne bleue      (la cour de pluie vit seule)
montée     toits ×4 · refus ×1→×4 · blanchiment ×1 · escalier ×4→×1 ·
           atelier du haut ×4 · vallée ×16 · lucarne dorée
mesure     rive ×4 · grain ×1 (on y tombe, on ne remonte pas) · seuil ×1/4
```

Une porte ne vaut qu'un cran : la sortie d'une salle et l'entrée de la suivante
diffèrent d'exactement un palier. C'est vérifié.

## La règle du miroir, telle qu'elle est aujourd'hui (24 septembre)

Un miroir bascule le MONDE avec le joueur (`PlayerState.gauchere`), et **ce
qui le traverse est réfléchi, porté ou lancé** (`Simulation.teleport`). À
l'écran : le monde se retourne autour de soi, la pièce dans les bras garde sa
forme — et le creux, qui est du monde, l'accepte désormais. La version
« porter ne retourne pas » confondait l'écart entre la pièce et soi (nul) avec
la main de la pièce dans le monde (qui bascule) ; le joueur l'a vue de ses
yeux : « la forme change toute seule ».

- **Le refus** a un miroir **plan** (`PortalPairDef.plane`) : même taille des
  deux côtés, rien d'autre que la réflexion. Le creux veut la vrille à sa
  taille et de l'autre main ; on la porte à travers, elle entre.
- **Le blanchiment** couple main et taille : miroir ↑ (D 2,00) puis grande
  face ordinaire ↓ (D 0,50), ou l'inverse. Plus de chatière.
- **Le raccord refus → blanchiment est une porte plane** (`cran: 0`), la
  première : la loi de l'enchaînement admet zéro cran par une paire plane.

Les mains d'encre sur les murs (`src/levels/mains.ts`) sont l'étalon de la
main, comme la petite face de 2,80 est l'étalon de la taille.

## Les pièges appris à la dure

Ils sont dans `src/levels/regions/contrat.ts` (7 règles), dans
`src/levels/salles/contrat.ts` (4 de plus) et dans les commentaires. Les six
qui ont coûté le plus cher :

1. **Deux faces ne doivent jamais coïncider.** Vérifié automatiquement
   (`src/core/coplanaires.ts`). A mordu six fois.
2. **Un portail déjà franchi doit rester DERRIÈRE soi.**
3. **Les deux faces d'une paire n'ont pas le même lacet.**
4. **Pas d'accent dans un identifiant GLSL.** Un shader ne se compile que dans
   un navigateur — d'où `npm run preview`, et la tournée Chromium de cette nuit.
5. **À grande échelle, la portée du bras est énorme.** Un géant repose ce qu'il
   porte à 1,36 m plus deux fois l'arête devant lui.
6. **Ce qui sort d'une grande face sort quatre fois plus vite.** Une pièce
   lancée un peu vers le haut passe douze mètres de mur. Le moteur la rattrape
   désormais ; là où une pièce est une clef, on met quand même un ciel de
   verre, pour qu'elle retombe dans la cour plutôt qu'à son point de départ.

## Ce qui a changé le 24 septembre, en jouant la montée sur un vrai PC

Signalé : 23 images par seconde là où l'on en attend 120, un « effet miroir
pas clair » couplé à la taille, une pièce qui « change de forme toute seule »
au miroir, des portes qu'on traverse par derrière, un voile blanc et un rendu
faux dans certaines portes, un portail « carrément freeze » au banc.

- **Le bug des miroirs, mesuré et corrigé.** `computeVirtual` décomposait la
  matrice de la caméra virtuelle pour une porte ordinaire même quand la caméra
  SOURCE était gauchère (joueur passé par un miroir) : la réflexion se
  perdait, déterminant +1 pour une source à −1, et le contenu de toute porte
  ordinaire s'affichait inversé — figé par rapport au monde. La réflexion se
  lit maintenant sur le déterminant de la matrice composée, jamais sur la
  porte.
- **Ce qu'on porte se réfléchit avec soi** (voir la règle ci-dessus).
- **Les paires planes** : `plane: true`, mêmes faces, aucun cran.
- **Le dos d'une porte fait mur** (`Simulation.dosDesPortes`, mur à sens
  unique : on ne se rapproche pas du plan en venant de derrière) et **se
  dessine** comme une feuille tendue. Trois portes se présentaient de dos à
  qui venait et ont été tournées ou contournées : la seconde porte de la
  terrasse du monde, la sortie de la vallée (elle regarde l'est), et les
  pilotes de la rive et de l'escalier contournent la grande face.
- **Les portes se rendent dans le rectangle qu'elles occupent à l'écran, à
  pleine résolution** (`PortalRenderer.rectEcran`, ciseau sur la cible). La
  première version rendait toute la vue dans une fraction de la cible, et une
  qualité adaptative la baissait encore : une porte lointaine était floue.
  Signalé : « quand on est loin d'un portail l'image est toute floue ». Les
  deux sont retirés.
- **Ce qui coûtait, c'était l'élagage, pas le remplissage.** Le décor, les
  portes, les creux et les pièces n'étaient jamais élagués : chaque vue de
  portail redessinait le niveau entier. Ils le sont (le décor avec une marge
  pour le trait), et une porte vue à travers une porte n'est rendue que si
  elle tombe dans le rectangle de la porte parente. Mesuré, par image :

  | Lieu | Appels de dessin avant | après | Vues de portail avant | après |
  |---|---|---|---|---|
  | Cour du refus | 4 336 | 851 | 16 | 7 |
  | Blanchiment | 2 806 | 965 | 10 | 7 |
  | Départ de la descente | 994 | 206 | 2 | 1 |
  | Hall | 472 | 164 | 2 | 2 |
- **Un cerne d'encre au sol** autour de tout ce qui se ramasse
  (`carryableViews.ts`), qui respire.
- **La fin d'un chapitre** : la peinture attend le but, un accord, un titre,
  et « Continuer : la montée » au lieu de « Monter ».
- **Deux mots quand on vise** (`updateHints`) : « E — Prendre » devant une
  pièce, « Clic — Peindre » devant une famille qu'un tableau regarde.
- **Les cadres de portail gagnent toujours la profondeur** (décalage de
  polygone) : un montant planté dans un jambage ne clignote plus rouge et
  brun. Les plaques du décor entre elles restent à traiter globalement.
- **Ce qui passe une porte tourne avec elle** (`transporterRotation`) : par
  un miroir, la main bascule ET le lacet devient π + jumelle + face − θ. La
  première formule ajoutait un complément et ne tombait juste que pour 0 et
  π ; le harnais essaie maintenant des lacets quelconques.
- **Les portes ne disparaissent plus après un miroir.** Le catalogue des
  matériaux à retourner pour une caméra gauchère était pris une fois, pendant
  un rendu de portail — quand les surfaces portent un autre matériau que
  celui de l'écran. Une fois le joueur passé au miroir, toutes les portes
  devenaient transparentes. Le catalogue est refait à chaque appel.
- **On tourne la pièce tenue, et un creux à forme exige le bon sens.**
  Molette : un cran, un quart de tour, dans un ordre qui passe par les 24
  orientations et revient (`TOUR_DE_MOLETTE`, « yyyxyxyzyxyx » deux fois ; avec
  la verticale et un seul axe couché, aucun ordre ne le fait). Flèches, tant
  qu'on tient une pièce : quarts de tour libres par rapport à ce qu'on voit. T
  et le bouton « Tourner » au doigt. Le creux compare les blocs tournés à son
  dessin (`cleDeForme`), refuse « pas dans ce sens » quand seule l'orientation
  cloche, et son dessin respire quand la pièce en main l'épouse. Avec la
  mauvaise main, aucune des 24 : le harnais le vérifie. Le transport par les
  portes et les miroirs passe en matrices (`transporterRotation`), exact pour
  toute orientation.
- **Un creux qui attend une forme la dessine**, au trait, dans la main qu'il
  exige et l'orientation où la pièce se loge (`SocketViews`,
  `aretesDeLaForme`) : seules les arêtes du volume, pas celles de chaque cube.
  Il était cubique quelle que soit la forme, et l'on ne voyait pas pourquoi
  la vrille n'entrait pas. Logée, la pièce recouvre son dessin, qui s'efface.
- **Les mains d'encre font la taille d'un homme** au refus (1,80, la paume à
  hauteur d'œil), 0,72 et 2,90 au blanchiment : on voit le pouce changer de
  côté en passant le miroir.
- **La moitié déjà passée d'une pièce tenue garde sa forme.** Le double vu à
  travers la porte n'était rebâti que si la taille changeait, jamais la main :
  au miroir plan, la moitié passée apparaissait retournée jusqu'à ce que le
  joueur passe à son tour. Vérifié à l'écran : identique avant, pendant et
  après le passage.
- **Le dos d'une porte le dit** quand on pousse dessus : « C'est le dos de la
  porte. Elle s'ouvre de l'autre côté. » Signalé : « tous les portails sont
  fermés » — c'était la sortie scellée du blanchiment, vue de dos.

### Puis : la trousse, et l'on peint tout

Signalé : « l'étape où il y a un tableau et qu'on doit peindre des éléments,
c'est pas super clair ; ce serait cool qu'on ait un inventaire de nos
pinceaux, qu'on puisse absolument tout colorer comme on le souhaite, et que
lors des énigmes à couleur on doive juste peindre comme on le fait pour le
fun ».

- **La trousse** (`#trousse`, `majPinceaux` dans `main.ts`) : un pinceau par
  couleur rapportée, et **l'eau** qui lave. Mains vides, la molette, les
  chiffres 1 à 5 de la rangée du haut ou un doigt sur la case choisissent
  (le pavé numérique reste aux repères de débug) ; au doigt, « Lancer »
  devient « Peindre » et « Tourner » devient « Pinceau ». Une phrase
  l'explique une fois, au premier moment calme.
- **Le clic peint ce qu'on vise**, n'importe quelle boîte du décor
  (`Simulation.viserPeinture`, `peindreCeQuOnVise`). Une boîte d'une
  **famille** peint la famille entière, de proche en proche depuis celle
  qu'on a touchée, et c'est tout ce qu'une énigme demande : que la pièce
  ressemble au tableau. Le verre ne se peint pas, **une porte arrête le
  pinceau** (on ne peint pas ce qu'on ne voit pas), et `R` rend tout au lavis.
- **La loi de la main est retirée** (« on ne peint que ce qu'on pourrait
  tenir », et le refus « trop grand pour toi »). Elle est remplacée par une
  **portée** : dix mètres à ×1, quarante à ×4 (`PORTEE_PINCEAU`) ; au-delà,
  « Trop loin pour ton pinceau ». L'atelier du haut garde son voyage : les
  pots ne se voient que de la cour, et l'on ressort par le toit.
- **Rendu** : un attribut `aPeint` par sommet dans le décor
  (`createCelMaterial(…, { peinture: true })`, `WorldView.peindreBoite`),
  appliqué APRÈS le lavis : une boîte peinte dans une région encore grise est
  en couleur. La case de la trousse et le viseur montrent la teinte telle
  qu'elle s'affiche une fois posée.
- **La touche E ne peint plus**, `couleurEnMain` (la fée qui peignait au
  village) et `couleurSuivante` ont disparu. Les pilotes de la descente et de
  la montée jouent « pour le fun » avant de résoudre : le mur en vert, les
  claies en vert, puis en rouge.

### Puis : un saut sous un plafond bas éjectait

Signalé sous le surplomb de l'escalier (dalle à 2,60 du sol) : « quand je
saute, ça m'éjecte à l'extérieur ». La tête touchait la dalle et la virgule
flottante la laissait dedans de 2·10⁻¹⁶ ; le pas horizontal suivant
« résolvait » la dalle comme un mur percuté, sur sa face, douze mètres et demi
plus loin, puis le rattrapage des chutes posait le joueur sur la falaise.
**`moveAxis` ne résout plus comme un choc neuf une boîte qu'on chevauchait
déjà avant le pas** : par l'axe où l'on y est le moins enfoncé, elle ne gêne
pas un autre axe, et sur le sien elle refuse seulement qu'on s'y enfonce
davantage. La descente garde sa règle (linteau, rattrapage). Balayage de
chaque plafond bas de chaque niveau aux trois tailles : 1 124 sauts sur
43 145 éjectaient, aucun maintenant ; le harnais en rejoue un échantillon.

**Et ce que cette correction a cassé, trouvé par deux chasses aux
régressions** (cinq angles chacune, chaque trouvaille rejouée par un
sceptique — plus de six millions d'essais contre les murs, cent mille sous
les linteaux, vingt mille traversées de portes) : un contact latéral
laissait le corps dedans d'un ulp, qui survivait désormais au saut, et la
chute posait le joueur sur le poteau du hall (6,40 m) ou un pilier du
belvédère (21 m) ; une porte qui dépose les pieds dans l'estrade d'arrivée
les y laissait. Tenus maintenant par cinq règles de `physics.ts`, chacune
gardée au harnais (bloc « Ce que la chasse aux régressions a trouvé ») et
vérifiée par mutation :
- **toute résolution pose au contact exact**, un ulp à la fois
  (`auRasDessous`, `auRasDessus`) — la source même de l'ulp du plafond ;
- **un mur n'est pas un sol** : la descente ignore une boîte touchée par le
  flanc ou par-dessous, sauf une dalle où les pieds mordent d'une marche ;
- en montant, **jamais repoussé vers le bas** au-delà d'un arrondi ;
- **des pieds enfoncés par le dessus dans le décor fixe** (jamais une caisse
  en vol) sont reposés dessus (`reposerSurLeSol`), dès l'arrivée d'une
  porte et au premier pas qui suit.
Au passage, l'ancien moteur avait encore une catapulte : sauter devant une
porte à linteau bas posait sur le linteau, et lancé on passait le mur.
Reste connu, hors d'atteinte en jouant : la grande face de la lucarne dorée
recoupe la pyramide à degrés de la vallée ; on n'y arrive dedans qu'à une
taille que le parcours ne permet pas.

### Puis, le 25 : cinq retours de partie

- **Recommencer l'aventure**, depuis la carte de titre : un lien discret,
  seulement s'il y a quelque chose à effacer, en deux temps (« Effacer les
  couleurs rapportées et les chapitres finis ? Oui · Non »). Efface la
  sauvegarde en usage (jeu, ou débug) et les toiles ; garde les notes du
  protocole ; ramène au hall.
- **Un pinceau endormi dit qu'il se saisit** : la première fois à portée,
  « Appuie sur E, la touche d'action, pour saisir le pinceau. Elle sert aussi
  à prendre les autres objets. » ; ensuite « E — Saisir le pinceau ».
- **Les bordures qui clignotaient** : deux faces dans le même plan (le dallage
  de la place et sa bordure, x = 19) se disputaient la profondeur, et des
  centaines de paires à quelques millimètres dans tous les niveaux font de
  même au-delà de cent mètres. Le rendu départage (`rangsDesFaces`, attribut
  `aPriorite`) : la face qui avance gagne, à égalité le détail sur la masse,
  d'un pas constant dans l'espace de la profondeur. Mesuré à l'écran.
- **Un chapitre ne s'achève pas sans sa couleur** (`voyage.ts`, `RAPPORTE`,
  `EXIGE`, `OU_DORT`) : on finissait la descente sans réveiller le bleu, et la
  montée devenait infinissable. Le but se réarme en disant où dort la
  couleur ; l'arche renvoie au chapitre dont la couleur manque ; la carte de
  la montée sans bleu le dit, avec le lien.
- **Ce qu'on porte bute contre une porte qu'il ne passe pas** (trop grosse,
  scellée, ou de dos) : la vrille de 2 m d'un géant entrait dans une petite
  face et le rendu la tranchait en deux. Une pièce qui passe passe toujours
  la première — c'est ainsi qu'on dépose par une porte trop petite pour soi.

- **La boîte à formes se joue de bout en bout au harnais** (cinq pièces,
  cinq creux, les deux portes). Signalé : « il me reste une pièce chirale et
  pas de gros cube ». Le creux qui n'exigeait QUE la main (1,92, n'importe
  quelle forme) était dessiné en cube, montants compris ; une main d'encre à
  plat n'a pas mieux tenu (« dans la boîte à formes, c'est pas normal ») : il
  exige et dessine maintenant la VIS de la main droite, comme au banc
  (`banc-main`). Son refus dit « c'est l'autre main ». Le pilote a
  aussi trouvé qu'un bloc visé sur la planche ne trouvait « pas de place » :
  une pièce qui mord dans une surface par-dessus y est reposée.
- **Le pinceau bleu se voit** (« je vois pas où est le pinceau bleu dans la
  descente »). Seuls le vert et le rouge avaient un corps : les veilleurs des
  chapitres (`pinceau-bleu`, `pinceau-or`, celui du banc) n'étaient dessinés
  nulle part. Ils sont plantés là où ils dorment, touffe hors de l'eau
  (`compagnons` dans `main.ts`), et s'éveillent en compagnon. Et la porte de
  la lucarne était plantée AU CENTRE de la vasque, sur le pinceau, face au
  nord : de la grève on la voyait par la tranche, et sa feuille couvrait le
  bleu. Elle est sur le sable juste derrière la vasque, tournée vers la pente
  (`BOL.sortie`, lacet est) : ruisseau, vasque, pinceau, porte, d'un regard.
- **Le poteau d'en face se voit à travers la porte** (revenu, signalé une
  seconde fois). Pour ôter une poutre noire en travers de la vue, on avait
  caché TOUT le cadre de la face jumelle dans le rendu d'une porte : on ne
  voyait plus que la moitié de chaque poteau, et en passant le rouge
  disparaissait pendant que le bleu surgissait. Seule la traverse d'encre de
  la jumelle est cachée désormais (`setTraverseVisible`) ; ses montants et son
  linteau prolongent ceux d'ici, rouge devant, indigo derrière.
- **La vue ne bondit plus vers le ciel ou vers les pieds** (« parfois ça
  saute d'un coup »). Sous Windows, Chrome simule la capture en recentrant un
  curseur invisible ; un mouvement traité après ce recentrage rapporte 35 % de
  la fenêtre d'un coup (crbug 40547981, pire à 1 000 Hz). Horizontalement,
  580 px : le seuil fixe de 320 les jetait. Verticalement, pour une zone de
  jeu de 905 px, 317 : ils passaient. Désormais la capture est BRUTE sous
  Windows (`unadjustedMovement` : plus de recentrage, plus d'accélération de
  Windows), avec repli sur l'ordinaire ; ailleurs le seuil vaut un quart de la
  fenêtre par axe (au plus 320, corrigé du zoom de la page) ; et l'on jette
  80 ms après la capture, pas un seul événement. Relu par trois agents, qui ont
  fait ajouter : un refus ne se compte plus deux fois ; trois refus d'affilée
  sur un ordinateur le DISENT sur la carte (`#refus-souris`) au lieu de
  basculer en commandes tactiles ; un clic de souris reprend la capture en
  commandes tactiles (portable à écran tactile) ; trente écarts nuls en brute
  (bureau à distance, machine virtuelle, stylet) repassent en ordinaire ; le
  jeu qui rend la souris exprès (`input.rendre()` : carnet, fin, sacre) n'est
  plus repris par une tentative programmée ; les notes du carnet ne sont plus
  lues comme des commandes (« r » relançait le niveau). Réglages par
  l'adresse, gardés : `?sens=`, `?souris=ordinaire|brute` (voir PROTOCOLE).
  En `?debug=1`, le compteur d'images dit « souris brute » ou « ordinaire » et
  combien d'écarts aberrants ont été jetés (le dernier en info-bulle). Reste à
  faire, non fait : la vue suit la simulation à 60 Hz, donc à 127 images/s
  une image sur deux répète l'angle précédent (léger saccadé du regard).

### Puis, le 26

- **Le rattrapage ne boucle plus** (« je réapparais, je reglisse, et ça me
  remet au bord du terrain en boucle »). L'appui se notait après douze images
  debout, pas d'affilée : la première image sur une arête, en tombant, pouvait
  devenir l'appui, et rien n'y renonçait jamais. Désormais (`appuiSur`,
  `choisirRetour` dans `simulation.ts`) : douze images debout d'affilée, le sol
  sous le CENTRE du corps et le corps hors de la pierre ; huit appuis gardés ;
  deux rattrapages sans appui sûr entre eux, ou trois retours au même endroit
  en une demi-minute, font oublier l'endroit et remonter d'un cran, jusqu'au
  départ du niveau. Cinq vérifications, qui échouent sur l'ancien code.
- **La chasse du 26 : sortir du décor sans porte.** 230 000 parcours, 40
  millions d'images, tous les niveaux et toutes les tailles : rien ne traverse
  un sol ni un mur. Deux trous et une échelle, corrigés et tenus par trois
  vérifications : le DOS D'UNE PORTE ramenait le joueur sans collision, dans
  la pierre (vallée ×16, on traversait deux gradins) — la vitesse est
  maintenant freinée AVANT le pas (`freinerDevantLeDos`) ; un PAS « réussi »
  au-dessus du vide se déclarait posé (`physics.ts`, on n'est posé que si la
  descente touche) ; les MAINS D'ENCRE étaient des corniches solides — elles
  sont fantômes. Et `reposerSurLeSol` ne prend plus un flanc pour un sol en
  ressortant d'une porte.
- **Question ouverte, de conception** : beaucoup de dalles n'ont pas de bord
  (le hall à ±70, la boîte à formes, le lavoir, le conduit, les toits, le
  plateau de l'escalier, la rive, le seuil). La règle 6 du contrat demande des
  balustrades plus hautes que le saut ; aucune vérification ne la tient. Le
  rattrapage rend la chute sans conséquence, mais c'est la façon la plus
  probable de « sortir du sol ».

## Ce qui reste à faire

Rien de bloqué. Tous décrits dans `IDEES.md` et `CONCEPTION.md`.

- **Rejouer la montée sur le PC** : la cadence (lire le compteur en haut à
  gauche), la netteté des portes au loin, le refus à miroir plan, le
  blanchiment.
- **Confirmer à l'œil les corrections du 25** : la souris sous Windows (le
  compteur dit « souris brute » en débug), le pinceau bleu dans la vasque, la
  boîte à formes jusqu'au coffre, le plafond bas, la bordure de la place. Le
  clignotement des plaques au même niveau a reçu sa réponse globale
  (`rangsDesFaces`) : reste à voir qu'il ne revient nulle part.
- **Petites améliorations prêtes, sur demande** : un réglage de sensibilité
  sur la carte de titre (aujourd'hui `?sens=`) ; dessiner le regard avec le
  dernier angle de la souris et non celui de la simulation à 60 Hz (à 127
  images/s, une image sur deux répète l'angle) ; compiler les matériaux sous
  la carte de titre, pour qu'aucune première apparition ne gèle une image.

- **Jouer.** Quatorze lieux n'ont jamais été vus par un œil humain qui joue.
- **Le monde retourné** (les portails de gravité) : la fin que le troisième
  mouvement n'a pas encore — le seuil tient la place. Décidé, pas bâti.
- **L'énigme chromatique** à quatre paliers. La peinture libre change la
  donne : un palier 4 peut demander « plus de couleurs qu'on n'en a »
  maintenant que tout se repeint et se lave.
- **Garder la peinture** d'une partie à l'autre (aujourd'hui, recharger ou `R`
  rend le décor au lavis) ; et la partager dans le hall à plusieurs.
- **Brancher la fin à deux dans le hall** (`lobby.ts`, les deux dalles).
- **Essayer le duo à deux vraies machines.**
- **Deux nettoyages gratuits** : onze mètres de roche pleine dans l'escalier et
  des parapets à 9,40 dans l'atelier du haut, qui ne protégeaient que du
  ramassage à travers les murs, corrigé depuis.

## La fin

Quand le second pinceau a repeint sa part du monde, l'encre remonte à la pointe
de l'Aiguille — qui est la plume de ce monde — et la caméra prend du recul sur
quatre cents mètres pendant quatorze secondes. Le brouillard s'ouvre alors de
300 à 1500, et **des montagnes apparaissent**. Le titre vient aux deux tiers du
plan, APRÈS ce qu'il nomme.

## Deux leçons de méthode qui ont coûté cher

**Un test qui échoue sur une durée ne mesure pas le monde.** `walkTo`
maintient la touche de saut pendant TOUTE la durée qu'on lui donne ; d'où
`bondirVers`, qui relâche le saut dès qu'il est posé. Et un pilote qui
aborde une porte en diagonale coupe son plan hors du cadre : on aborde de face.

**Un décalage appliqué avant la matrice du modèle est mis à l'échelle avec
lui.** Le contour est une coque gonflée en coordonnées locales ; le shader
divise par l'échelle portée par la matrice (`src/render/ink.ts`). La même
méprise, par l'autre bout, a donné un trait quatre fois trop épais à travers un
miroir — et une pièce quinze centimètres dans le plancher.
