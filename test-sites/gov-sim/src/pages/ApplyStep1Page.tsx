import { useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function ApplyStep1Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    dob: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'الاسم الكامل مطلوب';
    }

    if (!formData.nationalId.trim()) {
      newErrors.nationalId = 'رقم الهوية مطلوب';
    } else if (!/^[0-9]{10}$/.test(formData.nationalId)) {
      newErrors.nationalId = 'يجب أن يكون 10 أرقام';
    }

    if (!formData.dob) {
      newErrors.dob = 'تاريخ الميلاد مطلوب';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Save to sessionStorage for multi-step form
    sessionStorage.setItem('apply-form-data', JSON.stringify(formData));
    navigate(`/apply/${id}/step-2`);
  };

  return (
    <div className="page apply-page">
      <h1>الخطوة 1: المعلومات الشخصية</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fullName">
            الاسم الكامل <span className="required">*</span>
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            required
            aria-required="true"
            aria-invalid={errors.fullName ? 'true' : 'false'}
          />
          {errors.fullName && <span className="error-message">{errors.fullName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="nationalId">
            رقم الهوية الوطنية / الإقامة <span className="required">*</span>
          </label>
          <input
            type="text"
            id="nationalId"
            name="nationalId"
            value={formData.nationalId}
            onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
            required
            pattern="[0-9]{10}"
            aria-required="true"
            aria-invalid={errors.nationalId ? 'true' : 'false'}
          />
          {errors.nationalId && <span className="error-message">{errors.nationalId}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="dob">
            تاريخ الميلاد <span className="required">*</span>
          </label>
          <input
            type="date"
            id="dob"
            name="dob"
            value={formData.dob}
            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            required
            aria-required="true"
            aria-invalid={errors.dob ? 'true' : 'false'}
          />
          {errors.dob && <span className="error-message">{errors.dob}</span>}
        </div>

        <div className="form-actions">
          <button type="submit" className="button button-primary">
            التالي
          </button>
        </div>
      </form>
    </div>
  );
}

export default ApplyStep1Page;

