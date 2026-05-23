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

const Badge = ({ status }) => {
  const styles = {
    'Pending': { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    'Confirmed': { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
    'Completed': { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    'Cancelled': { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    'Rescheduled': { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
    'Missed': { bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' },
  };
  const style = styles[status] || styles['Pending'];
  return <span style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{status}</span>;
};

export default function CalendarView() {
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterProtocol, setFilterProtocol] = useState('all');
  
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [resAppt, resPt, resSched] = await Promise.all([
        supabase.from('appointments').select('*'),
        supabase.from('patients').select('*'),
        supabase.from('clinic_schedules').select('*')
      ]);
      if (resAppt.data) setAppointments(resAppt.data);
      if (resPt.data) setPatients(resPt.data);
      if (resSched.data) {
        setSchedules(resSched.data);
        setProtocols([...new Set(resSched.data.map(s => s.disease_name))]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

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

  const prevMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const todayStr = formatDate(new Date());

  const apptsOnSelectedDate = appointments.filter(a => a.appointment_date === selectedDate);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', borderBottom: `2px solid ${theme.border}`, paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', color: theme.primary }}>Clinic Calendar</h1>
          <p style={{ margin: 0, color: theme.textMuted }}>Monthly overview of clinic schedules and patient quotas.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: theme.text }}>Filter by Clinic:</label>
          <select value={filterProtocol} onChange={e => setFilterProtocol(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '14px' }}>
            <option value="all">-- All Clinics --</option>
            {protocols.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background: theme.surface, borderRadius: '4px', border: `1px solid ${theme.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Calendar Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', background: '#f9f9f9', borderBottom: `1px solid ${theme.border}` }}>
          <button onClick={prevMonth} style={{ padding: '8px 16px', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: theme.primary }}>◀ Prev</button>
          <div style={{ fontWeight: 'bold', fontSize: '20px', color: theme.primary }}>{monthNames[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}</div>
          <button onClick={nextMonth} style={{ padding: '8px 16px', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: theme.primary }}>Next ▶</button>
        </div>

        {/* Days of week */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', background: theme.primary, color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} style={{ padding: '12px 0' }}>{d}</div>)}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {generateCalendarDays().map((dateStr, i) => {
            if (!dateStr) return <div key={i} style={{ borderBottom: `1px solid ${theme.border}`, borderRight: `1px solid ${theme.border}`, minHeight: '120px', background: theme.bg }}></div>;
            
            const dayNum = dateStr.split('-')[2];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            
            // หาข้อมูลคลินิกและคิวในวันนี้
            const daySchedules = schedules.filter(s => s.schedule_date === dateStr && (filterProtocol === 'all' || s.disease_name === filterProtocol));
            
            return (
              <div 
                key={i} 
                onClick={() => setSelectedDate(dateStr)}
                style={{ borderBottom: `1px solid ${theme.border}`, borderRight: `1px solid ${theme.border}`, minHeight: '120px', padding: '10px', background: isSelected ? '#f0f9ff' : 'white', cursor: 'pointer', border: isSelected ? `2px solid ${theme.secondary}` : 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: isToday ? theme.secondary : theme.text }}>{parseInt(dayNum)}</span>
                  {isToday && <span style={{ fontSize: '10px', background: theme.secondary, color: 'white', padding: '2px 6px', borderRadius: '4px' }}>TODAY</span>}
                </div>

                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {daySchedules.map(sched => {
                    const booked = appointments.filter(a => a.appointment_date === dateStr && patients.find(p=>p.hn===a.patient_hn)?.disease_name === sched.disease_name).length;
                    const isFull = booked >= sched.quota;
                    return (
                      <div key={sched.id} style={{ fontSize: '11px', padding: '4px 6px', borderRadius: '4px', background: isFull ? '#fef2f2' : '#f0fdf4', color: isFull ? theme.danger : theme.success, border: `1px solid ${isFull ? '#fecaca' : '#bbf7d0'}` }}>
                        <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sched.disease_name}</div>
                        <div>{booked} / {sched.quota} Booked</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div style={{ marginTop: '30px', background: theme.surface, borderRadius: '4px', border: `1px solid ${theme.border}`, padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: theme.primary }}>Appointments on {selectedDate}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: theme.bg, fontSize: '13px', color: theme.primary }}>
              <tr><th style={{padding:'12px'}}>HN</th><th style={{padding:'12px'}}>Patient Name</th><th style={{padding:'12px'}}>Clinic</th><th style={{padding:'12px'}}>Status</th></tr>
            </thead>
            <tbody>
              {apptsOnSelectedDate.length === 0 ? <tr><td colSpan="4" style={{padding:'20px', textAlign:'center', color:theme.textMuted}}>No appointments.</td></tr> : 
                apptsOnSelectedDate.map(a => {
                  const pt = patients.find(p => p.hn === a.patient_hn);
                  return (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${theme.border}`, fontSize: '14px' }}>
                      <td style={{padding:'12px', fontWeight:'bold'}}>{a.patient_hn}</td>
                      <td style={{padding:'12px'}}>{pt ? `${pt.first_name} ${pt.last_name}` : 'Unknown'}</td>
                      <td style={{padding:'12px'}}>{pt?.disease_name || '-'}</td>
                      <td style={{padding:'12px'}}><Badge status={a.status} /></td>
                    </tr>
                  );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}