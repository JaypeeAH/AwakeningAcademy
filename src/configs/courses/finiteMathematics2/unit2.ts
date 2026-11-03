import type { CourseSeedModule } from '@/@types/courses/CourseSeed'
import type { SampleQuestion } from '@/@types/courses/SampleCourse'

const OBJ = {
    sampleSpace: 'List the sample space and the events of a random experiment',
    probListing: 'Find the probability of an event by listing outcomes',
    probCounting: 'Find the probability of an event using counting techniques',
    mutex: 'Decide whether two or more events are mutually exclusive',
    complement: 'Find the probability of the complement of an event',
    union: 'Find the probability of the union of two events',
    independent: 'Decide whether two events are independent',
    both: 'Find the probability that two events both occur',
    simpleVsConditional: 'Tell simple probability apart from conditional probability',
    conditional: 'Calculate conditional probabilities from tables, formulas and draws',
    bayesExplain: 'Explain Bayes’ Rule and how it reverses a conditional probability',
    bayesApply: 'Apply Bayes’ Rule to find the probability of a cause given a result',
}

/** True/false options with the right one marked */
const tf = (answer: boolean): SampleQuestion['options'] => [
    { label: 'True', correct: answer },
    { label: 'False', correct: !answer },
]

/** Choice options in the order given, with the option at `correct` (0-based) marked */
const pick = (labels: string[], correct: number): SampleQuestion['options'] =>
    labels.map((label, i) => (i === correct ? { label, correct: true } : { label }))

// ── 2.1 Probability of an event ──────────────────────────────────────────────────────────────────

const probabilityOfAnEvent = [
    '## Random experiments, outcomes and sample spaces',
    'A **random experiment** is a process whose result cannot be predicted with certainty — tossing a coin, rolling a die, or drawing a name from a box of folded papers. Each possible result is an **outcome**.',
    '- The **sample space** S is the set of *all* possible outcomes. We write n(S) for the number of outcomes in it.\n- An **event** E is a subset of the sample space: the outcomes we are interested in. n(E) is the number of outcomes in E.',
    [
        '| Random experiment | Sample space S | n(S) |',
        '| --- | --- | --- |',
        '| Toss a fair coin once | {H, T} | 2 |',
        '| Roll a fair die | {1, 2, 3, 4, 5, 6} | 6 |',
        '| Toss a fair coin twice | {HH, HT, TH, TT} | 4 |',
        '| Pick a letter of MATH from a closed box | {M, A, T, H} | 4 |',
        '| Toss a coin and roll a die | {H1, H2, …, H6, T1, T2, …, T6} | 12 |',
    ].join('\n'),
    '> [!WARNING]\n> Tossing two coins has **four** outcomes, not three. HT (head first) and TH (tail first) are different outcomes. Listing them in order keeps you from missing one.',
    '## The probability of an event',
    'When every outcome is **equally likely**, the probability of an event is the number of favorable outcomes divided by the number of possible outcomes:',
    '**P(E) = n(E) ÷ n(S)**',
    '- Probabilities are always between 0 and 1: **0 ≤ P(E) ≤ 1**.\n- P(E) = 0 means E cannot happen (it has no favorable outcomes).\n- P(E) = 1 means E is certain (every outcome is favorable).',
    '> [!NOTE]\n> **Example 1 — Rolling a fair die.** S = {1, 2, 3, 4, 5, 6}, so n(S) = 6.\n>\n> Event “an even number”: E = {2, 4, 6}, so n(E) = 3.\n>\n> P(even) = 3/6 = **1/2**.',
    '> [!NOTE]\n> **Example 2 — A letter from MATH.** S = {M, A, T, H} and the only vowel is A.\n>\n> P(vowel) = **1/4**.',
    '> [!NOTE]\n> **Example 3 — Two coins.** S = {HH, HT, TH, TT}. Event “exactly one head” = {HT, TH}.\n>\n> P(exactly one head) = 2/4 = **1/2**.',
    '## Using counting techniques',
    'Listing works for small experiments. When the sample space is large, count it instead with the multiplication principle, permutations or combinations from Unit 1.',
    '> [!NOTE]\n> **Example 4 — A coin and a die.** By the multiplication principle, n(S) = 2 × 6 = 12.\n>\n> Event “a head and an even number”: H2, H4, H6, so n(E) = 3.\n>\n> P = 3/12 = **1/4**.',
    '> [!NOTE]\n> **Example 5 — Choosing a committee.** A committee of 2 is chosen at random from 6 learners, 4 of whom are girls. What is the probability that both members are girls?\n>\n> n(S) = C(6, 2) = 15 possible committees.\n>\n> n(E) = C(4, 2) = 6 committees of two girls.\n>\n> P(both girls) = 6/15 = **2/5**.',
    '> [!TIP]\n> A standard deck has 52 cards: 4 suits (hearts, diamonds, clubs, spades) of 13 ranks each. The **face cards** are the Jack, Queen and King of each suit — 12 in all.',
    '## Check yourself',
    '- Roll a fair die. What is P(rolling a multiple of 3)? *(2/6 = 1/3)*\n- Roll a fair die. What is P(a number greater than 4)? *(2/6 = 1/3)*\n- Roll two fair dice. What is P(both numbers are the same)? *(6/36 = 1/6)*\n- Why can a probability never be 1.2?',
].join('\n\n')

// ── 2.2 Addition of probabilities ────────────────────────────────────────────────────────────────

