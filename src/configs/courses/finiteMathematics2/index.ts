import { unit1 } from './unit1'
import { unit2 } from './unit2'
import { unit3 } from './unit3'
import { unit4 } from './unit4'
import type { CourseSeedDefinition } from '@/@types/courses/CourseSeed'

/**
 * Finite Mathematics 2 (Strengthened SHS, Academic elective, Grade 11/12), following the DepEd curriculum
 * guide and Learning Activity Sheets: one lesson and one quiz per LAS lesson, and a boss battle per unit.
 * Installed for its teacher with supabase/seeds/finite_mathematics_2.sql.
 */
export const finiteMathematics2: CourseSeedDefinition = {
    id: 'finite-mathematics-2',
    subjectSlug: 'mathematics',
    title: 'Finite Mathematics 2',
    description:
        'Counting techniques, probability, number theory and modular arithmetic, and networks and graphs — applied to decision-making, verification codes and route planning. Grade 11/12 Academic elective (Strengthened SHS curriculum).',
    ownerEmail: 'limuel.hernandez@deped.gov.ph',
    joinCode: 'FINMATH2',
    modules: [unit1, unit2, unit3, unit4],
}
