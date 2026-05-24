import React, { useState, useEffect } from 'react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- Maintenance Mode States ---
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isCheckingSystem, setIsCheckingSystem] = useState(true);
  const [forceAdminLogin, setForceAdminLogin] = useState(false);

  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const { data } = await supabase.from('system_settings').select('is_active').eq('setting_name', 'maintenance_mode').maybeSingle();
        if (data) setIsMaintenanceMode(data.is_active);
      } catch (err) {
        console.error("System settings error:", err);
      } finally {
        setIsCheckingSystem(false);
      }
    };
    checkSystemStatus();
  }, []);

  const handleLogout = async () => {
    if (currentUser) {
      await supabase.from('audit_logs').insert([{ user_name: currentUser.full_name, action: 'System Logout', detail: 'User logged out' }]);
    }
    setCurrentUser(null);
    setActiveMenu('dashboard');
  };

  if (isCheckingSystem) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: theme.primary, color: 'white', fontSize: '20px', fontWeight: 'bold' }}>Loading System...</div>;
  }

  // 🚧 หน้าจอตอนปิดปรับปรุงระบบ
  if (isMaintenanceMode && (!currentUser || currentUser.role !== 'admin') && !forceAdminLogin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0b1f38', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', padding: '20px' }}>
        <div style={{ background: '#ffffff', padding: '50px 40px', borderRadius: '12px', textAlign: 'center', maxWidth: '500px', width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', borderTop: '10px solid #d83933' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px', lineHeight: '1' }}>⛔🛠️</div>
          <h1 style={{ color: '#d83933', fontSize: '28px', fontWeight: '900', margin: '0 0 16px 0', letterSpacing: '-0.5px' }}>System Maintenance</h1>
          <p style={{ color: '#1b1b1b', fontSize: '16px', lineHeight: '1.6', fontWeight: 'bold', margin: '0 0 24px 0' }}>
            We are currently performing scheduled maintenance to upgrade our system and improve performance. We will be back online shortly. 
          </p>
          <div style={{ borderTop: '1px solid #dfe1e2', paddingTop: '20px', marginTop: '20px' }}>
            <p style={{ color: '#565c65', fontSize: '13.5px', margin: 0 }}>
              (ขณะนี้ผู้พัฒนากำลังปิดปรับปรุงเพื่อยกระดับระบบ เราจะกลับมาให้บริการในไม่ช้า ขออภัยในความไม่สะดวกครับ 😔)
            </p>
          </div>
        </div>
        {/* ช่องทางลับให้ Admin กดเข้ามาเปิดระบบ */}
        <div style={{ position: 'absolute', bottom: '30px', color: 'rgba(255,255,255,0.3)', fontSize: '12px', textAlign: 'center', cursor: 'pointer', padding: '10px' }} onClick={() => setForceAdminLogin(true)}>
          HEMATOLOGY CLINIC SYSTEM • Admin Bypass
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={(user) => {
      setCurrentUser(user);
      setForceAdminLogin(false);
    }} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme.bg, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', color: theme.text }}>
      <div style={{ width: isSidebarOpen ? '280px' : '80px', transition: 'width 0.3s ease', background: theme.primary, display: 'flex', flexDirection: 'column', color: 'white', flexShrink: 0, overflow: 'hidden', boxShadow: '4px 0 10px rgba(0,0,0,0.1)', zIndex: 10 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#071526', display: 'flex', justifyContent: isSidebarOpen ? 'space-between' : 'center', alignItems: 'flex-start' }}>
          {isSidebarOpen && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <h1 style={{ fontSize: '18px', margin: '0 0 6px 0', letterSpacing: '0.5px', fontWeight: '900' }}>HEMATOLOGY SYS.</h1>
              <div style={{ fontSize: '11px', color: '#a9b2bd', textTransform: 'uppercase', marginTop: '4px', background: theme.secondary, display: 'inline-block', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{currentUser.role}</div>
              <div style={{ fontSize: '13px', color: '#ffffff', marginTop: '8px', fontWeight: 'bold' }}>{currentUser.full_name}</div>
            </div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer', padding: isSidebarOpen ? '0' : '10px 0', display: 'flex', alignItems: 'center' }}>☰</button>
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
            <div key={item.id} onClick={() => setActiveMenu(item.id)} title={item.label} style={{ padding: '14px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', background: activeMenu === item.id ? theme.secondary : 'transparent', marginBottom: '6px', transition: '0.2s', borderLeft: activeMenu === item.id ? '4px solid #fff' : '4px solid transparent', display: 'flex', alignItems: 'center', gap: '16px', whiteSpace: 'nowrap' }}>
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
                <div key={item.id} onClick={() => setActiveMenu(item.id)} title={item.label} style={{ padding: '14px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', background: activeMenu === item.id ? theme.secondary : 'transparent', marginBottom: '6px', transition: '0.2s', borderLeft: activeMenu === item.id ? '4px solid #fff' : '4px solid transparent', display: 'flex', alignItems: 'center', gap: '16px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: '18px' }}>{item.icon}</span>
                  {isSidebarOpen && <span>{item.label}</span>}
                </div>
              ))}
            </>
          )}
        </nav>
        
        <div style={{ padding: '24px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={handleLogout} title="Sign Out" style={{ width: '100%', padding: '12px', background: 'transparent', color: 'white', border: '1px solid #a9b2bd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: '0.2s' }}>
            <span style={{ fontSize: '18px' }}>🚪</span>
            {isSidebarOpen && <span>Sign Out (ออก)</span>}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: '40px 60px', overflowY: 'auto', transition: 'padding 0.3s' }}>
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} style={{ background: theme.surface, border: `1px solid ${theme.border}`, color: theme.primary, padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>☰</span> ขยายเมนู
          </button>
        )}

        {isMaintenanceMode && (
          <div style={{ background: '#fef2f2', border: '2px solid #dc2626', color: '#b91c1c', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)' }}>
            <span style={{fontSize:'24px'}}>⚠️</span> 
            <div>
              <div style={{fontSize:'16px'}}>ระบบกำลังอยู่ในโหมดปิดปรับปรุง (Maintenance Mode is ON)</div>
              <div style={{fontSize:'13px', fontWeight:'normal'}}>พนักงานทั่วไปจะไม่สามารถเข้าสู่ระบบได้ โปรดไปที่เมนู Settings เพื่อเปิดระบบเมื่อพร้อม</div>
            </div>
          </div>
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