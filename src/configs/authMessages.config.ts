/**
 * Every message people see while signing up, signing in or recovering an account — in one place so
 * the wording can be tuned without touching components or server code.
 *
 * Written for students first: short sentences, everyday words, and always a next step.
 * (The emails Supabase sends live in supabase/templates — keep their tone in step with this file.)
 */
export const authMessages = {
    signIn: {
        title: 'Welcome back',
        subtitle: 'Sign in to continue your adventure.',
        emailLabel: 'Email',
        passwordLabel: 'Password',
        submit: 'Sign in',
        forgotPassword: 'Forgot your password?',
        noAccount: 'New here?',
        createAccount: 'Create your account',
    },
    signUp: {
        title: 'Begin your adventure',
        subtitle: 'Make your account in a minute. Everyone starts at F-Rank — every lesson takes you higher.',
        displayNameLabel: 'What should we call you?',
        displayNameHint: 'Your first name or a nickname. Your teacher will see it.',
        emailLabel: 'Email',
        emailHint: 'Use the email your school gave you, if you have one.',
        passwordLabel: 'Choose a password',
        passwordHint: 'At least 8 characters. A short sentence is easy to remember and hard to guess.',
        joinCodeLabel: 'Class code (optional)',
        joinCodeHint: 'Got a code from your teacher? Add it and you’ll join their class straight away.',
        submit: 'Create my account',
        haveAccount: 'Already have an account?',
        signIn: 'Sign in',
        teacherNote: 'Teacher? Create your account here too, then ask your school administrator to make you a teacher.',
    },
    checkEmail: {
        title: 'Check your email',
        body: (email: string) => `We sent a link to ${email}. Open it to finish making your account.`,
        tips: [
            'It can take a minute or two to arrive.',
            'Look in your junk or spam folder too.',
            'You can open the link on any device — your phone works too.',
        ],
        resend: 'Send the email again',
        resent: 'Sent! Check your inbox again.',
        backToSignIn: 'Back to sign in',
    },
    forgotPassword: {
        title: 'Forgot your password?',
        subtitle: 'No problem. Enter your email and we’ll send you a link to choose a new one.',
        submit: 'Send me a link',
        sentTitle: 'Check your email',
        sent: (email: string) =>
            `If ${email} has an account, a link to reset your password is on its way. It works for one hour.`,
        backToSignIn: 'Back to sign in',
    },
    resetPassword: {
        title: 'Choose a new password',
        subtitle: 'Pick something you’ll remember. You’ll stay signed in afterwards.',
        passwordLabel: 'New password',
        confirmLabel: 'Type it again',
        submit: 'Save my new password',
        noSession: 'This reset link has expired or was already used. Ask for a new one — it only takes a moment.',
        requestNew: 'Send me a new link',
    },
    notices: {
        signedOut: 'You’ve signed out. See you next time!',
        emailConfirmed: 'Your email is confirmed. Sign in to start.',
        passwordUpdated: 'Your password is saved. Welcome back!',
        linkExpired:
            'That link has expired or was already used. Try signing in — if your email still needs confirming, we’ll offer to send a fresh link.',
        sessionExpired: 'You were signed out because you were away for a while. Sign in to carry on.',
    },
    /** Server error codes → what the person sees */
    errors: {
        INVALID_CREDENTIALS: 'That email and password don’t match. Check for typos, or reset your password.',
        EMAIL_NOT_CONFIRMED: 'Please confirm your email first. We can send the link again.',
        ACCOUNT_EXISTS: 'There’s already an account with that email. Try signing in instead.',
        WEAK_PASSWORD: 'That password is too easy to guess. Try a longer one, like a short sentence.',
        SAME_PASSWORD: 'That’s your current password. Choose a different one.',
        RATE_LIMITED: 'Too many tries in a row. Wait a minute, then try again.',
        AUTH_UNAVAILABLE: 'We can’t reach the sign-in service right now. Please try again in a moment.',
        AUTH_FAILED: 'Something went wrong. Please try again.',
        RESET_SESSION_MISSING: 'Your reset link has expired. Ask for a new one.',
    },
    validation: {
        email: 'Enter an email address, like name@school.edu',
        password: 'Enter your password',
        passwordLength: 'Use at least 8 characters',
        passwordMax: 'Use 72 characters or fewer',
        passwordsMatch: 'The two passwords don’t match',
        displayName: 'Tell us what to call you',
        displayNameLength: 'Keep it under 60 characters',
        displayNameChars: 'Names can’t include < or >',
        joinCode: 'Class codes are 6–10 letters and numbers',
    },
} as const

export type AuthErrorCode = keyof typeof authMessages.errors
