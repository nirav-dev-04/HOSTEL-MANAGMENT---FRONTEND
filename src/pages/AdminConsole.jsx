import React, { useState, useEffect } from 'react';
import { adminApi, API_BASE_URL } from '../services/api';
import '../styles/global.css';

export const AdminConsole = () => {
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'complaints'
  
  // User Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Complaint Filters
  const [complaintSearch, setComplaintSearch] = useState('');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('ALL');

  const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${API_BASE_URL}${path}`;
  };

  const isVideoFile = (path) => {
    if (!path) return false;
    return /\.(mp4|mov|webm|ogg|m4v)$/i.test(path);
  };

  // Rector Assignment Modal State
  const [activeComplaintForAssign, setActiveComplaintForAssign] = useState(null);
  const [selectedRectorId, setSelectedRectorId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [modalSuccessMsg, setModalSuccessMsg] = useState('');
  const [modalErrorMsg, setModalErrorMsg] = useState('');
  const [proofLoadError, setProofLoadError] = useState(false);

  const openAssignModal = (complaint) => {
    setActiveComplaintForAssign(complaint);
    setSelectedRectorId(complaint.rectorId || '');
    setModalSuccessMsg('');
    setModalErrorMsg('');
    setProofLoadError(false);
  };

  const closeAssignModal = () => {
    setActiveComplaintForAssign(null);
    setSelectedRectorId('');
    setProofLoadError(false);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRectorId) {
      setModalErrorMsg('Please select a Rector first');
      return;
    }

    setAssigning(true);
    setModalSuccessMsg('');
    setModalErrorMsg('');

    try {
      const res = await adminApi.assignRector(activeComplaintForAssign.id, Number(selectedRectorId));
      if (res.success) {
        setModalSuccessMsg('Rector assigned successfully! The complaint status is now IN_PROGRESS.');
        
        // Find assigned rector name from users array
        const assignedRector = users.find((u) => u.id === Number(selectedRectorId));
        
        // Update local complaints state
        setComplaints((prev) =>
          prev.map((c) =>
            c.id === activeComplaintForAssign.id
              ? {
                  ...c,
                  rectorId: Number(selectedRectorId),
                  rectorName: assignedRector?.name || 'Assigned Rector',
                  status: 'IN_PROGRESS',
                }
              : c
          )
        );

        setTimeout(() => {
          closeAssignModal();
        }, 1500);
      } else {
        setModalErrorMsg(res.message || 'Failed to assign rector');
      }
    } catch (err) {
      setModalErrorMsg(err.message || 'Error occurred during assignment');
    } finally {
      setAssigning(false);
    }
  };

  // Dynamic calculations based on live database values
  const categoryStats = analytics?.categoryStats || {};
  const totalCatCount = Object.values(categoryStats).reduce((sum, val) => sum + val, 0);

  const getCategoryPercentageAndCount = (catKey, defaultPct) => {
    const count = categoryStats[catKey] || 0;
    if (totalCatCount > 0) {
      return {
        pct: Math.round((count / totalCatCount) * 100),
        count
      };
    }
    return {
      pct: defaultPct,
      count
    };
  };

  const totalComplaints = analytics?.totalComplaints || 0;
  const resolvedComplaints = analytics?.resolvedComplaints || 0;
  const computedResolutionRate = totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 85;

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const [usersRes, analyticsRes, complaintsRes] = await Promise.all([
          adminApi.getAllUsers(),
          adminApi.getDashboardAnalytics(),
          adminApi.getAllComplaints(),
        ]);

        if (usersRes.success && usersRes.data) {
          setUsers(usersRes.data);
        }
        if (analyticsRes.success && analyticsRes.data) {
          setAnalytics(analyticsRes.data);
        }
        if (complaintsRes.success && complaintsRes.data) {
          setComplaints(complaintsRes.data);
        }
      } catch (err) {
        console.error('Failed to load admin logs:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, []);

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch =
      searchTerm.trim() === '' ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.hostelBlock && u.hostelBlock.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.roomNumber && u.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesRole && matchesSearch;
  });

  // Filter complaints
  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus = complaintStatusFilter === 'ALL' || c.status === complaintStatusFilter;
    const matchesBlock = blockFilter === 'ALL' || c.hostelBlock === blockFilter;
    const matchesSearch =
      complaintSearch.trim() === '' ||
      c.title.toLowerCase().includes(complaintSearch.toLowerCase()) ||
      c.description.toLowerCase().includes(complaintSearch.toLowerCase()) ||
      (c.studentName && c.studentName.toLowerCase().includes(complaintSearch.toLowerCase())) ||
      (c.roomNumber && c.roomNumber.toLowerCase().includes(complaintSearch.toLowerCase()));

    return matchesStatus && matchesBlock && matchesSearch;
  });

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Page Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.greet}>Administrator Console</h1>
          <p style={styles.subtitle}>Smart Hostel global metrics, user privileges, and system wide complaint analytics.</p>
        </div>
      </div>

      {/* Analytics stats */}
      <div className="grid-3" style={{ marginBottom: '30px' }}>
        <div className="card" style={styles.metricCard}>
          <div style={{ ...styles.metricIcon, backgroundColor: '#e8f5e9', color: 'var(--primary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div>
            <div style={styles.metricLabel}>Total Hostel Users</div>
            <div style={{ ...styles.metricVal, color: 'var(--primary)' }}>{analytics?.totalUsers || users.length}</div>
            <div style={styles.metricSub}>Students, Rectors, and Admins</div>
          </div>
        </div>

        <div className="card" style={styles.metricCard}>
          <div style={{ ...styles.metricIcon, backgroundColor: '#fef3c7', color: '#d97706' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div>
            <div style={styles.metricLabel}>Global Complaints</div>
            <div style={{ ...styles.metricVal, color: '#d97706' }}>{analytics?.totalComplaints || 0}</div>
            <div style={styles.metricSub}>All blocks, all categories</div>
          </div>
        </div>

        <div className="card" style={styles.metricCard}>
          <div style={{ ...styles.metricIcon, backgroundColor: '#d1fae5', color: '#059669' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          </div>
          <div>
            <div style={styles.metricLabel}>Resolution rate</div>
            <div style={{ ...styles.metricVal, color: '#059669' }}>
              {computedResolutionRate}%
            </div>
            <div style={styles.metricSub}>Target threshold: 90%</div>
          </div>
        </div>
      </div>

      {/* Tab Controls */}
      <div style={styles.tabContainer} className="tab-container">
        <button
          onClick={() => setActiveTab('users')}
          style={{
            ...styles.tabButton,
            color: activeTab === 'users' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'users' ? '2px solid var(--primary)' : '2px solid transparent',
            fontWeight: activeTab === 'users' ? '700' : '500',
            backgroundColor: 'transparent',
          }}
          className="tab-button"
        >
          User Directory & Occupancy
        </button>
        <button
          onClick={() => setActiveTab('complaints')}
          style={{
            ...styles.tabButton,
            color: activeTab === 'complaints' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'complaints' ? '2px solid var(--primary)' : '2px solid transparent',
            fontWeight: activeTab === 'complaints' ? '700' : '500',
            backgroundColor: 'transparent',
          }}
          className="tab-button"
        >
          Global Complaint Ledger
        </button>
      </div>

      {activeTab === 'users' ? (
        <div style={styles.mainContentGrid} className="animate-fade-in">
          {/* User privilege section */}
          <div className="card" style={styles.usersCard}>
            <div style={styles.tableHeaderControls} className="table-header-controls">
              <div>
                <h3 style={styles.tableTitle}>Global User Index</h3>
                <p style={styles.tableSubtitle}>Search, review credentials, and verify room allocation mappings.</p>
              </div>

              <div style={styles.filtersWrapper} className="filters-wrapper">
                <input
                  type="text"
                  placeholder="Search by name, block, room..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.searchInput}
                />

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="ALL">All Roles</option>
                  <option value="STUDENT">Student</option>
                  <option value="RECTOR">Rector</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            {loading ? (
              <div style={styles.loadingInner}>Gathering database registries...</div>
            ) : filteredUsers.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <h4>No registered users found</h4>
                <p>Try modifying your filters or search keywords.</p>
              </div>
            ) : (
              <div style={styles.tableWrapper} className="table-wrapper">
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Full Name</th>
                      <th style={styles.th}>Contact Email</th>
                      <th style={styles.th}>Phone</th>
                      <th style={styles.th}>Security Role</th>
                      <th style={styles.th}>Block Assignment</th>
                      <th style={styles.th}>Room allocation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} style={styles.tr}>
                        <td style={styles.tdName}>
                          <div style={styles.avatarSymbol}>{u.name.charAt(0)}</div>
                          <span style={styles.userName}>{u.name}</span>
                        </td>
                        <td style={styles.td}>{u.email}</td>
                        <td style={styles.td}>{u.phone ? (u.phone.length > 10 ? u.phone.slice(-10) : u.phone) : 'N/A'}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.roleBadge,
                            backgroundColor: u.role === 'ADMIN' ? '#fee2e2' : u.role === 'RECTOR' ? '#dbeafe' : '#e2e8f0',
                            color: u.role === 'ADMIN' ? '#ef4444' : u.role === 'RECTOR' ? '#2563eb' : '#475569'
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={styles.td}><strong>{u.hostelBlock || 'Global / N/A'}</strong></td>
                        <td style={styles.td}>
                          <span style={styles.roomAlloc}>{u.roomNumber || 'Unassigned'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CSS Chart widgets for visual balance */}
          <div style={styles.sidebarCharts}>
            <div className="card" style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Sector Distribution</h3>
              <p style={styles.chartSubtitle}>Student occupancy across standard hostel blocks.</p>

              <div style={styles.customBarsGrid}>
                {['A', 'B', 'C', 'D', 'E', 'F'].map((blockLetter, idx) => {
                  const blockFullName = blockLetter === 'A' ? 'Block A (Forest Wing)' :
                                        blockLetter === 'B' ? 'Block B (Emerald Wing)' :
                                        blockLetter === 'C' ? 'Block C (Rector Sector)' :
                                        blockLetter === 'D' ? 'Block D (Summit Suites)' :
                                        blockLetter === 'E' ? 'Block E (Lakeside Manor)' :
                                        'Block F (Zen Gardens)';
                  
                  // Filter students registered in this block
                  const count = users.filter(u => u.role === 'STUDENT' && u.hostelBlock === `Block ${blockLetter}`).length;
                  const maxCapacity = 50;
                  const percentage = Math.min(100, Math.round((count / maxCapacity) * 100));
                  
                  // Dynamic vibrant colors
                  const colors = ['var(--primary)', 'var(--accent)', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];
                  const barColor = colors[idx % colors.length];

                  return (
                    <div key={blockLetter} style={styles.barItem}>
                      <div style={styles.barLabelInfo}>
                        <span>{blockFullName}</span>
                        <strong>{count} / {maxCapacity}</strong>
                      </div>
                      <div style={styles.barContainer}>
                        <div style={{ ...styles.barFill, width: `${percentage || 2}%`, backgroundColor: barColor }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Common Maintenance Issues</h3>
              <p style={styles.chartSubtitle}>Frequency distribution of filed complaint categories.</p>

              <div style={styles.customBarsGrid}>
                {[
                  { key: 'ELECTRICAL', label: 'Electrical Repairs', defaultPct: 45, color: '#f59e0b', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'middle' }}><path d="M18.3 6H5a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h13.3a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3z"/><path d="M10 2v4"/><path d="M14 2v4"/><path d="M6 14v4"/><path d="M18 14v4"/></svg>
                  ) },
                  { key: 'WATER', label: 'Plumbing & Leakages', defaultPct: 30, color: '#3b82f6', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'middle' }}><path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/></svg>
                  ) },
                  { key: 'INTERNET', label: 'WiFi & Internet', defaultPct: 25, color: '#ef4444', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'middle' }}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  ) },
                ].map((item) => {
                  const { pct, count: catCount } = getCategoryPercentageAndCount(item.key, item.defaultPct);
                  return (
                    <div key={item.key} style={styles.barItem}>
                      <div style={styles.barLabelInfo}>
                        <span style={{ display: 'flex', alignItems: 'center' }}>{item.icon}{item.label}</span>
                        <strong>{pct}% ({catCount} tickets)</strong>
                      </div>
                      <div style={styles.barContainer}>
                        <div style={{ ...styles.barFill, width: `${pct || 2}%`, backgroundColor: item.color }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Global Complaint Ledger View */
        <div className="card animate-fade-in" style={styles.tableCardFull}>
          <div style={styles.tableHeaderControls} className="table-header-controls">
            <div>
              <h3 style={styles.tableTitle}>Global Complaint Ledger</h3>
              <p style={styles.tableSubtitle}>System-wide hosteller grievance records. Delegate rectory enforcement units.</p>
            </div>

            <div style={styles.filtersWrapper} className="filters-wrapper">
              <input
                type="text"
                placeholder="Search issues, students..."
                value={complaintSearch}
                onChange={(e) => setComplaintSearch(e.target.value)}
                style={styles.searchInput}
              />

              <select
                value={blockFilter}
                onChange={(e) => setBlockFilter(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="ALL">All Blocks</option>
                <option value="Block A">Block A</option>
                <option value="Block B">Block B</option>
                <option value="Block C">Block C</option>
                <option value="Block D">Block D</option>
                <option value="Block E">Block E</option>
                <option value="Block F">Block F</option>
              </select>

              <select
                value={complaintStatusFilter}
                onChange={(e) => setComplaintStatusFilter(e.target.value)}
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
             <div style={styles.loadingInner}>Loading grievances ledger...</div>
           ) : filteredComplaints.length === 0 ? (
             <div style={styles.emptyState}>
               <div style={styles.emptyIcon}>
                 <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
               </div>
               <h4>No complaints recorded</h4>
               <p>Either all rooms are clear, or your active search terms did not match database records.</p>
             </div>
           ) : (
             <div style={styles.tableWrapper} className="table-wrapper">
               <table style={styles.table}>
                 <thead>
                   <tr>
                     <th style={styles.th}>Student information</th>
                     <th style={styles.th}>Grievance Details</th>
                     <th style={styles.th}>Category</th>
                     <th style={styles.th}>Priority</th>
                     <th style={styles.th}>Status</th>
                     <th style={styles.th}>Assigned Rector</th>
                     <th style={styles.th}>Actions</th>
                   </tr>
                 </thead>
                 <tbody>
                   {filteredComplaints.map((c) => (
                     <tr key={c.id} style={styles.tr}>
                       <td style={styles.tdStudent}>
                         <div style={styles.studentName}>{c.studentName || 'Student'}</div>
                         <div style={styles.studentMeta}>Room {c.roomNumber || 'N/A'} • {c.hostelBlock || 'No Block'}</div>
                       </td>
                       <td style={styles.tdDetails}>
                         <div style={styles.issueTitle}>{c.title}</div>
                         <p style={styles.issueDesc}>{c.description}</p>
                         <span style={styles.issueDate}>Filed: {new Date(c.createdAt || Date.now()).toLocaleDateString()}</span>
                         
                         {c.imageUrl && (
                            <div style={{ marginTop: '8px' }}>
                              <button
                                onClick={() => {
                                  setProofLoadError(false);
                                  openAssignModal(c);
                                }}
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
                       <td style={styles.td}>
                         {c.rectorName ? (
                           <div style={styles.delegateBox}>
                             <span style={styles.delegateLabel}>Assigned Sector</span>
                             <strong style={styles.delegateName}>{c.rectorName}</strong>
                           </div>
                         ) : (
                           <span style={styles.unassignedText}>
                             <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: 'var(--status-rejected)', borderRadius: '50%', marginRight: '6px' }}></span>
                             Unassigned
                           </span>
                         )}
                       </td>
                       <td style={styles.td}>
                         <button
                           onClick={() => openAssignModal(c)}
                           className="btn btn-primary"
                           style={styles.actionBtn}
                         >
                           <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                             Assign 
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
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
      )}

      {/* Rector Assignment Modal */}
      {activeComplaintForAssign && (
        <div style={styles.modalOverlay} className="animate-fade-in">
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Assign Rector</h3>
                <p style={styles.modalSub}>Delegate complaint: <strong>{activeComplaintForAssign.title}</strong></p>
              </div>
              <button style={styles.closeModalBtn} onClick={closeAssignModal}>✕</button>
            </div>

            {modalSuccessMsg && (
              <div style={styles.alertSuccess} className="animate-fade-in">
                {modalSuccessMsg}
              </div>
            )}

            {modalErrorMsg && (
              <div style={styles.alertError} className="animate-fade-in">
                {modalErrorMsg}
              </div>
            )}

            {/* Media Proof Preview in Modal */}
            {activeComplaintForAssign.imageUrl && (
              <div style={styles.modalMediaSection}>
                <span style={{ ...styles.modalMediaLabel, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  Media Proof Attachment:
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
                ) : isVideoFile(activeComplaintForAssign.imageUrl) ? (
                  <video
                    src={getMediaUrl(activeComplaintForAssign.imageUrl)}
                    controls
                    style={styles.modalMediaVideo}
                    onError={() => setProofLoadError(true)}
                  />
                ) : (
                  <img
                    src={getMediaUrl(activeComplaintForAssign.imageUrl)}
                    alt="Proof"
                    style={styles.modalMediaImage}
                    onError={() => setProofLoadError(true)}
                  />
                )}
              </div>
            )}

            <form onSubmit={handleAssignSubmit} style={styles.modalForm}>
              <div style={styles.inputGroup}>
                <label>Select Sector Rector</label>
                <select
                  value={selectedRectorId}
                  onChange={(e) => setSelectedRectorId(e.target.value)}
                  style={styles.modalSelect}
                  required
                >
                  <option value="">-- Choose Rector --</option>
                  {users
                    .filter((u) => u.role === 'RECTOR')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.hostelBlock || 'Unassigned block'})
                      </option>
                    ))}
                </select>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeAssignModal}
                  disabled={assigning}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={assigning}
                >
                  {assigning ? 'Assigning Rector...' : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Assign & Notify Rector 
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
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
  header: {
    marginBottom: '32px',
    backgroundColor: 'var(--bg-card)',
    padding: '24px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-color)',
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
  metricSub: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  mainContentGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '30px',
  },
  usersCard: {
    minHeight: '500px',
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
  },
  searchInput: {
    width: '220px',
    padding: '8px 12px',
    fontSize: '0.85rem',
  },
  filterSelect: {
    width: '130px',
    padding: '8px 12px',
    fontSize: '0.85rem',
  },
  loadingInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '300px',
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
  tdName: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatarSymbol: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-canvas)',
    color: 'var(--primary)',
    fontWeight: '700',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  td: {
    padding: '14px 16px',
    fontSize: '0.85rem',
    verticalAlign: 'middle',
  },
  roleBadge: {
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '4px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  roomAlloc: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
  },
  sidebarCharts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  chartCard: {
    display: 'flex',
    flexDirection: 'column',
  },
  chartTitle: {
    fontSize: '1.1rem',
    color: 'var(--text-main)',
  },
  chartSubtitle: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
    marginBottom: '20px',
  },
  customBarsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  barItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  barLabelInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: 'var(--text-main)',
    fontWeight: 500,
  },
  barContainer: {
    width: '100%',
    height: '8px',
    backgroundColor: 'var(--border-color)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 'var(--radius-full)',
    transition: 'width 0.8s ease-in-out',
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '24px',
    paddingBottom: '2px',
  },
  tabButton: {
    padding: '12px 20px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.95rem',
    transition: 'all var(--transition-smooth)',
  },
  tableCardFull: {
    minHeight: '500px',
    width: '100%',
  },
  delegateBox: {
    display: 'flex',
    flexDirection: 'column',
  },
  delegateLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  delegateName: {
    fontSize: '0.85rem',
    color: 'var(--text-main)',
  },
  unassignedText: {
    fontSize: '0.85rem',
    color: 'var(--status-rejected)',
    fontWeight: '600',
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
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
    borderTop: '1px solid var(--border-color)',
    paddingTop: '16px',
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
  actionBtn: {
    padding: '6px 12px',
    fontSize: '0.75rem',
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
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  tdStudent: {
    padding: '14px 16px',
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
  studentName: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
};

export default AdminConsole;
