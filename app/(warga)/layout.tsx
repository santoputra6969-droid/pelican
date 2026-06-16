export default function WargaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="app-shell relative">{children}</div>;
}
