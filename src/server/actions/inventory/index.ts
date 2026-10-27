import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { check, toAppError, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import { recordAudit } from '@/server/actions/audit'
import { asObject } from '@/server/actions/progression/mappers'
import { ConflictError, NotFoundError } from '@/@types/errors'
import type { Tables } from '@/@types/supabase/database.types'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { Inventory, ItemDefinition, ItemDefinitionInput } from '@/@types/game/Inventory'

export const mapItemDefinition = (row: Tables<'item_definitions'>): ItemDefinition => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    kind: row.kind,
    rarity: row.rarity,
    effect: row.effect === 'bunny_skip' ? 'bunny_skip' : null,
    sortOrder: row.sort_order,
})

export async function getItemDefinitions(): Promise<ItemDefinition[]> {
    return unwrap(
        await supabaseAdmin().from('item_definitions').select('*').order('sort_order').order('name'),
        'load items',
    ).map(mapItemDefinition)
}

/** The student's items (with charges > 0) and their recent inventory history */
export async function getInventory(studentId: string): Promise<Inventory> {
    const db = supabaseAdmin()
    const [items, history] = await Promise.all([
        db
            .from('inventory_items')
            .select('charges, item:item_definitions(*)')
            .eq('student_id', studentId)
            .gt('charges', 0),
        db
            .from('inventory_transactions')
            .select('id, delta, balance_after, reason, created_at, item:item_definitions(name)')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })
            .limit(50),
    ])
    return {
        items: unwrap(items, 'load your inventory')
            .filter((r) => r.item)
            .map((r) => ({ item: mapItemDefinition(r.item!), charges: r.charges }))
            .sort((a, b) => a.item.sortOrder - b.item.sortOrder),
        history: unwrap(history, 'load your inventory history').map((r) => ({
            id: r.id,
            itemName: r.item?.name ?? 'Item',
            delta: r.delta,
            balanceAfter: r.balance_after,
            reason: r.reason,
            createdAt: new Date(r.created_at),
        })),
    }
}

/** Easter Bunny charges the student holds */
export async function getBunnyCharges(studentId: string) {
    const row = unwrapMaybe(
        await supabaseAdmin()
            .from('inventory_items')
            .select('charges, item:item_definitions!inner(effect)')
            .eq('student_id', studentId)
            .eq('item.effect', 'bunny_skip')
            .maybeSingle(),
        'load your Easter Bunnies',
    )
    return row?.charges ?? 0
}

/**
 * Spends one Easter Bunny to skip a question on the student's open attempt. The database checks the
 * attempt, the activity's permission (never exams) and the charge, and applies it exactly once.
 */
export async function useBunnySkip(user: SessionUser, attemptId: string, questionId: string) {
    const result = await supabaseAdmin().rpc('use_bunny_skip', {
        p_attempt_id: attemptId,
        p_student_id: user.id,
        p_question_id: questionId,
    })
    if (result.error) throw toAppError(result.error, 'use the Easter Bunny')
    const o = asObject(result.data)
    return { charges: Number(o.charges ?? 0), alreadySkipped: o.alreadySkipped === true }
}

// ── Administration ────────────────────────────────────────────────────────────────────────────────

export async function createItemDefinition(user: SessionUser, input: ItemDefinitionInput) {
    const result = await supabaseAdmin()
        .from('item_definitions')
        .insert({
            code: input.code,
            name: input.name,
            description: input.description,
            kind: input.kind,
            rarity: input.rarity,
            sort_order: input.sortOrder,
        })
        .select('*')
        .single()
    if (result.error?.code === '23505') throw new ConflictError('An item already uses that code.', 'DUPLICATE_CODE')
    const row = unwrap(result, 'create the item')
    await recordAudit(user.id, 'item.created', 'item', row.id, { code: row.code })
    return mapItemDefinition(row)
}

/** Name, description, rarity and order are editable; the code and what an item does are fixed */
export async function updateItemDefinition(user: SessionUser, itemId: string, input: ItemDefinitionInput) {
    const existing = unwrapMaybe(
        await supabaseAdmin().from('item_definitions').select('*').eq('id', itemId).maybeSingle(),
        'load the item',
    )
    if (!existing) throw new NotFoundError('That item doesn’t exist.', 'ITEM_NOT_FOUND')
    check(
        await supabaseAdmin()
            .from('item_definitions')
            .update({
                name: input.name,
                description: input.description,
                rarity: input.rarity,
                sort_order: input.sortOrder,
                // Consumables with an effect stay consumables
                kind: existing.effect ? existing.kind : input.kind,
            })
            .eq('id', itemId),
        'update the item',
    )
    await recordAudit(user.id, 'item.updated', 'item', itemId, { code: existing.code })
    return (await getItemDefinitions()).find((i) => i.id === itemId)!
}
