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

## État au 23 septembre 2026

`npm run check` : **790 vérifications, tout passe.** `npm run build` passe.
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
  *Le site se publie depuis `main` ; tant que la branche de cette nuit n'y est
  pas fusionnée, il montre l'état du 4 août.*
- `?niveau=monde` — le voyage d'introduction. Il repart toujours du gris
  (`&neuf=1` ne sert qu'avec `&debug=1`).
- `?niveau=descente` — sept salles, on y cherche le bleu.
- `?niveau=montee` — sept salles, on y cherche l'or.
- `?niveau=mesure` — **NEUF** : trois salles, on y perd la taille.
- `?niveau=formes` — la boîte à formes, l'examen.
- `?niveau=banc` — le banc d'essai, treize stations, une par chose que personne
  n'a vue. **C'est par là qu'il faut commencer.**
- `?niveau=reve&graine=7` — le rêve génératif.
- `?niveau=duo&salon=…&role=geant|minuscule` — l'aventure à deux, jamais
  essayée à deux vraies machines.

**`?debug=1` — LES REPÈRES.** Sur le hall, le monde, la descente, la montée,
la mesure, la boîte à formes et le banc (pas sur la cour, la caisse, le duo ni
le rêve). Une touche par moment du voyage, chaque ligne dit ce qu'il faut
regarder là et POURQUOI on le regarde.
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
2. **Les deux salles chirales de la montée se jouent au lancer.** Depuis que le
   monde bascule avec le joueur, PORTER une pièce à travers un miroir ne la
   retourne plus ; seul LE LANCER le fait. Le creux qui refuse et le
   blanchiment reposaient sur le portage — le commit qui a posé la règle
   l'admettait, « à réécrire autour du lancer » — et personne ne l'avait fait.
   Le blanchiment a maintenant une **chatière** (un miroir de 1,20 qu'on ne
   franchit pas, qu'on vise), des **mains d'encre** de part et d'autre de
   chaque ouverture, et un **ciel de verre** sur les deux cours pour qu'une
   vrille lancée ne parte jamais par-dessus le mur. Un pilote joue les deux
   salles jusqu'à la porte de sortie.
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

## Par où commencer demain matin, dans l'ordre du risque

Tout ce qui suit est PROUVÉ en simulation et n'a été vu qu'en captures
d'écran fixes, à une image par seconde. Personne n'a joué. Voir `PROTOCOLE.md`
pour le détail de chaque station.

0. **Le fil, tel qu'un joueur le suivra** : le hall, l'arche « Seul », le
   monde jusqu'au sacre, « Descendre », la descente jusqu'au bleu, « Monter »…
   et, entre deux, fermer l'onglet, rouvrir le hall, voir la carte dire
   « Suite : la montée » et l'arche y mener.
1. **`?niveau=banc&debug=1`** — le banc d'essai, treize stations en une marche.
   Il dit en une demi-heure si les corrections du moteur tiennent à l'œil.
2. **`?niveau=montee&debug=1`, touches `2` et `3`** — le creux qui refuse et le
   blanchiment, réécrits l'avant-veille et relus la veille. Le geste à juger :
   lancer la vrille dans une porte, la voir ressortir retournée ; la ramasser,
   la POSER (lancée à côté du creux, elle n'y entre pas toute seule). Et le
   refus qui parle, phrase par phrase. Puis la touche `5`, l'atelier du haut :
   dire le rouge aux pots, le bleu aux tuiles, et voir la porte de la vallée
   se dessiner.
3. **`?niveau=mesure&debug=1`** — le troisième mouvement, jamais joué. La rive
   (lever les yeux de 23° et lâcher), le grain (est-ce qu'on ne sait VRAIMENT
   plus quelle taille on fait ?), le seuil.
4. **`?niveau=descente&debug=1`, touche `0`** — la cour de pluie, sous la
   pluie. La nappe de l'auvent, le jet du puits, l'égouttement du banc.
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
           bol ×1→×1/4 · pluie ×1/4 (détour) · lucarne bleue
montée     toits ×4 · refus ×1→×4 · blanchiment ×1 · escalier ×4→×1 ·
           atelier du haut ×4 · vallée ×16 · lucarne dorée
mesure     rive ×4 · grain ×1 (on y tombe, on ne remonte pas) · seuil ×1/4
```

Une porte ne vaut qu'un cran : la sortie d'une salle et l'entrée de la suivante
diffèrent d'exactement un palier. C'est vérifié.

## La règle du miroir, telle qu'elle est aujourd'hui

Un miroir bascule le MONDE avec le joueur (`PlayerState.gauchere`). Donc :

- ce qu'on **porte** à travers un miroir garde sa main (l'écart reste nul) ;
- ce qu'on **lance** à travers change de main, et de taille comme tout ;
- une porte ordinaire ne retourne rien, porté ou lancé.

D'où le blanchiment : la main ne change qu'à la chatière, et jamais sans la
taille ; la taille se corrige à la porte ordinaire, sans toucher à la main. Les
mains d'encre sur les murs (`src/levels/mains.ts`) sont l'étalon de la main,
comme la petite face de 2,80 est l'étalon de la taille.

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

## Ce qui reste à faire

Rien de bloqué. Tous décrits dans `IDEES.md` et `CONCEPTION.md`.

- **Jouer.** Quatorze lieux n'ont jamais été vus par un œil humain qui joue.
- **Le monde retourné** (les portails de gravité) : la fin que le troisième
  mouvement n'a pas encore — le seuil tient la place. Décidé, pas bâti.
- **L'énigme chromatique** à quatre paliers.
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
