'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Staff {
  id: string;
  name: string;
  phone_number: string;
  is_active: boolean;
  shift_start_time: string;
}

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      // Postgres TIME type returns 'HH:MM:SS'. We need 'HH:MM' for input type="time"
      const formattedData = data.map(s => ({
         ...s,
         shift_start_time: s.shift_start_time ? s.shift_start_time.substring(0, 5) : '09:00'
      }));
      setStaffList(formattedData);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setShiftStart('09:00');
    setIsActive(true);
    setEditingStaff(null);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const { data: orgData } = await supabase.from('organizations').select('id').limit(1).single();
    if (!orgData) {
      alert("No organization found.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('staff').insert({
      name,
      phone_number: phone,
      shift_start_time: `${shiftStart}:00`,
      organization_id: orgData.id
    });

    if (error) {
      alert(error.message);
    } else {
      setShowAddModal(false);
      resetForm();
      fetchStaff();
    }
    setSaving(false);
  };

  const openEditModal = (staff: Staff) => {
    setEditingStaff(staff);
    setName(staff.name);
    setPhone(staff.phone_number);
    setShiftStart(staff.shift_start_time);
    setIsActive(staff.is_active);
    setShowEditModal(true);
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setSaving(true);

    const { error } = await supabase.from('staff').update({
      name,
      phone_number: phone,
      shift_start_time: `${shiftStart}:00`,
      is_active: isActive
    }).eq('id', editingStaff.id);

    if (error) {
      alert(error.message);
    } else {
      setShowEditModal(false);
      resetForm();
      fetchStaff();
    }
    setSaving(false);
  };

  const handleDeleteStaff = async (id: string, staffName: string) => {
    if (!confirm(`Are you absolutely sure you want to delete ${staffName}? This will also delete all of their past check-in logs.`)) return;
    
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) {
      alert(error.message);
    } else {
      fetchStaff();
    }
  };

  return (
    <div>
      <header className="responsive-header">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Staff Management</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Manage your team members and shift timings.</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowAddModal(true); }}>
          + Add Staff
        </button>
      </header>

      <div className="glass-panel table-responsive" style={{ backgroundColor: 'var(--background)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Name</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Phone</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Shift Start</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Status</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan={5} style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Loading staff...</td></tr>
            ) : staffList.length === 0 ? (
               <tr><td colSpan={5} style={{ padding: '1rem 1.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>No staff members added yet.</td></tr>
            ) : staffList.map((staff) => (
              <tr key={staff.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{staff.name}</td>
                <td style={{ padding: '1rem 1.5rem', color: 'var(--muted-foreground)' }}>{staff.phone_number}</td>
                <td style={{ padding: '1rem 1.5rem', color: 'var(--muted-foreground)' }}>
                  {new Date(`1970-01-01T${staff.shift_start_time}:00`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '99px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    backgroundColor: staff.is_active ? 'rgba(0,0,0,0.05)' : 'rgba(255,165,0,0.1)',
                    color: staff.is_active ? 'var(--foreground)' : '#d97706'
                  }}>
                    {staff.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                  <button onClick={() => openEditModal(staff)} style={{ color: 'var(--foreground)', fontSize: '0.875rem', fontWeight: 500, marginRight: '1rem' }}>Edit</button>
                  <button onClick={() => handleDeleteStaff(staff.id, staff.name)} style={{ color: '#ef4444', fontSize: '0.875rem', fontWeight: 500 }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-panel modal-content">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Add New Staff</h2>
            <form onSubmit={handleAddStaff}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Full Name</label>
                <input type="text" className="input-field" placeholder="Jane Doe" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Phone Number</label>
                <input type="tel" className="input-field" placeholder="+1 234 567 8900" value={phone} onChange={e => setPhone(e.target.value)} required />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Shift Start Time</label>
                <input type="time" className="input-field" value={shiftStart} onChange={e => setShiftStart(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '0.75rem 1rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-panel modal-content">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Edit Staff</h2>
            <form onSubmit={handleEditStaff}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Full Name</label>
                <input type="text" className="input-field" placeholder="Jane Doe" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Phone Number</label>
                <input type="tel" className="input-field" placeholder="+1 234 567 8900" value={phone} onChange={e => setPhone(e.target.value)} required />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Shift Start Time</label>
                <input type="time" className="input-field" value={shiftStart} onChange={e => setShiftStart(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input type="checkbox" id="active-checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} style={{ width: '1rem', height: '1rem' }} />
                <label htmlFor="active-checkbox" style={{ fontSize: '0.875rem', fontWeight: 500 }}>Staff is Active</label>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '0.75rem 1rem', color: 'var(--muted-foreground)', fontWeight: 500 }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Update Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
