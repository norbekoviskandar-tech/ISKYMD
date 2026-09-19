"use client";
import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Bell, Shield, Moon, Sun, Monitor, LogOut, Database, Save } from 'lucide-react';
import { AppContext } from '@/context/AppContext';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const { theme, toggleTheme } = useContext(AppContext);
    const router = useRouter();

    const handleLogout = () => {
        if (confirm("Disconnect from Author Vault?")) {
            router.push("/student/portal");
        }
    };

    return (
        <div className="p-6 max-w-[1000px] mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">Platform <span className="text-primary">Settings</span></h1>
                <p className="text-muted-foreground mt-2">Manage your administrative preferences and security</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* NAV */}
                <div className="space-y-1">
                    <SettingsTab label="General" icon={Settings} active />
                    <SettingsTab label="Account Profile" icon={User} />
                    <SettingsTab label="Notifications" icon={Bell} />
                    <SettingsTab label="Security & API" icon={Shield} />
                    <SettingsTab label="Data Management" icon={Database} />
                </div>

                {/* CONTENT */}
                <div className="md:col-span-2 space-y-6">
                    <section className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-6">
                        <h3 className="font-bold flex items-center gap-2 text-foreground">
                            <Monitor size={18} className="text-primary" />
                            Interface Preferences
                        </h3>

                        <div className="flex items-center justify-between p-4 bg-panel/30 rounded-2xl border border-border">
                            <div>
                                <p className="text-sm font-bold text-foreground">Color Scheme</p>
                                <p className="text-xs text-muted-foreground">Switch between light and dark mode</p>
                            </div>
                            <button 
                                onClick={toggleTheme}
                                className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-xl text-xs font-bold hover:bg-panel transition-all"
                            >
                                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-panel/30 rounded-2xl border border-border opacity-50">
                            <div>
                                <p className="text-sm font-bold text-foreground">Compact Sidebar</p>
                                <p className="text-xs text-muted-foreground">Maximize workspace display area</p>
                            </div>
                            <div className="w-10 h-5 bg-border rounded-full relative">
                                <div className="absolute left-1 top-1 w-3 h-3 bg-[#141414] rounded-full shadow" />
                            </div>
                        </div>
                    </section>

                    <section className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-6">
                        <h3 className="font-bold flex items-center gap-2 text-foreground">
                            <Shield size={18} className="text-primary" />
                            Session Management
                        </h3>
                        <p className="text-xs text-muted-foreground px-1">Your authorization key is stored locally for this browser session.</p>
                        
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-sm font-bold hover:bg-red-100 transition-all"
                        >
                            <LogOut size={18} />
                            Log out of Author Dashboard
                        </button>
                    </section>

                    <div className="flex justify-end gap-3">
                        <button className="px-6 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-panel transition-all">
                            Discard
                        </button>
                        <button className="flex items-center gap-2 px-8 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                            <Save size={18} />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SettingsTab({ label, icon: Icon, active = false }) {
    return (
        <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${active ? 'bg-primary text-black shadow-lg shadow-primary/10' : 'text-muted-foreground hover:bg-panel hover:text-foreground'}`}>
            <Icon size={18} />
            {label}
        </button>
    );
}
