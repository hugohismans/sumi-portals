import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import { getDatabase, ref, get, remove, set, type Database } from 'firebase/database';
import { FIREBASE_CONFIG } from './firebaseConfig.js';

let app: FirebaseApp | null = null;
let db: Database | null = null;
let auth: Auth | null = null;

/** Initialise Firebase une seule fois, quel que soit le nombre d'appels. */
export const getNet = (): { db: Database; auth: Auth } => {
  if (!app) {
    app = initializeApp(FIREBASE_CONFIG);
    db = getDatabase(app);
    auth = getAuth(app);
  }
  return { db: db!, auth: auth! };
};

/** Identité anonyme du joueur. Persistée par Firebase d'une session à l'autre. */
export const signIn = async (): Promise<string> => {
  const { auth } = getNet();
  if (auth.currentUser) return auth.currentUser.uid;
  const credential = await signInAnonymously(auth);
  return credential.user.uid;
};

export interface Diagnostic {
  connexionAnonyme: string;
  ecriture: string;
  lecture: string;
  allerRetourMs: number | null;
  verdict: string;
}

/**
 * Éprouve la chaîne complète : identité, écriture, relecture, effacement.
 *
 * On vérifie le réseau AVANT de construire quoi que ce soit dessus. C'est la
 * partie du projet où les surprises sont les plus probables, autant les
 * découvrir sur quatre lignes de diagnostic que dans un lobby à moitié écrit.
 */
export const testConnection = async (): Promise<Diagnostic> => {
  const out: Diagnostic = {
    connexionAnonyme: '—',
    ecriture: '—',
    lecture: '—',
    allerRetourMs: null,
    verdict: '—',
  };

  let uid = 'anonyme-desactive';
  try {
    uid = await signIn();
    out.connexionAnonyme = `ok (identifiant ${uid.slice(0, 8)}…)`;
  } catch (e) {
    // Pas bloquant tant que la base est en mode test : on continue et on le dit.
    out.connexionAnonyme = `ÉCHEC — ${(e as Error).message}`;
  }

  const { db } = getNet();
  const probe = ref(db, `_diagnostic/${uid}`);
  const message = `bonjour ${Date.now()}`;

  const started = performance.now();
  try {
    await set(probe, { message, envoyeA: Date.now() });
    out.ecriture = 'ok';
  } catch (e) {
    out.ecriture = `ÉCHEC — ${(e as Error).message}`;
    out.verdict = 'La base refuse l’écriture. Vérifier les règles d’accès.';
    return out;
  }

  try {
    const snap = await get(probe);
    const relu = snap.val() as { message?: string } | null;
    out.allerRetourMs = Math.round(performance.now() - started);
    out.lecture = relu?.message === message ? 'ok (contenu identique)' : `ÉCHEC — reçu ${JSON.stringify(relu)}`;
  } catch (e) {
    out.lecture = `ÉCHEC — ${(e as Error).message}`;
  }

  await remove(probe).catch(() => undefined);

  const toutVaBien = out.ecriture === 'ok' && out.lecture.startsWith('ok');
  out.verdict = toutVaBien
    ? out.connexionAnonyme.startsWith('ok')
      ? 'Tout est bon : identité anonyme active et base accessible.'
      : 'Base accessible, mais la connexion anonyme n’est pas activée dans la console.'
    : 'La base ne répond pas comme attendu.';
  return out;
};
