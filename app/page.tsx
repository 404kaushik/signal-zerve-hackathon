'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BootSequence } from '@/components/worldlens/boot-sequence'

export default function LandingPage() {
  const router = useRouter()
  const [isBooting, setIsBooting] = useState(true)

  const handleBootComplete = () => {
    router.push('/app')
  }

  if (isBooting) {
    return <BootSequence onComplete={handleBootComplete} />
  }

  return null
}
