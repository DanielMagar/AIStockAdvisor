import { dates } from './utils/dates.js'

const tickersArr = []

const generateReportBtn = document.querySelector('.generate-report-btn')

generateReportBtn.addEventListener('click', fetchStockData)

document.getElementById('ticker-input-form').addEventListener('submit', (e) => {
    e.preventDefault()
    const tickerInput = document.getElementById('ticker-input')
    if (tickerInput.value.length > 2) {
        generateReportBtn.disabled = false
        const newTickerStr = tickerInput.value
        tickersArr.push(newTickerStr.toUpperCase())
        tickerInput.value = ''
        renderTickers()
    } else {
        const label = document.getElementsByTagName('label')[0]
        label.style.color = 'red'
        label.textContent = 'You must add at least one ticker. A ticker is a 3 letter or more code for a stock. E.g TSLA for Tesla.'
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

                const json = await response.json() // ✅ parse JSON

                if (!json.results || json.results.length === 0) {
                    throw new Error(`No results for ${ticker}`)
                }

                // ✅ convert to readable text for AI
                const lines = json.results.map((day, i) => {
                    const date = new Date(day.t).toISOString().split('T')[0]
                    return `Day ${i + 1} (${date}): opened at $${day.o}, closed at $${day.c}`
                })

                return `${ticker}:\n${lines.join('\n')}\n`
            })
        )

        const combinedData = stockData.join('\n')
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
            content: data   // 👈 ONLY your formatted stock data
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
        const text = await response.text()
        console.log('AI worker raw response:', text)  // 👈 ADD THIS
        const cleaned = text
            .replace(/###\s*/g, '')
            .replace(/\*\*/g, '')
            .replace(/-\s+/g, '• ')

        renderReport(cleaned)


    } catch (err) {
        console.error(err.message)
        loadingArea.innerText = 'Unable to access AI. Please refresh and try again'
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

}
const newReportBtn = document.querySelector('.new-report-btn')

if (newReportBtn) {
    newReportBtn.addEventListener('click', () => {
        // Reset state
        tickersArr.length = 0

        // Reset UI
        document.querySelector('.ticker-choice-display').textContent =
            'Your tickers will appear here…'

        document.getElementById('ticker-input').value = ''
        document.querySelector('.generate-report-btn').disabled = true

        document.querySelector('.output-panel').style.display = 'none'
        document.querySelector('.action-panel').style.display = 'block'
    })
}
