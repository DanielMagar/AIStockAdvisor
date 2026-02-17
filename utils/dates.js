function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function getLatestTradingDate() {
    const now = new Date();
    // 1. Force conversion to US Eastern Time (New York)
    const estDate = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    // 2. Since Polygon Free Tier is delayed by 24h, we always start with "Yesterday" in ET
    estDate.setDate(estDate.getDate() - 1);

    // 3. Roll back if it's a weekend
    let day = estDate.getDay(); 
    if (day === 0) estDate.setDate(estDate.getDate() - 2); // Sunday -> Friday
    else if (day === 6) estDate.setDate(estDate.getDate() - 1); // Saturday -> Friday

    return estDate;
}

// Helper to get a date relative to the trading end date
function getTradingDaysAgo(endDateObj, daysBack) {
    const startDate = new Date(endDateObj);
    startDate.setDate(startDate.getDate() - daysBack);
    return formatDate(startDate);
}

const latestTradingDateObj = getLatestTradingDate();

export const dates = {
    // End Date: The most recent closed trading day (accounting for 24h delay)
    endDate: formatDate(latestTradingDateObj), 
    
    // Start Date: 3 days before that end date to ensure we get a decent data range
    startDate: getTradingDaysAgo(latestTradingDateObj, 3) 
};