import { buildSemanticModel } from '../dist/index.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const model = buildSemanticModel({
  url: 'https://example.com/login',
  title: 'Login Page',
  pageNumber: 1,
  html: `
    <html>
      <head><title>Login Page</title></head>
      <body>
        <h1>Welcome back</h1>
        <button>Sign in</button>
      </body>
    </html>
  `,
  a11y: [{ role: 'button', ariaLabel: 'Sign in' }],
});

assert(model && typeof model === 'object', 'model must be an object');
assert(Array.isArray(model.structure) && model.structure.length > 0, 'structure must be populated');
assert(Array.isArray(model.actions), 'actions must be an array');
assert(model.actions.some((a) => (a.label || '').toLowerCase().includes('sign in')), 'expected sign-in action');

console.log('[semantic-engine smoke] OK');
