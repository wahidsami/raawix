import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import GoodPage from './pages/GoodPage';
import MessyPage from './pages/MessyPage';
import BadExample from './pages/BadExample';
import AccessibilityTest from './pages/AccessibilityTest';
import './index.css';

// Suppress React Router deprecation warnings
const routerConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter future={routerConfig.future}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/good" element={<GoodPage />} />
        <Route path="/messy" element={<MessyPage />} />
        <Route path="/bad-example" element={<BadExample />} />
        <Route path="/accessibility-test" element={<AccessibilityTest />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

