# Où j'en suis

Note de passation, à lire en premier si tu reprends ce projet dans une session
neuve. Le reste du contexte est dans les messages de commit, écrits pour être
lus par un humain.

## Le jeu

Un jeu de portails qui changent votre taille. Deux portails reliés, de tailles
différentes : franchir le grand vous fait ressortir quatre fois plus petit par
le petit, et l'inverse. Vue à la première personne, style encre / manga façon
Ōkami. Ça tourne dans un navigateur, y compris sur téléphone (60 images/s
mesurées sur iPhone 14 Pro Max).

Ce n'est pas une série de niveaux : **un seul monde continu**. On monte
d'étage en étage en grandissant, et chaque étage donne à voir le précédent
d'en haut, minuscule. Village (×1) → terrasse (×4) → belvédère (×16).

Le fil du jeu est **le Pinceau** : un personnage qui vole de station en
station. Il passe là où on ne peut pas marcher, et c'est cet écart qui fait
l'énigme. Ce n'est pas un système d'indices, c'est le jeu.

## État au 2 août 2026

Jouable de bout en bout, dans les trois modes. `npm run check` passe (83
vérifications), `npm run build` passe, tout est poussé et en ligne.

- **https://hugohismans.github.io/sumi-portals/** — le hall, et ses trois arches
- `?niveau=monde` — le voyage en solitaire, village → terrasse → belvédère
- `?niveau=reve&graine=7` — le rêve, onze salles en anneau

**Le hall a trois sorties**, distinguées par leur forme et non par un texte :
une ouverture simple pour partir seul, deux ouvertures jumelles pour partir à
deux, une arche de guingois pour le rêve.

**L'aventure à deux** (`src/levels/duo.ts`) fait commencer l'un géant et
l'autre minuscule ; chacun descelle la porte de l'autre, et le but est de se
retrouver à la même taille, chacun sur sa dalle. Le rendez-vous ne demande
aucun serveur : chacun trie la file d'attente par ancienneté et trouve le même
partenaire tout seul (`src/core/salons.ts`).

**Ce qui n'a jamais été essayé à deux vraies machines** : tout le duo. La
logique est vérifiée sous Node, l'appariement comme les énigmes, mais deux
joueurs réels dans le même salon, personne ne l'a encore fait. C'est le premier
essai à mener.

## À REGARDER EN PREMIER : le rendu du miroir

Les portails miroirs sont écrits, et leur **géométrie est prouvée** par
`npm run check` : le trièdre s'inverse bien, deux passages rendent la forme
d'origine. Ça, c'est sûr.

En revanche, **le rendu n'a PAS été vérifié à l'œil**, et il faut le dire :
le volet d'aperçu qui me sert à regarder le jeu fige l'animation dès qu'il
n'est pas au premier plan, et ne permet pas de zoomer. Je n'ai pas voulu
prétendre avoir validé quelque chose que je n'ai pas vu.

Deux choses ont été écrites pour ce cas, et ce sont elles qu'il faut éprouver :

1. `src/render/portalRenderer.ts` inverse le sens de parcours des triangles
   (`gl.frontFace`) pendant la passe d'un portail miroir. Sans ça, on verrait
   l'intérieur des murs à travers le miroir.
2. La caméra virtuelle d'un miroir **n'est pas décomposée** en position et
   rotation — une réflexion a un déterminant négatif et `decompose` la rend
   fausse. Sa matrice est posée telle quelle, et le chemin ordinaire est resté
   intact pour ne rien casser de ce qui marchait.

**Comment l'éprouver en trente secondes** : ajouter `miroir: true` à la paire
`hall` dans `src/levels/lobby.ts`, ouvrir le jeu, se placer devant le grand
torii. Si le décor vu à travers paraît normal (les volumes pleins, les murs
opaques), c'est bon. S'il paraît retourné ou évidé, c'est le point 1 qui
cloche. S'il part de travers, c'est le point 2.

## La prochaine tâche, déjà prête

**La molécule chirale.** Tout ce qui est dessous d'elle est fait : les portails
miroirs, le champ `main: 'L' | 'D'` sur les objets et sur les logements, la
bascule à chaque passage, et le refus du logement quand la main est mauvaise.
Il ne manque que **la forme**, et elle n'est pas décorative : une énigme de
chiralité où l'objet paraît symétrique n'est pas une énigme, c'est une
devinette. Il faut qu'on VOIE de ses yeux que les deux versions diffèrent.

Ce qui bloque : les objets transportables sont aujourd'hui des cubes, et leur
géométrie est recoupée à la volée pour la moitié qui dépasse d'un portail (voir
`src/render/carryableViews.ts`). Y glisser une molécule demande de généraliser
ce découpage, ce qui n'est pas anodin — c'est pour ça que ça n'a pas été fait
à la va-vite en fin de nuit.

Conseil déjà noté dans IDEES.md, et il tient toujours : quatre ou cinq boules,
des liaisons franches, une couleur par atome, et l'asymétrie évidente à l'œil.

## Les pièges appris à la dure

Ils sont documentés en détail dans `src/levels/regions/contrat.ts` (7 règles) et
dans les commentaires de `monde.ts`. Les deux qui coûtent le plus cher :

- **Deux faces ne doivent jamais coïncider.** Dans un monde de boîtes, deux
  surfaces exactement dans le même plan se disputent la profondeur et
  grésillent. Qu'une pièce morde sur l'autre de 10 cm, ou s'en écarte
  franchement. C'est le défaut le plus fréquent du projet.
- **Un portail déjà franchi doit toujours rester DERRIÈRE soi.** Sinon on le
  retraverse en allant chercher la suite, et l'on rapetisse, renvoyé en
  arrière. C'est ce qui a imposé l'ordre actuel des stations du pinceau.

## Ce qui reste à faire

- **La molécule chirale** (ci-dessus) — la forme, le reste est fait
- **La boîte à formes** — un logement qui exige la bonne forme en plus de la
  bonne taille et de la bonne main. Le champ `main` existe déjà ; il faudrait
  lui adjoindre `forme`. Ne pas cumuler les trois contraintes d'emblée : une
  seule par pièce, croisées sur la dernière.
- **Essayer le duo à deux vraies machines**
- Portails de gravité — entrer au sol, ressortir au plafond. Demande de lever
  deux hypothèses du moteur : les portails sont des plans verticaux, et la
  gravité va toujours vers −Y.
- Les deux arches du lobby : aventure solo et aventure à deux, avec salle
  d'attente
- Le mode rêve / backrooms génératif
- La grue en papier, à cacher quelque part dans le voyage

Les idées et leurs raisons sont dans `IDEES.md`.
