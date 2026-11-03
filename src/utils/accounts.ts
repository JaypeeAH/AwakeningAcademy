import { NO_EMAIL_DOMAIN, USERNAME_PATTERN } from '@/constants/auth.constant'

/*
 * Sign-in names. Everyone can sign in with their email; accounts an administrator gives a username can
 * also sign in with it, and accounts made with a username only have a placeholder address instead of a
 * real email. Pure functions, shared by the browser and the server.
 */

export const normalizeUsername = (value: string) => value.trim().toLowerCase()

export const isValidUsername = (value: string) => USERNAME_PATTERN.test(normalizeUsername(value))

/** The placeholder address of a username-only account */
export const placeholderEmail = (username: string) => `${normalizeUsername(username)}@${NO_EMAIL_DOMAIN}`

export const isPlaceholderEmail = (email: string) => email.trim().toLowerCase().endsWith(`@${NO_EMAIL_DOMAIN}`)

/** How someone signs in, for showing to staff: their email, or their username if they have no email */
export const signInName = ({ email, username }: { email: string; username: string | null }) =>
    isPlaceholderEmail(email) ? (username ?? '') : email

// Letters and digits that can't be mistaken for each other when read aloud or copied by hand
const LOWER = 'abcdefghjkmnpqrstuvwxyz'
const UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ'
const DIGITS = '23456789'

const pick = (alphabet: string, count: number) =>
    Array.from(crypto.getRandomValues(new Uint32Array(count)), (n) => alphabet[n % alphabet.length]).join('')

/** A new student password in the school's usual shape, e.g. "kqm-482-HPW" (11 characters) */
export const generatePassword = () => `${pick(LOWER, 3)}-${pick(DIGITS, 3)}-${pick(UPPER, 3)}`

// ── Pasting a class list ──────────────────────────────────────────────────────────────────────────

export interface AccountLine {
    /** 1-based line number in the pasted text */
    line: number
    displayName: string
    username: string
    password: string
}

export interface AccountLineError {
    line: number
    message: string
}

const HEADER = /^(student\s*)?(full\s*)?name$/i

/**
 * Reads "name, username, password" lines, as typed or pasted from a spreadsheet (tab-separated). Names
 * often contain a comma ("DELA CRUZ, ARJAY B."), so with commas the last two fields are the username and
 * password and everything before them is the name. Header rows and blank lines are skipped.
 */
export function parseAccountLines(text: string): { accounts: AccountLine[]; errors: AccountLineError[] } {
    const accounts: AccountLine[] = []
    const errors: AccountLineError[] = []
    const seen = new Map<string, number>()

    text.split(/\r?\n/).forEach((raw, index) => {
        const line = index + 1
        if (!raw.trim()) return
        const fields = (raw.includes('\t') ? raw.split('\t') : raw.split(',')).map((f) => f.trim())
        while (fields.length && !fields[fields.length - 1]) fields.pop()
        if (fields.length < 3) {
            if (HEADER.test(fields[0] ?? '')) return
            errors.push({ line, message: 'Needs a name, a username and a password.' })
            return
        }
        const password = fields[fields.length - 1]
        const username = normalizeUsername(fields[fields.length - 2])
        const displayName = fields
            .slice(0, -2)
            .filter(Boolean)
            .join(raw.includes('\t') ? ' ' : ', ')
        if (HEADER.test(displayName) && username === 'username') return

        if (!displayName) errors.push({ line, message: 'The name is missing.' })
        else if (displayName.length > 60) errors.push({ line, message: 'Keep the name under 60 characters.' })
        else if (/[<>]/.test(displayName)) errors.push({ line, message: 'Names can’t include < or >.' })
        else if (!isValidUsername(username))
            errors.push({
                line,
                message: `“${username}” isn’t a valid username (3–32 letters, digits, dots, dashes or underscores).`,
            })
        else if (password.length < 8) errors.push({ line, message: 'The password needs at least 8 characters.' })
        else if (password.length > 72) errors.push({ line, message: 'The password must be 72 characters or fewer.' })
        else if (seen.has(username))
            errors.push({ line, message: `“${username}” is already used on line ${seen.get(username)}.` })
        else {
            seen.set(username, line)
            accounts.push({ line, displayName, username, password })
        }
    })
    return { accounts, errors }
}
