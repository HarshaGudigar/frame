import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Server, Package, RefreshCw, AlertCircle, LogIn, LogOut } from 'lucide-react';

// In production: same host, port 5000. In dev (Vite): localhost:5000
const API_BASE = import.meta.env.DEV
  ? 'http://localhost:5000/api'
  : `${window.location.protocol}//${window.location.hostname}:5000/api`;

function App() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [isRegister, setIsRegister] = useState(false);
  const [authError, setAuthError] = useState(null);

  const fetchTenants = async () => {
    if (!token) {
      setLoading(false);
      setError('Login required to view fleet data.');
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/admin/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTenants(res.data.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        handleLogout();
      } else {
        setError('Failed to connect to the Control Plane Hub.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    const interval = setInterval(fetchTenants, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(null);
    const endpoint = isRegister ? 'register' : 'login';
    try {
      const res = await axios.post(`${API_BASE}/auth/${endpoint}`, loginForm);
      const newToken = res.data.data.token;
      setToken(newToken);
      localStorage.setItem('token', newToken);
      setShowLogin(false);
      setLoginForm({ email: '', password: '', firstName: '', lastName: '' });
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setTenants([]);
    localStorage.removeItem('token');
  };

  const totalTenants = tenants.length;
  const onlineTenants = tenants.filter(t => t.status === 'online').length;
  const activeSubs = tenants.reduce((acc, t) => acc + (t.subscribedModules?.length || 0), 0);

  return (
    <div className="dashboard-container">
      <div className="header">
        <div>
          <h1>Alyxnet Control Plane</h1>
          <p style={{ color: 'var(--text-muted)' }}>Fleet Management & Real-time Monitoring</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="deploy-btn" onClick={fetchTenants} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={18} /> Refresh Fleet
          </button>
          {token ? (
            <button className="deploy-btn" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--border)' }}>
              <LogOut size={18} /> Logout
            </button>
          ) : (
            <button className="deploy-btn" onClick={() => setShowLogin(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LogIn size={18} /> Login
            </button>
          )}
        </div>
      </div>

      {/* Login/Register Form */}
      {showLogin && (
        <div className="glass" style={{ padding: '2rem', marginBottom: '2rem', maxWidth: '400px' }}>
          <h3 style={{ marginBottom: '1rem' }}>{isRegister ? 'Register' : 'Login'}</h3>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {isRegister && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text" placeholder="First Name" value={loginForm.firstName}
                  onChange={e => setLoginForm(f => ({ ...f, firstName: e.target.value }))}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
                <input
                  type="text" placeholder="Last Name" value={loginForm.lastName}
                  onChange={e => setLoginForm(f => ({ ...f, lastName: e.target.value }))}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
              </div>
            )}
            <input
              type="email" placeholder="Email" required value={loginForm.email}
              onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
            <input
              type="password" placeholder="Password (min 6 chars)" required value={loginForm.password}
              onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            />
            {authError && <div style={{ color: 'var(--error)', fontSize: '0.85rem' }}>{authError}</div>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="deploy-btn" style={{ flex: 1 }}>
                {isRegister ? 'Register' : 'Login'}
              </button>
              <button type="button" onClick={() => setShowLogin(false)} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' }}>
                Cancel
              </button>
            </div>
            <button type="button" onClick={() => { setIsRegister(!isRegister); setAuthError(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.85rem', textAlign: 'left', cursor: 'pointer' }}>
              {isRegister ? '← Back to Login' : 'Need an account? Register'}
            </button>
          </form>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--primary)' }}>
            <Server size={24} /> <span style={{ fontWeight: 600 }}>Active Silos</span>
          </div>
          <h2 style={{ fontSize: '2rem' }}>{totalTenants}</h2>
        </div>
        <div className="stat-card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--success)' }}>
            <Activity size={24} /> <span style={{ fontWeight: 600 }}>Health (Online)</span>
          </div>
          <h2 style={{ fontSize: '2rem' }}>{onlineTenants}</h2>
        </div>
        <div className="stat-card glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--warning)' }}>
            <Package size={24} /> <span style={{ fontWeight: 600 }}>Module Subscriptions</span>
          </div>
          <h2 style={{ fontSize: '2rem' }}>{activeSubs}</h2>
        </div>
      </div>

      {error && (
        <div className="stat-card glass" style={{ borderColor: 'var(--error)', color: 'var(--error)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={20} /> {error}
          </div>
        </div>
      )}

      <div className="glass" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Silo Fleet</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Instance Name</th>
                <th>Status</th>
                <th>Silo ID</th>
                <th>Public IP</th>
                <th>CPU / RAM</th>
                <th>Active Modules</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(tenant => (
                <tr key={tenant._id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{tenant.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tenant.slug}</div>
                  </td>
                  <td>
                    <span className={`status-badge status-${tenant.status || 'offline'}`}>
                      {tenant.status || 'offline'}
                    </span>
                  </td>
                  <td><code>{tenant._id.substring(18)}</code></td>
                  <td>{tenant.vmIpAddress || 'N/A'}</td>
                  <td>
                    {tenant.metrics?.cpu ? (
                      <div style={{ fontSize: '0.9rem' }}>
                        {tenant.metrics.cpu.toFixed(2)}% | {Math.round(tenant.metrics.ram)}MB
                      </div>
                    ) : '---'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {tenant.subscribedModules?.map(mod => (
                        <span key={mod} style={{ fontSize: '0.7rem', background: 'var(--border)', padding: '2px 8px', borderRadius: '4px' }}>
                          {mod}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {tenant.lastSeen ? new Date(tenant.lastSeen).toLocaleTimeString() : 'Never'}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                    {token ? 'No silos discovered. Automated provisioning will list new instances here.' : 'Login to view fleet data.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
