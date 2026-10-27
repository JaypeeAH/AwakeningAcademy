import 'server-only'
import { adminArticles } from './adminArticles'
import { helpFaqs } from './faqs'
import { studentArticles } from './studentArticles'
import { teacherArticles } from './teacherArticles'
import { helpTopics } from './topics'
import type { HelpContent } from '@/utils/helpCenter'

/**
 * Every Help Center article, topic and FAQ, for every role. Server-only: pages pass the browser just
 * the part written for the viewer's role (utils/helpCenter buildHelpCenter / buildHelpArticlePage).
 */
export const helpContent: HelpContent = {
    topics: helpTopics,
    articles: [...studentArticles, ...teacherArticles, ...adminArticles],
    faqs: helpFaqs,
}
