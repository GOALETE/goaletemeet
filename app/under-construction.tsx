export default function UnderConstruction() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-4xl font-bold mb-4">🚧 Page Under Construction</h1>
      <p className="text-lg text-gray-600 mb-6">This page is coming soon. Please visit again later!</p>
      <p className="text-md text-gray-700 mb-2">In the meantime, please use the form below to register:</p>
      <a
        href="https://forms.gle/Xv7rnk3wrpCzpahx7"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition"
      >
        Open Google Form
      </a>
    </main>
  );
}
