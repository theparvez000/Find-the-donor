export default function Drop({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M32 4C32 4 12 28 12 41a20 20 0 0 0 40 0C52 28 32 4 32 4z" fill="#b91c1c" />
      <path d="M32 46s-9-5.6-9-11.4c0-3.2 2.4-5.2 4.9-5.2 1.7 0 3.2.9 4.1 2.3.9-1.4 2.4-2.3 4.1-2.3 2.5 0 4.9 2 4.9 5.2C41 40.4 32 46 32 46z" fill="#fff" />
    </svg>
  );
}
