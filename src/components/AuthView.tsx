import React, { useState } from "react";
import { Target, Lock, Mail, ArrowRight, Fingerprint, Chrome, CheckSquare, Square, User as UserIcon } from "lucide-react";
import api from "@/lib/api";

interface AuthViewProps {
  onLogin: (token: string, user: any) => void;
}

export function AuthView({ onLogin }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isLogin && !acceptedTerms) {
      setError("Please accept the Terms and Conditions to create an account.");
      return;
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        onLogin(res.data.token, res.data.user);
      } else {
        const res = await api.post('/auth/register', { name, email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        onLogin(res.data.token, res.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (resetStep === 1) {
        await api.post('/auth/forgot-password', { email });
        setSuccess("Password reset token sent to your email.");
        setResetStep(2);
      } else {
        await api.post('/auth/reset-password', { token: resetToken, newPassword });
        setSuccess("Password reset successfully. You can now log in.");
        setIsForgotPassword(false);
        setResetStep(1);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Action failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError("");
    if (!isLogin && !acceptedTerms && !isForgotPassword) {
      setError("Please accept the Terms and Conditions to create an account.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/google');
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.token, res.data.user);
    } catch (err: any) {
      setError("Google Auth failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleThirdPartyAuth = () => {
    if (!isLogin && !acceptedTerms) {
      setError("Please accept the Terms and Conditions to create an account.");
      return;
    }
    setError("Third party authentication is not yet implemented.");
  };

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen text-brand-text-primary px-4 relative bg-brand-bg"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(26, 28, 35, 0.75), rgba(26, 28, 35, 0.95)), url('https://images.unsplash.com/photo-1508344928928-7137b29de218?q=80&w=2000&auto=format&fit=crop')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full max-w-md bg-brand-surface p-8 rounded-[24px] border border-brand-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
        
        <div className="flex flex-col items-center mb-8 text-center relative z-10">
          <div className="w-16 h-16 bg-brand-accent-dim rounded-[20px] border border-brand-accent/20 flex flex-col items-center justify-center mb-6">
            <Target className="w-8 h-8 text-brand-accent" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-brand-text-primary flex items-center gap-1 mb-2">
            SPORT<span className="text-brand-accent">HUB</span>
          </h1>
          <p className="text-brand-text-secondary text-sm">
            {isLogin ? "Welcome back. Continue your journey." : "Join the elite tracking community."}
          </p>
        </div>

        <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-4 relative z-10">
          {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}
          {success && <div className="text-emerald-400 text-sm bg-emerald-400/10 p-3 rounded-lg border border-emerald-400/20">{success}</div>}
          
          {!isLogin && !isForgotPassword && (
            <div>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-secondary" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name" 
                  className="w-full bg-brand-surface-light border border-brand-border rounded-[16px] py-4 pl-12 pr-4 text-brand-text-primary focus:outline-none focus:ring-1 focus:ring-brand-accent/50 transition-all text-sm placeholder:text-brand-text-secondary"
                  required
                />
              </div>
            </div>
          )}
          {(!isForgotPassword || resetStep === 1) && (
            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-secondary" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address" 
                  className="w-full bg-brand-surface-light border border-brand-border rounded-[16px] py-4 pl-12 pr-4 text-brand-text-primary focus:outline-none focus:ring-1 focus:ring-brand-accent/50 transition-all text-sm placeholder:text-brand-text-secondary"
                  required
                />
              </div>
            </div>
          )}

          {(!isForgotPassword) && (
            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-secondary" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password" 
                  className="w-full bg-brand-surface-light border border-brand-border rounded-[16px] py-4 pl-12 pr-4 text-brand-text-primary focus:outline-none focus:ring-1 focus:ring-brand-accent/50 transition-all text-sm placeholder:text-brand-text-secondary"
                  required
                />
              </div>
              {isLogin && (
                <div className="text-right mt-2">
                  <button type="button" onClick={() => { setIsForgotPassword(true); setResetStep(1); setError(""); setSuccess(""); }} className="text-xs text-brand-text-secondary hover:text-brand-accent transition-colors">
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>
          )}

          {isForgotPassword && resetStep === 2 && (
            <>
              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-secondary" />
                  <input 
                    type="text" 
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Reset Token (sent to email)" 
                    className="w-full bg-brand-surface-light border border-brand-border rounded-[16px] py-4 pl-12 pr-4 text-brand-text-primary focus:outline-none focus:ring-1 focus:ring-brand-accent/50 transition-all text-sm placeholder:text-brand-text-secondary"
                    required
                  />
                </div>
              </div>
              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-secondary" />
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password" 
                    className="w-full bg-brand-surface-light border border-brand-border rounded-[16px] py-4 pl-12 pr-4 text-brand-text-primary focus:outline-none focus:ring-1 focus:ring-brand-accent/50 transition-all text-sm placeholder:text-brand-text-secondary"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {!isLogin && !isForgotPassword && (
            <div 
              className="flex items-center gap-3 mt-4 cursor-pointer"
              onClick={() => setAcceptedTerms(!acceptedTerms)}
            >
              <div className="text-brand-accent shrink-0">
                {acceptedTerms ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-brand-text-secondary" />}
              </div>
              <p className="text-xs text-brand-text-secondary">
                I agree to the <span className="text-brand-accent underline">Terms & Conditions</span> and <span className="text-brand-accent underline">Privacy Policy</span>.
              </p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-accent hover:bg-[#b0d800] text-black font-bold py-4 rounded-[16px] flex items-center justify-center gap-2 transition-colors mt-6 shadow-[0_0_20px_rgba(212,255,0,0.15)] disabled:opacity-50"
          >
            {isForgotPassword 
              ? (resetStep === 1 ? "Send Reset Email" : "Reset Password") 
              : (isLogin ? "Sign In" : "Create Account")
            }
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        {!isForgotPassword && (
          <>
            <div className="relative my-8 z-10 flex items-center justify-center">
              <div className="absolute border-t border-brand-border w-full left-0"></div>
              <span className="bg-brand-surface px-4 text-xs text-brand-text-secondary relative z-10">OR CONTINUE WITH</span>
            </div>

            <div className="flex gap-4 relative z-10">
              <button 
                onClick={handleGoogleAuth}
                className="flex-1 bg-brand-surface-light border border-brand-border hover:bg-brand-border/50 text-brand-text-primary font-medium py-3 rounded-[16px] flex items-center justify-center gap-2 transition-colors"
              >
                <Chrome className="w-5 h-5" />
                <span className="text-sm">Google</span>
              </button>
              <button 
                onClick={handleThirdPartyAuth}
                className="flex-1 bg-brand-surface-light border border-brand-border hover:bg-brand-border/50 text-brand-text-primary font-medium py-3 rounded-[16px] flex items-center justify-center gap-2 transition-colors"
              >
                <Fingerprint className="w-5 h-5" />
                <span className="text-sm">Biometric</span>
              </button>
            </div>
          </>
        )}

        <div className="mt-8 text-center relative z-10">
          {isForgotPassword ? (
            <button 
              onClick={() => { setIsForgotPassword(false); setError(""); setSuccess(""); }}
              className="text-sm border-none bg-transparent text-brand-text-secondary hover:text-brand-text-primary transition-colors font-medium"
            >
              Back to Sign in
            </button>
          ) : (
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(""); setSuccess(""); }}
              className="text-sm border-none bg-transparent text-brand-text-secondary hover:text-brand-text-primary transition-colors font-medium"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
