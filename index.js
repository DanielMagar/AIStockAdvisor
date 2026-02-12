import { dates } from './utils/dates.js'

const tickersArr = []
let stockDataGlobal = []
let chartInstance = null

const generateReportBtn = document.querySelector('.generate-report-btn')

generateReportBtn.addEventListener('click', fetchStockData)

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
    tickersDiv.innerHTML = ''

    if (tickersArr.length === 0) {
        tickersDiv.textContent = 'Your tickers will appear here…'
        return
    }

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



const loadingArea = document.querySelector('.loading-panel')
const apiMessage = document.getElementById('api-message')

async function fetchStockData() {
    document.querySelector('.action-panel').style.display = 'none'
    loadingArea.style.display = 'flex'

    try {
        const stockData = await Promise.all(
            tickersArr.map(async (ticker) => {
                const url = `https://polygon-api-worker.magar-t-daniel.workers.dev/?ticker=${ticker}&start=${dates.startDate}&end=${dates.endDate}`

                const response = await fetch(url)
                const status = response.status

                if (status !== 200) {
                    throw new Error(`Polygon API failed for ${ticker} with status ${status}`)
                }

                const json = await response.json()

                if (!json.results || json.results.length === 0) {
                    throw new Error(`No results for ${ticker}`)
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
            })
        )

        stockDataGlobal = stockData
        const combinedData = stockData.map(s => s.text).join('\n')
        console.log('Formatted stock data sent to AI:\n', combinedData)

        fetchReport(combinedData)

    } catch (err) {
        loadingArea.innerText = 'There was an error fetching stock data.'
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
        // Show chart anyway with error message
        renderReport('Unable to generate AI report at this time. Please check your API configuration and try again.\n\nError: ' + err.message)
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

    paragraphs.forEach((para) => {
        const p = document.createElement('p')
        p.textContent = para.trim()
        card.appendChild(p)
    })

    // ---- Trading signal stripe (single dominant verdict) ----
    card.classList.remove('buy', 'hold', 'sell')

    const text = output.toLowerCase()

    // Priority: BUY > SELL > HOLD
    if (text.includes('time to buy') || text.includes('buy now') || text.includes('this stock is on fire')) {
        card.classList.add('buy')
    } else if (text.includes('sell') || text.includes('dump') || text.includes('take profits')) {
        card.classList.add('sell')
    } else if (text.includes('hold')) {
        card.classList.add('hold')
    }
    const badge = document.getElementById('verdict-badge')
    badge.className = 'verdict-badge'

    if (card.classList.contains('buy')) {
        badge.textContent = 'BUY'
        badge.classList.add('buy')
    } else if (card.classList.contains('sell')) {
        badge.textContent = 'SELL'
        badge.classList.add('sell')
    } else {
        badge.textContent = 'HOLD'
        badge.classList.add('hold')
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
