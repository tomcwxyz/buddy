export type ReviewedHeteronymEntry = {
  strictPartOfSpeech: true;
  pronunciations: Array<{
    partOfSpeech: "noun" | "verb" | "adjective";
    ipa: string;
  }>;
  senses: Array<{
    partOfSpeech: "noun" | "verb" | "adjective";
    definition: string;
    example: string;
  }>;
};

export const HETERONYM_CORPUS_VERSION = "heteronym.2";

// These words have multiple established British pronunciations whose correct
// form can be selected safely from ordinary grammatical context. Britfone gives
// us the pronunciation variants; Buddy supplies the reviewed part-of-speech
// mapping and child-friendly meanings. When grammatical context is absent we do
// not guess a pronunciation.
export const HETERONYM_ENTRIES: Record<string, ReviewedHeteronymEntry> = {
  lead: {
    strictPartOfSpeech: true,
    pronunciations: [
      { partOfSpeech: "verb", ipa: "l ˈiː d" },
      { partOfSpeech: "noun", ipa: "l ˈɛ d" },
    ],
    senses: [
      {
        partOfSpeech: "verb",
        definition: "To guide or show the way for a person or group.",
        example: "Please lead the group along the path.",
      },
      {
        partOfSpeech: "noun",
        definition: "A soft, heavy metal.",
        example: "The lead weight was surprisingly heavy.",
      },
    ],
  },
  wind: {
    strictPartOfSpeech: true,
    pronunciations: [
      { partOfSpeech: "noun", ipa: "w ˈɪ n d" },
      { partOfSpeech: "verb", ipa: "w ˈaɪ n d" },
    ],
    senses: [
      {
        partOfSpeech: "noun",
        definition: "Air that is moving outside.",
        example: "The wind blew leaves across the playground.",
      },
      {
        partOfSpeech: "verb",
        definition: "To turn or twist something around, often to make a mechanism work.",
        example: "Please wind the clock before bed.",
      },
    ],
  },
  tear: {
    strictPartOfSpeech: true,
    pronunciations: [
      { partOfSpeech: "noun", ipa: "t ˈɪə" },
      { partOfSpeech: "verb", ipa: "t ˈɛə" },
    ],
    senses: [
      {
        partOfSpeech: "noun",
        definition: "A drop of salty liquid that comes from your eye when you cry or your eye waters.",
        example: "A tear rolled down her cheek.",
      },
      {
        partOfSpeech: "verb",
        definition: "To pull something apart or make a rip in it.",
        example: "Please tear the paper along the fold.",
      },
    ],
  },
  close: {
    strictPartOfSpeech: true,
    pronunciations: [
      { partOfSpeech: "adjective", ipa: "k l ˈəʊ s" },
      { partOfSpeech: "verb", ipa: "k l ˈəʊ z" },
    ],
    senses: [
      {
        partOfSpeech: "adjective",
        definition: "Near in distance, time, or relationship.",
        example: "Stay close to me.",
      },
      {
        partOfSpeech: "verb",
        definition: "To shut something, or move it so it is no longer open.",
        example: "Please close the door.",
      },
    ],
  },
  live: {
    strictPartOfSpeech: true,
    pronunciations: [
      { partOfSpeech: "verb", ipa: "l ˈɪ v" },
      { partOfSpeech: "adjective", ipa: "l ˈaɪ v" },
    ],
    senses: [
      {
        partOfSpeech: "verb",
        definition: "To have your home in a place.",
        example: "We live near the park.",
      },
      {
        partOfSpeech: "adjective",
        definition: "Alive, or happening or being shown as it happens.",
        example: "The concert is live on television.",
      },
    ],
  },
  use: {
    strictPartOfSpeech: true,
    pronunciations: [
      { partOfSpeech: "noun", ipa: "j ˈuː s" },
      { partOfSpeech: "verb", ipa: "j ˈuː z" },
    ],
    senses: [
      {
        partOfSpeech: "noun",
        definition: "The purpose or way that something is used.",
        example: "This is a good use of the space.",
      },
      {
        partOfSpeech: "verb",
        definition: "To do something with an object, idea, or method to help you achieve something.",
        example: "We use a pencil to write.",
      },
    ],
  },
};
