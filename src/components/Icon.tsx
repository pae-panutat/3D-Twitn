const paths: Record<string, React.ReactNode> = {
  train: (
    <>
      <rect x="5" y="3" width="14" height="15" rx="4" />
      <path d="M5 10h14M9 6h6M8 14h.01M16 14h.01M8 18l-3 4m11-4 3 4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
    </>
  ),
  moon: <path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z" />,
  search: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 5 5" />
    </>
  ),
  bell: <path d="M18 8a6 6 0 0 0-12 0v5l-2 3h16l-2-3zm-8 12h4" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  reset: <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7" />,
  map: <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zm6-3v15m6-12v15" />,
};
export default function Icon({name}: {name: string}) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name] ?? paths.train}
    </svg>
  );
}
