import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      <div className="text-6xl mb-4">🤷</div>
      <h1 className="text-2xl font-bold mb-2">Not found</h1>
      <p className="text-ink-500 mb-6">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/" className="btn-primary">
        Go home
      </Link>
    </div>
  );
}
