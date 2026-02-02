import { useRegisterSW } from 'virtual:pwa-register/react'

export default function ReloadPrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r)
        },
        onRegisterError(error) {
            console.log('SW registration error', error)
        },
    })

    const close = () => {
        setNeedRefresh(false)
    }

    return (
        <div className="ReloadPrompt-container">
            {needRefresh && (
                <div
                    className="fixed bottom-0 right-0 m-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col gap-2 max-w-sm"
                    role="alert"
                >
                    <div className="text-gray-900 dark:text-white font-medium">
                        New content available, click on reload button to update.
                    </div>
                    <div className="flex gap-2 mt-2">
                        <button
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
                            onClick={() => updateServiceWorker(true)}
                        >
                            Reload
                        </button>
                        <button
                            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-medium transition-colors"
                            onClick={() => close()}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
