let uploadedFile = null;
let conversationHistory = [];
let lastDocumentText = null; // Store last uploaded document text

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

    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.txt')) {
        showToast('Please upload only PDF or TXT files', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
    }

    uploadedFile = file;
    document.getElementById('file-name').textContent = `📄 ${file.name}`;
    document.getElementById('file-upload-section').style.display = 'block';
    showToast(`File "${file.name}" attached successfully`, 'success', 'File Attached', 3000);
});

document.getElementById('remove-file-btn').addEventListener('click', () => {
    uploadedFile = null;
    lastDocumentText = null; // Clear document context
    document.getElementById('file-input').value = '';
    document.getElementById('file-upload-section').style.display = 'none';
    showToast('File removed. Document context cleared.', 'info', 'Removed', 2000);
});

// Auto-resize textarea
const chatInput = document.getElementById('chat-input');
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';
});

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

        // Only try to add chart if not an acknowledgment and document exists
        const isAcknowledgment = /^(thanks?|thank you|ok|okay|got it|alright|cool|great|nice|perfect|awesome|appreciate it)\s*(thanks?|thank you)?[!.]*$/i.test(input.trim());
        if (lastDocumentText && !isAcknowledgment) {
            tryAddChart(lastDocumentText, response);
        }

        // Clear uploaded file after sending
        if (uploadedFile) {
            uploadedFile = null;
            document.getElementById('file-input').value = '';
            document.getElementById('file-upload-section').style.display = 'none';
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

// Send chat query to API with RAG support
async function sendChatQuery(message) {
    conversationHistory.push({
        role: 'user',
        content: message
    });

    // Check if message is just acknowledgment/thanks
    const isAcknowledgment = /^(thanks?|thank you|ok|okay|got it|alright|cool|great|nice|perfect|awesome|appreciate it|you'?re welcome|welcome)\s*(thanks?|thank you)?[!.]*$/i.test(message.trim());

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

    // If we have a document in context, include it
    let fullQuestion;
    if (lastDocumentText) {
        fullQuestion = `Previous context: I have analyzed this financial document:

${lastDocumentText}

---

User's follow-up question: ${message}

Provide a specific answer based on the document data above. Include actual numbers and recommendations from the document.`;
    } else {
        fullQuestion = `You are a stock market AI assistant. ${message}`;
    }

    const messages = [
        {
            role: 'system',
            content: `
You are an enterprise-grade Financial Analysis AI.

DOMAIN RESTRICTION:
- Only respond to stock market, equity, or macroeconomic related queries.
- If the query is unrelated, return:
{
  "error": "This AI system only supports stock market related queries."
}

ANALYSIS LOGIC:
- If financial data is provided, perform structured data-driven analysis.
- If no financial data is provided, use your financial knowledge to give a general analytical assessment of the company, including business model strength, competitive position, industry outlook, and historical performance trends.
- Clearly distinguish between data-based analysis and general knowledge-based analysis.

RULES:
- Do not fabricate real-time prices.
- Do not invent specific financial numbers unless provided.
- If real-time data is required but not provided, state:
  "Real-time financial data not provided. Analysis based on general financial knowledge."

RESPONSE REQUIREMENTS:
- Provide valuation insight (if possible).
- Provide risk assessment.
- Provide short-term outlook.
- Provide long-term outlook.
- Provide investment signal (Buy / Hold / Sell).
- Provide confidence score (0-100).

OUTPUT:
- Always return valid JSON.
- No text outside JSON.
`
        },
        {
            role: 'user',
            content: fullQuestion
        }
    ];

    const response = await fetch('https://openai-api-worker.magar-t-daniel.workers.dev/', {
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

    conversationHistory.push({
        role: 'assistant',
        content: text
    });

    return text;
}

// Try to extract and visualize financial data
function tryAddChart(documentText, aiResponse) {
    const metrics = extractFinancialMetrics(documentText);

    if (metrics && (metrics.revenue || metrics.prices)) {
        addChartMessage(metrics);
    }
}

function extractFinancialMetrics(text) {
    const metrics = {};

    console.log('Extracting metrics from document...');

    // Extract price data with more flexible patterns
    const priceMatch = text.match(/Current Price[:\s~]+\$?([\d,]+\.?\d*)/i) ||
        text.match(/Price[:\s~]+\$?([\d,]+\.?\d*)/i);

    // Match both "52-Week Range" and separate "52-week High/Low"
    const rangeMatch = text.match(/52-Week Range[:\s]+\$?([\d,]+\.?\d*)\s*[–-]\s*\$?([\d,]+\.?\d*)/i);
    const highMatch = text.match(/52-week High[:\s~]+\$?([\d,]+)/i) ||
        text.match(/52-Week.*High[:\s~]+\$?([\d,]+)/i);
    const lowMatch = text.match(/52-week Low[:\s~]+\$?([\d,]+)/i) ||
        text.match(/52-Week.*Low[:\s~]+\$?([\d,]+)/i);

    const targetMatch = text.match(/Median[:\s]+\$?([\d,]+\.?\d*)/i) ||
        text.match(/12-Month Price Target[s]?[:\s]+.*Median[:\s]+\$?([\d,]+\.?\d*)/i);

    if (priceMatch || rangeMatch || highMatch || lowMatch || targetMatch) {
        metrics.prices = {
            current: priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null,
            low52: rangeMatch ? parseFloat(rangeMatch[1].replace(/,/g, '')) :
                (lowMatch ? parseFloat(lowMatch[1].replace(/,/g, '')) : null),
            high52: rangeMatch ? parseFloat(rangeMatch[2].replace(/,/g, '')) :
                (highMatch ? parseFloat(highMatch[1].replace(/,/g, '')) : null),
            targetMedian: targetMatch ? parseFloat(targetMatch[1].replace(/,/g, '')) : null
        };
        console.log('Extracted prices:', metrics.prices);
    } else {
        console.log('No price data found in document');
    }

    return Object.keys(metrics).length > 0 ? metrics : null;
}

function addChartMessage(metrics) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';

    const chartId = 'chart-' + Date.now();

    messageDiv.innerHTML = `
        <div class="message-avatar">📊</div>
        <div class="message-content chart-content">
            <h3>Financial Visualization</h3>
            <canvas id="${chartId}" style="max-height: 300px;"></canvas>
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    setTimeout(() => createChart(chartId, metrics), 100);
}

function createChart(chartId, metrics) {
    const ctx = document.getElementById(chartId);
    if (!ctx) {
        console.error('Chart canvas not found:', chartId);
        return;
    }

    console.log('Creating chart with metrics:', metrics);

    if (metrics.prices) {
        const { low52, current, high52, targetMedian } = metrics.prices;

        console.log('Price values:', { low52, current, high52, targetMedian });

        if (!low52 && !high52 && !current) {
            console.log('No price data available');
            return;
        }

        // Create area chart showing price range
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Year Low', 'Current', 'Year High'],
                datasets: [{
                    label: 'Price Range',
                    data: [low52 || current, current, high52 || current],
                    fill: true,
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 8,
                    pointBackgroundColor: ['#ef4444', '#10b981', '#3b82f6'],
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }, targetMedian ? {
                    label: 'Target Price',
                    data: [targetMedian, targetMedian, targetMedian],
                    borderColor: 'rgba(245, 158, 11, 1)',
                    borderWidth: 2,
                    borderDash: [10, 5],
                    fill: false,
                    pointRadius: 0
                } : null].filter(Boolean)
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true },
                    title: {
                        display: true,
                        text: 'Stock Price Analysis',
                        font: { size: 16, weight: 'bold' },
                        color: '#0f172a'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: (value) => '$' + value.toFixed(2)
                        }
                    }
                }
            }
        });

        console.log('Chart created');
    }
}

// Analyze document with RAG
async function analyzeDocument(file, query = '') {
    try {
        showToast('Processing document...', 'info', 'Processing', 3000);

        let text;
        if (file.name.endsWith('.pdf')) {
            text = await extractTextFromPDF(file);
        } else {
            text = await file.text();
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
                content: 'You are a specialized financial validator. Analyze the following text. If it is related to stocks, company financials, market analysis, or investing, reply with "VALID". If it is about anything else (cooking, travel, general news, etc.), reply with "INVALID". Do not provide any other text.'
            },
            {
                role: 'user',
                content: snippet
            }
        ];

        const validationResponse = await fetch('https://openai-api-worker.magar-t-daniel.workers.dev/', {
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

        showToast('Analyzing with AI...', 'success', 'Processing', 2000);

        const userQuery = query || 'Should I buy, sell, or hold this stock?';
        const fullQuestion = `I have uploaded a financial document. Here is the complete content:

${text}

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

        const queryResponse = await fetch('https://openai-api-worker.magar-t-daniel.workers.dev/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages)
        });

        if (!queryResponse.ok) {
            const errorText = await queryResponse.text();
            console.error('API Error:', errorText);
            throw new Error('Failed to analyze document');
        }

        return await queryResponse.text();

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

    const avatar = type === 'user' ? '👤' : '🤖';

    // Format the text: convert markdown-style formatting to HTML
    const formattedText = formatMessageText(text);

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            ${formattedText}
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatMessageText(text) {
    // Remove ** markdown bold syntax and replace with <strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert ### headers to h3
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');

    // Convert ## headers to h3 (treating as same level for chat)
    text = text.replace(/^## (.+)$/gm, '<h3>$1</h3>');

    // Convert # headers to h3
    text = text.replace(/^# (.+)$/gm, '<h3>$1</h3>');

    // Convert bullet points (- or *) to proper list items
    text = text.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');

    // Wrap consecutive <li> items in <ul>
    text = text.replace(/(<li>.*<\/li>\n?)+/gs, '<ul>$&</ul>');

    // Convert numbered lists
    text = text.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>\n?)+/gs, (match) => {
        if (!match.includes('<ul>')) {
            return '<ol>' + match + '</ol>';
        }
        return match;
    });

    // Convert line breaks to <br> for remaining text
    text = text.split('\n').map(line => {
        if (line.trim() && !line.startsWith('<') && !line.endsWith('>')) {
            return '<p>' + line + '</p>';
        }
        return line;
    }).join('');

    return text;
}

function addTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');
    const typingDiv = document.createElement('div');
    const id = 'typing-' + Date.now();
    typingDiv.id = id;
    typingDiv.className = 'message bot-message';

    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
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
