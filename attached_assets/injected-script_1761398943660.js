// injected-script.js - NEW FILE
// This script runs in the page context (not extension context) to intercept console.error

(function () {
    if (window.__qaseConsolePatched) {
        console.log('Qase Extension: Console already patched');
        return;
    }

    window.__qaseConsolePatched = true;
    console.log('Qase Extension: Patching console.error from injected script');

    const originalConsoleError = console.error;

    console.error = function (...args) {
        try {
            // Format the error message
            let message = args.map(arg => {
                if (arg instanceof Error) {
                    return arg.message;
                }
                try {
                    return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
                } catch (e) {
                    return String(arg);
                }
            }).join(' ');

            // Get stack trace
            let stack = 'No stack trace available';
            const errorArg = args.find(arg => arg instanceof Error);
            if (errorArg && errorArg.stack) {
                stack = errorArg.stack;
            } else {
                try {
                    stack = new Error().stack || stack;
                } catch (e) {
                    // Ignore
                }
            }

            // Dispatch custom event to content script
            window.dispatchEvent(new CustomEvent('__qase_console_error__', {
                detail: {
                    type: 'console_error',
                    message: message,
                    stack: stack,
                    url: window.location.href,
                    timestamp: new Date().toISOString(),
                    browserInfo: navigator.userAgent
                }
            }));

            console.log('Qase Extension: console.error intercepted');
        } catch (e) {
            // Silently fail to avoid breaking console.error
            console.log('Qase Extension: Error in console interceptor', e);
        }

        // Call original console.error
        originalConsoleError.apply(console, args);
    };

    console.log('Qase Extension: Console patching complete');
})();