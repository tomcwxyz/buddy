export type CurriculumSense = {
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
};

export type CurriculumEntry = {
  headword?: string;
  senses: CurriculumSense[];
};

export const CURRICULUM_CORPUS_VERSION = "curriculum.1";

// A reviewed school-age semantic tier for words whose broad dictionary senses
// are technically valid but regularly miss the meaning a pupil is reading in
// maths, science or ordinary classroom text. Ambiguous words keep their common
// competing senses here too, so curriculum support does not simply force one
// school meaning in every sentence.
export const CURRICULUM_ENTRIES: Record<string, CurriculumEntry> = {
  term: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "One of the parts of a school year when pupils attend lessons.",
        example: "The autumn term starts in September.",
      },
      {
        partOfSpeech: "noun",
        definition: "A word or phrase used for a particular idea or subject.",
        example: "Radius is a maths term for the distance from the centre of a circle to its edge.",
      },
    ],
  },
  class: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "A group of pupils who are taught together.",
        example: "Our class is learning about the Romans.",
      },
      {
        partOfSpeech: "noun",
        definition: "A group or category of things that share important features.",
        example: "Mammals are a class of animals with some shared features.",
      },
    ],
  },
  table: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "Information arranged in rows and columns so it is easy to compare.",
        example: "Put the results into a table with three columns.",
      },
      {
        partOfSpeech: "noun",
        definition: "A piece of furniture with a flat top supported by legs or a base.",
        example: "We put the books on the table.",
      },
    ],
  },
  field: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "An area or subject of study, work or knowledge.",
        example: "Astronomy is a field of science that studies space.",
      },
      {
        partOfSpeech: "noun",
        definition: "An area of open land, often used for farming or animals.",
        example: "The sheep were grazing in the field.",
      },
    ],
  },
  force: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "A push or pull that can change how an object moves.",
        example: "Gravity is a force that pulls objects towards Earth.",
      },
      {
        partOfSpeech: "noun",
        definition: "Strong power, pressure or influence used to make something happen.",
        example: "The wind hit the tent with enough force to bend a pole.",
      },
      {
        partOfSpeech: "verb",
        definition: "To make someone or something do something even when it would not happen naturally.",
        example: "Do not force the lid if it will not close easily.",
      },
    ],
  },
  mass: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "The amount of matter in an object, usually measured in grams or kilograms.",
        example: "We measured the mass of the rock in grams.",
      },
      {
        partOfSpeech: "noun",
        definition: "A large amount or group of something gathered together.",
        example: "A mass of dark clouds covered the hill.",
      },
    ],
  },
  matter: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "The physical material that things are made from; solids, liquids and gases are forms of matter.",
        example: "Solids, liquids and gases are forms of matter.",
      },
      {
        partOfSpeech: "verb",
        definition: "To be important or make a difference.",
        example: "It does not matter which colour pencil you use.",
      },
      {
        partOfSpeech: "noun",
        definition: "A subject, problem or situation that is being discussed or dealt with.",
        example: "We talked about the matter after lunch.",
      },
    ],
  },
  square: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "A flat shape with four equal sides and four right angles.",
        example: "A square has four equal sides and four right angles.",
      },
      {
        partOfSpeech: "adjective",
        definition: "Shaped like a square, with four equal sides and four right angles.",
        example: "The picture was printed on a square card.",
      },
      {
        partOfSpeech: "verb",
        definition: "In maths, to multiply a number by itself.",
        example: "To square 5, multiply 5 by 5.",
      },
    ],
  },
  product: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "In maths, the answer you get when two or more numbers are multiplied.",
        example: "The product of 6 and 4 is 24.",
      },
      {
        partOfSpeech: "noun",
        definition: "Something that is made, grown or sold.",
        example: "The shop sells a new product made from recycled plastic.",
      },
    ],
  },
  fraction: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "In maths, a number that shows part of a whole, such as one half or three quarters.",
        example: "One half is a fraction of a whole.",
      },
      {
        partOfSpeech: "noun",
        definition: "A small part or amount of something.",
        example: "Only a fraction of the snow remained by lunchtime.",
      },
    ],
  },
  decimal: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "A number written using a decimal point, such as 0.5 or 3.25.",
        example: "Write one half as the decimal 0.5.",
      },
      {
        partOfSpeech: "adjective",
        definition: "Using a number system based on groups of ten.",
        example: "Our usual decimal number system has ten digits from 0 to 9.",
      },
    ],
  },
  equation: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "A maths statement showing that two amounts or expressions are equal.",
        example: "Solve the equation 3 + x = 8.",
      },
    ],
  },
  perimeter: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "The total distance around the outside edge of a shape.",
        example: "Find the perimeter by adding the lengths of all four sides.",
      },
      {
        partOfSpeech: "noun",
        definition: "The outer boundary or edge around an area.",
        example: "A fence runs around the perimeter of the playground.",
      },
    ],
  },
  habitat: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "The natural home or environment where a plant or animal lives.",
        example: "A pond is a habitat for frogs, insects and plants.",
      },
    ],
  },
  evaporation: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "The change that happens when a liquid turns into a gas or vapour.",
        example: "Evaporation changes liquid water into water vapour.",
      },
    ],
  },
  gravity: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "The force that pulls objects with mass towards each other, such as objects towards Earth.",
        example: "Gravity pulls objects towards Earth.",
      },
      {
        partOfSpeech: "noun",
        definition: "The seriousness or importance of a situation.",
        example: "They understood the gravity of the warning.",
      },
    ],
  },
  climate: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "The usual pattern of weather in a place over a long period of time.",
        example: "The desert has a hot, dry climate.",
      },
    ],
  },
  continent: {
    senses: [
      {
        partOfSpeech: "noun",
        definition: "One of Earth's very large areas of land, such as Africa or Europe.",
        example: "Africa is a continent made up of many countries.",
      },
    ],
  },
};
