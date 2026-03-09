import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import ErrorBoundary from '../ErrorBoundary';

/**
 * AppShell - Professional admin layout with aligned header and sidebar
 */
export default function AdminLayout() {

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Fixed, left in EN, right in AR */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header - Spans remaining width */}
        <Header />

        {/* Content area - No page titles here */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

