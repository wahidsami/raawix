import { useParams, Link } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';

const newsArticles: Record<string, {
  title: string;
  date: string;
  author: string;
  image: string;
  imageAlt: string;
  content: string[];
}> = {
  'accessibility-awards-2024': {
    title: 'Portal Good Wins Accessibility Excellence Award 2024',
    date: '2024-01-15',
    author: 'Admin',
    image: '/assets/images/news_awards.png',
    imageAlt: 'Award ceremony with accessibility excellence trophy',
    content: [
      'We are thrilled to announce that Portal Good has been honored with the Accessibility Excellence Award 2024, recognizing our outstanding commitment to digital accessibility and inclusive design.',
      'This award acknowledges our efforts in creating a website that is not only compliant with WCAG 2.1 Level AA standards but also provides an exceptional user experience for people with disabilities.',
      'Our team has worked tirelessly to ensure that every aspect of Portal Good meets the highest accessibility standards, from semantic HTML structure to comprehensive keyboard navigation support.',
      'We would like to thank all the users, testers, and accessibility advocates who have provided valuable feedback throughout our development process. This award belongs to the entire community that supports inclusive web design.',
      'Looking forward, we remain committed to maintaining and improving our accessibility standards, and we will continue to serve as a reference implementation for accessible web development.'
    ]
  },
  'wcag-2-2-updates': {
    title: 'Understanding WCAG 2.2 Updates and New Success Criteria',
    date: '2024-01-10',
    author: 'Admin',
    image: '/assets/images/news_wcag.png',
    imageAlt: 'WCAG 2.2 guidelines document cover',
    content: [
      'The Web Content Accessibility Guidelines (WCAG) 2.2 was published in October 2023, introducing new success criteria and updates to existing guidelines.',
      'Key additions in WCAG 2.2 include:',
      'Focus Not Obscured (Minimum) - ensures that focused elements are not completely hidden by other content.',
      'Focus Not Obscured (Enhanced) - a more stringent requirement for focus visibility.',
      'Dragging Movements - provides alternatives to drag-and-drop interactions for users who cannot perform dragging gestures.',
      'Target Size (Minimum) - ensures interactive elements are large enough to be easily activated.',
      'Fixed Reference Points - helps users with cognitive disabilities by providing consistent navigation landmarks.',
      'These updates reflect the evolving understanding of accessibility needs and the importance of inclusive design for all users.'
    ]
  },
  'screen-reader-testing': {
    title: 'Best Practices for Screen Reader Testing',
    date: '2024-01-05',
    author: 'Admin',
    image: '/assets/images/news_testing.png',
    imageAlt: 'Screen reader software interface showing accessibility features',
    content: [
      'Screen reader testing is an essential part of ensuring web accessibility. Here are some best practices for effective testing:',
      'Use Multiple Screen Readers: Test with different screen readers (NVDA, JAWS, VoiceOver) as they may interpret content differently.',
      'Test with Real Users: While automated testing is valuable, nothing replaces testing with actual screen reader users who have real-world experience.',
      'Test Keyboard Navigation: Screen reader users typically navigate with keyboards, so ensure all functionality is keyboard accessible.',
      'Check Heading Structure: Screen readers use headings for navigation, so ensure proper heading hierarchy (h1, h2, h3, etc.).',
      'Verify Alt Text: All images should have meaningful alt text that describes the image content and purpose.',
      'Test Forms: Ensure form labels are properly associated with inputs and that error messages are announced correctly.',
      'Check ARIA Usage: Verify that ARIA attributes are used correctly and enhance, rather than conflict with, semantic HTML.',
      'Regular Testing: Accessibility testing should be part of your regular development and QA process, not just a one-time check.'
    ]
  },
  'keyboard-navigation': {
    title: 'Mastering Keyboard Navigation in Web Applications',
    date: '2023-12-20',
    author: 'Admin',
    image: '/assets/images/news_keyboard.png',
    imageAlt: 'Hands typing on a keyboard with focus indicators visible',
    content: [
      'Keyboard navigation is fundamental to web accessibility. Many users rely on keyboards due to motor disabilities, visual impairments, or personal preference.',
      'Key principles of keyboard navigation include:',
      'All interactive elements must be keyboard accessible, including buttons, links, form controls, and custom widgets.',
      'Focus indicators must be visible and clear, allowing users to see which element currently has focus.',
      'Tab order should follow a logical sequence that matches the visual layout of the page.',
      'Keyboard shortcuts should be documented and not conflict with browser or assistive technology shortcuts.',
      'Focus management is crucial in single-page applications and modals to ensure users can navigate effectively.',
      'By following these principles, you can create web applications that are truly accessible to all users.'
    ]
  },
  'aria-basics': {
    title: 'ARIA Basics: When and How to Use ARIA Attributes',
    date: '2023-12-15',
    author: 'Admin',
    image: '/assets/images/news_aria.png',
    imageAlt: 'ARIA landmarks diagram showing page structure',
    content: [
      'ARIA (Accessible Rich Internet Applications) attributes can enhance accessibility, but they should be used thoughtfully and correctly.',
      'The first rule of ARIA is: if you can use native HTML elements, do so. Semantic HTML is always preferred over ARIA.',
      'Use ARIA when:',
      'You need to enhance semantic HTML (e.g., adding descriptions or labels).',
      'You\'re building custom widgets that don\'t have native HTML equivalents.',
      'You need to communicate dynamic content changes to assistive technologies.',
      'Common ARIA attributes include:',
      'aria-label: Provides an accessible name when the visible label is not sufficient.',
      'aria-labelledby: References another element that provides the accessible name.',
      'aria-describedby: References elements that provide additional description.',
      'aria-live: Announces dynamic content changes to screen readers.',
      'aria-expanded: Indicates whether a collapsible element is expanded or collapsed.',
      'Remember: ARIA should complement semantic HTML, not replace it. Always test with screen readers to ensure your ARIA usage is effective.'
    ]
  }
};

function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? newsArticles[slug] : null;

  if (!article) {
    return (
      <div className="page">
        <h1>Article Not Found</h1>
        <p>The article you're looking for doesn't exist.</p>
        <Link to="/news">Back to News</Link>
      </div>
    );
  }

  return (
    <div className="page news-detail-page">
      <Breadcrumbs items={[
        { label: 'Home', path: '/' },
        { label: 'News', path: '/news' },
        { label: article.title }
      ]} />
      
      <article>
        <header>
          <h1>{article.title}</h1>
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
        </header>

        <figure>
          <img
            src={article.image}
            alt={article.imageAlt}
            width="800"
            height="400"
          />
          <figcaption>{article.imageAlt}</figcaption>
        </figure>

        <div className="article-content">
          {article.content.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </article>

      <nav aria-label="Article navigation">
        <Link to="/news" className="button button-secondary">
          Back to News
        </Link>
      </nav>
    </div>
  );
}

export default NewsDetailPage;

