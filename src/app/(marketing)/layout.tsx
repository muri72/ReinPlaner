// Minimal layout - each page uses <MarketingPage> for full design system
// This wrapper just provides segment-level context
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
