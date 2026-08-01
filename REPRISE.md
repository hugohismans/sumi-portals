# Où j'en suis

Note de passation, à lire en premier si tu reprends ce projet dans une session
neuve. Le reste du contexte est dans les messages de commit et dans `IDEES.md`,
tous deux écrits pour être lus par un humain.

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

## État au 2 août 2026

`npm run check` : **131 vérifications, tout passe.** `npm run build` passe.

- **https://hugohismans.github.io/sumi-portals/** — le hall, trois arches
- `?niveau=monde` — le voyage. Ajouter `&neuf=1` pour oublier les couleurs déjà
  rapportées : sans ça, on recharge, on voit des couleurs dans un monde censé
  être en lavis, et l'on croit qu'un correctif n'est pas passé.
- `?niveau=reve&graine=7` — le rêve génératif
- `?niveau=duo&salon=…&role=…` — l'aventure à deux (jamais essayée à deux vraies
  machines : c'est le premier essai à mener)

**`?niveau=monde&debug=1` — LES REPÈRES.** Douze moments du voyage, une touche
chacun, et chaque ligne dit ce qu'il faut regarder là. `=` déclenche le sacre
tout de suite. `H` replie la liste. À lire avant de vérifier quoi que ce soit :
vérifier la teinte du pinceau vert demandait sinon quatre minutes de trajet,
deux portails et deux détours — donc on ne le vérifiait pas, donc on ne
trouvait les défauts qu'en jouant par hasard. Voir `src/debug/reperes.ts`, et
en particulier pourquoi certains sauts RECHARGENT la page.

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
étant DÉJÀ à ×4. Les deux détours ne peuvent donc pas se faire au même moment.
Le rouge d'abord, avant même d'avoir appris à grandir ; le vert ensuite, parce
qu'il l'exige.

**ON NE RAMASSE RIEN : ON RÉVEILLE QUELQU'UN.** Chaque pinceau dort au bout de
son monde. On appuie sur E, il s'éveille, il tourne autour de nous et nous suit
jusqu'au village — et là il nous quitte pour repeindre sa part du monde.

**Et il n'accepte que la taille de son monde.** Trop grand, il est minuscule
entre nos doigts ; trop petit, on ne peut pas le lever. Il frémit et reste
planté. C'est cette règle, et elle seule, qui relie le VERBE du jeu (changer de
taille) à son BUT (rendre les couleurs) — sans elle on pourrait remplacer les
couleurs par des clés sans que rien change. Voir `veilleurs` dans
`src/core/types.ts`.

La taille raconte aussi le voyage : le vert dort à 0,55 dans un monde qu'on
parcourt à ×1 et ressort quatre fois plus grand ; le rouge dort à 2,20 dans un
monde qu'on parcourt à ×4 et ressort quatre fois plus petit. Grand socle, petit
socle — et les deux étaient plantés vides sur la place dès la première minute.

## Les pièges appris à la dure

Ils sont dans `src/levels/regions/contrat.ts` (7 règles) et dans les
commentaires. Les cinq qui ont coûté le plus cher :

1. **Deux faces ne doivent jamais coïncider.** Vérifié automatiquement
   (`src/core/coplanaires.ts`, seuil 0,25 m², uniquement les faces EXPOSÉES).
   A mordu six fois.
2. **Un portail déjà franchi doit rester DERRIÈRE soi**, sinon on le retraverse
   en allant chercher la suite.
3. **Les deux faces d'une paire n'ont pas le même lacet.** Deux fois le même
   bug : on ressort dos au monde d'arrivée et le premier pas renvoie d'où l'on
   vient.
4. **Pas d'accent dans un identifiant GLSL.** `float encrée` a fait disparaître
   TOUS les portails du jeu, sans qu'aucune vérification puisse le voir — un
   shader ne se compile que dans un navigateur. D'où `npm run preview`.
5. **À grande échelle, la portée du bras est énorme.** Un joueur à ×4 repose ce
   qu'il porte à huit mètres devant lui. Toute surface où l'on doit poser
   quelque chose doit être plus large que ça, sinon le niveau est infaisable et
   rien ne le laisse voir.

## Ce qui reste à faire

Rien de bloqué : ce sont des chantiers, pas des impasses. Tous décrits en détail
dans `IDEES.md`.

- **La suite de niveaux**, à la *Portal 2* mais sans ascenseur : le pinceau
  dessine le portail du monde suivant, et l'on ne passe qu'une fois dessiné.
  La mécanique du tracé existe déjà (`src/render/tracage.ts`) et sert sur la
  seconde porte du monde.
- **L'énigme chromatique** : un tableau montre l'état où la pièce devrait être,
  on clique sur un élément et toute sa famille prend cette couleur. Enseigner
  par paliers — une couleur, puis deux, puis trois.
- **Les objets composites** (quelques blocs, chacun sa teinte). Un seul
  chantier, et il débloque la molécule chirale, la boîte à formes et l'objet
  chiral coloré.
- **Les portails de gravité**, pour le monde du plafond — dont le socle
  retourné est déjà planté sur la place, en promesse.
- **Essayer le duo à deux vraies machines.**

## La fin

Quand le second pinceau a repeint sa part du monde, l'encre remonte à la pointe
de l'Aiguille — qui est la plume de ce monde — et la caméra prend du recul sur
quatre cents mètres pendant quatorze secondes.

Le brouillard s'ouvre alors de 300 à 1500, et **des montagnes apparaissent** :
elles sont plantées à six cents mètres et au-delà, donc invisibles pendant toute
la partie. On croyait avoir fait le tour du monde ; il continue. Le titre vient
aux deux tiers du plan, APRÈS ce qu'il nomme.

## Le piège qui reste, et qu'on a choisi de garder

Sur le tas de feuilles, l'écart entre deux rangées fait 0,70 et le joueur 0,68.
Un centimètre de battement : on peut se faufiler SOUS une rangée et s'y trouver
à l'étroit. Vérifié depuis les cinq vires, on en ressort toujours en marchant
plein sud — la règle « ne jamais piéger » tient. Mais c'est le point le plus
juste de tout l'ouvrage, et il ne s'élargit pas sans concession : la mesure au
banc donne `largeur/2 + écart ≤ 1,80` pour une montée de 1,00, et on y est
exactement. Élargir l'écart oblige à rétrécir la feuille, donc à durcir la
réception.

## Deux leçons de méthode qui ont coûté cher

**Un test qui échoue sur une durée ne mesure pas le monde.** Le marcheur du
harnais montait 1 appui sur 21 et j'ai cru la géométrie fausse. `walkTo`
maintient la touche de saut pendant TOUTE la durée qu'on lui donne : une fois
l'appui atteint, le joueur continue de rebondir trente secondes, un rebond
conserve l'élan horizontal, il dérive et tombe. Même géométrie, quatre secondes
par point au lieu de quarante : 21 sur 21. D'où `bondirVers`, qui relâche le
saut dès qu'il est posé.

**Un décalage appliqué avant la matrice du modèle est mis à l'échelle avec
lui.** Le contour est une coque gonflée en coordonnées locales : tout objet mis
à l'échelle recevait un trait multiplié par son échelle, et deux fichiers
compensaient à la main sans que personne ne remarque que le reste du décor ne
compensait rien. Le shader divise maintenant par l'échelle portée par la
matrice (`src/render/ink.ts`).
