import { Link } from 'react-router-dom';

export default function BadExample() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-blue-600">
            Test Portal
          </Link>
          <nav className="flex gap-4">
            <Link to="/" className="text-gray-600 hover:text-gray-900">Home</Link>
            <Link to="/good" className="text-gray-600 hover:text-gray-900">Good</Link>
            <Link to="/messy" className="text-gray-600 hover:text-gray-900">Messy</Link>
            <Link to="/bad-example" className="text-blue-600 font-semibold">Bad Example</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-red-800 mb-2">
            ⚠️ Intentionally Bad Accessibility Examples
          </h1>
          <p className="text-red-700">
            This page contains intentional accessibility violations for testing purposes.
            These should be detected by the vision scanner.
          </p>
        </div>

        {/* Section 1: Unlabeled Buttons */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">1. Unlabeled Buttons (Icon Only)</h2>
          <div className="flex gap-4">
            {/* Bad: Icon button with no accessible name */}
            <button className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              🔍
            </button>
            
            {/* Bad: Icon button with no accessible name */}
            <button className="p-3 bg-green-500 text-white rounded-lg hover:bg-green-600">
              ⚙️
            </button>
            
            {/* Bad: Icon button with no accessible name */}
            <button className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600">
              🗑️
            </button>

            {/* Bad: SVG icon button with no accessible name */}
            <button className="p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            ❌ These buttons have no accessible labels. Vision scanner should detect them.
          </p>
        </section>

        {/* Section 2: Images Without Alt Text */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">2. Images Without Alt Text</h2>
          <div className="grid grid-cols-3 gap-4">
            {/* Bad: No alt text */}
            <div className="border rounded-lg overflow-hidden">
              <img 
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23ff6b6b' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='white'%3EImage 1%3C/text%3E%3C/svg%3E"
                className="w-full"
              />
            </div>

            {/* Bad: Empty alt text on meaningful image */}
            <div className="border rounded-lg overflow-hidden">
              <img 
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%234ecdc4' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='white'%3EImage 2%3C/text%3E%3C/svg%3E"
                alt=""
                className="w-full"
              />
            </div>

            {/* Bad: No alt attribute */}
            <div className="border rounded-lg overflow-hidden">
              <img 
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%2395e1d3' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='white'%3EImage 3%3C/text%3E%3C/svg%3E"
                className="w-full"
              />
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            ❌ These images lack proper alt text. Vision scanner should detect them.
          </p>
        </section>

        {/* Section 3: Clickable Divs (Non-semantic) */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">3. Clickable Elements Without Roles</h2>
          <div className="flex gap-4">
            {/* Bad: Clickable div with no role or accessible name */}
            <div 
              className="p-4 bg-blue-100 rounded-lg cursor-pointer hover:bg-blue-200"
              onClick={() => alert('Clicked!')}
            >
              <span className="text-2xl">📧</span>
            </div>

            {/* Bad: Clickable div with no role or accessible name */}
            <div 
              className="p-4 bg-green-100 rounded-lg cursor-pointer hover:bg-green-200"
              onClick={() => alert('Clicked!')}
            >
              <span className="text-2xl">📱</span>
            </div>

            {/* Bad: Clickable div with no role or accessible name */}
            <div 
              className="p-4 bg-purple-100 rounded-lg cursor-pointer hover:bg-purple-200"
              onClick={() => alert('Clicked!')}
            >
              <span className="text-2xl">💬</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            ❌ These are clickable divs with no roles or labels. Vision scanner should detect them.
          </p>
        </section>

        {/* Section 4: Form Without Labels */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">4. Form Inputs Without Labels</h2>
          <form className="space-y-4">
            {/* Bad: Input with no label */}
            <div>
              <input 
                type="text"
                placeholder="Username"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            {/* Bad: Input with no label */}
            <div>
              <input 
                type="email"
                placeholder="Email Address"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            {/* Bad: Input with no label */}
            <div>
              <input 
                type="password"
                placeholder="Password"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            {/* Bad: Select with no label */}
            <div>
              <select className="w-full px-4 py-2 border rounded-lg">
                <option>Select Country</option>
                <option>USA</option>
                <option>UK</option>
                <option>Canada</option>
              </select>
            </div>

            {/* Bad: Button with just an icon */}
            <button 
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              ➡️
            </button>
          </form>
          <p className="text-sm text-gray-600 mt-4">
            ❌ Form inputs without proper labels. Vision scanner should detect them.
          </p>
        </section>

        {/* Section 5: Links Without Text */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">5. Links Without Descriptive Text</h2>
          <div className="flex gap-4">
            {/* Bad: Link with only an icon */}
            <a href="#" className="text-3xl hover:opacity-70">
              🏠
            </a>

            {/* Bad: Link with only an icon */}
            <a href="#" className="text-3xl hover:opacity-70">
              📄
            </a>

            {/* Bad: Link with only an icon */}
            <a href="#" className="text-3xl hover:opacity-70">
              ⭐
            </a>

            {/* Bad: Link with generic text */}
            <a href="#" className="text-blue-500 underline hover:text-blue-700">
              Click here
            </a>

            {/* Bad: Link with generic text */}
            <a href="#" className="text-blue-500 underline hover:text-blue-700">
              Read more
            </a>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            ❌ Links without descriptive text. Vision scanner should detect icon-only links.
          </p>
        </section>

        {/* Section 6: Custom Controls Without ARIA */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">6. Custom Controls Without ARIA</h2>
          <div className="flex gap-4 items-center">
            {/* Bad: Custom checkbox without proper ARIA */}
            <div className="w-6 h-6 border-2 border-gray-400 rounded cursor-pointer hover:bg-gray-100"></div>
            
            {/* Bad: Custom toggle without proper ARIA */}
            <div className="w-12 h-6 bg-gray-300 rounded-full cursor-pointer hover:bg-gray-400"></div>
            
            {/* Bad: Custom radio without proper ARIA */}
            <div className="w-6 h-6 border-2 border-gray-400 rounded-full cursor-pointer hover:bg-gray-100"></div>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            ❌ Custom controls without ARIA attributes. Vision scanner should detect them.
          </p>
        </section>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">
            Testing Instructions
          </h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1">
            <li>Run the Raawi X scanner on this page</li>
            <li>Check Layer 2 (Vision) findings</li>
            <li>You should see multiple vision findings detected</li>
            <li>Compare with other pages that have 0 vision findings</li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>Test Portal - Bad Accessibility Examples Page</p>
          <p className="text-sm text-gray-400 mt-2">
            These violations are intentional for testing purposes only
          </p>
        </div>
      </footer>
    </div>
  );
}
