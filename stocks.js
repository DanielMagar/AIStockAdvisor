// Top 100 US Stocks Data
const top100Stocks = [
    // Technology
    { ticker: 'AAPL', name: 'Apple Inc.', sector: 'technology', description: 'Consumer electronics, software, and services', market: 'NASDAQ' },
    { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'technology', description: 'Software, cloud computing, and gaming', market: 'NASDAQ' },
    { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'technology', description: 'Search engine, advertising, and cloud', market: 'NASDAQ' },
    { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'technology', description: 'Graphics processors and AI chips', market: 'NASDAQ' },
    { ticker: 'META', name: 'Meta Platforms Inc.', sector: 'technology', description: 'Social media and virtual reality', market: 'NASDAQ' },
    { ticker: 'TSLA', name: 'Tesla Inc.', sector: 'technology', description: 'Electric vehicles and clean energy', market: 'NASDAQ' },
    { ticker: 'AVGO', name: 'Broadcom Inc.', sector: 'technology', description: 'Semiconductor and infrastructure software', market: 'NASDAQ' },
    { ticker: 'ORCL', name: 'Oracle Corporation', sector: 'technology', description: 'Database software and cloud solutions', market: 'NYSE' },
    { ticker: 'ADBE', name: 'Adobe Inc.', sector: 'technology', description: 'Creative software and digital marketing', market: 'NASDAQ' },
    { ticker: 'CRM', name: 'Salesforce Inc.', sector: 'technology', description: 'Customer relationship management software', market: 'NYSE' },
    { ticker: 'CSCO', name: 'Cisco Systems', sector: 'technology', description: 'Networking hardware and software', market: 'NASDAQ' },
    { ticker: 'INTC', name: 'Intel Corporation', sector: 'technology', description: 'Semiconductor chip manufacturer', market: 'NASDAQ' },
    { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'technology', description: 'Computer processors and graphics', market: 'NASDAQ' },
    { ticker: 'IBM', name: 'IBM', sector: 'technology', description: 'Enterprise technology and consulting', market: 'NYSE' },
    { ticker: 'QCOM', name: 'Qualcomm Inc.', sector: 'technology', description: 'Wireless technology and semiconductors', market: 'NASDAQ' },
    
    // Finance
    { ticker: 'BRK.B', name: 'Berkshire Hathaway', sector: 'finance', description: 'Diversified holding company', market: 'NYSE' },
    { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'finance', description: 'Investment banking and financial services', market: 'NYSE' },
    { ticker: 'V', name: 'Visa Inc.', sector: 'finance', description: 'Payment processing network', market: 'NYSE' },
    { ticker: 'MA', name: 'Mastercard Inc.', sector: 'finance', description: 'Global payment technology', market: 'NYSE' },
    { ticker: 'BAC', name: 'Bank of America', sector: 'finance', description: 'Banking and financial services', market: 'NYSE' },
    { ticker: 'WFC', name: 'Wells Fargo', sector: 'finance', description: 'Banking and mortgage services', market: 'NYSE' },
    { ticker: 'GS', name: 'Goldman Sachs', sector: 'finance', description: 'Investment banking and securities', market: 'NYSE' },
    { ticker: 'MS', name: 'Morgan Stanley', sector: 'finance', description: 'Investment banking and wealth management', market: 'NYSE' },
    { ticker: 'AXP', name: 'American Express', sector: 'finance', description: 'Credit cards and payment services', market: 'NYSE' },
    { ticker: 'BLK', name: 'BlackRock Inc.', sector: 'finance', description: 'Investment management firm', market: 'NYSE' },
    
    // Healthcare
    { ticker: 'UNH', name: 'UnitedHealth Group', sector: 'healthcare', description: 'Health insurance and care services', market: 'NYSE' },
    { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'healthcare', description: 'Pharmaceuticals and medical devices', market: 'NYSE' },
    { ticker: 'LLY', name: 'Eli Lilly and Company', sector: 'healthcare', description: 'Pharmaceutical manufacturer', market: 'NYSE' },
    { ticker: 'ABBV', name: 'AbbVie Inc.', sector: 'healthcare', description: 'Biopharmaceutical company', market: 'NYSE' },
    { ticker: 'MRK', name: 'Merck & Co.', sector: 'healthcare', description: 'Pharmaceutical and vaccine developer', market: 'NYSE' },
    { ticker: 'PFE', name: 'Pfizer Inc.', sector: 'healthcare', description: 'Pharmaceutical and biotechnology', market: 'NYSE' },
    { ticker: 'TMO', name: 'Thermo Fisher Scientific', sector: 'healthcare', description: 'Scientific instruments and reagents', market: 'NYSE' },
    { ticker: 'ABT', name: 'Abbott Laboratories', sector: 'healthcare', description: 'Medical devices and diagnostics', market: 'NYSE' },
    { ticker: 'DHR', name: 'Danaher Corporation', sector: 'healthcare', description: 'Life sciences and diagnostics', market: 'NYSE' },
    { ticker: 'CVS', name: 'CVS Health', sector: 'healthcare', description: 'Pharmacy and healthcare services', market: 'NYSE' },
    
    // Consumer
    { ticker: 'AMZN', name: 'Amazon.com Inc.', sector: 'consumer', description: 'E-commerce and cloud computing', market: 'NASDAQ' },
    { ticker: 'WMT', name: 'Walmart Inc.', sector: 'consumer', description: 'Retail and grocery stores', market: 'NYSE' },
    { ticker: 'HD', name: 'Home Depot', sector: 'consumer', description: 'Home improvement retail', market: 'NYSE' },
    { ticker: 'PG', name: 'Procter & Gamble', sector: 'consumer', description: 'Consumer goods and personal care', market: 'NYSE' },
    { ticker: 'KO', name: 'Coca-Cola Company', sector: 'consumer', description: 'Beverage manufacturer', market: 'NYSE' },
    { ticker: 'PEP', name: 'PepsiCo Inc.', sector: 'consumer', description: 'Food and beverage company', market: 'NASDAQ' },
    { ticker: 'COST', name: 'Costco Wholesale', sector: 'consumer', description: 'Membership warehouse club', market: 'NASDAQ' },
    { ticker: 'MCD', name: "McDonald's Corporation", sector: 'consumer', description: 'Fast food restaurant chain', market: 'NYSE' },
    { ticker: 'NKE', name: 'Nike Inc.', sector: 'consumer', description: 'Athletic footwear and apparel', market: 'NYSE' },
    { ticker: 'SBUX', name: 'Starbucks Corporation', sector: 'consumer', description: 'Coffee chain and roaster', market: 'NASDAQ' },
    { ticker: 'TGT', name: 'Target Corporation', sector: 'consumer', description: 'Discount retail stores', market: 'NYSE' },
    { ticker: 'LOW', name: "Lowe's Companies", sector: 'consumer', description: 'Home improvement retail', market: 'NYSE' },
    { ticker: 'DIS', name: 'Walt Disney Company', sector: 'consumer', description: 'Entertainment and media', market: 'NYSE' },
    { ticker: 'NFLX', name: 'Netflix Inc.', sector: 'consumer', description: 'Streaming entertainment service', market: 'NASDAQ' },
    { ticker: 'CMCSA', name: 'Comcast Corporation', sector: 'consumer', description: 'Cable and media company', market: 'NASDAQ' },
    
    // Energy
    { ticker: 'XOM', name: 'Exxon Mobil', sector: 'energy', description: 'Oil and gas exploration', market: 'NYSE' },
    { ticker: 'CVX', name: 'Chevron Corporation', sector: 'energy', description: 'Integrated energy company', market: 'NYSE' },
    { ticker: 'COP', name: 'ConocoPhillips', sector: 'energy', description: 'Oil and natural gas exploration', market: 'NYSE' },
    { ticker: 'SLB', name: 'Schlumberger', sector: 'energy', description: 'Oilfield services company', market: 'NYSE' },
    { ticker: 'EOG', name: 'EOG Resources', sector: 'energy', description: 'Oil and gas exploration', market: 'NYSE' },
    
    // Industrial
    { ticker: 'BA', name: 'Boeing Company', sector: 'industrial', description: 'Aerospace and defense', market: 'NYSE' },
    { ticker: 'CAT', name: 'Caterpillar Inc.', sector: 'industrial', description: 'Construction and mining equipment', market: 'NYSE' },
    { ticker: 'GE', name: 'General Electric', sector: 'industrial', description: 'Industrial conglomerate', market: 'NYSE' },
    { ticker: 'UPS', name: 'United Parcel Service', sector: 'industrial', description: 'Package delivery and logistics', market: 'NYSE' },
    { ticker: 'HON', name: 'Honeywell International', sector: 'industrial', description: 'Industrial technology and aerospace', market: 'NASDAQ' },
    { ticker: 'RTX', name: 'Raytheon Technologies', sector: 'industrial', description: 'Aerospace and defense', market: 'NYSE' },
    { ticker: 'LMT', name: 'Lockheed Martin', sector: 'industrial', description: 'Aerospace and defense contractor', market: 'NYSE' },
    { ticker: 'DE', name: 'Deere & Company', sector: 'industrial', description: 'Agricultural and construction machinery', market: 'NYSE' },
    { ticker: 'MMM', name: '3M Company', sector: 'industrial', description: 'Industrial and consumer products', market: 'NYSE' },
    { ticker: 'UNP', name: 'Union Pacific', sector: 'industrial', description: 'Railroad transportation', market: 'NYSE' },
    
    // Telecom
    { ticker: 'T', name: 'AT&T Inc.', sector: 'telecom', description: 'Telecommunications and media', market: 'NYSE' },
    { ticker: 'VZ', name: 'Verizon Communications', sector: 'telecom', description: 'Wireless telecommunications', market: 'NYSE' },
    { ticker: 'TMUS', name: 'T-Mobile US', sector: 'telecom', description: 'Wireless network operator', market: 'NASDAQ' },
    
    // Additional Tech & Others
    { ticker: 'PYPL', name: 'PayPal Holdings', sector: 'technology', description: 'Online payment systems', market: 'NASDAQ' },
    { ticker: 'NFLX', name: 'Netflix Inc.', sector: 'technology', description: 'Streaming entertainment', market: 'NASDAQ' },
    { ticker: 'UBER', name: 'Uber Technologies', sector: 'technology', description: 'Ride-sharing and delivery', market: 'NYSE' },
    { ticker: 'ABNB', name: 'Airbnb Inc.', sector: 'consumer', description: 'Vacation rental marketplace', market: 'NASDAQ' },
    { ticker: 'SHOP', name: 'Shopify Inc.', sector: 'technology', description: 'E-commerce platform', market: 'NYSE' },
    { ticker: 'SQ', name: 'Block Inc.', sector: 'technology', description: 'Financial services and payments', market: 'NYSE' },
    { ticker: 'SNAP', name: 'Snap Inc.', sector: 'technology', description: 'Social media and camera company', market: 'NYSE' },
    { ticker: 'SPOT', name: 'Spotify Technology', sector: 'technology', description: 'Music streaming service', market: 'NYSE' },
    { ticker: 'ZM', name: 'Zoom Video Communications', sector: 'technology', description: 'Video conferencing platform', market: 'NASDAQ' },
    { ticker: 'DOCU', name: 'DocuSign Inc.', sector: 'technology', description: 'Electronic signature technology', market: 'NASDAQ' },
    { ticker: 'SNOW', name: 'Snowflake Inc.', sector: 'technology', description: 'Cloud data platform', market: 'NYSE' },
    { ticker: 'PLTR', name: 'Palantir Technologies', sector: 'technology', description: 'Data analytics software', market: 'NYSE' },
    { ticker: 'RBLX', name: 'Roblox Corporation', sector: 'technology', description: 'Online gaming platform', market: 'NYSE' },
    { ticker: 'COIN', name: 'Coinbase Global', sector: 'finance', description: 'Cryptocurrency exchange', market: 'NASDAQ' },
    { ticker: 'SQ', name: 'Square Inc.', sector: 'finance', description: 'Payment processing', market: 'NYSE' },
    { ticker: 'F', name: 'Ford Motor Company', sector: 'consumer', description: 'Automobile manufacturer', market: 'NYSE' },
    { ticker: 'GM', name: 'General Motors', sector: 'consumer', description: 'Automobile manufacturer', market: 'NYSE' },
    { ticker: 'DAL', name: 'Delta Air Lines', sector: 'industrial', description: 'Major airline carrier', market: 'NYSE' },
    { ticker: 'AAL', name: 'American Airlines', sector: 'industrial', description: 'Major airline carrier', market: 'NASDAQ' },
    { ticker: 'UAL', name: 'United Airlines', sector: 'industrial', description: 'Major airline carrier', market: 'NASDAQ' },
];

