# Protocole de test — la nuit du 2 août

Tout ce qui suit a été **mesuré, simulé, prouvé** : 369 vérifications passent.
Rien de tout cela ne dit si c'est **beau**, ni si l'on **comprend** ce qu'on doit
faire. C'est ce que tu vas chercher.

Chaque entrée donne la touche, le geste, ce que tu dois voir si c'est juste, et
**ce qui trahirait un défaut**. Ce dernier point est le plus utile : quand
quelque chose cloche sans qu'on sache dire quoi, c'est souvent qu'on regardait
la mauvaise chose.

---

## LE PROTOCOLE EST DANS LE JEU

Ce fichier est la version longue. **La version qu'on suit est dans le jeu**, et
elle s'ouvre sans taper d'adresse :

> **Trois touchers sur l'affichage de l'échelle**, en haut à gauche, en moins
> d'une seconde et demie.

Un panneau s'ouvre : les cinq mondes en une ligne, puis la liste des choses à
faire, dans l'ordre. **Touche le titre** d'une ligne pour aller à l'endroit où on
la fait ; **touche la case** à gauche pour la cocher. Ce qui est coché survit au
rechargement — sans quoi on recommencerait la liste vingt fois par séance.

C'est un geste que personne ne fait par hasard : le jeu envoyé à quelqu'un
d'autre reste propre.

---

## Comment lancer

```bash
start "https://hugohismans.github.io/sumi-portals/"
```

- **le hall** — l'adresse nue.
- **l'introduction** — `?niveau=monde` · ajoute `&neuf=1` pour oublier les
  couleurs déjà rapportées.
- **la descente** (six salles, on y cherche le bleu) — `?niveau=descente`
- **la montée** (six salles neuves, on y cherche l'or) — `?niveau=montee`
- **les repères** — ajoute `&debug=1` à l'un ou l'autre. Une touche par moment ;
  `H` replie la liste. Le mode débug a sa propre sauvegarde : il n'abîme plus ta
  partie.

---

## 1. Le hall — `./?debug=1`

C'était un couloir à trois arches. C'est devenu un terrain d'expérience.

**Ses huit lignes sont maintenant DANS le jeu**, comme celles des autres mondes.
Elles n'y étaient pas — le hall était le seul endroit que le protocole ne
couvrait pas, alors que c'est le seul où l'on arrive par défaut. Et ce trou en
cachait deux autres, qui ne pouvaient se voir qu'en cliquant une ligne dans le
hall : l'adresse de rechargement s'y écrivait `?niveau=null`, et le
rechargement se déclenchait sur des couleurs que le hall ne possède pas.

**Le canevas.** Prends le petit stylo sur le tablier, clic gauche maintenu, écris
sur la toile. Prends le gros, écris à côté. → *Le trait du second doit être
visiblement plus épais. Les deux dessins restent côte à côte.*
**Défaut à guetter :** un trait en pointillés au lieu d'une ligne continue (le
lien entre deux marques ne se ferait pas), ou un trait qui saute d'un bout à
l'autre de la toile quand tu relâches et reprends.

**La toile se souvient.** Écris quelque chose, recharge la page. → *C'est encore
là.* La cuve au pied de la toile efface tout.

**Le bac aux galets.** Quatre pierres, la dernière fait 1,70. → *Elle refuse de
se soulever*, et la réponse — les portes — est à vingt mètres.

**Les stylos aux portes.** Un petit contre la porte indigo, un énorme contre la
vermillon. Franchis avec le petit en main. → *Il ressort quatre fois plus gros,
et ton trait avec.*

**L'établi.** Deux billes identiques, deux creux de tailles différentes. L'une se
pose telle quelle ; l'autre doit franchir une porte pour grossir. Le grand creux
garni ouvre **le cabinet**. → *Dedans, une Aiguille en réduction et cinq creux
vides.*

**Le levier de rappel**, sur le chemin des arches. → *Tout retourne à sa place.*
C'est ce qui autorise à tout essayer.

