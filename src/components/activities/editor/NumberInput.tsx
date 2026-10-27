'use client'

import Input, { type InputProps } from '@/components/ui/Input'

interface NumberInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
    value: number | null | undefined
    onChange: (value: number | null) => void
}

/** A number field where empty means null (e.g. "unlimited attempts") */
export default function NumberInput({ value, onChange, ...rest }: NumberInputProps) {
    return (
        <Input
            type="number"
            inputMode="numeric"
            value={value ?? ''}
            onChange={(e) => {
                const raw = (e.target as HTMLInputElement).value
                onChange(raw === '' ? null : Number(raw))
            }}
            {...rest}
        />
    )
}
