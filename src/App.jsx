import React, { useState } from 'react';
import { supabase } from './supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import CalendarView from './pages/Calendar';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ActivityLog from './pages/ActivityLog';

const theme = {
  primary: '#0b1f38',
  secondary: '#005ea2',
  bg: '#f4f6f9',
  text: '#1b1b1b',
  textMuted: '#565c65',
  border: '#dfe1e2',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState('dashboard');

  const handleLogout = async () => {
    if (currentUser) {
      await supabase.from('audit_logs').insert([{ user_name: currentUser.full_name, action: 'System Logout', detail: 'User logged out' }]);
    }
    setCurrentUser(null);
    setActiveMenu('dashboard');
  };

  if (!currentUser) return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme.bg, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', color: theme.text }}>
      
      {/* Sidebar Navigation */}
      <div style={{ width: '280px', background: theme.primary, display: 'flex', flexDirection: 'column', color: 'white', flexShrink: 0 }}>
        
        <div style={{ padding: '30px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#071526' }}>
          <h1 style={{ fontSize: '20px', margin: '0 0 6px 0', letterSpacing: '0.5px', fontWeight: '900' }}>HEMATOLOGY SYS.</h1>
          <div style={{ fontSize: '11px', color: '#a9b2bd', textTransform: 'uppercase', marginTop: '10px', background: theme.secondary, display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
            {currentUser.role}
          </div>
          <div style={{ fontSize: '14px', color: '#ffffff', marginTop: '8px', fontWeight: 'bold' }}>
            {currentUser.full_name}
          </div>
        </div>
        
        <nav style={{ flex: 1, padding: '24px 16px' }}>
          <div style={{ fontSize: '12px', color: '#a9b2bd', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 'bold', letterSpacing: '1px', paddingLeft: '8px' }}>Main Menu (เมนูหลัก)</div>
          
          {[
            { id: 'dashboard', label: 'Dashboard (แผงควบคุม)' },
            { id: 'patients', label: 'Patients (ทะเบียนผู้ป่วย)' },
            { id: 'appointments', label: 'Appointments (การนัดหมาย)' },
            { id: 'calendar', label: 'Calendar (ปฏิทินตาราง)' },
            { id: 'reports', label: 'Reports (รายงานสถิติ)' },
          ].map(item => (
            <div 
              key={item.id} 
              onClick={() => setActiveMenu(item.id)} 
              style={{ padding: '14px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', background: activeMenu === item.id ? theme.secondary : 'transparent', marginBottom: '6px', transition: '0.2s', borderLeft: activeMenu === item.id ? '4px solid #fff' : '4px solid transparent' }}
            >
              {item.label}
            </div>
          ))}

          {currentUser.role === 'admin' && (
            <>
              <div style={{ fontSize: '12px', color: '#a9b2bd', textTransform: 'uppercase', margin: '30px 0 12px 0', fontWeight: 'bold', letterSpacing: '1px', paddingLeft: '8px' }}>Admin (ผู้ดูแลระบบ)</div>
              <div onClick={() => setActiveMenu('settings')} style={{ padding: '14px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', background: activeMenu === 'settings' ? theme.secondary : 'transparent', marginBottom: '6px', borderLeft: activeMenu === 'settings' ? '4px solid #fff' : '4px solid transparent' }}>Settings (ตั้งค่าระบบ)</div>
              <div onClick={() => setActiveMenu('audit')} style={{ padding: '14px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', background: activeMenu === 'audit' ? theme.secondary : 'transparent', marginBottom: '6px', borderLeft: activeMenu === 'audit' ? '4px solid #fff' : '4px solid transparent' }}>Activity Log (ประวัติการใช้งาน)</div>
            </>
          )}
        </nav>
        
        <div style={{ padding: '24px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={handleLogout} style={{ width: '100%', padding: '12px', background: 'transparent', color: 'white', border: '1px solid #a9b2bd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            Sign Out (ออกจากระบบ)
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '40px 60px', overflowY: 'auto' }}>
        {activeMenu === 'dashboard' && <Dashboard currentUser={currentUser} />}
        {activeMenu === 'patients' && <Patients currentUser={currentUser} />}
        {activeMenu === 'appointments' && <Appointments currentUser={currentUser} />}
        {activeMenu === 'calendar' && <CalendarView />}
        {activeMenu === 'reports' && <Reports />}
        {activeMenu === 'settings' && currentUser.role === 'admin' && <Settings currentUser={currentUser} />}
        {activeMenu === 'audit' && currentUser.role === 'admin' && <ActivityLog />}
      </div>
    </div>
  );
}