import admin from 'firebase-admin';

const firebaseReady = (() => {
  if (!admin.apps.length) {
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      console.warn('Firebase env vars not set — push notifications disabled');
      return false;
    }
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } catch (e) {
      console.warn('Firebase init failed — push notifications disabled:', (e as Error).message);
      return false;
    }
  }
  return true;
})();

const STATUS_MESSAGES: Record<string, string> = {
  Preparing: 'Your order is being prepared by our chefs!',
  Ready: 'Your order is ready — service on its way!',
  Delivered: 'Your order has been delivered. Enjoy your meal!',
};

export async function sendOrderStatusNotification(
  fcmToken: string,
  status: string,
  orderId: string,
): Promise<void> {
  if (!firebaseReady) return;

  const body = STATUS_MESSAGES[status];
  if (!body) return;

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title: 'Order Update', body },
      data: { orderId, status },
      webpush: { notification: { title: 'Order Update', body, icon: '/favicon.ico' } },
    });
  } catch (error) {
    console.error('FCM notification failed:', error);
  }
}
