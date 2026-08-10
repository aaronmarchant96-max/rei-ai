export default function HingeMark({ size = 36, animated = false, color = "#E2A33D" }) {
  return (
    <>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transformStyle: "preserve-3d",
          transformOrigin: "8px center",
          transition: "transform 0.5s cubic-bezier(.22,1.36,.36,1)",
        }}
        aria-label="CARDO hinge mark"
      >
        <path
          d="M15 5H10C8.9 5 8 5.9 8 7V17C8 18.1 8.9 19 10 19H15"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
