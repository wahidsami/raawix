import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { getTranslation } from '../i18n/translations';

function HomePage() {
  const { language } = useLanguage();
  
  return (
    <div className="page home-page">
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-content">
          <h1 id="hero-heading">{getTranslation(language, 'home.heroTitle')}</h1>
          <p className="hero-subtitle">
            {language === 'ar' 
              ? 'منصة اختبار شاملة توضح أفضل الممارسات في إمكانية الوصول إلى الويب والامتثال لمستوى AA من WCAG 2.1.'
              : 'A fully accessible test portal demonstrating WCAG 2.1 Level AA compliance.'}
          </p>
          <div className="hero-actions">
            <Link to="/services" className="button button-primary">
              {getTranslation(language, 'home.exploreServices')}
            </Link>
            <Link to="/about" className="button button-secondary">
              {getTranslation(language, 'home.learnMore')}
            </Link>
          </div>
        </div>
        <div className="hero-image">
          <img
            src="/assets/images/good_portal_hero.png"
            alt="Modern office building with glass facade representing accessibility and transparency"
            width="800"
            height="400"
          />
        </div>
      </section>

      <section className="features" aria-labelledby="features-heading">
        <h2 id="features-heading">{getTranslation(language, 'home.features')}</h2>
        <div className="cards-grid">
          <article className="card">
            <img
              src="/assets/images/feature_accessibility.png"
              alt="Accessibility icon showing a person using assistive technology"
              width="300"
              height="200"
            />
            <h3>Accessibility First</h3>
            <p>
              Every component is built with accessibility in mind, following WCAG 2.1 guidelines
              and best practices for inclusive design.
            </p>
            <Link to="/resources/accessibility" className="card-link">
              Read Accessibility Statement
            </Link>
          </article>

          <article className="card">
            <img
              src="/assets/images/feature_semantic.png"
              alt="HTML code structure diagram showing semantic markup"
              width="300"
              height="200"
            />
            <h3>Semantic HTML</h3>
            <p>
              Proper use of semantic elements ensures screen readers and assistive technologies
              can navigate and understand content effectively.
            </p>
            <Link to="/services/web-accessibility" className="card-link">
              Learn More
            </Link>
          </article>

          <article className="card">
            <img
              src="/assets/images/feature_keyboard.png"
              alt="Computer keyboard with highlighted navigation keys"
              width="300"
              height="200"
            />
            <h3>Keyboard Navigation</h3>
            <p>
              All interactive elements are fully keyboard accessible with visible focus indicators
              and logical tab order.
            </p>
            <Link to="/services/training" className="card-link">
              Training Available
            </Link>
          </article>

          <article className="card">
            <img
              src="/assets/images/feature_aria.png"
              alt="ARIA landmarks diagram showing page structure"
              width="300"
              height="200"
            />
            <h3>ARIA When Needed</h3>
            <p>
              ARIA attributes are used appropriately to enhance semantic HTML, not replace it.
              Minimal and correct usage.
            </p>
            <Link to="/resources" className="card-link">
              View Resources
            </Link>
          </article>

          <article className="card">
            <img
              src="/assets/images/feature_testing.png"
              alt="Testing checklist with accessibility criteria"
              width="300"
              height="200"
            />
            <h3>Tested & Validated</h3>
            <p>
              This portal is continuously tested with screen readers, keyboard navigation, and
              automated accessibility tools.
            </p>
            <Link to="/contact" className="card-link">
              Contact Us
            </Link>
          </article>
        </div>
      </section>

      <section className="featured-news" aria-labelledby="news-heading">
        <h2 id="news-heading">{getTranslation(language, 'home.latestNews')}</h2>
        <ul className="news-list">
          <li>
            <article>
              <h3>
                <Link to="/news/accessibility-awards-2024">
                  Portal Good Wins Accessibility Excellence Award 2024
                </Link>
              </h3>
              <p className="news-meta">
                <time dateTime="2024-01-15">January 15, 2024</time> by Admin
              </p>
              <p>
                We are proud to announce that Portal Good has been recognized for outstanding
                commitment to digital accessibility...
              </p>
              <Link to="/news/accessibility-awards-2024" className="read-more">
                Read full article
              </Link>
            </article>
          </li>
          <li>
            <article>
              <h3>
                <Link to="/news/wcag-2-2-updates">
                  Understanding WCAG 2.2 Updates and New Success Criteria
                </Link>
              </h3>
              <p className="news-meta">
                <time dateTime="2024-01-10">January 10, 2024</time> by Admin
              </p>
              <p>
                The latest WCAG 2.2 guidelines introduce new success criteria focused on
                improving accessibility for users with cognitive disabilities...
              </p>
              <Link to="/news/wcag-2-2-updates" className="read-more">
                Read full article
              </Link>
            </article>
          </li>
          <li>
            <article>
              <h3>
                <Link to="/news/screen-reader-testing">
                  Best Practices for Screen Reader Testing
                </Link>
              </h3>
              <p className="news-meta">
                <time dateTime="2024-01-05">January 5, 2024</time> by Admin
              </p>
              <p>
                Learn how to effectively test your websites with screen readers and ensure
                your content is accessible to all users...
              </p>
              <Link to="/news/screen-reader-testing" className="read-more">
                Read full article
              </Link>
            </article>
          </li>
        </ul>
        <div className="section-actions">
          <Link to="/news" className="button button-primary">
            {getTranslation(language, 'home.viewAllNews')}
          </Link>
        </div>
      </section>
    </div>
  );
}

export default HomePage;

