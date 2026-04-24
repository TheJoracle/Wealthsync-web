/**
 * Inline script that sets the theme on <html> BEFORE the React tree paints,
 * so there's no flash of wrong theme on first load.
 *
 * Keep this tiny and dependency-free — it ships in every HTML document.
 */
export function ThemeScript() {
  const code = `
    (function() {
      try {
        var saved = localStorage.getItem('wealthsync-theme') || 'dark';
        document.documentElement.dataset.theme = saved;
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
