import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';

const resources = [
  {
    id: 'wcag-quickref',
    title: 'WCAG 2.1 Quick Reference',
    type: 'Guide',
    format: 'PDF',
    size: '2.5 MB',
    description: 'A comprehensive quick reference guide to WCAG 2.1 success criteria.',
    downloadUrl: '#'
  },
  {
    id: 'aria-patterns',
    title: 'ARIA Authoring Practices Guide',
    type: 'Guide',
    format: 'HTML',
    size: 'Online',
    description: 'W3C guide to ARIA patterns and best practices for accessible widgets.',
    downloadUrl: 'https://www.w3.org/WAI/ARIA/apg/'
  },
  {
    id: 'screen-reader-testing',
    title: 'Screen Reader Testing Checklist',
    type: 'Checklist',
    format: 'PDF',
    size: '500 KB',
    description: 'Step-by-step checklist for testing websites with screen readers.',
    downloadUrl: '#'
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Navigation Patterns',
    type: 'Guide',
    format: 'PDF',
    size: '1.2 MB',
    description: 'Common keyboard navigation patterns and implementation examples.',
    downloadUrl: '#'
  },
  {
    id: 'color-contrast',
    title: 'Color Contrast Calculator',
    type: 'Tool',
    format: 'Web',
    size: 'Online',
    description: 'Interactive tool for checking color contrast ratios.',
    downloadUrl: 'https://webaim.org/resources/contrastchecker/'
  },
  {
    id: 'accessibility-statement',
    title: 'Accessibility Statement Template',
    type: 'Template',
    format: 'DOCX',
    size: '300 KB',
    description: 'Template for creating your own accessibility statement.',
    downloadUrl: '#'
  }
];

function ResourcesPage() {
  return (
    <div className="page resources-page">
      <Breadcrumbs items={[
        { label: 'Home', path: '/' },
        { label: 'Resources' }
      ]} />
      
      <header>
        <h1>Resources</h1>
        <p>Downloadable guides, checklists, and tools to help you build accessible websites.</p>
      </header>

      <section aria-labelledby="resources-heading">
        <h2 id="resources-heading" className="sr-only">Resource List</h2>
        <table className="resources-table">
          <caption>Available Resources</caption>
          <thead>
            <tr>
              <th scope="col">Title</th>
              <th scope="col">Type</th>
              <th scope="col">Format</th>
              <th scope="col">Size</th>
              <th scope="col">Description</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr key={resource.id}>
                <td>{resource.title}</td>
                <td>{resource.type}</td>
                <td>{resource.format}</td>
                <td>{resource.size}</td>
                <td>{resource.description}</td>
                <td>
                  <a
                    href={resource.downloadUrl}
                    target={resource.downloadUrl.startsWith('http') ? '_blank' : undefined}
                    rel={resource.downloadUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="button button-small"
                  >
                    {resource.format === 'Web' ? 'Visit' : 'Download'}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="accessibility-heading">
        <h2 id="accessibility-heading">Accessibility Resources</h2>
        <p>
          For more information about our commitment to accessibility, please visit our{' '}
          <Link to="/resources/accessibility">Accessibility Statement</Link>.
        </p>
      </section>
    </div>
  );
}

export default ResourcesPage;

