import { render, screen } from '@testing-library/react'
import { Navbar } from '@/components/nav/navbar'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  }),
}))

describe('Navbar', () => {
  it('renders logo', () => {
    render(<Navbar />)
    expect(screen.getByText('Mountaine')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<Navbar />)
    expect(screen.getByText('Маршруты')).toBeInTheDocument()
    expect(screen.getByText('Кладовка')).toBeInTheDocument()
    expect(screen.getByText('Знания')).toBeInTheDocument()
    expect(screen.getByText('Узлы')).toBeInTheDocument()
    expect(screen.getByText('Тренировки')).toBeInTheDocument()
  })

  it('shows login button when not authenticated', () => {
    render(<Navbar />)
    expect(screen.getByText('Войти')).toBeInTheDocument()
  })
})
