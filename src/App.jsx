import React, { useState } from 'react';
import { supabase } from './supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';  
import Appointments from './pages/Appointments'; 
import Settings from './pages/Settings'; 
import ActivityLog from './pages/ActivityLog';
import CalendarView from './pages/Calendar';
import Reports from './pages/Reports';

const theme = {
  primary: '#112e51',
  secondary: '#005ea2',
  bg: '#f0f0f0',
  text: '#1b1b1b',
  textMuted: '#565c65',
  border: '#dfe1e2',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeMenu, setActiveMenu] = useState('dashboard');

  const handleLogout = async () => {
    if (currentUser) {
      await supabase.from('audit_logs').insert([{ 
        user_name: currentUser.full_name, 
        action: 'System Logout', 
        detail: 'User logged out of the system' 
      }]);
    }
    setCurrentUser(null);
    setActiveMenu('dashboard');
  };

  // หากยังไม่ได้ล็อกอิน ให้แสดงหน้า Login (ที่นำเข้ามาจากไฟล์ Login.jsx)
  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // Layout หลักของระบบเมื่อล็อกอินผ่านแล้ว
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme.bg, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', color: theme.text }}>
      
      {/* Sidebar Navigation */}
      <div style={{ width: '260px', background: theme.primary, display: 'flex', flexDirection: 'column', color: 'white', flexShrink: 0 }}>
        
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h1 style={{ fontSize: '18px', margin: '0 0 4px 0', letterSpacing: '0.5px' }}>HEMATOLOGY SYS.</h1>
          <div style={{ fontSize: '11px', color: '#a9b2bd', textTransform: 'uppercase', marginTop: '10px', background: theme.secondary, display: 'inline-block', padding: '2px 6px', borderRadius: '2px', fontWeight: 'bold' }}>
            {currentUser.role}
          </div>
          <div style={{ fontSize: '13px', color: '#ffffff', marginTop: '6px', fontWeight: 'bold' }}>
            {currentUser.full_name}
          </div>
        </div>
        
        <nav style={{ flex: 1, padding: '20px' }}>
          <div style={{ fontSize: '11px', color: '#a9b2bd', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>Main Menu</div>
          
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'patients', label: 'Patient Management' },
            { id: 'appointments', label: 'Appointments' },
            { id: 'calendar', label: 'Calendar View' },
            { id: 'reports', label: 'Reports' },
          ].map(item => (
            <div 
              key={item.id} 
              onClick={() => setActiveMenu(item.id)} 
              style={{ padding: '12px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', background: activeMenu === item.id ? theme.secondary : 'transparent', marginBottom: '4px', transition: '0.2s' }}
            >
              {item.label}
            </div>
          ))}

          {currentUser.role === 'admin' && (
            <>
              <div style={{ fontSize: '11px', color: '#a9b2bd', textTransform: 'uppercase', margin: '24px 0 10px 0', fontWeight: 'bold', letterSpacing: '1px' }}>Administration</div>
              <div onClick={() => setActiveMenu('settings')} style={{ padding: '12px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', background: activeMenu === 'settings' ? theme.secondary : 'transparent', marginBottom: '4px' }}>System Settings</div>
              <div onClick={() => setActiveMenu('audit')} style={{ padding: '12px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', background: activeMenu === 'audit' ? theme.secondary : 'transparent', marginBottom: '4px' }}>Activity Log</div>
            </>
          )}
        </nav>
        
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={handleLogout} style={{ width: '100%', padding: '10px', background: 'transparent', color: 'white', border: '1px solid #a9b2bd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '40px 50px', overflowY: 'auto' }}>
        
        {activeMenu === 'dashboard' && <Dashboard currentUser={currentUser} />}
        {activeMenu === 'patients' && <Patients currentUser={currentUser} />} 
        {activeMenu === 'appointments' && <Appointments currentUser={currentUser} />} 
        {activeMenu === 'calendar' && <CalendarView />}
        {activeMenu === 'reports' && <Reports />}
        {activeMenu === 'settings' && currentUser.role === 'admin' && <Settings currentUser={currentUser} />}
        {activeMenu === 'audit' && currentUser.role === 'admin' && <ActivityLog />}

        {/* หน้าอื่นๆ ที่ยังไม่ได้สร้าง */}
        {activeMenu !== 'dashboard' && (
          <div style={{ background: '#ffffff', padding: '60px', textAlign: 'center', borderRadius: '4px', border: `1px solid ${theme.border}` }}>
            <h2 style={{ color: theme.primary, fontSize: '24px', marginBottom: '10px' }}>Module: {activeMenu}</h2>
            <p style={{ color: theme.textMuted }}>This module is currently being developed into a separate file.</p>
          </div>
        )}

      </div>
    </div>
  );
}