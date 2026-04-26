'use client'

interface Step {
  id: string
  label: string
  status: 'running' | 'done' | 'error'
  count?: number
  detail?: string
}

interface XThoughtStreamProps {
  status: 'idle' | 'running' | 'done' | 'error'
  topic: string
  steps: Step[]
  durationMs?: number
}

function statusDot(status: Step['status']) {
  if (status === 'done') return 'bg-[#00ba7c]'
  if (status === 'error') return 'bg-[#f4212e]'
  return 'bg-[#1d9bf0] animate-pulse'
}

export function XThoughtStream({ status, topic, steps, durationMs }: XThoughtStreamProps) {
  if (status === 'idle') return null
  return (
    <div className="border-b border-[#2f3336] bg-linear-to-b from-[#0b0f13] to-black px-4 py-4">
      <div className="mb-3 text-[13px] text-[#71767b]">
        {status === 'running' ? `Researching "${topic}" in real time...` : `Generated posts for "${topic}"`}
        {status !== 'running' && durationMs ? ` in ${(durationMs / 1000).toFixed(1)}s` : ''}
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <div key={`${step.id}-${step.status}-${step.count ?? 0}`} className="flex items-center justify-between rounded-lg border border-[#2f3336] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${statusDot(step.status)}`} />
              <span className="text-[13px] text-[#e7e9ea]">{step.label}</span>
              {step.detail ? <span className="text-[12px] text-[#71767b]">({step.detail})</span> : null}
            </div>
            {typeof step.count === 'number' ? <span className="text-[12px] text-[#71767b]">{step.count}</span> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
