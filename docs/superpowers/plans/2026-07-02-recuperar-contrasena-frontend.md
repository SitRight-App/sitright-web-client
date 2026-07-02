# Recuperar contraseña — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar el paso 2 de recuperación de contraseña en el frontend: una `ResetPasswordPage` (`/reset-password?token=`) que pide la nueva contraseña y la envía al backend, más el servicio y la ruta.

**Architecture:** Feature `iam` (React 18 + TS + Vite + React Router + TanStack Query). Se agrega `resetPassword` en `authService` (thin wrapper de `apiFetch` a `POST /auth/reset-password`), una página nueva que reusa el layout de dos paneles de `ForgotPasswordPage`, y la ruta pública en `App.tsx`. Tests con vitest + React Testing Library.

**Tech Stack:** React 18, TypeScript strict, Vite, React Router v6 (`useSearchParams`, `useNavigate`, `Link`), framer-motion, vitest + @testing-library/react (jsdom).

## Global Constraints

- Contrato backend: `POST /api/v1/auth/reset-password` body `{ token: string, new_password: string }` → `204` OK | `400` enlace inválido/expirado o contraseña corta | `422` validación. `apiFetch` lanza `Error("API <status>: ...")` en respuestas no-OK y devuelve `undefined` en 204.
- Un feature NO importa de otro feature; lo común va en `shared/`. `resetPassword` vive en el propio `iam/services/authService.ts`.
- TypeScript strict, sin `any`, sin imports/variables sin uso.
- Validación cliente: contraseña mín. 8 caracteres y debe coincidir con la confirmación (mensajes claros antes de llamar al backend).
- Éxito → `navigate('/login')` + toast de éxito. Error del backend (token inválido/expirado) → estado "enlace inválido" con link a `/forgot-password`.
- Reusa el layout de dos paneles (marca + formulario) de `ForgotPasswordPage`.
- Commits con `git` normal (identidad del repo: `Christopher <79271081+ChrisByBits@users.noreply.github.com>`), sin atribución a Claude.
- Tests: `npm run test -- --run <ruta>`.

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `src/features/iam/services/authService.ts` | + `resetPassword(token, newPassword)` |
| `src/features/iam/services/authService.reset.test.ts` | test del servicio (mock de `fetch`) |
| `src/features/iam/pages/ResetPasswordPage.tsx` | página del paso 2 |
| `src/features/iam/pages/ResetPasswordPage.test.tsx` | tests de la página |
| `src/App.tsx` | + ruta pública `/reset-password` |

---

### Task 1: Servicio `resetPassword`

**Files:**
- Modify: `src/features/iam/services/authService.ts`
- Test: `src/features/iam/services/authService.reset.test.ts`

**Interfaces:**
- Consumes: `apiFetch<T>(path, options)` de `@/shared/api/client` (ya existe; `skipAuth`, lanza en no-OK, devuelve `undefined` en 204).
- Produces: `resetPassword(token: string, newPassword: string): Promise<void>` → `POST /auth/reset-password` con `{ token, new_password }`, `skipAuth: true`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/features/iam/services/authService.reset.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetPassword } from './authService'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('resetPassword', () => {
  it('hace POST a /auth/reset-password con token y new_password', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    await resetPassword('tok-123', 'NuevaClave1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/auth/reset-password')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ token: 'tok-123', new_password: 'NuevaClave1' })
  })

  it('lanza cuando el backend responde 400', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'El enlace no es válido o expiró',
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(resetPassword('malo', 'NuevaClave1')).rejects.toThrow(/400/)
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm run test -- --run src/features/iam/services/authService.reset.test.ts`
Expected: FAIL — `resetPassword` no está exportado en `authService`.

- [ ] **Step 3: Implementar el servicio**

En `src/features/iam/services/authService.ts`, agregar (junto a las otras funciones, p. ej. después de `requestPasswordReset`):

```ts
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiFetch<void>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
    skipAuth: true,
  })
}
```

(`apiFetch` ya está importado al inicio del archivo: `import { apiFetch } from '@/shared/api/client'`.)

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm run test -- --run src/features/iam/services/authService.reset.test.ts`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add src/features/iam/services/authService.ts \
        src/features/iam/services/authService.reset.test.ts
