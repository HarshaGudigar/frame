import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Activity, Server, Package, RefreshCw, AlertCircle,
  LogIn, LogOut, LayoutDashboard, Users, Store,
  Settings, Plus, Pencil, Trash2, ArrowLeft, Globe, Cpu
} from 'lucide-react';

const API_BASE = import.meta.env.DEV
  ? 'http://localhost:5000/api'
  : `${window.location.protocol}//${window.location.hostname}:5000/api`;

// ─── Auth Context ─────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  const api = axios.create({ baseURL: API_BASE });

  // Attach token to every request
  api.interceptors.request.use(config => {
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Auto-logout on 401
  api.interceptors.response.use(res => res, err => {
    if (err.response?.status === 401 && token) {
      logout();
    }
    return Promise.reject(err);
  });

  const login = (newToken) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ token, api, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = isRegister ? 'register' : 'login';
      const res = await axios.post(`${API_BASE}/auth/${endpoint}`, form);
      login(res.data.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card glass">
        <div className="login-header">
          <Server size={32} style={{ color: 'var(--primary)' }} />
          <h1>Alyxnet Frame</h1>
          <p style={{ color: 'var(--text-muted)' }}>Control Plane Dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <h3>{isRegister ? 'Create Account' : 'Welcome Back'}</h3>
          {isRegister && (
            <div className="form-row">
              <input type="text" placeholder="First Name" value={form.firstName}
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                className="form-input" />
              <input type="text" placeholder="Last Name" value={form.lastName}
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                className="form-input" />
            </div>
          )}
          <input type="email" placeholder="Email" required value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="form-input" />
          <input type="password" placeholder="Password (min 6 chars)" required value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="form-input" />
          {error && <div className="form-error"><AlertCircle size={14} /> {error}</div>}
          <button type="submit" className="deploy-btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
          <button type="button" className="link-btn"
            onClick={() => { setIsRegister(!isRegister); setError(null); }}>
            {isRegister ? '← Back to Sign In' : "Don't have an account? Register"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Sidebar Layout ──────────────────────────────────────────────────────────

function Layout({ children }) {
  const { logout } = useAuth();

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/tenants', icon: <Users size={18} />, label: 'Tenants' },
    { to: '/marketplace', icon: <Store size={18} />, label: 'Marketplace' },
    { to: '/settings', icon: <Settings size={18} />, label: 'Settings' },
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar glass">
        <div className="sidebar-brand">
          <Server size={24} style={{ color: 'var(--primary)' }} />
          <span>Alyxnet</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {item.icon} <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={logout} className="nav-item" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}>
            <LogOut size={18} /> <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

// ─── Dashboard Page ──────────────────────────────────────────────────────────

function DashboardPage() {
  const { api } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/tenants');
      setTenants(res.data.data);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchTenants();
    const interval = setInterval(fetchTenants, 30000);
    return () => clearInterval(interval);
  }, []);

  const online = tenants.filter(t => t.status === 'online').length;
  const subs = tenants.reduce((a, t) => a + (t.subscribedModules?.length || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Fleet Overview</h1>
          <p className="text-muted">Real-time monitoring of all silo instances</p>
        </div>
        <button className="deploy-btn" onClick={fetchTenants}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-label"><Server size={20} color="var(--primary)" /> Active Silos</div>
          <h2 className="stat-value">{tenants.length}</h2>
        </div>
        <div className="stat-card glass">
          <div className="stat-label"><Activity size={20} color="var(--success)" /> Online</div>
          <h2 className="stat-value">{online}</h2>
        </div>
        <div className="stat-card glass">
          <div className="stat-label"><Package size={20} color="var(--warning)" /> Subscriptions</div>
          <h2 className="stat-value">{subs}</h2>
        </div>
      </div>

      <div className="glass card">
        <h3>Silo Fleet</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Instance</th><th>Status</th><th>IP</th><th>CPU / RAM</th>
                <th>Modules</th><th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t._id}>
                  <td>
                    <div className="cell-primary">{t.name}</div>
                    <div className="cell-secondary">{t.slug}</div>
                  </td>
                  <td><span className={`status-badge status-${t.status || 'offline'}`}>{t.status || 'offline'}</span></td>
                  <td>{t.vmIpAddress || '—'}</td>
                  <td>{t.metrics?.cpu ? `${t.metrics.cpu.toFixed(1)}% | ${Math.round(t.metrics.ram)}MB` : '—'}</td>
                  <td>
                    <div className="tag-list">
                      {t.subscribedModules?.map(m => <span key={m} className="tag">{m}</span>)}
                    </div>
                  </td>
                  <td className="cell-secondary">{t.lastSeen ? new Date(t.lastSeen).toLocaleTimeString() : 'Never'}</td>
                </tr>
              ))}
              {!tenants.length && !loading && (
                <tr><td colSpan="6" className="empty-state">No silos discovered yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Tenants Page ─────────────────────────────────────────────────────────────

function TenantsPage() {
  const { api } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', vmIpAddress: '', subscribedModules: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/tenants');
      setTenants(res.data.data);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTenants(); }, []);

  const resetForm = () => {
    setForm({ name: '', slug: '', vmIpAddress: '', subscribedModules: '' });
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const handleEdit = (tenant) => {
    setForm({
      name: tenant.name,
      slug: tenant.slug,
      vmIpAddress: tenant.vmIpAddress || '',
      subscribedModules: (tenant.subscribedModules || []).join(', '),
    });
    setEditingId(tenant._id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const payload = {
      name: form.name,
      slug: form.slug,
      vmIpAddress: form.vmIpAddress,
      subscribedModules: form.subscribedModules.split(',').map(s => s.trim()).filter(Boolean),
    };

    try {
      if (editingId) {
        await api.put(`/admin/tenants/${editingId}`, payload);
      } else {
        await api.post('/admin/tenants', payload);
      }
      resetForm();
      fetchTenants();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete tenant "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/tenants/${id}`);
      fetchTenants();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Tenant Management</h1>
          <p className="text-muted">Create and manage customer instances</p>
        </div>
        <button className="deploy-btn" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={16} /> New Tenant
        </button>
      </div>

      {showForm && (
        <div className="glass card form-card">
          <h3>{editingId ? 'Edit Tenant' : 'Create Tenant'}</h3>
          <form onSubmit={handleSubmit} className="tenant-form">
            <div className="form-row">
              <div className="form-group">
                <label>Name</label>
                <input type="text" required value={form.name} placeholder="My Clinic"
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="form-input" />
              </div>
              <div className="form-group">
                <label>Slug</label>
                <input type="text" required value={form.slug} placeholder="my-clinic"
                  disabled={!!editingId}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="form-input" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>VM IP Address</label>
                <input type="text" value={form.vmIpAddress} placeholder="1.2.3.4"
                  onChange={e => setForm(f => ({ ...f, vmIpAddress: e.target.value }))} className="form-input" />
              </div>
              <div className="form-group">
                <label>Modules (comma-separated)</label>
                <input type="text" value={form.subscribedModules} placeholder="hospital, pharmacy"
                  onChange={e => setForm(f => ({ ...f, subscribedModules: e.target.value }))} className="form-input" />
              </div>
            </div>
            {error && <div className="form-error"><AlertCircle size={14} /> {error}</div>}
            <div className="form-actions">
              <button type="submit" className="deploy-btn">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Slug</th><th>Status</th><th>IP</th>
                <th>Modules</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t._id}>
                  <td className="cell-primary">{t.name}</td>
                  <td><code>{t.slug}</code></td>
                  <td><span className={`status-badge status-${t.status || 'offline'}`}>{t.status || 'offline'}</span></td>
                  <td>{t.vmIpAddress || '—'}</td>
                  <td><div className="tag-list">{t.subscribedModules?.map(m => <span key={m} className="tag">{m}</span>)}</div></td>
                  <td>
                    <div className="action-btns">
                      <button className="icon-btn" title="Edit" onClick={() => handleEdit(t)}><Pencil size={14} /></button>
                      <button className="icon-btn danger" title="Delete" onClick={() => handleDelete(t._id, t.name)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!tenants.length && !loading && (
                <tr><td colSpan="6" className="empty-state">No tenants yet. Create your first one!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Marketplace Page ─────────────────────────────────────────────────────────

function MarketplacePage() {
  const { api } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/marketplace/products');
        setProducts(res.data.data || []);
      } catch { }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Marketplace</h1>
          <p className="text-muted">Browse and purchase modules for your tenants</p>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="product-grid">
          {products.map(p => (
            <div key={p._id} className="glass card product-card">
              <div className="product-icon"><Package size={32} color="var(--primary)" /></div>
              <h3>{p.name}</h3>
              <p className="text-muted">{p.description || 'No description'}</p>
              <div className="product-price">${p.price || 'Free'}</div>
              <ul className="product-features">
                {p.features?.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <div className="glass card empty-state-card">
          <Store size={48} color="var(--text-muted)" />
          <h3>No Products Available</h3>
          <p className="text-muted">Modules will appear here once they are added to the marketplace.</p>
        </div>
      ) : null}
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

function SettingsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="text-muted">Account and platform configuration</p>
        </div>
      </div>
      <div className="glass card empty-state-card">
        <Settings size={48} color="var(--text-muted)" />
        <h3>Coming Soon</h3>
        <p className="text-muted">Account settings, API keys, and platform configuration will be available here.</p>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { token } = useAuth();

  if (!token) return <LoginPage />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tenants" element={<TenantsPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
