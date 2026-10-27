import { imageMarkdown, videoMarkdown } from '@/utils/media'
import { commonsImage } from '@/utils/sampleCourses'
import type { SampleCourseDefinition } from '@/@types/courses/SampleCourse'

const OBJ = {
    order: 'Name the eight planets in order from the Sun',
    gravity: 'Explain why the planets orbit the Sun',
    compare: 'Compare the inner rocky planets with the outer giant planets',
    earth: 'Describe what makes Earth special',
}

const sunAndFamily = [
    '## A star and its family',
    'Our **Solar System** is the Sun and everything that travels around it: eight planets, their moons, dwarf planets such as Pluto, and countless asteroids and comets.',
    'The **Sun** is a star — a huge ball of hot gas. It holds more than 99% of all the mass in the Solar System.',
    imageMarkdown(
        commonsImage('Planets2013.svg'),
        'The Sun and the eight planets drawn to scale by size',
        'The planets shown to scale by size (but not by distance). Image: WP, CC BY-SA 3.0, via Wikimedia Commons',
    ),
    '## The eight planets, in order',
    [
        '| # | Planet | Type | One thing to remember |',
        '| --- | --- | --- | --- |',
        '| 1 | Mercury | Rocky | Smallest planet, closest to the Sun |',
        '| 2 | Venus | Rocky | Hottest planet — its thick atmosphere traps heat |',
        '| 3 | Earth | Rocky | The only planet known to have life |',
        '| 4 | Mars | Rocky | The “red planet”, coloured by iron oxide (rust) |',
        '| 5 | Jupiter | Gas giant | Largest planet, with a storm bigger than Earth |',
        '| 6 | Saturn | Gas giant | Famous for its bright rings |',
        '| 7 | Uranus | Ice giant | Spins tipped on its side |',
        '| 8 | Neptune | Ice giant | Fastest winds in the Solar System |',
    ].join('\n'),
    '> [!TIP]\n> Remember the order with a sentence: **M**y **V**ery **E**xcellent **M**other **J**ust **S**erved **U**s **N**oodles.',
    '## Why do planets go around the Sun?',
    'The Sun’s **gravity** pulls on every planet. Each planet is also moving fast, sideways. The pull and the sideways motion together keep the planet travelling in a curved path — an **orbit** — instead of flying off into space or falling into the Sun.',
    '> [!NOTE]\n> Light from the Sun takes about **8 minutes** to reach Earth, 150 million kilometres away.',
    '## Watch: the Solar System in a few minutes',
    videoMarkdown('https://www.youtube.com/watch?v=libKVRa01L8', 'Solar System 101'),
    '*Video: “Solar System 101” by National Geographic, on YouTube.*',
].join('\n\n')

const rockyAndGiants = [
    '## Two kinds of planet',
    'The four **inner planets** — Mercury, Venus, Earth and Mars — are small and **rocky**, with solid surfaces. The four **outer planets** are **giants** made mostly of gas and ice, with no solid surface to stand on.',
    [
        '| | Inner planets | Outer planets |',
        '| --- | --- | --- |',
        '| Made of | Rock and metal | Gas (hydrogen, helium) and ice |',
        '| Size | Small | Huge |',
        '| Moons | Few or none | Many |',
        '| Rings | None | All four have rings |',
    ].join('\n'),
    '## A giant up close: Jupiter',
    imageMarkdown(
        commonsImage('Jupiter_and_its_shrunken_Great_Red_Spot.jpg'),
        'Jupiter, showing its coloured cloud bands and the Great Red Spot',
        'Jupiter photographed by the Hubble Space Telescope. The Great Red Spot is a storm wider than Earth. Image: NASA, ESA and A. Simon (Goddard Space Flight Center), public domain, via Wikimedia Commons',
    ),
    'Jupiter is so big that more than 1,000 Earths could fit inside it. Its stripes are bands of cloud blown by powerful winds.',
    '## Our home: Earth',
    imageMarkdown(
        commonsImage('The_Earth_seen_from_Apollo_17.jpg'),
        'Earth seen from space, showing Africa, Antarctica and swirling clouds',
        'Earth photographed by the Apollo 17 crew in 1972, on their way to the Moon. Image: NASA, public domain, via Wikimedia Commons',
    ),
    'Earth is special because it is the right distance from the Sun for **liquid water** to exist on its surface. It also has an atmosphere that contains oxygen and protects us from harmful radiation. As far as we know, it is the only place in the universe with life.',
    '> [!NOTE]\n> **What about Pluto?** In 2006 astronomers reclassified Pluto as a **dwarf planet**, because it hasn’t cleared other objects out of its orbit.',
].join('\n\n')

