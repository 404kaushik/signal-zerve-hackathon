'use client'

import { useAPI } from '@/hooks/use-api'
import { getSignals, getTimingPredictions, getReliability, getContrarianOps } from '@/lib/api'

export default function SignalsDebugPage() {
  const signals = useAPI(getSignals)
  const timing = useAPI(() => getTimingPredictions(14))
  const reliability = useAPI(getReliability)
  const contrarian = useAPI(getContrarianOps)

  return (
    <div className="p-6 space-y-4 text-xs">
      <h1 className="text-lg">Signals Debug (Raw API)</h1>
      <pre className="border p-3 overflow-auto">signals: {JSON.stringify(signals.data, null, 2)}</pre>
      <pre className="border p-3 overflow-auto">timing: {JSON.stringify(timing.data, null, 2)}</pre>
      <pre className="border p-3 overflow-auto">reliability: {JSON.stringify(reliability.data, null, 2)}</pre>
      <pre className="border p-3 overflow-auto">contrarian: {JSON.stringify(contrarian.data, null, 2)}</pre>
    </div>
  )
}
