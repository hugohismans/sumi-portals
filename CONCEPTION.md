# *Lavis* — conception de la suite, et synthèse du carnet

Ce document ne contient pas de code et n'en demande pas la lecture. Il a deux
tâches.

**Ranger.** `IDEES.md` est un carnet : des mois de pensée, notés au fil de l'eau,
dans l'ordre où les idées sont venues. Certaines sont faites, certaines sont
abandonnées sans qu'on l'ait jamais écrit, deux ou trois se contredisent. Ici,
chaque idée du carnet est reprise, jugée — *ce qu'elle est, ce qu'elle coûte, ce
qu'elle apporte, si on la garde* — et quand on ne la garde pas, la raison est
donnée.

**Concevoir la suite.** L'introduction est finie : le hall, le village, la côte
rouge, le jardin, le belvédère, l'Aiguille. Ce qui vient après, ce sont des
niveaux qui s'enchaînent, sans ascenseur ni sas, reliés par une porte que le
Pinceau dessine. Les sections 5 à 9 la décrivent salle par salle.

Quelqu'un qui arrive sur le projet devrait pouvoir lire ce fichier d'un bout à
l'autre et savoir ce qui est fait, ce qui est décidé, et ce qui reste à trancher.
Là où il reste à trancher, mon avis est donné, et il est signalé comme un avis.

