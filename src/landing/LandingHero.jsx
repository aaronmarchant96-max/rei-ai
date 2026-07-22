import React from "react";
import { Button } from "@/components/ui/button";

export function LandingHero({ onTryDemo }) {
  return (
    <section className="px-6 py-20 md:py-28 bg-zinc-950 text-white relative overflow-hidden border-b border-zinc-900">
      <div className="max-w-6xl mx-auto text-center flex flex-col items-center">
        {/* Subtle badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-300 text-xs font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Cost-Aware LLM Routing Layer</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight md:leading-none mb-6">
          REI.ai: <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">The AI that routes itself. Pay for reasoning, not greetings.</span>
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-zinc-400 max-w-3xl leading-relaxed mb-10">
          A lightweight routing layer that saves you money by sending only the hard queries to premium models.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Button size="lg" className="w-full sm:w-auto font-semibold bg-amber-600 hover:bg-amber-700 text-white" onClick={onTryDemo}>
            Try the Demo
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto font-semibold border-zinc-700 hover:bg-zinc-800 text-zinc-300" asChild>
            <a href="https://github.com/aaronmarchant96-max/rei-ai" target="_blank" rel="noreferrer">
              Read the Docs
            </a>
          </Button>
        </div>

        {/* App Mockup screenshot */}
        <div className="w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-900/40 p-2 shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10 rounded-2xl pointer-events-none" />
          <img
            src="/rei_app_screenshot.jpg"
            alt="REI.ai Workspace Preview"
            className="w-full h-auto rounded-xl object-cover border border-zinc-800/80 shadow-inner"
          />
        </div>
      </div>
    </section>
  );
}
