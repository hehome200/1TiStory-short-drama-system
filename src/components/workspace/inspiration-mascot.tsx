"use client";

export function InspirationMascot() {
  return (
    <div
      className="pointer-events-none absolute -right-4 -top-[38px] z-20 h-[66px] w-[72px] select-none"
      aria-hidden="true"
    >
      <div className="relative h-full w-full animate-[tistoryCatPeek_5.2s_ease-in-out_infinite]">
        <svg
          viewBox="0 0 72 66"
          className="h-full w-full drop-shadow-[0_0_14px_rgba(96,165,250,0.08)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M18 22 L14 8 L27 19"
            className="stroke-slate-200/70"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M54 22 L58 8 L45 19"
            className="stroke-slate-200/70"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M19 19 L17 13 L24 20"
            className="stroke-cyan-200/25"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M53 19 L55 13 L48 20"
            className="stroke-amber-200/25"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          <path
            d="M16 31 C16 21 24 17 36 17 C48 17 56 21 56 31 V39 C56 49 48 55 36 55 C24 55 16 49 16 39 V31Z"
            className="stroke-slate-200/70"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          <path d="M10 40 H14" className="stroke-slate-200/45" strokeWidth="2" strokeLinecap="square" />
          <path d="M58 40 H62" className="stroke-slate-200/45" strokeWidth="2" strokeLinecap="square" />
          <path d="M22 39 H30" className="stroke-slate-200/28" strokeWidth="1.75" strokeLinecap="square" />
          <path d="M42 39 H50" className="stroke-slate-200/28" strokeWidth="1.75" strokeLinecap="square" />
          <path d="M23 44 H31" className="stroke-slate-200/22" strokeWidth="1.75" strokeLinecap="square" />
          <path d="M41 44 H49" className="stroke-slate-200/22" strokeWidth="1.75" strokeLinecap="square" />

          <rect
            x="24"
            y="25"
            width="10"
            height="10"
            rx="2"
            className="fill-cyan-100 stroke-cyan-200 drop-shadow-[0_0_6px_rgba(125,211,252,0.4)]"
            strokeWidth="1.25"
          />
          <rect
            x="38"
            y="25"
            width="10"
            height="10"
            rx="2"
            className="fill-amber-200 stroke-amber-100 drop-shadow-[0_0_6px_rgba(251,191,36,0.38)]"
            strokeWidth="1.25"
          />

          <rect x="27" y="28" width="3" height="3" rx="0.8" className="fill-slate-950/85" />
          <rect x="41" y="28" width="3" height="3" rx="0.8" className="fill-slate-950/85" />

          <rect
            x="24"
            y="25"
            width="10"
            height="10"
            rx="2"
            className="origin-center fill-slate-950/90 animate-[tistoryCatBlink_6.4s_steps(1,end)_infinite]"
          />
          <rect
            x="38"
            y="25"
            width="10"
            height="10"
            rx="2"
            className="origin-center fill-slate-950/90 animate-[tistoryCatBlink_6.4s_steps(1,end)_infinite]"
          />

          <path
            d="M34 41 L36 43 L38 41"
            className="stroke-slate-200/80"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M36 43 C34 46 31 46 29 44"
            className="stroke-slate-200/55"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M36 43 C38 46 41 46 43 44"
            className="stroke-slate-200/55"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          <path
            d="M16 55 H56"
            className="stroke-slate-500/35"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <style jsx>{`
        @keyframes tistoryCatPeek {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          45% {
            transform: translateY(3px) rotate(-1deg);
          }
          70% {
            transform: translateY(-2px) rotate(1deg);
          }
        }

        @keyframes tistoryCatBlink {
          0%,
          88%,
          100% {
            opacity: 0;
          }
          90%,
          93% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
