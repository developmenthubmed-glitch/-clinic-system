import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

const theme = {
  primary: '#112e51',
  secondary: '#005ea2',
  surface: '#ffffff',
  bg: '#f0f0f0',
  text: '#1b1b1b',
  textMuted: '#565c65',
  border: '#dfe1e2',
  danger: '#d83933',
  success: '#2e8540',
};

export default function Settings({ currentUser }) {
  const [tab, setTab] = useState('schedules'); // 'schedules' | 'users'
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);

  const [schedForm, setSchedForm] = useState({ disease_name: '', schedule_date: '', quota: '' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const logActivity = async (action, detail) => {
    await supabase.from('audit_logs').insert([{ user_name: currentUser.full_name, action, detail }]);
  };

  const fetchData = async () => {
    setLoading(true);
    const [resSched, resUsers] = await Promise.all([
      supabase.from('clinic_schedules').select('*').order('schedule_date', { ascending: true }),
      supabase.from('staff_users').select('*').order('created_at', { ascending: false })
    ]);
    if (resSched.data) setSchedules(resSched.data);
    if (resUsers.data) setUsers(resUsers.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Clinic Schedules Logic ---
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: exist } = await supabase.from('clinic_schedules').select('id').eq('disease_name', schedForm.disease_name).eq('schedule_date', schedForm.schedule_date);
    
    if (exist && exist.length > 0) {
      showToast('Schedule for this clinic on this date already exists.', 'error');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('clinic_schedules').insert([{
      disease_name: schedForm.disease_name,
      schedule_date: schedForm.schedule_date,
      quota: parseInt(schedForm.quota)
    }]);

    if (error) showToast(error.message, 'error');
    else {
      showToast('Clinic schedule opened successfully');
      logActivity('Add Schedule', `Opened ${schedForm.disease_name} on ${schedForm.schedule_date} (Quota: ${schedForm.quota})`);
      setSchedForm({ disease_name: '', schedule_date: '', quota: '' });
      fetchData();
    }
    setLoading(false);
  };

  const handleDeleteSchedule = async (id, name, date) => {
    if (!window.confirm(`Are you sure you want to close this schedule?\n${name} on ${date}`)) return;
    const { error } = await supabase.from('clinic_schedules').delete().eq('id', id);
    if (error) showToast(error.message, 'error');
    else {
      showToast('Schedule deleted');
      logActivity('Delete Schedule', `Deleted ${name} on ${date}`);
      fetchData();
    }
  };

  // --- Staff Users Logic ---
  const handleApproveUser = async (id, name) => {
    const { error } = await supabase.from('staff_users').update({ is_approved: true }).eq('id', id);
    if (error) showToast(error.message, 'error');
    else {
      showToast(`User ${name} approved`);
      logActivity('Approve User', `Approved staff account for ${name}`);
      fetchData();
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete account: ${name}?`)) return;
    const { error } = await supabase.from('staff_users').delete().eq('id', id);
    if (error) showToast(error.message, 'error');
    else {
      showToast(`User ${name} removed`);
      logActivity('Delete User', `Removed staff account for ${name}`);
      fetchData();
    }
  };

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: toast.type === 'error' ? theme.danger : theme.success, color: 'white', padding: '16px 24px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, fontWeight: 'bold' }}>
          {toast.type === 'error' ? '⚠️' : '✅'} {toast.message}
        </div>
      )}

      <div style={{ marginBottom: '24px', borderBottom: `2px solid ${theme.border}`, paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', color: theme.primary }}>System Settings</h1>
        <p style={{ margin: 0, color: theme.textMuted }}>Manage clinic schedules and staff access permissions.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button onClick={() => setTab('schedules')} style={{ padding: '10px 20px', border: 'none', background: tab === 'schedules' ? theme.secondary : '#fff', color: tab === 'schedules' ? '#fff' : theme.textMuted, borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid ${tab === 'schedules' ? theme.secondary : theme.border}` }}>
          Clinic Schedules
        </button>
        <button onClick={() => setTab('users')} style={{ padding: '10px 20px', border: 'none', background: tab === 'users' ? theme.secondary : '#fff', color: tab === 'users' ? '#fff' : theme.textMuted, borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid ${tab === 'users' ? theme.secondary : theme.border}` }}>
          Staff Accounts
        </button>
      </div>

      {tab === 'schedules' && (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          
          <div style={{ flex: '0 0 350px', background: theme.surface, padding: '24px', borderRadius: '4px', border: `1px solid ${theme.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: theme.primary }}>Open New Schedule</h3>
            <form onSubmit={handleSaveSchedule}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Protocol / Clinic Name *</label>
                <input required value={schedForm.disease_name} onChange={e=>setSchedForm({...schedForm, disease_name: e.target.value})} placeholder="e.g. Leukemia Clinic" style={{ width: '100%', padding: '10px', border: `1px solid ${theme.border}`, borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Date *</label>
                <input type="date" required value={schedForm.schedule_date} onChange={e=>setSchedForm({...schedForm, schedule_date: e.target.value})} style={{ width: '100%', padding: '10px', border: `1px solid ${theme.border}`, borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Daily Quota (Patients) *</label>
                <input type="number" min="1" required value={schedForm.quota} onChange={e=>setSchedForm({...schedForm, quota: e.target.value})} placeholder="e.g. 50" style={{ width: '100%', padding: '10px', border: `1px solid ${theme.border}`, borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: theme.primary, color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Saving...' : 'Save Schedule'}
              </button>
            </form>
          </div>

          <div style={{ flex: 1, background: theme.surface, borderRadius: '4px', border: `1px solid ${theme.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: theme.bg, fontSize: '13px', color: theme.primary }}>
                <tr>
                  <th style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}` }}>Clinic Protocol</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}` }}>Date</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}` }}>Quota</th>
                  <th style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: theme.textMuted }}>No schedules created.</td></tr>
                ) : (
                  schedules.map((s, idx) => (
                    <tr key={s.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9', borderBottom: `1px solid ${theme.border}`, fontSize: '14px' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{s.disease_name}</td>
                      <td style={{ padding: '12px 16px' }}>{s.schedule_date}</td>
                      <td style={{ padding: '12px 16px' }}>{s.quota}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button onClick={() => handleDeleteSchedule(s.id, s.disease_name, s.schedule_date)} style={{ padding: '6px 12px', background: 'transparent', color: theme.danger, border: `1px solid ${theme.danger}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Remove</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div style={{ background: theme.surface, borderRadius: '4px', border: `1px solid ${theme.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: theme.bg, fontSize: '13px', color: theme.primary }}>
              <tr>
                <th style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}` }}>Name</th>
                <th style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}` }}>Username</th>
                <th style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}` }}>Role</th>
                <th style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}` }}>Status</th>
                <th style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9', borderBottom: `1px solid ${theme.border}`, fontSize: '14px' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{u.full_name}</td>
                  <td style={{ padding: '12px 16px' }}>{u.username}</td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{u.role}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: u.is_approved ? '#dcfce7' : '#fef3c7', color: u.is_approved ? '#16a34a' : '#d97706', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                      {u.is_approved ? 'Active' : 'Pending Approval'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {!u.is_approved && (
                        <button onClick={() => handleApproveUser(u.id, u.full_name)} style={{ padding: '6px 12px', background: theme.success, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Approve</button>
                      )}
                      {currentUser.id !== u.id && (
                        <button onClick={() => handleDeleteUser(u.id, u.full_name)} style={{ padding: '6px 12px', background: 'transparent', color: theme.danger, border: `1px solid ${theme.danger}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Revoke Access</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}