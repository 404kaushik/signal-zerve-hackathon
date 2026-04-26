'use client'

interface XComposerProps {
  generatedAt?: string
}

export function XComposer({ generatedAt }: XComposerProps) {
  return (
    <div className="border-b border-[#2f3336] px-4 py-3">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-[#202327]" />
        <div className="flex-1">
          <div className="text-[20px] text-[#e8e8e8]">AI is writing your feed...</div>
          <div className="mt-3 text-[12px] text-[#e8e8e8]">
            last update: {generatedAt ? new Date(generatedAt).toLocaleString() : '--'}
          </div>
        </div>
      </div>
    </div>
  )
}
