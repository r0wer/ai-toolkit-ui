"use client";

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { ImageCard } from '../../components/ImageCard';

interface DatasetImage {
    name: string;
    url: string;
    type: 'image' | 'text';
}

export default function DatasetDetailPage() {
    const params = useParams();
    const datasetName = params.name as string;
    const [images, setImages] = useState<DatasetImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchImages = useCallback(async () => {
        try {
            const res = await fetch(`/api/datasets/${datasetName}`);
            if (res.ok) {
                const data = await res.json();
                setImages(data.files);
            }
        } catch (error) {
            console.error('Failed to fetch images:', error);
        } finally {
            setIsLoading(false);
        }
    }, [datasetName]);

    useEffect(() => {
        fetchImages();
    }, [fetchImages]);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const formData = new FormData();
        acceptedFiles.forEach(file => {
            formData.append('files', file);
        });

        try {
            const res = await fetch(`/api/datasets/${datasetName}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                fetchImages();
            }
        } catch (error) {
            console.error('Upload failed:', error);
        }
    }, [datasetName, fetchImages]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
            'text/plain': ['.txt', '.caption']
        }
    });

    return (
        <div className="flex min-h-screen bg-white font-sans text-gray-900">
            <Sidebar />
            <div className="flex-1 p-8">
                <header className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/datasets"
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 shadow-sm"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{datasetName}</h1>
                            <p className="mt-1 text-gray-500">Manage images and captions.</p>
                        </div>
                    </div>
                </header>

                {/* Upload Area */}
                <div
                    {...getRootProps()}
                    className={`mb-8 flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 ${isDragActive
                        ? 'border-black bg-gray-50'
                        : 'border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm font-medium">
                            {isDragActive ? "Drop files here..." : "Drag & drop images or captions here, or click to select"}
                        </p>
                    </div>
                </div>

                {/* Images Grid */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black"></div>
                    </div>
                ) : images.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                        <p className="text-gray-500">No images yet. Upload some to get started.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {images.filter(f => f.type === 'image').map((file) => (
                            <ImageCard
                                key={file.name}
                                datasetName={datasetName}
                                fileName={file.name}
                                imageUrl={file.url}
                                onDelete={fetchImages}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
