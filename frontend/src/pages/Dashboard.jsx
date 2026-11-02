import { useState, useEffect } from 'react';
import {
  Package, TrendingDown, TrendingUp, Users, AlertTriangle,
  BarChart2, Box, Clock, Leaf
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { formatDate, formatNumber, getStockPercent, getStockColor } from '../utils/helpers';

const StatCard = ({ icon: Icon, label, value, sub, color, bg }) => (
  <div className="stat-card animate-fade-in">
    <div className="stat-icon" style={{ background: bg }}>
      <Icon size={22} color={color} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13 }}>
      <p style={{ fontWeight: 600, marginBottom: 4, color: '#1e293b' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: <strong>{formatNumber(p.value)} {p.name === 'Quantity' ? 'kg' : ''}</strong>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { t, user } = useApp();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally { setLoading(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto 12px' }} /><p style={{ color: '#64748b' }}>{t.loading}</p></div>
    </div>
  );

  if (error) return <div className="alert alert-danger"><AlertTriangle size={16} />{error}</div>;
  if (!stats) return null;

  const chartData = stats.monthlyChart.map(m => ({
    month: m.month,
    'Quantity': parseFloat(formatNumber(m.total_quantity)),
    'Children': m.children || 0,
    'Mothers': m.mothers || 0,
  }));

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title"><Leaf size={22} color="#16a34a" /> {t.dashboard}</h1>
          <p className="page-subtitle">{t.welcomeBack}, <strong>{user?.name}</strong> · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Low Stock Banner */}
      {stats.lowStockItems?.length > 0 && (
        <div className="low-stock-banner">
          <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 4 }}>{t.lowStockAlerts} ({stats.lowStockItems.length} items)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {stats.lowStockItems.map(item => (
                <span key={item.id} className="badge badge-warning" style={{ fontSize: 12 }}>
                  {item.name}: {formatNumber(item.available_stock)} {item.unit}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard icon={Package} label={t.totalItems} value={stats.totalItems} color="#16a34a" bg="#dcfce7" />
        <StatCard icon={TrendingUp} label={t.totalReceived} value={`${formatNumber(stats.totalReceived)} kg`} color="#3b82f6" bg="#eff6ff" />
        <StatCard icon={TrendingDown} label={t.totalDistributed} value={`${formatNumber(stats.totalDistributed)} kg`} color="#f59e0b" bg="#fffbeb" />
        <StatCard icon={Box} label={t.totalRemaining} value={`${formatNumber(stats.totalRemaining)} kg`} color="#8b5cf6" bg="#f5f3ff" sub={`${t.children}: ${stats.totalChildren} · ${t.mothers}: ${stats.totalMothers}`} />
      </div>

      {/* Beneficiaries + Chart */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="section-title"><BarChart2 size={18} color="#16a34a" /> {t.monthlyChart}</div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Quantity" fill="#16a34a" radius={[4,4,0,0]} />
                <Bar dataKey="Children" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="Mothers" fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="section-title"><Users size={18} color="#16a34a" /> {t.totalBeneficiaries}</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1, background: '#eff6ff', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#1d4ed8' }}>{stats.totalChildren}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{t.children} Served</div>
            </div>
            <div style={{ flex: 1, background: '#fdf2f8', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#86198f' }}>{stats.totalMothers}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{t.mothers} Served</div>
            </div>
          </div>
          <div className="section-title" style={{ marginTop: 8 }}><AlertTriangle size={16} color={stats.lowStockItems?.length > 0 ? '#d97706' : '#16a34a'} /> {t.lowStockAlerts}</div>
          {stats.lowStockItems?.length === 0 ? (
            <div style={{ color: '#16a34a', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              ✅ {t.noLowStock}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.lowStockItems.slice(0, 4).map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fef9c3', borderRadius: 8, border: '1px solid #fde68a' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</span>
                  <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>{formatNumber(item.available_stock)} {item.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Distributions + Stock Summary */}
      <div className="grid-2">
        <div className="card">
          <div className="section-title"><Clock size={18} color="#16a34a" /> {t.recentDistributions}</div>
          {stats.recentDistributions?.length === 0 ? (
            <div className="empty-state"><Package size={32} /><p>{t.noRecords}</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.recentDistributions.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{d.food_item_name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{formatDate(d.distribution_date)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>−{formatNumber(d.quantity_distributed)} kg</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{d.children_served + d.mothers_served} served</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-title"><Package size={18} color="#16a34a" /> {t.stockSummary}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.foodStockSummary?.slice(0, 6).map(item => {
              const pct = getStockPercent(item.available_stock, item.quantity_received);
              const col = getStockColor(item.available_stock, item.min_stock_level);
              return (
                <div key={item.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{item.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: col }}>{formatNumber(item.available_stock)} {item.unit}</span>
                  </div>
                  <div className="stock-bar">
                    <div className="stock-bar-fill" style={{ width: `${pct}%`, background: col }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p style={{ marginTop: 20, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
        ⚠️ {t.sampleDataNote}
      </p>
    </div>
  );
}
