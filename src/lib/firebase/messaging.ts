import { getMessaging, getToken, deleteToken, onMessage, isSupported } from 'firebase/messaging'
import { doc, setDoc, arrayRemove, getDoc } from 'firebase/firestore'
import { app, db } from './config'

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY as string | undefined
const TOKEN_STORAGE_KEY = 'fcm_token'

let messagingInstance: ReturnType<typeof getMessaging> | null = null

async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance
  const supported = await isSupported()
  if (!supported) return null
  messagingInstance = getMessaging(app)
  return messagingInstance
}

/** Estado actual del permiso de notificaciones */
export function pushPermissionState(): NotificationPermission | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

/**
 * Pide permiso, genera un token FRESCO (borra el anterior si existe)
 * y lo guarda en Firestore. Devuelve 'granted' | 'denied' | 'unsupported' | 'no-vapid' | 'error'.
 */
export async function requestPushPermission(): Promise<'granted' | 'denied' | 'unsupported' | 'no-vapid' | 'error'> {
  if (!VAPID_KEY) return 'no-vapid'

  const msg = await getMessagingInstance()
  if (!msg) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  // Borra el token viejo del browser para forzar uno fresco
  try { await deleteToken(msg) } catch { /* puede no existir, ok */ }

  let token: string
  try {
    token = await getToken(msg, { vapidKey: VAPID_KEY })
  } catch (err) {
    const msg2 = err instanceof Error ? err.message : String(err)
    console.error('[push] getToken error:', msg2)
    throw new Error(`getToken: ${msg2}`)
  }
  if (!token) throw new Error('getToken: empty token')

  try {
    // Reemplaza todos los tokens por el nuevo — limpia stale tokens de intentos anteriores
    // Si en el futuro se quiere multi-dispositivo, cambiar a arrayUnion con cleanup por device
    const ref = doc(db, 'app_settings', 'notifications')
    await setDoc(ref, { tokens: [token] }, { merge: false })
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch (err) {
    const msg2 = err instanceof Error ? err.message : String(err)
    console.error('[push] setDoc error:', msg2)
    throw new Error(`setDoc: ${msg2}`)
  }

  return 'granted'
}

/** Escucha notificaciones cuando la app está en primer plano (muestra una notif nativa) */
export async function setupForegroundNotifications() {
  const msg = await getMessagingInstance()
  if (!msg) return

  onMessage(msg, (payload) => {
    if (Notification.permission !== 'granted') return
    // Lee desde data (mensajes solo-datos) con fallback a notification
    const title = payload.data?.title ?? payload.notification?.title ?? 'Rivas'
    const body  = payload.data?.body  ?? payload.notification?.body  ?? ''
    new Notification(title, { body, icon: '/favicon.png' })
  })
}

/** True si este dispositivo ya tiene un token registrado en Firestore */
export async function isPushRegistered(): Promise<boolean> {
  if (!VAPID_KEY) return false
  const msg = await getMessagingInstance()
  if (!msg) return false
  if (Notification.permission !== 'granted') return false
  try {
    const token = await getToken(msg, { vapidKey: VAPID_KEY })
    if (!token) return false
    const snap = await getDoc(doc(db, 'app_settings', 'notifications'))
    const tokens: string[] = snap.data()?.tokens ?? []
    return tokens.includes(token)
  } catch {
    return false
  }
}

/**
 * Refresca silenciosamente el token en Firestore al iniciar la app.
 * Reemplaza todos los tokens con el token actual — elimina duplicados sin que el usuario haga nada.
 */
export async function refreshPushToken(): Promise<void> {
  if (!VAPID_KEY) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const msg = await getMessagingInstance()
  if (!msg) return
  try {
    const token = await getToken(msg, { vapidKey: VAPID_KEY })
    if (!token) return
    const ref = doc(db, 'app_settings', 'notifications')
    await setDoc(ref, { tokens: [token] }, { merge: false })
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch {
    // silencioso — no es crítico
  }
}

/** Elimina el token de este dispositivo de Firestore y revoca la suscripción */
export async function unregisterPush(): Promise<void> {
  const msg = await getMessagingInstance()
  if (!msg) return
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY) || await getToken(msg, { vapidKey: VAPID_KEY })
    if (token) {
      await setDoc(
        doc(db, 'app_settings', 'notifications'),
        { tokens: arrayRemove(token) },
        { merge: true }
      )
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    await deleteToken(msg)
  } catch {
    // ignorar errores
  }
}
