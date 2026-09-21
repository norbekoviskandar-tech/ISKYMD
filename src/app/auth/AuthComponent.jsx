"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser, registerUser } from "@/auth/auth.logic";
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AuthComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const user = await loginUser(loginEmail, loginPassword);

      if (!user) {
        setLoginError("Invalid email or password. Please try again.");
        setLoginLoading(false);
        return;
      }

      const userRole = (user.role || '').toLowerCase().trim();
      console.log('Login success - received user:', { id: user.id, role: userRole });

      if (redirectPath) {
        console.log('Redirecting to manual redirect path:', redirectPath);
        router.push(redirectPath);
        return;
      }

      if (userRole === 'author') {
        console.log('Redirecting to Author Portal...');
        router.push("/author");
      } else {
        console.log('Redirecting to Student Portal...');
        router.push("/student/portal");
      }
    } catch (err) {
      console.error('Login handle error:', err);
      // Use the specific error message from the API/Logic if available
      setLoginError(err || "An unexpected error occurred. Please try again.");
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError("");

    if (registerPassword !== confirmPassword) {
      setRegisterError("Passwords do not match");
      setRegisterLoading(false);
      return;
    }

    if (registerPassword.length < 6) {
      setRegisterError("Password must be at least 6 characters");
      setRegisterLoading(false);
      return;
    }

    try {
      await registerUser(registerName, registerEmail, registerPassword);
      setRegisterSuccess(true);
      setTimeout(() => {
        // Auto-login after registration
        loginUser(registerEmail, registerPassword).then((user) => {
          if (redirectPath) {
            router.push(redirectPath);
          } else {
            router.push("/student/portal");
          }
        });
      }, 1500);
    } catch (err) {
      setRegisterError(err?.message || err || "Failed to create account. Please try again.");
      setRegisterLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError("");
    
    try {
      const { getUserByEmail } = await import("@/services/user.service");
      const user = await getUserByEmail(forgotEmail);
      
      if (!user) {
        setForgotError("Email address not found in our records.");
        setForgotLoading(false);
        return;
      }
      
      // Email matches found user info, proceed with instructions
      setForgotSuccess(true);
      // In a real app, this would trigger an actual email service
      console.log(`Password reset instructions sent to ${forgotEmail}`);
      
    } catch (err) {
      setForgotError("An error occurred. Please try again later.");
    } finally {
      setForgotLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#fcfdfe] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="flex items-center">
              <span className="text-2xl font-black text-[#1d46af] tracking-tight">Isky</span>
              <div className="relative ml-2 w-10 h-10 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[2.5px] border-[#1d46af]"></div>
                <div className="absolute inset-[3px] rounded-full border border-amber-400 opacity-80"></div>
                <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                <span className="text-[#1d46af] font-black text-[12px] tracking-tighter">MD</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Login Section */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border-2 border-slate-100">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Login</h2>
            <p className="text-slate-500 text-sm mb-8">Sign in using your IskyMD account</p>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3.5 pl-12 pr-4 text-sm font-bold text-black focus:outline-none focus:border-[#1d46af] transition-colors"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3.5 pl-12 pr-12 text-sm font-bold text-black focus:outline-none focus:border-[#1d46af] transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                  >
                    {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 accent-[#1d46af]" />
                    <span className="text-slate-500 font-medium group-hover:text-slate-700 transition-colors">Remember me</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={showLoginPassword}
                      onChange={() => setShowLoginPassword(!showLoginPassword)}
                      className="w-4 h-4 rounded border-slate-300 accent-[#1d46af]"
                    />
                    <span className="text-slate-500 font-medium group-hover:text-slate-700 transition-colors">Show password</span>
                  </label>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[#1d46af] font-bold hover:underline self-start"
                >
                  Forgot Password?
                </button>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm font-medium">
                  <AlertCircle size={16} />
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-4 bg-[#1d46af] text-white text-sm font-black rounded-xl hover:bg-[#16368a] transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
              >
                {loginLoading ? "SIGNING IN..." : "LOGIN"}
              </button>
            </form>
          </div>

          {/* Register Section */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border-2 border-slate-100">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Register</h2>
            <p className="text-slate-500 text-sm mb-8">Create your IskyMD account</p>

            {registerSuccess ? (
              <div className="py-12 text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={40} className="text-emerald-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Account Created!</h3>
                <p className="text-slate-500 font-medium">Redirecting you to your portal...</p>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">First Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input
                        type="text"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3.5 pl-12 pr-4 text-sm font-bold text-black focus:outline-none focus:border-[#1d46af] transition-colors"
                        placeholder="First name"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Last Name</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3.5 px-4 text-sm font-bold text-black focus:outline-none focus:border-[#1d46af] transition-colors"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3.5 pl-12 pr-4 text-sm font-bold text-black focus:outline-none focus:border-[#1d46af] transition-colors"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type={showRegisterPassword ? "text" : "password"}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3.5 pl-12 pr-12 text-sm font-bold text-black focus:outline-none focus:border-[#1d46af] transition-colors"
                      placeholder="Create password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                    >
                      {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3.5 pl-12 pr-12 text-sm font-bold text-black focus:outline-none focus:border-[#1d46af] transition-colors"
                      placeholder="Confirm password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  By clicking &quot;Register&quot;, I confirm that I am over the age of 13 and agree to IskyMD&apos;s{" "}
                  <a href="#" className="text-[#1d46af] font-bold hover:underline">Terms of Use</a> and{" "}
                  <a href="#" className="text-[#1d46af] font-bold hover:underline">Privacy Policy</a>.
                </div>

                {registerError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm font-medium">
                    <AlertCircle size={16} />
                    {registerError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={registerLoading}
                  className="w-full py-4 bg-[#1d46af] text-white text-sm font-black rounded-xl hover:bg-[#16368a] transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                >
                  {registerLoading ? "CREATING ACCOUNT..." : "REGISTER"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 mx-auto border border-blue-100 text-[#1d46af]">
                <Mail size={32} />
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 text-center mb-2 tracking-tight">Recover Password</h3>
              <p className="text-center text-slate-500 text-sm font-medium mb-8">
                Enter your registered email address to receive password reset instructions.
              </p>

              {forgotSuccess ? (
                <div className="text-center py-6 animate-in zoom-in duration-300">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4 mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Email Sent!</h4>
                  <p className="text-sm text-slate-500 mt-2">
                    Check your inbox at <span className="font-bold text-slate-700">{forgotEmail}</span> for instructions to reset your password.
                  </p>
                  <button 
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotSuccess(false);
                      setForgotEmail("");
                    }}
                    className="mt-8 w-full py-4 bg-slate-900 text-white text-sm font-black rounded-xl hover:bg-slate-800 transition-all active:scale-95"
                  >
                    BACK TO LOGIN
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  {forgotError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm font-medium animate-in shake duration-300">
                      <AlertCircle size={16} />
                      {forgotError}
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-2">Registration Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. name@example.com"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pl-11 pr-4 text-sm font-bold text-black focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-[#1d46af]/30 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-4">
                    <button 
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-4 bg-[#1d46af] text-white text-sm font-black rounded-xl hover:bg-[#16368a] transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                    >
                      {forgotLoading ? "VERIFYING..." : "SEND INSTRUCTIONS"}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="w-full py-4 bg-white text-slate-400 text-sm font-black rounded-xl hover:bg-slate-50 transition-all active:scale-95"
                    >
                      CANCEL
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-3">Explore All IskyMD Products</h2>
            <p className="text-slate-300 font-medium">Choose your exam</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* ECG Qbank */}
            <Link href="/products" className="bg-slate-700/50 hover:bg-slate-700 rounded-2xl p-6 transition-all border border-slate-600 hover:border-[#1d46af] group">
              <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-black mb-2">ECG Qbank</h3>
              <p className="text-sm text-slate-300 font-medium">Master ECG interpretation with high-fidelity rhythm strips</p>
            </Link>

            {/* Coming Soon Products */}
            <div className="bg-slate-700/30 rounded-2xl p-6 border border-slate-600 opacity-60">
              <div className="w-12 h-12 rounded-xl bg-slate-600 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-black mb-2">Clinical Qbank</h3>
              <p className="text-sm text-slate-400 font-medium">Coming Soon</p>
            </div>

            <div className="bg-slate-700/30 rounded-2xl p-6 border border-slate-600 opacity-60">
              <div className="w-12 h-12 rounded-xl bg-slate-600 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-black mb-2">Practice Exams</h3>
              <p className="text-sm text-slate-400 font-medium">Coming Soon</p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-700 text-center">
            <p className="text-sm text-slate-400 font-medium">© 2026 IskyMD. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
