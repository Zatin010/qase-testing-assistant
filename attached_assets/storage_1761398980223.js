const StorageHelper = {
    async saveCredentials(token, projectCode) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({
                qaseToken: token,
                qaseProjectCode: projectCode,
                configured: true
            }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    },

    async getCredentials() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(['qaseToken', 'qaseProjectCode', 'configured'], (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve({
                        token: result.qaseToken || '',
                        projectCode: result.qaseProjectCode || '',
                        configured: result.configured || false
                    });
                }
            });
        });
    },

    async clearCredentials() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.remove(['qaseToken', 'qaseProjectCode', 'configured'], () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    },

    async getErrors() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(['errorQueue'], (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result.errorQueue || []);
                }
            });
        });
    },

    async saveErrors(errors) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ errorQueue: errors }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    },

    async clearErrors() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ errorQueue: [] }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageHelper;
}
