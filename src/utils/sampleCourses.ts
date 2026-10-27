import { SaveActivitySchema, type QuestionInput, type SaveActivityInput } from '@/@types/activities/ActivitySchema'
import { parseVideoUrl } from './media'
import type {
    SampleActivity,
    SampleActivityKind,
    SampleCourseDefinition,
    SampleCourseSummary,
    SampleQuestion,
} from '@/@types/courses/SampleCourse'

/*
 * Turns a sample course definition (configs/sampleCourses) into the same inputs the Quest Builder sends,
 * so adding a sample goes through the normal save + publish checks. Ids are made fresh on every add, so
 * each copy is independent.
 */

/** Where sample lesson pictures come from (all openly licensed, credited in each caption) */
export const SAMPLE_IMAGE_HOSTS = ['commons.wikimedia.org', 'upload.wikimedia.org']

/** A Wikimedia Commons file, resized by Commons (SVG diagrams arrive as PNG) */
export const commonsImage = (fileName: string, width = 800) =>
    `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}`

const MARKDOWN_IMAGE = /!\[[^\]]*\]\((\S+?)(?:\s+"[^"]*")?\)/g

/** Image and video links in lesson Markdown (videos use image syntax too) */
export function lessonMedia(markdown: string) {
    const images: string[] = []
    const videos: string[] = []
    for (const match of markdown.matchAll(MARKDOWN_IMAGE)) {
        if (parseVideoUrl(match[1])) videos.push(match[1])
        else images.push(match[1])
    }
    return { images, videos }
}

/** Kind defaults, matching what a new activity of that kind starts with */
const KIND_SETTINGS: Record<
    SampleActivityKind,
    Pick<SaveActivityInput, 'passingScore' | 'maxAttempts' | 'feedbackMode' | 'allowSkills'>
> = {
    lesson: { passingScore: 0, maxAttempts: null, feedbackMode: 'immediate', allowSkills: false },
    quiz: { passingScore: 60, maxAttempts: 3, feedbackMode: 'immediate', allowSkills: true },
    boss_battle: { passingScore: 70, maxAttempts: 3, feedbackMode: 'immediate', allowSkills: false },
}

export function sampleQuestionToInput(question: SampleQuestion, newId: () => string): QuestionInput {
    const options =
        question.kind === 'short_answer'
            ? []
            : (question.kind === 'true_false' && !question.options
                  ? [{ label: 'True' }, { label: 'False' }]
                  : (question.options ?? [])
              ).map((o) => ({ id: newId(), label: o.label, correct: !!o.correct }))
    return {
        id: newId(),
        kind: question.kind,
        prompt: question.prompt,
        points: question.points ?? 1,
        ...(question.phase ? { phase: question.phase } : {}),
        objective: question.objective,
        options: options.map(({ id, label }) => ({ id, label })),
        key: {
            correctOptionIds: options.filter((o) => o.correct).map((o) => o.id),
            acceptedAnswers: question.acceptedAnswers ?? [],
            caseSensitive: false,
            explanation: question.explanation,
            rubric: '',
        },
    }
}

/** The Quest Builder save for one sample activity */
export function sampleActivityToSaveInput(
    activity: SampleActivity,
    context: { xpReward: number; moduleId: string | null; prerequisiteIds: string[]; newId: () => string },
): SaveActivityInput {
    return SaveActivitySchema.parse({
        title: activity.title,
        summary: activity.summary,
        body: activity.body ?? '',
        objectives: activity.objectives,
        moduleId: context.moduleId,
        difficulty: activity.difficulty,
        xpReward: context.xpReward,
        estimatedMinutes: activity.estimatedMinutes,
        ...KIND_SETTINGS[activity.kind],
        allowBunnySkips: false,
        xpRepeatable: false,
        prerequisiteIds: context.prerequisiteIds,
        questions: (activity.questions ?? []).map((q) => sampleQuestionToInput(q, context.newId)),
        boss: activity.kind === 'boss_battle' ? (activity.boss ?? null) : null,
        teamConfig: null,
    })
}

export function summarizeSampleCourse(sample: SampleCourseDefinition): SampleCourseSummary {
    const media = sample.activities.map((a) => lessonMedia(a.body ?? ''))
    const count = (kind: SampleActivityKind) => sample.activities.filter((a) => a.kind === kind).length
    return {
        id: sample.id,
        subjectSlug: sample.subjectSlug,
        title: sample.title,
        description: sample.description,
        tagline: sample.tagline,
        lessonCount: count('lesson'),
        quizCount: count('quiz'),
        bossCount: count('boss_battle'),
        questionCount: sample.activities.reduce((n, a) => n + (a.questions?.length ?? 0), 0),
        imageCount: media.reduce((n, m) => n + m.images.length, 0),
        videoCount: media.reduce((n, m) => n + m.videos.length, 0),
        activityTitles: sample.activities.map((a) => a.title),
    }
}
