import React from "react";

export function LandingHowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Route (Night Shift)",
      desc: "Queries are intercepted by a zero-inference lexical matcher. Greetings cost $0, simple prompts hit the cheap fast-path, and complex tasks route to standard 70B models.",
      icon: (
        <svg className="w-10 h-10 text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      step: "02",
      title: "Evaluate (CARDO GUARD)",
      desc: "Escalation to premium models is controlled by the CARDO GUARD cost gate. It evaluates one explicit inequality — Miss Loss > Waste → ACT — to decide if expensive inference is justified. If it isn't, the query stays on the cheaper model.",
      icon: (
        <svg className="w-10 h-10 text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      step: "03",
      title: "Save (Cost Delta)",
      desc: "Track real-time spend and savings per query and per session. View detailed routing traces, alternative routes considered, and exact savings percentages on your workspace dashboard.",
      icon: (
        <svg className="w-10 h-10 text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="px-6 py-20 bg-zinc-950 text-white border-b border-zinc-900">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">How the Routing Pipeline Works</h2>
          <p className="text-zinc-400">
            A unified routing architecture governing five domains with zero domain-specific code. Every escalation decision is explicit, auditable, and reproducible — eliminating quality-bleed (cheap model under-delivers) and cost-bleed (premium model used unnecessarily).
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-start relative p-6 rounded-xl border border-zinc-900 bg-zinc-900/10">
              <div className="absolute top-4 right-6 text-6xl font-black text-zinc-900/60 select-none">
                {step.step}
              </div>
              {step.icon}
              <h3 className="text-xl font-bold mb-3 text-zinc-100">{step.title}</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
