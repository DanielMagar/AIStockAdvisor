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

    // If we have a document in context, include it
    let enhancedQuestion;
    if (lastDocumentText) {
        enhancedQuestion = `Previous context: I have analyzed this financial document:

${lastDocumentText}

---

User's follow-up question: ${message}

Provide a specific answer based on the document data above. Include actual numbers and recommendations from the document.`;
    } else {
        enhancedQuestion = `You are a stock market AI assistant. Analyze the provided information and give clear BUY, SELL, or HOLD recommendations with reasoning.\n\nUser Question: ${message}`;
    }

    const response = await fetch('https://openai-api-worker.magar-t-daniel.workers.dev/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            question: enhancedQuestion
        })
    });

    if (!response.ok) {
        throw new Error('Failed to get AI response');
    }

    const text = await response.text();
    
    conversationHistory.push({
        role: 'assistant',
        content: text
    });

    return text;
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
        
        const queryResponse = await fetch('https://openai-api-worker.magar-t-daniel.workers.dev/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: fullQuestion
            })
        });

        if (!queryResponse.ok) {
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
