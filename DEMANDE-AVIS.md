# Prompt à coller dans une autre IA

Tout ce qui suit, sous la ligne, est à copier tel quel.

---

Tu es un concepteur de jeux vidéo expérimenté, avec du goût et de la mémoire :
tu as joué à *Portal*, *Antichamber*, *Superliminal*, *The Witness*, *Manifold
Garden*, *Gorogoa*, *Monument Valley*, *Outer Wilds*, *Chants of Sennaar*,
*Animal Well*. On te demande un avis franc et des idées, pas des compliments.

Je te décris un jeu en cours de développement. Il est jouable de bout en bout.
Lis tout — surtout la section « ce qu'on a déjà refusé », qui existe pour
t'éviter de me proposer ce que j'ai déjà écarté.

---

## 1. LE JEU

**Lavis.** Jeu de réflexion à la première personne, dans un navigateur. Rendu en
lavis d'encre (sumi-e) : aplats de gris, contours à l'encre, papier grainé,
aucune texture photographique. Tout le décor est fait de **boîtes alignées sur
les axes**, sans une seule rotation ni une seule courbe — c'est un choix
esthétique autant que technique, et il ne changera pas.

**La prémisse.** Le monde est un dessin à l'encre qui a perdu ses couleurs. On
part chercher des pinceaux de couleur endormis dans de petits mondes, et on les
ramène. Chaque couleur rendue repeint une partie du village, en direct, sous les
yeux du joueur.

**Le verbe unique, et il n'y en a qu'un :**

> **Franchir une porte multiplie ou divise votre taille par quatre.**

Toujours quatre. Sans exception. Une porte a une grande face et une petite face :
on rapetisse en entrant par la grande, on grandit en entrant par la petite. La
petite face mesure **toujours 2,80 m de haut**, quelle que soit la porte — c'est
le mètre-ruban du monde, planté dans le décor, et le joueur finit par s'en servir
sans qu'on le lui ait dit.

Le joueur mesure 1,80 m à l'échelle 1. Les paliers accessibles vont de ×1/1024
(1,7 mm) à ×64 (115 m). En pratique on joue entre ×1/4 (45 cm) et ×16 (28,8 m) ;
au-delà le monde devient impraticable, et c'est voulu — on ne l'interdit pas, on
laisse l'inutilité s'installer.

**Ce qu'on porte change de taille avec soi.** Un caillou de 10 cm ramassé quand
on est petit devient un rocher d'1,60 m après deux portes. C'est le cœur de
presque toutes les énigmes : *le nombre de portes qu'un objet franchit est une
variable*.

**Les portes miroirs.** Certaines paires inversent la gauche et la droite. Ce qui
les traverse en ressort en image miroir. Une forme chirale — nous employons le
tétracube « vis », quatre cubes en escalier hélicoïdal, la plus petite forme
chirale qui existe en cubes collés — ne peut donc **pas** être remise à
l'endroit en la tournant. Il faut la repasser au miroir. C'est un fait de
géométrie, jamais énoncé dans le jeu.

**Les logements.** Un creux accepte une pièce en comparant **quatre valeurs**, et
jamais une géométrie : la forme (par son nom), la taille, la main (gauche ou
droite), la teinte. Aucun test d'intersection. Ce qui veut dire qu'une énigme
entière tient dans quelques lignes de données.

**La couleur est une mécanique, sous une seule loi :**

> **On ne peint que ce qu'on pourrait tenir.**

Un objet est peignable si son plus grand côté passe sous le seuil qui décide
déjà si on peut le soulever : un peu plus de la moitié de sa propre hauteur. Un
pot est peignable à ×1 ; un toit, seulement à ×4 ; une falaise, à ×16 ; le grain
d'une pierre, à ×1/16. **La palette accessible est donc partitionnée par la
taille.** Un tableau au mur montre l'état où la pièce devrait être ; on s'approche
d'un objet, on appuie sur une touche, et la fée qu'on a réveillée quitte l'épaule,
vole jusqu'à lui, le peint, puis va peindre les autres membres de sa famille
**un par un** — parce que si sept objets basculaient au même instant, on verrait
un interrupteur au lieu de comprendre ce qu'est une famille.

