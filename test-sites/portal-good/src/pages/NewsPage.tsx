import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';

const newsArticles = [
  {
    slug: 'accessibility-awards-2024',
    title: 'Portal Good Wins Accessibility Excellence Award 2024',
    date: '2024-01-15',
    author: 'Admin',
    excerpt: 'We are proud to announce that Portal Good has been recognized for outstanding commitment to digital accessibility...',
    image: '/assets/images/news_awards.png',
    imageAlt: 'Award ceremony with accessibility excellence trophy'
  },
  {
    slug: 'wcag-2-2-updates',
    title: 'Understanding WCAG 2.2 Updates and New Success Criteria',
    date: '2024-01-10',
    author: 'Admin',
    excerpt: 'The latest WCAG 2.2 guidelines introduce new success criteria focused on improving accessibility for users with cognitive disabilities...',
    image: '/assets/images/news_wcag.png',
    imageAlt: 'WCAG 2.2 guidelines document cover'
  },
  {
    slug: 'screen-reader-testing',
    title: 'Best Practices for Screen Reader Testing',
    date: '2024-01-05',
    author: 'Admin',
    excerpt: 'Learn how to effectively test your websites with screen readers and ensure your content is accessible to all users...',
    image: '/assets/images/news_testing.png',
    imageAlt: 'Screen reader software interface showing accessibility features'
  },
  {
    slug: 'keyboard-navigation',
    title: 'Mastering Keyboard Navigation in Web Applications',
    date: '2023-12-20',
    author: 'Admin',
    excerpt: 'Keyboard navigation is a fundamental aspect of web accessibility. This article covers best practices and common pitfalls...',
    image: '/assets/images/news_keyboard.png',
    imageAlt: 'Hands typing on a keyboard with focus indicators visible'
  },
  {
    slug: 'aria-basics',
    title: 'ARIA Basics: When and How to Use ARIA Attributes',
    date: '2023-12-15',
    author: 'Admin',
    excerpt: 'ARIA can enhance accessibility when used correctly, but it should complement semantic HTML, not replace it...',
    image: '/assets/images/news_aria.png',
    imageAlt: 'ARIA landmarks diagram showing page structure'
  }
];

function NewsPage() {
  return (
    <div className="page news-page">
      <Breadcrumbs items={[
        { label: 'Home', path: '/' },
        { label: 'News' }
      ]} />
      
      <header>
        <h1>News & Updates</h1>
        <p>Stay informed about the latest in web accessibility and Portal Good updates.</p>
      </header>

      <section aria-labelledby="articles-heading">
        <h2 id="articles-heading" className="sr-only">News Articles</h2>
        <ul className="news-list">
          {newsArticles.map((article) => (
            <li key={article.slug}>
              <article>
                <img
                  src={article.image}
                  alt={article.imageAlt}
                  width="400"
                  height="250"
                />
                <div className="article-content">
                  <h3>
                    <Link to={`/news/${article.slug}`}>{article.title}</Link>
                  </h3>
                  <p className="article-meta">
                    <time dateTime={article.date}>
                      {new Date(article.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </time>
                    {' by '}
                    <span>{article.author}</span>
                  </p>
                  <p>{article.excerpt}</p>
                  <Link to={`/news/${article.slug}`} className="read-more">
                    Read full article
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default NewsPage;

