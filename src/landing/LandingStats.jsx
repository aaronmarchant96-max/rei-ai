import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function LandingStats() {
  const stats = [
    {
      metric: "90%",
      title: "Real-World Cost Savings",
      desc: "Cost saving vs premium‑only routing by handling greetings at $0.",
    },
    {
      metric: "162",
      title: "Automated Tests Passing",
      desc: "Strict logical verification. Our Jest test suite enforces chronological, biological, and cost boundaries across 15 separate test suites. If savings drop to zero or safety margins fail, the build halts.",
    },
    {
      metric: "$0.0017",
      title: "Per-Message Ceiling Cost",
      desc: "Over-billing protection semantics. The unified cost model enforces strict ceiling estimates, so you always know the worst-case token cost before submitting a query.",
    },
  ];

  return (
    <section className="px-6 py-20 bg-zinc-950 text-white border-b border-zinc-900">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Empirical Performance Metrics</h2>
          <p className="text-zinc-400">
            Every routing decision in REI is deterministic, transparent, and tested. We benchmark our numbers against real API usage, not speculative averages.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <Card key={i} className="border-zinc-800 bg-zinc-900/20 backdrop-blur-sm shadow-lg hover:border-zinc-700 transition-all duration-300">
              <CardHeader className="pb-4">
                <span className="text-5xl font-black text-amber-500 mb-2">{stat.metric}</span>
                <CardTitle className="text-lg font-bold text-zinc-100">{stat.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-zinc-400 leading-relaxed text-sm">
                  {stat.desc}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
