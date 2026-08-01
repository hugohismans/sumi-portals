import { defineConfig } from 'vite';

/**
 * Sur GitHub Pages, le site vit dans un sous-dossier
 * (https://<compte>.github.io/<dépôt>/), et non à la racine du domaine. Sans
 * `base`, tous les chemins pointeraient à côté et la page resterait blanche.
 *
 * Le nom du dépôt n'est PAS écrit en dur : le workflow de publication renseigne
 * BASE_PATH à partir du dépôt réel. Le même fichier marche donc en local
 * (base « / ») et en ligne, quel que soit le nom qu'on donne au dépôt.
 */
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
});
