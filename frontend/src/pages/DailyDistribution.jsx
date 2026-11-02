import { useState, useEffect } from 'react';
import { SendHorizontal, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { formatNumber } from '../utils/helpers';
import toast from 'react-hot-toast';

const INITIAL_FORM = {
  food_item_id: '',
  distribution_date: new Date().toISOString().split('T')[0],
  quantity_distributed: '',
  children_served: '',
  mothers_served: '',
  remarks: ''
};

export default function DailyDistribution() {
  const { t, isOnline, addToOfflineQueue } = useApp();
  const [form,       setForm]     = useState(INITIAL_FORM);
  const [foodItems,  setFoodItems]= useState([]);
  const [errors,     setErrors]   = useState({});
  const [submitting, setSubmit]   = useState(false);
  const [success,    setSuccess]  = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    api.get('/food-items').then(r => setFoodItems(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.food_item_id) {
      const found = foodItems.find(f => f.id === parseInt(form.food_item_id));
      setSelectedItem(found || null);
    } else {
      setSelectedItem(null);
    }
  }, [form.food_item_id, foodItems]);

  const remaining = selectedItem
    ? Math.max(0, selectedItem.available_stock - (parseFloat(form.quantity_distributed) || 0))
    : null;

  const validate = () => {
    const e = {};
    if (!form.food_item_id)        e.food_item_id = 'Please select a food item';
    if (!form.distribution_date)   e.distribution_date = 'Distribution date is required';
    if (!form.quantity_distributed) e.quantity_distributed = 'Quantity is required';
    else {
      const qty = parseFloat(form.quantity_distributed);
      if (qty <= 0) e.quantity_distributed = 'Quantity must be > 0';
      else if (selectedItem && qty > selectedItem.available_stock)
        e.quantity_distributed = `Exceeds available stock (${formatNumber(selectedItem.available_stock)} ${selectedItem.unit})`;
    }
    if (form.children_served && parseInt(form.children_served) < 0) e.children_served = 'Must be ≥ 0';
    if (form.mothers_served  && parseInt(form.mothers_served)  < 0) e.mothers_served  = 'Must be ≥ 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmit(true);
    setSuccess(null);

    const payload = {
      food_item_id:        parseInt(form.food_item_id),
      distribution_date:   form.distribution_date,
      quantity_distributed: parseFloat(form.quantity_distributed),
      children_served:     parseInt(form.children_served)  || 0,
      mothers_served:      parseInt(form.mothers_served)   || 0,
      remarks:             form.remarks
    };

    if (!isOnline) {
      addToOfflineQueue(payload);
      toast.success('Saved offline. Will sync when online.');
      setForm(INITIAL_FORM);
      setSuccess({ offline: true });
      setSubmit(false);
      return;
    }

    try {
      const res = await api.post('/distributions', payload);
      setSuccess(res.data);
      toast.success(t.recordAdded);
      setForm(INITIAL_FORM);
      // Refresh food items to show updated stock
      const fi = await api.get('/food-items');
      setFoodItems(fi.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit';
      toast.error(msg);
      if (err.response?.data?.available !== undefined) {
        setErrors({ quantity_distributed: msg });
      }
    } finally { setSubmit(false); }
  };

  const F = ({ label, name, type='text', children, required }) => (
    <div className="form-group">
      <label className="form-label">{label}{required && <span style={{color:'#ef4444', marginLeft:3}}>*</span>}</label>
      {children || <input className={`form-input${errors[name]?' error':''}`} id={name} type={type} value={form[name]||''} onChange={e=>setForm({...form,[name]:e.target.value})} />}
      {errors[name] && <div className="form-error">{errors[name]}</div>}
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><SendHorizontal size={22} color="#16a34a" /> {t.dailyDistribution}</h1>
          <p className="page-subtitle">Record today's food distribution to beneficiaries</p>
        </div>
        {!isOnline && (
          <span className="badge badge-warning" style={{ fontSize: 13, padding: '6px 14px' }}>
            <AlertTriangle size={14} /> Offline Mode
          </span>
        )}
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Form */}
        <div className="card">
          <div className="section-title"><SendHorizontal size={17} color="#16a34a" /> Distribution Form</div>
          <form onSubmit={handleSubmit}>
            <F label={t.foodItemName} name="food_item_id" required>
              <select id="food_item_id" className={`form-input${errors.food_item_id?' error':''}`}
                value={form.food_item_id} onChange={e=>setForm({...form,food_item_id:e.target.value})}>
                <option value="">— Select Food Item —</option>
                {foodItems.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} (Available: {formatNumber(f.available_stock)} {f.unit})
                  </option>
                ))}
              </select>
              {errors.food_item_id && <div className="form-error">{errors.food_item_id}</div>}
            </F>

            <F label={t.distributionDate} name="distribution_date" type="date" required />

            <F label={`${t.quantityDistributed}${selectedItem ? ` (${selectedItem.unit})` : ''}`} name="quantity_distributed" required>
              <input id="quantity_distributed" className={`form-input${errors.quantity_distributed?' error':''}`}
                type="number" min="0.01" step="0.01" placeholder="Enter quantity to distribute"
                value={form.quantity_distributed} onChange={e=>setForm({...form,quantity_distributed:e.target.value})} />
              {errors.quantity_distributed && <div className="form-error">{errors.quantity_distributed}</div>}
            </F>

            <div className="grid-2">
              <F label={t.childrenServed} name="children_served" type="number" />
              <F label={t.mothersServed} name="mothers_served" type="number" />
            </div>

            <F label={t.remarks} name="remarks">
              <textarea id="remarks" className="form-input" placeholder="Optional remarks..." value={form.remarks}
                onChange={e=>setForm({...form,remarks:e.target.value})} style={{minHeight:70}} />
            </F>

            <button type="submit" className="btn btn-primary" disabled={submitting} id="submit-distribution-btn"
              style={{ width:'100%', justifyContent:'center', padding:'12px' }}>
              {submitting
                ? <><span className="spinner" style={{width:16,height:16,borderWidth:2}}/> Submitting...</>
                : <><SendHorizontal size={16}/> {t.submitDistribution}</>}
            </button>
          </form>
        </div>

        {/* Info Panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Selected Item Info */}
          {selectedItem && (
            <div className="card animate-fade-in" style={{ borderLeft: '4px solid #16a34a' }}>
              <div className="section-title" style={{ marginBottom: 12 }}>
                <Info size={16} color="#16a34a" /> Selected: {selectedItem.name}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  ['Category', selectedItem.category],
                  ['Unit', selectedItem.unit],
                  ['Total Received', `${formatNumber(selectedItem.quantity_received)} ${selectedItem.unit}`],
                  ['Available Stock', `${formatNumber(selectedItem.available_stock)} ${selectedItem.unit}`],
                  ['Min. Level', `${selectedItem.min_stock_level} ${selectedItem.unit}`],
                ].map(([l, v]) => (
                  <div key={l} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:11, color:'#64748b', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.04em' }}>{l}</div>
                    <div style={{ fontSize:14, fontWeight:600, color:'#1e293b', textTransform:'capitalize' }}>{v}</div>
                  </div>
                ))}
                {form.quantity_distributed && (
                  <div style={{ background: remaining < selectedItem.min_stock_level ? '#fef2f2' : '#f0fdf4', borderRadius:8, padding:'10px 12px', border:`1px solid ${remaining < selectedItem.min_stock_level ? '#fecaca' : '#bbf7d0'}` }}>
                    <div style={{ fontSize:11, color:'#64748b', marginBottom:2, textTransform:'uppercase', letterSpacing:'0.04em' }}>After Distribution</div>
                    <div style={{ fontSize:14, fontWeight:700, color: remaining < selectedItem.min_stock_level ? '#dc2626' : '#16a34a' }}>
                      {formatNumber(remaining)} {selectedItem.unit}
                    </div>
                  </div>
                )}
              </div>
              {selectedItem.available_stock <= selectedItem.min_stock_level && (
                <div className="alert alert-warning" style={{ marginTop:12, marginBottom:0 }}>
                  <AlertTriangle size={15} /> Stock is at or below minimum level!
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="card animate-fade-in" style={{ borderLeft:'4px solid #16a34a' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <CheckCircle2 size={20} color="#16a34a" />
                <span style={{ fontSize:15, fontWeight:600, color:'#166534' }}>
                  {success.offline ? 'Saved Offline!' : 'Distribution Recorded!'}
                </span>
              </div>
              {success.distribution && (
                <div style={{ fontSize:13, color:'#64748b', display:'flex', flexDirection:'column', gap:4 }}>
                  <span>📦 Item: <strong>{success.distribution.food_item_name}</strong></span>
                  <span>📊 Distributed: <strong>{formatNumber(success.distribution.quantity_distributed)} {success.updatedFoodItem?.unit}</strong></span>
                  <span>📉 Remaining: <strong>{formatNumber(success.distribution.remaining_stock)} {success.updatedFoodItem?.unit}</strong></span>
                  <span>👶 Children: <strong>{success.distribution.children_served}</strong> | 🧕 Mothers: <strong>{success.distribution.mothers_served}</strong></span>
                </div>
              )}
              {success.offline && <p style={{ fontSize:13, color:'#92400e' }}>Record saved locally. Will sync automatically when internet is available.</p>}
            </div>
          )}

          {/* Help box */}
          <div className="card" style={{ background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
            <div style={{ fontSize:13, color:'#166534', lineHeight:1.8 }}>
              <strong>📋 Instructions:</strong>
              <ol style={{ paddingLeft:16, marginTop:6 }}>
                <li>Select a food item from the list</li>
                <li>Enter today's distribution date</li>
                <li>Enter quantity to distribute</li>
                <li>Enter number of children and mothers served</li>
                <li>Click "{t.submitDistribution}"</li>
              </ol>
              <p style={{ marginTop:8, fontSize:12, color:'#16a34a' }}>✅ Stock is automatically deducted after submission.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
