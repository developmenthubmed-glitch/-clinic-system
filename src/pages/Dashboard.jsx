import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

// ==========================================
// 🎨 DESIGN SYSTEM & THEME
// ==========================================
const theme = {
  primary: '#112e51',
  secondary: '#005ea2',
  accent: '#00a6d2',
  surface: '#ffffff',
  bg: '#f0f0f0',
  text: '#1b1b1b',
  textMuted: '#565c65',
  border: '#dfe1e2',
  danger: '#d83933',
  success: '#2e8540',
  status: {
    'Pending': { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    'Confirmed': { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
    'Completed': { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    'Cancelled': { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    'Rescheduled': { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
    'Missed': { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' },
  }
};

const Badge = ({ status }) => {
  const style = theme.status[status] || theme.status['Pending'];
  return (
    <span style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
      {status}
    </span>
  );
};

export default function Dashboard({ currentUser }) {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // คำนวณวันที่ปัจจุบัน (ชดเชย Timezone ให้ตรงกับเครื่อง)
  const offset = new Date().getTimezoneOffset();
  const todayStr = new Date(new Date().getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    const [resAppt, resPt] = await Promise.all([
      supabase.from('appointments').select('*'),
      supabase.from('patients').select('*')
    ]);
    if (resAppt.data) setAppointments(resAppt.data);
    if (resPt.data) setPatients(resPt.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ฟังก์ชันบันทึก Activity Log ควบคู่ไปกับการเปลี่ยนสถานะ
  const updateAppointmentStatus = async (id, hn, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this appointment as ${newStatus}?`)) return;

    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
    
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(`Appointment status changed to ${newStatus}`);
      // บันทึก Log ทันที
      await supabase.from('audit_logs').insert([{ 
        user_name: currentUser.full_name, 
        action: 'Change Status', 
        detail: `Changed appointment status for HN: ${hn} to ${newStatus}` 
      }]);
      fetchData(); // โหลดข้อมูลใหม่มาแสดง
    }
  };

  // คัดกรองเฉพาะคิวของวันนี้
  const todayAppointments = appointments.filter(a => a.appointment_date === todayStr);

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: toast.type === 'error' ? theme.danger : theme.success, color: 'white', padding: '16px 24px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, fontWeight: 'bold' }}>
          {toast.type === 'error' ? '⚠️' : '✅'} {toast.message}
        </div>
      )}

      {/* Header Section */}
      <div style={{ marginBottom: '32px', borderBottom: `2px solid ${theme.border}`, paddingBottom: '20px' }}>
        <h1 style={{ fontSize: '32px', margin: '0 0 8px 0', color: theme.primary }}>
          {getGreeting()}, {currentUser.full_name}
        </h1>
        <p style={{ margin: 0, color: theme.textMuted, fontSize: '16px', fontWeight: '500' }}>
          Here is your clinic overview for {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {[
          { label: "Today's Appointments", count: todayAppointments.length, color: theme.primary, bg: '#ffffff' },
          { label: "Pending Confirmation", count: todayAppointments.filter(a => a.status === 'Pending').length, color: '#d97706', bg: '#fffbeb' },
          { label: "Completed Today", count: todayAppointments.filter(a => a.status === 'Completed').length, color: theme.success, bg: '#f0fdf4' },
          { label: "Cancelled Today", count: todayAppointments.filter(a => a.status === 'Cancelled').length, color: theme.danger, bg: '#fef2f2' }
        ].map((card, i) => (
          <div key={i} style={{ background: card.bg, padding: '24px', borderRadius: '4px', border: `1px solid ${theme.border}`, borderTop: `4px solid ${card.color}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMuted }}>{card.label}</div>
            <div style={{ fontSize: '40px', fontWeight: 'bold', color: card.color, margin: '10px 0 0 0' }}>{loading ? '-' : card.count}</div>
          </div>
        ))}
      </div>

      {/* Today's Schedule Table */}
      <div style={{ background: theme.surface, borderRadius: '4px', border: `1px solid ${theme.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '20px 24px', borderBottom: `2px solid ${theme.primary}` }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: theme.primary }}>Today's Schedule</h2>
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: theme.bg, fontSize: '14px', color: theme.primary }}>
            <tr>
              <th style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}` }}>HN</th>
              <th style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}` }}>Patient Name</th>
              <th style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}` }}>Appointment Type</th>
              <th style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}` }}>Status</th>
              <th style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right' }}>Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted, fontWeight: 'bold' }}>Loading schedule...</td></tr>
            ) : todayAppointments.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted, fontWeight: 'bold' }}>No appointments scheduled for today.</td></tr>
            ) : (
              todayAppointments.map((appt, idx) => {
                const pt = patients.find(p => p.hn === appt.patient_hn);
                return (
                  <tr key={appt.id} style={{ borderBottom: `1px solid ${theme.border}`, background: idx % 2 === 0 ? '#ffffff' : '#f9f9f9', transition: '0.2s' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 'bold', color: theme.text }}>{appt.patient_hn}</td>
                    <td style={{ padding: '16px 24px', color: theme.text }}>{pt ? `${pt.title} ${pt.first_name} ${pt.last_name}` : 'Unknown Patient'}</td>
                    <td style={{ padding: '16px 24px', color: theme.textMuted }}>{appt.appointment_type || 'General'}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <Badge status={appt.status || 'Pending'} />
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {(appt.status === 'Pending' || !appt.status) && (
                          <button onClick={() => updateAppointmentStatus(appt.id, appt.patient_hn, 'Confirmed')} style={{ padding: '8px 12px', background: '#005ea2', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Confirm</button>
                        )}
                        {(appt.status === 'Confirmed' || appt.status === 'Pending') && (
                          <button onClick={() => updateAppointmentStatus(appt.id, appt.patient_hn, 'Completed')} style={{ padding: '8px 12px', background: theme.success, color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Complete</button>
                        )}
                        {(appt.status !== 'Completed' && appt.status !== 'Cancelled') && (
                          <button onClick={() => updateAppointmentStatus(appt.id, appt.patient_hn, 'Cancelled')} style={{ padding: '8px 12px', background: 'white', color: theme.danger, border: `1px solid ${theme.danger}`, borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}