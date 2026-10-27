import type { Metadata } from 'next'
import InventoryClientPage from '@/components/inventory/InventoryClientPage'
import { requirePagePermission } from '@/server/actions/auth'

export const metadata: Metadata = { title: 'Inventory & Skills' }

export default async function InventoryPage() {
    await requirePagePermission('play')
    return <InventoryClientPage />
}
