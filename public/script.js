// Portfolio data

let stocks = [];
let funds = [];
let allocationChart;
const TIINGO_API_KEY = 'e23ab68945f617d484b43d9a6d2c57be3182f43b';
const TIINGO_BASE_URL = 'https://api.tiingo.com/tiingo';

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    fetchPortfolioData();
    
    // Set up event listeners
    document.getElementById('save-stock-btn').addEventListener('click', addStock);
    document.getElementById('save-fund-btn').addEventListener('click', addFund);
    document.getElementById('update-stock-btn').addEventListener('click', updateStock);
    document.getElementById('delete-stock-btn').addEventListener('click', deleteStock);
    document.getElementById('update-fund-btn').addEventListener('click', updateFund);
    document.getElementById('delete-fund-btn').addEventListener('click', deleteFund);
});

// Fetch portfolio data from backend
async function fetchPortfolioData() {
    try {
        const response = await fetch('/api/portfolio');
        if (!response.ok) throw new Error('Failed to fetch portfolio data');
        const data = await response.json();
        stocks = data.stocks || [];
        funds = data.funds || [];
        updateUI();
    } catch (error) {
        console.error('Error fetching portfolio data:', error);
        alert('Error loading portfolio data. Please try again later.');
    }
}

// Update the UI with current data
function updateUI() {
    updateStocksTable();
    updateFundsTable();
    updateSummaryCards();
    updateAllocationChart();
}

// Update stocks table
function updateStocksTable() {
    const tableBody = document.getElementById('stocks-table-body');
    tableBody.innerHTML = '';
    
    stocks.forEach(stock => {
        const value = stock.shares * stock.current_price;
        const cost = stock.shares * stock.avg_price;
        const gainLoss = value - cost;
        const gainLossPercent = ((gainLoss / cost) * 100).toFixed(2);
        
        const row = document.createElement('tr');
        row.innerHTML = `
    <td>
      <a href="http://localhost:3050?symbol=${encodeURIComponent(stock.symbol)}" target="_blank">
        ${stock.symbol}
      </a>
    </td>
    <td>${stock.name}</td>
    <td>${stock.shares}</td>
    <td>$${stock.avg_price}</td>
    <td>$${stock.current_price}</td>
    <td>$${value.toFixed(2)}</td>
    <td class="${gainLoss >= 0 ? 'profit' : 'loss'}">
        $${gainLoss.toFixed(2)} (${gainLossPercent}%)
    </td>
    <td>
        <button class="btn btn-sm btn-outline-primary edit-stock" data-id="${stock.id}">Edit</button>
    </td>
`;

        tableBody.appendChild(row);
    });
    
    // Add event listeners to edit buttons
    document.querySelectorAll('.edit-stock').forEach(button => {
        button.addEventListener('click', function() {
            const stockId = parseInt(this.getAttribute('data-id'));
            editStock(stockId);
        });
    });
}

