import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies primary variant by default', () => {
    render(<Button>Test</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-mountain-primary')
  })

  it('applies outline variant', () => {
    render(<Button variant="outline">Test</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('border-mountain-border')
  })

  it('shows disabled state', () => {
    render(<Button disabled>Test</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
