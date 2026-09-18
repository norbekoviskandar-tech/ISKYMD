"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppContext } from "@/context/AppContext";
import {
  BarChart3,
  Users,
  TrendingUp,
  Filter,
  Database,
  LayoutDashboard,
  LogOut,
  Shield,
  ChevronDown,
  MessageSquare,
  DollarSign,
  Settings,
  Target,
  PieChart,
  Megaphone,
  LifeBuoy,
  Wrench,
  Package
} from "lucide-react";
import AuthorHeader from "@/components/author/AuthorHeader";

export default function AuthorLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState(null);
  const { sidebarCollapsed, setSidebarCollapsed } = useContext(AppContext);

  useEffect(() => {
    // Responsive collapse
    const handleResize = () => {
      if (window.innerWidth < 1200) {
        setSidebarCollapsed(true);
      }
    };

    window.addEventListener("resize", handleResize);
    if (window.innerWidth < 1200) setSidebarCollapsed(true); // Initial check

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard, href: '/author' },
    {
      label: 'Question Bank',
      icon: Database,
      href: '/author/manage-questions',
      children: [
        { label: 'Management', href: '/author/manage-questions' },
        { label: 'Create Question', href: '/author/create-question' },
      ]
    },
    { label: 'Users', icon: Users, href: '/author/users' },
    { label: 'Activity', icon: TrendingUp, href: '/author/activity' },
    { label: 'Products', icon: Package, href: '/author/manage-products' },
    { label: 'Tools', icon: Wrench, href: '/author/tools' },
    { label: 'Settings', icon: Settings, href: '/author/settings' },
  ];

  useEffect(() => {
    // Role-based security check for Author Portal
    const checkAuth = async () => {
      if (typeof window === "undefined") return;

      const userId = localStorage.getItem("medbank_user");
      
      if (!userId) {
        console.warn("[Author Security] No user session found, redirecting to login");
        router.push("/author/login");
        return;
      }

      try {
        const { getUserById } = await import("@/services/user.service");
        const user = await getUserById(userId);
        
        // Pass if we are on the login page or the user has author/admin privileges
        if (pathname === "/author/login") {
            setLoading(false);
            return;
        }

        if (!user) {
          console.warn("[Author Security] Session invalid - user record not found.");
          localStorage.removeItem("medbank_user");
          router.push("/author/login");
          return;
        }

        const effectiveRole = String(user?.role || '').toLowerCase().trim();
        const userEmail = user?.email || "No Email";

        if (effectiveRole !== 'admin' && effectiveRole !== 'author' && user.email !== 'norbekoviskandar@gmail.com') {
          console.warn(`[Author Security] ACCESS DENIED for ${userEmail} (Role: ${effectiveRole}). Redirecting to student portal.`);
          router.push("/student/portal");
          return;
        }

        console.log(`[Author Security] ACCESS GRANTED for ${userEmail} (Role: ${effectiveRole})`);

        // Verified admin
        setLoading(false);
      } catch (err) {
        console.error("[Author Security] Verification failed:", err);
        router.push("/auth");
      }
    };

    checkAuth();
  }, [pathname, router]);

  useEffect(() => {
    // Auto-open dropdown if child is active
    navItems.forEach(item => {
      if (item.children && item.children.some(child => pathname === child.href)) {
        setOpenDropdown(item.label);
      }
    });
  }, [pathname]);

  // Loading only on first entry to the author portal to prevent flickering during internal navigation
  if (loading && pathname === "/author") {
    return (
      <div className="min-h-screen cyber-theme flex items-center justify-center p-6 cyber-mesh">
        <div className="text-[#8B5CF6] font-mono text-xl animate-pulse tracking-[0.5em] font-bold">
          SECURITY_CHECK...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen cyber-theme cyber-mesh transition-all duration-500 overflow-auto">
      {/* Mobile Overlay */}
      <div 
        onClick={() => setSidebarCollapsed(true)}
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${!sidebarCollapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 h-screen flex flex-col gap-10 bg-[#1B263B] border-r border-[#2D3A54] p-6 transition-all duration-700 ease-in-out z-50 
          ${sidebarCollapsed 
            ? '-translate-x-full lg:translate-x-0 lg:w-24 px-4' 
          : 'translate-x-0 w-72 p-8 shadow-[10px_0_40px_rgba(0,0,0,0.15)]'
          }`}
      >
        <div className={`flex items-center gap-4 group cursor-pointer ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="w-12 h-12 flex-shrink-0 rounded-2xl bg-gradient-to-tr from-[#005EB8] to-[#0D9488] p-[1.5px] shadow-[0_4px_20px_rgba(0,94,184,0.3)] group-hover:shadow-[0_4px_30px_rgba(0,94,184,0.5)] transition-all">
            <div className="w-full h-full rounded-2xl bg-[#1B263B] flex items-center justify-center">
              <Shield className="text-white w-6 h-6" />
            </div>
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h2 className="font-heading font-black text-xl text-white tracking-widest uppercase italic">Author<span className="text-[#00CCFF]">Portal</span></h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-tighter">System_Secure</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex flex-col gap-2 mt-4 flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-bold text-[#00CCFF] uppercase tracking-[0.2em] mb-4 ml-4 whitespace-nowrap opacity-80"
                >
                  Dashboard Stream
                </motion.div>
            )}
          </AnimatePresence>

          {navItems.map((item, idx) => {
            const hasChildren = item.children && item.children.length > 0;
            const isChildActive = hasChildren && item.children.some(child => pathname === child.href);
            const isActive = pathname === item.href || isChildActive;
            const isOpen = openDropdown === item.label && !sidebarCollapsed;

            const NavContent = (
              <>
                <item.icon size={20} className={isActive ? "text-white" : "group-hover:text-[#00CCFF] transition-colors flex-shrink-0"} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!sidebarCollapsed && hasChildren && (
                  <div className={`ml-auto transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={16} />
                  </div>
                )}
                {!sidebarCollapsed && !hasChildren && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
                )}
                {sidebarCollapsed && isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#005EB8] rounded-l-full shadow-[0_0_15px_#005EB8]" />
                )}
              </>
            );

            const commonClasses = `flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 relative group overflow-hidden cursor-pointer ${sidebarCollapsed ? 'justify-center px-0 w-full' : ''} ${isActive ? "bg-gradient-to-r from-[#0066CC] to-[#004C99] text-white shadow-[0_4px_15px_rgba(0,102,204,0.3)]" : "text-slate-400 hover:text-white hover:bg-white/5"}`;

            return (
              <div key={idx} className="flex flex-col gap-1">
                {hasChildren ? (
                  <div
                    onClick={() => {
                      setOpenDropdown(isOpen ? null : item.label);
                      if (pathname !== item.href) router.push(item.href);
                    }}
                    className={commonClasses}
                  >
                    {NavContent}
                  </div>
                ) : (
                  <Link href={item.href} className={commonClasses}>
                    {NavContent}
                  </Link>
                )}

                <AnimatePresence>
                  {hasChildren && isOpen && !sidebarCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden flex flex-col gap-1 ml-9"
                    >
                      {item.children.map((child, cIdx) => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={cIdx}
                            href={child.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isChildActive
                              ? "text-white font-bold bg-white/10"
                              : "text-slate-400 hover:text-white hover:bg-white/5"
                              }`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${isChildActive ? 'bg-[#0D9488] shadow-[0_0_10px_#0D9488]' : 'bg-slate-600'}`} />
                            <span className="text-xs">{child.label}</span>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4">

          <button
            onClick={() => {
              router.push("/student/portal");
            }}
            className={`flex items-center gap-4 px-5 py-4 w-full rounded-2xl text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all text-sm font-semibold ${sidebarCollapsed ? 'justify-center px-0' : ''
              }`}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {!sidebarCollapsed && <span>Exit Portal</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <AuthorHeader />
        <div className="relative">
          {children}
        </div>
      </main>
    </div>
  );
}
