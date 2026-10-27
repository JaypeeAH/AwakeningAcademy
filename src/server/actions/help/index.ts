import 'server-only'
import { helpContent } from '@/server/help'
import { NotFoundError } from '@/@types/errors'
import { buildHelpArticlePage, buildHelpCenter } from '@/utils/helpCenter'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { HelpArticlePageData, HelpCenterData } from '@/@types/help/Help'

/** The Help Center for the signed-in user's role: nothing written for other roles leaves the server */
export function getHelpCenter(user: SessionUser): HelpCenterData {
    return buildHelpCenter(helpContent, user.role)
}

/** One article, if it's written for the user's role (otherwise it doesn't exist for them) */
export function getHelpArticle(user: SessionUser, slug: string): HelpArticlePageData {
    const page = buildHelpArticlePage(helpContent, user.role, slug)
    if (!page) throw new NotFoundError('That help article doesn’t exist.')
    return page
}