// Render stocks
function renderStocks(stocks) {
    const grid = document.getElementById('stocks-grid');
    grid.innerHTML = '';
    
    if (stocks.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px;">No stocks found matching your criteria.</p>';
        return;
    }
    
    stocks.forEach(stock => {
        const card = document.createElement('div');
        card.className = 'stock-card';
        card.setAttribute('data-sector', stock.sector);
        
        card.innerHTML = `
            <div class="stock-header">
                <div class="stock-ticker">${stock.ticker}</div>
                <div class="stock-sector">${stock.sector}</div>
            </div>
            <div class="stock-name">${stock.name}</div>
            <div class="stock-description">${stock.description}</div>
            <div class="stock-footer">
                <div class="stock-market">${stock.market}</div>
                <button class="analyze-btn" onclick="analyzeStock('${stock.ticker}')">Analyze →</button>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

// Search and filter
function filterStocks() {
    const searchTerm = document.getElementById('stock-search').value.toLowerCase();
    const sector = document.getElementById('sector-filter').value;
    
    let filtered = top100Stocks;
    
    // Filter by sector
    if (sector !== 'all') {
        filtered = filtered.filter(stock => stock.sector === sector);
    }
    
    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(stock => 
            stock.ticker.toLowerCase().includes(searchTerm) ||
            stock.name.toLowerCase().includes(searchTerm) ||
            stock.description.toLowerCase().includes(searchTerm)
        );
    }
    
    renderStocks(filtered);
}

// Analyze stock - redirect to home with ticker
function analyzeStock(ticker) {
    window.location.href = `/?ticker=${ticker}`;
}

// Event listeners
document.getElementById('stock-search').addEventListener('input', filterStocks);
document.getElementById('sector-filter').addEventListener('change', filterStocks);

// Initial render
renderStocks(top100Stocks);
