importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDa7zE0xE0v3vZJkINtVkrtApZT6kSV1Ag',
  authDomain: 'menu-qr-b39d6.firebaseapp.com',
  projectId: 'menu-qr-b39d6',
  messagingSenderId: '596503348637',
  appId: '1:596503348637:web:25fca531392629e3f79b74',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'Order Update';
  const body = payload.notification?.body ?? '';
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data,
  });
});
