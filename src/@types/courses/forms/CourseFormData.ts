import { z } from 'zod'
import { CourseDetailsSchema } from '@/@types/courses/CourseSchema'

/** Create / edit course dialogs */
export const CourseFormSchema = CourseDetailsSchema.extend({
    description: z.string().trim().max(2000, 'Keep it under 2000 characters'),
})
export type CourseFormData = z.infer<typeof CourseFormSchema>

export const ModuleFormSchema = z.object({
    title: z.string().trim().min(1, 'Give the module a title').max(120),
    description: z.string().trim().max(1000),
})
export type ModuleFormData = z.infer<typeof ModuleFormSchema>

export const AddStudentFormSchema = z.object({
    email: z.string().trim().toLowerCase().email('Enter the student’s sign-in email'),
})
export type AddStudentFormData = z.infer<typeof AddStudentFormSchema>
