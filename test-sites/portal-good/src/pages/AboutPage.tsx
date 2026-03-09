import Breadcrumbs from '../components/Breadcrumbs';

function AboutPage() {
  return (
    <div className="page about-page">
      <Breadcrumbs items={[
        { label: 'Home', path: '/' },
        { label: 'About' }
      ]} />
      
      <article>
        <header>
          <h1>About Portal Good</h1>
        </header>
        
        <section aria-labelledby="mission-heading">
          <h2 id="mission-heading">Our Mission</h2>
          <p>
            Portal Good is a comprehensive test site designed to demonstrate best practices
            in web accessibility. Our goal is to provide a reference implementation that
            showcases WCAG 2.1 Level AA compliance across all aspects of web development.
          </p>
        </section>

        <section aria-labelledby="values-heading">
          <h2 id="values-heading">Our Values</h2>
          <ul>
            <li>
              <strong>Inclusivity:</strong> We believe the web should be accessible to everyone,
              regardless of ability or the technology they use.
            </li>
            <li>
              <strong>Standards Compliance:</strong> We follow WCAG guidelines and industry
              best practices to ensure our content is accessible.
            </li>
            <li>
              <strong>Continuous Improvement:</strong> We regularly test and update our site
              to maintain and improve accessibility standards.
            </li>
            <li>
              <strong>Education:</strong> We provide resources and examples to help developers
              build more accessible websites.
            </li>
          </ul>
        </section>

        <section aria-labelledby="compliance-heading">
          <h2 id="compliance-heading">Accessibility Compliance</h2>
          <p>
            Portal Good is designed to meet or exceed WCAG 2.1 Level AA standards. This includes:
          </p>
          <ul>
            <li>Semantic HTML structure</li>
            <li>Proper heading hierarchy</li>
            <li>Alt text for all images</li>
            <li>Keyboard navigation support</li>
            <li>Visible focus indicators</li>
            <li>Proper form labels</li>
            <li>ARIA attributes where appropriate</li>
            <li>Sufficient color contrast</li>
            <li>Responsive design</li>
          </ul>
        </section>

        <section aria-labelledby="testing-heading">
          <h2 id="testing-heading">Testing & Validation</h2>
          <p>
            This site is regularly tested using:
          </p>
          <ul>
            <li>Automated accessibility testing tools</li>
            <li>Screen reader testing (NVDA, JAWS, VoiceOver)</li>
            <li>Keyboard-only navigation</li>
            <li>Manual code review</li>
            <li>User testing with people with disabilities</li>
          </ul>
        </section>
      </article>
    </div>
  );
}

export default AboutPage;

