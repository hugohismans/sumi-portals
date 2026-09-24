# Protocole de test — les nuits du 2 et du 3 août, et celle du 22 septembre

Tout ce qui suit a été **mesuré, simulé, prouvé** : 758 vérifications passent.
Rien de tout cela ne dit si c'est **beau**, ni si l'on **comprend** ce qu'on doit
faire. C'est ce que tu vas chercher.

Chaque entrée donne la touche, le geste, ce que tu dois voir si c'est juste, et
**ce qui trahirait un défaut**. Ce dernier point est le plus utile : quand
quelque chose cloche sans qu'on sache dire quoi, c'est souvent qu'on regardait
la mauvaise chose.

---

## PAR OÙ COMMENCER, SI TU N'AS QU'UNE DEMI-HEURE

Seule la montée a été jouée sur un vrai PC (le 24 septembre). Dans l'ordre du risque,
du plus gros au plus petit :

1. **Le banc d'essai**, `?niveau=banc&debug=1` — douze stations en une marche,
   une par chose que le moteur prétend faire et que personne n'a regardée.
2. **Les deux salles chirales de la montée**, `?niveau=montee&debug=1`, touches
   `2` et `3` — réécrites le 24 septembre : miroir PLAN au refus, tout se
   porte (voir § 3 bis). C'est le chantier le plus récent, donc le moins vu.
3. **La mesure**, `?niveau=mesure&debug=1` — le troisième mouvement, assemblé
   la nuit du 22 septembre, jamais joué (voir § 3 septies).
4. **Le voyage de l'introduction, de bout en bout** — `?niveau=monde`. Le
   moteur a encore bougé sous lui : deux correctifs de physique sur les pièces.
5. **Le hall**, `./?debug=1`. C'est là qu'on arrive par défaut, donc là qu'un
   défaut coûte le plus cher.
6. Le reste, dans n'importe quel ordre.

**Ce qu'aucune vérification ne peut te dire, et qui est le vrai sujet :** est-ce
que tu comprends ce qu'on te demande sans qu'on te l'écrive.

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
- **l'introduction** — `?niveau=monde`. Elle repart toujours du gris ;
  `&neuf=1` ne sert qu'avec `&debug=1`, dont la mémoire est séparée.
