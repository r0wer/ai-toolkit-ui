"use client";

import { useEffect, useState } from 'react';

interface SystemStats {
    cpu: {
        brand: string;
        load: number;
    };
    memory: {
        total: number;
        used: number;
        available: number;
    };
    gpu: {
        name: string;
        utilization: number;
        memoryTotal: number;
        memoryUsed: number;
    } | null;
}

export function SystemMonitor() {
    const [stats, setStats] = useState<SystemStats | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/system/stats');
                if (res.ok) {
                    setStats(await res.json());
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 2000);
        return () => clearInterval(interval);
    }, []);

    if (!stats) return null;

    const formatBytes = (bytes: number) => {
        const gb = bytes / (1024 * 1024 * 1024);
        return `${gb.toFixed(1)} GB`;
    };

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {/* CPU Widget */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-indigo-50 p-3 text-indigo-600">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500">CPU Load</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-gray-900">{stats.cpu.load.toFixed(1)}%</p>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                            <div
                                className="h-1.5 rounded-full bg-indigo-600 transition-all duration-500"
                                style={{ width: `${stats.cpu.load}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* RAM Widget */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-purple-50 p-3 text-purple-600">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500">RAM Usage</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-gray-900">{formatBytes(stats.memory.used)}</p>
                            <span className="text-xs text-gray-400">/ {formatBytes(stats.memory.total)}</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                            <div
                                className="h-1.5 rounded-full bg-purple-600 transition-all duration-500"
                                style={{ width: `${(stats.memory.used / stats.memory.total) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* GPU Widget */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500">GPU Load</p>
                        {stats.gpu ? (
                            <>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-gray-900">{stats.gpu.utilization}%</p>
                                </div>
                                <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                                    <div
                                        className="h-1.5 rounded-full bg-emerald-600 transition-all duration-500"
                                        style={{ width: `${stats.gpu.utilization}%` }}
                                    />
                                </div>
                            </>
                        ) : (
                            <p className="text-lg font-semibold text-gray-400">N/A</p>
                        )}
                    </div>
                </div>
            </div>

            {/* VRAM Widget */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500">VRAM Usage</p>
                        {stats.gpu ? (
                            <>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold text-gray-900">{(stats.gpu.memoryUsed / 1024).toFixed(1)} GB</p>
                                    <span className="text-xs text-gray-400">/ {(stats.gpu.memoryTotal / 1024).toFixed(1)} GB</span>
                                </div>
                                <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                                    <div
                                        className="h-1.5 rounded-full bg-blue-600 transition-all duration-500"
                                        style={{ width: `${(stats.gpu.memoryUsed / stats.gpu.memoryTotal) * 100}%` }}
                                    />
                                </div>
                            </>
                        ) : (
                            <p className="text-lg font-semibold text-gray-400">N/A</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