export const solarSystemSample: SampleCourseDefinition = {
    id: 'solar-system',
    subjectSlug: 'science',
    title: 'Sample: Our Solar System',
    description:
        'A ready-made space science sample: the Sun, the eight planets, orbits, and what makes Earth special. Two illustrated lessons with NASA images and a video, then a quiz. Edit anything — it’s your copy.',
    tagline: 'The planets in order, rocky worlds vs giants, and why planets orbit.',
    module: { title: 'Unit 1: Our place in space', description: 'The Sun, its planets and what keeps them in orbit.' },
    activities: [
        {
            key: 'family',
            kind: 'lesson',
            title: 'The Sun and its family',
            summary: 'The eight planets in order, and why they orbit the Sun.',
            body: sunAndFamily,
            objectives: [OBJ.order, OBJ.gravity],
            difficulty: 1,
            estimatedMinutes: 12,
        },
        {
            key: 'worlds',
            kind: 'lesson',
            title: 'Rocky worlds and giants',
            summary: 'Inner and outer planets compared, and what makes Earth special.',
            body: rockyAndGiants,
            objectives: [OBJ.compare, OBJ.earth],
            difficulty: 1,
            estimatedMinutes: 12,
            requires: ['family'],
        },
        {
            key: 'quiz',
            kind: 'quiz',
            title: 'Solar System check',
            summary: 'Six questions on the planets and their orbits.',
            objectives: [OBJ.order, OBJ.gravity, OBJ.compare, OBJ.earth],
            difficulty: 1,
            estimatedMinutes: 8,
            requires: ['worlds'],
            questions: [
                {
                    kind: 'single_choice',
                    prompt: 'Which planet is closest to the Sun?',
                    objective: OBJ.order,
                    options: [
                        { label: 'Venus' },
                        { label: 'Mercury', correct: true },
                        { label: 'Mars' },
                        { label: 'Earth' },
                    ],
                    explanation: 'Mercury is the first planet from the Sun.',
                },
                {
                    kind: 'short_answer',
                    prompt: 'What is the largest planet in the Solar System?',
                    objective: OBJ.order,
                    acceptedAnswers: ['Jupiter'],
                    explanation:
                        'Jupiter, the fifth planet, is the largest — more than 1,000 Earths could fit inside it.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'What keeps the planets moving in orbit around the Sun?',
                    objective: OBJ.gravity,
                    options: [
                        { label: 'The Sun’s gravity', correct: true },
                        { label: 'The solar wind pushing them' },
                        { label: 'Magnetism' },
                        { label: 'Nothing — they would orbit anyway' },
                    ],
                    explanation:
                        'The Sun’s gravity pulls on each planet while the planet moves sideways, so it follows a curved orbit.',
                },
                {
                    kind: 'multiple_choice',
                    prompt: 'Which of these are rocky inner planets? Select all that apply.',
                    objective: OBJ.compare,
                    options: [
                        { label: 'Mars', correct: true },
                        { label: 'Venus', correct: true },
                        { label: 'Saturn' },
                        { label: 'Earth', correct: true },
                        { label: 'Neptune' },
                    ],
                    explanation:
                        'The inner rocky planets are Mercury, Venus, Earth and Mars. Saturn and Neptune are giants.',
                },
                {
                    kind: 'true_false',
                    prompt: 'Venus is hotter than Mercury, even though Mercury is closer to the Sun.',
                    objective: OBJ.compare,
                    options: [{ label: 'True', correct: true }, { label: 'False' }],
                    explanation: 'Venus’s thick carbon dioxide atmosphere traps heat, making it the hottest planet.',
                },
                {
                    kind: 'single_choice',
                    prompt: 'Why can liquid water exist on Earth’s surface?',
                    objective: OBJ.earth,
                    options: [
                        {
                            label: 'Earth is the right distance from the Sun — not too hot, not too cold',
                            correct: true,
                        },
                        { label: 'Earth is the largest rocky planet' },
                        { label: 'Earth has rings that hold the water' },
                        { label: 'Earth is the closest planet to the Sun' },
                    ],
                    explanation: 'Earth orbits at a distance where temperatures let water stay liquid.',
                },
            ],
        },
    ],
}
