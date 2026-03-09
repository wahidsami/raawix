import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';

const services = [
  {
    id: 'web-accessibility',
    title: 'Web Accessibility Audits',
    description: 'Comprehensive accessibility audits of your websites and web applications.',
    image: '/assets/images/service_audit.png',
    imageAlt: 'Accessibility audit checklist with checkmarks'
  },
  {
    id: 'consulting',
    title: 'Accessibility Consulting',
    description: 'Expert guidance on implementing accessibility best practices in your projects.',
    image: '/assets/images/service_consulting.png',
    imageAlt: 'Two people discussing accessibility solutions at a table'
  },
  {
    id: 'training',
    title: 'Accessibility Training',
    description: 'Training programs for developers and designers on accessible web development.',
    image: '/assets/images/service_training.png',
    imageAlt: 'Training session with participants learning about accessibility'
  },
  {
    id: 'remediation',
    title: 'Accessibility Remediation',
    description: 'Fix existing accessibility issues and bring your site into compliance.',
    image: '/assets/images/service_remediation.png',
    imageAlt: 'Code editor showing accessibility improvements'
  },
  {
    id: 'testing',
    title: 'Accessibility Testing',
    description: 'Automated and manual testing services to identify accessibility barriers.',
    image: '/assets/images/service_testing.png',
    imageAlt: 'Testing tools and screen reader software'
  }
];

function ServicesPage() {
  return (
    <div className="page services-page">
      <Breadcrumbs items={[
        { label: 'Home', path: '/' },
        { label: 'Services' }
      ]} />
      
      <header>
        <h1>Our Services</h1>
        <p>Comprehensive accessibility services to help you create inclusive digital experiences.</p>
      </header>

      <section aria-labelledby="services-heading">
        <h2 id="services-heading" className="sr-only">Service Listings</h2>
        <div className="cards-grid">
          {services.map((service) => (
            <article key={service.id} className="card">
              <img
                src={service.image}
                alt={service.imageAlt}
                width="400"
                height="250"
              />
              <div className="card-content">
                <h3>
                  <Link to={`/services/${service.id}`}>{service.title}</Link>
                </h3>
                <p>{service.description}</p>
                <Link to={`/services/${service.id}`} className="card-link">
                  Learn More
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ServicesPage;

