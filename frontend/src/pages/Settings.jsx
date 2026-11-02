import { useState } from 'react';
import { Settings, Globe, User, Bell, Shield, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';

const LANGS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi',   native: 'हिंदी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
];

export default function SettingsPage() {
  const { t, user, language, setLanguage, isOnline, offlineQueue, clearOfflineQueue } = useApp();
  const [syncing, setSyncing] = useState(false);

  const syncOffline = async () => {
    if (!offlineQueue.length) { toast('No offline records to sync'); return; }
    setSyncing(true);
    try {
      const api = (await import('../utils/api')).default;
      const res = await api.post('/distributions/sync-offline', { records: offlineQueue });
      toast.success(`Synced ${res.data.synced} records! ${res.data.failed ? `(${res.data.failed} failed)` : ''}`);
      clearOfflineQueue();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sync failed');
    } finally { setSyncing(false); }
  };

  const Section = ({ icon: Icon, title, children }) => (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="section-title" style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
        <Icon size={17} color="#16a34a" /> {title}
      </div>
      {children}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Settings size={22} color="#16a34a" /> {t.settings}</h1>
          <p className="page-subtitle">Application preferences and configuration</p>
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>
        {/* User Info */}
        <Section icon={User} title="Account Information">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              ['Name', user?.name],
              ['Username', user?.username],
              ['Role', user?.role === 'admin' ? '🛡️ Administrator' : '👷 Worker'],
              ['Status', isOnline ? '🟢 Online' : '🔴 Offline'],
            ].map(([l, v]) => (
              <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px' }}>
                <div style={{ fontSize:11, color:'#94a3b8', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.04em' }}>{l}</div>
                <div style={{ fontSize:14, fontWeight:600, color:'#1e293b', textTransform:'capitalize' }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="alert alert-info" style={{ marginTop:14, marginBottom:0 }}>
            <Shield size={15} />
            <span>Role-based access: Administrators can edit/delete records. Workers can only add new records.</span>
          </div>
        </Section>

        {/* Language */}
        <Section icon={Globe} title={t.language}>
          <div style={{ display:'flex', gap:10 }}>
            {LANGS.map(lang => (
              <button key={lang.code} id={`lang-${lang.code}`}
                onClick={() => { setLanguage(lang.code); toast.success(`Language changed to ${lang.label}`); }}
                style={{
                  flex:1, padding:'12px 8px', borderRadius:10, border:`2px solid ${language===lang.code?'#16a34a':'#e2e8f0'}`,
                  background: language===lang.code ? '#f0fdf4' : 'white', cursor:'pointer', transition:'all 0.2s'
                }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{lang.code==='en'?'🇬🇧':lang.code==='hi'?'🇮🇳':'🟠'}</div>
                <div style={{ fontSize:14, fontWeight:600, color: language===lang.code?'#16a34a':'#1e293b' }}>{lang.native}</div>
                <div style={{ fontSize:11, color:'#94a3b8' }}>{lang.label}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* Offline */}
        <Section icon={Bell} title="Offline & Sync">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:500, color:'#1e293b' }}>Offline Records Queue</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
                {offlineQueue.length > 0 ? `${offlineQueue.length} record(s) pending sync` : 'No pending offline records'}
              </div>
            </div>
            <button className="btn btn-primary" onClick={syncOffline} disabled={syncing || !isOnline || offlineQueue.length === 0} id="sync-offline-btn">
              {syncing ? 'Syncing...' : `${t.syncNow} (${offlineQueue.length})`}
            </button>
          </div>
          {!isOnline && <div className="alert alert-warning"><Bell size={14}/> You are offline. Connect to internet to sync records.</div>}
          {offlineQueue.length > 0 && (
            <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
              {offlineQueue.map((r, i) => (
                <div key={i} style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#92400e' }}>
                  #{i+1} — Food ID: {r.food_item_id} | Qty: {r.quantity_distributed} | Date: {r.distribution_date}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* About */}
        <Section icon={Info} title="About Smart Poshan">
          <div style={{ fontSize:13, color:'#64748b', lineHeight:1.9 }}>
            <p><strong>Application:</strong> Smart Poshan — Daily Nutrition Distribution Management System</p>
            <p><strong>Purpose:</strong> Helps Anganwadi workers track food stock, daily distribution, and beneficiary counts</p>
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Project Type:</strong> Community Engagement Project (CEP)</p>
            <p><strong>Technology:</strong> React.js · Node.js · Express · SQLite</p>
          </div>
          <div className="alert alert-warning" style={{ marginTop:14, marginBottom:0 }}>
            ⚠️ All sample data in this application is for demonstration purposes only and does not represent actual government or Anganwadi records.
          </div>
        </Section>
      </div>
    </div>
  );
}
