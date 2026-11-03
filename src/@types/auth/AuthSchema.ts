import { z } from 'zod'
import { authMessages } from '@/configs/authMessages.config'
import { isPlaceholderEmail, isValidUsername } from '@/utils/accounts'

const v = authMessages.validation

export const DisplayNameSchema = z
    .string()
    .trim()
    .min(1, v.displayName)
    .max(60, v.displayNameLength)
    .regex(/^[^<>]*$/, v.displayNameChars)

const EmailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .email(v.email)
    .refine((email) => !isPlaceholderEmail(email), v.email)
export const NewPasswordSchema = z.string().min(8, v.passwordLength).max(72, v.passwordMax)

/** An email, or the username an administrator gave the account */
export const LoginSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(1, v.login)
    .refine(
        (login) => (login.includes('@') ? z.string().email().safeParse(login).success : isValidUsername(login)),
        v.login,
    )

export const SignInSchema = z.object({
    login: LoginSchema,
    password: z.string().min(1, v.password),
})
export type SignInInput = z.infer<typeof SignInSchema>

export const SignUpSchema = z.object({
    displayName: DisplayNameSchema,
    email: EmailSchema,
    password: NewPasswordSchema,
    /** Optional class code: joins the teacher's course as soon as the account exists */
    joinCode: z
        .string()
        .trim()
        .toUpperCase()
        .refine((code) => code === '' || /^[A-Z0-9]{6,10}$/.test(code), v.joinCode)
        .default(''),
})
export type SignUpInput = z.infer<typeof SignUpSchema>

/** Also used to resend the confirmation email */
export const EmailOnlySchema = z.object({ email: EmailSchema })
export type EmailOnlyInput = z.infer<typeof EmailOnlySchema>

export const ResetPasswordSchema = z
    .object({ password: NewPasswordSchema, confirm: z.string() })
    .refine((p) => p.password === p.confirm, { message: v.passwordsMatch, path: ['confirm'] })
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
