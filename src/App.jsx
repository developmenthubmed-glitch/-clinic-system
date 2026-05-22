import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('staff')

  const [pendingUsers, setPendingUsers] = useState([])
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [schedules, setSchedules] = useState([])
  
  const [patientHN, setPatientHN] = useState('')
  const [patientName, setPatientName] = useState('')
  const [patientDisease, setPatientDisease] = useState('')
  const [selectedDate, setSelectedDate] = useState(null)
  
  // ตัวแปรสำหรับระบบเลื่อนนัด
  const [editingAppt, setEditingAppt] = useState(null)
  const [newApptDate, setNewApptDate] = useState('')

  const [bookingSearch, setBookingSearch] = useState('')
  const [suggestedPatients, setSuggestedPatients] = useState([])

  const [filterDisease, setFilterDisease] = useState('all')
  const [searchPatientText, setSearchPatientText] = useState('')
  const [editingPatient, setEditingPatient] = useState(null)
  const [editPtName, setEditPtName] = useState('')
  const [editPtDisease, setEditPtDisease] = useState('')

  const [scheduleDisease, setScheduleDisease] = useState('')
  const [selectedScheduleDates, setSelectedScheduleDates] = useState([])
  const [quotas, setQuotas] = useState({})
  const [bulkQuota, setBulkQuota] = useState('')

  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date())

  const formatDate = (date) => {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'สวัสดีตอนเช้า';
    if (hour < 18) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  }

  useEffect(() => {
    if (currentUser) {
      fetchPatients()
      fetchAppointments()
      fetchSchedules()
      if (currentUser.role === 'admin') fetchPendingUsers()
    }
  }, [currentUser])

  // --- Authentication ---
  const handleLogin = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase.from('staff_users').select('*').eq('username', username).eq('password', password).single()
    if (error || !data) return alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
    if (!data.is_approved) return alert('บัญชีอยู่ระหว่างการตรวจสอบอนุมัติโดยผู้ดูแลระบบ')
    setCurrentUser(data)
    setUsername(''); setPassword('')
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    const { data: exist } = await supabase.from('staff_users').select('id').eq('username', username)
    if (exist && exist.length > 0) return alert('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว')
    const { error } = await supabase.from('staff_users').insert([{ username, password, full_name: fullName, role, is_approved: false }])
    if (error) alert('เกิดข้อผิดพลาด: ' + error.message)
    else { alert('ลงทะเบียนสำเร็จ โปรดรอการอนุมัติ'); setAuthMode('login'); setUsername(''); setPassword(''); setFullName('') }
  }

  const handleLogout = () => { setCurrentUser(null); setActiveMenu('dashboard') }

  // --- Data Fetching ---
  async function fetchPatients() { const { data } = await supabase.from('patients').select('*'); if (data) setPatients(data) }
  async function fetchAppointments() { const { data } = await supabase.from('appointments').select('*'); if (data) setAppointments(data) }
  async function fetchSchedules() { const { data } = await supabase.from('clinic_schedules').select('*'); if (data) setSchedules(data) }
  async function fetchPendingUsers() { const { data } = await supabase.from('staff_users').select('*').eq('is_approved', false); if (data) setPendingUsers(data) }

  // --- Admin: จัดการสิทธิ์ ---
  const approveUser = async (id) => { await supabase.from('staff_users').update({ is_approved: true }).eq('id', id); fetchPendingUsers() }
  const rejectUser = async (id) => { await supabase.from('staff_users').delete().eq('id', id); fetchPendingUsers() }
  
  // --- Admin: จัดการตารางออกตรวจ ---
  const applyBulkQuota = () => {
    if (!bulkQuota) return;
    const newQuotas = { ...quotas };
    selectedScheduleDates.forEach(date => { newQuotas[date] = parseInt(bulkQuota); });
    setQuotas(newQuotas);
  }

  const handleSaveSchedules = async () => {
    if (!scheduleDisease) return alert('กรุณาระบุชื่อโปรโตคอล/คลินิก');
    if (selectedScheduleDates.length === 0) return alert('กรุณาเลือกวันที่ต้องการเปิดรับคิวบนปฏิทิน');

    const payload = selectedScheduleDates.map(date => ({
      disease_name: scheduleDisease,
      schedule_date: date,
      quota: parseInt(quotas[date]) || 0
    }));

    for (let date of selectedScheduleDates) {
      await supabase.from('clinic_schedules').delete().match({ disease_name: scheduleDisease, schedule_date: date });
    }

    const { error } = await supabase.from('clinic_schedules').insert(payload);
    if (error) alert('ข้อผิดพลาด: ' + error.message);
    else {
      alert('บันทึกตารางออกตรวจสำเร็จ');
      setScheduleDisease(''); setSelectedScheduleDates([]); setQuotas({}); setBulkQuota('');
      fetchSchedules();
    }
  }

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('ยืนยันการลบรอบตรวจนี้?')) return;
    await supabase.from('clinic_schedules').delete().eq('id', id);
    fetchSchedules();
  }

  // --- Staff: ฐานข้อมูลผู้ป่วย ---
  const handleAddNewPatientOnly = async (e) => {
    e.preventDefault()
    if (!patientDisease) return alert('กรุณาเลือกโปรโตคอลโรค');
    const { error } = await supabase.from('patients').insert([{ hn: patientHN, full_name: patientName, disease_name: patientDisease }])
    if (error) { alert('ไม่สามารถเพิ่มผู้ป่วยได้: ' + error.message) } 
    else { alert('บันทึกข้อมูลผู้ป่วยใหม่สำเร็จ'); setPatientHN(''); setPatientName(''); setPatientDisease(''); fetchPatients() }
  }

  const handleDeletePatient = async (hn) => {
    if (!window.confirm(`ยืนยันการลบผู้ป่วยรหัส ${hn} และคิวนัดทั้งหมด?`)) return;
    await supabase.from('appointments').delete().eq('patient_hn', hn)
    await supabase.from('patients').delete().eq('hn', hn)
    fetchPatients(); fetchAppointments()
  }

  const handleUpdatePatient = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('patients').update({ full_name: editPtName, disease_name: editPtDisease }).eq('hn', editingPatient)
    if (error) alert('แก้ไขล้มเหลว: ' + error.message)
    else { alert('อัปเดตข้อมูลสำเร็จ'); setEditingPatient(null); fetchPatients() }
  }

  // --- Staff: ระบบจองคิวผู้ป่วย ---
  const handleSearchPatientForBooking = (val) => {
    setBookingSearch(val)
    if (val.length > 0) {
      const matches = patients.filter(p => p.full_name.includes(val) || p.hn.includes(val))
      setSuggestedPatients(matches)
    } else setSuggestedPatients([])
  }

  const selectPatientForBooking = (pt) => {
    setPatientHN(pt.hn); 
    setPatientName(pt.full_name); 
    setPatientDisease(''); 
    setBookingSearch(`${pt.hn} - ${pt.full_name}`);
    setSuggestedPatients([]);
  }

  const clearBookingForm = () => {
    setPatientHN(''); setPatientName(''); setPatientDisease(''); setBookingSearch(''); setSuggestedPatients([]); setSelectedDate(null);
  }

  const handleStaffDateClick = async (dateStr) => {
    if (!patientHN || !patientDisease) return alert('กรุณาค้นหาและเลือกผู้ป่วย และระบุโปรโตคอลก่อน');
    
    const sched = schedules.find(s => s.disease_name === patientDisease && s.schedule_date === dateStr);
    if (!sched) return alert('ไม่มีตารางออกตรวจสำหรับโปรโตคอลนี้ในวันที่เลือก');
    
    const currentCount = appointments.filter(a => a.appointment_date === dateStr && patients.find(p => p.hn === a.patient_hn)?.disease_name === patientDisease).length;
    if (currentCount >= sched.quota) return alert('คิวในวันนี้เต็มแล้ว กรุณาเลือกวันอื่น');

    if (!window.confirm(`ยืนยันนัดหมายผู้ป่วย: ${patientName}\nโปรโตคอล: ${patientDisease}\nวันที่: ${dateStr}`)) return;

    const { error } = await supabase.from('appointments').insert([{
      patient_hn: patientHN,
      step_name: 'เข้าตรวจตามโปรโตคอล',
      appointment_date: dateStr
    }]);

    if (error) alert(error.message);
    else { alert('ล็อกคิวนัดหมายสำเร็จ'); clearBookingForm(); fetchAppointments(); }
  }

  // --- ระบบคำนวณวันว่างสำหรับการ "เลื่อนนัด" ---
  const getAvailableDatesForProtocol = (protocol, currentApptDate) => {
    const todayStr = formatDate(new Date());
    return schedules.filter(s => {
        if (s.disease_name !== protocol) return false;
        if (s.schedule_date < todayStr) return false; // ให้เลื่อนไปอนาคตเท่านั้น
        
        // เช็คว่าวันนั้นคิวเต็มหรือยัง
        const currentCount = appointments.filter(a => 
            a.appointment_date === s.schedule_date && 
            patients.find(p => p.hn === a.patient_hn)?.disease_name === protocol
        ).length;
        
        // คืนค่าวันที่คิวยังไม่เต็ม หรือ เป็นวันนัดเดิม (เผื่อเปลี่ยนใจไม่เลื่อน)
        return currentCount < s.quota || s.schedule_date === currentApptDate;
    }).map(s => s.schedule_date).sort();
  };

  const saveReschedule = async (hn, step_name, old_date) => {
    if (!newApptDate) return alert('กรุณาเลือกวันนัดใหม่จากรายการ');
    if (newApptDate === old_date) {
      setEditingAppt(null); setNewApptDate(''); return; // ถ้าเลือกวันเดิมก็แค่ปิด
    }

    const { error } = await supabase.from('appointments')
      .update({ appointment_date: newApptDate })
      .match({ patient_hn: hn, step_name: step_name, appointment_date: old_date })
    
    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } else {
      alert('เลื่อนนัดหมายสำเร็จ! ระบบได้คืนโควต้าวันเดิมเรียบร้อยแล้ว');
      setEditingAppt(null); 
      setNewApptDate('');
      fetchAppointments();
    }
  }

  const generateCalendarDays = () => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) { days.push(null); }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push(formatDate(d));
    }
    return days;
  }

  const prevMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));

  // --- Statistics & Filters ---
  const todayObj = new Date();
  const nextWeekObj = new Date(); nextWeekObj.setDate(todayObj.getDate() + 7);
  const todayStr = formatDate(todayObj);
  const nextWeekStr = formatDate(nextWeekObj);

  const todayAppointments = appointments.filter(a => a.appointment_date === todayStr);
  const weeklyAppointments = appointments.filter(a => a.appointment_date >= todayStr && a.appointment_date <= nextWeekStr).sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
  
  const allProtocols = [...new Set(schedules.map(s => s.disease_name))];
  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

  // --- US Web Design System (USWDS) Inspired Styles ---
  const styles = {
    layout: { display: 'flex', minHeight: '100vh', background: '#f0f0f0', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', color: '#1b1b1b' },
    sidebar: { width: '280px', background: '#112e51', padding: '0', display: 'flex', flexDirection: 'column', color: 'white', boxShadow: '2px 0 5px rgba(0,0,0,0.1)', zIndex: 10 },
    sidebarHeader: { padding: '30px 20px', background: '#0b1f38', borderBottom: '1px solid #1f426d' },
    main: { flex: 1, padding: '40px 50px', overflowY: 'auto' },
    card: { background: '#ffffff', borderRadius: '4px', padding: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', border: '1px solid #dfe1e2', marginBottom: '30px' },
    cardHeader: { margin: '0 0 20px 0', paddingBottom: '10px', borderBottom: '2px solid #112e51', color: '#112e51', fontSize: '20px', fontWeight: 'bold' },
    input: { width: '100%', padding: '12px 16px', fontSize: '15px', borderRadius: '4px', border: '1px solid #565c65', outline: 'none', marginBottom: '20px', boxSizing: 'border-box', background: '#ffffff', color: '#1b1b1b' },
    label: { display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#1b1b1b', marginBottom: '8px' },
    btnPrimary: { padding: '12px 20px', background: '#005ea2', color: 'white', border: 'none', borderRadius: '4px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' },
    btnSecondary: { padding: '10px 16px', background: '#f0f0f0', color: '#1b1b1b', border: '1px solid #565c65', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' },
    btnDanger: { padding: '10px 16px', background: '#d83933', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' },
    menuItem: (active) => ({ padding: '16px 20px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', background: active ? '#005ea2' : 'transparent', color: 'white', borderLeft: active ? '4px solid #ffffff' : '4px solid transparent', transition: '0.2s' }),
    tableHeader: { padding: '14px 16px', background: '#f0f0f0', borderBottom: '2px solid #112e51', fontSize: '14px', fontWeight: 'bold', color: '#112e51', textAlign: 'left' },
    tableCell: { padding: '14px 16px', borderBottom: '1px solid #dfe1e2', fontSize: '14px' }
  }

  if (!currentUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#112e51', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', padding: '20px' }}>
        <div style={{ background: '#ffffff', padding: '50px 40px', borderRadius: '4px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', width: '100%', maxWidth: '450px', borderTop: '8px solid #005ea2' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ color: '#112e51', margin: '0 0 10px 0', fontSize: '24px', letterSpacing: '0.5px', lineHeight: '1.3' }}>
              Hematology Clinic Appointment<br/>Management System
            </h1>
            <p style={{ color: '#565c65', margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
              Maharat Nakhon Ratchasima Hospital
            </p>
          </div>
          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
            {authMode === 'register' && (
              <>
                <label style={styles.label}>ชื่อ-นามสกุล</label>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} style={styles.input} />
                <label style={styles.label}>ประเภทผู้ใช้งาน</label>
                <select value={role} onChange={e => setRole(e.target.value)} style={styles.input}>
                  <option value="staff">เจ้าหน้าที่ / พยาบาล</option>
                  <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                </select>
              </>
            )}
            <label style={styles.label}>ชื่อผู้ใช้งาน (Username)</label>
            <input type="text" required value={username} onChange={e => setUsername(e.target.value)} style={styles.input} />
            <label style={styles.label}>รหัสผ่าน (Password)</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={styles.input} />
            <button type="submit" style={{...styles.btnPrimary, width: '100%', marginTop: '10px'}}>
              {authMode === 'login' ? 'เข้าสู่ระบบ (Sign In)' : 'ลงทะเบียน (Register)'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <span onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setUsername(''); setPassword(''); }} style={{ color: '#005ea2', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', textDecoration: 'underline' }}>
              {authMode === 'login' ? 'สร้างบัญชีผู้ใช้งานใหม่' : 'กลับไปหน้าเข้าสู่ระบบ'}
            </span>
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #dfe1e2' }}>
            <a href="mailto:developmenthubmed@gmail.com" style={{ fontSize: '13px', color: '#005ea2', textDecoration: 'none', fontWeight: 'bold' }}>✉️ ติดต่อผู้พัฒนา (Contact Developer)</a>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#565c65' }}>© 2026 Apipon. All rights reserved.</div>
          </div>
        </div>
      </div>
    )
  }

  const displayedPatients = patients.filter(pt => {
    const matchDisease = filterDisease === 'all' || pt.disease_name === filterDisease;
    const matchSearch = pt.full_name.includes(searchPatientText) || pt.hn.includes(searchPatientText);
    return matchDisease && matchSearch;
  });

  return (
    <div style={styles.layout}>
      
      {/* --- SIDEBAR --- */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#ffffff', letterSpacing: '0.5px', lineHeight: '1.4' }}>HEMATOLOGY CLINIC</h2>
          <div style={{ fontSize: '12px', color: '#a9b2bd', marginTop: '4px', fontWeight: 'bold' }}>Maharat Nakhon Ratchasima Hospital</div>
          <div style={{ fontSize: '11px', color: '#a9b2bd', marginTop: '15px', textTransform: 'uppercase', background: '#005ea2', display: 'inline-block', padding: '2px 6px', borderRadius: '2px' }}>{currentUser.role}</div>
          <div style={{ fontSize: '13px', color: '#ffffff', marginTop: '5px', fontWeight: 'bold' }}>{currentUser.full_name}</div>
        </div>
        <nav style={{ flex: 1, paddingTop: '20px' }}>
          <div style={styles.menuItem(activeMenu === 'dashboard')} onClick={() => setActiveMenu('dashboard')}>แผงควบคุม (Dashboard)</div>
          {currentUser.role === 'staff' && (
            <>
              <div style={styles.menuItem(activeMenu === 'calendar')} onClick={() => setActiveMenu('calendar')}>ระบบนัดหมาย (Booking)</div>
              <div style={styles.menuItem(activeMenu === 'patients')} onClick={() => setActiveMenu('patients')}>ทะเบียนผู้ป่วย (Patients)</div>
            </>
          )}
          {currentUser.role === 'admin' && (
            <>
              <div style={styles.menuItem(activeMenu === 'schedules')} onClick={() => setActiveMenu('schedules')}>จัดตารางออกตรวจ (Schedules)</div>
              <div style={styles.menuItem(activeMenu === 'admin')} onClick={() => setActiveMenu('admin')}>การเข้าถึง (Access Control)</div>
            </>
          )}
        </nav>
        <div style={{ padding: '20px', borderTop: '1px solid #1f426d' }}>
          <button onClick={handleLogout} style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #a9b2bd', color: '#ffffff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>ออกจากระบบ</button>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <a href="mailto:developmenthubmed@gmail.com" style={{ fontSize: '12px', color: '#60a5fa', textDecoration: 'none', fontWeight: 'bold' }}>✉️ ติดต่อผู้พัฒนา</a>
          </div>
          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: '#718294' }}>
            © 2026 Apipon.<br/>All rights reserved.
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div style={styles.main}>
        
        {/* --- DASHBOARD --- */}
        {activeMenu === 'dashboard' && (
          <div>
            <div style={{ marginBottom: '40px', borderBottom: '2px solid #dfe1e2', paddingBottom: '20px' }}>
              <h1 style={{ fontSize: '32px', margin: '0 0 10px 0', color: '#112e51' }}>{getGreeting()}, {currentUser.full_name}</h1>
              <p style={{ margin: 0, color: '#565c65', fontSize: '16px' }}>สรุปสถานการณ์ประจำวันที่ {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            <div style={{ display: 'flex', gap: '30px', marginBottom: '40px' }}>
              <div style={{ ...styles.card, flex: 1, marginBottom: 0, borderTop: '4px solid #005ea2' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#565c65' }}>ผู้ป่วยรอเข้าตรวจวันนี้</div>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#112e51', margin: '10px 0' }}>{todayAppointments.length}</div>
              </div>
              <div style={{ ...styles.card, flex: 1, marginBottom: 0, borderTop: '4px solid #565c65' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#565c65' }}>จำนวนผู้ป่วยลงทะเบียนทั้งหมด</div>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#1b1b1b', margin: '10px 0' }}>{patients.length}</div>
              </div>
            </div>

            {/* ตารางล่วงหน้า 1 สัปดาห์ พร้อมระบบเลื่อนนัด */}
            <div style={styles.card}>
              <h2 style={styles.cardHeader}>ตารางออกตรวจล่วงหน้า 1 สัปดาห์ (Upcoming 7 Days)</h2>
              {weeklyAppointments.length === 0 ? (
                <div style={{ padding: '20px', background: '#f0f0f0', textAlign: 'center', color: '#565c65', fontWeight: 'bold' }}>ไม่มีคิวนัดหมายในช่วง 7 วันข้างหน้า</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>วันที่นัดหมาย</th>
                      <th style={styles.tableHeader}>โปรโตคอล / คลินิก</th>
                      <th style={styles.tableHeader}>รหัสผู้ป่วย (HN)</th>
                      <th style={styles.tableHeader}>ชื่อ-นามสกุล</th>
                      <th style={{...styles.tableHeader, textAlign: 'right'}}>จัดการคิว</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyAppointments.map((appt, idx) => {
                      const pt = patients.find(p => p.hn === appt.patient_hn);
                      const isEditing = editingAppt === `${appt.patient_hn}-${appt.appointment_date}`;
                      
                      // ดึงวันที่ว่างเฉพาะโปรโตคอลนี้มาโชว์ใน Dropdown
                      const availableDates = pt ? getAvailableDatesForProtocol(pt.disease_name, appt.appointment_date) : [];

                      return (
                        <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                          <td style={styles.tableCell}><strong>{appt.appointment_date}</strong></td>
                          <td style={styles.tableCell}><span style={{ background: '#e0f2fe', color: '#005ea2', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{pt ? pt.disease_name : '-'}</span></td>
                          <td style={styles.tableCell}>{appt.patient_hn}</td>
                          <td style={styles.tableCell}>{pt ? pt.full_name : 'ไม่พบข้อมูล'}</td>
                          <td style={{...styles.tableCell, textAlign: 'right'}}>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {availableDates.length > 0 ? (
                                  <select 
                                    style={{ padding: '8px', fontSize: '13px', borderRadius: '4px', border: '1px solid #565c65' }}
                                    value={newApptDate}
                                    onChange={(e) => setNewApptDate(e.target.value)}
                                  >
                                    <option value="" disabled>-- เลือกวันว่าง --</option>
                                    {availableDates.map(d => <option key={d} value={d}>{d}</option>)}
                                  </select>
                                ) : (
                                  <span style={{ fontSize: '12px', color: '#d83933', fontWeight: 'bold' }}>ไม่มีวันว่าง</span>
                                )}
                                <button onClick={() => saveReschedule(appt.patient_hn, appt.step_name, appt.appointment_date)} style={{ ...styles.btnPrimary, padding: '8px 12px', fontSize: '13px' }}>ยืนยัน</button>
                                <button onClick={() => { setEditingAppt(null); setNewApptDate(''); }} style={{ ...styles.btnSecondary, padding: '8px 12px', fontSize: '13px' }}>ยกเลิก</button>
                              </div>
                            ) : (
                              <button onClick={() => { setEditingAppt(`${appt.patient_hn}-${appt.appointment_date}`); setNewApptDate(appt.appointment_date); }} style={{ ...styles.btnSecondary, padding: '8px 12px', fontSize: '13px' }}>เลื่อนคิว</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* --- STAFF: ระบบนัดหมาย (Booking) --- */}
        {activeMenu === 'calendar' && currentUser.role === 'staff' && (
          <div>
            <h1 style={{ fontSize: '28px', margin: '0 0 30px 0', color: '#112e51', borderBottom: '2px solid #dfe1e2', paddingBottom: '15px' }}>ระบบลงนัดหมายผู้ป่วย (Appointment Booking)</h1>
            
            <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
              
              <div style={{ flex: '0 0 380px' }}>
                <div style={styles.card}>
                  <h2 style={styles.cardHeader}>1. ค้นหาและระบุตัวผู้ป่วย</h2>
                  
                  <label style={styles.label}>ค้นหาด้วย HN หรือ ชื่อ</label>
                  <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <input 
                      type="text" 
                      style={{...styles.input, marginBottom: 0}} 
                      placeholder="พิมพ์เพื่อค้นหา..."
                      value={bookingSearch}
                      onChange={(e) => handleSearchPatientForBooking(e.target.value)}
                    />
                    {suggestedPatients.length > 0 && (
                      <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #565c65', borderRadius: '4px', padding: 0, margin: '4px 0 0 0', listStyle: 'none', zIndex: 10, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                        {suggestedPatients.map(pt => (
                          <li key={pt.hn} onClick={() => selectPatientForBooking(pt)} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}>
                            <div style={{ fontWeight: 'bold', color: '#112e51' }}>{pt.full_name}</div>
                            <div style={{ fontSize: '13px', color: '#565c65', marginTop: '4px' }}>HN: {pt.hn}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {patientHN && (
                    <div style={{ padding: '20px', background: '#f0fdf4', border: '1px solid #2e8540', borderRadius: '4px', marginBottom: '30px' }}>
                      <div style={{ fontSize: '13px', color: '#2e8540', fontWeight: 'bold', marginBottom: '8px' }}>✓ พบข้อมูลผู้ป่วย</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1b1b1b' }}>{patientName}</div>
                      <div style={{ fontSize: '14px', color: '#565c65', marginTop: '4px' }}>HN: {patientHN}</div>
                    </div>
                  )}

                  <h2 style={styles.cardHeader}>2. เลือกโปรโตคอลการรักษา</h2>
                  <label style={styles.label}>โปรโตคอล / คลินิกที่ต้องการนัด</label>
                  <select 
                    style={styles.input} 
                    value={patientDisease} 
                    onChange={e => setPatientDisease(e.target.value)}
                    disabled={!patientHN}
                  >
                    <option value="" disabled>-- กรุณาเลือกโปรโตคอล --</option>
                    {allProtocols.map(disease => (
                      <option key={disease} value={disease}>{disease}</option>
                    ))}
                  </select>

                  <button type="button" onClick={clearBookingForm} style={{ ...styles.btnSecondary, width: '100%', marginTop: '10px' }}>ล้างข้อมูลทั้งหมด</button>
                </div>
              </div>

              <div style={{ flex: '1' }}>
                {!patientHN || !patientDisease ? (
                  <div style={{ padding: '60px 40px', background: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '4px', textAlign: 'center', color: '#565c65' }}>
                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>📅</div>
                    <h3 style={{ margin: '0 0 10px 0', color: '#112e51' }}>ระบบปฏิทินรอการตั้งค่า</h3>
                    <p style={{ margin: 0 }}>กรุณาค้นหาผู้ป่วยและเลือกโปรโตคอลด้านซ้ายมือ<br/>เพื่อแสดงตารางวันว่างที่สามารถนัดได้</p>
                  </div>
                ) : (
                  <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
                    <div style={{ background: '#112e51', padding: '20px 30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h2 style={{ margin: 0, fontSize: '18px' }}>ตารางเปิดรับนัด: {patientDisease}</h2>
                      <div style={{ display: 'flex', gap: '15px', fontSize: '13px', fontWeight: 'bold' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width:'12px', height:'12px', background:'#2e8540', border:'1px solid white' }}></div> ว่าง</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width:'12px', height:'12px', background:'#d83933', border:'1px solid white' }}></div> เต็ม</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', background: '#f9f9f9', borderBottom: '1px solid #dfe1e2' }}>
                      <button onClick={prevMonth} style={{ ...styles.btnSecondary, padding: '10px 20px', fontSize: '14px' }}>◀ เดือนก่อนหน้า</button>
                      <div style={{ fontWeight: 'bold', fontSize: '20px', color: '#112e51' }}>{monthNames[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear() + 543}</div>
                      <button onClick={nextMonth} style={{ ...styles.btnSecondary, padding: '10px 20px', fontSize: '14px' }}>เดือนถัดไป ▶</button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', background: '#e2e8f0', borderBottom: '1px solid #cbd5e1' }}>
                      {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map(day => (
                        <div key={day} style={{ padding: '12px 0', fontSize: '14px', fontWeight: 'bold', color: '#112e51' }}>{day}</div>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                      {generateCalendarDays().map((dateStr, i) => {
                        if (!dateStr) return <div key={i} style={{ borderBottom: '1px solid #dfe1e2', borderRight: '1px solid #dfe1e2', minHeight: '120px', background: '#f9f9f9' }}></div>;
                        
                        const dayNum = dateStr.split('-')[2];
                        const isPast = dateStr < formatDate(new Date());
                        
                        const sched = schedules.find(s => s.disease_name === patientDisease && s.schedule_date === dateStr);
                        const currentCount = sched ? appointments.filter(a => a.appointment_date === dateStr && patients.find(p => p.hn === a.patient_hn)?.disease_name === patientDisease).length : 0;
                        
                        let bgStyle = 'white';
                        let cursorStyle = 'default';
                        
                        if (isPast) bgStyle = '#f0f0f0';
                        else if (sched) {
                          cursorStyle = 'pointer';
                          if (currentCount >= sched.quota) { bgStyle = '#fef2f2'; } 
                          else { bgStyle = '#f0fdf4'; }
                        }

                        return (
                          <div 
                            key={i} 
                            onClick={() => { if(sched && !isPast) handleStaffDateClick(dateStr); setSelectedDate(dateStr); setEditingAppt(null); }} 
                            style={{ borderBottom: '1px solid #dfe1e2', borderRight: '1px solid #dfe1e2', minHeight: '120px', padding: '10px', background: bgStyle, cursor: cursorStyle, transition: 'background 0.2s' }}
                            onMouseOver={(e) => { if(sched && !isPast && bgStyle !== '#fef2f2') e.currentTarget.style.background = '#dcfce7'; }}
                            onMouseOut={(e) => { if(sched && !isPast && bgStyle !== '#fef2f2') e.currentTarget.style.background = bgStyle; }}
                          >
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: isPast ? '#a9b2bd' : '#112e51' }}>{parseInt(dayNum)}</div>
                            
                            {sched && !isPast && (
                              <div style={{ marginTop: '15px' }}>
                                <div style={{ fontSize: '12px', color: '#565c65', fontWeight: 'bold', marginBottom: '4px' }}>โควต้าคงเหลือ:</div>
                                <div style={{ background: currentCount >= sched.quota ? '#d83933' : '#2e8540', color: 'white', padding: '4px 0', textAlign: 'center', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                                  {sched.quota - currentCount} / {sched.quota}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- STAFF: ทะเบียนผู้ป่วย --- */}
        {activeMenu === 'patients' && currentUser.role === 'staff' && (
          <div>
            <h1 style={{ fontSize: '28px', margin: '0 0 30px 0', color: '#112e51', borderBottom: '2px solid #dfe1e2', paddingBottom: '15px' }}>ทะเบียนผู้ป่วย (Patient Database)</h1>
            
            <div style={styles.card}>
              <h2 style={styles.cardHeader}>ลงทะเบียนผู้ป่วยใหม่เข้าสู่ระบบ</h2>
              <form onSubmit={handleAddNewPatientOnly} style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <label style={styles.label}>รหัสประจำตัว (HN)</label>
                  <input type="text" required style={{...styles.input, marginBottom: 0}} value={patientHN} onChange={e => setPatientHN(e.target.value)} />
                </div>
                <div style={{ flex: '2', minWidth: '300px' }}>
                  <label style={styles.label}>ชื่อ-นามสกุล</label>
                  <input type="text" required style={{...styles.input, marginBottom: 0}} value={patientName} onChange={e => setPatientName(e.target.value)} />
                </div>
                <div style={{ flex: '1.5', minWidth: '250px' }}>
                  <label style={styles.label}>ระบุโปรโตคอลตั้งต้น</label>
                  <select required style={{...styles.input, marginBottom: 0}} value={patientDisease} onChange={e => setPatientDisease(e.target.value)}>
                    <option value="" disabled>-- เลือกโปรโตคอล --</option>
                    {allProtocols.map(disease => (
                      <option key={disease} value={disease}>{disease}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" style={styles.btnPrimary}>บันทึกข้อมูลผู้ป่วย</button>
              </form>
            </div>

            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{...styles.cardHeader, border: 'none', margin: 0, padding: 0}}>รายชื่อผู้ป่วยทั้งหมด</h2>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <input type="text" placeholder="ค้นหาด้วย HN หรือ ชื่อ..." style={{...styles.input, marginBottom: 0, width: '300px'}} value={searchPatientText} onChange={(e) => setSearchPatientText(e.target.value)} />
                  <select style={{...styles.input, marginBottom: 0, width: '250px'}} value={filterDisease} onChange={(e) => setFilterDisease(e.target.value)}>
                    <option value="all">แสดงทุกโปรโตคอล</option>
                    {allProtocols.map(disease => <option key={disease} value={disease}>{disease}</option>)}
                  </select>
                </div>
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>HN</th>
                    <th style={styles.tableHeader}>ชื่อ-นามสกุล</th>
                    <th style={styles.tableHeader}>โปรโตคอลโรค</th>
                    <th style={{...styles.tableHeader, textAlign: 'right'}}>การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedPatients.map((pt, idx) => (
                    <tr key={pt.hn} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                      <td style={styles.tableCell}><strong>{pt.hn}</strong></td>
                      <td style={styles.tableCell}>
                        {editingPatient === pt.hn ? <input type="text" style={{padding: '8px', width: '100%'}} value={editPtName} onChange={(e) => setEditPtName(e.target.value)} /> : pt.full_name}
                      </td>
                      <td style={styles.tableCell}>
                        {editingPatient === pt.hn ? (
                          <select style={{padding: '8px', width: '100%'}} value={editPtDisease} onChange={(e) => setEditPtDisease(e.target.value)}>
                            {allProtocols.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        ) : pt.disease_name}
                      </td>
                      <td style={{...styles.tableCell, textAlign: 'right'}}>
                        {editingPatient === pt.hn ? (
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={handleUpdatePatient} style={{...styles.btnPrimary, padding: '8px 12px'}}>บันทึก</button>
                            <button onClick={() => setEditingPatient(null)} style={{...styles.btnSecondary, padding: '8px 12px'}}>ยกเลิก</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => { setEditingPatient(pt.hn); setEditPtName(pt.full_name); setEditPtDisease(pt.disease_name); }} style={{...styles.btnSecondary, padding: '8px 16px'}}>แก้ไข</button>
                            <button onClick={() => handleDeletePatient(pt.hn)} style={styles.btnDanger}>ลบข้อมูล</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {displayedPatients.length === 0 && <tr><td colSpan="4" style={{...styles.tableCell, textAlign: 'center', color: '#565c65', padding: '30px'}}>ไม่พบข้อมูลผู้ป่วยในระบบ</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ADMIN: จัดตารางออกตรวจ --- */}
        {activeMenu === 'schedules' && currentUser.role === 'admin' && (
          <div>
            <h1 style={{ fontSize: '28px', margin: '0 0 30px 0', color: '#112e51', borderBottom: '2px solid #dfe1e2', paddingBottom: '15px' }}>กำหนดตารางออกตรวจของคลินิก (Clinic Schedules)</h1>
            
            <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
              
              <div style={{ ...styles.card, flex: '1 1 500px' }}>
                <h2 style={styles.cardHeader}>1. สร้างและเลือกวันที่ออกตรวจ</h2>
                <label style={styles.label}>ชื่อโปรโตคอล / คลินิก</label>
                <input type="text" style={styles.input} placeholder="เช่น คลินิกเบาหวาน" value={scheduleDisease} onChange={e => setScheduleDisease(e.target.value)} />
                
                <label style={styles.label}>คลิกเลือกวันบนปฏิทิน (เลือกได้หลายวัน)</label>
                <div style={{ border: '1px solid #dfe1e2', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: '#f0f0f0', borderBottom: '1px solid #dfe1e2' }}>
                    <button onClick={prevMonth} style={{...styles.btnSecondary, padding: '8px 15px'}}>◀ ก่อนหน้า</button>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#112e51' }}>{monthNames[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear() + 543}</div>
                    <button onClick={nextMonth} style={{...styles.btnSecondary, padding: '8px 15px'}}>ถัดไป ▶</button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', background: '#e2e8f0', fontSize: '13px', fontWeight: 'bold', color: '#112e51' }}>
                    <div style={{ padding: '10px 0' }}>อา.</div><div style={{ padding: '10px 0' }}>จ.</div><div style={{ padding: '10px 0' }}>อ.</div>
                    <div style={{ padding: '10px 0' }}>พ.</div><div style={{ padding: '10px 0' }}>พฤ.</div><div style={{ padding: '10px 0' }}>ศ.</div><div style={{ padding: '10px 0' }}>ส.</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                    {generateCalendarDays().map((dateStr, i) => {
                      if (!dateStr) return <div key={i} style={{ borderBottom: '1px solid #dfe1e2', borderRight: '1px solid #dfe1e2', minHeight: '80px', background: '#f9f9f9' }}></div>;
                      
                      const dayNum = dateStr.split('-')[2];
                      const isSelected = selectedScheduleDates.includes(dateStr);

                      return (
                        <div 
                          key={i} 
                          onClick={() => {
                            setSelectedScheduleDates(prev => {
                              if (prev.includes(dateStr)) {
                                const newQuotas = { ...quotas }; delete newQuotas[dateStr]; setQuotas(newQuotas);
                                return prev.filter(d => d !== dateStr);
                              } else {
                                setQuotas(prevQ => ({ ...prevQ, [dateStr]: bulkQuota || 0 }));
                                return [...prev, dateStr].sort();
                              }
                            });
                          }} 
                          style={{ borderBottom: '1px solid #dfe1e2', borderRight: '1px solid #dfe1e2', minHeight: '80px', padding: '10px', background: isSelected ? '#005ea2' : 'white', color: isSelected ? 'white' : '#112e51', cursor: 'pointer', transition: '0.1s' }}
                        >
                          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{parseInt(dayNum)}</div>
                          {isSelected && <div style={{ fontSize: '11px', marginTop: '10px', textAlign: 'center', background: 'rgba(255,255,255,0.2)', padding: '2px', borderRadius: '2px' }}>✓ เลือกแล้ว</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <div style={styles.card}>
                  <h2 style={styles.cardHeader}>2. กำหนดโควต้าการรับคิว</h2>
                  {selectedScheduleDates.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', background: '#f9f9f9', border: '1px dashed #cbd5e1', color: '#565c65', fontWeight: 'bold' }}>กรุณาเลือกวันที่บนปฏิทิน</div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', alignItems: 'flex-end', background: '#f0f0f0', padding: '20px', borderRadius: '4px', border: '1px solid #dfe1e2' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{...styles.label, color: '#112e51'}}>กำหนดโควต้ารวมทุกวัน (คน/วัน)</label>
                          <input type="number" style={{...styles.input, marginBottom: 0}} value={bulkQuota} onChange={e => setBulkQuota(e.target.value)} placeholder="ระบุจำนวนโควต้า" />
                        </div>
                        <button onClick={applyBulkQuota} style={{ ...styles.btnPrimary, background: '#112e51' }}>นำไปใช้ทั้งหมด</button>
                      </div>

                      <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #dfe1e2', borderRadius: '4px', marginBottom: '25px' }}>
                        {selectedScheduleDates.map((date, idx) => (
                          <div key={date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', background: idx % 2 === 0 ? '#ffffff' : '#f9f9f9', borderBottom: '1px solid #dfe1e2' }}>
                            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#112e51' }}>วันที่ {date}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#565c65' }}>จำนวนที่รับได้:</span>
                              <input type="number" style={{ padding: '8px', width: '100px', borderRadius: '4px', border: '1px solid #565c65', textAlign: 'center', fontSize: '15px' }} value={quotas[date] || ''} onChange={e => setQuotas({...quotas, [date]: e.target.value})} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <button onClick={handleSaveSchedules} style={{ ...styles.btnPrimary, width: '100%', fontSize: '16px', padding: '15px' }}>บันทึกตารางออกตรวจเข้าสู่ระบบ</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardHeader}>ตารางออกตรวจทั้งหมดในระบบ</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>โปรโตคอล / คลินิก</th>
                    <th style={styles.tableHeader}>วันที่ออกตรวจ</th>
                    <th style={styles.tableHeader}>โควต้าสูงสุด (คน)</th>
                    <th style={{...styles.tableHeader, textAlign: 'right'}}>การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s, idx) => (
                    <tr key={s.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                      <td style={styles.tableCell}><strong>{s.disease_name}</strong></td>
                      <td style={styles.tableCell}>{s.schedule_date}</td>
                      <td style={styles.tableCell}>{s.quota}</td>
                      <td style={{...styles.tableCell, textAlign: 'right'}}>
                        <button onClick={() => handleDeleteSchedule(s.id)} style={styles.btnDanger}>ลบข้อมูล</button>
                      </td>
                    </tr>
                  ))}
                  {schedules.length === 0 && <tr><td colSpan="4" style={{...styles.tableCell, textAlign: 'center', color: '#565c65', padding: '30px'}}>ยังไม่มีข้อมูลตารางออกตรวจในระบบ</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ADMIN: จัดการสิทธิ์ --- */}
        {activeMenu === 'admin' && currentUser.role === 'admin' && (
          <div>
            <h1 style={{ fontSize: '28px', margin: '0 0 30px 0', color: '#112e51', borderBottom: '2px solid #dfe1e2', paddingBottom: '15px' }}>การเข้าถึงระบบ (Access Control)</h1>
            <div style={{ ...styles.card, maxWidth: '800px' }}>
              <h2 style={styles.cardHeader}>คำขอลงทะเบียนที่รอการอนุมัติ</h2>
              {pendingUsers.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', background: '#f9f9f9', border: '1px dashed #cbd5e1', color: '#565c65', fontWeight: 'bold' }}>ไม่มีคำขอคงค้างในระบบ</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {pendingUsers.map(u => (
                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', border: '1px solid #dfe1e2', borderRadius: '4px', background: '#ffffff' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#112e51' }}>{u.full_name}</div>
                        <div style={{ color: '#565c65', fontSize: '14px', marginTop: '6px' }}>Username: {u.username} | Role: <span style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{u.role}</span></div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => approveUser(u.id)} style={{ padding: '10px 20px', background: '#2e8540', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>อนุมัติ</button>
                        <button onClick={() => rejectUser(u.id)} style={{ padding: '10px 20px', background: '#d83933', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>ปฏิเสธ</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default App