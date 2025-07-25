// Expense Tracker Application
class ExpenseTracker {
    constructor() {
        this.expenses = this.loadExpenses();
        this.editingId = null;
        this.currentView = 'table';
        this.chart = null;
        
        this.initializeApp();
        this.setupEventListeners();
        this.setCurrentDate();
        this.updateDisplay();
        
        // Initialize Feather Icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    // Initialize theme and app state
    initializeApp() {
        // Set initial theme
        const savedTheme = localStorage.getItem('expense-tracker-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    // Set up all event listeners
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Form submission
        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            this.handleFormSubmit(e);
        });

        // Cancel edit
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.cancelEdit();
        });

        // Search and filters
        document.getElementById('searchInput').addEventListener('input', () => {
            this.filterExpenses();
        });

        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.filterExpenses();
        });

        document.getElementById('dateFrom').addEventListener('change', () => {
            this.filterExpenses();
        });

        document.getElementById('dateTo').addEventListener('change', () => {
            this.filterExpenses();
        });

        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearFilters();
        });

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.closest('.view-btn').dataset.view);
            });
        });

        // Delete modal
        document.getElementById('deleteModalClose').addEventListener('click', () => {
            this.hideDeleteModal();
        });

        document.getElementById('deleteCancel').addEventListener('click', () => {
            this.hideDeleteModal();
        });

        document.getElementById('deleteConfirm').addEventListener('click', () => {
            this.confirmDelete();
        });

        // Close modal on overlay click
        document.getElementById('deleteModal').addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') {
                this.hideDeleteModal();
            }
        });

        // Form validation
        this.setupFormValidation();

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportCSV();
        });
    }

    // Set up real-time form validation
    setupFormValidation() {
        const fields = ['description', 'amount', 'category', 'date'];
        
        fields.forEach(field => {
            const input = document.getElementById(field);
            input.addEventListener('blur', () => this.validateField(field));
            input.addEventListener('input', () => this.clearFieldError(field));
        });
    }

    // Set current date as default
    setCurrentDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    // Toggle theme
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('expense-tracker-theme', newTheme);
        this.updateThemeIcon(newTheme);
        
        // Re-render chart with new theme
        if (this.chart) {
            this.renderChart();
        }
    }

    // Update theme icon
    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.setAttribute('data-feather', theme === 'dark' ? 'sun' : 'moon');
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    }

    // Form validation
    validateField(fieldName) {
        const field = document.getElementById(fieldName);
        const errorElement = document.getElementById(`${fieldName}Error`);
        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'description':
                if (!field.value.trim()) {
                    errorMessage = 'Description is required';
                    isValid = false;
                } else if (field.value.trim().length < 3) {
                    errorMessage = 'Description must be at least 3 characters';
                    isValid = false;
                }
                break;

            case 'amount':
                const amount = parseFloat(field.value);
                if (!field.value || isNaN(amount) || amount <= 0) {
                    errorMessage = 'Please enter a valid amount greater than 0';
                    isValid = false;
                } else if (amount > 999999.99) {
                    errorMessage = 'Amount cannot exceed $999,999.99';
                    isValid = false;
                }
                break;

            case 'category':
                if (!field.value) {
                    errorMessage = 'Please select a category';
                    isValid = false;
                }
                break;

            case 'date':
                if (!field.value) {
                    errorMessage = 'Date is required';
                    isValid = false;
                } else {
                    const selectedDate = new Date(field.value);
                    const today = new Date();
                    const oneYearAgo = new Date();
                    oneYearAgo.setFullYear(today.getFullYear() - 1);
                    
                    if (selectedDate > today) {
                        errorMessage = 'Date cannot be in the future';
                        isValid = false;
                    } else if (selectedDate < oneYearAgo) {
                        errorMessage = 'Date cannot be more than 1 year ago';
                        isValid = false;
                    }
                }
                break;
        }

        errorElement.textContent = errorMessage;
        field.classList.toggle('error', !isValid);
        
        return isValid;
    }

    // Clear field error
    clearFieldError(fieldName) {
        const field = document.getElementById(fieldName);
        const errorElement = document.getElementById(`${fieldName}Error`);
        
        field.classList.remove('error');
        errorElement.textContent = '';
    }

    // Validate entire form
    validateForm() {
        const fields = ['description', 'amount', 'category', 'date'];
        let isValid = true;

        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    // Handle form submission
    handleFormSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            this.showToast('Please fix the errors before submitting', 'error');
            return;
        }

        this.showLoading();

        // Simulate API call delay
        setTimeout(() => {
            const formData = new FormData(e.target);
            const expense = {
                id: this.editingId || this.generateId(),
                description: formData.get('description').trim(),
                amount: parseFloat(formData.get('amount')),
                category: formData.get('category'),
                date: formData.get('date'),
                note: formData.get('note') ? formData.get('note').trim() : '',
                recurring: formData.get('recurring') || 'none',
                createdAt: this.editingId ? 
                    this.expenses.find(exp => exp.id === this.editingId).createdAt : 
                    new Date().toISOString()
            };

            if (this.editingId) {
                this.updateExpense(expense);
                this.showToast('Expense updated successfully', 'success');
            } else {
                this.addExpense(expense);
                this.showToast('Expense added successfully', 'success');
            }

            this.resetForm();
            this.updateDisplay();
            this.hideLoading();
        }, 500);
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Add new expense
    addExpense(expense) {
        this.expenses.unshift(expense);
        this.saveExpenses();
    }

    // Update existing expense
    updateExpense(expense) {
        const index = this.expenses.findIndex(exp => exp.id === expense.id);
        if (index !== -1) {
            this.expenses[index] = expense;
            this.saveExpenses();
        }
    }

    // Delete expense
    deleteExpense(id) {
        this.expenses = this.expenses.filter(exp => exp.id !== id);
        this.saveExpenses();
        this.updateDisplay();
        this.showToast('Expense deleted successfully', 'success');
    }

    // Reset form
    resetForm() {
        document.getElementById('expenseForm').reset();
        this.setCurrentDate();
        this.editingId = null;
        
        // Reset form UI
        document.getElementById('submitBtn').innerHTML = '<i data-feather="plus"></i>Add Expense';
        document.getElementById('cancelBtn').style.display = 'none';
        
        // Clear errors
        ['description', 'amount', 'category', 'date'].forEach(field => {
            this.clearFieldError(field);
        });

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    // Cancel edit mode
    cancelEdit() {
        this.resetForm();
    }

    // Edit expense
    editExpense(id) {
        const expense = this.expenses.find(exp => exp.id === id);
        if (!expense) return;

        this.editingId = id;
        
        // Populate form
        document.getElementById('description').value = expense.description;
        document.getElementById('amount').value = expense.amount;
        document.getElementById('category').value = expense.category;
        document.getElementById('date').value = expense.date;
        document.getElementById('note').value = expense.note || '';
        document.getElementById('recurring').value = expense.recurring || 'none';
        
        // Update form UI
        document.getElementById('submitBtn').innerHTML = '<i data-feather="save"></i>Update Expense';
        document.getElementById('cancelBtn').style.display = 'inline-flex';
        
        // Scroll to form
        document.querySelector('.form-section').scrollIntoView({ 
            behavior: 'smooth' 
        });

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    // Show delete confirmation
    showDeleteModal(id) {
        this.deleteId = id;
        document.getElementById('deleteModal').classList.remove('hidden');
    }

    // Hide delete modal
    hideDeleteModal() {
        document.getElementById('deleteModal').classList.add('hidden');
        this.deleteId = null;
    }

    // Confirm delete
    confirmDelete() {
        if (this.deleteId) {
            this.deleteExpense(this.deleteId);
            this.hideDeleteModal();
        }
    }

    // Filter expenses
    filterExpenses() {
        this.updateDisplay();
    }

    // Get filtered expenses
    getFilteredExpenses() {
        let filtered = [...this.expenses];
        
        // Search filter
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(expense => 
                expense.description.toLowerCase().includes(searchTerm)
            );
        }
        
        // Category filter
        const categoryFilter = document.getElementById('categoryFilter').value;
        if (categoryFilter) {
            filtered = filtered.filter(expense => expense.category === categoryFilter);
        }
        
        // Date range filter
        const dateFrom = document.getElementById('dateFrom').value;
        const dateTo = document.getElementById('dateTo').value;
        
        if (dateFrom) {
            filtered = filtered.filter(expense => expense.date >= dateFrom);
        }
        
        if (dateTo) {
            filtered = filtered.filter(expense => expense.date <= dateTo);
        }
        
        return filtered;
    }

    // Clear all filters
    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        
        this.updateDisplay();
        this.showToast('Filters cleared', 'success');
    }

    // Switch view between table and cards
    switchView(view) {
        this.currentView = view;
        
        // Update view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Show/hide views
        document.getElementById('tableView').classList.toggle('hidden', view !== 'table');
        document.getElementById('cardsView').classList.toggle('hidden', view !== 'cards');
        
        this.renderExpenses();
    }

    // Update all displays
    updateDisplay() {
        this.updateSummary();
        this.renderExpenses();
        this.renderChart();
        this.updateCategoryTotals();
    }

    // Update summary cards
    updateSummary() {
        const filtered = this.getFilteredExpenses();
        const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);
        const categories = new Set(filtered.map(expense => expense.category)).size;
        
        document.getElementById('totalAmount').textContent = this.formatCurrency(total);
        document.getElementById('totalEntries').textContent = filtered.length;
        document.getElementById('totalCategories').textContent = categories;
    }

    // Render expenses in current view
    renderExpenses() {
        if (this.currentView === 'table') {
            this.renderTable();
        } else {
            this.renderCards();
        }
    }

    // Render table view
    renderTable() {
        const tbody = document.getElementById('expensesTableBody');
        const filtered = this.getFilteredExpenses();
        
        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr class="no-data-row">
                    <td colspan="5">
                        <div class="no-data">
                            <i data-feather="inbox"></i>
                            <p>No expenses found</p>
                            <p class="no-data-subtitle">
                                ${this.expenses.length === 0 ? 
                                    'Add your first expense to get started' : 
                                    'Try adjusting your filters'
                                }
                            </p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = filtered.map(expense => `
                <tr data-id="${expense.id}">
                    <td>${this.formatDate(expense.date)}</td>
                    <td>${this.escapeHtml(expense.description)}</td>
                    <td>
                        <span class="category-badge">${expense.category}</span>
                    </td>
                    <td>${this.formatCurrency(expense.amount)}</td>
                    <td>${this.escapeHtml(expense.note || '')}</td>
                    <td>${expense.recurring !== 'none' ? this.capitalize(expense.recurring) : '-'}</td>
                    <td>
                        <div class="expense-actions">
                            <button class="action-btn edit-btn" onclick="expenseTracker.editExpense('${expense.id}')" title="Edit">
                                <i data-feather="edit"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="expenseTracker.showDeleteModal('${expense.id}')" title="Delete">
                                <i data-feather="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
        
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    // Render cards view
    renderCards() {
        const container = document.getElementById('expenseCards');
        const filtered = this.getFilteredExpenses();
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i data-feather="inbox"></i>
                    <p>No expenses found</p>
                    <p class="no-data-subtitle">
                        ${this.expenses.length === 0 ? 
                            'Add your first expense to get started' : 
                            'Try adjusting your filters'
                        }
                    </p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="expense-cards">
                    ${filtered.map(expense => `
                        <div class="expense-card" data-id="${expense.id}">
                            <div class="card-header">
                                <div class="card-description">${this.escapeHtml(expense.description)}</div>
                                <div class="card-amount">${this.formatCurrency(expense.amount)}</div>
                            </div>
                            <div class="card-meta">
                                <span class="card-category">${expense.category}</span>
                                <span class="card-date">${this.formatDate(expense.date)}</span>
                            </div>
                            <div class="card-note" title="${this.escapeHtml(expense.note || '')}">
                                ${expense.note ? `<i data-feather='message-square'></i> ${this.escapeHtml(expense.note)}` : ''}
                            </div>
                            <div class="card-recurring" title="${expense.recurring !== 'none' ? 'Recurring: ' + this.capitalize(expense.recurring) : 'Not recurring'}">
                                ${expense.recurring !== 'none' ? `<i data-feather='repeat'></i> ${this.capitalize(expense.recurring)}` : ''}
                            </div>
                            <div class="card-actions">
                                <button class="action-btn edit-btn" onclick="expenseTracker.editExpense('${expense.id}')" title="Edit">
                                    <i data-feather="edit"></i>
                                </button>
                                <button class="action-btn delete-btn" onclick="expenseTracker.showDeleteModal('${expense.id}')" title="Delete">
                                    <i data-feather="trash-2"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    // Render chart
    renderChart() {
        const canvas = document.getElementById('categoryChart');
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }
        
        const filtered = this.getFilteredExpenses();
        const categoryTotals = this.getCategoryTotals(filtered);
        
        if (Object.keys(categoryTotals).length === 0) {
            // Show no data message
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = getComputedStyle(document.documentElement)
                .getPropertyValue('--text-muted').trim();
            ctx.textAlign = 'center';
            ctx.fillText('No data to display', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        const theme = document.documentElement.getAttribute('data-theme');
        const isDark = theme === 'dark';
        
        const data = {
            labels: Object.keys(categoryTotals),
            datasets: [{
                data: Object.values(categoryTotals),
                backgroundColor: [
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
                    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
                    '#EC4899', '#6B7280'
                ],
                borderWidth: 2,
                borderColor: isDark ? '#334155' : '#FFFFFF'
            }]
        };
        
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: isDark ? '#CBD5E1' : '#334155',
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#334155' : '#FFFFFF',
                    titleColor: isDark ? '#CBD5E1' : '#334155',
                    bodyColor: isDark ? '#CBD5E1' : '#334155',
                    borderColor: isDark ? '#475569' : '#CBD5E1',
                    borderWidth: 1,
                    callbacks: {
                        label: (context) => {
                            const label = context.label;
                            const value = this.formatCurrency(context.parsed);
                            const percentage = ((context.parsed / Object.values(categoryTotals)
                                .reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        };
        
        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: options
        });
    }

    // Update category totals display
    updateCategoryTotals() {
        const container = document.getElementById('categoryList');
        const filtered = this.getFilteredExpenses();
        const categoryTotals = this.getCategoryTotals(filtered);
        
        if (Object.keys(categoryTotals).length === 0) {
            container.innerHTML = '<p class="no-data">No expenses yet</p>';
            return;
        }
        
        const sortedCategories = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a);
        
        container.innerHTML = sortedCategories.map(([category, total]) => `
            <div class="category-item">
                <span class="category-name">${category}</span>
                <span class="category-amount">${this.formatCurrency(total)}</span>
            </div>
        `).join('');
    }

    // Get category totals
    getCategoryTotals(expenses = this.expenses) {
        return expenses.reduce((totals, expense) => {
            totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
            return totals;
        }, {});
    }

    // Show loading overlay
    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    // Hide loading overlay
    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }

    // Show toast notification
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <div class="toast-content">${this.escapeHtml(message)}</div>
            <button class="toast-close">
                <i data-feather="x"></i>
            </button>
        `;
        
        // Add close functionality
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        container.appendChild(toast);
        
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            this.removeToast(toast);
        }, 5000);
    }

    // Remove toast
    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    // Utility functions
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Local storage functions
    saveExpenses() {
        try {
            localStorage.setItem('expense-tracker-data', JSON.stringify(this.expenses));
        } catch (error) {
            console.error('Failed to save expenses to localStorage:', error);
            this.showToast('Failed to save data locally', 'error');
        }
    }

    loadExpenses() {
        try {
            const data = localStorage.getItem('expense-tracker-data');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to load expenses from localStorage:', error);
            this.showToast('Failed to load saved data', 'error');
            return [];
        }
    }

    // Add exportCSV method
    exportCSV() {
        const headers = ['Date', 'Description', 'Category', 'Amount', 'Note', 'Recurring'];
        const rows = this.expenses.map(exp => [
            this.formatDate(exp.date),
            '"' + (exp.description || '').replace(/"/g, '""') + '"',
            exp.category,
            exp.amount,
            '"' + (exp.note || '').replace(/"/g, '""') + '"',
            exp.recurring !== 'none' ? this.capitalize(exp.recurring) : ''
        ]);
        let csvContent = headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'expenses.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('Exported expenses as CSV!', 'success');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.expenseTracker = new ExpenseTracker();
});

// Add slide out animation for toast removal
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
