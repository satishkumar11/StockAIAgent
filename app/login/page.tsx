export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <form
        action="/api/login"
        method="post"
        className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <h1 className="text-lg font-semibold">Portfolio Tracker</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Enter the password to continue.
        </p>

        <input
          type="password"
          name="password"
          autoFocus
          required
          className="mt-4 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none"
        />

        {error && (
          <p className="mt-2 text-sm text-[var(--delta-bad)]">Incorrect password.</p>
        )}

        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
        >
          Log in
        </button>
      </form>
    </div>
  );
}
