/** Fails fast, with a clear message, when the app or the Supabase admin key isn't available */
export default async function globalSetup() {
    const missing = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY'].filter((name) => !process.env[name])
    if (missing.length) {
        throw new Error(
            `Missing ${missing.join(' and ')}. Run with the app's env, e.g. \`npm run test:e2e\` (which reads .env.local).`,
        )
    }
    const base = process.env.E2E_BASE_URL || 'http://localhost:3000'
    try {
        const response = await fetch(`${base}/login`)
        if (!response.ok) throw new Error(`status ${response.status}`)
    } catch (error) {
        throw new Error(`The app isn't reachable at ${base} (${String(error)}). Start it (npm run dev) first.`)
    }
}
