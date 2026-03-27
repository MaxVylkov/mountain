import { LoginForm } from '@/components/auth/login-form'
import { Card } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <h1 className="mb-6 text-2xl font-bold text-center">Вход в Mountaine</h1>
        <LoginForm />
      </Card>
    </div>
  )
}
