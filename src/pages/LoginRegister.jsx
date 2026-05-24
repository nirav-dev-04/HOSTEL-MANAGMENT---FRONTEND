import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import '../styles/global.css';

export const LoginRegister = () => {
  const { login, register, error: authError } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Theme Management
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  React.useEffect(() => {
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

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    hostelBlock: '',
    roomNumber: '',
    phone: '',
    staffAccessCode: '',
  });

  // High-Level Validation States
  const [validationErrors, setValidationErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState('');
  const [passwordStrengthColor, setPasswordStrengthColor] = useState('#ef4444');
  const [passwordProgress, setPasswordProgress] = useState(0);


  // Dynamic Room number option generator based on Block
  const getRoomOptions = (block) => {
    if (!block) return [];
    if (['Block A', 'Block B', 'Block C'].includes(block)) {
      const list = [];
      for (let i = 1; i <= 70; i++) {
        list.push(`Room ${i}`);
      }
      return list;
    }
    if (block === 'Block D') {
      const list = [];
      for (let i = 1; i <= 60; i++) {
        list.push(`Room ${i}`);
      }
      return list;
    }
    if (['Block E', 'Block F'].includes(block)) {
      const list = [];
      const floors = [1, 2, 3, 4];
      const rooms = [1, 2, 3, 4];
      const beds = [1, 2, 3];
      floors.forEach(floor => {
        rooms.forEach(roomNum => {
          beds.forEach(bed => {
            list.push(`${floor}0${roomNum}/${bed}`); // e.g. 101/1, 204/3
          });
        });
      });
      return list;
    }
    return [];
  };

  // Real-time Gmail-style Validator
  const validateField = (name, value) => {
    let errors = { ...validationErrors };
    if (name === 'email') {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!value) {
        errors.email = 'Email address is required.';
      } else if (!emailRegex.test(value)) {
        errors.email = 'Enter a valid email address (e.g. name@university.edu).';
      } else {
        delete errors.email;
      }
    }
    if (name === 'phone') {
      const cleanPhone = value.replace(/[\s()-]+/g, '');
      const phoneRegex = /^\+?[0-9]{10,14}$/;
      if (!value) {
        errors.phone = 'Phone number is required.';
      } else if (!phoneRegex.test(cleanPhone)) {
        errors.phone = 'Enter a valid 10 to 12 digit phone number.';
      } else {
        delete errors.phone;
      }
    }
    if (name === 'name') {
      if (!value) {
        errors.name = 'Full name is required.';
      } else if (value.trim().length < 3) {
        errors.name = 'Name must be at least 3 characters.';
      } else {
        delete errors.name;
      }
    }
    setValidationErrors(errors);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    validateField(name, value);
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      password: val
    }));
    
    if (!val) {
      setPasswordStrength('');
      setPasswordProgress(0);
      return;
    }

    let score = 0;
    if (val.length >= 8) score += 1;
    if (/[A-Z]/.test(val)) score += 1;
    if (/[0-9]/.test(val)) score += 1;
    if (/[^A-Za-z0-9]/.test(val)) score += 1;

    let strength = 'Weak';
    let color = '#ef4444'; // Red
    let pct = 25;

    if (score === 2) {
      strength = 'Medium';
      color = '#f59e0b'; // Orange
      pct = 50;
    } else if (score === 3) {
      strength = 'Strong';
      color = '#10b981'; // Emerald Green
      pct = 75;
    } else if (score === 4) {
      strength = 'Excellent';
      color = '#047857'; // Deep Green
      pct = 100;
    }

    setPasswordStrength(strength);
    setPasswordStrengthColor(color);
    setPasswordProgress(pct);
  };

  const handleBlockCheckboxChange = (block, isRector) => {
    if (isRector) {
      const currentBlocks = formData.hostelBlock ? formData.hostelBlock.split(', ').filter(Boolean) : [];
      let newBlocks;
      if (currentBlocks.includes(block)) {
        newBlocks = currentBlocks.filter(b => b !== block);
      } else {
        newBlocks = [...currentBlocks, block];
      }
      setFormData(prev => ({
        ...prev,
        hostelBlock: newBlocks.join(', ')
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        hostelBlock: block,
        roomNumber: '' // Dynamic dropdown reset on block mutation
      }));
    }
  };

  const handleTabChange = (loginTab) => {
    setIsLogin(loginTab);
    setErrorMsg('');
    setSuccessMsg('');
    setValidationErrors({});
    setPasswordStrength('');
    setPasswordProgress(0);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const user = await login(formData.email, formData.password);
      if (user.role === 'STUDENT') {
        navigate('/student/dashboard');
      } else if (user.role === 'RECTOR') {
        navigate('/rector/complaints');
      } else if (user.role === 'ADMIN') {
        navigate('/admin/console');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };



  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    // Trigger complete validation sweep
    validateField('name', formData.name);
    validateField('email', formData.email);
    validateField('phone', formData.phone);

    if (Object.keys(validationErrors).length > 0) {
      setErrorMsg('Please correct the validation errors before registering.');
      return;
    }

    if (formData.password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    // Staff Access Code Validation
    if (formData.role === 'ADMIN' && formData.staffAccessCode !== 'ADMIN-SECURE-2026') {
      setErrorMsg('Invalid Staff Security Access Code. Admin registration denied.');
      return;
    }
    if (formData.role === 'RECTOR' && formData.staffAccessCode !== 'RECTOR-SECURE-2026') {
      setErrorMsg('Invalid Staff Security Access Code. Rector registration denied.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      phone: formData.phone,
      hostelBlock: (formData.role === 'STUDENT' || formData.role === 'RECTOR') ? formData.hostelBlock : null,
      roomNumber: formData.role === 'STUDENT' ? formData.roomNumber : null,
    };

    try {
      const res = await register(payload);
      if (res.success) {
        setSuccessMsg('Account registered successfully! Please login.');
        setFormData((prev) => ({
          ...prev,
          name: '',
          password: '',
          hostelBlock: '',
          roomNumber: '',
          phone: '',
          staffAccessCode: '',
        }));
        setIsLogin(true);
      } else {
        setErrorMsg(res.message || 'Registration failed');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.authContainer} className="animate-fade-in">
      <style>{`
        .submit-btn-premium {
          background-color: var(--primary);
          color: #ffffff;
          padding: 12px;
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-weight: 700;
          font-size: 0.95rem;
          border: none;
          cursor: pointer;
          transition: var(--transition-smooth);
          margin-top: 8px;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .submit-btn-premium:hover:not(:disabled) {
          background-color: var(--primary-hover);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(15, 81, 50, 0.2);
        }
        .submit-btn-premium:active:not(:disabled) {
          transform: translateY(0);
        }
        .submit-btn-premium:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .dark-theme .submit-btn-premium {
          background-color: #10b981;
        }
        .dark-theme .submit-btn-premium:hover:not(:disabled) {
          background-color: #34d399;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .theme-toggle-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: var(--bg-canvas);
          border: 1px solid var(--border-color);
          border-radius: 50%;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.1rem;
          box-shadow: var(--shadow-sm);
          z-index: 1000;
          transition: all 0.2s ease;
        }
        .theme-toggle-btn:hover {
          transform: scale(1.1);
          background: var(--bg-card);
          border-color: var(--border-focus);
        }
      `}</style>

      <button 
        onClick={toggleTheme} 
        className="theme-toggle-btn"
        title="Toggle Light/Dark Theme"
        style={{ color: 'var(--text-main)' }}
      >
        {theme === 'light' ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        )}
      </button>

      {/* Left panel - Branding Side */}
      <div style={{
        ...styles.brandSide,
        background: theme === 'dark' 
          ? 'linear-gradient(135deg, #111827 0%, #030712 100%)' 
          : 'linear-gradient(135deg, #052e16 0%, #0f5132 100%)'
      }}>
        <div style={{
          ...styles.glowEffect,
          background: theme === 'dark' 
            ? 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(15,81,50,0) 70%)'
            : 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(15,81,50,0) 70%)'
        }}></div>
        <div style={styles.brandContent}>
          <div style={{
            ...styles.brandBadge,
            color: theme === 'dark' ? '#10b981' : '#34d399',
            backgroundColor: theme === 'dark' ? 'rgba(16,185,129,0.1)' : 'rgba(52,211,153,0.1)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            PREMIUM ACCOMMODATION
          </div>
          <h1 style={styles.brandHeading}>Smart Hostel</h1>
          <p style={{
            ...styles.brandTagline,
            color: theme === 'dark' ? '#9ca3af' : '#a7f3d0'
          }}>
            A state-of-the-art living experience. Report complaints, coordinate with block rectors, and manage your accommodation profile with zero friction.
          </p>
          <div style={styles.statsCardGrid}>
            <div style={{
              ...styles.statsCardMini,
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'
            }}>
              <div style={{
                ...styles.miniVal,
                color: theme === 'dark' ? '#10b981' : '#34d399'
              }}>24/7</div>
              <div style={{
                ...styles.miniLabel,
                color: theme === 'dark' ? '#9ca3af' : '#a7f3d0'
              }}>Active Rectors</div>
            </div>
            <div style={{
              ...styles.statsCardMini,
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'
            }}>
              <div style={{
                ...styles.miniVal,
                color: theme === 'dark' ? '#10b981' : '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Rapid
              </div>
              <div style={{
                ...styles.miniLabel,
                color: theme === 'dark' ? '#9ca3af' : '#a7f3d0'
              }}>Complaint Resolution</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Form Side */}
      <div style={styles.formSide}>
        <div style={styles.formContainer}>
          <div style={styles.tabsHeader}>
            <button
              onClick={() => handleTabChange(true)}
              style={{
                ...styles.tabButton,
                color: isLogin 
                  ? (theme === 'dark' ? '#10b981' : 'var(--primary)') 
                  : 'var(--text-muted)',
                borderBottom: isLogin 
                  ? `3px solid ${theme === 'dark' ? '#10b981' : 'var(--primary)'}` 
                  : '3px solid transparent',
                fontWeight: isLogin ? '700' : '500',
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => handleTabChange(false)}
              style={{
                ...styles.tabButton,
                color: !isLogin 
                  ? (theme === 'dark' ? '#10b981' : 'var(--primary)') 
                  : 'var(--text-muted)',
                borderBottom: !isLogin 
                  ? `3px solid ${theme === 'dark' ? '#10b981' : 'var(--primary)'}` 
                  : '3px solid transparent',
                fontWeight: !isLogin ? '700' : '500',
              }}
            >
              Register
            </button>
          </div>



          <div style={styles.welcomeText}>
            <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              {isLogin ? 'Enter your credentials to access your dashboard' : 'Fill out the form below to register to your hostel database'}
            </p>
          </div>

          {errorMsg && (
            <div style={{
              ...styles.alertError,
              borderColor: 'var(--status-rejected)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }} className="animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{
              ...styles.alertSuccess,
              borderColor: 'var(--status-resolved)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }} className="animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              {successMsg}
            </div>
          )}

          {isLogin ? (
            <form onSubmit={handleLoginSubmit} style={styles.formBlock}>
              <div style={styles.inputGroup}>
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  placeholder="name@university.edu"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  style={{
                    borderColor: validationErrors.email ? 'var(--status-rejected)' : 'var(--border-color)'
                  }}
                />
                {validationErrors.email && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--status-rejected)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ● {validationErrors.email}
                  </span>
                )}
              </div>

              <div style={styles.inputGroup}>
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>

              <button type="submit" disabled={loading} className="submit-btn-premium">
                {loading ? 'Authenticating...' : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Sign In 
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  </span>
                )}
              </button>


            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} style={styles.formBlock}>
              <div style={styles.grid2}>
                <div style={styles.inputGroup}>
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="John Doe"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    style={{
                      borderColor: validationErrors.name ? 'var(--status-rejected)' : 'var(--border-color)'
                    }}
                  />
                  {validationErrors.name && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--status-rejected)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      ● {validationErrors.name}
                    </span>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="+91 98765 43210"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{
                      borderColor: validationErrors.phone ? 'var(--status-rejected)' : 'var(--border-color)'
                    }}
                  />
                  {validationErrors.phone && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--status-rejected)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      ● {validationErrors.phone}
                    </span>
                  )}
                </div>
              </div>

              <div style={styles.grid2}>
                <div style={styles.inputGroup}>
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="john.doe@university.edu"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    style={{
                      borderColor: validationErrors.email ? 'var(--status-rejected)' : 'var(--border-color)'
                    }}
                  />
                  {validationErrors.email && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--status-rejected)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      ● {validationErrors.email}
                    </span>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    required
                    value={formData.password}
                    onChange={handlePasswordChange}
                  />
                  {passwordStrength && (
                    <div style={{ marginTop: '6px' }} className="animate-fade-in">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700, marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Strength:</span>
                        <span style={{ color: passwordStrengthColor }}>{passwordStrength}</span>
                      </div>
                      <div style={{ height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${passwordProgress}%`,
                          backgroundColor: passwordStrengthColor,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label>System Role</label>
                <select name="role" value={formData.role} onChange={handleInputChange} style={styles.selectInput}>
                  <option value="STUDENT">Student</option>
                  <option value="RECTOR">Block Rector</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>

              {(formData.role === 'RECTOR' || formData.role === 'ADMIN') && (
                <div style={styles.inputGroup} className="animate-fade-in">
                  <label style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Staff Authentication Security Code
                  </label>
                  <input
                    type="password"
                    name="staffAccessCode"
                    placeholder="Enter Staff Security Code to register..."
                    required
                    value={formData.staffAccessCode || ''}
                    onChange={handleInputChange}
                    style={{
                      borderColor: 'var(--primary)',
                      boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.15)'
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                    * Admin: <code>ADMIN-SECURE-2026</code> • Rector: <code>RECTOR-SECURE-2026</code>
                  </span>
                </div>
              )}

              {formData.role === 'STUDENT' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
                  {/* Swapped order: Hostel Block first */}
                  <div style={styles.inputGroup}>
                    <label style={{ marginBottom: '8px', fontWeight: 600 }}>Hostel Block (Select One)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      {['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F'].map((block) => {
                        const isChecked = formData.hostelBlock === block;
                        return (
                          <label key={block} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            border: isChecked 
                              ? `1px solid ${theme === 'dark' ? '#10b981' : 'var(--primary)'}` 
                              : '1px solid var(--border-color)',
                            borderRadius: '6px',
                            backgroundColor: isChecked 
                              ? (theme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)') 
                              : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontSize: '0.85rem'
                          }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleBlockCheckboxChange(block, false)}
                              style={{ accentColor: theme === 'dark' ? '#10b981' : 'var(--primary)', cursor: 'pointer' }}
                            />
                            {block}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Swapped order: Room Number second as a Dynamic Dropdown */}
                  <div style={styles.inputGroup}>
                    <label style={{ marginBottom: '6px', fontWeight: 600 }}>Room Number</label>
                    <select
                      name="roomNumber"
                      required
                      disabled={!formData.hostelBlock}
                      value={formData.roomNumber}
                      onChange={handleInputChange}
                      style={{
                        ...styles.selectInput,
                        opacity: formData.hostelBlock ? 1 : 0.6,
                        cursor: formData.hostelBlock ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <option value="">
                        {formData.hostelBlock ? '-- Choose Room Number --' : 'Select Hostel Block First...'}
                      </option>
                      {getRoomOptions(formData.hostelBlock).map((room) => (
                        <option key={room} value={room}>
                          {room}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {formData.role === 'RECTOR' && (
                <div style={styles.inputGroup} className="animate-fade-in">
                  <label style={{ marginBottom: '8px', fontWeight: 600 }}>Manage Hostel Block(s) (Select all that apply)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block F'].map((block) => {
                      const isChecked = formData.hostelBlock ? formData.hostelBlock.split(', ').includes(block) : false;
                      return (
                        <label key={block} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          border: isChecked 
                            ? `1px solid ${theme === 'dark' ? '#10b981' : 'var(--primary)'}` 
                            : '1px solid var(--border-color)',
                          borderRadius: '6px',
                          backgroundColor: isChecked 
                            ? (theme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)') 
                            : 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: '0.85rem'
                        }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleBlockCheckboxChange(block, true)}
                            style={{ accentColor: theme === 'dark' ? '#10b981' : 'var(--primary)', cursor: 'pointer' }}
                          />
                          {block}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="submit-btn-premium">
                {loading ? 'Creating Account...' : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Complete Registration
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                  </span>
                )}
              </button>


            </form>
          )}
        </div>
      </div>


    </div>
  );
};

const styles = {
  authContainer: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-canvas)',
  },
  brandSide: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#052e16', // Deep forest green
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '60px',
    color: '#ffffff',
    overflow: 'hidden',
  },
  glowEffect: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(15,81,50,0) 70%)',
    pointerEvents: 'none',
  },
  brandContent: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '480px',
  },
  brandBadge: {
    display: 'inline-block',
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.05em',
    color: '#34d399',
    backgroundColor: 'rgba(52,211,153,0.1)',
    padding: '6px 12px',
    borderRadius: 'var(--radius-full)',
    marginBottom: '20px',
  },
  brandHeading: {
    fontFamily: 'var(--font-heading)',
    fontSize: '3.2rem',
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: '1.1',
    marginBottom: '16px',
  },
  brandTagline: {
    fontSize: '1rem',
    color: '#a7f3d0',
    lineHeight: '1.6',
    marginBottom: '32px',
  },
  statsCardGrid: {
    display: 'flex',
    gap: '16px',
  },
  statsCardMini: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    flex: 1,
  },
  miniVal: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#34d399',
  },
  miniLabel: {
    fontSize: '0.75rem',
    color: '#a7f3d0',
    marginTop: '4px',
  },
  formSide: {
    flex: 1.1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    backgroundColor: 'var(--bg-canvas)',
    overflowY: 'auto',
  },
  formContainer: {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px',
    boxShadow: '0 10px 30px -5px rgba(0,0,0,0.04)',
    border: '1px solid var(--border-color)',
  },
  tabsHeader: {
    display: 'flex',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '30px',
  },
  tabButton: {
    flex: 1,
    background: 'none',
    border: 'none',
    paddingBottom: '12px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
  },
  welcomeText: {
    marginBottom: '24px',
  },
  formBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  selectInput: {
    width: '100%',
    padding: '10px 14px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    color: 'var(--text-main)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    transition: 'var(--transition-smooth)',
  },
  submitBtn: {
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)',
    fontWeight: '700',
    fontSize: '0.95rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
    marginTop: '8px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  alertError: {
    backgroundColor: 'var(--status-rejected-bg)',
    color: 'var(--status-rejected)',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '20px',
  },
  alertSuccess: {
    backgroundColor: 'var(--status-resolved-bg)',
    color: 'var(--status-resolved)',
    border: '1px solid #a7f3d0',
    borderRadius: 'var(--radius-md)',
    padding: '12px 16px',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '20px',
  },
};

export default LoginRegister;
