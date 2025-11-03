import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trade Show Lead Capture | CleanSpace Technology',
  description: 'Submit your contact information at our trade show booth to learn more about CleanSpace respiratory protection solutions.',
}

export default function TradeShowLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
