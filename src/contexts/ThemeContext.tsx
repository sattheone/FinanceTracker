import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'auto' | 'tinted';
export type TintColorId = 'cream' | 'sand' | 'sage' | 'sky' | 'lavender' | 'rose';

interface TintPalette {
    label: string;
    swatch: string;
    // HSL component strings for index.css Tailwind vars (used inside hsl())
    hslBg: string;
    hslCard: string;
    hslSecondary: string;
    hslBorder: string;
    // Hex strings for theme.css semantic vars
    hexPrimary: string;
    hexSecondary: string;
    hexTertiary: string;
    hexElevated: string;
    hexBorder: string;
    hexBorder2: string;
}

export const TINT_PALETTES: Record<TintColorId, TintPalette> = {
    cream: {
        label: 'Cream',
        swatch: '#F2EBE5',
        hslBg: '34 47% 97%', hslCard: '27 30% 93%', hslSecondary: '30 20% 90%', hslBorder: '30 22% 84%',
        hexPrimary: '#FAF6F1', hexSecondary: '#F2EBE5', hexTertiary: '#E8DDD5',
        hexElevated: '#F5F0EA', hexBorder: '#E2D9CF', hexBorder2: '#D4C9BE',
    },
    sand: {
        label: 'Sand',
        swatch: '#EDE7D9',
        hslBg: '38 40% 96%', hslCard: '36 28% 92%', hslSecondary: '36 22% 88%', hslBorder: '34 20% 82%',
        hexPrimary: '#F7F3EB', hexSecondary: '#EDE7D9', hexTertiary: '#E4DCC8',
        hexElevated: '#F2EDE3', hexBorder: '#D8CEBC', hexBorder2: '#CBBFAA',
    },
    sage: {
        label: 'Sage',
        swatch: '#D4E2D0',
        hslBg: '120 22% 96%', hslCard: '120 16% 92%', hslSecondary: '120 12% 89%', hslBorder: '120 10% 82%',
        hexPrimary: '#F2F6F1', hexSecondary: '#E5EDE3', hexTertiary: '#D4E2D0',
        hexElevated: '#EEF4EC', hexBorder: '#CDDEC9', hexBorder2: '#BACEBC',
    },
    sky: {
        label: 'Sky',
        swatch: '#CCDFF0',
        hslBg: '210 40% 97%', hslCard: '210 30% 93%', hslSecondary: '210 22% 90%', hslBorder: '210 20% 83%',
        hexPrimary: '#F0F4FA', hexSecondary: '#E2ECF5', hexTertiary: '#CCDFF0',
        hexElevated: '#EBF1F8', hexBorder: '#C8DAEE', hexBorder2: '#B3CAEA',
    },
    lavender: {
        label: 'Lavender',
        swatch: '#D8CCEA',
        hslBg: '265 30% 97%', hslCard: '265 22% 93%', hslSecondary: '265 16% 90%', hslBorder: '265 14% 83%',
        hexPrimary: '#F4F0FB', hexSecondary: '#EBE3F5', hexTertiary: '#D8CCEA',
        hexElevated: '#F0ECF8', hexBorder: '#CFC5E5', hexBorder2: '#BEB0D8',
    },
    rose: {
        label: 'Rose',
        swatch: '#EACCD4',
        hslBg: '348 38% 97%', hslCard: '348 26% 93%', hslSecondary: '348 18% 90%', hslBorder: '348 16% 83%',
        hexPrimary: '#FBF0F3', hexSecondary: '#F5E3EA', hexTertiary: '#EACCD4',
        hexElevated: '#F8ECF0', hexBorder: '#E5C8D2', hexBorder2: '#D8B3C0',
    },
};

export type AccentColor = 'violet' | 'blue' | 'emerald' | 'amber' | 'rose';
export type Density = 'compact' | 'comfortable' | 'relaxed';
export type FontSize = 'small' | 'medium' | 'large';
export type VisualStyle = 'flat' | 'glass';

