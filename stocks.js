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

const indianTop100Stocks = [
    ['RELIANCE.NS', 'Reliance Industries', 'energy', 'Energy, telecom, and retail conglomerate'],
    ['TCS.NS', 'Tata Consultancy Services', 'technology', 'IT services and consulting leader'],
    ['HDFCBANK.NS', 'HDFC Bank', 'finance', 'Private sector banking and financial services'],
    ['ICICIBANK.NS', 'ICICI Bank', 'finance', 'Retail and corporate banking'],
    ['INFY.NS', 'Infosys', 'technology', 'IT services and digital transformation'],
    ['HINDUNILVR.NS', 'Hindustan Unilever', 'consumer', 'Consumer goods and personal care'],
    ['ITC.NS', 'ITC Limited', 'consumer', 'FMCG, hotels, and cigarettes'],
    ['LT.NS', 'Larsen & Toubro', 'industrial', 'Engineering and infrastructure'],
    ['SBIN.NS', 'State Bank of India', 'finance', 'Largest public sector bank in India'],
    ['BHARTIARTL.NS', 'Bharti Airtel', 'telecom', 'Telecom and digital services'],
    ['KOTAKBANK.NS', 'Kotak Mahindra Bank', 'finance', 'Banking and wealth management'],
    ['AXISBANK.NS', 'Axis Bank', 'finance', 'Private banking and lending'],
    ['ASIANPAINT.NS', 'Asian Paints', 'consumer', 'Decorative paints manufacturer'],
    ['MARUTI.NS', 'Maruti Suzuki', 'consumer', 'Passenger vehicle manufacturer'],
    ['TITAN.NS', 'Titan Company', 'consumer', 'Jewellery and lifestyle products'],
    ['BAJFINANCE.NS', 'Bajaj Finance', 'finance', 'Consumer and SME lending'],
    ['BAJAJFINSV.NS', 'Bajaj Finserv', 'finance', 'Financial services and insurance'],
    ['ADANIENT.NS', 'Adani Enterprises', 'industrial', 'Diversified infrastructure business'],
    ['ADANIPORTS.NS', 'Adani Ports', 'industrial', 'Port operations and logistics'],
    ['WIPRO.NS', 'Wipro', 'technology', 'IT services and consulting'],
    ['HCLTECH.NS', 'HCL Technologies', 'technology', 'IT and engineering services'],
    ['SUNPHARMA.NS', 'Sun Pharmaceutical', 'healthcare', 'Pharmaceutical products'],
    ['DRREDDY.NS', "Dr. Reddy's Laboratories", 'healthcare', 'Generic drug manufacturer'],
    ['CIPLA.NS', 'Cipla', 'healthcare', 'Respiratory and generic medicines'],
    ['NESTLEIND.NS', 'Nestle India', 'consumer', 'Packaged foods and beverages'],
    ['ULTRACEMCO.NS', 'UltraTech Cement', 'industrial', 'Cement manufacturing'],
    ['TATAMOTORS.NS', 'Tata Motors', 'consumer', 'Automobiles and EVs'],
    ['TATASTEEL.NS', 'Tata Steel', 'industrial', 'Steel and metal products'],
    ['JSWSTEEL.NS', 'JSW Steel', 'industrial', 'Steel producer'],
    ['POWERGRID.NS', 'Power Grid Corp', 'energy', 'Power transmission utility'],
    ['NTPC.NS', 'NTPC', 'energy', 'Power generation utility'],
    ['ONGC.NS', 'ONGC', 'energy', 'Oil and gas exploration'],
    ['COALINDIA.NS', 'Coal India', 'energy', 'Coal mining enterprise'],
    ['INDUSINDBK.NS', 'IndusInd Bank', 'finance', 'Commercial banking'],
    ['TECHM.NS', 'Tech Mahindra', 'technology', 'IT services and telecom software'],
    ['HEROMOTOCO.NS', 'Hero MotoCorp', 'consumer', 'Two-wheeler manufacturer'],
    ['EICHERMOT.NS', 'Eicher Motors', 'consumer', 'Motorcycles and CVs'],
    ['APOLLOHOSP.NS', 'Apollo Hospitals', 'healthcare', 'Hospital and healthcare services'],
    ['DIVISLAB.NS', "Divi's Laboratories", 'healthcare', 'API and pharma ingredients'],
    ['GRASIM.NS', 'Grasim Industries', 'industrial', 'Cement, chemicals, and textiles'],
    ['SHRIRAMFIN.NS', 'Shriram Finance', 'finance', 'Retail lending and financing'],
    ['HINDALCO.NS', 'Hindalco Industries', 'industrial', 'Aluminium and copper producer'],
    ['BRITANNIA.NS', 'Britannia Industries', 'consumer', 'Packaged foods'],
    ['BPCL.NS', 'Bharat Petroleum', 'energy', 'Oil marketing company'],
    ['IOC.NS', 'Indian Oil Corporation', 'energy', 'Refining and fuel distribution'],
    ['SBILIFE.NS', 'SBI Life Insurance', 'finance', 'Life insurance provider'],
    ['HDFCLIFE.NS', 'HDFC Life Insurance', 'finance', 'Life insurance provider'],
    ['BAJAJ-AUTO.NS', 'Bajaj Auto', 'consumer', 'Motorcycles and 3-wheelers'],
    ['TATACONSUM.NS', 'Tata Consumer Products', 'consumer', 'Beverages and foods'],
    ['ADANIGREEN.NS', 'Adani Green Energy', 'energy', 'Renewable energy generation'],
    ['ADANIPOWER.NS', 'Adani Power', 'energy', 'Thermal power generation'],
    ['AMBUJACEM.NS', 'Ambuja Cements', 'industrial', 'Cement manufacturer'],
    ['ACC.NS', 'ACC Limited', 'industrial', 'Cement and concrete'],
    ['PIDILITIND.NS', 'Pidilite Industries', 'consumer', 'Adhesives and sealants'],
    ['DABUR.NS', 'Dabur India', 'consumer', 'Ayurvedic and FMCG products'],
    ['GODREJCP.NS', 'Godrej Consumer Products', 'consumer', 'Household and personal care'],
    ['COLPAL.NS', 'Colgate-Palmolive India', 'consumer', 'Oral care and personal products'],
    ['M&M.NS', 'Mahindra & Mahindra', 'consumer', 'Automobiles and tractors'],
    ['TVSMOTOR.NS', 'TVS Motor', 'consumer', 'Two-wheeler manufacturer'],
    ['ZYDUSLIFE.NS', 'Zydus Lifesciences', 'healthcare', 'Pharmaceutical company'],
    ['LUPIN.NS', 'Lupin', 'healthcare', 'Generic pharma products'],
    ['TORNTPHARM.NS', 'Torrent Pharmaceuticals', 'healthcare', 'Pharmaceutical company'],
    ['AUROPHARMA.NS', 'Aurobindo Pharma', 'healthcare', 'Generic medicines'],
    ['MUTHOOTFIN.NS', 'Muthoot Finance', 'finance', 'Gold loan NBFC'],
    ['CHOLAFIN.NS', 'Cholamandalam Finance', 'finance', 'Vehicle and consumer finance'],
    ['ICICIPRULI.NS', 'ICICI Prudential Life', 'finance', 'Life insurance'],
    ['PNB.NS', 'Punjab National Bank', 'finance', 'Public sector bank'],
    ['BANKBARODA.NS', 'Bank of Baroda', 'finance', 'Public sector bank'],
    ['CANBK.NS', 'Canara Bank', 'finance', 'Public sector bank'],
    ['UNIONBANK.NS', 'Union Bank of India', 'finance', 'Public sector bank'],
    ['IDFCFIRSTB.NS', 'IDFC First Bank', 'finance', 'Retail and corporate banking'],
    ['FEDERALBNK.NS', 'Federal Bank', 'finance', 'Private sector bank'],
    ['NAUKRI.NS', 'Info Edge', 'technology', 'Online classifieds platform'],
    ['ZOMATO.NS', 'Zomato', 'consumer', 'Food delivery and quick commerce'],
    ['PAYTM.NS', 'One97 Communications', 'technology', 'Digital payments and fintech'],
    ['DMART.NS', 'Avenue Supermarts', 'consumer', 'Retail supermarket chain'],
    ['TRENT.NS', 'Trent', 'consumer', 'Retail and fashion stores'],
    ['IRCTC.NS', 'IRCTC', 'industrial', 'Railway ticketing and catering'],
    ['HAL.NS', 'Hindustan Aeronautics', 'industrial', 'Defense aerospace company'],
    ['BEL.NS', 'Bharat Electronics', 'industrial', 'Defense electronics'],
    ['BHEL.NS', 'BHEL', 'industrial', 'Power and industrial equipment'],
    ['SIEMENS.NS', 'Siemens India', 'industrial', 'Industrial automation and electrification'],
    ['CUMMINSIND.NS', 'Cummins India', 'industrial', 'Engines and power systems'],
    ['AIAENG.NS', 'AIA Engineering', 'industrial', 'Industrial wear parts'],
    ['POLYCAB.NS', 'Polycab India', 'industrial', 'Wires and electrical products'],
    ['HAVELLS.NS', 'Havells India', 'industrial', 'Electrical equipment'],
    ['VOLTAS.NS', 'Voltas', 'industrial', 'Cooling and engineering services'],
    ['CGPOWER.NS', 'CG Power', 'industrial', 'Electrical machinery'],
    ['INDIGO.NS', 'InterGlobe Aviation', 'industrial', 'Airline operator'],
    ['DLF.NS', 'DLF', 'consumer', 'Real estate development'],
    ['GODREJPROP.NS', 'Godrej Properties', 'consumer', 'Real estate development'],
    ['LODHA.NS', 'Macrotech Developers', 'consumer', 'Real estate development'],
    ['OBEROIRLTY.NS', 'Oberoi Realty', 'consumer', 'Real estate developer'],
    ['PERSISTENT.NS', 'Persistent Systems', 'technology', 'Software and digital engineering'],
    ['COFORGE.NS', 'Coforge', 'technology', 'IT solutions and services'],
    ['MPHASIS.NS', 'Mphasis', 'technology', 'Cloud and IT services'],
    ['LTIM.NS', 'LTIMindtree', 'technology', 'IT services and consulting'],
    ['TATAELXSI.NS', 'Tata Elxsi', 'technology', 'Design and embedded technology'],
    ['BOSCHLTD.NS', 'Bosch India', 'industrial', 'Auto components and engineering'],
    ['SAIL.NS', 'SAIL', 'industrial', 'Steel producer'],
    ['JINDALSTEL.NS', 'Jindal Steel & Power', 'industrial', 'Steel and power'],
    ['NMDC.NS', 'NMDC', 'industrial', 'Iron ore mining'],
    ['GAIL.NS', 'GAIL', 'energy', 'Natural gas transmission'],
    ['PETRONET.NS', 'Petronet LNG', 'energy', 'LNG import and regasification']
].map(([ticker, name, sector, description]) => ({
    ticker,
    name,
    sector,
    description,
    market: 'NSE',
    region: 'NSE'
}));

