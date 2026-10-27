import type { Theme } from '@/@types/theme'

/** Defaults; the user's choice (mode, collapsed nav) is kept in the THEME_COOKIE. Dark is the signature look. */
export const themeConfig: Theme = {
    themeSchema: 'default',
    direction: 'ltr',
    mode: 'dark',
    locale: 'en',
    controlSize: 'md',
    panelExpand: false,
    layout: {
        type: 'collapsibleSide',
        sideNavCollapse: false,
    },
}