interface ThemeContextType {
    theme: Theme;
    actualTheme: 'light' | 'dark' | 'tinted';
    tintColor: TintColorId;
    accentColor: AccentColor;
    density: Density;
    fontSize: FontSize;
    visualStyle: VisualStyle;
    setTheme: (theme: Theme) => void;
    setTintColor: (color: TintColorId) => void;
    setAccentColor: (color: AccentColor) => void;
    setDensity: (density: Density) => void;
    setFontSize: (size: FontSize) => void;
    setVisualStyle: (style: VisualStyle) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('theme') as Theme;
        return savedTheme || 'light';
    });

    const [tintColor, setTintColorState] = useState<TintColorId>(() => {
        return (localStorage.getItem('tintColor') as TintColorId) || 'cream';
    });

    const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
        return (localStorage.getItem('accentColor') as AccentColor) || 'violet';
    });

    const [density, setDensityState] = useState<Density>(() => {
        return (localStorage.getItem('density') as Density) || 'comfortable';
    });

    const [fontSize, setFontSizeState] = useState<FontSize>(() => {
        return (localStorage.getItem('fontSize') as FontSize) || 'medium';
    });

    const [visualStyle, setVisualStyleState] = useState<VisualStyle>(() => {
        return (localStorage.getItem('visualStyle') as VisualStyle) || 'flat';
    });

    const [actualTheme, setActualTheme] = useState<'light' | 'dark' | 'tinted'>('light');

    const getSystemTheme = (): 'light' | 'dark' => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    };

    const applyTintVars = (colorId: TintColorId) => {
        const p = TINT_PALETTES[colorId];
        const root = document.documentElement;
        root.style.setProperty('--tint-hsl-bg', p.hslBg);
        root.style.setProperty('--tint-hsl-card', p.hslCard);
        root.style.setProperty('--tint-hsl-secondary', p.hslSecondary);
        root.style.setProperty('--tint-hsl-border', p.hslBorder);
        root.style.setProperty('--tint-hex-primary', p.hexPrimary);
        root.style.setProperty('--tint-hex-secondary', p.hexSecondary);
        root.style.setProperty('--tint-hex-tertiary', p.hexTertiary);
        root.style.setProperty('--tint-hex-elevated', p.hexElevated);
        root.style.setProperty('--tint-hex-border', p.hexBorder);
        root.style.setProperty('--tint-hex-border2', p.hexBorder2);
    };

    const clearTintVars = () => {
        const root = document.documentElement;
        ['--tint-hsl-bg', '--tint-hsl-card', '--tint-hsl-secondary', '--tint-hsl-border',
         '--tint-hex-primary', '--tint-hex-secondary', '--tint-hex-tertiary',
         '--tint-hex-elevated', '--tint-hex-border', '--tint-hex-border2',
        ].forEach(v => root.style.removeProperty(v));
    };

    const applyThemeClasses = (resolved: 'light' | 'dark' | 'tinted', colorId: TintColorId) => {
        const root = document.documentElement;
        root.classList.remove('dark', 'tinted');
        if (resolved === 'dark') {
            root.classList.add('dark');
            clearTintVars();
        } else if (resolved === 'tinted') {
            root.classList.add('tinted');
            applyTintVars(colorId);
        } else {
            clearTintVars();
        }
    };

    useEffect(() => {
        let resolvedTheme: 'light' | 'dark' | 'tinted';
        if (theme === 'auto') {
            resolvedTheme = getSystemTheme();
        } else {
            resolvedTheme = theme;
        }
        setActualTheme(resolvedTheme);
        applyThemeClasses(resolvedTheme, tintColor);
    }, [theme, tintColor]);

    useEffect(() => {
        if (theme === 'auto') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e: MediaQueryListEvent) => {
                const newTheme = e.matches ? 'dark' : 'light';
                setActualTheme(newTheme);
                applyThemeClasses(newTheme, tintColor);
            };
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme, tintColor]);

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-accent', accentColor);
        root.setAttribute('data-density', density);
        root.setAttribute('data-font-size', fontSize);
        root.setAttribute('data-visual-style', visualStyle);
    }, [accentColor, density, fontSize, visualStyle]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const setTintColor = (color: TintColorId) => {
        setTintColorState(color);
        localStorage.setItem('tintColor', color);
    };

    const setAccentColor = (color: AccentColor) => {
        setAccentColorState(color);
        localStorage.setItem('accentColor', color);
    };

    const setDensity = (val: Density) => {
        setDensityState(val);
        localStorage.setItem('density', val);
    };

    const setFontSize = (val: FontSize) => {
        setFontSizeState(val);
        localStorage.setItem('fontSize', val);
    };

    const setVisualStyle = (val: VisualStyle) => {
        setVisualStyleState(val);
        localStorage.setItem('visualStyle', val);
    };

    const toggleTheme = () => {
        if (theme === 'light') {
            setTheme('dark');
        } else if (theme === 'dark') {
            setTheme('tinted');
        } else if (theme === 'tinted') {
            setTheme('light');
        } else {
            const systemTheme = getSystemTheme();
            setTheme(systemTheme === 'light' ? 'dark' : 'light');
        }
    };

    const value: ThemeContextType = {
        theme,
        actualTheme,
        tintColor,
        accentColor,
        density,
        fontSize,
        visualStyle,
        setTheme,
        setTintColor,
        setAccentColor,
        setDensity,
        setFontSize,
        setVisualStyle,
        toggleTheme,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};