const allStocks = [
    ...top100Stocks.map((stock) => ({ ...stock, region: 'US' })),
    ...indianTop100Stocks
];

// Render stocks
function renderStocks(stocks) {
    const grid = document.getElementById('stocks-grid');
    const resultsCount = document.getElementById('results-count');
    grid.innerHTML = '';
    
    resultsCount.textContent = `Showing ${stocks.length} stock${stocks.length !== 1 ? 's' : ''}`;
    
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
                <div class="stock-market">${stock.region === 'NSE' ? 'NSE India' : stock.market}</div>
                <button class="analyze-btn" data-ticker="${stock.ticker}">Analyze →</button>
            </div>
        `;
        
        // Add event listener to analyze button
        const analyzeBtn = card.querySelector('.analyze-btn');
        analyzeBtn.addEventListener('click', () => {
            analyzeStock(stock);
        });
        
        grid.appendChild(card);
    });
}

// Search and filter
function filterStocks() {
    const searchTerm = document.getElementById('stock-search').value.toLowerCase();
    const sector = document.getElementById('sector-filter').value;
    const market = document.getElementById('market-filter').value;
    
    let filtered = allStocks;

    if (market !== 'all') {
        filtered = filtered.filter(stock => stock.region === market);
    }
    
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
function analyzeStock(stock) {
    if (stock.region === 'NSE') {
        const prompt = encodeURIComponent(`Analyze ${stock.ticker} (${stock.name}) for Indian market. Share simple Buy/Hold/Sell with risks and key levels.`);
        window.location.href = `/chat.html?q=${prompt}`;
        return;
    }
    window.location.href = `/?ticker=${stock.ticker}`;
}

function initCustomFilterDropdown({ dropdownId, selectId, labelId }) {
    const dropdown = document.getElementById(dropdownId);
    const nativeSelect = document.getElementById(selectId);
    const label = document.getElementById(labelId);
    if (!dropdown || !nativeSelect || !label) return;

    const toggle = dropdown.querySelector('.stock-dropdown-toggle');
    const menu = dropdown.querySelector('.stock-dropdown-menu');
    const options = Array.from(dropdown.querySelectorAll('.stock-dropdown-option'));
    if (!toggle || !menu || !options.length) return;

    const syncUi = (value) => {
        const selected = options.find((btn) => btn.dataset.value === value) || options[0];
        options.forEach((btn) => btn.classList.toggle('is-selected', btn === selected));
        label.textContent = selected?.dataset.label || selected?.textContent?.trim() || '';
    };

    const closeMenu = () => {
        dropdown.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        menu.style.display = 'none';
    };

    toggle.addEventListener('click', () => {
        const isOpen = dropdown.classList.contains('is-open');
        if (isOpen) {
            closeMenu();
            return;
        }
        document.querySelectorAll('.stock-filter-dropdown.is-open').forEach((openDropdown) => {
            openDropdown.classList.remove('is-open');
            const openToggle = openDropdown.querySelector('.stock-dropdown-toggle');
            const openMenu = openDropdown.querySelector('.stock-dropdown-menu');
            if (openToggle) openToggle.setAttribute('aria-expanded', 'false');
            if (openMenu) openMenu.style.display = 'none';
        });
        dropdown.classList.add('is-open');
        toggle.setAttribute('aria-expanded', 'true');
        menu.style.display = 'block';
    });

    options.forEach((btn) => {
        btn.addEventListener('click', () => {
            const value = btn.dataset.value || 'all';
            nativeSelect.value = value;
            syncUi(value);
            closeMenu();
            nativeSelect.dispatchEvent(new Event('change'));
        });
    });

    nativeSelect.addEventListener('change', () => syncUi(nativeSelect.value || 'all'));

    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeMenu();
        }
    });

    syncUi(nativeSelect.value || 'all');
}

initCustomFilterDropdown({
    dropdownId: 'market-dropdown',
    selectId: 'market-filter',
    labelId: 'market-dropdown-label'
});

initCustomFilterDropdown({
    dropdownId: 'sector-dropdown',
    selectId: 'sector-filter',
    labelId: 'sector-dropdown-label'
});

// Event listeners
document.getElementById('stock-search').addEventListener('input', filterStocks);
document.getElementById('sector-filter').addEventListener('change', filterStocks);
document.getElementById('market-filter').addEventListener('change', filterStocks);

// Initial render
renderStocks(allStocks);