const additionOfProbabilities = [
    '## Mutually exclusive events',
    'Two events are **mutually exclusive** when they cannot happen at the same time — they have **no outcomes in common**, so A ∩ B is empty.',
    '- Rolling a 3 and rolling a 6 on one roll of a die: mutually exclusive.\n- Drawing a heart and drawing a king from a deck: **not** mutually exclusive, because the king of hearts belongs to both events.',
    '## The addition rule',
    'The addition rule gives the probability that **at least one** of two events happens (A ∪ B, read “A or B”).',
    '**If A and B are mutually exclusive:** P(A ∪ B) = P(A) + P(B)',
    '**If A and B are not mutually exclusive:** P(A ∪ B) = P(A) + P(B) − P(A ∩ B)',
    'The second rule always works: for mutually exclusive events P(A ∩ B) = 0, so it becomes the first.',
    '> [!NOTE]\n> **Example 1 — Rolling a die.** A = an even number = {2, 4, 6}; B = a number greater than 4 = {5, 6}. The overlap is {6}.\n>\n> P(A ∪ B) = 3/6 + 2/6 − 1/6 = 4/6 = **2/3**.\n>\n> Check by listing: A ∪ B = {2, 4, 5, 6}, and 4/6 = 2/3.',
    '> [!NOTE]\n> **Example 2 — A heart or a king.** P(heart) = 13/52, P(king) = 4/52, P(king of hearts) = 1/52.\n>\n> P(heart ∪ king) = 13/52 + 4/52 − 1/52 = 16/52 = **4/13**.',
    '> [!WARNING]\n> Adding without subtracting the overlap counts the shared outcomes **twice**. Before adding, always ask: “Can both happen at once?”',
    '## The complement of an event',
    'The **complement** of A, written A′, is every outcome that is **not** in A. Since A and A′ together make up the whole sample space and never overlap:',
    '**P(A′) = 1 − P(A)**',
    '> [!NOTE]\n> **Example 3 — At least one head.** Toss a coin 3 times. The only outcome with no head is TTT, so P(no head) = 1/8.\n>\n> P(at least one head) = 1 − 1/8 = **7/8** — much faster than listing the 7 favorable outcomes.',
    '> [!TIP]\n> When a question says “at least one”, try the complement first.',
    '## Reading a survey with overlap',
    'A class of 40 students was surveyed: 18 like Mathematics, 15 like English, and 7 like both.',
    [
        '| Group | Students |',
        '| --- | --- |',
        '| Mathematics only | 18 − 7 = 11 |',
        '| Both subjects | 7 |',
        '| English only | 15 − 7 = 8 |',
        '| Neither | 40 − 26 = 14 |',
        '| Total | 40 |',
    ].join('\n'),
    'P(likes Mathematics or English) = 18/40 + 15/40 − 7/40 = 26/40 = **13/20**. Adding 18 + 15 alone would count the 7 students who like both twice.',
    '## Check yourself',
    [
        '| Situation | Mutually exclusive? | P(A or B) |',
        '| --- | --- | --- |',
        '| Die: 3 or 6 | Yes | 2/6 = 1/3 |',
        '| Die: even or less than 4 | No (2 is in both) | 3/6 + 3/6 − 1/6 = 5/6 |',
        '| Card: heart or spade | Yes | 13/52 + 13/52 = 1/2 |',
        '| Card: heart or face card | No (3 heart face cards) | 13/52 + 12/52 − 3/52 = 11/26 |',
        '| Ball numbered 1 to 6: prime or even | No (2 is in both) | 3/6 + 3/6 − 1/6 = 5/6 |',
    ].join('\n'),
].join('\n\n')

// ── 2.3 Independent events ───────────────────────────────────────────────────────────────────────

const independentEvents = [
    '## When one event doesn’t affect another',
    'Two events A and B are **independent** if the occurrence of one does **not** change the probability of the other. Independence usually comes from experiments that are separate, repeated, or done **with replacement**.',
    '**A and B are independent exactly when P(A ∩ B) = P(A) · P(B).**',
    'If the events are **dependent**, the second probability must be adjusted for what already happened:',
    '**P(A ∩ B) = P(A) · P(B | A)**, where P(B | A) is the probability of B once A has happened.',
    '> [!NOTE]\n> **Example 1 — A coin and a die.** A fair coin is tossed and a fair die is rolled. A = heads, B = rolling a 4. The coin can’t influence the die, so the events are independent.\n>\n> P(A ∩ B) = 1/2 × 1/6 = **1/12**.',
    '## With and without replacement',
    'A box holds 3 red and 2 blue balls. Two balls are drawn. What is the chance both are red?',
    [
        '| How the balls are drawn | 1st draw red | 2nd draw red | Both red |',
        '| --- | --- | --- | --- |',
        '| With replacement (independent) | 3/5 | 3/5 | 9/25 |',
        '| Without replacement (dependent) | 3/5 | 2/4 | 3/10 |',
    ].join('\n'),
    'With replacement, the box is the same for the second draw, so its chance holds. Without replacement, one red ball is gone: 2 red balls remain among 4, so the second chance changes.',
    '> [!NOTE]\n> **Example 2 — Two hearts without replacement.** Two cards are drawn from a deck without replacement.\n>\n> P(heart, then heart) = 13/52 × 12/51 = 156/2652 = **1/17**.\n>\n> With replacement it would be 13/52 × 13/52 = **1/16**.',
    '## Testing for independence',
    'To check two events, compute P(A ∩ B) directly and compare it with P(A) · P(B).',
    '> [!NOTE]\n> **Example 3 — A king and a heart.** One card is drawn. A = a king, B = a heart.\n>\n> P(A ∩ B) = P(king of hearts) = 1/52.\n>\n> P(A) · P(B) = 4/52 × 13/52 = 1/13 × 1/4 = 1/52.\n>\n> They are equal, so “king” and “heart” are **independent**: knowing the card is a heart doesn’t change the chance it is a king.',
    '> [!WARNING]\n> Independent is **not** the same as mutually exclusive. Mutually exclusive events can’t happen together (P(A ∩ B) = 0). Independent events can happen together — one just doesn’t affect the other.',
    '## Check yourself',
    '- Coin tossed twice: P(head on both)? *(1/2 × 1/2 = 1/4)*\n- Die rolled twice: P(a 2, then a 5)? *(1/6 × 1/6 = 1/36)*\n- Marbles with replacement (5 red, 3 blue): P(red, then red)? *(5/8 × 5/8 = 25/64)*\n- Why does drawing without replacement make the events dependent?',
].join('\n\n')

// ── 2.4 Conditional probability ──────────────────────────────────────────────────────────────────

