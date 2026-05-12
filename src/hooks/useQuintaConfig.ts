import { useState, useEffect } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '@/lib/firebase/config'
import type { QuintaConfig, QuintaFoto } from '@/types'

const DOC_REF = doc(db, 'quinta_config', 'main')

const DEFAULT_CONFIG: QuintaConfig = {
  nombre: '',
  descripcion: '',
  amenities: [],
  fotos: [],
  contactoEmail: '',
  whatsapp: '',
  ubicacion: '',
}

export function useQuintaConfig() {
  const [config, setConfig] = useState<QuintaConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onSnapshot(DOC_REF, (snap) => {
      if (snap.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...snap.data() as QuintaConfig })
      }
      setLoading(false)
    })
  }, [])

  const saveConfig = async (data: Partial<QuintaConfig>) => {
    await setDoc(DOC_REF, { ...config, ...data }, { merge: true })
  }

  const uploadFoto = async (
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<QuintaFoto> => {
    const path = `quinta/fotos/${Date.now()}_${file.name}`
    const storageRef = ref(storage, path)
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file)
      task.on(
        'state_changed',
        (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        reject,
        async () => {
          const url = await getDownloadURL(task.snapshot.ref)
          const foto: QuintaFoto = { url, path, orden: config.fotos.length }
          const nuevasFotos = [...config.fotos, foto]
          await setDoc(DOC_REF, { ...config, fotos: nuevasFotos }, { merge: true })
          resolve(foto)
        }
      )
    })
  }

  const deleteFoto = async (foto: QuintaFoto) => {
    try { await deleteObject(ref(storage, foto.path)) } catch { /* ya no existe */ }
    const fotos = config.fotos.filter((f) => f.path !== foto.path)
    await setDoc(DOC_REF, { ...config, fotos }, { merge: true })
  }

  const reordenarFotos = async (fotos: QuintaFoto[]) => {
    await setDoc(DOC_REF, { ...config, fotos }, { merge: true })
  }

  return { config, loading, saveConfig, uploadFoto, deleteFoto, reordenarFotos }
}
