import { useParams, Link } from 'react-router-dom';

const serviceDetails: Record<string, { title: string; description: string }> = {
  'renew-id': {
    title: 'تجديد الهوية الوطنية',
    description: 'تقديم طلب تجديد الهوية الوطنية. يتطلب إرفاق صورة من الهوية الحالية.'
  },
  'certificates': {
    title: 'استخراج الشهادات',
    description: 'طلب استخراج الشهادات الرسمية المختلفة.'
  },
  'license': {
    title: 'تجديد رخصة القيادة',
    description: 'تقديم طلب تجديد رخصة القيادة.'
  }
};

function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const service = id ? serviceDetails[id] : null;

  if (!service) {
    return (
      <div className="page">
        <h1>الخدمة غير موجودة</h1>
        <Link to="/services">العودة إلى الخدمات</Link>
      </div>
    );
  }

  return (
    <div className="page service-detail-page">
      <h1>{service.title}</h1>
      <p>{service.description}</p>
      
      <div className="service-actions">
        <Link to={`/apply/${id}/step-1`} className="button button-primary">
          بدء التقديم
        </Link>
        <Link to="/services" className="button button-secondary">
          العودة
        </Link>
      </div>
    </div>
  );
}

export default ServiceDetailPage;

