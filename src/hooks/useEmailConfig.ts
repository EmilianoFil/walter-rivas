import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db, app } from '@/lib/firebase/config'

export interface EmailConfig {
  remitente: string
  appPassword: string
  destinatarios: string[]
}

const DOC = doc(db, 'app_settings', 'email')

export function useEmailConfig() {
  const [config, setConfig] = useState<EmailConfig>({ remitente: '', appPassword: '', destinatarios: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getDoc(DOC).then((snap) => {
      if (snap.exists()) setConfig(snap.data() as EmailConfig)
    }).finally(() => setLoading(false))
  }, [])

  const saveConfig = async (data: EmailConfig) => {
    setSaving(true)
    try {
      await setDoc(DOC, data)
      setConfig(data)
    } finally {
      setSaving(false)
    }
  }

  const sendTestEmail = async (): Promise<void> => {
    const functions = getFunctions(app, 'us-central1')
    const fn = httpsCallable(functions, 'sendTestEmail')
    await fn()
  }

  return { config, loading, saving, saveConfig, sendTestEmail }
}
