'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Log {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  photo_url: string | null;
  staff: { name: string, shift_start_time?: string };
  date: string;
}

export default function DashboardOverview() {
  const [stats, setStats] = useState({ 
    totalStaff: 0, 
    checkedInToday: 0, 
    absent: 0,
    lateToday: 0
  });
  const [recentLogs, setRecentLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringCron, setTriggeringCron] = useState(false);

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
        .select('id, check_in_time, check_out_time, photo_url, staff(name, shift_start_time), date', { count: 'exact' })
        .eq('date', today)
        .order('check_in_time', { ascending: false });

      const todayLogs = (logs as any) || [];

      // Calculate Late
      let lateCount = 0;

      todayLogs.forEach((log: Log) => {
        const timeStr = new Date(log.check_in_time).toTimeString().split(' ')[0];
        const staffShiftStart = log.staff?.shift_start_time || '09:00:00';
        if (timeStr > staffShiftStart) lateCount++;
      });

      setStats({
        totalStaff: staffCount || 0,
        checkedInToday: checkedInCount || 0,
        absent: (staffCount || 0) - (checkedInCount || 0),
        lateToday: lateCount
      });
      
      setRecentLogs(todayLogs);
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
        if (data.errors && data.errors.length > 0) {
           alert("SMS Sending Errors:\n\n" + data.errors.join("\n\n"));
        }
      } else {
        alert(data.error || 'Failed to trigger cron');
      }
    } catch (e) {
      alert('Network error while triggering cron.');
    }
    setTriggeringCron(false);
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
          {triggeringCron ? 'Sending...' : 'Test: Generate PINs & Send SMS'}
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', backgroundColor: 'var(--background)' }}>
          <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Total Active Staff</h3>
          <p style={{ fontSize: '2rem', fontWeight: 600 }}>{stats.totalStaff}</p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', backgroundColor: 'var(--background)' }}>
          <h3 style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Checked In Today</h3>
          <p style={{ fontSize: '2rem', fontWeight: 600 }}>{stats.checkedInToday} <span style={{fontSize: '1rem', color: '#ef4444', fontWeight: 400}}>({stats.lateToday} Late)</span></p>
        </div>
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
                  {log.photo_url ? (
                    <img src={log.photo_url} alt="Check-in photo" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>No Photo</div>
                  )}
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
    </div>
  );
}
