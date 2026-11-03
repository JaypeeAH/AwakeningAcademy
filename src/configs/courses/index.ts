import { finiteMathematics2 } from './finiteMathematics2'
import type { CourseSeedDefinition } from '@/@types/courses/CourseSeed'

/** Full courses installed with `npm run db:course-seed` (one SQL file each, in supabase/seeds) */
export const SEEDED_COURSES: CourseSeedDefinition[] = [finiteMathematics2]
