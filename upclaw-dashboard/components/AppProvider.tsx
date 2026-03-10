"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "../store/auth";

function AuthHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const urlToken = searchParams.get("token");
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null;
    const token = urlToken || storedToken;

    if (token) {
      // Verify token
      fetch(`/api/verify-token?token=${token}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.decoded?.address) {
            setAuth(token, data.decoded.address);
            if (typeof window !== 'undefined') {
              localStorage.setItem("auth_token", token);
            }
            
            // Remove token from URL without reloading the page if it came from URL
            if (urlToken) {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("token");
              const newUrl = pathname + (params.toString() ? `?${params.toString()}` : "");
              router.replace(newUrl, { scroll: false });
            }
          } else {
            // Token invalid or expired
            if (typeof window !== 'undefined') {
              localStorage.removeItem("auth_token");
            }
          }
        })
        .catch((err) => {
          console.error("Failed to verify token:", err);
          if (typeof window !== 'undefined') {
            localStorage.removeItem("auth_token");
          }
        });
    }
  }, [searchParams, pathname, router, setAuth]);

  return null;
}

export default function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <AuthHandler />
      </Suspense>
      {children}
    </QueryClientProvider>
  );
}
