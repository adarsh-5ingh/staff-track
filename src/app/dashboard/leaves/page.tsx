'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getTodayDateString } from '@/lib/date';

interface Leave {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  staff: { id: string; name: string };
}

interface Staff {
  id: string;
  name: string;
}

export default function LeavesManagement() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [staffId, setStaffId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch leaves
    const { data: leavesData } = await supabase
      .from('leaves')
      .select('id, start_date, end_date, reason, staff(id, name)')
      .order('start_date', { ascending: false });
    
    if (leavesData) setLeaves(leavesData as any);

    // Fetch active staff for the dropdown
    const { data: staffData } = await supabase
      .from('staff')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    
    if (staffData) {
      setStaffList(staffData);
      if (staffData.length > 0) setStaffId(staffData[0].id);
    }
    
    setLoading(false);
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate > endDate) {
      alert("End Date must be after Start Date.");
      return;
    }
    setSaving(true);
    
    const { error } = await supabase.from('leaves').insert({
      staff_id: staffId,
      start_date: startDate,
      end_date: endDate,
      reason
    });

    if (error) {
      alert(error.message);
    } else {
      setShowAddModal(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      fetchData();
    }
    setSaving(false);
  };

  const handleDeleteLeave = async (id: string) => {
    if (!confirm('Are you sure you want to delete this leave record?')) return;
    const { error } = await supabase.from('leaves').delete().eq('id', id);
    if (error) {
      alert(error.message);
    } else {
      fetchData();
    }
  };

  const isCurrentlyOnLeave = (start: string, end: string) => {
    const today = getTodayDateString();
    return today >= start && today <= end;
  };

  return (
    <div>
      <header className="responsive-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Leave Management</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Track and manage staff absences.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          + Record Leave
        </button>
      </header>

      <div className="glass-panel table-responsive" style={{ backgroundColor: 'var(--background)' }}>
        <table className="mobile-card-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Name</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Duration</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Reason</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Status</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan={5} style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Loading leaves...</td></tr>
            ) : leaves.length === 0 ? (
               <tr><td colSpan={5} style={{ padding: '1rem 1.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>No leave records found.</td></tr>
            ) : leaves.map((leave) => (
              <tr key={leave.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td data-label="Name" style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{leave.staff?.name}</td>
                  <td data-label="Duration" style={{ padding: '1rem 1.5rem', color: 'var(--muted-foreground)' }}>
                    {leave.start_date} to {leave.end_date}
                  </td>
                  <td data-label="Reason" style={{ padding: '1rem 1.5rem', color: 'var(--muted-foreground)' }}>
                    {leave.reason}
                  </td>
                  <td data-label="Status" style={{ padding: '1rem 1.5rem' }}>
                    {isCurrentlyOnLeave(leave.start_date, leave.end_date) ? (
                      <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600 }}>Active Now</span>
                    ) : (
                      <span style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)', padding: '0.25rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600 }}>Upcoming / Past</span>
                    )}
                  </td>
                  <td className="no-label" style={{ padding: '1rem 1.5rem', width: '100%' }}>
                    <button onClick={() => handleDeleteLeave(leave.id)} style={{ width: '100%', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: 'var(--radius)', color: '#ef4444', fontSize: '0.875rem', fontWeight: 500, textAlign: 'center' }}>Delete Leave</button>
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-panel modal-content">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Record Staff Leave</h2>
            <form onSubmit={handleAddLeave}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Staff Member</label>
                <select className="input-field" value={staffId} onChange={e => setStaffId(e.target.value)} required>
                  {staffList.map(staff => (
                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                  ))}
                </select>
              </div>
              <div className="responsive-grid-2" style={{ marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Start Date</label>
                  <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>End Date</label>
                  <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Reason (Optional)</label>
                <input type="text" className="input-field" placeholder="e.g. Sick Leave, Vacation" value={reason} onChange={e => setReason(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '0.75rem 1rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