git commit -m "feat(iam): servicio resetPassword (POST /auth/reset-password)"
```

---

### Task 2: `ResetPasswordPage` + ruta

**Files:**
- Create: `src/features/iam/pages/ResetPasswordPage.tsx`
- Modify: `src/App.tsx`
- Test: `src/features/iam/pages/ResetPasswordPage.test.tsx`

**Interfaces:**
- Consumes: `resetPassword(token, newPassword)` (Task 1); `useToast()` de `@/shared/ui/toast` (`success(message, description?)`); `Brandmark` de `@/shared/ui/Brandmark`; React Router `useSearchParams`, `useNavigate`, `Link`.
- Produces: componente exportado `ResetPasswordPage`; ruta pública `/reset-password` en `App.tsx`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/features/iam/pages/ResetPasswordPage.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResetPasswordPage } from './ResetPasswordPage'
import { resetPassword } from '../services/authService'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../services/authService', () => ({ resetPassword: vi.fn() }))

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('ResetPasswordPage', () => {
  it('sin token muestra estado de enlace inválido con link a /forgot-password', () => {
    renderAt('/reset-password')
    expect(screen.getByText(/enlace no es válido|enlace inválido/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/nueva contraseña/i)).not.toBeInTheDocument()
    const link = screen.getByRole('link', { name: /solicitar.*nuevo|volver a solicitar|forgot/i })
    expect(link).toHaveAttribute('href', '/forgot-password')
  })

  it('no llama al backend si las contraseñas no coinciden', () => {
    renderAt('/reset-password?token=abc')
    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), { target: { value: 'ClaveLarga1' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'OtraClave2' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar|cambiar|restablecer/i }))
    expect(screen.getByText(/no coinciden/i)).toBeInTheDocument()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('no llama al backend si la contraseña es muy corta', () => {
    renderAt('/reset-password?token=abc')
    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), { target: { value: 'corta' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'corta' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar|cambiar|restablecer/i }))
    expect(screen.getByText(/8 caracteres/i)).toBeInTheDocument()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('éxito: llama a resetPassword y redirige a /login', async () => {
    vi.mocked(resetPassword).mockResolvedValueOnce(undefined)
    renderAt('/reset-password?token=abc')
    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), { target: { value: 'ClaveLarga1' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'ClaveLarga1' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar|cambiar|restablecer/i }))
    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith('abc', 'ClaveLarga1'))
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/login'))
  })

  it('error del backend muestra estado de enlace inválido/expirado', async () => {
    vi.mocked(resetPassword).mockRejectedValueOnce(new Error('API 400: nope'))
    renderAt('/reset-password?token=abc')
    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), { target: { value: 'ClaveLarga1' } })
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: 'ClaveLarga1' } })
    fireEvent.click(screen.getByRole('button', { name: /guardar|cambiar|restablecer/i }))
    expect(await screen.findByText(/enlace no es válido|expir/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /solicitar.*nuevo|volver a solicitar|forgot/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm run test -- --run src/features/iam/pages/ResetPasswordPage.test.tsx`
Expected: FAIL — `ResetPasswordPage` no existe.

- [ ] **Step 3: Crear la página**

