import { z } from 'zod'

/** An image uploaded to a course for use in its lessons */
export interface CourseMedia {
    id: string
    courseId: string
    fileName: string
    contentType: string
    sizeBytes: number
    /** What lessons reference: /api/media/<id> */
    url: string
    createdAt: Date
}

/** POST /api/courses/[courseId]/media/prepare */
export const PrepareMediaUploadSchema = z.object({
    fileName: z.string().trim().min(1).max(255),
    sizeBytes: z.number().int().min(1),
})
export type PrepareMediaUploadInput = z.infer<typeof PrepareMediaUploadSchema>

/** POST /api/courses/[courseId]/media — the server checks the uploaded bytes before keeping it */
export const ConfirmMediaUploadSchema = z.object({
    path: z.string().min(1).max(500),
    fileName: z.string().trim().min(1).max(255),
})
export type ConfirmMediaUploadInput = z.infer<typeof ConfirmMediaUploadSchema>
