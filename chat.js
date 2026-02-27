let uploadedFile = null;
let conversationHistory = [];
let lastDocumentText = null; // Store last uploaded document text
let lastUploadedPriceSeries = null;
const BEGINNER_MODE_KEY = 'chat_beginner_mode';
const AI_RESPONSE_FONT_SIZE_KEY = 'chat_ai_response_font_size';
const AI_READER_MODE_KEY = 'chat_ai_reader_mode';
const CHAT_TOOLS_OPEN_KEY = 'chat_tools_open';
const CHAT_GUIDE_OPEN_KEY = 'chat_guide_open';
const DEFAULT_AI_RESPONSE_FONT_SIZE = 16;
const chartRenderers = new Map();
let chartThemeSyncInitialized = false;
const OPENAI_CHAT_ENDPOINT = 'https://openai-api-worker.magar-t-daniel.workers.dev/';
const CLOUDFLARE_RAG_ENDPOINT = 'https://openai-api-worker.magar-t-daniel.workers.dev/rag';
const NEWS_FEED_ENDPOINT = `${OPENAI_CHAT_ENDPOINT.replace(/\/$/, '')}/news`;

// Configure PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Toast notification system (reuse from main app)
function showToast(message, type = 'info', title = '', duration = 5000) {
    const container = document.getElementById('toast-container')
    const toast = document.createElement('div')
    toast.className = `toast ${type}`

    const icons = {
        error: '❌',
        warning: '⚠️',
        success: '✅',
        info: 'ℹ️'
    }

    const titles = {
        error: title || 'Error',
        warning: title || 'Warning',
        success: title || 'Success',
        info: title || 'Info'
    }

    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <div class="toast-content">
            <div class="toast-title">${titles[type]}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `

    container.appendChild(toast)

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease'
        setTimeout(() => toast.remove(), 300)
    }, duration)
}

// File upload handling
document.getElementById('attach-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.txt') && !lowerName.endsWith('.csv')) {
        showToast('Please upload only PDF, TXT, or CSV files', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
    }

    uploadedFile = file;
    lastUploadedPriceSeries = null;
    document.getElementById('file-name').textContent = `📄 ${file.name}`;
    document.getElementById('file-upload-section').style.display = 'block';
    showToast(`File "${file.name}" attached successfully`, 'success', 'File Attached', 3000);
});

document.getElementById('remove-file-btn').addEventListener('click', () => {
    uploadedFile = null;
    lastDocumentText = null; // Clear document context
    lastUploadedPriceSeries = null;
    document.getElementById('file-input').value = '';
    document.getElementById('file-upload-section').style.display = 'none';
    showToast('File removed. Document context cleared.', 'info', 'Removed', 2000);
});

// Auto-resize textarea
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';
});

function applyAiResponseFontSize(sizePx) {
    if (!chatMessages) return;
    const parsed = Number(sizePx);
    const safeSize = Number.isFinite(parsed) ? Math.max(12, Math.min(16, parsed)) : DEFAULT_AI_RESPONSE_FONT_SIZE;
    const lineHeightMap = {
        12: 1.5,
        13: 1.56,
        14: 1.62,
        15: 1.67,
        16: 1.72
    };
    chatMessages.style.setProperty('--ai-response-font-size', `${safeSize}px`);
    chatMessages.style.setProperty('--ai-response-line-height', String(lineHeightMap[safeSize] || 1.5));
    localStorage.setItem(AI_RESPONSE_FONT_SIZE_KEY, String(safeSize));
}

function setReaderMode(enabled) {
    if (!chatMessages) return;
    chatMessages.style.setProperty('--ai-response-max-width', enabled ? '88%' : '76%');
    localStorage.setItem(AI_READER_MODE_KEY, enabled ? 'on' : 'off');
}

function applyPromptToComposer(prompt, autoSend = false) {
    if (!prompt) return;
    chatInput.value = prompt;
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';
    chatInput.focus();
    if (autoSend) {
        sendMessage();
    }
}

// Send message
async function sendMessage() {
    const input = chatInput.value.trim();

    if (!input && !uploadedFile) {
        showToast('Please enter a message or upload a file', 'warning');
        return;
    }

    // Add user message
    if (input) {
        addMessage(input, 'user');
    }

    if (uploadedFile) {
        addMessage(`📄 Uploaded: ${uploadedFile.name}`, 'user');
    }

    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Show typing indicator
    const typingId = addTypingIndicator();

    try {
        let response;

        if (uploadedFile) {
            // Send file for RAG analysis
            response = await analyzeDocument(uploadedFile, input);
        } else {
            // Send text query
            response = await sendChatQuery(input);
        }

        removeTypingIndicator(typingId);
        addMessage(response, 'bot');

        // Skip chart generation for simple acknowledgments
        const isAcknowledgment = /^(thanks?|thank you|ok|okay|got it|alright|cool|great|nice|perfect|awesome|appreciate it|you'?re welcome|welcome|good job|well done|excellent|amazing|fantastic|wonderful|brilliant|you'?re (great|awesome|amazing|the best|good|helpful)|that'?s (great|awesome|perfect|helpful|good))\.?\s*(thanks?|thank you)?[!.]*$/i.test(input.trim());

        // Real price variation chart flow (on demand)
        const priceRequest = parsePriceChartRequest(input);
        if (priceRequest && !isAcknowledgment) {
            try {
                const priceData = await fetchTickerPriceSeries(priceRequest.ticker, priceRequest.days);
                if (priceData && priceData.length >= 2) {
                    addPriceVariationMessage(priceRequest.ticker, priceRequest.label, priceData);
                } else {
                    addMessage(`I couldn't load enough price data for ${priceRequest.ticker} to build a variation chart right now.`, 'bot');
                }
            } catch (e) {
                addMessage(`I couldn’t fetch live price variation data for ${priceRequest.ticker} right now. Please try again in a moment.`, 'bot');
            }
        }

        // Add dynamic insights only when response has meaningful financial data
        if (!isAcknowledgment && shouldRenderInsightCharts(input, response, lastDocumentText)) {
            addDynamicInsightCharts(response, lastDocumentText);
        }

        // If uploaded CSV contains OHLC, always add variation chart for uploaded context
        if (uploadedFile && lastUploadedPriceSeries && lastUploadedPriceSeries.length >= 2) {
            const tickerGuess = extractTickerCandidate(input) || 'Uploaded Data';
            addPriceVariationMessage(tickerGuess, 'Uploaded Price Series', lastUploadedPriceSeries);
        }

        // Clear uploaded file after sending
        if (uploadedFile) {
            uploadedFile = null;
            document.getElementById('file-input').value = '';
            document.getElementById('file-upload-section').style.display = 'none';
            lastUploadedPriceSeries = null;
        }

    } catch (error) {
        removeTypingIndicator(typingId);
        console.error('Chat error:', error);

        // Show appropriate error message
        if (error.message.includes('Failed to get AI response') || error.message.includes('Failed to analyze')) {
            addMessage('Sorry, I\'m having trouble connecting to the server. Please try again in a moment.', 'bot');
            showToast('Connection error. Please check your internet and try again.', 'error');
        } else {
            addMessage('I apologize, but I can only assist with stock market and financial questions. Please ask me about stocks, market trends, or investment analysis.', 'bot');
        }
    }
}

function parsePriceChartRequest(inputText) {
    if (!inputText) return null;
    const input = inputText.toLowerCase();
    const wantsChart = /\b(price|chart|graph|variation|volatility|trend|index|up and down|history|historical)\b/i.test(inputText);
    if (!wantsChart) return null;

    const ticker = extractTickerCandidate(inputText);
    if (!ticker) return null;

    // Current data source supports US tickers only.
    if (/\.(ns|bo|nse|bse)$/i.test(ticker)) return null;

    let days = 90;
    let label = 'Last 3 Months';
    if (/\b(1\s*week|7\s*days?)\b/.test(input)) {
        days = 7; label = 'Last 1 Week';
    } else if (/\b(2\s*weeks?|14\s*days?)\b/.test(input)) {
        days = 14; label = 'Last 2 Weeks';
    } else if (/\b(1\s*month|30\s*days?)\b/.test(input)) {
        days = 30; label = 'Last 1 Month';
    } else if (/\b(3\s*months?|90\s*days?)\b/.test(input) || /\bq[1-4]\b/.test(input)) {
        days = 90; label = 'Last 3 Months';
    } else if (/\b(6\s*months?|180\s*days?)\b/.test(input)) {
        days = 180; label = 'Last 6 Months';
    } else if (/\b(1\s*year|12\s*months?|365\s*days?)\b/.test(input)) {
        days = 365; label = 'Last 1 Year';
    }

    return { ticker, days, label };
}

