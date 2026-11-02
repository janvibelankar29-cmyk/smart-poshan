import { useState, useEffect } from 'react';
import { FileText, Download, BarChart2, Users, Package } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { formatNumber, exportToCSV, MONTHS } from '../utils/helpers';
import toast from 'react-hot-toast';

const COLORS = ['#16a34a','#3b82f6','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316'];

const StatBox = ({ label, value, sub, color='#16a34a', bg='#f0fdf4' }) => (
  <div style={{ background:bg, borderRadius:10, padding:'16px 18px', textAlign:'center', border:`1px solid ${color}22` }}>
    <div style={{ fontSize:28, fontWeight:800, color }}>{value}</div>
    <div style={{ fontSize:12, color:'#64748b', marginTop:4, fontWeight:500 }}>{label}</div>
    {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{sub}</div>}
  </div>
);

export default function Reports() {
  const { t } = useApp();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(false);
  const currentYear  = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const [year,  setYear]  = useState(String(currentYear));
  const [month, setMonth] = useState(currentMonth);
  const [allDist, setAllDist] = useState([]);

  useEffect(() => { fetchStats(); fetchAll(); }, [year, month]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/distributions/summary/stats', { params: { year, month } });
      setStats(res.data);
    } catch (err) { toast.error('Failed to load report data'); }
    finally { setLoading(false); }
  };

  const fetchAll = async () => {
    try {
      const res = await api.get('/distributions', { params: { startDate: `${year}-${month}-01`, endDate: `${year}-${month}-31` } });
      setAllDist(res.data);
    } catch {}
  };

  const handleExportCSV = () => {
    if (!allDist.length) { toast.error('No data to export'); return; }
    const data = allDist.map(d => ({
      Date: d.distribution_date, 'Food Item': d.food_item_name,
      'Qty Distributed': d.quantity_distributed, 'Remaining Stock': d.remaining_stock,
      Children: d.children_served, Mothers: d.mothers_served,
      'Total Served': d.children_served + d.mothers_served, Remarks: d.remarks || ''
    }));
    exportToCSV(data, `SmartPoshan_Report_${year}_${month}.csv`);
    toast.success('Report exported as CSV!');
  };

  const monthName = MONTHS.find(m => m.value === month)?.label || month;

  const pieData = stats?.byItem?.slice(0, 8).map(item => ({
    name: item.food_item_name, value: parseFloat(formatNumber(item.total_distributed))
  })) || [];

  const dailyData = stats?.dailyChart?.map(d => ({
    date: d.date?.slice(5), // MM-DD
    Quantity: parseFloat(formatNumber(d.total_quantity)),
    Children: d.children || 0,
    Mothers: d.mothers || 0
  })) || [];

  const monthlyData = stats?.monthlyChart?.map(m => ({
    month: m.month,
    Quantity: parseFloat(formatNumber(m.total_quantity)),
    Children: m.children || 0,
    Mothers: m.mothers || 0
  })) || [];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><FileText size={22} color="#16a34a" /> {t.reports}</h1>
          <p className="page-subtitle">Nutrition distribution analytics and summaries</p>
        </div>
        <button className="btn btn-primary" onClick={handleExportCSV} id="export-csv-btn">
          <Download size={16} /> {t.exportCSV}
        </button>
      </div>

      {/* Period Selector */}
      <div className="card" style={{ marginBottom: 24, padding:'16px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <span style={{ fontSize:14, fontWeight:600, color:'#1e293b' }}>Report Period:</span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ fontSize:13, color:'#64748b' }}>Year:</label>
            <select className="form-input" style={{ width:90 }} value={year} onChange={e=>setYear(e.target.value)} id="report-year">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ fontSize:13, color:'#64748b' }}>Month:</label>
            <select className="form-input" style={{ width:130 }} value={month} onChange={e=>setMonth(e.target.value)} id="report-month">
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <span className="badge badge-success" style={{ fontSize:12, padding:'5px 14px' }}>
            {monthName} {year}
          </span>
          <span style={{ fontSize:12, color:'#94a3b8', marginLeft:'auto' }}>⚠️ Sample data — not real government records</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{margin:'0 auto 12px'}}/><p style={{color:'#64748b'}}>{t.loading}</p></div>
      ) : stats ? (
        <>
          {/* Summary Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
            <StatBox label="Total Distributed" value={`${formatNumber(stats.totalDistributed)} kg`} color="#16a34a" bg="#f0fdf4" />
            <StatBox label="Children Served"   value={stats.totalChildren} color="#3b82f6" bg="#eff6ff" />
            <StatBox label="Mothers Served"    value={stats.totalMothers}  color="#8b5cf6" bg="#f5f3ff" />
            <StatBox label="Total Beneficiaries" value={stats.totalChildren+stats.totalMothers} color="#f59e0b" bg="#fffbeb" />
          </div>

          {/* Charts Row */}
          <div className="grid-2" style={{ marginBottom:24 }}>
            {/* Daily Line Chart */}
            <div className="card">
              <div className="section-title"><BarChart2 size={17} color="#16a34a" /> Daily Distribution — {monthName} {year}</div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData} margin={{top:0,right:10,left:-20,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{fontSize:11,fill:'#64748b'}} />
                    <YAxis tick={{fontSize:11,fill:'#64748b'}} />
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{fontSize:12}} />
                    <Line type="monotone" dataKey="Quantity" stroke="#16a34a" strokeWidth={2} dot={{r:3}} />
                    <Line type="monotone" dataKey="Children" stroke="#3b82f6" strokeWidth={2} dot={{r:3}} />
                    <Line type="monotone" dataKey="Mothers"  stroke="#f59e0b" strokeWidth={2} dot={{r:3}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart by item */}
            <div className="card">
              <div className="section-title"><Package size={17} color="#16a34a" /> Distribution by Food Item</div>
              {pieData.length > 0 ? (
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,percent})=>`${name.split(' ')[0]} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v)=>`${formatNumber(v)} kg`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="empty-state"><Package size={32}/><p>No data for this period</p></div>}
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="card" style={{ marginBottom:24 }}>
            <div className="section-title"><BarChart2 size={17} color="#16a34a" /> Monthly Trend — {year}</div>
            <div style={{ height:240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{top:0,right:10,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{fontSize:11,fill:'#64748b'}} />
                  <YAxis tick={{fontSize:11,fill:'#64748b'}} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{fontSize:12}} />
                  <Bar dataKey="Quantity" fill="#16a34a" radius={[4,4,0,0]} />
                  <Bar dataKey="Children" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="Mothers"  fill="#f59e0b" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Item-wise Table */}
          <div className="card" style={{ padding:0 }}>
            <div style={{ padding:'16px 20px 12px', display:'flex', alignItems:'center', gap:8 }}>
              <Users size={17} color="#16a34a" />
              <span style={{ fontWeight:600, fontSize:15 }}>Item-wise Summary — {monthName} {year}</span>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Food Item</th>
                    <th>Total Distributed (kg)</th>
                    <th>Children Served</th>
                    <th>Mothers Served</th>
                    <th>Total Beneficiaries</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byItem?.length === 0 ? (
                    <tr><td colSpan={6} style={{textAlign:'center',padding:30,color:'#94a3b8'}}>No records for this period</td></tr>
                  ) : stats.byItem?.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{color:'#94a3b8',fontSize:12}}>{idx+1}</td>
                      <td style={{fontWeight:600}}>{item.food_item_name}</td>
                      <td style={{fontWeight:700,color:'#16a34a'}}>{formatNumber(item.total_distributed)}</td>
                      <td><span className="badge badge-info">{item.children}</span></td>
                      <td><span className="badge badge-neutral">{item.mothers}</span></td>
                      <td><span className="badge badge-success">{(item.children||0)+(item.mothers||0)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
