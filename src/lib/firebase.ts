/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { Messaging, getMessaging, getToken, onMessage as fbOnMessage } from 'firebase/messaging';

let app: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;

try {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    messagingInstance = getMessaging(app);
  }
} catch (e) {
  console.warn('Firebase init failed — push notifications disabled:', e);
}

export const messaging = messagingInstance;

export async function requestFCMToken(): Promise<string | null> {
  if (!messagingInstance) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const token = await getToken(messagingInstance, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    return token || null;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

export function onMessage(
  _messaging: Messaging | null,
  callback: Parameters<typeof fbOnMessage>[1],
): () => void {
  if (!messagingInstance) return () => {};
  return fbOnMessage(messagingInstance, callback);
}