// Update funds table
function updateFundsTable() {
    const tableBody = document.getElementById('funds-table-body');
    tableBody.innerHTML = '';
    
    funds.forEach(fund => {
        const value = fund.units * fund.currentNav;
        const cost = fund.units * fund.avgNav;
        const gainLoss = value - cost;
        const gainLossPercent = ((gainLoss / cost) * 100).toFixed(2);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${fund.name}</td>
            <td>${fund.units.toFixed(2)}</td>
            <td>$${fund.avgNav.toFixed(2)}</td>
            <td>$${fund.currentNav.toFixed(2)}</td>
            <td>$${value.toFixed(2)}</td>
            <td class="${gainLoss >= 0 ? 'profit' : 'loss'}">
                $${gainLoss.toFixed(2)} (${gainLossPercent}%)
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary edit-fund" data-id="${fund.id}">Edit</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Add event listeners to edit buttons
    document.querySelectorAll('.edit-fund').forEach(button => {
        button.addEventListener('click', function() {
            const fundId = parseInt(this.getAttribute('data-id'));
            editFund(fundId);
        });
    });
}

// Update summary cards
function updateSummaryCards() {
    const stocksValue = stocks.reduce((sum, stock) => sum + (stock.shares * stock.current_price), 0);
    const fundsValue = funds.reduce((sum, fund) => sum + (fund.units * fund.currentNav), 0);
    const totalValue = stocksValue + fundsValue;
    
    document.getElementById('total-value').textContent = `$${totalValue.toFixed(2)}`;
    document.getElementById('stocks-value').textContent = `$${stocksValue.toFixed(2)}`;
    document.getElementById('funds-value').textContent = `$${fundsValue.toFixed(2)}`;
}

// Update allocation chart
function updateAllocationChart() {
    const ctx = document.getElementById('allocation-chart').getContext('2d');
    const stocksValue = stocks.reduce((sum, stock) => sum + (stock.shares * stock.current_price), 0);
    const fundsValue = funds.reduce((sum, fund) => sum + (fund.units * fund.currentNav), 0);
    
    if (allocationChart) {
        allocationChart.destroy();
    }
    
    allocationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Stocks', 'Mutual Funds'],
            datasets: [{
                data: [stocksValue, fundsValue],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 99, 132, 0.7)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Add a new stock

document.getElementById('search-stock-btn').addEventListener('click', async () => {
    const userInput = document.getElementById('stock-search').value.trim().toUpperCase();

    if (!userInput) {
        alert("Please enter a stock symbol");
        return;
    }

    try {
        // Step 1: Search Tiingo
        const searchRes = await fetch(`/api/search-stocks?query=${encodeURIComponent(userInput)}`);
        const searchData = await searchRes.json();

        const resultsDiv = document.getElementById('stock-results');
        const list = resultsDiv.querySelector('.stock-results-list');
        list.innerHTML = ''; // clear previous results

        if (!Array.isArray(searchData) || searchData.length === 0) {
            resultsDiv.style.display = 'none';
            alert("No matching stocks found.");
            return;
        }

        // Step 2: Display results
        resultsDiv.style.display = 'block';

        for (const match of searchData) {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item list-group-item-action';
            listItem.textContent = `${match.ticker} - ${match.name}`;

            // When a result is clicked, populate symbol/name/current price
            listItem.addEventListener('click', async () => {
                // Fill the search field with selected symbol
                document.getElementById('stock-search').value = match.ticker;
                document.getElementById('stock-results').style.display = 'none';

                // Optional: Fill other fields (symbol, name, price) if available
                const priceRes = await fetch(`/api/stock-price/${match.ticker}`);
                const priceData = await priceRes.json();
                console.log(priceData.tngoLast);

                // Assuming these fields exist elsewhere in the form
                document.getElementById('stock-symbol').value = match.ticker;
                document.getElementById('stock-name').value = match.name;
                document.getElementById('stock-current-price').value =
                    priceData.tngoLast;
            });

            list.appendChild(listItem);
        }

    } catch (err) {
        console.error("Search failed:", err);
        alert("Something went wrong while searching stock.");
    }
});







async function addStock() {
    const symbol = document.getElementById('stock-symbol').value.trim().toUpperCase();
    const name = document.getElementById('stock-name').value.trim().toUpperCase();
    const shares= parseFloat(document.getElementById('stock-shares').value);
    const avg_price = parseFloat(document.getElementById('stock-avg-price').value);
    const current_price = parseFloat(document.getElementById('stock-current-price').value);
    
    if (!symbol || !name || isNaN(shares) || isNaN(avg_price) || isNaN(current_price)) {
        alert('Please fill all fields with valid values');
        return;
    }
    
    try {
        const response = await fetch('/api/stocks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ symbol,name, shares, avg_price, current_price })
        });
        
        if (!response.ok) throw new Error('Failed to add stock');
        
        const newStock = await response.json();
        stocks.push(newStock);
        updateUI();
        
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('addStockModal'));
        modal.hide();
        document.getElementById('add-stock-form').reset();
    } catch (error) {
        console.error('Error adding stock:', error);
        alert('Failed to add stock: ' + error.message);
    }
}

// Add a new fund
async function addFund() {
    const name = document.getElementById('fund-name').value.trim();
    const units = parseFloat(document.getElementById('fund-units').value);
    const avgNav = parseFloat(document.getElementById('fund-avg-nav').value);
    const currentNav = parseFloat(document.getElementById('fund-current-nav').value);
    
    if (!name || isNaN(units) || isNaN(avgNav) || isNaN(currentNav)) {
        alert('Please fill all fields with valid values');
        return;
    }
    
    try {
        const response = await fetch('/api/funds', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, units, avgNav, currentNav })
        });
        
        if (!response.ok) throw new Error('Failed to add fund');
        
        const newFund = await response.json();
        funds.push(newFund);
        updateUI();
        
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('addFundModal'));
        modal.hide();
        document.getElementById('add-fund-form').reset();
    } catch (error) {
        console.error('Error adding fund:', error);
        alert('Failed to add fund: ' + error.message);
    }
}

