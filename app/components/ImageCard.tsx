"use client";

import { useState, useEffect, useCallback } from 'react';

interface ImageCardProps {
    datasetName: string;
    fileName: string;
    imageUrl: string;
    onDelete: () => void;
}

export function ImageCard({ datasetName, fileName, imageUrl, onDelete }: ImageCardProps) {
    const [caption, setCaption] = useState('');
    const [initialCaption, setInitialCaption] = useState('');
    const [isLoadingCaption, setIsLoadingCaption] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchCaption();
    }, []);

    const fetchCaption = async () => {
        try {
            const res = await fetch(`/api/datasets/${datasetName}/caption/${fileName}`);
            if (res.ok) {
                const data = await res.json();
                setCaption(data.caption || '');
                setInitialCaption(data.caption || '');
            }
        } catch (error) {
            console.error('Failed to fetch caption:', error);
        } finally {
            setIsLoadingCaption(false);
        }
    };

    const saveCaption = async () => {
        if (caption === initialCaption) return;

        setIsSaving(true);
        try {
            const res = await fetch(`/api/datasets/${datasetName}/caption/${fileName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caption }),
            });

            if (res.ok) {
                setInitialCaption(caption);
            }
        } catch (error) {
            console.error('Failed to save caption:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this image?')) return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/datasets/${datasetName}/file/${fileName}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                onDelete();
            }
        } catch (error) {
            console.error('Failed to delete image:', error);
            setIsDeleting(false);
        }
    };

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
            {/* Image Area */}
            <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imageUrl}
                    alt={fileName}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Delete Button */}
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="absolute right-2 top-2 rounded-full bg-white/90 p-2 text-gray-500 opacity-0 shadow-sm backdrop-blur-sm transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:cursor-not-allowed"
                    title="Delete image"
                >
                    {isDeleting ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                    ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Caption Area */}
            <div className="flex-1 border-t border-gray-100 bg-gray-50/50 p-2">
                {isLoadingCaption ? (
                    <div className="h-16 animate-pulse rounded bg-gray-200" />
                ) : (
                    <div className="relative">
                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            onBlur={saveCaption}
                            className={`w-full resize-none rounded border bg-white p-2 text-xs text-gray-700 focus:border-black focus:outline-none focus:ring-1 focus:ring-black ${caption !== initialCaption ? 'border-yellow-400' : 'border-gray-200'
                                }`}
                            rows={3}
                            placeholder="Add a caption..."
                        />
                        {isSaving && (
                            <div className="absolute bottom-2 right-2">
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
