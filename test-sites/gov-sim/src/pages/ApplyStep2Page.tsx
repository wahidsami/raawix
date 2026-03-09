import { useState, FormEvent, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function ApplyStep2Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    mobile: '',
    email: '',
    address: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load previous step data
    const saved = sessionStorage.getItem('apply-form-data');
    if (!saved) {
      navigate(`/apply/${id}/step-1`);
    }
  }, [id, navigate]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.mobile.trim()) {
      newErrors.mobile = 'رقم الجوال مطلوب';
    } else if (!/^05[0-9]{8}$/.test(formData.mobile)) {
      newErrors.mobile = 'يجب أن يبدأ بـ 05 ويحتوي على 10 أرقام';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Save step 2 data
    const saved = JSON.parse(sessionStorage.getItem('apply-form-data') || '{}');
    sessionStorage.setItem('apply-form-data', JSON.stringify({ ...saved, ...formData }));
    navigate(`/apply/${id}/step-3`);
  };

  return (
    <div className="page apply-page">
      <h1>الخطوة 2: معلومات الاتصال</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="mobile">
            رقم الجوال <span className="required">*</span>
          </label>
          <input
            type="tel"
            id="mobile"
            name="mobile"
            value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            required
            pattern="05[0-9]{8}"
            aria-required="true"
            aria-invalid={errors.mobile ? 'true' : 'false'}
          />
          {errors.mobile && <span className="error-message">{errors.mobile}</span>}
        </div>

        {/* INTENTIONAL ISSUE: Email field with div label not bound to input */}
        <div className="form-group">
          <div>البريد الإلكتروني <span className="required">*</span></div>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            aria-required="true"
            aria-invalid={errors.email ? 'true' : 'false'}
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="address">العنوان (اختياري)</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => navigate(`/apply/${id}/step-1`)}
          >
            السابق
          </button>
          <button type="submit" className="button button-primary">
            التالي
          </button>
        </div>
      </form>
    </div>
  );
}

export default ApplyStep2Page;

