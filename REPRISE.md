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

`npm run check` : **137 vérifications, tout passe.** `npm run build` passe.

- **https://hugohismans.github.io/sumi-portals/** — le hall, trois arches
- `?niveau=monde` — le voyage. Ajouter `&neuf=1` pour oublier les couleurs déjà
  rapportées : sans ça, on recharge, on voit des couleurs dans un monde censé
  être en lavis, et l'on croit qu'un correctif n'est pas passé.
- `?niveau=reve&graine=7` — le rêve génératif
- `?niveau=duo&salon=…&role=…` — l'aventure à deux (jamais essayée à deux vraies
  machines : c'est le premier essai à mener)

## Le parcours de l'introduction, et pourquoi il est dans cet ordre

```
hall : trois leçons sans un mot
  le pinceau à trois pas → on le rejoint
  sur un plot de 2,70    → hors d'atteinte : GRANDIS
  sous une dalle de 0,75 → ni géant ni normal : RAPETISSE
  devant trois arches    → on choisit

village (×1), tout est gris
  tour du propriétaire : puits, marché, étang
  CÔTE ROUGE   ×1 → ×4 là-bas → retour à ×1, avec la braise (menue)
  terrasse     ×1 → ×4
  le toit du village, revu en géant   ← le cœur du jeu
  JARDIN       ×4 → ×1 là-bas → retour à ×4, avec l'encrier (gros)
  la seconde porte, que le pinceau dessine tache par tache
  belvédère    ×4 → ×16
  l'éperon, la pointe de l'Aiguille, le sacre
```

**L'ORDRE N'EST PAS UN GOÛT.** On entre dans la côte rouge par une PETITE face :
il faut mesurer 1,80. On entre utilement dans le jardin par une GRANDE face, en
étant DÉJÀ à ×4. Les deux détours ne peuvent donc pas se faire au même moment.
Le rouge d'abord, avant même d'avoir appris à grandir ; le vert ensuite, parce
qu'il l'exige.

Et la taille de ce qu'on rapporte raconte le voyage : petit là-bas donc gros au
retour, grand là-bas donc menu. Les deux socles, plantés vides sur la place dès
la première minute, annoncent cet écart avant qu'on ait fait un seul voyage.

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

## Une observation à trancher un jour

Le jardin a été bâti pour un joueur à ×1/4, mais le parcours prévu le fait
traverser à ×1 — c'est ce qui rend l'encrier soulevable. Entrer trop petit
donne donc la version SPECTACULAIRE du lieu (une forêt d'herbe) mais un objet
trop lourd ; entrer bien grandi donne un jardin plus sage et un objet qu'on peut
prendre. C'est défendable — le spectaculaire est ce qu'on voit quand on se
trompe — mais ce n'était pas voulu, et ça mérite d'être décidé.
