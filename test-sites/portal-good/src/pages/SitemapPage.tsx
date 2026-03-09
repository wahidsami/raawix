import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';

const sitemap = [
  {
    title: 'Home',
    path: '/',
    children: []
  },
  {
    title: 'About',
    path: '/about',
    children: []
  },
  {
    title: 'News',
    path: '/news',
    children: [
      { title: 'Accessibility Awards 2024', path: '/news/accessibility-awards-2024' },
      { title: 'WCAG 2.2 Updates', path: '/news/wcag-2-2-updates' },
      { title: 'Screen Reader Testing', path: '/news/screen-reader-testing' },
      { title: 'Keyboard Navigation', path: '/news/keyboard-navigation' },
      { title: 'ARIA Basics', path: '/news/aria-basics' }
    ]
  },
  {
    title: 'Services',
    path: '/services',
    children: [
      { title: 'Web Accessibility Audits', path: '/services/web-accessibility' },
      { title: 'Accessibility Consulting', path: '/services/consulting' },
      { title: 'Accessibility Training', path: '/services/training' },
      { title: 'Accessibility Remediation', path: '/services/remediation' },
      { title: 'Accessibility Testing', path: '/services/testing' }
    ]
  },
  {
    title: 'Resources',
    path: '/resources',
    children: [
      { title: 'Accessibility Statement', path: '/resources/accessibility' }
    ]
  },
  {
    title: 'Contact',
    path: '/contact',
    children: []
  },
  {
    title: 'Sitemap',
    path: '/sitemap',
    children: []
  }
];

function SitemapPage() {
  return (
    <div className="page sitemap-page">
      <Breadcrumbs items={[
        { label: 'Home', path: '/' },
        { label: 'Sitemap' }
      ]} />
      
      <header>
        <h1>Sitemap</h1>
        <p>Complete list of all pages on Portal Good.</p>
      </header>

      <nav aria-label="Site map">
        <ul className="sitemap-list">
          {sitemap.map((item) => (
            <li key={item.path}>
              <Link to={item.path}>{item.title}</Link>
              {item.children.length > 0 && (
                <ul>
                  {item.children.map((child) => (
                    <li key={child.path}>
                      <Link to={child.path}>{child.title}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default SitemapPage;

