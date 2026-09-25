function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path fill="#c8c4ea" d="M4 50 L22 26 L31 37 L42 16 L60 50z" />
      <path fill="#8b7fd6" d="M26 50 L42 16 L60 50z" />
      <path fill="#d4ecd9" d="M36 27 L42 16 L48 27 L44 25 L42 28 L40 25z" />
    </svg>
  );
}

export default Logo;