Un tableau peut aussi être peint **depuis un point de vue précis**, et le
retrouver devient l'énigme. Dans une salle, il est peint depuis l'intérieur d'un
bassin, à 45 cm de haut — on cherche l'endroit, il n'existe pas, parce que c'est
une **taille** qu'on cherche et non une position.

**Le guide.** Un pinceau volant précède le joueur de jalon en jalon. Quand une
condition est remplie — poser une feuille sur un chevalet, par exemple — il vient
et **dessine la porte suivante**, tache après tache, sous les yeux du joueur. Il
n'y a rien derrière tant que personne n'a tendu la page. Reprendre la feuille
efface le dessin et rescelle la porte.

---

## 2. CE QUI EXISTE AUJOURD'HUI

Cinq mondes, jouables, enchaînés.

**Le hall** — un terrain d'expérience, sans énigme obligatoire. Une toile sur
laquelle on dessine vraiment, avec des stylos dont **l'épaisseur du trait dépend
de la taille du stylo** : on fait grossir son stylo en le portant à travers une
porte, et son trait grossit avec. Un bac de galets dont le plus gros refuse de se
soulever. Un établi avec deux billes identiques et deux creux de tailles
différentes. Un levier qui remet tout à sa place — c'est lui qui autorise à tout
essayer. Une toise à trois trous, qui n'ouvre rien et sert seulement à savoir de
quelle taille on est. Trois arches : seul, à deux, ou le rêve.

