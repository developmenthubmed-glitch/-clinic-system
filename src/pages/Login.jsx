import React, { useState } from 'react';
import { supabase } from '../supabase';

const theme = {
  primary: '#112e51',
  secondary: '#005ea2',
  surface: '#ffffff',
  text: '#1b1b1b',
  textMuted: '#565c65',
  border: '#dfe1e2',
  danger: '#d83933',
  success: '#2e8540'
};

export default function Login({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'staff' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const logActivity = async (user_name, action, detail) => {
    await supabase.from('audit_logs').insert([{ user_name, action, detail }]);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (authMode === 'login') {
      const { data, error } = await supabase
        .from('staff_users')
        .select('*')
        .eq('username', form.username)
        .eq('password', form.password)
        .single();

      if (error || !data) {
        showToast('Invalid credentials. Please check your username and password.', 'error');
      } else if (!data.is_approved) {
        showToast('Access Denied. Your account is pending admin approval.', 'error');
      } else {
        await logActivity(data.full_name, 'System Login', 'User successfully logged into the system');
        onLoginSuccess(data);
      }
    } else {
      const { data: exist } = await supabase.from('staff_users').select('id').eq('username', form.username);
      
      if (exist && exist.length > 0) {
        showToast('Username already exists. Please choose another.', 'error');
      } else {
        const { error } = await supabase.from('staff_users').insert([{ 
          username: form.username, 
          password: form.password, 
          full_name: form.full_name, 
          role: form.role, 
          is_approved: false 
        }]);

        if (error) {
          showToast(error.message, 'error');
        } else {
          showToast('Registration successful. Please wait for admin approval.');
          setAuthMode('login');
          setForm({ ...form, password: '' });
        }
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: theme.primary, fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: toast.type === 'error' ? theme.danger : theme.success, color: 'white', padding: '16px 24px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, fontWeight: 'bold' }}>
          {toast.message}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div style={{ background: theme.surface, padding: '40px', borderRadius: '4px', width: '100%', maxWidth: '420px', borderTop: `8px solid ${theme.secondary}`, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ color: theme.primary, margin: '0 0 10px 0', fontSize: '24px', lineHeight: '1.3' }}>
              Hematology Appointment<br/>Management System
            </h1>
            <p style={{ color: theme.textMuted, margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
              Maharat Nakhon Ratchasima Hospital
            </p>
          </div>
          
          <form onSubmit={handleAuth}>
            {authMode === 'register' && (
              <>
                <div style={{marginBottom:'16px'}}>
                  <label style={{display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'6px', color: theme.text}}>Full Name</label>
                  <input required value={form.full_name} onChange={e=>setForm({...form, full_name:e.target.value})} style={{width:'100%', padding:'12px 16px', boxSizing:'border-box', border:`1px solid ${theme.border}`, borderRadius:'4px', fontSize:'15px'}}/>
                </div>
                <div style={{marginBottom:'16px'}}>
                  <label style={{display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'6px', color: theme.text}}>Role Request</label>
                  <select value={form.role} onChange={e=>setForm({...form, role:e.target.value})} style={{width:'100%', padding:'12px 16px', boxSizing:'border-box', border:`1px solid ${theme.border}`, borderRadius:'4px', fontSize:'15px'}}>
                    <option value="staff">Staff / Nurse</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>
              </>
            )}
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'6px', color: theme.text}}>Username</label>
              <input required value={form.username} onChange={e=>setForm({...form, username:e.target.value})} style={{width:'100%', padding:'12px 16px', boxSizing:'border-box', border:`1px solid ${theme.border}`, borderRadius:'4px', fontSize:'15px'}}/>
            </div>
            <div style={{marginBottom:'24px'}}>
              <label style={{display:'block', fontSize:'13px', fontWeight:'bold', marginBottom:'6px', color: theme.text}}>Password</label>
              <input type="password" required value={form.password} onChange={e=>setForm({...form, password:e.target.value})} style={{width:'100%', padding:'12px 16px', boxSizing:'border-box', border:`1px solid ${theme.border}`, borderRadius:'4px', fontSize:'15px'}}/>
            </div>
            
            <button type="submit" disabled={loading} style={{width:'100%', padding: '12px', background: theme.secondary, color: 'white', border: 'none', borderRadius: '4px', fontSize: '15px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer'}}>
              {loading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Register Account')}
            </button>
          </form>
          
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <span onClick={()=>setAuthMode(authMode==='login'?'register':'login')} style={{color:theme.secondary, cursor:'pointer', fontSize:'14px', fontWeight:'bold', textDecoration:'underline'}}>
              {authMode==='login' ? 'Create new staff account' : 'Back to Sign In'}
            </span>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '30px', color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
          <a href="mailto:developmenthubmed@gmail.com" style={{color:'rgba(255,255,255,0.9)', textDecoration:'none', fontWeight:'bold'}}>Contact Developer (developmenthubmed@gmail.com)</a>
          <div style={{marginTop: '8px'}}>© 2026 Apipon. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}