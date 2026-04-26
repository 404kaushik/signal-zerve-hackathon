'use client'

const SHIMMER =
  'bg-gradient-to-r from-white/[0.02] via-white/[0.06] to-white/[0.02] bg-[length:400%_100%] animate-[shimmer_2.2s_ease-in-out_infinite]'

export function XFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative border-b border-white/[0.05] px-5 py-5"
        >
          <span className={`absolute left-0 top-0 h-full w-[2px] ${SHIMMER}`} />
          <div className="flex gap-4">
            <div className={`h-11 w-11 shrink-0 ${SHIMMER}`} />
            <div className="min-w-0 flex-1 space-y-3 pr-20">
              <div className="flex items-center gap-2">
                <div className={`h-4 w-32 ${SHIMMER}`} />
                <div className={`h-3 w-20 ${SHIMMER}`} />
              </div>
              <div className={`h-[14px] w-24 ${SHIMMER}`} />
              <div className="space-y-2 pt-1">
                <div className={`h-[13px] w-full ${SHIMMER}`} />
                <div className={`h-[13px] w-[92%] ${SHIMMER}`} />
                <div className={`h-[13px] w-[72%] ${SHIMMER}`} />
              </div>
              {i % 3 === 0 && (
                <div className={`h-52 w-full ${SHIMMER}`} />
              )}
              <div className="flex gap-6 pt-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className={`h-3 w-10 ${SHIMMER}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