// Edit stock
function editStock(stockId) {
    const stock = stocks.find(s => s.id === stockId);
    if (!stock) return;
    
    document.getElementById('edit-stock-id').value = stock.id;
    document.getElementById('edit-stock-symbol').value = stock.symbol;
    document.getElementById('edit-stock-shares').value = stock.shares;
    document.getElementById('edit-stock-avg-price').value = stock.avg_price;
    document.getElementById('edit-stock-current-price').value = stock.current_price;
    
    const modal = new bootstrap.Modal(document.getElementById('editStockModal'));
    modal.show();
}

// Update stock
async function updateStock() {
    const id = parseInt(document.getElementById('edit-stock-id').value);
    const symbol = document.getElementById('edit-stock-symbol').value.trim().toUpperCase();
    const shares = parseFloat(document.getElementById('edit-stock-shares').value);
    const avg_price = parseFloat(document.getElementById('edit-stock-avg-price').value);
    const current_price = parseFloat(document.getElementById('edit-stock-current-price').value);
    
    if (!symbol || isNaN(shares) || isNaN(avg_price) || isNaN(current_price)) {
        alert('Please fill all fields with valid values');
        return;
    }
    
    try {
        const response = await fetch(`/api/stocks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ symbol, shares, avg_price, current_price })
        });
        
        if (!response.ok) throw new Error('Failed to update stock');
        
        const updatedStock = await response.json();
        const index = stocks.findIndex(s => s.id === id);
        if (index !== -1) {
            stocks[index] = updatedStock;
            updateUI();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editStockModal'));
            modal.hide();
        }
    } catch (error) {
        console.error('Error updating stock:', error);
        alert('Failed to update stock: ' + error.message);
    }
}

// Delete stock
async function deleteStock() {
    const id = parseInt(document.getElementById('edit-stock-id').value);
    
    if (!confirm('Are you sure you want to delete this stock?')) return;
    
    try {
        const response = await fetch(`/api/stocks/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete stock');
        
        stocks = stocks.filter(s => s.id !== id);
        updateUI();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editStockModal'));
        modal.hide();
    } catch (error) {
        console.error('Error deleting stock:', error);
        alert('Failed to delete stock: ' + error.message);
    }
}

// Edit fund
function editFund(fundId) {
    const fund = funds.find(f => f.id === fundId);
    if (!fund) return;
    
    document.getElementById('edit-fund-id').value = fund.id;
    document.getElementById('edit-fund-name').value = fund.name;
    document.getElementById('edit-fund-units').value = fund.units;
    document.getElementById('edit-fund-avg-nav').value = fund.avgNav;
    document.getElementById('edit-fund-current-nav').value = fund.currentNav;
    
    const modal = new bootstrap.Modal(document.getElementById('editFundModal'));
    modal.show();
}

// Update fund
async function updateFund() {
    const id = parseInt(document.getElementById('edit-fund-id').value);
    const name = document.getElementById('edit-fund-name').value.trim();
    const units = parseFloat(document.getElementById('edit-fund-units').value);
    const avgNav = parseFloat(document.getElementById('edit-fund-avg-nav').value);
    const currentNav = parseFloat(document.getElementById('edit-fund-current-nav').value);
    
    if (!name || isNaN(units) || isNaN(avgNav) || isNaN(currentNav)) {
        alert('Please fill all fields with valid values');
        return;
    }
    
    try {
        const response = await fetch(`/api/funds/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, units, avgNav, currentNav })
        });
        
        if (!response.ok) throw new Error('Failed to update fund');
        
        const updatedFund = await response.json();
        const index = funds.findIndex(f => f.id === id);
        if (index !== -1) {
            funds[index] = updatedFund;
            updateUI();
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editFundModal'));
            modal.hide();
        }
    } catch (error) {
        console.error('Error updating fund:', error);
        alert('Failed to update fund: ' + error.message);
    }
}

// Delete fund
async function deleteFund() {
    const id = parseInt(document.getElementById('edit-fund-id').value);
    
    if (!confirm('Are you sure you want to delete this fund?')) return;
    
    try {
        const response = await fetch(`/api/funds/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete fund');
        
        funds = funds.filter(f => f.id !== id);
        updateUI();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('editFundModal'));
        modal.hide();
    } catch (error) {
        console.error('Error deleting fund:', error);
        alert('Failed to delete fund: ' + error.message);
    }
}





// Mutual Fund Search Functionality
document.getElementById('search-fund-btn').addEventListener('click', async function() {
    const query = document.getElementById('fund-search').value.trim();
    if (!query) {
        alert('Please enter a fund name or symbol');
        return;
    }

    try {
        const response = await fetch(`/api/search-stocks?query=${encodeURIComponent(query)}`);
     
        const results = await response.json();
        console.log(results);
        const resultsContainer = document.getElementById('fund-results');
        const resultsList = resultsContainer.querySelector('.fund-results-list');
        resultsList.innerHTML = '';
        
        if (results.length === 0) {
            resultsContainer.style.display = 'none';
            alert('No funds found matching your search');
            return;
        }
        
        results.forEach(fund => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action';
            li.textContent = `${fund.ticker} - ${fund.name}`;
            li.addEventListener('click', function() {
                document.getElementById('fund-symbol').value = fund.ticker;
                document.getElementById('fund-name').value = fund.name;
                resultsContainer.style.display = 'none';
                
                // Auto-fetch current NAV
                fetchCurrentNav(fund.ticker);
            });
            resultsList.appendChild(li);
        });
        
        resultsContainer.style.display = 'block';
    } catch (error) {
        console.error('Fund search failed:', error);
        alert('Failed to search funds. Please try again.');
    }
});

