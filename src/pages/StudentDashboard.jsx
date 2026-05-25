import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { complaintApi, API_BASE_URL } from '../services/api';
import '../styles/global.css';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeProof, setActiveProof] = useState(null);
  const [proofLoadError, setProofLoadError] = useState(false);

  // Dynamic dashboard warning states for pending fees
  const [hasPendingFees, setHasPendingFees] = useState(false);
  const [pendingFeesAmount, setPendingFeesAmount] = useState(0);

  useEffect(() => {
    const checkFees = () => {
      try {
        const savedInvoices = localStorage.getItem('smart_hostel_invoices');
        if (savedInvoices && user?.name) {
          const invoicesList = JSON.parse(savedInvoices);
          const myPending = invoicesList.filter(
            inv => inv.studentName?.toLowerCase() === user.name?.toLowerCase() && inv.status === 'PENDING'
          );
          if (myPending.length > 0) {
            setHasPendingFees(true);
            const totalPending = myPending.reduce((sum, inv) => sum + inv.amount, 0);
            setPendingFeesAmount(totalPending);
          } else {
            setHasPendingFees(false);
          }
        }
      } catch (err) {
        console.error('Failed to load pending fees for dashboard alert:', err);
      }
    };

    checkFees();
    const interval = setInterval(checkFees, 1500); // Poll regularly to hide banner instantly on payment!
    return () => clearInterval(interval);
  }, [user]);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'WATER',
    priority: 'MEDIUM',
  });

  const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanBase = API_BASE_URL.replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    return `${cleanBase}/${cleanPath}`;
  };

  const isVideoFile = (path) => {
    if (!path) return false;
    return /\.(mp4|mov|webm|ogg|m4v)$/i.test(path);
  };

  // Fetch complaints
  const fetchComplaints = async () => {
    try {
      const res = await complaintApi.getMyComplaints();
      if (res.success && res.data) {
        setComplaints(res.data);
      }
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await complaintApi.createComplaint(formData);
      if (res.success && res.data) {
        let msg = 'Complaint lodged successfully! Rectors will be notified.';
        
        // Upload media file if a file has been selected
        if (selectedFile) {
          try {
            const uploadRes = await complaintApi.uploadComplaintAttachment(res.data.id, selectedFile);
            if (uploadRes.success) {
              msg = 'Complaint lodged and media proof uploaded successfully!';
            }
          } catch (uploadErr) {
            console.error('File upload failed:', uploadErr);
            msg = `Complaint lodged, but media upload failed: ${uploadErr.message || 'Server error'}`;
          }
        }

        setSuccessMsg(msg);
        setFormData({
          title: '',
          description: '',
          category: 'WATER',
          priority: 'MEDIUM',
        });
        setSelectedFile(null);
        // Reload history
        fetchComplaints();
      } else {
        setErrorMsg(res.message || 'Failed to submit complaint');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Could not lodge complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseComplaint = async (id) => {
    if (!window.confirm('Are you sure you want to mark this complaint as resolved and CLOSED?')) {
      return;
    }
    try {
      const targetComp = complaints.find(c => c.id === id);
      const res = await complaintApi.closeComplaint(id);
      if (res.success) {
        setComplaints((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: 'CLOSED' } : c))
        );

        // Add shared notification alert for the Rector
        try {
          const compTitle = targetComp ? targetComp.title : 'a complaint';
          const compBlock = user?.hostelBlock || (targetComp ? targetComp.hostelBlock : null);
          const studentNameStr = user?.name || 'A student';
          
          const savedNotifs = localStorage.getItem('smart_hostel_global_notifications');
          const notifList = savedNotifs ? JSON.parse(savedNotifs) : [];
          notifList.push({
            id: Date.now(),
            recipientRole: 'RECTOR',
            recipientName: '',
            message: `Student ${studentNameStr} has closed their ticket: "${compTitle}".`,
            block: compBlock,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString(),
            isRead: false,
          });
          localStorage.setItem('smart_hostel_global_notifications', JSON.stringify(notifList));
        } catch (notifErr) {
          console.error('Failed to dispatch close notification:', notifErr);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to close complaint');
    }
  };

  // Compile statistics from existing list
  const getStats = () => {
    const stats = { pending: 0, progress: 0, resolved: 0, total: complaints.length };
    complaints.forEach((c) => {
      if (c.status === 'PENDING') stats.pending += 1;
      else if (c.status === 'IN_PROGRESS' || c.status === 'ESCALATED') stats.progress += 1;
      else if (c.status === 'RESOLVED' || c.status === 'CLOSED') stats.resolved += 1;
    });
    return stats;
  };

  const stats = getStats();

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Welcome banner */}
      <div style={styles.welcomeBanner}>
        <div>
          <h1 style={styles.greet}>
            Welcome, {user?.name || 'Student'} 
            <svg style={{ marginLeft: '10px', display: 'inline-block', verticalAlign: 'middle' }} xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" /><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6" /><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8.5" /><path d="M6 13V11a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6a7 7 0 0 0 7 7h1a7 7 0 0 0 7-7v-6" /></svg>
          </h1>
          <p style={styles.subtitle}>Smart Hostel Management Console • Student Portal</p>
        </div>
        <div style={styles.blockInfo}>
          <span style={styles.blockLabel}>YOUR ASSIGNMENT</span>
          <h2 style={styles.blockValue}>{user?.hostelBlock || 'Unassigned'} • {user?.roomNumber || 'Room N/A'}</h2>
        </div>
      </div>

      {hasPendingFees && (
        <div style={{
          backgroundColor: 'var(--status-pending-bg)',
          color: 'var(--status-pending)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: '24px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'fadeIn 0.35s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Attention: You have outstanding fee invoices totaling <strong>₹{pendingFeesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> pending payment.</span>
          </div>
          <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '6px' }}>Settle in Room Fees</span>
        </div>
      )}

      {/* Grid for forms and metrics */}
      <div className="grid-3" style={{ marginBottom: '30px' }}>
        {/* Metric Card: Pending */}
        <div className="card" style={styles.metricCard}>
          <div style={{ ...styles.metricIcon, backgroundColor: '#fef3c7', color: '#d97706' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <div style={styles.metricLabel}>Pending Issues</div>
            <div style={styles.metricVal}>{stats.pending}</div>
          </div>
        </div>

        {/* Metric Card: In Progress */}
        <div className="card" style={styles.metricCard}>
          <div style={{ ...styles.metricIcon, backgroundColor: '#dbeafe', color: '#2563eb' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div>
            <div style={styles.metricLabel}>Under Rector Action</div>
            <div style={styles.metricVal}>{stats.progress}</div>
          </div>
        </div>

        {/* Metric Card: Resolved */}
        <div className="card" style={styles.metricCard}>
          <div style={{ ...styles.metricIcon, backgroundColor: '#d1fae5', color: '#059669' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div>
            <div style={styles.metricLabel}>Resolved / Closed</div>
            <div style={styles.metricVal}>{stats.resolved}</div>
          </div>
        </div>
      </div>

      <div className="grid-complaints-layout">
        {/* Lodging Form */}
        <div className="card" style={styles.formContainer}>
          <h3 style={styles.sectionHeading}>Lodge New Complaint</h3>
          <p style={styles.sectionSub}>State the issue clearly so that the rectory department can coordinate maintenance teams.</p>

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

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label>Issue Headline / Title</label>
              <input
                type="text"
                name="title"
                placeholder="e.g. Broken bathroom pipe, Wifi disconnected"
                required
                value={formData.title}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid-form-2col">
              <div style={styles.inputGroup}>
                <label>Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange} style={styles.select}>
                  <option value="WATER">Plumbing & Water</option>
                  <option value="ELECTRICAL">Electrical</option>
                  <option value="CLEANING">Cleanliness & Cleaning</option>
                  <option value="INTERNET">Internet</option>
                  <option value="FURNITURE">Furniture</option>
                  <option value="SECURITY">Security</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label>Priority</label>
                <select name="priority" value={formData.priority} onChange={handleInputChange} style={styles.select}>
                  <option value="LOW">Low (Non-critical)</option>
                  <option value="MEDIUM">Medium (Standard)</option>
                  <option value="HIGH">High (Immediate Action)</option>
                </select>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label>Detailed Description</label>
              <textarea
                name="description"
                rows="4"
                placeholder="Describe the exact location and symptoms of the issue..."
                required
                value={formData.description}
                onChange={handleInputChange}
                style={styles.textarea}
              />
            </div>

            <div style={styles.inputGroup}>
              <label>Upload Proof (Image / Video)</label>
              <div style={styles.fileUploadContainer}>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  style={styles.fileInput}
                  id="complaint-file"
                />
                <label htmlFor="complaint-file" style={{ ...styles.fileLabel, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/></svg>
                  <span>{selectedFile ? `Selected: ${selectedFile.name}` : 'Choose image or video proof...'}</span>
                </label>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    style={styles.clearFileBtn}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn btn-primary" style={styles.submitBtn}>
              {submitting ? 'Lodging Complaint...' : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center', width: '100%' }}>
                  Submit Maintenance Ticket
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Complaints History */}
        <div className="card" style={styles.historyContainer}>
          <h3 style={styles.sectionHeading}>My Complaint History</h3>
          <p style={styles.sectionSub}>View and track the live resolution status of your reported grievances.</p>

          {loading ? (
            <div style={styles.loadingInner}>Loading history...</div>
          ) : complaints.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <h4>All Clean & Operational</h4>
              <p>You have not filed any maintenance complaints yet. Your accommodation is in perfect standing.</p>
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Issue Title</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Priority</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Resolution Info</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => (
                    <tr key={c.id} style={styles.tr}>
                      <td style={styles.tdTitle}>
                        <div style={styles.titleCell}>{c.title}</div>
                        <div style={styles.dateCell}>{new Date(c.createdAt || Date.now()).toLocaleDateString()}</div>
                        {c.imageUrl && (
                          <div style={styles.mediaContainer}>
                            <button
                              onClick={() => {
                                setProofLoadError(false);
                                setActiveProof({
                                  url: getMediaUrl(c.imageUrl),
                                  isVideo: isVideoFile(c.imageUrl),
                                  title: c.title
                                });
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                color: 'var(--primary)',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                fontFamily: 'var(--font-body)',
                                outline: 'none'
                              }}
                              className="proof-badge-btn"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                              View Media Proof
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.tag}>{c.category}</span>
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
                            <strong>Rector:</strong> {c.resolutionNote}
                          </div>
                        ) : (
                          <span style={styles.noNote}>Pending inspection</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {c.status !== 'CLOSED' && c.status !== 'REJECTED' ? (
                          <button
                            onClick={() => handleCloseComplaint(c.id)}
                            className="btn btn-secondary"
                            style={styles.closeBtn}
                          >
                            Mark Closed
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Closed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Proof Overlay Modal */}
      {activeProof && (
        <div style={styles.modalOverlay} className="animate-fade-in">
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Proof of Complaint</h3>
                <p style={styles.modalSub}>File preview for: <strong>{activeProof.title}</strong></p>
              </div>
              <button style={styles.closeModalBtn} onClick={() => setActiveProof(null)}>✕</button>
            </div>
            
            <div style={styles.modalBody}>
              {proofLoadError ? (
                <div style={styles.errorPanel}>
                  <div style={styles.errorIcon}>⚠️</div>
                  <h4 style={styles.errorTitle}>Media Attachment Recycled</h4>
                  <p style={styles.errorDesc}>
                    This proof attachment was stored on Render's ephemeral filesystem and was cleared during a regular server idle restart.
                  </p>
                  <div style={styles.errorAdvisory}>
                    <strong>Status:</strong> Your grievance details and rector action history remain fully active! Only the temporary media proof was pruned.
                  </div>
                  <p style={styles.errorTechnical}>
                    Note: Render Free Tier instances undergo daily recycling. Configuring AWS S3 or Cloudinary is recommended for permanent media storage.
                  </p>
                </div>
              ) : activeProof.isVideo ? (
                <video
                  src={activeProof.url}
                  controls
                  autoPlay
                  style={styles.modalMediaVideo}
                  onError={() => setProofLoadError(true)}
                />
              ) : (
                <img
                  src={activeProof.url}
                  alt="Proof of complaint"
                  style={styles.modalMediaImage}
                  onError={() => setProofLoadError(true)}
                />
              )}
            </div>
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
  blockInfo: {
    backgroundColor: 'var(--primary-light)',
    border: '1px solid var(--accent-light)',
    padding: '12px 20px',
    borderRadius: 'var(--radius-md)',
    textAlign: 'right',
  },
  blockLabel: {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: '700',
    color: 'var(--primary)',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  blockValue: {
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
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.6fr',
    gap: '30px',
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: 'fit-content',
  },
  historyContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '400px',
  },
  sectionHeading: {
    fontSize: '1.2rem',
    color: 'var(--text-main)',
  },
  sectionSub: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  gridForm: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    color: 'var(--text-main)',
    backgroundColor: 'var(--bg-canvas)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    transition: 'var(--transition-smooth)',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    color: 'var(--text-main)',
    backgroundColor: 'var(--bg-canvas)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    resize: 'none',
    outline: 'none',
  },
  submitBtn: {
    marginTop: '8px',
    width: '100%',
  },
  loadingInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '40px 20px',
    flexGrow: 1,
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
  },
  tableWrapper: {
    overflowX: 'auto',
    marginTop: '10px',
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
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
    transition: 'var(--transition-smooth)',
  },
  tdTitle: {
    padding: '14px 16px',
  },
  titleCell: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  dateCell: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  td: {
    padding: '14px 16px',
    fontSize: '0.85rem',
    verticalAlign: 'middle',
  },
  tdNote: {
    padding: '14px 16px',
    fontSize: '0.8rem',
    verticalAlign: 'middle',
    maxWidth: '200px',
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
  tag: {
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
  closeBtn: {
    padding: '6px 12px',
    fontSize: '0.75rem',
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
  fileUploadContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '6px',
  },
  fileInput: {
    display: 'none',
  },
  fileLabel: {
    flexGrow: 1,
    padding: '10px 14px',
    fontSize: '0.9rem',
    backgroundColor: 'var(--bg-canvas)',
    color: 'var(--text-muted)',
    border: '1px dashed var(--border-color)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all var(--transition-smooth)',
  },
  clearFileBtn: {
    padding: '6px 12px',
    fontSize: '0.8rem',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
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
    width: '90%',
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
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modalMediaImage: {
    maxWidth: '100%',
    maxHeight: '300px',
    borderRadius: '8px',
    display: 'block',
    objectFit: 'contain',
    margin: '0 auto',
  },
  modalMediaVideo: {
    width: '100%',
    maxHeight: '300px',
    borderRadius: '8px',
    display: 'block',
    margin: '0 auto',
  },
  errorPanel: {
    backgroundColor: 'var(--status-rejected-bg)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    color: 'var(--text-main)',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: '2.5rem',
    marginBottom: '12px',
  },
  errorTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--status-rejected)',
    marginBottom: '8px',
  },
  errorDesc: {
    fontSize: '0.85rem',
    color: 'var(--text-main)',
    lineHeight: '1.45',
    marginBottom: '16px',
  },
  errorAdvisory: {
    backgroundColor: 'var(--bg-canvas)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px 14px',
    fontSize: '0.8rem',
    lineHeight: '1.4',
    marginBottom: '14px',
    textAlign: 'left',
    color: 'var(--text-main)',
  },
  errorTechnical: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    lineHeight: '1.35',
  },
};

export default StudentDashboard;
