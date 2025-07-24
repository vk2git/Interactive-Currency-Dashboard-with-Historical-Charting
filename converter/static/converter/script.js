document.addEventListener('DOMContentLoaded', () => {
    const allCurrencyData = JSON.parse(document.getElementById('all-currency-data').textContent);
    const graphCurrencyData = JSON.parse(document.getElementById('graph-currency-data').textContent);
    const apiUrls = JSON.parse(document.getElementById('api-urls').textContent);
    const graphDataCache = {};
    let historicalChart = null;
    let chartDatasets = [];
    const datasetColors = ['#4f46e5', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

    const amountEl = document.getElementById('amount');
    const fromCurrencyEl = document.getElementById('from_currency');
    const toCurrencyEl = document.getElementById('to_currency');
    const convertButton = document.getElementById('convert-button');
    const resultDisplay = document.getElementById('result-display');
    const resultTextEl = document.getElementById('result-text');
    const rateInfoEl = document.getElementById('rate-info');
    const converterErrorEl = document.getElementById('error-message-converter');
    const historicalCurrencyEl = document.getElementById('historical_currency');
    const addToGraphButton = document.getElementById('add-to-graph-button');
    const clearGraphButton = document.getElementById('clear-graph-button');
    const chartCanvas = document.getElementById('historical-chart');
    const plottedContainer = document.getElementById('plotted-currencies-container');
    const graphErrorEl = document.getElementById('error-message-graph');
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    const globalErrorEl = document.getElementById('global-error-message');

    function showError(element, message) { element.textContent = message; element.classList.remove('hidden'); }
    function hideError(element) { element.textContent = ""; element.classList.add('hidden'); }

    function applyTheme(theme) {
        if (theme === 'light') { document.documentElement.classList.remove('dark-mode'); sunIcon.classList.remove('hidden'); moonIcon.classList.add('hidden'); } else { document.documentElement.classList.add('dark-mode'); sunIcon.classList.add('hidden'); moonIcon.classList.remove('hidden'); }
        if (historicalChart) { drawChart(); }
    }
    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains('dark-mode');
        const newTheme = isDark ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    async function handleConversion() {
        hideError(converterErrorEl);
        const amount = parseFloat(amountEl.value);
        if (isNaN(amount) || amount <= 0) { showError(converterErrorEl, "Please enter a valid amount greater than 0."); return; }
        const from = fromCurrencyEl.value;
        const to = toCurrencyEl.value;
        if (!to) { showError(converterErrorEl, "Please select a 'To' currency."); return; }
        resultDisplay.classList.add('hidden');
        try {
            const response = await fetch(apiUrls.get_rates);
            const data = await response.json();
            if (data.result === 'error') throw new Error(data['error-type']);
            const rates = data.conversion_rates;
            const fromRate = rates[from];
            const toRate = rates[to];
            const convertedAmount = (amount / fromRate) * toRate;
            const singleUnitRate = (1 / fromRate) * toRate;
            resultTextEl.textContent = `${amount.toLocaleString()} ${from} = ${convertedAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${to}`;
            rateInfoEl.textContent = `1 ${from} = ${singleUnitRate.toFixed(6)} ${to}`;
            resultDisplay.classList.remove('hidden');
        } catch (error) { showError(converterErrorEl, error.message); }
    }

    async function addCurrencyToGraph() {
        const selectedCurrency = historicalCurrencyEl.value;
        if (!selectedCurrency) return;
        hideError(graphErrorEl);
        if (chartDatasets.some(d => d.label.startsWith(selectedCurrency))) { showError(graphErrorEl, `${selectedCurrency} is already on the graph.`); return; }
        let data;
        if (graphDataCache[selectedCurrency]) { data = graphDataCache[selectedCurrency]; } else {
            try {
                const url = `${apiUrls.get_historical}?base=${selectedCurrency}`;
                const response = await fetch(url);
                data = await response.json();
                if (!data.success) throw new Error(data.error?.info || data.error || 'API error.');
                graphDataCache[selectedCurrency] = data;
            } catch (error) { showError(graphErrorEl, `Could not fetch data for ${selectedCurrency}: ${error.message}`); return; }
        }
        const labels = Object.keys(data.rates).sort();
        const quoteCurrency = Object.keys(data.rates[labels[0]])[0];
        const chartData = labels.map(date => data.rates[date][quoteCurrency]);
        const color = datasetColors[chartDatasets.length % datasetColors.length];
        chartDatasets.push({ label: `${selectedCurrency} against ${quoteCurrency}`, data: chartData, borderColor: color, borderWidth: 2, pointRadius: 0, tension: 0.4, fill: false, });
        drawChart();
        updatePlottedCurrenciesList();
    }

    function drawChart() {
        const isDark = document.documentElement.classList.contains('dark-mode');
        const gridColor = isDark ? '#334155' : '#e2e8f0';
        const fontColor = isDark ? '#e2e8f0' : '#1e293b';
        if (!historicalChart) { historicalChart = new Chart(chartCanvas, { type: 'line', data: {}, options: { responsive: true, maintainAspectRatio: false, } }); }
        historicalChart.options.plugins = { title: { display: true, text: 'Currency Comparison', color: fontColor }, legend: { display: false } };
        historicalChart.options.scales = { x: { title: { display: true, text: 'Date', color: fontColor }, ticks: { color: fontColor }, grid: { color: gridColor } }, y: { title: { display: true, text: 'Value', color: fontColor }, ticks: { color: fontColor }, grid: { color: gridColor } } };
        if (chartDatasets.length > 0) {
            const firstCurrency = chartDatasets[0].label.split(' ')[0];
            historicalChart.data.labels = Object.keys(graphDataCache[firstCurrency].rates).sort();
            historicalChart.options.plugins.title.text = `Value against ${chartDatasets[0].label.split(' ')[2]}`;
        } else { historicalChart.options.plugins.title.text = 'Currency Comparison'; }
        historicalChart.data.datasets = chartDatasets;
        historicalChart.update();
    }

    function updatePlottedCurrenciesList() {
        plottedContainer.innerHTML = '';
        chartDatasets.forEach((dataset, index) => {
            const item = document.createElement('div');
            item.className = 'plotted-item';
            item.style.borderLeft = `4px solid ${dataset.borderColor}`;
            item.innerHTML = `<span>${dataset.label}</span><button class="remove-btn" data-index="${index}">×</button>`;
            item.addEventListener('mouseenter', () => highlightLine(index, true));
            item.addEventListener('mouseleave', () => highlightLine(index, false));
            item.querySelector('.remove-btn').addEventListener('click', removeCurrencyFromGraph);
            plottedContainer.appendChild(item);
        });
    }

    function highlightLine(index, isHovering) {
        if (!historicalChart) return;
        const dataset = historicalChart.data.datasets[index];
        if (dataset) { dataset.borderWidth = isHovering ? 4 : 2; historicalChart.update('none'); }
    }

    function removeCurrencyFromGraph(event) {
        event.stopPropagation();
        const indexToRemove = parseInt(event.target.dataset.index, 10);
        chartDatasets.splice(indexToRemove, 1);
        drawChart();
        updatePlottedCurrenciesList();
    }

    function clearChart() {
        chartDatasets = [];
        if (historicalChart) { historicalChart.data.labels = []; historicalChart.data.datasets = []; historicalChart.update(); }
        updatePlottedCurrenciesList();
        hideError(graphErrorEl);
    }

    function init() {
        const validHashes = ["", "#converter-section", "#graph-section"];
        if (!validHashes.includes(window.location.hash)) {
            showError(globalErrorEl, "The page you're looking for doesn't exist. You have been redirected to the homepage.");
            window.location.hash = "";
        }

        amountEl.focus();

        amountEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                handleConversion();
            }
        });

        [fromCurrencyEl, toCurrencyEl].forEach(dropdown => {
            allCurrencyData.forEach(currency => {
                const option = document.createElement('option');
                option.value = currency;
                option.textContent = currency;
                dropdown.appendChild(option);
            });
        });
        graphCurrencyData.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency;
            option.textContent = currency;
            historicalCurrencyEl.appendChild(option);
        });
        fromCurrencyEl.value = 'USD';
        toCurrencyEl.value = 'EUR';
        historicalCurrencyEl.value = 'EUR';
        convertButton.addEventListener('click', handleConversion);
        addToGraphButton.addEventListener('click', addCurrencyToGraph);
        clearGraphButton.addEventListener('click', clearChart);
        
        const savedTheme = localStorage.getItem('theme') || 'dark';
        applyTheme(savedTheme);
    }

    init();
});
