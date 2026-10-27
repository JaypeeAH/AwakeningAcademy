import type { Metadata } from 'next'
import AuthLayout from '@/components/auth/AuthLayout'
import SignUpCard from '@/components/auth/SignUpCard'
import SetupRequired from '@/components/shared/SetupRequired'
import { isSupabaseConfigured } from '@/server/data/supabase/config'

export const metadata: Metadata = { title: 'Create your account' }

interface SignUpPageProps {
    searchParams: Promise<Record<string, string | undefined>>
}

/** `?code=` comes from a teacher's shared sign-up link and pre-fills the class code */
export default async function SignUpPage({ searchParams }: SignUpPageProps) {
    if (!isSupabaseConfigured()) return <SetupRequired />
    const { code } = await searchParams
    const joinCode = code && /^[A-Za-z0-9]{6,10}$/.test(code) ? code.toUpperCase() : null
    return (
        <AuthLayout>
            <SignUpCard joinCode={joinCode} />
        </AuthLayout>
    )
}