**La toise**, trois trous. → *Tu vois de quelle taille tu es.* Elle se contourne
par les deux bouts : c'est un miroir, pas une serrure.

---

## 2. Ce qui a changé dans l'introduction — `?niveau=monde&debug=1`

| touche | ce qu'il faut regarder |
|---|---|
| `1` | **Tout est gris.** La moindre couleur est un défaut — y compris la terrasse et le belvédère, qui naissaient colorés et ne le font plus. |
| `5` | **Devant la porte, le pinceau rouge te suit.** Un pas en avant, tu franchis, et le geste se joue. |
| `6` | Le rouge repeint le village. |
| `-` | Pareil pour le vert. |
| `]` | **Le sacre** : la caméra recule, le brouillard s'ouvre, les montagnes apparaissent, le titre vient après. |

**La couleur qui se pose.** Le geste dure 4,6 secondes maintenant, et il commence
par un temps d'arrêt : le pinceau frappe, **rien ne bouge**, puis l'encre part.
→ *Tu dois avoir le temps de tourner la tête et de regarder la couleur PARTIR,
au lieu de la découvrir arrivée.* Le front est bruité, avec des gouttes qui
courent devant et une frange plus sombre qui le suit.
**Défaut à guetter :** que ça reste trop rapide, ou que le front ait l'air d'un
cercle propre.

**Le vert est vert.** En rentrant du jardin, les toitures et les murs prennent un
vert franc. → *On doit savoir de quel monde on revient.*

**Les escaliers.** Monte et descends. → *Les deux doivent se sentir pareil.*
Avant, descendre faisait « clac clac clac ».

**Le mot.** Il est écrit à même le papier, sans cadre ni fond. Vide, il n'existe
plus du tout.

**Le pinceau qui traverse une porte.** → *Il entre par le MILIEU de l'ouverture,
et il met plus longtemps à traverser une grande distance qu'une petite.*

**On ne gagne plus en franchissant une porte.** Rendre la dernière couleur ne
déclenche plus rien : il faut **monter à la pointe de l'Aiguille**.

---

## 3. La descente — `?niveau=descente&debug=1`

Six salles neuves. **Aucune n'a jamais été regardée.**

**`1` — Le lavoir.** Un bassin, des dalles, un creux vide dans le mur, un
chevalet. Entre deux pavés, **un trait au sol**. → *Tu dois avoir envie d'aller
voir ce trait, et ne pas pouvoir.*

**`2` — Le trait devient un ravin.** À quarante-cinq centimètres. → *Un sol, des
parois, une ombre. Une perle et une feuille au fond. Une rampe pour ressortir,
qu'on remonte sans jamais sauter.*
**L'erreur à faire exprès :** grandir d'abord et revenir chercher la perle. *Tu
ne dois pas pouvoir l'attraper.*

**`3` — Le chevalet.** Pose la feuille dessus. → *Le Pinceau vient et trace la
porte, tache par tache.* Puis **reprends la feuille** : *la porte doit se
resceller et son dessin s'effacer.*
**Défaut à guetter :** devoir viser au centimètre pour poser la feuille. Cette
salle ne doit jamais être une épreuve d'adresse.

**`4` — Le conduit.** Un puits de quarante mètres, une ouverture dans la paroi.
Essaie à ×1/4 : *tu manques de portée*. À ×4 : *tu te poses sur la vire et tu ne
rentres pas*. À ×1 sans élan : *tu tombes*. À ×1 en courant et en sautant : *tu
passes*.
**Défaut à guetter :** que ça passe du premier coup, ou que ça ne passe jamais.

**`5` — Le fond du puits.** Réservé à qui s'est trompé : *quarante mètres de
paroi et un rond de ciel*. Puis remonte. → *Moins de dix secondes.* Au-delà, le
troisième essai n'aura pas lieu.

