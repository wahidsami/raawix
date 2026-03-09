import React from 'react';

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'sans-serif' },
  header: { backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  headerInner: { maxWidth: '1200px', margin: '0 auto', padding: '16px 24px' },
  headerTitle: { fontSize: '24px', fontWeight: 'bold', color: '#2563eb' },
  banner: { backgroundColor: '#ef4444', color: 'white', padding: '32px', textAlign: 'center' as const },
  bannerTitle: { fontSize: '36px', fontWeight: 'bold', marginBottom: '8px' },
  bannerText: { fontSize: '20px' },
  main: { maxWidth: '1200px', margin: '0 auto', padding: '24px 32px' },
  section: { backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '24px', marginBottom: '24px' },
  sectionTitle: { fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' },
  buttonContainer: { display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' as const },
  button: (color: string) => ({ padding: '12px', backgroundColor: color, color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }),
  warningBox: { backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: '4px', padding: '12px' },
  warningText: { fontSize: '14px', color: '#854d0e', margin: 0 },
  imageGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '16px' },
  image: { width: '100%', borderRadius: '4px' },
  divButton: { padding: '16px', backgroundColor: '#dbeafe', borderRadius: '8px', cursor: 'pointer', textAlign: 'center' as const },
  formInput: { width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', marginBottom: '8px' },
  link: { display: 'inline-block', padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '4px', marginRight: '8px', marginBottom: '8px' },
  lowContrastText: { color: '#9ca3af', fontSize: '16px', marginTop: '12px' },
  customControl: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer' },
  checkbox: { width: '20px', height: '20px', borderRadius: '4px', border: '2px solid #3b82f6', backgroundColor: 'white' },
};

export default function AccessibilityTest() {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <h1 style={styles.headerTitle}>Test Portal</h1>
        </div>
      </header>

      <div style={styles.banner}>
        <h1 style={styles.bannerTitle}>⚠️ ACCESSIBILITY TEST PAGE</h1>
        <p style={styles.bannerText}>Contains INTENTIONAL violations for scanner testing</p>
      </div>

      <main style={styles.main}>
        {/* Section 1: Unlabeled Icon Buttons */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>1. Unlabeled Icon Buttons</h2>
          <div style={styles.buttonContainer}>
            <button style={styles.button('#3b82f6')}>🔍</button>
            <button style={styles.button('#10b981')}>⚙️</button>
            <button style={styles.button('#ef4444')}>🗑️</button>
            <button style={styles.button('#a855f7')}>➕</button>
            <button style={styles.button('#f97316')}>📥</button>
            <button style={styles.button('#eab308')}>🔔</button>
          </div>
          <div style={styles.warningBox}>
            <p style={styles.warningText}>
              ❌ <strong>Violation:</strong> Buttons have no accessible labels
            </p>
          </div>
        </section>

        {/* Section 2: Images Without Alt Text */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>2. Images Without Proper Alt Text</h2>
          <div style={styles.imageGrid}>
            <img 
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23ff6b6b' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='white'%3EProduct 1%3C/text%3E%3C/svg%3E"
              style={styles.image}
            />
            <img 
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%234ecdc4' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='white'%3EProduct 2%3C/text%3E%3C/svg%3E"
              alt=""
              style={styles.image}
            />
            <img 
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%2395e1d3' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='white'%3EProduct 3%3C/text%3E%3C/svg%3E"
              alt="image"
              style={styles.image}
            />
            <img 
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect fill='%23a8e6cf' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='white'%3EProduct 4%3C/text%3E%3C/svg%3E"
              alt="img_1234.jpg"
              style={styles.image}
            />
          </div>
          <div style={styles.warningBox}>
            <p style={styles.warningText}>
              ❌ <strong>Violation:</strong> Images missing alt, empty alt on informative images, or useless alt text
            </p>
          </div>
        </section>

        {/* Section 3: Clickable Divs Without Roles */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Clickable Divs Without Roles</h2>
          <div style={styles.buttonContainer}>
            <div style={styles.divButton} onClick={() => console.log('Email')}>
              <span style={{ fontSize: '32px' }}>📧</span>
            </div>
            <div style={styles.divButton} onClick={() => console.log('Phone')}>
              <span style={{ fontSize: '32px' }}>📱</span>
            </div>
            <div style={styles.divButton} onClick={() => console.log('Chat')}>
              <span style={{ fontSize: '32px' }}>💬</span>
            </div>
            <div style={styles.divButton} onClick={() => console.log('Link')}>
              <span style={{ fontSize: '32px' }}>🔗</span>
            </div>
            <div style={styles.divButton} onClick={() => console.log('Print')}>
              <span style={{ fontSize: '32px' }}>🖨️</span>
            </div>
          </div>
          <div style={styles.warningBox}>
            <p style={styles.warningText}>
              ❌ <strong>Violation:</strong> Interactive elements use &lt;div&gt; tags without role="button" or keyboard handlers
            </p>
          </div>
        </section>

        {/* Section 4: Form Without Labels */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>4. Form Inputs Without Labels</h2>
          <form style={{ maxWidth: '500px' }}>
            <input type="text" placeholder="Username" style={styles.formInput} />
            <input type="email" placeholder="Email Address" style={styles.formInput} />
            <input type="password" placeholder="Password" style={styles.formInput} />
            <input type="tel" placeholder="Phone Number" style={styles.formInput} />
            <select style={styles.formInput}>
              <option>Select Country</option>
            </select>
            <input type="date" style={styles.formInput} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button type="button" style={styles.button('#3b82f6')}>✓</button>
              <button type="button" style={styles.button('#ef4444')}>✗</button>
              <button type="button" style={styles.button('#10b981')}>↻</button>
            </div>
          </form>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#6b7280' }}>Subscribe to newsletter</p>
          <button style={{ ...styles.button('#3b82f6'), marginTop: '8px', padding: '8px 16px' }}>📬</button>
          <div style={styles.warningBox}>
            <p style={styles.warningText}>
              ❌ <strong>Violation:</strong> Inputs missing &lt;label&gt; tags or aria-labels; relying solely on placeholders
            </p>
          </div>
        </section>

        {/* Section 5: Non-Descriptive Links */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>5. Non-Descriptive Links</h2>
          <div>
            <a href="#" style={styles.link}>👆</a>
            <a href="#" style={styles.link}>👇</a>
            <a href="#" style={styles.link}>👉</a>
            <a href="#" style={styles.link}>👈</a>
            <a href="#" style={styles.link}>Click here</a>
            <a href="#" style={styles.link}>Read more</a>
          </div>
          <div style={styles.warningBox}>
            <p style={styles.warningText}>
              ❌ <strong>Violation:</strong> Links without descriptive text, icon-only links
            </p>
          </div>
        </section>

        {/* Section 6: Custom Controls Without ARIA */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>6. Custom Controls Without ARIA</h2>
          <div style={styles.customControl}>
            <div style={styles.checkbox}></div>
            <span>Enable notifications</span>
          </div>
          <div style={styles.customControl}>
            <div style={styles.checkbox}></div>
            <span>Auto-save changes</span>
          </div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}>
              <div style={{ width: '45%', height: '100%', backgroundColor: '#3b82f6', borderRadius: '4px' }}></div>
            </div>
          </div>
          <div style={styles.warningBox}>
            <p style={styles.warningText}>
              ❌ <strong>Violation:</strong> Custom controls without appropriate ARIA roles/states
            </p>
          </div>
        </section>

        {/* Section 7: Low Contrast Text */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>7. Low Contrast Text</h2>
          <p style={{ color: '#d1d5db', fontSize: '14px', marginBottom: '12px' }}>
            This text has very poor contrast against the white background
          </p>
          <p style={styles.lowContrastText}>
            This text also fails WCAG AA contrast requirements
          </p>
          <div style={{ backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '4px', marginTop: '12px' }}>
            <p style={{ color: '#d1d5db', margin: 0 }}>Light gray text on light gray background</p>
          </div>
          <div style={styles.warningBox}>
            <p style={styles.warningText}>
              ❌ <strong>Violation:</strong> Text color contrast ratio below WCAG standards
            </p>
          </div>
        </section>

        {/* Section 8: Skipped Heading Levels */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>8. Skipped Heading Levels</h2>
          <h5 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>This is an H5 (skipped H3 and H4)</h5>
          <p style={{ marginBottom: '12px', color: '#4b5563' }}>Content under improperly nested heading</p>
          <h6 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>This is an H6</h6>
          <p style={{ marginBottom: '12px', color: '#4b5563' }}>More content under skipped headings</p>
          <div style={styles.warningBox}>
            <p style={styles.warningText}>
              ❌ <strong>Violation:</strong> Heading levels skipped (H2 → H5 → H6 without H3/H4)
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
