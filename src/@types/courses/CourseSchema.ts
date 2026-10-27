import { z } from 'zod'

const title = z.string().trim().min(2, 'Use at least 2 characters').max(120, 'Keep it under 120 characters')

export const CourseDetailsSchema = z.object({
    title,
    description: z.string().trim().max(2000, 'Keep it under 2000 characters').default(''),
    subjectId: z.string().uuid('Choose a subject'),
})

export const CreateCourseSchema = CourseDetailsSchema
export type CreateCourseInput = z.infer<typeof CreateCourseSchema>

export const UpdateCourseSchema = CourseDetailsSchema.partial().extend({
    status: z.enum(['draft', 'published', 'archived']).optional(),
})
export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>

export const JoinCourseSchema = z.object({
    code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9]{6,10}$/, 'Join codes are 6–10 letters and numbers'),
})
export type JoinCourseInput = z.infer<typeof JoinCourseSchema>

export const AddStudentSchema = z.object({
    email: z.string().trim().toLowerCase().email('Enter the student’s sign-in email'),
})
export type AddStudentInput = z.infer<typeof AddStudentSchema>

export const ModuleSchema = z.object({
    title: z.string().trim().min(1, 'Give the module a title').max(120),
    description: z.string().trim().max(1000).default(''),
})
export type ModuleInput = z.infer<typeof ModuleSchema>

export const ReorderSchema = z.object({
    ids: z.array(z.string().uuid()).max(500),
})
export type ReorderInput = z.infer<typeof ReorderSchema>