function extractTickerCandidate(text) {
    const candidates = (text.match(/\b[A-Za-z]{2,5}(?:\.(?:NS|BO|NSE|BSE))?\b/g) || [])
        .map((s) => s.toUpperCase());
    if (!candidates.length) return null;

    const stop = new Set([
        'PRICE', 'CHART', 'GRAPH', 'TREND', 'INDEX', 'WITH', 'FROM', 'WHAT', 'SHOW',
        'LAST', 'MONTH', 'MONTHS', 'WEEK', 'WEEKS', 'YEAR', 'YEARS', 'DATA', 'DOWN',
        'UP', 'AND', 'FOR', 'THE', 'THIS', 'THAT', 'Q1', 'Q2', 'Q3', 'Q4', 'BUY', 'SELL', 'HOLD'
    ]);

    const filtered = candidates.filter((c) => !stop.has(c));
    return filtered[0] || null;
}

function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getRecentTradingDate() {
    const now = new Date();
    const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    estDate.setDate(estDate.getDate() - 1);
    const day = estDate.getDay();
    if (day === 0) estDate.setDate(estDate.getDate() - 2);
    if (day === 6) estDate.setDate(estDate.getDate() - 1);
    return estDate;
}

async function fetchTickerPriceSeries(ticker, daysBack) {
    const end = getRecentTradingDate();
    const start = new Date(end);
    start.setDate(start.getDate() - daysBack);
    const startDate = formatDateISO(start);
    const endDate = formatDateISO(end);

    const url = `https://polygon-api-worker.magar-t-daniel.workers.dev/?ticker=${ticker}&start=${startDate}&end=${endDate}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Market data fetch failed');

    const json = await response.json();
    if (!json.results || !json.results.length) return [];
    return json.results.map((d) => ({
        date: new Date(d.t).toISOString().split('T')[0],
        open: d.o,
        close: d.c
    }));
}

function addPriceVariationMessage(ticker, periodLabel, priceSeries) {
    const container = document.getElementById('chat-messages');
    const msg = document.createElement('div');
    msg.className = 'message bot-message';
    const chartId = `price-variation-${Date.now()}`;

    const first = priceSeries[0].close;
    const last = priceSeries[priceSeries.length - 1].close;
    const high = Math.max(...priceSeries.map((p) => p.close));
    const low = Math.min(...priceSeries.map((p) => p.close));
    const changePct = first === 0 ? 0 : ((last - first) / first) * 100;
    let upDays = 0;
    let downDays = 0;
    for (let i = 1; i < priceSeries.length; i++) {
        const prev = priceSeries[i - 1].close;
        const curr = priceSeries[i].close;
        if (curr > prev) upDays++;
        else if (curr < prev) downDays++;
    }

    msg.innerHTML = `
        <div class="message-avatar">📈</div>
        <div class="message-content chart-content">
            <h3>${ticker} Price Variation (${periodLabel})</h3>
            <p>Start: <strong>${first.toFixed(2)}</strong> | End: <strong>${last.toFixed(2)}</strong> | Change: <strong>${changePct.toFixed(2)}%</strong></p>
            <p>High: <strong>${high.toFixed(2)}</strong> | Low: <strong>${low.toFixed(2)}</strong> | Up Days: <strong>${upDays}</strong> | Down Days: <strong>${downDays}</strong></p>
            <canvas id="${chartId}" style="max-height: 320px;"></canvas>
        </div>
    `;

    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;

    let chart = null;
    registerChartRenderer(`price-${chartId}`, () => {
        if (chart) chart.destroy();
        chart = createPriceVariationChart(chartId, ticker, priceSeries);
    });
}

function createPriceVariationChart(chartId, ticker, priceSeries) {
    const ctx = document.getElementById(chartId);
    if (!ctx) return null;

    const isDarkTheme = document.body.classList.contains('dark-theme');
    const textColor = isDarkTheme ? '#dbe7f3' : '#0f1f35';
    const gridColor = isDarkTheme ? 'rgba(112, 140, 170, 0.22)' : 'rgba(89, 120, 153, 0.2)';
    const lineColor = isDarkTheme ? '#60a5fa' : '#2563eb';
    const fillColor = isDarkTheme ? 'rgba(96, 165, 250, 0.2)' : 'rgba(37, 99, 235, 0.15)';

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: priceSeries.map((p) => p.date),
            datasets: [{
                label: `${ticker} Close`,
                data: priceSeries.map((p) => p.close),
                borderColor: lineColor,
                backgroundColor: fillColor,
                borderWidth: 2.4,
                tension: 0.28,
                fill: true,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: { color: textColor }
                },
                title: {
                    display: true,
                    text: `${ticker} Closing Price Trend`,
                    color: textColor,
                    font: { size: 14, weight: 'bold' }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: textColor,
                        callback: (v) => Number(v).toFixed(2)
                    },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: {
                        color: textColor,
                        maxTicksLimit: 7
                    },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

function shouldRenderInsightCharts(userInput, aiResponse, documentText = '') {
    const rawInput = userInput || '';
    const rawResponse = aiResponse || '';
    const input = (userInput || '').toLowerCase();
    const response = (aiResponse || '').toLowerCase();
    const combined = `${aiResponse || ''}\n${documentText || ''}`;
    const rawCombined = `${rawInput}\n${rawResponse}\n${documentText || ''}`;
    const tickerRecommendations = extractTickerRecommendations(rawResponse);

    // Fast reject for generic/non-financial assistant replies
    if (
        /i can only assist with stock market|sorry.*trouble connecting|how can i assist|what would you like to analyze/.test(response)
    ) {
        return false;
    }

    const financialTermsRegex = /\b(stock|ticker|market|buy|sell|hold|price|valuation|eps|p\/e|pe ratio|target|support|resistance|volatility|sma|bollinger|nse|nyse|nasdaq|revenue|profit|margin|52[-\s]?week)\b/g;
    const financialTermCount = (response.match(financialTermsRegex) || []).length;

    const currencyMatches = (combined.match(/(?:₹|\$)\s?\d[\d,.]*/g) || []).length;
    const percentMatches = (combined.match(/\b\d+(?:\.\d+)?\s?%/g) || []).length;
    const ratioMatches = (combined.match(/\b\d+(?:\.\d+)?\s?(?:x|times)\b/gi) || []).length;
    const numericDensity = currencyMatches + percentMatches + ratioMatches;

    const hasRangeOrTargets = /52[-\s]?week|low[:\s]|high[:\s]|target[:\s]|support[:\s]|resistance[:\s]/i.test(combined);
    const extractedMetrics = extractFinancialMetrics(combined);
    const hasPriceMetrics =
        extractedMetrics?.prices &&
        [extractedMetrics.prices.current, extractedMetrics.prices.low52, extractedMetrics.prices.high52, extractedMetrics.prices.targetMedian]
            .filter((v) => typeof v === 'number' && Number.isFinite(v)).length >= 2;

    const hasConcreteTicker =
        tickerRecommendations.length > 0 ||
        hasTickerLikeSymbol(rawCombined) ||
        /\b[A-Z]{2,6}\.(?:NS|BO|NSE|BSE)\b/.test(rawCombined) ||
        /\b(?:NYSE|NASDAQ|NSE|BSE)\s*[:\-]?\s*[A-Z]{1,6}\b/.test(rawCombined);

    const userLooksFinancial = /\b(stock|ticker|share|market|buy|sell|hold|price|analysis|nse|nyse|nasdaq|valuation|earnings|results)\b/i.test(input);

    // Require concrete stock context + numerical substance
    if (hasPriceMetrics) return true;
    if (!hasConcreteTicker) return false;
    if ((financialTermCount >= 3 || userLooksFinancial) && (numericDensity >= 2 || hasRangeOrTargets)) return true;

    return false;
}

function hasTickerLikeSymbol(text) {
    const candidates = (text.match(/\b[A-Z]{2,5}(?:\.(?:NS|BO|NSE|BSE))?\b/g) || []);
    if (!candidates.length) return false;

    const stopWords = new Set([
        'BUY', 'SELL', 'HOLD', 'EPS', 'PE', 'PFCF', 'FCF', 'ROI', 'ROE', 'ROIC',
        'AI', 'USA', 'PDF', 'TXT', 'Q1', 'Q2', 'Q3', 'Q4', 'YOY', 'MOM', 'CAGR',
        'THE', 'AND', 'FOR', 'WITH', 'THIS', 'THAT'
    ]);

    return candidates.some((symbol) => !stopWords.has(symbol));
}

// Send chat query to API with RAG support
async function sendChatQuery(message) {
    conversationHistory.push({
        role: 'user',
        content: message
    });

    // Check if message is just acknowledgment/thanks/praise
    const isAcknowledgment = /^(thanks?|thank you|ok|okay|got it|alright|cool|great|nice|perfect|awesome|appreciate it|you'?re welcome|welcome|good job|well done|excellent|amazing|fantastic|wonderful|brilliant|you'?re (great|awesome|amazing|the best|good|helpful)|that'?s (great|awesome|perfect|helpful|good))\.?\s*(thanks?|thank you)?[!.]*$/i.test(message.trim());

    if (isAcknowledgment) {
        const response = message.toLowerCase().includes('welcome')
            ? "Happy to help! Let me know if you need anything else about stocks or markets."
            : "You're welcome! Feel free to ask if you have any other questions about stocks or need further analysis.";
        conversationHistory.push({
            role: 'assistant',
            content: response
        });
        return response;
    }

    // Check if message is a greeting
    const isGreeting = /^(hi|hello|hey|greetings|good morning|good afternoon|good evening)\.?[!]*$/i.test(message.trim());

    if (isGreeting) {
        const response = "Hello! I'm your AI Stock Market Assistant. I can help with US and Indian stocks, review financial documents, and provide investment insights. What would you like to analyze today?";
        conversationHistory.push({
            role: 'assistant',
            content: response
        });
        return response;
    }

    let messages = [
        {
            role: 'system',
                    
                    content: 'You are an AI trained to be a stock market analyst. Your purpose is to help users with their stock market queries. You should be able to answer questions about stock prices, market trends, and investment analysis. You should also be able to provide recommendations on whether to buy, sell, or hold a stock. If the user asks a question that is not related to the stock market, you should politely decline to answer.'
        },
        ...conversationHistory.slice(-10)
    ];

    if (lastDocumentText) {
        messages.unshift({
            role: 'system',
            content: `I have analyzed this financial document:\n\n${lastDocumentText}\n\nProvide a specific answer based on the document data above. Include actual numbers and recommendations from the document.`
        });
    } else {
        messages.unshift({
            role: 'system',
            content: `You are a stock market AI expert assistant. Your purpose is to help users with their stock market queries. You should be able to answer questions about stock prices, market trends, and investment analysis. You should also be able to provide recommendations on whether to buy, sell, or hold a stock. If the user asks a question that is not related to the stock market, you should politely decline to answer.`
        });
    }

    const response = await fetch(OPENAI_CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messages)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error('Failed to get AI response');
    }

    const text = await response.text();

    // Check if response is an error from the AI system
    try {
        const parsed = JSON.parse(text);
        if (parsed.error) {
            throw new Error(parsed.error);
        }
    } catch (e) {
        // Not JSON or no error field, continue with text response
        if (e.message.includes('This AI system only supports')) {
            throw e; // Re-throw if it's our domain restriction error
        }
    }

    conversationHistory.push({
        role: 'assistant',
        content: text
    });

    return text;
}

function addDynamicInsightCharts(aiResponse, documentText = '') {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';

    const timestamp = Date.now();
    const recChartId = `chart-rec-${timestamp}`;
    const detailChartId = `chart-detail-${timestamp}`;
    const trendChartId = `chart-trend-${timestamp}`;
    const insightData = extractInsightData(aiResponse, documentText);
    const tickerSummary = insightData.tickerRecommendations.length
        ? ` • ${insightData.tickerRecommendations.map(item => `${item.ticker}: ${item.label}`).join(' | ')}`
        : '';
    const beginnerSummaryHtml = buildBeginnerSummaryHtml(insightData);

    messageDiv.innerHTML = `
        <div class="message-avatar">📊</div>
        <div class="message-content chart-content insight-content">
            <div class="insight-header-row">
                <h3>Dynamic Insight Dashboard</h3>
                <button type="button" class="insight-copy-btn">Copy Snapshot</button>
            </div>
            <p class="insight-summary">Recommendation signal: <strong>${insightData.recommendationLabel}</strong>${tickerSummary}</p>
            ${beginnerSummaryHtml}
            <div class="insight-grid">
                <div class="insight-panel">
                    <canvas id="${recChartId}" style="max-height: 240px;"></canvas>
                </div>
                <div class="insight-panel">
                    <canvas id="${detailChartId}" style="max-height: 240px;"></canvas>
                </div>
                <div class="insight-panel insight-panel-wide">
                    <canvas id="${trendChartId}" style="max-height: 240px;"></canvas>
                </div>
            </div>
        </div>
    `;

    const copyInsightBtn = messageDiv.querySelector('.insight-copy-btn');
    copyInsightBtn?.addEventListener('click', async () => {
        try {
            const snapshotTarget = messageDiv.querySelector('.insight-content');
            await copyElementAsImage(snapshotTarget, 'chat-insight-dashboard');
            copyInsightBtn.textContent = 'Copied';
            setTimeout(() => {
                copyInsightBtn.textContent = 'Copy Snapshot';
            }, 1400);
            showToast('Snapshot copied to clipboard', 'success', 'Copied', 1800);
        } catch (error) {
            showToast('Could not copy snapshot. Downloaded instead.', 'warning', 'Clipboard Unavailable', 2600);
        }
    });

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    let recommendationChart = null;
    let detailChart = null;
    let trendChart = null;

    registerChartRenderer(`insight-${timestamp}`, () => {
        if (recommendationChart) recommendationChart.destroy();
        if (detailChart) detailChart.destroy();
        if (trendChart) trendChart.destroy();

        recommendationChart = createRecommendationChart(recChartId, insightData);
        detailChart = insightData.metrics?.prices
            ? createPriceLadderChart(detailChartId, insightData)
            : createSignalChart(detailChartId, insightData);
        trendChart = createMomentumLineChart(trendChartId, insightData);
    });
}

async function copyElementAsImage(element, fileName) {
    if (!element || typeof html2canvas === 'undefined') {
        throw new Error('Snapshot library unavailable');
    }

    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: null
    });

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Failed to create image blob');

    if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return;
    }

    // Fallback: download image when clipboard image API is unavailable.
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    throw new Error('Clipboard image API unavailable');
}

function registerChartRenderer(id, renderFn) {
    chartRenderers.set(id, renderFn);

    if (!chartThemeSyncInitialized) {
        window.addEventListener('themeChanged', () => {
            chartRenderers.forEach((renderer) => {
                try {
                    renderer();
                } catch (error) {
                    console.error('Chart re-render failed:', error);
                }
            });
        });
        chartThemeSyncInitialized = true;
    }

    setTimeout(() => {
        const renderer = chartRenderers.get(id);
        if (renderer) {
            renderer();
        }
    }, 80);
}

function extractInsightData(aiResponse, documentText = '') {
    const responseText = (aiResponse || '').toLowerCase();
    const combinedText = `${aiResponse || ''}\n${documentText || ''}`;
    const metrics = extractFinancialMetrics(combinedText);
    const tickerRecommendations = extractTickerRecommendations(aiResponse || '');

    const bullishTerms = ['buy', 'bullish', 'upside', 'growth', 'outperform', 'strong', 'positive', 'momentum'];
    const cautionTerms = ['risk', 'sell', 'bearish', 'downside', 'volatility', 'weak', 'caution', 'headwind', 'uncertain'];

    const bullishCount = bullishTerms.reduce((count, word) => count + (responseText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    const cautionCount = cautionTerms.reduce((count, word) => count + (responseText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0);
    const numberCount = (combinedText.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;

    const recommendationLabel = tickerRecommendations.length
        ? aggregateRecommendationLabel(tickerRecommendations)
        : extractRecommendationLabel(aiResponse || '', responseText);

    const recommendationMix = tickerRecommendations.length
        ? aggregateRecommendationMix(tickerRecommendations)
        : recommendationLabel === 'BUY'
            ? [72, 16, 12]
            : recommendationLabel === 'SELL'
                ? [14, 74, 12]
                : [24, 22, 54];

    const bullishScore = clamp(32 + (bullishCount * 11) - (cautionCount * 4) + (recommendationLabel === 'BUY' ? 14 : 0), 8, 96);
    const cautionScore = clamp(28 + (cautionCount * 11) - (bullishCount * 3) + (recommendationLabel === 'SELL' ? 14 : 0), 8, 96);
    const dataScore = clamp(24 + (Math.min(10, numberCount) * 7), 10, 96);

    return {
        recommendationLabel,
        recommendationMix,
        tickerRecommendations,
        bullishCount,
        cautionCount,
        numberCount,
        bullishScore,
        cautionScore,
        dataScore,
        metrics
    };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function buildBeginnerSummaryHtml(insightData) {
    const items = insightData.tickerRecommendations.length
        ? insightData.tickerRecommendations
        : [{
            ticker: 'Overall',
            label: insightData.recommendationLabel,
            buyPct: insightData.recommendationMix[0],
            sellPct: insightData.recommendationMix[1],
            holdPct: insightData.recommendationMix[2]
        }];

    const cards = items.slice(0, 3).map(item => {
        const confidence = getConfidenceLabel(item.buyPct, item.holdPct, item.sellPct);
        const style = getRecommendationStyle(item.label);
        return `
            <div class="beginner-card">
                <div class="beginner-card-head">
                    <strong>${item.ticker}</strong>
                    <span class="beginner-pill ${style.className}">${style.label}</span>
                </div>
                <p class="beginner-note">${style.note}</p>
                <p class="beginner-meta">Confidence: <strong>${confidence}</strong></p>
            </div>
        `;
    }).join('');

    const bestFit = getBestFitText(items);
    return `
        <div class="beginner-summary">
            <div class="beginner-cards">${cards}</div>
            <div class="beginner-fit">
                <p><strong>Best fit for you</strong></p>
                <p>${bestFit}</p>
            </div>
        </div>
    `;
}

function getConfidenceLabel(buyPct, holdPct, sellPct) {
    const maxPct = Math.max(buyPct || 0, holdPct || 0, sellPct || 0);
    if (maxPct >= 70) return 'High';
    if (maxPct >= 55) return 'Medium';
    return 'Low';
}

function getRecommendationStyle(label) {
    if (label === 'BUY') {
        return {
            className: 'buy-pill',
            label: 'Green • Opportunity',
            note: 'Potential upside if your risk tolerance allows swings.'
        };
    }
    if (label === 'SELL') {
        return {
            className: 'sell-pill',
            label: 'Red • Caution',
            note: 'Risk may be elevated; consider reducing exposure.'
        };
    }
    return {
        className: 'hold-pill',
        label: 'Blue • Wait/Accumulate',
        note: 'More suitable for steady or phased investing.'
    };
}

function getBestFitText(items) {
    let buyCount = 0;
    let holdCount = 0;
    let sellCount = 0;
    items.forEach(item => {
        if (item.label === 'BUY') buyCount++;
        else if (item.label === 'SELL') sellCount++;
        else holdCount++;
    });

    if (buyCount >= holdCount && buyCount > sellCount) {
        return 'Growth-oriented investors may prefer this basket. Consider phased entries for better risk control.';
    }
    if (sellCount > buyCount && sellCount >= holdCount) {
        return 'Conservative investors should stay cautious. Keep position size small or wait for clearer signals.';
    }
    return 'Balanced or long-term investors may prefer staggered buying and diversification across these stocks.';
}

function extractTickerRecommendations(text) {
    const recommendations = [];
    const seen = new Set();
    const lines = text.split('\n');
    const linePattern = /^\s*(?:[-*]\s*)?([A-Z][A-Z0-9.-]{1,18}(?:\.(?:NS|BO|NSE|BSE))?)\s*[:\-]\s*(.+)$/;

    for (const line of lines) {
        const match = line.match(linePattern);
        if (!match) continue;
        const ticker = match[1].toUpperCase();
        if (seen.has(ticker)) continue;

        const weights = parseRecommendationWeights(match[2]);
        if (!weights) continue;
        recommendations.push({
            ticker,
            ...weights
        });
        seen.add(ticker);
    }

    return recommendations.slice(0, 6);
}

function parseRecommendationWeights(value) {
    if (!value || typeof value !== 'string') return null;
    const v = value.toLowerCase();

    let buy = 0;
    let hold = 0;
    let sell = 0;

    if (/\bstrong\s+buy\b/.test(v)) buy += 2.2;
    if (/\b(buy|accumulate|overweight)\b/.test(v)) buy += 1.2;
    if (/\b(hold|neutral|market\s*perform|own both|balanced)\b/.test(v)) hold += 1.2;
    if (/\bstrong\s+sell\b/.test(v)) sell += 2.2;
    if (/\b(sell|reduce|underweight|exit)\b/.test(v)) sell += 1.2;

    if (buy === 0 && hold === 0 && sell === 0) return null;

    // Support combined calls like "HOLD / BUY on dips"
    if (buy > 0 && hold > 0 && sell === 0) {
        buy += 0.4;
        hold += 0.6;
    }
    if (hold > 0 && sell > 0 && buy === 0) {
        hold += 0.6;
        sell += 0.4;
    }
    if (buy > 0 && sell > 0 && hold === 0) {
        hold += 0.7;
    }

    const total = buy + hold + sell;
    const buyPct = Math.round((buy / total) * 100);
    const holdPct = Math.round((hold / total) * 100);
    const sellPct = Math.max(0, 100 - buyPct - holdPct);

    return {
        buyPct,
        holdPct,
        sellPct,
        label: labelFromWeights({ buyPct, holdPct, sellPct })
    };
}

function labelFromWeights(weights) {
    const max = Math.max(weights.buyPct, weights.holdPct, weights.sellPct);
    if (max === weights.buyPct) return 'BUY';
    if (max === weights.sellPct) return 'SELL';
    return 'HOLD';
}

function aggregateRecommendationMix(tickerRecommendations) {
    const count = tickerRecommendations.length || 1;
    const buy = Math.round(tickerRecommendations.reduce((sum, item) => sum + item.buyPct, 0) / count);
    const hold = Math.round(tickerRecommendations.reduce((sum, item) => sum + item.holdPct, 0) / count);
    const sell = Math.max(0, 100 - buy - hold);
    // Keep chart order: Buy, Sell, Hold
    return [buy, sell, hold];
}

function aggregateRecommendationLabel(tickerRecommendations) {
    const labels = tickerRecommendations.map(item => item.label);
    const unique = new Set(labels);
    if (unique.size === 1) return labels[0];
    return 'MIXED';
}

function extractRecommendationLabel(rawText, lowerText) {
    const fromJson = extractRecommendationFromJson(rawText);
    if (fromJson) return fromJson;

    const fromSections = extractRecommendationFromSections(rawText);
    if (fromSections) return fromSections;

    const fromConclusion = extractRecommendationFromConclusion(rawText);
    if (fromConclusion) return fromConclusion;

    // Last-resort fallback only when no explicit section exists
    if (/\bstrong\s+sell\b|\bsell\b|\breduce\b/.test(lowerText)) return 'SELL';
    if (/\bstrong\s+buy\b|\bbuy\b|\baccumulate\b|\boverweight\b/.test(lowerText)) return 'BUY';
    if (/\bhold\b|\bneutral\b|\bmarket\s*perform\b/.test(lowerText)) return 'HOLD';
    return 'HOLD';
}

function extractRecommendationFromJson(text) {
    const blocks = [...text.matchAll(/```json\s*([\s\S]*?)```/gi)].map(match => match[1]);
    for (const block of blocks) {
        try {
            const parsed = JSON.parse(block.trim());
            const recommendation = findRecommendationValue(parsed);
            if (recommendation) return recommendation;
        } catch (_) {
            // Ignore malformed JSON blocks
        }
    }
    return null;
}

function findRecommendationValue(value) {
    if (!value || typeof value !== 'object') return null;

    const keyCandidates = ['recommendation', 'verdict', 'action', 'rating', 'signal', 'final_recommendation'];
    for (const key of keyCandidates) {
        if (typeof value[key] === 'string') {
            const normalized = normalizeRecommendation(value[key]);
            if (normalized) return normalized;
        }
    }

    for (const nested of Object.values(value)) {
        if (nested && typeof nested === 'object') {
            const nestedRecommendation = findRecommendationValue(nested);
            if (nestedRecommendation) return nestedRecommendation;
        }
    }
    return null;
}

function extractRecommendationFromSections(text) {
    const lines = text.split('\n');
    const linePattern = /(?:^|\b)(final\s+)?(investment\s+)?(recommendation|verdict|action|call)\s*[:\-]\s*(.+)$/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const inline = line.match(linePattern);
        if (inline?.[4]) {
            const normalized = normalizeRecommendation(inline[4]);
            if (normalized) return normalized;
        }

        if (/^#{1,4}\s*(final\s+)?(investment\s+)?(recommendation|verdict|action|call)\b/i.test(line)) {
            const next = (lines[i + 1] || '').trim();
            const normalized = normalizeRecommendation(next);
            if (normalized) return normalized;
        }
    }
    return null;
}

function extractRecommendationFromConclusion(text) {
    const lines = text
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
    const tail = lines.slice(-8).join(' ');
    return normalizeRecommendation(tail);
}

function normalizeRecommendation(value) {
    const weights = parseRecommendationWeights(value);
    return weights?.label || null;
}

function extractFinancialMetrics(text) {
    const metrics = {};

    const priceMatch = text.match(/(?:Current Price|CMP|Price)[:\s~₹$]+\s*([₹$]?\s*[\d,]+\.?\d*)/i);
    const rangeMatch = text.match(/52[-\s]?Week Range[:\s₹$]+\s*([₹$]?\s*[\d,]+\.?\d*)\s*[–-]\s*([₹$]?\s*[\d,]+\.?\d*)/i);
    const highMatch = text.match(/52[-\s]?Week.*High[:\s₹$]+\s*([₹$]?\s*[\d,]+\.?\d*)/i);
    const lowMatch = text.match(/52[-\s]?Week.*Low[:\s₹$]+\s*([₹$]?\s*[\d,]+\.?\d*)/i);
    const targetMatch = text.match(/(?:Target|Median|Fair Value|Price Target)[:\s₹$]+\s*([₹$]?\s*[\d,]+\.?\d*)/i);

    const toNum = (raw) => raw ? parseFloat(raw.replace(/[₹$, ]/g, '')) : null;

    if (priceMatch || rangeMatch || highMatch || lowMatch || targetMatch) {
        metrics.prices = {
            current: toNum(priceMatch?.[1]),
            low52: rangeMatch ? toNum(rangeMatch[1]) : toNum(lowMatch?.[1]),
            high52: rangeMatch ? toNum(rangeMatch[2]) : toNum(highMatch?.[1]),
            targetMedian: toNum(targetMatch?.[1])
        };
    }

    return Object.keys(metrics).length ? metrics : null;
}

function getChartTheme() {
    const isDarkTheme = document.body.classList.contains('dark-theme');
    return {
        textColor: isDarkTheme ? '#dbe7f3' : '#0f1f35',
        mutedText: isDarkTheme ? '#9db1c8' : '#5a6f8a',
        gridColor: isDarkTheme ? 'rgba(112, 140, 170, 0.22)' : 'rgba(89, 120, 153, 0.2)',
        buyColor: isDarkTheme ? '#34d399' : '#0f9f6e',
        sellColor: isDarkTheme ? '#fb7185' : '#dc2626',
        holdColor: isDarkTheme ? '#60a5fa' : '#1d4ed8',
        barColor: isDarkTheme ? '#22d3ee' : '#0ea5e9',
        targetColor: isDarkTheme ? '#fbbf24' : '#d97706',
        tooltipBg: isDarkTheme ? 'rgba(10, 18, 30, 0.96)' : 'rgba(255, 255, 255, 0.96)',
        tooltipBorder: isDarkTheme ? 'rgba(110, 139, 170, 0.45)' : 'rgba(74, 116, 170, 0.32)'
    };
}

function createRecommendationChart(chartId, insightData) {
    const ctx = document.getElementById(chartId);
    if (!ctx) {
        return null;
    }

    const { textColor, mutedText, buyColor, sellColor, holdColor, tooltipBg, tooltipBorder } = getChartTheme();
    const hasMultiTicker = insightData.tickerRecommendations.length > 1;

    if (hasMultiTicker) {
        const labels = insightData.tickerRecommendations.map(item => item.ticker);
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Buy %',
                        data: insightData.tickerRecommendations.map(item => item.buyPct),
                        backgroundColor: buyColor
                    },
                    {
                        label: 'Hold %',
                        data: insightData.tickerRecommendations.map(item => item.holdPct),
                        backgroundColor: holdColor
                    },
                    {
                        label: 'Sell %',
                        data: insightData.tickerRecommendations.map(item => item.sellPct),
                        backgroundColor: sellColor
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: 900,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: mutedText,
                            usePointStyle: true,
                            boxWidth: 10,
                            boxHeight: 10,
                            padding: 14
                        }
                    },
                    title: {
                        display: true,
                        text: 'What analysts suggest (by stock)',
                        color: textColor,
                        font: { size: 14, weight: 'bold' }
                    },
                    tooltip: {
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderWidth: 1,
                        titleColor: textColor,
                        bodyColor: textColor
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: mutedText },
                        grid: { color: 'rgba(128, 152, 178, 0.2)' }
                    },
                    x: {
                        ticks: { color: mutedText },
                        grid: { color: 'rgba(128, 152, 178, 0.14)' }
                    }
                }
            }
        });
    }

    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Buy', 'Sell', 'Hold'],
            datasets: [{
                data: insightData.recommendationMix,
                backgroundColor: [buyColor, sellColor, holdColor],
                borderWidth: 0,
                spacing: 3,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '60%',
            animation: {
                duration: 900,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: mutedText,
                        usePointStyle: true,
                        boxWidth: 10,
                        boxHeight: 10,
                        padding: 14
                    }
                },
                title: {
                    display: true,
                    text: `What analysts suggest: ${insightData.recommendationLabel}`,
                    color: textColor,
                    font: { size: 14, weight: 'bold' }
                },
                tooltip: {
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    titleColor: textColor,
                    bodyColor: textColor
                }
            }
        }
    });
}

function createSignalChart(chartId, insightData) {
    const ctx = document.getElementById(chartId);
    if (!ctx) {
        return null;
    }

    const { textColor, mutedText, gridColor, barColor, buyColor, sellColor, tooltipBg, tooltipBorder } = getChartTheme();

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bullish Signals', 'Caution Signals', 'Data Density'],
            datasets: [{
                data: [
                    insightData.bullishScore,
                    insightData.cautionScore,
                    insightData.dataScore
                ],
                backgroundColor: [buyColor, sellColor, barColor],
                borderColor: [buyColor, sellColor, barColor],
                borderWidth: 1,
                borderRadius: 10,
                borderSkipped: false,
                maxBarThickness: 44
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 900,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Confidence in this view',
                    color: textColor,
                    font: { size: 14, weight: 'bold' }
                },
                tooltip: {
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    titleColor: textColor,
                    bodyColor: textColor
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: mutedText },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: mutedText },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

function createPriceLadderChart(chartId, insightData) {
    const ctx = document.getElementById(chartId);
    if (!ctx || !insightData.metrics?.prices) {
        return createSignalChart(chartId, insightData);
    }

    const { low52, current, high52, targetMedian } = insightData.metrics.prices;
    const ladderValues = [low52 || current, current, high52 || current];
    const { textColor, mutedText, gridColor, holdColor, buyColor, targetColor, tooltipBg, tooltipBorder } = getChartTheme();

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['52W Low', 'Current', '52W High'],
            datasets: [{
                label: 'Price Ladder',
                data: ladderValues,
                fill: true,
                tension: 0.35,
                borderWidth: 2.7,
                borderColor: holdColor,
                backgroundColor: `${holdColor}33`,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBorderWidth: 2,
                pointBorderColor: '#ffffff',
                pointBackgroundColor: [buyColor, holdColor, buyColor]
            }, targetMedian ? {
                label: 'Target',
                data: [targetMedian, targetMedian, targetMedian],
                borderDash: [6, 4],
                borderColor: targetColor,
                borderWidth: 2,
                pointRadius: 0,
                fill: false
            } : null].filter(Boolean)
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 950,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: mutedText,
                        usePointStyle: true,
                        boxWidth: 10,
                        boxHeight: 10,
                        padding: 12
                    }
                },
                title: {
                    display: true,
                    text: 'Price context from provided data',
                    color: textColor,
                    font: { size: 14, weight: 'bold' }
                },
                tooltip: {
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    titleColor: textColor,
                    bodyColor: textColor
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: mutedText,
                        callback: (value) => value.toLocaleString()
                    },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: mutedText },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

function createMomentumLineChart(chartId, insightData) {
    const ctx = document.getElementById(chartId);
    if (!ctx) {
        return null;
    }

    const { textColor, mutedText, gridColor, holdColor, buyColor, sellColor, tooltipBg, tooltipBorder } = getChartTheme();
    const multiTicker = insightData.tickerRecommendations.length > 1;

    if (multiTicker) {
        const labels = ['Now', '1M', '3M', '6M', '12M'];
        const palettes = [buyColor, holdColor, sellColor, '#f59e0b', '#8b5cf6', '#06b6d4'];
        const datasets = insightData.tickerRecommendations.map((item, index) => {
            const momentumBias = (item.buyPct - item.sellPct) / 12;
            const slopeBase = item.label === 'BUY' ? 4 : item.label === 'SELL' ? -4 : 1;
            const slope = slopeBase + momentumBias;
            const start = 100 + (index * 2);
            const points = [0, 1, 2, 3, 4].map((step) => Math.max(60, start + (slope * step * 1.7)));
            const color = palettes[index % palettes.length];
            return {
                label: item.ticker,
                data: points,
                borderColor: color,
                backgroundColor: `${color}22`,
                fill: false,
                borderWidth: 2.4,
                tension: 0.35,
                pointRadius: 3.6,
                pointHoverRadius: 6,
                pointBorderWidth: 2,
                pointBorderColor: '#ffffff',
                pointBackgroundColor: color
            };
        });

        return new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: {
                    duration: 950,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: mutedText,
                            usePointStyle: true,
                            boxWidth: 10,
                            boxHeight: 10,
                            padding: 12
                        }
                    },
                    title: {
                        display: true,
                        text: 'Possible direction by stock (not guaranteed)',
                        color: textColor,
                        font: { size: 14, weight: 'bold' }
                    },
                    tooltip: {
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        borderWidth: 1,
                        titleColor: textColor,
                        bodyColor: textColor
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: { color: mutedText },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { color: mutedText },
                        grid: { color: gridColor }
                    }
                }
            }
        });
    }

    const recommendation = insightData.recommendationLabel;
    const momentumBias = insightData.bullishCount - insightData.cautionCount;
    const densityFactor = Math.min(12, Math.max(0, insightData.numberCount / 2));

    const slopeBase = recommendation === 'BUY' ? 4 : recommendation === 'SELL' ? -4 : 1;
    const slope = slopeBase + (momentumBias * 0.6);
    const start = 100;
    const points = [0, 1, 2, 3, 4].map((step) => {
        const curvature = step > 2 ? densityFactor * 0.25 : densityFactor * 0.1;
        const noise = (momentumBias * step) * 0.2;
        return Math.max(60, start + (slope * step * 1.8) + curvature + noise);
    });

    const trendColor = recommendation === 'SELL' ? sellColor : recommendation === 'BUY' ? buyColor : holdColor;
    const trendGlow = `${trendColor}35`;

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Now', '1M', '3M', '6M', '12M'],
            datasets: [{
                label: 'Projected Trend Index',
                data: points,
                borderColor: trendColor,
                backgroundColor: trendGlow,
                fill: true,
                borderWidth: 2.8,
                tension: 0.42,
                pointRadius: 4.5,
                pointHoverRadius: 7,
                pointBorderWidth: 2,
                pointBorderColor: '#ffffff',
                pointBackgroundColor: trendColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: {
                duration: 950,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: mutedText,
                        usePointStyle: true,
                        boxWidth: 10,
                        boxHeight: 10,
                        padding: 12
                    }
                },
                title: {
                    display: true,
                    text: 'Possible direction (not guaranteed)',
                    color: textColor,
                    font: { size: 14, weight: 'bold' }
                },
                tooltip: {
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    titleColor: textColor,
                    bodyColor: textColor
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: { color: mutedText },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: mutedText },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

// Analyze document with RAG
async function analyzeDocument(file, query = '') {
    try {
        showToast('Processing document...', 'info', 'Processing', 3000);

        let text;
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.pdf')) {
            text = await extractTextFromPDF(file);
        } else {
            text = await file.text();
        }

        if (lowerName.endsWith('.csv')) {
            const parsed = parseOHLCFromCsvText(text);
            if (parsed.length >= 2) {
                lastUploadedPriceSeries = parsed;
            }
        }

        if (!text || text.trim().length === 0) {
            throw new Error('Could not extract text from document');
        }

        // LLM Classifier - validate document is financial
        showToast('Validating document...', 'info', 'Validating', 2000);

        const snippet = text.substring(0, 1000);
        const validationMessages = [
            {
                role: 'system',
                content: 'You are a specialized financial validator. Analyze the following text. If it is related to stocks, company financials, market analysis, or investing, reply with "VALID". If it is about anything else (cooking, travel, general news, etc.), reply with "INVALID".'
            },
            {
                role: 'user',
                content: snippet
            }
        ];

        const validationResponse = await fetch(OPENAI_CHAT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validationMessages)
        });

        if (!validationResponse.ok) {
            throw new Error('Validation failed');
        }

        const validationResult = await validationResponse.text();

        if (validationResult.trim().toUpperCase() !== 'VALID') {
            showToast('This document is not related to stocks or financial markets. Please upload equity research reports, earnings statements, or stock analysis documents.', 'error', 'Invalid Document', 6000);
            throw new Error('Non-financial document');
        }

        // Store document text for follow-up questions
        lastDocumentText = text;

        showToast('Analyzing with RAG...', 'success', 'Processing', 2000);

        const userQuery = query || 'Should I buy, sell, or hold this stock?';
        const ragResponse = await queryRagWithFallback(text, userQuery);
        return ragResponse;

    } catch (error) {
        console.error('Document analysis error:', error);
        throw error;
    }
}

// Extract text from PDF
async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return fullText;
}

async function queryRagWithFallback(documentText, userQuery) {
    const ragPayload = {
        mode: 'rag',
        query: userQuery,
        document: documentText
    };

    try {
        const ragResponse = await fetch(CLOUDFLARE_RAG_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ragPayload)
        });

        if (ragResponse.ok) {
            const ragText = await ragResponse.text();
            if (ragText && ragText.trim()) return ragText;
        }
        throw new Error('RAG endpoint unavailable');
    } catch (ragError) {
        console.warn('RAG endpoint failed, falling back to contextual chat:', ragError);
        showToast('RAG endpoint unavailable, using contextual AI fallback.', 'warning', 'Fallback', 2500);

        const fullQuestion = `I have uploaded a financial document. Here is the complete content:

${documentText}

---

Based on the above financial document, ${userQuery}

Provide:
1. Summary of key metrics from the document
2. Investment thesis
3. Main risks identified
4. Your clear recommendation: BUY, SELL, or HOLD
5. Reasoning for your recommendation
6. Price targets if mentioned in the document`;

        const messages = [
            {
                role: 'system',
                content: 'You are a stock market analyst. Analyze financial documents and provide clear investment recommendations.'
            },
            {
                role: 'user',
                content: fullQuestion
            }
        ];

        const queryResponse = await fetch(OPENAI_CHAT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages)
        });

        if (!queryResponse.ok) {
            const errorText = await queryResponse.text();
            console.error('Fallback API Error:', errorText);
            throw new Error('Failed to analyze document');
        }
        return await queryResponse.text();
    }
}

function parseOHLCFromCsvText(csvText) {
    if (!csvText || typeof csvText !== 'string') return [];
    const rows = csvText.split('\n').map((r) => r.trim()).filter(Boolean);
    if (rows.length < 2) return [];

    const headers = rows[0].split(',').map((h) => h.trim().toLowerCase());
    const idxDate = headers.findIndex((h) => ['date', 'time', 'datetime'].includes(h));
    const idxOpen = headers.findIndex((h) => h === 'open' || h === 'o');
    const idxHigh = headers.findIndex((h) => h === 'high' || h === 'h');
    const idxLow = headers.findIndex((h) => h === 'low' || h === 'l');
    const idxClose = headers.findIndex((h) => h === 'close' || h === 'c');

    if ([idxDate, idxOpen, idxHigh, idxLow, idxClose].some((i) => i < 0)) return [];

    const parsed = rows.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim());
        const date = cols[idxDate];
        const open = Number(cols[idxOpen]);
        const high = Number(cols[idxHigh]);
        const low = Number(cols[idxLow]);
        const close = Number(cols[idxClose]);
        if (!date || [open, high, low, close].some((v) => Number.isNaN(v))) return null;
        return { date, open, high, low, close };
    }).filter(Boolean);

    return parsed;
}

function parseManualOHLCInput(raw) {
    if (!raw || typeof raw !== 'string') return [];
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return [];

    // Accept both with and without header.
    const first = lines[0].toLowerCase();
    const hasHeader = /date/.test(first) && /open/.test(first) && /high/.test(first) && /low/.test(first) && /close/.test(first);
    const source = hasHeader ? lines.join('\n') : ['date,open,high,low,close', ...lines].join('\n');
    return parseOHLCFromCsvText(source);
}

// Split text into chunks
function splitIntoChunks(text, maxChunkSize) {
    const chunks = [];
    let currentChunk = '';

    const sentences = text.split(/[.!?]\s+/);

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxChunkSize) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            // If single sentence is too long, split by words
            if (sentence.length > maxChunkSize) {
                const words = sentence.split(' ');
                for (const word of words) {
                    if ((currentChunk + word).length > maxChunkSize) {
                        chunks.push(currentChunk.trim());
                        currentChunk = word + ' ';
                    } else {
                        currentChunk += word + ' ';
                    }
                }
            } else {
                currentChunk = sentence + '. ';
            }
        } else {
            currentChunk += sentence + '. ';
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

// UI Helper functions
function addMessage(text, type) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    const avatar = type === 'user' ? '👤' : '<img src="/images/chatbot.png" alt="AI" width="32" height="32" onerror="this.outerHTML=\'🤖\'" />';

    // Format the text: convert markdown-style formatting to HTML
    const formattedText = formatMessageText(text);

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            ${formattedText}
        </div>
    `;

    if (type === 'bot') {
        const content = messageDiv.querySelector('.message-content');
        if (content) {
            attachCopyButton(content, text);
        }
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function attachCopyButton(contentElement, textToCopy) {
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'copy-message-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.setAttribute('aria-label', 'Copy response');

    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            copyBtn.textContent = 'Copied';
            setTimeout(() => {
                copyBtn.textContent = 'Copy';
            }, 1400);
            showToast('Response copied to clipboard', 'success', 'Copied', 1800);
        } catch (error) {
            showToast('Failed to copy response', 'error', 'Copy Error', 2200);
        }
    });

    contentElement.prepend(copyBtn);
}

