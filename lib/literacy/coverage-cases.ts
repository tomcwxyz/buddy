export type WordCoverageCategory =
  | "everyday"
  | "school"
  | "function"
  | "morphology"
  | "pronunciation";

export type WordCoverageAssertions = {
  recognised?: boolean;
  partOfSpeech?: string;
  lemma?: string;
  form?: string;
  meaningIncludesAny?: string[];
  meaningExcludes?: string[];
  pronunciationAvailable?: boolean;
};

export type WordCoverageCase = {
  id: string;
  category: WordCoverageCategory;
  word: string;
  context: string;
  expectation: string;
  assertions: WordCoverageAssertions;
};

function coverageCase(
  id: string,
  category: WordCoverageCategory,
  word: string,
  context: string,
  expectation: string,
  assertions: WordCoverageAssertions,
): WordCoverageCase {
  return { id, category, word, context, expectation, assertions };
}

// This pack is deliberately broader than the regression set. Its job is to
// reveal coverage gaps across ordinary reading, school vocabulary, function
// words, common morphology and difficult British-English pronunciation. A
// failing case is evidence for the next reviewed lexical improvement; it is not
// a reason to add a sentence-specific rule.
export const WORD_COVERAGE_CASES: WordCoverageCase[] = [
  coverageCase("right-direction", "everyday", "right", "Turn right at the end of the road.", "The direction opposite left.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["direction", "opposite", "left"],
  }),
  coverageCase("right-correct", "everyday", "right", "Your answer is right, so move on to the next question.", "Correct or true.", {
    recognised: true, partOfSpeech: "adjective", meaningIncludesAny: ["correct", "true"],
  }),
  coverageCase("mean-average", "everyday", "mean", "The mean of 4, 6 and 8 is 6.", "The mathematical average.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["average", "sum"],
  }),
  coverageCase("mean-intend", "everyday", "mean", "I did not mean to knock over your drink.", "To intend something.", {
    recognised: true, partOfSpeech: "verb", meaningIncludesAny: ["intend", "purpose"],
  }),
  coverageCase("kind-type", "everyday", "kind", "What kind of animal is a dolphin?", "A type or sort.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["type", "sort"],
  }),
  coverageCase("kind-caring", "everyday", "kind", "It was kind of Sam to help the new pupil.", "Caring, helpful or considerate.", {
    recognised: true, partOfSpeech: "adjective", meaningIncludesAny: ["caring", "helpful", "considerate", "friendly"],
  }),
  coverageCase("point-tip", "everyday", "point", "The pencil has a sharp point.", "A sharp or narrow end.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["sharp", "end", "tip"],
  }),
  coverageCase("point-score", "everyday", "point", "Our team scored one point before half time.", "A unit used in scoring.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["score", "scoring", "unit"],
  }),
  coverageCase("change-coins", "everyday", "change", "The shopkeeper gave me change from five pounds.", "Money returned after paying more than the price.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["money", "returned", "pay"],
  }),
  coverageCase("change-verb", "everyday", "change", "The weather can change very quickly on the hill.", "To become different.", {
    recognised: true, partOfSpeech: "verb", meaningIncludesAny: ["different", "become", "alter"],
  }),
  coverageCase("present-gift", "everyday", "present", "She opened her birthday present after breakfast.", "A gift.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["gift"],
  }),
  coverageCase("close-shut", "everyday", "close", "Please close the door quietly.", "To shut something.", {
    recognised: true, partOfSpeech: "verb", meaningIncludesAny: ["shut"], pronunciationAvailable: true,
  }),

  coverageCase("term-school", "school", "term", "The autumn term starts in September.", "One of the periods that make up a school year.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["school", "period", "year"],
  }),
  coverageCase("class-group", "school", "class", "Our class is learning about the Romans.", "A group of pupils taught together.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["group", "pupil", "student"],
  }),
  coverageCase("table-data", "school", "table", "Put the results into a table with three columns.", "Information arranged in rows and columns.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["row", "column", "information", "data"],
  }),
  coverageCase("field-study", "school", "field", "Astronomy is a field of science that studies space.", "An area or subject of study.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["study", "subject", "area"],
  }),
  coverageCase("force-science", "school", "force", "Gravity is a force that pulls objects towards Earth.", "A push or pull that can change movement.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["push", "pull", "movement"],
  }),
  coverageCase("mass-science", "school", "mass", "We measured the mass of the rock in grams.", "The amount of matter in an object.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["matter", "object", "amount"],
  }),
  coverageCase("matter-science", "school", "matter", "Solids, liquids and gases are forms of matter.", "Physical material that things are made from.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["material", "physical", "made"],
  }),
  coverageCase("square-shape", "school", "square", "A square has four equal sides and four right angles.", "A four-sided shape with equal sides and right angles.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["four", "side", "angle"],
  }),
  coverageCase("product-maths", "school", "product", "The product of 6 and 4 is 24.", "The answer when numbers are multiplied.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["answer", "multipl"],
  }),
  coverageCase("factor-maths", "school", "factor", "Three is a factor of twelve because twelve divides exactly by three.", "A number that divides another number exactly.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["number", "divide"],
  }),
  coverageCase("fraction", "school", "fraction", "One half is a fraction of a whole.", "A number that shows part of a whole.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["part", "whole", "number"],
  }),
  coverageCase("decimal", "school", "decimal", "Write one half as the decimal 0.5.", "A number written using a decimal point.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["number", "point"],
  }),
  coverageCase("equation", "school", "equation", "Solve the equation 3 + x = 8.", "A mathematical statement showing two expressions are equal.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["equal", "mathematical", "statement"],
  }),
  coverageCase("perimeter", "school", "perimeter", "Find the perimeter by adding the lengths of all four sides.", "The distance around the outside of a shape.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["distance", "outside", "shape"],
  }),
  coverageCase("habitat", "school", "habitat", "A pond is a habitat for frogs, insects and plants.", "The natural home of a plant or animal.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["home", "animal", "plant"],
  }),
  coverageCase("evaporation", "school", "evaporation", "Evaporation changes liquid water into water vapour.", "The change from a liquid into a gas or vapour.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["liquid", "gas", "vapour"],
  }),
  coverageCase("gravity", "school", "gravity", "Gravity pulls objects towards Earth.", "The force that pulls objects towards each other.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["force", "pull"],
  }),
  coverageCase("climate", "school", "climate", "The desert has a hot, dry climate.", "The usual weather conditions of a place over a long time.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["weather", "place"],
  }),
  coverageCase("continent", "school", "continent", "Africa is a continent made up of many countries.", "One of Earth's very large areas of land.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["land", "earth", "large"],
  }),

  coverageCase("although", "function", "although", "Although it was raining, we still went for a walk.", "Introduces something that contrasts with another idea.", {
    recognised: true, meaningIncludesAny: ["although", "despite", "contrast", "even"],
  }),
  coverageCase("however", "function", "however", "The first route was shorter; however, the second was safer.", "Shows a contrast with what was just said.", {
    recognised: true, meaningIncludesAny: ["contrast", "but", "however"],
  }),
  coverageCase("therefore", "function", "therefore", "The path was flooded, therefore we took another route.", "Shows a result or conclusion.", {
    recognised: true, meaningIncludesAny: ["result", "conclusion", "so"],
  }),
  coverageCase("unless", "function", "unless", "You cannot enter unless you have a ticket.", "Means except if something happens.", {
    recognised: true, meaningIncludesAny: ["except", "if"],
  }),
  coverageCase("between", "function", "between", "The ball rolled between the two chairs.", "In the space separating two things.", {
    recognised: true, meaningIncludesAny: ["space", "two", "separat"],
  }),
  coverageCase("during", "function", "during", "We stayed indoors during the storm.", "At some time within an event or period.", {
    recognised: true, meaningIncludesAny: ["time", "period", "event"],
  }),
  coverageCase("without", "function", "without", "She finished the puzzle without any help.", "Not having or using something.", {
    recognised: true, meaningIncludesAny: ["not", "having", "using"],
  }),
  coverageCase("towards", "function", "towards", "The dog ran towards the gate.", "In the direction of something.", {
    recognised: true, meaningIncludesAny: ["direction"],
  }),

  coverageCase("boxes-plural", "morphology", "boxes", "The boxes were stacked beside the door.", "Plural of box.", {
    recognised: true, partOfSpeech: "noun", lemma: "box", form: "plural", meaningIncludesAny: ["box", "container"],
  }),
  coverageCase("studies-plural", "morphology", "studies", "The report compares several studies of animal behaviour.", "Plural of study.", {
    recognised: true, partOfSpeech: "noun", lemma: "study", form: "plural", meaningIncludesAny: ["study", "research"],
  }),
  coverageCase("carried-past", "morphology", "carried", "He carried the books back to the library.", "Past tense of carry.", {
    recognised: true, partOfSpeech: "verb", lemma: "carry", meaningIncludesAny: ["move", "hold", "support"],
  }),
  coverageCase("stopped-past", "morphology", "stopped", "The bus stopped beside the school.", "Past tense of stop.", {
    recognised: true, partOfSpeech: "verb", lemma: "stop", meaningIncludesAny: ["stop", "cease", "halt"],
  }),
  coverageCase("making-participle", "morphology", "making", "She is making a model from cardboard.", "Present participle of make.", {
    recognised: true, partOfSpeech: "verb", lemma: "make", meaningIncludesAny: ["make", "create", "build"],
  }),
  coverageCase("writing-participle", "morphology", "writing", "He is writing a story about a dragon.", "Present participle of write.", {
    recognised: true, partOfSpeech: "verb", lemma: "write", meaningIncludesAny: ["write", "text", "words"],
  }),
  coverageCase("tries-present", "morphology", "tries", "She tries a different method when the first one fails.", "Present form of try.", {
    recognised: true, partOfSpeech: "verb", lemma: "try", form: "present form", meaningIncludesAny: ["try", "attempt"],
  }),
  coverageCase("children-plural", "morphology", "children", "The children played in the park after school.", "Irregular plural of child.", {
    recognised: true, partOfSpeech: "noun", lemma: "child", form: "plural", meaningIncludesAny: ["child", "young"],
  }),

  coverageCase("queue", "pronunciation", "queue", "We waited in a queue for the bus.", "A line of people waiting.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["line", "wait"], pronunciationAvailable: true,
  }),
  coverageCase("island", "pronunciation", "island", "The boat sailed around the small island.", "Land surrounded by water.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["land", "water"], pronunciationAvailable: true,
  }),
  coverageCase("business", "pronunciation", "business", "Her family runs a small bakery business.", "An organisation or activity that sells goods or services.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["goods", "services", "company", "organisation"], pronunciationAvailable: true,
  }),
  coverageCase("wednesday", "pronunciation", "Wednesday", "The club meets every Wednesday after school.", "The day after Tuesday and before Thursday.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["day", "tuesday", "thursday"], pronunciationAvailable: true,
  }),
  coverageCase("muscle", "pronunciation", "muscle", "The muscle in his arm helped him lift the bag.", "Body tissue that tightens to make movement.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["body", "move", "tissue"], pronunciationAvailable: true,
  }),
  coverageCase("debt", "pronunciation", "debt", "He paid back the debt he owed.", "Money that is owed.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["money", "owed", "owe"], pronunciationAvailable: true,
  }),
  coverageCase("receipt", "pronunciation", "receipt", "Keep the receipt after you pay for the shoes.", "A written record showing that something was paid for.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["paid", "record", "payment"], pronunciationAvailable: true,
  }),
  coverageCase("rhythm", "pronunciation", "rhythm", "Clap the rhythm of the song.", "A repeated pattern of beats or sounds.", {
    recognised: true, partOfSpeech: "noun", meaningIncludesAny: ["beat", "pattern", "sound"], pronunciationAvailable: true,
  }),
];
