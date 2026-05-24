import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/global.css';

export const Profile = () => {
  const { user } = useAuth();

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Page Title */}
      <div style={styles.header}>
        <h1 style={styles.greet}>My User Profile</h1>
        <p style={styles.subtitle}>Manage your contact details, security roles, and sector allocations.</p>
      </div>

      <div className="grid-profile-layout">
        {/* Profile Card */}
        <div className="card" style={styles.profileCard}>
          <div style={styles.cardHeaderBackground}></div>
          <div style={styles.cardInfoSection}>
            <div style={styles.avatarLarge}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            <h2 style={styles.userName}>{user?.name || 'User Hosteller'}</h2>
            <div style={styles.userRoleBadge}>
              <span style={{
                ...styles.roleLabel,
                backgroundColor: user?.role === 'ADMIN' ? '#fee2e2' : user?.role === 'RECTOR' ? '#dbeafe' : '#e8f5e9',
                color: user?.role === 'ADMIN' ? '#ef4444' : user?.role === 'RECTOR' ? '#2563eb' : 'var(--primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3M17 6l3 3"/></svg>
                {user?.role || 'STUDENT'}
              </span>
            </div>
            <p style={styles.userJoinLabel}>Account registered in hostel records</p>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div className="card" style={styles.detailsCard}>
          <h3 style={styles.detailsTitle}>Hostel Placement Details</h3>
          <p style={styles.detailsSub}>Authorized information synced with university databases.</p>

          <div className="grid-profile-fields">
            <div style={styles.infoField}>
              <label style={styles.fieldLabel}>FULL REGISTERED NAME</label>
              <div style={styles.fieldValue}>{user?.name}</div>
            </div>

            <div style={styles.infoField}>
              <label style={styles.fieldLabel}>UNIVERSITY REGISTERED EMAIL</label>
              <div style={styles.fieldValue}>{user?.email}</div>
            </div>

            <div style={styles.infoField}>
              <label style={styles.fieldLabel}>SECURITY LEVEL ROLE</label>
              <div style={styles.fieldValue}>{user?.role}</div>
            </div>

            <div style={styles.infoField}>
              <label style={styles.fieldLabel}>PRIMARY CONTACT PHONE</label>
              <div style={styles.fieldValue}>
                {user?.phone ? (user.phone.length > 10 ? user.phone.slice(-10) : user.phone) : 'Not Provided'}
              </div>
            </div>

            {user?.role === 'STUDENT' && (
              <>
                <div style={styles.infoField}>
                  <label style={styles.fieldLabel}>ASSIGNED HOSTEL SECTOR / BLOCK</label>
                  <div style={{ ...styles.fieldValue, color: 'var(--primary)', fontWeight: '700' }}>
                    {user?.hostelBlock || 'Pending Allocation'}
                  </div>
                </div>

                <div style={styles.infoField}>
                  <label style={styles.fieldLabel}>ROOM ASSIGNMENT NUMBER</label>
                  <div style={{ ...styles.fieldValue, color: 'var(--primary)', fontWeight: '700' }}>
                    {user?.roomNumber || 'Pending Allocation'}
                  </div>
                </div>
              </>
            )}

            {user?.role === 'RECTOR' && (
              <div style={styles.infoField} style={{ gridColumn: 'span 2' }}>
                <label style={styles.fieldLabel}>ADMINISTERED SECTOR / BLOCK</label>
                <div style={{ ...styles.fieldValue, color: 'var(--primary)', fontWeight: '700' }}>
                  {user?.hostelBlock || 'All Blocks'}
                </div>
              </div>
            )}
          </div>

          <div style={styles.noticeBox}>
            <span style={{ ...styles.noticeIcon, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </span>
            <div>
              <h5 style={styles.noticeTitle}>Need to modify room allocations?</h5>
              <p style={styles.noticeDesc}>Room assignments and block transfers can only be processed by the Office of the Registrar. Please lodge an official request with the System Administrator.</p>
            </div>
          </div>
        </div>
      </div>
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
    backgroundColor: 'var(--bg-sidebar)',
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
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '30px',
  },
  profileCard: {
    padding: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: 'fit-content',
  },
  cardHeaderBackground: {
    height: '100px',
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
  },
  cardInfoSection: {
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    position: 'relative',
  },
  avatarLarge: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    color: 'var(--primary)',
    fontSize: '2.5rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '4px solid #ffffff',
    boxShadow: 'var(--shadow-md)',
    marginTop: '-75px',
    marginBottom: '16px',
    backgroundImage: 'linear-gradient(135deg, #e8f5e9 0%, #cbd5e1 100%)',
  },
  userName: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: 'var(--text-main)',
  },
  userRoleBadge: {
    marginTop: '10px',
    marginBottom: '16px',
  },
  roleLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '6px 12px',
    borderRadius: 'var(--radius-full)',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
  userJoinLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  detailsCard: {
    display: 'flex',
    flexDirection: 'column',
  },
  detailsTitle: {
    fontSize: '1.25rem',
    color: 'var(--text-main)',
  },
  detailsSub: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
    marginBottom: '24px',
  },
  infoFieldsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
    marginBottom: '30px',
  },
  infoField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    backgroundColor: 'var(--bg-canvas)',
    padding: '16px 20px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-color)',
  },
  fieldLabel: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
    marginBottom: 0,
  },
  fieldValue: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-main)',
  },
  noticeBox: {
    display: 'flex',
    gap: '16px',
    backgroundColor: 'var(--status-progress-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: '18px 20px',
    alignItems: 'flex-start',
  },
  noticeIcon: {
    fontSize: '1.5rem',
  },
  noticeTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--status-progress)',
  },
  noticeDesc: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
    lineHeight: '1.4',
  },
};
export default Profile;
