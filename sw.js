
const CACHE_NAME = 'smart-laras-cache-v1.5'; // Naikkan versi jika ada perubahan pada file yang di-cache
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/metadata.json',
  '/types.ts',
  '/constants.ts',
  '/services/geminiService.ts',
  '/components/ImageUploader.tsx',
  '/components/ReportForm.tsx',
  '/components/LoadingSpinner.tsx',
  '/components/Modal.tsx',
  '/components/FormControls.tsx',
  '/components/Toast.tsx',
  '/components/PrintableReport.tsx',
  '/App.tsx',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://esm.sh/react@^19.1.0',
  'https://esm.sh/react-dom@^19.1.0/client', // For ReactDOM.createRoot
  'https://esm.sh/react@^19.1.0/jsx-runtime', // For JSX
  'https://esm.sh/@google/genai@^1.0.1',
  'https://esm.sh/jspdf@2.5.1',
  'https://esm.sh/jspdf-autotable@3.8.2',
  'https://esm.sh/file-saver@2.0.5' // For saving files (PDF)
];

// Dinamis menambahkan URL Heroicons berdasarkan yang digunakan
const heroiconsOutlineUsed = [
    'UserGroupIcon', 'DocumentTextIcon', 'PlusCircleIcon', 'PencilSquareIcon', 'TrashIcon', 
    'ClipboardDocumentIcon', 'ExclamationTriangleIcon', 'BuildingLibraryIcon', 'ShieldCheckIcon', 
    'InboxStackIcon', 'ChatBubbleLeftEllipsisIcon', 'MapPinIcon', 'ClockIcon', 
    'ListBulletIcon', 'CameraIcon', 'ArrowPathIcon', 'DocumentArrowDownIcon', 
    'DocumentArrowUpIcon', 'XCircleIcon', 'WifiIcon', 'NoSymbolIcon', 'BanknotesIcon', 
    'PlusIcon', 'IdentificationIcon', 'UsersIcon', 'TruckIcon', 'PrinterIcon',
    'ArchiveBoxIcon', 'ArrowLeftIcon', 'ArrowDownTrayIcon'
];
const heroiconsSolidUsed = ['XMarkIcon', 'CheckCircleIcon', 'XCircleIcon', 'ExclamationTriangleIcon', 'InformationCircleIcon'];

heroiconsOutlineUsed.forEach(icon => CDN_ASSETS.push(`https://esm.sh/@heroicons/react@^2.2.0/24/outline/${icon}`));
heroiconsSolidUsed.forEach(icon => CDN_ASSETS.push(`https://esm.sh/@heroicons/react@^2.2.0/24/solid/${icon}`));

const ALL_URLS_TO_CACHE = [...new Set([...CORE_ASSETS, ...CDN_ASSETS])];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache:', CACHE_NAME);
        // Cache core assets first
        return cache.addAll(CORE_ASSETS.map(url => new Request(url, { cache: 'reload' }))) 
          .then(() => {
            const cdnPromises = CDN_ASSETS.map(url => {
              return fetch(new Request(url, { mode: 'cors' })) 
                .then(response => {
                  if (response.ok) {
                    return cache.put(url, response);
                  }
                  return fetch(new Request(url, { mode: 'no-cors' })).then(noCorsResponse => {
                     if (noCorsResponse.type === 'opaque') { 
                        return cache.put(url, noCorsResponse);
                     }
                     console.warn('Failed to cache CDN (cors/no-cors):', url, response.status, noCorsResponse.status);
                     return Promise.resolve(); 
                  });
                })
                .catch(err => {
                  console.warn('Error caching CDN asset:', url, err);
                  return Promise.resolve(); 
                });
            });
            return Promise.all(cdnPromises);
          });
      })
      .then(() => self.skipWaiting())
      .catch(err => {
        console.error('Cache open/addAll failed during install:', err);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.url.includes('generativelanguage.googleapis.com') || request.url.includes('127.0.0.1:5000')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(JSON.stringify({ error: 'Offline: Tidak dapat terhubung ke layanan backend.' }), {
            status: 503, 
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.ok && request.method === 'GET') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch(error => {
            console.warn('Fetch failed; returning offline fallback or error for:', request.url, error);
            if (request.destination === 'document') { 
                 return caches.match('/index.html'); 
            }
            return new Response(`Anda offline dan sumber ini (${request.url}) tidak ada di cache.`, {
                status: 404, 
                headers: { 'Content-Type': 'text/plain' },
            });
          });
      })
  );
});
