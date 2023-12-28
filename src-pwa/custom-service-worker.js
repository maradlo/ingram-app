/*
 * This file (which will be your service worker)
 * is picked up by the build system ONLY if
 * quasar.conf > pwa > workboxPluginMode is set to "InjectManifest"
 */

/*
  dependencies
*/

import {precacheAndRoute} from 'workbox-precaching'
import {registerRoute} from 'workbox-routing'
import {StaleWhileRevalidate} from 'workbox-strategies'
import {CacheFirst} from 'workbox-strategies'
import {ExpirationPlugin} from 'workbox-expiration'
import {CacheableResponsePlugin} from 'workbox-cacheable-response'
import {NetworkFirst} from 'workbox-strategies';
import {Queue} from 'workbox-background-sync';

/*
config
*/

precacheAndRoute(self.__WB_MANIFEST);

// This part checks whether the Background Sync API is supported in the user's browser.
// It does this by checking if the sync property exists in the self.registration object (self refers to the service worker itself).
// The result is a boolean value indicating support (true or false) and is logged to the console.

let backgroundSyncSupported = 'sync' in self.registration ? true : false
console.log('backgroundSyncSupported: ', backgroundSyncSupported)

/*
queue - createPost
*/

/*
This part initializes a queue named createPostQueue but only if Background Sync is supported.
The Queue object is presumably from a library or API that manages the queue of network requests.
The onSync property is an asynchronous function that handles the logic for re-sending the requests when the network is back online.
*/

let createPostQueue = null
if (backgroundSyncSupported) {
  createPostQueue = new Queue('createPostQueue', {
    /*
      It loops through each request in the queue.
      Attempts to resend the request using fetch.
      If successful, it sends a message (likely to the app) that the post was uploaded.
      If there's an error, the request is put back in the queue, and the error is thrown.
    */
    onSync: async ({queue}) => {
      let entry;
      while (entry = await queue.shiftRequest()) {
        try {
          await fetch(entry.request);
          console.log('Replay successful for request', entry.request);
          const channel = new BroadcastChannel('sw-messages');
          channel.postMessage({msg: 'offline-post-uploaded'});
        } catch (error) {
          console.error('Replay failed for request', entry.request, error);

          // Put the entry back in the queue and re-throw the error:
          await queue.unshiftRequest(entry);
          throw error;
        }
      }
      console.log('Replay complete!');
    }
  });
}

/*
caching strategies
*/

registerRoute(
  ({url}) => url.host.startsWith('fonts.g'),
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
    ],
  })
);

registerRoute(
  ({url}) => url.pathname.startsWith('/posts'),
  new NetworkFirst()
);

registerRoute(
  ({url}) => url.href.startsWith('http'),
  new StaleWhileRevalidate()
);

/*
events - fetch
*/


/*
This part adds an event listener for fetch events. This is where the service worker intercepts network requests.

It specifically targets requests ending with /createPost.
If the fetch fails (implying offline or network issues), the request is added to the createPostQueue.
The event.waitUntil method is used to ensure the service worker does not terminate before the asynchronous operations are completed.

*/

if (backgroundSyncSupported) {
  self.addEventListener('fetch', (event) => {
    if (event.request.url.endsWith('/createPost')) {
      // Clone the request to ensure it's safe to read when
      // adding to the Queue.
      const promiseChain = fetch(event.request.clone()).catch((err) => {
        return createPostQueue.pushRequest({request: event.request});
      });

      event.waitUntil(promiseChain);
    }
  });
}
