import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { getTranslation } from '../i18n/translations';

function LandingPage() {
  const { language } = useLanguage();
  
  return (
    <div className="page landing-page">
      <section className="hero">
        {/* INTENTIONAL ISSUE: Missing alt text on hero image */}
        <img
          src="/assets/images/gov_hero.png"
          width="1200"
          height="400"
          style={{ width: '100%', height: 'auto' }}
        />
        <div className="hero-content">
          <h1>{getTranslation(language, 'landing.title')}</h1>
          <p>{getTranslation(language, 'landing.subtitle')}</p>
          <Link to="/login" className="button button-primary">
            {getTranslation(language, 'landing.login')}
          </Link>
        </div>
      </section>

      <section className="services-preview">
        <h2>{getTranslation(language, 'landing.services')}</h2>
        <div className="cards-grid">
          <div className="card">
            {/* INTENTIONAL ISSUE: Missing alt text on service card image */}
            <img
              src="/assets/images/service_card_1.png"
              width="300"
              height="200"
            />
            <h3>خدمة تجديد الهوية</h3>
            <p>تقديم طلب تجديد الهوية الوطنية</p>
            {/* INTENTIONAL ISSUE: Generic "Learn more" button without proper accessible name */}
            <button type="button" className="button">
              المزيد
            </button>
          </div>

          <div className="card">
            <img
              src="/assets/images/service_card_2.png"
              alt="خدمة استخراج شهادة"
              width="300"
              height="200"
            />
            <h3>خدمة استخراج الشهادات</h3>
            <p>طلب استخراج الشهادات الرسمية</p>
            <Link to="/services/certificates" className="button">
              المزيد
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;

