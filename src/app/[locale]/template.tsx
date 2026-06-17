// Re-mounts on every navigation → gives each page a subtle fade-in entrance,
// so route changes feel intentional rather than abrupt (issue: page transitions).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="bc-page-enter">{children}</div>;
}
