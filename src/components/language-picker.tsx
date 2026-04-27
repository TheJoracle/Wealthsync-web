import { setLocale } from '@/lib/i18n/actions';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n/dictionaries';

const FLAGS: Record<Locale, { label: string; emoji: string }> = {
  nl: { label: 'Nederlands', emoji: '🇳🇱' },
  en: { label: 'English', emoji: '🇬🇧' },
};

export function LanguagePicker({ current }: { current: Locale }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(FLAGS) as Locale[]).map((code) => (
        <form key={code} action={setLocale}>
          <input type="hidden" name="locale" value={code} />
          <input type="hidden" name="back" value="/settings" />
          <Button type="submit" variant={code === current ? 'default' : 'outline'}>
            <span aria-hidden>{FLAGS[code].emoji}</span>
            {FLAGS[code].label}
          </Button>
        </form>
      ))}
    </div>
  );
}
