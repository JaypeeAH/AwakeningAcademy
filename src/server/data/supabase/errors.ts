import 'server-only'
import type { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js'
import { AppError, ConflictError, DataError, NotFoundError, ServiceUnavailableError } from '@/@types/errors'

/** A database failure we don't have a friendlier error for (502: the dependency failed, not the request). */
export class DatabaseError extends AppError {
    constructor(message: string, extra?: Record<string, unknown>) {
        super(message, 502, 'DATABASE_ERROR', extra)
    }
}

/**
 * Messages raised by our SQL functions (`raise exception 'CODE'`) → typed errors with student/teacher-
 * friendly wording. Anything else becomes a DatabaseError (details logged, not sent to the browser).
 */
const KNOWN_ERRORS: Record<string, () => AppError> = {
    MAX_ATTEMPTS: () => new ConflictError('You have used all the attempts for this activity.', 'MAX_ATTEMPTS'),
    ATTEMPT_NOT_FOUND: () => new NotFoundError('That attempt doesn’t exist or isn’t yours.', 'ATTEMPT_NOT_FOUND'),
    STUDENT_NOT_FOUND: () => new NotFoundError('That student doesn’t exist.', 'STUDENT_NOT_FOUND'),
    NOT_A_LESSON: () => new DataError('Only lessons can be completed this way.', 'NOT_A_LESSON'),
    NOT_AN_ASSESSMENT: () => new DataError('This activity has no questions to attempt.', 'NOT_AN_ASSESSMENT'),
    INVALID_XP_AMOUNT: () => new DataError('XP amounts must be a non-zero whole number.', 'INVALID_XP_AMOUNT'),
    NEGATIVE_XP_NOT_ALLOWED: () => new DataError('Only manual adjustments can remove XP.', 'NEGATIVE_XP_NOT_ALLOWED'),
    XP_BALANCE_NEGATIVE: () => new ConflictError('That would take the student’s XP below zero.', 'XP_BALANCE_NEGATIVE'),
    ACTIVITY_NOT_FOUND: () => new NotFoundError('That activity no longer exists.', 'ACTIVITY_NOT_FOUND'),
    QUESTION_HAS_RESPONSES: () =>
        new ConflictError(
            'Students have already answered a question you removed, so it can’t be deleted. You can still edit its wording, options and answer — or archive this activity and create a new one.',
            'QUESTION_HAS_RESPONSES',
        ),
    QUESTION_BELONGS_ELSEWHERE: () =>
        new DataError('A question in this save belongs to another activity.', 'INVALID_QUESTION'),
    OPTION_BELONGS_ELSEWHERE: () =>
        new DataError('An option in this save belongs to another question.', 'INVALID_OPTION'),
    CORRECT_OPTION_UNKNOWN: () =>
        new DataError('A correct answer must be one of the question’s options.', 'INVALID_KEY'),
    INVALID_PREREQUISITE: () =>
        new DataError('Prerequisites must be other activities in the same course.', 'INVALID_PREREQUISITE'),
    TIME_UP: () => new ConflictError('Time is up for this attempt.', 'TIME_UP'),
    AWAITING_REVIEW: () =>
        new ConflictError('Your last attempt is still waiting for your teacher to mark it.', 'AWAITING_REVIEW'),
    ATTEMPT_NOT_GRADABLE: () => new ConflictError('That attempt can’t be marked right now.', 'ATTEMPT_NOT_GRADABLE'),
    GRADE_MISMATCH: () => new DataError('The marks don’t match the attempt’s questions.', 'GRADE_MISMATCH'),
    POINTS_OUT_OF_RANGE: () =>
        new DataError('Points must be between 0 and the question’s maximum.', 'POINTS_OUT_OF_RANGE'),
    ATTEMPT_CLOSED: () => new ConflictError('This attempt has already been handed in.', 'ATTEMPT_CLOSED'),
    QUESTION_NOT_IN_ATTEMPT: () => new NotFoundError('That question isn’t in this attempt.', 'QUESTION_NOT_IN_ATTEMPT'),
    QUESTION_SKIPPED: () =>
        new ConflictError('That question was skipped with an Easter Bunny, so it isn’t marked.', 'QUESTION_SKIPPED'),
    // Phase 3: inventory, skills and secrets
    INVALID_ITEM_AMOUNT: () => new DataError('Item amounts must be a non-zero whole number.', 'INVALID_ITEM_AMOUNT'),
    NOT_ENOUGH_CHARGES: () => new ConflictError('You don’t have any of those left.', 'NOT_ENOUGH_CHARGES'),
    SKIPS_NOT_ALLOWED: () =>
        new ConflictError(
            'The Easter Bunny can’t help on this activity — every question counts here.',
            'SKIPS_NOT_ALLOWED',
        ),
    SECRET_NOT_FOUND: () =>
        new NotFoundError('That secret doesn’t exist (or is hidden right now).', 'SECRET_NOT_FOUND'),
    SKILL_NOT_AVAILABLE: () => new NotFoundError('That skill isn’t available right now.', 'SKILL_NOT_AVAILABLE'),
    SKILL_LOCKED: () => new ConflictError('You haven’t unlocked that skill yet. Keep levelling up!', 'SKILL_LOCKED'),
    SKILL_NOT_ELIGIBLE: () =>
        new ConflictError('That skill can’t be used on this kind of activity.', 'SKILL_NOT_ELIGIBLE'),
    SKILLS_NOT_ALLOWED: () =>
        new ConflictError('Your teacher has turned skills off for this activity.', 'SKILLS_NOT_ALLOWED'),
    NO_CHARGES: () => new ConflictError('That skill is recharging. Check back later!', 'NO_CHARGES'),
    // Phase 4: streaks, achievements, guilds
    NOTHING_TO_SHIELD: () => new ConflictError('There’s no missed day to protect right now.', 'NOTHING_TO_SHIELD'),
    ACHIEVEMENT_NOT_FOUND: () => new NotFoundError('That achievement isn’t available.', 'ACHIEVEMENT_NOT_FOUND'),
    GUILD_NOT_FOUND: () => new NotFoundError('That guild doesn’t exist or isn’t active.', 'GUILD_NOT_FOUND'),
}

export function toAppError(error: PostgrestError | Error, context: string): AppError {
    const message = error.message ?? ''
    const known = Object.keys(KNOWN_ERRORS).find((code) => message.includes(code))
    if (known) return KNOWN_ERRORS[known]()

    const code = 'code' in error ? error.code : undefined
    if (code === '23505') return new ConflictError('That already exists.', 'DUPLICATE')
    if (code === '23503') return new DataError('That refers to something that doesn’t exist.', 'INVALID_REFERENCE')
    if (code === '23514' || code === '22023' || code === '22P02') {
        return new DataError('Some of the values aren’t allowed. Check the form and try again.', 'INVALID_DATA')
    }
    if (code === 'PGRST301' || /fetch failed|ECONNREFUSED|ENOTFOUND/i.test(message)) {
        return new ServiceUnavailableError('The database can’t be reached right now. Please try again shortly.')
    }
    console.error(`[db] ${context}:`, error)
    return new DatabaseError(`Couldn’t ${context}. Please try again.`)
}

/** Supabase responses (or a hand-made `{ data, error: null }` for skipped queries) */
type SupabaseResult<T> = PostgrestSingleResponse<T> | { data: T; error: null }

/**
 * Unwraps a Supabase response that must have data (lists, `.single()`, inserts with `.select()`):
 * throws a typed error, otherwise returns the data. `context` completes "Couldn’t …" in the message the
 * user sees (e.g. 'load the course').
 */
export function unwrap<T>(result: SupabaseResult<T>, context: string): T {
    if (result.error) throw toAppError(result.error, context)
    if (result.data === null) throw toAppError(new Error('No data returned'), context)
    return result.data
}

/** For `.maybeSingle()` and writes without `.select()`: null when there is no row. */
export function unwrapMaybe<T>(result: SupabaseResult<T>, context: string): T | null {
    if (result.error) throw toAppError(result.error, context)
    return result.data
}

/** For writes whose result isn't needed: throws a typed error on failure. */
export function check(result: { error: PostgrestError | null }, context: string): void {
    if (result.error) throw toAppError(result.error, context)
}
