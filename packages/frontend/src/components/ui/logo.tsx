'use client';

import { cn } from '@/lib/utils';

interface LogoProps {
  /** Show full wordmark (FIN | OPS + rules). Set false for icon-only mode. */
  full?: boolean;
  className?: string;
}

/**
 * FinOps — Japanese minimalist wordmark
 * Two thin horizontal rules frame "FIN | OPS" in ultra-light tracking.
 */
export function Logo({ full = true, className }: LogoProps) {
  if (!full) {
    /* Compact square icon for collapsed sidebar */
    return (
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl border border-emerald-500/30 bg-slate-900',
          className,
        )}
      >
        <span
          className="text-[11px] font-light tracking-[0.15em] text-white"
          style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
        >
          FIN
        </span>
        <div className="my-px h-px w-5 bg-emerald-500/70" />
        <span
          className="text-[11px] font-light tracking-[0.15em] text-emerald-400"
          style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
        >
          OPS
        </span>
      </div>
    );
  }

  return (
    /* outer div: receives className (w-full, w-36, etc) for positioning only */
    <div className={cn('flex items-center', className)}>
      {/* inner: always inline-sized to the text — rules never exceed text width */}
      <div className="inline-flex flex-col select-none">
        {/* Top rule */}
        <div className="h-px bg-emerald-500/40 mb-2" />

        {/* Wordmark row */}
        <div className="flex items-center whitespace-nowrap">
          <span
            className="text-[20px] font-extralight tracking-[0.12em] text-white leading-none"
            style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
          >
            FIN
          </span>
          <span className="mx-2 block h-4 w-px bg-emerald-500/60 self-center" />
          <span
            className="text-[20px] font-extralight tracking-[0.12em] text-emerald-400 leading-none"
            style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
          >
            OPS
          </span>
        </div>

        {/* Bottom rule */}
        <div className="h-px bg-slate-700/50 mt-2" />
      </div>
    </div>
  );
}
