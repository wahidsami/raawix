import { Link } from 'react-router-dom';
import './index.css';

function App() {
  return (
    <div className="home">
      <div className="home-content">
        <h1>Raawi X Test Sites</h1>
        <p>Test pages for accessibility scanning and widget integration</p>
        <div className="home-links">
          <Link to="/good">Good Page</Link>
          <Link to="/messy">Messy Page</Link>
          <Link to="/bad-example">Bad Example (Vision Test)</Link>
          <Link to="/accessibility-test">Accessibility Test (AI Generated)</Link>
        </div>
      </div>
    </div>
  );
}

export default App;

