// Profile avatar — shows uploaded image, or a colored initial if none.
export default function Avatar({
  displayName,
  avatarUrl,
  bannerColor = "#2e51a2",
  size = 200,
  className = "",
}: {
  displayName: string;
  avatarUrl?: string | null;
  bannerColor?: string;
  size?: number;
  className?: string;
}) {
  const initial = (displayName || "?").trim().charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={displayName}
        width={size}
        height={size}
        className={`rounded-lg border-4 border-ink-950 object-cover shadow-lg ${className}`}
        style={{ width: size, height: size }}
        // tastestack: local/no-referrer policy on outbound image hosts
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`rounded-lg border-4 border-ink-950 flex items-center justify-center font-extrabold text-white shadow-lg ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        background: `linear-gradient(135deg, ${bannerColor}, #d0021b)`,
      }}
    >
      {initial}
    </div>
  );
}
