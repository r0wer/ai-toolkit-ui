"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '../components/Sidebar';

interface Dataset {
    name: string;
    imageCount: number;
}

export default function DatasetsPage() {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newDatasetName, setNewDatasetName] = useState('');

    useEffect(() => {
        fetchDatasets();
    }, []);

    const fetchDatasets = async () => {
        try {
            const res = await fetch('/api/datasets');
            const data = await res.json();
            setDatasets(data);
        } catch (error) {
            console.error('Failed to fetch datasets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateDataset = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/datasets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newDatasetName }),
            });

            if (res.ok) {
                setNewDatasetName('');
                setIsModalOpen(false);
                fetchDatasets();
            }
        } catch (error) {
            console.error('Failed to create dataset:', error);
        }
    };

    return (
        <div className="flex min-h-screen bg-white font-sans text-gray-900">
            <Sidebar />
            <div className="flex-1 p-8">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Datasets</h1>
                        <p className="mt-1 text-gray-500">Manage your training data.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Dataset
                    </button>
                </header>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black"></div>
                    </div>
                ) : datasets.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No datasets yet</h3>
                        <p className="mt-2 text-gray-500">Create a new dataset to get started.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {datasets.map((dataset) => (
                            <Link
                                key={dataset.name}
                                href={`/datasets/${dataset.name}`}
                                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 transition-all hover:shadow-md hover:border-gray-300"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-black transition-colors">
                                            {dataset.name}
                                        </h3>
                                        <p className="mt-1 text-sm text-gray-500">{dataset.imageCount} images</p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 p-2 text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-900 transition-colors">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Create Dataset Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
                            <h2 className="text-xl font-bold text-gray-900">Create New Dataset</h2>
                            <form onSubmit={handleCreateDataset} className="mt-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                        Dataset Name
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={newDatasetName}
                                        onChange={(e) => setNewDatasetName(e.target.value)}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                                        placeholder="my-awesome-dataset"
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors shadow-sm"
                                    >
                                        Create Dataset
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
