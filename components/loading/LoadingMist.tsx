// Route-level loading state for the homepage and product pages — shown by
// Next.js as the Suspense fallback while the async server component (and
// its data fetch) resolves. Pure CSS/SVG: no 'use client', no JS timer, no
// hydration cost, and nothing here can delay FCP/LCP since it's just a
// static fallback that gets swapped out the moment real content is ready.
//
// Two-phase motion: soft mist blobs drift and fade (~600ms, plays once),
// then resolve into a looping "precision seal" line-drawing — an abstract
// calibration ring + crosshair, not a copy of any real certification mark.
// Stays invisible for its first 250ms via a pure-CSS delay so it never
// flashes on fast loads; only becomes visible if still mounted by then.
//
// `variant` is a hook for future reuse (e.g. a kaarobaar.co.in tiller/dust
// theme) — only "precision-seal" is implemented today.
type LoadingMistProps = {
  variant?: "precision-seal"
}

export default function LoadingMist({ variant = "precision-seal" }: LoadingMistProps) {
  void variant // only one variant exists today; kept for future extension

  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center bg-white" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="lm-gate">
        <svg viewBox="0 0 120 120" width="72" height="72" fill="none" aria-hidden="true">
          <ellipse className="lm-mist lm-mist-a" cx="50" cy="52" rx="20" ry="12" />
          <ellipse className="lm-mist lm-mist-b" cx="70" cy="42" rx="16" ry="10" />
          <ellipse className="lm-mist lm-mist-c" cx="58" cy="66" rx="14" ry="9" />
          <g className="lm-rig">
            <g transform="translate(60,60)">
              <line className="lm-tick lm-t1" pathLength="1" x1="0" y1="-40" x2="0" y2="-33" />
              <line className="lm-tick lm-t2" pathLength="1" x1="28" y1="-28" x2="23" y2="-23" />
              <line className="lm-tick lm-t3" pathLength="1" x1="40" y1="0" x2="33" y2="0" />
              <line className="lm-tick lm-t4" pathLength="1" x1="28" y1="28" x2="23" y2="23" />
              <line className="lm-tick lm-t5" pathLength="1" x1="0" y1="40" x2="0" y2="33" />
              <line className="lm-tick lm-t6" pathLength="1" x1="-28" y1="-28" x2="-23" y2="-23" />
              <circle className="lm-ring" pathLength="1" r="27" />
              <g className="lm-cross">
                <line x1="-8" y1="0" x2="8" y2="0" />
                <line x1="0" y1="-8" x2="0" y2="8" />
                <circle className="lm-dot" r="2.2" />
              </g>
            </g>
          </g>
        </svg>
      </div>

      <style>{`
        .lm-gate {
          opacity: 0;
          animation: lm-reveal 1ms 250ms forwards;
        }
        .lm-mist {
          fill: #94a3b8;
          fill-opacity: 0.35;
          filter: blur(3px);
          opacity: 0;
          animation: lm-drift 640ms ease-out both;
        }
        .lm-mist-b { animation-delay: 60ms; }
        .lm-mist-c { animation-delay: 120ms; }
        @keyframes lm-reveal { to { opacity: 1; } }
        @keyframes lm-drift {
          0%   { opacity: 0; transform: translateY(6px) scale(0.9); }
          35%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-8px) scale(1.08); }
        }
        .lm-rig { opacity: 0; animation: lm-rig-gate 2400ms linear infinite; animation-delay: 560ms; }
        @keyframes lm-rig-gate {
          0%   { opacity: 0; }
          4%   { opacity: 1; }
          78%  { opacity: 1; }
          92%  { opacity: 0; }
          100% { opacity: 0; }
        }
        .lm-tick {
          stroke: #94a3b8;
          stroke-width: 1.2;
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          opacity: 0;
          animation: lm-tick-in 2400ms cubic-bezier(.4,0,.2,1) infinite;
        }
        .lm-t1 { animation-delay: 560ms; }
        .lm-t2 { animation-delay: 610ms; }
        .lm-t3 { animation-delay: 660ms; }
        .lm-t4 { animation-delay: 710ms; }
        .lm-t5 { animation-delay: 760ms; }
        .lm-t6 { animation-delay: 810ms; }
        @keyframes lm-tick-in {
          0%   { opacity: 0; stroke-dashoffset: 1; }
          6%   { opacity: 1; }
          18%  { stroke-dashoffset: 0; opacity: 1; }
          78%  { opacity: 1; }
          92%  { opacity: 0; }
          100% { opacity: 0; }
        }
        .lm-ring {
          stroke: #334155;
          stroke-width: 1.6;
          fill: none;
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          transform: rotate(-90deg);
          transform-origin: center;
          animation: lm-draw 2400ms cubic-bezier(.4,0,.2,1) infinite;
          animation-delay: 900ms;
        }
        @keyframes lm-draw {
          0%   { stroke-dashoffset: 1; }
          46%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }
        .lm-cross {
          stroke: #334155;
          stroke-width: 1.4;
          opacity: 0;
          transform-origin: center;
          animation: lm-cross-pop 2400ms cubic-bezier(.2,0,.2,1) infinite;
          animation-delay: 1420ms;
        }
        @keyframes lm-cross-pop {
          0%   { opacity: 0; transform: scale(0.5); }
          16%  { opacity: 1; transform: scale(1); }
          62%  { opacity: 1; transform: scale(1); }
          76%  { opacity: 0; transform: scale(0.7); }
          100% { opacity: 0; transform: scale(0.7); }
        }
        .lm-dot { fill: #dc2626; }

        @media (prefers-reduced-motion: reduce) {
          .lm-gate { animation: none; opacity: 1; }
          .lm-mist { display: none; }
          .lm-rig { animation: none; opacity: 1; }
          .lm-tick, .lm-ring { animation: none; stroke-dashoffset: 0; opacity: 1; }
          .lm-cross { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}
