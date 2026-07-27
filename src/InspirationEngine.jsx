import { useEffect, useMemo, useState } from "react";
import { loadSeedLibrary } from "./lib/loadSeedLibrary.js";

const TAGS = [
  "All",
  "survival",
  "betrayal",
  "war",
  "frontier",
  "ancient world",
  "mysticism",
  "espionage",
  "lost expedition",
  "cosmic horror",
  "political collapse",
  "UAP",
  "forbidden knowledge",
];

const GENRES = [
  {
    label: "Realistic",
    note: "Stay close to the original event and keep the fiction layer thin.",
  },
  {
    label: "Grounded Fiction",
    note: "Change names and tighten the emotional pressure without losing realism.",
  },
  {
    label: "Speculative",
    note: "Add one divergent variable that changes the outcome.",
  },
  {
    label: "Fantasy",
    note: "Translate the pattern into myth, prophecy, and symbolic conflict.",
  },
  {
    label: "Cosmic",
    note: "Reveal a larger, unknowable system behind the human conflict.",
  },
];

const STORAGE_KEY = "inspiration_engine_favorites_v1";

function loadFavorites() {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function buildFuel(seed, genre, mutation) {
  const focus = (seed.storyDNA || []).slice(0, 3).join(", ");
  const mutationNotes = [
    "Stay almost factual and let the historical pressure do the work.",
    "Rename the people, tighten the pace, and keep the emotional logic intact.",
    "Add one divergent variable that changes the outcome.",
    "Let symbolic forces replace literal history.",
    "Push the pattern into an unknowable larger system.",
  ];
  const forceFocus = (seed.charactersForces || []).slice(0, 2).join(", ");
  const remixFocus = (seed.genreRemixes || [])
    .slice(0, 2)
    .map((item) => item?.angle || item?.genre || "")
    .filter(Boolean)
    .join(", ");

  return [
    `Logline: A ${genre.toLowerCase()} story built around ${seed.hinge.toLowerCase()}.`,
    `Story DNA: Pull on ${focus} until the event becomes a usable narrative engine.`,
    `Character pressure: Force the lead to choose between survival, truth, and belonging${forceFocus ? ` through ${forceFocus}` : ""}.`,
    `Twist: ${mutationNotes[mutation]}`,
    remixFocus
      ? `Remix path: ${remixFocus}.`
      : "Remix path: Keep the fiction distinct from the source event.",
    "Source trail: Keep the real event visible so the fiction feels grounded instead of generic.",
  ];
}

function makeCopyBlock(seed, genre, mutation) {
  const fuel = buildFuel(seed, genre.label, mutation);
  return [
    `# ${seed.title}`,
    "",
    `**Genre mutation:** ${genre.label}`,
    `**Hinge:** ${seed.hinge}`,
    `**Story DNA:** ${seed.storyDNA.join(" · ")}`,
    "",
    "## Story Fuel",
    ...fuel.map((line) => `- ${line}`),
    "",
    "## Source Trail",
    ...(seed.sourceTrail || []).map((source) => `- ${source.label}: ${source.url}`),
  ].join("\n");
}

function saveFavorites(next) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export default function InspirationEngine() {
  const [seedLibrary, setSeedLibrary] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [tag, setTag] = useState("All");
  const [seedId, setSeedId] = useState("");
  const [genreIndex, setGenreIndex] = useState(2);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let alive = true;
    setLoadState("loading");
    setLoadError("");

    loadSeedLibrary()
      .then((seeds) => {
        if (!alive) return;
        setSeedLibrary(seeds);
        setLoadState("ready");
        setSeedId((current) => current || seeds[0]?.id || "");
      })
      .catch((error) => {
        if (!alive) return;
        setLoadState("error");
        setLoadError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      alive = false;
    };
  }, []);

  const filteredSeeds = useMemo(() => {
    if (!seedLibrary.length) return [];
    if (tag === "All") return seedLibrary;
    return seedLibrary.filter((seed) => (seed.tags || []).includes(tag));
  }, [seedLibrary, tag]);

  const activeSeed = useMemo(() => {
    const found = filteredSeeds.find((seed) => seed.id === seedId) || filteredSeeds[0] || null;
    if (found) return found;
    return tag === "All" ? seedLibrary[0] || null : null;
  }, [filteredSeeds, seedId, seedLibrary, tag]);

  const currentGenre = GENRES[genreIndex] || GENRES[2];
  const storyFuel = useMemo(() => {
    if (!activeSeed) return [];
    return buildFuel(activeSeed, currentGenre.label, genreIndex);
  }, [activeSeed, currentGenre.label, genreIndex]);

  useEffect(() => {
    if (!filteredSeeds.length) return;
    if (!filteredSeeds.some((seed) => seed.id === seedId)) setSeedId(filteredSeeds[0].id);
  }, [filteredSeeds, seedId]);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  function pickRandomSeed() {
    const pool = filteredSeeds.length ? filteredSeeds : seedLibrary;
    const next = pool[Math.floor(Math.random() * pool.length)];
    if (next) setSeedId(next.id);
  }

  function toggleFavorite() {
    if (!activeSeed) return;
    setFavorites((current) => {
      const has = current.includes(activeSeed.id);
      const next = has ? current.filter((id) => id !== activeSeed.id) : [activeSeed.id, ...current];
      return next.slice(0, 20);
    });
  }

  async function copySpark() {
    if (!activeSeed) return;
    const text = makeCopyBlock(activeSeed, currentGenre, genreIndex);
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        setCopied("Copy unavailable");
        window.setTimeout(() => setCopied(""), 1400);
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied("Copied");
      window.setTimeout(() => setCopied(""), 1400);
    } catch {
      setCopied("Copy failed");
      window.setTimeout(() => setCopied(""), 1400);
    }
  }

  if (loadState === "loading") {
    return (
      <main className="inspiration-engine">
        <section className="inspiration-hero">
          <div>
            <div className="inspiration-kicker">History-powered creative engine</div>
            <h1>Find the real pattern. Forge a new story.</h1>
            <p className="inspiration-lead">
              Loading curated seed files from <code>/public/seeds</code>.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className="inspiration-engine">
        <section className="inspiration-hero">
          <div>
            <div className="inspiration-kicker">History-powered creative engine</div>
            <h1>Find the real pattern. Forge a new story.</h1>
            <p className="inspiration-lead">{loadError}</p>
          </div>
        </section>
      </main>
    );
  }

  if (!activeSeed) {
    return (
      <main className="inspiration-engine">
        <section className="inspiration-hero">
          <div>
            <div className="inspiration-kicker">History-powered creative engine</div>
            <h1>Find the real pattern. Forge a new story.</h1>
            <p className="inspiration-lead">
              No seeds match <strong>{tag}</strong>. Pick a different tag or reset to All.
            </p>
          </div>
          <div className="inspiration-actions">
            <button type="button" className="ie-button" onClick={() => setTag("All")}>
              Reset filters
            </button>
          </div>
        </section>
      </main>
    );
  }

  const isSaved = activeSeed ? favorites.includes(activeSeed.id) : false;

  return (
    <main className="inspiration-engine">
      <section className="inspiration-hero">
        <div>
          <div className="inspiration-kicker">History-powered creative engine</div>
          <h1>Find the real pattern. Forge a new story.</h1>
          <p className="inspiration-lead">
            Start from a wild real event, extract the story DNA, and remix the pressure point into
            original fiction.
          </p>
        </div>
        <div className="inspiration-actions">
          <button type="button" className="ie-button" onClick={pickRandomSeed}>
            Random seed
          </button>
          <button
            type="button"
            className={isSaved ? "ie-button is-active" : "ie-button"}
            onClick={toggleFavorite}
          >
            {isSaved ? "Saved" : "Save spark"}
          </button>
          <button type="button" className="ie-button" onClick={copySpark}>
            {copied || "Copy spark"}
          </button>
        </div>
      </section>

      <section className="inspiration-controls" aria-label="Inspiration filters">
        <div className="control-group">
          <div className="control-label">Interest tags</div>
          <div className="tag-row">
            {TAGS.map((item) => (
              <button
                key={item}
                type="button"
                className={tag === item ? "tag-pill is-active" : "tag-pill"}
                onClick={() => setTag(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="control-grid">
          <div className="control-group">
            <div className="control-label">Genre mutation</div>
            <div className="mutation-row">
              {GENRES.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  className={genreIndex === index ? "segment is-active" : "segment"}
                  onClick={() => setGenreIndex(index)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <input
              className="mutation-slider"
              type="range"
              min="0"
              max="4"
              step="1"
              value={genreIndex}
              onChange={(event) => setGenreIndex(Number(event.target.value))}
              aria-label="Genre mutation slider"
            />
            <div className="mutation-caption">{currentGenre.note}</div>
          </div>
          <div className="control-group">
            <div className="control-label">What the engine is doing</div>
            <div className="engine-note">
              It surfaces a real event, extracts the hinge, and gives you a clean creative starting
              point instead of a blank page.
            </div>
          </div>
        </div>
      </section>

      <section className="inspiration-grid">
        <article className="panel panel-primary">
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow">Historical seed</div>
              <h2>{activeSeed.title}</h2>
            </div>
            <div className="seed-meta">
              {activeSeed.era} · {activeSeed.region}
            </div>
          </div>

          <p className="seed-summary">{activeSeed.summary}</p>

          <div className="seed-block">
            <div className="seed-block__label">Why it&apos;s wild</div>
            <div className="seed-block__body">{activeSeed.whyWild}</div>
          </div>

          <div className="seed-block">
            <div className="seed-block__label">The stakes</div>
            <div className="seed-block__body">{activeSeed.stakes}</div>
          </div>

          <div className="seed-block">
            <div className="seed-block__label">The hinge</div>
            <div className="seed-block__body">{activeSeed.hinge}</div>
          </div>

          <div className="seed-block">
            <div className="seed-block__label">Story DNA</div>
            <div className="chip-row">
              {(activeSeed?.storyDNA || []).map((item) => (
                <span key={item} className="dna-chip">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="seed-block">
            <div className="seed-block__label">Source trail</div>
            <div className="source-trail">
              {(activeSeed?.sourceTrail || []).map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              ))}
            </div>
          </div>

          <div className="seed-block">
            <div className="seed-block__label">Characters / forces</div>
            <div className="chip-row">
              {(activeSeed?.charactersForces || []).map((item) => (
                <span key={item} className="dna-chip">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="seed-block">
            <div className="seed-block__label">What-if divergences</div>
            <div className="muted-copy">{(activeSeed?.whatIfDivergences || []).join(" · ")}</div>
          </div>
        </article>

        <aside className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-eyebrow">Remix output</div>
              <h2>{currentGenre.label}</h2>
            </div>
            <div className="seed-meta">
              {activeSeed?.sourceType || "Source"} · {activeSeed?.id || "seed"}
            </div>
          </div>

          <div className="remix-card">
            <div className="remix-label">Story fuel</div>
            <ul className="fuel-list">
              {storyFuel.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="remix-card">
            <div className="remix-label">Quick remix prompt</div>
            <p className="remix-copy">
              Turn this into a {currentGenre.label.toLowerCase()} story where the main character
              must face
              <strong> {activeSeed.hinge.toLowerCase()}</strong> while the world presses in from
              every side.
            </p>
          </div>

          <div className="favorites-panel">
            <div className="remix-label">Saved sparks</div>
            {favorites.length ? (
              <div className="saved-list">
                {favorites.map((id) => {
                  const saved = seedLibrary.find((seed) => seed.id === id);
                  if (!saved) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      className="saved-pill"
                      onClick={() => setSeedId(id)}
                    >
                      {saved.title}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="muted-copy">
                Save a seed to keep the best starting points close at hand.
              </div>
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
