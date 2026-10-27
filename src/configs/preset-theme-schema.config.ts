import type { ThemeSchema } from '@/@types/theme'

/**
 * Primary colour families applied at runtime by utils/applyThemeSchema. 'default' must match the
 * values in assets/styles/tailwind/_tokens.css (which paint the first frame before hydration).
 */
const presetThemeSchemaConfig: ThemeSchema = {
    default: {
        light: {
            primary: '#1d64d8',
            primaryDeep: '#164fae',
            primaryMild: '#3b82f6',
            primarySubtle: 'rgb(29 100 216 / 0.1)',
            neutral: '#ffffff',
        },
        dark: {
            primary: '#38a3ff',
            primaryDeep: '#1f84e6',
            primaryMild: '#6cbcff',
            primarySubtle: 'rgb(56 163 255 / 0.14)',
            neutral: '#050b18',
        },
    },
}

export default presetThemeSchemaConfig
