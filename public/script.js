// Portfolio data
let stocks = [];
let funds = [];
let allocationChart;
let sectorChart;

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
    
    // Search listeners
    document.getElementById('search-stock-btn').addEventListener('click', searchStocks);
    document.getElementById('search-fund-btn').addEventListener('click', searchFunds);
    
    // Refresh price listeners
    document.getElementById('refresh-price-btn').addEventListener('click', refreshStockPrice);
    document.getElementById('refresh-fund-nav-btn').addEventListener('click', refreshFundNAV);
    document.getElementById('edit-refresh-price-btn').addEventListener('click', refreshEditStockPrice);
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
    updateTopPerformers();
    updateAllocationChart();
    updateFundPerformance();
    updateSectorAllocation();
}

// Update stocks table
function updateStocksTable() {
    const tableBody = document.getElementById('stocks-table-body');
    tableBody.innerHTML = '';
    
    stocks.forEach(stock => {
        const shares = parseFloat(stock.shares) || 0;
        const avgPrice = parseFloat(stock.avg_price) || 0;
        const currentPrice = parseFloat(stock.current_price) || 0;
        
        const value = shares * currentPrice;
        const cost = shares * avgPrice;
        const gainLoss = value - cost;
        const gainLossPercent = (cost > 0) ? ((gainLoss / cost) * 100).toFixed(2) : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <!-- Updated link with stock name parameter -->
                <a href="http://localhost:3050/?symbol=${stock.symbol}&name=${encodeURIComponent(stock.name)}" target="_blank">
                    ${stock.symbol}
                </a>
            </td>
            <td>${stock.name}</td>
            <td>${stock.sector || 'N/A'}</td>
            <td>${shares}</td>
            <td>$${avgPrice.toFixed(2)}</td>
            <td>$${currentPrice.toFixed(2)}</td>
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
// Update funds table - FIXED UNDEFINED VALUES
function updateFundsTable() {
    const tableBody = document.getElementById('funds-table-body');
    tableBody.innerHTML = '';
    
    funds.forEach(fund => {
        // Ensure values are numbers
        const units = parseFloat(fund.units) || 0;
        const avgNav = parseFloat(fund.avg_nav) || 0;
        const currentNav = parseFloat(fund.current_nav) || 0;
        
        const value = units * currentNav;
        const cost = units * avgNav;
        const gainLoss = value - cost;
        const gainLossPercent = (cost > 0) ? ((gainLoss / cost) * 100).toFixed(2) : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${fund.name}</td>
            <td>${fund.fund_category || 'N/A'}</td>
            <td>${units.toFixed(2)}</td>
            <td>$${avgNav.toFixed(2)}</td>
            <td>$${currentNav.toFixed(2)}</td>
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
    // Calculate stocks metrics
    const stocksInvested = stocks.reduce((sum, stock) => {
        const shares = parseFloat(stock.shares) || 0;
        const avgPrice = parseFloat(stock.avg_price) || 0;
        return sum + (shares * avgPrice);
    }, 0);
    
    const stocksValue = stocks.reduce((sum, stock) => {
        const shares = parseFloat(stock.shares) || 0;
        const currentPrice = parseFloat(stock.current_price) || 0;
        return sum + (shares * currentPrice);
    }, 0);
    
    const stocksPL = stocksValue - stocksInvested;
    const stocksPLPercent = (stocksInvested > 0) ? (stocksPL / stocksInvested * 100) : 0;

    // Calculate funds metrics
    const fundsInvested = funds.reduce((sum, fund) => {
        const units = parseFloat(fund.units) || 0;
        const avgNav = parseFloat(fund.avg_nav) || 0;
        return sum + (units * avgNav);
    }, 0);
    
    const fundsValue = funds.reduce((sum, fund) => {
        const units = parseFloat(fund.units) || 0;
        const currentNav = parseFloat(fund.current_nav) || 0;
        return sum + (units * currentNav);
    }, 0);
    
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

// Update allocation chart
function updateAllocationChart() {
    const ctx = document.getElementById('allocation-chart').getContext('2d');
    
    // Calculate values
    const stocksValue = stocks.reduce((sum, stock) => {
        const shares = parseFloat(stock.shares) || 0;
        const currentPrice = parseFloat(stock.current_price) || 0;
        return sum + (shares * currentPrice);
    }, 0);
    
    const fundsValue = funds.reduce((sum, fund) => {
        const units = parseFloat(fund.units) || 0;
        const currentNav = parseFloat(fund.current_nav) || 0;
        return sum + (units * currentNav);
    }, 0);
    
    if (allocationChart) {
        allocationChart.destroy();
    }
    
    // Only create chart if we have data
    if (stocksValue + fundsValue > 0) {
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
                maintainAspectRatio: false,
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
}

// Update top performers tables
function updateTopPerformers() {
    if (stocks.length === 0) return;
    
    // Calculate performance for each stock
    const stocksWithPerformance = stocks.map(stock => {
        const shares = parseFloat(stock.shares) || 0;
        const avgPrice = parseFloat(stock.avg_price) || 0;
        const currentPrice = parseFloat(stock.current_price) || 0;
        
        const cost = shares * avgPrice;
        const value = shares * currentPrice;
        const gainLoss = value - cost;
        const gainLossPercent = (cost > 0) ? ((gainLoss / cost) * 100) : 0;
        
        return {
            ...stock,
            gainLossPercent: gainLossPercent,
            absoluteValue: Math.abs(gainLossPercent)
        };
    });

    // Sort by performance
    const topGainers = [...stocksWithPerformance]
        .filter(s => !isNaN(s.gainLossPercent))
        .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
        .slice(0, 5);
        
    const topLosers = [...stocksWithPerformance]
        .filter(s => !isNaN(s.gainLossPercent))
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

// Update fund performance - FIXED TOP PERFORMERS DISPLAY
async function updateFundPerformance() {
    try {
        const response = await fetch('/api/funds/performance');
        const { topPerformers, bottomPerformers } = await response.json();
        
        // Update top performers table
        const topBody = document.getElementById('top-fund-gainers');
        topBody.innerHTML = topPerformers.map(fund => {
            const performance = parseFloat(fund.performance) || 0;
            return `
                <tr>
                    <td>${fund.name}</td>
                    <td class="${performance >= 0 ? 'profit' : 'loss'}">
                        ${performance >= 0 ? '+' : ''}${performance.toFixed(2)}%
                    </td>
                </tr>
            `;
        }).join('');
        
        // Update bottom performers table
        const bottomBody = document.getElementById('bottom-fund-losers');
        bottomBody.innerHTML = bottomPerformers.map(fund => {
            const performance = parseFloat(fund.performance) || 0;
            return `
                <tr>
                    <td>${fund.name}</td>
                    <td class="${performance >= 0 ? 'profit' : 'loss'}">
                        ${performance.toFixed(2)}%
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error fetching fund performance:', error);
    }
}

// Update sector allocation
async function updateSectorAllocation() {
    try {
        const response = await fetch('/api/stocks/sectors');
        const sectors = await response.json();
        
        const ctx = document.getElementById('sector-chart').getContext('2d');
        
        if (sectorChart) {
            sectorChart.destroy();
        }
        
        // Only create chart if we have data
        if (sectors.length > 0) {
            sectorChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: sectors.map(s => s.sector),
                    datasets: [{
                        data: sectors.map(s => parseFloat(s.total_value) || 0),
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                            '#9966FF', '#FF9F40', '#8AC24A', '#607D8B',
                            '#E91E63', '#9C27B0'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
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
    } catch (error) {
        console.error('Error fetching sector data:', error);
    }
}

// Stock search
async function searchStocks() {
    const userInput = document.getElementById('stock-search').value.trim().toUpperCase();

    if (!userInput) {
        alert("Please enter a stock symbol");
        return;
    }

    try {
        const searchRes = await fetch(`/api/search?query=${encodeURIComponent(userInput)}&type=stock`);
        const searchData = await searchRes.json();

        const resultsDiv = document.getElementById('stock-results');
        const list = resultsDiv.querySelector('.stock-results-list');
        list.innerHTML = '';

        if (!Array.isArray(searchData) || searchData.length === 0) {
            resultsDiv.style.display = 'none';
            alert("No matching stocks found.");
            return;
        }

        resultsDiv.style.display = 'block';

        for (const match of searchData) {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item list-group-item-action';
            listItem.textContent = `${match.symbol} - ${match.name}`;

            listItem.addEventListener('click', async () => {
                document.getElementById('stock-search').value = match.symbol;
                resultsDiv.style.display = 'none';

                const priceRes = await fetch(`/api/quote/${match.symbol}`);
                const priceData = await priceRes.json();
                
                document.getElementById('stock-symbol').value = match.symbol;
                document.getElementById('stock-name').value = match.name;
                document.getElementById('stock-sector').value = priceData.sector || '';
                document.getElementById('stock-current-price').value = priceData.price || '';
            });

            list.appendChild(listItem);
        }

    } catch (err) {
        console.error("Search failed:", err);
        alert("Something went wrong while searching stock.");
    }
}

// Fund search
async function searchFunds() {
    const userInput = document.getElementById('fund-search').value.trim().toUpperCase();

    if (!userInput) {
        alert("Please enter a fund name or symbol");
        return;
    }

    try {
        const searchRes = await fetch(`/api/search?query=${encodeURIComponent(userInput)}&type=fund`);
        const searchData = await searchRes.json();

        const resultsDiv = document.getElementById('fund-results');
        const list = resultsDiv.querySelector('.fund-results-list');
        list.innerHTML = '';

        if (!Array.isArray(searchData) || searchData.length === 0) {
            resultsDiv.style.display = 'none';
            alert("No matching funds found.");
            return;
        }

        resultsDiv.style.display = 'block';

        for (const match of searchData) {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item list-group-item-action';
            listItem.textContent = `${match.symbol} - ${match.name}`;

            listItem.addEventListener('click', async () => {
                document.getElementById('fund-search').value = match.symbol;
                resultsDiv.style.display = 'none';

                const navRes = await fetch(`/api/quote/${match.symbol}`);
                const navData = await navRes.json();
                
                document.getElementById('fund-symbol').value = match.symbol;
                document.getElementById('fund-name').value = match.name;
                document.getElementById('fund-category').value = navData.fund_category || '';
                document.getElementById('fund-current-nav').value = navData.nav || '';
            });

            list.appendChild(listItem);
        }

    } catch (err) {
        console.error("Search failed:", err);
        alert("Something went wrong while searching fund.");
    }
}

// Refresh stock price
async function refreshStockPrice() {
    const symbol = document.getElementById('stock-symbol').value;
    if (!symbol) {
        alert("Please select a stock first");
        return;
    }

    try {
        const response = await fetch(`/api/quote/${symbol}`);
        const data = await response.json();
        document.getElementById('stock-current-price').value = data.price;
    } catch (error) {
        console.error("Refresh failed:", error);
        alert("Failed to refresh price");
    }
}

// Refresh fund NAV
async function refreshFundNAV() {
    const symbol = document.getElementById('fund-symbol').value;
    if (!symbol) {
        alert("Please select a fund first");
        return;
    }

    try {
        const response = await fetch(`/api/quote/${symbol}`);
        const data = await response.json();
        document.getElementById('fund-current-nav').value = data.nav;
    } catch (error) {
        console.error("Refresh failed:", error);
        alert("Failed to refresh NAV");
    }
}

// Refresh edit stock price
async function refreshEditStockPrice() {
    const symbol = document.getElementById('edit-stock-symbol').value;
    if (!symbol) {
        alert("No stock selected");
        return;
    }

    try {
        const response = await fetch(`/api/quote/${symbol}`);
        const data = await response.json();
        document.getElementById('edit-stock-current-price').value = data.price;
    } catch (error) {
        console.error("Refresh failed:", error);
        alert("Failed to refresh price");
    }
}

// Add a new stock
async function addStock() {
    const symbol = document.getElementById('stock-symbol').value.trim().toUpperCase();
    const name = document.getElementById('stock-name').value.trim();
    const sector = document.getElementById('stock-sector').value.trim();
    const shares = parseFloat(document.getElementById('stock-shares').value) || 0;
    const avg_price = parseFloat(document.getElementById('stock-avg-price').value) || 0;
    const current_price = parseFloat(document.getElementById('stock-current-price').value) || 0;
    
    if (!symbol || !name || shares <= 0 || avg_price <= 0 || current_price <= 0) {
        alert('Please fill all required fields with valid values');
        return;
    }
    
    try {
        const response = await fetch('/api/stocks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                symbol, 
                name, 
                shares, 
                avg_price, 
                current_price,
                sector 
            })
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

// Add a new fund - FIXED DATA HANDLING
async function addFund() {
    const symbol = document.getElementById('fund-symbol').value.trim();
    const name = document.getElementById('fund-name').value.trim();
    const fund_category = document.getElementById('fund-category').value.trim();
    const units = parseFloat(document.getElementById('fund-units').value) || 0;
    const avg_nav = parseFloat(document.getElementById('fund-avg-nav').value) || 0;
    const current_nav = parseFloat(document.getElementById('fund-current-nav').value) || 0;
    
    if (!symbol || !name || units <= 0 || avg_nav <= 0 || current_nav <= 0) {
        alert('Please fill all required fields with valid values');
        return;
    }
    
    try {
        const response = await fetch('/api/funds', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                name, 
                units, 
                avg_nav, 
                current_nav,
                fund_category 
            })
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
    document.getElementById('edit-stock-name').value = stock.name;
    document.getElementById('edit-stock-sector').value = stock.sector || '';
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
    const name = document.getElementById('edit-stock-name').value.trim();
    const sector = document.getElementById('edit-stock-sector').value.trim();
    const shares = parseFloat(document.getElementById('edit-stock-shares').value) || 0;
    const avg_price = parseFloat(document.getElementById('edit-stock-avg-price').value) || 0;
    const current_price = parseFloat(document.getElementById('edit-stock-current-price').value) || 0;
    
    if (!symbol || !name || shares <= 0 || avg_price <= 0 || current_price <= 0) {
        alert('Please fill all required fields with valid values');
        return;
    }
    
    try {
        const response = await fetch(`/api/stocks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                symbol, 
                name, 
                shares, 
                avg_price, 
                current_price,
                sector 
            })
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
    document.getElementById('edit-fund-category').value = fund.fund_category || '';
    document.getElementById('edit-fund-units').value = fund.units;
    document.getElementById('edit-fund-avg-nav').value = fund.avg_nav;
    document.getElementById('edit-fund-current-nav').value = fund.current_nav;
    
    const modal = new bootstrap.Modal(document.getElementById('editFundModal'));
    modal.show();
}

// Update fund
async function updateFund() {
    const id = parseInt(document.getElementById('edit-fund-id').value);
    const name = document.getElementById('edit-fund-name').value.trim();
    const fund_category = document.getElementById('edit-fund-category').value.trim();
    const units = parseFloat(document.getElementById('edit-fund-units').value) || 0;
    const avg_nav = parseFloat(document.getElementById('edit-fund-avg-nav').value) || 0;
    const current_nav = parseFloat(document.getElementById('edit-fund-current-nav').value) || 0;
    
    if (!name || units <= 0 || avg_nav <= 0 || current_nav <= 0) {
        alert('Please fill all required fields with valid values');
        return;
    }
    
    try {
        const response = await fetch(`/api/funds/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                name, 
                units, 
                avg_nav, 
                current_nav,
                fund_category 
            })
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