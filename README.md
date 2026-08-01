# Sumi Portals

Jeu de puzzle 3D dans le navigateur. Deux portails reliés, de tailles
différentes : les traverser change **ta** taille dans le monde.

- Le grand torii (vermillon) te fait ressortir par la petite porte → tu rétrécis ×4.
- La petite porte (indigo) te fait ressortir par le grand torii → tu grandis ×4.

Rendu façon encre et papier : aplats francs, contours tremblés, trames de manga,
grain de papier animé.

## Lancer

```bash
npm install
```

```bash
npm run dev
```

Puis clique dans la page pour capturer la souris.

**Commandes** — `ZQSD` / `WASD` se déplacer · `Maj` courir · `Espace` sauter ·
`souris` regarder · `R` recommencer · `Échap` libérer la souris.

**`C` copie le point de vue exact dans le presse-papiers.** À utiliser pour
signaler un défaut visuel : une capture d'écran montre ce qu'on voit, cette
ligne permet de se replacer au centimètre et au degré près pour regarder la
même chose. La coller dans la console la rejoue.

Le panneau d'accueil réapparaît dès que la souris est relâchée : cliquer dedans
pour reprendre.

## Vérifier le niveau sans lancer le jeu

```bash
npm run check
```

Rejoue le niveau en pilotant un joueur fictif : vérifie que l'énigme se résout,
que les impasses tiennent, que la traversée raccorde exactement, et que les
maths des portails ne dérivent pas. C'est possible parce que `src/core/`
n'importe pas Three.js.

## Le niveau

**« La cour »** — la tour de l'objectif fait 3,3 unités, presque deux fois la
taille du joueur : impossible à escalader. La cour creusée à l'est fait 3,0 de
fond : on y tombe, on n'en remonte pas.

Au fond de cette cour se trouve la petite porte indigo. La traverser fait
ressortir par le grand torii, quatre fois plus grand — et de là, la tour n'est
plus qu'une marche.

```
place ×1 → on tombe dans la cour → porte indigo → place ×4 → la tour
```

## Organisation

```
src/core/      simulation pure — AUCUN import Three.js
src/render/    Three.js : encre, contours, portails, papier
src/input/     clavier + souris → commandes
src/levels/    niveaux, en données
```

La séparation n'est pas cosmétique : `src/core/` doit pouvoir tourner tel quel
dans Node pour un futur serveur autoritaire, avec les clients qui prédisent
localement et se réconcilient. C'est aussi ce qui rend `npm run check` possible.

## Décisions structurantes

**Les portails ont une taille FIXE dans le monde.** Ce sont des monuments posés
au sol : ils gardent toujours le même rapport au décor qui les entoure. C'est le
joueur qui rapetisse ou grandit par rapport à eux.

**Ce sont ces tailles qui bornent la montée en échelle.** À ×4, le joueur mesure
7,2 pour une porte haute de 2,8 : il n'y rentre physiquement plus, donc il ne
peut plus grandir. La limite n'est pas une règle qu'on énonce, c'est une porte
qu'on ne franchit plus. Corollaire vital : la cour ne fait que 3,0 de fond, donc
un joueur à ×4 en ressort d'une enjambée — sinon il y serait piégé pour de bon.

**Rien de ce qu'on doit atteindre ne se trouve derrière le grand torii.** On le
retraverserait en chemin et on rapetisserait. D'où le torii plaqué au nord,
regardant le sud, et tout le reste du niveau devant lui.

**La traversée se déclenche sur l'ŒIL, pas sur le centre du corps.** Avec le
centre du corps, l'œil franchissait le plan avant ou après le corps : pendant
quelques images on voyait déjà l'autre côté sans y être. En déclenchant sur
l'œil, l'image d'avant et celle d'après se raccordent exactement.

