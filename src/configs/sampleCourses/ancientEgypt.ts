import { imageMarkdown, videoMarkdown } from '@/utils/media'
import { commonsImage } from '@/utils/sampleCourses'
import type { SampleCourseDefinition } from '@/@types/courses/SampleCourse'

const OBJ = {
    nile: 'Explain why the Nile was vital to Ancient Egypt',
    seasons: 'Describe the yearly flood and the three farming seasons',
    pharaohs: 'Describe who the pharaohs were and why pyramids were built',
    hieroglyphs: 'Explain how hieroglyphs were deciphered',
}

const giftOfTheNile = [
    '## A river in the desert',
    'Egypt is mostly desert. Yet one of the world’s first great civilisations grew there more than 5,000 years ago. The reason is the **Nile**, the longest river in Africa, flowing north to the Mediterranean Sea.',
    imageMarkdown(
        commonsImage('Nile_River_and_delta_from_orbit.jpg'),
        'Satellite photo of the Nile as a green strip through brown desert, spreading into a triangular delta',
        'The Nile from space: a thin green line of farmland through the desert, opening into the delta. Image: Jacques Descloitres, MODIS Rapid Response Team, NASA, public domain, via Wikimedia Commons',
    ),
    'The Greek historian Herodotus called Egypt **“the gift of the Nile”**. Almost everyone lived along its banks, where the land could be farmed.',
    '## The flood that brought life',
    'Every summer, rains far to the south made the Nile rise and spill over its banks. When the water went down it left a layer of rich black mud — perfect for growing crops. Egyptians called their land **Kemet**, “the black land”.',
    [
        '| Season | Months (roughly) | What happened |',
        '| --- | --- | --- |',
        '| Akhet — the flood | June to September | The river covered the fields; farmers worked on building projects |',
        '| Peret — growing | October to February | Seeds were sown in the wet, fertile soil |',
        '| Shemu — harvest | March to May | Wheat and barley were harvested before the next flood |',
    ].join('\n'),
    '> [!NOTE]\n> **Upper Egypt** is in the south and **Lower Egypt** is in the north. It sounds backwards, but the names follow the river: the Nile flows from the higher land in the south down to the sea in the north. Around 3100 BCE the two lands were united under one king.',
    '## The Nile as a highway',
    'The river carried boats loaded with grain, stone and people. Sailing south was easy because the wind usually blows from the north; travelling north, boats simply floated with the current.',
    '## Watch: Ancient Egypt',
    videoMarkdown('https://www.youtube.com/watch?v=Z3Wvw6BivVI', 'Ancient Egypt: Crash Course World History #4'),
    '*Video: “Ancient Egypt: Crash Course World History #4” by CrashCourse, on YouTube.*',
].join('\n\n')

const pyramidsAndHieroglyphs = [
    '## Pharaohs: god-kings',
    'Egypt was ruled by a **pharaoh**. Egyptians believed the pharaoh was a link between the gods and the people, responsible for keeping order — called **ma’at** — in the world.',
    'Egyptians also believed in life after death. A pharaoh’s body was preserved as a **mummy** and buried with everything needed for the afterlife.',
    '## The pyramids of Giza',
    imageMarkdown(
        commonsImage('All_Gizah_Pyramids.jpg'),
        'The three large pyramids of Giza in the desert',
        'The pyramids of Giza. The Great Pyramid was built for the pharaoh Khufu around 2560 BCE. Image: Ricardo Liberato, CC BY-SA 2.0, via Wikimedia Commons',
    ),
    'The **Great Pyramid** was built as Khufu’s tomb from about 2.3 million stone blocks. At about 146 metres tall it was the tallest human-made structure on Earth for more than 3,800 years.',
    '> [!IMPORTANT]\n> Archaeologists have found the villages, bakeries and tombs of the pyramid builders. They were organised teams of workers who were fed and housed — not the enslaved crowds of old films.',
    '## Writing with pictures',
    'Egyptians wrote with **hieroglyphs** — around 700 signs, some standing for sounds and some for whole ideas. Scribes trained for years to learn them. For everyday writing they used a faster script.',
    'For centuries after Ancient Egypt ended, nobody could read hieroglyphs. Then, in 1799, French soldiers found a stone near the town of Rosetta.',
    imageMarkdown(
        commonsImage('Rosetta_Stone.JPG'),
        'The Rosetta Stone, a dark slab carved with three blocks of writing',
        'The Rosetta Stone, now in the British Museum. Image: Hans Hillewaert, CC BY-SA 4.0, via Wikimedia Commons',
    ),
    'The **Rosetta Stone** carries the same decree from 196 BCE in three scripts: **hieroglyphs**, **Demotic** (everyday Egyptian writing) and **ancient Greek**. Scholars could already read Greek, so they used it as a key. In 1822 **Jean-François Champollion** announced he had cracked the code.',
    '> [!TIP]\n> Think of the Rosetta Stone as a three-language dictionary page: if you can read one version, you can work out the others.',
].join('\n\n')

