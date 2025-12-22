export function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <svg
        className="absolute top-0 left-0 w-full h-full opacity-30 dark:opacity-20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="blurFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="60" />
          </filter>
        </defs>

        {/* Blob 1: Top Right - Represents "Thoughts" */}
        <g filter="url(#blurFilter)">
          <circle cx="80%" cy="20%" r="25%" className="fill-accent/10 dark:fill-darkAccent/10">
            <animate
              attributeName="cy"
              values="20%;25%;20%"
              dur="20s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="cx"
              values="80%;75%;80%"
              dur="25s"
              repeatCount="indefinite"
            />
             <animate
              attributeName="r"
              values="25%;28%;25%"
              dur="30s"
              repeatCount="indefinite"
            />
          </circle>
        </g>

        {/* Blob 2: Bottom Left - Represents "Memory" */}
        <g filter="url(#blurFilter)">
          <circle cx="10%" cy="80%" r="30%" className="fill-muted/10 dark:fill-muted/5">
            <animate
              attributeName="cy"
              values="80%;75%;80%"
              dur="22s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="cx"
              values="10%;15%;10%"
              dur="28s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      </svg>

      {/* Tiny Floating Particles (CSS Animation) */}
      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-ink/20 dark:bg-white/20 rounded-full animate-float-slow"></div>
      <div className="absolute top-3/4 left-2/3 w-1.5 h-1.5 bg-accent/20 dark:bg-darkAccent/20 rounded-full animate-float-slower"></div>
      <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-muted/20 dark:bg-white/10 rounded-full animate-float-medium"></div>
    </div>
  )
}
