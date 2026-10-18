/* Облачное хранилище «Power Play»: вход по почте и паролю (Firebase Auth) и база Firestore с офлайн-кэшем.
   Используется отдельный экземпляр приложения Firebase («powerplay»): вход в этом приложении не меняет вход
   в других приложениях семьи на том же сайте (французский, итальянский, «Слайд-учёт»), даже на одном телефоне.
   Данные человека лежат в его ветке users/<uid>/: en_cards (по документу на слово и глагол) и en_meta/main, gr, sc. */
const cfg = window.FIREBASE_CONFIG;

if (cfg) {
  try {
    const [appMod, authMod, fsMod] = await Promise.all([
      import('./vendor/firebase-app.js'),
      import('./vendor/firebase-auth.js'),
      import('./vendor/firebase-firestore.js'),
    ]);
    const app = appMod.initializeApp(cfg, 'powerplay');
    const auth = authMod.getAuth(app);
    let fs;
    try {
      fs = fsMod.initializeFirestore(app, { localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() }) });
    } catch (e) {
      fs = fsMod.getFirestore(app);
    }
    const report = e => { console.error(e); if (window.__onWriteError) window.__onWriteError((e && e.code) || 'error'); };
    const plain = d => JSON.parse(JSON.stringify(d));

    const makeApi = uid => {
      const base = 'users/' + uid + '/';
      const cardsRef = fsMod.collection(fs, base + 'en_cards');
      const docRef = name => fsMod.doc(fs, base + 'en_meta/' + name);
      return {
        setCard(id, data) { fsMod.setDoc(fsMod.doc(fs, base + 'en_cards/' + id.replace(/\//g, '_')), plain(Object.assign({ id }, data))).catch(report); },
        setDoc(name, data) { fsMod.setDoc(docRef(name), plain(data)).catch(report); },
        onCards(cb, err) {
          return fsMod.onSnapshot(cardsRef, { includeMetadataChanges: true }, s => {
            cb(s.docChanges().map(ch => { const d = ch.doc.data(); const id = d.id || ch.doc.id; delete d.id; return { type: ch.type, id, data: d }; }), s.metadata);
          }, err);
        },
        onDoc(name, cb, err) { return fsMod.onSnapshot(docRef(name), { includeMetadataChanges: true }, s => cb(s.exists() ? s.data() : null, s.metadata), err); },
      };
    };

    window.__auth = {
      signIn: (email, password) => authMod.signInWithEmailAndPassword(auth, email, password),
      signUp: (email, password) => authMod.createUserWithEmailAndPassword(auth, email, password),
      reset: email => authMod.sendPasswordResetEmail(auth, email),
      signOut: () => authMod.signOut(auth),
    };
    authMod.onAuthStateChanged(auth, user => {
      if (window.__onAuth) window.__onAuth(user ? { email: user.email, uid: user.uid } : null, user ? makeApi(user.uid) : null);
    });
  } catch (e) {
    console.error('Облачное хранилище не запустилось', e);
  }
}
