# Ce que le moteur fait vraiment

Des nombres mesurés en simulation, pas déduits. On les écrit ici parce qu'ils
coûtent cher à retrouver et qu'ils contredisent le calcul de coin de table.

**La règle qui gouverne ce fichier : on mesure d'abord, on dessine ensuite.**
Elle a été apprise trois fois — sur le couloir du jardin, sur le tas de feuilles,
et sur le conduit ci-dessous.

## Sauter, tomber, dériver

| grandeur | valeur |
|---|---|
| temps de chute | `t = √(d / 13·échelle)` — exactement doublé à chaque cran vers le petit |
| accélération en l'air | `15,96 · échelle` m/s² · en sprintant `28,73` |
| **plafond de vitesse en l'air** | `9,50 · échelle` m/s · en sprintant `17,10` |
| **temps pour l'atteindre** | **0,600 s**, à toutes les échelles, avec ou sans sprint |

C'est cette rampe de 0,6 s que le calcul balistique naïf ignore, et il se trompe
alors **dans les deux sens** : à ×1, une chute de 30 m donne 11,5 m en théorie,
11,95 m mesurés à l'arrêt, et **16,50 m lancé avec un saut**. Jusqu'à +43 %.

**L'élan change tout.** À ×1 sous 30 m de chute : 11,95 m à l'arrêt, 13,85 m en
courant, **16,50 m en courant ET en sautant**. Une salle de saut se conçoit donc
en décidant d'abord si elle exige l'élan — c'est un enseignement, pas un détail.

### LE SPRINT COURT, IL NE VOLE PAS — corrigé le 2 août

Il multipliait la portée par 1,8, en l'air comme au sol, quand un cran d'échelle
ne la multiplie que par 2. Un joueur à ×1/4 qui sprintait récupérait donc **90 %
de la portée d'un joueur à ×1 qui marche** : toute fenêtre de conception fondée
sur la taille tenait dans dix points, et l'échelle ne décidait plus de rien.

Le sprint garde **tout au sol** — traverser un lieu sans s'ennuyer, ce pour quoi
il existe — et **1,15 en l'air**, où il décidait de ce qu'on peut franchir.

| sous 30 m de chute | marche | sprint | rapport |
|---|---|---|---|
| ×1/4 | 4,21 | 5,02 | ×1,19 |
| ×1 | 16,83 | 20,08 | ×1,19 |
| ×4 | 57,01 | 67,48 | ×1,18 |

**Le ×1/4 qui sprinte atteint désormais 54 % du ×1 qui marche, au lieu de 90.**
La fenêtre passe de dix points à quarante-six.

**Et la loi d'échelle vaut DEUX, pas quatre** — je l'avais écrite à quatre, la
mesure a corrigé : sous une même chute du monde, le grand a plus de temps ET
plus de vitesse, mais le temps varie comme la racine. Mesuré : ×2,17 par cran.
C'est précisément pour ça que 1,8 était dangereux — il fallait le comparer à 2,
pas à 4.

## Passer par un trou

Le seuil est net, sans jeu : c'est la boîte de collision, point. La marge est
donc entièrement un choix de conception.

| échelle | corps | passe dès |
|---|---|---|
| ×1/4 | 0,17 × 0,45 | 0,18 × 0,46 |
| ×1 | 0,68 × 1,80 | 0,70 × 1,80 |
| ×4 | 2,72 × 7,20 | 2,74 × 7,22 |

## LE CONDUIT — la géométrie mesurée

Lèvre du puits en `x = 0`, `y = 0`.

| | |
|---|---|
| profondeur | **42 m** |
| lèvre → paroi opposée | **20,5 m** |
| section transversale | **12 m** (sans effet balistique ; à garder > 8 pour le ×4) |
| **vire saillante** | saillie **5 m**, dessus à **−32 m**, épaisseur 1,2 m |
| ⇒ **arête extérieure** | **x = 15,5 m** — *la seule cote qui décide de tout* |
| ouverture | **2,40 large × 3,60 haut**, seuil à −32 m |
| marche au seuil du tunnel | **0,40 m** (verrou redondant, voir plus bas) |

