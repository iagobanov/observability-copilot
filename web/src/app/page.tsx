"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: "🔍",
    title: "Deep Analysis",
    description:
      "Scans your code for missing traces, metrics, logs, and business instrumentation.",
  },
  {
    icon: "🎯",
    title: "Actionable Fixes",
    description:
      "Get copy-paste OTel code snippets tailored to your exact framework and language.",
  },
  {
    icon: "📊",
    title: "Business Metrics",
    description:
      "Discover what business questions your telemetry can't answer yet.",
  },
  {
    icon: "⚡",
    title: "Real-time Streaming",
    description:
      "Watch the analysis happen live. Results stream directly from Claude.",
  },
];

const STEPS = [
  { step: "1", title: "Connect GitHub", description: "Sign in to access your repositories" },
  { step: "2", title: "Pick a repo", description: "Select any public or private repository" },
  { step: "3", title: "Get insights", description: "Receive a prioritized observability report" },
];

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleCTA = () => {
    if (session) {
      router.push("/dashboard");
    } else {
      signIn("github", { callbackUrl: "/dashboard" });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Find your observability blind spots
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Point Observability Copilot at any repo and get a prioritized report of
          missing traces, metrics, and business instrumentation — with working
          OpenTelemetry code to fix each gap.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" onClick={handleCTA}>
            {session ? "Go to Dashboard" : "Connect GitHub to start"}
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardContent className="pt-6">
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {f.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="pb-20">
        <h2 className="mb-8 text-center text-2xl font-bold">How it works</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                {s.step}
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
