import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { complaintApi, API_BASE_URL } from '../services/api';
import '../styles/global.css';

export const RectorDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);

  const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${API_BASE_URL}${path}`;
  };

  const isVideoFile = (path) => {
    if (!path) return false;
    return /\.(mp4|mov|webm|ogg|m4v)$/i.test(path);
  };
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [modalStatus, setModalStatus] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [actioning, setActioning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [proofLoadError, setProofLoadError] = useState(false);

  const fetchComplaints = async () => {
    try {
      const res = await complaintApi.getRectorComplaints();
      if (res.success && res.data) {
        setComplaints(res.data);
      }
    } catch (err) {
      console.error('Failed to load rector complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const openActionModal = (complaint) => {
    setActiveComplaint(complaint);
    setModalStatus(complaint.status);
    setResolutionNote(complaint.resolutionNote || '');
    setErrorMsg('');
    setSuccessMsg('');
    setProofLoadError(false);
  };

  const closeActionModal = () => {
    setActiveComplaint(null);
    setResolutionNote('');
    setModalStatus('');
    setProofLoadError(false);
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setActioning(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Update status if changed
      if (modalStatus !== activeComplaint.status) {
        await complaintApi.updateRectorStatus(activeComplaint.id, modalStatus);
      }

      // 2. Add resolution note if entered or updated
      if (resolutionNote.trim() !== (activeComplaint.resolutionNote || '')) {
        await complaintApi.addResolutionNote(activeComplaint.id, resolutionNote);
      }

      setSuccessMsg('Complaint actioned and student notified successfully!');
      
      // Update local state to reflect changes instantly
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === activeComplaint.id
            ? { ...c, status: modalStatus, resolutionNote: resolutionNote }
            : c
        )
      );

      // Add shared notification alert for the Student
      try {
        const studentNameStr = activeComplaint.studentName;
        const compTitle = activeComplaint.title || 'your complaint';
        const rectorNameStr = user?.name || 'Rector';
        
        const savedNotifs = localStorage.getItem('smart_hostel_global_notifications');
        const notifList = savedNotifs ? JSON.parse(savedNotifs) : [];
        notifList.push({
          id: Date.now(),
          recipientRole: 'STUDENT',
          recipientName: studentNameStr,
          message: `Rector ${rectorNameStr} updated your complaint "${compTitle}" status to ${modalStatus}. Note: ${resolutionNote || 'None'}`,
          block: user?.hostelBlock,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toLocaleDateString(),
          isRead: false,
        });
        localStorage.setItem('smart_hostel_global_notifications', JSON.stringify(notifList));
      } catch (notifErr) {
        console.error('Failed to dispatch action notification:', notifErr);
      }

      setTimeout(() => {
        closeActionModal();
      }, 1500);

    } catch (err) {
      setErrorMsg(err.message || 'Failed to update complaint action');
    } finally {
      setActioning(false);
    }
  };

  // Stats Compilation
  const getStats = () => {
    const stats = { total: complaints.length, pending: 0, active: 0, resolved: 0 };
    complaints.forEach((c) => {
      if (c.status === 'PENDING') stats.pending += 1;
      else if (c.status === 'IN_PROGRESS' || c.status === 'ESCALATED') stats.active += 1;
      else if (c.status === 'RESOLVED' || c.status === 'CLOSED') stats.resolved += 1;
    });
    return stats;
  };

  const stats = getStats();

  // Filter and Search Logic
  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    const matchesSearch =
      searchTerm.trim() === '' ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.studentName && c.studentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.roomNumber && c.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Rector welcome details */}
      <div style={styles.welcomeBanner}>
        <div>
          <h1 style={styles.greet}>
            Rectory Administration 
            <svg style={{ marginLeft: '10px', display: 'inline-block', verticalAlign: 'middle' }} xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" /><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6" /><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8.5" /><path d="M6 13V11a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6a7 7 0 0 0 7 7h1a7 7 0 0 0 7-7v-6" /></svg>
          </h1>
          <p style={styles.subtitle}>Welcome Rector {user?.name || 'Administrator'} • Active Hosteller Grievance Tracking</p>
        </div>
        <div style={styles.blockBadge}>
          <span style={styles.blockBadgeLabel}>YOUR ASSIGNED HOSTEL SECTOR</span>
          <h2 style={styles.blockBadgeVal}>{user?.hostelBlock || 'Global Admin'}</h2>
        </div>
      </div>

      {/* Analytics stats */}
      <div className="grid-3" style={{ marginBottom: '30px' }}>
        <div className="card" style={styles.metricCard}>
          <div style={{ ...styles.metricIcon, backgroundColor: '#fef3c7', color: '#d97706' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
          </div>
          <div>
            <div style={styles.metricLabel}>New Unresolved</div>
            <div style={styles.metricVal}>{stats.pending}</div>
          </div>
        </div>

        <div className="card" style={styles.metricCard}>
          <div style={{ ...styles.metricIcon, backgroundColor: '#dbeafe', color: '#2563eb' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          </div>
          <div>
            <div style={styles.metricLabel}>In Action / Escalated</div>
            <div style={styles.metricVal}>{stats.active}</div>
          </div>
        </div>

        <div className="card" style={styles.metricCard}>
          <div style={{ ...styles.metricIcon, backgroundColor: '#d1fae5', color: '#059669' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div>
            <div style={styles.metricLabel}>Resolved Block Grievances</div>
            <div style={styles.metricVal}>{stats.resolved}</div>
          </div>
        </div>
      </div>

      {/* Complaints Management Console */}
      <div className="card" style={styles.tableCard}>
        <div style={styles.tableHeaderControls} className="table-header-controls">
          <div>
            <h3 style={styles.tableTitle}>Block Complaint Registry</h3>
            <p style={styles.tableSubtitle}>Review, manage status transitions, and issue resolution instructions to maintenance units.</p>
          </div>

          <div style={styles.filtersWrapper} className="filters-wrapper">
            <input
              type="text"
              placeholder="Search by issue or student room..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
              <option value="ESCALATED">ESCALATED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingInner}>Loading block complaints...</div>
        ) : filteredComplaints.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <h4>No complaints found</h4>
            <p>Either all complaints are processed, or your search query did not yield any matches.</p>
          </div>
        ) : (
          <div style={styles.tableWrapper} className="table-wrapper">
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Student Information</th>
                  <th style={styles.th}>Grievance / Issue details</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Priority</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Rector Action Remarks</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((c) => (
                  <tr key={c.id} style={styles.tr}>
                    <td style={styles.tdStudent}>
                      <div style={styles.studentName}>{c.studentName || 'Student Hosteller'}</div>
                      <div style={styles.studentMeta}>Room {c.roomNumber || 'N/A'} • {c.studentPhone ? (c.studentPhone.length > 10 ? c.studentPhone.slice(-10) : c.studentPhone) : 'No Phone'}</div>
                    </td>
                    <td style={styles.tdDetails}>
                      <div style={styles.issueTitle}>{c.title}</div>
                      <p style={styles.issueDesc}>{c.description}</p>
                      <span style={styles.issueDate}>Filed: {new Date(c.createdAt || Date.now()).toLocaleDateString()}</span>
                      {c.imageUrl && (
                        <div style={{ marginTop: '8px' }}>
                          <button
                            onClick={() => openActionModal(c)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'rgba(15, 81, 50, 0.08)',
                              border: '1px solid rgba(15, 81, 50, 0.25)',
                              color: 'var(--primary)',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'var(--font-body)',
                              outline: 'none'
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                            View Media Proof
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.categoryBadge}>{c.category}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.priorityTag,
                        color: c.priority === 'HIGH' ? '#ef4444' : c.priority === 'MEDIUM' ? '#f59e0b' : '#3b82f6'
                      }}>
                        ● {c.priority}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span className={`badge badge-${c.status?.toLowerCase()}`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={styles.tdNote}>
                      {c.resolutionNote ? (
                        <div style={styles.noteBox}>
                          {c.resolutionNote}
                        </div>
                      ) : (
                        <span style={styles.noNote}>No instructions issued</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => openActionModal(c)}
                        className="btn btn-primary"
                        style={styles.actionBtn}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          Action Ticket
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Dialog / Modal */}
      {activeComplaint && (
        <div style={styles.modalOverlay} className="animate-fade-in">
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Action Complaint Ticket</h3>
                <p style={styles.modalSub}>Issue updates for: <strong>{activeComplaint.title}</strong></p>
              </div>
              <button style={styles.closeModalBtn} onClick={closeActionModal}>✕</button>
            </div>

            {successMsg && (
              <div style={styles.alertSuccess} className="animate-fade-in">
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div style={styles.alertError} className="animate-fade-in">
                {errorMsg}
              </div>
            )}

            {activeComplaint.imageUrl && (
              <div style={styles.modalMediaSection}>
                <span style={{ ...styles.modalMediaLabel, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  Uploaded Media Proof:
                </span>
                
                {proofLoadError ? (
                  <div style={{
                    backgroundColor: 'var(--status-rejected-bg)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>⚠️</div>
                    <strong style={{ color: 'var(--status-rejected)', display: 'block', marginBottom: '4px' }}>Media Proof Recycled</strong>
                    <span style={{ fontSize: '0.75rem', display: 'block', lineHeight: '1.3', color: 'var(--text-muted)' }}>
                      This file was stored on Render's ephemeral storage and was wiped out during an idle restart.
                      The complaint ticket itself is perfectly valid.
                    </span>
                  </div>
                ) : isVideoFile(activeComplaint.imageUrl) ? (
                  <video
                    src={getMediaUrl(activeComplaint.imageUrl)}
                    controls
                    style={styles.modalMediaVideo}
                    onError={() => setProofLoadError(true)}
                  />
                ) : (
                  <img
                    src={getMediaUrl(activeComplaint.imageUrl)}
                    alt="Proof"
                    style={styles.modalMediaImage}
                    onError={() => setProofLoadError(true)}
                  />
                )}
              </div>
            )}

            <form onSubmit={handleActionSubmit} style={styles.modalForm}>
              <div style={styles.inputGroup}>
                <label>Update Resolution Status</label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  style={styles.modalSelect}
                >
                  <option value="PENDING">PENDING (Reviewing)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Dispatched Support)</option>
                  <option value="RESOLVED">RESOLVED (Issue Solved)</option>
                  <option value="CLOSED">CLOSED (Archived by student)</option>
                  <option value="ESCALATED">ESCALATED (Requires Admin Action)</option>
                  <option value="REJECTED">REJECTED (Invalid request)</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label>Resolution Action Notes (Visible to Student)</label>
                <textarea
                  rows="4"
                  placeholder="e.g. Electrician visited the room and replaced the faulty switch plate..."
                  required
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  style={styles.modalTextarea}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeActionModal}
                  disabled={actioning}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actioning}
                >
                  {actioning ? 'Submitting Action...' : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: '100%' }}>
                      Save Resolution & Send Alert
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
  },
  welcomeBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    backgroundColor: 'var(--bg-card)',
    padding: '24px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-color)',
    flexWrap: 'wrap',
    gap: '16px',
  },
  greet: {
    fontSize: '1.75rem',
    color: 'var(--text-main)',
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    marginTop: '4px',
  },
  blockBadge: {
    backgroundColor: 'var(--primary-light)',
    border: '1px solid var(--accent-light)',
    padding: '12px 20px',
    borderRadius: 'var(--radius-md)',
    textAlign: 'right',
  },
  blockBadgeLabel: {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: '700',
    color: 'var(--primary)',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  blockBadgeVal: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--primary)',
  },
  metricCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '20px 24px',
  },
  metricIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    flexShrink: 0,
  },
  metricLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  metricVal: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.8rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    marginTop: '2px',
  },
  tableCard: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '450px',
  },
  tableHeaderControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  tableTitle: {
    fontSize: '1.25rem',
    color: 'var(--text-main)',
  },
  tableSubtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  filtersWrapper: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  searchInput: {
    width: '240px',
    padding: '8px 12px',
    fontSize: '0.85rem',
    color: 'var(--text-main)',
    backgroundColor: 'var(--bg-canvas)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
  },
  filterSelect: {
    width: '150px',
    padding: '8px 12px',
    fontSize: '0.85rem',
    color: 'var(--text-main)',
    backgroundColor: 'var(--bg-canvas)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
  },
  loadingInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '250px',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '60px 20px',
    flexGrow: 1,
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '12px 16px',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    borderBottom: '2px solid var(--border-color)',
    backgroundColor: 'var(--bg-canvas)',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
    transition: 'var(--transition-smooth)',
  },
  tdStudent: {
    padding: '14px 16px',
  },
  studentName: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  studentMeta: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  tdDetails: {
    padding: '14px 16px',
    maxWidth: '300px',
  },
  issueTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  issueDesc: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    lineHeight: '1.4',
    marginTop: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: '2',
    WebkitBoxOrient: 'vertical',
  },
  issueDate: {
    display: 'block',
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    marginTop: '6px',
  },
  td: {
    padding: '14px 16px',
    fontSize: '0.85rem',
    verticalAlign: 'middle',
  },
  categoryBadge: {
    fontSize: '0.75rem',
    fontWeight: '600',
    backgroundColor: 'var(--bg-canvas)',
    color: 'var(--text-muted)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  priorityTag: {
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  tdNote: {
    padding: '14px 16px',
    fontSize: '0.8rem',
    verticalAlign: 'middle',
    maxWidth: '220px',
  },
  noteBox: {
    backgroundColor: 'var(--bg-canvas)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '8px 10px',
    color: 'var(--text-main)',
    lineHeight: '1.3',
  },
  noNote: {
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  actionBtn: {
    padding: '6px 12px',
    fontSize: '0.75rem',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '100%',
    maxWidth: '500px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '30px',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border-color)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '16px',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '1.2rem',
    color: 'var(--text-main)',
  },
  modalSub: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  closeModalBtn: {
    border: 'none',
    background: 'none',
    fontSize: '1.2rem',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalSelect: {
    padding: '10px 12px',
    fontSize: '0.9rem',
    color: 'var(--text-main)',
    backgroundColor: 'var(--bg-canvas)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
  },
  modalTextarea: {
    padding: '10px 12px',
    fontSize: '0.9rem',
    resize: 'none',
    outline: 'none',
    color: 'var(--text-main)',
    backgroundColor: 'var(--bg-canvas)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '16px',
  },
  alertError: {
    backgroundColor: 'var(--status-rejected-bg)',
    color: 'var(--status-rejected)',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '16px',
  },
  alertSuccess: {
    backgroundColor: 'var(--status-resolved-bg)',
    color: 'var(--status-resolved)',
    border: '1px solid #a7f3d0',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '16px',
  },
  mediaContainer: {
    marginTop: '8px',
    border: '1px dashed var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: '4px',
    display: 'inline-block',
    backgroundColor: 'var(--bg-canvas)',
    transition: 'transform var(--transition-smooth)',
    cursor: 'pointer',
  },
  mediaImage: {
    maxWidth: '120px',
    maxHeight: '80px',
    borderRadius: '4px',
    objectFit: 'cover',
    display: 'block',
    transition: 'opacity var(--transition-smooth)',
  },
  mediaVideo: {
    maxWidth: '160px',
    maxHeight: '100px',
    borderRadius: '4px',
    display: 'block',
  },
  modalMediaSection: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'var(--bg-canvas)',
    border: '1px dashed var(--border-color)',
    borderRadius: 'var(--radius-md)',
  },
  modalMediaLabel: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    marginBottom: '8px',
  },
  modalMediaImage: {
    maxWidth: '100%',
    maxHeight: '160px',
    borderRadius: '4px',
    display: 'block',
    objectFit: 'contain',
    margin: '0 auto',
  },
  modalMediaVideo: {
    width: '100%',
    maxHeight: '180px',
    borderRadius: '4px',
    display: 'block',
    margin: '0 auto',
  },
};

export default RectorDashboard;
