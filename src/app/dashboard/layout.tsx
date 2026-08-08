'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkUserAndLinkOrg = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Auto-link Admin to the first Organization (MVP simplification)
      try {
        const { data: adminLink } = await supabase
          .from('admins')
          .select('id')
          .eq('id', session.user.id)
          .single();

        if (!adminLink) {
          // Find first org
          const { data: org } = await supabase.from('organizations').select('id').limit(1).single();
          if (org) {
            await supabase.from('admins').insert({
              id: session.user.id,
              organization_id: org.id
            });
          }
        }
      } catch (e) {
        console.error("Error auto-linking admin", e);
      }

      setLoading(false);
    };
    checkUserAndLinkOrg();
  }, [router]);

  // Close sidebar on navigation on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <div className="dashboard-layout">
      {/* Mobile Header */}
      <header className="mobile-header">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Staff Track</h2>
        <button onClick={() => setIsSidebarOpen(true)} style={{ padding: '0.5rem', color: 'inherit', display: 'flex' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </header>

      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Staff Track</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Admin Dashboard</p>
          </div>
          <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)} style={{ padding: '0.5rem', color: 'inherit', display: 'flex' }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <line x1="18" y1="6" x2="6" y2="18"></line>
               <line x1="6" y1="6" x2="18" y2="18"></line>
             </svg>
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
          <Link href="/dashboard" style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius)',
            display: 'block',
            fontWeight: 500,
            backgroundColor: pathname === '/dashboard' ? 'var(--muted)' : 'transparent'
          }}>
            Overview
          </Link>
          <Link href="/dashboard/staff" style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius)',
            display: 'block',
            fontWeight: 500,
            backgroundColor: pathname === '/dashboard/staff' ? 'var(--muted)' : 'transparent'
          }}>
            Staff Management
          </Link>
          <Link href="/dashboard/reports" style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius)',
            display: 'block',
            fontWeight: 500,
            backgroundColor: pathname === '/dashboard/reports' ? 'var(--muted)' : 'transparent'
          }}>
            Reports
          </Link>
          <Link href="/dashboard/leaves" style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius)',
            display: 'block',
            fontWeight: 500,
            backgroundColor: pathname === '/dashboard/leaves' ? 'var(--muted)' : 'transparent'
          }}>
            Leaves Management
          </Link>

          <div style={{ margin: '1rem 0', borderTop: '1px solid var(--border)' }} />
          
          <Link href="/kiosk" style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius)',
            display: 'block',
            fontWeight: 500,
            color: 'var(--foreground)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            Launch Kiosk
          </Link>
        </nav>
        
        <button onClick={handleLogout} style={{
           padding: '0.75rem 1rem',
           color: '#ef4444',
           fontWeight: 500,
           textAlign: 'left'
        }}>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="container" style={{ maxWidth: '1000px', margin: '0' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