**`6` — Les trois creux.** Trois perles identiques, trois creux de tailles
différentes. Une reste, une monte d'une porte, une de deux.
**L'erreur à faire exprès :** monte-en une d'un cran de trop, puis redescends-la.
*Rien ne doit être perdu.*

**`7` — L'atelier de lavis.** Le cadre au mur montre la pièce **avec les claies
en rouge**. Approche-toi d'une claie, appuie. → *Elles se peignent une par une,
portées par la fée qui traverse la pièce.*
**L'erreur à faire exprès :** essaie de peindre le mur. *Refus — il est trop
grand pour toi.*
**Défaut à guetter, et c'est le plus important de la nuit :** que tu ne
reconnaisses pas la pièce dans le tableau. La grande jarre au fond de l'allée est
là pour ça, dans les deux vues. Si ça ne suffit pas, c'est la salle qu'il faut
reprendre.

**`8` — Le bol.** Les deux faces d'une même porte, dans une seule pièce. Traverse,
retourne-toi. → *C'est le même endroit, et tu es quatre fois plus petit.
L'étagère est un viaduc, le bol une citerne.*
**L'erreur à faire exprès :** essaie de poser la pierre dans le bol à taille
d'homme. *Impossible* — huit cent mille essais le disent.

**`9` — Le fond, le pinceau bleu.** Une grève sous une pluie qui a cessé. → *E le
réveille, mais seulement à ×1/4.* À toute autre taille il frémit et refuse.

**`0` — La cour de pluie**, le détour. Rien à résoudre. → *De grosses gouttes
s'écrasent et laissent un anneau d'encre qui sèche. Sous l'auvent, il ne tombe
rien.*

---

## 3 bis. La montée — `?niveau=montee&debug=1`

Six salles neuves, **aucune jamais regardée**, et une idée qui dormait depuis
des semaines : **la main**. Les portails miroirs étaient écrits et vérifiés
depuis longtemps, mais on dessinait chaque objet avec un cube — et un cube n'a
pas de main gauche. La **vrille** (quatre cubes en escalier hélicoïdal, la plus
petite forme chirale qui existe) lui donne enfin un corps.

**`1` — Les toits.** Le village de la première heure, vu à ×4. → *Tu dois
reconnaître l'endroit avant de comprendre quoi que ce soit.* La maison dont le
toit culminait à 3,40 et qu'on ne pouvait pas atteindre est une marche : on
monte dessus sans y penser.
**Défaut à guetter, et c'est le seul qui compte ici :** ne pas reconnaître le
village. Si ça arrive, la salle ne vaut rien et il faut la reprendre.

**`2` — Le creux qui refuse.** Une vrille au sol, un creux à sa forme. Présente-la
→ *elle refuse, et tu crois que c'est la taille.* Porte-la par la porte du fond,
ressors quatre fois plus grand, elle entre.
→ *Elle a AUSSI changé de main, et rien ne te l'a dit.* C'est voulu : cette
salle est le brouillon de la suivante.

**`3` — Le blanchiment.** Le creux veut la taille d'origine **et** l'autre main.
La navette au miroir ne peut pas marcher — un nombre impair de passages ne fait
jamais une taille nulle, c'est de l'arithmétique et non de la difficulté. Il
faut la **seconde porte, ordinaire**, derrière le mur de refend.
→ *Et on ne la voit qu'en étant grand : la tête passe au-dessus de la lame.*
**Défaut à guetter :** ne jamais la trouver, et faire la navette dix minutes. Si
ça arrive, le mur de refend est trop haut ou mal placé.

**`4` — L'escalier pour plus tard.** À ×4, en haut d'une falaise de 3,60. Quatre
cubes de 0,80 traînent là : dispose-les **en escalier pour quelqu'un d'1,80**,
marches à moins d'un mètre l'une de l'autre. Puis rapetisse, retourne-toi.
**L'erreur est automatique et elle est le sujet :** on les espace à son œil de
géant, donc de quatre mètres, et l'on découvre quatre îlots séparés par des
gouffres. On n'a pas mal joué — on a pensé à la mauvaise échelle.
→ *La correction doit être gratuite : on remonte, on rapproche, on redescend.*

