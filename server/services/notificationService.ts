import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

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
  const body = STATUS_MESSAGES[status];
  if (!body) return; // No notification for 'Pending'

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: 'Order Update',
        body,
      },
      data: { orderId, status },
      webpush: {
        notification: {
          title: 'Order Update',
          body,
          icon: '/favicon.ico',
        },
      },
    });
  } catch (error) {
    // Log but don't throw — a failed notification must not break the status update
    console.error('FCM notification failed:', error);
  }
}