**Vitesse, gravité et saut sont multipliés par l'échelle.** Physiquement faux
(un nain tomberait aussi vite qu'un géant), mais indispensable : sinon, petit,
on se traîne et on tombe comme une enclume.

**Le sprint multiplie la vitesse, jamais le saut.** Les obstacles du niveau sont
calibrés sur des hauteurs ; toucher au saut ouvrirait des raccourcis et
démolirait l'énigme. Deux vérifications le garantissent.

**La margelle est retirée de quelques centimètres du bord du trou.** Posée pile
sur l'arête, ses faces tombaient dans le même plan que celles des dalles de sol :
deux surfaces au même endroit, et la carte graphique tranchait pixel par pixel
en changeant d'avis à chaque image — la barre rouge grésillait.

**Le brouillard ne suit PAS l'échelle du joueur.** Il l'a suivie, et c'était une
erreur visible : en rapetissant, « l'air » devenait quatre fois plus épais et les
mêmes bâtiments changeaient de couleur au moment exact de la traversée. Or l'air
ne s'épaissit pas parce qu'on a rapetissé — une même distance, c'est la même
quantité d'air. Corollaire : le plan lointain de la caméra est fixe lui aussi et
porte au-delà du brouillard, sinon un joueur rapetissé verrait le décor lointain
tranché net au lieu de se fondre dans le papier.

**Deux niveaux de portail, avec une caméra virtuelle par niveau.** Une première
tentative rendait les deux passes depuis la MÊME caméra : le portail finissait
par se montrer lui-même et affichait un aplat en plein milieu de l'image. Il
faut appliquer la transformation deux fois, en chaînant la seconde caméra sur la
première. Comme la face jumelle est masquée pendant le rendu d'une vue, le seul
portail qui puisse apparaître dedans est cette face elle-même : la chaîne par
face est donc exactement la bonne.

**Le cadre du portail se tient entièrement du côté avant du plan, et mord
légèrement sur l'ouverture.** Il l'enjambait : sa moitié arrière se retrouvait
dans l'autre monde et masquait la vue, si bien qu'en traversant on voyait
l'épaisseur du torii rouge alors qu'on était déjà de l'autre côté. Le léger
débord, lui, rend le cadre de la face jumelle visible depuis l'intérieur de la
vue — sans lui il tomberait pile à la limite et resterait invisible. On voit
donc maintenant les montants rouges et, juste à l'intérieur, le liseré indigo
de la porte par laquelle on va ressortir.

**La surface du portail recule quand l'œil la frôle.** Un plan sans épaisseur
est tranché par le plan proche de la caméra dès qu'on le touche presque : la
surface disparaît, on voit le décor brut derrière, et l'on se retrouve à moitié
dans chaque monde. Quelques centimètres de recul suffisent, et comme l'image est
plaquée en coordonnées écran elle ne bouge pas d'un pixel.

**Le grain « dessiné » n'est appliqué qu'UNE fois, à la toute fin.** Quand il
l'était aussi sur la surface des portails, leur contenu frémissait à un rythme
différent du reste et l'œil lisait deux feuilles superposées. Une feuille, un
tremblement.

**Le grain « dessiné » est figé à 10 Hz, pas 60.** C'est tout le secret du rendu
à la main : à 60 Hz l'œil lit « bruit », à 10 Hz il lit « tracé ».

**L'éclairage est porté par l'orientation haut/bas, pas par la direction de la
lumière.** Avec un éclairage directionnel franc, deux murs verticaux voisins
tombaient de part et d'autre d'un seuil de quantification et se retrouvaient
dans deux tons différents sans raison lisible. Ici : dessus clair, murs d'un
seul ton, dessous sombre — et un souffle de directionnel par-dessus.

**Le sol n'est pas encré.** Il est découpé en quatre dalles pour ménager le trou
de la cour, et sans `outline: false` chaque couture serait tracée à l'encre en
plein terrain, comme un trait de crayon oublié.

**Pas de tampon de profondeur logarithmique.** Il exige que chaque shader écrive
lui-même sa profondeur, ce que des matériaux maison ne font pas — le tri des
surfaces s'effondre et les contours disparaissent. À la place, le plan proche et
le plan lointain suivent l'échelle du joueur : leur rapport reste constant, donc
la précision aussi.

## Débogage

Depuis la console du navigateur :

```js
__game.tp(15, -2.8, 0, 0)              // x, y, z, palier d'échelle
__game.tp(0, 0.2, 8, 1)                // sur la place, à ×4
__game.tp(0, 0.2, 17, 0, 0.0, -0.2)    // + lacet et inclinaison du regard
```

C'est exactement la forme que produit la touche `C` en jeu : on colle la ligne
dans la console et on se retrouve au point de vue signalé.

## Limites connues

- **Récursion coupée au troisième niveau.** Deux niveaux sont rendus, ce qui
  suffit largement : depuis le fond de la cour on voit le grand torii, et il
  montre bien ce qu'il y a derrière lui. L'aplat sourd n'apparaît qu'au
  troisième emboîtement, en pratique invisible.
- **Pas d'apparence de joueur.** Prochaine étape avant le multijoueur : un
  bonhomme bâton dessiné au crayon, une couleur par joueur, visible à travers
  les portails — y compris soi-même.
- **Pas d'objets transportables.**
- **Une seule paire de portails.** L'architecture en accepte N, colorées ; il
  suffit de les ajouter dans le fichier de niveau.
- **Le cadre du portail n'a pas de collision.** Un joueur trop grand traverse
  simplement le plan sans effet au lieu de buter dans les montants.
