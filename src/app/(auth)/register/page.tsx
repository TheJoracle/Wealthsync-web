import { AuthForm } from '@/components/auth-form';

export const metadata = {
  title: 'Registreren — WealthSync',
};

export default function RegisterPage() {
  return (
    <>
      <h2 className="mb-6 text-2xl font-bold">Account aanmaken</h2>
      <AuthForm mode="register" />
    </>
  );
}