**`5` — L'atelier du haut.** La couleur, paliers 2 et 3. Deux familles, deux
couleurs, deux tailles : descendre peindre les pots, remonter peindre les
tuiles. Puis le point de vue — un tabouret quelque part, et **depuis lui seul la
composition du tableau se referme**.

**`6` — La vallée en maquette.** ×16. La côte rouge entière **sous les
semelles**, traversée en huit enjambées. Le dernier four, trente mètres qui
donnaient le cap pendant deux cents mètres de marche, arrive à mi-mollet.
→ *À mi-chemin, une grue de papier passe une fois et ne revient pas.* Elle
n'ouvre rien, personne ne la mentionnera, c'est pour ça qu'elle est là.
Au bout, sur une corniche qui n'est une corniche que pour un géant, **l'or**.

### Les trois choses de la montée que je n'ai pas su juger

Les six salles ont été ouvertes dans le navigateur : **aucune erreur de shader,
les palettes s'appliquent, la géométrie est là aux trois échelles.** C'est tout
ce qu'un écran peut me dire. Trois questions restent, et elles sont pour toi.

**1. Les fours de la vallée lisent-ils comme des ruches, ou comme des flaques ?**
Les deux nombres de la conception sont incompatibles : « huit enjambées » impose
une réduction au 1/1,8, « le four de trente mètres arrive à mi-mollet » impose
1/7,2. Son autrice a gardé les deux en écrasant les **hauteurs** quatre fois
plus que le plan, au motif qu'une maquette se lit en plan et non en silhouette.
Vue de haut, ça tient. **Vue à hauteur d'œil, je n'ai pas su trancher.** Si les
fours lisent plat, le levier est un seul nombre — `HAUT = PLAN / 4` devient
`PLAN / 2,5`, et les fours passent à sept mètres, mi-cuisse, sans toucher au
plan ni à la longueur.

**2. Le plateau de l'escalier est nu.** Du sable jusqu'à l'horizon, et la fosse
n'est visible que d'assez près. C'est peut-être juste — on doit chercher où
l'on va — et peut-être vide. À regarder en arrivant, avant de savoir où est la
fosse.

**3. Les toits se reconnaissent-ils ?** C'est la seule question qui décide de la
première salle. Rien de ce que j'ai vérifié ne peut y répondre.

---

## 4. Ce que ce chantier pourrait avoir cassé

À vérifier même si ça n'a rien à voir :

- **le voyage de l'introduction**, de bout en bout — c'est le plus gros risque,
  le moteur a beaucoup bougé ;
- **le sacre**, qui a changé d'endroit : il part au sommet et plus à la dernière
  couleur ;
- **l'aventure à deux**, jamais essayée sur deux machines ;
- **le mode rêve**, `?niveau=reve&graine=7`.

---

## 5. Ce que je sais déjà ne pas savoir

Par honnêteté, avant que tu le trouves :

- **Rien de la descente n'a été vu.** Palettes, lisibilité, allure des lieux :
  tout est mesuré, rien n'est regardé. Le panneau du navigateur s'est fermé avant
  que je puisse faire le tour.
- **Le tableau se lira-t-il ?** Le cadrage est prouvé, la lecture non.
- **Le sprint rend le conduit facile** à ×1. Le levier serait une constante du
  moteur, pas la géométrie.
- **Le bol fait 1,12 m** — ce n'est pas un bol à thé. « Quatre mètres à ×1/4 »
  impose un mètre d'intérieur. J'ai gardé la mesure et perdu le mot.
- **La chiralité reste invisible.** Les objets sont des cubes, et un cube n'a pas
  de main gauche. Elle attend une forme.
- **Une famille entière de fautes reste possible :** le franchissement de marche
  sonde une marche PLEINE, donc un seuil de six centimètres peut fermer un
  passage sous un linteau. Ça a déjà mordu une fois cette nuit.
