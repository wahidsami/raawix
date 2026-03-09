import { Link } from 'react-router-dom';

function DashboardPage() {
  return (
    <div className="page dashboard-page">
      <h1>لوحة التحكم</h1>
      
      <section>
        <h2>الخدمات السريعة</h2>
        <div className="quick-services">
          <Link to="/services/renew-id" className="service-card">
            <h3>تجديد الهوية</h3>
            <p>تقديم طلب تجديد الهوية الوطنية</p>
          </Link>
          <Link to="/services/certificates" className="service-card">
            <h3>استخراج الشهادات</h3>
            <p>طلب استخراج الشهادات الرسمية</p>
          </Link>
        </div>
      </section>

      <section>
        <h2>الطلبات الأخيرة</h2>
        <p>لا توجد طلبات حالياً</p>
      </section>
    </div>
  );
}

export default DashboardPage;

