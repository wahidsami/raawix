import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function VerifyPage() {
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate verification success
    login('mock-token-' + Date.now());
    navigate('/dashboard');
  };

  return (
    <div className="page verify-page">
      <div className="verify-container">
        <h1>التحقق من الهوية</h1>
        <p>الرجاء الموافقة على طلب تسجيل الدخول من تطبيق النفاذ الوطني على هاتفك</p>
        
        <div className="verify-instructions">
          <p>1. افتح تطبيق النفاذ الوطني</p>
          <p>2. وافق على طلب تسجيل الدخول</p>
          <p>3. أدخل رمز التحقق أدناه (للاختبار فقط)</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="otp">رمز التحقق (للاختبار: أي رقم)</label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              placeholder="000000"
            />
          </div>

          <button type="submit" className="button button-primary">
            تأكيد
          </button>
        </form>

        <button
          type="button"
          className="button button-secondary"
          onClick={() => navigate('/login')}
        >
          العودة
        </button>
      </div>
    </div>
  );
}

export default VerifyPage;

