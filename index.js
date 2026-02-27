import { dates } from './utils/dates.js'


let useRAG = false
const tickersArr = []
let stockDataGlobal = []
let chartInstance = null
let latestReportText = ''
const BOLLINGER_PERIOD = 20
const BOLLINGER_STD_MULTIPLIER = 2
const LOOKBACK_DAYS_FOR_SD = 75
const NEWS_FEED_ENDPOINT = 'https://openai-api-worker.magar-t-daniel.workers.dev/news'
const HOME_GUIDE_OPEN_KEY = 'home_guide_open'

const generateReportBtn = document.querySelector('.generate-report-btn')
const copyReportBtn = document.getElementById('copy-report-btn')
const copyChartDataBtn = document.getElementById('copy-chart-data-btn')

// Toast notification system
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
    
    // Auto remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease'
        setTimeout(() => toast.remove(), 300)
    }, duration)
}

generateReportBtn.addEventListener('click', fetchStockData)

// Check for ticker parameter in URL
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search)
    const ticker = urlParams.get('ticker')
    if (ticker && ticker.trim().length > 0) {
        document.getElementById('ticker-input').value = ticker
        document.getElementById('ticker-input-form').dispatchEvent(new Event('submit'))
        showToast(`Added ${ticker} from Browse Stocks`, 'success', 'Ticker Added', 3000)
    }
})

document.getElementById('ticker-input-form').addEventListener('submit', (e) => {
    e.preventDefault()
    const tickerInput = document.getElementById('ticker-input')
    const inputValue = tickerInput.value.trim()
    
    if (inputValue.length > 0) {
        // Split by comma and process each ticker
        const tickers = inputValue.split(',').map(t => t.trim().toUpperCase()).filter(t => t.length > 0)
        
        if (tickers.length === 0) {
            const label = document.querySelector('.ticker-label')
            label.style.color = 'red'
            label.textContent = 'Please enter valid stock ticker(s)'
            return
        }
        
        // Validate ticker format (only letters, 1-5 characters)
        const invalidTickers = tickers.filter(t => !/^[A-Z]{1,5}$/.test(t))
        if (invalidTickers.length > 0) {
            const label = document.querySelector('.ticker-label')
            label.style.color = 'red'
            label.textContent = `Invalid ticker format: ${invalidTickers.join(', ')}. Use only letters (1-5 chars)`
            return
        }
        
        // Add tickers (max 3 total)
        tickers.forEach(ticker => {
            if (tickersArr.length < 3 && !tickersArr.includes(ticker)) {
                tickersArr.push(ticker)
            }
        })
        
        if (tickersArr.length > 0) {
            generateReportBtn.disabled = false
        }
        
        tickerInput.value = ''
        renderTickers()
        
        // Reset label color
        const label = document.querySelector('.ticker-label')
        label.style.color = '#94a3b8'
        label.textContent = 'Selected Tickers:'
        
        // Show warning if limit reached
        if (tickersArr.length >= 3) {
            label.style.color = '#f59e0b'
            label.textContent = 'Maximum 3 tickers reached'
        }
    } else {
        const label = document.querySelector('.ticker-label')
        label.style.color = 'red'
        label.textContent = 'Please enter a valid stock ticker (e.g., AAPL, TSLA, V, KO)'
    }
})
function renderTickers() {
    const tickersDiv = document.querySelector('.ticker-choice-display')
    const clearBtn = document.getElementById('clear-tickers-btn')
    tickersDiv.innerHTML = ''

    if (tickersArr.length === 0) {
        tickersDiv.textContent = 'Your tickers will appear here…'
        clearBtn.style.display = 'none'
        generateReportBtn.disabled = true
        return
    }

    clearBtn.style.display = 'block'

    tickersArr.forEach((ticker, index) => {
        const span = document.createElement('span')
        span.textContent = ticker
        tickersDiv.appendChild(span)

        if (index < tickersArr.length - 1) {
            tickersDiv.appendChild(document.createTextNode(', '))
        }
    })
}

