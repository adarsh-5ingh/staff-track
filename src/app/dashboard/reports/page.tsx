'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface TimeLog {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  photo_url: string | null;
  checkout_photo_url: string | null;
  staff: { name: string, shift_start_time?: string };
}

export default function ReportsView() {
  const today = new Date().toISOString().split('T')[0];
  const [dateStr, setDateStr] = useState(today);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('time_logs')
        .select('id, check_in_time, check_out_time, photo_url, checkout_photo_url, staff(name, shift_start_time)')
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

  const isLate = (checkInIso: string, staffShiftStart: string = '09:00:00') => {
    // Compare time strings simply
    const checkInTime = new Date(checkInIso).toTimeString().split(' ')[0]; // HH:MM:SS
    return checkInTime > staffShiftStart;
  };

  return (
    <div>
      <header className="responsive-header">
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
        <table className="mobile-card-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Photos</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Name</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Check-in</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Check-out</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan={5} style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Loading reports...</td></tr>
            ) : logs.length === 0 ? (
               <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>No check-ins found for this date.</td></tr>
            ) : logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td data-label="Photos" className="col-half" style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div style={{ position: 'relative' }}>
                        {log.photo_url ? (
                          <img src={log.photo_url} onClick={() => setViewerImage(log.photo_url!)} alt="Check-in" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '2px solid #10b981' }} />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>N/A</div>
                        )}
                      </div>
                      <div style={{ position: 'relative' }}>
                        {log.check_out_time ? (
                          log.checkout_photo_url ? (
                            <img src={log.checkout_photo_url} onClick={() => setViewerImage(log.checkout_photo_url!)} alt="Check-out" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '2px solid #ef4444' }} />
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>N/A</div>
                          )
                        ) : (
                           <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td data-label="Name" className="col-half" style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{log.staff?.name}</td>
                  <td data-label="Check-in" style={{ padding: '1rem 1.5rem', color: 'var(--muted-foreground)' }}>
                    {formatTime(log.check_in_time)}
                  </td>
                  <td data-label="Check-out" style={{ padding: '1rem 1.5rem', color: 'var(--muted-foreground)' }}>
                    {log.check_out_time ? formatTime(log.check_out_time) : '--'}
                  </td>
                  <td data-label="Status" style={{ padding: '1rem 1.5rem' }}>
                    {isLate(log.check_in_time, log.staff.shift_start_time) ? (
                      <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600 }}>Late</span>
                    ) : (
                      <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600 }}>On Time</span>
                    )}
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
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
