
import React, { useEffect, useState } from 'react';
import { Share, X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);

        // Check if running in standalone mode (already installed)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

        if (isStandalone) {
            return; // Already installed, do nothing
        }

        setIsIOS(isIosDevice);

        if (isIosDevice) {
            // Force show for iOS if not dismissed recently (e.g., 7 days)
            const lastDismissed = localStorage.getItem('pwa_prompt_dismissed');
            if (!lastDismissed || Date.now() - parseInt(lastDismissed) > 7 * 24 * 60 * 60 * 1000) {
                // Delay slighty for better UX
                setTimeout(() => setShowPrompt(true), 3000);
            }
        } else {
            // Android / Chrome: Listen for native prompt event
            const handler = (e: Event) => {
                e.preventDefault();
                setDeferredPrompt(e as BeforeInstallPromptEvent);

                // Check dismissal for Android too
                const lastDismissed = localStorage.getItem('pwa_prompt_dismissed');
                if (!lastDismissed || Date.now() - parseInt(lastDismissed) > 7 * 24 * 60 * 60 * 1000) {
                    setShowPrompt(true);
                }
            };

            window.addEventListener('beforeinstallprompt', handler);
            return () => window.removeEventListener('beforeinstallprompt', handler);
        }
    }, []);

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 relative max-w-md mx-auto">
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-start gap-4">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg shrink-0">
                        {isIOS ? <Share className="w-6 h-6 text-blue-600 dark:text-blue-400" /> : <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                    </div>

                    <div className="flex-1 pr-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            Install Finance Tracker
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                            {isIOS
                                ? "Install this app on your screen only works for iPhone/iPad users."
                                : "Install this app on your home screen for quick and easy access when you're on the go."}
                        </p>

                        {isIOS ? (
                            <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                <p className="flex items-center gap-2 mb-1">
                                    1. Tap the <Share className="w-4 h-4" /> Share button below
                                </p>
                                <p className="flex items-center gap-2">
                                    2. Select <span className="font-medium text-gray-900 dark:text-white">Add to Home Screen</span>
                                </p>
                            </div>
                        ) : (
                            <button
                                onClick={handleInstallClick}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Install App
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