function getAnalysisStartDate(endDateISO, daysBack = LOOKBACK_DAYS_FOR_SD) {
    const d = new Date(`${endDateISO}T00:00:00`)
    d.setDate(d.getDate() - daysBack)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

function calculateStdDev(values, mean) {
    if (!values.length) return 0
    const variance = values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / values.length
    return Math.sqrt(variance)
}

function calculateAngelOneBollingerSignal(chartData) {
    if (!chartData || chartData.length < BOLLINGER_PERIOD) return null

    const closes = chartData.map((d) => d.close)
    const window = closes.slice(-BOLLINGER_PERIOD)
    const sma = window.reduce((sum, value) => sum + value, 0) / BOLLINGER_PERIOD
    const stdDev = calculateStdDev(window, sma)
    const upperBand = sma + (BOLLINGER_STD_MULTIPLIER * stdDev)
    const lowerBand = sma - (BOLLINGER_STD_MULTIPLIER * stdDev)

    const latestClose = closes[closes.length - 1]
    const previousClose = closes[closes.length - 2] || latestClose
    const dayChangePct = previousClose === 0 ? 0 : ((latestClose - previousClose) / previousClose) * 100
    const zScore = stdDev === 0 ? 0 : (latestClose - sma) / stdDev
    const bandwidthPct = sma === 0 ? 0 : ((upperBand - lowerBand) / sma) * 100

    let signal = 'HOLD'
    let reason = 'Price is within Bollinger Bands; no strong overbought/oversold signal.'

    // Angel One style interpretation: outside bands indicate stretched conditions.
    if (latestClose < lowerBand) {
        signal = 'BUY'
        reason = 'Price is below lower Bollinger Band (potential oversold/reversion setup).'
    } else if (latestClose > upperBand) {
        signal = 'SELL'
        reason = 'Price is above upper Bollinger Band (potential overbought/reversion setup).'
    } else if (zScore <= -1.2) {
        signal = 'BUY'
        reason = 'Price is near lower volatility range; buy-on-dips setup.'
    } else if (zScore >= 1.2) {
        signal = 'HOLD'
        reason = 'Price is near upper volatility range; wait for better risk-reward.'
    }

    const confidence = Math.abs(zScore) >= 2 ? 'HIGH' : Math.abs(zScore) >= 1.2 ? 'MEDIUM' : 'LOW'

    return {
        latestClose,
        previousClose,
        dayChangePct,
        sma,
        stdDev,
        upperBand,
        lowerBand,
        zScore,
        bandwidthPct,
        signal,
        confidence,
        reason
    }
}

function buildIndicatorSummary(ticker, indicator) {
    if (!indicator) {
        return `${ticker} indicator_summary: insufficient historical points for ${BOLLINGER_PERIOD}-period SD logic.`
    }

    return [
        `${ticker} indicator_summary:`,
        `- logic: Bollinger(${BOLLINGER_PERIOD}, ${BOLLINGER_STD_MULTIPLIER}SD) based on Angel One style volatility interpretation`,
        `- latest_close: ${indicator.latestClose.toFixed(2)}`,
        `- day_change_pct: ${indicator.dayChangePct.toFixed(2)}%`,
        `- sma_${BOLLINGER_PERIOD}: ${indicator.sma.toFixed(2)}`,
        `- std_dev_${BOLLINGER_PERIOD}: ${indicator.stdDev.toFixed(2)}`,
        `- upper_band: ${indicator.upperBand.toFixed(2)}`,
        `- lower_band: ${indicator.lowerBand.toFixed(2)}`,
        `- z_score: ${indicator.zScore.toFixed(2)}`,
        `- band_width_pct: ${indicator.bandwidthPct.toFixed(2)}%`,
        `- model_signal: ${indicator.signal}`,
        `- signal_confidence: ${indicator.confidence}`,
        `- signal_reason: ${indicator.reason}`
    ].join('\n')
}

// Clear tickers button handler
document.getElementById('clear-tickers-btn').addEventListener('click', () => {
    tickersArr.length = 0
    renderTickers()
    generateReportBtn.disabled = true
    
    const label = document.querySelector('.ticker-label')
    label.style.color = '#94a3b8'
    label.textContent = 'Selected Tickers:'
    
    showToast('All tickers cleared', 'info', 'Cleared', 2000)
})



const loadingArea = document.querySelector('.loading-panel')
const apiMessage = document.getElementById('api-message')



async function fetchStockData() {
    document.querySelector('.action-panel').style.display = 'none'
    loadingArea.style.display = 'flex'

    // If only document is uploaded (no tickers), analyze document directly
    if (useRAG && uploadedDocText && tickersArr.length === 0) {
        try {
            const messages = [
                {
                    role: 'system',
                    content: `You are a colourful, dramatic stock market guru. Analyze the financial document and write a fun, punchy report (max 150 words). Provide: key insights, trend analysis, and clear Buy/Hold/Sell recommendation. Style: Energetic, playful, no bullet points, no markdown, plain text only.`
                },
                {
                    role: 'user',
                    content: `Analyze this financial document:\n\n${uploadedDocText}`
                }
            ]

            const response = await fetch('https://openai-api-worker.magar-t-daniel.workers.dev/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messages)
            })

            if (!response.ok) throw new Error('AI request failed')

            const text = await response.text()
            const cleaned = text.replace(/###\s*/g, '').replace(/\*\*/g, '').replace(/-\s+/g, '• ')

            // Clear uploaded file
            fileInput.value = ''
            uploadedDocText = null
            uploadArea.querySelector('.upload-placeholder').style.display = 'block'
            uploadedDisplay.style.display = 'none'
            toggle.disabled = true
            toggle.checked = false
            useRAG = false
            document.getElementById('ticker-input').disabled = false
            document.querySelectorAll('.clickable-chip').forEach(chip => chip.style.pointerEvents = 'auto')
            document.querySelector('.add-ticker-btn').disabled = false
            generateReportBtn.disabled = true

            loadingArea.style.display = 'none'
            document.querySelector('.output-panel').style.display = 'block'
            
            // Show message instead of chart
            const chartsContainer = document.querySelector('.charts-container')
            chartsContainer.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 40px;">📄 Document analysis complete. Add stock tickers to see price charts.</p>'
            const sdSection = document.getElementById('sd-signal-section')
            if (sdSection) sdSection.style.display = 'none'
            
            const card = document.querySelector('.report-card')
            card.innerHTML = `<p>${cleaned}</p>`
            
            const textLower = cleaned.toLowerCase()
            card.classList.remove('buy', 'hold', 'sell')
            if (textLower.includes('buy')) card.classList.add('buy')
            else if (textLower.includes('sell')) card.classList.add('sell')
            else card.classList.add('hold')

        } catch (err) {
            loadingArea.style.display = 'none'
            document.querySelector('.action-panel').style.display = 'block'
            showToast('AI error: ' + err.message, 'error')
        }
        return
    }

    const failedTickers = []

    try {
        const analysisStartDate = getAnalysisStartDate(dates.endDate, LOOKBACK_DAYS_FOR_SD)
        const stockData = await Promise.all(
            tickersArr.map(async (ticker) => {
                const url = `https://polygon-api-worker.magar-t-daniel.workers.dev/?ticker=${ticker}&start=${analysisStartDate}&end=${dates.endDate}`

                try {
                    const response = await fetch(url)
                    const status = response.status

                    if (status !== 200) {
                        failedTickers.push(ticker)
                        return null
                    }

                    const json = await response.json()

                    if (!json.results || json.results.length === 0) {
                        failedTickers.push(ticker)
                        return null
                    }

                    // Store raw data for charts
                    const chartData = json.results.map(day => ({
                        date: new Date(day.t).toISOString().split('T')[0],
                        close: day.c,
                        open: day.o
                    }))

                    const indicator = calculateAngelOneBollingerSignal(chartData)

                    // Convert recent points + indicator metrics to readable text for AI
                    const lines = json.results.slice(-20).map((day, i) => {
                        const date = new Date(day.t).toISOString().split('T')[0]
                        return `Day ${i + 1} (${date}): opened at $${day.o}, closed at $${day.c}`
                    })

                    const indicatorSummary = buildIndicatorSummary(ticker, indicator)

                    return {
                        ticker,
                        text: `${ticker}:\n${lines.join('\n')}\n${indicatorSummary}\n`,
                        chartData,
                        indicator
                    }
                } catch (err) {
                    failedTickers.push(ticker)
                    return null
                }
            })
        )

        // Filter out failed tickers
        const validStockData = stockData.filter(s => s !== null)

        if (validStockData.length === 0) {
            loadingArea.style.display = 'none'
            document.querySelector('.action-panel').style.display = 'block'
            
            // Remove failed tickers from the array
            failedTickers.forEach(ticker => {
                const index = tickersArr.indexOf(ticker)
                if (index > -1) tickersArr.splice(index, 1)
            })
            renderTickers()
            
            showToast(
                `No data found for: ${failedTickers.join(', ')}\n\nPossible reasons:\n• Ticker doesn't exist or is misspelled\n• Not a US stock\n• No recent trading data available\n\nPlease verify the ticker symbols and try again.`,
                'error',
                'Invalid Tickers',
                8000
            )
            return
        }

        if (failedTickers.length > 0) {
            // Remove failed tickers from the array
            failedTickers.forEach(ticker => {
                const index = tickersArr.indexOf(ticker)
                if (index > -1) tickersArr.splice(index, 1)
            })
            
            showToast(
                `Could not fetch data for: ${failedTickers.join(', ')}\n\nThese tickers were removed. Continuing with: ${validStockData.map(s => s.ticker).join(', ')}\n\nTip: Double-check ticker spelling (e.g., GOOGL not GOGLE)`,
                'warning',
                'Some Tickers Failed',
                7000
            )
        }

        stockDataGlobal = validStockData
        
        // Update tickersArr to only include valid tickers
        tickersArr.length = 0
        validStockData.forEach(s => tickersArr.push(s.ticker))
        
        const combinedData = validStockData.map(s => s.text).join('\n')
        console.log('Formatted stock data sent to AI:\n', combinedData)

        // Clear uploaded file after generating report
        if (uploadedDocText) {
            fileInput.value = ''
            uploadedDocText = null
            uploadArea.querySelector('.upload-placeholder').style.display = 'block'
            uploadedDisplay.style.display = 'none'
            toggle.disabled = true
            toggle.checked = false
            useRAG = false
            document.getElementById('ticker-input').disabled = false
            document.querySelectorAll('.clickable-chip').forEach(chip => chip.style.pointerEvents = 'auto')
            document.querySelector('.add-ticker-btn').disabled = false
        }

        // fetchReport(combinedData)
        if (useRAG) {
    fetchReportWithDoc(combinedData)
} else {
    fetchReport(combinedData)
}

    } catch (err) {
        loadingArea.style.display = 'none'
        document.querySelector('.action-panel').style.display = 'block'
        showToast('Error fetching stock data. Please try again.', 'error', 'Fetch Error')
        console.error('Fetch stock data error:', err)
    }
}

async function fetchReport(data) {
    const messages = [
        {
            role: 'system',
            content: `
You are a colourful, dramatic stock market guru.
Given stock data + indicator_summary for one or more stocks,
write a fun, punchy report (max 150 words total).

For each stock:
- Mention the latest closing price and one recent price move.
- Describe the trend (up, down, volatile, flat).
- Use the provided Bollinger/standard-deviation metrics as primary logic:
  * SMA(${BOLLINGER_PERIOD}), SD(${BOLLINGER_PERIOD}), Upper/Lower bands, z-score
  * Treat model_signal as the baseline recommendation
- End each stock with exactly one recommendation: Buy, Hold, or Sell.

Style:
- Energetic
- Playful
- Slightly over-the-top
- No bullet points
- No markdown
- Plain text only
`
        },
        {
            role: 'user',
            content: data
        }
    ]

    try {
        const url = 'https://openai-api-worker.magar-t-daniel.workers.dev/'

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messages)
        })
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`)
        }
        
        const text = await response.text()
        console.log('AI worker raw response:', text)
        const cleaned = text
            .replace(/###\s*/g, '')
            .replace(/\*\*/g, '')
            .replace(/-\s+/g, '• ')

        renderReport(cleaned)

    } catch (err) {
        console.error('AI API Error:', err.message)
        // Don't show chart or report, just error message
        loadingArea.style.display = 'none'
        document.querySelector('.action-panel').style.display = 'block'
        
        // Show error toast
        showToast(
            'Our AI service is temporarily unavailable. Please try again in a few moments.\n\nIf the issue persists, please check your API configuration.',
            'error',
            'Service Unavailable',
            8000
        )
    }
}
// DOCUMENT UPLOAD HANDLER
let uploadedDocText = null

const fileInput = document.getElementById('doc-upload')
const toggle = document.getElementById('use-doc-toggle')
const uploadArea = document.getElementById('doc-upload-area')
const uploadedDisplay = document.getElementById('uploaded-file-display')
const fileNameDisplay = document.getElementById('file-name-display')
const removeFileBtn = document.getElementById('remove-file-btn')

// Handle file selection
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.txt')) {
        showToast("Only TXT files are supported on this page. For PDF analysis, please use the AI Chat page.", "warning", "File Type", 5000)
        fileInput.value = ''
        return
    }

    try {
        showToast("Loading document...", "info", "Processing", 2000)

        uploadedDocText = await file.text()

        // Show uploaded file
        uploadArea.querySelector('.upload-placeholder').style.display = 'none'
        uploadedDisplay.style.display = 'flex'
        fileNameDisplay.textContent = file.name

        toggle.disabled = false
        toggle.checked = true
        useRAG = true

        // Disable ticker inputs
        document.getElementById('ticker-input').disabled = true
        document.querySelectorAll('.clickable-chip').forEach(chip => chip.style.pointerEvents = 'none')
        document.querySelector('.add-ticker-btn').disabled = true

        // Enable generate button
        generateReportBtn.disabled = false

        showToast("Document loaded successfully!", "success", "Success", 3000)

    } catch (err) {
        showToast("Failed to load document: " + err.message, "error")
        fileInput.value = ''
    }
})

// Remove file
removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    fileInput.value = ''
    uploadedDocText = null
    uploadArea.querySelector('.upload-placeholder').style.display = 'block'
    uploadedDisplay.style.display = 'none'
    toggle.disabled = true
    toggle.checked = false
    useRAG = false

    // Re-enable ticker inputs
    document.getElementById('ticker-input').disabled = false
    document.querySelectorAll('.clickable-chip').forEach(chip => chip.style.pointerEvents = 'auto')
    document.querySelector('.add-ticker-btn').disabled = false

    // Disable generate button if no tickers
    if (tickersArr.length === 0) {
        generateReportBtn.disabled = true
    }

    showToast("Document removed", "info", "Removed", 2000)
})

toggle.addEventListener("change", () => {
    useRAG = toggle.checked
    if (useRAG)
        showToast("RAG mode enabled", "info", "Mode Changed", 2000)
    else
        showToast("Normal AI mode enabled", "info", "Mode Changed", 2000)
})
async function fetchReportWithDoc(data) {
    const messages = [
        {
            role: 'system',
            content: `You are a colourful, dramatic stock market guru. Analyze stock data and write a fun, punchy report (max 150 words). For each stock: mention latest close and one recent move, describe trend, and end with one Buy/Hold/Sell recommendation. Use the provided Bollinger(${BOLLINGER_PERIOD}, ${BOLLINGER_STD_MULTIPLIER}SD) indicator_summary as primary logic (SMA, SD, bands, z-score, model_signal). Use the document context only as supporting evidence, not to override clear indicator extremes. Style: Energetic, playful, no bullet points, no markdown, plain text only.`
        },
        {
            role: 'user',
            content: `Document context:\n${uploadedDocText}\n\nStock data:\n${data}`
        }
    ]

    try {
        const url = 'https://openai-api-worker.magar-t-daniel.workers.dev/'

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messages)
        })

        if (!response.ok)
            throw new Error("AI request failed")

        const text = await response.text()
        const cleaned = text
            .replace(/###\s*/g, '')
            .replace(/\*\*/g, '')
            .replace(/-\s+/g, '• ')

        renderReport(cleaned)

    } catch (err) {
        loadingArea.style.display = 'none'
        document.querySelector('.action-panel').style.display = 'block'
        showToast("AI error: " + err.message, "error")
    }
}
// function renderReport(output) {
//     loadingArea.style.display = 'none'
//     const outputArea = document.querySelector('.output-panel')
//     outputArea.innerHTML = ''

//     const report = document.createElement('p')
//     report.innerHTML = output.replace(/\n/g, '<br>') // 👈 key change

//     outputArea.appendChild(report)
//     outputArea.style.display = 'flex'
// }


function renderReport(output) {
    document.querySelector('.action-panel').style.display = 'none'
    document.querySelector('.output-panel').style.display = 'block'

    loadingArea.style.display = 'none'

    const outputArea = document.querySelector('.output-panel')
    const card = outputArea.querySelector('.report-card')
    latestReportText = output
    renderSdSignalCards()

    card.innerHTML = ''

    // Split into paragraphs
    const paragraphs = output.split(/\n\n+/)

    const highlightedParagraphs = []
    
    paragraphs.forEach((para) => {
        const p = document.createElement('p')
        let highlightedText = para.trim()
        
        highlightedText = highlightedText.replace(/\b(Buy|BUY)(?![a-z])/g, '<span class="highlight-buy">$1</span>')
        highlightedText = highlightedText.replace(/\b(Sell|SELL)(?![a-z])/g, '<span class="highlight-sell">$1</span>')
        highlightedText = highlightedText.replace(/\b(Hold|HOLD)\b/g, '<span class="highlight-hold">$1</span>')
        
        p.innerHTML = highlightedText
        card.appendChild(p)
        highlightedParagraphs.push(highlightedText)
    })

    // const verdictBadgesContainer = document.getElementById('verdict-badges')
    // verdictBadgesContainer.innerHTML = ''

    // stockDataGlobal.forEach(stock => {
    //     const ticker = stock.ticker
    //     const badge = document.createElement('span')
    //     badge.className = 'verdict-badge'
        
    //     let verdict = 'HOLD'
    //     let verdictClass = 'hold'
        
    //     const fullText = output.toLowerCase()
    //     const tickerIndex = fullText.indexOf(ticker.toLowerCase())
        
    //     if (tickerIndex !== -1) {
    //         const nextTickerIndex = stockDataGlobal
    //             .map(s => fullText.indexOf(s.ticker.toLowerCase(), tickerIndex + 1))
    //             .filter(i => i > tickerIndex)
    //             .sort((a, b) => a - b)[0] || fullText.length
            
    //         const section = fullText.substring(tickerIndex, nextTickerIndex)
    //         const recMatch = section.match(/recommend(ation)?[?:]?\s*([^!.]+)/)
            
    //         if (recMatch) {
    //             const recText = recMatch[2]
                
    //             if (/\bsell\b/.test(recText)) {
    //                 verdict = 'SELL'
    //                 verdictClass = 'sell'
    //             } else if (/\bbuy\b/.test(recText)) {
    //                 verdict = 'BUY'
    //                 verdictClass = 'buy'
    //             } else if (/\bhold\b/.test(recText)) {
    //                 verdict = 'HOLD'
    //                 verdictClass = 'hold'
    //             }
    //         }
    //     }
        
    //     badge.textContent = `${ticker}: ${verdict}`
    //     badge.classList.add(verdictClass)
    //     verdictBadgesContainer.appendChild(badge)
    // })

    // Set card border based on dominant verdict
    const text = output.toLowerCase()
    card.classList.remove('buy', 'hold', 'sell')
    if (text.includes('buy')) {
        card.classList.add('buy')
    } else if (text.includes('sell')) {
        card.classList.add('sell')
    } else {
        card.classList.add('hold')
    }

    // Render chart
    renderChart()
}

function buildReportCopyText() {
    const sdLines = stockDataGlobal
        .filter((stock) => stock.indicator)
        .map((stock) => {
            const i = stock.indicator;
            return [
                `${stock.ticker} [${i.signal} | ${i.confidence}]`,
                `SMA(20): ${i.sma.toFixed(2)}`,
                `SD(20): ${i.stdDev.toFixed(2)}`,
                `Upper Band: ${i.upperBand.toFixed(2)}`,
                `Lower Band: ${i.lowerBand.toFixed(2)}`,
                `Z-Score: ${i.zScore.toFixed(2)}`,
                `Band Width: ${i.bandwidthPct.toFixed(2)}%`
            ].join(' | ');
        });

    const sections = [];
    if (sdLines.length) {
        sections.push('SD SIGNAL CARDS (Bollinger 20, 2SD)');
        sections.push(sdLines.join('\n'));
    }
    if (latestReportText && latestReportText.trim()) {
        sections.push('AI MARKET REPORT');
        sections.push(latestReportText.trim());
    }

    return sections.join('\n\n');
}

copyReportBtn?.addEventListener('click', async () => {
    const reportText = buildReportCopyText();
    if (!reportText.trim()) {
        showToast('No AI report available to copy yet.', 'warning', 'Nothing to Copy', 2500);
        return;
    }
    try {
        await navigator.clipboard.writeText(reportText);
        showToast('Report copied to clipboard.', 'success', 'Copied', 2200);
    } catch (error) {
        showToast('Failed to copy report.', 'error', 'Copy Error', 2500);
    }
});

copyChartDataBtn?.addEventListener('click', async () => {
    const section = document.querySelector('.report-content')
    if (!section || section.offsetParent === null) {
        showToast('No report snapshot available yet.', 'warning', 'Nothing to Copy', 2500)
        return
    }
    try {
        await copyElementAsImage(section, 'stock-analysis-report')
        showToast('Snapshot copied to clipboard.', 'success', 'Copied', 2200)
    } catch (error) {
        showToast('Could not copy snapshot. Downloaded instead.', 'warning', 'Clipboard Unavailable', 2600)
    }
})

async function copyElementAsImage(element, fileName) {
    if (!element || typeof html2canvas === 'undefined') {
        throw new Error('Snapshot library unavailable')
    }

    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: null
    })
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Failed to create image blob')

    if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        return
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName}.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    throw new Error('Clipboard image API unavailable')
}

function renderSdSignalCards() {
    const section = document.getElementById('sd-signal-section')
    const container = document.getElementById('sd-signal-cards')
    if (!section || !container) return

    const stocksWithIndicator = stockDataGlobal.filter((stock) => stock.indicator)
    if (!stocksWithIndicator.length) {
        section.style.display = 'none'
        container.innerHTML = ''
        return
    }

    const toMoney = (num) => Number(num).toFixed(2)
    container.innerHTML = stocksWithIndicator.map((stock) => {
        const i = stock.indicator
        const signalClass = i.signal.toLowerCase()
        return `
            <div class="sd-signal-card">
                <div class="sd-signal-head">
                    <span class="sd-ticker">${stock.ticker}</span>
                    <span class="sd-pill ${signalClass}">${i.signal} (${i.confidence})</span>
                </div>
                <div class="sd-grid">
                    <div class="sd-metric">SMA(20): <strong>${toMoney(i.sma)}</strong></div>
                    <div class="sd-metric">SD(20): <strong>${toMoney(i.stdDev)}</strong></div>
                    <div class="sd-metric">Upper Band: <strong>${toMoney(i.upperBand)}</strong></div>
                    <div class="sd-metric">Lower Band: <strong>${toMoney(i.lowerBand)}</strong></div>
                    <div class="sd-metric">Z-Score: <strong>${i.zScore.toFixed(2)}</strong></div>
                    <div class="sd-metric">Band Width: <strong>${i.bandwidthPct.toFixed(2)}%</strong></div>
                </div>
            </div>
        `
    }).join('')

    section.style.display = 'block'
}

function renderChart() {
    if (chartInstance) {
        chartInstance.destroy()
    }

    const ctx = document.getElementById('stockChart').getContext('2d')
    
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
    
    const datasets = stockDataGlobal.map((stock, index) => ({
        label: stock.ticker,
        data: stock.chartData.map(d => d.close),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        borderWidth: 3,
        tension: 0.4,
        fill: true
    }))

    const labels = stockDataGlobal[0]?.chartData.map(d => d.date) || []

    // Check if dark theme is active
    const isDarkTheme = document.body.classList.contains('dark-theme')
    const legendColor = isDarkTheme ? '#ffffff' : '#1e293b'
    const gridColor = isDarkTheme ? 'rgba(255, 255, 255, 0.2)' : 'rgba(102, 126, 234, 0.15)'
    const tickColor = isDarkTheme ? '#ffffff' : '#334155'

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: legendColor,
                        font: {
                            size: 14,
                            weight: 600
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#10b981',
                    bodyColor: '#e2e8f0',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: tickColor,
                        callback: function(value) {
                            return '$' + value.toFixed(2)
                        }
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: tickColor
                    },
                    grid: {
                        color: gridColor
                    }
                }
            }
        }
    })
}

window.addEventListener('themeChanged', () => {
    if (chartInstance && stockDataGlobal.length > 0) {
        renderChart()
    }
})
const newReportBtn = document.getElementById('new-report-btn')

if (newReportBtn) {
    newReportBtn.addEventListener('click', () => {
        tickersArr.length = 0
        stockDataGlobal = []
        
        if (chartInstance) {
            chartInstance.destroy()
            chartInstance = null
        }

        document.querySelector('.ticker-choice-display').textContent = 'Your tickers will appear here…'
        document.getElementById('ticker-input').value = ''
        document.querySelector('.generate-report-btn').disabled = true
        document.querySelector('.output-panel').style.display = 'none'
        document.querySelector('.action-panel').style.display = 'block'
        const sdSection = document.getElementById('sd-signal-section')
        const sdCards = document.getElementById('sd-signal-cards')
        if (sdSection) sdSection.style.display = 'none'
        if (sdCards) sdCards.innerHTML = ''
        document.getElementById('clear-tickers-btn').style.display = 'none'
        
        const label = document.querySelector('.ticker-label')
        label.style.color = '#94a3b8'
        label.textContent = 'Selected Tickers:'
        
        window.history.replaceState({}, '', '/')
    })
}

const helpBtn = document.getElementById('help-btn')
const helpPopup = document.getElementById('help-popup')
const helpClose = document.getElementById('help-close')

if (helpBtn && helpPopup && helpClose) {
    helpBtn.addEventListener('click', () => {
        helpPopup.style.display = 'flex'
    })
    
    helpClose.addEventListener('click', () => {
        helpPopup.style.display = 'none'
    })
    
    helpPopup.addEventListener('click', (e) => {
        if (e.target === helpPopup) {
            helpPopup.style.display = 'none'
        }
    })
}

document.querySelectorAll('.clickable-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const ticker = chip.getAttribute('data-ticker')
        
        if (tickersArr.length >= 3) {
            showToast('Maximum 3 tickers allowed. Clear some tickers to add more.', 'warning', 'Limit Reached', 3000)
            return
        }
        
        if (ticker && !tickersArr.includes(ticker)) {
            tickersArr.push(ticker)
            generateReportBtn.disabled = false
            renderTickers()
        }
    })
})

async function loadHomeNewsFeed() {
    const listEl = document.getElementById('news-feed-list')
    const briefEl = document.getElementById('news-feed-brief')
    const regionEl = document.getElementById('news-region-filter')
    const tickerEl = document.getElementById('news-ticker-filter')
    if (!listEl || !briefEl || !regionEl || !tickerEl) return

    const region = regionEl.value || 'all'
    const ticker = tickerEl.value.trim().toUpperCase()
    const params = new URLSearchParams({ region })
    if (ticker) params.set('ticker', ticker)

    listEl.innerHTML = ''
    briefEl.textContent = 'Loading latest headlines...'

    try {
        const res = await fetch(`${NEWS_FEED_ENDPOINT}?${params.toString()}`)
        if (!res.ok) throw new Error('News request failed')
        const json = await res.json()
        const items = Array.isArray(json.items) ? json.items : []
        briefEl.textContent = json.marketBrief || 'Latest headlines'

        if (!items.length) {
            listEl.innerHTML = '<p class="muted">No matching headlines found right now.</p>'
            return
        }

        listEl.innerHTML = items.slice(0, 12).map((item) => `
            <article class="news-item">
                <h4><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a></h4>
                <div class="news-meta">
                    <span>${item.source || 'Source'}</span>
                    <span>•</span>
                    <span>${item.region === 'india' ? 'India' : 'US'}</span>
                    <span class="news-badge ${item.sentiment || 'neutral'}">${(item.sentiment || 'neutral').toUpperCase()}</span>
                </div>
                <p class="news-why">${item.aiWhy || 'Review source context before making decisions.'}</p>
            </article>
        `).join('')
    } catch (err) {
        briefEl.textContent = 'Unable to load news feed right now.'
        listEl.innerHTML = '<p class="muted">Please try refresh in a moment.</p>'
    }
}

function initHomeNewsRegionDropdown() {
    const dropdown = document.getElementById('news-region-dropdown')
    const toggle = document.getElementById('news-region-toggle')
    const menu = document.getElementById('news-region-menu')
    const label = document.getElementById('news-region-label')
    const regionSelect = document.getElementById('news-region-filter')
    if (!dropdown || !toggle || !menu || !label || !regionSelect) return

    const optionButtons = Array.from(menu.querySelectorAll('.news-dropdown-option'))

    const syncUi = (value) => {
        const selected = optionButtons.find((btn) => btn.dataset.value === value) || optionButtons[0]
        optionButtons.forEach((btn) => btn.classList.toggle('is-selected', btn === selected))
        if (selected) {
            label.textContent = selected.dataset.label || selected.textContent.trim()
        }
    }

    const closeMenu = () => {
        dropdown.classList.remove('is-open')
        toggle.setAttribute('aria-expanded', 'false')
        menu.style.display = 'none'
    }

    const openMenu = () => {
        dropdown.classList.add('is-open')
        toggle.setAttribute('aria-expanded', 'true')
        menu.style.display = 'block'
    }

    toggle.addEventListener('click', () => {
        const isOpen = dropdown.classList.contains('is-open')
        if (isOpen) closeMenu()
        else openMenu()
    })

    optionButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const value = btn.dataset.value || 'all'
            regionSelect.value = value
            syncUi(value)
            closeMenu()
            regionSelect.dispatchEvent(new Event('change'))
        })
    })

    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
            closeMenu()
        }
    })

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeMenu()
        }
    })

    syncUi(regionSelect.value || 'all')
}

function initHomeGuideRailToggle() {
    const workspace = document.querySelector('.analysis-workspace')
    const toggleBtn = document.getElementById('workspace-guide-toggle')
    const panelHeader = document.querySelector('.panel-header')
    const mobileStatsBtn = document.getElementById('mobile-stats-toggle')
    const mobileGuideBtn = document.getElementById('mobile-guide-toggle')
    const mobileNewsBtn = document.getElementById('mobile-news-toggle')
    if (!workspace || !toggleBtn) return

    const setGuideOpen = (open, persist = true) => {
        const isDesktop = window.matchMedia('(min-width: 1025px)').matches
        const shouldCollapse = isDesktop ? !open : false
        workspace.classList.toggle('guide-collapsed', shouldCollapse)
        toggleBtn.classList.toggle('is-on', open && isDesktop)
        toggleBtn.setAttribute('aria-pressed', open && isDesktop ? 'true' : 'false')
        toggleBtn.textContent = open && isDesktop ? 'Guide: On' : 'Guide: Off'
        if (persist) {
            localStorage.setItem(HOME_GUIDE_OPEN_KEY, open ? 'on' : 'off')
        }
    }

    const savedGuideOpen = localStorage.getItem(HOME_GUIDE_OPEN_KEY)
    setGuideOpen(savedGuideOpen === null ? true : savedGuideOpen === 'on', false)

    toggleBtn.addEventListener('click', () => {
        const isOpen = !workspace.classList.contains('guide-collapsed')
        setGuideOpen(!isOpen)
    })

    const setMobilePanels = (mode) => {
        workspace.classList.toggle('show-mobile-guide', mode === 'guide')
        workspace.classList.toggle('show-mobile-news', mode === 'news')
        panelHeader?.classList.toggle('show-mobile-stats', mode === 'stats')
        mobileStatsBtn?.classList.toggle('is-active', mode === 'stats')
        mobileGuideBtn?.classList.toggle('is-active', mode === 'guide')
        mobileNewsBtn?.classList.toggle('is-active', mode === 'news')

        if (!window.matchMedia('(max-width: 1024px)').matches) return
        if (mode === 'guide') {
            document.querySelector('.analysis-left-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else if (mode === 'news') {
            document.querySelector('.analysis-news-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else if (mode === 'stats') {
            panelHeader?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    mobileStatsBtn?.addEventListener('click', () => {
        const statsOpen = panelHeader?.classList.contains('show-mobile-stats')
        setMobilePanels(statsOpen ? 'none' : 'stats')
    })

    mobileGuideBtn?.addEventListener('click', () => {
        const guideOpen = workspace.classList.contains('show-mobile-guide')
        setMobilePanels(guideOpen ? 'none' : 'guide')
    })

    mobileNewsBtn?.addEventListener('click', () => {
        const newsOpen = workspace.classList.contains('show-mobile-news')
        setMobilePanels(newsOpen ? 'none' : 'news')
    })

    window.addEventListener('resize', () => {
        const saved = localStorage.getItem(HOME_GUIDE_OPEN_KEY)
        const open = saved === null ? true : saved === 'on'
        setGuideOpen(open, false)
        if (window.matchMedia('(min-width: 1025px)').matches) {
            setMobilePanels('none')
        }
    })
}

const refreshNewsBtn = document.getElementById('refresh-news-btn')
const newsRegionFilter = document.getElementById('news-region-filter')
const newsTickerFilter = document.getElementById('news-ticker-filter')
if (refreshNewsBtn && newsRegionFilter && newsTickerFilter) {
    initHomeGuideRailToggle()
    initHomeNewsRegionDropdown()
    refreshNewsBtn.addEventListener('click', loadHomeNewsFeed)
    newsRegionFilter.addEventListener('change', loadHomeNewsFeed)
    newsTickerFilter.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            loadHomeNewsFeed()
        }
    })
    loadHomeNewsFeed()
}
