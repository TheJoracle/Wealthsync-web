import { ForgotPasswordForm } from '@/components/forgot-password-form';

export const metadata = { title: 'Wachtwoord vergeten — WealthSync' };

export default function ForgotPasswordPage() {
  return (
    <>
      <h2 className="mb-2 text-2xl font-bold">Wachtwoord vergeten?</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Vul je email-adres in. We sturen je een link om je wachtwoord opnieuw in te stellen.
      </p>
      <ForgotPasswordForm />
    </>
  );
}
