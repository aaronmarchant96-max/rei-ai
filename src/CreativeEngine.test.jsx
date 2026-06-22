import { makeRemixPacket, makeStoryIdeaPacket } from "./CreativeEngine.jsx";

const donnerLikeSeed = {
  id: "donner-party",
  title: "The Donner Party",
  era: "1846-1847",
  region: "Sierra Nevada, North America",
  sourceType: "history",
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
  ],
  sourceTrail: [
    { label: "Britannica", url: "https://www.britannica.com/event/Donner-Party" },
    { label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Donner_Party" }
  ]
};

describe("CreativeEngine packet builders", () => {
  it("threads the selected format, genre, and mutation into the full story packet", () => {
    const packet = makeStoryIdeaPacket(donnerLikeSeed, "Movie", "Dark comedy", 4);
    const body = packet.sections.map((section) => `${section.label}: ${section.body}`).join("\n");
    const lowerBody = body.toLowerCase();

    expect(packet.title).toBe("The Donner Party / Movie / Dark comedy");
    expect(body).toContain("Movie");
    expect(body).toContain("Dark comedy");
    expect(body).toContain("Cosmic");
    expect(lowerBody).toContain("protagonist");
    expect(lowerBody).toContain("setting");
    expect(lowerBody).toContain("central conflict");
    expect(lowerBody).toContain("story turn");
    expect(lowerBody).toContain("absurd");
    expect(lowerBody).toContain("system");
    expect(body).not.toContain("Turn the survival pressure into escalating horror");
    expect(body).not.toContain("Reference angle: Horror");
    expect(body).not.toContain("Horror");
  });

  it("keeps the remix packet aligned to the selected genre instead of the seed's original remix label", () => {
    const packet = makeRemixPacket(donnerLikeSeed, "Dark comedy", 4);
    const body = packet.sections.map((section) => `${section.label}: ${section.body}`).join("\n");

    expect(packet.title).toBe("The Donner Party / Dark comedy");
    expect(body).toContain("Dark comedy");
    expect(body).toContain("Cosmic");
    expect(body).toContain("Selected angle");
    expect(body).not.toContain("Horror");
  });
});
