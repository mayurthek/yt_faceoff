export default function Wordmark() {
  return (
    <p className="wordmark">
      <svg
        className="wordmark__mark"
        width="28"
        height="28"
        viewBox="0 0 28 28"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="fo-badge-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d3e2f6" />
            <stop offset="46%" stopColor="#7ba3d4" />
            <stop offset="52%" stopColor="#3f6ba4" />
            <stop offset="100%" stopColor="#2b5588" />
          </linearGradient>
          <linearGradient id="fo-badge-gloss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect
          x="0.5"
          y="0.5"
          width="27"
          height="27"
          rx="4"
          fill="url(#fo-badge-fill)"
          stroke="#17375a"
        />
        <rect
          x="1.5"
          y="1.5"
          width="25"
          height="25"
          rx="3"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.65"
        />
        <rect
          x="1.5"
          y="1.5"
          width="25"
          height="12"
          rx="3"
          fill="url(#fo-badge-gloss)"
        />
        <path
          d="M10.5 8.5 L6 14 L10.5 19.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17.5 8.5 L22 14 L17.5 19.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Face-Off
    </p>
  );
}
