class QaseAPI {
    constructor(token, projectCode) {
        this.token = token;
        this.projectCode = projectCode;
        this.baseURL = 'https://api.qase.io/v1';
        this.requestCount = 0;
        this.requestResetTime = Date.now() + 60000;
    }

    checkRateLimit() {
        if (Date.now() > this.requestResetTime) {
            this.requestCount = 0;
            this.requestResetTime = Date.now() + 60000;
        }

        if (this.requestCount >= 600) {
            throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }

        this.requestCount++;
    }

    async createDefect(defectData) {
        return this.retryWithBackoff(async () => {
            this.checkRateLimit();

            try {
                const response = await fetch(
                    `${this.baseURL}/defect/${this.projectCode}`,
                    {
                        method: 'POST',
                        headers: {
                            'Token': this.token,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            title: defectData.title,
                            actual_result: defectData.actual_result,
                            severity: defectData.severity || 'major'
                        })
                    }
                );

                if (!response.ok) {
                    let errorMessage = `API Error: ${response.status}`;
                    let isRetryable = false;

                    if (response.status === 401) {
                        errorMessage = 'Invalid API token. Please check your credentials.';
                    } else if (response.status === 403) {
                        errorMessage = 'Permission denied. Please check your API token permissions.';
                    } else if (response.status === 404) {
                        errorMessage = 'Project not found. Please check your project code.';
                    } else if (response.status >= 500) {
                        errorMessage = 'Qase server error. Please try again later.';
                        isRetryable = true;
                    }

                    const error = new Error(errorMessage);
                    error.retryable = isRetryable;
                    throw error;
                }

                return response.json();
            } catch (error) {
                if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                    const networkError = new Error('Network error. Please check your internet connection.');
                    networkError.retryable = true;
                    throw networkError;
                }
                throw error;
            }
        });
    }

    async validateCredentials() {
        return this.retryWithBackoff(async () => {
            this.checkRateLimit();

            try {
                const response = await fetch(
                    `${this.baseURL}/project/${this.projectCode}`,
                    {
                        headers: { 'Token': this.token }
                    }
                );

                if (response.status === 401) {
                    const error = new Error('Invalid API token');
                    error.retryable = false;
                    throw error;
                } else if (response.status === 404) {
                    const error = new Error('Project not found');
                    error.retryable = false;
                    throw error;
                } else if (response.status >= 500) {
                    const error = new Error('Server error. Please try again later.');
                    error.retryable = true;
                    throw error;
                } else if (!response.ok) {
                    const error = new Error('Validation failed');
                    error.retryable = false;
                    throw error;
                }

                return true;
            } catch (error) {
                if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                    const networkError = new Error('Network error. Please check your internet connection.');
                    networkError.retryable = true;
                    throw networkError;
                }
                throw error;
            }
        });
    }

    async retryWithBackoff(operation, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                if (error.retryable === false || i === maxRetries - 1) {
                    throw error;
                }

                const delay = Math.pow(2, i) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = QaseAPI;
}
