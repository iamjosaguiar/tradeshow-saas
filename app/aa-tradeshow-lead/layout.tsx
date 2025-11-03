import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'A+A Tradeshow Lead Capture | CleanSpace Technology',
  description: 'Submit your contact information at the A+A Tradeshow to learn more about CleanSpace respiratory protection solutions.',
}

export default function AATradeShowLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
