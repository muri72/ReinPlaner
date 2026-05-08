import Link from 'next/link'

export const metadata = {
  title: 'Rolle wird zugewiesen — ReinPlaner',
}

export default function RolePendingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-md p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
          Konto wird vorbereitet
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Dein Konto wurde erstellt, aber dir wurde noch keine Rolle zugewiesen.
          Bitte kontaktiere deinen Administrator, damit dieser dir die richtigen
          Berechtigungen gibt. Sobald das erledigt ist, kannst du dich neu anmelden.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2"
          >
            Zur Anmeldung
          </Link>
          <Link
            href="/"
            className="inline-block text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </main>
  )
}
