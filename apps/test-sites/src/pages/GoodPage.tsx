import { useState, useEffect } from 'react';
import './GoodPage.css';

function GoodPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  // Inject Raawi X widget
  useEffect(() => {
    // Set feature flags BEFORE script loads so widget can read them
    (window as any).VOICE_ENABLED = true; // Enable voice mode
    (window as any).RAWI_API_URL = 'http://localhost:3001'; // Scanner API URL
    (window as any).RAWI_SCAN_ID = 'latest'; // Use latest scan

    const script = document.createElement('script');
    // Widget is built to apps/widget/dist/widget.iife.js
    // Try to load from same origin (via proxy or public folder)
    script.src = '/widget.iife.js';
    script.async = true;
    script.onload = () => {
      // Widget auto-initializes via window.raawiAccessibilityWidget
      console.log('Raawi X widget loaded with Voice Mode enabled');
    };
    script.onerror = () => {
      console.warn('Raawi X widget failed to load. Make sure widget is built: pnpm --filter widget build');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Form submitted: ${formData.name} - ${formData.email}`);
    setFormData({ name: '', email: '' });
  };

  return (
    <div className="good-page">
      <header>
        <nav>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/good">Good Page</a></li>
            <li><a href="/messy">Messy Page</a></li>
          </ul>
        </nav>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-heading">
          <h1 id="hero-heading">Welcome to the Good Page</h1>
          <p>This page demonstrates proper accessibility practices</p>
          <button className="button" onClick={() => setModalOpen(true)}>
            Open Modal
          </button>
        </section>

        <article aria-labelledby="article-title">
          <h2 id="article-title">Accessibility in Real Interfaces</h2>
          <p>
            Creating accessible web interfaces requires careful attention to semantic HTML, proper ARIA attributes, and meaningful alternative text for images. 
            When developers follow WCAG guidelines, they ensure that all users, including those using assistive technologies, can access and interact with content effectively.
          </p>
          <p>
            The key to accessibility is understanding how screen readers interpret content and how keyboard navigation flows through interactive elements. 
            By testing with actual assistive technologies and following established patterns, we can build interfaces that work for everyone.
          </p>
          <p>
            Modern web development frameworks make it easier than ever to build accessible interfaces, but developers must still be intentional about accessibility from the start. 
            It's much easier to build accessibility in from the beginning than to retrofit it later.
          </p>
          <figure>
            <img 
              src="https://via.placeholder.com/800x400/4a90e2/ffffff?text=Accessible+Landing+Page+Example" 
              alt="Screenshot of an accessible landing page showing clear headings, buttons, and form labels."
              style={{ width: '100%', maxWidth: '800px', height: 'auto', borderRadius: '8px' }}
            />
            <figcaption>
              An example of an accessible web interface with proper semantic structure and clear visual hierarchy.
            </figcaption>
          </figure>
        </article>

        <section className="cards" aria-label="Feature cards">
          <article className="card">
            <h2>Accessible Design</h2>
            <p>This card demonstrates proper semantic HTML and ARIA labels.</p>
            <a href="#form" className="button" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Learn More
            </a>
          </article>

          <article className="card">
            <h2>Keyboard Navigation</h2>
            <p>All interactive elements are keyboard accessible with visible focus indicators.</p>
            <button className="button">Get Started</button>
          </article>

          <article className="card">
            <h2>WCAG Compliance</h2>
            <p>This page follows WCAG 2.1 Level AA guidelines for accessibility.</p>
            <a href="https://www.w3.org/WAI/WCAG21/quickref/" className="button" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Read Guidelines
            </a>
          </article>
        </section>

        <section id="form" className="form-section" aria-labelledby="form-heading">
          <h2 id="form-heading">Contact Form</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="good-name">Name</label>
              <input
                type="text"
                id="good-name"
                name="name"
                autoComplete="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                aria-required="true"
              />
            </div>

            <div className="form-group">
              <label htmlFor="good-email">Email</label>
              <input
                type="email"
                id="good-email"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                aria-required="true"
              />
            </div>

            <button type="submit" className="button">
              Submit
            </button>
          </form>
        </section>
      </main>

      <footer>
        <p>&copy; 2024 Raawi X Test Sites. All rights reserved.</p>
      </footer>

      {/* Modal Dialog */}
      <div
        className={`modal ${modalOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-heading"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setModalOpen(false);
          }
        }}
      >
        <div className="modal-content">
          <h2 id="modal-heading">Modal Dialog</h2>
          <p>This is an accessible modal dialog with proper ARIA attributes.</p>
          <p>Press Escape to close or click the close button.</p>
          <button
            className="modal-close"
            onClick={() => setModalOpen(false)}
            aria-label="Close modal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default GoodPage;

