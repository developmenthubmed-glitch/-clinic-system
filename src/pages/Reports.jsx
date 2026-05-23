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
};

export default function Reports() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); // วันแรกของเดือน
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // วันนี้

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase.from('appointments').select('*');
      if (data) setAppointments(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // กรองข้อมูลตามช่วงวันที่
  const filteredAppts = appointments.filter(a => a.appointment_date >= startDate && a.appointment_date <= endDate);

  // สรุปยอด
  const total = filteredAppts.length;
  const completed = filteredAppts.filter(a => a.status === 'Completed').length;
  const cancelled = filteredAppts.filter(a => a.status === 'Cancelled').length;
  const missed = filteredAppts.filter(a => a.status === 'Missed').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', borderBottom: `2px solid ${theme.border}`, paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: '0 0 8px 0', color: theme.primary }}>Statistical Reports</h1>
          <p style={{ margin: 0, color: theme.textMuted }}>Generate and export hospital workload and appointment statistics.</p>
        </div>
        <button onClick={handlePrint} style={{ padding: '10px 20px', background: theme.secondary, color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
          🖨️ Print / Export PDF
        </button>
      </div>

      {/* Report Controls */}
      <div className="no-print" style={{ background: theme.surface, padding: '24px', borderRadius: '4px', border: `1px solid ${theme.border}`, marginBottom: '32px', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Date From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '10px', border: `1px solid ${theme.border}`, borderRadius: '4px' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Date To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '10px', border: `1px solid ${theme.border}`, borderRadius: '4px' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>Generating report data...</div>
      ) : (
        <div id="printable-report">
          <h2 style={{ color: theme.primary, marginBottom: '20px' }}>Appointment Summary ({startDate} to {endDate})</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
            {[
              { label: 'Total Appointments', value: total, color: theme.primary },
              { label: 'Successfully Completed', value: completed, color: '#2e8540' },
              { label: 'Cancelled', value: cancelled, color: '#d83933' },
              { label: 'No-Show / Missed', value: missed, color: '#565c65' }
            ].map((c, i) => (
              <div key={i} style={{ background: theme.surface, padding: '24px', borderRadius: '4px', border: `1px solid ${theme.border}`, borderLeft: `6px solid ${c.color}` }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: theme.textMuted }}>{c.label}</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: c.color, marginTop: '8px' }}>{c.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: theme.surface, borderRadius: '4px', border: `1px solid ${theme.border}`, padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: theme.primary }}>Status Breakdown Data</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: theme.bg, fontSize: '13px', color: theme.primary }}>
                <tr><th style={{padding:'12px'}}>Status</th><th style={{padding:'12px'}}>Count</th><th style={{padding:'12px'}}>Percentage</th></tr>
              </thead>
              <tbody>
                {['Pending', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled', 'Missed'].map(status => {
                  const count = filteredAppts.filter(a => a.status === status).length;
                  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
                  return (
                    <tr key={status} style={{ borderBottom: `1px solid ${theme.border}`, fontSize: '14px' }}>
                      <td style={{padding:'12px', fontWeight:'bold'}}>{status}</td>
                      <td style={{padding:'12px'}}>{count}</td>
                      <td style={{padding:'12px'}}>{pct}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSS สำหรับซ่อนเมนูเวลากด Print */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}