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

  const monthNames = ["January (มกราคม)", "February (กุมภาพันธ์)", "March (มีนาคม)", "April (เมษายน)", "May (พฤษภาคม)", "June (มิถุนายน)", "July (กรกฎาคม)", "August (สิงหาคม)", "September (กันยายน)", "October (ตุลาคม)", "November (พฤศจิกายน)", "December (ธันวาคม)"];
  const todayStr = formatDate(new Date());

  const apptsOnSelectedDate = appointments.filter(a => a.appointment_date === selectedDate);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', borderBottom: `3px solid ${theme.secondary}`, paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 8px 0', color: theme.primary, letterSpacing: '-0.5px' }}>
            Clinic Calendar <span style={{fontSize: '18px', color: theme.textMuted, fontWeight: 'normal', marginLeft: '10px'}}>(ปฏิทินตาราง)</span>
          </h1>
          <p style={{ margin: 0, color: theme.textMuted, fontSize: '14px' }}>Monthly overview of clinic schedules and patient quotas. (ภาพรวมตารางคลินิกและโควตา)</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: theme.text }}>Filter (กรองคลินิก):</label>
          <select value={filterProtocol} onChange={e => setFilterProtocol(e.target.value)} style={{ padding: '8px 12px', border: `1px solid ${theme.secondary}`, borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>
            <option value="all">-- All Clinics (ทั้งหมด) --</option>
            {protocols.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background: theme.surface, borderRadius: '8px', border: `1px solid ${theme.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Calendar Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f9f9f9', borderBottom: `1px solid ${theme.border}` }}>
          <button onClick={prevMonth} style={{ padding: '6px 12px', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: theme.primary, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>◀ Prev</button>
          <div style={{ fontWeight: '900', fontSize: '20px', color: theme.primary }}>{monthNames[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}</div>
          <button onClick={nextMonth} style={{ padding: '6px 12px', background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: theme.primary, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>Next ▶</button>
        </div>

        {/* Days of week (บังคับไม่ให้ขยายเกิน 1fr ด้วย minmax(0, 1fr)) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', textAlign: 'center', background: theme.primary, color: 'white', fontWeight: 'bold', fontSize: '13px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} style={{ padding: '10px 0' }}>{d}</div>)}
        </div>

        {/* Grid Container (บังคับไม่ให้ขยายเกิน 1fr เช่นกัน) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridAutoRows: 'minmax(120px, auto)' }}>
          {generateCalendarDays().map((dateStr, i) => {
            if (!dateStr) return <div key={i} style={{ borderBottom: `1px solid ${theme.border}`, borderRight: `1px solid ${theme.border}`, background: theme.bg }}></div>;
            
            const dayNum = dateStr.split('-')[2];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            
            const daySchedules = schedules.filter(s => s.schedule_date === dateStr && (filterProtocol === 'all' || s.disease_name === filterProtocol));
            
            return (
              <div 
                key={i} 
                onClick={() => setSelectedDate(dateStr)}
                style={{ 
                  display: 'flex', flexDirection: 'column', 
                  borderBottom: `1px solid ${theme.border}`, 
                  borderRight: `1px solid ${theme.border}`, 
                  minHeight: '120px', 
                  minWidth: 0, /* หัวใจสำคัญ: ป้องกันตารางดันทะลุขวา */
                  padding: '6px', 
                  background: isSelected ? '#f0f9ff' : 'white', 
                  cursor: 'pointer', 
                  boxShadow: isSelected ? `inset 0 0 0 2px ${theme.secondary}` : 'none'
                }}
              >
                {/* วันที่ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: isToday ? theme.secondary : theme.text }}>{parseInt(dayNum)}</span>
                  {isToday && <span style={{ fontSize: '9px', background: theme.secondary, color: 'white', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>TODAY</span>}
                </div>

                {/* รายการคลินิก */}
                <div style={{ 
                  marginTop: '6px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '4px' 
                }}>
                  {daySchedules.map(sched => {
                    const booked = appointments.filter(a => a.appointment_date === dateStr && patients.find(p=>p.hn===a.patient_hn)?.disease_name === sched.disease_name).length;
                    const isFull = booked >= sched.quota;
                    return (
                      <div key={sched.id} style={{ 
                        padding: '4px', borderRadius: '4px', 
                        background: isFull ? '#fef2f2' : '#f0fdf4', 
                        color: isFull ? theme.danger : theme.success, 
                        border: `1px solid ${isFull ? '#fecaca' : '#bbf7d0'}`,
                        wordBreak: 'break-word' /* บังคับให้ตัดบรรทัดใหม่แทนการดันกรอบแตก */
                      }}>
                        <div style={{ fontWeight: 'bold', fontSize: '10px', lineHeight: '1.2' }}>{sched.disease_name}</div>
                        <div style={{ marginTop: '2px', fontSize: '9px', fontWeight: 'bold' }}>{booked}/{sched.quota} Booked</div>
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
        <div style={{ marginTop: '32px', background: theme.surface, borderRadius: '8px', border: `1px solid ${theme.border}`, padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px 0', color: theme.primary, fontSize: '18px', fontWeight: '800' }}>Appointments on {selectedDate} (รายชื่อผู้ป่วยนัดหมาย)</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: theme.bg, fontSize: '13px', color: theme.primary }}>
              <tr><th style={{padding:'12px'}}>HN</th><th style={{padding:'12px'}}>Patient Name (ชื่อ-นามสกุล)</th><th style={{padding:'12px'}}>Clinic (คลินิก)</th><th style={{padding:'12px'}}>Status (สถานะ)</th></tr>
            </thead>
            <tbody>
              {apptsOnSelectedDate.length === 0 ? <tr><td colSpan="4" style={{padding:'30px', textAlign:'center', color:theme.textMuted}}>No appointments. (ไม่มีการนัดหมาย)</td></tr> : 
                apptsOnSelectedDate.map((a, idx) => {
                  const pt = patients.find(p => p.hn === a.patient_hn);
                  return (
                    <tr key={a.id} style={{ borderBottom: `1px solid ${theme.border}`, fontSize: '14px', background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                      <td style={{padding:'12px', fontWeight:'bold'}}>{a.patient_hn}</td>
                      <td style={{padding:'12px'}}>{pt ? `${pt.title} ${pt.first_name} ${pt.last_name}` : 'Unknown'}</td>
                      <td style={{padding:'12px'}}><span style={{background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px'}}>{pt?.disease_name || '-'}</span></td>
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