import { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, AlertTriangle, X, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { formatDate, formatNumber, getStockColor, getStockBadge, CATEGORIES, UNITS } from '../utils/helpers';
import toast from 'react-hot-toast';

const INITIAL_FORM = {
  name: '', quantity_received: '', unit: 'kg', min_stock_level: '5',
  date_of_receipt: new Date().toISOString().split('T')[0], category: 'grain', notes: ''
};

export default function FoodStock() {
  const { t, user } = useApp();
  const [items,      setItems]    = useState([]);
  const [loading,    setLoading]  = useState(true);
  const [showModal,  setShowModal]= useState(false);
  const [editItem,   setEditItem] = useState(null);
  const [form,       setForm]     = useState(INITIAL_FORM);
  const [errors,     setErrors]   = useState({});
  const [submitting, setSubmit]   = useState(false);
  const [deleteId,   setDeleteId] = useState(null);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get('/food-items');
      setItems(res.data);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to load items'); }
    finally { setLoading(false); }
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())           e.name = 'Food item name is required';
    if (!form.quantity_received)     e.quantity_received = 'Quantity is required';
    else if (parseFloat(form.quantity_received) <= 0) e.quantity_received = 'Must be > 0';
    if (!form.unit)                  e.unit = 'Unit is required';
    if (!form.date_of_receipt)       e.date_of_receipt = 'Date is required';
    if (form.min_stock_level && parseFloat(form.min_stock_level) < 0) e.min_stock_level = 'Must be ≥ 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openAdd = () => {
    setEditItem(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      name: item.name, quantity_received: item.quantity_received,
      unit: item.unit, min_stock_level: item.min_stock_level,
      date_of_receipt: item.date_of_receipt, category: item.category || 'grain',
      notes: item.notes || '', available_stock: item.available_stock
    });
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmit(true);
    try {
      if (editItem) {
        await api.put(`/food-items/${editItem.id}`, form);
        toast.success(t.stockUpdated);
      } else {
        await api.post('/food-items', form);
        toast.success(t.recordAdded);
      }
      setShowModal(false);
      fetchItems();
    } catch (err) { toast.error(err.response?.data?.error || 'Operation failed'); }
    finally { setSubmit(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/food-items/${id}`);
      toast.success(t.recordDeleted);
      setDeleteId(null);
      fetchItems();
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
  };

  const Field = ({ label, name, type = 'text', children, hint }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children || <input id={name} className={`form-input${errors[name] ? ' error' : ''}`} type={type} value={form[name] || ''} onChange={e => setForm({ ...form, [name]: e.target.value })} />}
      {errors[name] && <div className="form-error">{errors[name]}</div>}
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Package size={22} color="#16a34a" /> {t.foodStock}</h1>
          <p className="page-subtitle">Manage food stock inventory for your Anganwadi centre</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} id="add-food-item-btn">
          <Plus size={16} /> {t.addFoodItem}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto 12px' }} /><p style={{ color: '#64748b' }}>{t.loading}</p></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t.foodItemName}</th>
                  <th>{t.category}</th>
                  <th>{t.quantityReceived}</th>
                  <th>{t.availableStock}</th>
                  <th>Min. Level</th>
                  <th>{t.dateOfReceipt}</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    <Package size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                    No food items found. Click "{t.addFoodItem}" to add one.
                  </td></tr>
                ) : items.map((item, idx) => {
                  const color = getStockColor(item.available_stock, item.min_stock_level);
                  const badge = getStockBadge(item.available_stock, item.min_stock_level);
                  const isLow = item.available_stock <= item.min_stock_level;
                  return (
                    <tr key={item.id} style={isLow ? { background: '#fff9f9' } : {}}>
                      <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.name}</div>
                        {item.notes && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{item.notes}</div>}
                      </td>
                      <td><span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{item.category}</span></td>
                      <td style={{ fontWeight: 500 }}>{formatNumber(item.quantity_received)} {item.unit}</td>
                      <td>
                        <div style={{ fontWeight: 700, color }}>{formatNumber(item.available_stock)} {item.unit}</div>
                        <div className="stock-bar" style={{ width: 80 }}>
                          <div className="stock-bar-fill" style={{ width: `${Math.min(100, (item.available_stock / item.quantity_received) * 100)}%`, background: color }} />
                        </div>
                      </td>
                      <td style={{ color: '#64748b' }}>{item.min_stock_level} {item.unit}</td>
                      <td style={{ color: '#64748b', fontSize: 13 }}>{formatDate(item.date_of_receipt)}</td>
                      <td>
                        <span className={`badge ${badge}`}>
                          {isLow ? <><AlertTriangle size={11} /> Low</> : '✓ OK'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)} title="Edit" id={`edit-item-${item.id}`}>
                            <Edit2 size={14} />
                          </button>
                          {user?.role === 'admin' && (
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(item.id)} title="Delete" id={`delete-item-${item.id}`}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>{editItem ? `Edit: ${editItem.name}` : t.addFoodItem}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid-2">
                  <Field label={t.foodItemName} name="name">
                    <input id="food-name" className={`form-input${errors.name?' error':''}`} type="text" placeholder="e.g., Rice (Chawal)" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
                  </Field>
                  <Field label={t.category} name="category">
                    <select id="food-category" className="form-input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                      {CATEGORIES.map(c=><option key={c} value={c} style={{textTransform:'capitalize'}}>{c}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid-2">
                  <Field label={t.quantityReceived} name="quantity_received" hint={editItem ? `Current available: ${editItem.available_stock} ${editItem.unit}` : ''}>
                    <input id="qty-received" className={`form-input${errors.quantity_received?' error':''}`} type="number" min="0.01" step="0.01" value={form.quantity_received} onChange={e=>setForm({...form,quantity_received:e.target.value})} />
                    {errors.quantity_received && <div className="form-error">{errors.quantity_received}</div>}
                  </Field>
                  <Field label={t.unit} name="unit">
                    <select id="food-unit" className="form-input" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
                      {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid-2">
                  <Field label={t.dateOfReceipt} name="date_of_receipt">
                    <input id="receipt-date" className={`form-input${errors.date_of_receipt?' error':''}`} type="date" value={form.date_of_receipt} onChange={e=>setForm({...form,date_of_receipt:e.target.value})} />
                    {errors.date_of_receipt && <div className="form-error">{errors.date_of_receipt}</div>}
                  </Field>
                  <Field label={`${t.minStockLevel} (${form.unit})`} name="min_stock_level" hint="Alert shown when stock falls below this">
                    <input id="min-stock" className="form-input" type="number" min="0" step="0.1" value={form.min_stock_level} onChange={e=>setForm({...form,min_stock_level:e.target.value})} />
                  </Field>
                </div>
                <Field label={t.notes} name="notes">
                  <textarea id="food-notes" className="form-input" placeholder="Optional notes..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={{minHeight:60}} />
                </Field>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowModal(false)}>{t.cancel}</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} id="save-food-btn">
                  {submitting ? <><span className="spinner" style={{width:14,height:14,borderWidth:2}} /> Saving...</> : <><Check size={15} /> {t.save}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}><Trash2 size={16} style={{display:'inline',marginRight:6}} />Confirm Delete</h2>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: '#475569' }}>{t.deleteConfirm}</p>
              <div className="alert alert-warning" style={{ marginTop: 12 }}>
                <AlertTriangle size={15} /> This will permanently remove the food item and its history.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setDeleteId(null)}>{t.cancel}</button>
              <button className="btn btn-danger" onClick={()=>handleDelete(deleteId)} id="confirm-delete-btn">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
