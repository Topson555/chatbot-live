import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

self.skipWaiting();
self.clientsClaim();

// Vite injects pre-cached assets (index.html, offline.html, JS bundles) here at build time
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Precache offline navigation route fallback
const offlineHandler = createHandlerBoundToURL('/offline.html');
const navigationRoute = new NavigationRoute(offlineHandler, {
  denylist: [/^\/api/], // Exclude backend Express API calls from offline routing
});
registerRoute(navigationRoute);

// Custom Background Sync Event Listener for Message Queues
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-queued-messages') {
    event.waitUntil(
      console.log('📶 Internet connection restored: Flushing queued messages...')
    );
  }
});