export type WordEvalCase = {
  id: string;
  group: "context" | "irregular" | "pattern" | "complex" | "rare" | "guardrail";
  word: string;
  context: string;
  expectation: string;
};

export const WORD_EVAL_CASES: WordEvalCase[] = [
  {
    id: "bank-river",
    group: "context",
    word: "bank",
    context: "We sat on the bank beside the river and watched the ducks.",
    expectation: "The sloping land beside a river, not a place for money.",
  },
  {
    id: "bank-money",
    group: "context",
    word: "bank",
    context: "Dad went to the bank to put some money into his account.",
    expectation: "A place or business that keeps and manages money.",
  },
  {
    id: "bark-dog",
    group: "context",
    word: "bark",
    context: "The dog's loud bark made everyone look around.",
    expectation: "The sound a dog makes.",
  },
  {
    id: "bark-tree",
    group: "context",
    word: "bark",
    context: "The bark on the old tree felt rough under my hand.",
    expectation: "The outer covering of a tree.",
  },
  {
    id: "bat-animal",
    group: "context",
    word: "bat",
    context: "A tiny bat flew out of the cave after sunset.",
    expectation: "The flying animal, not sports equipment.",
  },
  {
    id: "bat-sport",
    group: "context",
    word: "bat",
    context: "She swung the cricket bat and hit the ball.",
    expectation: "The piece of sports equipment used to hit a ball.",
  },
  {
    id: "through",
    group: "irregular",
    word: "through",
    context: "We walked through the woods to reach the lake.",
    expectation: "Useful warning that ‘ough’ is irregular plus a simple movement meaning.",
  },
  {
    id: "enough",
    group: "irregular",
    word: "enough",
    context: "There was enough pizza for everybody to have two slices.",
    expectation: "As much as is needed; sound guidance should not treat ‘ough’ as regular.",
  },
  {
    id: "choir",
    group: "irregular",
    word: "choir",
    context: "The school choir sang together on the stage.",
    expectation: "A group of people who sing together; pronunciation support should still be available.",
  },
  {
    id: "yacht",
    group: "irregular",
    word: "yacht",
    context: "The yacht sailed slowly across the bay.",
    expectation: "A sailing or motor boat; do not invent simple letter-by-letter decoding.",
  },
  {
    id: "colonel",
    group: "irregular",
    word: "colonel",
    context: "The colonel spoke to the soldiers before they left.",
    expectation: "A military rank; pronunciation metadata matters more than spelling rules here.",
  },
  {
    id: "photograph",
    group: "pattern",
    word: "photograph",
    context: "I took a photograph of the rainbow before it disappeared.",
    expectation: "Should notice ‘ph’ and give a concrete meaning.",
  },
  {
    id: "station",
    group: "pattern",
    word: "station",
    context: "We waited at the station until our train arrived.",
    expectation: "Should notice the ‘tion’ pattern and explain the place in this context.",
  },
  {
    id: "extraordinary",
    group: "complex",
    word: "extraordinary",
    context: "The view from the mountain was extraordinary.",
    expectation: "Curated chunking should remain useful and the meaning should stay short.",
  },
  {
    id: "photosynthesis",
    group: "complex",
    word: "photosynthesis",
    context: "Plants use photosynthesis to make food using light from the sun.",
    expectation: "A child-simple science meaning without losing the essential idea.",
  },
  {
    id: "onomatopoeia",
    group: "rare",
    word: "onomatopoeia",
    context: "Buzz and hiss are examples of onomatopoeia because the words copy sounds.",
    expectation: "A simple language meaning and useful pronunciation/syllable support.",
  },
  {
    id: "serendipity",
    group: "rare",
    word: "serendipity",
    context: "Finding the hidden beach by accident was a bit of serendipity.",
    expectation: "A lucky discovery made by chance, expressed simply.",
  },
  {
    id: "ocr-nonsense",
    group: "guardrail",
    word: "marnivorous",
    context: "The creature was described as marnivorous in the blurry text.",
    expectation: "Should remain uncertain rather than confidently inventing a definition for a likely OCR error.",
  },
];
