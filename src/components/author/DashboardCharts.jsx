"use client";
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const DashboardCharts = ({ engagementData, sessionData }) => {

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mt-6">
            {/* Engagement Chart */}
            <div className="bg-card border border-border p-6 h-[400px] flex flex-col rounded-3xl shadow-sm">
                <h3 className="text-foreground font-heading font-bold mb-6">User Engagement Over Time</h3>
                <div className="flex-grow">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={engagementData}>
                            <defs>
                                <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.10)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--cyber-gray)" opacity={0.5} fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--cyber-gray)" opacity={0.5} fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#141414', border: '1px solid #2E2A1E', color: '#F3EBD3', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}
                                itemStyle={{ color: '#C9A227', fontWeight: 'bold' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="val"
                                stroke="#D4AF37"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorEngagement)"
                                dot={{ fill: '#D4AF37', strokeWidth: 2, r: 4, stroke: '#fff' }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Session Chart */}
            <div className="bg-card border border-border p-6 h-[400px] flex flex-col rounded-3xl shadow-sm">
                <h3 className="text-foreground font-heading font-bold mb-6">Question Distribution by System</h3>
                <div className="flex-grow">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sessionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.10)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--cyber-gray)" opacity={0.5} fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--cyber-gray)" opacity={0.5} fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                contentStyle={{ backgroundColor: '#141414', border: '1px solid #2E2A1E', color: '#F3EBD3', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}
                                itemStyle={{ color: '#8A6D1B', fontWeight: 'bold' }}
                            />
                            <Bar
                                dataKey="val"
                                fill="#C9A227"
                                radius={[6, 6, 0, 0]}
                                barSize={40}
                                activeBar={{ fill: '#D4AF37', strokeWidth: 0 }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default DashboardCharts;
