"use client";
import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, TrendingUp, Target, Shield, Eye, EyeOff, Database } from 'lucide-react';

// Import components
import KPICard from '@/components/author/KPICard';
import QuickInsights from '@/components/author/QuickInsights';
import DashboardCharts from '@/components/author/DashboardCharts';
import BottomStats from '@/components/author/BottomStats';

// Import analytics
import { getDashboardStats, getEngagementChartData, getEngagementStats } from '@/services/analytics.service';
import { getAllUsers } from '@/services/user.service';
import { AppContext } from '@/context/AppContext';


const dummyChartData = [
  { name: '1', val: 400 },
  { name: '2', val: 300 },
  { name: '3', val: 500 },
  { name: '4', val: 450 },
  { name: '5', val: 600 },
  { name: '6', val: 700 },
  { name: '7', val: 850 },
];

const decliningData = [
  { name: '1', val: 850 },
  { name: '2', val: 700 },
  { name: '3', val: 750 },
  { name: '4', val: 600 },
  { name: '5', val: 500 },
  { name: '6', val: 450 },
  { name: '7', val: 400 },
];

export default function Dashboard() {
  const { selectedAuthorProduct } = useContext(AppContext);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    publishedCount: 0,
    draftCount: 0,
    totalUsers: 0,
    paidUsers: 0,
    dau: 0,
    totalTests: 0,
    avgSession: "0m 0s",
    avgCorrectRate: "0",
    systemBreakdown: {},
    qbankActivity: [],
    systemData: [],
    recentQuestions: [],
    lastUpdated: new Date()
  });

  const [isLoading, setIsLoading] = useState(true);

  // Load real data
  const loadRealData = async () => {
    setIsLoading(true);
    try {
      const pId = selectedAuthorProduct?.id;
      const [globalStats, engagementData] = await Promise.all([
        getDashboardStats(pId).catch(e => { console.error(e); return {}; }),
        getEngagementChartData(pId).catch(e => { console.error(e); return []; })
      ]);

      setStats({
        totalQuestions: globalStats.totalQuestions || 0,
        publishedCount: globalStats.publishedCount || 0,
        draftCount: globalStats.draftCount || 0,
        totalUsers: globalStats.totalUsers || 0,
        paidUsers: globalStats.paidUsers || 0,
        dau: globalStats.dau || 0,
        totalTests: globalStats.totalTests || 0,
        avgSession: globalStats.avgSession || "0m 0s",
        avgVolatility: globalStats.behavioral?.avgVolatility?.toFixed(2) || "0.00",
        avgCorrectRate: globalStats.behavioral?.avgCorrectRate?.toFixed(1) || "0",
        qbankActivity: (engagementData && engagementData.length > 0) ? engagementData : dummyChartData,
        systemData: Array.isArray(globalStats.systemData) && globalStats.systemData.length > 0
          ? globalStats.systemData
          : [{ name: "ECG", val: globalStats.totalQuestions || 0 }],
        recentQuestions: Array.isArray(globalStats.recentQuestions) ? globalStats.recentQuestions : [],
        lastUpdated: new Date()
      });
    } catch (err) {
      console.error("Critical error in Dashboard load:", err);
      // Fallback
      setStats(prev => ({
        ...prev,
        qbankActivity: dummyChartData,
        lastUpdated: new Date()
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Visibility & Focus handling
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadRealData();
      }
    };
    window.addEventListener("visibilitychange", handleVisibility);
    return () => window.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Auto-refresh logic (5 mins)
  useEffect(() => {
    const interval = setInterval(() => {
      loadRealData();
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadRealData();
  }, [selectedAuthorProduct]);

  const formatRelativeTime = (date) => {
    if (!date) return "N/A";
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return then.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#8B5CF6]/20 border-t-[#8B5CF6] rounded-full animate-spin"></div>
          <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.3em] animate-pulse">Syncing_Realtime_Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-body min-h-screen bg-[#F1F4F7] relative overflow-auto">
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-[#8B5CF6]/5 pointer-events-none" />
      <main className="max-w-[1400px] mx-auto px-6 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-8"
        >
          {/* KPI Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <KPICard
              title="Total Users"
              value={stats.totalUsers}
              trend="+100%"
              icon={Users}
              color="text-[#8B5CF6]"
              trendData={[100, 200, 300, 400, 500, 600, 700]}
              insight="Students on platform"
              benchmark={`${stats.paidUsers} Paid subs`}
            />
            <KPICard
              title="Total Questions"
              value={stats.totalQuestions}
              trend="+5%"
              icon={Database}
              color="text-[#06B6D4]"
              trendData={[400, 420, 450, 480, 500, 520, stats.totalQuestions]}
              insight="Total items in QBank"
              benchmark="Sync: Realtime"
            />
            <KPICard
              title="Live Items"
              value={stats.publishedCount}
              trend="ACTIVE"
              icon={Shield}
              color="text-[#10B981]"
              trendData={[300, 310, 320, 330, 340, 350, stats.publishedCount]}
              insight="Questions live for students"
              benchmark="Live content"
            />
            <KPICard
              title="Global Volatility"
              value={stats.avgVolatility}
              trend="FORENSIC"
              icon={TrendingUp}
              color="text-amber-500"
              trendData={[1.1, 1.2, 1.15, 1.3, 1.25, 1.4, parseFloat(stats.avgVolatility)]}
              insight="Avg changes per item"
              benchmark="Overthinking index"
            />
            <KPICard
              title="Avg Correct Rate"
              value={`${stats.avgCorrectRate}%`}
              trend="CALIBRATED"
              icon={Target}
              color="text-blue-500"
              trendData={[65, 68, 70, 67, 69, 72, parseFloat(stats.avgCorrectRate)]}
              insight="Overall correct rate"
              benchmark="Performance index"
            />
          </div>

          {/* Insights Bar */}
          <QuickInsights insights={[
            { icon: Users, label: `${stats.dau} Students active today`, bg: "bg-emerald-50", color: "text-emerald-600" },
            { icon: Database, label: `${stats.draftCount} Drafts awaiting review`, bg: "bg-amber-50", color: "text-amber-600" },
            { icon: Clock, label: "Peak Time: 18:00 - 21:00", bg: "bg-blue-50", color: "text-blue-600" },
            { icon: Shield, label: "System Secure: MB-2026-v2", bg: "bg-purple-50", color: "text-purple-600" }
          ]} />

          {/* Main Charts */}
          <DashboardCharts engagementData={stats.qbankActivity} sessionData={stats.systemData} />

        {/* Bottom Stats */}
          <BottomStats
            topEvents={[
              { name: "Active Students", count: stats.dau, trend: "up", change: "Daily" },
              { name: "Live Content", count: stats.publishedCount, trend: "up", change: "Sync" },
              { name: "Tests Taken", count: stats.totalTests, trend: "up", change: "Total" }
            ]}
            recentActivities={stats.recentQuestions.map(q => ({
              action: q.published ? "Published Content" : "Saved Draft",
              user: q.id.substring(0, 8),
              time: formatRelativeTime(q.updatedAt),
              status: q.published ? "success" : "info"
            }))}
          />
        </motion.div>
      </main>
    </div >
  );
}
