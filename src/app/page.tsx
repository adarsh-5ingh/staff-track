import Link from 'next/link';

export default function Home() {
  return (
    <main className="container flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
          Staff Track
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--muted-foreground)', maxWidth: '600px', margin: '0 auto' }}>
          Seamless check-in system for modern organizations.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link href="/kiosk" className="btn-primary" style={{ padding: '1rem 2rem' }}>
          Launch Kiosk (Dial Pad)
        </Link>
        <Link href="/dashboard" className="btn-primary" style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
          Admin Dashboard
        </Link>
      </div>
    </main>
  );
}
