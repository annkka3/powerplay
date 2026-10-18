/* Настройки Firebase. Это тот же проект, что у «Слайд-учёта» (slide-uchet): один вход по почте и паролю на оба приложения.
   Значения не секретные: данные защищены входом и правилами Firestore (firestore.rules), у каждого человека своя ветка users/<его id>/…
   Чтобы подключить отдельный проект, замените значения ниже; чтобы отключить облако, поставьте null. */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDxUSThWKeFIz3gO-zpsymRYmwoFYOeDTI",
  authDomain: "slide-uchet.firebaseapp.com",
  projectId: "slide-uchet",
  storageBucket: "slide-uchet.firebasestorage.app",
  messagingSenderId: "720322992231",
  appId: "1:720322992231:web:7bd73d47fc9fa3d8aa9cc2"
};
