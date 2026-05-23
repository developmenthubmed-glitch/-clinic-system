import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

const theme = {
  primary: '#112e51',
  surface: '#ffffff',
  bg: '#f0f0f0',
  text: '#1b1b1b',
  textMuted: '#565c65',
  border: '#dfe1e2',
};

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      // ดึงข้อมูล 100 รายการล่าสุด
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
      if (data) setLogs(data);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '24px', borderBottom: `2px solid ${theme.border}`, paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', color: theme.primary }}>Activity Log (Audit Trail)</h1>
        <p style={{ margin: 0, color: theme.textMuted }}>Monitor system usage, actions, and historical modifications.</p>
      </div>

      <div style={{ background: theme.surface, borderRadius: '4px', border: `1px solid ${theme.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: theme.bg, fontSize: '13px', color: theme.primary }}>
            <tr>
              <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>Timestamp</th>
              <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>Staff User</th>
              <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>Action Type</th>
              <th style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}` }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>Loading audit logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>No activity logs found.</td></tr>
            ) : (
              logs.map((log, idx) => (
                <tr key={log.id} style={{ borderBottom: `1px solid ${theme.border}`, background: idx % 2 === 0 ? '#fff' : '#f9f9f9', fontSize: '14px' }}>
                  <td style={{ padding: '16px 20px', color: theme.textMuted, whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{log.user_name}</td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ background: theme.bg, border: `1px solid ${theme.border}`, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: theme.text }}>{log.detail}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}