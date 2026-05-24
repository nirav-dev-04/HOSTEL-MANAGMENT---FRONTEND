import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import webSocketService from '../services/websocket';
import '../styles/global.css';

// ==========================================
// Laundry Tracker View Component
// ==========================================
const LaundryTrackerView = ({ user }) => {
  const isStudent = user?.role === 'STUDENT';

  const [machines, setMachines] = useState(() => {
    const saved = localStorage.getItem('smart_hostel_laundry_machines');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Washer 1 (High Capacity)', status: 'BUSY', info: '12 mins remaining', color: 'var(--status-pending)' },
      { id: 2, name: 'Washer 2 (Standard)', status: 'AVAILABLE', info: 'Ready for use', color: 'var(--status-resolved)' },
      { id: 3, name: 'Washer 3 (Standard)', status: 'AVAILABLE', info: 'Ready for use', color: 'var(--status-resolved)' },
      { id: 4, name: 'Dryer 1 (Eco Temp)', status: 'BUSY', info: '28 mins remaining', color: 'var(--status-pending)' },
      { id: 5, name: 'Dryer 2 (High Heat)', status: 'AVAILABLE', info: 'Ready for use', color: 'var(--status-resolved)' },
    ];
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('smart_hostel_laundry_history');
    return saved ? JSON.parse(saved) : [
      { date: 'May 20, 2026', machine: 'Washer 1', slot: '10:00 AM - 11:00 AM', status: 'COMPLETED', color: 'var(--status-resolved)', studentName: 'archan', block: 'Block F', room: '103/3' },
      { date: 'May 18, 2026', machine: 'Dryer 2', slot: '02:30 PM - 03:30 PM', status: 'COMPLETED', color: 'var(--status-resolved)', studentName: 'archan', block: 'Block F', room: '103/3' },
      { date: 'May 14, 2026', machine: 'Washer 3', slot: '06:00 PM - 07:00 PM', status: 'COMPLETED', color: 'var(--status-resolved)', studentName: 'dhruv', block: 'Block B', room: '202' },
    ];
  });

  const [booked, setBooked] = useState(false);
  const [bookingData, setBookingData] = useState({ machineId: '2', slot: '04:00 PM - 05:00 PM' });

  useEffect(() => {
    localStorage.setItem('smart_hostel_laundry_machines', JSON.stringify(machines));
  }, [machines]);

  useEffect(() => {
    localStorage.setItem('smart_hostel_laundry_history', JSON.stringify(history));
  }, [history]);

  const handleBook = (e) => {
    e.preventDefault();
    const mId = parseInt(bookingData.machineId);
    const targetMachine = machines.find(m => m.id === mId);
    
    if (!targetMachine) return;
    if (targetMachine.status !== 'AVAILABLE') {
      alert('Selected laundry machine is currently busy or out of service! Please pick an available washer/dryer.');
      return;
    }

    // Set machine to BUSY
    setMachines(prev => prev.map(m => {
      if (m.id === mId) {
        return {
          ...m,
          status: 'BUSY',
          info: `Booked by ${user?.name || 'You'} (${bookingData.slot})`,
          color: 'var(--status-pending)'
        };
      }
      return m;
    }));

    // Add to history
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newLog = {
      date: todayStr,
      machine: targetMachine.name.split(' (')[0],
      slot: bookingData.slot,
      status: 'BOOKED',
      color: 'var(--status-progress)',
      studentName: user?.name || 'archan',
      block: user?.hostelBlock || 'Block F',
      room: user?.roomNumber || '103/3'
    };
    setHistory(prev => [newLog, ...prev]);

    setBooked(true);
    setTimeout(() => {
      setBooked(false);
    }, 5000);
  };

  const toggleMachineMaintenance = (mId) => {
    setMachines(prev => prev.map(m => {
      if (m.id === mId) {
        const isMaintenance = m.status === 'OUT_OF_SERVICE';
        return {
          ...m,
          status: isMaintenance ? 'AVAILABLE' : 'OUT_OF_SERVICE',
          info: isMaintenance ? 'Ready for use' : 'Under maintenance / repair',
          color: isMaintenance ? 'var(--status-resolved)' : 'var(--status-rejected)'
        };
      }
      return m;
    }));
  };

  const markMachineAvailable = (mId) => {
    setMachines(prev => prev.map(m => {
      if (m.id === mId) {
        return {
          ...m,
          status: 'AVAILABLE',
          info: 'Ready for use',
          color: 'var(--status-resolved)'
        };
      }
      return m;
    }));

    // Mark corresponding BOOKED entry in history as COMPLETED
    const target = machines.find(m => m.id === mId);
    if (target) {
      setHistory(prev => prev.map(log => {
        if (log.machine === target.name.split(' (')[0] && log.status === 'BOOKED') {
          return { ...log, status: 'COMPLETED', color: 'var(--status-resolved)' };
        }
        return log;
      }));
    }
  };

  // Filter history: Students only see their own history, Rectors see block bookings, Admins see the central ledger
  const studentBookings = isStudent
    ? history.filter(row => row.studentName === (user?.name || 'archan'))
    : user?.role === 'RECTOR'
      ? history.filter(row => row.block === user?.hostelBlock)
      : history; // Admin sees all

  // Telemetry counts
  const totalCount = machines.length;
  const availableCount = machines.filter(m => m.status === 'AVAILABLE').length;
  const busyCount = machines.filter(m => m.status === 'BUSY').length;
  const outOfServiceCount = machines.filter(m => m.status === 'OUT_OF_SERVICE').length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '6px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          Laundry Tracker & Schedule
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {isStudent 
            ? 'Real-time washing machine availability, schedule bookings, and wash cycle tracking.'
            : 'Centralized laundry command console. Toggle machine operations, monitor active cycles, and review the student ledger.'}
        </p>
      </div>

      {/* Telemetry Dashboard Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', backgroundColor: 'var(--primary-light)', borderRadius: '50%' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </span>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Machines</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>{totalCount}</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', backgroundColor: 'var(--status-resolved-bg)', borderRadius: '50%' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--status-resolved)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </span>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Ready</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--status-resolved)' }}>{availableCount}</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', backgroundColor: 'var(--status-pending-bg)', borderRadius: '50%' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--status-pending)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
          </span>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Cycles</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--status-pending)' }}>{busyCount}</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', backgroundColor: 'var(--status-rejected-bg)', borderRadius: '50%' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--status-rejected)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </span>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Out of Service</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--status-rejected)' }}>{outOfServiceCount}</div>
          </div>
        </div>
      </div>

      {booked && (
        <div style={{
          backgroundColor: 'var(--status-resolved-bg)',
          color: 'var(--status-resolved)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Success! Machine booked successfully for {bookingData.slot}. Your booking has been recorded.
        </div>
      )}

      {isStudent ? (
        /* ================= STUDENT INTERFACE ================= */
        <>
          <div className="grid-2">
            {/* Machine Statuses */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Active Laundry Machines</h2>
              
              {machines.map(machine => (
                <div key={machine.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-canvas)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{machine.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{machine.info}</div>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#fff',
                    backgroundColor: machine.color,
                    padding: '4px 10px',
                    borderRadius: '999px'
                  }}>{machine.status}</span>
                </div>
              ))}
            </div>

            {/* Booking Form */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Schedule a Wash Cycle</h2>
              <form onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Select Machine</label>
                  <select 
                    value={bookingData.machineId} 
                    onChange={(e) => setBookingData(prev => ({ ...prev, machineId: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
                  >
                    {machines.map(m => (
                      <option key={m.id} value={m.id} disabled={m.status !== 'AVAILABLE'}>
                        {m.name} {m.status === 'AVAILABLE' ? '— (AVAILABLE)' : `— (${m.status})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Select Time Slot</label>
                  <select 
                    value={bookingData.slot} 
                    onChange={(e) => setBookingData(prev => ({ ...prev, slot: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
                  >
                    <option value="08:00 AM - 09:00 AM">08:00 AM - 09:00 AM</option>
                    <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                    <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                    <option value="11:00 AM - 12:00 PM">11:00 AM - 12:00 PM</option>
                    <option value="01:00 PM - 02:00 PM">01:00 PM - 02:00 PM</option>
                    <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
                    <option value="03:00 PM - 04:00 PM">03:00 PM - 04:00 PM</option>
                    <option value="04:00 PM - 05:00 PM">04:00 PM - 05:00 PM</option>
                    <option value="05:00 PM - 06:00 PM">05:00 PM - 06:00 PM</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ padding: '12px', marginTop: '10px', fontWeight: 700 }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    Book Slot 
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* Student Laundry Log */}
          <div className="card">
            <h2 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '16px' }}>Your Laundry History</h2>
            {studentBookings.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '24px 0' }}>No laundry bookings registered under your account yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px' }}>DATE</th>
                    <th style={{ padding: '12px' }}>MACHINE</th>
                    <th style={{ padding: '12px' }}>TIME SLOT</th>
                    <th style={{ padding: '12px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {studentBookings.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                      <td style={{ padding: '12px' }}>{row.date}</td>
                      <td style={{ padding: '12px' }}>{row.machine}</td>
                      <td style={{ padding: '12px' }}>{row.slot}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: row.color,
                          backgroundColor: row.status === 'COMPLETED' ? 'var(--status-resolved-bg)' : 'var(--status-progress-bg)',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        /* ================= RECTOR / ADMIN INTERFACE ================= */
        <>
          <div className="grid-2">
            {/* Machine Operations */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Global Machine Operations</h2>
              
              {machines.map(machine => (
                <div key={machine.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-canvas)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{machine.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{machine.info}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#fff',
                      backgroundColor: machine.color,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      marginRight: '4px'
                    }}>{machine.status}</span>
                    
                    {/* Operation Action Buttons (Strictly restricted to Rector!) */}
                    {user?.role === 'RECTOR' && (
                      <>
                        {machine.status === 'BUSY' && (
                          <button 
                            onClick={() => markMachineAvailable(machine.id)}
                            className="btn"
                            style={{ padding: '4px 8px', fontSize: '0.7rem', backgroundColor: 'var(--status-resolved-bg)', color: 'var(--status-resolved)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              Free 
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                          </button>
                        )}

                        <button 
                          onClick={() => toggleMachineMaintenance(machine.id)}
                          className="btn"
                          style={{ 
                            padding: '4px 8px', 
                            fontSize: '0.7rem', 
                            backgroundColor: machine.status === 'OUT_OF_SERVICE' ? 'var(--status-resolved-bg)' : 'var(--status-rejected-bg)', 
                            color: machine.status === 'OUT_OF_SERVICE' ? 'var(--status-resolved)' : 'var(--status-rejected)', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {machine.status === 'OUT_OF_SERVICE' ? 'Enable' : 'Service'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Admin Stats Overview Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
              <h2 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Laundry Analytics Panel</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Washing machines and dryers are currently operating in <strong>{user?.hostelBlock || 'All Blocks'}</strong>. 
                  {user?.role === 'RECTOR' 
                    ? 'Rectors have write authority to release busy slots and toggle machine service parameters.'
                    : 'System Administrators have read-only access to view bookings and global loads across all blocks. Operational parameters can only be toggled by Block Rectors.'}
                </p>
                <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reservations Today</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
                      {history.filter(h => h.status === 'BOOKED').length} Cycles
                    </div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>System Load</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-pending)', marginTop: '4px' }}>
                      {Math.round((busyCount / totalCount) * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Central Ledger */}
          <div className="card">
            <h2 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '16px' }}>Central Laundry Reservation Ledger</h2>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '24px 0' }}>No reservations logged in the database yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px' }}>DATE</th>
                    <th style={{ padding: '12px' }}>STUDENT NAME</th>
                    <th style={{ padding: '12px' }}>BLOCK & ROOM</th>
                    <th style={{ padding: '12px' }}>MACHINE</th>
                    <th style={{ padding: '12px' }}>TIME SLOT</th>
                    <th style={{ padding: '12px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{row.date}</td>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--primary)' }}>{row.studentName || 'Archan'}</td>
                      <td style={{ padding: '12px', color: 'var(--text-main)' }}>
                        <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px' }}>
                          {row.block || 'Block F'} — {row.room || '103/3'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-main)' }}>{row.machine}</td>
                      <td style={{ padding: '12px', color: 'var(--text-main)' }}>{row.slot}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: row.color,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: row.status === 'COMPLETED' ? 'var(--status-resolved-bg)' : 'var(--status-progress-bg)'
                        }}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ==========================================
// Mess Menu View Component
// ==========================================
const MessMenuView = ({ user }) => {
  const isStudent = user?.role === 'STUDENT';
  const [activeDay, setActiveDay] = useState('Monday');
  
  // Persisted menu data
  const [menu, setMenu] = useState(() => {
    const saved = localStorage.getItem('smart_hostel_mess_menu');
    return saved ? JSON.parse(saved) : {
      Monday: {
        breakfast: 'Masala Dosa, Sambhar, Coconut Chutney, Banana, Tea/Coffee',
        lunch: 'Paneer Butter Masala, Dal Makhani, Butter Roti, Basmati Rice, Salad, Gulab Jamun',
        highTea: 'Veg Samosa, Mint Chutney, Tea/Coffee',
        dinner: 'Jeera Rice, Yellow Dal Fry, Tandoori Roti, Aloo Gobi, Papad, Curd'
      },
      Tuesday: {
        breakfast: 'Idli, Vada, Sambhar, Chutney, Apple, Milk/Tea',
        lunch: 'Chole Bhature, Veg Pulao, Raita, Salad, Pickle, Kheer',
        highTea: 'Veg Sandwich, Tomato Ketchup, Tea/Coffee',
        dinner: 'Matar Paneer, Mix Veg, Roti, Rice, Tomato Soup'
      },
      Wednesday: {
        breakfast: 'Poha, Sev, Jalebi, Sprouts, Banana, Tea/Coffee',
        lunch: 'Veg Biryani, Salan, Onion Raita, Roomali Roti, Mix Veg Kofta, Sweet Lassi',
        highTea: 'Aloo Bonda, Green Sauce, Tea',
        dinner: 'Dal Tadka, Sev Tomato Sabzi, Chapati, Steamed Rice, Butter Milk'
      },
      Thursday: {
        breakfast: 'Aloo Paratha, Butter, Curd, Fruit Juice, Tea/Coffee',
        lunch: 'Rajma Chawal, Kadhi Pakora, Jeera Roti, Mix Salad, Boondi Raita, Ice Cream',
        highTea: 'Dhokla, Chili, Green Chutney, Tea',
        dinner: 'Bhindi Masala, Dal Fry, Phulka Roti, Rice, Tomato Salad'
      },
      Friday: {
        breakfast: 'Upma, Coconut Chutney, Eggs/Fruit Cup, Tea/Coffee',
        lunch: 'Kadhai Paneer, Dal Double Tadka, Naan, Veg Pulao, Papad, Shrikhand',
        highTea: 'Bread Pakoda, Sweet Chutney, Tea/Coffee',
        dinner: 'Baingan Bharta, Gujarati Dal, Rotla/Roti, Rice, Cucumber Raita'
      },
      Saturday: {
        breakfast: 'Uttapam, Sambhar, Chutney, Fresh Fruits, Tea/Coffee',
        lunch: 'Veg Hakka Noodles, Manchurian Gravy, Fried Rice, Spring Roll, Kimchi Salad',
        highTea: 'Kachori, Sweet Sauce, Tea/Coffee',
        dinner: 'Khichdi, Kadhi, Aloo Fry, Papad, Garlic Chutney'
      },
      Sunday: {
        breakfast: 'Chole Kulche, Pickle, Fruit Salad, Milk/Tea/Coffee',
        lunch: 'Shahi Paneer, Veg Kofta, Garlic Naan, Rice, Sweet Boondi, Ice Cream',
        highTea: 'Hot Veg Puff, Chili Sauce, Tea/Coffee',
        dinner: 'Paneer Biryani, Veg Raita, Laccha Onion, Rabri'
      }
    };
  });

  // Persisted dining feedback votes per day
  const [votes, setVotes] = useState(() => {
    const saved = localStorage.getItem('smart_hostel_mess_votes');
    return saved ? JSON.parse(saved) : {
      Monday: { liked: 0, disliked: 0, votedUsers: {} },
      Tuesday: { liked: 0, disliked: 0, votedUsers: {} },
      Wednesday: { liked: 0, disliked: 0, votedUsers: {} },
      Thursday: { liked: 0, disliked: 0, votedUsers: {} },
      Friday: { liked: 0, disliked: 0, votedUsers: {} },
      Saturday: { liked: 0, disliked: 0, votedUsers: {} },
      Sunday: { liked: 0, disliked: 0, votedUsers: {} }
    };
  });

  // Persisted tracked meals prefixed by student name
  const [trackedMeals, setTrackedMeals] = useState([]);

  // Load user-specific tracked meals when user context updates
  useEffect(() => {
    const keyName = user?.name ? `smart_hostel_tracked_meals_${user.name}` : 'smart_hostel_tracked_meals';
    const saved = localStorage.getItem(keyName);
    setTrackedMeals(saved ? JSON.parse(saved) : []);
  }, [user]);

  // Menu Approval States per day
  const [approvals, setApprovals] = useState(() => {
    const saved = localStorage.getItem('smart_hostel_mess_approvals');
    return saved ? JSON.parse(saved) : {
      Monday: 'APPROVED',
      Tuesday: 'APPROVED',
      Wednesday: 'APPROVED',
      Thursday: 'APPROVED',
      Friday: 'APPROVED',
      Saturday: 'APPROVED',
      Sunday: 'APPROVED'
    };
  });

  // Dynamic Editor State
  const [editorData, setEditorData] = useState({
    breakfast: '',
    lunch: '',
    highTea: '',
    dinner: ''
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync menu state to editor state when day changes
  useEffect(() => {
    if (menu[activeDay]) {
      setEditorData({
        breakfast: menu[activeDay].breakfast,
        lunch: menu[activeDay].lunch,
        highTea: menu[activeDay].highTea,
        dinner: menu[activeDay].dinner
      });
    }
  }, [activeDay, menu]);

  useEffect(() => {
    localStorage.setItem('smart_hostel_mess_menu', JSON.stringify(menu));
  }, [menu]);

  useEffect(() => {
    localStorage.setItem('smart_hostel_mess_votes', JSON.stringify(votes));
  }, [votes]);

  // Sync tracked meals per student
  useEffect(() => {
    if (user?.name) {
      const keyName = `smart_hostel_tracked_meals_${user.name}`;
      localStorage.setItem(keyName, JSON.stringify(trackedMeals));
    }
  }, [trackedMeals, user]);

  useEffect(() => {
    localStorage.setItem('smart_hostel_mess_approvals', JSON.stringify(approvals));
  }, [approvals]);

  const mealNutrition = {
    breakfast: { cal: 500, prot: 18, carbs: 65 },
    lunch: { cal: 950, prot: 38, carbs: 120 },
    highTea: { cal: 300, prot: 7, carbs: 40 },
    dinner: { cal: 700, prot: 22, carbs: 90 }
  };

  // Calculate totals dynamically for the active day
  const getDailyTotals = () => {
    let cal = 0;
    let prot = 0;
    let carbs = 0;
    trackedMeals.forEach(key => {
      const [day, mealType] = key.split('-');
      if (day === activeDay && mealNutrition[mealType]) {
        cal += mealNutrition[mealType].cal;
        prot += mealNutrition[mealType].prot;
        carbs += mealNutrition[mealType].carbs;
      }
    });
    return { cal, prot, carbs };
  };

  const { cal: currentCal, prot: currentProt, carbs: currentCarbs } = getDailyTotals();
  const calPercent = Math.min(100, Math.round((currentCal / 2450) * 100));
  const protPercent = Math.min(100, Math.round((currentProt / 85) * 100));
  const carbsPercent = Math.min(100, Math.round((currentCarbs / 300) * 100)); // Target: 300g

  const toggleMealTrack = (mealType) => {
    const key = `${activeDay}-${mealType}`;
    setTrackedMeals(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      const keyName = user?.name ? `smart_hostel_tracked_meals_${user.name}` : 'smart_hostel_tracked_meals';
      localStorage.setItem(keyName, JSON.stringify(next));
      return next;
    });
  };

  const handleVote = (type) => {
    const studentName = user?.name || 'archan';
    const dayVotes = votes[activeDay];
    const votedUsers = dayVotes.votedUsers || {};
    
    if (votedUsers[studentName]) return; // Already voted!
    
    setVotes(prev => {
      const nextDayVotes = {
        ...prev[activeDay],
        liked: type === 'up' ? (prev[activeDay].liked || 0) + 1 : (prev[activeDay].liked || 0),
        disliked: type === 'down' ? (prev[activeDay].disliked || 0) + 1 : (prev[activeDay].disliked || 0),
        votedUsers: {
          ...votedUsers,
          [studentName]: type
        }
      };
      
      const next = {
        ...prev,
        [activeDay]: nextDayVotes
      };
      
      localStorage.setItem('smart_hostel_mess_votes', JSON.stringify(next));
      return next;
    });
  };

  const handleSaveMenu = (e) => {
    e.preventDefault();
    setMenu(prev => ({
      ...prev,
      [activeDay]: {
        breakfast: editorData.breakfast,
        lunch: editorData.lunch,
        highTea: editorData.highTea,
        dinner: editorData.dinner
      }
    }));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const handleApprovalChange = (day, status) => {
    setApprovals(prev => ({
      ...prev,
      [day]: status
    }));
  };

  const activeDayVotes = votes[activeDay] || { liked: 0, disliked: 0, votedUsers: {} };
  const studentName = user?.name || 'archan';
  const userVote = (activeDayVotes?.votedUsers && activeDayVotes.votedUsers[studentName]) || null;
  const satisfactionRate = activeDayVotes.liked + activeDayVotes.disliked > 0
    ? Math.round((activeDayVotes.liked / (activeDayVotes.liked + activeDayVotes.disliked)) * 100)
    : 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '6px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
            Premium Dining Hall Menu
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isStudent 
              ? 'Weekly meal schedule, nutritional information, and interactive dining feedback.'
              : 'Gourmet Dining Command Console & Weekly Menu Editor. Modify daily menus, approve plans, and view feedback.'}
          </p>
        </div>
        
        {/* Status Indicator for Rectors / Admins */}
        {!isStudent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>APPROVAL STATUS:</span>
            <select
              value={approvals[activeDay]}
              onChange={(e) => handleApprovalChange(activeDay, e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: approvals[activeDay] === 'APPROVED' ? 'var(--status-resolved-bg)' : approvals[activeDay] === 'UNDER_REVIEW' ? 'var(--status-progress-bg)' : 'var(--status-pending-bg)',
                color: approvals[activeDay] === 'APPROVED' ? 'var(--status-resolved)' : approvals[activeDay] === 'UNDER_REVIEW' ? 'var(--status-progress)' : 'var(--text-main)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              <option value="APPROVED">● APPROVED & PUBLISHED</option>
              <option value="UNDER_REVIEW">◓ UNDER REVIEW</option>
              <option value="DRAFT">○ DRAFT MODE</option>
            </select>
          </div>
        )}
      </div>

      {/* Weekday Switch Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '8px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {Object.keys(menu).map(day => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            style={{
              padding: '10px 18px',
              background: activeDay === day ? 'var(--primary)' : 'var(--bg-card)',
              color: activeDay === day ? '#fff' : 'var(--text-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontFamily: 'var(--font-body)',
              fontWeight: activeDay === day ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            {day} {approvals[day] !== 'APPROVED' && <span style={{ color: 'var(--status-progress)', marginLeft: '4px' }}>●</span>}
          </button>
        ))}
      </div>

      {saveSuccess && (
        <div style={{
          backgroundColor: 'var(--status-resolved-bg)',
          color: 'var(--status-resolved)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Success! The menu for <strong>{activeDay}</strong> has been updated and published to the Student Dashboards.
        </div>
      )}

      {isStudent ? (
        /* ================= STUDENT MENU INTERFACE ================= */
        <div className="grid-2-1-responsive">
          {/* Active Day Menu Details */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.3rem' }}>{activeDay}'s Gourmet Meal Plan</h2>
              <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, padding: '4px 10px', borderRadius: '4px' }}>100% VEG</span>
            </div>

            {[
              { key: 'breakfast', meal: 'Breakfast', time: '07:30 AM - 09:30 AM', content: menu[activeDay]?.breakfast, icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>
              ) },
              { key: 'lunch', meal: 'Premium Lunch', time: '12:30 PM - 02:30 PM', content: menu[activeDay]?.lunch, icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
              ) },
              { key: 'highTea', meal: 'High Tea', time: '05:00 PM - 06:15 PM', content: menu[activeDay]?.highTea, icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/></svg>
              ) },
              { key: 'dinner', meal: 'Dinner Buffet', time: '07:30 PM - 09:45 PM', content: menu[activeDay]?.dinner, icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M7 10h10"/><path d="M12 2v4"/><path d="M8 3v3"/><path d="M16 3v3"/></svg>
              ) },
            ].map((meal) => {
              const isTracked = trackedMeals.includes(`${activeDay}-${meal.key}`);
              return (
                <div key={meal.key} style={{
                  padding: '16px',
                  backgroundColor: 'var(--bg-canvas)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>{meal.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{meal.meal}</h3>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        {meal.time}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px', lineHeight: '1.4' }}>{meal.content || 'Not scheduled yet.'}</p>
                    
                    {/* Track Meal Action */}    
                    {/* Track Meal Action */}
                    <button 
                      onClick={() => toggleMealTrack(meal.key)}
                      className="btn"
                      style={{
                        marginTop: '10px',
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        alignSelf: 'flex-start',
                        backgroundColor: isTracked ? 'var(--status-resolved-bg)' : 'var(--bg-card)',
                        color: isTracked ? 'var(--status-resolved)' : 'var(--text-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        fontWeight: 600
                      }}
                    >
                      {isTracked ? 'Tracked in Diary' : 'Track Meal'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nutritional & Dining Feedback */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Nutrition Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>Nutritional Overview ({activeDay})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span>Daily Calories Tracked</span>
                    <span style={{ fontWeight: 'bold' }}>{currentCal} / 2,450 kcal</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${calPercent}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span>Protein Intake</span>
                    <span style={{ fontWeight: 'bold' }}>{currentProt}g / 85g</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${protPercent}%`, height: '100%', backgroundColor: 'var(--status-progress)', borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span>Carbs Intake</span>
                    <span style={{ fontWeight: 'bold' }}>{currentCarbs}g / 300g</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${carbsPercent}%`, height: '100%', backgroundColor: 'var(--status-pending)', borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--status-progress-bg)', color: 'var(--status-progress)', fontWeight: 600, padding: '4px 8px', borderRadius: '4px' }}>High Fiber</span>
                  <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--status-resolved-bg)', color: 'var(--status-resolved)', fontWeight: 600, padding: '4px 8px', borderRadius: '4px' }}>Nut-Free</span>
                </div>
              </div>
                  {/* Feedback Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>Rate {activeDay}'s Menu</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Help our chef optimize the daily meal plans by providing quick feedback.</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-around', margin: '14px 0' }}>
                <button 
                  onClick={() => handleVote('up')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    background: userVote === 'up' ? 'var(--primary-light)' : 'none',
                    border: '1px solid var(--border-color)',
                    padding: '12px 18px',
                    borderRadius: '12px',
                    cursor: userVote ? 'not-allowed' : 'pointer',
                    width: '90px',
                    transition: 'all 0.2s ease',
                    color: 'var(--text-main)'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--primary)' }}>{activeDayVotes.liked}</span>
                </button>
 
                <button 
                  onClick={() => handleVote('down')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    background: userVote === 'down' ? 'var(--status-rejected-bg)' : 'none',
                    border: '1px solid var(--border-color)',
                    padding: '12px 18px',
                    borderRadius: '12px',
                    cursor: userVote ? 'not-allowed' : 'pointer',
                    width: '90px',
                    transition: 'all 0.2s ease',
                    color: 'var(--text-main)'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm12-3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--status-rejected)' }}>{activeDayVotes.disliked}</span>
                </button>
              </div>
              {userVote && <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>Thank you! Your feedback for {activeDay} has been recorded.</p>}
            </div>        </div>
          </div>
        </div>
      ) : (
        /* ================= RECTOR / ADMIN MENU EDITOR INTERFACE ================= */
        <div className="grid-2-1-responsive">
          {/* Menu Editor Form */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Edit Menu Plan: {activeDay}</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Select weekdays above to change day</span>
            </div>

            <form onSubmit={handleSaveMenu} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>
                  Breakfast Menu (07:30 AM - 09:30 AM)
                </label>
                <textarea
                  value={editorData.breakfast}
                  onChange={(e) => setEditorData(prev => ({ ...prev, breakfast: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)', resize: 'vertical', fontSize: '0.85rem', fontFamily: 'inherit' }}
                  placeholder="e.g. Masala Dosa, Chutney, Sambhar, Milk/Tea..."
                  required
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
                  Lunch Menu (12:30 PM - 02:30 PM)
                </label>
                <textarea
                  value={editorData.lunch}
                  onChange={(e) => setEditorData(prev => ({ ...prev, lunch: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)', resize: 'vertical', fontSize: '0.85rem', fontFamily: 'inherit' }}
                  placeholder="e.g. Roti, Rice, Paneer Gravy, Dal Tadka..."
                  required
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                  High Tea Menu (05:00 PM - 06:15 PM)
                </label>
                <textarea
                  value={editorData.highTea}
                  onChange={(e) => setEditorData(prev => ({ ...prev, highTea: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)', resize: 'vertical', fontSize: '0.85rem', fontFamily: 'inherit' }}
                  placeholder="e.g. Veg Samosa, Green Tea, Biscuits..."
                  required
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M7 10h10"/><path d="M12 2v4"/><path d="M8 3v3"/><path d="M16 3v3"/></svg>
                  Dinner Buffet Menu (07:30 PM - 09:45 PM)
                </label>
                <textarea
                  value={editorData.dinner}
                  onChange={(e) => setEditorData(prev => ({ ...prev, dinner: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)', resize: 'vertical', fontSize: '0.85rem', fontFamily: 'inherit' }}
                  placeholder="e.g. Veg Biryani, Phulka, Butter Roti, Kheer..."
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '12px', fontWeight: 700, marginTop: '10px' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  Save & Publish Menu Plan
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </span>
              </button>
            </form>
          </div>

          {/* Feedback & Hall Stats Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Satisfaction Card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>Student Satisfaction Score</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', margin: '10px 0' }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  border: '6px solid var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: 'var(--primary)',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.15)'
                }}>
                  {satisfactionRate}%
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dining Approval Index</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Likes Received</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                    {activeDayVotes.liked}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dislikes</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '1.2rem', fontWeight: 700, color: 'var(--status-rejected)', marginTop: '2px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm12-3h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
                    {activeDayVotes.disliked}
                  </div>
                </div>
              </div>
            </div>

            {/* Dining Operations Metrics */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>Dining Hall Telemetry</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Dailies Registered:</span>
                  <strong style={{ color: 'var(--text-main)' }}>580 Students</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Kitchen Load Limit:</span>
                  <strong style={{ color: 'var(--text-main)' }}>850 Meals/day</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Dietary Exemption:</span>
                  <strong style={{ color: 'var(--status-progress)' }}>14 (Gluten-free)</strong>
                </div>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }}></div>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5.5 5.5 0 0 0 12.5 2.5a5.5 5.5 0 0 0-5.5 5.5c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                <span><em>Updates to the menu are immediate. Students will receive a live browser notification if changes are published while they are logged in.</em></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};;

// ==========================================
// Room Fees View Component
// ==========================================
const RoomFeesView = ({ user, invoices, setInvoices }) => {
  const isStudent = user?.role === 'STUDENT';
  
  const getHostelRentForBlock = (blockName) => {
    if (!blockName) return 55000;
    const cleanBlock = blockName.trim().replace('Block ', '').toUpperCase();
    if (cleanBlock === 'A' || cleanBlock === 'B' || cleanBlock === 'C') return 55000;
    if (cleanBlock === 'D') return 54000;
    if (cleanBlock === 'E') return 70000;
    if (cleanBlock === 'F') return 110000;
    return 55000; // default/fallback
  };

  const [payModal, setPayModal] = useState(false);
  const [activeInv, setActiveInv] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });
  const [payError, setPayError] = useState('');

  // Admin filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const handlePayClick = (invoice) => {
    setActiveInv(invoice);
    setPayError('');
    setPayModal(true);
  };

  const handlePaySubmit = (e) => {
    e.preventDefault();
    setPayError('');

    const cleanCard = cardDetails.number.replace(/\s+/g, '');
    if (!/^\d{10,19}$/.test(cleanCard)) {
      setPayError('Card number must be between 10 and 19 digits and contain only numbers.');
      return;
    }

    const expiryMatch = cardDetails.expiry.trim().match(/^(0[1-9]|1[0-2])\/([0-9]{2})$/);
    if (!expiryMatch) {
      setPayError('Expiry date must be in MM/YY format.');
      return;
    }
    const expMonth = parseInt(expiryMatch[1], 10);
    const expYear = parseInt('20' + expiryMatch[2], 10);
    
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      setPayError('Card has expired. Please use a valid future expiry date.');
      return;
    }

    if (!/^\d{3}$/.test(cardDetails.cvv.trim())) {
      setPayError('CVV must be exactly 3 numeric digits.');
      return;
    }

    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setPaidSuccess(true);
      
      // Update invoice status globally
      setInvoices(prev => prev.map(inv => {
        if (inv.id === activeInv.id) {
          return { ...inv, status: 'PAID', dueDate: 'Settled' };
        }
        return inv;
      }));

      // Add shared confirmation notification for the Rector
      try {
        const savedNotifs = localStorage.getItem('smart_hostel_global_notifications');
        const notifList = savedNotifs ? JSON.parse(savedNotifs) : [];
        notifList.push({
          id: Date.now() + 2,
          recipientRole: 'RECTOR',
          recipientName: '',
          message: `FEE CLEARANCE ALERT: Student "${user?.name || 'Student'}" paid invoice #${activeInv.id} ("${activeInv.item}") of ₹${activeInv.amount} successfully.`,
          block: user?.hostelBlock || activeInv.block,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toLocaleDateString(),
          isRead: false,
        });
        localStorage.setItem('smart_hostel_global_notifications', JSON.stringify(notifList));
      } catch (err) {
        console.error('Failed to save payment success alert:', err);
      }

      setTimeout(() => {
        setPayModal(false);
        setPaidSuccess(false);
        setActiveInv(null);
        setCardDetails({ number: '', expiry: '', cvv: '' });
      }, 2500);
    }, 1800);
  };

  // Helper action: Record cash or manual payment (Admin only)
  const handleManualPayment = (invoiceId) => {
    if (window.confirm(`Are you sure you want to manually mark Invoice ${invoiceId} as PAID?`)) {
      setInvoices(prev => prev.map(inv => {
        if (inv.id === invoiceId) {
          return { ...inv, status: 'PAID', dueDate: 'Settled (Manual)' };
        }
        return inv;
      }));
      alert(`Manual payment settled successfully for Invoice ${invoiceId}.`);
    }
  };

  // Helper action: Refund payment (Admin only)
  const handleRefund = (invoiceId) => {
    if (window.confirm(`Mark Invoice ${invoiceId} as UNPAID and issue a refund record?`)) {
      setInvoices(prev => prev.map(inv => {
        if (inv.id === invoiceId) {
          return { ...inv, status: 'PENDING', dueDate: 'June 15, 2026' };
        }
        return inv;
      }));
      alert(`Invoice ${invoiceId} refunded successfully and returned to PENDING.`);
    }
  };

  // Helper action: Send invoice reminder
  const handleSendReminder = (invoice) => {
    try {
      const saved = localStorage.getItem('smart_hostel_global_notifications');
      const list = saved ? JSON.parse(saved) : [];
      list.push({
        id: Date.now(),
        recipientRole: 'STUDENT',
        recipientName: invoice.studentName,
        message: `URGENT FEE REMINDER: Rector/Admin ${user?.name || 'Staff'} has issued an alert for pending invoice #${invoice.id} ("${invoice.item}") of ₹${invoice.amount}. Please pay before ${invoice.dueDate}.`,
        block: invoice.block,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(),
        isRead: false,
      });
      localStorage.setItem('smart_hostel_global_notifications', JSON.stringify(list));
      alert(`Secure payment reminder successfully dispatched to student "${invoice.studentName}" (${invoice.studentEmail}) for Invoice ${invoice.id}.`);
    } catch (err) {
      console.error('Failed to dispatch payment reminder alert:', err);
    }
  };

  // Dynamically map invoices with adjusted amounts based on block
  const adjustedInvoices = invoices.map(inv => {
    if (inv.item.includes('Accommodation Rent')) {
      const amount = getHostelRentForBlock(inv.block);
      return { ...inv, amount };
    }
    return inv;
  });

  // Calculations for Student Invoices (Archan's view)
  const studentInvoices = adjustedInvoices.filter(inv => inv.studentName === (user?.name || 'archan'));
  const pendingAmount = studentInvoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + i.amount, 0);
  const paidAmount = studentInvoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0);

  // Calculations for Admin / Rector collection totals with block isolation for Rector
  const rectorBlock = user?.role === 'RECTOR' ? user?.hostelBlock : null;
  const blockIsolatedInvoices = adjustedInvoices.filter(inv => {
    if (rectorBlock) {
      const allowedBlocks = rectorBlock.split(',').map(b => b.trim());
      return allowedBlocks.includes(inv.block);
    }
    return true; // Admin sees all
  });

  const totalCollectedAdmin = blockIsolatedInvoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.amount, 0);
  const totalOutstandingAdmin = blockIsolatedInvoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + i.amount, 0);
  const totalInvoicedAdmin = totalCollectedAdmin + totalOutstandingAdmin;
  const collectionRateAdmin = totalInvoicedAdmin > 0 ? Math.round((totalCollectedAdmin / totalInvoicedAdmin) * 100) : 100;

  // Filtered invoices for Admin/Rector table with block isolation for Rector
  const filteredInvoices = blockIsolatedInvoices.filter(inv => {
    const matchesSearch = inv.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.block.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // SVG Icons for clean billing visuals (no emojis)
  const FeeIcons = {
    pending: (
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backgroundColor: 'var(--status-pending-bg)', borderRadius: '50%' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--status-pending)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </span>
    ),
    paid: (
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backgroundColor: 'var(--primary-light)', borderRadius: '50%' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </span>
    ),
    calendar: (
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backgroundColor: 'var(--status-progress-bg)', borderRadius: '50%' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--status-progress)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </span>
    ),
    collected: (
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backgroundColor: 'var(--primary-light)', borderRadius: '50%' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="10" x2="12" y2="10"/><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </span>
    ),
    outstanding: (
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backgroundColor: 'var(--status-pending-bg)', borderRadius: '50%' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--status-pending)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
      </span>
    ),
    rate: (
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backgroundColor: 'var(--status-progress-bg)', borderRadius: '50%' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--status-progress)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
      </span>
    )
  };

  if (isStudent) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '6px' }}>Secure Room Fee Payments</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage tuition accommodations, active invoices, paid logs, and secure online checkouts.</p>
        </div>

        {/* Fee Cards Summary */}
        <div className="grid-auto-cards">
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {FeeIcons.pending}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending Hostel Fee</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-pending)' }}>₹{pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {FeeIcons.paid}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paid Accommodation (YTD)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary)' }}>₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {FeeIcons.calendar}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payment Due Date</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: 'var(--text-main)' }}>June 15, 2026</div>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--text-main)' }}>Outstanding Semester Invoices</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {studentInvoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No invoices found registered under your student account.</div>
            ) : (
              studentInvoices.map((inv) => (
                <div key={inv.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div style={{ flex: '1 1 250px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{inv.id}</span>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '2px', color: 'var(--text-main)', lineHeight: '1.4' }}>{inv.item}</h4>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'flex-end', flex: '1 1 auto' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>₹{inv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: inv.status === 'PAID' ? 'var(--status-resolved-bg)' : 'var(--status-pending-bg)',
                      color: inv.status === 'PAID' ? 'var(--status-resolved)' : 'var(--status-pending)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap'
                    }}>{inv.status}</span>
                    {inv.status === 'PENDING' && (
                      <button className="btn btn-primary" onClick={() => handlePayClick(inv)} style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Pay Now
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Gateway Modal */}
        {payModal && activeInv && (
          <div style={{
            position: 'fixed',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999
          }}>
            <div className="card" style={{ width: '420px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', backgroundColor: 'var(--bg-card)' }}>
              <button 
                onClick={() => { setPayModal(false); setActiveInv(null); }}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              
              <h2 style={{ fontSize: '1.3rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--text-main)' }}>Hostel Payment Gateway</h2>
              
              {paidSuccess ? (
                <div style={{ textAlign: 'center', padding: '30px 0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--status-resolved-bg)', color: 'var(--status-resolved)', marginBottom: '8px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </div>
                  <h3 style={{ color: 'var(--primary)', fontSize: '1.4rem', fontWeight: 700 }}>Payment Successful!</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', padding: '0 10px' }}>Invoice #{activeInv.id} settled. Your room assignment is fully secured for Semester 2.</p>
                </div>
              ) : (
                <form onSubmit={handlePaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--bg-canvas)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Amount to Pay:</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--primary)' }}>₹{activeInv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </div>

                  <div>
                    <label>Card Number</label>
                    <input 
                      type="text" 
                      placeholder="4111 2222 3333 4444" 
                      required 
                      value={cardDetails.number}
                      onChange={(e) => setCardDetails(prev => ({ ...prev, number: e.target.value }))}
                    />
                  </div>

                  <div className="grid-2" style={{ gap: '12px' }}>
                    <div>
                      <label>Expiry Date</label>
                      <input 
                        type="text" 
                        placeholder="MM/YY" 
                        required 
                        value={cardDetails.expiry}
                        onChange={(e) => setCardDetails(prev => ({ ...prev, expiry: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label>CVV / CVC</label>
                      <input 
                        type="password" 
                        placeholder="•••" 
                        maxLength="3" 
                        required 
                        value={cardDetails.cvv}
                        onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value }))}
                      />
                    </div>
                  </div>

                  {payError && (
                    <div style={{
                      backgroundColor: 'var(--status-rejected-bg)',
                      color: 'var(--status-rejected)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border: '1px solid var(--status-rejected)',
                      marginBottom: '10px'
                    }}>
                      {payError}
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" disabled={paying} style={{ padding: '12px', marginTop: '10px', fontWeight: 700 }}>
                    {paying ? 'Processing Securely...' : (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        Confirm Payment ₹{activeInv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      </span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Admin & Rector Room Fees Dashboard Panel
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', color: 'var(--primary)', marginBottom: '6px' }}>Hostel Fee Collection & Financial Panel</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Monitor collection statistics, review outstanding balances, and record manual cash/bank payments.</p>
      </div>

      {/* Admin Fee Cards Summary */}
      <div className="grid-auto-cards">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {FeeIcons.collected}
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Collected Fees</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary)' }}>₹{totalCollectedAdmin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {FeeIcons.outstanding}
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Outstanding Balance</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-pending)' }}>₹{totalOutstandingAdmin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {FeeIcons.rate}
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Collection Rate</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-progress)' }}>{collectionRateAdmin}%</div>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>Student Invoice Ledger</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Verify block assignments and manage financial clearance records.</p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Search student, block..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '200px', padding: '8px 12px', fontSize: '0.8rem' }}
            />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '130px', padding: '8px 12px', fontSize: '0.8rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Only</option>
              <option value="PAID">Paid Only</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', minWidth: '750px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px' }}>STUDENT</th>
              <th style={{ padding: '12px 16px' }}>SECTOR/ROOM</th>
              <th style={{ padding: '12px 16px' }}>INVOICE DETAILS</th>
              <th style={{ padding: '12px 16px' }}>AMOUNT</th>
              <th style={{ padding: '12px 16px' }}>STATUS</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No invoices matched the search criteria.</td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', textTransform: 'capitalize' }}>{inv.studentName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.studentEmail}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-main)', fontWeight: 500 }}>
                    <div>{inv.block}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Room {inv.room}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-main)' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{inv.id}</span>
                    <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>{inv.item}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    ₹{inv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: inv.status === 'PAID' ? 'var(--status-resolved-bg)' : 'var(--status-pending-bg)',
                      color: inv.status === 'PAID' ? 'var(--status-resolved)' : 'var(--status-pending)',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}>{inv.status}</span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      {inv.status === 'PENDING' ? (
                        <>
                          <button 
                            onClick={() => handleManualPayment(inv.id)} 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.75rem', backgroundColor: 'var(--status-resolved-bg)', color: 'var(--status-resolved)', border: 'none', fontWeight: 600 }}
                          >
                            Mark Paid
                          </button>
                          <button 
                            onClick={() => handleSendReminder(inv)} 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            Remind
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleRefund(inv.id)} 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.75rem', backgroundColor: 'var(--status-rejected-bg)', color: 'var(--status-rejected)', border: 'none', fontWeight: 600 }}
                          >
                            Refund
                          </button>
                          <button 
                            onClick={() => alert(`Downloading invoice receipt for ${inv.studentName}...`)} 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            Receipt
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [activeSubFeature, setActiveSubFeature] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // trigger initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isStudent = user?.role === 'STUDENT';

  const getHostelRentForBlock = (blockName) => {
    if (!blockName) return 55000;
    const cleanBlock = blockName.trim().replace('Block ', '').toUpperCase();
    if (cleanBlock === 'A' || cleanBlock === 'B' || cleanBlock === 'C') return 55000;
    if (cleanBlock === 'D') return 54000;
    if (cleanBlock === 'E') return 70000;
    if (cleanBlock === 'F') return 110000;
    return 55000; // default/fallback
  };

  // Lifted financial ledger invoices state to ensure dynamic cross-screen updates immediately upon login
  const [invoices, setInvoices] = useState(() => {
    const saved = localStorage.getItem('smart_hostel_invoices');
    if (saved) return JSON.parse(saved);

    return [
      { id: 'INV-83742', item: 'Hostel Accommodation Rent (Semester 2)', amount: 110000, status: 'PENDING', dueDate: 'June 15, 2026', studentName: 'archan', studentEmail: 'archan@gmail.com', block: 'Block F', room: '103/3' },
      { id: 'INV-72948', item: 'Mess & Dining Food Card Service (Semester 1)', amount: 12000, status: 'PAID', dueDate: 'Expired', studentName: 'archan', studentEmail: 'archan@gmail.com', block: 'Block F', room: '103/3' },
      { id: 'INV-51109', item: 'Refundable Security & Damage Deposit', amount: 10000, status: 'PAID', dueDate: 'Expired', studentName: 'archan', studentEmail: 'archan@gmail.com', block: 'Block F', room: '103/3' },
      { id: 'INV-10928', item: 'Hostel Accommodation Rent (Semester 2)', amount: 55000, status: 'PENDING', dueDate: 'June 15, 2026', studentName: 'kunj', studentEmail: 'kunj@gmail.com', block: 'Block B', room: 'Unassigned' },
      { id: 'INV-90231', item: 'Mess & Dining Food Card Service (Semester 2)', amount: 12000, status: 'PAID', dueDate: 'Expired', studentName: 'dhruv', studentEmail: 'dhruv@gmail.com', block: 'Block F', room: 'Unassigned' }
    ];
  });

  // Local storage invoice sync
  useEffect(() => {
    localStorage.setItem('smart_hostel_invoices', JSON.stringify(invoices));
  }, [invoices]);

  // Dynamically generate invoices for newly registered/logged-in students and auto-sync student blocks instantly
  useEffect(() => {
    if (isStudent && user?.name) {
      const studentNameLower = user.name.toLowerCase();
      const myInvoices = invoices.filter(inv => inv.studentName?.toLowerCase() === studentNameLower);
      
      if (myInvoices.length > 0) {
        // Self-healing synchronization: Ensure invoice block and room match the student's current registered credentials
        const needsSync = myInvoices.some(inv => {
          const blockMismatch = user.hostelBlock && inv.block !== user.hostelBlock;
          const roomMismatch = user.roomNumber && inv.room !== user.roomNumber;
          return blockMismatch || roomMismatch;
        });

        if (needsSync) {
          setInvoices(prev => {
            const next = prev.map(inv => {
              if (inv.studentName?.toLowerCase() === studentNameLower) {
                return {
                  ...inv,
                  block: user.hostelBlock || inv.block,
                  room: user.roomNumber || inv.room,
                  amount: inv.item.includes('Accommodation Rent') && user.hostelBlock ? getHostelRentForBlock(user.hostelBlock) : inv.amount
                };
              }
              return inv;
            });
            localStorage.setItem('smart_hostel_invoices', JSON.stringify(next));
            return next;
          });
        }
      } else {
        const rentAmount = getHostelRentForBlock(user.hostelBlock);
        const newInvoices = [
          {
            id: `INV-${Math.floor(10000 + Math.random() * 90000)}`,
            item: 'Hostel Accommodation Rent (Semester 2)',
            amount: rentAmount,
            status: 'PENDING',
            dueDate: 'June 15, 2026',
            studentName: user.name,
            studentEmail: user.email || `${user.name.toLowerCase()}@university.edu`,
            block: user.hostelBlock || 'Block A',
            room: user.roomNumber || 'Room 1'
          },
          {
            id: `INV-${Math.floor(10000 + Math.random() * 90000)}`,
            item: 'Mess & Dining Food Card Service (Semester 2)',
            amount: 12000,
            status: 'PENDING',
            dueDate: 'June 15, 2026',
            studentName: user.name,
            studentEmail: user.email || `${user.name.toLowerCase()}@university.edu`,
            block: user.hostelBlock || 'Block A',
            room: user.roomNumber || 'Room 1'
          },
          {
            id: `INV-${Math.floor(10000 + Math.random() * 90000)}`,
            item: 'Refundable Security & Damage Deposit',
            amount: 10000,
            status: 'PENDING',
            dueDate: 'June 15, 2026',
            studentName: user.name,
            studentEmail: user.email || `${user.name.toLowerCase()}@university.edu`,
            block: user.hostelBlock || 'Block A',
            room: user.roomNumber || 'Room 1'
          }
        ];
        
        setInvoices(prev => {
          const next = [...prev, ...newInvoices];
          localStorage.setItem('smart_hostel_invoices', JSON.stringify(next));
          return next;
        });

        // Dispatch welcome fee alert to notifications
        try {
          const savedNotifs = localStorage.getItem('smart_hostel_global_notifications');
          const notifList = savedNotifs ? JSON.parse(savedNotifs) : [];
          notifList.push({
            id: Date.now(),
            recipientRole: 'STUDENT',
            recipientName: user.name,
            message: `WELCOME: Invoices for Semester 2 have been generated for you. Please check the "Room Fees" tab to settle your outstanding accommodation rent and dining card bills.`,
            block: user.hostelBlock,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString(),
            isRead: false,
          });
          localStorage.setItem('smart_hostel_global_notifications', JSON.stringify(notifList));
        } catch (err) {
          console.error('Failed to save welcome fee notification:', err);
        }
      }
    }
  }, [isStudent, user, invoices]);
  
  // Theme Management
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  // Real-time notifications state backed by localStorage
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // Load and sync notifications globally
  useEffect(() => {
    if (!user) return;
    
    const loadNotifications = () => {
      try {
        const saved = localStorage.getItem('smart_hostel_global_notifications');
        const allNotifs = saved ? JSON.parse(saved) : [];
        
        // Filter notifications for this user
        const myNotifs = allNotifs.filter(n => {
          if (user.role === 'STUDENT') {
            return n.recipientRole === 'STUDENT' && n.recipientName?.toLowerCase() === user.name?.toLowerCase();
          }
          if (user.role === 'RECTOR') {
            // Rector notifications: Match block (or empty block / general)
            return n.recipientRole === 'RECTOR' && (!n.block || n.block === user.hostelBlock || (user.hostelBlock && user.hostelBlock.split(', ').includes(n.block)));
          }
          if (user.role === 'ADMIN') {
            return n.recipientRole === 'ADMIN';
          }
          return false;
        });
        
        // Sort by id descending (most recent first)
        myNotifs.sort((a, b) => b.id - a.id);
        
        setNotifications(myNotifs);
        setUnreadCount(myNotifs.filter(n => !n.isRead).length);
      } catch (err) {
        console.error('Failed to sync global notifications:', err);
      }
    };

    loadNotifications();
    
    // Listen to storage events (instant cross-tab updates)
    const handleStorageChange = (e) => {
      if (e.key === 'smart_hostel_global_notifications') {
        loadNotifications();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(loadNotifications, 1000); // 1-second sync polling for same tab/page mutations
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [user]);

  // Subscribe to real-time WebSockets on component mount for live connection capability
  useEffect(() => {
    if (user?.id) {
      webSocketService.connect(user.id);
      
      const unsubscribe = webSocketService.subscribe((data) => {
        // Automatically save live alerts to global registry
        try {
          const saved = localStorage.getItem('smart_hostel_global_notifications');
          const allNotifs = saved ? JSON.parse(saved) : [];
          allNotifs.push({
            id: Date.now(),
            recipientRole: user.role,
            recipientName: user.role === 'STUDENT' ? user.name : '',
            message: data.message || 'Real-time update received.',
            block: user.role === 'RECTOR' ? user.hostelBlock : null,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString(),
            isRead: false,
          });
          localStorage.setItem('smart_hostel_global_notifications', JSON.stringify(allNotifs));
        } catch (err) {
          console.error('WebSocket alert storage failed:', err);
        }
      });

      return () => {
        unsubscribe();
        webSocketService.disconnect();
      };
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && user) {
      // Mark my notifications as read in localStorage
      try {
        const saved = localStorage.getItem('smart_hostel_global_notifications');
        if (saved) {
          let allNotifs = JSON.parse(saved);
          let changed = false;
          allNotifs = allNotifs.map(n => {
            let isMine = false;
            if (user.role === 'STUDENT') {
              isMine = n.recipientRole === 'STUDENT' && n.recipientName?.toLowerCase() === user.name?.toLowerCase();
            } else if (user.role === 'RECTOR') {
              isMine = n.recipientRole === 'RECTOR' && (!n.block || n.block === user.hostelBlock || (user.hostelBlock && user.hostelBlock.split(', ').includes(n.block)));
            } else if (user.role === 'ADMIN') {
              isMine = n.recipientRole === 'ADMIN';
            }
            if (isMine && !n.isRead) {
              changed = true;
              return { ...n, isRead: true };
            }
            return n;
          });
          if (changed) {
            localStorage.setItem('smart_hostel_global_notifications', JSON.stringify(allNotifs));
          }
        }
      } catch (err) {
        console.error('Failed to mark notifications as read:', err);
      }
      setUnreadCount(0); // clear count on open
    }
  };

  const handleClearNotifications = () => {
    if (!user) return;
    try {
      const saved = localStorage.getItem('smart_hostel_global_notifications');
      if (!saved) return;
      let allNotifs = JSON.parse(saved);
      
      // Filter out only my notifications
      allNotifs = allNotifs.filter(n => {
        if (user.role === 'STUDENT') {
          return !(n.recipientRole === 'STUDENT' && n.recipientName?.toLowerCase() === user.name?.toLowerCase());
        }
        if (user.role === 'RECTOR') {
          return !(n.recipientRole === 'RECTOR' && (!n.block || n.block === user.hostelBlock || (user.hostelBlock && user.hostelBlock.split(', ').includes(n.block))));
        }
        if (user.role === 'ADMIN') {
          return !(n.recipientRole === 'ADMIN');
        }
        return true;
      });
      
      localStorage.setItem('smart_hostel_global_notifications', JSON.stringify(allNotifs));
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  // Restrict navigation elements strictly to backend-supported modules
  const getNavLinks = () => {
    const dashboardIcon = (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>
    );
    const profileIcon = (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    );
    const complaintsIcon = (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
    );
    const consoleIcon = (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    );

    switch (user?.role) {
      case 'STUDENT':
        return [
          { path: '/student/dashboard', label: 'My Dashboard', icon: dashboardIcon },
          { path: '/student/profile', label: 'My Profile', icon: profileIcon },
        ];
      case 'RECTOR':
        return [
          { path: '/rector/complaints', label: 'Assigned Complaints', icon: complaintsIcon },
          { path: '/rector/profile', label: 'My Profile', icon: profileIcon },
        ];
      case 'ADMIN':
        return [
          { path: '/admin/console', label: 'Admin Dashboard', icon: consoleIcon },
          { path: '/admin/profile', label: 'Admin Profile', icon: profileIcon },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <div style={styles.dashboardContainer}>
      {/* Sidebar Container */}
      <aside style={{
        ...styles.sidebar,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-260px)',
        width: sidebarOpen ? '260px' : '0px',
      }}>
        <div style={styles.brandContainer}>
          <div style={styles.brandIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </div>
          <div style={styles.brandText}>
            <span style={styles.brandTitle}>SmartHostel</span>
            <span style={styles.brandSubtitle}>Management System</span>
          </div>
        </div>

        <nav style={styles.navMenu}>
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path && !activeSubFeature;
            return (
              <button
                key={link.path}
                onClick={() => {
                  setActiveSubFeature(null);
                  navigate(link.path);
                  if (isMobile) setSidebarOpen(false);
                }}
                style={{
                  ...styles.navItem,
                  backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: isActive ? '700' : '500',
                }}
              >
                <span style={styles.navIcon}>{link.icon}</span>
                <span>{link.label}</span>
              </button>
            );
          })}

          <div style={styles.divider}></div>

          {/* Active Interactive Sub-Features */}
          <div style={styles.comingSoonHeader}>INTEGRATED SERVICES</div>
          
          <button
            onClick={() => {
              setActiveSubFeature('laundry');
              if (isMobile) setSidebarOpen(false);
            }}
            style={{
              ...styles.navItem,
              backgroundColor: activeSubFeature === 'laundry' ? 'var(--primary-light)' : 'transparent',
              color: activeSubFeature === 'laundry' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeSubFeature === 'laundry' ? '700' : '500',
              border: 'none',
              marginTop: '4px',
            }}
          >
            <span style={styles.navIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
            </span>
            <span>Laundry Tracker</span>
          </button>

          <button
            onClick={() => {
              setActiveSubFeature('mess');
              if (isMobile) setSidebarOpen(false);
            }}
            style={{
              ...styles.navItem,
              backgroundColor: activeSubFeature === 'mess' ? 'var(--primary-light)' : 'transparent',
              color: activeSubFeature === 'mess' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeSubFeature === 'mess' ? '700' : '500',
              border: 'none',
              marginTop: '4px',
            }}
          >
            <span style={styles.navIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18V6a4 4 0 0 1 8 0v12" /><path d="M3 18h18" /><path d="M6 18h12" /><path d="M9 18v3" /><path d="M15 18v3" /></svg>
            </span>
            <span>Mess Menu</span>
          </button>

          <button
            onClick={() => {
              setActiveSubFeature('fees');
              if (isMobile) setSidebarOpen(false);
            }}
            style={{
              ...styles.navItem,
              backgroundColor: activeSubFeature === 'fees' ? 'var(--primary-light)' : 'transparent',
              color: activeSubFeature === 'fees' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeSubFeature === 'fees' ? '700' : '500',
              border: 'none',
              marginTop: '4px',
            }}
          >
            <span style={styles.navIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
            </span>
            <span>Room Fees</span>
          </button>
        </nav>

        <div style={styles.userFooter}>
          <div style={styles.avatarMini}>{user?.name?.charAt(0) || 'U'}</div>
          <div style={styles.userFooterInfo}>
            <div style={styles.userFooterName}>{user?.name}</div>
            <div style={styles.userFooterRole}>{user?.role}</div>
          </div>
        </div>
      </aside>

      {/* Main Panel Area */}
      <div style={{
        ...styles.mainPanel,
        marginLeft: isMobile ? '0px' : (sidebarOpen ? '260px' : '0px'),
      }}>
        {/* Header bar */}
        <header style={styles.header}>
          <button style={styles.toggleBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              <span>{sidebarOpen ? 'Collapse' : 'Expand'}</span>
            </span>
          </button>

          <div style={styles.headerRight}>
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.1rem',
                transition: 'all 0.2s ease',
                color: 'var(--text-main)',
              }}
              title="Toggle Light/Dark Theme"
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              )}
            </button>

            {/* Real-time Notifications Bell */}
            <div style={styles.notificationsWrapper}>
              <button style={styles.notificationBtn} onClick={toggleNotifications}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                {unreadCount > 0 && <span style={styles.badgeCount}>{unreadCount}</span>}
              </button>

              {showNotifications && (
                <div style={styles.notificationsDropdown}>
                  <div style={styles.dropdownHeader}>
                    <span>Real-time Notifications</span>
                    <button style={styles.clearBtn} onClick={handleClearNotifications}>Clear</button>
                  </div>
                  <div style={styles.dropdownList}>
                    {notifications.length === 0 ? (
                      <div style={styles.emptyNotifications}>
                        No recent updates received. Live alerts will trigger here.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} style={styles.notificationCard}>
                          <div style={styles.notificationDot}></div>
                          <div style={styles.notificationContent}>
                            <p style={styles.notificationMsg}>{notif.message}</p>
                            <span style={styles.notificationTime}>{notif.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout controls */}
            <button style={styles.logoutBtn} onClick={handleLogout}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Content Wrapper */}
        <main style={styles.content}>
          {activeSubFeature === 'laundry' ? <LaundryTrackerView user={user} /> :
           activeSubFeature === 'mess' ? <MessMenuView user={user} /> :
           activeSubFeature === 'fees' ? <RoomFeesView user={user} invoices={invoices} setInvoices={setInvoices} /> :
           children}
        </main>
      </div>
    </div>
  );
};

const styles = {
  dashboardContainer: {
    display: 'flex',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-canvas)',
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'var(--transition-smooth)',
    zIndex: 100,
  },
  brandContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 20px',
    borderBottom: '1px solid var(--border-color)',
  },
  brandIcon: {
    fontSize: '1.5rem',
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column',
  },
  brandTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.15rem',
    fontWeight: 700,
    color: 'var(--primary)',
  },
  brandSubtitle: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  navMenu: {
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexGrow: 1,
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    width: '100%',
    textAlign: 'left',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    width: '100%',
    textAlign: 'left',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
  },
  navIcon: {
    fontSize: '1.1rem',
  },
  divider: {
    height: '1px',
    backgroundColor: 'var(--border-color)',
    margin: '16px 0',
  },
  comingSoonHeader: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: '0.05em',
    padding: '0 16px 8px 16px',
  },
  comingSoonItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    fontSize: '0.85rem',
    color: '#94a3b8',
    borderRadius: 'var(--radius-md)',
  },
  comingSoonBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    padding: '2px 6px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid #cbd5e1',
  },
  userFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    borderTop: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-canvas)',
  },
  avatarMini: {
    width: '38px',
    height: '38px',
    backgroundColor: 'var(--primary)',
    color: '#fff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '1rem',
  },
  userFooterInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userFooterName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-main)',
  },
  userFooterRole: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  mainPanel: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0, // prevents flex item blowout
    transition: 'var(--transition-smooth)',
  },
  header: {
    height: '65px',
    backgroundColor: 'var(--bg-sidebar)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 90,
  },
  toggleBtn: {
    border: 'none',
    background: 'none',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--primary)',
    cursor: 'pointer',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  notificationsWrapper: {
    position: 'relative',
  },
  notificationBtn: {
    position: 'relative',
    background: 'var(--bg-canvas)',
    border: '1px solid var(--border-color)',
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition-smooth)',
    color: 'var(--text-main)',
  },
  badgeCount: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '0.65rem',
    fontWeight: '700',
    borderRadius: '50%',
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #ffffff',
  },
  notificationsDropdown: {
    position: 'absolute',
    top: '48px',
    right: 0,
    width: '320px',
    backgroundColor: 'var(--bg-sidebar)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 200,
    overflow: 'hidden',
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: 'var(--bg-canvas)',
    borderBottom: '1px solid var(--border-color)',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  clearBtn: {
    border: 'none',
    background: 'none',
    color: '#3b82f6',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  dropdownList: {
    maxHeight: '250px',
    overflowY: 'auto',
  },
  emptyNotifications: {
    padding: '24px 16px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
  },
  notificationCard: {
    display: 'flex',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color)',
    transition: 'var(--transition-smooth)',
  },
  notificationDot: {
    width: '8px',
    height: '8px',
    backgroundColor: 'var(--primary)',
    borderRadius: '50%',
    marginTop: '6px',
    flexShrink: 0,
  },
  notificationContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  notificationMsg: {
    fontSize: '0.8rem',
    color: 'var(--text-main)',
    lineHeight: '1.25',
  },
  notificationTime: {
    fontSize: '0.7rem',
    color: '#94a3b8',
  },
  logoutBtn: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 14px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#ef4444',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'var(--transition-smooth)',
  },
  content: {
    flexGrow: 1,
    padding: '30px',
    overflowY: 'auto',
  },
};
export default DashboardLayout;
