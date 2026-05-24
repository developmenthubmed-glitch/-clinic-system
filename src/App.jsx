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
  
  // State สำหรับเปิด-ปิดแถบเมนูด้านซ้าย
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
      <div style={{ 
        width: isSidebarOpen ? '280px' : '80px', // ยืดหดความกว้าง
        transition: 'width 0.3s ease', 
        background: theme.primary, 
        display: 'flex', flexDirection: 'column', color: 'white', flexShrink: 0, overflow: 'hidden' 
      }}>
        
        {/* Sidebar Header + Toggle Button */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#071526', display: 'flex', justifyContent: isSidebarOpen ? 'space-between' : 'center', alignItems: 'flex-start' }}>
          
          {isSidebarOpen && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <h1 style={{ fontSize: '18px', margin: '0 0 6px 0', letterSpacing: '0.5px', fontWeight: '900' }}>HEMATOLOGY SYS.</h1>
              <div style={{ fontSize: '11px', color: '#a9b2bd', textTransform: 'uppercase', marginTop: '4px', background: theme.secondary, display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{currentUser.role}</div>
              <div style={{ fontSize: '13px', color: '#ffffff', marginTop: '8px', fontWeight: 'bold' }}>{currentUser.full_name}</div>
            </div>
          )}

          {/* Hamburger Menu Button */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer', padding: isSidebarOpen ? '0' : '10px 0' }}
          >
            ☰
          </button>
        </div>
        
        <nav style={{ flex: 1, padding: '24px 16px', overflowY: 'auto', overflowX: 'hidden' }}>
          {isSidebarOpen && <div style={{ fontSize: '12px', color: '#a9b2bd', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 'bold', letterSpacing: '1px', paddingLeft: '8px', whiteSpace: 'nowrap' }}>Main Menu (เมนูหลัก)</div>}
          
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'patients', label: 'Patients', icon: '👥' },
            { id: 'appointments', label: 'Appointments', icon: '📅' },
            { id: 'calendar', label: 'Calendar', icon: '🗓️' },
            { id: 'reports', label: 'Reports', icon: '📈' },
          ].map(item => (
            <div 
              key={item.id} 
              onClick={() => setActiveMenu(item.id)} 
              title={item.label}
              style={{ 
                padding: '14px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', 
                background: activeMenu === item.id ? theme.secondary : 'transparent', marginBottom: '6px', transition: '0.2s', 
                borderLeft: activeMenu === item.id ? '4px solid #fff' : '4px solid transparent',
                display: 'flex', alignItems: 'center', gap: '16px', whiteSpace: 'nowrap'
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              {isSidebarOpen && <span>{item.label}</span>}
            </div>
          ))}

          {currentUser.role === 'admin' && (
            <>
              {isSidebarOpen && <div style={{ fontSize: '12px', color: '#a9b2bd', textTransform: 'uppercase', margin: '30px 0 12px 0', fontWeight: 'bold', letterSpacing: '1px', paddingLeft: '8px', whiteSpace: 'nowrap' }}>Admin (ผู้ดูแลระบบ)</div>}
              {[
                { id: 'settings', label: 'Settings', icon: '⚙️' },
                { id: 'audit', label: 'Activity Log', icon: '📜' }
              ].map(item => (
                <div 
                  key={item.id} 
                  onClick={() => setActiveMenu(item.id)} 
                  title={item.label}
                  style={{ 
                    padding: '14px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', 
                    background: activeMenu === item.id ? theme.secondary : 'transparent', marginBottom: '6px', transition: '0.2s', 
                    borderLeft: activeMenu === item.id ? '4px solid #fff' : '4px solid transparent',
                    display: 'flex', alignItems: 'center', gap: '16px', whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  {isSidebarOpen && <span>{item.label}</span>}
                </div>
              ))}
            </>
          )}
        </nav>
        
        <div style={{ padding: '24px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
            onClick={handleLogout} 
            title="Sign Out"
            style={{ 
              width: '100%', padding: '12px', background: 'transparent', color: 'white', border: '1px solid #a9b2bd', 
              borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'
            }}
          >
            <span>🚪</span>
            {isSidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '40px 60px', overflowY: 'auto', transition: 'padding 0.3s' }}>
        
        {/* Toggle Button for Mobile/Small Screens (Optional backup) */}
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} style={{ background: theme.surface, border: `1px solid ${theme.border}`, padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '16px' }}>
            ☰ เมนูหลัก
          </button>
        )}

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