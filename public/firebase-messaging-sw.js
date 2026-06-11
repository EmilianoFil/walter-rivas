// Firebase Messaging Service Worker — v5
// Sin SDK de Firebase: manejamos el push directamente para evitar doble notificación.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()))

// Recibe el push y muestra la notificación UNA sola vez.
// event.waitUntil es obligatorio — si no se muestra nada, el browser muestra su propio
// placeholder vacío ("Rivas" sin cuerpo), que era exactamente lo que veíamos.
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let title = 'Rivas'
    let body  = ''
    let notifData = {}

    if (event.data) {
      try {
        const payload = event.data.json()
        // FCM v1 puede entregar los datos en distintos lugares según el formato del payload
        const d = payload?.data ?? {}
        title = d.title || payload.notification?.title || payload.title || 'Rivas'
        body  = d.body  || payload.notification?.body  || payload.body  || ''
        notifData = { ...d }
      } catch { /* JSON falló — usamos el fallback de app name */ }
    }

    return self.registration.showNotification(title, {
      body,
      icon:    '/favicon.png',
      badge:   '/favicon.png',
      data:    notifData,
      vibrate: [200, 100, 200],
    })
  })())
})

// Al tocar la notificación: enfoca la app y navega al tab correcto
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? 'https://walter-rivas.web.app/casa-quinta?tab=reservas'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('walter-rivas.web.app') && 'focus' in client) {
          return client.focus().then(() => {
            client.postMessage({ type: 'PUSH_NAVIGATE', url })
          })
        }
      }
      return clients.openWindow(url)
    })
  )
})
