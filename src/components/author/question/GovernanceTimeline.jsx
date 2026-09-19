"use client";

import { useState, useEffect } from "react";
import { getGovernanceHistory } from "@/services/question.service";
import { CheckCircle2, Circle, Clock, AlertTriangle, Archive, FileEdit, User } from "lucide-react";

export default function GovernanceTimeline({ versionId, conceptId }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const data = await getGovernanceHistory(versionId, conceptId);
                setHistory(data);
            } catch (err) {
                console.error("Failed to load history:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [versionId, conceptId]);

    const getIcon = (state) => {
        switch (state) {
            case 'draft': return <FileEdit size={14} className="text-amber-500" />;
            case 'review': return <Clock size={14} className="text-[#D4AF37]" />;
            case 'approved': return <CheckCircle2 size={14} className="text-[#D4AF37]" />;
            case 'published': return <CheckCircle2 size={14} className="text-emerald-500" />;
            case 'deprecated': return <AlertTriangle size={14} className="text-red-500" />;
            case 'archived': return <Archive size={14} className="text-[#A39C86]" />;
            default: return <Circle size={14} className="text-slate-300" />;
        }
    };

    if (loading) return <div className="p-4 text-center text-xs text-slate-400">Loading history...</div>;
    if (history.length === 0) return <div className="p-4 text-center text-xs text-slate-400">No history events recorded</div>;

    return (
        <div className="space-y-4 p-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Governance Audit Trail</h4>
            <div className="relative border-l-2 border-[#1F1F1F] ml-4 pl-6 space-y-6">
                {history.map((event, i) => (
                    <div key={event.id || i} className="relative">
                        <div className="absolute -left-[31px] top-0 p-1 bg-[#141414] border border-[#1F1F1F] rounded-full shadow-sm">
                            {getIcon(event.toState)}
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-[#D9D0B4] uppercase">
                                    {event.fromState ? `${event.fromState} → ` : ''}{event.toState}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {new Date(event.performedAt).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <User size={10} className="text-slate-300" />
                                <span className="text-[10px] font-medium text-[#A39C86]">{event.performedBy}</span>
                            </div>
                            {event.notes && (
                                <p className="mt-2 text-[11px] text-[#B8B09A] bg-[#111111] p-2 rounded-lg border border-[#1F1F1F] italic">
                                    &quot;{event.notes}&quot;
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
