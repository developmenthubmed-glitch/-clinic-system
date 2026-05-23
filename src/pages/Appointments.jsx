import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

// ==========================================
// 🎨 DESIGN SYSTEM & THEME
// ==========================================
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

export default function Appointments({ currentUser }) {
  const [view, setView] = useState('list'); // 'list' | 'add'
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // --- Data State ---
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [schedules, setSchedules] = useState([]);

  // --- Search & Filters (List View) ---
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // --- Booking Form State ---
  const [bookingSearch, setBookingSearch] = useState('');
  const [suggestedPatients, setSuggestedPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  const [form, setForm] = useState({ appointment_date: '', appointment_type: 'Hematology Follow-up', note: '' });
  const [availableDates, setAvailableDates] = useState([]);

  // --- Reschedule State ---
  const [rescheduleId, setRescheduleId] = useState(null);
  const [newDate, setNewDate] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const logActivity = async (action, detail) => {
    await supabase.from('audit_logs').insert([{ user_name: currentUser.full_name, action, detail }]);
  };

  const fetchData = async () => {
    setLoading(true);
    const [resAppt, resPt, resSched] = await Promise.all([
      supabase.from('appointments').select('*').order('appointment_date', { ascending: true }),
      supabase.from('patients').select('*'),
      supabase.from('clinic_schedules').select('*')
    ]);
    if (resAppt.data) setAppointments(resAppt.data);
    if (resPt.data) setPatients(resPt.data);
    if (resSched.data) setSchedules(resSched.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ==========================================
  // BOOKING LOGIC
  // ==========================================
  const handleSearchPatient = (val) => {
    setBookingSearch(val);
    if (val.length > 0) {
      const matches = patients.filter(p => p.hn.includes(val) || p.first_name.includes(val) || p.last_name.includes(val));
      setSuggestedPatients(matches);
    } else {
      setSuggestedPatients([]);
    }
  };

  const selectPatient = (pt) => {
    setSelectedPatient(pt);
    setBookingSearch(`${pt.hn} - ${pt.first_name} ${pt.last_name}`);
    setSuggestedPatients([]);
    
    // คำนวณหาวันที่ว่างสำหรับโปรโตคอลของผู้ป่วยคนนี้
    const offset = new Date().getTimezoneOffset();
    const todayStr = new Date(new Date().getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    
    const dates = schedules.filter(s => {
      if (s.disease_name !== pt.disease_name) return false;
      if (s.schedule_date < todayStr) return false; // ไม่เอาวันในอดีต
      
      const currentBooked = appointments.filter(a => a.appointment_date === s.schedule_date && patients.find(p => p.hn === a.patient_hn)?.disease_name === pt.disease_name).length;
      return currentBooked < s.quota;
    }).map(s => s.schedule_date).sort();
    
    setAvailableDates(dates);
    setForm({ ...form, appointment_date: '' });
  };

  const handleSaveBooking = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return showToast('Please select a patient first.', 'error');
    if (!form.appointment_date) return showToast('Please select an available date.', 'error');

    setLoading(true);
    const { error } = await supabase.from('appointments').insert([{
      patient_hn: selectedPatient.hn,
      appointment_date: form.appointment_date,
      appointment_type: form.appointment_type,
      status: 'Confirmed', // นัดใหม่ให้ Confirmed เลย
      doctor_name: currentUser.full_name,
      created_by: currentUser.full_name,
      note: form.note
    }]);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Appointment booked successfully!');
      logActivity('Book Appointment', `Booked ${form.appointment_type} for HN: ${selectedPatient.hn} on ${form.appointment_date}`);
      setView('list');
      setSelectedPatient(null);
      setBookingSearch('');
      setForm({ appointment_date: '', appointment_type: 'Hematology Follow-up', note: '' });
      fetchData();
    }
    setLoading(false);
  };

  // ==========================================
  // ACTION LOGIC (STATUS & RESCHEDULE)
  // ==========================================
  const changeStatus = async (id, hn, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this as ${newStatus}?`)) return;
    const { error } = await supabase.from('appointments').update({ status: newStatus, updated_by: currentUser.full_name }).eq('id', id);
    if (error) showToast(error.message, 'error');
    else {
      showToast(`Status updated to ${newStatus}`);
      logActivity('Update Status', `Changed appointment ID ${id} (HN: ${hn}) to ${newStatus}`);
      fetchData();
    }
  };

  const handleReschedule = async (apptId, hn) => {
    if (!newDate) return showToast('Please select a new date', 'error');
    const { error } = await supabase.from('appointments').update({ 
      appointment_date: newDate, 
      status: 'Rescheduled',
      updated_by: currentUser.full_name 
    }).eq('id', apptId);

    if (error) showToast(error.message, 'error');
    else {
      showToast('Appointment rescheduled successfully');
      logActivity('Reschedule', `Rescheduled Appt ID ${apptId} (HN: ${hn}) to ${newDate}`);
      setRescheduleId(null);
      setNewDate('');
      fetchData();
    }
  };

  // Filter List
  const displayedAppointments = appointments.filter(a => {
    const pt = patients.find(p => p.hn === a.patient_hn);
    const ptName = pt ? `${pt.first_name} ${pt.last_name}` : '';
    const matchSearch = a.patient_hn.includes(search) || ptName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: toast.type === 'error' ? theme.danger : theme.success, color: 'white', padding: '16px 24px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, fontWeight: 'bold' }}>
          {toast.type === 'error' ? '⚠️' : '✅'} {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: `2px solid ${theme.border}`, paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', color: theme.primary }}>Appointment Management</h1>
          <p style={{ margin: 0, color: theme.textMuted }}>Book, reschedule, and manage patient appointments.</p>
        </div>
        {view === 'list' && (
          <button onClick={() => setView('add')} style={{ padding: '10px 20px', background: theme.secondary, color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
            + Book Appointment
          </button>
        )}
      </div>

      {view === 'add' ? (
        // ==========================================
        // ➕ BOOK APPOINTMENT FORM
        // ==========================================
        <div style={{ background: theme.surface, padding: '32px', borderRadius: '4px', border: `1px solid ${theme.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', maxWidth: '800px' }}>
          <h2 style={{ marginTop: 0, color: theme.primary, marginBottom: '24px', fontSize: '20px' }}>Create New Appointment</h2>
          
          <form onSubmit={handleSaveBooking}>
            {/* Step 1: Search Patient */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>1. Find Patient (by HN or Name) <span style={{color: theme.danger}}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  value={bookingSearch} 
                  onChange={(e) => handleSearchPatient(e.target.value)} 
                  placeholder="Type to search..." 
                  style={{ width: '100%', padding: '12px', border: `1px solid ${theme.border}`, borderRadius: '4px', boxSizing: 'border-box' }} 
                />
                {suggestedPatients.length > 0 && (
                  <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: `1px solid ${theme.border}`, borderRadius: '4px', padding: 0, margin: '4px 0 0 0', listStyle: 'none', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {suggestedPatients.map(pt => (
                      <li key={pt.hn} onClick={() => selectPatient(pt)} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${theme.bg}` }}>
                        <div style={{ fontWeight: 'bold', color: theme.primary }}>{pt.title} {pt.first_name} {pt.last_name}</div>
                        <div style={{ fontSize: '12px', color: theme.textMuted }}>HN: {pt.hn} | Protocol: {pt.disease_name}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {selectedPatient && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '4px', marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', color: theme.success, fontWeight: 'bold', marginBottom: '4px' }}>✓ Selected Patient</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{selectedPatient.title} {selectedPatient.first_name} {selectedPatient.last_name}</div>
                <div style={{ fontSize: '13px', color: theme.textMuted }}>HN: {selectedPatient.hn} | Target Clinic: {selectedPatient.disease_name}</div>
              </div>
            )}

            {/* Step 2: Appointment Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>2. Available Date <span style={{color: theme.danger}}>*</span></label>
                <select 
                  required 
                  value={form.appointment_date} 
                  onChange={e=>setForm({...form, appointment_date: e.target.value})} 
                  disabled={!selectedPatient || availableDates.length === 0}
                  style={{ width: '100%', padding: '12px', border: `1px solid ${theme.border}`, borderRadius: '4px', boxSizing: 'border-box', background: (!selectedPatient || availableDates.length === 0) ? theme.bg : 'white' }}
                >
                  <option value="" disabled>{!selectedPatient ? '-- Select patient first --' : (availableDates.length === 0 ? '-- No available quotas --' : '-- Select Date --')}</option>
                  {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>3. Appointment Type <span style={{color: theme.danger}}>*</span></label>
                <select required value={form.appointment_type} onChange={e=>setForm({...form, appointment_type: e.target.value})} style={{ width: '100%', padding: '12px', border: `1px solid ${theme.border}`, borderRadius: '4px', boxSizing: 'border-box' }}>
                  <option>Hematology Follow-up</option>
                  <option>Blood Test</option>
                  <option>Blood Transfusion</option>
                  <option>Chemotherapy</option>
                  <option>Lab Result Review</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Additional Note</label>
              <input type="text" value={form.note} onChange={e=>setForm({...form, note: e.target.value})} placeholder="e.g. Needs fasting before test" style={{ width: '100%', padding: '12px', border: `1px solid ${theme.border}`, borderRadius: '4px', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '32px', paddingTop: '20px', borderTop: `1px solid ${theme.border}` }}>
              <button type="submit" disabled={loading || !selectedPatient} style={{ padding: '12px 24px', background: theme.primary, color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: (loading || !selectedPatient) ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Booking...' : 'Confirm Appointment'}
              </button>
              <button type="button" onClick={() => {setView('list'); setSelectedPatient(null); setBookingSearch('');}} style={{ padding: '12px 24px', background: theme.bg, color: theme.text, border: `1px solid ${theme.textMuted}`, borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        // ==========================================
        // 📋 APPOINTMENTS LIST VIEW
        // ==========================================
        <div style={{ background: theme.surface, borderRadius: '4px', border: `1px solid ${theme.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          
          {/* Filters */}
          <div style={{ padding: '20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', gap: '16px', background: '#f9f9f9' }}>
            <input type="text" placeholder="Search by HN or Patient Name..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '14px' }} />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '200px', padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '14px' }}>
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option><option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option><option value="Rescheduled">Rescheduled</option>
              <option value="Cancelled">Cancelled</option><option value="Missed">Missed</option>
            </select>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: theme.bg, fontSize: '13px', color: theme.primary }}>
              <tr>
                <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>Date</th>
                <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>Patient</th>
                <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>Type / Note</th>
                <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>Staff</th>
                <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>Status</th>
                <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}`, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>Loading appointments...</td></tr>
              ) : displayedAppointments.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>No appointments found.</td></tr>
              ) : (
                displayedAppointments.map((appt, idx) => {
                  const pt = patients.find(p => p.hn === appt.patient_hn);
                  const isRescheduling = rescheduleId === appt.id;

                  // ดึงวันว่างมาทำ Dropdown ให้ตอนเลื่อนนัด
                  const availForPt = pt ? schedules.filter(s => s.disease_name === pt.disease_name && s.schedule_date >= new Date().toISOString().split('T')[0] && appointments.filter(a => a.appointment_date === s.schedule_date && patients.find(p => p.hn === a.patient_hn)?.disease_name === pt.disease_name).length < s.quota).map(s => s.schedule_date).sort() : [];

                  return (
                    <tr key={appt.id} style={{ borderBottom: `1px solid ${theme.border}`, background: idx % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{appt.appointment_date}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 'bold', color: theme.primary }}>{pt ? `${pt.first_name} ${pt.last_name}` : 'Unknown'}</div>
                        <div style={{ fontSize: '12px', color: theme.textMuted }}>HN: {appt.patient_hn}</div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div>{appt.appointment_type}</div>
                        {appt.note && <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '4px' }}>📝 {appt.note}</div>}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '13px' }}>{appt.created_by}</td>
                      <td style={{ padding: '16px 20px' }}><Badge status={appt.status} /></td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        
                        {isRescheduling ? (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <select value={newDate} onChange={e=>setNewDate(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: `1px solid ${theme.border}` }}>
                              <option value="" disabled>Select Date</option>
                              {availForPt.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <button onClick={() => handleReschedule(appt.id, appt.patient_hn)} style={{ padding: '6px 10px', background: theme.secondary, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Save</button>
                            <button onClick={() => setRescheduleId(null)} style={{ padding: '6px 10px', background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap', maxWidth: '200px', marginLeft: 'auto' }}>
                            {(appt.status !== 'Completed' && appt.status !== 'Cancelled') && (
                              <button onClick={() => {setRescheduleId(appt.id); setNewDate('');}} style={{ padding: '6px 10px', background: '#fff', color: theme.secondary, border: `1px solid ${theme.secondary}`, borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Reschedule</button>
                            )}
                            {(appt.status === 'Pending' || appt.status === 'Rescheduled') && (
                              <button onClick={() => changeStatus(appt.id, appt.patient_hn, 'Confirmed')} style={{ padding: '6px 10px', background: theme.secondary, color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Confirm</button>
                            )}
                            {(appt.status === 'Confirmed') && (
                              <button onClick={() => changeStatus(appt.id, appt.patient_hn, 'Completed')} style={{ padding: '6px 10px', background: theme.success, color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Complete</button>
                            )}
                            {(appt.status !== 'Completed' && appt.status !== 'Cancelled') && (
                              <button onClick={() => changeStatus(appt.id, appt.patient_hn, 'Cancelled')} style={{ padding: '6px 10px', background: theme.danger, color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                            )}
                            {(appt.status === 'Confirmed' && appt.appointment_date < new Date().toISOString().split('T')[0]) && (
                              <button onClick={() => changeStatus(appt.id, appt.patient_hn, 'Missed')} style={{ padding: '6px 10px', background: '#4b5563', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Missed</button>
                            )}
                          </div>
                        )}

                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          <div style={{ padding: '12px 20px', background: '#f9f9f9', fontSize: '12px', color: theme.textMuted, borderTop: `1px solid ${theme.border}` }}>
            Total {displayedAppointments.length} appointments found
          </div>
        </div>
      )}
    </div>
  );
}