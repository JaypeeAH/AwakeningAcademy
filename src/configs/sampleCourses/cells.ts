import { imageMarkdown, videoMarkdown } from '@/utils/media'
import { commonsImage } from '@/utils/sampleCourses'
import type { SampleCourseDefinition } from '@/@types/courses/SampleCourse'

const OBJ = {
    cellTheory: 'Describe what a cell is and state the cell theory',
    compare: 'Compare plant and animal cells',
    equation: 'Write the word equation for photosynthesis',
    chloroplasts: 'Explain the role of chloroplasts and chlorophyll',
}

const cellsLesson = [
    '## The smallest unit of life',
    'Every living thing — a tree, a mushroom, a whale, you — is made of **cells**. Some living things are a single cell. You are made of tens of trillions of them, working together.',
    'Scientists sum this up in the **cell theory**:',
    '1. All living things are made of one or more cells.\n2. The cell is the basic unit of life.\n3. New cells come only from cells that already exist.',
    '## Inside an animal cell',
    imageMarkdown(
        commonsImage('Animal_cell_structure_en.svg'),
        'Diagram of an animal cell and its parts',
        'An animal cell and its organelles. Image: LadyofHats (Mariana Ruiz), public domain, via Wikimedia Commons',
    ),
    'Cells contain tiny parts called **organelles**, each with a job — like the departments of a factory.',
    '## Inside a plant cell',
    imageMarkdown(
        commonsImage('Plant_cell_structure-en.svg'),
        'Diagram of a plant cell and its parts',
        'A plant cell: notice the cell wall, chloroplasts and large vacuole. Image: LadyofHats (Mariana Ruiz), public domain, via Wikimedia Commons',
    ),
    '## Plant and animal cells compared',
    [
        '| Part | Its job | Animal cell | Plant cell |',
        '| --- | --- | --- | --- |',
        '| Nucleus | Holds DNA and controls the cell | ✓ | ✓ |',
        '| Cell membrane | Controls what goes in and out | ✓ | ✓ |',
        '| Cytoplasm | Jelly where most reactions happen | ✓ | ✓ |',
        '| Mitochondria | Release energy from food (respiration) | ✓ | ✓ |',
        '| Ribosomes | Make proteins | ✓ | ✓ |',
        '| Cell wall | Strengthens and supports the cell | ✗ | ✓ |',
        '| Chloroplasts | Make food by photosynthesis | ✗ | ✓ |',
        '| Large permanent vacuole | Stores cell sap and keeps the cell firm | ✗ | ✓ |',
    ].join('\n'),
    '> [!TIP]\n> Memory trick: plants have **three extras** — the cell **W**all, **C**hloroplasts and a big **V**acuole. “Walls, Chloroplasts, Vacuole.”',
    '## Watch: a tour of the cell',
    videoMarkdown('https://www.youtube.com/watch?v=8IlzKri08kk', 'Introduction to Cells: The Grand Cell Tour'),
    '*Video: “Introduction to Cells: The Grand Cell Tour” by the Amoeba Sisters, on YouTube.*',
].join('\n\n')

const photosynthesisLesson = [
    '## How do plants eat?',
    'Plants don’t eat food the way animals do. They **make** their own food — a sugar called **glucose** — using light. This process is called **photosynthesis** (“putting together with light”).',
    imageMarkdown(
        commonsImage('Leaf_1_web.jpg'),
        'A close-up of a green leaf',
        'Leaves are the plant’s food factories. Image: Jon Sullivan, public domain, via Wikimedia Commons',
    ),
    '## The ingredients and the products',
    '> [!IMPORTANT]\n> **carbon dioxide + water → glucose + oxygen**\n>\n> This needs **light** energy, captured by **chlorophyll**.',
    '- **Carbon dioxide** enters the leaf from the air through tiny holes called stomata.\n- **Water** travels up from the roots.\n- **Glucose** is used for energy and growth, or stored as starch.\n- **Oxygen** is released into the air — the oxygen we breathe.',
    imageMarkdown(
        commonsImage('Photosynthesis_en.svg'),
        'Diagram of photosynthesis showing light, water, carbon dioxide, sugar and oxygen',
        'Photosynthesis at a glance. Image: At09kg, Wattcle and Nefronus, CC BY-SA 4.0, via Wikimedia Commons',
    ),
    '## Where it happens',
    'Photosynthesis happens inside **chloroplasts**, mostly in leaf cells. Chloroplasts contain **chlorophyll**, a green pigment that absorbs light energy (mainly red and blue light). Chlorophyll reflects green light — that’s why leaves look green.',
    '> [!NOTE]\n> Plants **respire** all the time, day and night, just like animals. In daylight, photosynthesis is usually faster than respiration, so a plant gives out more oxygen than it uses.',
    '## Watch: photosynthesis explained',
    videoMarkdown('https://www.youtube.com/watch?v=sQK3Yr4Sc_k', 'Photosynthesis: Crash Course Biology #8'),
    '*Video: “Photosynthesis: Crash Course Biology #8” by CrashCourse, on YouTube. It goes into more detail than you need — watch the first few minutes for the big picture.*',
].join('\n\n')

