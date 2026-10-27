import type { BankQuestion, BankQuery } from '@/@types/bank/BankQuestion'
import type { QuestionInput } from '@/@types/activities/ActivitySchema'

/**
 * A bank question as a NEW activity question: fresh ids for the question and its options, and the
 * correct-answer ids remapped to them. Copies (never links) so editing either side can't change graded
 * history.
 */
export function copyBankQuestion(
    bank: Pick<BankQuestion, 'kind' | 'prompt' | 'points' | 'options' | 'key'>,
    newId: () => string,
): QuestionInput {
    const idMap = new Map(bank.options.map((o) => [o.id, newId()]))
    return {
        id: newId(),
        kind: bank.kind,
        prompt: bank.prompt,
        points: bank.points,
        options: bank.options.map((o) => ({ id: idMap.get(o.id)!, label: o.label })),
        key: {
            correctOptionIds: bank.key.correctOptionIds.map((id) => idMap.get(id)).filter((id): id is string => !!id),
            acceptedAnswers: [...bank.key.acceptedAnswers],
            caseSensitive: bank.key.caseSensitive,
            explanation: bank.key.explanation,
            rubric: bank.key.rubric,
        },
    }
}

/** Client-side filtering for the bank picker (the server applies the same filters) */
export function filterBankQuestions(questions: BankQuestion[], { q, tag, kind, difficulty }: BankQuery) {
    const text = q?.trim().toLowerCase()
    return questions.filter(
        (b) =>
            (!text || b.prompt.toLowerCase().includes(text) || b.tags.some((t) => t.includes(text))) &&
            (!tag || b.tags.includes(tag)) &&
            (!kind || b.kind === kind) &&
            (!difficulty || b.difficulty === difficulty),
    )
}
