/**
 * Translation dictionaries — keys are dot-separated.
 *
 * Coverage strategy: only the most user-visible strings (nav, auth, settings,
 * page titles, dashboard summary). Deeper body content lives in component
 * files and falls back to the source-language string. Add keys here as you
 * translate more surfaces.
 */

export type Locale = 'nl' | 'en';

export const LOCALES: Locale[] = ['nl', 'en'];

const messages = {
  nl: {
    'nav.dashboard': 'Dashboard',
    'nav.charts': 'Charts',
    'nav.transactions': 'Transacties',
    'nav.dividends': 'Dividenden',
    'nav.goals': 'Doelen',
    'nav.tax': 'Belasting',
    'nav.alerts': 'Alerts',
    'nav.connections': 'Connecties',
    'nav.settings': 'Instellingen',
    'nav.account': 'Account',
    'nav.logout': 'Uitloggen',

    'auth.login.title': 'Welkom terug',
    'auth.register.title': 'Account aanmaken',
    'auth.email': 'Email',
    'auth.password': 'Wachtwoord',
    'auth.password.minChars': 'Minimaal 8 tekens.',
    'auth.password.forgot': 'Vergeten?',
    'auth.login.submit': 'Inloggen',
    'auth.register.submit': 'Account aanmaken',
    'auth.login.cta': 'Nog geen account?',
    'auth.login.cta.link': 'Registreer',
    'auth.register.cta': 'Al een account?',
    'auth.register.cta.link': 'Inloggen',
    'auth.confirmEmail': 'Check je email om je account te bevestigen.',
    'auth.forgot.title': 'Wachtwoord vergeten?',
    'auth.forgot.description':
      'Vul je email-adres in. We sturen je een link om je wachtwoord opnieuw in te stellen.',
    'auth.forgot.submit': 'Reset-link versturen',
    'auth.forgot.sent': 'Check je email — als dit adres bekend is sturen we een reset-link.',
    'auth.forgot.back': 'Terug naar inloggen',
    'auth.reset.title': 'Nieuw wachtwoord instellen',
    'auth.reset.description': 'Je bent ingelogd via de reset-link. Stel hieronder een nieuw wachtwoord in.',
    'auth.reset.submit': 'Wachtwoord instellen',

    'common.cancel': 'Annuleren',
    'common.save': 'Opslaan',
    'common.delete': 'Verwijder',
    'common.edit': 'Bewerk',
    'common.loading': 'Bezig...',

    'dashboard.totalValue': 'Totale portfolio-waarde',
    'dashboard.assets': 'Assets',
    'dashboard.newAsset': 'Nieuw asset',
    'dashboard.empty': 'Nog geen assets. Klik op',
    'dashboard.empty.cta': 'Nieuw asset',
    'dashboard.empty.suffix': 'om er een toe te voegen.',

    'page.charts.title': 'Charts & spreiding',
    'page.charts.description':
      'Diepere analyse: groei per asset-type, sector- en geografische spreiding, concentratie-rating.',
    'page.transactions.title': 'Transacties',
    'page.transactions.description':
      'Volledige historie van aan- en verkopen, dividenden en stortingen.',
    'page.dividends.title': 'Dividenden',
    'page.dividends.description':
      'Ontvangen dividenden, jaartotalen en bronbelasting voor je belastingaangifte.',
    'page.goals.title': 'Doelen',
    'page.goals.description': 'Stel financiële doelen en volg je voortgang.',
    'page.tax.title': '🇳🇱 Belasting',
    'page.tax.description':
      'Box 3 berekening, snapshots voor de aangifte, en dividendbelasting-overzicht.',
    'page.alerts.title': 'Price alerts',
    'page.alerts.description': 'Stel een alert in als een asset boven of onder een prijs komt.',
    'page.connections.title': 'Broker-connecties',
    'page.connections.description':
      'Koppel je brokers zodat we automatisch je portfolio synchroniseren.',
    'page.settings.title': 'Instellingen',
    'page.settings.description': 'Beheer hoe de app voor jou werkt.',
    'page.account.title': 'Account',
    'page.account.description': 'Beheer je inloggegevens en account.',

    'settings.appearance': 'Weergave',
    'settings.appearance.description': 'Kies tussen licht en donker thema.',
    'settings.theme.light': 'Licht',
    'settings.theme.dark': 'Donker',
    'settings.language': 'Taal',
    'settings.language.description': 'Kies de taal van de interface.',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.charts': 'Charts',
    'nav.transactions': 'Transactions',
    'nav.dividends': 'Dividends',
    'nav.goals': 'Goals',
    'nav.tax': 'Taxes',
    'nav.alerts': 'Alerts',
    'nav.connections': 'Connections',
    'nav.settings': 'Settings',
    'nav.account': 'Account',
    'nav.logout': 'Sign out',

    'auth.login.title': 'Welcome back',
    'auth.register.title': 'Create account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.password.minChars': 'At least 8 characters.',
    'auth.password.forgot': 'Forgot?',
    'auth.login.submit': 'Sign in',
    'auth.register.submit': 'Create account',
    'auth.login.cta': "Don't have an account?",
    'auth.login.cta.link': 'Sign up',
    'auth.register.cta': 'Already have an account?',
    'auth.register.cta.link': 'Sign in',
    'auth.confirmEmail': 'Check your email to confirm your account.',
    'auth.forgot.title': 'Forgot password?',
    'auth.forgot.description':
      "Enter your email address. We'll send you a link to reset your password.",
    'auth.forgot.submit': 'Send reset link',
    'auth.forgot.sent': "Check your email — if that address is on file, we've sent a reset link.",
    'auth.forgot.back': 'Back to sign in',
    'auth.reset.title': 'Set a new password',
    'auth.reset.description':
      'You are signed in via the reset link. Set a new password below.',
    'auth.reset.submit': 'Set password',

    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.loading': 'Loading...',

    'dashboard.totalValue': 'Total portfolio value',
    'dashboard.assets': 'Assets',
    'dashboard.newAsset': 'New asset',
    'dashboard.empty': 'No assets yet. Click',
    'dashboard.empty.cta': 'New asset',
    'dashboard.empty.suffix': 'to add one.',

    'page.charts.title': 'Charts & allocation',
    'page.charts.description':
      'Deeper analysis: growth per asset type, sector & geographic split, concentration rating.',
    'page.transactions.title': 'Transactions',
    'page.transactions.description':
      'Full history of buys, sells, dividends and deposits.',
    'page.dividends.title': 'Dividends',
    'page.dividends.description':
      'Received dividends, yearly totals and withholding tax for your tax return.',
    'page.goals.title': 'Goals',
    'page.goals.description': 'Set financial goals and track your progress.',
    'page.tax.title': '🇳🇱 Taxes',
    'page.tax.description':
      'Box 3 calculation, year-end snapshots, and dividend withholding overview.',
    'page.alerts.title': 'Price alerts',
    'page.alerts.description': 'Set an alert when an asset crosses a target price.',
    'page.connections.title': 'Broker connections',
    'page.connections.description':
      'Connect your brokers so we automatically sync your portfolio.',
    'page.settings.title': 'Settings',
    'page.settings.description': 'Manage how the app works for you.',
    'page.account.title': 'Account',
    'page.account.description': 'Manage your login details and account.',

    'settings.appearance': 'Appearance',
    'settings.appearance.description': 'Pick between light and dark theme.',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.language': 'Language',
    'settings.language.description': 'Choose the interface language.',
  },
} as const;

export type MessageKey = keyof (typeof messages)['nl'];

export function getMessages(locale: Locale): (typeof messages)[Locale] {
  return messages[locale] ?? messages.nl;
}

export function t(locale: Locale, key: MessageKey): string {
  const dict = getMessages(locale) as Record<string, string>;
  return dict[key] ?? messages.nl[key] ?? key;
}
