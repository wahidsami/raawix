import Breadcrumbs from '../components/Breadcrumbs';

function AccessibilityPage() {
  return (
    <div className="page accessibility-page">
      <Breadcrumbs items={[
        { label: 'Home', path: '/' },
        { label: 'Resources', path: '/resources' },
        { label: 'Accessibility Statement' }
      ]} />
      
      <article>
        <header>
          <h1>Accessibility Statement</h1>
          <p><time dateTime="2024-01-01">Last updated: January 1, 2024</time></p>
        </header>

        <section aria-labelledby="commitment-heading">
          <h2 id="commitment-heading">Our Commitment</h2>
          <p>
            Portal Good is committed to ensuring digital accessibility for people with disabilities.
            We are continually improving the user experience for everyone and applying the relevant
            accessibility standards to achieve these goals.
          </p>
        </section>

        <section aria-labelledby="standards-heading">
          <h2 id="standards-heading">Accessibility Standards</h2>
          <p>
            We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards.
            These guidelines explain how to make web content more accessible for people with disabilities
            and user-friendly for everyone.
          </p>
          <p>
            The guidelines have three levels of conformance (A, AA, and AAA). We have chosen Level AA
            as our target for Portal Good.
          </p>
        </section>

        <section aria-labelledby="features-heading">
          <h2 id="features-heading">Accessibility Features</h2>
          <p>Portal Good includes the following accessibility features:</p>
          <ul>
            <li>Semantic HTML structure with proper heading hierarchy</li>
            <li>Alt text for all images</li>
            <li>Keyboard navigation support for all interactive elements</li>
            <li>Visible focus indicators</li>
            <li>Proper form labels and error messages</li>
            <li>ARIA attributes where appropriate</li>
            <li>Sufficient color contrast ratios</li>
            <li>Responsive design that works on all devices</li>
            <li>Skip to main content link</li>
            <li>Breadcrumb navigation</li>
          </ul>
        </section>

        <section aria-labelledby="testing-heading">
          <h2 id="testing-heading">Testing</h2>
          <p>
            We test Portal Good regularly using automated accessibility testing tools, manual testing
            with screen readers (NVDA, JAWS, VoiceOver), and keyboard-only navigation. We also conduct
            user testing with people with disabilities to ensure our site is truly accessible.
          </p>
        </section>

        <section aria-labelledby="feedback-heading">
          <h2 id="feedback-heading">Feedback</h2>
          <p>
            We welcome your feedback on the accessibility of Portal Good. If you encounter any
            accessibility barriers, please contact us through our{' '}
            <a href="/contact">contact form</a>.
          </p>
        </section>

        <section aria-labelledby="improvements-heading">
          <h2 id="improvements-heading">Ongoing Improvements</h2>
          <p>
            We are committed to continuously improving the accessibility of Portal Good. We regularly
            review and update our content and code to ensure compliance with the latest accessibility
            standards and best practices.
          </p>
        </section>
      </article>
    </div>
  );
}

export default AccessibilityPage;

