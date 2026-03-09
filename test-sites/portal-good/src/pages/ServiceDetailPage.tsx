import { useParams, Link } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import Modal from '../components/Modal';
import { useState } from 'react';

const serviceDetails: Record<string, {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  features: string[];
  pricing: string;
}> = {
  'web-accessibility': {
    title: 'Web Accessibility Audits',
    description: 'Comprehensive accessibility audits of your websites and web applications to identify barriers and provide actionable recommendations.',
    image: '/assets/images/service_audit.png',
    imageAlt: 'Accessibility audit checklist with checkmarks',
    features: [
      'Automated testing with multiple tools',
      'Manual testing with screen readers',
      'Keyboard navigation testing',
      'Color contrast analysis',
      'Detailed report with prioritized recommendations',
      'WCAG 2.1 Level AA compliance verification'
    ],
    pricing: 'Starting at $2,500 per audit'
  },
  'consulting': {
    title: 'Accessibility Consulting',
    description: 'Expert guidance on implementing accessibility best practices in your projects from design to deployment.',
    image: '/assets/images/service_consulting.png',
    imageAlt: 'Two people discussing accessibility solutions at a table',
    features: [
      'Design review and recommendations',
      'Development guidance and code review',
      'Accessibility strategy planning',
      'Team training and workshops',
      'Ongoing support and Q&A',
      'Compliance roadmap development'
    ],
    pricing: 'Hourly rates available, contact for quote'
  },
  'training': {
    title: 'Accessibility Training',
    description: 'Training programs for developers and designers on accessible web development practices and WCAG guidelines.',
    image: '/assets/images/service_training.png',
    imageAlt: 'Training session with participants learning about accessibility',
    features: [
      'Introduction to web accessibility',
      'WCAG 2.1 guidelines deep dive',
      'Hands-on coding exercises',
      'Screen reader demonstrations',
      'Testing and validation techniques',
      'Custom training programs available'
    ],
    pricing: 'Group training: $1,500 per day'
  },
  'remediation': {
    title: 'Accessibility Remediation',
    description: 'Fix existing accessibility issues and bring your site into WCAG 2.1 Level AA compliance.',
    image: '/assets/images/service_remediation.png',
    imageAlt: 'Code editor showing accessibility improvements',
    features: [
      'Issue identification and prioritization',
      'Code fixes and implementation',
      'Content updates (alt text, labels)',
      'ARIA implementation where needed',
      'Testing and validation',
      'Documentation of changes'
    ],
    pricing: 'Project-based, contact for estimate'
  },
  'testing': {
    title: 'Accessibility Testing',
    description: 'Automated and manual testing services to identify accessibility barriers and verify compliance.',
    image: '/assets/images/service_testing.png',
    imageAlt: 'Testing tools and screen reader software',
    features: [
      'Automated testing suite',
      'Screen reader testing (NVDA, JAWS, VoiceOver)',
      'Keyboard-only navigation testing',
      'Mobile accessibility testing',
      'User testing with people with disabilities',
      'Detailed test reports'
    ],
    pricing: 'Starting at $1,000 per test cycle'
  }
};

function ServiceDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const [modalOpen, setModalOpen] = useState(false);
  const service = serviceId ? serviceDetails[serviceId] : null;

  if (!service) {
    return (
      <div className="page">
        <h1>Service Not Found</h1>
        <p>The service you're looking for doesn't exist.</p>
        <Link to="/services">Back to Services</Link>
      </div>
    );
  }

  return (
    <div className="page service-detail-page">
      <Breadcrumbs items={[
        { label: 'Home', path: '/' },
        { label: 'Services', path: '/services' },
        { label: service.title }
      ]} />
      
      <article>
        <header>
          <h1>{service.title}</h1>
        </header>

        <img
          src={service.image}
          alt={service.imageAlt}
          width="800"
          height="400"
        />

        <section aria-labelledby="description-heading">
          <h2 id="description-heading">Service Description</h2>
          <p>{service.description}</p>
        </section>

        <section aria-labelledby="features-heading">
          <h2 id="features-heading">What's Included</h2>
          <ul>
            {service.features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="pricing-heading">
          <h2 id="pricing-heading">Pricing</h2>
          <p>{service.pricing}</p>
        </section>

        <div className="service-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() => setModalOpen(true)}
          >
            Request Quote
          </button>
          <Link to="/contact" className="button button-secondary">
            Contact Us
          </Link>
        </div>
      </article>

      <nav aria-label="Service navigation">
        <Link to="/services" className="button button-secondary">
          Back to Services
        </Link>
      </nav>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Request Quote"
      >
        <p>Thank you for your interest in {service.title}.</p>
        <p>Please contact us using the form on our <Link to="/contact">Contact page</Link> to receive a detailed quote.</p>
        <button
          type="button"
          className="button button-primary"
          onClick={() => {
            setModalOpen(false);
            window.location.href = '/contact';
          }}
        >
          Go to Contact Form
        </button>
      </Modal>
    </div>
  );
}

export default ServiceDetailPage;

