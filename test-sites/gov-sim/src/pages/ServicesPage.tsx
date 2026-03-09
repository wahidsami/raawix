import { Link } from 'react-router-dom';

const services = [
  {
    id: 'renew-id',
    title: 'تجديد الهوية الوطنية',
    description: 'تقديم طلب تجديد الهوية الوطنية'
  },
  {
    id: 'certificates',
    title: 'استخراج الشهادات',
    description: 'طلب استخراج الشهادات الرسمية'
  },
  {
    id: 'license',
    title: 'تجديد رخصة القيادة',
    description: 'تقديم طلب تجديد رخصة القيادة'
  }
];

function ServicesPage() {
  return (
    <div className="page services-page">
      <h1>الخدمات المتاحة</h1>
      
      <div className="services-list">
        {services.map((service) => (
          <article key={service.id} className="service-card">
            <h2>
              <Link to={`/services/${service.id}`}>{service.title}</Link>
            </h2>
            <p>{service.description}</p>
            <Link to={`/apply/${service.id}/step-1`} className="button button-primary">
              تقديم طلب
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

export default ServicesPage;

