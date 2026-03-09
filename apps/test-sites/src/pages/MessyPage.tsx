import { useState, useEffect } from 'react';
import './MessyPage.css';

function MessyPage() {
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
      console.warn('Raawi X widget failed to load. Make sure widget is built and served.');
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
    <div className="messy-page">
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
        {/* Messy: Text on image with low contrast */}
        <section className="image-hero">
          <h1>Welcome to the Messy Page</h1>
          <p>This page demonstrates accessibility issues</p>
          {/* Messy: div styled like button, no role/tabindex */}
          <div className="fake-button" onClick={() => setModalOpen(true)}>
            Open Modal
          </div>
        </section>

        {/* Messy: Extra divs wrapping article, missing alt on image, icon-only clickable without accessible name */}
        <div>
          <div>
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
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <figure>
                  <img 
                    src="https://via.placeholder.com/800x400/4a90e2/ffffff?text=Accessible+Landing+Page+Example" 
                    style={{ width: '100%', maxWidth: '800px', height: 'auto', borderRadius: '8px' }}
                  />
                  <figcaption>
                    An example of an accessible web interface with proper semantic structure and clear visual hierarchy.
                  </figcaption>
                </figure>
                {/* Messy: Icon-only clickable element without role/tabindex and without accessible name */}
                <div 
                  onClick={() => alert('Image action clicked')} 
                  style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px', 
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}
                >
                  <span aria-hidden="true">⚙️</span>
                </div>
              </div>
            </article>
          </div>
        </div>

        <section className="cards">
          <article className="card">
            <h2>Inaccessible Design</h2>
            <p>This card has some accessibility problems.</p>
            {/* Messy: Icon-only button without aria-label */}
            <button className="icon-button" onClick={() => alert('Clicked!')}>
              <span aria-hidden="true">→</span>
            </button>
          </article>

          <article className="card">
            <h2>Keyboard Issues</h2>
            <p>Some interactive elements are not keyboard accessible.</p>
            {/* Messy: div button with tabindex misuse */}
            <div className="fake-button" tabIndex={5} onClick={() => alert('Clicked!')}>
              Get Started
            </div>
          </article>

          <article className="card">
            <h2>WCAG Violations</h2>
            <p>This page intentionally violates WCAG guidelines.</p>
            {/* Messy: Link with removed focus indicator */}
            <a href="https://www.w3.org/WAI/WCAG21/quickref/" className="no-focus">
              Read Guidelines
            </a>
          </article>
        </section>

        <section className="form-section">
          <h2>Contact Form</h2>
          <form onSubmit={handleSubmit}>
            {/* Messy: Input missing label, placeholder only (intentional accessibility issue) */}
            <div className="form-group">
              <input
                type="text"
                id="messy-name"
                name="name"
                autoComplete="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Messy: Input missing label, placeholder only (intentional accessibility issue) */}
            <div className="form-group">
              <input
                type="email"
                id="messy-email"
                name="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            {/* Messy: div styled like button */}
            <div className="fake-button" onClick={handleSubmit}>
              Submit
            </div>
          </form>
        </section>
      </main>

      <footer>
        <p>&copy; 2024 Raawi X Test Sites. All rights reserved.</p>
      </footer>

      {/* Messy: Modal without proper ARIA */}
      <div
        className={`modal ${modalOpen ? 'open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setModalOpen(false);
          }
        }}
      >
        <div className="modal-content">
          <h2>Modal Dialog</h2>
          <p>This modal has accessibility issues - missing ARIA attributes.</p>
          {/* Messy: div button, no role */}
          <div className="fake-button" onClick={() => setModalOpen(false)}>
            Close
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessyPage;

