export const buddyLanguage = {
  home: {
    greeting: "Hi.",
    question: "What are we doing?",
    intro: "You can read, ask me about something, or just work something out with me.",
  },
  reading: {
    ready: "Show me the page.",
    looking: "I'm looking.",
    point: "Point to the bit you want.",
    selected: "This one?",
    quiet: "Keep reading.",
    quietDetail: "No scores. No quiz. No interruption unless you ask.",
    gotIt: "Got it?",
    moveOn: "Yep, keep going",
  },
  helpDepth: {
    question: "How much help?",
    agency: "You choose.",
    tell: "Tell me",
    clue: "Give me a clue",
    together: "Let's work it out",
  },
  actions: {
    read: "Read with me",
    help: "Help me with something",
    words: "Let's play with words",
    discover: "Explore something",
    sayIt: "Say it",
    meaning: "What does it mean?",
    sentence: "Read the sentence",
  },
  uncertainty: {
    vision: "I might be reading the page wrong.",
    hearing: "I didn't catch that.",
    general: "I'm not certain about that one.",
    retry: "Want me to look again?",
  },
  acknowledgement: ["Yep.", "You've got it.", "Nice spot.", "That worked."],
  difficulty: [
    "That's a tricky one.",
    "Want a clue?",
    "Shall I say it?",
    "Want to try it together?",
    "That spelling is a bit sneaky.",
  ],
} as const;

export type BuddyLanguage = typeof buddyLanguage;

/**
 * Language rules are product constraints, not merely tone guidance.
 * Generated copy should be checked against these before it reaches a child.
 */
export const buddyLanguageRules = {
  smallestUsefulThingFirst: true,
  noAbilityLabels: true,
  noFailureLanguage: true,
  inferenceIsTentative: true,
  noAutomaticPraise: true,
  childControlsHelpDepth: true,
} as const;

export const prohibitedChildFacingPhrases = [
  "incorrect",
  "you failed",
  "weak word",
  "problem area",
  "you should know this",
  "easy!",
] as const;
