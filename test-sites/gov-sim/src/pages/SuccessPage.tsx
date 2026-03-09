import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';

function SuccessPage() {
  const { id } = useParams<{ id: string }>();
  const applicationNumber = `APP-${Date.now()}`;

  // Clear form data
  sessionStorage.removeItem('apply-form-data');

  return (
    <div className="page success-page">
      <div className="success-content">
        {/* INTENTIONAL ISSUE: Decorative icon with missing alt */}
        <img
          src="/assets/images/success_icon.png"
          width="100"
          height="100"
          style={{ margin: '0 auto', display: 'block' }}
        />
        
        <h1>تم إرسال الطلب بنجاح</h1>
        <p>شكراً لتقديمك الطلب. سيتم مراجعته ومعالجته في أقرب وقت ممكن.</p>
        
        <div className="application-info">
          <p><strong>رقم الطلب:</strong> {applicationNumber}</p>
          <p><strong>تاريخ التقديم:</strong> {new Date().toLocaleDateString('ar-SA')}</p>
        </div>

        <div className="success-actions">
          <Link to="/dashboard" className="button button-primary">
            العودة إلى لوحة التحكم
          </Link>
          <Link to="/services" className="button button-secondary">
            الخدمات الأخرى
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SuccessPage;