- **la descente** (six salles, on y cherche le bleu) — `?niveau=descente`
- **la cour de pluie** (seule, une respiration) — `?niveau=pluie`
- **la montée** (sept salles, on y cherche l'or) — `?niveau=montee`
- **la mesure** (trois salles, on y perd la taille) — `?niveau=mesure`
- **la boîte à formes** (cinq pièces, cinq creux) — `?niveau=formes`
- **le banc d'essai** (treize stations) — `?niveau=banc`
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
en rouge**. Approche-toi d'une claie, appuie. → *Elles prennent le rouge — la
première couleur que tu sais dire.* Appuie encore → *elles passent au vert* :
on dit les couleurs qu'on a rapportées, dans l'ordre où on les a apprises, et
une couleur est une décision, donc elle se reprend. *(Jusqu'au 22 septembre,
rien ne se peignait hors du village : seule une fée qui nous suit savait dire
une couleur, et les fées n'existent que là-bas.)*
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

*(La cour de pluie n'est plus dans la descente : voir § 2 ter.)*

---

## 2 ter. La cour de pluie, seule — `?niveau=pluie&debug=1`

Elle était un détour de la descente, depuis le lavoir, et se lisait comme une
erreur de chemin (« je ne comprends pas l'intérêt de cette salle »). Elle vit
seule : on y entre par le seuil ouest à ×1/4, on traverse, le seuil est en est
le but.

**`0` — Sous l'averse.** Rien à résoudre. → *De grosses gouttes s'écrasent et
laissent un anneau d'encre qui sèche. Sous l'auvent, il ne tombe rien.* Regarde
**les trois chutes** : la nappe qui tombe du bord de l'auvent, le jet de la
goulotte du puits, et l'égouttement sous le banc — deux gouttes par seconde, le
seul qu'on puisse regarder debout dessous et au sec. Et l'échelle des choses
ordinaires vue de quarante-cinq centimètres : le caniveau est un canal, la
flaque un lac, le dessous du banc une galerie.
**`1` — Le seuil est.** La sortie est dans l'axe de l'entrée, à vingt-sept
mètres : on doit la voir depuis le seuil, et l'atteindre en marchant, sans un
saut.
**Défaut à guetter :** des gouttes qui traversent le toit de l'auvent ou
l'assise du banc ; une pluie qui s'arrête net à une frontière visible ; des
anneaux qui flottent au-dessus du sol.

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

**`2` — Le creux qui refuse.** *(Réécrit le 24 septembre : le miroir est PLAN,
et ce qu'on porte à travers un miroir est réfléchi comme ce qu'on lance.)* Une
vrille au sol, un creux à sa forme **et à sa taille**. Pose-la → *le creux dit
qu'elle N'ENTRE PAS, que la tourner n'y changera rien.* Deux portes noires,
une contre chaque mur, des **mains** de part et d'autre de chacune : en
regardant par l'une, celles d'en face sont retournées. Porte la vrille par la
porte est → *tu ressors à l'ouest, à la même taille, et LA COUR EST RETOURNÉE :
la pile de pierres a changé de côté, les mains aussi ; la vrille dans tes bras,
elle, n'a pas bougé.* Pose-la : elle entre. La porte de sortie est dans le mur
nord, noire elle aussi (elle ne change rien) : on la passe vers le nord.
**Défaut à guetter :** ne pas voir que le monde a basculé (regarde la pile,
puis tes propres déplacements : à gauche va à gauche à l'écran, c'est voulu) ;
une phrase de refus qui ne vient pas ; **la vrille en main qui changerait de
forme au passage** — c'était le défaut, elle doit garder sa forme ; une porte
ordinaire qui montrerait un monde inversé une fois qu'on est passé par le
miroir (c'était l'autre défaut, corrigé). Et une chose voulue : **une vrille
lancée qui s'arrête à côté du creux n'y entre pas** — un creux ne prend qu'une
pièce POSÉE. Deux passages s'annulent : rien n'est jamais perdu.

**`3` — Le blanchiment.** Le creux veut la taille d'origine **et** l'autre main.
Deux portes qui se ressemblent : le **miroir** contre le mur ouest (il change
la main ET la taille), la porte **ordinaire** contre le mur est (la taille
seule), un mur de refend entre les deux, une brèche au nord. Porte la vrille
par le miroir → *droite et 2,00, géant, « elle déborde ».* Rapporte-la par la
grande face ordinaire → *0,50, toujours droite, et le creux est à dix mètres.*
L'autre ordre marche aussi (ordinaire ↑, miroir ↓).
Le théorème : la main ne change qu'au miroir, et jamais sans la taille ; la
taille se corrige à la porte ordinaire, sans toucher à la main.
On arrive par le mur sud, face à la cour ; on repart par le mur nord, vers le
nord.
**Défaut à guetter :** ne jamais trouver la brèche ; ne pas voir que les deux
portes ne font pas la même chose ; rester géant sans savoir comment
redescendre (la grande face ordinaire, ou la grande face du miroir). Et
l'erreur PARFAITE, à faire exprès : miroir, courir au creux avec la vrille trop
grosse, la rapporter par la porte ordinaire — et comprendre après coup.

**Partout dans la montée — le dos des portes.** Une porte vue de derrière est
une **feuille tendue** dans son cadre : on ne voit rien à travers, on ne passe
pas. → *Tu la contournes, et de face elle montre l'autre côté.* On ne
traverse plus jamais un cadre par derrière.
**Défaut à guetter :** une porte dont tu ne trouves pas le devant ; une feuille
qui apparaîtrait de FACE (elle ne doit exister que derrière).

**Le compteur, en haut à gauche.** Il dit « N images/s ». Les portes sont
toujours rendues à pleine résolution, dans le seul rectangle qu'elles occupent
à l'écran. → *Une porte au loin doit être aussi nette que le décor autour
d'elle.* Si la cadence reste basse dans la cour du refus, dis-le avec le
chiffre.

**`4` — L'escalier pour plus tard.** À ×4, en haut d'une falaise de 3,60. Quatre
cubes de 0,80 traînent là : dispose-les **en escalier pour quelqu'un d'1,80**,
marches à moins d'un mètre l'une de l'autre. Puis rapetisse, retourne-toi.
**L'erreur est automatique et elle est le sujet :** on les espace à son œil de
géant, donc de quatre mètres, et l'on découvre quatre îlots séparés par des
gouffres. On n'a pas mal joué — on a pensé à la mauvaise échelle.
→ *La correction doit être gratuite : on remonte, on rapproche, on redescend.*
*Mesuré, à savoir avant de juger :* un géant POSE un cube trois mètres devant
lui — depuis la lèvre, il tombe sur les vires, contre la paroi ; et un géant
qui LANCE en regardant le fond envoie le cube par-dessus la fosse, dans la
galerie (rien n'est perdu : on l'y ramasse à ×1). La fosse fait 3,60, hauteur
de genou pour un géant : il peut y descendre et y poser où il veut.
**Défaut à guetter :** ne pas comprendre qu'on ne remonte pas sans cube ; un
cube qui « colle » à la paroi sans qu'on puisse monter dessus (il faut moins
d'un demi-mètre de jeu, c'est mesuré).

**`5` — L'atelier du haut.** La couleur, paliers 2 et 3. Deux familles, deux
couleurs, deux tailles : descendre dire le rouge aux pots, remonter dire le bleu
aux tuiles — chaque appui fait défiler rouge, vert, bleu, et l'on s'arrête sur
la bonne. Puis le point de vue — un tabouret quelque part, et **depuis lui seul
la composition du tableau se referme**.
**Sans couleur rapportée, rien ne se peint, et la porte de la vallée reste
scellée.** Les repères (`&debug=1`) donnent le rouge, le vert et le bleu ;
sinon, joue les voyages dans l'ordre. *(Jusqu'au 22 septembre la montée était
infinissable : personne ne pouvait peindre ici, et rien ne le disait.)*
**Défaut à guetter :** ne pas comprendre qu'appuyer encore change la couleur ;
la phrase « Tu dis le rouge » qui n'apparaît pas.

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

## 3 septies. La mesure — `?niveau=mesure&debug=1`

Le troisième mouvement, assemblé la nuit du 22 septembre à partir de deux salles
écrites en août et reliées à rien. **Jamais joué.** Il ne rapporte pas de
couleur : il retire ce qui permet de savoir quelle taille on fait, et le rend.
On y arrive au bout de la montée ; il mène à la boîte à formes.

**`1` — La rive.** On arrive à ×4 à l'ouest d'un quai. → *Trente mètres d'eau,
une falaise en face.* Vers l'est, la passe : 2,40 m de large, on ne descend pas
là. Dans l'éperon, une baie à six mètres, et au fond une serrure pour une arête
de 3,60. Trois galets de 0,90 au quai.
**Le geste :** rapetisser par la grande porte à l'ouest, porter un galet dans
la petite face, ressortir géant avec un bloc de 3,60.

**`2` — La serrure, depuis la lèvre.** Debout au méridien, trois mètres au sud
de la lèvre, le bloc dans les bras. **Lève les yeux d'environ vingt-trois
degrés** vers la baie et lâche (E). → *La pièce entre dans une baie où l'on
n'entrera jamais, et la serrure clique. La porte de sortie se dessine au sud.*
**Défaut à guetter :** la pièce qui tombe dans la passe (elle se repêche du
bout des doigts depuis la lèvre) ; une pièce posée dans la baie qu'on ne peut
plus reprendre ; ne pas trouver l'angle — en dessous de vingt degrés elle bute
sur la tablette, c'est mesuré.

**`3` — Le grain, le vaste lobe.** On y tombe de trente et un mètres, et l'on
ne remonte pas. **L'affichage de la taille s'est tu.** → *Des parois de grain
de papier, aucune arête, rien qui se répète. Une graine au sol près du puits ;
plus loin un creux, et une graine énorme à côté.*
**Défaut à guetter, et c'est le seul qui compte :** savoir quand même quelle
taille on fait — par le brouillard, par le Pinceau, par n'importe quoi. Si tu
le sais, dis par quoi : c'est ça qu'il faut éteindre.

**`4` — Le grain, le menu lobe.** Le même lieu, quatre fois plus petit, au bout
d'un goulet coudé. Un creux de 0,72 attend la graine du vaste ; la graine d'ici
ne se soulève pas. **C'est la mesure :** deux gestes, dont un qui échoue, et
l'on connaît sa taille. Pose la graine → *la porte de sortie se dessine au sud.*
**Défaut à guetter :** reconnaître le lobe SANS pouvoir dire s'il a grandi ou si
l'on a rétréci, c'est le but ; en être sûr trop vite est le défaut.

**`5` — Le seuil.** Une dalle nue. On arrive quart d'homme, la porte dans le
dos. → *Marche vers le bout de la dalle, retourne-toi : la plus petite porte du
jeu, soixante-dix centimètres, pour quelqu'un de quarante-cinq.* Le lien de fin
mène à la boîte à formes.
**Défaut à guetter :** ne pas lire la porte comme un étalon ; un premier pas
qui la retraverse (elle est dans le dos, ça ne doit pas arriver).

---

## 3 ter. La boîte à formes — `?niveau=formes&debug=1`

Le jouet d'enfant, et sa règle n'a pas besoin d'être expliquée : tout le monde y
a joué à trois ans. **Elle n'enseigne rien, elle vérifie.**

Cinq pièces, cinq creux, de gauche à droite : la **teinte**, la **forme**, la
**taille** seule, **les quatre à la fois**, la **main**.

**`1` — La planche.** → *Chaque creux ne refuse que pour SA raison.* C'est cette
séparation qui fait l'énigme : un creux qui refuserait pour deux raisons
n'apprendrait rien, et l'on tirerait au sort — quatre inconnues simultanées font
seize combinaisons.
**Défaut à guetter, et c'est le seul qui compte :** ne pas voir lequel des cinq
refuse pourquoi. Si le retour n'est pas immédiat et lisible, la salle est morte.

**`2` — Le bloc.** Trois mètres. À taille d'homme on soulève 0,99. → *Il faut
devenir géant pour le prendre, puis redescendre EN LE PORTANT* : il tombe à 0,75
et entre. La porte ordinaire ne touche ni à sa forme ni à sa main.

**`3` — Le miroir.** Les deux vrilles y passent. → *Elles changent de main ET de
taille d'un seul franchissement.* Refaire l'aller-retour rend tout à l'état
d'origine : rien n'est jamais perdu, et c'est ce qui autorise à essayer.

**`4` — Le coffre.** → *Il n'attend pas un creux, il les attend tous les cinq.*
Sa petite face fait 70 cm : le jouet rentre dans sa boîte, et nous avec.
**Défaut à guetter :** qu'il s'ouvre trop tôt, ou qu'il ne se dessine jamais.

**Ce que la simulation garantit déjà, et qu'il est inutile de chercher :** chaque
pièce n'a qu'une seule destination possible, et chaque creux n'accepte qu'une
seule pièce. C'est balayé sur sept crans d'échelle et les deux mains — trois cent
cinquante cas — parce qu'un creux ordinaire **verrouille pour de bon** : une
pièce logée au mauvais endroit serait perdue, et la salle morte sans retour.

---

## 3 quater. Le refus qui parle — partout où il y a un creux

**Neuf.** Jusqu'ici, un creux qui refusait une pièce ne disait rien : elle
restait posée à côté du trou, et rien au monde ne permettait de savoir laquelle
des quatre valeurs clochait — la taille, la forme, la couleur, la main. Quatre
inconnues font seize combinaisons, donc on essayait au hasard.

**Le geste :** pose une pièce à côté d'un creux qui n'est pas le sien. Attends
une demi-seconde.
→ *Le cadre du creux se rétracte une fois*, et une phrase vient.

Les cinq phrases, et il n'en vient **jamais deux à la fois** :

| ce qui cloche | ce qu'on entend |
|---|---|
| trop grande | « Elle déborde. Le creux est taillé plus menu que ce que tu portes. » |
| trop petite | « Elle danse dans le creux. Il la faudrait plus grande. » |
| la forme | « Ce n'est pas ce dessin-là. Le creux en attend un autre. » |
| la couleur | « La forme est juste, la couleur non. » |
| **la main** | « Bonne taille, bon dessin, et elle n'entre pas. La tourner n'y changera rien. » |

**L'ordre est la pédagogie, et il se teste.** Prends une pièce fausse sur tout et
approche-la : tu dois entendre **la taille** d'abord, parce que c'est la seule
que tu voyais déjà. Corrige, réessaie : la forme. Puis la couleur. **La main ne
s'entend qu'en dernier**, quand tout le reste est juste — c'est-à-dire au moment
exact où elle est la seule explication possible.

**Le meilleur endroit pour l'éprouver :** la boîte à formes, `?niveau=formes`,
qui a un creux pour chacune des quatre exigences.

**Défaut à guetter :** deux phrases qui se coupent la parole, ou une phrase qui
arrive avant que la pièce ait fini de tomber. Et surtout — **que la dernière
phrase ne suffise pas.** Elle est censée faire comprendre le miroir sans jamais
prononcer le mot. Si tu l'entends et que tu ne sais toujours pas quoi faire,
c'est elle qu'il faut réécrire.

**Ce que je n'ai PAS pu vérifier :** ces phrases n'ont jamais été vues à
l'écran. Le panneau du navigateur ne s'affichait pas au moment de la correction,
donc la boucle d'image ne tournait pas. Toute la logique est prouvée en
simulation — l'événement part, avec la bonne raison, dans le bon ordre — mais
l'affichage lui-même n'a pas été regardé une seule fois.

---

## 3 quinquies. On ne ramasse plus à travers les murs

**Neuf, et c'est un défaut du moteur, pas d'une salle.** La prise ne testait
qu'une distance et un angle — pas un mot sur ce qu'il y a entre l'œil et
l'objet. Comme la portée de bras suit la taille (2,88 m à hauteur d'homme,
11,52 m à ×4, **46 m à ×16**), on cueillait ce qui était dans la pièce voisine,
sous le plancher, ou de l'autre côté d'une cloison.

**Le geste :** mets-toi contre un mur, avec un objet connu juste derrière, et
essaie de le prendre. À ×4 ou ×16 de préférence.
→ *Rien ne se passe.* Fais un pas de côté pour le voir : *il se reprend.*

**Ce qui trahirait un défaut, et c'est le vrai risque :** un objet que tu vois
parfaitement et que tu ne peux plus prendre. Le test porte sur le **centre** de
l'objet ; une caisse dont seule une arête dépasse d'un mur est donc refusée. Si
ça t'arrive dans un endroit où ça semble injuste, note où — c'est le seul
réglage possible.

**Ce que la simulation garantit déjà :** dans les cinq mondes, chaque objet
reste attrapable depuis au moins un endroit. Le balayage complet, fait avant de
brancher, a compté 4 688 postes de prise : 11,3 % traversaient de la pierre, et
**aucun objet n'est devenu insaisissable**. Les trois seuls fortement amoindris
sont au fond de la fente du lavoir et dans le bol — ils perdent les angles qui
passaient par le dallage, ce qui est précisément la leçon que ces salles
voulaient donner.

---

## 3 sexies. LES LUCARNES — la couleur se pose enfin quelque part

**C'est le plus gros manque du jeu, et il vient d'être bouché.** On traversait
six salles pour réveiller le bleu au fond du bol, six autres pour l'or au bout
de la vallée — et le niveau s'arrêtait. La couleur ne se posait nulle part.

Derrière la dernière porte de chaque voyage, il y a maintenant **une maquette du
village au seizième**. La porte n'a aucune condition : elle est ouverte, on voit
le village **gris** à travers.

**Le geste :** réveille le pinceau, puis **tourne-toi vers la porte et ne bouge
plus.**
→ *Le village prend sa couleur, là-bas, pendant que tu es encore dans la salle
grise.* Le bleu va à l'eau — bassin, gouttières, puits. L'or va à la lumière —
lanternes, bouches de four, rais sous les portes.
Puis franchis : **tu te retrouves debout dans le village que tu viens de
colorier.**

**Défaut à guetter, et c'est celui qui a failli tout annuler :** que ça bascule
d'un coup au lieu de se peindre. Le front d'encre est une sphère centrée sur le
pinceau, et la maquette est à six cent cinquante mètres de là — il passait donc
tout son temps à balayer la vallée, puis rattrapait la lucarne en **0,21 s**.
Corrigé : la course se compte désormais **depuis la région**, pas depuis le
pinceau, et la maquette met 3,77 s à se peindre. Si tu vois encore un
basculement instantané, c'est que le correctif n'a pas pris.

**Et regarde bien AVANT :** on doit reconnaître le village en gris, sans un
mot. Le torii, la cour creusée et son liseré, la maison basse au toit rouge sont
déjà en couleur pour ça. **Si tu ne reconnais pas l'endroit, les deux salles
sont à reprendre** — c'est leur seul critère.

---

## 4. Ce que ce chantier pourrait avoir cassé

À vérifier même si ça n'a rien à voir :

- **le voyage de l'introduction**, de bout en bout — c'est le plus gros risque,
  le moteur a beaucoup bougé ;
- **le sacre**, qui a changé d'endroit : il part au sommet et plus à la dernière
  couleur ;
- **l'aventure à deux**, jamais essayée sur deux machines ;
- **le mode rêve**, `?niveau=reve&graine=7` ;
- **tout ce qui se pose dans un creux** : un creux attend désormais qu'une
  pièce se soit posée avant de la prendre (il happait une pièce en vol). Une
  pièce posée qui ne rentre plus serait ce correctif qui a trop mordu ;
- **tout ce qui passe une porte en glissant au sol** : une pièce ne ressort plus
  jamais dans le plancher de l'autre côté — elle est posée sur le dessus du
  sol qu'elle chevauche, quelle que soit la hauteur à laquelle la face a été
  plantée ;
- **tout ce qu'on lance vers une porte scellée** : la pièce rebondit, comme le
  joueur. Elle passait (et le grain était mort) ;
- **tout ce qu'on pose face à un mur, géant** : la pièce reste de ce côté-ci,
  ou reste en main — on ne pose plus à travers un mur ;
- **tout ce qu'on lance près d'un creux** : il ne la prend pas tant qu'on ne
  l'a pas reprise et posée ;
- **chaque raccord entre deux salles** : on le franchit en marchant droit vers
  la porte depuis l'intérieur, et l'on arrive face à la salle suivante. Sept
  portes étaient plantées à l'envers ; le harnais franchit maintenant les
  quatorze ;
- **une porte scellée** dit qu'elle est scellée quand on s'y cogne, au lieu de
  « ne mène nulle part » ;
- **peindre dans le village** : la fée garde la priorité sur les couleurs
  connues, donc rien ne doit avoir changé là-bas — mais c'est le même geste.

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
- **La chiralité a un corps** (la vrille) et un étalon (les mains sur les
  murs), mais elle n'a jamais été REGARDÉE en jeu : deux salles et une
  station du banc sont écrites pour ça, prouvées, et vues en captures fixes.
- **Le troisième mouvement n'a pas de fin.** Le seuil tient la place de la
  lucarne ; le monde retourné qui « rend le ciel » est décidé, pas bâti.
- **Une famille entière de fautes reste possible :** le franchissement de marche
  sonde une marche PLEINE, donc un seuil de six centimètres peut fermer un
  passage sous un linteau. Ça a déjà mordu une fois cette nuit.
