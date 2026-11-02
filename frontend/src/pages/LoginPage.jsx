import { useState } from 'react';
import { Leaf, Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';

export default function LoginPage() {
  const { login, t, language, setLanguage } = useApp();
  const [form, setForm]       = useState({ username: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username.trim() || !form.password.trim()) {
      setError('Please enter username and password'); return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#16a34a,#22c55e)', marginBottom: 16, boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}>
            <Leaf size={30} color="white" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>{t.loginTitle}</h1>
          <p style={{ fontSize: 13, color: '#64748b' }}>{t.loginSubtitle}</p>
        </div>

        {/* Sample credentials hint */}
        <div className="alert alert-info" style={{ marginBottom: 20, fontSize: 12 }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Demo Credentials:</strong><br />
            Admin: <code>admin / admin123</code><br />
            Worker: <code>worker / worker123</code>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t.username}</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 36 }}
                type="text"
                placeholder={t.username}
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                autoComplete="username"
                id="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t.password}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 36, paddingRight: 40 }}
                type={showPass ? 'text' : 'password'}
                placeholder={t.password}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                id="password"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 8 }}>
            {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Logging in...</> : t.login}
          </button>
        </form>

        {/* Language selector */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: '#94a3b8', marginRight: 8 }}>Language / भाषा:</span>
          {['en', 'hi', 'mr'].map(lang => (
            <button key={lang} onClick={() => setLanguage(lang)}
              style={{ border: 'none', background: language === lang ? '#16a34a' : '#f1f5f9', color: language === lang ? 'white' : '#64748b', borderRadius: 6, padding: '3px 10px', margin: '0 2px', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
              {lang === 'en' ? 'EN' : lang === 'hi' ? 'हि' : 'म'}
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 24, lineHeight: 1.6 }}>
          ⚠️ Sample data is for demonstration only. Not actual government records.
        </p>
      </div>
    </div>
  );
}
