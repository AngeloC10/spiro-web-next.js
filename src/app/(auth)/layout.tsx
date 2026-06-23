// Auth route group – passes through to pages; background/card is
// handled by the AuthLayout component inside each page.
export default function AuthRouteGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
