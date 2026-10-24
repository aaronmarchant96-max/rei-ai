import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Film,
  Sparkles,
  Layers,
  Sliders,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Download,
  Check,
  ChevronRight,
  Maximize2,
  Clock,
  Volume2,
  FileImage,
  Tag,
  X
} from "lucide-react";

const PROMPT_CHIPS = [
  {
    category: "Inking & Palette",
    chips: [
      {
        id: "mignola-ink",
        label: "Mignola Inking",
        promptText: "Mike Mignola and Dave Stewart graphic novel art style, stark high-contrast pure black brush ink shadows, flat muted colors, gothic industrial atmosphere"
      },
      {
        id: "heavy-slate",
        label: "Heavy Slate Shadows",
        promptText: "pitch black negative space, deep chiaroscuro slate shadows, dense crosshatched stone texture"
      },
      {
        id: "verdigris-slag",
        label: "Verdigris & Slag",
        promptText: "oxidized green bronze verdigris patina, cold iron slag, oily coal dust grime"
      },
      {
        id: "warm-lantern",
        label: "Warm Lantern Glow",
        promptText: "warm amber grease-lantern backlight piercing murky industrial fog, glowing sparks"
      }
    ]
  },
  {
    category: "Industrial Anatomy",
    chips: [
      {
        id: "boiler-cuirass",
        label: "Bolted Boiler Cuirass",
        promptText: "heavy bolted hammered copper and bronze boiler cuirass, thick pauldron rivets, reinforced blast collar"
      },
      {
        id: "brass-respirator",
        label: "Brass Respirator",
        promptText: "dual-valve brass filter canister respirator venting pressurized exhaust steam, dark welding glass visor"
      },
      {
        id: "steam-cams",
        label: "Steam Arm Cams",
        promptText: "hydraulic breaker torso frame, steam-driven arm cams, reinforced iron piston rods bolted to limbs"
      },
      {
        id: "fault-hammer",
        label: "Pneumatic Fault Hammer",
        promptText: "two-handed pneumatic industrial fault breaker hammer, reinforced steel drive head, high-pressure braided hoses"
      },
      {
        id: "blast-mantlets",
        label: "Anchored Blast Mantlets",
        promptText: "interlocking sloped bronze mantlets anchored into stone floor by thick hydraulic ram pistons"
      }
    ]
  },
  {
    category: "Cinematography",
    chips: [
      {
        id: "cinema-169",
        label: "16:9 Widescreen Plate",
        promptText: "16:9 widescreen cinematic comic plate, dynamic wide composition, epic scale underground cavern"
      },
      {
        id: "extreme-profile",
        label: "Extreme Profile Close-up",
        promptText: "extreme profile close-up, dramatic side lighting, exhausted human eye visible behind bolted iron skull cage"
      },
      {
        id: "low-angle",
        label: "Low-Angle Brutalist Hero",
        promptText: "dramatic low angle perspective looking up, towering brutalist mining machinery, imposing silhouette"
      },
      {
        id: "chiaroscuro",
        label: "Chiaroscuro Depth",
        promptText: "deep chiaroscuro lighting, heavy volumetric coal dust fog, intense silhouette framing"
      }
    ]
  },
  {
    category: "Dark Horse Rules",
    chips: [
      {
        id: "no-swords",
        label: "Zero Swords/Spears",
        promptText: "zero medieval weapons, zero swords, zero spears, zero blades"
      },
      {
        id: "no-shields",
        label: "Zero Handheld Shields",
        promptText: "zero handheld knight shields, mechanical blast mantlets only"
      },
      {
        id: "no-chainmail",
        label: "Zero Chainmail",
        promptText: "zero chainmail armor, industrial boiler plate only"
      },
      {
        id: "no-text",
        label: "Zero Comic Text",
        promptText: "zero speech bubbles, zero comic text, zero dialogue labels"
      }
    ]
  }
];

const CHIP_MAP = new Map();
PROMPT_CHIPS.forEach(cat => {
  cat.chips.forEach(chip => {
    CHIP_MAP.set(chip.id, chip);
  });
});

