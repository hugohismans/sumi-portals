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

## État au 1er août 2026

Jouable de bout en bout. `npm run check` passe, `npm run build` passe, tout est
poussé et en ligne.

- **https://hugohismans.github.io/sumi-portals/?niveau=monde** — le monde
- **https://hugohismans.github.io/sumi-portals/** — le lobby multijoueur

## La prochaine tâche, déjà prête

`src/levels/regions/jardin.ts` est écrit, calibré pour un joueur à **×1/4**, et
vérifié — mais **pas encore relié au monde**. Il lui manque une paire de
portails.

Ce qu'il faut faire :

1. Ajouter une troisième paire dans `MONDE.portals`. Le **grand** portail va
   dans le village, le **petit** à l'entrée du jardin : c'est ce sens-là qui
   rapetisse.
2. Le jardin attend qu'on le dépose en `[310, 0, 0]` et qu'on en reparte en
   `[510, 0, 0]` (voir `entree` / `sortie` dans le fichier).
3. **Vérifier d'abord que le grand portail ne traverse aucune maison** — le
   village occupe x[-90,90], z[-110,16], et un grand portail fait 11,2 de haut.
   C'est la seule raison pour laquelle ce n'est pas déjà fait.
4. Ajouter `...JARDIN.boxes` aux boîtes et `JARDIN.region` aux régions, comme
   c'est fait pour `TERRASSE` et `BELVEDERE`.
5. Le laisser **hors du guide du pinceau** : c'est un détour facultatif, pas
   une étape du voyage. Le rendre obligatoire changerait la forme du jeu.

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

- Brancher le jardin (ci-dessus)
- Portails miroirs — inverser la chiralité, clin d'œil aux molécules chirales.
  Risque technique réel : une réflexion inverse le sens des faces, le rendu
  doit suivre.
- Portails de gravité — entrer au sol, ressortir au plafond. Demande de lever
  deux hypothèses du moteur : les portails sont des plans verticaux, et la
  gravité va toujours vers −Y.
- Les deux arches du lobby : aventure solo et aventure à deux, avec salle
  d'attente
- Le mode rêve / backrooms génératif
- La grue en papier, à cacher quelque part dans le voyage

Les idées et leurs raisons sont dans `IDEES.md`.
