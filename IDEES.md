# Idées à garder

Carnet de pistes. **Rien ici n'est décidé ni planifié** — c'est un réservoir
dans lequel piocher quand on fabriquera le monde.

---

## LA DIRECTION : un voyage, pas une succession de niveaux

*(idée d'Hugo — celle-ci n'est pas une piste parmi d'autres, elle commande
tout le reste)*

Pas de « niveau 1 — bravo — niveau 2 ». **Un seul grand monde continu**, dans
lequel on avance en franchissant des portails. On grandit, on rapetisse, et
l'on retrouve les lieux d'avant sous un autre jour.

Le cœur de l'idée, et ce qui la rend unique : **on revoit d'en haut le monde
qu'on vient de traverser.** La place où l'on marchait devient une maquette à
ses pieds. Le perron qu'on montait devient une marche. Ce n'est pas un décor
qui change, c'est le même, relu.

Ce que ça implique concrètement :

**Le monde doit être bâti pour être lu à plusieurs échelles.** Un lieu ne
sert pas une fois : il doit valoir le détour à ×1 comme à ×4. C'est une
contrainte de tracé, pas de moteur.

**Les portails deviennent des passages, pas des interrupteurs.** Après avoir
grandi, on doit se retrouver EN SURPLOMB de là où l'on était — c'est ce
surplomb qui produit le vertige. Un portail mal placé perd tout l'effet.

**Plus d'écran de victoire.** L'objectif n'est plus un anneau à toucher mais
un lieu à atteindre, qui en ouvre un autre. Les réceptacles font de très
bonnes serrures : on cherche une caisse, on l'accorde à la bonne taille, et
un passage s'ouvre.

**Deux aventures, pas une.** Une pour le joueur seul, une conçue pour deux —
et la seconde n'est pas la première avec un camarade en plus. Voir plus bas.

Bonne nouvelle côté technique : **rien à changer au moteur.** Un monde n'est
qu'un jeu de données plus grand. Ce qui change, c'est la manière de le
dessiner sur le papier.

---

## Portails miroirs — la chiralité

