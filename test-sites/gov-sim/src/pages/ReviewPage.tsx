import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('apply-form-data');
    if (!saved) {
      navigate(`/apply/${id}/step-1`);
      return;
    }
    setFormData(JSON.parse(saved));
  }, [id, navigate]);

  const handleSubmit = () => {
    // Simulate submission
    navigate(`/apply/${id}/success`);
  };

  if (!formData) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <div className="page review-page">
      <h1>مراجعة الطلب</h1>
      
      <section>
        <h2>المعلومات الشخصية</h2>
        <dl>
          <dt>الاسم الكامل:</dt>
          <dd>{formData.fullName}</dd>
          <dt>رقم الهوية:</dt>
          <dd>{formData.nationalId}</dd>
          <dt>تاريخ الميلاد:</dt>
          <dd>{formData.dob}</dd>
        </dl>
      </section>

      <section>
        <h2>معلومات الاتصال</h2>
        <dl>
          <dt>رقم الجوال:</dt>
          <dd>{formData.mobile}</dd>
          <dt>البريد الإلكتروني:</dt>
          <dd>{formData.email}</dd>
          {formData.address && (
            <>
              <dt>العنوان:</dt>
              <dd>{formData.address}</dd>
            </>
          )}
        </dl>
      </section>

      <section>
        <h2>المرفقات</h2>
        <dl>
          <dt>صورة الهوية:</dt>
          <dd>{formData.files?.idCopy || 'غير مرفق'}</dd>
          {formData.files?.supportingDoc && (
            <>
              <dt>وثيقة داعمة:</dt>
              <dd>{formData.files.supportingDoc}</dd>
            </>
          )}
        </dl>
      </section>

      <div className="form-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={() => navigate(`/apply/${id}/step-3`)}
        >
          السابق
        </button>
        <button
          type="button"
          className="button button-primary"
          onClick={handleSubmit}
        >
          إرسال الطلب
        </button>
      </div>
    </div>
  );
}

export default ReviewPage;

