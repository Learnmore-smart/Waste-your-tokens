'use client'

import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-8 gap-6">
          <h1 className="text-4xl font-bold text-red-500">Something went wrong</h1>
          <p className="text-zinc-400 text-sm max-w-md text-center">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="px-6 py-3 rounded-lg font-bold text-white text-sm uppercase tracking-wider cursor-pointer border-none"
            style={{ background: 'linear-gradient(135deg, #f97316, #dc2626)' }}
          >
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
