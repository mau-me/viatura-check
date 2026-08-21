'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFormState, useFormStatus } from 'react-dom'
import { Loader2, Lock, User, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { loginAction, setupPasswordAction, requestPasswordResetAction } from '@/actions/auth-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

type LoginState = {
  error?: string
  success?: boolean
  isFirstAccess?: boolean
  needsPassword?: boolean
  userCPF?: string
  redirectTo?: string
}

type SetupState = {
  error?: string
  success?: boolean
  redirectTo?: string
}

type ResetState = {
  error?: string
  success?: boolean
  message?: string
}

const loginInitial: LoginState = { error: undefined, success: false, isFirstAccess: false, needsPassword: false, userCPF: '' }
const setupInitial: SetupState = { error: undefined, success: false, redirectTo: '' }
const resetInitial: ResetState = { error: undefined, success: false, message: '' }

function SubmitButton({ label, loadingLabel }: { label: string; loadingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [currentCPF, setCurrentCPF] = useState('')
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [isFirstAccess, setIsFirstAccess] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [loginState, loginFormAction] = useFormState<LoginState, FormData>(loginAction, loginInitial)
  const [pwState, pwFormAction] = useFormState<LoginState, FormData>(loginAction, loginInitial)
  const [setupState, setupFormAction] = useFormState<SetupState, FormData>(setupPasswordAction, setupInitial)
  const [resetState, resetFormAction] = useFormState<ResetState, FormData>(requestPasswordResetAction, resetInitial)

  useEffect(() => {
    if (loginState.success && loginState.userCPF) {
      setCurrentCPF(loginState.userCPF)
      if (loginState.isFirstAccess) {
        setIsFirstAccess(true)
        setShowPasswordInput(true)
      } else if (loginState.needsPassword) {
        setIsFirstAccess(false)
        setShowPasswordInput(true)
      }
    }
    if (loginState.error) toast.error(loginState.error)
  }, [loginState])

  useEffect(() => {
    if (pwState.success && pwState.redirectTo) {
      router.push(pwState.redirectTo)
    }
    if (pwState.error) toast.error(pwState.error)
  }, [pwState, router])

  useEffect(() => {
    if (setupState.success && setupState.redirectTo) {
      toast.success('Senha definida com sucesso!')
      router.push(setupState.redirectTo)
    }
    if (setupState.error) toast.error(setupState.error)
  }, [setupState, router])

  useEffect(() => {
    if (resetState.success && resetState.message) {
      toast.info(resetState.message)
      setShowResetPassword(false)
      setCurrentCPF('')
    }
    if (resetState.error) toast.error(resetState.error)
  }, [resetState])

  const resetFlags = () => {
    setCurrentCPF('')
    setShowPasswordInput(false)
    setIsFirstAccess(false)
    setShowResetPassword(false)
    setShowPassword(false)
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <header className="text-center space-y-2">
        <div className="mx-auto size-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Controle de Viatura</h1>
        <p className="text-muted-foreground">
          {showPasswordInput
            ? 'Acesse sua conta'
            : showResetPassword
              ? 'Recuperacao de senha'
              : 'Entre com sua matricula para acessar o sistema'}
        </p>
      </header>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>
            {showResetPassword
              ? 'Solicitar Redefinicao'
              : showPasswordInput
                ? isFirstAccess
                  ? 'Criar Senha'
                  : 'Login'
                : 'Acesso'}
          </CardTitle>
          <CardDescription>
            {showResetPassword
              ? 'Informe sua matricula'
              : showPasswordInput
                ? isFirstAccess
                  ? 'Defina sua senha de acesso'
                  : 'Digite sua senha'
                : 'Use sua matricula'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showPasswordInput && !showResetPassword && (
            <form action={loginFormAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="matricula">Matricula</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="matricula"
                    name="matricula"
                    type="text"
                    placeholder="Ex: ADMIN001"
                    className="pl-10"
                    required
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>
              <SubmitButton label="Entrar" loadingLabel="Verificando..." />
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
            </form>
          )}

          {showPasswordInput && isFirstAccess && (
            <form action={setupFormAction} className="space-y-4">
              <input type="hidden" name="matricula" value={currentCPF} />
              <div className="space-y-2">
                <Label htmlFor="matricula-locked">Matricula</Label>
                <Input id="matricula-locked" value={currentCPF} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Sua nova senha"
                    className="pl-10 pr-10"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Mostrar ou ocultar senha"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Minimo 8 caracteres, 1 maiuscula, 1 numero</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirme sua nova senha"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              {setupState.error && (
                <Alert variant="destructive">
                  <AlertDescription>{setupState.error}</AlertDescription>
                </Alert>
              )}
              <SubmitButton label="Definir Senha" loadingLabel="Definindo Senha..." />
              <button
                type="button"
                onClick={resetFlags}
                className="w-full text-center text-sm text-muted-foreground hover:underline"
              >
                Voltar
              </button>
            </form>
          )}

          {showPasswordInput && !isFirstAccess && (
            <form action={pwFormAction} className="space-y-4">
              <input type="hidden" name="matricula" value={currentCPF} />
              <div className="space-y-2">
                <Label htmlFor="matricula-locked">Matricula</Label>
                <Input id="matricula-locked" value={currentCPF} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Sua senha"
                    className="pl-10 pr-10"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Mostrar ou ocultar senha"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
              {pwState.error && (
                <Alert variant="destructive">
                  <AlertDescription>{pwState.error}</AlertDescription>
                </Alert>
              )}
              <SubmitButton label="Entrar" loadingLabel="Entrando..." />
              <button
                type="button"
                onClick={resetFlags}
                className="w-full text-center text-sm text-muted-foreground hover:underline"
              >
                Voltar
              </button>
            </form>
          )}

          {showResetPassword && (
            <form action={resetFormAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-matricula">Matricula</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="reset-matricula"
                    name="matricula"
                    type="text"
                    placeholder="Ex: ADMIN001"
                    className="pl-10"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <SubmitButton label="Solicitar Redefinicao" loadingLabel="Solicitando..." />
              <button
                type="button"
                onClick={() => { setShowResetPassword(false); setCurrentCPF('') }}
                className="w-full text-center text-sm text-muted-foreground hover:underline"
              >
                Voltar ao Login
              </button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Controle de Carga de Viatura &copy; {new Date().getFullYear()}
      </p>
    </div>
  )
}
