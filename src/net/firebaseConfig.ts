/**
 * Identifiants du projet Firebase.
 *
 * Ces valeurs ne sont PAS des secrets. Le jeu est un site statique : le
 * navigateur doit forcément les connaître pour joindre la base, donc elles sont
 * de toute façon lisibles par n'importe qui. Firebase est conçu comme ça.
 *
 * Ce qui protège réellement la base, ce sont les RÈGLES D'ACCÈS définies dans
 * la console — pas le secret de cette clé. Voir database.rules.json.
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDwOFxnYZx4vEHU6LBtH4ttPiYb54knbmE',
  authDomain: 'sumi-portals.firebaseapp.com',
  databaseURL: 'https://sumi-portals-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'sumi-portals',
  storageBucket: 'sumi-portals.firebasestorage.app',
  messagingSenderId: '226834893415',
  appId: '1:226834893415:web:0362d6dae006ce81d8e2c2',
} as const;
