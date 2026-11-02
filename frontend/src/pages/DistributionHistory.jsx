import { useState, useEffect, useCallback } from 'react';
import { History, Search, Filter, Edit2, Trash2, X, Check, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { formatDate, formatNumber } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function DistributionHistory() {
  const { t, user } = useApp();
  const [records,    setRecords]  = useState([]);
  const [foodItems,  setFoodItems]= useState([]);
  const [loading,    setLoading]  = useState(true);
  const [filters,    setFilters]  = useState({ search: '', startDate: '', endDate: '', foodItemId: '' });
  const [editRecord, setEditRecord] = useState(null);
  const [editForm,   setEditForm] = useState({});
  const [deleteId,   setDeleteId] = useState(null);
  const [submitting, setSubmit]   = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.search)     params.search     = filters.search;
      if (filters.startDate)  params.startDate  = filters.startDate;
      if (filters.endDate)    params.endDate    = filters.endDate;
      if (filters.foodItemId) params.foodItemId = filters.foodItemId;
      const res = await api.get('/distributions', { params });
      setRecords(res.data);
    } catch (err) { toast.error('Failed to load records'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);
  useEffect(() => {
    api.get('/food-items').then(r => setFoodItems(r.data)).catch(() => {});
  }, []);

  const openEdit = (rec) => {
    setEditRecord(rec);
    setEditForm({ children_served: rec.children_served, mothers_served: rec.mothers_served, remarks: rec.remarks || '', distribution_date: rec.distribution_date });
  };

  const handleUpdate = async () => {
    setSubmit(true);
    try {
      await api.put(`/distributions/${editRecord.id}`, editForm);
      toast.success(t.recordUpdated);
      setEditRecord(null);
      fetchRecords();
    } catch (err) { toast.error(err.response?.data?.error || 'Update failed'); }
    finally { setSubmit(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/distributions/${deleteId}`);
      toast.success(t.recordDeleted + ' (Stock restored)');
      setDeleteId(null);
      fetchRecords();
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
  };

  const clearFilters = () => setFilters({ search: '', startDate: '', endDate: '', foodItemId: '' });

  const hasFilters = filters.search || filters.startDate || filters.endDate || filters.foodItemId;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><History size={22} color="#16a34a" /> {t.distributionHistory}</h1>
          <p className="page-subtitle">{records.length} record{records.length !== 1 ? 's' : ''} found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <Filter size={16} color="#16a34a" />
          <span style={{ fontWeight:600, fontSize:14 }}>Filters</span>
          {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ marginLeft:'auto' }}><X size={14}/> Clear</button>}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:10 }}>
          <div className="search-input-wrapper">
            <Search size={15} />
            <input className="form-input" placeholder={t.search} value={filters.search}
              onChange={e=>setFilters({...filters,search:e.target.value})} id="history-search" />
          </div>
          <div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>From Date</label>
            <input className="form-input" type="date" value={filters.startDate} onChange={e=>setFilters({...filters,startDate:e.target.value})} id="start-date" />
          </div>
          <div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>To Date</label>
            <input className="form-input" type="date" value={filters.endDate} onChange={e=>setFilters({...filters,endDate:e.target.value})} id="end-date" />
          </div>
          <div>
            <label style={{ fontSize:11, color:'#64748b', display:'block', marginBottom:3 }}>Food Item</label>
            <select className="form-input" value={filters.foodItemId} onChange={e=>setFilters({...filters,foodItemId:e.target.value})} id="item-filter">
              <option value="">All Items</option>
              {foodItems.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {loading ? (
            <div style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{margin:'0 auto 12px'}}/><p style={{color:'#64748b'}}>{t.loading}</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t.date}</th>
                  <th>{t.foodItem}</th>
                  <th>Qty Distributed</th>
                  <th>Remaining</th>
                  <th>Children</th>
                  <th>Mothers</th>
                  <th>Total Served</th>
                  <th>{t.remarks}</th>
                  {user?.role === 'admin' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={10} style={{textAlign:'center',padding:40,color:'#94a3b8'}}>
                    <History size={32} style={{margin:'0 auto 8px',display:'block',opacity:0.4}}/>
                    {t.noRecords}
                  </td></tr>
                ) : records.map((r, idx) => (
                  <tr key={r.id}>
                    <td style={{ color:'#94a3b8', fontSize:12 }}>{idx+1}</td>
                    <td style={{ fontWeight:500, whiteSpace:'nowrap', fontSize:13 }}>{formatDate(r.distribution_date)}</td>
                    <td style={{ fontWeight:600, color:'#1e293b' }}>{r.food_item_name}</td>
                    <td><span style={{ fontWeight:700, color:'#f59e0b' }}>{formatNumber(r.quantity_distributed)}</span></td>
                    <td><span style={{ fontWeight:600, color: r.remaining_stock <= 5 ? '#ef4444' : '#16a34a' }}>{formatNumber(r.remaining_stock)}</span></td>
                    <td><span className="badge badge-info">{r.children_served}</span></td>
                    <td><span className="badge badge-neutral">{r.mothers_served}</span></td>
                    <td><span className="badge badge-success">{r.children_served + r.mothers_served}</span></td>
                    <td style={{ fontSize:12, color:'#64748b', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.remarks || '—'}</td>
                    {user?.role === 'admin' && (
                      <td>
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(r)} title="Edit" id={`edit-dist-${r.id}`}><Edit2 size={13}/></button>
                          <button className="btn btn-danger btn-sm" onClick={()=>setDeleteId(r.id)} title="Delete" id={`delete-dist-${r.id}`}><Trash2 size={13}/></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editRecord && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:460 }}>
            <div className="modal-header">
              <h2 style={{fontSize:16,fontWeight:700}}>Edit Distribution Record</h2>
              <button className="btn btn-ghost btn-sm" onClick={()=>setEditRecord(null)}><X size={17}/></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info" style={{marginBottom:12}}>
                <AlertTriangle size={14}/>
                Editing is limited to metadata. Quantities cannot be changed (contact admin to delete and re-enter).
              </div>
              <div style={{background:'#f8fafc',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:13}}>
                <strong>{editRecord.food_item_name}</strong> — {formatNumber(editRecord.quantity_distributed)} distributed on {formatDate(editRecord.distribution_date)}
              </div>
              <div className="form-group">
                <label className="form-label">Distribution Date</label>
                <input className="form-input" type="date" value={editForm.distribution_date} onChange={e=>setEditForm({...editForm,distribution_date:e.target.value})} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Children Served</label>
                  <input className="form-input" type="number" min="0" value={editForm.children_served} onChange={e=>setEditForm({...editForm,children_served:e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mothers Served</label>
                  <input className="form-input" type="number" min="0" value={editForm.mothers_served} onChange={e=>setEditForm({...editForm,mothers_served:e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <textarea className="form-input" value={editForm.remarks} onChange={e=>setEditForm({...editForm,remarks:e.target.value})} style={{minHeight:70}}/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setEditRecord(null)}>{t.cancel}</button>
              <button className="btn btn-primary" onClick={handleUpdate} disabled={submitting} id="save-edit-dist-btn">
                {submitting?<><span className="spinner" style={{width:14,height:14,borderWidth:2}}/> Saving...</>:<><Check size={15}/> {t.save}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{maxWidth:360}}>
            <div className="modal-header"><h2 style={{fontSize:16,fontWeight:700,color:'#ef4444'}}>Confirm Delete</h2></div>
            <div className="modal-body">
              <p style={{fontSize:14,color:'#475569'}}>{t.deleteConfirm}</p>
              <div className="alert alert-success" style={{marginTop:12}}>
                ✅ The distributed quantity will be restored back to the food item's available stock.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setDeleteId(null)}>{t.cancel}</button>
              <button className="btn btn-danger" onClick={handleDelete} id="confirm-delete-dist-btn"><Trash2 size={14}/> Delete & Restore Stock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