const conditionalProbability = [
    '## Probability with extra information',
    'A **simple probability** looks at the whole sample space. A **conditional probability** is the probability that event B happens **given** that event A has already happened. It is written P(B | A) and read “the probability of B given A”.',
    '**P(B | A) = P(A ∩ B) ÷ P(A)**, provided that P(A) > 0',
    'Once the condition is known, the sample space **shrinks** to the outcomes in A. With equally likely outcomes this is simply:',
    '**P(B | A) = n(A ∩ B) ÷ n(A)**',
    '> [!NOTE]\n> **Example 1 — A card given a condition.** A card is drawn from a well-shuffled deck. A = the card is a face card; B = the card is a king.\n>\n> Given that the card is a face card, only the 12 face cards remain possible, and 4 of them are kings.\n>\n> P(king | face card) = 4/12 = **1/3**, while the simple probability P(king) = 4/52 = 1/13.',
    '## Reading a two-way table',
    'A survey of 200 students recorded club membership and sports participation.',
    [
        '| Student | Sports | No sport | Total |',
        '| --- | --- | --- | --- |',
        '| In a club | 50 | 30 | 80 |',
        '| Not in a club | 70 | 50 | 120 |',
        '| Total | 120 | 80 | 200 |',
    ].join('\n'),
    '- **Simple:** P(plays sports) = 120/200 = **3/5**.\n- **Given a club member:** the denominator is the 80 club members. P(sports | club) = 50/80 = **5/8**.\n- **Given a sports player:** the denominator is the 120 who play sports. P(club | sports) = 50/120 = **5/12**.',
    '> [!WARNING]\n> P(B | A) and P(A | B) are usually **different**. The numerator (50) is the same, but the condition decides the denominator. Always circle the group you are told about first.',
    '## Drawing without replacement',
    '> [!NOTE]\n> **Example 2.** A box contains 5 red and 3 blue balls. Two are drawn one after the other without replacement. Given that the first ball is red, what is the probability the second is blue?\n>\n> After a red ball is removed, 7 balls remain: 4 red and 3 blue.\n>\n> P(2nd blue | 1st red) = **3/7**.',
    '> [!NOTE]\n> **Example 3.** A feeding-program tray has 9 pandesal and 6 rice cakes. Two items are taken without replacement. Given that the first is pandesal, 8 pandesal remain among 14 items.\n>\n> P(2nd pandesal | 1st pandesal) = 8/14 = **4/7**.',
    '## Conditional probability and independence',
    'If A and B are independent, the condition changes nothing: **P(A | B) = P(A)**. Comparing a conditional probability with the simple one is a quick test for independence.',
    '> [!TIP]\n> Four steps: (1) name the condition — the group you’re told about; (2) count that group: the denominator; (3) inside that group, count those that fit the event: the numerator; (4) simplify.',
    '## Check yourself',
    'A barangay surveyed 150 residents about exercise and blood pressure.',
    [
        '| Resident | Normal | High | Total |',
        '| --- | --- | --- | --- |',
        '| Exercises | 40 | 20 | 60 |',
        '| Does not exercise | 30 | 60 | 90 |',
        '| Total | 70 | 80 | 150 |',
    ].join('\n'),
    '- P(normal blood pressure)? *(70/150 = 7/15 ≈ 0.47)*\n- P(normal | exercises)? *(40/60 = 2/3 ≈ 0.67)*\n- What does comparing the two answers suggest about exercise and blood pressure for these residents?',
].join('\n\n')

// ── 2.5 Bayes’ Rule ──────────────────────────────────────────────────────────────────────────────

const bayesRule = [
    '## Reasoning backwards from a result',
    'Often we know how likely a **result** is for each possible **cause** — how often each factory makes a defective phone, or how often a test is positive for sick and healthy people. Bayes’ Rule turns this around: given the result, how likely is each cause?',
    '**P(A | B) = P(B | A) · P(A) ÷ P(B)**, where P(B) > 0',
    'The denominator comes from the **law of total probability**, adding up every way B can happen:',
    '**P(B) = P(B | A) · P(A) + P(B | A′) · P(A′)**',
    '- **Prior** P(A): how likely the cause is before any evidence.\n- **Likelihood** P(B | A): how likely the result is if the cause is true.\n- **Posterior** P(A | B): the updated probability of the cause once the result is known.',
    '## Worked example: two factories',
    'Factory 1 and Factory 2 each supply 50% of a store’s phones. The defect rate is 2% for Factory 1 and 4% for Factory 2. A phone is found to be defective. What is P(Factory 2 | defective)?',
    [
        '| Factory | Prior | Defect rate | Prior × defect rate |',
        '| --- | --- | --- | --- |',
        '| Factory 1 | 0.50 | 0.02 | 0.010 |',
        '| Factory 2 | 0.50 | 0.04 | 0.020 |',
        '| Total = P(defective) | | | 0.030 |',
    ].join('\n'),
    'P(Factory 2 | defective) = 0.020 ÷ 0.030 = **2/3 ≈ 0.67**. Factory 2 makes defects twice as often, so a defective phone is twice as likely to come from it.',
    '> [!TIP]\n> Read each row of the table as one branch of a tree diagram: the first branch is the cause (its prior), the second is the result (its likelihood). Multiply along each branch, add the branches that end in the result, then divide.',
    '## Worked example: a medical test',
    'A rare illness affects 1% of a population. A test detects it 99% of the time, but it is also positive for 5% of healthy people. A person tests positive. What is P(illness | positive)?',
    'Imagine 10,000 people:',
    [
        '| Group | People | Test positive |',
        '| --- | --- | --- |',
        '| Have the illness (1%) | 100 | 99 (99% of 100) |',
        '| Healthy (99%) | 9,900 | 495 (5% of 9,900) |',
        '| Total | 10,000 | 594 |',
    ].join('\n'),
    'P(illness | positive) = 99 ÷ 594 = **1/6 ≈ 0.17**. With the formula: (0.99 × 0.01) ÷ (0.99 × 0.01 + 0.05 × 0.99) = 0.0099 ÷ 0.0594 ≈ 0.17.',
    '> [!WARNING]\n> A test that is “99% accurate” can still give mostly false alarms when the illness is rare: the 5% of the many healthy people outnumber the 99% of the few sick people. Always weigh the **prior** (how common the cause is) together with the test’s accuracy.',
    '## More than two causes',
    'The rule extends to any number of causes: the denominator adds one product for each cause, and the posteriors of all the causes add up to 1.',
    '> [!NOTE]\n> **Example.** Machine 1 makes 80% of the bottles with a 1% defect rate; Machine 2 makes 20% with a 5% defect rate.\n>\n> P(defective) = 0.80 × 0.01 + 0.20 × 0.05 = 0.008 + 0.010 = 0.018.\n>\n> P(Machine 2 | defective) = 0.010 ÷ 0.018 = **5/9 ≈ 0.56** — even though Machine 2 makes only 20% of the bottles.',
    '## Check yourself',
    '- Suppliers A and B each provide 50% of a part; the defect rate is 3% for A and 5% for B. Find P(B | defective). *(0.025 ÷ 0.040 = 5/8)*\n- Across the examples, what made a posterior large or small — the prior or the likelihood?\n- Why must the posteriors of all the causes add up to 1?',
].join('\n\n')

