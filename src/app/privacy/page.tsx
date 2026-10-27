import Link from 'next/link'
import type { Metadata } from 'next'
import Logo from '@/components/template/Logo'
import { homePath, portalName } from '@/configs/app.config'

export const metadata: Metadata = { title: 'Privacy & terms' }

/** Plain-language privacy notice. Schools should review it against their own policies before launch. */
export default function PrivacyPage() {
    return (
        <main className="mx-auto max-w-3xl px-4 py-12">
            <Link href={homePath}>
                <Logo />
            </Link>
            <article className="prose mt-8 max-w-none dark:prose-invert">
                <h1>Privacy &amp; terms</h1>
                <p>
                    {portalName} is built for school use, including by students under 18. It collects as little personal
                    information as it can.
                </p>
                <h2>What we store</h2>
                <ul>
                    <li>
                        <strong>Your account:</strong> a display name you choose and the email you sign in with. No
                        photos, birthdays, addresses or phone numbers.
                    </li>
                    <li>
                        <strong>Your learning:</strong> courses you join, your answers and scores, and the XP, levels,
                        ranks and titles they earn.
                    </li>
                    <li>
                        <strong>Records of changes:</strong> who changed grades, roles, XP or progression rules, and
                        when — so results stay fair and accountable.
                    </li>
                </ul>
                <h2>Who can see it</h2>
                <ul>
                    <li>You can see your own learning history.</li>
                    <li>Teachers can see the progress and answers of students in the courses they teach.</li>
                    <li>School administrators can manage accounts and see the audit log.</li>
                    <li>Other students cannot see your email, answers or scores.</li>
                </ul>
                <h2>What we don’t do</h2>
                <p>We don’t sell data, show advertising, or use your work to train AI models.</p>
                <h2 id="terms">Terms of use</h2>
                <p>
                    Use the Academy for learning. Don’t try to change scores, XP or other players’ progress, share your
                    password, or access accounts that aren’t yours. XP and ranks reward effort and mastery — they are
                    not a substitute for your teacher’s assessment of your learning.
                </p>
                <h2>Questions or deletion</h2>
                <p>Ask your teacher or school administrator to correct or delete your account and its data.</p>
            </article>
        </main>
    )
}
