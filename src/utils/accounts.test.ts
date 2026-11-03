import { describe, expect, it } from 'vitest'
import { isPlaceholderEmail, isValidUsername, parseAccountLines, placeholderEmail, signInName } from './accounts'

describe('usernames', () => {
    it('accepts 3–32 letters, digits, dots, dashes and underscores, in any case', () => {
        expect(isValidUsername('delacruzarjay01')).toBe(true)
        expect(isValidUsername('  Juan.Dela-Cruz_2 ')).toBe(true)
        expect(isValidUsername('ab')).toBe(false)
        expect(isValidUsername('.dot')).toBe(false)
        expect(isValidUsername('has space')).toBe(false)
        expect(isValidUsername('name@school.edu')).toBe(false)
        expect(isValidUsername('a'.repeat(33))).toBe(false)
    })

    it('gives username-only accounts a placeholder address, shown to staff as the username', () => {
        const email = placeholderEmail('AquinoEury')
        expect(email).toBe('aquinoeury@no-email.invalid')
        expect(isPlaceholderEmail(email)).toBe(true)
        expect(isPlaceholderEmail('eury@school.edu')).toBe(false)
        expect(signInName({ email, username: 'aquinoeury' })).toBe('aquinoeury')
        expect(signInName({ email: 'eury@school.edu', username: 'aquinoeury' })).toBe('eury@school.edu')
    })
})

describe('parseAccountLines', () => {
    it('reads spreadsheet rows (tabs), skipping the header and blank lines', () => {
        const text = [
            'Student name\tUsername\tPassword',
            'ALCANTARA, KYLIE ANDREA L.\talcantarakylieandrea\tkoj-258-HPG',
            '',
            'EMPALMADO, REYVIN\tEmpalmadoReyvin\tmqw-647-AAB',
        ].join('\n')
        const { accounts, errors } = parseAccountLines(text)
        expect(errors).toEqual([])
        expect(accounts).toEqual([
            {
                line: 2,
                displayName: 'ALCANTARA, KYLIE ANDREA L.',
                username: 'alcantarakylieandrea',
                password: 'koj-258-HPG',
            },
            { line: 4, displayName: 'EMPALMADO, REYVIN', username: 'empalmadoreyvin', password: 'mqw-647-AAB' },
        ])
    })

    it('keeps commas in names when the line is comma-separated', () => {
        const { accounts } = parseAccountLines('DELA CRUZ, ARJAY B., delacruzarjay01, cdh-007-CLK')
        expect(accounts[0]).toMatchObject({ displayName: 'DELA CRUZ, ARJAY B.', username: 'delacruzarjay01' })
    })

    it('reports the line of every problem', () => {
        const { accounts, errors } = parseAccountLines(
            [
                'Ana, ana',
                'Ben, b!, password1',
                'Cy, cyrus, short',
                'Di, cyrus2, longenough',
                'Ed, cyrus2, alsolong1',
            ].join('\n'),
        )
        expect(accounts.map((a) => a.username)).toEqual(['cyrus2'])
        expect(errors.map((e) => e.line)).toEqual([1, 2, 3, 5])
        expect(errors[3].message).toContain('line 4')
    })
})
