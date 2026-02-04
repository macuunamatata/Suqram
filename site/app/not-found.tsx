import Link from "next/link";

export const runtime = 'edge';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-6 sm:px-8 py-20 text-center">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
        Page not found
      </h1>
      <p className="mt-3 text-muted-foreground">
        The page you’re looking for doesn’t exist or has been moved.
      </p>
      <p className="mt-6">
        <Link
          href="/"
          className="text-base font-medium text-primary hover:underline"
        >
          Back to home
        </Link>
      </p>
    </div>
  );
}
