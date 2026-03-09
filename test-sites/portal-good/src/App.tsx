import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import './App.css';
import AboutPage from './pages/AboutPage';
import NewsPage from './pages/NewsPage';
import NewsDetailPage from './pages/NewsDetailPage';
import ServicesPage from './pages/ServicesPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import ResourcesPage from './pages/ResourcesPage';
import AccessibilityPage from './pages/AccessibilityPage';
import ContactPage from './pages/ContactPage';
import SitemapPage from './pages/SitemapPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:slug" element={<NewsDetailPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/services/:serviceId" element={<ServiceDetailPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/resources/accessibility" element={<AccessibilityPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/sitemap" element={<SitemapPage />} />
      </Routes>
    </Layout>
  );
}

export default App;