export const unit2: CourseSeedModule = {
    title: 'Unit 2: Probability',
    description:
        'Sample spaces and events, the addition rule, independence, conditional probability and Bayes’ Rule — measuring chance to make better decisions.',
    activities: [
        {
            key: 'u2-l1',
            kind: 'lesson',
            title: 'Lesson 2.1: Probability of an event',
            summary: 'Random experiments, sample spaces and events, and P(E) = n(E) ÷ n(S) by listing and by counting.',
            body: probabilityOfAnEvent,
            objectives: [OBJ.sampleSpace, OBJ.probListing, OBJ.probCounting],
            difficulty: 1,
            estimatedMinutes: 15,
        },
        {
            key: 'u2-q1',
            kind: 'quiz',
            title: 'Quiz 2.1: Probability of an event',
            summary: 'Sample spaces, events and probabilities found by listing and by counting.',
            objectives: [OBJ.sampleSpace, OBJ.probListing, OBJ.probCounting],
            difficulty: 1,
            estimatedMinutes: 15,
            requires: ['u2-l1'],
            questions: [
                {
                    kind: 'single_choice',
                    prompt: 'A die is rolled once, with sample space S = {1, 2, 3, 4, 5, 6}. Which subset is the event “an even number”?',
                    objective: OBJ.sampleSpace,
                    options: pick(['{1, 3, 5}', '{2, 4, 6}', '{1, 2, 3, 4, 5, 6}', '{ }'], 1),
                    explanation: 'The even numbers on a die are 2, 4 and 6, so the event is {2, 4, 6}.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A coin is tossed twice. How many outcomes are in the sample space?',
                    objective: OBJ.sampleSpace,
                    options: pick(['2', '3', '4', '8'], 2),
                    explanation: 'S = {HH, HT, TH, TT}: 2 × 2 = 4 outcomes. HT and TH are different outcomes.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A letter is chosen at random from the six letters of the word BANANA. What is P(the letter is A)?',
                    objective: OBJ.probListing,
                    options: pick(['1/2', '1/3', '1/6', '2/3'], 0),
                    explanation: 'BANANA has 6 letters and 3 of them are A, so P(A) = 3/6 = 1/2.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'One card is drawn from a standard deck of 52. What is P(the card is a face card — a Jack, Queen or King)?',
                    objective: OBJ.probListing,
                    options: pick(['1/13', '3/13', '4/13', '1/4'], 1),
                    explanation: 'There are 3 face cards in each of 4 suits: 12 face cards. P = 12/52 = 3/13.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A committee of 2 is to be chosen from 5 people. How many possible committees are there?',
                    objective: OBJ.probCounting,
                    options: pick(['10', '20', '25', '5'], 0),
                    explanation: 'Order doesn’t matter in a committee: C(5, 2) = (5 × 4) ÷ 2 = 10.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'A coin is tossed and a die is rolled. What is P(a head and an even number)? Write it as a fraction in lowest terms.',
                    objective: OBJ.probListing,
                    acceptedAnswers: ['1/4', '3/12', '0.25', '25%'],
                    explanation: 'n(S) = 2 × 6 = 12. The favorable outcomes are H2, H4 and H6, so P = 3/12 = 1/4.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'From 7 books, 3 are chosen at random to be placed on a shelf. What is the probability that 2 particular books are both among the 3 chosen? Write it as a fraction in lowest terms.',
                    objective: OBJ.probCounting,
                    acceptedAnswers: ['1/7', '5/35', '0.14', '0.143'],
                    explanation:
                        'n(S) = C(7, 3) = 35. If both particular books are chosen, the third book is any one of the other 5: n(E) = C(5, 1) = 5. P = 5/35 = 1/7.',
                },
                {
                    kind: 'true_false',
                    prompt: 'A probability value can equal 1.2.',
                    objective: OBJ.probListing,
                    options: tf(false),
                    explanation: 'n(E) can never be more than n(S), so every probability is between 0 and 1 inclusive.',
                },
                {
                    kind: 'true_false',
                    prompt: 'The sample space for tossing two coins has only three outcomes: HH, HT and TT.',
                    objective: OBJ.sampleSpace,
                    options: tf(false),
                    explanation: 'It has four: HH, HT, TH and TT. HT and TH are different outcomes.',
                },
                {
                    kind: 'true_false',
                    prompt: 'In an experiment with finitely many equally likely outcomes, an event with probability 0 contains no favorable outcomes.',
                    objective: OBJ.probListing,
                    options: tf(true),
                    explanation: 'P(E) = n(E) ÷ n(S) = 0 only when n(E) = 0, so the event has no favorable outcomes.',
                },
            ],
        },
        {
            key: 'u2-l2',
            kind: 'lesson',
            title: 'Lesson 2.2: Addition of probabilities',
            summary: 'Mutually exclusive events, the addition rule for “A or B”, and the complement rule.',
            body: additionOfProbabilities,
            objectives: [OBJ.mutex, OBJ.complement, OBJ.union],
            difficulty: 2,
            estimatedMinutes: 15,
            requires: ['u2-q1'],
        },
        {
            key: 'u2-q2',
            kind: 'quiz',
            title: 'Quiz 2.2: Addition of probabilities',
            summary: 'Decide whether events overlap, then add — and use complements.',
            objectives: [OBJ.mutex, OBJ.complement, OBJ.union],
            difficulty: 2,
            estimatedMinutes: 15,
            requires: ['u2-l2'],
            questions: [
                {
                    kind: 'single_choice',
                    prompt: 'Two events are mutually exclusive when:',
                    objective: OBJ.mutex,
                    options: pick(
                        [
                            'they have no common outcomes',
                            'they always occur together',
                            'one causes the other',
                            'they are equally likely',
                        ],
                        0,
                    ),
                    explanation: 'Mutually exclusive events cannot happen at the same time: A ∩ B is empty.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A fair die is rolled once. What is P(getting a 2 or a 5)?',
                    objective: OBJ.union,
                    options: pick(['1/6', '1/3', '1/2', '5/6'], 1),
                    explanation: 'One roll can’t be both, so add: 1/6 + 1/6 = 2/6 = 1/3.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'If P(E) = 0.3, what is the probability of the complement of E?',
                    objective: OBJ.complement,
                    options: pick(['0.7', '0.3', '0.5', '1.3'], 0),
                    explanation: 'P(E′) = 1 − P(E) = 1 − 0.3 = 0.7.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'One card is drawn from a deck of 52. What is P(the card is a heart or a face card)?',
                    objective: OBJ.union,
                    options: pick(['25/52', '11/26', '6/13', '1/4'], 1),
                    explanation: 'The events overlap in the 3 heart face cards: 13/52 + 12/52 − 3/52 = 22/52 = 11/26.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'Events A and B are mutually exclusive, with P(A) = 0.5 and P(B) = 0.4. What is P(A or B)?',
                    objective: OBJ.union,
                    options: pick(['0.1', '0.2', '0.9', '0.7'], 2),
                    explanation: 'There is no overlap to subtract: 0.5 + 0.4 = 0.9.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'In a class, P(plays basketball) = 0.5, P(plays volleyball) = 0.3 and P(plays both) = 0.1. Find P(plays basketball or volleyball) as a decimal.',
                    objective: OBJ.union,
                    acceptedAnswers: ['0.7', '.7', '7/10', '70%'],
                    explanation: 'The events overlap: 0.5 + 0.3 − 0.1 = 0.7.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'A number is drawn at random from 1 to 20. Find P(the number is a multiple of 3 or a multiple of 5) as a fraction in lowest terms.',
                    objective: OBJ.union,
                    acceptedAnswers: ['9/20', '0.45', '45%'],
                    explanation:
                        'Multiples of 3: 3, 6, 9, 12, 15, 18 (6). Multiples of 5: 5, 10, 15, 20 (4). Both: 15 (1). P = 6/20 + 4/20 − 1/20 = 9/20. The events are not mutually exclusive because 15 is in both.',
                },
                {
                    kind: 'true_false',
                    prompt: 'For any two events, P(A or B) = P(A) + P(B).',
                    objective: OBJ.union,
                    options: tf(false),
                    explanation:
                        'Only for mutually exclusive events. In general P(A or B) = P(A) + P(B) − P(A and B); e.g. heart or king is 16/52, not 17/52.',
                },
                {
                    kind: 'true_false',
                    prompt: 'If P(A) = 0.6 and P(B) = 0.7, then A and B cannot be mutually exclusive.',
                    objective: OBJ.mutex,
                    options: tf(true),
                    explanation:
                        'If they were, P(A or B) would be 0.6 + 0.7 = 1.3, which is more than 1 — impossible. So they must overlap.',
                },
                {
                    kind: 'true_false',
                    prompt: 'Drawing a heart and drawing a red card from a standard deck are mutually exclusive events.',
                    objective: OBJ.mutex,
                    options: tf(false),
                    explanation: 'Every heart is a red card, so the events share 13 outcomes.',
                },
            ],
        },
        {
            key: 'u2-l3',
            kind: 'lesson',
            title: 'Lesson 2.3: Independent events',
            summary:
                'When one event doesn’t affect another, with and without replacement, and how to test for independence.',
            body: independentEvents,
            objectives: [OBJ.independent, OBJ.both],
            difficulty: 2,
            estimatedMinutes: 15,
            requires: ['u2-q2'],
        },
        {
            key: 'u2-q3',
            kind: 'quiz',
            title: 'Quiz 2.3: Independent events',
            summary: 'Decide whether events are independent, then find the chance that both occur.',
            objectives: [OBJ.independent, OBJ.both],
            difficulty: 2,
            estimatedMinutes: 15,
            requires: ['u2-l3'],
            questions: [
                {
                    kind: 'single_choice',
                    prompt: 'Events A and B are independent when:',
                    objective: OBJ.independent,
                    options: pick(
                        ['P(A | B) = P(A)', 'P(A and B) = 0', 'they cannot occur together', 'P(A) + P(B) = 1'],
                        0,
                    ),
                    explanation:
                        'Independent means knowing B happened doesn’t change the probability of A: P(A | B) = P(A). P(A and B) = 0 describes mutually exclusive events instead.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'For independent events A and B, P(A and B) equals:',
                    objective: OBJ.both,
                    options: pick(['P(A) + P(B)', 'P(A) · P(B)', 'P(A) / P(B)', 'P(A) − P(B)'], 1),
                    explanation: 'This is the multiplication rule for independent events.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'Which situation involves independent events?',
                    objective: OBJ.independent,
                    options: pick(
                        [
                            'drawing two cards without replacement',
                            'tossing a coin twice',
                            'choosing two class officers one after another',
                            'taking two balls from a bag without replacement',
                        ],
                        1,
                    ),
                    explanation:
                        'The coin has no memory: the first toss doesn’t change the second. The other three remove someone or something before the second choice.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A fair coin is tossed twice. What is P(two heads)?',
                    objective: OBJ.both,
                    options: pick(['1/2', '1/8', '1/4', '1'], 2),
                    explanation: '1/2 × 1/2 = 1/4.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A fair die is rolled and a fair coin is tossed. What is P(a 6 and a head)?',
                    objective: OBJ.both,
                    options: pick(['1/6', '1/12', '1/2', '7/12'], 1),
                    explanation: 'The events are independent: 1/6 × 1/2 = 1/12.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'A fair coin is tossed and a fair die is rolled. Find P(tails and a number greater than 4) as a fraction in lowest terms.',
                    objective: OBJ.both,
                    acceptedAnswers: ['1/6', '2/12', '0.17', '0.167'],
                    explanation: 'P(tails) = 1/2 and P(5 or 6) = 2/6 = 1/3. Independent, so 1/2 × 1/3 = 1/6.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'Two cards are drawn from a standard deck without replacement. Find P(both are hearts) as a fraction in lowest terms.',
                    objective: OBJ.both,
                    acceptedAnswers: ['1/17', '3/51', '156/2652', '0.059', '0.0588'],
                    explanation:
                        'The events are dependent: P = 13/52 × 12/51 = 156/2652 = 1/17. After one heart is drawn, 12 hearts remain among 51 cards.',
                },
                {
                    kind: 'true_false',
                    prompt: 'Independent events are the same as mutually exclusive events.',
                    objective: OBJ.independent,
                    options: tf(false),
                    explanation:
                        'Mutually exclusive events can’t happen together; independent events can — one just doesn’t affect the other. A head on a coin and a 4 on a die are independent but not mutually exclusive.',
                },
                {
                    kind: 'true_false',
                    prompt: 'When a fair coin is tossed twice, the result of the first toss changes the probability of the second.',
                    objective: OBJ.independent,
                    options: tf(false),
                    explanation: 'P(head) is 1/2 on every toss, whatever happened before.',
                },
                {
                    kind: 'true_false',
                    prompt: 'If A and B are independent with P(A) = 0.5 and P(B) = 0.2, then P(A and B) = 0.1.',
                    objective: OBJ.both,
                    options: tf(true),
                    explanation: '0.5 × 0.2 = 0.1.',
                },
            ],
        },
        {
            key: 'u2-l4',
            kind: 'lesson',
            title: 'Lesson 2.4: Conditional probability',
            summary:
                'Probability given a condition: the shrinking sample space, two-way tables and draws without replacement.',
            body: conditionalProbability,
            objectives: [OBJ.simpleVsConditional, OBJ.conditional],
            difficulty: 3,
            estimatedMinutes: 20,
            requires: ['u2-q3'],
        },
        {
            key: 'u2-q4',
            kind: 'quiz',
            title: 'Quiz 2.4: Conditional probability',
            summary: 'Find the right denominator, then compute conditional probabilities from tables and formulas.',
            objectives: [OBJ.simpleVsConditional, OBJ.conditional],
            difficulty: 3,
            estimatedMinutes: 15,
            requires: ['u2-l4'],
            questions: [
                {
                    kind: 'single_choice',
                    prompt: 'Which of the following describes a conditional probability?',
                    objective: OBJ.simpleVsConditional,
                    options: pick(
                        [
                            'the probability that a die shows a 4',
                            'the probability that it rains tomorrow',
                            'the probability that a learner passed, given that the learner reviewed',
                            'the probability that a drawn card is red',
                        ],
                        2,
                    ),
                    explanation: 'Only this one is restricted to a condition (“given that the learner reviewed”).',
                },
                {
                    kind: 'single_choice',
                    prompt: 'To compute P(A | B) by counting, the denominator should be:',
                    objective: OBJ.simpleVsConditional,
                    options: pick(
                        [
                            'the number of outcomes in the whole sample space',
                            'the number of outcomes in event B',
                            'the number of outcomes in event A',
                            'the number of outcomes in A and B',
                        ],
                        1,
                    ),
                    explanation: 'The condition B becomes the new sample space: P(A | B) = n(A ∩ B) ÷ n(B).',
                },
                {
                    kind: 'single_choice',
                    prompt: 'If P(A and B) = 0.12 and P(B) = 0.3, then P(A | B) is:',
                    objective: OBJ.conditional,
                    options: pick(['0.12', '0.3', '0.4', '0.036'], 2),
                    explanation: 'P(A | B) = P(A and B) ÷ P(B) = 0.12 ÷ 0.3 = 0.4.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'In a group, P(owns a bike) = 0.4 and P(owns a bike and a helmet) = 0.1. What is P(owns a helmet | owns a bike)?',
                    objective: OBJ.conditional,
                    options: pick(['0.25', '0.4', '0.1', '0.04'], 0),
                    explanation: '0.1 ÷ 0.4 = 0.25.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A card is drawn from a deck of 52. Given that it is a face card, what is P(it is a King)?',
                    objective: OBJ.conditional,
                    options: pick(['4/52', '1/3', '1/13', '1/4'], 1),
                    explanation: 'Only the 12 face cards remain possible, and 4 are Kings: 4/12 = 1/3.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'Of 40 learners, 24 use a planner, and 18 of those submit their projects on time. Find P(submitted on time | uses a planner) as a fraction in lowest terms.',
                    objective: OBJ.conditional,
                    acceptedAnswers: ['3/4', '18/24', '0.75', '75%'],
                    explanation: 'The condition is “uses a planner”, so the denominator is 24: 18/24 = 3/4.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'In the same class, 26 of the 40 learners submitted on time, and 18 of those use a planner. Find P(uses a planner | submitted on time) as a fraction in lowest terms.',
                    objective: OBJ.conditional,
                    acceptedAnswers: ['9/13', '18/26', '0.69', '0.692'],
                    explanation:
                        'Now the condition is “submitted on time”, so the denominator is 26: 18/26 = 9/13. Same numerator as before, different condition, different answer.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'In a barangay survey, P(a household has internet) = 0.6 and P(has internet and a computer) = 0.45. Find P(has a computer | has internet) as a decimal.',
                    objective: OBJ.conditional,
                    acceptedAnswers: ['0.75', '.75', '3/4', '75%'],
                    explanation: '0.45 ÷ 0.6 = 0.75: three out of four households with internet also have a computer.',
                },
                {
                    kind: 'true_false',
                    prompt: 'For any two events, P(A | B) is always equal to P(B | A).',
                    objective: OBJ.simpleVsConditional,
                    options: tf(false),
                    explanation:
                        'The denominators differ. In the club survey, P(sports | club) = 50/80 but P(club | sports) = 50/120.',
                },
                {
                    kind: 'true_false',
                    prompt: 'If A and B are independent, then P(A | B) = P(A).',
                    objective: OBJ.conditional,
                    options: tf(true),
                    explanation:
                        'P(A | B) = P(A ∩ B) ÷ P(B) = P(A) · P(B) ÷ P(B) = P(A). Knowing B tells you nothing about A.',
                },
            ],
        },
        {
            key: 'u2-l5',
            kind: 'lesson',
            title: 'Lesson 2.5: Bayes’ Rule',
            summary: 'Updating a probability with new evidence: priors, likelihoods, total probability and posteriors.',
            body: bayesRule,
            objectives: [OBJ.bayesExplain, OBJ.bayesApply],
            difficulty: 4,
            estimatedMinutes: 25,
            requires: ['u2-q4'],
        },
        {
            key: 'u2-q5',
            kind: 'quiz',
            title: 'Quiz 2.5: Bayes’ Rule',
            summary:
                'Find the probability of a cause given a result — commuting, factories, clinics and palengke stalls.',
            objectives: [OBJ.bayesExplain, OBJ.bayesApply],
            difficulty: 4,
            estimatedMinutes: 20,
            requires: ['u2-l5'],
            questions: [
                {
                    kind: 'single_choice',
                    prompt: 'A commuter travels to school by train 70% of the time and is late on 8% of train days, and by jeep 30% of the time and is late on 20% of jeep days. If the commuter is late, what is the probability that the commuter travelled by jeep?',
                    objective: OBJ.bayesApply,
                    options: pick(['0.30', '0.20', '0.52', '0.71'], 2),
                    explanation:
                        'P(late) = 0.70 × 0.08 + 0.30 × 0.20 = 0.056 + 0.060 = 0.116. P(jeep | late) = 0.060 ÷ 0.116 ≈ 0.52.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'Machine 1 makes 60% of a factory’s units with a 2% defect rate; Machine 2 makes 40% with a 5% defect rate. A unit is defective. P(Machine 2 | defective) is closest to:',
                    objective: OBJ.bayesApply,
                    options: pick(['0.63', '0.40', '0.05', '0.50'], 0),
                    explanation:
                        'P(defective) = 0.60 × 0.02 + 0.40 × 0.05 = 0.012 + 0.020 = 0.032. P(Machine 2 | defective) = 0.020 ÷ 0.032 = 0.625 ≈ 0.63.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'In a clinic, 10% of patients have a certain condition. A test is positive for 80% of those who have it and for 10% of those who do not. A patient tests positive. P(condition | positive) is closest to:',
                    objective: OBJ.bayesApply,
                    options: pick(['0.80', '0.47', '0.10', '0.08'], 1),
                    explanation:
                        'P(positive) = 0.10 × 0.80 + 0.90 × 0.10 = 0.08 + 0.09 = 0.17. P(condition | positive) = 0.08 ÷ 0.17 ≈ 0.47.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A sari-sari store buys eggs from two suppliers. Supplier P delivers 80% of the eggs, 3% of them cracked; Supplier Q delivers 20%, 8% of them cracked. An egg is found cracked. P(Supplier Q | cracked) is closest to:',
                    objective: OBJ.bayesApply,
                    options: pick(['0.20', '0.08', '0.40', '0.60'], 2),
                    explanation:
                        'P(cracked) = 0.80 × 0.03 + 0.20 × 0.08 = 0.024 + 0.016 = 0.040. P(Q | cracked) = 0.016 ÷ 0.040 = 0.40.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'At a palengke, Vendor X supplies 65% of the bangus and 5% of its fish are not fresh; Vendor Y supplies 35% and 12% of its fish are not fresh. A bangus is found not fresh. P(Vendor Y | not fresh) is closest to:',
                    objective: OBJ.bayesApply,
                    options: pick(['0.35', '0.56', '0.12', '0.44'], 1),
                    explanation:
                        'P(not fresh) = 0.65 × 0.05 + 0.35 × 0.12 = 0.0325 + 0.042 = 0.0745. P(Y | not fresh) = 0.042 ÷ 0.0745 ≈ 0.56.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'In a province, 5% of residents have dengue during a season. A rapid test is positive for 90% of those who have dengue and for 16% of those who do not. A resident tests positive. Find P(dengue | positive), rounded to two decimal places.',
                    objective: OBJ.bayesApply,
                    acceptedAnswers: ['0.23', '.23', '23%', '0.228', '22.8%'],
                    explanation:
                        'P(positive) = 0.05 × 0.90 + 0.95 × 0.16 = 0.045 + 0.152 = 0.197. P(dengue | positive) = 0.045 ÷ 0.197 ≈ 0.23. It is well below 90% because dengue is uncommon: false positives from the many healthy residents outnumber the true positives.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'Suppliers X and Y each provide 50% of a store’s batteries. The defect rate is 3% for X and 4% for Y. A battery is defective. Find P(supplier Y | defective) as a fraction in lowest terms.',
                    objective: OBJ.bayesApply,
                    acceptedAnswers: ['4/7', '0.57', '0.571', '57%', '57.1%'],
                    explanation:
                        'P(defective) = 0.5 × 0.03 + 0.5 × 0.04 = 0.015 + 0.020 = 0.035. P(Y | defective) = 0.020 ÷ 0.035 = 4/7 ≈ 0.57.',
                },
                {
                    kind: 'true_false',
                    prompt: 'A water district draws 55% of its supply from Plant A (contaminated 3% of the time) and 45% from Plant B (contaminated 4% of the time). Claim: a contaminated sample is more likely from Plant B than from Plant A.',
                    objective: OBJ.bayesApply,
                    options: tf(true),
                    explanation:
                        'Plant A: 0.55 × 0.03 = 0.0165. Plant B: 0.45 × 0.04 = 0.018. Since 0.018 > 0.0165, Plant B is more likely (about 0.52 vs 0.48).',
                },
                {
                    kind: 'true_false',
                    prompt: 'A disease affects 2% of a population. A test identifies 95% of people who have it and is positive for 8% of those who don’t. Claim: a person who tests positive has about a 95% chance of having the disease.',
                    objective: OBJ.bayesExplain,
                    options: tf(false),
                    explanation:
                        'P(positive) = 0.02 × 0.95 + 0.98 × 0.08 = 0.019 + 0.0784 = 0.0974, so P(disease | positive) = 0.019 ÷ 0.0974 ≈ 0.20. The claim confuses P(positive | disease) with P(disease | positive).',
                },
                {
                    kind: 'true_false',
                    prompt: 'A machine is faulty on 1% of cycles. An alarm sounds on every faulty cycle and on 5% of normal cycles. Claim: when the alarm sounds, the machine is more likely normal than faulty.',
                    objective: OBJ.bayesApply,
                    options: tf(true),
                    explanation:
                        'Faulty and alarm: 0.01 × 1 = 0.01. Normal and alarm: 0.99 × 0.05 = 0.0495. So P(faulty | alarm) = 0.01 ÷ 0.0595 ≈ 0.17 — the machine is more likely normal.',
                },
            ],
        },
        {
            key: 'u2-boss',
            kind: 'boss_battle',
            title: 'Boss battle: The Oracle of Chance',
            summary:
                'Three trials from the Oracle: count the outcomes, combine the events, then reason backwards with Bayes.',
            objectives: [OBJ.probCounting, OBJ.union, OBJ.independent, OBJ.conditional, OBJ.bayesApply],
            difficulty: 4,
            estimatedMinutes: 20,
            requires: ['u2-q5'],
            boss: {
                name: 'The Oracle of Chance',
                phases: ['The Veil of Outcomes', 'The Twin Paths', 'The Hidden Cause'],
            },
            questions: [
                {
                    kind: 'short_answer',
                    phase: 1,
                    prompt: 'Two fair dice are rolled. What is the probability that the sum is 7? Write it as a fraction in lowest terms.',
                    objective: OBJ.probCounting,
                    acceptedAnswers: ['1/6', '6/36', '0.17', '0.167'],
                    explanation:
                        'n(S) = 6 × 6 = 36. Sums of 7: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1) — 6 outcomes. P = 6/36 = 1/6.',
                },
                {
                    kind: 'single_choice',
                    phase: 1,
                    prompt: 'A bag holds 4 red and 6 green marbles. Three marbles are taken at random at the same time. What is P(all three are green)?',
                    objective: OBJ.probCounting,
                    options: pick(['27/125', '1/6', '3/10', '1/2'], 1),
                    explanation: 'n(S) = C(10, 3) = 120 and n(E) = C(6, 3) = 20, so P = 20/120 = 1/6.',
                },
                {
                    kind: 'single_choice',
                    phase: 2,
                    prompt: 'A number is chosen at random from 1 to 30. What is P(a multiple of 4 or a multiple of 6)?',
                    objective: OBJ.union,
                    options: pick(['2/5', '7/30', '1/3', '2/15'], 2),
                    explanation:
                        'Multiples of 4: 7 (4 to 28). Multiples of 6: 5 (6 to 30). Both — multiples of 12: 12 and 24 (2). P = 7/30 + 5/30 − 2/30 = 10/30 = 1/3.',
                },
                {
                    kind: 'short_answer',
                    phase: 2,
                    prompt: 'A and B are independent, with P(A) = 0.4 and P(B) = 0.5. Find P(A ∪ B) as a decimal.',
                    objective: OBJ.union,
                    acceptedAnswers: ['0.7', '.7', '7/10', '70%'],
                    explanation: 'Independent, so P(A ∩ B) = 0.4 × 0.5 = 0.2. Then P(A ∪ B) = 0.4 + 0.5 − 0.2 = 0.7.',
                },
                {
                    kind: 'true_false',
                    phase: 2,
                    prompt: 'If P(A) = 0.3, P(B) = 0.4 and P(A ∩ B) = 0.12, then A and B are independent.',
                    objective: OBJ.independent,
                    options: tf(true),
                    explanation: 'P(A) · P(B) = 0.3 × 0.4 = 0.12, which equals P(A ∩ B), so they are independent.',
                },
                {
                    kind: 'single_choice',
                    phase: 3,
                    prompt: 'Of 60 Grade 11 students, 25 are in STEM and 20 of them passed a mathematics test; of the 35 non-STEM students, 14 passed. A student who passed is picked at random. What is P(STEM | passed)?',
                    objective: OBJ.conditional,
                    options: pick(['4/5', '1/3', '10/17', '20/60'], 2),
                    explanation:
                        '20 + 14 = 34 students passed — that is the denominator. P(STEM | passed) = 20/34 = 10/17 ≈ 0.59.',
                },
                {
                    kind: 'single_choice',
                    phase: 3,
                    prompt: 'A barangay gets 70% of its water from Well A and 30% from Well B. Samples are unsafe 2% of the time from Well A and 10% of the time from Well B. A sample is unsafe. P(Well B | unsafe) is closest to:',
                    objective: OBJ.bayesApply,
                    options: pick(['0.30', '0.10', '0.32', '0.68'], 3),
                    explanation:
                        'P(unsafe) = 0.70 × 0.02 + 0.30 × 0.10 = 0.014 + 0.030 = 0.044. P(B | unsafe) = 0.030 ÷ 0.044 ≈ 0.68.',
                },
                {
                    kind: 'true_false',
                    phase: 3,
                    prompt: 'A disease affects 1 in 1,000 people. A test is positive for 99% of people with the disease and for 1% of people without it. Claim: a positive result means the person almost certainly has the disease.',
                    objective: OBJ.bayesApply,
                    options: tf(false),
                    explanation:
                        'P(positive) = 0.001 × 0.99 + 0.999 × 0.01 = 0.00099 + 0.00999 = 0.01098. P(disease | positive) = 0.00099 ÷ 0.01098 ≈ 0.09 — only about 9%, because the disease is so rare.',
                },
            ],
        },
    ],
}