*(idée d'Hugo)*

Une paire de portails qui, en plus ou à la place du changement d'échelle,
**inverse la gauche et la droite**. On y fait passer un objet pour obtenir son
image miroir, et c'est cette version-là, et elle seule, qui s'emboîte dans un
logement prévu pour elle.

C'est la meilleure piste du carnet, pour trois raisons :

- **Elle enseigne une vraie idée.** La chiralité — une forme qu'on ne peut pas
  superposer à son reflet, comme une main gauche et une main droite — est un
  concept qu'on ne peut pas expliquer avec des mots, mais qu'on comprend
  instantanément en le manipulant. Un jeu peut faire ça mieux qu'un cours.
- **Elle se voit.** Le joueur n'a pas besoin qu'on lui dise la règle : il essaie
  d'emboîter la pièce, ça ne rentre pas, il la passe par le portail, ça rentre.
- **Elle se combine avec l'échelle.** Une pièce qu'il faut à la fois retourner
  ET redimensionner, c'est déjà un puzzle à deux temps sans rien ajouter d'autre.

Note technique : le miroir n'est pas gratuit côté rendu — une transformation
qui inverse la chiralité inverse aussi le sens des faces, donc il faudra
retourner le tri des faces dans la vue du portail. À prévoir, pas à craindre.

### Le clin d'œil à la biologie

*(idée d'Hugo)*

L'objet à retourner n'est pas un cube : c'est une **molécule**, dessinée comme
sur un schéma de chimie — des atomes reliés par des liaisons, façon acide aminé.
On la présente à son logement, elle ne rentre pas. On la passe au miroir. Elle
rentre.

Et ce n'est pas qu'un joli habillage, parce que **c'est vrai**. Les protéines du
vivant sont bâties presque exclusivement à partir d'acides aminés de la forme
dite L. Leur image dans un miroir, la forme D, existe chimiquement, mais la vie
ne s'en sert pas. Une serrure biologique n'accepte qu'une seule des deux mains
de la molécule — exactement le geste qu'on demande au joueur.

Pourquoi le vivant a choisi cette main-là plutôt que l'autre reste, aujourd'hui
encore, une question ouverte.

Un joueur qui aura fait ce geste une fois comprendra, sans qu'on lui explique
rien, pourquoi une molécule et son reflet ne sont pas interchangeables. C'est
exactement le genre de chose qu'un jeu transmet mieux qu'un cours — et c'est ce
qui donnerait au niveau une raison d'exister au-delà de son énigme.

Conseil de mise en œuvre : garder la molécule **très lisible** — quatre ou cinq
boules, des liaisons franches, une couleur par atome — et rendre l'asymétrie
évidente à l'œil. Si le joueur ne voit pas de ses yeux que les deux versions
diffèrent, l'énigme devient de la devinette.

## Objets transportables

*(idée d'Hugo)*

Un objet qu'on ramasse et qu'on fait passer par un portail pour qu'il change de
taille. La grande question de conception, celle qui décide de tout le reste :

- **il change d'échelle avec le porteur** → intuitif, la pierre reste une pierre ;
- **il garde sa taille absolue** → on ramasse un caillou en étant géant, on
  redevient petit, et c'est devenu un immeuble à escalader.

La seconde est une mine à énigmes, mais elle demande d'être très claire
visuellement, sinon le joueur ne comprend pas ce qui vient de se passer.

## Coopération à deux, à des tailles différentes

*(idée d'Hugo)*

Deux joueurs, l'un géant, l'autre minuscule, qui ne peuvent résoudre l'énigme
qu'ensemble. C'est la vraie raison d'être du multijoueur ici : pas « le même
jeu à plusieurs », mais **un jeu qui n'existe pas en solo**.

Quelques formes que ça peut prendre :

- le géant soulève un pont ; le petit passe dessous, dans un passage que le
  géant ne pourra jamais emprunter ;
- le petit se faufile dans un mécanisme et l'ouvre de l'intérieur ;
- le géant porte le petit dans sa main pour lui faire franchir un gouffre ;
- un objet qu'aucun des deux ne peut manipuler seul : trop lourd pour le petit,
  trop fin pour les doigts du géant.

Le point délicat : il faut que **chacun voie ce que fait l'autre** et comprenne
pourquoi il ne peut pas le faire lui-même. Sans ça, la coopération devient de
l'attente.

---

## LE PINCEAU — c'est le jeu, pas un guide

*(idée d'Hugo — adoptée ; c'est devenu la boucle centrale)*

**La poursuite.** Le pinceau se tient quelque part, trace ses boucles, vous
laisse approcher. Vous le rejoignez, il file ailleurs. Vous le suivez.

**Et voilà d'où viennent les énigmes : il vole, vous non.** Il franchit en
droite ligne ce qu'il vous faudra contourner, escalader, ou changer de taille
pour atteindre. Vous ne prenez jamais son chemin — vous devez seulement
arriver là où il s'est posé.

C'est ce qui fait tenir tout le reste : plus besoin de texte, plus besoin
d'objectif affiché, plus besoin d'expliquer une énigme. On voit où il est allé.
Le problème s'énonce tout seul, et la solution est toujours la même question :
*comment est-ce que j'arrive là, moi qui ne vole pas ?*

L'ouverture du jeu devrait être un petit jeu de poursuite facile — il se
faufile, on lui court après, on le rattrape — pour que la règle s'installe
avant que le premier vrai obstacle n'apparaisse. Puis il s'échappe plus loin,
et plus haut.

---

*Note de conception antérieure, conservée pour la trace :*

Pas de texte. Un **pinceau** qu'on aperçoit au loin, qui file en laissant une
traînée d'encre qui s'efface. C'est lui qui montre le chemin.

Pourquoi le pinceau plutôt qu'une fée ou une luciole : il **explique le monde**.
Pourquoi tout est-il tracé à l'encre ici ? Parce que quelque chose le dessine.
Et de temps en temps, on l'aperçoit.

**Ses règles de comportement, qui comptent autant que son allure :**

*Il n'attend jamais.* Un guide qui flotte en attendant qu'on le suive est un
élément d'interface déguisé. Un guide qui file, disparaît et reparaît plus loin
est un personnage.

*On l'aperçoit, on ne le suit pas.* Au loin, en périphérie, jamais planté au
centre de l'écran.

*Il ne vient que si l'on est perdu.* Pas sur minuterie : quand le jeu constate
qu'on tourne en rond. **Un joueur qui trouve seul ne le verra jamais** — et
c'est un respect qu'on lui doit.

*Il ne parle pas et ne montre pas du doigt.* Il passe. Au joueur d'en tirer
quelque chose.

Le seul endroit où le son sert vraiment : une note quand il passe.

### La version ambitieuse, pour plus tard

Là où il passe, **le monde apparaît**. Il ne montre pas le chemin : il le
trace. Une porte s'esquisse, un pont se dessine sous ses traits.

C'est la meilleure réponse à « de la cohérence dans la folie » — le monde n'est
pas absurde, il est simplement *en train d'être dessiné*, et l'on avance à la
vitesse où l'encre sèche.

### La grue de papier

À placer quelque part dans le voyage, en visite. Pas comme guide — ce rôle est
pris — mais comme apparition : une grue de papier qui traverse le champ, une
fois, sans explication. Les plus belles choses d'un monde sont celles qui n'ont
pas de fonction.

## Une direction artistique par région — FAIT, et c'est un contrat

*(idée d'Hugo — en place)*

Franchir un portail doit donner l'impression d'entrer dans un autre univers.
Chaque région déclare donc ses propres couleurs, et **on les voit à travers le
portail avant même d'y entrer** : c'est là que la promesse se fait.

**LE PRINCIPE À TENIR, et il vaut pour tous les agents à venir :**

> La cohérence vient de la TECHNIQUE, la variété vient de la PALETTE.

Partout le même trait d'encre, les mêmes aplats francs, le même grain de
papier, le même tremblement à 10 Hz. Ce qui change d'une région à l'autre, ce
sont les teintes — et elles peuvent changer beaucoup.

C'est ainsi qu'un livre illustré tient debout : un seul dessinateur, dix
ambiances. Changer la technique d'une région à l'autre donnerait dix jeux
collés bout à bout, et le voyage se briserait à chaque porte.

Donc : **soyez très libres sur les couleurs, très stricts sur la main.**

## Le mode Rêve — un monde qui se fabrique tout seul

*(idée d'Hugo)*

Un troisième mode, à côté de l'aventure seule et de l'aventure à deux. Des
salles engendrées à la volée, reliées entre elles par des portails, où l'on
divague sans jamais savoir où l'on est. L'esprit des *backrooms* : familier,
vide, légèrement inquiétant, et sans fin.

**Pourquoi les portails sont faits pour ça.** C'est le point technique qui
rend l'idée réaliste plutôt que folle : à travers un portail, on ne voit
jamais deux salles à la fois. Le générateur peut donc tricher autant qu'il
veut — les salles peuvent se chevaucher dans l'espace, être recyclées,
apparaître au dernier moment. Rien ne trahit la couture, parce qu'aucun regard
ne l'embrasse. La plupart des jeux se battent pour cacher les raccords ; ici
l'architecture les rend invisibles par construction.

**Et l'échelle rend le rêve plus étrange.** Une salle peut contenir un portail
qui mène à une version plus grande d'elle-même. On croit revenir sur ses pas,
tout est identique, mais on est devenu minuscule. C'est exactement la logique
d'un rêve, et c'est notre mécanique de base, sans rien ajouter.

**Le conseil que je me donne d'avance : engendrer de l'ESPACE, pas des
énigmes.** Fabriquer des énigmes au hasard donne des énigmes fades ou
insolubles — c'est un écueil très connu. En revanche, engendrer un labyrinthe
de salles à traverser est simple et robuste, et c'est précisément ce qu'on
demande à des backrooms : l'égarement, pas la réflexion. Quelques énigmes
écrites à la main peuvent être semées dedans comme des jalons.

**Ce que ça coûte : presque rien de structurel.** Un niveau est déjà une
donnée pure. Un générateur n'est donc qu'une fonction qui renvoie un niveau —
le moteur n'a pas à savoir d'où il vient.

*(idée d'Hugo)*

À prendre au sérieux tôt, parce que ça ne se rattrape pas facilement après
coup. Trois chantiers, d'inégale difficulté.

**Les commandes, et c'est le vrai morceau.** Tout le jeu repose aujourd'hui sur
la capture de la souris — qui n'existe pas sur téléphone. Il faut donc repenser
l'ensemble : un manche virtuel pour marcher, le glissement du doigt pour
regarder, des boutons pour sauter, prendre et lancer. Ce n'est pas un
habillage, c'est une deuxième façon de jouer à concevoir entièrement.

**Les performances : mesuré, et bien meilleur que craint.** On dessine la scène
**cinq fois par image** — deux niveaux de profondeur pour chacun des deux
portails, plus la vue principale — et l'on redoutait que ça écroule un
téléphone.

Mesure réelle : **60 images par seconde sur iPhone 14 Pro Max**, dans Chrome.
Le rendu tient donc tel quel, sans rien sacrifier. C'est important à noter :
ça évite d'aller mutiler la récursion des portails « au cas où ».

Réserve honnête : c'est un appareil haut de gamme. Rien ne dit encore ce que
donne un Android d'entrée de gamme, et c'est là qu'il faudra remesurer. Les
leviers restent en réserve si besoin — retomber à un seul niveau de
profondeur, réduire la définition des vues de portail, plafonner la densité de
pixels. Le compteur d'images est affiché en permanence, précisément pour
pouvoir mesurer partout plutôt que de deviner.

**Ce qui compte le plus : ça change le level design.** Poser une caisse
exactement au pied d'une tour demande de viser au doigt près. Agréable à la
souris, pénible au doigt. Si le jeu doit tourner sur téléphone, il faut
concevoir les énigmes **tolérantes au placement** dès le départ — sinon on
fabrique dix niveaux qu'il faudra tous reprendre.

**Premier pas, gratuit :** ouvrir le site sur un téléphone tel quel. On ne
pourra pas bouger, mais on saura tout de suite si ça affiche, et à quelle
vitesse. Cette seule information décide de la suite.

## Le portail qui retourne la gravité

*(idée d'Hugo)*

On entre dans un portail au sol, on ressort **au plafond**, et le haut et le bas
ont changé de camp. Le passage se fait en douceur, et pendant qu'on approche on
se voit déjà, à l'envers, de l'autre côté.

Ce qui est fort dans cette idée, c'est qu'elle ne demande **aucune explication**.
On voit un personnage marcher au plafond à travers le portail : on a compris.

Trois remarques avant de s'y mettre :

**Ça ne se marie pas avec le changement d'échelle.** Retourner le monde ET
changer de taille dans le même passage, c'est deux bouleversements d'un coup —
le joueur ne sait plus lequel a causé quoi. Il faut en faire une **paire
distincte, d'une autre couleur**, avec sa propre grammaire.

**Le basculement doit être progressif.** Un demi-tour instantané donne la
nausée ; il faut faire pivoter le regard pendant la traversée. C'est aussi ce
qui rend le moment beau.

**Ce n'est pas gratuit techniquement, mais c'est propre.** Nos portails sont
aujourd'hui des plans verticaux qui ne pivotent qu'autour de l'axe vertical, et
toute la physique suppose que le bas est le bas. Il faudra donc lever ces deux
hypothèses. C'est un vrai chantier, mais bien délimité : rien à réécrire, juste
à généraliser. Et le fait de se voir à l'envers à travers le portail, lui,
viendra tout seul — le personnage est déjà dans la scène.

## Deux arches dans le hall : seul, ou à deux

*(idée d'Hugo)*

Le hall n'offre plus une sortie mais **deux**, côte à côte et clairement
distinctes :

- **Aventure en solitaire** — on passe, on part, personne à attendre.
- **Aventure à deux** — on passe, et on attend. Dès qu'un second joueur
  franchit la même arche, la partie se lance **pour les deux à la fois**, dans
  un monde à eux.

Ce que j'aime dans cette forme : le choix est **spatial, pas administratif**. Pas
de menu, pas de bouton « chercher une partie » — deux portes, on prend celle
qu'on veut. C'est cohérent avec tout le reste du jeu, qui n'explique jamais rien
par du texte.

Deux points à ne pas rater :

**Celui qui attend doit savoir qu'il attend**, et depuis combien de temps. Une
salle d'attente muette est insupportable au bout de vingt secondes. Il faut
quelque chose à regarder ou à faire — idéalement les portails du hall restent
accessibles pendant l'attente, pour continuer à jouer avec sa taille.

**L'aventure à deux est un monde à part**, pas l'aventure solo avec un second
joueur en plus. Une énigme conçue pour une personne ne devient pas coopérative
parce qu'on est deux : elle devient juste plus facile. Il faut des énigmes
qu'**une seule personne ne peut pas résoudre**, où l'un est grand et l'autre
petit, et où chacun voit ce que l'autre ne peut pas faire.

Ce sont donc **deux voyages distincts** à tracer, avec la même grammaire.

Côté technique, c'est peu de chose : une file d'attente dans la base, le premier
arrivé crée un salon, le second le rejoint, et les deux basculent ensemble.

## La boîte à formes

*(idée d'Hugo)*

Le jouet d'enfant : des pièces, des trous, et chaque pièce n'entre que dans le
sien. Sauf qu'ici il ne suffit pas de la bonne forme — il faut aussi **la bonne
taille**, **la bonne orientation**, et **la bonne main** s'il y a du miroir.

C'est le meilleur niveau de fin qu'on puisse imaginer, et pour une raison
précise : **il n'enseigne rien, il vérifie.** Il rassemble tout ce que le joueur
a appris ailleurs et lui demande de s'en servir ensemble. Et sa règle n'a même
pas besoin d'être expliquée : tout le monde a joué à ça à trois ans.

Chaque pièce correctement logée déclenche une **animation de talisman** — un
sceau d'encre qui se dessine, un trait qui s'illumine. Ce retour immédiat est
indispensable : sans lui, le joueur ne sait pas si son échec vient de la taille,
de l'orientation ou de la forme, et il tâtonne au lieu de raisonner.

Toutes les pièces posées, on obtient une récompense — une clé, un objet — qui
ouvre une autre branche de l'aventure. Ça donne enfin une **structure** au jeu :
des niveaux qui débloquent des niveaux, au lieu d'une simple file.

Garde-fou de conception : ne pas cumuler les contraintes d'emblée. Une pièce qui
demande à la fois la bonne taille, le bon sens ET la bonne main, c'est huit
combinaisons — le joueur essaie au hasard. Mieux vaut **une contrainte par
pièce** au début, puis les croiser sur la dernière, qui devient le morceau de
bravoure.

## Ambiance : le son et le vivant

*(idée d'Hugo)*

Le jeu est **trop silencieux**, et le monde trop figé. Deux manques distincts.

**Le son.** Rien pour l'instant. Il faudrait au minimum du vent, des pas, le
froissement d'un portail qu'on traverse. Piste : générer des nappes musicales
avec d'autres outils et les intégrer comme fichiers.

À faire absolument, quoi qu'il arrive : **transposer les sons avec l'échelle.**
À ×4 tout devrait sonner plus grave et plus lent, à ×1/4 plus aigu. C'est trois
lignes de code, et ça vend le changement de taille presque autant que l'image.

**Les particules.** Peu, mais bien choisies. La référence est *Ōkami* : des
feuilles ou des pétales qui dérivent en laissant derrière eux une **traînée
d'encre**, comme un coup de pinceau qui s'efface. Cohérent avec tout le reste
du rendu, et ça suffit à rendre l'air vivant.

Garde-fou que je m'impose : **ne pas en mettre partout.** Une planche encrée
tire sa force de ses vides. Quelques feuilles portées par le vent valent mieux
qu'une neige permanente, qui tuerait la lisibilité des énigmes.

## Pistes ajoutées en chemin

Non discutées, juste posées là.

**Le son de l'échelle.** À ×4, tout devrait sonner plus grave et plus lent ; à
×1/4, plus aigu. C'est très peu de travail et ça vend le changement de taille
presque autant que l'image.

**Un portail à sens unique.** Une face qu'on peut franchir, l'autre qui fait
mur. Change complètement la lecture d'un niveau : on ne peut plus revenir sur
ses pas, donc l'ordre des actions devient l'énigme.

**Une paire dont le rapport n'est pas 4.** Un portail ×2 et un portail ×4 dans
le même niveau : les échelles se composent, et il faut trouver la bonne suite
de passages pour atteindre une taille précise. Le puzzle devient arithmétique.

**Un objet plus grand que le portail.** Il ne passe pas — sauf si on le fait
d'abord rétrécir par l'autre paire. Reprend exactement la règle qui borne déjà
la taille du joueur, et l'applique aux objets.

**La gravité relative à la taille.** Déjà en place, mais jamais exploitée : à
×1/4 on tombe lentement en unités du monde. Un niveau pourrait faire d'une
longue chute un moment de navigation plutôt qu'un échec.
