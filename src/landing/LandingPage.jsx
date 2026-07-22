import React from "react";
import { LandingHero } from "./LandingHero";
import { LandingStats } from "./LandingStats";
import { LandingHowItWorks } from "./LandingHowItWorks";
import { LandingCTA } from "./LandingCTA";

export default function LandingPage({ onTryDemo }) {
  return (
    <div className="bg-zinc-950 min-h-screen text-white font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <LandingHero onTryDemo={onTryDemo} />
      <LandingStats />
      <LandingHowItWorks />
      <LandingCTA onTryDemo={onTryDemo} />
    </div>
  );
}
