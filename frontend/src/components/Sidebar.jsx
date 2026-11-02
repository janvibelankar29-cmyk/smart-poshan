import { useState } from 'react';
import {
  LayoutDashboard, Package, SendHorizontal, History,
  FileText, Settings, LogOut, Leaf, Menu, X, AlertTriangle, Wifi, WifiOff
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { id: 'dashboard',    icon: LayoutDashboard, key: 'dashboard' },
  { id: 'food-stock',   icon: Package,         key: 'foodStock' },
  { id: 'distribution', icon: SendHorizontal,  key: 'dailyDistribution' },
  { id: 'history',      icon: History,         key: 'distributionHistory' },
  { id: 'reports',      icon: FileText,        key: 'reports' },
  { id: 'settings',     icon: Settings,        key: 'settings' },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { t, user, logout, isOnline, offlineQueue } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (id) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#16a34a,#22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}>
          <Leaf size={20} color="white" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>{t.appName}</div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1, lineHeight: 1.3 }}>{t.tagline}</div>
        </div>
      </div>

      {/* User */}
      <div style={{ margin: '12px', background: '#f0fdf4', borderRadius: 10, padding: '10px 12px', border: '1px solid #dcfce7' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background:'#16a34a', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:12, fontWeight:700, flexShrink:0 }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
          <span className="badge badge-success" style={{ fontSize:10 }}>
            {user?.role === 'admin' ? '🛡️ Admin' : '👷 Worker'}
          </span>
          {isOnline
            ? <span style={{ fontSize:10, color:'#16a34a', display:'flex', alignItems:'center', gap:3 }}><Wifi size={10}/>Online</span>
            : <span style={{ fontSize:10, color:'#ef4444', display:'flex', alignItems:'center', gap:3 }}><WifiOff size={10}/>Offline</span>}
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            className={`nav-item${activePage === item.id ? ' active' : ''}`}
            onClick={() => handleNav(item.id)}
          >
            <item.icon size={18} />
            <span>{t[item.key]}</span>
            {item.id === 'food-stock' && offlineQueue.length > 0 && (
              <span style={{ marginLeft:'auto', background:'#f59e0b', color:'white', borderRadius:999, fontSize:10, padding:'1px 6px', fontWeight:700 }}>
                {offlineQueue.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {offlineQueue.length > 0 && (
          <div style={{ marginBottom:10, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'8px 10px', fontSize:11, color:'#92400e', display:'flex', alignItems:'center', gap:6 }}>
            <AlertTriangle size={13}/> {offlineQueue.length} {t.syncPending}
          </div>
        )}
        <button className="nav-item" onClick={logout} id="logout-btn" style={{ color:'#ef4444', width:'100%' }}>
          <LogOut size={18} />{t.logout}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="mobile-header">
        <button onClick={() => setMobileOpen(true)} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
          <Menu size={22} color="#1e293b" />
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#16a34a,#22c55e)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Leaf size={15} color="white" />
          </div>
          <span style={{ fontSize:15, fontWeight:700, color:'#1e293b' }}>{t.appName}</span>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          {isOnline ? <Wifi size={16} color="#16a34a"/> : <WifiOff size={16} color="#ef4444"/>}
        </div>
      </header>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <>
          <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
          <aside className="sidebar open" style={{ zIndex: 250 }}>
            <div style={{ display:'flex', justifyContent:'flex-end', padding:'12px 16px 0' }}>
              <button onClick={() => setMobileOpen(false)} style={{ background:'none', border:'none', cursor:'pointer' }}><X size={20}/></button>
            </div>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
