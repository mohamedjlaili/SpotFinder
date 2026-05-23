import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../utils/api';
import { 
  LogIn, 
  Mail, 
  Lock, 
  AlertCircle, 
  Sparkles, 
  Key, 
  X, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  MailOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import appLogo from '../../assets/logo.png';

// ==========================================
// 📧 CONFIGURATION EMAILJS
// Remplacer ces valeurs par vos propres clés EmailJS :
// ==========================================
const EMAILJS_SERVICE_ID: string = 'service_7peb9y8'; // ex: 'service_gmail'
const EMAILJS_TEMPLATE_ID: string = 'template_w4luj7a'; // ex: 'template_verification'
const EMAILJS_PUBLIC_KEY: string = 'a5MxeKpgsEAL4zfQZ'; // ex: 'user_A1B2C3D4E5'

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Forgot Password States
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // Step 1: Email, Step 2: Code, Step 3: Password Reset
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeDigits, setCodeDigits] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [sandboxCode, setSandboxCode] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Incorrect email or password');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset digits when Step 2 opens
  useEffect(() => {
    if (forgotStep === 2) {
      setCodeDigits(['', '', '', '']);
      setTimeout(() => {
        document.getElementById('digit-0')?.focus();
      }, 100);
    }
  }, [forgotStep]);

  // Open Forgot Modal
  const handleOpenForgot = () => {
    setForgotEmail(email); // Autofill with whatever they typed in the login email field
    setForgotStep(1);
    setForgotError('');
    setForgotSuccess(false);
    setSandboxCode(null);
    setIsForgotOpen(true);
  };

  // Send Code via EmailJS or fallback to Sandbox
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotError('');
    setForgotLoading(true);

    let code = '';
    try {
      // 1. Check if the email exists in our database first!
      const exists = await authAPI.checkEmailExists(forgotEmail);
      if (!exists) {
        setForgotError("Aucun compte n'est associé à cette adresse email.");
        setForgotLoading(false);
        return;
      }

      // Generate 4-digit verification code
      code = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedCode(code);

      // Check if EmailJS keys are configured
      if (EMAILJS_SERVICE_ID === 'service_xxxxxx' || !EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID.trim() === '') {
        throw new Error('SANDBOX_MODE');
      }

      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            to_email: forgotEmail,
            email: forgotEmail,
            user_email: forgotEmail,
            recipient: forgotEmail,
            code: code,
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'EmailJS sending failed');
      }

      setForgotStep(2);
    } catch (err: any) {
      if (err.message === 'SANDBOX_MODE') {
        console.log('Using Sandbox Mode for password reset verification code:', code);
        setSandboxCode(code);
        setForgotStep(2);
      } else {
        console.error('EmailJS sending error:', err);
        setForgotError(`Erreur EmailJS : ${err.message || 'Problème de connexion'}`);
      }
    } finally {
      setForgotLoading(false);
    }
  };

  // Verify Code
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = codeDigits.join('');
    
    if (enteredCode.length < 4) {
      setForgotError('Please enter the 4-digit verification code');
      return;
    }

    if (enteredCode !== generatedCode) {
      setForgotError('Incorrect verification code. Please try again.');
      return;
    }

    setForgotError('');
    setForgotStep(3);
  };

  // Reset Password Direct in Backend
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (newPassword.length < 6) {
      setForgotError('The password must contain at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match');
      return;
    }

    setForgotLoading(true);

    try {
      await authAPI.resetPasswordDirect(forgotEmail, newPassword);
      setForgotSuccess(true);
      
      // Auto close after 3 seconds and update password input
      setTimeout(() => {
        setIsForgotOpen(false);
        setPassword(newPassword); // fill in login screen with new password!
      }, 2500);

    } catch (err: any) {
      setForgotError(err.message || 'An error occurred while resetting the password');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 90 }}
        className="w-full"
      >
        <div className="bg-white rounded-3xl border-2 border-slate-200/80 shadow-[0_25px_60px_rgba(79,70,229,0.12)] p-8 relative overflow-hidden">
          {/* Glow blobs on card top corner */}
          <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-2xl opacity-5 -mr-6 -mt-6" />

          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl mb-4 shadow-lg shadow-indigo-500/10 p-0.5">
              <img src={appLogo} alt="SpotFinder Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-3xl font-black text-slate-950 tracking-tight flex items-center justify-center gap-1.5">
              Log In
            </h2>
            <p className="text-slate-600 text-sm font-bold mt-1">Welcome back to SpotFinder</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 font-semibold"
            >
              <AlertCircle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="font-bold">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div>
              <label className="block text-sm font-black text-slate-900 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all text-base font-bold text-slate-900 placeholder-slate-400"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-slate-900 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-600" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-11 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all text-base font-bold text-slate-900 placeholder-slate-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Forgot Password? Link */}
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={handleOpenForgot}
                  className="text-xs font-black text-indigo-600 hover:text-indigo-800 hover:underline transition-all"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-105 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-6"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="w-4.5 h-4.5" />
                  Log In
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center relative z-10">
            <p className="text-slate-700 text-sm font-bold">
              Don't have an account yet?{' '}
              <Link to="/auth/signup" className="text-indigo-600 font-extrabold hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </motion.div>

      {/* ======================================================= */}
      {/* 🔮 GORGEOUS GLASSMORPHIC FORGOT PASSWORD MODAL           */}
      {/* ======================================================= */}
      <AnimatePresence>
        {isForgotOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-white/95 backdrop-blur-lg border-2 border-slate-200 shadow-2xl rounded-3xl p-8 max-w-md w-full relative overflow-hidden"
            >
              {/* Top Close Button */}
              <button
                onClick={() => setIsForgotOpen(false)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title & Icons */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl mb-3">
                  <Key className="w-6 h-6 animate-bounce" />
                </div>
                <h3 className="text-2xl font-black text-slate-950 tracking-tight">
                  Forgot Password
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  Recover your access in 3 quick steps
                </p>
              </div>

              {/* Steps indicators */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                       forgotStep === step 
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' 
                        : forgotStep > step
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                    }`}>
                      {forgotStep > step ? '✓' : step}
                    </div>
                    {step < 3 && (
                      <div className={`w-8 h-1 transition-all rounded ${
                        forgotStep > step ? 'bg-emerald-500' : 'bg-slate-100'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Error Box */}
              {forgotError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-5 p-3.5 bg-rose-50 border-2 border-rose-100 rounded-2xl flex items-start gap-2 text-xs text-rose-900 font-semibold"
                >
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <p className="font-bold">{forgotError}</p>
                </motion.div>
              )}

              {/* Success Box */}
              {forgotSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-5 p-5 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex flex-col items-center text-center gap-2"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-pulse" />
                  <h4 className="text-sm font-black text-emerald-950">Success!</h4>
                  <p className="text-xs text-emerald-900 font-semibold leading-relaxed">
                    Your password has been reset successfully. Redirecting to login...
                  </p>
                </motion.div>
              )}

              {!forgotSuccess && (
                <AnimatePresence mode="wait">
                  {/* STEP 1: ENTER EMAIL */}
                  {forgotStep === 1 && (
                    <motion.form
                      key="step1"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      onSubmit={handleSendCode}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1.5 uppercase tracking-wider">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-600" />
                          <input
                            type="email"
                            required
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all text-base font-bold text-slate-900 placeholder-slate-400"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-relaxed">
                          We will send a 4-digit verification code to this address.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-indigo-600/15 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                      >
                        {forgotLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending code...
                          </>
                        ) : (
                          <>
                            Send Code
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </motion.form>
                  )}

                  {/* STEP 2: ENTER CODE */}
                  {forgotStep === 2 && (
                    <motion.form
                      key="step2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      onSubmit={handleVerifyCode}
                      className="space-y-4 text-center"
                    >
                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1 uppercase tracking-wider">
                          Verification Code
                        </label>
                        <p className="text-[10px] text-slate-400 font-bold leading-relaxed mb-3">
                          Enter the 4-digit code sent to <br />
                          <strong className="text-slate-600 font-black">{forgotEmail}</strong>
                        </p>

                        {/* Developer sandbox code warning banner */}
                        {sandboxCode && (
                          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-left">
                            <div className="flex items-start gap-2">
                              <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <h5 className="text-[11px] font-black text-amber-950 uppercase tracking-wider">Sandbox Mode</h5>
                                <p className="text-[10px] text-amber-900 font-semibold leading-relaxed mt-0.5">
                                  EmailJS not configured. For testing, here is your code: <strong className="text-xs font-black text-amber-600 tracking-wider font-mono">{sandboxCode}</strong>
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 4 Digit custom input */}
                        <div className="flex justify-center gap-3.5 my-5">
                          {codeDigits.map((digit, idx) => (
                            <input
                              key={idx}
                              id={`digit-${idx}`}
                              type="text"
                              maxLength={1}
                              required
                              value={digit}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^[0-9]?$/.test(val)) {
                                  const nextDigits = [...codeDigits];
                                  nextDigits[idx] = val;
                                  setCodeDigits(nextDigits);
                                  // Auto focus next field
                                  if (val && idx < 3) {
                                    document.getElementById(`digit-${idx + 1}`)?.focus();
                                  }
                                }
                              }}
                              onKeyDown={(e) => {
                                // Auto backspace shift focus back
                                if (e.key === 'Backspace' && !codeDigits[idx] && idx > 0) {
                                  document.getElementById(`digit-${idx - 1}`)?.focus();
                                }
                              }}
                              className="w-12 h-14 text-center text-xl font-black bg-slate-50 border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 shadow-inner transition-all font-mono"
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setForgotStep(1)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-2xl font-black transition-all text-xs"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          className="flex-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-indigo-600/15 transition-all text-xs flex items-center justify-center gap-2"
                        >
                          Verify Code
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.form>
                  )}

                  {/* STEP 3: RESET PASSWORD */}
                  {forgotStep === 3 && (
                    <motion.form
                      key="step3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      onSubmit={handleResetPassword}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1.5 uppercase tracking-wider">
                          New Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-600" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                            className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all text-base font-bold text-slate-900 placeholder-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1.5 uppercase tracking-wider">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-600" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all text-base font-bold text-slate-900 placeholder-slate-400"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-105 text-white py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-600/15 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                      >
                        {forgotLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            Save and Log In
                          </>
                        )}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
