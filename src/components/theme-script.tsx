/**
 * Inline script that sets the theme on <html> BEFORE the React tree paints,
 * so there's no flash of wrong theme on first load.
 *
 * Default = light. Adds the `dark` class when the user has chosen dark mode.
 */
export function ThemeScript() {
  const code = `
    (function() {
      try {
        var saved = localStorage.getItem('wealthsync-theme');
        if (saved === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