Crear `src/features/iam/pages/ResetPasswordPage.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Brandmark } from '@/shared/ui/Brandmark'
import { useToast } from '@/shared/ui/toast'
import { resetPassword } from '../services/authService'

/**
 * HU-27 — pantalla del paso 2: el usuario llega desde el enlace del correo
 * (`/reset-password?token=...`), elige una nueva contraseña y la confirma.
 * Sin token, o si el backend rechaza el token (inválido/expirado), se muestra
 * el estado de "enlace inválido" con acceso a pedir uno nuevo.
 */

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

const ease = [0.16, 1, 0.3, 1] as const

function BrandPanel() {
  return (
    <section className="relative hidden overflow-hidden bg-moss-deep text-cream-bone lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-16">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(60% 55% at 18% 12%, rgba(77,107,85,0.55) 0%, transparent 60%), radial-gradient(50% 50% at 92% 88%, rgba(200,98,60,0.20) 0%, transparent 55%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(244,239,230,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(244,239,230,0.04) 1px, transparent 1px)',
          backgroundSize: '46px 46px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{ backgroundImage: NOISE }}
      />
      <header className="relative flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-cream-bone/10 ring-1 ring-cream-bone/15">
          <Brandmark />
        </div>
        <span className="text-lg font-semibold tracking-tight">SitRight</span>
      </header>
      <motion.div
        className="relative max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
      >
        <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight xl:text-[52px]">
          Elige tu nueva contraseña.
        </h1>
        <p className="mt-6 max-w-[42ch] text-[15px] leading-relaxed text-cream-bone/70">
          Ya casi está. Define una contraseña nueva y vuelve a entrar a SitRight.
        </p>
      </motion.div>
      <p className="relative font-mono text-[11px] uppercase tracking-[0.16em] text-cream-bone/40">
        SitRight · Lima · 2026
      </p>
    </section>
  )
}

function InvalidLink() {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.05fr_minmax(0,560px)]">
      <BrandPanel />
      <section className="flex items-center justify-center bg-cream px-6 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          <p className="text-[13px] font-medium text-terracotta-deep">Recuperación</p>
          <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight text-ink">
            Este enlace no es válido o expiró
          </h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
            Los enlaces de recuperación caducan en 1 hora y solo se pueden usar una vez.
            Solicita uno nuevo para continuar.
          </p>
          <Link
            to="/forgot-password"
            className="mt-8 inline-block text-[14px] font-medium text-moss hover:text-moss-deep"
          >
            Solicitar un nuevo enlace
          </Link>
        </div>
      </section>
    </div>
  )
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkInvalid, setLinkInvalid] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setSubmitting(true)
    try {
      await resetPassword(token, password)
      toast.success('Tu contraseña se actualizó', 'Ya puedes iniciar sesión.')
      navigate('/login')
    } catch {
      setLinkInvalid(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (!token || linkInvalid) {
    return <InvalidLink />
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.05fr_minmax(0,560px)]">
      <BrandPanel />
      <section className="flex items-center justify-center bg-cream px-6 py-12 sm:px-10">
        <motion.div
          className="w-full max-w-[400px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-moss-deep text-cream-bone">
              <Brandmark />
            </div>
            <span className="text-lg font-semibold tracking-tight text-ink">SitRight</span>
          </div>

          <p className="text-[13px] font-medium text-moss">Recuperación</p>
          <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-tight text-ink">
            Nueva contraseña
          </h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
            Elige una contraseña de al menos 8 caracteres y confírmala.
          </p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-ink">
                Nueva contraseña
              </label>
              <input
                id="password"
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Al menos 8 caracteres"
                className="w-full rounded-xl border border-sand bg-cream-bone px-4 py-3 text-[15px] text-ink shadow-sm transition-colors placeholder:text-ink-faint focus:border-moss focus:outline-none focus:ring-4 focus:ring-moss/15"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-[13px] font-medium text-ink">
                Confirmar contraseña
              </label>
              <input
                id="confirm"
                required
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full rounded-xl border border-sand bg-cream-bone px-4 py-3 text-[15px] text-ink shadow-sm transition-colors placeholder:text-ink-faint focus:border-moss focus:outline-none focus:ring-4 focus:ring-moss/15"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-terracotta/40 bg-terracotta/10 px-4 py-3 text-[14px] text-terracotta-deep"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group flex w-full items-center justify-between gap-2 rounded-xl bg-moss py-3 pl-5 pr-3 text-[15px] font-semibold text-cream-bone shadow-sm transition hover:bg-moss-deep active:scale-[0.97] disabled:opacity-60"
            >
              <span>{submitting ? 'Guardando…' : 'Guardar contraseña'}</span>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-cream-bone/15 transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              </span>
            </button>
          </form>

          <p className="mt-8 text-center text-[14px] text-ink-soft">
            <Link to="/login" className="font-medium text-moss hover:text-moss-deep">
              Volver al inicio de sesión
            </Link>
          </p>
        </motion.div>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Registrar la ruta en `App.tsx`**

En `src/App.tsx`:

4a. Agregar el import (junto a `import { ForgotPasswordPage } ...`):

```tsx
import { ResetPasswordPage } from '@/features/iam/pages/ResetPasswordPage'
```

4b. Agregar la ruta pública (después de la de `/forgot-password`):

```tsx
              <Route path="/reset-password" element={<ResetPasswordPage />} />
```

- [ ] **Step 5: Correr los tests de la página y verificar que pasan**

Run: `npm run test -- --run src/features/iam/pages/ResetPasswordPage.test.tsx`
Expected: PASS (5 passed).

- [ ] **Step 6: Verificar build (type-check) y toda la suite del feature**

Run: `npm run build`
Expected: build limpio (tsc + vite), solo el warning preexistente de tamaño de chunk.

Run: `npm run test -- --run src/features/iam`
Expected: PASS (los tests de iam en verde, incluidos los nuevos).

- [ ] **Step 7: Commit**

```bash
git add src/features/iam/pages/ResetPasswordPage.tsx \
        src/features/iam/pages/ResetPasswordPage.test.tsx src/App.tsx
git commit -m "feat(iam): ResetPasswordPage (/reset-password) y ruta"
```

---

## Prueba manual (fin a fin, opcional)

Con el backend corriendo en modo dev (sin credenciales Brevo): pedir el enlace en
`/forgot-password`, copiar del log del backend la URL `.../reset-password?token=...`,
abrirla en el navegador, elegir una contraseña nueva y confirmar que redirige a
`/login` y que se puede entrar con la contraseña nueva. Un token ya usado o vencido
debe mostrar el estado de "enlace inválido".
