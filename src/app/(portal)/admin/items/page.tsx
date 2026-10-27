import type { Metadata } from 'next'
import { requirePagePermission } from '@/server/actions/auth'
import ItemsClientPage from '@/components/admin/items/ItemsClientPage'
import { ItemDefinitionsSWRProvider, SkillDefinitionsSWRProvider } from '@/components/admin/items/ItemsSWRProviders'

export const metadata: Metadata = { title: 'Items & skills' }

export default async function ItemsPage() {
    await requirePagePermission('progression.manage')
    return (
        <ItemDefinitionsSWRProvider>
            <SkillDefinitionsSWRProvider>
                <ItemsClientPage />
            </SkillDefinitionsSWRProvider>
        </ItemDefinitionsSWRProvider>
    )
}