### La vire n'est pas un ornement, et c'est la mesure qui l'a imposée

Avec un simple trou dans la paroi, **la salle ne marche pas.** Un joueur trop
rapide tape le mur au-dessus de l'ouverture ; sa vitesse horizontale est remise à
zéro à chaque pas de simulation, et il glisse. À 39 m/s, il franchit les 3,60 m
d'ouverture en 0,09 s et ne regagne que **six centimètres** latéralement. Il ne
peut pas entrer.

Mesuré sur un trou nu : à ×1 on ne réussit que 4 fois sur 6, et **à ×4 on ne voit
jamais l'ouverture** — on percute la paroi vingt mètres plus haut et l'on glisse
jusqu'au fond. La leçon « le grand ne rentre pas » ne se joue même pas.

Avec la vire, quiconque atteint 15,5 m s'y pose quelle que soit sa vitesse. La
portée redevient le seul critère, et le géant obtient une terrasse d'où
contempler une porte trop petite pour lui. C'est l'image qu'on voulait.

### La fenêtre, et sa largeur exacte

Balayage de l'arête extérieure, six façons de sauter × trois tailles :

| arête | ×1/4 | ×1 | ×4 |
|---|---|---|---|
| 14,2 m | **fuite** — sprint + saut se pose sur la vire | passe | bloqué |
| **14,4 m** | plancher : plus rien ne passe | passe | bloqué |
| **15,5 m** | échoue partout | passe | se pose, n'entre pas |
| **17,2 m** | échoue | plafond : au-delà, ×1 sans sprint n'y arrive plus | bloqué |

**Fenêtre = [14,4 ; 17,2] m.** À 15,5 :

- **×1/4 n'a pas la portée.** Son meilleur coup absolu atteint 14,34 m : il manque
  de 1,16 m, soit **2,6 fois sa propre taille**. C'est visible, ce n'est pas un
  pixel.
- **×1 passe** avec 1,83 m de rab en courant et sautant sans sprint. Ne passent
  pas : se laisser tomber à l'arrêt, et courir sans sauter. **C'est
  l'enseignement, pas un défaut.**
- **×4 ne rentre pas** : il lui faut 2,74 de large, l'ouverture en fait 2,40.
  Contre-épreuve faite — portée à 2,80, il entre par les six chemins. C'est donc
  bien la largeur qui verrouille.

**Ne jamais descendre l'arête sous 14,6 m** : à 14,2, un ×1/4 qui sprinte se pose
sur la vire et l'énigme est morte. Si la fenêtre paraît trop juste un jour, le
levier est `SPRINT_MULTIPLIER`, pas la géométrie.

**La marche de 0,40 m au seuil du tunnel** est un verrou redondant et gratuit :
à ×1/4 l'enjambée vaut 0,225 et le saut monte à 0,323, donc infranchissable ; à
×1 l'enjambée vaut 0,90 et l'on passe sans même la voir.

### Et ce qui reste à dessiner autour

Une **boucle de reprise**. Les échecs de ×1/4 et de ×1 atterrissent au fond, à
−42 m ; le ×4 reste planté sur la vire. Sans remontée, la salle est un piège et
non une énigme — et il faut que la remontée tienne **sous une dizaine de
secondes**, parce que le joueur doit rater deux fois avant de comprendre. Si le
troisième essai coûte trop cher, il n'aura pas lieu.


## LA CATAPULTE DU LINTEAU — défaut connu, reproductible, non corrigé

Trouvé en écrivant la correction de la marche, le 2 août. **Ce n'est pas le même
défaut**, et il est plus grave.

### Ce qui se passe

`moveAxis`, pour une descente, résout sur le **dessus** de toute boîte pénétrée.
C'est juste pour un sol : on tombe dessus, on s'y pose.

