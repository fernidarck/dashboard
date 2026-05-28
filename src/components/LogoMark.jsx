export default function LogoMark({ size = 40 }) {
  const w = Math.round(size * 0.56);
  return (
    <svg width={w} height={size} viewBox="0 0 28 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="20" height="42" rx="10" stroke="#FF6B00" strokeWidth="6.5" />
    </svg>
  );
}
