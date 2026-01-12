export const useTheme = () => {
    const theme = useState<string>('theme', () => 'light');
    const themeCookie = useCookie<string>('theme');

    const updateDocumentTheme = (newTheme: string) => {
        if (import.meta.client) {
            document.documentElement.setAttribute('data-theme', newTheme);
        }
    };

    const initTheme = () => {
        if (themeCookie.value) {
            theme.value = themeCookie.value;
        } else if (import.meta.client && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme.value = 'dark';
        }
        updateDocumentTheme(theme.value);
    };

    const toggleTheme = () => {
        theme.value = theme.value === 'light' ? 'dark' : 'light';
        themeCookie.value = theme.value;
        updateDocumentTheme(theme.value);
    };

    const setTheme = (newTheme: string) => {
        theme.value = newTheme;
        themeCookie.value = newTheme;
        updateDocumentTheme(theme.value);
    };

    // Watch for external changes (e.g. hydration)
    if (import.meta.client) {
        watch(theme, (newVal) => {
            updateDocumentTheme(newVal);
        });
    }

    return {
        theme,
        toggleTheme,
        setTheme,
        initTheme,
    };
};