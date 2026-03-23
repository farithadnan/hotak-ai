import '@testing-library/jest-dom'

// Silence console.error for expected test warnings (e.g. missing context providers).
const originalError = console.error.bind(console)
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? '')
    // Suppress known noisy warnings in tests.
    if (
      msg.includes('Warning:') ||
      msg.includes('ReactDOM.render') ||
      msg.includes('act(')
    ) return
    originalError(...args)
  }
})
afterAll(() => {
  console.error = originalError
})
