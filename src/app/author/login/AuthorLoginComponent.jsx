"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser } from "@/auth/auth.logic";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Shield, Terminal } from "lucide-react";

export default function AuthorLoginComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setReady(true));
  }, []);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const user = await loginUser(loginEmail, loginPassword);

      if (!user) {
        setLoginError("Access Denied: Invalid credentials");
        setLoginLoading(false);
        return;
      }

      // Verify admin role
      const userRole = (user.role || '').toLowerCase().trim();
      console.log('Author login - received user:', { id: user.id, role: userRole, email: user.email });

      // Only author accounts may enter (the server enforces the same rule)
      if (userRole !== 'author') {
        setLoginError("Access Denied: Author privileges required");
        setLoginLoading(false);
        // Clear the logged in session
        localStorage.removeItem("medbank_user");
        return;
      }

      // Success - redirect to author portal
      console.log('Admin access granted. Redirecting to Author Portal...');
      if (redirectPath) {
        router.push(redirectPath);
      } else {
        router.push("/author");
      }
    } catch (err) {
      console.error('Author login error:', err);
      setLoginError(err || "Authentication failed. Please try again.");
      setLoginLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen cyber-theme author-theme cyber-mesh flex items-center justify-center p-6">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-[#C9A227]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#8A6D1B]/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        {/* Glowing border effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#C9A227] to-[#8A6D1B] rounded-3xl blur-xl opacity-20"></div>
        
        <div className="relative bg-[#0B0B0B] border-2 border-[#2E2A1E] rounded-3xl p-10 shadow-2xl">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#C9A227] to-[#8A6D1B] p-[2px] shadow-[0_4px_30px_rgba(201,162,39,0.4)] mb-4">
              <div className="w-full h-full rounded-2xl bg-[#0B0B0B] flex items-center justify-center">
                <Shield className="text-white w-10 h-10" />
              </div>
            </div>
            <h1 className="font-heading font-black text-3xl text-white tracking-widest uppercase mb-2">
              Admin<span className="text-[#F0D77A]">Vault</span>
            </h1>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Terminal size={14} className="text-[#F0D77A]" />
              <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.3em]">Secure Access Portal</p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A227]/20 border border-[#C9A227]/30">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-mono text-green-400 uppercase tracking-wider">System Online</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-[#F0D77A] uppercase tracking-[0.2em] block mb-2 ml-1">
                Administrator Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A39C86] group-focus-within:text-[#F0D77A] transition-colors" size={18} />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-[#0B0B0B] border-2 border-[#2E2A1E] rounded-xl py-3.5 pl-12 pr-4 text-sm font-mono text-white focus:outline-none focus:border-[#C9A227] focus:bg-[#0B0B0B] transition-all placeholder:text-[#B8B09A]"
                  placeholder="admin@system.vault"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-[#F0D77A] uppercase tracking-[0.2em] block mb-2 ml-1">
                Authorization Key
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A39C86] group-focus-within:text-[#F0D77A] transition-colors" size={18} />
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-[#0B0B0B] border-2 border-[#2E2A1E] rounded-xl py-3.5 pl-12 pr-12 text-sm font-mono text-white focus:outline-none focus:border-[#C9A227] focus:bg-[#0B0B0B] transition-all placeholder:text-[#B8B09A]"
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A39C86] hover:text-[#F0D77A] transition-colors"
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showLoginPassword}
                onChange={() => setShowLoginPassword(!showLoginPassword)}
                className="w-4 h-4 rounded border-[#2E2A1E] bg-[#0B0B0B] accent-[#C9A227] cursor-pointer"
                id="show-password"
              />
              <label htmlFor="show-password" className="text-xs text-slate-400 font-medium cursor-pointer hover:text-slate-300 transition-colors">
                Show authorization key
              </label>
            </div>

            {loginError && (
              <div className="p-4 bg-red-950/50 border-2 border-red-900/50 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-red-400 mb-1">Authentication Error</p>
                  <p className="text-xs text-red-300/80 font-mono">{loginError}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-4 bg-gradient-to-r from-[#C9A227] to-[#D4AF37] text-black text-sm font-black uppercase tracking-[0.2em] rounded-xl hover:from-[#D4AF37] hover:to-[#C9A227] transition-all shadow-[0_4px_20px_rgba(201,162,39,0.3)] hover:shadow-[0_4px_30px_rgba(201,162,39,0.5)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
            >
              <span className="relative z-10">
                {loginLoading ? "AUTHENTICATING..." : "ACCESS VAULT"}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[#2E2A1E]">
            <p className="text-center text-[10px] font-mono text-[#A39C86] uppercase tracking-wider">
              Authorized Personnel Only
            </p>
            <p className="text-center text-[9px] font-mono text-[#B8B09A] mt-1">
              All access attempts are monitored and logged
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
