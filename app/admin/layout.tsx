export const metadata = {
  title: 'Admin Dashboard | Goalete Meet',
  description: 'Admin dashboard for Goalete Meet application',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section>
      {children}
    </section>
  );
}
