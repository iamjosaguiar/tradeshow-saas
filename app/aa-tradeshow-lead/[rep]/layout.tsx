import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'A+A Tradeshow 2025 Lead Capture | CleanSpace Technology',
  description: 'Submit your contact information at the A+A Tradeshow 2025 to learn more about CleanSpace respiratory protection solutions.',
}

export default function AATradeShowRepLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