function formatMessageText(text) {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    const parts = [];
    let paragraph = [];
    let inUl = false;
    let inOl = false;

    const decodeEntities = (value) => value
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&');

    const escapeHtml = (value) => value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const formatInline = (value) => {
        const decoded = decodeEntities(value);
        const escaped = escapeHtml(decoded);
        return escaped
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
    };

    const flushParagraph = () => {
        if (!paragraph.length) return;
        parts.push(`<p>${paragraph.join('<br>')}</p>`);
        paragraph = [];
    };

    const closeLists = () => {
        if (inUl) {
            parts.push('</ul>');
            inUl = false;
        }
        if (inOl) {
            parts.push('</ol>');
            inOl = false;
        }
    };

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        const trimmed = line.trim();

        if (!trimmed) {
            flushParagraph();
            closeLists();
            continue;
        }

        const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
        if (headingMatch) {
            flushParagraph();
            closeLists();
            parts.push(`<h3>${formatInline(headingMatch[1])}</h3>`);
            continue;
        }

        const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
        if (orderedMatch) {
            flushParagraph();
            if (inUl) {
                parts.push('</ul>');
                inUl = false;
            }
            if (!inOl) {
                parts.push('<ol class="chat-rich-list">');
                inOl = true;
            }
            parts.push(`<li>${formatInline(orderedMatch[1])}</li>`);
            continue;
        }

        const bulletMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
        if (bulletMatch) {
            flushParagraph();
            if (inOl) {
                parts.push('</ol>');
                inOl = false;
            }
            if (!inUl) {
                parts.push('<ul class="chat-rich-list">');
                inUl = true;
            }
            const indentLevel = bulletMatch[1].length >= 2 ? ' nested-item' : '';
            parts.push(`<li class="${indentLevel.trim()}">${formatInline(bulletMatch[2])}</li>`);
            continue;
        }

        closeLists();
        paragraph.push(formatInline(trimmed));
    }

    flushParagraph();
    closeLists();
    return `<div class="chat-rich-content">${parts.join('')}</div>`;
}

function addTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');
    const typingDiv = document.createElement('div');
    const id = 'typing-' + Date.now();
    typingDiv.id = id;
    typingDiv.className = 'message bot-message';

    typingDiv.innerHTML = `
        <div class="message-avatar"><img src="/images/chatbot.png" alt="AI" width="32" height="32" onerror="this.outerHTML='🤖'" /></div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;

    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

// Event listeners
document.getElementById('send-btn').addEventListener('click', sendMessage);

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Suggested prompt chips
document.querySelectorAll('.prompt-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
        const prompt = chip.getAttribute('data-prompt');
        applyPromptToComposer(prompt);
    });
});

// Add copy for initial welcome message and support prefilled prompts from URL
(() => {
    const params = new URLSearchParams(window.location.search);
    const prefilledQuery = params.get('q');
    if (prefilledQuery && prefilledQuery.trim()) {
        chatInput.value = prefilledQuery.trim();
        chatInput.style.height = 'auto';
        chatInput.style.height = chatInput.scrollHeight + 'px';
        setTimeout(() => {
            sendMessage();
            const cleanUrl = `${window.location.pathname}`;
            window.history.replaceState({}, '', cleanUrl);
        }, 120);
    }

    const introReadMoreBtn = document.getElementById('intro-read-more-btn');
    const introMoreContent = document.getElementById('intro-more-content');
    if (introReadMoreBtn && introMoreContent) {
        introReadMoreBtn.addEventListener('click', () => {
            const isHidden = introMoreContent.style.display === 'none';
            introMoreContent.style.display = isHidden ? 'block' : 'none';
            introReadMoreBtn.textContent = isHidden ? 'Read less' : 'Read more';
        });
    }

    const manualToggleBtn = document.getElementById('manual-toggle-btn');
    const manualPanel = document.getElementById('manual-mode-panel');
    const manualRenderBtn = document.getElementById('manual-render-btn');
    const manualInput = document.getElementById('manual-ohlc-input');
    const manualTicker = document.getElementById('manual-ohlc-ticker');
    const manualSampleBtn = document.getElementById('manual-sample-btn');
    const manualClearBtn = document.getElementById('manual-clear-btn');
    const beginnerModeToggle = document.getElementById('beginner-mode-toggle');
    const beginnerModeStrip = document.getElementById('beginner-mode-strip');
    const beginnerProgress = document.getElementById('beginner-mode-progress');
    const beginnerNextBtn = document.getElementById('beginner-next-btn');
    const beginnerSendStepBtn = document.getElementById('beginner-send-step-btn');
    const beginnerStepButtons = Array.from(document.querySelectorAll('.beginner-step-btn'));
    const chatTools = document.getElementById('chat-tools');
    const chatToolsToggle = document.getElementById('chat-tools-toggle');
    const chatToolsBody = document.getElementById('chat-tools-body');
    const chatShell = document.querySelector('.chat-shell');
    const guideRailToggle = document.getElementById('guide-rail-toggle');
    const aiFontDecreaseBtn = document.getElementById('ai-font-decrease-btn');
    const aiFontDefaultBtn = document.getElementById('ai-font-default-btn');
    const aiFontIncreaseBtn = document.getElementById('ai-font-increase-btn');
    const aiReaderModeBtn = document.getElementById('ai-reader-mode-btn');
    const chatRefreshNewsBtn = document.getElementById('chat-refresh-news-btn');
    const chatNewsRegionFilter = document.getElementById('chat-news-region-filter');
    const chatNewsTickerFilter = document.getElementById('chat-news-ticker-filter');
    const chatNewsBrief = document.getElementById('chat-news-brief');
    const chatNewsList = document.getElementById('chat-news-list');
    let beginnerStepIndex = 0;

    const renderBeginnerStep = () => {
        beginnerStepButtons.forEach((btn, idx) => {
            btn.classList.toggle('active', idx === beginnerStepIndex);
        });
        if (beginnerProgress) {
            beginnerProgress.textContent = `Step ${beginnerStepIndex + 1}/${Math.max(1, beginnerStepButtons.length)}`;
        }
    };

    const setBeginnerMode = (enabled) => {
        if (!beginnerModeToggle || !beginnerModeStrip) return;
        beginnerModeToggle.classList.toggle('is-on', enabled);
        beginnerModeToggle.textContent = enabled ? 'Beginner Mode: On' : 'Beginner Mode: Off';
        beginnerModeToggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        beginnerModeStrip.style.display = enabled ? 'block' : 'none';
        if (enabled) setChatToolsOpen(true);
        chatInput.placeholder = enabled
            ? 'Beginner mode: use guided steps or ask simple stock questions...'
            : 'Ask about US or Indian stocks (e.g., AAPL, RELIANCE.NS)...';
        localStorage.setItem(BEGINNER_MODE_KEY, enabled ? 'on' : 'off');
    };

    const setChatToolsOpen = (open) => {
        if (!chatTools || !chatToolsToggle || !chatToolsBody) return;
        chatTools.classList.toggle('is-open', open);
        chatToolsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        chatToolsBody.style.display = open ? 'block' : 'none';
        localStorage.setItem(CHAT_TOOLS_OPEN_KEY, open ? 'on' : 'off');
    };

    const setGuideRailOpen = (open, persist = true) => {
        if (!chatShell || !guideRailToggle) return;
        const isDesktop = window.matchMedia('(min-width: 1025px)').matches;
        const shouldCollapse = isDesktop ? !open : false;
        chatShell.classList.toggle('left-rail-collapsed', shouldCollapse);
        guideRailToggle.classList.toggle('is-on', open && isDesktop);
        guideRailToggle.setAttribute('aria-pressed', open && isDesktop ? 'true' : 'false');
        guideRailToggle.textContent = open && isDesktop ? 'Guide: On' : 'Guide: Off';
        if (persist) {
            localStorage.setItem(CHAT_GUIDE_OPEN_KEY, open ? 'on' : 'off');
        }
    };

    manualToggleBtn?.addEventListener('click', () => {
        if (!manualPanel) return;
        const hidden = manualPanel.style.display === 'none';
        manualPanel.style.display = hidden ? 'block' : 'none';
        manualToggleBtn.textContent = hidden ? 'Hide Manual OHLC Mode' : 'Manual OHLC Mode';
    });

    manualRenderBtn?.addEventListener('click', () => {
        const raw = manualInput?.value || '';
        const parsed = parseManualOHLCInput(raw);
        if (parsed.length < 2) {
            showToast('Paste at least 2 OHLC rows: date,open,high,low,close', 'warning', 'Invalid OHLC', 2800);
            return;
        }
        const ticker = (manualTicker?.value || '').trim().toUpperCase() || 'Manual Data';
        addPriceVariationMessage(ticker, 'Manual OHLC Input', parsed);
        showToast('Manual OHLC chart rendered', 'success', 'Chart Ready', 1800);
    });

    manualSampleBtn?.addEventListener('click', () => {
        if (manualInput) {
            manualInput.value = [
                'date,open,high,low,close',
                '2026-01-02,410.2,417.5,408.9,415.3',
                '2026-01-03,415.3,418.4,412.8,413.6',
                '2026-01-04,413.6,420.1,411.2,418.9',
                '2026-01-05,418.9,422.0,416.7,421.4',
                '2026-01-06,421.4,423.6,417.9,419.1',
                '2026-01-07,419.1,425.2,418.5,424.8'
            ].join('\n');
        }
        if (manualTicker && !manualTicker.value.trim()) {
            manualTicker.value = 'RELIANCE.NS';
        }
        showToast('Sample OHLC data loaded', 'info', 'Sample Ready', 1600);
    });

    manualClearBtn?.addEventListener('click', () => {
        if (manualInput) manualInput.value = '';
        if (manualTicker) manualTicker.value = '';
        showToast('Manual OHLC data cleared', 'info', 'Cleared', 1500);
    });

    chatToolsToggle?.addEventListener('click', () => {
        const currentlyOpen = chatTools?.classList.contains('is-open');
        setChatToolsOpen(!currentlyOpen);
    });

    beginnerModeToggle?.addEventListener('click', () => {
        const currentlyOn = beginnerModeToggle.classList.contains('is-on');
        const next = !currentlyOn;
        setBeginnerMode(next);
        if (next) {
            showToast('Beginner Mode enabled. Follow Step 1 to Step 4 in sequence.', 'success', 'Beginner Mode', 2200);
            renderBeginnerStep();
        }
    });

    beginnerStepButtons.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            beginnerStepIndex = idx;
            renderBeginnerStep();
            const prompt = btn.getAttribute('data-prompt');
            applyPromptToComposer(prompt);
        });
    });

    beginnerNextBtn?.addEventListener('click', () => {
        if (!beginnerStepButtons.length) return;
        beginnerStepIndex = (beginnerStepIndex + 1) % beginnerStepButtons.length;
        renderBeginnerStep();
        const prompt = beginnerStepButtons[beginnerStepIndex].getAttribute('data-prompt');
        applyPromptToComposer(prompt);
    });

    beginnerSendStepBtn?.addEventListener('click', () => {
        if (!beginnerStepButtons.length) return;
        const prompt = beginnerStepButtons[beginnerStepIndex].getAttribute('data-prompt');
        applyPromptToComposer(prompt, true);
    });

    renderBeginnerStep();
    setChatToolsOpen(localStorage.getItem(CHAT_TOOLS_OPEN_KEY) === 'on');
    setBeginnerMode(localStorage.getItem(BEGINNER_MODE_KEY) === 'on');
    const savedGuideOpen = localStorage.getItem(CHAT_GUIDE_OPEN_KEY);
    setGuideRailOpen(savedGuideOpen === null ? true : savedGuideOpen === 'on', false);

    guideRailToggle?.addEventListener('click', () => {
        const isOpen = !chatShell?.classList.contains('left-rail-collapsed');
        setGuideRailOpen(!isOpen);
    });

    window.addEventListener('resize', () => {
        const saved = localStorage.getItem(CHAT_GUIDE_OPEN_KEY);
        const open = saved === null ? true : saved === 'on';
        setGuideRailOpen(open, false);
    });

    const updateFontControlState = (size) => {
        const n = Number(size);
        aiFontDefaultBtn?.classList.toggle('is-active', n === DEFAULT_AI_RESPONSE_FONT_SIZE);
        aiFontDecreaseBtn && (aiFontDecreaseBtn.disabled = n <= 12);
        aiFontIncreaseBtn && (aiFontIncreaseBtn.disabled = n >= 16);
    };

    const savedResponseFontSize = Number(localStorage.getItem(AI_RESPONSE_FONT_SIZE_KEY) || DEFAULT_AI_RESPONSE_FONT_SIZE);
    applyAiResponseFontSize(savedResponseFontSize);
    updateFontControlState(savedResponseFontSize);

    aiFontDecreaseBtn?.addEventListener('click', () => {
        const current = Number(localStorage.getItem(AI_RESPONSE_FONT_SIZE_KEY) || 12);
        const next = Math.max(12, current - 1);
        applyAiResponseFontSize(next);
        updateFontControlState(next);
    });

    aiFontDefaultBtn?.addEventListener('click', () => {
        applyAiResponseFontSize(DEFAULT_AI_RESPONSE_FONT_SIZE);
        updateFontControlState(DEFAULT_AI_RESPONSE_FONT_SIZE);
    });

    aiFontIncreaseBtn?.addEventListener('click', () => {
        const current = Number(localStorage.getItem(AI_RESPONSE_FONT_SIZE_KEY) || DEFAULT_AI_RESPONSE_FONT_SIZE);
        const next = Math.min(16, current + 1);
        applyAiResponseFontSize(next);
        updateFontControlState(next);
    });

    const savedReaderMode = localStorage.getItem(AI_READER_MODE_KEY) === 'on';
    setReaderMode(savedReaderMode);
    if (aiReaderModeBtn) {
        aiReaderModeBtn.textContent = savedReaderMode ? 'Reader Mode: On' : 'Reader Mode: Off';
        aiReaderModeBtn.setAttribute('aria-pressed', savedReaderMode ? 'true' : 'false');
        aiReaderModeBtn.classList.toggle('is-active', savedReaderMode);
    }
    aiReaderModeBtn?.addEventListener('click', () => {
        const current = localStorage.getItem(AI_READER_MODE_KEY) === 'on';
        const next = !current;
        setReaderMode(next);
        aiReaderModeBtn.textContent = next ? 'Reader Mode: On' : 'Reader Mode: Off';
        aiReaderModeBtn.setAttribute('aria-pressed', next ? 'true' : 'false');
        aiReaderModeBtn.classList.toggle('is-active', next);
    });

    const loadChatNewsFeed = async () => {
        if (!chatNewsBrief || !chatNewsList || !chatNewsRegionFilter || !chatNewsTickerFilter) return;
        const region = chatNewsRegionFilter.value || 'all';
        const ticker = chatNewsTickerFilter.value.trim().toUpperCase();
        const params = new URLSearchParams({ region });
        if (ticker) params.set('ticker', ticker);

        chatNewsBrief.textContent = 'Loading headlines...';
        chatNewsList.innerHTML = '';
        try {
            const res = await fetch(`${NEWS_FEED_ENDPOINT}?${params.toString()}`);
            if (!res.ok) throw new Error('News request failed');
            const json = await res.json();
            const items = Array.isArray(json.items) ? json.items : [];
            chatNewsBrief.textContent = json.marketBrief || 'Latest headlines';

            if (!items.length) {
                chatNewsList.innerHTML = '<p class="muted">No matching headlines.</p>';
                return;
            }

            chatNewsList.innerHTML = items.slice(0, 8).map((item) => `
                <article class="news-side-item">
                    <a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a>
                    <div class="news-side-meta">
                        <span>${item.source || 'Source'}</span>
                        <span>•</span>
                        <span>${item.region === 'india' ? 'India' : 'US'}</span>
                        <span class="news-badge ${item.sentiment || 'neutral'}">${(item.sentiment || 'neutral').toUpperCase()}</span>
                    </div>
                </article>
            `).join('');
        } catch (err) {
            chatNewsBrief.textContent = 'Could not load headlines right now.';
            chatNewsList.innerHTML = '<p class="muted">Try refresh in a moment.</p>';
        }
    };

    chatRefreshNewsBtn?.addEventListener('click', loadChatNewsFeed);
    chatNewsRegionFilter?.addEventListener('change', loadChatNewsFeed);
    chatNewsTickerFilter?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            loadChatNewsFeed();
        }
    });
    loadChatNewsFeed();
})();
