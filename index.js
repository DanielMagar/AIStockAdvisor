import { dates } from './utils/dates.js'

const tickersArr = []
let stockDataGlobal = []
let chartInstance = null

const generateReportBtn = document.querySelector('.generate-report-btn')

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
        return
    }

    // Show clear button when tickers exist
    clearBtn.style.display = 'block'

    tickersArr.forEach((ticker, index) => {
        const span = document.createElement('span')
        span.textContent = ticker
        tickersDiv.appendChild(span)

        // Add comma + space except after last item
        if (index < tickersArr.length - 1) {
            tickersDiv.appendChild(document.createTextNode(', '))
        }
    })
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

    const failedTickers = []

    try {
        const stockData = await Promise.all(
            tickersArr.map(async (ticker) => {
                const url = `https://polygon-api-worker.magar-t-daniel.workers.dev/?ticker=${ticker}&start=${dates.startDate}&end=${dates.endDate}`

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

                    // Convert to readable text for AI
                    const lines = json.results.map((day, i) => {
                        const date = new Date(day.t).toISOString().split('T')[0]
                        return `Day ${i + 1} (${date}): opened at $${day.o}, closed at $${day.c}`
                    })

                    return {
                        ticker,
                        text: `${ticker}:\n${lines.join('\n')}\n`,
                        chartData
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

        fetchReport(combinedData)

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
Given price data for one or more stocks over the past few days,
write a fun, punchy report (max 150 words total).

For each stock:
- Mention the opening and closing prices.
- Describe the trend (up, down, volatile, flat).
- End with a clear recommendation: Buy, Hold, or Sell.

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

    card.innerHTML = ''

    // Split into paragraphs
    const paragraphs = output.split(/\n\n+/)

    const highlightedParagraphs = []
    
    paragraphs.forEach((para) => {
        const p = document.createElement('p')
        let highlightedText = para.trim()
        
        highlightedText = highlightedText.replace(/\b(Buy|BUY)(?![a-z])/g, '<span class="highlight-buy">$1</span>')
        highlightedText = highlightedText.replace(/\b(Sell|SELL)(?![a-z])/g, '<span class="highlight-sell">$1</span>')
        highlightedText = highlightedText.replace(/\b(Hold|HOLD)(?!\s+(onto|your|tight|on|up|out|off|for))/g, '<span class="highlight-hold">$1</span>')
        
        p.innerHTML = highlightedText
        card.appendChild(p)
        highlightedParagraphs.push(highlightedText)
    })

    const verdictBadgesContainer = document.getElementById('verdict-badges')
    verdictBadgesContainer.innerHTML = ''

    stockDataGlobal.forEach(stock => {
        const ticker = stock.ticker
        const badge = document.createElement('span')
        badge.className = 'verdict-badge'
        
        const tickerPara = highlightedParagraphs.find(p => p.toLowerCase().includes(ticker.toLowerCase()))
        
        let verdict = 'HOLD'
        let verdictClass = 'hold'
        
        if (tickerPara) {
            if (tickerPara.includes('highlight-buy')) {
                verdict = 'BUY'
                verdictClass = 'buy'
            } else if (tickerPara.includes('highlight-sell')) {
                verdict = 'SELL'
                verdictClass = 'sell'
            } else if (tickerPara.includes('highlight-hold')) {
                verdict = 'HOLD'
                verdictClass = 'hold'
            }
        }
        
        badge.textContent = `${ticker}: ${verdict}`
        badge.classList.add(verdictClass)
        verdictBadgesContainer.appendChild(badge)
    })

    // Set card border based on dominant verdict
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
                        color: '#e2e8f0',
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
                        color: '#94a3b8',
                        callback: function(value) {
                            return '$' + value.toFixed(2)
                        }
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)'
                    }
                }
            }
        }
    })
}
const newReportBtn = document.querySelector('.new-report-btn')

if (newReportBtn) {
    newReportBtn.addEventListener('click', () => {
        // Reset state
        tickersArr.length = 0
        stockDataGlobal = []
        
        if (chartInstance) {
            chartInstance.destroy()
            chartInstance = null
        }

        // Reset UI
        document.querySelector('.ticker-choice-display').textContent =
            'Your tickers will appear here…'

        document.getElementById('ticker-input').value = ''
        document.querySelector('.generate-report-btn').disabled = true

        document.querySelector('.output-panel').style.display = 'none'
        document.querySelector('.action-panel').style.display = 'block'
    })
}