Un joueur de 1,80 arrêté au ras d'une porte basse **touche** son linteau — son
corps va de 0 à 1,80, le linteau de 1,20 à 1,70. La gravité de l'image suivante
le résout donc sur le dessus du linteau.

### La reproduction, exacte

Un sol, un seuil de 6 cm, un linteau dont le dessous est à 1,20 et le dessus à
1,70, deux jambages qui ferment les côtés. On marche vers la porte :

```
tick 35   x=0.00  y=0.000  z=-0.940     (arrêté contre le jambage)
tick 36   x=0.00  y=1.700  z=-0.913     ← posé sur le linteau
tick 67   x=0.00  y=1.660  z= 1.230     (passé par-dessus le mur)
```

**On franchit donc n'importe quel mur en le longeant**, du moment qu'il porte un
linteau — c'est-à-dire dans toute porte trop basse pour soi.

### LA CAUSE EXACTE, trouvée le 2 août

Ce n'est pas un défaut de conception de la gravité : **c'est une erreur
d'arrondi.**

La résolution latérale pose le corps EXACTEMENT au bord de ce qu'il heurte —
`h.minZ − rayon`. À la virgule flottante près. Mesuré sur le cas ci-dessus :

```
z = −0,95   boîte z −1,290 … −0,610   →  0 contact
z = −0,94   boîte z −1,280 … −0,600   →  1 contact : le linteau
```

La boîte s'arrête à `−0,600` contre un linteau qui commence à `−0,6`, et le
dernier bit décide. Quand il tombe du mauvais côté, le corps **pénètre** le
linteau — et la gravité de l'image suivante le pose dessus.

### Cinq corrections essayées, cinq échecs, et ce qu'ils apprennent

1. **Filtrer dans `moveAxis`** ce qui est plus haut qu'une marche au-dessus d'où
   l'on venait. Casse trois vérifications de niveau : quand tous les contacts
   sont écartés, la fonction annonçait quand même un appui, et le joueur se
   retrouvait « au sol » en l'air.
2. **Idem, en renvoyant « pas de collision »** quand plus rien ne reste. Pire :
   dans une scène dense on perd le contact au sol une image, la chute
   s'accélère, on traverse une dalle, et l'on tombe à l'infini — mesuré à
   **y = −208 221**.
3. **Refuser une accroche au sol qui remonte.** Sans effet : le saut ne vient
   pas de l'accroche mais de la gravité elle-même.
4. **Rentrer la boîte du corps d'un dixième de millimètre.** Un corps plus mince
   passe **entre les montants d'une balustrade** : le parapet du belvédère cesse
   de retenir à ×16.
5. **Séparer d'un micron à la résolution latérale.** Même symptôme que 4 : le
   parapet du belvédère lâche. Tout ce coin du moteur est en équilibre sur le
   contact EXACT, et le moindre jeu ouvre un passage ailleurs.

### Ancien inventaire des tentatives

**La leçon :** un correctif juste au mauvais endroit est un correctif faux, et
mieux vaut un défaut connu qu'un monde sans sol.

### La piste pour la prochaine passe

Les cinq échecs disent tous la même chose : **on ne peut pas donner du jeu à la
collision** sans ouvrir un passage ailleurs, parce que les balustrades du jeu
sont calibrées au diamètre du corps.

Il reste donc une seule direction : **traiter la pénétration comme une
pénétration**, et non comme un appui. Quand une descente ne peut se résoudre que
sur une boîte dont le dessus est plus haut que la tête du joueur, ce n'est pas
un sol — c'est un corps étranger. La bonne réponse est de repousser
LATÉRALEMENT, sur l'axe par lequel on y est entré, et non de poser le joueur
dessus.

Cela demande de savoir par quel axe la pénétration est arrivée, donc de garder
la position d'avant le pas complet — pas seulement celle d'avant l'axe courant.
C'est un vrai petit chantier, pas un réglage, et c'est pour ça qu'il attend.
