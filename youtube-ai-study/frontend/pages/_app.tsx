import type { AppProps } from "next/app";
import { ClerkProvider } from "@clerk/nextjs";
import React from "react";
import "../styles/globals.css";

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message?: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || String(error || "Unknown error") };
  }

  componentDidCatch(error: any) {
    // Surface it in terminal/console too.
    console.error("App render error:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Page crashed</h2>
        <p style={{ opacity: 0.85, marginBottom: 12 }}>
          A client-side render error happened. The message is below.
        </p>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.1)",
            background: "rgba(15, 23, 42, 0.04)",
          }}
        >
          {this.state.message}
        </pre>
      </div>
    );
  }
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
    >
      <AppErrorBoundary>
        <Component {...pageProps} />
      </AppErrorBoundary>
    </ClerkProvider>
  );
}