**L'introduction** — un village en lavis gris, une aiguille rocheuse, deux petits
mondes accessibles par des portes (un jardin où l'on est minuscule, une côte
rouge où l'on est immense). On rapporte le rouge et le vert, le village se
repeint, et la fin se joue au sommet de l'aiguille.

**La descente** — six salles, on y cherche le bleu. Un trait d'encre entre deux
pavés devient un ravin quand on mesure 45 cm. Un puits de quarante mètres où le
petit n'a pas la portée, le grand ne rentre pas par l'ouverture, et seul celui de
taille moyenne passe — à condition de prendre son élan. Un bol posé sur une
étagère, vu des deux côtés d'une même porte, qui devient une citerne. Une cour
sous la pluie où l'on ne résout rien.

**La montée** — six salles, on y cherche l'or. On ressort sur les toits du
village qu'on a arpenté pendant trois heures, et la maison dont le toit était
inatteignable est devenue une marche. Deux salles enseignent la chiralité l'une
après l'autre : la première fait croire au joueur qu'une porte corrige la taille
(il a raison, et il ignore qu'elle en a corrigé deux) ; la seconde exige la
taille d'origine **et** l'autre main, ce qui rend la navette au miroir
mathématiquement sans issue et force à trouver une seconde porte, ordinaire. Une
salle où l'on dispose des cubes en escalier alors qu'on mesure sept mètres, pour
l'homme d'1,80 qu'on va redevenir — et l'erreur est universelle : on les espace
à son œil de géant, et l'on se retrouve au fond d'un trou avec quatre îlots
séparés par des gouffres. Enfin la côte rouge entière, en maquette, **sous les
semelles**, traversée en huit enjambées.

**Le rêve** — un mode génératif, sans but.

**À deux.** Deux joueurs peuvent se retrouver, se voir, se passer des objets,
franchir des portes ensemble et se voir changer de taille. Pas de chat, pas de
texte : seulement des gestes et des objets.

---

## 3. LES LOIS QU'ON NE NÉGOCIE PAS

Elles ne sont pas des contraintes techniques mais l'identité du jeu. Une idée qui
en viole une sera écartée, si bonne soit-elle.

1. **Une porte vaut exactement un cran d'échelle.** Ni deux, ni zéro.
2. **Aucune interface.** Pas de carte, pas d'inventaire, pas de menu, pas de
   journal, pas d'objectif affiché, pas de tutoriel écrit. Une phrase de temps en
   temps, à même le papier, et c'est tout.
3. **Rien ne blesse.** Pas d'ennemi, pas de mort, pas de chronomètre, pas de
   dégâts de chute, pas d'échec définitif.
4. **On ne piège jamais le joueur.** Aucune situation d'où l'on ne peut pas
   revenir. C'est le seul défaut que ce jeu ne se pardonne pas.
5. **Le spectaculaire est la récompense de l'erreur.** Se tromper doit coûter du
   temps et donner une image, jamais coûter une partie.
6. **Une salle revisite un lieu connu, à une taille nouvelle.** Une salle qui ne
   revient sur rien est décorative et sera coupée.
7. **La forme est pour l'œil et pour la serrure, jamais pour la physique.** La
   collision reste la boîte englobante, droite, toujours.
8. **On explique le moins possible.** Si une règle a besoin d'être écrite, c'est
   que la salle est mal dessinée.

---

## 4. CE QUE LE MOTEUR SAIT FAIRE, ET RIEN D'AUTRE

Sois précis dans tes propositions : ce qui suit est la totalité du vocabulaire
disponible. Une idée qui demande autre chose est un projet, pas une idée.

**Les actions du joueur, en tout et pour tout :** marcher, courir, sauter,
regarder, une touche d'action (prendre / poser / réveiller / peindre / actionner),
un bouton (lancer ce qu'on tient, ou tracer si on tient un stylo).

**Nombres mesurés, proportionnels à la taille :**

| | ×1/4 (45 cm) | ×1 (1,80 m) | ×4 (7,20 m) | ×16 (28,8 m) |
|---|---|---|---|---|
| enjambée (marche sur une marche de) | 0,225 | 0,90 | 3,60 | 14,40 |
| saut (hauteur) | 0,32 | 1,29 | 5,18 | 20,74 |
| on soulève (et on peint) jusqu'à | 0,25 | 0,99 | 3,96 | 15,84 |
| portée de bras | 0,72 | 2,88 | 11,52 | 46,08 |
| on repose l'objet à, devant soi | 0,9 | 3,6 | 14,4 | 57,6 |
| boîte de collision | 0,17 × 0,45 | 0,68 × 1,80 | 2,72 × 7,20 | 10,9 × 28,8 |

Le son est transposé exactement par l'inverse de l'échelle : grand joueur, monde
grave ; petit joueur, monde aigu. Le brouillard, lui, ne bouge pas — une même
distance, c'est la même quantité d'air, quelle que soit la taille de celui qui
regarde.

**Ce que le moteur ne sait PAS faire :** faire tourner quoi que ce soit, animer
le décor, produire une courbe, gérer un fluide, faire monter ou descendre une
plateforme, tenir un état continu autre que la position des objets.

---

## 5. CE QU'ON A DÉJÀ REFUSÉ, ET POURQUOI

**Lis attentivement.** Chacune de ces idées a été proposée, examinée, et écartée
pour une raison. Si tu veux en défendre une malgré tout, dis-le explicitement et
attaque l'argument — c'est autorisé, et même intéressant. Mais ne me la propose
pas comme si elle était neuve.

- **Une arborescence de niveaux** (des niveaux qui en débloquent d'autres).
  *Refusé :* il faudrait que le joueur comprenne qu'il a le choix, donc une carte,
  donc une interface.
- **Un chat entre joueurs.** *Refusé :* le silence est ce qui rend les gestes
  lisibles. Deux personnes qui se passent un objet sans un mot se comprennent
  mieux qu'avec.
- **De la physique de rotation pour les objets composites.** *Refusé :* coques
  tournantes à écrire, jeu instable, et personne ne se plaint qu'une pièce en L se
  cogne comme un cube.
- **Un cran d'échelle supplémentaire** (un facteur autre que 4). *Refusé :* le
  verbe unique est ce qui rend tout le reste lisible.
- **Des dégâts de chute.** *Refusé :* cela transformerait chaque énigme verticale
  en épreuve d'adresse, ce que ce jeu n'est pas — et on y joue au doigt sur un
  téléphone.
- **Des collectibles, des succès, une monnaie, un score.** *Refusé sans
  discussion.*
- **De la génération procédurale pour les niveaux principaux.** *Refusé :* elle
  existe déjà pour le mode rêve, où l'absence de but la rend supportable. Une
  salle générée ne peut pas revisiter un lieu connu.
- **Un miroir neutre** (une porte qui inverse la main sans changer la taille).
  *Refusé :* toute porte change la taille, c'est la loi n° 1, et les salles sont
  dessinées pour que le changement soit inoffensif quand il faut.

---

## 6. CE QU'ON SAIT DE NOS PROPRES FAIBLESSES

Je te les donne parce qu'un avis qui les ignore ne me sert à rien.

- **La couleur ne revient que dans le monde central.** On réveille le pinceau
  bleu au fond de la descente et l'or au bout de la montée, et… le niveau se
  termine. Six salles pour une récompense qui n'a nulle part où se poser.
- **Le troisième mouvement est conçu mais pas bâti.** Son sujet : une salle ronde
  sans arête et sans étalon, où l'on ne sait plus quelle taille on fait, parce que
  le grain du papier a la même allure à toutes les échelles.
- **On n'a jamais joué à deux sur deux vraies machines.** Tout le code réseau est
  écrit et vérifié en simulation, jamais éprouvé.
- **Le jeu n'a aucune tension.** C'est délibéré, mais je ne sais pas si trois
  heures tiennent sans autre moteur que la curiosité.
- **On ramasse à travers les murs** (le test de prise ne vérifie aucune
  occultation). Défaut connu, contourné deux fois par de la géométrie.
- **La fin est un titre et deux liens.** Ce n'est pas une fin.

---

## 7. CE QUE JE TE DEMANDE

Réponds en français, en markdown, dans cet ordre, sans préambule ni conclusion.

### A. Ton diagnostic, en dix lignes maximum

Qu'est-ce que ce jeu réussit, et qu'est-ce qui, d'après cette description seule,
te paraît fragile ou creux ? Sois direct. Si tu penses que la thèse du jeu ne
tient pas sur trois heures, dis-le et dis pourquoi.

### B. Douze idées de salles ou de mécaniques

Pour chacune, **exactement ce format**, et pas plus de dix lignes :

> **Le nom de la salle** — *ce qu'elle enseigne, en cinq mots*
> **L'image :** la chose qu'on raconterait à un ami en sortant.
> **La géométrie :** trois lignes maximum, avec des nombres compatibles avec le
> tableau du § 4.
> **L'erreur :** ce que le joueur va faire de travers, et pourquoi cette erreur
> est bonne.
> **Pourquoi ici :** en quoi cette idée est impossible dans un autre jeu que
> celui-ci.

Ce dernier point est éliminatoire. Une idée qui marcherait aussi bien dans
n'importe quel jeu d'énigmes ne m'intéresse pas — je cherche ce que **le facteur
quatre** rend possible et que rien d'autre ne rend possible.

Répartis-les ainsi :
- **quatre** qui n'utilisent que ce qui existe déjà (§ 1 et § 4) ;
- **quatre** qui demandent une brique nouvelle, mais **une seule**, que tu nommes
  explicitement en une phrase ;
- **quatre** qui sont des **moments** et non des énigmes : rien à résoudre, une
  image, dix secondes. Ce jeu en a besoin autant que d'énigmes, et c'est le
  registre où je manque le plus d'idées.

### C. Trois provocations

Trois idées dont tu penses que je vais les refuser — y compris parmi celles du
§ 5 — et pour lesquelles tu argumentes quand même. Attaque l'argument que j'ai
donné, ne le contourne pas.

### D. La question de la fin, et celle de la couleur

Deux problèmes concrets, deux réponses concrètes :

1. Comment finit un jeu qui n'a ni combat, ni score, ni antagoniste, ni mort, et
   dont le sujet est le changement d'échelle ? Le nôtre finit par un plan de
   caméra au sommet d'une aiguille, et ça ne suffit pas.
2. Où poser une couleur rapportée d'un voyage qui se joue **ailleurs** que dans le
   monde qu'elle doit repeindre ? Sachant qu'un écran de transition est exclu, et
   qu'on refuse de fondre tous les niveaux en un seul.

### E. Une chose que tu as vue et que je n'ai pas dite

Une seule. Quelque chose qui découle de ce que j'ai décrit, dont je n'ai
manifestement pas conscience, et qui pourrait être une occasion ou un danger.

---

**Contraintes de ta réponse :** pas de flatterie, pas de « excellente idée », pas
de résumé de ce que je viens d'écrire. Des noms propres, des nombres, des images.
Si une de tes idées est impossible avec le moteur décrit au § 4, dis-le toi-même
plutôt que de me laisser le découvrir.