export default function GraphicNovelStudio() {
  const [beats, setBeats] = useState([]);
  const [canonPlates, setCanonPlates] = useState([]);
  const [storyboardPlates, setStoryboardPlates] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [selectedBeatId, setSelectedBeatId] = useState(1);
  const [activeTab, setActiveTab] = useState("drafts"); // "drafts" | "plates" | "spec"

  // Base prompt & non-destructive chips
  const [basePrompt, setBasePrompt] = useState("");
  const [activeChips, setActiveChips] = useState(() => new Set(["mignola-ink", "heavy-slate", "cinema-169", "no-swords"]));
  const [negativePrompt, setNegativePrompt] = useState("swords, spears, chainmail, text, speech bubbles, low resolution, smooth 3d cgi");
  const [selectedRef, setSelectedRef] = useState("/home/aaron/animation/thulans-production/episodes/001_eleven_bells/storyboard/plate_02_the_welded_profile_canon.jpg");

  // Cinema stage & Lettering
  const [stageImage, setStageImage] = useState(null);
  const [lettering, setLettering] = useState({
    title: "THE THROAT & SHIELD WALL",
    sector: "THE THROAT / LIFT-SECTOR-01",
    quote: "Twelve shield warriors held the throat of the lift, three hundred civilians jammed knee to knee in the cage, a dockhand with one crushed hand still wrapped around a dented enamel tin, backs pressed to the grating, boots in sump water, breath sour with coal dust and grease.",
    showOverlay: true
  });

  // A/B Comparison
  const [compareMode, setCompareMode] = useState(false);
  const [comparePlate, setComparePlate] = useState(null);

  // Async States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [animaticState, setAnimaticState] = useState({
    activeJob: null,
    videoExists: false,
    videoSize: 0,
    videoPath: ""
  });

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const [beatsRes, canonRes, platesRes, draftsRes, animaticRes] = await Promise.all([
        fetch("/api/storyboard/beats").then(r => r.json()).catch(() => []),
        fetch("/api/storyboard/canon").then(r => r.json()).catch(() => []),
        fetch("/api/storyboard/plates").then(r => r.json()).catch(() => []),
        fetch("/api/storyboard/drafts").then(r => r.json()).catch(() => []),
        fetch("/api/storyboard/animatic/status").then(r => r.json()).catch(() => ({}))
      ]);

      if (Array.isArray(beatsRes) && beatsRes.length > 0) {
        setBeats(beatsRes);
      }
      if (Array.isArray(canonRes) && canonRes.length > 0) {
        setCanonPlates(canonRes);
        if (!comparePlate && canonRes[1]) {
          setComparePlate(canonRes[1]);
        }
      }
      if (Array.isArray(platesRes)) setStoryboardPlates(platesRes);
      if (Array.isArray(draftsRes)) setDrafts(draftsRes);
      if (animaticRes) setAnimaticState(animaticRes);

      // Default stage to first canon plate if nothing selected
      if (!stageImage) {
        if (canonRes && canonRes[0]) {
          setStageImage({
            url: canonRes[0].url,
            title: canonRes[0].title,
            type: "canon",
            filename: canonRes[0].filename
          });
        }
      }
    } catch (err) {
      console.error("Failed to load initial studio data:", err);
    }
  }, [comparePlate, stageImage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll animatic status when active
  useEffect(() => {
    if (!animaticState?.activeJob || animaticState.activeJob.status !== "running") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/storyboard/animatic/status").then(r => r.json());
        setAnimaticState(res);
      } catch (err) {
        console.error("Animatic polling error:", err);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [animaticState?.activeJob]);

  // When beat changes, update fields
  const handleSelectBeat = (beat) => {
    setSelectedBeatId(beat.id);
    setBasePrompt(beat.suggestedPrompt || "");
    setLettering(prev => ({
      ...prev,
      title: beat.title.toUpperCase(),
      sector: beat.sector,
      quote: beat.script
    }));
  };

  // Toggle prompt chip
  const toggleChip = (chipId) => {
    setActiveChips(prev => {
      const next = new Set(prev);
      if (next.has(chipId)) {
        next.delete(chipId);
      } else {
        next.add(chipId);
      }
      return next;
    });
  };

  // Calculate final prompt
  const compiledPrompt = useMemo(() => {
    const parts = [basePrompt.trim()].filter(Boolean);
    activeChips.forEach(id => {
      const chip = CHIP_MAP.get(id);
      if (chip) parts.push(chip.promptText);
    });
    return parts.join(", ");
  }, [basePrompt, activeChips]);

  // Trigger plate generation
  const handleGenerate = async () => {
    if (!compiledPrompt) return;
    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/storyboard/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: compiledPrompt,
          negativePrompt,
          referenceImage: selectedRef || null,
          beatId: selectedBeatId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setStageImage({
        url: data.imageBase64,
        type: "draft",
        filename: data.draftFilename
      });

      setSuccessMessage("Draft generated & conditioned with reference!");
      // Refresh drafts list
      const updatedDrafts = await fetch("/api/storyboard/drafts").then(r => r.json()).catch(() => []);
      setDrafts(updatedDrafts);
      setActiveTab("drafts");
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger composite panel export
  const handleExportPanel = async () => {
    if (!stageImage?.url) return;
    setIsExporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // If stageImage is a URL rather than base64, fetch it and convert to b64
      let b64 = stageImage.url;
      if (!b64.startsWith("data:image")) {
        const imgRes = await fetch(stageImage.url);
        const blob = await imgRes.blob();
        b64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }

      const activeBeat = beats.find(b => b.id === selectedBeatId);
      const outFilename = activeBeat?.filename || `panel_${selectedBeatId}_${Date.now()}.jpg`;

      const res = await fetch("/api/storyboard/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: b64,
          title: lettering.title,
          sector: lettering.sector,
          quote: lettering.quote,
          filename: outFilename
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Panel export failed");

      setSuccessMessage(`Panel exported successfully as ${data.filename}!`);
      const updatedPlates = await fetch("/api/storyboard/plates").then(r => r.json()).catch(() => []);
      setStoryboardPlates(updatedPlates);
      setActiveTab("plates");
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Trigger animatic compilation
  const handleCompileAnimatic = async () => {
    try {
      const res = await fetch("/api/storyboard/animatic/compile", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Animatic compilation failed");
      setSuccessMessage("Animatic compilation started in background!");
      setAnimaticState(prev => ({
        ...prev,
        activeJob: { status: "running", progressLog: "Compiling 24fps animatic..." }
      }));
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0f12] text-neutral-200">
      {/* Studio Header Bar */}
      <header className="border-b border-neutral-800 bg-[#12151b] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#e2a33d]/10 border border-[#e2a33d]/30 rounded text-[#e2a33d]">
            <Film size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-neutral-100 tracking-wide font-['Bebas_Neue',sans-serif] text-xl">
                THULAN GRAPHIC NOVEL STUDIO
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#e2a33d]/20 text-[#e2a33d] border border-[#e2a33d]/40 font-semibold">
                Episode 001: Eleven Bells
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-mono">
              Dark Horse 16:9 Director Desk • 24fps Motion Comic • Uncut Take 7 Master Audio (212.95s)
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors flex items-center gap-1.5 ${
              compareMode
                ? "bg-[#e2a33d] text-black border-[#e2a33d] font-bold"
                : "bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-700"
            }`}
          >
            <Sliders size={14} />
            {compareMode ? "Exit Split View" : "A/B Canon Compare"}
          </button>

          <button
            onClick={handleCompileAnimatic}
            disabled={animaticState?.activeJob?.status === "running"}
            className="px-3.5 py-1.5 text-xs font-mono rounded bg-gradient-to-r from-[#c47d34] to-[#e2a33d] hover:from-[#d68a3c] hover:to-[#ebb24e] text-black font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <Play size={13} fill="black" />
            {animaticState?.activeJob?.status === "running" ? "Compiling Animatic..." : "🎬 Compile 24fps Animatic"}
          </button>
        </div>
      </header>

      {/* Notifications Banner */}
      {errorMessage && (
        <div className="bg-red-950/80 border-b border-red-800 px-6 py-2.5 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-200">
            <X size={14} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-[#1b2f1e]/80 border-b border-green-800 px-6 py-2 flex items-center justify-between text-xs text-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-green-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-200">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: Beat Director & Modular Prompt Studio (4 cols) */}
        <section className="lg:col-span-4 border-r border-neutral-800 p-5 flex flex-col gap-5 overflow-y-auto max-h-[calc(100vh-65px)] bg-[#0d0f12]">
          {/* Beat Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-bold">
                <Layers size={13} className="text-[#e2a33d]" />
                Script Beats (10 Key Beats)
              </label>
              <span className="text-[11px] font-mono text-neutral-500">
                Beat {selectedBeatId} of {beats.length || 10}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {beats.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleSelectBeat(b)}
                  className={`py-1.5 text-xs font-mono rounded border transition-all text-center ${
                    selectedBeatId === b.id
                      ? "bg-[#e2a33d] text-black font-bold border-[#e2a33d]"
                      : "bg-[#161a22] text-neutral-300 border-neutral-800 hover:border-neutral-600"
                  }`}
                >
                  {b.id < 10 ? `0${b.id}` : b.id}
                </button>
              ))}
            </div>
          </div>

          {/* Active Beat Overview Card */}
          {beats.find(b => b.id === selectedBeatId) && (
            <div className="p-3 bg-[#13171f] border border-neutral-800 rounded-md">
              <div className="text-[10px] font-mono text-[#e2a33d] uppercase tracking-wider mb-1">
                {beats.find(b => b.id === selectedBeatId).sector}
              </div>
              <h2 className="text-sm font-bold text-white mb-1.5 font-['Bebas_Neue',sans-serif] tracking-wide text-base">
                {beats.find(b => b.id === selectedBeatId).title}
              </h2>
              <p className="text-xs text-neutral-300 italic font-serif leading-relaxed">
                &ldquo;{beats.find(b => b.id === selectedBeatId).script}&rdquo;
              </p>
            </div>
          )}

          {/* Reference Conditioning (AGY Native ImagePaths) */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-bold mb-2">
              <Eye size={13} className="text-[#e2a33d]" />
              Reference Conditioning (ImagePaths)
            </label>
            <select
              value={selectedRef || ""}
              onChange={(e) => setSelectedRef(e.target.value || null)}
              className="w-full bg-[#161a22] border border-neutral-800 rounded px-2.5 py-2 text-xs font-mono text-neutral-200 focus:outline-none focus:border-[#e2a33d]"
            >
              <option value="">None (Pure Text Prompt)</option>
              {canonPlates.map((cp) => (
                <option key={cp.id} value={cp.absPath}>
                  Canon Plate {cp.id}: {cp.title}
                </option>
              ))}
            </select>
            <div className="text-[10px] text-neutral-500 font-mono mt-1">
              Passes verified local plate path to native AGY tool for character collar, rivets, and Mignola inking adherence.
            </div>
          </div>

          {/* Base Prompt */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-bold">
                <Sparkles size={13} className="text-[#e2a33d]" />
                Director Prompt
              </span>
              <button
                onClick={() => {
                  const b = beats.find(x => x.id === selectedBeatId);
                  if (b) setBasePrompt(b.suggestedPrompt || "");
                }}
                className="text-[11px] text-[#e2a33d] hover:underline font-mono"
              >
                Reset to Beat
              </button>
            </label>
            <textarea
              rows={4}
              value={basePrompt}
              onChange={(e) => setBasePrompt(e.target.value)}
              placeholder="Describe the scene, machinery, lighting, framing..."
              className="w-full bg-[#161a22] border border-neutral-800 rounded p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-[#e2a33d] leading-relaxed resize-none"
            />
          </div>

          {/* Fooocus-Style Modular Prompt Chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-bold">
                <Tag size={13} className="text-[#e2a33d]" />
                Modular Style Chips ({activeChips.size} Active)
              </label>
              <button
                onClick={() => setActiveChips(new Set())}
                className="text-[11px] text-neutral-500 hover:text-neutral-300 font-mono"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-3 bg-[#13171f] p-3 rounded border border-neutral-800">
              {PROMPT_CHIPS.map((cat) => (
                <div key={cat.category}>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                    {cat.category}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.chips.map((chip) => {
                      const isActive = activeChips.has(chip.id);
                      return (
                        <button
                          key={chip.id}
                          onClick={() => toggleChip(chip.id)}
                          className={`text-[11px] px-2.5 py-1 rounded transition-all font-mono flex items-center gap-1 ${
                            isActive
                              ? "bg-[#e2a33d]/20 text-[#e2a33d] border border-[#e2a33d]/60 font-semibold shadow-sm"
                              : "bg-[#181d26] text-neutral-400 border border-neutral-800 hover:border-neutral-600 hover:text-neutral-200"
                          }`}
                        >
                          {isActive && <Check size={11} className="stroke-[3]" />}
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Negative Rules */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 font-bold mb-1.5">
              Negative Prompt (Forbidden Elements)
            </label>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="w-full bg-[#161a22] border border-neutral-800 rounded px-2.5 py-1.5 text-xs font-mono text-neutral-300 focus:outline-none focus:border-[#e2a33d]"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !compiledPrompt}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-[#e2a33d] to-[#c47d34] hover:from-[#ebb24e] hover:to-[#d68a3c] text-black font-bold font-mono text-xs rounded shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-auto"
          >
            {isGenerating ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Conditioning & Rendering Plate via AGY...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Generate Plate 16:9
              </>
            )}
          </button>
        </section>

        {/* Center Column: 16:9 Cinema Stage & Live Dark Horse Lettering Overlay (5 cols) */}
        <section className="lg:col-span-5 p-5 flex flex-col gap-4 border-r border-neutral-800 bg-[#0a0c0f] overflow-y-auto max-h-[calc(100vh-65px)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">
                16:9 Cinema Stage
              </span>
              {stageImage && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                  {stageImage.type.toUpperCase()}: {stageImage.filename}
                </span>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs font-mono text-neutral-400 cursor-pointer">
              <input
                type="checkbox"
                checked={lettering.showOverlay}
                onChange={(e) => setLettering(prev => ({ ...prev, showOverlay: e.target.checked }))}
                className="accent-[#e2a33d] rounded"
              />
              Preview Dark Horse Lettering
            </label>
          </div>

          {/* Cinema Stage Viewport */}
          <div className={`relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-neutral-800 shadow-2xl flex items-center justify-center ${compareMode ? "grid grid-cols-2 gap-0.5" : ""}`}>
            {compareMode ? (
              <>
                {/* Left: Active Stage */}
                <div className="relative w-full h-full bg-neutral-950 overflow-hidden flex items-center justify-center border-r border-neutral-800">
                  {stageImage?.url ? (
                    <img src={stageImage.url} alt="Active Draft" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-xs text-neutral-500 font-mono">No Active Plate</div>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 text-[10px] font-mono text-[#e2a33d] rounded border border-neutral-700">
                    STAGE DRAFT
                  </div>
                </div>

                {/* Right: Canon Plate */}
                <div className="relative w-full h-full bg-neutral-950 overflow-hidden flex items-center justify-center">
                  {comparePlate?.url ? (
                    <img src={comparePlate.url} alt="Canon Reference" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-xs text-neutral-500 font-mono">No Canon Selected</div>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 text-[10px] font-mono text-green-400 rounded border border-neutral-700">
                    CANON BENCHMARK
                  </div>
                </div>
              </>
            ) : (
              <>
                {stageImage?.url ? (
                  <img
                    src={stageImage.url}
                    alt="Stage Plate"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-neutral-600">
                    <FileImage size={36} />
                    <span className="text-xs font-mono">Select a draft or plate from the ledger</span>
                  </div>
                )}

                {/* Dark Horse Lettered Caption Box Live Overlay */}
                {lettering.showOverlay && stageImage?.url && (
                  <div className="absolute bottom-5 left-6 max-w-[68%] pointer-events-none drop-shadow-2xl">
                    <div className="bg-[#121418]/95 border-l-[6px] border-[#c47d34] border-t border-r border-b border-neutral-800 p-4 rounded-r shadow-2xl backdrop-blur-sm">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-['Bebas_Neue',sans-serif] text-2xl tracking-wider text-white uppercase leading-none">
                          {lettering.title}
                        </h3>
                        <span className="font-['Share_Tech_Mono',monospace] text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-[#c47d34]/60 text-[#e2a33d] bg-black/40">
                          {lettering.sector}
                        </span>
                      </div>
                      <div className="w-full h-[1px] bg-neutral-700/60 mb-2"></div>
                      <p className="font-['Barlow_Condensed',sans-serif] text-sm text-neutral-100 font-semibold leading-snug tracking-wide">
                        {lettering.quote}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Lettering Controls & Composite Export Bar */}
          <div className="p-4 bg-[#13171f] border border-neutral-800 rounded-md flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">
                Lettering Box & Caption Controls
              </span>
              <button
                onClick={handleExportPanel}
                disabled={isExporting || !stageImage?.url}
                className="px-3 py-1.5 bg-[#e2a33d] hover:bg-[#ebb24e] text-black text-xs font-mono font-bold rounded flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isExporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                Export & Letter High-Res Panel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                  Panel Title (Bebas Neue)
                </label>
                <input
                  type="text"
                  value={lettering.title}
                  onChange={(e) => setLettering(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-[#181d26] border border-neutral-800 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#e2a33d]"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                  Sector Callsign (Share Tech Mono)
                </label>
                <input
                  type="text"
                  value={lettering.sector}
                  onChange={(e) => setLettering(prev => ({ ...prev, sector: e.target.value }))}
                  className="w-full bg-[#181d26] border border-neutral-800 rounded px-2.5 py-1 text-xs font-mono text-[#e2a33d] focus:outline-none focus:border-[#e2a33d]"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">
                Script Dialogue Caption (Barlow Condensed)
              </label>
              <textarea
                rows={2}
                value={lettering.quote}
                onChange={(e) => setLettering(prev => ({ ...prev, quote: e.target.value }))}
                className="w-full bg-[#181d26] border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-200 focus:outline-none focus:border-[#e2a33d] resize-none"
              />
            </div>
          </div>
        </section>

        {/* Right Column: Ledger, Drafts Reel & Animatic Spec (3 cols) */}
        <section className="lg:col-span-3 p-5 flex flex-col gap-4 bg-[#0d0f12] overflow-y-auto max-h-[calc(100vh-65px)]">
          {/* Navigation Tabs */}
          <div className="flex border-b border-neutral-800">
            <button
              onClick={() => setActiveTab("drafts")}
              className={`flex-1 py-2 text-xs font-mono text-center border-b-2 transition-all ${
                activeTab === "drafts"
                  ? "border-[#e2a33d] text-[#e2a33d] font-bold"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Drafts ({drafts.length})
            </button>
            <button
              onClick={() => setActiveTab("plates")}
              className={`flex-1 py-2 text-xs font-mono text-center border-b-2 transition-all ${
                activeTab === "plates"
                  ? "border-[#e2a33d] text-[#e2a33d] font-bold"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Story Plates ({storyboardPlates.length})
            </button>
            <button
              onClick={() => setActiveTab("spec")}
              className={`flex-1 py-2 text-xs font-mono text-center border-b-2 transition-all ${
                activeTab === "spec"
                  ? "border-[#e2a33d] text-[#e2a33d] font-bold"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              24fps Audio
            </button>
          </div>

          {/* Tab 1: Drafts Reel */}
          {activeTab === "drafts" && (
            <div className="flex flex-col gap-2.5">
              {drafts.length === 0 ? (
                <div className="text-center py-10 text-xs font-mono text-neutral-500">
                  No session drafts generated yet.
                </div>
              ) : (
                drafts.map((d) => (
                  <div
                    key={d.filename}
                    onClick={() => setStageImage({ url: d.url, filename: d.filename, type: "draft" })}
                    className={`p-2 rounded border cursor-pointer transition-all flex items-center gap-3 ${
                      stageImage?.filename === d.filename
                        ? "bg-[#1f2532] border-[#e2a33d]"
                        : "bg-[#141720] border-neutral-800 hover:border-neutral-700"
                    }`}
                  >
                    <img src={d.url} alt={d.filename} className="w-16 h-10 object-cover rounded bg-neutral-900 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-mono text-neutral-200 truncate">{d.filename}</div>
                      <div className="text-[10px] font-mono text-neutral-500">
                        {new Date(d.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Produced Story Plates */}
          {activeTab === "plates" && (
            <div className="flex flex-col gap-2.5">
              {storyboardPlates.map((p) => (
                <div
                  key={p.filename}
                  onClick={() => setStageImage({ url: p.url, filename: p.filename, type: "plate" })}
                  className={`p-2 rounded border cursor-pointer transition-all flex items-center gap-3 ${
                    stageImage?.filename === p.filename
                      ? "bg-[#1f2532] border-[#e2a33d]"
                      : "bg-[#141720] border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  <img src={p.url} alt={p.filename} className="w-16 h-10 object-cover rounded bg-neutral-900 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-mono text-neutral-200 truncate">{p.filename}</div>
                    <div className="text-[10px] font-mono text-[#e2a33d]">Lettered Composite</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Animatic & Master Audio Ledger */}
          {activeTab === "spec" && (
            <div className="flex flex-col gap-3 font-mono text-xs">
              <div className="p-3 bg-[#13171f] border border-neutral-800 rounded">
                <div className="flex items-center gap-2 text-[#e2a33d] font-bold mb-2">
                  <Volume2 size={14} />
                  Take 7 Cinematic Audio Master
                </div>
                <div className="space-y-1 text-neutral-300 text-[11px]">
                  <div>File: <span className="text-white">THULANS_Eleven_Bells_Cinematic_3m30_Master.wav</span></div>
                  <div>Length: <span className="text-white">212.95s (03:32.95)</span></div>
                  <div>Music Intro: <span className="text-white">00:00.00 – 00:10.00 (Uncut)</span></div>
                  <div>Shot Ledger Sync: <span className="text-green-400 font-bold">0.000s Variance</span></div>
                </div>
              </div>

              <div className="p-3 bg-[#13171f] border border-neutral-800 rounded">
                <div className="flex items-center gap-2 text-[#e2a33d] font-bold mb-2">
                  <Clock size={14} />
                  Bell Strike Timestamps
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between border-b border-neutral-800 pb-1">
                    <span className="text-neutral-400">Bell 1:</span>
                    <span className="text-white">01:11.28 (71.28s)</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-1">
                    <span className="text-neutral-400">Bell 3:</span>
                    <span className="text-white">01:24.66 (84.66s)</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-1">
                    <span className="text-neutral-400">Bell 5:</span>
                    <span className="text-white">01:44.58 (104.58s)</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-1">
                    <span className="text-neutral-400">Bell 7:</span>
                    <span className="text-white">02:07.66 (127.66s)</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-1">
                    <span className="text-neutral-400">Door Slam:</span>
                    <span className="text-white">02:36.32 (156.32s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Bell 11:</span>
                    <span className="text-white">02:41.82 (161.82s)</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#13171f] border border-neutral-800 rounded">
                <div className="text-[10px] text-neutral-400 uppercase mb-2">
                  Animatic Output Status
                </div>
                {animaticState?.videoExists ? (
                  <div className="space-y-1.5">
                    <div className="text-green-400 flex items-center gap-1.5 font-bold">
                      <CheckCircle2 size={13} />
                      Rendered & Ready ({(animaticState.videoSize / (1024 * 1024)).toFixed(1)} MB)
                    </div>
                    <div className="text-[10px] text-neutral-400 break-all">
                      {animaticState.videoPath}
                    </div>
                  </div>
                ) : (
                  <div className="text-neutral-500">
                    Not compiled yet. Click &ldquo;Compile 24fps Animatic&rdquo; above.
                  </div>
                )}
                {animaticState?.activeJob?.progressLog && (
                  <div className="mt-2 p-2 bg-black/60 rounded text-[10px] text-neutral-400 truncate">
                    {animaticState.activeJob.progressLog}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
