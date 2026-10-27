import type { Enums } from '@/@types/supabase/database.types'

export type QuestionKind = Enums<'question_kind'>
export type ResponseOutcome = Enums<'response_outcome'>

export interface QuestionOption {
    id: string
    label: string
    position: number
}

/** What a student receives: prompt and options, never the answer key or rubric */
export interface Question {
    id: string
    kind: QuestionKind
    prompt: string
    points: number
    position: number
    /** Boss battles: which phase the question belongs to (1-based; 1 when absent) */
    phase?: number
    options: QuestionOption[]
}

export interface QuestionKey {
    correctOptionIds: string[]
    acceptedAnswers: string[]
    caseSensitive: boolean
    explanation: string
    /** Essays / uploads: what a full-marks answer looks like (teacher-only until answers are revealed) */
    rubric: string
}

/** Teacher/editor and grading shape */
export interface KeyedQuestion extends Question {
    key: QuestionKey
}

export const questionKindLabel: Record<QuestionKind, string> = {
    single_choice: 'Multiple choice (one answer)',
    multiple_choice: 'Multiple select (all that apply)',
    true_false: 'True or false',
    short_answer: 'Short answer',
    essay: 'Essay (teacher grades)',
    file_upload: 'File upload (teacher grades)',
}

/** Question kinds the Quest Builder offers */
export const AUTHORABLE_QUESTION_KINDS: QuestionKind[] = [
    'single_choice',
    'multiple_choice',
    'true_false',
    'short_answer',
    'essay',
    'file_upload',
]

export const isChoiceKind = (kind: QuestionKind) =>
    kind === 'single_choice' || kind === 'multiple_choice' || kind === 'true_false'

/** Kinds a teacher grades by hand (the attempt waits in "awaiting review" until they do) */
export const isManuallyGraded = (kind: QuestionKind) => kind === 'essay' || kind === 'file_upload'

/** True/false questions store two options with these labels */
export const TRUE_FALSE_LABELS = ['True', 'False'] as const

export const responseOutcomeLabel: Record<ResponseOutcome, string> = {
    correct: 'Correct',
    partial: 'Partly correct',
    incorrect: 'Incorrect',
    skipped: 'Skipped',
    pending_review: 'Awaiting review',
}

export const responseOutcomeTagClass: Record<ResponseOutcome, string> = {
    correct: 'bg-success-subtle text-success border-transparent',
    partial: 'bg-warning-subtle text-warning border-transparent',
    incorrect: 'bg-error-subtle text-error border-transparent',
    skipped: 'bg-gold-subtle text-gold border-transparent',
    pending_review: 'bg-info-subtle text-info border-transparent',
}

// ── Homework uploads ──

export interface AttemptFile {
    id: string
    questionId: string
    fileName: string
    contentType: string
    sizeBytes: number
    createdAt: Date
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_FILES_PER_QUESTION = 5
