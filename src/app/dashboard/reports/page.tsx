'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface TimeLog {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  photo_url: string | null;
  staff: { name: string };
}

export default function ReportsView() {
  const today = new Date().toISOString().split('T')[0];
  const [dateStr, setDateStr] = useState(today);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [shiftStart, setShiftStart] = useState('09:00:00'); // Default

  useEffect(() => {
    // Fetch Organization's shift start time
    const fetchOrgSettings = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: admin } = await supabase.from('admins').select('organization_id').eq('id', session.user.id).single();
      if (admin) {
        const { data: org } = await supabase.from('organizations').select('shift_start_time').eq('id', admin.organization_id).single();
        if (org && org.shift_start_time) {
          setShiftStart(org.shift_start_time);
        }
      }
    };
    fetchOrgSettings();
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('time_logs')
        .select('id, check_in_time, check_out_time, photo_url, staff(name)')
        .eq('date', dateStr)
        .order('check_in_time', { ascending: false });

      if (!error && data) {
        setLogs(data as any);
      }
      setLoading(false);
    };

    fetchLogs();
  }, [dateStr]);

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const isLate = (checkInIso: string) => {
    // Compare time strings simply
    const checkInTime = new Date(checkInIso).toTimeString().split(' ')[0]; // HH:MM:SS
    return checkInTime > shiftStart;
  };

  return (
    <div>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Historical Reports</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>View check-in logs and photos for any specific date.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Filter by Date:</label>
          <input 
            type="date" 
            className="input-field" 
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            style={{ width: 'auto', padding: '0.5rem 1rem' }}
            max={today}
          />
        </div>
      </header>

      <div className="glass-panel table-responsive" style={{ backgroundColor: 'var(--background)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Photo</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Name</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Check-in</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Check-out</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center' }}>Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>No check-ins found for this date.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem 1.5rem' }}>
                    {log.photo_url ? (
                      <div style={{ position: 'relative', display: 'inline-block', group: 'photo' }}>
                        <img 
                          src={log.photo_url} 
                          alt="Check-in" 
                          style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', transition: 'transform 0.2s' }} 
                          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(2.5)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        />
                      </div>
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--muted-foreground)' }}>N/A</div>
                    )}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{log.staff.name}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--muted-foreground)' }}>{formatTime(log.check_in_time)}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--muted-foreground)' }}>
                    {log.check_out_time ? formatTime(log.check_out_time) : '--'}
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    {isLate(log.check_in_time) ? (
                      <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600 }}>Late</span>
                    ) : (
                      <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600 }}>On Time</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
