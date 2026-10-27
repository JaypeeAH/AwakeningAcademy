import { imageMarkdown, videoMarkdown } from '@/utils/media'
import { commonsImage } from '@/utils/sampleCourses'
import type { SampleCourseDefinition } from '@/@types/courses/SampleCourse'

const OBJ = {
    parts: 'Identify the hypotenuse and the legs of a right triangle',
    theorem: 'Explain what the Pythagorean theorem says',
    hypotenuse: 'Find the hypotenuse using a² + b² = c²',
    leg: 'Find a missing leg of a right triangle',
}

const meetTheRightTriangle = [
    '## What makes a triangle “right”?',
    'A **right triangle** has one angle of exactly 90° — a square corner, like the corner of a page. The two sides that make the square corner are called the **legs**. The side opposite the square corner is the **hypotenuse**. It is always the longest side.',
    imageMarkdown(
        commonsImage('Rtriangle.svg'),
        'A right triangle with legs a and b and hypotenuse c',
        'A right triangle: legs a and b meet at the square corner; c is the hypotenuse. Image: Gustavb, CC BY-SA 3.0, via Wikimedia Commons',
    ),
    '> [!TIP]\n> To find the hypotenuse, put your finger on the square corner. The side your finger is **not** touching is the hypotenuse.',
    '## The big idea',
    'More than 2,500 years ago, mathematicians noticed something remarkable. If you draw a square on each side of a right triangle, the two smaller squares together have exactly the same area as the big square on the hypotenuse.',
    imageMarkdown(
        commonsImage('Pythagorean.svg'),
        'Squares drawn on the three sides of a right triangle',
        'The areas of the squares on the two legs add up to the area of the square on the hypotenuse. Image: Wapcaplet, CC BY-SA 3.0, via Wikimedia Commons',
    ),
    'Written as a rule, with legs *a* and *b* and hypotenuse *c*:',
    '**a² + b² = c²**',
    'This is the **Pythagorean theorem**, named after the Greek thinker Pythagoras — although people in Babylon, India and China knew the pattern too.',
    '## Watch: the theorem in action',
    videoMarkdown('https://www.youtube.com/watch?v=AA6RfgP-AHU', 'The Pythagorean theorem intro'),
    '*Video: “The Pythagorean theorem intro” by Khan Academy, on YouTube.*',
    '## Check yourself',
    '- Which side of a right triangle is always the longest?\n- Does the theorem work for a triangle with no right angle? (No — only right triangles.)',
].join('\n\n')

const usingTheTheorem = [
    '## Finding the hypotenuse',
    'If you know both legs, square them, add, then take the square root.',
    '> [!NOTE]\n> **Example.** The legs are 6 cm and 8 cm.\n>\n> 6² + 8² = 36 + 64 = 100, and √100 = **10 cm**.',
    '## Finding a missing leg',
    'If you know the hypotenuse and one leg, **subtract** instead of adding: b² = c² − a².',
    '> [!NOTE]\n> **Example.** The hypotenuse is 13 m and one leg is 5 m.\n>\n> 13² − 5² = 169 − 25 = 144, and √144 = **12 m**.',
    '> [!WARNING]\n> A common slip is adding when you should subtract. Ask: “Am I looking for the longest side?” If yes, add. If not, subtract.',
    '## Pythagorean triples',
    'Some right triangles have whole-number sides. These sets are worth knowing — they save time:',
    [
        '| Leg a | Leg b | Hypotenuse c | Check |',
        '| --- | --- | --- | --- |',
        '| 3 | 4 | 5 | 9 + 16 = 25 |',
        '| 5 | 12 | 13 | 25 + 144 = 169 |',
        '| 8 | 15 | 17 | 64 + 225 = 289 |',
        '| 7 | 24 | 25 | 49 + 576 = 625 |',
    ].join('\n'),
    'Multiples work too: 6, 8, 10 is just 3, 4, 5 doubled.',
    '## Where you’ll meet it',
    '- **Ladders:** a 5 m ladder with its foot 3 m from a wall reaches 4 m up the wall.\n- **Screens:** a TV’s size is measured along its diagonal — the hypotenuse.\n- **Maps:** the straight-line distance between two points on a grid.',
    '> [!TIP]\n> Always sketch the triangle and mark the square corner before you calculate.',
].join('\n\n')