Le reste du contexte est dans `REPRISE.md` (état, parcours de l'introduction),
`IDEES.md` (le carnet brut, à conserver tel quel — c'est une archive, pas un
plan) et dans les messages de commit.

---

## 1. Tableau de bord

Trois registres, et il faut les tenir distincts. **FAIT** : c'est dans le code et
ça tourne. **DÉCIDÉ** : le choix est arrêté, l'écriture reste à faire. **À
TRANCHER** : personne n'a encore choisi, et mon avis est plus bas.

| Idée du carnet | État | Verdict |
|---|---|---|
| Le voyage plutôt que la succession de niveaux | FAIT | Gardée — elle commande la forme de la suite (§ 5) |
| Le lavis, les pigments par région | FAIT | Gardée, c'est le nom du jeu |
| Le pinceau de couleur en quatre âges | FAIT | Gardée telle quelle |
| L'échelle exigée du veilleur | FAIT | Gardée, et **étendue à la peinture** (§ 3.5) |
| La galerie des cinq piédestaux | FAIT (2/5 pourvus) | Gardée — les trois restants sont décrits § 4 |
| Le tracé de la porte par le Pinceau | FAIT | Gardé, et **promu de récompense en mécanique** (§ 3.6) |
| Les objets qu'on porte, et l'échelle | FAIT | Gardés — **la question du carnet est déjà tranchée par le code** (§ 3.2) |
| Un objet plus grand que le portail | FAIT, jamais utilisé | À utiliser : c'est un tamis (§ 3.2) |
| La chute longue comme navigation | Possible, jamais utilisée | À utiliser (§ 5, *le conduit*) |
| Les portails miroirs, la chiralité | FAIT **et invisible** | Gardée, mais inutilisable tant que les objets sont des cubes (§ 3.3) |
| La molécule chirale | PAS faite | Gardée — dépend des composites |
| Les objets composites | PAS faits | **Le premier chantier à mener** (§ 3.4) |
| L'énigme chromatique | PAS faite | Gardée, quatre paliers, mariée à l'échelle (§ 3.5) |
| L'objet chiral et coloré | PAS fait | Gardé, mais en dernier |
| La boîte à formes | PAS faite | Gardée comme avant-dernier niveau (§ 5) |
| Les portails de gravité | PAS faits | Gardés, **un seul monde, à une seule taille** (§ 3.7) |
| Le mode Rêve | FAIT | Gardé, séparé, **et il ne doit rien rapporter** (§ 9) |
| L'aventure à deux | FAITE, jamais essayée à deux machines | Gardée — **ne rien bâtir dessus avant l'essai** (§ 9) |
| Les trois arches du hall | FAIT | Gardées |
| La grue de papier | PAS faite | Gardée : une apparition, une seule (§ 7) |
| Le son | RIEN | **Le meilleur rapport du carnet** (§ 10) |
| Les particules, les feuilles | `feuilles.ts` existe | Gardées, avec parcimonie, **à la taille du monde** (§ 10) |
| Le téléphone | Mesuré, jamais joué | La tolérance au placement devient une loi (§ 10) |
| Un portail à sens unique | Piste | Gardé — un seul usage prévu (§ 12) |
| Une paire de rapport ≠ 4 | Piste | **REFUSÉE** (§ 11) |
| L'artefact final multicolore, la danse des pinceaux | Proposé | **Scindé en deux** (§ 8) |
| L'encrier porté jusqu'à l'Aiguille | Abandonné en silence | Acté comme abandonné — mais la promesse du sommet reste à payer (§ 4) |
| La feuille et le chevalet | Idée neuve, ici | Proposée (§ 3.6) |

---

## 2. L'inventaire du moteur — ce sur quoi on a le droit de bâtir

Rien de ce qui suit n'est une opinion. C'est ce que le moteur fait aujourd'hui, et
toute conception qui l'ignore fabrique des salles infaisables que rien ne laisse
voir — ce qui est déjà arrivé deux fois.

**Il n'y a que cinq tailles.** `SCALE_MIN_LEVEL = -2`, `SCALE_MAX_LEVEL = 2`.
C'est peu, et c'est une chance : cinq tailles se retiennent, se nomment, se
dessinent. Tous les nombres du jeu en découlent, et aucune hauteur ne doit jamais
être choisie à vue.

| | ×1/16 | ×1/4 | ×1 | ×4 | ×16 |
|---|---|---|---|---|---|
| taille | 0,11 | 0,45 | 1,80 | 7,20 | 28,80 |
| enjambée | 0,06 | 0,22 | 0,90 | 3,60 | 14,40 |
| saut | 0,08 | 0,32 | 1,30 | 5,18 | 20,70 |
| diamètre | 0,04 | 0,17 | 0,68 | 2,72 | 10,88 |
| soulève jusqu'à | 0,06 | 0,25 | 0,99 | 3,96 | 15,84 |
| saisit à | 0,18 | 0,72 | 2,88 | 11,52 | 46,08 |

**L'introduction n'enseigne jamais le portage.** `MONDE` ne déclare ni
`carryables` ni `sockets` ; seule l'aventure à deux s'en sert. Le joueur qui
arrive dans la suite sait grandir, rapetisser, rejoindre un perchoir hors
d'atteinte et réveiller quelqu'un avec E. Il ne sait pas qu'on peut porter. C'est
une contrainte sèche, et elle est excellente : **elle nous donne gratuitement la
salle d'ouverture de la suite.**

**Le seul interrupteur du jeu est un logement pourvu, et il est à sens unique.**
Une caisse logée se verrouille pour de bon. Il n'existe ni levier, ni bascule, ni
plaque qu'on relâche. Conséquence à tenir absolument : **aucune énigme ne peut
reposer sur un état qu'on défait.** Tout avance dans un seul sens, et c'est au
tracé de garantir qu'aucun sens n'est mauvais.

**Rien ne tue, rien ne blesse, rien ne compte le temps.** Il n'y a pas de dégâts
dans la simulation. L'exemple classique — « une chute qui tue à ×1/4 et qui n'est
qu'une marche à ×4 » — n'existe donc pas, **et il ne faut pas l'ajouter.** Non par
paresse : parce qu'une chute qui punit contredit la cinquième règle du contrat de
région (ne jamais piéger), et parce que ce jeu n'a rien à gagner à faire mal. On
garde la moitié utile : *une chute coûte du chemin*. Elle dépose ailleurs, plus
bas, dans un lieu qu'il faut remonter — et qu'on est content d'avoir vu.

**La gravité du joueur suit sa taille ; celle des objets, non.** Le joueur tombe
sous `GRAVITY × échelle`, une caisse libre sous `GRAVITY` tout court. Ce n'est pas
une incohérence, c'est un cadeau : **plus on est petit, plus le monde tombe
lourd.** Relativement à vous, un objet lâché à ×16 dérive comme une feuille ; à
×1/16 il tombe comme une balle. Le rapport varie comme la racine de l'échelle.
C'est gratuit, c'est spectaculaire, et ça n'appartient qu'à ce jeu — mais ça ne se
comprend pas tout seul. Il faut **le montrer dans un lieu qui ne demande rien**
avant de s'en servir dans une énigme, sinon ça se lit comme un défaut.

**Les portails sont des monuments de taille fixe.** Ils ne suivent pas le joueur ;
ils ne pivotent qu'en lacet. Une face est donc un trou de dimension absolue, et
« est-ce que je passe ? » est une question de géométrie et jamais de permission.
C'est la plus belle propriété du moteur, et presque toutes les énigmes de la suite
en sortent.

**Les tailles d'objets vivent sur un réseau de puissances de 4.** Une caisse ne
change de taille qu'en traversant, et une traversée multiplie par 4 ou par 1/4.
Une caisse de 0,25 peut valoir 0,0625 · 0,25 · 1 · 4 · 16, et jamais 0,5. Un
logement demande une taille absolue à 12 % près. **Le nombre de portes traversées
est donc une variable arithmétique**, et c'est le seul jeu où compter les portes
soit un raisonnement.

**Ce qui manque, et que je ne suppose nulle part :** les portails de gravité, les
objets composites, un logement qui rende ce qu'on lui a confié, et une face à sens
unique. Tout ce qui les exige est signalé comme conditionnel.

---

## 3. Les six mécaniques, et ce que chacune vaut

### 3.1 L'échelle — le verbe unique

Elle est faite, elle tient, et il n'y a rien à en dire de neuf sinon deux lois de
tracé que l'introduction a apprises à ses dépens et qu'il faut écrire une fois
pour toutes.

**Après avoir grandi, on doit se retrouver en surplomb de là où l'on était.** Un
portail qui ne dépose pas au-dessus du lieu précédent perd tout l'effet. C'est
`IDEES.md` qui le dit, et le monde central le prouve : la terrasse regarde le
village, le belvédère regarde la terrasse.

**Un portail déjà franchi doit rester derrière soi.** Sinon on le retraverse en
allant chercher la suite, et l'on rapetisse sans comprendre. Ça a mordu une fois,
dans le monde central, et ça mordra encore.

Et une troisième, que je propose d'ajouter, parce que l'introduction l'a produite
par accident et que ce serait dommage de ne pas l'assumer :

> **Le spectaculaire est la récompense de l'erreur.**

`REPRISE.md` laisse une question ouverte : le jardin a été bâti pour un joueur à
×1/4, mais le parcours le fait traverser à ×1. Entrer trop petit donne la version
grandiose du lieu — une forêt d'herbe — et un pinceau hors d'atteinte. Entrer bien
grandi donne un jardin plus sage et un pinceau qu'on peut prendre.

**Mon avis : ne rien changer, et en faire une loi.** Se tromper de taille doit
toujours donner la plus belle version du lieu, et jamais la version utile. Le
joueur qui se trompe est payé en images et apprend sans être puni ; celui qui a
raison est payé en avancement. Aucun des deux n'a perdu son temps. Mais alors il
faut l'appliquer **exprès et partout**, et pas seulement là où l'accident nous a
rendu service.

### 3.2 Les objets qu'on porte — le filon, et la question déjà tranchée

`IDEES.md` pose une bifurcation et la présente comme ouverte :

> — il change d'échelle avec le porteur → intuitif, la pierre reste une pierre ;
> — il garde sa taille absolue → on ramasse un caillou en étant géant, on
> redevient petit, et c'est devenu un immeuble à escalader.
> La seconde est une mine à énigmes.

**Cette question est déjà tranchée, et par le code, et mieux que par l'une ou
l'autre des deux options.** `carryables.ts` pose une règle unique : *une caisse
posée garde sa taille dans le monde, une caisse portée suit son porteur.* Les deux
branches du carnet sont donc vraies en même temps, selon ce que le joueur fait de
ses mains. Il faut l'écrire, parce que personne ne l'a écrit et que c'est le
principe le plus important du jeu après l'échelle elle-même :

> **Le verbe des objets n'est pas « prendre ». C'est « lâcher au bon moment ».**

Porter est toujours sûr : vous et l'objet changez ensemble, donc ce que vous
pouviez soulever, vous pouvez toujours le soulever. **Poser est l'acte qui fige
une taille.** Tout ce qui suit en découle, et rien de tout cela n'a encore servi
une seule fois dans le jeu.

**La mine que le carnet appelait de ses vœux est déjà ouverte.** Posez un cube de
0,90 à taille normale, franchissez une porte vers ×1/4 : il mesure deux fois votre
hauteur et vous ne le soulèverez plus (limite : 0,25). Le caillou est devenu un
immeuble, exactement comme le carnet l'espérait, et il n'y a rien à programmer. Il
suffisait de poser avant de rapetisser.

Les familles d'énigmes que ça ouvre, et qui sont toutes inédites :

**Construire pour une taille qu'on n'a pas.** On dispose des cubes en étant géant,
pour un escalier qu'on gravira normal. C'est la meilleure salle de la suite (§ 5,
*l'escalier pour plus tard*), et l'erreur y est universelle : on espace à son œil
de géant, donc quatre fois trop.

**Se fabriquer un obstacle, et que ce soit la solution.** Un cube posé devient un
mur quand on rapetisse — donc une paroi à escalader, donc une plateforme. Le même
geste produit l'empêchement et le moyen.

**Le tamis.** Une caisse trop grosse pour une face **rebondit** : le moteur le
fait déjà, dans `carryTraversal`, et personne ne s'en est jamais servi. C'est la
piste « un objet plus grand que le portail » du carnet, déjà implémentée. Elle
donne des portes qui trient : on ne fait pas passer un meuble par une chatière, et
pour l'y faire entrer il faut d'abord le rétrécir ailleurs.

**L'objet comme seul messager.** On ne voit jamais les deux côtés d'un portail à
la fois. Une information ne peut donc traverser que sous forme d'objet, jamais
sous forme de souvenir. C'est ce qui rend possible *la pièce sans étalon* (§ 5),
et c'est aussi ce qui interdit les énigmes de mémoire (§ 11).

**L'étalon.** Un objet dont on connaît la taille est un mètre-ruban. Dans un jeu
qui change la taille de tout, c'est un outil de raisonnement, pas un accessoire.

**Et la maladresse du géant, qui est une contrainte et non un défaut.** On repose
ce qu'on porte à environ deux fois la taille de l'objet devant soi, et la portée
de saisie suit la taille du joueur. À ×4, c'est huit mètres — le niveau de
l'aventure à deux a été infaisable pendant un temps pour cette seule raison, et
rien ne le laissait voir. À ×16, c'est des dizaines de mètres et l'on ne voit pas
ses propres pieds. D'où une règle sèche : **on ne manipule rien à ×16.** C'est une
taille pour regarder et pour marcher. Toute une famille de salles tombe avec cette
règle, et tant mieux : elles étaient toutes mauvaises.

### 3.3 La chiralité — ce qu'elle permet, et ce qu'elle ne permet pas

Le carnet la présente comme sa meilleure piste, et il a raison sur le fond. Le
moteur la porte : `PortalPairDef.miroir` existe, `retournerLaMain` bascule le
`main` d'un objet à chaque passage, `Sockets.fits` refuse la mauvaise main avant
même de comparer la taille, le rendu du portail retourne le tri des faces pour la
réflexion, et les vérifications automatiques testent tout ça.

**Mais elle est aveugle.** Une caisse est dessinée comme un cube — géométrie
reconstruite à sa taille, contour d'encre, double au ras du portail, et c'est
tout. Un cube n'a pas de main. Aujourd'hui, `main` bascule et **rien ne change à
l'écran**. Le carnet le dit lui-même, sans savoir qu'il décrivait l'état des
lieux : « si le joueur ne voit pas de ses yeux que les deux versions diffèrent,
l'énigme devient de la devinette. »

C'est le fait le plus important de cette synthèse. **La chiralité n'est pas une
piste à explorer : c'est une mécanique finie qui attend une forme.** Elle ne coûte
plus rien en simulation et elle ne rapporte rien tant que les objets sont des
cubes. D'où le classement du § 3.4.

**Ce qu'elle permet, une fois visible :**

*Le refus le plus instructif du jeu.* On présente la pièce, elle a la bonne
taille, elle a l'air juste, elle n'entre pas. On la tourne : elle n'entre toujours
pas, et **aucune rotation ne la fera entrer** — ce qui est la définition exacte de
la chiralité, apprise en trois secondes et sans un mot.

*Un théorème que le joueur peut déduire.* C'est le meilleur usage, et il n'est
écrit nulle part dans le carnet. Chaque passage multiplie la taille par 4 ou par
1/4. Chaque passage au miroir change la main. Les passages d'une même paire
alternent forcément — pour repasser dans un sens il faut d'abord repasser dans
l'autre. Donc :

> **Un nombre impair de passages au miroir laisse toujours la taille changée. On
> ne rattrape jamais une main sans emprunter la taille à une autre porte.**

Une salle qui demande *la taille d'origine et l'autre main* est donc insoluble
avec le seul miroir, et se résout en empruntant un passage à une paire ordinaire.
Le joueur peut faire la navette entre les deux faces du miroir aussi longtemps
qu'il veut : c'est visible, c'est gratuit, et c'est ce qui lui fait sentir qu'il
manque quelque chose plutôt qu'un savoir-faire. C'est *le blanchiment* (§ 5), et
je n'ai rien trouvé de plus satisfaisant à concevoir dans ce projet.

*Et une vraie idée du monde.* Les protéines du vivant n'emploient qu'une seule des
deux mains possibles, et pourquoi celle-là reste une question ouverte. Un joueur
qui aura fait le geste une fois comprendra pourquoi une molécule et son reflet ne
sont pas interchangeables. C'est ce qu'un jeu transmet mieux qu'un cours, et c'est
ce qui donne au niveau une raison d'exister au-delà de son énigme.

**Ce qu'elle ne permet pas, et il faut cesser de l'espérer :**

*Un miroir neutre.* Toute paire change la taille ; il n'existe pas de porte qui ne
fasse que refléter. **On ne peut donc pas enseigner la main isolément.** Ce n'est
pas une raison de tordre le moteur, c'est une raison de dessiner la première salle
de chiralité pour que le changement de taille soit *inoffensif* : le logement
demande justement quatre fois la pièce, un aller simple donne la bonne main et la
bonne taille d'un coup, et le joueur lit « la porte l'a corrigée ». Il a raison, et
il ignore encore que la porte a fait deux choses. La salle suivante le lui
apprend.

*L'orientation comme contrainte.* Il n'y a pas de commande pour tourner ce qu'on
porte, et une caisse posée se remet d'aplomb toute seule — parce que sa collision
reste une boîte droite, et que la laisser reposer de travers ferait mentir l'image
sur l'endroit où l'on pose le pied. Le carnet, en décrivant la boîte à formes,
demande « la bonne orientation ». **Mon avis : la refuser.** Une contrainte que le
joueur ne peut pas satisfaire délibérément est une loterie. Il reste la forme, la
taille, la main, et bientôt la couleur : c'est déjà beaucoup.

*La chiralité du joueur ou du décor.* Seules les caisses portent une main. Le
joueur qui franchit un miroir n'est pas retourné — il voit simplement le monde
d'où il vient inversé à travers la porte. C'est une belle texture, ce n'est pas
une mécanique, et il ne faut pas essayer d'en faire une.

### 3.4 Les objets composites — un chantier, trois énigmes

Le carnet dit : « il manque pour ça que les objets soient composites — quelques
blocs, chacun sa teinte — au lieu de cubes d'une seule couleur. Le même chantier
débloque la molécule chirale. »

Il en débloque trois, et **c'est le premier chantier à mener**, avant tout le
reste. Sans lui, la chiralité est du code mort, la molécule est impossible, la
boîte à formes n'a qu'une contrainte au lieu de quatre, et l'objet chiral et coloré
n'existe pas.

**Ce que ça coûte, aussi honnêtement que je peux le dire en lisant.** Un
commentaire de `carryableViews.ts` affirme qu'une forme non cubique obligerait à
« refaire tout le découpage de géométrie aux portails, ce qui est un vrai chantier
et pas un réglage ». **Je crois ce commentaire trop pessimiste, et ça mérite d'être
vérifié avant de renoncer.** Le découpage au ras d'un portail ne coupe pas la
géométrie : il pose des plans de coupe sur les matériaux, et double l'objet de
l'autre côté. Ces deux mécanismes se moquent de la forme. Et la géométrie du monde
se construit déjà à partir d'une liste de boîtes : une pièce composite est une
liste de boîtes au lieu d'une seule.

Restent trois vrais coûts, tous bornés : une teinte par bloc demande un maillage
par teinte au lieu d'un ; la géométrie doit être rebâtie quand la pièce change de
taille, ce qui se fait déjà ; et **afficher la main « D » demande de refléter la
géométrie locale**, donc d'inverser le tri des faces — exactement le problème déjà
résolu une fois pour la vue à travers les portails miroirs.

**Recommandation ferme : la forme est pour l'œil et pour la serrure, jamais pour
la physique.** La collision reste la boîte englobante, droite, toujours. Une pièce
en L se cogne comme un cube, et personne ne s'en plaindra. Le jour où l'on voudra
une collision fidèle, on aura des coques tournantes à écrire, une physique à
reprendre, et un jeu instable. Ce jour ne doit pas arriver.

**Et la serrure ne compare pas des géométries.** Chaque pièce déclare une forme
(un identifiant), une taille, une main, et bientôt des teintes. Chaque logement
déclare ce qu'il accepte. Quatre comparaisons de valeurs, aucune géométrie. La
boîte à formes devient alors de la donnée pure — ce qui est exactement ce que les
logements ont déjà fait pour la taille, et le carnet a raison de dire que c'est le
plus gros multiplicateur de contenu du projet.

**Garde-fou du carnet, à répéter parce qu'il est vital :** ne pas cumuler les
contraintes d'emblée. Quatre inconnues simultanées font seize combinaisons ; le
joueur tire au sort au lieu de raisonner, et le niveau devient long au lieu d'être
difficile. Une contrainte par pièce, puis deux, et le cumul seulement sur la
dernière.

**Et la lisibilité prime sur la beauté.** Quatre ou cinq boules, des liaisons
franches, une couleur par atome, et une asymétrie visible à l'œil nu depuis trois
mètres. Une molécule jolie et ambiguë vaut moins qu'une molécule laide et
évidente.

### 3.5 La couleur — comment elle devient une mécanique

Le carnet pose l'énigme chromatique : un tableau montre l'état où la pièce devrait
être, on désigne un élément, toute sa famille prend cette couleur. Il pose aussi
le piège, et il a raison — sans les trois informations (à quoi ressemble le faux,
quel geste change quoi, est-ce que je m'approche), c'est une devinette. Le tableau
répond à la première et à la troisième, la famille qui bascule répond à la
deuxième.

Ce qui manquait, c'est la raison pour laquelle cette énigme appartient à **ce**
jeu-ci plutôt qu'à n'importe quel autre. Elle tient en une loi.

> **On ne peint que ce qu'on pourrait tenir.**

Un objet est peignable si son plus grand côté passe sous le seuil qui décide déjà
si on peut le soulever : un peu plus de la moitié de sa propre hauteur. Exactement
le même nombre, exactement le même refus, exactement la même sensation que le
« trop lourd » que le joueur connaît depuis la deuxième salle de la suite.

Cette loi fait trois choses d'un coup, et c'est pourquoi je la défends.

**Elle marie la couleur à l'échelle au lieu de la faire vivre à côté.** Un pot est
peignable à ×1 ; un toit, seulement à ×4 ; une falaise, à ×16 ; le grain d'une
pierre, à ×1/16. **La palette accessible est partitionnée par la taille**, et un
tableau qui demande trois familles est une liste de trois tailles à prendre. La
couleur cesse d'être une couche posée sur le jeu et devient une raison de plus de
changer de grandeur.

**Elle prolonge une loi qui existe déjà.** Un pinceau de couleur ne s'éveille que
pour un joueur de la taille de son monde — c'est la règle qui relie le verbe du jeu
à son but, et sans laquelle on pourrait remplacer les couleurs par des clés sans
que rien change. La loi de la main est la même phrase, appliquée au geste au lieu
de la rencontre. Une seule idée gouverne tout, et elle se dit en dix mots.

**Et elle règle le problème du téléphone.** Désigner un élément à travers la pièce,
c'est un curseur, donc de la visée, donc quelque chose de pénible au doigt.
Peindre ce qu'on pourrait tenir veut dire : **s'approcher et appuyer sur E.** Le
même geste que réveiller, que prendre, que poser. Aucune commande nouvelle, aucune
visée, et la portée de bras est déjà calibrée à toutes les échelles.

**C'est la fée qui peint, pas vous.** On n'a pas de pinceau en main : on a réveillé
quelqu'un, et il nous suit. Quand on appuie sur E devant une chose peignable, la
fée quitte l'épaule, vole jusqu'à elle, la peint, puis va peindre les autres
membres de la famille **une par une**, et revient. Deux secondes, un balayage
visible. Ce n'est pas de la mise en scène : si sept objets basculaient au même
instant, on verrait un interrupteur ; en les voyant peints l'un après l'autre par
quelqu'un qui traverse la pièce, on comprend ce qu'est une famille sans qu'un mot
ait été dit. Et le délai empêche de marteler la touche, donc de résoudre par
tâtonnement. Le geste et le vol existent déjà — c'est ce que fait le pinceau
peintre quand il repeint une région.

**Une fée ne porte que sa couleur.** Le rouge peint rouge. Pour peindre en bleu il
faut avoir rapporté le bleu. La progression chromatique n'est donc pas une
serrure : ce n'est pas « tu as la clé rouge », c'est **« tu as le rouge, donc le
rouge est ce que tu sais dire »**. Les salles tardives demandent plus de couleurs
qu'on n'en possède, et le choix devient : laquelle donner à quoi.

**Et l'on repeint autant qu'on veut.** C'est la seule chose du jeu qui se défait,
et c'est délibérément l'inverse d'un logement. Un logement est un progrès, donc il
verrouille ; une couleur est une décision, donc elle se reprend. Cette asymétrie
doit être franche : le joueur doit sentir, sans qu'on le lui dise, dans quel monde
il joue selon qu'il pose une caisse ou qu'il donne une couleur.

#### Les quatre paliers

**Palier 1 — une famille, une couleur.** Le séchoir des potiers, tout en lavis. Au
mur, le tableau : la même pièce, du même point de vue, avec les claies en rouge.
On n'a que le rouge. Les claies font 0,90, donc peignables à ×1 ; le mur fait
quatre mètres, donc jamais. **Il n'y a qu'un geste possible dans la pièce, et
c'est le bon.** On comprend les trois choses d'un coup. L'erreur — essayer de
peindre le mur — reçoit le refus du « trop lourd », déjà connu, et enseigne la loi
de la main en une seconde.

**Palier 2 — deux familles, deux couleurs, deux tailles.** Une cour où les tuiles
font trois mètres. Le rouge va aux pots, le bleu aux tuiles ; mais les tuiles ne
sont peignables qu'à ×4, et le tableau ne se lit que d'en bas. Il faut monter,
peindre, redescendre, vérifier. Ce n'est plus un geste, c'est un aller-retour, et
c'est là que la couleur devient un motif de voyage.

**Palier 3 — le point de vue.** Trois familles. Le tableau est peint depuis un
endroit précis ; d'ailleurs, les masses se recouvrent mal et l'on ne sait plus quoi
est quoi. Un tabouret de peintre est posé quelque part dans la pièce. En s'y
tenant, **la composition se referme** et le tableau devient comparable. Rien n'a
été expliqué, et la tâche demandée est de trouver d'où quelqu'un regardait — ce
qui est exactement l'occupation d'un peintre.

**Palier 4 — le point de vue EST une taille.** Le tableau montre une vue qu'on ne
reconnaît pas : des masses molles, une paroi courbe, une lumière d'en dessous. On
cherche le point de vue et il n'existe pas, parce que le tableau a été peint **de
l'intérieur du bassin, à ×1/4**. En descendant, la vue se referme sur elle-même :
c'est bien cette pièce-ci, vue par quelqu'un de quarante-cinq centimètres. Et les
familles à corriger sont la mousse et le grain de la margelle, deux choses qui
n'ont jamais eu la taille d'une main tant qu'on mesurait 1,80.

C'est la salle qui dit la thèse du jeu en une image — *le même lieu, relu* — et
elle ne peut être que la dernière des quatre.

*Défaut à dire :* le joueur peut ne pas comprendre que le tableau représente cette
pièce-là. Le remède est de laisser dans les deux vues **un même objet
reconnaissable**, un pinceau déjà réveillé posé sur la margelle, présent dans le
tableau. Et le remède de fond, c'est le rang : après trois heures passées à
retrouver le village vu d'en haut, cette lecture est acquise. Placée plus tôt, la
salle serait injuste.

*Note technique du carnet, qui tient toujours :* le tableau peut être littéralement
une image, rendue une seule fois au chargement depuis un point fixe avec la
palette cible. La machinerie existe — c'est ce que fait un portail. Coût ponctuel,
zéro par image.

#### Le risque des deux systèmes de couleur

Il y en a deux, et c'est un de trop si on ne les sépare pas nettement.

Le **pigment** est l'échelle du monde : une région entière est en lavis, on
rapporte un pinceau, elle se repeint d'un coup, c'est irréversible et c'est
gratuit. C'est une récompense, et ça ne doit jamais devenir une énigme.

Le **tableau** est l'échelle du geste : dans une pièce, on distribue entre les
familles les couleurs qu'on possède. C'est réversible et c'est une énigme.

Ils ne doivent jamais coexister dans la même pièce, et ils ne doivent pas se
ressembler. Le pigment **arrive en volant sans qu'on ait rien demandé** et balaie
une région ; le tableau est un cadre accroché à un mur, et il n'y a de cadres que
dans les ateliers. Si un joueur confond les deux une seule fois, le second système
est à jeter.

### 3.6 La feuille — pour que la porte dessinée cesse d'être une récompense

Le problème posé par la suite est celui-ci : enchaîner des niveaux **sans
ascenseur et sans sas**, en faisant du tracé de la porte suivante autre chose
qu'un écran de chargement déguisé.

`tracage.ts` existe et fonctionne : le Pinceau pose ses taches par coups
irréguliers, une main hésite, appuie deux fois, reprend, et l'on ne traverse pas
une feuille vierge. C'est très beau. Mais dans son état actuel, c'est une
**récompense** : on résout, il dessine, on passe. Joli une fois, couloir la
dixième. Il faut que le tracé devienne une **prise**, c'est-à-dire quelque chose
sur quoi le joueur agit.

D'où la seule invention de ce document :

> **Le Pinceau ne peut dessiner que sur du papier, et c'est vous qui apportez le
> papier.**

Une **feuille** est une caisse portable, blanche, sans encre. Un **chevalet** est
un logement qui l'attend. On pose la feuille sur le chevalet, le Pinceau vient, et
il dessine la porte dessus.

**La taille de la porte suivante devient un choix du joueur.** Une feuille traverse
les portails comme tout le reste : elle vaut 0,30, ou 1,20, ou 4,80 selon le nombre
de portes qu'on lui a fait franchir avant de la poser. Une salle qui offre deux
chevalets de deux tailles offre deux portes différentes — donc **deux tailles de
l'autre côté**, donc deux lectures du lieu suivant. Le joueur ne choisit pas un
chemin dans un menu : il choisit la dimension à laquelle il va naître dans la
salle d'après.

**Ça ne demande presque rien au moteur.** Chaque chevalet est un logement ; chaque
porte candidate est une paire déjà déclarée dans le niveau, scellée par la
condition de son chevalet. Le mécanisme des portes non dessinées et celui des
portes scellées font déjà exactement ce travail, et le joueur n'a pas à connaître
la différence entre les deux — dans les deux cas il ne passe pas, et dans les deux
cas la raison est visible dans le monde.

**Une seule chose manque : un chevalet doit rendre sa feuille.** Aujourd'hui une
caisse logée se verrouille, et c'est la bonne règle partout ailleurs — un progrès
qu'on défait par accident n'est pas un progrès. L'exception est sûre parce que le
contenu d'un chevalet n'est jamais un progrès : c'est une décision, et une décision
doit pouvoir se reprendre. *Repli si l'entorse déplaît :* plusieurs feuilles au
lieu d'une, et le mauvais choix ne coûte qu'une feuille gâchée. C'est moins
élégant et ça marche.

**Et c'est vrai dans la fiction.** Pourquoi le monde est-il un lavis ? Parce que
quelqu'un est en train de le dessiner. Pourquoi une porte se dessine-t-elle au lieu
de s'ouvrir ? Parce qu'il n'y a rien derrière tant que personne n'a tendu la page.
On n'a rien eu à raconter : la mécanique énonce elle-même l'histoire du jeu.

### 3.7 Les portails de gravité — le seul monde à une seule taille

Pas faits. Les trois remarques du carnet tiennent toutes.

*Ça ne se marie pas avec l'échelle.* Retourner le monde et changer de taille dans
le même passage, c'est deux bouleversements d'un coup, et le joueur ne sait plus
lequel a causé quoi. Il faut une paire distincte, d'une autre couleur, avec sa
propre grammaire.

*Le basculement doit être progressif.* Un demi-tour instantané donne la nausée ;
faire pivoter le regard pendant la traversée est aussi ce qui rend le moment beau.

*Le chantier est réel mais borné.* Les portails sont des plans verticaux qui ne
pivotent qu'en lacet, et toute la physique suppose que le bas est le bas. Deux
hypothèses à lever, rien à réécrire. Et se voir à l'envers à travers la porte
viendra tout seul : le personnage est déjà dans la scène.

**Ce que j'ajoute, et qui règle la première remarque en la retournant :** le socle
retourné de la place attend un creux d'environ quatre-vingt-dix centimètres,
c'est-à-dire ce qu'on rapporte d'un monde parcouru **à taille normale**. La
géométrie plantée sur la place dit donc déjà ce que doit être ce monde :

> **Le monde du plafond est le seul monde du jeu où l'on ne change jamais de
> taille.** On y monte, on y descend, on y marche la tête en bas — et c'est tout.

Ce n'est plus une limitation, c'est une identité. Une grammaire neuve introduite à
la vingtième salle n'a pas le temps de se complexifier, et c'est très bien : elle
n'a qu'à se montrer. **Ce mouvement doit être court, et il doit être le dernier.**

*Classement :* après les composites, et après le son. C'est le plus gros chantier
de moteur restant, et c'est aussi celui dont le jeu se passerait le plus
facilement — il manquerait une couleur, pas une idée.

---

## 4. Les cinq socles — la carte du jeu, dite en volumes

C'est la plus belle idée du carnet, et elle est déjà plantée : cinq piédestaux en
arc autour de la place, tous vides au départ, et **c'est leur taille qui dit
lequel attend quoi**. On les longe en allant du puits au marché, donc on les voit
forcément. La galerie **est** la jauge de progression, et elle ne ressemble à
aucune barre.

La règle de lecture, telle que l'introduction l'a établie : le pinceau qu'on
rapporte a la taille de son monde, et le creux qui l'attend a la taille qu'il aura
en arrivant. **Un grand creux annonce un monde où l'on sera petit ; un creux
minuscule, un monde où l'on sera énorme.**

Deux sont pourvus : le vert, rapporté du jardin, et le rouge, rapporté de la côte.
Voici ce que les trois autres doivent être, et pourquoi leur forme le dit d'avance.

**Le grand creux — 2,80 — LA DESCENTE, et c'est le bleu.** Le plus large de tous.
On en revient avec quelque chose d'énorme, donc on y aura été minuscule : un monde
parcouru à ×1/4, entré par une grande face depuis le village, c'est-à-dire dès la
sortie de l'introduction et sans rien avoir appris de neuf. C'est donc le premier
des trois.
Ce que le bleu va peindre : **l'eau**. L'étang, le puits, la barbotine des
bassins, la pluie. De l'eau grise, il y en a partout depuis la première minute et
personne ne s'en est aperçu — c'est exactement l'effet qu'on cherche quand une
couleur revient.

**Le creux minuscule — 0,36 — LA MONTÉE, et c'est l'or.** Le plus petit. On en
revient avec une miette, donc on y aura été géant : un monde parcouru à ×4 puis
×16, entré par une petite face, ce qui exige de se présenter à taille normale.
Ce que l'or va peindre : **la lumière.** Les lanternes de la rue, la braise des
fours, les coiffes, les accents. Chaque palette du jeu réserve déjà son quatrième
ton à l'accent : un seul pigment rallume donc tout le monde d'un coup, et le
village passe du soir au soir éclairé.

**Le socle retourné — 0,90 — LE PLAFOND, et c'est le ciel.** Suspendu sous un
linteau, le creux tourné vers le sol. On ne peut rien y poser tant qu'on n'a pas
trouvé le moyen de marcher au plafond, et c'est précisément ce qu'il annonce
depuis la première minute. Sa taille dit un monde parcouru à taille normale : voir
§ 3.7.
Ce que ce pigment va peindre : **le papier lui-même.** Le fond du ciel et la
couleur du brouillard, qui sont la même chose dans ce jeu et qui n'ont jamais
changé. C'est le dernier, et il ne peut être que le dernier : c'est celui qui
repeint ce qu'on n'avait jamais regardé parce que c'était le support.

**Et il reste une promesse à payer, plus vieille que tout le reste.** Au pied de
l'Aiguille, une maquette à hauteur d'œil porte un encrier sur sa pointe minuscule.
On la regarde, on lève les yeux, on voit la même pointe, vide. La phrase « il faut
porter quelque chose là-haut » n'a jamais été écrite nulle part et pourtant elle a
été dite — c'est la seule chose du jeu qui explique quelque chose, et elle le fait
sans un mot.

Or **rien ne se pose au sommet de l'Aiguille aujourd'hui.** Il y a une plateforme,
il n'y a pas de logement. Le voyage y mène, le sacre s'y passe, et la promesse
reste ouverte. L'objet qu'elle annonçait — un encrier qu'on porterait depuis le
jardin — a été abandonné en silence quand les pinceaux endormis l'ont remplacé ; le
long commentaire qui le décrit est resté dans le code comme un fossile, et il faut
savoir en le lisant qu'il ne décrit rien.

**Mon avis :** payer la promesse avec la fin de la quête. Le cinquième pigment
rapporté, ce qui se pose sur la pointe de l'Aiguille, c'est l'objet multicolore du
carnet, et c'est là que **tous les pinceaux dansent**. La maquette l'annonçait à la
première minute, l'éperon y mène déjà, et l'on n'a rien à ajouter au monde qu'un
creux.

---

## 5. La suite — trois mouvements, et ce que chaque salle enseigne

`IDEES.md` pose que ce jeu est **un voyage, pas une succession de niveaux**. Le
projet demande un enchaînement à la *Portal 2*. Les deux n'entrent en conflit que
si l'on enchaîne **latéralement** — salle, salle, salle, comme des wagons. On les
réconcilie en enchaînant **verticalement, dans l'échelle** :

> Chaque porte dessinée est un changement de grandeur, pas un changement de
> sujet. On ne quitte jamais le monde ; on le regarde de plus près, ou de plus
> loin.

Trois lois de tracé, non négociables.

**1. Chaque mouvement rend visite à un lieu déjà connu, à une taille nouvelle.**
C'est ce qui distingue un voyage d'un couloir. Si un mouvement ne revient sur
rien, il est décoratif.

**2. Toute salle qui demande de penser à une autre taille contient un étalon de
cette taille.** Le joueur ne doit jamais estimer à l'œil ce qu'il ne peut pas
comparer. La petite face d'une porte mesure toujours la même chose : c'est le
mètre-ruban du monde, et il est déjà planté dans le décor.

**3. Le spectaculaire est la récompense de l'erreur.** Voir § 3.1.

Onze salles demandent quelque chose ; huit ne demandent rien. C'est délibéré, et
c'est le § 7. Les concepts d'énigme sont ici, dans l'ordre où on les apprend : une
énigme sans sa place dans la courbe n'est pas une énigme, c'est une devinette.

### Mouvement I — La descente (le bleu)

#### 1. LA FENTE — *petit ouvre des lieux, pas des serrures*

Le lavoir, au bord du village. Une porte de 2,80 sur le mur du fond, dessinée par
le Pinceau au sortir du sacre. On la franchit par sa grande face et l'on ressort à
quarante-cinq centimètres, au ras du dallage qu'on foulait tout à l'heure.

Le Pinceau est **dans une fente entre deux pavés** : trente centimètres de large,
un mètre vingt de fond. À ×1 on faisait 68 centimètres de diamètre et la fente
était un trait au sol, littéralement une ligne du dessin. À ×1/4 on fait 17
centimètres et c'est un ravin de deux hauteurs d'homme, avec un sol, des parois,
une ombre. Une dalle descellée fait la rampe qui en ressort : on n'y piège
personne.

*Enseigne :* rapetisser n'ouvre rien du tout. Le monde ne change pas. Ce sont ses
détails qui deviennent des lieux.
*Demande :* un pas. C'est la leçon gratuite, l'équivalent du pinceau à trois pas
dans le hall.
*L'erreur :* essayer d'atteindre la fente à ×1, tourner autour, se pencher. Dix
secondes, et l'idée s'installe pour tout le reste du jeu qu'un trait d'encre est
peut-être un endroit.

#### 2. LA PERLE — *le portage, et qu'il multiplie*

Au fond de la fente, l'envers du dallage : des racines, un tesson, et une **perle
de 24 centimètres**. En haut, sur le mur du lavoir, un **logement de 96
centimètres**, vide, qu'on avait vu en arrivant sans le regarder.

À ×1/4 on soulève jusqu'à 24,75 : la perle passe tout juste, et elle remplit les
bras et la moitié de l'écran. On remonte par la petite face, on ressort à ×1 — et
**l'on tient un ballon de 96 centimètres**. Il entre.

*Enseigne :* E prend aussi les choses, et ce qu'on porte grandit avec soi.
*Demande :* faire le trajet en portant, au lieu de le faire les mains vides.
*L'erreur, et elle est parfaite :* grandir d'abord et revenir chercher la perle —
sauf qu'à ×1 la fente redevient un trait, et la seule chose qui sort de là-dessous
est ce qu'on a dans les mains. La géométrie force la bonne réponse sans qu'on l'ait
dite.

#### 3. LE CHEVALET — *la feuille*

Une seule feuille, un seul chevalet, un écart de taille évident entre les deux. La
feuille traîne au fond à 0,30 ; le chevalet est en haut et en attend 1,20. On
refait exactement le geste de la perle, mais cette fois ce qu'on obtient n'est pas
un logement pourvu : **c'est le Pinceau qui vient et se met à dessiner.**

*Enseigne :* le papier vient de vous ; ce que vous posez devient une porte.
*Demande :* refaire le geste d'avant en ayant compris qu'il sert à autre chose.
*L'erreur :* poser la feuille devant le chevalet plutôt que dedans. Le chevalet
doit donc être large et son rayon d'accueil généreux. **Cette salle ne doit jamais
être une épreuve d'adresse.**

#### 4. LES TROIS CREUX — *le nombre de portes est une variable*

La première vraie énigme, et elle est arithmétique. Une cour à trois niveaux,
reliée par deux paires imbriquées : ×1/4 en bas, ×1 au milieu, ×4 en haut. Trois
logements, un par niveau — **0,25 · 1,00 · 4,00** — et trois perles identiques de
0,25, toutes en bas.

Une perle reste. Une monte d'une porte. Une monte de deux. Il n'y a rien à
deviner : il y a à compter.

*Enseigne :* la taille d'une chose se règle en choisissant combien de portes elle
franchit. C'est le cœur mécanique de toute la suite.
*L'erreur :* monter la deuxième d'un cran de trop. Rien n'est perdu, on la
redescend. **Le trajet est réversible tant que rien n'est logé.**

> **Loi de sécurité, à appliquer partout : dans une salle, deux logements ne
> doivent jamais accepter la même taille.** Comme les tailles vivent sur un réseau
> de puissances de 4 avec 12 % de tolérance, des tailles distinctes ne se
> confondent jamais. Cette seule règle garantit qu'aucun placement correct ne peut
> être une faute, et rend impossible la salle irrémédiablement cassée — ce qui
> compte double, puisqu'un logement verrouille pour de bon.

#### 5. LA PLUIE — *ne rien demander, et montrer une chose*

Une cour lavée par l'averse, à ×1/4. Rien à résoudre, une seule sortie. Des gouttes
tombent, énormes, et laissent en s'écrasant une traînée d'encre qui s'efface — le
geste d'*Ōkami* que le carnet réclame depuis le début, et qui trouve ici sa seule
justification mécanique.

Ce que la salle installe en douce : **à cette taille, tout ce qui tombe tombe
vite.** On le voit vingt fois sans qu'aucune énigme n'en dépende. Trois salles plus
loin, ça comptera.

#### 6. LE CONDUIT — *une chute est un lieu qu'on traverse*

Un puits vertical de quarante mètres. À trente mètres de fond, une ouverture
latérale de quatre mètres de haut, décalée de six mètres de l'aplomb. Tout en bas,
un bassin de barbotine, mou, et une rampe en colimaçon pour remonter.

La physique décide seule. Le temps de chute varie comme l'inverse de la racine de
l'échelle, la portée horizontale comme sa racine : **le petit a du temps, le grand
a de la portée.** À ×1/4 on tombe trois secondes et l'on dérive à peine plus de
quatre mètres — on passe devant l'ouverture sans l'atteindre. À ×4 on la
franchirait largement, mais on mesure 7,20 et l'ouverture en fait 4. À ×1 on a
juste le temps et juste la portée. Deux raisons indépendantes convergent sur une
seule taille, et le joueur ne calcule rien : il essaie, il manque de temps, il
essaie plus grand, il ne rentre pas, et la troisième fois il a compris.

*L'erreur :* atterrir en bas. Elle ne punit rien — elle offre le puits vu d'en
dessous, quarante mètres de paroi et un rond de ciel, et une minute de remontée.
C'est le plus beau plan du mouvement, et il est réservé à qui s'est trompé.

*Défaut à dire :* ces nombres sont indicatifs. Le contrôle aérien du moteur rend la
portée réelle plus courte que le calcul naïf. **C'est la seule salle de la suite
qui doit être mesurée au banc d'essai avant d'être dessinée.** Si la fenêtre est
trop étroite pour être lisible, on élargit l'ouverture et on décale davantage :
mieux vaut une marge grossière qu'une salle exacte que personne ne franchit.

#### 7. L'ATELIER DE LAVIS — *la couleur, palier 1* (§ 3.5)

#### 8. LE BOL — *croiser tout ce qui précède, et n'enseigner rien*

La salle de bravoure du mouvement : elle ne vérifie que l'acquis.

Une pièce à ×1 : une étagère, un bol à thé posé dessus. **Les deux faces d'une même
paire** sont dans cette pièce, sur deux murs opposés. On traverse, on se retourne :
la pièce est la même et l'on est quatre fois plus petit. L'étagère est un viaduc.
Le bol est une citerne de quatre mètres, où l'on entre par un ébrèchement du bord.

Au fond du bol, un logement. Vu de ×1, il est visible et minuscule : on n'y pose
rien, la main dépose bien au-delà et l'ouverture fait douze centimètres. Vu de
×1/4, c'est un bassin où l'on marche.

*Demande :* comprendre que la solution était sous les yeux depuis l'entrée et
qu'il fallait la regarder d'ailleurs. C'est la thèse du jeu, ramassée dans une
pièce de six mètres.
*L'erreur :* s'acharner à ×1 à viser l'intérieur du bol. Trente secondes, aucune
conséquence, et une bonne colère utile.

#### 9. LE FOND — *ne rien demander, et donner la couleur*

Une grève, à ×1/4, sous une pluie qui a cessé. Le **pinceau bleu** y dort et
n'accepte que ×1/4 — la taille où l'on vit depuis le début du mouvement. Aucune
condition : on a déjà tout fait. On appuie sur E, il s'éveille, il tourne autour de
nous, et l'on remonte tout le mouvement à l'envers.

Le retour est la vraie récompense : la fente redevient un trait dans le dallage. Et
sur la place, le bleu part peindre l'eau.

### Mouvement II — La montée (l'or)

#### 10. LES TOITS — *ne rien demander, et rappeler*

On ressort à ×4 sur les toits du village : le passage obligé de la loi n° 1. La
maison basse dont le toit culminait à 3,40 et qu'on ne pouvait pas atteindre est
une marche. On la connaît par cœur ; on marche dessus.

#### 11. LE CREUX QUI REFUSE — *la main, seule*

Une pièce, un logement, une pièce à emboîter qui a manifestement la bonne forme.
Elle n'entre pas. On la tourne : elle n'entre toujours pas, et aucune rotation ne
la fera entrer. Dans le mur, une porte miroir. On y passe avec la pièce, on
revient, elle entre.

*Contrainte du moteur, assumée plutôt que combattue :* toute porte change la
taille, il n'existe pas de miroir neutre (§ 3.3). La salle est donc dessinée pour
que le changement soit inoffensif — le logement demande justement quatre fois la
pièce. Le joueur lit « la porte l'a corrigée », il a raison, et il ignore encore
que la porte a fait deux choses.

*L'erreur :* passer deux fois. La pièce revient dans sa main et sa taille
d'origine. Rien n'est cassé, tout est visible, et cette erreur-là est le brouillon
de la salle suivante.

#### 12. LE BLANCHIMENT — *croiser la main et la taille, et donner un théorème*

Même dispositif, une exigence de plus : **le logement veut la taille d'origine et
l'autre main.** On peut faire la navette longtemps ; c'est mathématiquement sans
issue (§ 3.3). La salle contient donc une **seconde paire, ordinaire**, à l'autre
bout. Un passage au miroir, un passage à la porte ordinaire dans le bon sens, et le
compte tombe juste.

Et il y a une queue à la comète, qu'il faut dessiner exprès : **on porte l'objet
soi-même, donc on subit les mêmes passages que lui.** On termine l'énigme à une
taille qu'on n'avait pas en la commençant, et le logement doit être du côté où l'on
arrive. Une salle qui rate ce détail est faisable et se sent injuste, ce qui est
pire qu'infaisable.

*Enseigne :* qu'un système a des lois et qu'on peut les déduire au lieu de les
subir. C'est la meilleure sensation que ce jeu puisse produire.

#### 13. L'ESCALIER POUR PLUS TARD — *construire pour une taille qu'on n'a pas*

Le vrai dépassement du pont-qu'on-porte, et la meilleure salle de la suite.

Une falaise de trois mètres soixante, à franchir **à ×1**. On est à ×4 : à cette
taille c'est une marche, et il n'y a rien à résoudre — sauf que la porte qui
continue le voyage est au pied de la falaise et qu'on ne la franchira qu'à ×1.

Quatre cubes de quatre-vingts centimètres traînent là. À ×4, ce sont des galets
qu'on ramasse à la main. Il faut les disposer **en escalier pour quelqu'un qui
mesure 1,80** : des marches de 0,80 (sous l'enjambée de 0,90) espacées de moins
d'un mètre.

*L'erreur est universelle et automatique.* On les espace à l'œil — c'est-à-dire à
son œil de géant — donc de quatre ou cinq mètres. Puis on rapetisse, on se
retourne, et l'on découvre quatre îlots séparés par des gouffres alors qu'on saute
1,30. On n'a pas mal joué : on a pensé à la mauvaise échelle, ce qui est le sujet
du jeu. La correction est gratuite : on remonte, on les rapproche du bout des
doigts, on redescend.

*Loi n° 2 appliquée :* la petite face de la porte mesure 2,80 quoi qu'il arrive.
Posée au pied de la falaise, elle est là, grande comme une porte d'homme et demie,
et elle donne la mesure à qui pense à la regarder. C'est tout ce qu'on doit au
joueur, et c'est suffisant.

#### 14. LA VALLÉE EN MAQUETTE — *ne rien demander, et éblouir*

×16. La côte rouge entière, ses quatre fours, sa voie de chariots, ses bassins —
non pas derrière une balustrade, mais **sous les semelles**. On la traverse en huit
enjambées. Le dernier four, trente mètres qui donnaient le cap pendant deux cents
mètres de marche, arrive à mi-mollet.

Aucune énigme. Et à mi-chemin, **la grue de papier** passe une fois, sans
explication, et ne revient pas. Les plus belles choses d'un monde sont celles qui
n'ont pas de fonction.

*Rappel :* on ne manipule rien à ×16 (§ 3.2).

#### 15. L'ATELIER DU HAUT — *la couleur, paliers 2 et 3* (§ 3.5)

#### 16. LA MIETTE — *ne rien demander, et donner la couleur*

Le **pinceau d'or** dort à ×16, sur une corniche qui n'est une corniche que pour un
géant. On le réveille, on redescend tout le mouvement, et comme on revient d'un
monde où l'on était énorme, ce qu'on rapporte est minuscule : il se pose sur le
creux de 0,36, celui dont personne ne comprenait la taille depuis la première
minute.

### Mouvement III — Le grain, et le plafond

#### 17. LA PIÈCE SANS ÉTALON — *faire peur, sans antagoniste*

Une salle ronde, sans arête, sans montant, sans porte visible. Les parois sont du
grain de papier, et le grain de papier a la même allure à toutes les tailles.
**On ne sait pas quelle taille on fait.** Marcher n'apprend rien ; sauter non plus,
puisqu'on saute toujours 0,72 fois sa propre hauteur.

C'est la seule peur que ce jeu ait le droit d'employer, et elle est gratuite : pas
de créature, pas de menace, rien qui poursuive. Juste la perte de la seule
certitude que trois heures de jeu avaient construite.

La sortie est une **mesure**. On porte une perle dont on connaît la taille ; on la
pose, on la regarde, on sait. Le raisonnement demandé est celui d'un arpenteur, et
je ne connais pas d'autre jeu où l'on puisse le demander.

*Défaut à dire :* pour que la salle morde, il ne faut pas voir la porte par
laquelle on est entré. Cela réclame **une face à sens unique** — piste notée dans
le carnet, jamais faite. Sans elle, la salle est jolie et molle : on se retourne,
on voit le cadre, on sait. À trancher avant de la dessiner.

#### 18. LE GRAIN — *ne rien demander, et être le sommet du jeu*

×1/16. Onze centimètres. La taille que l'introduction n'a jamais donnée, gardée
trois heures pour cet endroit-là.

À cette taille, **le trait d'encre devient du terrain.** Une ligne de contour est
une tranchée où l'on descend ; une tache de lavis est un lac peu profond dont on
voit le bord se dégrader ; le grain du papier est un champ de dunes basses. On
marche littéralement dans le dessin. C'est le seul endroit du jeu qui justifie
entièrement la direction artistique : partout ailleurs, l'encre est une manière de
montrer le monde ; ici, c'est le monde.

*Le coût, et il est réel :* les contours sont un effet d'écran, pas de la
géométrie, et le trait tremble à 10 Hz pour se lire comme une main. Le trait qu'on
foulerait serait une boîte qui l'imite. Ça peut être magnifique ou ça peut être un
mensonge visible, selon l'épaisseur du trait à l'écran à cette échelle. **Un essai
suffira à décider, et il faut le faire avant de bâtir le mouvement autour.** Et
quoi qu'il arrive : une salle. Pas deux.

Une seule énigme y vit, et minuscule : à ×1/16, une goutte d'encre qui tombe est
une catastrophe lente qu'on regarde arriver — la gravité des objets ne suit pas la
nôtre, et l'on s'en souvient depuis la cour de pluie du premier mouvement.

#### 19. LE MONDE RETOURNÉ — *conditionnel* (§ 3.7)

Court, tardif, à une seule taille, avec sa propre couleur de porte et son propre
basculement progressif. Il rend le ciel.

#### 20. LA BOÎTE À FORMES — *ne rien enseigner, tout vérifier*

Le jouet d'enfant, et le meilleur avant-dernier niveau possible pour une raison
précise : **sa règle n'a pas besoin d'être expliquée**, tout le monde y a joué à
trois ans. Il n'enseigne rien, il vérifie.

Cinq pièces, cinq creux. Une ne demande que la forme. Une ne demande que la taille.
Une ne demande que la main. Une ne demande que la couleur. **Et la cinquième
demande les quatre**, et c'est le morceau de bravoure. Une contrainte par pièce
d'abord, toutes sur la dernière : quatre inconnues simultanées font seize
combinaisons, et le joueur tire au sort au lieu de raisonner.

Chaque pièce logée déclenche le sceau d'encre qui se dessine trait après trait. Ce
retour immédiat n'est pas une décoration : sans lui, un échec ne dit pas s'il vient
de la forme, de la taille, de la main ou de la couleur, et le joueur tâtonne.

*Ce niveau exige les objets composites* (§ 3.4), et il ne peut pas être écrit
avant.

Le carnet ajoute que la boîte à formes devrait donner une récompense qui ouvre une
autre branche de l'aventure, « des niveaux qui débloquent des niveaux au lieu d'une
simple file ». **Mon avis : refuser.** Une arborescence demande que le joueur
comprenne qu'il a le choix, donc une carte, donc une interface — et ce jeu n'en a
pas et n'en veut pas. Les cinq socles font déjà ce travail : ils montrent cinq
voyages différents à la première minute, et l'ordre reste libre parce que ce sont
les tailles des portes qui l'imposent, pas un verrou.

---

## 6. Le raccord — ce que le Pinceau fait entre les salles

Pas d'ascenseur, pas de sas, pas de numéro de chambre, pas d'écran de victoire.
Cinq règles.

**Il dessine là où il est perché, à sa taille à lui.** Sa dimension est déclarée
jalon par jalon, pour une raison qui a coûté deux essais : c'est un habitant du
monde, pas un élément d'interface, et sa taille est celle de l'étage, jamais celle
du regard. La porte qu'il trace en hérite.

**Il commence quand vous l'avez rejoint, et vous n'attendez jamais.** Le tracé dure
quelques secondes, par coups irréguliers ; pendant ce temps on marche, on regarde,
on revient sur ses pas. Si le joueur doit rester planté devant une barre qui se
remplit, on a fabriqué un chargement.

**On voit à travers avant d'y entrer.** C'est le contrat de la direction
artistique : chaque région déclare ses couleurs et on les voit à travers la porte
avant même d'y entrer — c'est là que la promesse se fait. Une porte qui se dessine
est donc **un paysage qui apparaît par plaques**, et c'est le seul moment du jeu où
l'on assiste à la fabrication du monde. Il ne faut pas le gâcher en le mettant dans
un couloir : le tracé doit être visible depuis l'endroit où l'on vient de résoudre.

**La porte reste, mais elle reste derrière.** On peut revenir. On ne doit pas la
retraverser par accident en allant chercher la suite.

**Jamais deux portes voisines de couleurs différentes.** Le monde central le sait
déjà : la porte verte et la porte de l'ouest sont à cinquante mètres l'une de
l'autre exprès, parce que deux portes côte à côte sont une seule porte pour le
joueur.

*Une contradiction du carnet, à trancher.* Les règles de comportement du Pinceau
disent : « il n'attend jamais. Un guide qui flotte en attendant qu'on le suive est
un élément d'interface déguisé. » Mais pour dessiner une porte, il faut bien qu'il
soit là quand on arrive. **Mon avis :** il n'attend pas *vous*, il travaille. Il
est perché, il trace autre chose — des marques sans importance, un motif au sol, un
bord de toit qu'il souligne. Quand vous arrivez, il abandonne ce qu'il faisait et
se met à la porte. On lit « je le dérange », pas « il m'attendait ». La règle du
carnet est sauve, et elle est même mieux servie.

---

## 7. Le rythme

Vingt salles-énigmes fatiguent. Le compte, dans ce qui précède : **onze salles
demandent, huit ne demandent rien.** C'est la proportion que je défends, et voici
la règle qui la produit.

> **Jamais trois demandes de suite.** Après deux salles qui exigent, une salle qui
> ne veut rien. Et chaque mouvement se **termine** sur une salle gratuite : celle
> où l'on réveille la couleur.

Une salle gratuite n'est pas une salle vide. Elle porte une des trois charges
suivantes, et jamais deux à la fois.

**Respirer.** La cour de pluie, les toits du village, la grève du fond. On marche,
on regarde, on n'a rien à trouver. C'est aussi là qu'on installe en douce les faits
qui serviront plus tard — la vitesse de chute des objets, la mesure d'un lieu —
sans qu'aucune énigme n'en dépende sur le moment. **Enseigner dans une salle qui ne
demande rien est la seule façon d'enseigner sans tutoriel.**

**Éblouir.** Trois moments, pas plus, sinon rien n'éblouit. La vallée en maquette
sous les semelles à ×16. Le puits vu du fond, réservé à qui s'est trompé. Le grain
du papier à ×1/16. Chacun n'arrive qu'une fois dans la partie, et c'est ce qui les
fait tenir.

**Faire peur.** Sans antagoniste, il reste trois peurs, et elles suffisent.

*Le vertige*, déjà là : l'éperon à cent quatorze mètres, le fond du monde visible
cent vingt mètres sous le belvédère.

*L'enfermement d'échelle* : être à ×1/16 dans une fente pendant qu'une goutte
d'encre tombe lentement vers vous. Rien ne vous fera de mal. Elle tombe quand même.

*Et la vraie, celle que seul ce jeu peut faire :* **ne plus savoir quelle taille on
fait.** On n'a rien à combattre et rien à fuir : on a perdu la seule certitude que
la partie avait construite. C'est de l'angoisse pure, elle ne coûte rien à
produire, et elle se dissipe par un raisonnement plutôt que par une fuite — la
seule façon honnête de faire peur dans un jeu sans violence.

Le mode Rêve, lui, garde l'errance et le désarroi long. **La chaîne ne doit pas lui
faire concurrence :** pas de labyrinthe, pas d'égarement, pas de salles qui se
ressemblent. Une chose par mode.

---

## 8. La fin — et la contradiction du carnet, tranchée

Le carnet propose une fin : l'artefact final est multicolore, le piédestal qui
l'attend l'est aussi, et quand on l'y pose, **tous les pinceaux dansent.**

Je propose autre chose : un dernier atelier où le cadre au mur est vide.

**Ces deux fins ne se contredisent pas, elles ne parlent pas de la même chose. Il
faut les garder toutes les deux, dans cet ordre.** L'une clôt la collection ;
l'autre ouvre l'auteur.

### La danse — la fin de la quête

Cinq pigments rapportés, cinq socles pourvus. Ce qui se pose alors, c'est l'objet
multicolore, et il se pose **sur la pointe de l'Aiguille** — le creux que la
maquette annonçait à la première minute et que le jeu n'a jamais rempli (§ 4). Tous
les pinceaux dansent. Le monde est repeint.

C'est la fin de ce qu'on avait à faire, et elle doit être franche, bruyante et
sans ambiguïté. On a fini.

### Le dernier atelier — la fin du jeu

Puis une dernière pièce, à ×1. Une fenêtre qui donne sur la place du village —
celle de la première minute, celle des cinq socles. Toutes les fées sont là, elles
tournent, elles attendent.

Au mur, un cadre. **Il est vide.** C'est le seul tableau blanc du jeu, et après
quatre ateliers passés à copier une image, c'est la seule instruction dont on ait
besoin. Personne ne dit rien. Il n'y a rien à copier.

La pièce est peignable de bout en bout et toutes les couleurs sont disponibles. Il
n'y a pas de bonne réponse, pas de vérification, pas de porte qui s'ouvre à la fin.
**La porte de sortie est déjà ouverte, et pour la première fois de la partie, ce
n'est pas le Pinceau qui l'a dessinée.**

On peint, ou l'on ne peint pas. On sort quand on veut. La caméra recule sur quatre
cents mètres, le brouillard s'ouvre de trois cents à quinze cents, et les montagnes
apparaissent comme au sacre — sauf que cette fois le monde qu'on découvre porte les
couleurs qu'on vient de poser. S'il n'y en a pas, il est en lavis, et il est beau
aussi.

### Ce que ça dit

Un lavis n'est pas un tableau raté. Les valeurs y sont, le dessin y est, tout y est
sauf la décision. Le Pinceau savait dessiner le monde ; il ne savait pas où mettre
la couleur. C'est la seule chose qu'on lui aura apportée — et on ne la lui a
apportée qu'en changeant assez souvent de taille pour voir ce qu'il ne voyait pas,
parce qu'il vole, et que voler c'est ne jamais être obligé de regarder de près.

Pas de morale, pas de méchant, pas de monde sauvé. Un dessin qu'on a fini à la
place de quelqu'un.

*Le risque, et il est sérieux :* une fin en peinture libre peut se lire comme un
jeu qui abandonne. « Faites ce que vous voulez » est ce que dit un jeu qui n'a plus
rien à dire. Trois garde-fous : **la pièce est petite** — quelques familles, pas un
monde ouvert ; **le cadre vide est cadré comme un événement**, au même endroit du
mur que dans les quatre ateliers précédents, pour qu'on lise l'absence et non le
vide ; et **la fin arrive de toute façon**, qu'on ait peint ou non, sans reproche
et sans félicitation.

---

## 9. Les deux mondes qui vivent à côté

### Le Rêve — gardé, séparé, et il ne doit rien rapporter

Il est fait, il tourne, et il est meilleur que ce que le carnet en espérait. Son
principe — **engendrer de l'espace, pas des énigmes** — est le bon, et l'écueil
qu'il évite (des énigmes aléatoires fades ou insolubles) est réel.

Et il a une propriété qu'aucune conception n'aurait pu prévoir : comme il n'existe
pas de porte neutre dans ce jeu, **une salle sur deux se traverse à une taille
différente sans qu'on ait rien programmé pour ça**, et comme l'anneau compte onze
salles, l'alternance ne se referme pas. On revient à son point de départ, on
reconnaît la pièce jusqu'au moindre pilier, et l'on n'a plus la même taille. C'est
la logique exacte d'un rêve, et elle sort gratuitement de la mécanique de base.

**A-t-il une place dans la suite ? Non, et c'est ce qui le protège.** Le Rêve
possède le labyrinthe, l'errance et l'inquiétude longue. Si la chaîne se met à
faire des dédales, les deux modes se marchent dessus et chacun perd. Une chose par
mode.

**Et il ne doit rien rapporter.** Pas de pigment, pas d'objet, pas de raccourci.
Le carnet suggère d'y semer quelques énigmes écrites à la main comme des jalons :
d'accord, à condition qu'elles ne donnent rien non plus. **Si le Rêve récompense,
il devient une corvée à farmer, et l'errance sans but — qui est tout son sujet —
meurt le jour où il y a un but.** C'est un avis, et je le donne fermement.

Une chose à lui ajouter, et une seule : **c'est là que doivent aller les idées
qu'on a refusées ailleurs.** Une salle injuste, une géométrie qui ne se lit pas,
une porte qui ne mène nulle part — dans la chaîne, ce sont des fautes ; dans le
Rêve, ce sont exactement le bon matériau.

### L'aventure à deux — gardée, et rien à bâtir dessus avant l'essai

Elle est faite. Le niveau de la clairière prouve que la forme fonctionne : chacun
tient la porte de l'autre, le géant seul peut gravir la colonne, le minuscule seul
peut se glisser sous la dalle, et le refus est physique, pas scripté. La règle du
carnet est respectée : **une énigme conçue pour une personne ne devient pas
coopérative parce qu'on est deux, elle devient juste plus facile.**

**Mais elle n'a jamais été essayée à deux vraies machines.** C'est écrit dans
`REPRISE.md` et c'est le fait le plus important de cette section. Tant que cet
essai n'est pas fait, on ne sait rien : ni si la synchronisation tient, ni si
l'appariement par salon fonctionne hors d'un seul navigateur, ni ce que donne le
décalage entre deux joueurs qui se parlent. **Aucune conception ne doit se
construire au-dessus de ça avant.** C'est le premier essai à mener, et il coûte une
heure.

**Faut-il faire des versions à deux des salles de la chaîne ? Non.** Ce sont deux
voyages distincts, avec la même grammaire. Mais **la grammaire de la chaîne
alimente le duo**, et trois de ses idées deviennent franchement meilleures à deux :

*L'escalier pour plus tard* devient l'escalier qu'on bâtit pour l'autre. Le géant
pose des cubes que le petit gravira, et cette fois **l'étalon est une personne** :
il voit son camarade, il voit sa taille, il n'a plus à imaginer. C'est la meilleure
énigme coopérative disponible et elle sort gratuitement de la chaîne.

*Le blanchiment* devient un relais : la pièce doit passer par le miroir et par la
porte ordinaire, et les deux ne sont pas du même côté du monde. On se passe l'objet.

*La pièce sans étalon* devient une conversation : l'un voit une référence, l'autre
non, et il faut décrire. C'est superbe, et ça repose entièrement sur la voix — donc
sur une dépendance hors du jeu, qu'il faut nommer avant de s'y engager.

Le point que le carnet signale et qu'il ne faut pas rater : **chacun doit voir ce
que fait l'autre et comprendre pourquoi il ne peut pas le faire lui-même**, sans
quoi la coopération devient de l'attente. La clairière le règle par un repère
planté à hauteur de géant à côté d'une fente où il n'entrera jamais : il ne peut
pas y aller, mais il peut la **désigner**. C'est le bon réflexe, et il faut le
répéter partout.

---

## 10. L'ambiance — trois chantiers jamais classés

### Le son — le meilleur rapport du carnet, et de loin

Il n'y a **rien**. Pas de vent, pas de pas, pas de froissement quand on traverse.
Le carnet le note comme un manque et le range parmi les pistes ; il devrait être en
haut de la liste, avant tout ce qui est décrit dans ce document.

Et surtout, une ligne du carnet mérite d'être extraite et traitée à part :

> **Transposer les sons avec l'échelle.** À ×4 tout sonne plus grave et plus lent, à
> ×1/4 plus aigu.

C'est presque rien à écrire, et **ça vend le changement de taille presque autant
que l'image**. Aucune idée de ce document n'a un rapport valeur sur coût
comparable. Il faut le faire avant les composites, avant la gravité, avant
d'écrire une seule salle neuve.

Deux notes de plus, gratuites : le tracé de la porte sonne déjà par coups — chaque
tache appelle son bruit, et le crochet existe déjà dans le code, il ne demande
qu'un son. Et **une note quand le Pinceau passe** : le carnet dit que c'est le seul
endroit où le son sert vraiment, et il a raison.

### Le vivant — peu, mais bien choisi

`feuilles.ts` existe. La référence est *Ōkami* : des feuilles ou des pétales qui
dérivent en laissant une traînée d'encre, comme un coup de pinceau qui s'efface.

**Le garde-fou du carnet est le bon, et il faut le tenir :** ne pas en mettre
partout. Une planche encrée tire sa force de ses vides ; quelques feuilles portées
par le vent valent mieux qu'une neige permanente, qui tuerait la lisibilité des
énigmes.

**Et un piège que le carnet ne voit pas :** une feuille qui dérive est un objet du
monde, donc **sa taille est celle du lieu, jamais celle du joueur**. C'est
exactement la leçon qui a coûté deux essais sur la taille du Pinceau — on l'avait
fait suivre la taille du joueur, puis sa taille seulement de près, et les deux
étaient faux pour la même raison : ils faisaient dépendre un objet du monde de qui
le regarde. Le jour où l'on sèmera des pétales dans une région, ils devront
déclarer leur échelle comme les jalons du guide déclarent la leur. À ×16 on doit
voir une pluie de confettis, et à ×1/16 des voiles qui passent au-dessus de la
tête.

### Le téléphone — une contrainte de conception, pas d'habillage

Les mesures sont bonnes : soixante images par seconde sur un téléphone haut de
gamme, avec cinq rendus de scène par image. Le rendu tient tel quel. La réserve
honnête du carnet vaut toujours — rien ne dit ce que donne un appareil d'entrée de
gamme, et le compteur d'images est affiché en permanence précisément pour mesurer
partout plutôt que deviner.

Les commandes tactiles sont un vrai chantier et pas un habillage : tout repose
aujourd'hui sur la capture de la souris, qui n'existe pas sur téléphone.

**Mais ce qui compte le plus pour ce document, c'est la troisième remarque du
carnet, et elle est une loi de conception :**

> Poser une caisse exactement au pied d'une tour demande de viser au doigt près.
> Si le jeu doit tourner sur téléphone, il faut concevoir les énigmes **tolérantes
> au placement dès le départ** — sinon on fabrique dix niveaux qu'il faudra tous
> reprendre.

C'est la chose la plus coûteuse à rattraper après coup de tout le projet. Elle
gouverne trois décisions déjà prises dans ce document : le rayon d'accueil généreux
des chevalets, le refus des énigmes d'adresse (§ 11), et la loi de la main pour la
peinture, qui remplace un curseur par une proximité (§ 3.5).

**Premier pas, gratuit et jamais fait : ouvrir le site sur un téléphone tel
quel.** On ne pourra pas bouger, mais on saura si ça affiche et à quelle vitesse.
Cette seule information décide de la suite.

---

## 11. Ce qu'il faut refuser

Une conception se juge à ce qu'elle écarte.

**L'énigme qui marcherait sans le changement de taille.** C'est le seul test qui
compte. Si une salle se raconte en disant « trouver la clé, ouvrir la porte », on
la jette, quelle que soit sa beauté. Les logements sont un piège de ce point de
vue : ils ressemblent tellement à des serrures qu'on peut en écrire vingt sans
s'apercevoir qu'on a fait un jeu d'inventaire. **Un logement doit toujours poser
une question de dimension, jamais une question de possession.**

**Les dégâts, la mort, le chronomètre.** Le moteur n'en a pas et ne doit pas en
avoir. Une chute coûte du chemin, jamais une reprise. Un joueur qui recommence
n'apprend rien : il refait.

**L'adresse.** Lancer un objet dans une cible, viser un socle à huit mètres, sauter
au pixel près. Agréable à la souris, insupportable au doigt, étranger au sujet. Le
lancer reste dans le jeu comme **expression** — on jette un truc parce que c'est
amusant — et jamais comme **exigence**.

**La manipulation à ×16.** On ne voit pas ses pieds et l'on dépose à des dizaines
de mètres. C'est une taille pour regarder et pour marcher.

**L'orientation comme contrainte.** Il n'y a pas de commande pour tourner ce qu'on
porte. Une contrainte que le joueur ne peut pas satisfaire délibérément est une
loterie (§ 3.3).

**Le cumul d'inconnues.** Forme, taille, main et couleur à la fois font seize
combinaisons. Une contrainte à la fois, puis deux, et le cumul seulement quand il
ne reste plus rien à enseigner.

**Le labyrinthe.** L'architecture à portails cache ses coutures par construction,
donc un dédale est presque gratuit à engendrer — et c'est précisément pourquoi il
ne faut pas en mettre dans la chaîne. C'est le sujet du Rêve. Un jeu ne doit pas
proposer deux fois la même chose sous deux noms.

**La mémoire.** On ne voit jamais les deux côtés d'un portail à la fois. Une énigme
qui demande de retenir un motif vu de l'autre côté n'est pas difficile, elle est
fastidieuse. Si une information doit franchir une porte, **elle doit la franchir
sous forme d'objet**.

**La gravité et l'échelle dans la même porte.** Deux bouleversements d'un coup, et
le joueur ne sait plus lequel a causé quoi.

**Une paire dont le rapport n'est pas 4.** Le carnet la propose : « les échelles se
composent, et il faut trouver la bonne suite de passages pour atteindre une taille
précise ; le puzzle devient arithmétique. » **Refusé.** Il est déjà arithmétique, et
il l'est justement parce que le facteur est toujours quatre : on compte les portes
de tête, et c'est le plaisir central de la suite. Un facteur 2 mêlé à un facteur 4
rendrait le réseau des tailles illisible et transformerait un raisonnement en
calcul. Et cinq tailles se retiennent, se nomment et se dessinent ; six ou dix ne
sont plus qu'une liste.

**Un sixième palier d'échelle.** Même raison.

**Le noir comme ressource qui s'épuise.** L'idée tentante : chaque porte dessinée
coûterait de l'encre au Pinceau, il pâlirait, il faudrait se dépêcher. C'est une
jauge, une menace et un antagoniste en un seul geste — les trois choses que le jeu
s'est interdites. La bonne version de cette émotion existe déjà et elle est
gratuite : **il n'a plus que le noir, et les couleurs endormies au fond des mondes
sont les siennes.** Le manque se constate, il ne se raconte pas.

**Les niveaux qui débloquent des niveaux.** Une arborescence demande que le joueur
comprenne qu'il a le choix, donc une carte, donc une interface. Les cinq socles
font déjà ce travail, en volumes, à la première minute (§ 5, salle 20).

**Le texte.** Sept indices de proximité existent dans le monde central, et c'est
déjà à la limite. **La suite doit en avoir zéro.** Tout ce que ces phrases
disaient, la chaîne le dit autrement : la maquette au pied de l'Aiguille est le
modèle à suivre, pas le panneau.

**Et enfin : refuser d'ajouter une mécanique.** Il y en a assez — l'échelle, le
portage, les logements, le miroir, la couleur, la feuille. Six choses, toutes
combinables entre elles, et la moitié des combinaisons n'a pas encore été écrite.
Un jeu de puzzle meurt de mécaniques neuves bien plus souvent que d'idées
manquantes.

---

## 12. Ce qui reste à trancher, et mon avis sur chaque point

**Dans quel ordre travailler.** Mon avis, et c'est le seul classement qui compte :
d'abord **le son transposé par l'échelle** (quelques lignes, un effet énorme) ;
puis **l'essai du duo à deux vraies machines** (une heure, et il débloque ou
condamne un mode entier) ; puis **les objets composites**, qui rendent visible une
mécanique déjà écrite et en débloquent trois autres ; puis le **mouvement I** de la
chaîne ; les **portails de gravité** en dernier.

**Le chevalet qui rend sa feuille.** C'est la seule entorse demandée au moteur, et
elle contredit une règle posée pour de bonnes raisons. *Mon avis : la faire*, en la
limitant aux chevalets et en la justifiant par la nature de ce qu'ils contiennent —
une décision, pas un progrès. Repli acceptable : plusieurs feuilles.

**La face à sens unique.** *La pièce sans étalon* en dépend, et c'est une piste
jamais essayée. *Mon avis : la faire, pour un seul usage*, et se méfier — une porte
qu'on ne peut pas retraverser est le plus court chemin vers un joueur piégé, ce qui
est le pire défaut possible.

**Le trompe-l'œil du trait à ×1/16.** *Mon avis : un essai avant tout engagement.*
Si ça ne tient pas, le mouvement III perd son sommet et il faudra lui en trouver un
autre — la salle sans étalon peut le porter.

**La taille d'entrée du jardin.** Question ouverte de `REPRISE.md`. *Mon avis : ne
rien changer, et en faire la loi n° 3* (§ 3.1) — mais alors l'appliquer exprès
partout, et pas seulement là où l'accident nous a rendu service.

**Le Rêve récompense-t-il ?** *Mon avis : non, jamais, sous aucune forme.*

**La molécule ou la boîte à formes en premier ?** *Mon avis : la molécule.* Elle a
une seule contrainte (la main), elle est la meilleure vitrine des composites, et
elle enseigne quelque chose de vrai. La boîte à formes cumule et doit venir après,
quand il n'y a plus rien à enseigner.

**Le nombre réel de salles.** Vingt est ce que ce document décrit ; c'est beaucoup,
et il vaut mieux dix salles écrites entièrement que vingt esquissées. **Le mouvement
I se tient tout seul** : il enseigne le portage, la feuille, l'arithmétique des
portes, la chute, la couleur, et il rend une couleur au monde. Si l'on ne devait en
faire qu'un, ce serait celui-là, et il ne manquerait rien au reste du jeu pour être
fini.

**Un fossile à ne pas confondre avec un plan.** Le long commentaire de `monde.ts`
qui décrit l'encrier — ses trente-six centimètres, sa fenêtre de tailles, la preuve
du parcours par l'objet lui-même — décrit une mécanique **abandonnée**, remplacée
par les pinceaux endormis. Il est resté dans le code et il est très convaincant.
Quelqu'un le lira un jour et croira qu'il reste à faire. Il ne reste rien à en
faire : la promesse qu'il portait est reprise § 4, et elle se paiera sur la pointe
de l'Aiguille.
