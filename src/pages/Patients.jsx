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
};

export default function Patients({ currentUser }) {
  const [view, setView] = useState('list'); // 'list' หรือ 'add'
  const [patients, setPatients] = useState([]);
  const [protocols, setProtocols] = useState([]); // ดึงมาจาก schedules
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterDisease, setFilterDisease] = useState('all');

  // Form State
  const initialForm = { hn: '', title: 'Mr.', first_name: '', last_name: '', gender: 'Male', dob: '', blood_group: 'Unknown', phone: '', disease_name: '' };
  const [form, setForm] = useState(initialForm);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const calculateAge = (dob) => {
    if (!dob) return '-';
    const ageDifMs = Date.now() - new Date(dob).getTime();
    return Math.abs(new Date(ageDifMs).getUTCFullYear() - 1970);
  };

  const fetchData = async () => {
    setLoading(true);
    // ดึงผู้ป่วย และ ดึงชื่อโรคจาก clinic_schedules มาทำ Dropdown
    const [resPt, resSched] = await Promise.all([
      supabase.from('patients').select('*').order('created_at', { ascending: false }),
      supabase.from('clinic_schedules').select('disease_name')
    ]);
    
    if (resPt.data) setPatients(resPt.data);
    if (resSched.data) {
      // ทำชื่อโรคให้ไม่ซ้ำกัน (Unique)
      const uniqueProtocols = [...new Set(resSched.data.map(s => s.disease_name))];
      setProtocols(uniqueProtocols);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    // เช็ค HN ซ้ำ
    const { data: exist } = await supabase.from('patients').select('id').eq('hn', form.hn);
    if (exist && exist.length > 0) {
      showToast('HN already exists in the system.', 'error');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('patients').insert([form]);
    
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast('Patient registered successfully');
      // บันทึก Audit Log
      await supabase.from('audit_logs').insert([{ 
        user_name: currentUser.full_name, 
        action: 'Add Patient', 
        detail: `Registered new patient HN: ${form.hn} (${form.first_name} ${form.last_name})` 
      }]);
      setForm(initialForm);
      setView('list');
      fetchData();
    }
    setLoading(false);
  };

  // คัดกรองข้อมูลผู้ป่วย
  const displayedPatients = patients.filter(pt => {
    const matchSearch = pt.hn.includes(search) || pt.first_name.includes(search) || pt.last_name.includes(search);
    const matchDisease = filterDisease === 'all' || pt.disease_name === filterDisease;
    return matchSearch && matchDisease;
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
          <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', color: theme.primary }}>Patient Management</h1>
          <p style={{ margin: 0, color: theme.textMuted }}>Manage hematology patient records and demographic information.</p>
        </div>
        {view === 'list' && (
          <button onClick={() => setView('add')} style={{ padding: '10px 20px', background: theme.secondary, color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
            + Register New Patient
          </button>
        )}
      </div>

      {view === 'add' ? (
        // ==========================================
        // ➕ ADD PATIENT FORM
        // ==========================================
        <div style={{ background: theme.surface, padding: '32px', borderRadius: '4px', border: `1px solid ${theme.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h2 style={{ marginTop: 0, color: theme.primary, marginBottom: '24px', fontSize: '20px' }}>Patient Registration Form</h2>
          
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              {/* Basic Info */}
              <div style={{ gridColumn: '1 / -1' }}><h3 style={{ fontSize: '16px', color: theme.secondary, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', marginBottom: '8px' }}>Basic Information</h3></div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Hospital Number (HN) <span style={{color: theme.danger}}>*</span></label>
                <input required value={form.hn} onChange={e=>setForm({...form, hn: e.target.value})} placeholder="e.g. 66001234" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Title <span style={{color: theme.danger}}>*</span></label>
                <select required value={form.title} onChange={e=>setForm({...form, title: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', boxSizing: 'border-box' }}>
                  <option value="Mr.">นาย (Mr.)</option><option value="Mrs.">นาง (Mrs.)</option><option value="Miss">นางสาว (Miss)</option>
                  <option value="Boy">เด็กชาย (Boy)</option><option value="Girl">เด็กหญิง (Girl)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>First Name <span style={{color: theme.danger}}>*</span></label>
                <input required value={form.first_name} onChange={e=>setForm({...form, first_name: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Last Name <span style={{color: theme.danger}}>*</span></label>
                <input required value={form.last_name} onChange={e=>setForm({...form, last_name: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Date of Birth <span style={{color: theme.danger}}>*</span></label>
                <input type="date" required value={form.dob} onChange={e=>setForm({...form, dob: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Gender <span style={{color: theme.danger}}>*</span></label>
                <select required value={form.gender} onChange={e=>setForm({...form, gender: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', boxSizing: 'border-box' }}>
                  <option value="Male">Male</option><option value="Female">Female</option>
                </select>
              </div>

              {/* Medical Info */}
              <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}><h3 style={{ fontSize: '16px', color: theme.secondary, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', marginBottom: '8px' }}>Medical Information</h3></div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Blood Group <span style={{color: theme.danger}}>*</span></label>
                <select required value={form.blood_group} onChange={e=>setForm({...form, blood_group: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', boxSizing: 'border-box' }}>
                  <option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option><option value="Unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Disease Protocol / Clinic <span style={{color: theme.danger}}>*</span></label>
                <select required value={form.disease_name} onChange={e=>setForm({...form, disease_name: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', boxSizing: 'border-box' }}>
                  <option value="" disabled>-- Select Protocol --</option>
                  {protocols.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '40px', paddingTop: '20px', borderTop: `1px solid ${theme.border}` }}>
              <button type="submit" disabled={loading} style={{ padding: '12px 24px', background: theme.primary, color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Saving...' : 'Save Patient Record'}
              </button>
              <button type="button" onClick={() => {setView('list'); setForm(initialForm);}} style={{ padding: '12px 24px', background: theme.bg, color: theme.text, border: `1px solid ${theme.textMuted}`, borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        // ==========================================
        // 📋 PATIENT LIST VIEW
        // ==========================================
        <div style={{ background: theme.surface, borderRadius: '4px', border: `1px solid ${theme.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          
          {/* Search Bar */}
          <div style={{ padding: '20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', gap: '16px', background: '#f9f9f9' }}>
            <input 
              type="text" 
              placeholder="Search by HN or Name..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ flex: 1, padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '14px' }} 
            />
            <select 
              value={filterDisease} 
              onChange={e => setFilterDisease(e.target.value)} 
              style={{ width: '250px', padding: '10px 12px', border: `1px solid ${theme.border}`, borderRadius: '4px', fontSize: '14px' }}
            >
              <option value="all">All Clinics / Protocols</option>
              {protocols.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: theme.bg, fontSize: '13px', color: theme.primary }}>
              <tr>
                <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>HN</th>
                <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>Patient Name</th>
                <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>Gender</th>
                <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>Age</th>
                <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>Blood Grp.</th>
                <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>Clinic Protocol</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>Loading patients...</td></tr>
              ) : displayedPatients.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>No patient records found.</td></tr>
              ) : (
                displayedPatients.map((pt, idx) => (
                  <tr key={pt.id} style={{ borderBottom: `1px solid ${theme.border}`, background: idx % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{pt.hn}</td>
                    <td style={{ padding: '16px 20px' }}>{pt.title} {pt.first_name} {pt.last_name}</td>
                    <td style={{ padding: '16px 20px' }}>{pt.gender}</td>
                    <td style={{ padding: '16px 20px' }}>{calculateAge(pt.dob)}</td>
                    <td style={{ padding: '16px 20px' }}><span style={{background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px'}}>{pt.blood_group}</span></td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                        {pt.disease_name}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div style={{ padding: '12px 20px', background: '#f9f9f9', fontSize: '12px', color: theme.textMuted, borderTop: `1px solid ${theme.border}` }}>
            Total {displayedPatients.length} records found
          </div>
        </div>
      )}
    </div>
  );
}