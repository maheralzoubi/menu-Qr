import admin from 'firebase-admin';
import { ensureFirebase } from '../config/firebase';

const firebaseReady = (() => {
  try {
    ensureFirebase();
    return true;
  } catch (e) {
    console.warn('Firebase init failed — push notifications disabled:', (e as Error).message);
    return false;
  }
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
