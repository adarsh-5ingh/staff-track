'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Staff {
  id: string;
  name: string;
  phone_number: string;
  is_active: boolean;
}

export default function StaffManagement() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setStaffList(data);
    }
    setLoading(false);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // We assume an admin is logged in and belongs to an organization. 
    // For MVP, if we don't have organization RLS strictly enforced on insert via app UI, we need to handle org_id.
    // Let's get the first org to assign them to since this MVP is single-org right now.
    const { data: orgData } = await supabase.from('organizations').select('id').limit(1).single();
    
    if (!orgData) {
      alert("No organization found. Please run the setup SQL and add an organization.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('staff').insert({
      name,
      phone_number: phone,
      organization_id: orgData.id
    });

    if (error) {
      alert(error.message);
    } else {
      setShowAddModal(false);
      setName('');
      setPhone('');
      fetchStaff();
    }
    setSaving(false);
  };

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Staff Management</h1>
          <p style={{ color: 'var(--muted-foreground)' }}>Manage your team members and their profiles.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          + Add Staff
        </button>
      </header>

      <div className="glass-panel table-responsive" style={{ backgroundColor: 'var(--background)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Name</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Phone</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--muted-foreground)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan={3} style={{ padding: '1rem 1.5rem' }}>Loading staff...</td></tr>
            ) : staffList.length === 0 ? (
               <tr><td colSpan={3} style={{ padding: '1rem 1.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>No staff members added yet.</td></tr>
            ) : staffList.map((staff) => (
              <tr key={staff.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{staff.name}</td>
                <td style={{ padding: '1rem 1.5rem', color: 'var(--muted-foreground)' }}>{staff.phone_number}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="glass-panel" style={{ backgroundColor: 'var(--background)', padding: '2rem', width: '100%', maxWidth: '400px', borderRadius: 'var(--radius)' }}>
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
    </div>
  );
}
