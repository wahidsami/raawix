import { useState, FormEvent, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function ApplyStep3Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [files, setFiles] = useState({
    idCopy: null as File | null,
    supportingDoc: null as File | null
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load previous steps data
    const saved = sessionStorage.getItem('apply-form-data');
    if (!saved) {
      navigate(`/apply/${id}/step-1`);
    }
  }, [id, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'idCopy' | 'supportingDoc') => {
    const file = e.target.files?.[0] || null;
    setFiles(prev => ({ ...prev, [field]: file }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!files.idCopy) {
      newErrors.idCopy = 'صورة من الهوية مطلوبة';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Save files info (in real app, would upload)
    const saved = JSON.parse(sessionStorage.getItem('apply-form-data') || '{}');
    sessionStorage.setItem('apply-form-data', JSON.stringify({
      ...saved,
      files: {
        idCopy: files.idCopy?.name,
        supportingDoc: files.supportingDoc?.name
      }
    }));
    navigate(`/apply/${id}/review`);
  };

  return (
    <div className="page apply-page">
      <h1>الخطوة 3: المرفقات</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="idCopy">
            صورة من الهوية الوطنية <span className="required">*</span>
          </label>
          <input
            type="file"
            id="idCopy"
            name="idCopy"
            accept="image/*,.pdf"
            onChange={(e) => handleFileChange(e, 'idCopy')}
            required
            aria-required="true"
            aria-invalid={errors.idCopy ? 'true' : 'false'}
          />
          {files.idCopy && <p>تم اختيار: {files.idCopy.name}</p>}
          {errors.idCopy && <span className="error-message">{errors.idCopy}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="supportingDoc">
            وثيقة داعمة (اختياري)
          </label>
          <input
            type="file"
            id="supportingDoc"
            name="supportingDoc"
            accept="image/*,.pdf"
            onChange={(e) => handleFileChange(e, 'supportingDoc')}
          />
          {files.supportingDoc && <p>تم اختيار: {files.supportingDoc.name}</p>}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => navigate(`/apply/${id}/step-2`)}
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

export default ApplyStep3Page;

