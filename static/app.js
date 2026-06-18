document.addEventListener('DOMContentLoaded', () => {
    const setupCard = document.getElementById('setupCard');
    const progressCard = document.getElementById('progressCard');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resetBtn = document.getElementById('resetBtn');
    const formUrlInput = document.getElementById('formUrl');
    const amountInput = document.getElementById('amount');
    const setupError = document.getElementById('setupError');
    
    const formTitleEl = document.getElementById('formTitle');
    const progressBar = document.getElementById('progressBar');
    const progressCount = document.getElementById('progressCount');
    const timeEstimate = document.getElementById('timeEstimate');
    const logWindow = document.getElementById('logWindow');

    let currentFields = [];
    let currentUrl = '';
    
    function logMessage(msg, type = 'info') {
        const el = document.createElement('div');
        el.className = `log-entry ${type}`;
        
        const time = new Date().toLocaleTimeString([], {hour12: false});
        el.textContent = `[${time}] ${msg}`;
        
        logWindow.appendChild(el);
        logWindow.scrollTop = logWindow.scrollHeight;
    }

    analyzeBtn.addEventListener('click', async () => {
        const url = formUrlInput.value.trim();
        const amount = parseInt(amountInput.value);

        if (!url) {
            setupError.textContent = 'Please enter a Google Form URL.';
            return;
        }
        if (!amount || amount < 1) {
            setupError.textContent = 'Please enter a valid amount.';
            return;
        }

        setupError.textContent = '';
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analyzing Form...';

        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to analyze form.');
            }

            currentFields = data.fields;
            currentUrl = url;
            formTitleEl.textContent = data.title;
            
            startSubmission(amount);
            
        } catch (err) {
            setupError.textContent = err.message;
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analyze & Start';
        }
    });

    async function startSubmission(totalAmount) {
        setupCard.classList.add('hidden');
        progressCard.classList.remove('hidden');
        resetBtn.classList.add('hidden');
        logWindow.innerHTML = '';
        
        progressBar.style.width = '0%';
        progressCount.textContent = `0 / ${totalAmount}`;
        
        logMessage(`Starting automated submission of ${totalAmount} responses...`);
        logMessage(`Detected ${currentFields.length} actionable fields.`);

        // Target total duration is ~120s max for safety.
        // If amount is small, maybe 1s per request. If amount is large, we bound it to 2 minutes.
        const TARGET_DURATION_MS = 120 * 1000;
        let delayMs = Math.floor(TARGET_DURATION_MS / totalAmount);
        
        if (delayMs < 200) delayMs = 200; // Hard minimum 200ms
        if (delayMs > 2500) delayMs = Math.floor(Math.random() * 1000 + 1500); // Max ~2.5s

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < totalAmount; i++) {
            // Generate Payload
            const payload = new URLSearchParams();
            payload.append('fvv', '1');
            payload.append('pageHistory', '0');
            
            currentFields.forEach(f => {
                if (f.options && f.options.length > 0) {
                    // Try to be smart if 5 options (Likert scale)
                    if (f.options.length === 5) {
                        const weights = [5, 10, 20, 45, 20];
                        let totalWeight = 100;
                        let random = Math.random() * totalWeight;
                        let selectedIndex = 0;
                        for(let j=0; j<weights.length; j++) {
                            random -= weights[j];
                            if(random <= 0) {
                                selectedIndex = j;
                                break;
                            }
                        }
                        payload.append(f.id, f.options[selectedIndex]);
                    } else {
                        // Pure random
                        const randomOpt = f.options[Math.floor(Math.random() * f.options.length)];
                        payload.append(f.id, randomOpt);
                    }
                } else {
                    payload.append(f.id, 'Random response');
                }
            });

            // Calculate remaining time
            const remainingRequests = totalAmount - i;
            const estimatedMs = remainingRequests * delayMs;
            timeEstimate.textContent = `Est. time: ${Math.ceil(estimatedMs / 1000)}s`;

            try {
                const res = await fetch('/api/submit_single', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: currentUrl, payload: payload.toString() })
                });

                if (res.ok) {
                    successCount++;
                    logMessage(`Response ${i + 1} submitted successfully.`, 'success');
                } else {
                    errorCount++;
                    const data = await res.json();
                    logMessage(`Response ${i + 1} failed: ${data.message}`, 'error');
                }
            } catch (err) {
                errorCount++;
                logMessage(`Response ${i + 1} failed: Network error`, 'error');
            }

            // Update UI
            progressBar.style.width = `${((i + 1) / totalAmount) * 100}%`;
            progressCount.textContent = `${i + 1} / ${totalAmount}`;

            // Wait before next request (unless it's the last one)
            if (i < totalAmount - 1) {
                await new Promise(r => setTimeout(r, delayMs));
            }
        }

        timeEstimate.textContent = 'Finished';
        logMessage(`Done! Successful: ${successCount}. Errors: ${errorCount}.`);

        // Send data to Google Analytics
        if (typeof window.gtag === 'function') {
            window.gtag('event', 'form_filled', {
                'successful_responses': successCount,
                'failed_responses': errorCount,
                'form_url': currentUrl,
                'value': successCount
            });
        }

        resetBtn.classList.remove('hidden');
    }

    resetBtn.addEventListener('click', () => {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze & Start';
        progressCard.classList.add('hidden');
        setupCard.classList.remove('hidden');
    });
});
