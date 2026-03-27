import { RegisterForm } from '@/components/auth/register-form'
import { Card } from '@/components/ui/card'

export default function RegisterPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <h1 className="mb-6 text-2xl font-bold text-center">Регистрация</h1>
        <RegisterForm />
      </Card>
    </div>
  )
}
