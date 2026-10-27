import Link from 'next/link'
import Button from '@/components/ui/Button'
import { LogoMark } from '@/components/template/Logo'
import { homePath } from '@/configs/app.config'

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
            <LogoMark size={56} />
            <div className="system-eyebrow">System message</div>
            <h1 className="font-display text-3xl">This path leads nowhere</h1>
            <p className="max-w-md text-gray-500 dark:text-gray-400">
                The page doesn’t exist, or you don’t have access to it. Check the link, or head back to your dashboard.
            </p>
            <Link href={homePath}>
                <Button variant="solid">Back to the dashboard</Button>
            </Link>
        </main>
    )
}
