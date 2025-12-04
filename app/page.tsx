import Image from "next/image";
import Link from "next/link";
import { Sidebar } from "./components/Sidebar";
import { SystemMonitor } from "./components/SystemMonitor";

export default function Home() {
  return (
    <div className="flex min-h-screen bg-white font-sans text-gray-900">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
            <p className="mt-1 text-gray-500">Welcome to your Chroma training environment.</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-green-600"></span>
              System Online
            </span>
          </div>
        </header>

        {/* Stats Grid */}
        <SystemMonitor />

        {/* Content Area */}
        <div className="rounded-xl border border-gray-200 bg-white p-12 shadow-sm">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full bg-gray-50 p-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No training in progress</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm">
              Start a new training session to begin fine-tuning your model. Configure your parameters in the settings tab first.
            </p>
            <Link href="/training" className="mt-6 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors shadow-sm">
              New Training Session
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