// Fetch current NAV price
async function fetchCurrentNav(ticker) {
    try {
        const response = await fetch(`/api/fund-nav/${ticker}`);
        const data = await response.json();
        document.getElementById('fund-current-nav').value = data.nav.toFixed(2);
    } catch (error) {
        console.error('Failed to fetch NAV:', error);
        alert('Could not load current NAV price');
    }
}

// NAV Refresh button
document.getElementById('refresh-nav-btn').addEventListener('click', function() {
    const ticker = document.getElementById('fund-symbol').value;
    if (!ticker) {
        alert('Please search and select a fund first');
        return;
    }
    fetchCurrentNav(ticker);
});

// Update top performers tables
function updateTopPerformers() {
    if (stocks.length === 0) return;
    
    // Calculate performance for each stock
    const stocksWithPerformance = stocks.map(stock => {
        const cost = stock.shares * stock.avg_price;
        const value = stock.shares * stock.current_price;
        const gainLoss = value - cost;
        const gainLossPercent = ((gainLoss / cost) * 100).toFixed(2);
        
        return {
            ...stock,
            gainLossPercent: parseFloat(gainLossPercent),
            absoluteValue: Math.abs(gainLossPercent)
        };
    });

    // Sort by performance
    const topGainers = [...stocksWithPerformance]
        .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
        .slice(0, 5);
        
    const topLosers = [...stocksWithPerformance]
        .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
        .slice(0, 5);

    // Update top gainers table
    const gainersBody = document.getElementById('top-gainers');
    gainersBody.innerHTML = '';
    topGainers.forEach(stock => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${stock.symbol}</td>
            <td class="profit">+${stock.gainLossPercent.toFixed(2)}%</td>
        `;
        gainersBody.appendChild(row);
    });

    // Update top losers table
    const losersBody = document.getElementById('top-losers');
    losersBody.innerHTML = '';
    topLosers.forEach(stock => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${stock.symbol}</td>
            <td class="loss">${stock.gainLossPercent.toFixed(2)}%</td>
        `;
        losersBody.appendChild(row);
    });
}
// Update the updateSummaryCards function
function updateSummaryCards() {
    // Calculate stocks metrics
    const stocksInvested = stocks.reduce((sum, stock) => sum + (stock.shares * stock.avg_price), 0);
    const stocksValue = stocks.reduce((sum, stock) => sum + (stock.shares * stock.current_price), 0);
    const stocksPL = stocksValue - stocksInvested;
    const stocksPLPercent = (stocksInvested > 0) ? (stocksPL / stocksInvested * 100) : 0;

    // Calculate funds metrics
    const fundsInvested = funds.reduce((sum, fund) => sum + (fund.units * fund.avgNav), 0);
    const fundsValue = funds.reduce((sum, fund) => sum + (fund.units * fund.currentNav), 0);
    const fundsPL = fundsValue - fundsInvested;
    const fundsPLPercent = (fundsInvested > 0) ? (fundsPL / fundsInvested * 100) : 0;

    // Calculate totals
    const totalValue = stocksValue + fundsValue;
    const totalInvested = stocksInvested + fundsInvested;
    const totalPL = totalValue - totalInvested;
    const totalPLPercent = (totalInvested > 0) ? (totalPL / totalInvested * 100) : 0;

    // Update summary cards
    document.getElementById('total-value').textContent = `$${totalValue.toFixed(2)}`;
    document.getElementById('stocks-value').textContent = `$${stocksValue.toFixed(2)}`;
    document.getElementById('funds-value').textContent = `$${fundsValue.toFixed(2)}`;
    
    // Update total profit/loss with color
    const totalPLSpan = document.getElementById('total-profit-loss');
    totalPLSpan.textContent = `$${totalPL.toFixed(2)} (${totalPLPercent.toFixed(2)}%)`;
    totalPLSpan.className = totalPL >= 0 ? 'profit' : 'loss';

    // Update stocks summary
    document.getElementById('stocks-total-invested').textContent = `$${stocksInvested.toFixed(2)}`;
    document.getElementById('stocks-current-value').textContent = `$${stocksValue.toFixed(2)}`;
    
    const stocksPLSpan = document.getElementById('stocks-net-pl');
    stocksPLSpan.textContent = `$${stocksPL.toFixed(2)} (${stocksPLPercent.toFixed(2)}%)`;
    stocksPLSpan.className = stocksPL >= 0 ? 'profit' : 'loss';

    // Update funds summary
    document.getElementById('funds-total-invested').textContent = `$${fundsInvested.toFixed(2)}`;
    document.getElementById('funds-current-value').textContent = `$${fundsValue.toFixed(2)}`;
    
    const fundsPLSpan = document.getElementById('funds-net-pl');
    fundsPLSpan.textContent = `$${fundsPL.toFixed(2)} (${fundsPLPercent.toFixed(2)}%)`;
    fundsPLSpan.className = fundsPL >= 0 ? 'profit' : 'loss';
}

// Update the main UI function
function updateUI() {
    updateStocksTable();
    updateFundsTable();
    updateSummaryCards();
    updateTopPerformers();  // Add this line
    updateAllocationChart();
}