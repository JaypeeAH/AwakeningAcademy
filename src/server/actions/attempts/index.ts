import 'server-only'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { check, toAppError, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import {
    createSubmissionUploadUrl,
    downloadSubmission,
    getSubmissionUrl,
    removeSubmissions,
} from '@/server/data/supabase/storage'
import { isCourseTeacher } from '@/server/actions/courses/access'
import { assertPlayable, requireActivityTeacher, requireStudentQuest } from '@/server/actions/activities'
import { finalizeAttempt, finalizeExpiredAttempts, loadQuestions, readDraft } from './finalize'
import { afterLearning } from '@/server/actions/progression/afterLearning'
import { getAttemptPowers } from '@/server/actions/skills'
import {
    mapActivity,
    mapAttempt,
    mapAttemptFile,
    mapKeyedQuestion,
    mapQuestion,
    mapResponse,
} from '@/server/actions/activities/mappers'
import { canRevealAnswers } from '@/utils/feedback'
import {
    ALLOWED_FILE_TYPES,
    UPLOAD_TYPES_DESCRIPTION,
    checkUpload,
    fileExtension,
    safeFileName,
} from '@/utils/fileTypes'
import { isPastGrace } from '@/utils/timing'
import { ConflictError, DataError, NotFoundError } from '@/@types/errors'
import { isAssessment } from '@/@types/activities/ActivityKindOptions'
import { MAX_FILES_PER_QUESTION, MAX_UPLOAD_BYTES, type AttemptFile } from '@/@types/activities/Question'
import type { Json, Tables } from '@/@types/supabase/database.types'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { AttemptResult, AttemptSession, FeedbackEntry } from '@/@types/attempts/Attempt'
import type {
    ConfirmUploadInput,
    PrepareUploadInput,
    ResponseInput,
    SubmitAttemptInput,
} from '@/@types/attempts/AttemptSchema'
import type { ActivityResults, ActivityStudentResult, QuestionStat } from '@/@types/activities/Activity'

async function findAttempt(attemptId: string) {
    return unwrapMaybe(
        await supabaseAdmin().from('attempts').select('*').eq('id', attemptId).maybeSingle(),
        'load the attempt',
    )
}

/** The student's own attempt — 404 for anyone else's */
async function requireOwnAttempt(user: SessionUser, attemptId: string) {
    const attempt = await findAttempt(attemptId)
    if (!attempt || attempt.student_id !== user.id) {
        throw new NotFoundError('That attempt doesn’t exist or isn’t yours.', 'ATTEMPT_NOT_FOUND')
    }
    return attempt
}

/** An attempt that can still take answers (in progress, time not up) */
function assertOpen(attempt: Tables<'attempts'>) {
    if (attempt.status !== 'in_progress')
        throw new ConflictError('This attempt has already been handed in.', 'ATTEMPT_CLOSED')
    if (isPastGrace(attempt.expires_at ? new Date(attempt.expires_at) : null)) {
        throw new ConflictError('Time is up for this attempt — your saved answers have been handed in.', 'TIME_UP')
    }
}

async function getAttemptFiles(attemptIds: string[]): Promise<AttemptFile[]> {
    if (!attemptIds.length) return []
    return unwrap(
        await supabaseAdmin().from('attempt_files').select('*').in('attempt_id', attemptIds).order('created_at'),
        'load uploaded files',
    ).map(mapAttemptFile)
}

// ── Taking an attempt ─────────────────────────────────────────────────────────────────────────────

/**
 * Starts (or resumes) an attempt. Questions come without answer keys; the autosaved draft and any
 * uploaded files come back so a refresh — or another device — picks up where the student left off.
 */
export async function startAttempt(user: SessionUser, activityId: string): Promise<AttemptSession> {
    await finalizeExpiredAttempts({ studentId: user.id, activityId })
    const { row, quest } = await requireStudentQuest(user, activityId)
    if (!isAssessment(row.kind)) throw new DataError('This activity has no questions to attempt.', 'NOT_AN_ASSESSMENT')
    if (quest.state === 'in_review') {
        throw new ConflictError(
            'Your teacher is marking your last attempt. You can try again once it’s marked.',
            'AWAITING_REVIEW',
        )
    }
    assertPlayable(quest)

    const result = await supabaseAdmin().rpc('start_attempt', { p_student_id: user.id, p_activity_id: activityId })
    if (result.error) throw toAppError(result.error, 'start the attempt')
    const attempt = mapAttempt(result.data)
    const [questions, files, powers] = await Promise.all([
        loadQuestions(activityId, false),
        getAttemptFiles([attempt.id]),
        getAttemptPowers(user.id, result.data, row),
    ])
    return {
        attempt,
        questions: questions.map(mapQuestion),
        attemptsLeft:
            quest.attemptsLeft === null
                ? null
                : Math.max(0, quest.attemptsLeft - (quest.state === 'in_progress' ? 0 : 1)),
        draft: readDraft(result.data.draft_responses),
        files,
        serverNow: new Date(),
        powers,
    }
}

/** Autosave: keeps the student's current answers on the attempt (used if time runs out) */
export async function saveAttemptDraft(user: SessionUser, attemptId: string, responses: ResponseInput[]) {
    const result = await supabaseAdmin().rpc('save_attempt_draft', {
        p_attempt_id: attemptId,
        p_student_id: user.id,
        p_responses: responses as unknown as Json,
    })
    if (result.error) throw toAppError(result.error, 'save your answers')
    return { savedAt: new Date(result.data) }
}

/**
 * Grades on the server (answer keys never leave it) and records everything in one transaction.
 * Submitting the same attempt twice returns the first result without new rewards. If time ran out,
 * the answers autosaved before the deadline are what count — the server is the clock.
 */
export async function submitAttempt(
    user: SessionUser,
    attemptId: string,
    input: SubmitAttemptInput,
): Promise<AttemptResult> {
    const attempt = await requireOwnAttempt(user, attemptId)
    if (attempt.status !== 'in_progress')
        return { ...(await getAttemptResult(user, attemptId)), alreadySubmitted: true }

    // Still enrolled and the activity still published
    const { row: activity } = await requireStudentQuest(user, attempt.activity_id)

    const late = isPastGrace(attempt.expires_at ? new Date(attempt.expires_at) : null)
    const outcome = await finalizeAttempt(
        attempt,
        activity,
        late ? readDraft(attempt.draft_responses) : input.responses,
    )
    const result = await getAttemptResult(user, attemptId)
    if (outcome.alreadySubmitted) return { ...result, alreadySubmitted: true }
    return {
        ...result,
        reward: outcome.reward,
        submittedLate: late,
        ...(await afterLearning(user.id, { learned: true })),
    }
}

// ── Homework uploads ──────────────────────────────────────────────────────────────────────────────

const uploadFolder = (attempt: Tables<'attempts'>) => `${attempt.activity_id}/${attempt.student_id}/${attempt.id}/`

async function requireUploadQuestion(attempt: Tables<'attempts'>, questionId: string) {
    const db = supabaseAdmin()
    const question = unwrapMaybe(
        await db
            .from('questions')
            .select('id, kind')
            .eq('id', questionId)
            .eq('activity_id', attempt.activity_id)
            .maybeSingle(),
        'check the question',
    )
    if (!question || question.kind !== 'file_upload') {
        throw new DataError('That question doesn’t take file uploads.', 'NOT_UPLOAD_QUESTION')
    }
    const existing = await db
        .from('attempt_files')
        .select('id', { count: 'exact', head: true })
        .eq('attempt_id', attempt.id)
        .eq('question_id', questionId)
    if ((existing.count ?? 0) >= MAX_FILES_PER_QUESTION) {
        throw new ConflictError(
            `You can upload up to ${MAX_FILES_PER_QUESTION} files for each question. Remove one first.`,
            'TOO_MANY_FILES',
        )
    }
}

/**
 * Step 1 of an upload: checks the attempt, question, file type and size, then returns a one-time URL
 * the browser sends the file to directly (so big files never hit our functions' body limit).
 */
export async function prepareAttemptUpload(user: SessionUser, attemptId: string, input: PrepareUploadInput) {
    const attempt = await requireOwnAttempt(user, attemptId)
    assertOpen(attempt)
    await requireUploadQuestion(attempt, input.questionId)
    const allowed = ALLOWED_FILE_TYPES[fileExtension(input.fileName)]
    if (!allowed) {
        throw new DataError(`That type of file can’t be uploaded. Use ${UPLOAD_TYPES_DESCRIPTION}.`, 'INVALID_FILE')
    }
    if (input.sizeBytes > MAX_UPLOAD_BYTES)
        throw new DataError('That file is too big. The limit is 10 MB.', 'INVALID_FILE')

    const path = `${uploadFolder(attempt)}${randomUUID()}-${safeFileName(input.fileName)}`
    return { path, uploadUrl: await createSubmissionUploadUrl(path), contentType: allowed.contentType }
}

/**
 * Step 2: after the browser uploaded, the server reads the file back, checks its bytes really match its
 * type (a renamed script or web page is rejected and deleted), and attaches it to the answer.
 */
export async function confirmAttemptUpload(
    user: SessionUser,
    attemptId: string,
    input: ConfirmUploadInput,
): Promise<AttemptFile> {
    const attempt = await requireOwnAttempt(user, attemptId)
    assertOpen(attempt)
    if (!input.path.startsWith(uploadFolder(attempt)) || input.path.includes('..')) {
        throw new DataError('That upload doesn’t belong to this attempt.', 'INVALID_FILE')
    }
    await requireUploadQuestion(attempt, input.questionId)

    const bytes = await downloadSubmission(input.path)
    if (!bytes) throw new DataError('The upload didn’t arrive. Please try again.', 'UPLOAD_MISSING')
    const fileName = safeFileName(input.fileName)
    const checked = checkUpload(fileName, bytes, MAX_UPLOAD_BYTES)
    if (!checked.ok) {
        await removeSubmissions([input.path])
        throw new DataError(checked.reason, 'INVALID_FILE')
    }
    const inserted = await supabaseAdmin()
        .from('attempt_files')
        .insert({
            attempt_id: attemptId,
            question_id: input.questionId,
            student_id: user.id,
            storage_path: input.path,
            file_name: fileName,
            content_type: checked.contentType,
            size_bytes: bytes.length,
        })
        .select('*')
        .single()
    if (inserted.error) {
        if (inserted.error.code !== '23505') await removeSubmissions([input.path])
        throw toAppError(inserted.error, 'save the upload')
    }
    return mapAttemptFile(inserted.data)
}

export async function deleteAttemptFile(user: SessionUser, attemptId: string, fileId: string) {
    const attempt = await requireOwnAttempt(user, attemptId)
    assertOpen(attempt)
    const db = supabaseAdmin()
    const file = unwrapMaybe(
        await db.from('attempt_files').select('*').eq('id', fileId).eq('attempt_id', attemptId).maybeSingle(),
        'find the file',
    )
    if (!file) throw new NotFoundError('That file doesn’t exist.', 'FILE_NOT_FOUND')
    check(await db.from('attempt_files').delete().eq('id', fileId), 'remove the file')
    await removeSubmissions([file.storage_path])
}

/** A one-minute download link for the student who uploaded the file or a teacher of the course */
export async function getFileDownloadUrl(user: SessionUser, fileId: string) {
    const db = supabaseAdmin()
    const file = unwrapMaybe(await db.from('attempt_files').select('*').eq('id', fileId).maybeSingle(), 'find the file')
    if (!file) throw new NotFoundError('That file doesn’t exist.', 'FILE_NOT_FOUND')
    if (file.student_id !== user.id) {
        const attempt = await findAttempt(file.attempt_id)
        const activity = attempt
            ? unwrapMaybe(
                  await db.from('activities').select('course_id').eq('id', attempt.activity_id).maybeSingle(),
                  'check access',
              )
            : null
        if (!activity || !(await isCourseTeacher(user, activity.course_id))) {
            throw new NotFoundError('That file doesn’t exist.', 'FILE_NOT_FOUND')
        }
    }
    return getSubmissionUrl(file.storage_path, file.file_name)
}

// ── Results ───────────────────────────────────────────────────────────────────────────────────────

/**
 * A submitted attempt: the student's own, or any attempt in a course the user teaches. Teacher feedback
 * is always included; answer keys (correct options, explanations, rubrics) only when the activity's
 * feedback mode allows — teachers always see them.
 */
export async function getAttemptResult(user: SessionUser, attemptId: string): Promise<AttemptResult> {
    const db = supabaseAdmin()
    const attemptRow = await findAttempt(attemptId)
    if (!attemptRow) throw new NotFoundError('That attempt doesn’t exist.', 'ATTEMPT_NOT_FOUND')
    const activity = unwrap(
        await db.from('activities').select('*').eq('id', attemptRow.activity_id).single(),
        'load the activity',
    )

    const isOwner = attemptRow.student_id === user.id
    const isTeacher = !isOwner && (await isCourseTeacher(user, activity.course_id))
    if (!isOwner && !isTeacher) throw new NotFoundError('That attempt doesn’t exist.', 'ATTEMPT_NOT_FOUND')
    if (attemptRow.status === 'in_progress')
        throw new ConflictError('This attempt hasn’t been submitted yet.', 'ATTEMPT_IN_PROGRESS')

    const dueAt = activity.due_at ? new Date(activity.due_at) : null
    const answersRevealed = canRevealAnswers(activity.feedback_mode, dueAt, { isTeacher })
    const [questionRows, responses, files] = await Promise.all([
        loadQuestions(activity.id, answersRevealed),
        db.from('attempt_responses').select('*').eq('attempt_id', attemptId),
        getAttemptFiles([attemptId]),
    ])
    const responseRows = unwrap(responses, 'load the answers')
    const answered = questionRows.filter((q) => responseRows.some((r) => r.question_id === q.id))

    return {
        attempt: mapAttempt(attemptRow),
        activity: {
            id: activity.id,
            title: activity.title,
            kind: activity.kind,
            passingScore: activity.passing_score,
            feedbackMode: activity.feedback_mode,
            dueAt,
            courseId: activity.course_id,
        },
        questions: (answered.length ? answered : questionRows).map((q) => {
            const response = responseRows.find((r) => r.question_id === q.id)
            const keyed = answersRevealed ? mapKeyedQuestion(q).key : null
            return {
                question: mapQuestion(q),
                response: response ? mapResponse(response) : null,
                key: keyed
                    ? {
                          correctOptionIds: keyed.correctOptionIds,
                          acceptedAnswers: keyed.acceptedAnswers,
                          explanation: keyed.explanation,
                          rubric: keyed.rubric,
                      }
                    : null,
                files: files.filter((f) => f.questionId === q.id),
            }
        }),
        answersRevealed,
        reward: null,
    }
}

/** The student's marked work that has teacher comments, newest first (Chronicle → Feedback) */
export async function getMyFeedback(studentId: string): Promise<FeedbackEntry[]> {
    const db = supabaseAdmin()
    const attempts = unwrap(
        await db
            .from('attempts')
            .select(
                'id, activity_id, percent, passed, graded_at, feedback, activity:activities(title, course:courses(title)), responses:attempt_responses(feedback)',
            )
            .eq('student_id', studentId)
            .eq('status', 'graded')
            .not('graded_by', 'is', null)
            .order('graded_at', { ascending: false })
            .limit(100),
        'load your feedback',
    )
    return attempts
        .map((a) => ({
            attemptId: a.id,
            activityId: a.activity_id,
            activityTitle: a.activity?.title ?? '',
            courseTitle: a.activity?.course?.title ?? '',
            percent: a.percent === null ? null : Number(a.percent),
            passed: a.passed,
            gradedAt: a.graded_at ? new Date(a.graded_at) : null,
            feedback: a.feedback,
            commentCount: a.responses.filter((r) => r.feedback.trim()).length,
        }))
        .filter((a) => a.feedback.trim() || a.commentCount > 0)
}

/**
 * Teacher view of one activity: each enrolled student's attempts and best result, who hasn't started,
 * work awaiting review, and per-question outcomes (to spot what the class is missing). Skipped answers
 * are counted separately from incorrect ones and never as correct.
 */
export async function getActivityResults(user: SessionUser, activityId: string): Promise<ActivityResults> {
    const { activity, course } = await requireActivityTeacher(user, activityId)
    await finalizeExpiredAttempts({ activityId })
    const db = supabaseAdmin()
    const [enrollments, attempts, completions, questions] = await Promise.all([
        db.from('course_enrollments').select('student:profiles(id, display_name)').eq('course_id', course.id),
        db.from('attempts').select('*').eq('activity_id', activityId).order('attempt_no'),
        db.from('activity_completions').select('*').eq('activity_id', activityId),
        db.from('questions').select('id, prompt, position').eq('activity_id', activityId).order('position'),
    ])
    const attemptRows = unwrap(attempts, 'load attempts')
    const completionRows = unwrap(completions, 'load completions')
    const questionRows = unwrap(questions, 'load questions')
    const submittedIds = attemptRows.filter((a) => a.status !== 'in_progress').map((a) => a.id)
    const responses = submittedIds.length
        ? unwrap(
              await db.from('attempt_responses').select('question_id, outcome').in('attempt_id', submittedIds),
              'load answers',
          )
        : []

    const students: ActivityStudentResult[] = unwrap(enrollments, 'load the roster')
        .map((e) => e.student)
        .filter((s): s is { id: string; display_name: string } => !!s)
        .map((s) => {
            const completion = completionRows.find((c) => c.student_id === s.id)
            return {
                studentId: s.id,
                displayName: s.display_name,
                attempts: attemptRows
                    .filter((a) => a.student_id === s.id)
                    .map((a) => ({
                        id: a.id,
                        attemptNo: a.attempt_no,
                        status: a.status,
                        percent: a.percent === null ? null : Number(a.percent),
                        passed: a.passed,
                        submittedAt: a.submitted_at ? new Date(a.submitted_at) : null,
                    })),
                bestPercent: completion?.best_percent === null || !completion ? null : Number(completion.best_percent),
                passed: completion?.passed ?? false,
                completedAt: completion ? new Date(completion.first_completed_at) : null,
            }
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName))

    const questionStats: QuestionStat[] = questionRows.map((q) => {
        const mine = responses.filter((r) => r.question_id === q.id)
        const count = (outcome: string) => mine.filter((r) => r.outcome === outcome).length
        const correct = count('correct')
        const partial = count('partial')
        const incorrect = count('incorrect')
        const marked = correct + partial + incorrect
        return {
            questionId: q.id,
            prompt: q.prompt,
            position: q.position,
            correct,
            partial,
            incorrect,
            skipped: count('skipped'),
            pending: count('pending_review'),
            // Partly-correct answers count half toward the class's success rate
            correctRate: marked > 0 ? Math.round(((correct + partial / 2) / marked) * 100) : null,
        }
    })

    const best = students.map((s) => s.bestPercent).filter((p): p is number => p !== null)
    return {
        activity: mapActivity(activity, questionRows.length, []),
        course: { id: course.id, title: course.title },
        students,
        questions: questionStats,
        summary: {
            enrolled: students.length,
            completed: students.filter((s) => s.completedAt).length,
            passed: students.filter((s) => s.passed).length,
            averageBest: best.length ? Math.round(best.reduce((a, b) => a + b, 0) / best.length) : null,
            awaitingReview: attemptRows.filter((a) => a.status === 'pending_review').length,
        },
    }
}