export const pythagorasSample: SampleCourseDefinition = {
    id: 'pythagoras',
    subjectSlug: 'mathematics',
    title: 'Sample: Right Triangles & Pythagoras',
    description:
        'A ready-made sample course: two illustrated lessons with a video, a quiz and a boss battle on right triangles and the Pythagorean theorem. Edit anything — it’s your copy.',
    tagline: 'Legs, hypotenuse and a² + b² = c², with worked examples and a boss battle.',
    module: { title: 'Unit 1: Right triangles', description: 'From spotting the hypotenuse to solving for any side.' },
    activities: [
        {
            key: 'meet',
            kind: 'lesson',
            title: 'Meet the right triangle',
            summary: 'Legs, the hypotenuse, and the pattern Pythagoras is famous for.',
            body: meetTheRightTriangle,
            objectives: [OBJ.parts, OBJ.theorem],
            difficulty: 1,
            estimatedMinutes: 10,
        },
        {
            key: 'using',
            kind: 'lesson',
            title: 'Using the theorem: finding a missing side',
            summary: 'Worked examples, Pythagorean triples and real-life uses.',
            body: usingTheTheorem,
            objectives: [OBJ.hypotenuse, OBJ.leg],
            difficulty: 2,
            estimatedMinutes: 12,
            requires: ['meet'],
        },
        {
            key: 'quiz',
            kind: 'quiz',
            title: 'Right triangle check',
            summary: 'Six questions on the parts of a right triangle and the theorem.',
            objectives: [OBJ.parts, OBJ.theorem, OBJ.hypotenuse, OBJ.leg],
            difficulty: 2,
            estimatedMinutes: 10,
            requires: ['using'],
            questions: [
                {
                    kind: 'true_false',
                    prompt: 'The hypotenuse is always the longest side of a right triangle.',
                    objective: OBJ.parts,
                    options: [{ label: 'True', correct: true }, { label: 'False' }],
                    explanation: 'It is opposite the 90° angle, the largest angle, so it is the longest side.',
                },
                {
                    kind: 'true_false',
                    prompt: 'a² + b² = c² works for every triangle.',
                    objective: OBJ.theorem,
                    options: [{ label: 'True' }, { label: 'False', correct: true }],
                    explanation: 'It only works for right triangles — those with a 90° angle.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'A right triangle has legs of 6 cm and 8 cm. How long is the hypotenuse?',
                    objective: OBJ.hypotenuse,
                    options: [
                        { label: '10 cm', correct: true },
                        { label: '14 cm' },
                        { label: '12 cm' },
                        { label: '100 cm' },
                    ],
                    explanation: '6² + 8² = 36 + 64 = 100, and √100 = 10.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'The hypotenuse is 13 m and one leg is 5 m. How long is the other leg?',
                    objective: OBJ.leg,
                    options: [
                        { label: '8 m' },
                        { label: '12 m', correct: true },
                        { label: '18 m' },
                        { label: '144 m' },
                    ],
                    explanation: '13² − 5² = 169 − 25 = 144, and √144 = 12. Subtract when the missing side is a leg.',
                },
                {
                    kind: 'multiple_choice',
                    prompt: 'Which of these could be the sides of a right triangle? Select all that apply.',
                    objective: OBJ.theorem,
                    options: [
                        { label: '3, 4, 5', correct: true },
                        { label: '5, 12, 13', correct: true },
                        { label: '2, 3, 4' },
                        { label: '8, 15, 17', correct: true },
                    ],
                    explanation:
                        '9 + 16 = 25, 25 + 144 = 169 and 64 + 225 = 289 all work. For 2, 3, 4: 4 + 9 = 13, not 16.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'A right triangle has legs 9 and 12. How long is the hypotenuse? (Just the number.)',
                    objective: OBJ.hypotenuse,
                    acceptedAnswers: ['15', '15 units'],
                    explanation: '9² + 12² = 81 + 144 = 225, and √225 = 15. (It’s 3, 4, 5 multiplied by 3.)',
                },
            ],
        },
        {
            key: 'boss',
            kind: 'boss_battle',
            title: 'Boss battle: The Hypotenuse Hydra',
            summary: 'Two phases, one hydra. Use everything you know about right triangles.',
            objectives: [OBJ.hypotenuse, OBJ.leg, OBJ.theorem],
            difficulty: 3,
            estimatedMinutes: 12,
            requires: ['quiz'],
            boss: { name: 'The Hypotenuse Hydra', phases: ['The Head of Legs', 'The Head of Triples'] },
            questions: [
                {
                    kind: 'short_answer',
                    phase: 1,
                    prompt: 'The legs are 7 and 24. How long is the hypotenuse? (Just the number.)',
                    objective: OBJ.hypotenuse,
                    acceptedAnswers: ['25'],
                    explanation: '7² + 24² = 49 + 576 = 625, and √625 = 25.',
                },
                {
                    kind: 'single_choice',
                    phase: 1,
                    prompt: 'A 5 m ladder leans on a wall with its foot 3 m from the wall. How high up the wall does it reach?',
                    objective: OBJ.leg,
                    options: [{ label: '2 m' }, { label: '4 m', correct: true }, { label: '8 m' }, { label: '16 m' }],
                    explanation: 'The ladder is the hypotenuse: 5² − 3² = 25 − 9 = 16, and √16 = 4.',
                },
                {
                    kind: 'single_choice',
                    phase: 2,
                    prompt: 'A square has sides of 1 m. How long is its diagonal?',
                    objective: OBJ.hypotenuse,
                    options: [
                        { label: '1 m' },
                        { label: '2 m' },
                        { label: '√2 m (about 1.41 m)', correct: true },
                        { label: '1.5 m' },
                    ],
                    explanation:
                        'The diagonal splits the square into two right triangles: 1² + 1² = 2, so the diagonal is √2.',
                },
                {
                    kind: 'true_false',
                    phase: 2,
                    prompt: 'If a triangle’s sides fit a² + b² = c², the triangle must have a right angle.',
                    objective: OBJ.theorem,
                    options: [{ label: 'True', correct: true }, { label: 'False' }],
                    explanation:
                        'Yes — this is the converse of the theorem, and it’s how builders check square corners with a 3-4-5 rope.',
                },
            ],
        },
    ],
}
