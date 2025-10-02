import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
    theme: Theme;
    actualTheme: 'light' | 'dark'; // The actual theme being applied (resolved from 'auto')
    setTheme: (theme: Theme) => void;
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
        // Get theme from localStorage or default to 'light'
        const savedTheme = localStorage.getItem('theme') as Theme;
        return savedTheme || 'light';
    });

    const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

    // Function to get system theme preference
    const getSystemTheme = (): 'light' | 'dark' => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    };

    // Update actual theme based on theme setting
    useEffect(() => {
        let resolvedTheme: 'light' | 'dark';

        if (theme === 'auto') {
            resolvedTheme = getSystemTheme();
        } else {
            resolvedTheme = theme;
        }

        setActualTheme(resolvedTheme);

        // Apply theme to document
        const root = document.documentElement;
        if (resolvedTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        console.log('Theme applied:', { theme, resolvedTheme, hasDarkClass: root.classList.contains('dark') });
    }, [theme]);

    // Listen for system theme changes when theme is 'auto'
    useEffect(() => {
        if (theme === 'auto') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

            const handleChange = (e: MediaQueryListEvent) => {
                const newTheme = e.matches ? 'dark' : 'light';
                setActualTheme(newTheme);

                // Apply theme to document
                const root = document.documentElement;
                if (newTheme === 'dark') {
                    root.classList.add('dark');
                } else {
                    root.classList.remove('dark');
                }
            };

            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const toggleTheme = () => {
        if (theme === 'light') {
            setTheme('dark');
        } else if (theme === 'dark') {
            setTheme('light');
        } else {
            // If auto, toggle to opposite of current system theme
            const systemTheme = getSystemTheme();
            setTheme(systemTheme === 'light' ? 'dark' : 'light');
        }
    };

    const value: ThemeContextType = {
        theme,
        actualTheme,
        setTheme,
        toggleTheme,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};