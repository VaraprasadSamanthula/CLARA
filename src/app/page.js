"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    // Middleware handles authentication and route protection.
    // If user reaches here with valid session, redirect to dashboard.
    // If user has no valid session, middleware redirects to login.
    // This page doesn't need to check cookies (HttpOnly blocked anyway).
    router.push("/dashboard");
  }, [router]);
  return null;
}