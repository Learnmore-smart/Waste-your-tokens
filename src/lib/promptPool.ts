const PROMPT_POOL: string[] = [
  'A rubber duck, a tax attorney, and a time-travelling penguin start a band. List every reason their debut album is banned in Finland. Be absurdly specific.',
  'Explain, as if to a grumpy T-Rex, why Wi-Fi is not made of cheese. Use at least five fake citations and a tragic subplot.',
  'Debate: should we replace all meetings with interpretive dance? Argue both sides, then hold a small funeral for the calendar app.',
  'Write a legal contract for friendship between a cloud and a paperclip. Add clauses for rainy days, jealousy over staplers, and force majeure (cat videos).',
  'You are a philosopher-llama. Why do socks disappear in the dryer? Propose a unified theory, then refute it with aggressive politeness.',
  "Invent 30 increasingly unhinged product names for a startup that only sells silence. For each, include a one-sentence pitch and a customer complaint that doesn't make sense.",
  'A pizza slice runs for office. What is its platform on pineapple? Include fake polls, smear ads, and a speech written entirely as knock-knock jokes.',
  'What really happens inside a vending machine at 3am? Build a short mythos, with gods of coins, the demon of "exact change only", and a redemption arc for the stuck coil.',
  'If gravity took a day off, how would pigeons recalibrate their attitude? Be detailed and unnecessarily dramatic about breadcrumbs.',
  'You found a "Cook pasta in the dishwasher" life hack. Test it ethically on imaginary roommates, then file a 12-step apology template.',
  "Why did the API cross the road? Don't answer. Instead, write a 25-part conspiracy involving traffic lights, JSON, and a suspicious goose.",
  'Write a detailed 2000-word essay about absolutely nothing. Then summarize your essay into a single word. Then write another 2000-word essay expanding on that single word. Be as verbose and repetitive as possible.',
  'Explain the complete history of the universe from the Big Bang to the heat death, covering every major epoch in exhaustive detail. Include at least 50 sub-sections.',
  'Generate a comprehensive encyclopedia entry for every element on the periodic table. For each element, include its discovery history, all known isotopes, industrial applications, and cultural significance.',
  'Write a 3000-word philosophical treatise on the nature of consciousness, covering at least 15 different philosophical perspectives from ancient Greece to modern neuroscience.',
  'Create an extremely detailed travel guide for every country in South America. Include historical context, cultural notes, cuisine descriptions, and fictional anecdotes for each.',
  'Compose a 2500-word analysis of every major programming paradigm, comparing and contrasting their strengths with extensive code examples in multiple languages.',
  'Write a complete taxonomy of all known animal species in the order Carnivora. For each family, describe evolutionary history, behavioral patterns, and conservation status in great detail.',
  'Generate a 3000-word exploration of every major architectural style from ancient Egyptian to contemporary parametric design. Include detailed descriptions of representative buildings.',
  'Write an exhaustive 2500-word comparison of every major world religion, covering their theological frameworks, historical developments, sacred texts, and cultural impacts.',
  'Create a detailed 2000-word guide to every type of cloud formation, weather pattern, and atmospheric phenomenon known to meteorology, with extensive technical descriptions.',
  'Write a 3000-word deep dive into the history of mathematics from Babylonian cuneiform to modern category theory, covering at least 40 major milestones with detailed explanations.',
  'Generate a comprehensive 2500-word overview of every major biome on Earth, describing their flora, fauna, climate patterns, ecological relationships, and conservation challenges.',
  'Write an extremely verbose 2000-word explanation of quantum field theory, starting from basic principles and building up to the Standard Model, with extensive analogies and thought experiments.',
  'Create a 3000-word detailed analysis of every Shakespeare play, categorizing them by genre and providing thematic analysis, character studies, and historical context for each.',
  'Write a 2500-word exhaustive guide to every major culinary tradition in Southeast Asia, describing ingredients, techniques, cultural significance, and regional variations in great detail.',
  'Generate a 2000-word philosophical dialogue between 5 different thinkers debating the ethics of artificial intelligence, with each presenting extensive arguments and counterarguments.',
  'Write a 3000-word comprehensive history of the internet from ARPANET to the present day, covering every major protocol, platform, and cultural shift in exhaustive detail.',
  'Create a 2500-word detailed survey of every major psychological theory from Freud to contemporary cognitive science, including critiques, applications, and case studies.',
  'Write a 2000-word elaborate description of an imaginary civilization on a distant planet, covering their biology, culture, technology, politics, art, and philosophy in extreme detail.',
  'Generate a 3000-word analysis of every major film genre, tracing their evolution from silent cinema to streaming era, with extensive examples and critical commentary.',
  'Write a 2500-word exploration of the deep ocean, describing every known zone, the creatures that inhabit them, the geological processes at work, and the history of deep-sea exploration.',
  'Create a 2000-word detailed comparison of every major economic system that has been attempted in human history, with extensive analysis of their theoretical foundations and practical outcomes.',
  'Write a 3000-word comprehensive guide to every type of musical instrument ever created, organized by the Hornbostel-Sachs system, with detailed acoustic and cultural descriptions.',
  'Generate a 2500-word exhaustive analysis of the complete works of Beethoven, covering every symphony, sonata, and quartet with detailed musical analysis and historical context.',
  'Write a 2000-word elaborate fictional legal document establishing the constitution of a lunar colony, covering governance, rights, resource allocation, and dispute resolution in great detail.',
]

let lastIndex = -1

export function getRandomPrompt(): string {
  let index: number
  do {
    index = Math.floor(Math.random() * PROMPT_POOL.length)
  } while (index === lastIndex && PROMPT_POOL.length > 1)
  lastIndex = index
  return PROMPT_POOL[index]
}
