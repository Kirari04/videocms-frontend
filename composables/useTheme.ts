export const useTheme = () => {
    const theme = useState<string>('theme', () => 'light');
    const themeCookie = useCookie<string>('theme');

    const initTheme = () => {
        if (themeCookie.value) {
            theme.value = themeCookie.value;
        } else if (import.meta.client && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme.value = 'dark';
        }
    };

    const toggleTheme = () => {
        theme.value = theme.value === 'light' ? 'dark' : 'light';
        themeCookie.value = theme.value;
    };

    const setTheme = (newTheme: string) => {
        theme.value = newTheme;
        themeCookie.value = newTheme;
    };

    return {
        theme,
        toggleTheme,
        setTheme,
        initTheme,
    };
};
