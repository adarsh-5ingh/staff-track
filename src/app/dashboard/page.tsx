'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Log {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  photo_url: string | null;
  checkout_photo_url: string | null;
  staff: { name: string, target_duration_minutes?: number };
  date: string;
}

interface DailyPin {
  pin: string;
  is_sent: boolean;
  staff: { name: string; phone_number: string };
}

export default function DashboardOverview() {
  const [stats, setStats] = useState({ 
    totalStaff: 0, 
    checkedInToday: 0, 
    absent: 0,
    activeNow: 0
  });
  const [recentLogs, setRecentLogs] = useState<Log[]>([]);
  const [dailyPins, setDailyPins] = useState<DailyPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringCron, setTriggeringCron] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // 1. Get total active staff
      const { count: staffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // 2. Get today's check-ins
      const { data: logs, count: checkedInCount } = await supabase
        .from('time_logs')
        .select('id, check_in_time, check_out_time, photo_url, checkout_photo_url, staff(name, target_duration_minutes), date', { count: 'exact' })
        .eq('date', today)
        .order('check_in_time', { ascending: false });

      const todayLogs = (logs as any) || [];

      // Calculate Active Now
      let activeCount = 0;

      todayLogs.forEach((log: Log) => {
        if (!log.check_out_time) activeCount++;
      });

      setStats({
        totalStaff: staffCount || 0,
        checkedInToday: checkedInCount || 0,
        absent: (staffCount || 0) - (checkedInCount || 0),
        activeNow: activeCount
      });
      
      setRecentLogs(todayLogs);

      // 3. Get today's PINs
      const { data: pinsData } = await supabase
        .from('daily_pins')
        .select('pin, is_sent, staff(name, phone_number)')
        .eq('date', today);
      
      setDailyPins(pinsData as any || []);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestCron = async () => {
    setTriggeringCron(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch('/api/cron', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'PINs generated successfully.');
        fetchData(); // Refresh to show the new PINs
      } else {
        alert(data.error || 'Failed to trigger cron');
      }
    } catch (e) {
      alert('Network error while triggering cron.');
    }
    setTriggeringCron(false);
  };

  const handleMarkAsSent = async (pin: string) => {
    // Optimistic UI update
    setDailyPins(prev => prev.map(p => p.pin === pin ? { ...p, is_sent: true } : p));
    
    // DB update
    try {
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('daily_pins')
        .update({ is_sent: true })
        .eq('pin', pin)
        .eq('date', today);
    } catch (err) {
      console.error('Failed to mark PIN as sent:', err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <header className="responsive-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Overview</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Monitor today's check-ins and activity.</p>
        </div>
        <button className="btn-primary" onClick={handleTestCron} disabled={triggeringCron}>
          {triggeringCron ? 'Generating...' : 'Generate Daily PINs'}
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', backgroundColor: 'var(--background)' }}>
          <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Total Active Staff</h3>
          <p style={{ fontSize: '2rem', fontWeight: 600 }}>{stats.totalStaff}</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', backgroundColor: 'var(--background)' }}>
          <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Checked In Today</h3>
          <p style={{ fontSize: '2rem', fontWeight: 600 }}>{stats.checkedInToday} <span style={{fontSize: '1rem', color: '#10b981', fontWeight: 400}}>({stats.activeNow} Active Now)</span></p>
        </div>
      </div>

      <div className="glass-panel" style={{ backgroundColor: 'var(--background)', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Today's PINs (Manual SMS)</h2>
        {dailyPins.length === 0 ? (
          <p style={{ color: 'var(--muted-foreground)' }}>No PINs generated for today yet. Click "Generate Daily PINs" above.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {dailyPins.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--muted)', borderRadius: 'var(--radius)' }}>
                <div>
                  <p style={{ fontWeight: 600 }}>{p.staff?.name}</p>
                  <p style={{ fontSize: '1.25rem', letterSpacing: '2px', color: 'var(--primary)' }}>{p.pin}</p>
                </div>
                {p.is_sent ? (
                  <a 
                    href={`sms:${p.staff?.phone_number}?body=Hi ${p.staff?.name}, your Staff Track check-in PIN for today is: ${p.pin}`}
                    style={{ textDecoration: 'none', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 600, border: 'none', display: 'inline-block', textAlign: 'center' }}
                  >
                    Sent ✅ (Resend)
                  </a>
                ) : (
                  <a 
                    href={`sms:${p.staff?.phone_number}?body=Hi ${p.staff?.name}, your Staff Track check-in PIN for today is: ${p.pin}`}
                    className="btn-primary" 
                    onClick={() => handleMarkAsSent(p.pin)}
                    style={{ textDecoration: 'none', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  >
                    Send SMS
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ backgroundColor: 'var(--background)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Recent Activity (Today)</h2>
          <button onClick={fetchData} style={{ color: 'var(--primary)', fontSize: '0.875rem', fontWeight: 500 }}>Refresh</button>
        </div>
        
        {recentLogs.length === 0 ? (
          <p style={{ color: 'var(--muted-foreground)' }}>No check-ins today yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentLogs.map((log) => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>IN</span>
                    {log.photo_url ? (
                      <img src={log.photo_url} onClick={() => setViewerImage(log.photo_url!)} alt="Check-in photo" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '2px solid #10b981' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>N/A</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>OUT</span>
                    {log.check_out_time ? (
                      log.checkout_photo_url ? (
                        <img src={log.checkout_photo_url} onClick={() => setViewerImage(log.checkout_photo_url!)} alt="Check-out photo" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '2px solid #ef4444' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>N/A</div>
                      )
                    ) : (
                       <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
                    )}
                  </div>
                  <div>
                    <p style={{ fontWeight: 500 }}>{log.staff?.name}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                      Checked in at {new Date(log.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      {log.check_out_time && ` • Checked out at ${new Date(log.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewerImage && (
        <div 
          onClick={() => setViewerImage(null)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
        >
          <img src={viewerImage} alt="Full screen" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px', objectFit: 'contain' }} />
          <button style={{ position: 'absolute', top: '2rem', right: '2rem', color: 'white', fontSize: '1.5rem', background: 'rgba(0,0,0,0.5)', width: '40px', height: '40px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}
    </div>
  );
}
