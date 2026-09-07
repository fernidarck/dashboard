export default function LogoMark({ size = 40, className = '' }) {
  return (
    <img
      src="/logo-onecontrol.png"
      alt="OneControl"
      style={{ height: size }}
      className={`w-auto object-contain shrink-0 ${className}`}
      onError={(e) => {
        e.target.style.display = 'none';
      }}
    />
  );
}

