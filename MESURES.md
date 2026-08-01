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

**Le sprint est le vrai danger d'équilibre.** Il multiplie la portée par 1,8 ;
un cran d'échelle la multiplie par 2. Un joueur à ×1/4 qui sprinte récupère donc
**90 % de la portée d'un joueur à ×1 qui marche**. Toute fenêtre de conception
fondée sur l'échelle tient dans cet écart de 10 %.

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
