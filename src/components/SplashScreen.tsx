import { useEffect, useState } from 'react'

interface Props {
  authReady: boolean   // true cuando Firebase Auth ya resolvió
  onDone: () => void
}

export function SplashScreen({ authReady, onDone }: Props) {
  const [minPassed, setMinPassed] = useState(false)
  const [hiding, setHiding] = useState(false)

  // Mínimo 800ms para que no sea un parpadeo
  useEffect(() => {
    const t = setTimeout(() => setMinPassed(true), 800)
    return () => clearTimeout(t)
  }, [])

  // Cuando ambas condiciones se cumplen, iniciar fade-out
  useEffect(() => {
    if (minPassed && authReady && !hiding) {
      setHiding(true)
      setTimeout(onDone, 350)
    }
  }, [minPassed, authReady, hiding, onDone])

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: '#0f172a',
        opacity: hiding ? 0 : 1,
        transition: 'opacity 0.35s ease-out',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div style={{ animation: 'splash-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        <img
          src="/logo.png"
          alt="Rivas"
          className="w-20 h-20 rounded-2xl object-contain bg-white p-1.5 shadow-2xl"
        />
      </div>
      <p
        className="text-white/60 text-sm font-medium mt-5 tracking-wide"
        style={{ animation: 'splash-fade 0.4s 0.2s ease-out both' }}
      >
        Rivas
      </p>
    </div>
  )
}
