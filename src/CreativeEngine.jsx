import { useEffect, useMemo, useState } from "react";

const SEEDS = [
  {
    id: "trojan-horse",
    title: "The Trojan Horse",
    era: "Mythic / Ancient",
    region: "Troy",
    sourceType: "myth",
    sourceTrail: [
      { label: "Britannica", url: "https://www.britannica.com/topic/Trojan-Horse" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Trojan_Horse" }
    ],
    summary: "A hidden deception inside a gift becomes the strategy that ends a war.",
    whyWild: "It is a perfect story engine for betrayal, infiltration, and the cost of trusting the wrong symbol.",
    stakes: "Victory, trust, and whether intelligence beats force.",
    hinge: "Whether deception is a legitimate weapon or a moral fracture.",
    storyDNA: ["deception", "infiltration", "symbolic trust", "war pressure", "hidden agenda"],
    charactersForces: ["the infiltrator", "the gatekeeper", "the fearful city", "the hidden army"],
    tags: ["war", "betrayal", "ancient world", "mysticism", "strategy"],
    genreRemixes: [
      {
        genre: "Thriller",
        angle: "The gift is a data package that hides a breach.",
        prompt: "Turn the hidden entry into a modern infiltration thriller."
      },
      {
        genre: "Fantasy",
        angle: "The horse becomes a relic carrying a sealed war spirit.",
        prompt: "Make the deception symbolic and mythic rather than literal."
      }
    ],
    whatIfDivergences: [
      "What if the city inspected the gift before accepting it?",
      "What if the infiltrators were trapped inside their own plan?",
      "What if the real weapon was the story people told about the gift?"
    ]
  },
  {
    id: "donner-party",
    title: "The Donner Party",
    era: "1846-1847",
    region: "Sierra Nevada, North America",
    sourceType: "history",
    sourceTrail: [
      { label: "Britannica", url: "https://www.britannica.com/event/Donner-Party" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Donner_Party" }
    ],
    summary: "A wagon train was trapped by winter, and survival pressure pushed the group toward starvation, breakdown, and rescue failure.",
    whyWild: "The event becomes a brutal test of leadership, trust, and what people will sacrifice when the trip stops being a journey and becomes a trap.",
    stakes: "Life, moral compromise, and whether desperation can erase the line between necessity and collapse.",
    hinge: "Whether survival justifies moral compromise.",
    storyDNA: ["isolation", "leadership failure", "winter pressure", "resource collapse", "survival guilt"],
    charactersForces: ["the exhausted leader", "the family unit", "the storm", "the dwindling supply"],
    tags: ["survival", "frontier", "winter", "moral collapse", "tragedy"],
    genreRemixes: [
      {
        genre: "Horror",
        angle: "The snowbound camp is surrounded by something that feeds on desperation.",
        prompt: "Turn the survival pressure into escalating horror."
      },
      {
        genre: "Drama",
        angle: "The wagon train becomes a study of leadership under collapse.",
        prompt: "Focus on family fracture, blame, and impossible choices."
      }
    ],
    whatIfDivergences: [
      "What if the winter hit two weeks later?",
      "What if a rescue party reached them sooner?",
      "What if the group had better leadership and less friction?"
    ]
  },
  {
    id: "art-of-war-deception-principle",
    title: "The Art of War: Deception Principle",
    era: "Ancient Text",
    region: "China",
    sourceType: "strategy text",
    sourceTrail: [
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/The_Art_of_War" },
      { label: "Britannica", url: "https://www.britannica.com/topic/The-Art-of-War" }
    ],
    summary: "A strategy principle argues that war is shaped by misdirection, disguise, timing, and the enemy's assumptions.",
    whyWild: "This is a compact engine for espionage, statecraft, and any story where the side that controls perception controls the battlefield.",
    stakes: "Victory, survival, and whether honesty is a luxury the powerful can afford.",
    hinge: "Whether deception is a tactic, a moral failure, or both.",
    storyDNA: ["misdirection", "perception control", "asymmetric advantage", "planned ambiguity", "psychological pressure"],
    charactersForces: ["the strategist", "the decoy force", "the observing enemy", "the vulnerable flank"],
    tags: ["war", "espionage", "strategy", "betrayal", "ancient world"],
    genreRemixes: [
      {
        genre: "Spy Thriller",
        angle: "Every briefing becomes a false front for a deeper operation.",
        prompt: "Turn the principle into a modern intelligence game."
      },
      {
        genre: "Political Thriller",
        angle: "The deception principle becomes a campaign strategy inside a fractured state.",
        prompt: "Show how perception management bends public reality."
      }
    ],
    whatIfDivergences: [
      "What if the enemy learns the deception principle better than you do?",
      "What if a strategist wins tactically but loses legitimacy?",
      "What if the same tactic protects a city instead of attacking one?"
    ]
  },
  {
    id: "book-of-enoch-watchers",
    title: "Book of Enoch: The Watchers",
    era: "Ancient Text",
    region: "Second Temple Judaism",
    sourceType: "religious text",
    sourceTrail: [
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Book_of_Enoch" },
      { label: "Britannica", url: "https://www.britannica.com/topic/Book-of-Enoch" }
    ],
    summary: "The Watchers are supernatural beings whose descent and actions create corruption, forbidden knowledge, and cosmic judgment.",
    whyWild: "It is a ready-made source for forbidden knowledge stories, cosmic dread, and the cost of crossing a boundary that should not have been crossed.",
    stakes: "Order, purity, and whether knowledge itself can become a curse.",
    hinge: "Whether revelation is salvation or contamination.",
    storyDNA: ["forbidden knowledge", "cosmic authority", "corruption", "boundary crossing", "judgment"],
    charactersForces: ["the Watchers", "the human witness", "the fallen world", "the judging power"],
    tags: ["mysticism", "forbidden knowledge", "cosmic horror", "ancient world"],
    genreRemixes: [
      {
        genre: "Cosmic Horror",
        angle: "The Watchers are reframed as observers whose attention changes reality.",
        prompt: "Turn revelation into existential dread."
      },
      {
        genre: "Fantasy",
        angle: "The Watchers become forbidden mentors whose gifts corrupt the world.",
        prompt: "Build a mythic world around the cost of heavenly knowledge."
      }
    ],
    whatIfDivergences: [
      "What if the human world refused the knowledge entirely?",
      "What if the Watchers were not evil but catastrophic in effect?",
      "What if the judgment came too late to matter?"
    ]
  },
  {
    id: "franklin-expedition",
    title: "The Franklin Expedition",
    era: "1845-1848",
    region: "Canadian Arctic",
    sourceType: "history",
    sourceTrail: [
      { label: "Britannica", url: "https://www.britannica.com/topic/Franklin-expedition" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Franklin%27s_lost_expedition" }
    ],
    summary: "Two ships vanished while trying to chart the Northwest Passage, turning exploration into tragedy.",
    whyWild: "It is a lost expedition story with enough historical weight to support horror, survival, or imperial collapse narratives.",
    stakes: "Discovery, empire, and the cost of trying to map the impossible.",
    hinge: "Whether ambition can outrun environment.",
    storyDNA: ["arctic isolation", "imperial ambition", "slow collapse", "failed rescue", "unknown fate"],
    charactersForces: ["the expedition leader", "the crew", "the ice", "the imperial mission"],
    tags: ["lost expedition", "survival", "frontier", "political collapse", "tragedy"],
    genreRemixes: [
      {
        genre: "Survival Thriller",
        angle: "The Arctic becomes a locked-room puzzle with no exit.",
        prompt: "Focus on dwindling morale, hunger, and the pressure of impossible terrain."
      },
      {
        genre: "Horror",
        angle: "The ice hides something that follows the ships.",
        prompt: "Turn the expedition into a slow-burn polar horror story."
      }
    ],
    whatIfDivergences: [
      "What if the crew found a passage that should not exist?",
      "What if the expedition had a better rescue window?",
      "What if the real danger was internal betrayal instead of the ice?"
    ]
  },
  {
    id: "roanoke-colony",
    title: "Roanoke Colony",
    era: "1585-1590",
    region: "Roanoke Island, North America",
    sourceType: "colonial disappearance / archive gap",
    sourceTrail: [
      { label: "Britannica", url: "https://www.britannica.com/place/Roanoke-Island" },
      { label: "Encyclopedia of Virginia", url: "https://encyclopediavirginia.org/entries/roanoke-colony/" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Roanoke_Colony" }
    ],
    summary: "An English colony disappears into a gap of missing records, leaving behind one carved clue and a century of argument about what survival really looked like.",
    whyWild: "It combines colonial pressure, disappearance, uncertain testimony, and the possibility that survival meant becoming unrecognizable to the people who claimed ownership.",
    stakes: "Survival, identity, memory, and who gets written into the official version of a disappearance.",
    hinge: "What if survival depends on becoming unrecognizable to the people who sent you?",
    storyDNA: ["missing record", "colonial pressure", "reinvention", "competing explanations", "fragile survival"],
    charactersForces: ["the child colonist", "the returning captain", "the interpreter", "the local witness", "the carved message"],
    tags: ["mystery", "frontier", "disappearance", "archive gap", "survival"],
    genreRemixes: [
      {
        genre: "Frontier Mystery",
        angle: "The real disappearance is not death but a reinvention no one back home wants to believe.",
        prompt: "Keep the archive gap visible while turning the colony into a survival mystery."
      },
      {
        genre: "Folk Horror",
        angle: "The returning search party finds a community built on uneasy new rules and refuses to understand what it sees.",
        prompt: "Make the fear come from colonial misreading rather than a supernatural answer."
      }
    ],
    whatIfDivergences: [
      "What if the colony chose to disappear rather than be rescued?",
      "What if the carved clue was meant to mislead the people returning for them?",
      "What if the surviving children remember a completely different story than the officials who search for them?"
    ]
  },
  {
    id: "lost-battalion",
    title: "The Lost Battalion",
    era: "1918",
    region: "Meuse-Argonne, France",
    sourceType: "battlefield isolation / survival under command failure",
    sourceTrail: [
      { label: "Britannica", url: "https://www.britannica.com/topic/Lost-Battalion" },
      { label: "U.S. Army", url: "https://www.army.mil/article/251788/the_lost_battalion" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Lost_Battalion_(World_War_I)" }
    ],
    summary: "An isolated American battalion is pinned down, cut off, and forced to survive while command confusion and friendly fire turn endurance into its own battlefield.",
    whyWild: "It traps loyalty, command failure, and survival in a single box where the people holding the line no longer know whether anyone above them understands the cost.",
    stakes: "Survival, duty, trust in command, and whether holding the position still means anything.",
    hinge: "What does loyalty mean when command keeps asking trapped people to hold a position that may already be lost?",
    storyDNA: ["encirclement", "command failure", "survival under fire", "friendly-fire risk", "holding pressure"],
    charactersForces: ["the trapped infantryman", "the exhausted officer", "the runner", "the medic", "the distant command"],
    tags: ["war", "survival", "ww1", "command failure", "pressure"],
    genreRemixes: [
      {
        genre: "Military Thriller",
        angle: "The fight becomes a pressure chamber where every message from command may be wrong, late, or fatal.",
        prompt: "Keep the isolation and command confusion visible while tightening the survival pressure."
      },
      {
        genre: "Anti-War Drama",
        angle: "The real collapse is not the line but the belief that sacrifice is being seen clearly by anyone above it.",
        prompt: "Focus on the emotional cost of obedience under failing command."
      }
    ],
    whatIfDivergences: [
      "What if the trapped unit receives one honest message too late to matter?",
      "What if a runner realizes the people holding the line have already been written off?",
      "What if the battalion survives but no one agrees what it was actually ordered to do?"
    ]
  },
  {
    id: "cher-ami",
    title: "The Last Message of Cher Ami",
    era: "1918",
    region: "Meuse-Argonne, France",
    sourceType: "wartime animal service / survival under fire",
    sourceTrail: [
      { label: "Smithsonian Magazine", url: "https://www.smithsonianmag.com/history/cher-ami-pigeon-saved-lost-battalion-180960851/" },
      { label: "National Museum of American History", url: "https://americanhistory.si.edu/collections/search/object/nmah_439382" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Cher_Ami" }
    ],
    summary: "A final message sent by pigeon becomes the narrow thread between a trapped unit and survival under artillery, confusion, and time pressure.",
    whyWild: "It compresses a whole battlefield into one impossible delivery, where human survival depends on an animal carrying meaning through chaos.",
    stakes: "Rescue, timing, trust, and whether the last message arrives before the trapped force disappears.",
    hinge: "What does it mean when the last chance for human survival depends on a creature that does not understand the war?",
    storyDNA: ["last chance", "message under fire", "timing pressure", "human dependence", "fragile rescue"],
    charactersForces: ["the signalman", "the trapped soldier", "the pigeon handler", "the artillery line", "the wounded messenger"],
    tags: ["war", "animal loyalty", "message", "survival", "ww1"],
    genreRemixes: [
      {
        genre: "War Drama",
        angle: "The whole battle narrows into whether one message can cross a sky full of failure.",
        prompt: "Treat the delivery as the emotional and strategic center of the story."
      },
      {
        genre: "Short Thriller",
        angle: "Every second after release becomes a countdown between rescue and erasure.",
        prompt: "Build the pressure around timing, signal failure, and the cost of delay."
      }
    ],
    whatIfDivergences: [
      "What if the last message reaches command but is not believed in time?",
      "What if the trapped unit sends two different messages that demand two different rescues?",
      "What if the surviving story focuses on the animal because the human command chain cannot defend itself?"
    ]
  },
  {
    id: "storytellers-gambit",
    title: "The Storyteller's Gambit",
    era: "Medieval Story Cycle",
    region: "Persianate / Arabic literary tradition",
    sourceType: "frame tale / survival through storytelling",
    sourceTrail: [
      { label: "Britannica", url: "https://www.britannica.com/topic/The-Thousand-and-One-Nights" },
      { label: "Britannica: Shahrazad", url: "https://www.britannica.com/topic/Shahrazad" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/One_Thousand_and_One_Nights" }
    ],
    summary: "A storyteller uses narrative itself as a survival tool, turning delay, curiosity, and emotional leverage into protection against power.",
    whyWild: "It makes story structure the weapon, where every ending postponed becomes another day alive and every tale told changes the balance of power.",
    stakes: "Survival, narrative control, emotional leverage, and whether a ruler can be changed by the stories meant to outlast him.",
    hinge: "Can control of the story become a form of material survival?",
    storyDNA: ["narrative leverage", "delay as strategy", "captivity", "curiosity weaponized", "power through framing"],
    charactersForces: ["the storyteller", "the ruler", "the scribe", "the listener who understands the trap", "the captive audience"],
    tags: ["storytelling", "strategy", "survival", "court intrigue", "mythic"],
    genreRemixes: [
      {
        genre: "Court Intrigue",
        angle: "Each tale becomes a move in a private political negotiation disguised as entertainment.",
        prompt: "Treat the frame story as a survival strategy inside a dangerous court."
      },
      {
        genre: "Literary Thriller",
        angle: "The real heist is control over what version of reality the powerful choose to keep hearing.",
        prompt: "Turn storytelling itself into the engine of suspense and survival."
      }
    ],
    whatIfDivergences: [
      "What if the ruler realizes the story is a trap but cannot stop listening?",
      "What if the storyteller's stories begin changing the court faster than anyone expected?",
      "What if the final tale is the one that risks ending the protection the stories created?"
    ]
  },
  {
    id: "binding-of-fenrir",
    title: "The Binding of Fenrir",
    era: "Norse Mythic Age",
    region: "Norse myth",
    sourceType: "myth / oath-breaking power conflict",
    sourceTrail: [
      { label: "Britannica", url: "https://www.britannica.com/topic/Fenrir" },
      { label: "World History Encyclopedia", url: "https://www.worldhistory.org/Fenrir/" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Fenrir" }
    ],
    summary: "The gods bind a force they fear through trickery, turning preemptive control into the first betrayal in a larger doomed future.",
    whyWild: "It is a pure engine for fear, broken trust, and the question of whether trying to prevent catastrophe is what finally creates it.",
    stakes: "Order, prophecy, legitimacy, and whether betrayal can ever be justified by fear of what comes next.",
    hinge: "Does preventing a feared future justify betrayal in the present?",
    storyDNA: ["preemptive betrayal", "fear of prophecy", "broken oath", "containment", "catastrophe created by control"],
    charactersForces: ["the bound force", "the oath-keeper", "the fearful ruler", "the willing sacrificer", "the witness who sees the cost"],
    tags: ["myth", "betrayal", "prophecy", "power", "tragedy"],
    genreRemixes: [
      {
        genre: "Epic Fantasy",
        angle: "The prison built to prevent disaster becomes the first crime that makes disaster inevitable.",
        prompt: "Make the binding a political and moral turning point, not just a mythic set piece."
      },
      {
        genre: "Political Allegory",
        angle: "A state breaks its own oath to contain a threat, then has to live inside the distrust it created.",
        prompt: "Turn prophecy into a modern story about fear, containment, and state violence."
      }
    ],
    whatIfDivergences: [
      "What if one god refuses the plan and becomes the only witness no one trusts later?",
      "What if the bound force would have chosen restraint if it had not been betrayed first?",
      "What if the real catastrophe is the culture of fear created by the binding, not the bound thing itself?"
    ]
  },
  {
    id: "flower-woman",
    title: "The Flower Woman",
    era: "Medieval Welsh Myth",
    region: "Wales",
    sourceType: "myth / taboo breaking",
    sourceTrail: [
      { label: "Britannica: Blodeuwedd", url: "https://www.britannica.com/topic/Blodeuwedd" },
      { label: "Encyclopedia.com: Blodeuwedd", url: "https://www.encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/blodeuwedd" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Blodeuwedd" }
    ],
    summary: "A woman created from flowers for a role she did not choose becomes the center of betrayal, punishment, and the cost of refusing a life built for someone else's order.",
    whyWild: "It combines beauty, artificial creation, desire, and punishment into a story about what happens when a person made for symbolism insists on being a person.",
    stakes: "Freedom, identity, desire, punishment, and whether a created life owes obedience to its design.",
    hinge: "What happens when a person created for a role decides the role is a cage?",
    storyDNA: ["constructed identity", "forbidden desire", "betrayal", "punishment", "refusal of assigned purpose"],
    charactersForces: ["the created woman", "the reluctant husband", "the secret lover", "the maker", "the witness to the punishment"],
    tags: ["myth", "identity", "betrayal", "transformation", "taboo"],
    genreRemixes: [
      {
        genre: "Dark Fairy Tale",
        angle: "The flower-made woman becomes the one person who sees that the whole order around her is also artificial.",
        prompt: "Keep the myth visible while focusing on desire, creation, and punishment."
      },
      {
        genre: "Gothic Fantasy",
        angle: "A court built on ritual beauty cracks when its most symbolic figure refuses to stay symbolic.",
        prompt: "Turn the story into a gothic struggle over identity and imposed purpose."
      }
    ],
    whatIfDivergences: [
      "What if the woman and the maker are both trapped by the same design?",
      "What if the punishment transforms the wrong person first?",
      "What if the role she refuses is necessary to keep a larger political order intact?"
    ]
  },
  {
    id: "price-of-immortality",
    title: "The Price of Immortality",
    era: "Ancient Myth",
    region: "Greek myth",
    sourceType: "myth / death bargain",
    sourceTrail: [
      { label: "Britannica: Tithonus", url: "https://www.britannica.com/topic/Tithonus-Greek-mythology" },
      { label: "Theoi", url: "https://www.theoi.com/Titan/Eos.html#Tithonos" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Tithonus" }
    ],
    summary: "A wish to escape death becomes its own curse when immortality arrives without the rest of what makes life livable.",
    whyWild: "It turns one of humanity's oldest desires into a clean pressure pattern about time, regret, and the cost of getting exactly what was asked for.",
    stakes: "Love, time, identity, and whether life without ending is still recognizably human.",
    hinge: "What does endless life destroy in the person who wanted it most?",
    storyDNA: ["wish turned curse", "time distortion", "erosion of self", "love against duration", "unintended bargain"],
    charactersForces: ["the immortal seeker", "the lover who asked", "the witness to the long decline", "the power that granted the wish"],
    tags: ["myth", "mortality", "curse", "time", "tragedy"],
    genreRemixes: [
      {
        genre: "Tragic Fantasy",
        angle: "The immortality bargain becomes a private apocalypse measured in centuries instead of fire.",
        prompt: "Focus on how time itself becomes the punishing force."
      },
      {
        genre: "Philosophical Science Fiction",
        angle: "A longevity breakthrough gives someone endless duration but strips away the conditions that made the life meaningful.",
        prompt: "Turn the myth into a modern story about immortality as slow loss."
      }
    ],
    whatIfDivergences: [
      "What if the person asking for immortality realizes the mistake immediately but cannot undo it?",
      "What if the immortal outlives not just loved ones but the moral world that made the wish matter?",
      "What if the real curse is forcing other people to carry the burden of an endless life?"
    ]
  },
  {
    id: "skookum-jims-discovery",
    title: "Skookum Jim's Discovery",
    era: "1896",
    region: "Klondike, Yukon",
    sourceType: "gold-rush origin / frontier history",
    sourceTrail: [
      { label: "The Canadian Encyclopedia", url: "https://www.thecanadianencyclopedia.ca/en/article/skookum-jim-mason" },
      { label: "Historica Canada", url: "https://www.historicacanada.ca/content/heritage-minutes/klondike-gold-rush" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Skookum_Jim" }
    ],
    summary: "A discovery that helps trigger the Klondike Gold Rush becomes a struggle over who gets remembered, who gets erased, and who profits from the story after the strike.",
    whyWild: "It turns a gold-rush origin story into a pressure pattern about credit, extraction, colonial memory, and the difference between making history and owning its telling.",
    stakes: "Credit, land, extraction, wealth, and whether discovery can survive the machinery built to rename it.",
    hinge: "Who gets written into history when a discovery becomes too profitable for the truth to stay intact?",
    storyDNA: ["disputed credit", "extraction pressure", "frontier reinvention", "erasure through profit", "origin myth rewritten"],
    charactersForces: ["the discoverer", "the trading partner", "the recorder", "the land rush", "the investor who arrives too late"],
    tags: ["frontier", "canada", "gold rush", "memory", "extraction"],
    genreRemixes: [
      {
        genre: "Frontier Drama",
        angle: "The strike matters less than the fight over whose name the new world gets built around.",
        prompt: "Keep the pressure on credit, land, and the rewriting of origin."
      },
      {
        genre: "Historical Thriller",
        angle: "Every new arrival brings money, rumor, and a stronger incentive to bury the truth under a cleaner legend.",
        prompt: "Turn the discovery into a race between memory and profit."
      }
    ],
    whatIfDivergences: [
      "What if the people who made the discovery refuse the version of the story investors need?",
      "What if one witness keeps a record that could undo the gold-rush myth later?",
      "What if the real point of no return is not the strike itself but the first shipment of news leaving the region?"
    ]
  },
  {
    id: "battle-of-grunwald",
    title: "Battle of Grunwald",
    era: "1410",
    region: "Central / Eastern Europe",
    sourceType: "medieval battle / military history",
    sourceTrail: [
      { label: "Britannica", url: "https://www.britannica.com/event/Battle-of-Tannenberg-1410" },
      { label: "Encyclopaedia.com", url: "https://www.encyclopedia.com/history/encyclopedias-almanacs-transcripts-and-maps/grunwald-battle" },
      { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Battle_of_Grunwald" }
    ],
    summary: "A massive Polish-Lithuanian coalition confronts the Teutonic Knights, a powerful crusading military order, in one of medieval Europe's defining battles.",
    whyWild: "A feared religious military order meets a multi-ethnic coalition that turns discipline, patience, and battlefield pressure against it.",
    stakes: "Political survival, religious legitimacy, regional power, national myth, and the collapse of invincibility.",
    hinge: "Can an elite order built on faith, discipline, and fear survive when its enemies stop being divided?",
    storyDNA: ["coalition under pressure", "religious militarism", "false confidence", "battlefield deception", "fragile alliances", "elite collapse", "myth after victory"],
    charactersForces: ["the Teutonic Grand Master", "the Polish king", "the Lithuanian grand duke", "the knightly order", "the coalition army", "the scouts and messengers", "the camp followers", "the chroniclers"],
    tags: ["war", "medieval", "coalition", "political collapse", "strategy"],
    genreRemixes: [
      {
        genre: "Political War Epic",
        angle: "The battlefield victory matters less than holding the alliance together long enough to reshape the region.",
        prompt: "Focus on coalition strain, elite overconfidence, and the power vacuum after the battle."
      },
      {
        genre: "Dark Fantasy",
        angle: "A sacred military order discovers its rituals and symbols no longer guarantee fear or obedience.",
        prompt: "Turn the collapsing aura of holy invincibility into a mythic military downfall."
      }
    ],
    whatIfDivergences: [
      "What if the coalition fractures before the battle?",
      "What if the Teutonic Knights win and become the dominant eastern power?",
      "What if a messenger changes the timing of the attack?",
      "What if the battle is remembered completely differently by each side?",
      "What if the real victory happens after the battlefield, in the story told afterward?"
    ]
  }
];

const GENRE_MUTATION = ["Realistic", "Grounded Fiction", "Speculative", "Fantasy", "Cosmic"];
const MUTATION_DESCRIPTIONS = [
  "Grounded in the real source.",
  "Plausible changes, same pressure.",
  "One what-if changes the outcome.",
  "Mythic symbols carry the conflict.",
  "Human conflict meets an unknowable system."
];
const BLUEPRINTS = [
  "Novel",
  "Short story",
  "Movie",
  "TV episode",
  "YouTube video",
  "Game quest",
  "D&D one-shot",
  "Comic issue",
  "Podcast episode",
  "Documentary outline",
  "Fanfic setup"
];
const FORGE_FLOW = [
  { id: "seed-hunter", label: "Seed Hunter", helper: "Choose the source pattern." },
  { id: "blueprint", label: "Blueprint", helper: "Shape it into structure." },
  { id: "remix", label: "Remix", helper: "Shift genre and mutation." },
  { id: "source", label: "Source Trail", helper: "Check the grounding." }
];

function listToChips(list) {
  return (list || []).map((item) => <span key={item} className="chip">{item}</span>);
}

function trimTerminalPunctuation(text) {
  return String(text || "").replace(/[.!?]+$/u, "");
}

function lowerClean(text) {
  return trimTerminalPunctuation(text).toLowerCase();
}

function pickDifferentRandomSeed(seeds, currentSeedId) {
  if (!seeds.length) return null;
  const candidates = seeds.length > 1 ? seeds.filter((seed) => seed.id !== currentSeedId) : seeds;
  return candidates[Math.floor(Math.random() * candidates.length)] || null;
}

function cleanCustomAdditions(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function buildFuel(seed, genre) {
  const focus = seed.storyDNA.slice(0, 3).join(", ");
  const hinge = lowerClean(seed.hinge);
  return [
    `Logline: A ${genre.toLowerCase()} story built around ${hinge}.`,
    `Story DNA: Pull on ${focus} until the event becomes a usable narrative engine.`,
    `Character pressure: Force the lead to choose between survival, truth, and belonging.`,
    `Source rule: keep the real event visible so the fiction feels grounded instead of generic.`
  ];
}

function buildStoryFuel(seed) {
  const remix = seed.genreRemixes?.[0];
  const secondRemix = seed.genreRemixes?.[1];
  return [
    `Start with the hinge: ${seed.hinge}`,
    `Keep the pressure on these forces: ${(seed.charactersForces || []).slice(0, 3).join(", ")}`,
    `Lean on the reusable pattern: ${(seed.storyDNA || []).slice(0, 4).join(", ")}`,
    remix ? `First remix angle: ${remix.angle}` : "First remix angle: push the pattern into a new genre.",
    secondRemix ? `Second remix angle: ${secondRemix.angle}` : "Second remix angle: keep the source recognizable but transformed."
  ];
}

function makeSeedPacket(seed, customAdditions = "") {
  const custom = cleanCustomAdditions(customAdditions);
  const lines = [
    `# ${seed.title}`,
    ``,
    `**Source type:** ${seed.sourceType}`,
    `**Era:** ${seed.era}`,
    `**Region:** ${seed.region}`,
    ``,
    `## Summary`,
    seed.summary,
    ``,
    `## Why It's Wild`,
    seed.whyWild,
    ``,
    `## Stakes`,
    seed.stakes,
    ``,
    `## Hinge`,
    seed.hinge,
    ``,
    `## Story DNA`,
    seed.storyDNA.map((item) => `- ${item}`).join("\n"),
    ``,
    `## Source Trail`,
    seed.sourceTrail.map((source) => `- ${source.label}: ${source.url}`).join("\n")
  ];

  if (custom) {
    lines.push(``, `## Custom Additions`, custom);
  }

  return lines.join("\n");
}

function makeBlueprintLines(seed, format, customAdditions = "") {
  const hinge = lowerClean(seed.hinge);
  const stakes = lowerClean(seed.stakes);
  const custom = cleanCustomAdditions(customAdditions);
  const baseLines = {
    "Novel": [
      `Premise: ${seed.hinge}`,
      `Character arc: the lead starts inside ${seed.storyDNA[0]} and ends somewhere changed.`,
      `Act turns: pressure builds through ${seed.storyDNA.slice(1, 4).join(", ")}.`,
      `Final consequence: the choice lands with a cost that feels earned.`
    ],
    "Short story": [
      `Opening image: ${seed.summary}`,
      `Pressure turn: the hidden truth surfaces.`,
      `Choice: someone has to pick between ${stakes}.`,
      `Closing image: the hinge is still visible.`
    ],
    "Movie": [
      `Logline: A ${seed.sourceType} pattern built around ${hinge}.`,
      `Act 1 setup: establish ${seed.charactersForces.slice(0, 2).join(" and ")}.`,
      `Act 2 escalation: push ${seed.storyDNA.slice(0, 3).join(", ")} into conflict.`,
      `Act 3 payoff: the central choice changes what survives.`,
      `Ending options: keep the source visible, but the fiction distinct.`
    ],
    "TV episode": [
      `Cold open: the audience sees the pressure before the explanation.`,
      `Inciting incident: the seed's hidden problem becomes active.`,
      `Midpoint twist: the apparent truth is incomplete.`,
      `Cliffhanger: the real hinge is not solved yet.`
    ],
    "YouTube video": [
      `Title ideas: ${seed.title} as a curiosity hook.`,
      `Opening hook: why this story is stranger than it first looks.`,
      `Main beats: what happened, why it matters, what it could inspire.`,
      `Outro question: what does this pattern remind you of?`
    ],
    "Game quest": [
      `Quest title: build from ${seed.title}.`,
      `Objective: force the player to navigate ${hinge}.`,
      `Hidden twist: the real enemy is not obvious at first.`,
      `Reward: a choice, not just loot.`,
      `Failure consequence: the world changes around the player.`
    ],
    "D&D one-shot": [
      `Quest frame: the party enters a situation shaped by ${seed.sourceType}.`,
      `Key locations: use the source trail as map anchors.`,
      `NPC pressure: let the characters represent competing interpretations.`,
      `Boss reveal: the final conflict is the hinge made physical.`
    ],
    "Comic issue": [
      `Cover hook: a visual version of ${hinge}.`,
      `Scene beats: compress the pressure into clean page turns.`,
      `Page turn: the hidden force is revealed.`,
      `Final panel: leave a question, not a lecture.`
    ],
    "Podcast episode": [
      `Cold open: start with the weirdest true detail.`,
      `Question framing: why this source still matters.`,
      `Interview beats: trace fact, interpretation, and inspiration separately.`,
      `Wrap-up: the story engine, not just the event.`
    ],
    "Documentary outline": [
      `Thesis: ${seed.hinge}`,
      `Evidence blocks: follow the source trail first.`,
      `Counterpoint: separate proven fact from artistic inference.`,
      `Closing takeaway: the pattern is the real value.`
    ],
    "Fanfic setup": [
      `Canon anchor: keep one recognizable element from ${seed.title}.`,
      `What changes: move the conflict into a new emotional frame.`,
      `Relationship tension: let the hinge reshape who trusts whom.`,
      `Pivot scene: the source becomes fiction with a clear boundary.`
    ]
  };

  const lines = baseLines[format] || baseLines.Movie;
  return custom ? [...lines, `Custom additions: ${custom}.`] : lines;
}

function makeBlueprintPacket(seed, format, customAdditions = "") {
  const custom = cleanCustomAdditions(customAdditions);
  const outline = makeBlueprintLines(seed, format, custom);
  const [headline, ...rest] = outline;
  const formatLabel = format;

  const sections = {
    "Novel": [
      { label: "Premise", body: headline },
      { label: "Character arc", body: rest[0] },
      { label: "Act turns", body: rest[1] },
      { label: "Final consequence", body: rest[2] }
    ],
    "Short story": [
      { label: "Opening image", body: headline },
      { label: "Pressure turn", body: rest[0] },
      { label: "Choice", body: rest[1] },
      { label: "Closing image", body: rest[2] }
    ],
    "Movie": [
      { label: "Logline", body: headline },
      { label: "Act 1 setup", body: rest[0] },
      { label: "Act 2 escalation", body: rest[1] },
      { label: "Act 3 payoff", body: rest[2] },
      { label: "Ending options", body: rest[3] }
    ],
    "TV episode": [
      { label: "Cold open", body: headline },
      { label: "Inciting incident", body: rest[0] },
      { label: "Midpoint twist", body: rest[1] },
      { label: "Cliffhanger", body: rest[2] }
    ],
    "YouTube video": [
      { label: "Title ideas", body: headline },
      { label: "Opening hook", body: rest[0] },
      { label: "Main beats", body: rest[1] },
      { label: "Outro question", body: rest[2] }
    ],
    "Game quest": [
      { label: "Quest title", body: headline },
      { label: "Objective", body: rest[0] },
      { label: "Hidden twist", body: rest[1] },
      { label: "Reward", body: rest[2] },
      { label: "Failure consequence", body: rest[3] }
    ],
    "D&D one-shot": [
      { label: "Quest frame", body: headline },
      { label: "Key locations", body: rest[0] },
      { label: "NPC pressure", body: rest[1] },
      { label: "Boss reveal", body: rest[2] }
    ],
    "Comic issue": [
      { label: "Cover hook", body: headline },
      { label: "Scene beats", body: rest[0] },
      { label: "Page turn", body: rest[1] },
      { label: "Final panel", body: rest[2] }
    ],
    "Podcast episode": [
      { label: "Cold open", body: headline },
      { label: "Question framing", body: rest[0] },
      { label: "Interview beats", body: rest[1] },
      { label: "Wrap-up", body: rest[2] }
    ],
    "Documentary outline": [
      { label: "Thesis", body: headline },
      { label: "Evidence blocks", body: rest[0] },
      { label: "Counterpoint", body: rest[1] },
      { label: "Closing takeaway", body: rest[2] }
    ],
    "Fanfic setup": [
      { label: "Canon anchor", body: headline },
      { label: "What changes", body: rest[0] },
      { label: "Relationship tension", body: rest[1] },
      { label: "Pivot scene", body: rest[2] }
    ]
  };

  const sectionsForFormat = sections[formatLabel] || sections.Movie;

  return {
    format: formatLabel,
    title: `${seed.title} ${formatLabel}`,
    summary: `${formatLabel} blueprint built from ${seed.title} with the hinge kept visible.`,
    meta: [seed.sourceType, seed.era, seed.region],
    anchor: seed.hinge,
    sections: custom ? [...sectionsForFormat, { label: "Custom additions", body: custom }] : sectionsForFormat
  };
}

function makeRemixPacket(seed, genre, mutation, customAdditions = "") {
  const custom = cleanCustomAdditions(customAdditions);
  const variation = [
    "Keep the real event visible, but shift the tone and stakes enough that the fiction feels like a new work.",
    "Change the setting and cast, but preserve the pressure pattern.",
    "Let one key assumption fail and see what new story emerges.",
    "Translate the pressure into mythic symbolism and visual conflict.",
    "Push the human problem into a larger and stranger system."
  ][mutation];

  const angle = (seed.genreRemixes || [])[mutation % (seed.genreRemixes?.length || 1)] || seed.genreRemixes?.[0];

  return {
    title: `${seed.title} / ${genre}`,
    summary: `A ${GENRE_MUTATION[mutation].toLowerCase()} reinterpretation of ${seed.title} that keeps the source pattern intact.`,
    meta: [genre, GENRE_MUTATION[mutation], seed.sourceType],
    anchor: seed.hinge,
    sections: [
      { label: "Genre", body: genre },
      { label: "Mutation", body: GENRE_MUTATION[mutation] },
      { label: "Core pressure", body: seed.hinge },
      { label: "Remix direction", body: variation },
      { label: "Reference angle", body: angle ? `${angle.genre}: ${angle.angle}` : "No remix angle found." },
      ...(custom ? [{ label: "Custom additions", body: custom }] : [])
    ]
  };
}

function makeStoryIdeaPacket(seed, format, genre, mutation, customAdditions = "") {
  const custom = cleanCustomAdditions(customAdditions);
  const blueprint = makeBlueprintLines(seed, format, custom);
  const remix = makeRemixPacket(seed, genre, mutation, custom);
  const remixAngle = (seed.genreRemixes || [])[mutation % (seed.genreRemixes?.length || 1)] || seed.genreRemixes?.[0];
  const hinge = lowerClean(seed.hinge);
  const stakes = lowerClean(seed.stakes);

  return {
    title: `${seed.title} / ${format} / ${genre}`,
    summary: `A full story idea that combines ${seed.title}, a ${format.toLowerCase()} format, and a ${GENRE_MUTATION[mutation].toLowerCase()} ${genre.toLowerCase()} remix.`,
    meta: [seed.sourceType, format, genre, GENRE_MUTATION[mutation]],
    anchor: seed.hinge,
    sections: [
      {
        label: "Core idea",
        body: `${trimTerminalPunctuation(seed.summary)}. The central tension is ${hinge}, carried through ${seed.storyDNA.slice(0, 3).join(", ")}.`
      },
      {
        label: "Blueprint shape",
        body: blueprint.join(" ")
      },
      {
        label: "Remix layer",
        body: `${remix.summary} ${remixAngle ? remixAngle.prompt : ""}`.trim()
      },
      {
        label: "Main pressure",
        body: `The lead has to choose between ${stakes}, while the setting pushes back through ${seed.charactersForces.slice(0, 3).join(", ")}.`
      },
      {
        label: "Story fuel",
        body: [
          `Format: ${format}`,
          `Genre: ${genre}`,
          `Mutation: ${GENRE_MUTATION[mutation]}`,
          `Hinge: ${seed.hinge}`,
          `Story DNA: ${seed.storyDNA.slice(0, 4).join(", ")}`,
          ...(custom ? [`Custom additions: ${custom}`] : [])
        ].join(" · ")
      },
      ...(custom ? [{
        label: "Custom additions",
        body: `Use this as the transformation layer: ${custom}. Keep the seed's hinge underneath it.`
      }] : []),
      {
        label: "Source boundary",
        body: "Inspired by the source pattern, not a retelling. Keep the real source visible, but mark the final story as fiction."
      }
    ]
  };
}

function renderMetaChips(items) {
  return (
    <div className="chip-row">
      {items.filter(Boolean).map((item) => (
        <span key={item} className="chip">{item}</span>
      ))}
    </div>
  );
}

function InspirationPanel({ seed, onSeedChange, filteredSeeds, selectedTag, onTagChange }) {
  const storyFuel = buildStoryFuel(seed);
  return (
    <div className="panel-stack">
      <section className="panel">
        <div className="panel__head">
          <div>
            <div className="eyebrow">Historical seed</div>
            <h2>{seed.title}</h2>
          </div>
          <div className="meta">{seed.sourceType} · {seed.era}</div>
        </div>

        <p className="lede">{seed.summary}</p>

        <div className="control-group">
          <div className="control-label">Tags</div>
          <div className="button-row">
            {["All", "survival", "betrayal", "war", "frontier", "ancient world", "mysticism", "espionage", "lost expedition", "cosmic horror", "political collapse", "UAP", "forbidden knowledge"].map((tag) => (
              <button key={tag} type="button" className={selectedTag === tag ? "pill is-active" : "pill"} onClick={() => onTagChange(tag)}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <div className="control-label">Seed picker</div>
          <div className="button-row">
            {filteredSeeds.map((item) => (
              <button key={item.id} type="button" className={seed.id === item.id ? "pill is-active" : "pill"} onClick={() => onSeedChange(item.id)}>
                {item.title}
              </button>
            ))}
          </div>
        </div>

        <div className="mini-grid">
          <div className="mini-card">
            <div className="card-label">Why it's wild</div>
            <div>{seed.whyWild}</div>
          </div>
          <div className="mini-card">
            <div className="card-label">The stakes</div>
            <div>{seed.stakes}</div>
          </div>
          <div className="mini-card">
            <div className="card-label">The hinge</div>
            <div>{seed.hinge}</div>
          </div>
          <div className="mini-card">
            <div className="card-label">Characters / forces</div>
            <div className="chip-row">{listToChips(seed.charactersForces)}</div>
          </div>
          <div className="mini-card">
            <div className="card-label">Story DNA</div>
            <div className="chip-row">{listToChips(seed.storyDNA)}</div>
          </div>
          <div className="mini-card">
            <div className="card-label">What if divergences</div>
            <div className="stacked-list">
              {(seed.whatIfDivergences || []).map((item) => <div key={item}>{item}</div>)}
            </div>
          </div>
          <div className="mini-card mini-card--wide">
            <div className="card-label">Story Fuel</div>
            <div className="stacked-list">
              {storyFuel.map((item) => <div key={item}>{item}</div>)}
            </div>
          </div>
          <div className="mini-card mini-card--wide">
            <div className="card-label">Source trail</div>
            <div className="stacked-list">
              {(seed.sourceTrail || []).map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function BlueprintPanel({ seed, format, onFormatChange, customAdditions }) {
  const outline = useMemo(() => makeBlueprintLines(seed, format, customAdditions), [seed, format, customAdditions]);
  const [packet, setPacket] = useState(() => makeBlueprintPacket(seed, format, customAdditions));
  const [copyState, setCopyState] = useState("");

  useEffect(() => {
    setPacket(makeBlueprintPacket(seed, format, customAdditions));
    setCopyState("");
  }, [seed.id, format, customAdditions]);

  function generateOutline() {
    setPacket(makeBlueprintPacket(seed, format, customAdditions));
  }

  async function copyOutline() {
    try {
      const content = packet || makeBlueprintPacket(seed, format, customAdditions);
      const text = [
        `# ${content.title}`,
        "",
        content.summary,
        "",
        ...content.sections.flatMap((section) => [
          `## ${section.label}`,
          section.body,
          ""
        ])
      ].join("\n");
      await navigator.clipboard.writeText(text);
      setCopyState("Copied outline");
      window.setTimeout(() => setCopyState(""), 1400);
    } catch {
      setCopyState("Copy failed");
      window.setTimeout(() => setCopyState(""), 1400);
    }
  }

  return (
    <section className="panel">
      <div className="panel__head">
        <div>
          <div className="eyebrow">Blueprint</div>
          <h2>{seed.title}</h2>
        </div>
        <div className="meta">Turn the seed into a structured format</div>
      </div>

      <div className="primary-actions">
        <button type="button" className="pill pill--primary pill--large" onClick={generateOutline}>Generate outline</button>
        <button type="button" className="pill" onClick={copyOutline}>{copyState || (packet ? "Copy generated outline" : "Copy outline")}</button>
      </div>

      {packet ? (
        <div className="output-panel">
          <div className="output-panel__head">
            <div>
              <div className="card-label">Generated outline</div>
              <h3 className="output-title">{packet.title}</h3>
            </div>
            <div className="meta">{packet.format}</div>
          </div>
          <p className="output-summary">{packet.summary}</p>
          <div className="output-meta-row">
            {renderMetaChips(packet.meta)}
            <div className="output-anchor">
              <div className="card-label">Anchor</div>
              <div>{packet.anchor}</div>
            </div>
          </div>
          <div className="mini-grid output-grid">
            {packet.sections.map((section) => (
              <div key={section.label} className="mini-card mini-card--output">
                <div className="card-label">{section.label}</div>
                <div>{section.body}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mini-grid">
          {outline.map((item) => (
            <div key={item} className="mini-card">
              <div>{item}</div>
            </div>
          ))}
        </div>
      )}

      <div className="control-group">
        <div className="control-label">Format</div>
        <div className="button-row">
          {BLUEPRINTS.map((item) => (
            <button key={item} type="button" className={format === item ? "pill is-active" : "pill"} onClick={() => onFormatChange(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function RemixPanel({ seed, genre, onGenreChange, mutation, onMutationChange, customAdditions }) {
  const [packet, setPacket] = useState(null);
  const [copyState, setCopyState] = useState("");
  const custom = cleanCustomAdditions(customAdditions);
  const fuel = [
    `Genre: ${genre}`,
    `Mutation level: ${GENRE_MUTATION[mutation]}`,
    `Core pressure: ${seed.hinge}`,
    `Mutation logic: ${MUTATION_DESCRIPTIONS[mutation]}`,
    ...buildFuel(seed, genre),
    ...(custom ? [`Custom additions: ${custom}`] : [])
  ];

  useEffect(() => {
    setPacket(null);
    setCopyState("");
  }, [seed.id, genre, mutation, customAdditions]);

  function generateRemix() {
    setPacket(makeRemixPacket(seed, genre, mutation, customAdditions));
  }

  async function copyRemix() {
    try {
      const content = packet || makeRemixPacket(seed, genre, mutation, customAdditions);
      const text = [
        `# ${content.title}`,
        "",
        content.summary,
        "",
        ...content.sections.flatMap((section) => [
          `## ${section.label}`,
          section.body,
          ""
        ])
      ].join("\n");
      await navigator.clipboard.writeText(text);
      setCopyState("Copied remix");
      window.setTimeout(() => setCopyState(""), 1400);
    } catch {
      setCopyState("Copy failed");
      window.setTimeout(() => setCopyState(""), 1400);
    }
  }

  return (
    <section className="panel">
      <div className="panel__head">
        <div>
          <div className="eyebrow">Remix</div>
          <h2>{seed.title}</h2>
        </div>
        <div className="meta">{GENRE_MUTATION[mutation]}</div>
      </div>

      <div className="control-group">
        <div className="control-label">Genre</div>
        <div className="button-row">
          {["Sci-fi", "Horror", "Fantasy", "Western", "Political thriller", "War drama", "Dark comedy", "Game quest", "Anime arc", "Fanfic setup"].map((item) => (
            <button key={item} type="button" className={genre === item ? "pill is-active" : "pill"} onClick={() => onGenreChange(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="control-group">
        <div className="control-label">Mutation slider</div>
        <input className="slider" type="range" min="0" max="4" step="1" value={mutation} onChange={(e) => onMutationChange(Number(e.target.value))} />
        <div className="mutation-note">
          <strong>{GENRE_MUTATION[mutation]}</strong>
          <span>{MUTATION_DESCRIPTIONS[mutation]}</span>
        </div>
        <div className="mutation-scale" aria-label="Mutation level scale">
          {GENRE_MUTATION.map((item, index) => (
            <span key={item} className={mutation === index ? "is-active" : ""}>{item}</span>
          ))}
        </div>
      </div>

      <div className="button-row">
        <button type="button" className="pill" onClick={generateRemix}>Generate remix</button>
        <button type="button" className="pill" onClick={copyRemix}>{copyState || (packet ? "Copy generated remix" : "Copy remix")}</button>
      </div>

      {packet ? (
        <div className="output-panel">
          <div className="output-panel__head">
            <div>
              <div className="card-label">Generated remix</div>
              <h3 className="output-title">{packet.title}</h3>
            </div>
            <div className="meta">{packet.summary}</div>
          </div>
          <div className="output-meta-row">
            {renderMetaChips(packet.meta)}
            <div className="output-anchor">
              <div className="card-label">Anchor</div>
              <div>{packet.anchor}</div>
            </div>
          </div>
          <div className="mini-grid output-grid">
            {packet.sections.map((section) => (
              <div key={section.label} className="mini-card mini-card--output">
                <div className="card-label">{section.label}</div>
                <div>{section.body}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mini-grid">
          {fuel.map((item) => (
            <div key={item} className="mini-card">
              <div>{item}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StoryIdeaPanel({
  seed,
  format,
  genre,
  mutation,
  customAdditions,
  onCustomAdditionsChange,
  onGenerate,
  packet,
  copyState,
  onCopy
}) {
  const snapshot = useMemo(
    () => makeStoryIdeaPacket(seed, format, genre, mutation, customAdditions),
    [seed, format, genre, mutation, customAdditions]
  );
  const activePacket = packet || snapshot;

  return (
    <section className="panel story-idea">
      <div className="story-idea__header">
        <div className="story-idea__header-copy">
          <div className="eyebrow">Build final story packet</div>
          <h2>Full story idea</h2>
          <div className="story-idea__summary">Combine the current seed, format, and remix settings into one usable story packet.</div>
        </div>
        <div className="story-idea__header-meta">
          <div className="story-idea__chips">
            {renderMetaChips([seed.sourceType, format, genre, GENRE_MUTATION[mutation]])}
          </div>
          <div className="button-row">
            <button type="button" className="pill pill--primary pill--large" onClick={onGenerate}>Generate full story idea</button>
            <button type="button" className="pill" onClick={() => onCopy(activePacket)}>{copyState || (packet ? "Copy story packet" : "Copy preview")}</button>
          </div>
        </div>
      </div>

      <div className="custom-additions">
        <label className="control-label" htmlFor="custom-additions">Custom additions</label>
        <div className="custom-additions__hint">Optional. Add your own character, setting shift, twist, tone, or ending direction.</div>
        <textarea
          id="custom-additions"
          className="custom-additions__input"
          value={customAdditions}
          onChange={(event) => onCustomAdditionsChange(event.target.value)}
          placeholder="Example: colony ship betrayal, mafia gift, haunted relic, corporate breach..."
          rows={3}
        />
      </div>

      {packet ? (
        <div className="output-panel output-panel--story">
          <div className="output-panel__head output-panel__head--story">
            <div>
              <div className="card-label">Story packet</div>
              <h3 className="output-title">{activePacket.title}</h3>
            </div>
            <div className="meta">{format} · {genre}</div>
          </div>
          <p className="output-summary">{activePacket.summary}</p>
          <div className="output-anchor output-anchor--story">
            <div className="card-label">Anchor</div>
            <div>{activePacket.anchor}</div>
          </div>
          <div className="story-idea__grid">
            <div className="story-idea__col">
              {activePacket.sections.slice(0, 3).map((section) => (
                <div key={section.label} className="story-idea__block">
                  <div className="card-label">{section.label}</div>
                  <div>{section.body}</div>
                </div>
              ))}
            </div>
            <div className="story-idea__col">
              {activePacket.sections.slice(3).map((section) => (
                <div key={section.label} className="story-idea__block">
                  <div className="card-label">{section.label}</div>
                  <div>{section.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="story-idea__grid story-idea__grid--preview">
          {snapshot.sections.map((section) => (
            <div key={section.label} className="story-idea__block">
              <div className="card-label">{section.label}</div>
              <div>{section.body}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SourceTrailPanel({ seed }) {
  return (
    <section className="panel">
      <div className="panel__head">
        <div>
          <div className="eyebrow">Source Trail</div>
          <h2>{seed.title}</h2>
        </div>
        <div className="meta">See what inspired the seed and where the fiction boundary is.</div>
      </div>

      <div className="mini-grid">
        <div className="mini-card">
          <div className="card-label">Source grounded</div>
          <div>{seed.summary}</div>
        </div>
        <div className="mini-card">
          <div className="card-label">What it does not prove</div>
          <div>It does not prove a fictional interpretation, only the underlying event or text.</div>
        </div>
        <div className="mini-card">
          <div className="card-label">Why it is interesting</div>
          <div>{seed.whyWild}</div>
        </div>
        <div className="mini-card">
          <div className="card-label">Fictional transformation</div>
          <div>Inspired by the source pattern, not a retelling. Keep the real source visible, but mark the final story as fiction.</div>
        </div>
        <div className="mini-card mini-card--wide">
          <div className="card-label">Source links</div>
          <div className="source-links">
            {seed.sourceTrail.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CreativeEngine() {
  const [tab, setTab] = useState("blueprint");
  const [tag, setTag] = useState("All");
  const [seedId, setSeedId] = useState(SEEDS[0].id);
  const [blueprintFormat, setBlueprintFormat] = useState("Movie");
  const [remixGenre, setRemixGenre] = useState("Fantasy");
  const [remixMutation, setRemixMutation] = useState(2);
  const [customAdditions, setCustomAdditions] = useState("");
  const [storyPacket, setStoryPacket] = useState(null);
  const [storyCopyState, setStoryCopyState] = useState("");
  const [copyState, setCopyState] = useState("");
  const [lastRandomSeedId, setLastRandomSeedId] = useState("");

  const filteredSeeds = useMemo(() => {
    if (tag === "All") return SEEDS;
    return SEEDS.filter((seed) => seed.tags.includes(tag));
  }, [tag]);

  const activeSeed = useMemo(() => {
    return filteredSeeds.find((seed) => seed.id === seedId) || filteredSeeds[0] || SEEDS[0];
  }, [filteredSeeds, seedId]);

  useEffect(() => {
    if (!filteredSeeds.length) return;
    if (!filteredSeeds.some((seed) => seed.id === seedId)) {
      setSeedId(filteredSeeds[0].id);
    }
  }, [filteredSeeds, seedId]);

  useEffect(() => {
    setStoryPacket(null);
    setStoryCopyState("");
  }, [seedId, blueprintFormat, remixGenre, remixMutation, customAdditions]);

  useEffect(() => {
    setCopyState("");
  }, [seedId]);

  useEffect(() => {
    if (!filteredSeeds.some((seed) => seed.id === lastRandomSeedId)) {
      setLastRandomSeedId("");
    }
  }, [filteredSeeds, lastRandomSeedId]);

  async function copySeedPacket() {
    try {
      const text = makeSeedPacket(activeSeed, customAdditions);
      await navigator.clipboard.writeText(text);
      setCopyState("Copied seed packet");
      window.setTimeout(() => setCopyState(""), 1400);
    } catch {
      setCopyState("Copy failed");
      window.setTimeout(() => setCopyState(""), 1400);
    }
  }

  function pickRandomSeed() {
    const next = pickDifferentRandomSeed(filteredSeeds, lastRandomSeedId || activeSeed.id);
    if (next) {
      setLastRandomSeedId(next.id);
      setSeedId(next.id);
    }
  }

  function generateStoryIdea() {
    setStoryPacket(makeStoryIdeaPacket(activeSeed, blueprintFormat, remixGenre, remixMutation, customAdditions));
  }

  async function copyStoryIdea(packet) {
    try {
      const content = packet || makeStoryIdeaPacket(activeSeed, blueprintFormat, remixGenre, remixMutation, customAdditions);
      const text = [
        `# ${content.title}`,
        "",
        content.summary,
        "",
        ...content.sections.flatMap((section) => [
          `## ${section.label}`,
          section.body,
          ""
        ])
      ].join("\n");
      await navigator.clipboard.writeText(text);
      setStoryCopyState("Copied story packet");
      window.setTimeout(() => setStoryCopyState(""), 1400);
    } catch {
      setStoryCopyState("Copy failed");
      window.setTimeout(() => setStoryCopyState(""), 1400);
    }
  }

  return (
    <div className="creative-engine">
      <header className="forge-hero">
        <div className="forge-hero__copy">
          <div className="eyebrow">Creative engine</div>
          <h1>Find the real pattern. Forge a new story.</h1>
          <p className="lead">Turn real events, old texts, and strange source material into usable story blueprints without losing the source trail.</p>
          <div className="button-row forge-hero__actions">
            <button type="button" className="pill pill--primary pill--large" onClick={pickRandomSeed}>Random seed</button>
            <button type="button" className="pill" onClick={copySeedPacket}>{copyState || "Copy seed packet"}</button>
          </div>
        </div>
        <div className="forge-hero__seed">
          <section className="panel panel--hero-seed">
            <div className="card-label">Current seed</div>
            <h2>{activeSeed.title}</h2>
            <p className="seed-summary">{activeSeed.summary}</p>
            <div className="chip-row">
              <span className="chip">{activeSeed.sourceType}</span>
              <span className="chip">{activeSeed.era}</span>
              <span className="chip">{activeSeed.region}</span>
            </div>
            <div className="output-anchor output-anchor--hero">
              <div className="card-label">Core tension</div>
              <div>{activeSeed.hinge}</div>
            </div>
          </section>
        </div>
      </header>

      <section className="forge-guide panel">
        <div className="panel__head forge-guide__head">
          <div>
            <div className="eyebrow">How Story Forge works</div>
            <h2>Start with the source pressure, then forge a new story around it.</h2>
          </div>
        </div>
        <div className="forge-guide__grid">
          <div className="forge-guide__step">
            <div className="forge-guide__index">1</div>
            <div>
              <div className="card-label">Pick a seed</div>
              <div>Start with a real event, myth, archive mystery, or strange source.</div>
            </div>
          </div>
          <div className="forge-guide__step">
            <div className="forge-guide__index">2</div>
            <div>
              <div className="card-label">Shape the blueprint</div>
              <div>Turn the source pressure into a movie, novel, game quest, documentary outline, or other format.</div>
            </div>
          </div>
          <div className="forge-guide__step">
            <div className="forge-guide__index">3</div>
            <div>
              <div className="card-label">Remix the angle</div>
              <div>Shift genre and mutation so it becomes a new story, not a flat retelling.</div>
            </div>
          </div>
          <div className="forge-guide__step">
            <div className="forge-guide__index">4</div>
            <div>
              <div className="card-label">Add your twist</div>
              <div>Use custom additions to inject your own setting, character, tone, or ending direction.</div>
            </div>
          </div>
          <div className="forge-guide__step forge-guide__step--wide">
            <div className="forge-guide__index">5</div>
            <div>
              <div className="card-label">Check the source trail</div>
              <div>Keep the real source visible and make the final story clearly fictional.</div>
            </div>
          </div>
        </div>
        <div className="forge-guide__note">Recommended first flow: Pick a seed, choose Movie, choose Historical Mystery or Fantasy, generate Blueprint, then generate Full story idea.</div>
      </section>

      <section className="forge-workspace">
        <aside className="forge-rail">
          <div className="forge-rail__section">
            <div className="card-label">Forge path</div>
            <div className="forge-flow">
              {FORGE_FLOW.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  className={tab === step.id ? "forge-flow__step is-active" : "forge-flow__step"}
                  onClick={() => setTab(step.id)}
                  aria-pressed={tab === step.id}
                >
                  <div className="forge-flow__index">{index + 1}</div>
                  <div>
                    <div className="forge-flow__label">{step.label}</div>
                    <div className="forge-flow__helper">{step.helper}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="forge-overview__note">Start with the seed, turn it into structure, mutate it, then check the source boundary.</div>
          </div>

          <div className="forge-rail__section">
            <div className="card-label">Current setup</div>
            <div className="forge-state">
              <div className="forge-state__row">
                <div className="card-label">Format</div>
                <div className="forge-state__value">{blueprintFormat}</div>
              </div>
              <div className="forge-state__row">
                <div className="card-label">Genre</div>
                <div className="forge-state__value">{remixGenre}</div>
              </div>
              <div className="forge-state__row">
                <div className="card-label">Mutation</div>
                <div className="forge-state__setting">
                  <div className="forge-state__value">{GENRE_MUTATION[remixMutation]}</div>
                  <div className="forge-state__hint">{MUTATION_DESCRIPTIONS[remixMutation]}</div>
                </div>
              </div>
              <div className="forge-state__row">
                <div className="card-label">Current seed</div>
                <div className="forge-state__value">{activeSeed.title}</div>
              </div>
              <div className="forge-state__chips">
                {renderMetaChips([activeSeed.sourceType, activeSeed.era, activeSeed.region])}
              </div>
            </div>
          </div>
        </aside>

        <div className="forge-workspace__main">
          <StoryIdeaPanel
            seed={activeSeed}
            format={blueprintFormat}
            genre={remixGenre}
            mutation={remixMutation}
            customAdditions={customAdditions}
            onCustomAdditionsChange={setCustomAdditions}
            onGenerate={generateStoryIdea}
            packet={storyPacket}
            copyState={storyCopyState}
            onCopy={copyStoryIdea}
          />

          <section className="supporting-module">
            {tab === "seed-hunter" && (
              <InspirationPanel
                seed={activeSeed}
                onSeedChange={setSeedId}
                filteredSeeds={filteredSeeds}
                selectedTag={tag}
                onTagChange={setTag}
              />
            )}
            {tab === "blueprint" && (
              <BlueprintPanel
                key={activeSeed.id}
                seed={activeSeed}
                format={blueprintFormat}
                onFormatChange={setBlueprintFormat}
                customAdditions={customAdditions}
              />
            )}
            {tab === "remix" && (
              <RemixPanel
                key={activeSeed.id}
                seed={activeSeed}
                genre={remixGenre}
                onGenreChange={setRemixGenre}
                mutation={remixMutation}
                onMutationChange={setRemixMutation}
                customAdditions={customAdditions}
              />
            )}
            {tab === "source" && <SourceTrailPanel seed={activeSeed} />}
          </section>
        </div>
      </section>
    </div>
  );
}
