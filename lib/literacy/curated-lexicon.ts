import { normaliseWord } from "@/lib/literacy/engine";
import type { LexicalCandidate, LexicalRelation } from "@/lib/literacy/lexicon";

type ReviewedSense = {
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
  rank: number;
};

// This is deliberately small and evidence-driven. Add words here when broad
// lexical sources are correct in general but repeatedly choose a poor sense for
// ordinary child reading. Keep examples rich enough for the contextual ranker
// to distinguish senses without hard-coding sentence-specific keyword rules.
const REVIEWED_COMMON_SENSES: Record<string, ReviewedSense[]> = {
  planet: [
    {
      partOfSpeech: "noun",
      definition: "A large, round object in space that travels around a star.",
      example: "Mars is a planet that travels around the Sun.",
      rank: 0,
    },
  ],
  plant: [
    {
      partOfSpeech: "noun",
      definition: "A living thing that grows and can have roots, leaves or flowers.",
      example: "The plant grew a flower beside the window.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "A factory or large place where things are made.",
      example: "The car plant makes engines and other vehicle parts.",
      rank: 1,
    },
    {
      partOfSpeech: "verb",
      definition: "To put a seed or young plant into soil so it can grow.",
      example: "We plant seeds in the garden in spring.",
      rank: 0,
    },
  ],
  spring: [
    {
      partOfSpeech: "noun",
      definition: "The season after winter, when the weather gets warmer and many plants begin to grow.",
      example: "Flowers begin to grow again in spring after winter.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "A coiled piece of metal that can squash or stretch and then bounce back.",
      example: "The spring inside the pen pushes the button back out.",
      rank: 1,
    },
    {
      partOfSpeech: "noun",
      definition: "A place where water naturally comes out of the ground.",
      example: "Clear water flowed from a spring in the hillside.",
      rank: 2,
    },
    {
      partOfSpeech: "verb",
      definition: "To jump or move suddenly and quickly.",
      example: "The cat can spring onto the wall in one jump.",
      rank: 0,
    },
  ],
  light: [
    {
      partOfSpeech: "noun",
      definition: "Something that makes it possible to see, such as sunlight or a lamp.",
      example: "Turn on the light so we can see the page.",
      rank: 0,
    },
    {
      partOfSpeech: "adjective",
      definition: "Not heavy; easy to lift or carry.",
      example: "The empty bag was light enough to carry with one hand.",
      rank: 0,
    },
  ],
  match: [
    {
      partOfSpeech: "noun",
      definition: "A game or contest between people or teams.",
      example: "We watched the football match after school.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "A small stick that makes a flame when you strike it.",
      example: "She struck a match and lit the candle.",
      rank: 1,
    },
    {
      partOfSpeech: "verb",
      definition: "To be the same as, or go well with, something else.",
      example: "These two socks match because they have the same pattern.",
      rank: 0,
    },
  ],
  ring: [
    {
      partOfSpeech: "noun",
      definition: "A small circular band, often worn on a finger.",
      example: "She wore a silver ring on her finger.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "A clear sound like the sound made by a bell or telephone.",
      example: "We heard the ring of the bell from the hall.",
      rank: 1,
    },
    {
      partOfSpeech: "verb",
      definition: "To make a bell-like sound, or to call someone by telephone.",
      example: "The phone began to ring during dinner.",
      rank: 0,
    },
  ],
  current: [
    {
      partOfSpeech: "noun",
      definition: "A steady movement of water or air in one direction.",
      example: "The river current was strong after the rain.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "The flow of electricity through a wire or circuit.",
      example: "Electric current flows through the wire to the lamp.",
      rank: 1,
    },
    {
      partOfSpeech: "adjective",
      definition: "Happening, being used, or true now.",
      example: "The current plan is the one we are using now.",
      rank: 0,
    },
  ],
  coach: [
    {
      partOfSpeech: "noun",
      definition: "A person who teaches or trains a player or team in a sport.",
      example: "The football coach showed us how to pass the ball.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "A large bus used for longer journeys.",
      example: "We travelled to the museum by coach.",
      rank: 1,
    },
    {
      partOfSpeech: "verb",
      definition: "To teach, train or help someone improve at an activity.",
      example: "She helps coach the school football team.",
      rank: 0,
    },
  ],
  club: [
    {
      partOfSpeech: "noun",
      definition: "A group of people who meet because they share an activity or interest.",
      example: "I go to the chess club after school on Tuesdays.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "A sports team or organisation whose members play or compete together.",
      example: "The football club trains at the ground twice a week.",
      rank: 1,
    },
    {
      partOfSpeech: "noun",
      definition: "A heavy stick used for hitting.",
      example: "The old picture showed a wooden club beside the shield.",
      rank: 2,
    },
    {
      partOfSpeech: "noun",
      definition: "One of the four suits in playing cards, shown by a black three-leaf shape.",
      example: "She picked up the queen of clubs from the cards.",
      rank: 3,
    },
  ],
  pitch: [
    {
      partOfSpeech: "noun",
      definition: "An area of ground marked out for playing a sport such as football or cricket.",
      example: "The players ran onto the football pitch before the match.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "How high or low a sound seems.",
      example: "The singer changed the pitch of the note from low to high.",
      rank: 1,
    },
    {
      partOfSpeech: "noun",
      definition: "A short talk or presentation meant to persuade someone about an idea.",
      example: "The group gave a short pitch for their project idea.",
      rank: 2,
    },
    {
      partOfSpeech: "verb",
      definition: "To throw something through the air.",
      example: "He pitched the ball gently towards his friend.",
      rank: 0,
    },
    {
      partOfSpeech: "verb",
      definition: "To put up and prepare a tent for use.",
      example: "We pitched the tent on a flat patch of grass.",
      rank: 1,
    },
  ],
  board: [
    {
      partOfSpeech: "noun",
      definition: "A flat surface used for writing, drawing or displaying information.",
      example: "The teacher wrote the answer on the board.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "A long, flat piece of wood or another stiff material.",
      example: "We laid a wooden board across the gap.",
      rank: 1,
    },
    {
      partOfSpeech: "noun",
      definition: "A group of people who meet to make decisions for an organisation.",
      example: "The board met to decide the charity's plans for the year.",
      rank: 2,
    },
    {
      partOfSpeech: "verb",
      definition: "To get onto a bus, train, ship or aircraft for a journey.",
      example: "We waited for our turn to board the train.",
      rank: 0,
    },
  ],
  volume: [
    {
      partOfSpeech: "noun",
      definition: "How loud or quiet a sound is.",
      example: "Turn the volume down because the music is too loud.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "The amount of three-dimensional space that something takes up.",
      example: "We calculated the volume of the box in cubic centimetres.",
      rank: 1,
    },
    {
      partOfSpeech: "noun",
      definition: "One book in a set or series of books.",
      example: "The second volume of the history series is about the Romans.",
      rank: 2,
    },
  ],
  sentence: [
    {
      partOfSpeech: "noun",
      definition: "A group of words that expresses a complete idea, usually beginning with a capital letter and ending with punctuation.",
      example: "Write one sentence that uses the word because.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "A punishment decided by a court for someone who has broken the law.",
      example: "The judge explained the sentence the court had decided.",
      rank: 1,
    },
    {
      partOfSpeech: "verb",
      definition: "For a court or judge to decide what punishment someone will receive.",
      example: "The judge will sentence the person after hearing the case.",
      rank: 0,
    },
  ],
  subject: [
    {
      partOfSpeech: "noun",
      definition: "An area of learning studied at school, such as maths, science or history.",
      example: "Maths is my favourite subject at school.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "The topic or thing that someone is talking, writing or learning about.",
      example: "The subject of the book is life in the ocean.",
      rank: 1,
    },
    {
      partOfSpeech: "noun",
      definition: "In grammar, the person or thing that does or is something in a sentence.",
      example: "In ‘The dog ran’, the dog is the subject of the sentence.",
      rank: 2,
    },
    {
      partOfSpeech: "adjective",
      definition: "Likely or able to be changed, affected or controlled by something else.",
      example: "The trip is subject to change if the weather becomes unsafe.",
      rank: 0,
    },
    {
      partOfSpeech: "verb",
      definition: "To make someone or something experience or go through something.",
      example: "The test should not subject the material to more heat than it can safely take.",
      rank: 0,
    },
  ],
  object: [
    {
      partOfSpeech: "noun",
      definition: "A thing that you can see or touch.",
      example: "Choose one object from the table and describe its shape.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "In grammar, the person or thing that receives the action of a verb.",
      example: "In ‘Mia kicked the ball’, the ball is the object.",
      rank: 1,
    },
    {
      partOfSpeech: "noun",
      definition: "The purpose, aim or thing someone is trying to achieve.",
      example: "The object of the game is to reach the finish first.",
      rank: 2,
    },
    {
      partOfSpeech: "verb",
      definition: "To say that you disagree with or oppose something.",
      example: "I object to changing the rules halfway through the game.",
      rank: 0,
    },
  ],
  scale: [
    {
      partOfSpeech: "noun",
      definition: "On a map or drawing, the relationship between a measured distance and the real distance it represents.",
      example: "Use the map scale to work out how far apart the towns are.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "A set of numbers or levels used for measuring or comparing something.",
      example: "Rate the pain on a scale from zero to ten.",
      rank: 1,
    },
    {
      partOfSpeech: "noun",
      definition: "A small, thin plate that covers part of the skin of a fish or reptile.",
      example: "Each silver scale on the fish reflected the light.",
      rank: 2,
    },
    {
      partOfSpeech: "verb",
      definition: "To climb up something steep or high.",
      example: "The climbers began to scale the rock face carefully.",
      rank: 0,
    },
    {
      partOfSpeech: "verb",
      definition: "To change the size of something while keeping its proportions.",
      example: "Scale the drawing up so it fills the page without changing its shape.",
      rank: 1,
    },
  ],
  pupil: [
    {
      partOfSpeech: "noun",
      definition: "A child or young person who is learning at a school.",
      example: "The pupil finished her maths work before lunch.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "The dark opening in the centre of the eye that lets light in.",
      example: "The doctor shone a light and looked at the pupil of my eye.",
      rank: 1,
    },
  ],
  cell: [
    {
      partOfSpeech: "noun",
      definition: "The smallest basic unit that makes up living things such as plants and animals.",
      example: "A cell is a tiny living unit that makes up plants and animals.",
      rank: 0,
    },
    {
      partOfSpeech: "noun",
      definition: "A small room, especially one used to hold a prisoner.",
      example: "The old prison cell had a narrow bed and a heavy door.",
      rank: 1,
    },
    {
      partOfSpeech: "noun",
      definition: "A single unit in a battery that produces electrical energy.",
      example: "The torch uses two cells to provide electrical energy.",
      rank: 2,
    },
  ],
};

export function reviewedCommonCandidates(
  wordInput: string,
  relation: LexicalRelation,
): LexicalCandidate[] {
  const word = normaliseWord(wordInput);
  return (REVIEWED_COMMON_SENSES[word] ?? []).map((sense) => ({
    definition: sense.definition,
    example: sense.example,
    partOfSpeech: sense.partOfSpeech,
    source: "buddy-curated",
    lookupWord: word,
    relation,
    rank: sense.rank,
  }));
}
