import { AuthForm } from '@/components/auth-form';

export const metadata = {
  title: 'Inloggen — WealthSync',
};

export default function LoginPage() {
  return (
    <>
      <h2 className="mb-6 text-2xl font-bold">Welkom terug</h2>
      <AuthForm mode="login" />
    </>
  );
}
