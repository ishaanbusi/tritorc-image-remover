"use client";

import { useState } from "react";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      document.cookie = "tritorc_auth=1; path=/;";
      window.location.href = "/optimizer";
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full border-t-4 border-tritorcRed">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-full bg-tritorcRed flex items-center justify-center text-white font-bold text-2xl">
            T
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">
            Tritorc Image Optimizer
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Internal Tool &ndash; Authorized Staff Only
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-tritorcRed"
              placeholder="you@tritorc.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-tritorcRed"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-tritorcRed text-white font-semibold py-2.5 rounded-lg hover:bg-red-700 transition-colors"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