export const ancientEgyptSample: SampleCourseDefinition = {
    id: 'ancient-egypt',
    subjectSlug: 'history',
    title: 'Sample: Ancient Egypt',
    description:
        'A ready-made history sample: why the Nile mattered, the farming year, pharaohs and pyramids, and how hieroglyphs were decoded. Two illustrated lessons with a video, then a quiz. Edit anything — it’s your copy.',
    tagline: 'The Nile, the pyramids of Giza and the Rosetta Stone.',
    module: {
        title: 'Unit 1: Life on the Nile',
        description: 'How a river shaped one of the first great civilisations.',
    },
    activities: [
        {
            key: 'nile',
            kind: 'lesson',
            title: 'The gift of the Nile',
            summary: 'Why a river in the desert made Egypt possible.',
            body: giftOfTheNile,
            objectives: [OBJ.nile, OBJ.seasons],
            difficulty: 1,
            estimatedMinutes: 12,
        },
        {
            key: 'pyramids',
            kind: 'lesson',
            title: 'Pyramids, pharaohs and hieroglyphs',
            summary: 'God-kings, giant tombs, and the stone that unlocked a lost script.',
            body: pyramidsAndHieroglyphs,
            objectives: [OBJ.pharaohs, OBJ.hieroglyphs],
            difficulty: 2,
            estimatedMinutes: 15,
            requires: ['nile'],
        },
        {
            key: 'quiz',
            kind: 'quiz',
            title: 'Ancient Egypt check',
            summary: 'Six questions on the Nile, the pyramids and hieroglyphs.',
            objectives: [OBJ.nile, OBJ.seasons, OBJ.pharaohs, OBJ.hieroglyphs],
            difficulty: 2,
            estimatedMinutes: 10,
            requires: ['pyramids'],
            questions: [
                {
                    kind: 'single_choice',
                    prompt: 'Why did most Ancient Egyptians live along the Nile?',
                    objective: OBJ.nile,
                    options: [
                        { label: 'Its floods left fertile soil for farming in a desert land', correct: true },
                        { label: 'It was the only place safe from wild animals' },
                        { label: 'The pharaoh banned living anywhere else' },
                        { label: 'It was cooler near the sea' },
                    ],
                    explanation: 'The yearly flood left rich black mud. Away from the river was desert.',
                },
                {
                    kind: 'true_false',
                    prompt: 'Upper Egypt is in the north of the country.',
                    objective: OBJ.nile,
                    options: [{ label: 'True' }, { label: 'False', correct: true }],
                    explanation:
                        'Upper Egypt is in the south — upstream, where the land is higher. The Nile flows north.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'During Akhet, the flood season, what did many farmers do?',
                    objective: OBJ.seasons,
                    options: [
                        { label: 'Harvested wheat' },
                        { label: 'Worked on building projects while their fields were under water', correct: true },
                        { label: 'Planted seeds in dry soil' },
                        { label: 'Moved to the desert' },
                    ],
                    explanation:
                        'With the fields flooded, farmers were free to work on projects such as temples and pyramids.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'Which pharaoh was the Great Pyramid of Giza built for?',
                    objective: OBJ.pharaohs,
                    acceptedAnswers: ['Khufu', 'Cheops', 'King Khufu', 'Pharaoh Khufu'],
                    explanation: 'It was built for Khufu (called Cheops by the Greeks) around 2560 BCE.',
                },
                {
                    kind: 'multiple_choice',
                    prompt: 'Which scripts are carved on the Rosetta Stone? Select all that apply.',
                    objective: OBJ.hieroglyphs,
                    options: [
                        { label: 'Hieroglyphs', correct: true },
                        { label: 'Demotic', correct: true },
                        { label: 'Ancient Greek', correct: true },
                        { label: 'Latin' },
                    ],
                    explanation:
                        'The same decree appears in hieroglyphs, Demotic and ancient Greek — the Greek made decoding possible.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'Who announced in 1822 that he had deciphered hieroglyphs?',
                    objective: OBJ.hieroglyphs,
                    options: [
                        { label: 'Herodotus' },
                        { label: 'Jean-François Champollion', correct: true },
                        { label: 'Howard Carter' },
                        { label: 'Napoleon Bonaparte' },
                    ],
                    explanation: 'Champollion used the Greek text as a key to work out the hieroglyphs.',
                },
            ],
        },
    ],
}
