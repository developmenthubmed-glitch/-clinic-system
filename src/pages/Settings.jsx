import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

const theme = {
  primary: '#0b1f38',
  secondary: '#005ea2',
  surface: '#ffffff',
  bg: '#f4f6f9',
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

  // --- Multi-select Calendar State ---
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDisease, setSelectedDisease] = useState('');
  const [selectedDates, setSelectedDates] = useState([]);
  const [quotas, setQuotas] = useState({});
  const [bulkQuota, setBulkQuota] = useState('');

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

  useEffect(() => { fetchData(); }, []);

  // --- Calendar Helpers ---
  const formatDate = (date) => {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
  };

  const generateCalendarDays = () => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(formatDate(new Date(year, month, i)));
    return days;
  };

  const toggleDate = (dateStr) => {
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr));
      const newQuotas = { ...quotas };
      delete newQuotas[dateStr];
      setQuotas(newQuotas);
    } else {
      setSelectedDates([...selectedDates, dateStr].sort());
      setQuotas({ ...quotas, [dateStr]: bulkQuota || 0 });
    }
  };

  const applyBulkQuota = () => {
    if (!bulkQuota) return showToast('Please enter a number (กรุณาระบุจำนวน)', 'error');
    const newQuotas = { ...quotas };
    selectedDates.forEach(date => { newQuotas[date] = parseInt(bulkQuota); });
    setQuotas(newQuotas);
    showToast(`Applied ${bulkQuota} to all selected dates (นำโควตาไปใช้กับทุกวันแล้ว)`);
  };

  const handleSaveSchedules = async () => {
    if (!selectedDisease) return showToast('Please enter clinic name (กรุณาระบุชื่อคลินิก)', 'error');
    if (selectedDates.length === 0) return showToast('Please select at least one date (กรุณาเลือกวันอย่างน้อย 1 วัน)', 'error');

    setLoading(true);
    const payload = selectedDates.map(date => ({
      disease_name: selectedDisease,
      schedule_date: date,
      quota: parseInt(quotas[date]) || 0
    }));

    for (let date of selectedDates) {
      await supabase.from('clinic_schedules').delete().match({ disease_name: selectedDisease, schedule_date: date });
    }

    const { error } = await supabase.from('clinic_schedules').insert(payload);
    if (error) showToast(error.message, 'error');
    else {
      showToast('Schedules saved successfully! (บันทึกตารางเรียบร้อย)');
      logActivity('Add Schedule Batch', `Opened ${selectedDisease} for ${selectedDates.length} days`);
      setSelectedDates([]); setQuotas({}); setBulkQuota(''); setSelectedDisease('');
      fetchData();
    }
    setLoading(false);
  };

  const handleDeleteSchedule = async (id, name, date) => {
    if (!window.confirm(`Are you sure you want to close this schedule?\n(ยืนยันการลบตารางออกตรวจนี้ใช่หรือไม่?)`)) return;
    await supabase.from('clinic_schedules').delete().eq('id', id);
    showToast('Schedule deleted');
    fetchData();
  };

  // --- Users Approval Logic ---
  const handleApproveUser = async (id, name) => {
    const { error } = await supabase.from('staff_users').update({ is_approved: true }).eq('id', id);
    if (error) showToast(error.message, 'error');
    else {
      showToast(`User ${name} approved successfully (อนุมัติผู้ใช้งานสำเร็จ)`);
      logActivity('Approve User', `Approved staff account for ${name}`);
      fetchData();
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete account: ${name}?\n(ยืนยันการลบบัญชีผู้ใช้งานนี้ใช่หรือไม่?)`)) return;
    const { error } = await supabase.from('staff_users').delete().eq('id', id);
    if (error) showToast(error.message, 'error');
    else {
      showToast(`User ${name} removed (ลบบัญชีผู้ใช้งานแล้ว)`);
      logActivity('Delete User', `Removed staff account for ${name}`);
      fetchData();
    }
  };

  const monthNames = ["January (มกราคม)", "February (กุมภาพันธ์)", "March (มีนาคม)", "April (เมษายน)", "May (พฤษภาคม)", "June (มิถุนายน)", "July (กรกฎาคม)", "August (สิงหาคม)", "September (กันยายน)", "October (ตุลาคม)", "November (พฤศจิกายน)", "December (ธันวาคม)"];

  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: '20px', right: '20px', background: toast.type === 'error' ? theme.danger : theme.success, color: 'white', padding: '16px 24px', borderRadius: '8px', zIndex: 9999, fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>{toast.message}</div>}

      {/* Header */}
      <div style={{ marginBottom: '32px', borderBottom: `3px solid ${theme.secondary}`, paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '900', margin: '0 0 8px 0', color: theme.primary, letterSpacing: '-0.5px' }}>
          System Settings <span style={{fontSize: '20px', color: theme.textMuted, fontWeight: 'normal', marginLeft: '10px'}}>(ตั้งค่าระบบ)</span>
        </h1>
        <p style={{ margin: 0, color: theme.textMuted, fontSize: '15px' }}>Manage clinic schedules and staff access. (จัดการตารางคลินิกและสิทธิ์ผู้ใช้งาน)</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button onClick={() => setTab('schedules')} style={{ padding: '12px 24px', border: 'none', background: tab === 'schedules' ? theme.secondary : '#fff', color: tab === 'schedules' ? '#fff' : theme.textMuted, borderRadius: '4px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid ${tab === 'schedules' ? theme.secondary : theme.border}` }}>
          Clinic Schedules (ตารางคลินิก)
        </button>
        <button onClick={() => setTab('users')} style={{ padding: '12px 24px', border: 'none', background: tab === 'users' ? theme.secondary : '#fff', color: tab === 'users' ? '#fff' : theme.textMuted, borderRadius: '4px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', border: `1px solid ${tab === 'users' ? theme.secondary : theme.border}` }}>
          Staff Accounts (บัญชีเจ้าหน้าที่)
          {users.filter(u => !u.is_approved).length > 0 && (
            <span style={{ background: theme.danger, color: 'white', padding: '2px 8px', borderRadius: '12px', marginLeft: '8px', fontSize: '12px' }}>
              {users.filter(u => !u.is_approved).length} New
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Schedules */}
      {tab === 'schedules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ background: theme.surface, padding: '32px', borderRadius: '8px', border: `1px solid ${theme.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 24px 0', color: theme.primary, fontSize: '22px', fontWeight: '800' }}>Create Schedules (สร้างตารางออกตรวจ)</h2>
            <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Left: Calendar */}
              <div style={{ flex: '1 1 450px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: theme.text }}>Protocol / Clinic Name <span style={{color: theme.danger}}>*</span></label>
                  <input value={selectedDisease} onChange={e=>setSelectedDisease(e.target.value)} placeholder="e.g. Leukemia Clinic" style={{ width: '100%', padding: '12px 16px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '15px' }} />
                </div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: theme.text }}>Select Dates (คลิกเลือกวันบนปฏิทิน - เลือกได้หลายวัน)</label>
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: theme.bg }}>
                    <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1))} style={{ padding: '8px 16px', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>◀</button>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: theme.primary }}>{monthNames[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}</div>
                    <button onClick={() => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1))} style={{ padding: '8px 16px', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>▶</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', background: theme.primary, color: 'white', fontWeight: 'bold', fontSize: '13px' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} style={{ padding: '12px 0' }}>{d}</div>)}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {generateCalendarDays().map((dateStr, i) => {
                      if (!dateStr) return <div key={i} style={{ borderBottom: `1px solid ${theme.border}`, borderRight: `1px solid ${theme.border}`, minHeight: '80px', background: theme.bg }}></div>;
                      const dayNum = parseInt(dateStr.split('-')[2]);
                      const isSelected = selectedDates.includes(dateStr);
                      const isPast = dateStr < new Date().toISOString().split('T')[0];
                      return (
                        <div key={i} onClick={() => !isPast && toggleDate(dateStr)} style={{ borderBottom: `1px solid ${theme.border}`, borderRight: `1px solid ${theme.border}`, minHeight: '80px', padding: '10px', background: isSelected ? theme.secondary : (isPast ? theme.bg : 'white'), color: isSelected ? 'white' : (isPast ? theme.textMuted : theme.text), cursor: isPast ? 'not-allowed' : 'pointer', transition: '0.1s' }}>
                          <div style={{ fontSize: '18px', fontWeight: isSelected ? 'bold' : 'normal' }}>{dayNum}</div>
                          {isSelected && <div style={{ fontSize: '11px', marginTop: '8px', background: 'rgba(255,255,255,0.2)', padding: '2px 4px', borderRadius: '4px', textAlign: 'center' }}>Selected</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right: Quota */}
              <div style={{ flex: '1 1 350px' }}>
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: theme.secondary }}>Bulk Apply Quota (กำหนดโควตารวม)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="number" placeholder="Set for all..." value={bulkQuota} onChange={e=>setBulkQuota(e.target.value)} style={{ flex: 1, padding: '12px 16px', border: `1px solid ${theme.secondary}`, borderRadius: '4px', fontSize: '15px' }} />
                    <button onClick={applyBulkQuota} style={{ padding: '12px 20px', background: theme.secondary, color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Apply All</button>
                  </div>
                </div>

                <div style={{ border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '16px', maxHeight: '400px', overflowY: 'auto', background: 'white' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: theme.primary }}>Selected Dates ({selectedDates.length} days)</h3>
                  {selectedDates.length === 0 ? <p style={{ color: theme.textMuted, fontSize: '14px' }}>ยังไม่ได้เลือกวันที่บนปฏิทิน</p> : 
                    selectedDates.map(date => (
                      <div key={date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${theme.border}` }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: theme.text }}>{date}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: theme.textMuted }}>Quota:</span>
                          <input type="number" value={quotas[date] || ''} onChange={e=>setQuotas({...quotas, [date]: e.target.value})} style={{ width: '80px', padding: '8px', border: `1px solid ${theme.border}`, borderRadius: '4px', textAlign: 'center' }} />
                        </div>
                      </div>
                    ))
                  }
                </div>

                <button onClick={handleSaveSchedules} disabled={loading || selectedDates.length === 0} style={{ width: '100%', marginTop: '24px', padding: '16px', background: theme.success, color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: (loading || selectedDates.length === 0) ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Saving...' : '💾 Save Schedules (บันทึกตาราง)'}
                </button>
              </div>
            </div>
          </div>

          <div style={{ background: theme.surface, borderRadius: '8px', border: `1px solid ${theme.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: `1px solid ${theme.border}`, background: '#f9f9f9' }}>
              <h2 style={{ margin: 0, color: theme.primary, fontSize: '20px', fontWeight: '800' }}>Existing Schedules (ตารางที่มีในระบบ)</h2>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: theme.primary, color: 'white', fontSize: '13px' }}>
                <tr><th style={{ padding: '16px 24px' }}>Protocol / Clinic</th><th style={{ padding: '16px 24px' }}>Date</th><th style={{ padding: '16px 24px' }}>Quota</th><th style={{ padding: '16px 24px', textAlign: 'right' }}>Action</th></tr>
              </thead>
              <tbody>
                {schedules.map((s, idx) => (
                  <tr key={s.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9', borderBottom: `1px solid ${theme.border}` }}>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold' }}>{s.disease_name}</td>
                    <td style={{ padding: '16px 24px' }}>{s.schedule_date}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: theme.secondary }}>{s.quota}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button onClick={() => handleDeleteSchedule(s.id, s.disease_name, s.schedule_date)} style={{ padding: '8px 16px', background: 'transparent', color: theme.danger, border: `1px solid ${theme.danger}`, borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Users Approval (โค้ดเต็ม!) */}
      {tab === 'users' && (
        <div style={{ background: theme.surface, borderRadius: '8px', border: `1px solid ${theme.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: `1px solid ${theme.border}`, background: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: theme.primary, fontSize: '20px', fontWeight: '800' }}>Staff & Admin Accounts (รายชื่อผู้ใช้งาน)</h2>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: theme.primary, color: 'white', fontSize: '13px' }}>
              <tr>
                <th style={{ padding: '16px 24px' }}>Name (ชื่อ-นามสกุล)</th>
                <th style={{ padding: '16px 24px' }}>Username</th>
                <th style={{ padding: '16px 24px' }}>Role</th>
                <th style={{ padding: '16px 24px' }}>Status</th>
                <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>No users found.</td></tr>
              ) : (
                users.map((u, idx) => (
                  <tr key={u.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9', borderBottom: `1px solid ${theme.border}`, fontSize: '14px' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: theme.text }}>{u.full_name}</td>
                    <td style={{ padding: '16px 24px', color: theme.textMuted }}>{u.username}</td>
                    <td style={{ padding: '16px 24px', textTransform: 'capitalize', fontWeight: 'bold', color: u.role === 'admin' ? theme.danger : theme.secondary }}>
                      {u.role}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ 
                        background: u.is_approved ? '#dcfce7' : '#fef2f2', 
                        color: u.is_approved ? '#16a34a' : '#dc2626', 
                        padding: '6px 10px', 
                        borderRadius: '4px', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        border: `1px solid ${u.is_approved ? '#bbf7d0' : '#fecaca'}`
                      }}>
                        {u.is_approved ? 'Active (ใช้งานได้)' : 'Pending (รออนุมัติ)'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        
                        {/* ปุ่ม อนุมัติ (จะโชว์เฉพาะคนที่ยังไม่อนุมัติ) */}
                        {!u.is_approved && (
                          <button onClick={() => handleApproveUser(u.id, u.full_name)} style={{ padding: '8px 16px', background: theme.success, color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            Approve (อนุมัติ)
                          </button>
                        )}

                        {/* ปุ่ม ลบ (ห้ามลบตัวเอง) */}
                        {currentUser.id !== u.id && (
                          <button onClick={() => handleDeleteUser(u.id, u.full_name)} style={{ padding: '8px 16px', background: 'transparent', color: theme.danger, border: `1px solid ${theme.danger}`, borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                            Delete (ลบ)
                          </button>
                        )}
                        
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}