export const cellsSample: SampleCourseDefinition = {
    id: 'cells-photosynthesis',
    subjectSlug: 'science',
    title: 'Sample: Cells & Photosynthesis',
    description:
        'A ready-made biology sample: what cells are, how plant and animal cells differ, and how plants make food from light. Two illustrated lessons with videos and a quiz. Edit anything — it’s your copy.',
    tagline: 'Organelles, plant vs animal cells, and the photosynthesis equation.',
    module: { title: 'Unit 1: Living things', description: 'Cells, and how plants turn light into food.' },
    activities: [
        {
            key: 'cells',
            kind: 'lesson',
            title: 'Cells: the building blocks of life',
            summary: 'The cell theory, organelles, and how plant and animal cells differ.',
            body: cellsLesson,
            objectives: [OBJ.cellTheory, OBJ.compare],
            difficulty: 1,
            estimatedMinutes: 15,
        },
        {
            key: 'photosynthesis',
            kind: 'lesson',
            title: 'Photosynthesis: how plants make food',
            summary: 'The ingredients, the products, and where it all happens.',
            body: photosynthesisLesson,
            objectives: [OBJ.equation, OBJ.chloroplasts],
            difficulty: 2,
            estimatedMinutes: 15,
            requires: ['cells'],
        },
        {
            key: 'quiz',
            kind: 'quiz',
            title: 'Cells and photosynthesis check',
            summary: 'Six questions on cells, organelles and photosynthesis.',
            objectives: [OBJ.cellTheory, OBJ.compare, OBJ.equation, OBJ.chloroplasts],
            difficulty: 2,
            estimatedMinutes: 10,
            requires: ['photosynthesis'],
            questions: [
                {
                    kind: 'true_false',
                    prompt: 'New cells can only come from cells that already exist.',
                    objective: OBJ.cellTheory,
                    options: [{ label: 'True', correct: true }, { label: 'False' }],
                    explanation: 'This is the third part of the cell theory: cells come from pre-existing cells.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'Which organelle holds the cell’s DNA and controls its activities?',
                    objective: OBJ.cellTheory,
                    options: [
                        { label: 'Mitochondrion' },
                        { label: 'Nucleus', correct: true },
                        { label: 'Ribosome' },
                        { label: 'Vacuole' },
                    ],
                    explanation: 'The nucleus contains the genetic material (DNA) that controls the cell.',
                },
                {
                    kind: 'multiple_choice',
                    prompt: 'Which parts are found in plant cells but NOT in animal cells? Select all that apply.',
                    objective: OBJ.compare,
                    options: [
                        { label: 'Cell wall', correct: true },
                        { label: 'Chloroplasts', correct: true },
                        { label: 'Large permanent vacuole', correct: true },
                        { label: 'Cell membrane' },
                        { label: 'Mitochondria' },
                    ],
                    explanation:
                        'Both cell types have a membrane and mitochondria. Only plant cells have a cell wall, chloroplasts and a large permanent vacuole.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'Which word equation shows photosynthesis?',
                    objective: OBJ.equation,
                    options: [
                        { label: 'carbon dioxide + water → glucose + oxygen', correct: true },
                        { label: 'glucose + oxygen → carbon dioxide + water' },
                        { label: 'oxygen + water → glucose + carbon dioxide' },
                        { label: 'glucose + water → oxygen + carbon dioxide' },
                    ],
                    explanation:
                        'Plants take in carbon dioxide and water and, using light, make glucose and release oxygen. The second option is respiration.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'What is the name of the green pigment in chloroplasts that absorbs light?',
                    objective: OBJ.chloroplasts,
                    acceptedAnswers: ['chlorophyll', 'chlorophyl'],
                    explanation:
                        'Chlorophyll absorbs mainly red and blue light and reflects green, which is why leaves look green.',
                },
                {
                    kind: 'true_false',
                    prompt: 'Plants only respire at night, when there is no light for photosynthesis.',
                    objective: OBJ.equation,
                    options: [{ label: 'True' }, { label: 'False', correct: true }],
                    explanation:
                        'Plants respire all the time. In daylight photosynthesis is usually faster, so they give out more oxygen than they use.',
                },
            ],
        },
    ],
}
