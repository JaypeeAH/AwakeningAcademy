import { describe, expect, it } from 'vitest'
import * as appConfig from '@/configs/app.config'
import { helpContent } from '@/server/help'
import { buildHelpArticlePage, buildHelpCenter, forRole, searchHelp } from './helpCenter'
import { ROLES, type Role } from '@/@types/auth/Roles'

const { topics, articles, faqs } = helpContent
const topicByKey = new Map(topics.map((t) => [t.key, t]))
const articleBySlug = new Map(articles.map((a) => [a.slug, a]))

/** Every page path in app.config (string constants like '/courses') */
const APP_PATHS = new Set<string>(
    Object.values(appConfig as Record<string, unknown>).filter(
        (v): v is string => typeof v === 'string' && v.startsWith('/'),
    ),
)

/** Links to pages in this app (`](/…)`) in a piece of Markdown, without query string or hash */
const internalLinks = (markdown: string) =>
    [...markdown.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1].split(/[?#]/)[0])

describe('help content', () => {
    it('every article has a unique slug, a known topic, an audience and some text', () => {
        expect(new Set(articles.map((a) => a.slug)).size).toBe(articles.length)
        for (const a of articles) {
            expect(a.slug, a.slug).toMatch(/^[a-z0-9-]{1,80}$/)
            expect(topicByKey.has(a.topic), `${a.slug} topic`).toBe(true)
            expect(a.audiences.length, a.slug).toBeGreaterThan(0)
            expect(a.title.trim() && a.summary.trim() && a.body.trim(), a.slug).toBeTruthy()
        }
    })

    it('an article’s topic is visible to every role the article is for', () => {
        for (const a of articles) {
            for (const role of a.audiences) {
                expect(topicByKey.get(a.topic)!.audiences, `${a.slug} → ${role}`).toContain(role)
            }
        }
    })

    it('every topic a role can see has at least one article for that role', () => {
        for (const role of ROLES) {
            for (const topic of forRole(topics, role)) {
                const count = articles.filter((a) => a.topic === topic.key && a.audiences.includes(role)).length
                expect(count, `${topic.key} for ${role}`).toBeGreaterThan(0)
            }
        }
    })

    it('FAQs have unique questions per role and a topic their audience can see', () => {
        for (const role of ROLES) {
            const questions = forRole(faqs, role).map((f) => f.question)
            expect(new Set(questions).size, role).toBe(questions.length)
        }
        for (const f of faqs) {
            expect(f.audiences.length, f.question).toBeGreaterThan(0)
            for (const role of f.audiences) {
                expect(topicByKey.get(f.topic)?.audiences, `${f.question} → ${role}`).toContain(role)
            }
        }
    })

    it('each role gets a reasonable library', () => {
        const counts = Object.fromEntries(
            ROLES.map((role) => [role, { articles: forRole(articles, role).length, faqs: forRole(faqs, role).length }]),
        )
        expect(counts.student.articles).toBeGreaterThanOrEqual(10)
        expect(counts.teacher.articles).toBeGreaterThanOrEqual(10)
        expect(counts.admin.articles).toBeGreaterThan(counts.teacher.articles)
        for (const role of ROLES) expect(counts[role].faqs, role).toBeGreaterThanOrEqual(6)
    })

    it('every internal link points to a real page, and help links only to articles the reader can open', () => {
        const items: { label: string; markdown: string; audiences: Role[] }[] = [
            ...articles.map((a) => ({ label: a.slug, markdown: a.body, audiences: a.audiences })),
            ...faqs.map((f) => ({ label: f.question, markdown: f.answer, audiences: f.audiences })),
        ]
        let checked = 0
        for (const item of items) {
            for (const path of internalLinks(item.markdown)) {
                checked++
                const helpSlug = /^\/help\/([^/]+)$/.exec(path)?.[1]
                if (helpSlug) {
                    const target = articleBySlug.get(helpSlug)
                    expect(target, `${item.label} → ${path}`).toBeDefined()
                    for (const role of item.audiences) {
                        expect(target!.audiences, `${item.label} → ${path} for ${role}`).toContain(role)
                    }
                } else {
                    expect(APP_PATHS.has(path), `${item.label} → ${path}`).toBe(true)
                }
            }
        }
        expect(checked).toBeGreaterThan(20)
    })

    it('admin pages are linked only from text written just for administrators', () => {
        const adminPaths = [...APP_PATHS].filter((p) => p.startsWith('/admin'))
        for (const item of [
            ...articles.map((a) => ({ label: a.slug, markdown: a.body, audiences: a.audiences })),
            ...faqs.map((f) => ({ label: f.question, markdown: f.answer, audiences: f.audiences })),
        ]) {
            if (internalLinks(item.markdown).some((p) => adminPaths.includes(p))) {
                expect(item.audiences, item.label).toEqual(['admin'])
            }
        }
    })
})

describe('role filtering', () => {
    it.each(ROLES)('the %s Help Center holds only items written for that role', (role) => {
        const center = buildHelpCenter(helpContent, role)
        expect(center.role).toBe(role)
        for (const a of center.articles) expect(articleBySlug.get(a.slug)!.audiences).toContain(role)
        for (const f of center.faqs) {
            expect(faqs.find((x) => x.question === f.question && x.audiences.includes(role))).toBeDefined()
        }
        expect(center.articles.length).toBe(forRole(articles, role).length)
        for (const t of center.topics) {
            expect(topicByKey.get(t.key)!.audiences).toContain(role)
            expect(t.articleCount).toBe(center.articles.filter((a) => a.topic === t.key).length)
        }
    })

    it('students never receive teacher or administrator text', () => {
        const payload = JSON.stringify(buildHelpCenter(helpContent, 'student'))
        for (const a of articles.filter((x) => !x.audiences.includes('student'))) {
            expect(payload.includes(`"slug":"${a.slug}"`), a.slug).toBe(false)
            expect(payload.includes(a.body), a.slug).toBe(false)
        }
        for (const f of faqs.filter((x) => !x.audiences.includes('student'))) {
            expect(payload.includes(f.answer), f.question).toBe(false)
        }
        expect(payload).not.toMatch(/audiences/)
    })

    it('an article page exists only for the roles it is written for', () => {
        const teacherOnly = articles.find((a) => !a.audiences.includes('student'))!
        expect(buildHelpArticlePage(helpContent, 'student', teacherOnly.slug)).toBeNull()
        expect(buildHelpArticlePage(helpContent, 'student', 'no-such-article')).toBeNull()

        const page = buildHelpArticlePage(helpContent, teacherOnly.audiences[0], teacherOnly.slug)!
        expect(page.article.slug).toBe(teacherOnly.slug)
        expect(page.topic.key).toBe(teacherOnly.topic)
        expect(page.related.every((r) => r.topic === teacherOnly.topic && r.slug !== teacherOnly.slug)).toBe(true)
        expect(page.related.every((r) => articleBySlug.get(r.slug)!.audiences.includes(page.role))).toBe(true)
        expect(page.article.readMinutes).toBeGreaterThanOrEqual(1)
    })
})

describe('searchHelp', () => {
    const center = buildHelpCenter(helpContent, 'student')

    it('returns nothing for an empty query', () => {
        expect(searchHelp('   ', center.articles, center.faqs)).toEqual({ articles: [], faqs: [] })
    })

    it('finds articles by title first, and FAQs by their wording', () => {
        const results = searchHelp('streak', center.articles, center.faqs)
        expect(results.articles[0].slug).toBe('learning-streaks')
        expect(results.faqs.some((f) => f.question.includes('streak'))).toBe(true)
    })

    it('needs every word, and ignores case, apostrophes and punctuation', () => {
        expect(searchHelp('CANT start', center.articles, center.faqs).faqs[0].question).toBe(
            'Why can’t I start this quest?',
        )
        expect(searchHelp('easter bunny zzzz', center.articles, center.faqs).articles).toHaveLength(0)
    })

    it('matches words inside article bodies, not just titles', () => {
        const results = searchHelp('Overdrive', center.articles, center.faqs)
        expect(results.articles.map((a) => a.slug)).toContain('items-skills-and-the-easter-bunny')
    })
})
