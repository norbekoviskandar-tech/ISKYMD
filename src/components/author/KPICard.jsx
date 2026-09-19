"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';

const KPICard = ({
    title,
    value,
    secondaryValue,
    trend,
    trendData = [],
    icon: Icon,
    color = "text-primary",
    insight = "Performance steady",
    benchmark = "Above industry avg"
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isPositive = !trend.startsWith('-');

    // Custom Sparkline Logic
    const generateSparklinePath = (data) => {
        if (!data || data.length === 0) return "";
        const width = 80;
        const height = 30;
        const padding = 2;

        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;

        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - min) / range) * (height - padding * 2) - padding;
            return `${x},${y}`;
        });

        return `M ${points.join(' L ')}`;
    };

    // Color map based on specified themes
    const themeColors = {
        "text-[#E5C158]": { hex: "#D4AF37", bg: "bg-[#D4AF37]/10", border: "border-[#D4AF37]/20" },
        "text-[#F0D77A]": { hex: "#D4AF37", bg: "bg-[#D4AF37]/10", border: "border-[#D4AF37]/20" },
        "text-[#10B981]": { hex: "#059669", bg: "bg-[#059669]/10", border: "border-[#059669]/20" },
        "text-[#F59E0B]": { hex: "#D97706", bg: "bg-[#D97706]/10", border: "border-[#D97706]/20" },
    };

    const currentTheme = themeColors[color] || { hex: "#E5C158", bg: "bg-primary/10", border: "border-primary/20" };

    return (
        <motion.div
            layout
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ y: -4, scale: 1.005 }}
            className={`bg-[#141414] p-6 flex flex-col gap-4 group cursor-pointer border ${isExpanded ? currentTheme.border : 'border-[#2E2A1E]'} rounded-3xl shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition-all duration-300`}
        >
            <div className="flex items-center justify-between">
                <motion.div
                    whileHover={{ rotate: [-10, 10, -10] }}
                    className={`p-3 rounded-2xl ${currentTheme.bg} border border-border/50`}
                >
                    <Icon className={color === "text-primary" ? "text-primary" : color} size={24} />
                </motion.div>

                {/* Custom Sparkline */}
                <div className="h-[30px] w-[80px]">
                    <svg width="80" height="30" viewBox="0 0 80 30" className="overflow-visible">
                        <defs>
                            <linearGradient id={`gradient-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={currentTheme.hex} stopOpacity="1" />
                                <stop offset="100%" stopColor={currentTheme.hex} stopOpacity="0.3" />
                            </linearGradient>
                        </defs>
                        <motion.path
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            d={generateSparklinePath(trendData)}
                            fill="none"
                            stroke={`url(#gradient-${title.replace(/\s+/g, '')})`}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        {/* Dot indicator on last point */}
                        {trendData.length > 0 && (
                            <motion.circle
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 1.5 }}
                                cx="80"
                                cy={30 - ((trendData[trendData.length - 1] - Math.min(...trendData)) / (Math.max(...trendData) - Math.min(...trendData) || 1)) * 26 - 2}
                                r="3"
                                fill={currentTheme.hex}
                                className="pulse-glow"
                            />
                        )}
                    </svg>
                </div>
            </div>

            <div>
                <p className="text-[#F3EBD3] text-xs font-heading font-black uppercase tracking-widest">{title}</p>
                <div className="flex items-center justify-between mt-1">
                    <div className="flex items-baseline gap-1">
                        <motion.h3
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-3xl font-mono font-black text-[#F3EBD3] tracking-tighter"
                        >
                            {value}
                        </motion.h3>
                        {secondaryValue && (
                            <>
                                <span className="text-muted-foreground text-xl font-mono">/</span>
                                <span className="text-xl font-mono font-bold text-primary tracking-tight">{secondaryValue}</span>
                            </>
                        )}
                    </div>
                    <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}
                    >
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {trend}
                    </motion.div>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "circOut" }}
                        className="overflow-hidden pt-4 border-t border-[#1F1F1F] space-y-3"
                    >
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Instant Insight</span>
                            <p className="text-xs text-[#F3EBD3] font-semibold">{insight}</p>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#111111] border border-[#2E2A1E]/50">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-muted-foreground font-bold uppercase">Benchmark</span>
                                <span className="text-[10px] text-primary font-bold">{benchmark}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                <span>details</span>
                                <TrendingUp size={10} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex justify-center">
                <div className={`mt-2 text-[#B8B09A] group-hover:text-gray-400 transition-colors`}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
            </div>
        </motion.div>
    );
};

export default KPICard;
