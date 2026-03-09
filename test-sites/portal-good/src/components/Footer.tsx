import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer role="contentinfo">
      <div className="footer">
        <div className="footer-container">
          <div className="footer-section">
            <h2>Portal Good</h2>
            <p>An accessible test portal for Raawi X Scanner validation.</p>
          </div>
          
          <div className="footer-section">
            <h3>Quick Links</h3>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/news">News</Link></li>
              <li><Link to="/services">Services</Link></li>
              <li><Link to="/resources">Resources</Link></li>
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/sitemap">Sitemap</Link></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h3>Resources</h3>
            <ul>
              <li><Link to="/resources/accessibility">Accessibility Statement</Link></li>
              <li><a href="https://www.w3.org/WAI/WCAG21/quickref/" target="_blank" rel="noopener noreferrer">WCAG Guidelines</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <p>&copy; 2024 Portal Good. All rights reserved.</p>
            <p>This is a test site for Raawi X accessibility scanning.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

