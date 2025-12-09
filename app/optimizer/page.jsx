"use client";

import OptimizerPanel from "@/components/OptimizerPanel";

export default function OptimizerPage() {
  const handleLogout = () => {
    document.cookie =
      "tritorc_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-tritorcRed flex items-center justify-center text-white font-bold">
              T
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                Tritorc Image Optimizer
              </h1>
              <p className="text-xs text-gray-500">
                Internal tool for marketing & web teams
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-tritorcRed"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 bg-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <OptimizerPanel />
        </div>
      </main>
    </div>
  );
}
