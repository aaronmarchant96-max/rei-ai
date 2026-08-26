export default function HingeMark({ size = 36, animated = false, color = "#E2A33D" }) {
  return (
    <>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transformStyle: "preserve-3d",
          transformOrigin: "30px 32px",
          transition: "transform 0.5s cubic-bezier(.22,1.36,.36,1)",
        }}
        aria-hidden="true"
      >
        {/* The hinge "C" — an open bracket opening right, pivoting on the pin */}
        <path
          d="M47 20H33C26 20 22 24 22 30V34C22 40 26 44 33 44H47"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="26" cy="32" r="4" fill={color} />
      </svg>
      {animated && (
        <style>{`
          @keyframes rei-cardo-swing {
            0% { transform: rotateY(0deg); }
            50% { transform: rotateY(-48deg); }
            100% { transform: rotateY(0deg); }
          }
          @media (prefers-reduced-motion: no-preference) {
            .rei-brand .rei-cardo-mark svg {
              animation: rei-cardo-swing 0.9s cubic-bezier(.22,1.36,.36,1) 1;
            }
          }
        `}</style>
      )}
    </>
  );
}
