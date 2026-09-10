import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const messaging = getMessaging(app);
Notification.requestPermission().then((permission) => {
  if (permission === 'granted') {
    getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' }).then((currentToken) => {
      // Send token to backend express server
    });
  }
});