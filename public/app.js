// 全局变量
let currentUser = null;
let currentPage = 'dashboard';
let currentPageNum = 1;
let currentFilters = {};
let incomeExpenseChart = null;
let monthlyTrendChart = null;
let expenseCategoryChart = null;

// API 基础配置
const API_BASE = '/api';

// 工具函数
function formatCurrency(amount) {
    return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY'
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('zh-CN');
}

function showMessage(message, type = 'info', targetPage = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    // 优先显示在指定的页面，否则显示在当前活动的页面
    let container = null;
    
    if (targetPage) {
        container = document.getElementById(targetPage + 'Page');
    }
    
    // 如果没有指定页面，查找当前显示的页面
    if (!container) {
        const contentPages = document.querySelectorAll('.content-page');
        for (let page of contentPages) {
            if (page.style.display !== 'none') {
                container = page;
                break;
            }
        }
    }
    
    // 如果还是没有找到，使用登录页面或body
    if (!container) {
        container = document.querySelector('.login-container') || document.body;
    }
    
    if (container) {
        container.insertBefore(messageDiv, container.firstChild);
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// API 请求函数
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...options
    };

    try {
        const response = await fetch(API_BASE + url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '请求失败');
        }

        return data;
    } catch (error) {
        console.error('API请求错误:', error);
        throw error;
    }
}

// 认证相关
function login(username, password) {
    return apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    
    // 清空登录表单
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    
    showLoginPage();
}

function isLoggedIn() {
    return localStorage.getItem('token') !== null;
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user') || '{}');
}

// 页面显示控制
function showLoginPage() {
    document.getElementById('loginPage').style.display = 'block';
    document.getElementById('mainPage').style.display = 'none';
}

function showMainPage() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainPage').style.display = 'block';
    currentUser = getCurrentUser();
    document.getElementById('currentUser').textContent = currentUser.username;
    
    // 根据用户角色显示/隐藏功能
    if (currentUser.role === 'admin') {
        document.getElementById('usersNav').style.display = 'block';
        // 管理员可以看到所有功能
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    } else {
        document.getElementById('usersNav').style.display = 'none';
        // 普通用户隐藏管理功能
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
    
    // 重新加载当前页面的数据以确保权限正确应用
    if (currentPage) {
        switch (currentPage) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'transactions':
                loadTransactions();
                break;
            case 'users':
                loadUsers();
                break;
            case 'reports':
                loadReports();
                break;
        }
    } else {
        loadDashboard();
    }
}

function showPage(pageName) {
    // 隐藏所有页面
    document.querySelectorAll('.content-page').forEach(page => {
        page.style.display = 'none';
    });
    
    // 移除所有导航项的活动状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 显示目标页面
    document.getElementById(pageName + 'Page').style.display = 'block';
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
    
    currentPage = pageName;
    
    // 加载页面数据
    switch (pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'users':
            loadUsers();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

// 仪表板数据加载
async function loadDashboard() {
    try {
        const stats = await apiRequest('/statistics');
        
        document.getElementById('totalIncome').textContent = formatCurrency(stats.totalIncome);
        document.getElementById('totalExpense').textContent = formatCurrency(stats.totalExpense);
        document.getElementById('currentBalance').textContent = formatCurrency(stats.balance);
        
        // 创建收支比例图表
        createIncomeExpenseChart(stats.totalIncome, stats.totalExpense);
        
    } catch (error) {
        showMessage('加载仪表板数据失败: ' + error.message, 'error', 'dashboard');
    }
}

// 创建收支比例图表
function createIncomeExpenseChart(income, expense) {
    const ctx = document.getElementById('incomeExpenseChart');
    if (!ctx) return;
    
    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }
    
    const total = income + expense;
    if (total === 0) {
        // 显示空状态
        incomeExpenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['暂无数据'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e5e7eb'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        return;
    }
    
    incomeExpenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['收入', '支出'],
            datasets: [{
                data: [income, expense],
                backgroundColor: ['#1e40af', '#dc2626'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ¥${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function displayRecentTransactions(transactions) {
    const container = document.getElementById('recentTransactionsList');
    
    if (transactions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">暂无记录</p>';
        return;
    }
    
    container.innerHTML = transactions.map(transaction => `
        <div class="transaction-item ${transaction.type}">
            <div class="transaction-info">
                <div style="font-weight: 500;">${transaction.description}</div>
                <div style="font-size: 0.9rem; color: #666;">
                    ${formatDate(transaction.created_at)} • ${transaction.category || '未分类'}
                </div>
            </div>
            <div class="transaction-amount ${transaction.type}">
                ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
            </div>
        </div>
    `).join('');
}

// 记录管理
async function loadTransactions(page = 1) {
    try {
        const params = new URLSearchParams({
            page: page,
            limit: 20,
            ...currentFilters
        });
        
        const data = await apiRequest(`/transactions?${params}`);
        displayTransactions(data.transactions);
        displayPagination(data.pagination);
        
    } catch (error) {
        showMessage('加载记录失败: ' + error.message, 'error', 'transactions');
    }
}

function displayTransactions(transactions) {
    const tbody = document.getElementById('transactionsTableBody');
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px; color: #666;">暂无记录</td></tr>';
        return;
    }
    
    let runningBalance = 0;
    const sortedTransactions = transactions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    tbody.innerHTML = sortedTransactions.map((transaction, index) => {
        if (transaction.type === 'income') {
            runningBalance += transaction.amount;
        } else {
            runningBalance -= transaction.amount;
        }
        
        // 根据用户角色决定是否显示删除按钮 - 每次都重新获取当前用户信息
        const currentUserInfo = getCurrentUser();
        const deleteButton = currentUserInfo && currentUserInfo.role === 'admin' 
            ? `<button class="btn btn-danger btn-sm" onclick="deleteTransaction(${transaction.id})">删除</button>`
            : '<span style="color: #666;">无权限</span>';
        
        // 处理图片显示
        const imageCell = transaction.image_path 
            ? `<img src="${transaction.image_path}" alt="凭证图片" class="transaction-image" onclick="showImageModal('${transaction.image_path}')" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 1px solid #ddd;">`
            : '<span style="color: #999;">无图片</span>';
        
        return `
            <tr>
                <td>${index + 1}</td>
                <td>${formatDate(transaction.created_at)}</td>
                <td>${transaction.description}</td>
                <td class="${transaction.type === 'income' ? 'income-amount' : ''}">
                    ${transaction.type === 'income' ? formatCurrency(transaction.amount) : '0.00'}
                </td>
                <td class="${transaction.type === 'expense' ? 'expense-amount' : ''}">
                    ${transaction.type === 'expense' ? formatCurrency(transaction.amount) : '0.00'}
                </td>
                <td>${transaction.handler || transaction.username || '未知'}</td>
                <td>${transaction.witness || '未知'}</td>
                <td>${imageCell}</td>
                <td>${formatCurrency(runningBalance)}</td>
                <td>${deleteButton}</td>
            </tr>
        `;
    }).join('');
}

function displayPagination(pagination) {
    const container = document.getElementById('transactionsPagination');
    
    if (pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // 上一页
    html += `<button ${pagination.page === 1 ? 'disabled' : ''} onclick="loadTransactions(${pagination.page - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    // 页码
    for (let i = 1; i <= pagination.pages; i++) {
        if (i === pagination.page || i === 1 || i === pagination.pages || 
            (i >= pagination.page - 2 && i <= pagination.page + 2)) {
            html += `<button class="${i === pagination.page ? 'active' : ''}" onclick="loadTransactions(${i})">${i}</button>`;
        } else if (i === pagination.page - 3 || i === pagination.page + 3) {
            html += '<span>...</span>';
        }
    }
    
    // 下一页
    html += `<button ${pagination.page === pagination.pages ? 'disabled' : ''} onclick="loadTransactions(${pagination.page + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;
    
    container.innerHTML = html;
}

async function deleteTransaction(id) {
    if (!confirm('确定要删除这条记录吗？')) {
        return;
    }
    
    try {
        await apiRequest(`/transactions/${id}`, { method: 'DELETE' });
        showMessage('记录删除成功', 'success', 'transactions');
        loadTransactions(currentPageNum);
        loadDashboard(); // 更新仪表板
    } catch (error) {
        showMessage('删除失败: ' + error.message, 'error', 'transactions');
    }
}

// 用户管理
async function loadUsers() {
    try {
        const users = await apiRequest('/users');
        displayUsers(users);
    } catch (error) {
        showMessage('加载用户列表失败: ' + error.message, 'error');
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.username}</td>
            <td>
                <span class="badge ${user.role === 'admin' ? 'admin' : 'member'}">
                    ${user.role === 'admin' ? '管理员' : '普通成员'}
                </span>
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                ${user.id !== currentUser.id ? `
                    <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : '<span style="color: #666;">当前用户</span>'}
            </td>
        </tr>
    `).join('');
}

async function deleteUser(id) {
    if (!confirm('确定要删除这个用户吗？此操作不可撤销！')) {
        return;
    }
    
    try {
        await apiRequest(`/users/${id}`, { method: 'DELETE' });
        showMessage('用户删除成功', 'success', 'users');
        loadUsers(); // 重新加载用户列表
    } catch (error) {
        showMessage('删除失败: ' + error.message, 'error', 'users');
    }
}

// 报表功能
async function loadReports() {
    // 设置默认日期范围（最近30天）
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('reportStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = endDate.toISOString().split('T')[0];
    
    await generateReport();
    await loadMonthlyTrendChart();
    await loadExpenseCategoryChart();
    await loadDetailedStats();
}

async function generateReport() {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        
        if (!startDate || !endDate) {
            showMessage('请选择日期范围', 'error', 'reports');
            return;
        }
        
        const params = new URLSearchParams({ startDate, endDate });
        const stats = await apiRequest(`/statistics?${params}`);
        
        document.getElementById('reportIncome').textContent = formatCurrency(stats.totalIncome);
        document.getElementById('reportExpense').textContent = formatCurrency(stats.totalExpense);
        document.getElementById('reportBalance').textContent = formatCurrency(stats.balance);
        
    } catch (error) {
        showMessage('生成报表失败: ' + error.message, 'error', 'reports');
    }
}

// 加载月度收支趋势图表
async function loadMonthlyTrendChart() {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        
        if (!startDate || !endDate) return;
        
        const params = new URLSearchParams({ startDate, endDate });
        const data = await apiRequest(`/transactions?${params}&limit=1000`);
        
        // 按月份分组数据
        const monthlyData = {};
        data.transactions.forEach(transaction => {
            const month = new Date(transaction.created_at).toISOString().substring(0, 7); // YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expense: 0 };
            }
            if (transaction.type === 'income') {
                monthlyData[month].income += parseFloat(transaction.amount);
            } else {
                monthlyData[month].expense += parseFloat(transaction.amount);
            }
        });
        
        // 排序月份
        const sortedMonths = Object.keys(monthlyData).sort();
        const labels = sortedMonths.map(month => {
            const [year, monthNum] = month.split('-');
            return `${year}年${parseInt(monthNum)}月`;
        });
        
        const incomeData = sortedMonths.map(month => monthlyData[month].income);
        const expenseData = sortedMonths.map(month => monthlyData[month].expense);
        
        createMonthlyTrendChart(labels, incomeData, expenseData);
        
    } catch (error) {
        console.error('加载月度趋势图表失败:', error);
    }
}

// 创建月度收支趋势图表
function createMonthlyTrendChart(labels, incomeData, expenseData) {
    const ctx = document.getElementById('monthlyTrendChart');
    if (!ctx) return;
    
    if (monthlyTrendChart) {
        monthlyTrendChart.destroy();
    }
    
    monthlyTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '收入',
                data: incomeData,
                borderColor: '#1e40af',
                backgroundColor: 'rgba(30, 64, 175, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: '支出',
                data: expenseData,
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '¥' + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

// 加载支出分类统计图表
async function loadExpenseCategoryChart() {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        
        if (!startDate || !endDate) return;
        
        const params = new URLSearchParams({ startDate, endDate, type: 'expense' });
        const data = await apiRequest(`/transactions?${params}&limit=1000`);
        
        // 按分类分组支出数据
        const categoryData = {};
        data.transactions.forEach(transaction => {
            const category = transaction.category || '未分类';
            if (!categoryData[category]) {
                categoryData[category] = 0;
            }
            categoryData[category] += parseFloat(transaction.amount);
        });
        
        // 转换为图表数据格式
        const labels = Object.keys(categoryData);
        const values = Object.values(categoryData);
        
        createExpenseCategoryChart(labels, values);
        
    } catch (error) {
        console.error('加载支出分类图表失败:', error);
    }
}

// 创建支出分类统计图表
function createExpenseCategoryChart(labels, values) {
    const ctx = document.getElementById('expenseCategoryChart');
    if (!ctx) return;
    
    if (expenseCategoryChart) {
        expenseCategoryChart.destroy();
    }
    
    if (values.length === 0) {
        // 显示空状态
        expenseCategoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['暂无支出数据'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e5e7eb'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        return;
    }
    
    // 生成颜色
    const colors = [
        '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca',
        '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe',
        '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'
    ];
    
    expenseCategoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ¥${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 加载详细统计表格
async function loadDetailedStats() {
    try {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        
        if (!startDate || !endDate) return;
        
        const params = new URLSearchParams({ startDate, endDate, limit: 1000 });
        const data = await apiRequest(`/transactions?${params}`);
        
        // 按月份分组数据
        const monthlyData = {};
        data.transactions.forEach(transaction => {
            const month = new Date(transaction.created_at).toISOString().substring(0, 7); // YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expense: 0, count: 0 };
            }
            if (transaction.type === 'income') {
                monthlyData[month].income += parseFloat(transaction.amount);
            } else {
                monthlyData[month].expense += parseFloat(transaction.amount);
            }
            monthlyData[month].count++;
        });
        
        // 排序月份
        const sortedMonths = Object.keys(monthlyData).sort();
        
        // 生成表格数据
        const tbody = document.getElementById('detailedStatsBody');
        if (sortedMonths.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;">暂无数据</td></tr>';
            return;
        }
        
        tbody.innerHTML = sortedMonths.map(month => {
            const [year, monthNum] = month.split('-');
            const monthName = `${year}年${parseInt(monthNum)}月`;
            const data = monthlyData[month];
            const netAmount = data.income - data.expense;
            
            return `
                <tr>
                    <td>${monthName}</td>
                    <td class="income-amount">${formatCurrency(data.income)}</td>
                    <td class="expense-amount">${formatCurrency(data.expense)}</td>
                    <td class="${netAmount >= 0 ? 'income-amount' : 'expense-amount'}">${formatCurrency(netAmount)}</td>
                    <td>${data.count}</td>
                </tr>
            `;
        }).join('');
        
    } catch (error) {
        console.error('加载详细统计失败:', error);
    }
}

// 模态框管理
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// 添加记录
async function addTransaction(formData) {
    try {
        // 创建FormData对象以支持文件上传
        const formDataObj = new FormData();
        formDataObj.append('type', formData.type);
        formDataObj.append('amount', formData.amount);
        formDataObj.append('description', formData.description);
        formDataObj.append('category', formData.category || '');
        formDataObj.append('date', formData.date);
        formDataObj.append('handler', formData.handler);
        formDataObj.append('witness', formData.witness);
        
        if (formData.image) {
            formDataObj.append('image', formData.image);
        }
        
        const token = localStorage.getItem('token');
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formDataObj
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '添加记录失败');
        }
        
        showMessage('记录添加成功', 'success', 'transactions');
        document.getElementById('transactionForm').reset();
        // 重新设置默认日期
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('transactionDate').value = today;
        // 清空图片预览
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.style.display = 'none';
        }
        
        // 刷新数据
        if (currentPage === 'transactions') {
            loadTransactions(currentPageNum);
        }
        
        // 如果仪表板页面存在，也更新仪表板数据
        const dashboardPage = document.getElementById('dashboardPage');
        if (dashboardPage && dashboardPage.style.display !== 'none') {
            loadDashboard();
        }
        
    } catch (error) {
        showMessage('添加记录失败: ' + error.message, 'error', 'transactions');
    }
}

// 清空表单
function clearForm() {
    document.getElementById('transactionForm').reset();
    // 重新设置默认日期
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transactionDate').value = today;
    // 清空图片预览
    const preview = document.getElementById('imagePreview');
    if (preview) {
        preview.style.display = 'none';
    }
    showMessage('表单已清空', 'info', 'transactions');
}

// 提交交易表单
function submitTransactionForm() {
    console.log('提交交易表单');
    
    const formData = {
        date: document.getElementById('transactionDate').value,
        description: document.getElementById('transactionDescription').value,
        type: document.getElementById('transactionType').value,
        amount: parseFloat(document.getElementById('transactionAmount').value) || 0,
        handler: document.getElementById('transactionHandler').value,
        witness: document.getElementById('transactionWitness').value,
        category: document.getElementById('transactionCategory').value || '',
        image: document.getElementById('transactionImage').files[0] || null
    };
    
    console.log('表单数据:', formData);
    
    if (!formData.date || !formData.description || !formData.type || !formData.handler || !formData.witness) {
        showMessage('请填写完整信息', 'error', 'transactions');
        return;
    }
    
    if (formData.amount <= 0) {
        showMessage('请输入有效金额', 'error', 'transactions');
        return;
    }
    
    addTransaction(formData);
}

// 切换金额字段显示
function toggleAmountFields() {
    const type = document.getElementById('transactionType').value;
    const amountLabel = document.querySelector('label[for="transactionAmount"]');
    
    if (type === 'income') {
        amountLabel.textContent = '收入金额(元)';
    } else if (type === 'expense') {
        amountLabel.textContent = '支出金额(元)';
    } else {
        amountLabel.textContent = '金额(元)';
    }
}

// 图片预览功能
function previewImage(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            const previewImg = document.getElementById('previewImg');
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// 删除图片
function removeImage() {
    const fileInput = document.getElementById('transactionImage');
    const preview = document.getElementById('imagePreview');
    fileInput.value = '';
    preview.style.display = 'none';
}

// 显示图片模态框
function showImageModal(imagePath) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = imagePath;
    modal.style.display = 'block';
}

// 导出为Excel
async function exportToExcel() {
    try {
        // 获取所有交易数据
        const response = await apiRequest('/transactions?limit=1000');
        const transactions = response.transactions;
        
        if (!transactions || transactions.length === 0) {
            showMessage('没有数据可导出', 'error');
            return;
        }
        
        // 创建HTML表格内容，使用更兼容的Excel格式
        let htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <meta name="ExcelCreated" content="1">
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 6px; text-align: left; vertical-align: middle; }
                th { background-color: #1e40af; color: white; font-weight: bold; }
                tr:nth-child(even) { background-color: #f8f9fa; }
                .income-amount { color: #059669; font-weight: bold; }
                .expense-amount { color: #dc2626; font-weight: bold; }
                .no-image { color: #999; font-style: italic; font-size: 10px; }
                .image-cell { text-align: center; width: 80px; vertical-align: middle; }
                .image-filename { color: #1e40af; font-size: 10px; font-weight: normal; }
                .number-cell { text-align: center; width: 50px; }
                .amount-cell { text-align: right; width: 80px; }
                .date-cell { width: 80px; }
                .description-cell { width: 150px; }
                .person-cell { width: 80px; }
            </style>
        </head>
        <body>
            <h2 style="text-align: center; color: #1e40af;">班费明细表</h2>
            <p style="text-align: center; color: #666;">导出时间: ${new Date().toLocaleString('zh-CN')}</p>
            <table>
                <thead>
                    <tr>
                        <th>序号</th>
                        <th>日期</th>
                        <th>事项说明</th>
                        <th>收入(元)</th>
                        <th>支出(元)</th>
                        <th>经手人</th>
                        <th>证明人</th>
                        <th>凭证图片</th>
                        <th>当前余额(元)</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        let runningBalance = 0;
        const sortedTransactions = transactions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        // 处理图片并生成表格行
        for (let index = 0; index < sortedTransactions.length; index++) {
            const transaction = sortedTransactions[index];
            if (transaction.type === 'income') {
                runningBalance += parseFloat(transaction.amount);
            } else {
                runningBalance -= parseFloat(transaction.amount);
            }
            
            const incomeAmount = transaction.type === 'income' ? `¥${parseFloat(transaction.amount).toFixed(2)}` : '0.00';
            const expenseAmount = transaction.type === 'expense' ? `¥${parseFloat(transaction.amount).toFixed(2)}` : '0.00';
            const incomeClass = transaction.type === 'income' ? 'income-amount' : '';
            const expenseClass = transaction.type === 'expense' ? 'expense-amount' : '';
            
            // 处理图片显示 - 直接嵌入图片到Excel
            let imageCell = '<span class="no-image">无图片</span>';
            if (transaction.image_path) {
                try {
                    // 获取图片并转换为base64
                    const imageUrl = `${window.location.origin}${transaction.image_path}`;
                    const imageResponse = await fetch(imageUrl);
                    
                    if (imageResponse.ok) {
                        const imageBlob = await imageResponse.blob();
                        const reader = new FileReader();
                        
                        await new Promise((resolve, reject) => {
                            reader.onload = () => {
                                const base64 = reader.result;
                                // 使用Excel兼容的图片格式
                                imageCell = `<img src="${base64}" alt="凭证图片" style="width: 60px; height: 60px; object-fit: cover; border: 1px solid #ccc; display: block; margin: 0 auto;">`;
                                resolve();
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(imageBlob);
                        });
                    } else {
                        // 如果图片加载失败，显示文件名
                        const fileName = transaction.image_path.split('/').pop();
                        imageCell = `<span style="color: #1e40af; font-size: 10px;">[图片] ${fileName}</span>`;
                    }
                } catch (error) {
                    console.error('处理图片失败:', error);
                    // 如果出错，显示文件名
                    const fileName = transaction.image_path.split('/').pop();
                    imageCell = `<span style="color: #1e40af; font-size: 10px;">[图片] ${fileName}</span>`;
                }
            }
            
            htmlContent += `
                <tr>
                    <td class="number-cell">${index + 1}</td>
                    <td class="date-cell">${new Date(transaction.created_at).toLocaleDateString('zh-CN')}</td>
                    <td class="description-cell">${transaction.description}</td>
                    <td class="amount-cell ${incomeClass}">${incomeAmount}</td>
                    <td class="amount-cell ${expenseClass}">${expenseAmount}</td>
                    <td class="person-cell">${transaction.handler || transaction.username || '未知'}</td>
                    <td class="person-cell">${transaction.witness || '未知'}</td>
                    <td class="image-cell">${imageCell}</td>
                    <td class="amount-cell">¥${runningBalance.toFixed(2)}</td>
                </tr>
            `;
        }
        
        htmlContent += `
                </tbody>
            </table>
        </body>
        </html>
        `;
        
        // 创建并下载文件 - 使用正确的Excel格式
        const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `班费明细表_${new Date().toISOString().split('T')[0]}.xls`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('数据导出成功！已生成Excel文件，图片直接嵌入表格', 'success');
    } catch (error) {
        showMessage('导出失败: ' + error.message, 'error');
    }
}

// 打印表格
function printTable() {
    try {
        const table = document.querySelector('.transactions-table');
        if (!table) {
            showMessage('没有数据可打印', 'error');
            return;
        }
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>班费明细表</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #1e40af; color: white; }
                        tr:nth-child(even) { background-color: #f2f2f2; }
                        .income-amount { color: #059669; font-weight: bold; }
                        .expense-amount { color: #dc2626; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>班费明细表</h1>
                    <p>打印时间: ${new Date().toLocaleString('zh-CN')}</p>
                    ${table.outerHTML}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
        
        showMessage('打印窗口已打开', 'success');
    } catch (error) {
        showMessage('打印失败: ' + error.message, 'error');
    }
}

// 添加用户
async function addUser(formData) {
    console.log('添加用户:', formData);
    try {
        const response = await apiRequest('/register', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        console.log('用户创建响应:', response);
        showMessage('用户创建成功', 'success', 'users');
        hideModal('userModal');
        document.getElementById('userForm').reset();
        loadUsers();
        
    } catch (error) {
        console.error('创建用户失败:', error);
        showMessage('创建用户失败: ' + error.message, 'error', 'users');
    }
}

// 事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // 设置默认日期为今天
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('transactionDate');
    if (dateInput) {
        dateInput.value = today;
    }
    
    // 检查登录状态
    if (isLoggedIn()) {
        showMainPage();
    } else {
        showLoginPage();
    }
    
    // 登录表单
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('登录表单提交');
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        console.log('用户名:', username);
        console.log('密码长度:', password.length);
        
        try {
            console.log('开始登录请求...');
            const response = await login(username, password);
            console.log('登录响应:', response);
            
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            showMessage('登录成功', 'success', 'login');
            showMainPage();
        } catch (error) {
            console.error('登录错误:', error);
            showMessage('登录失败: ' + error.message, 'error', 'login');
        }
    });
    
    // 退出登录
    document.getElementById('logoutBtn').addEventListener('click', function() {
        logout();
        showMessage('已退出登录', 'info');
    });
    
    // 导航菜单
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            if (page) {
                showPage(page);
            }
        });
    });
    
    // 添加记录按钮已删除，表单直接在页面中显示
    
    // 添加用户按钮
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        console.log('添加用户按钮找到，绑定事件监听器');
        addUserBtn.addEventListener('click', function() {
            console.log('添加用户按钮被点击');
            showModal('userModal');
        });
    } else {
        console.error('找不到添加用户按钮');
    }
    
    // 记录表单现在使用按钮点击事件，不需要submit事件监听器
    
    // 用户表单
    const userForm = document.getElementById('userForm');
    if (userForm) {
        console.log('用户表单找到，绑定事件监听器');
        userForm.addEventListener('submit', function(e) {
            console.log('用户表单提交事件触发');
            e.preventDefault();
            
            const formData = {
                username: document.getElementById('userUsername').value,
                password: document.getElementById('userPassword').value,
                role: document.getElementById('userRole').value
            };
            
            console.log('用户表单数据:', formData);
            addUser(formData);
        });
    } else {
        console.error('找不到用户表单元素');
    }
    
    // 筛选功能
    document.getElementById('filterBtn').addEventListener('click', function() {
        currentFilters = {
            type: document.getElementById('typeFilter').value,
            startDate: document.getElementById('startDateFilter').value,
            endDate: document.getElementById('endDateFilter').value
        };
        
        // 移除空值
        Object.keys(currentFilters).forEach(key => {
            if (!currentFilters[key]) {
                delete currentFilters[key];
            }
        });
        
        currentPageNum = 1;
        loadTransactions(currentPageNum);
    });
    
    // 清除筛选
    document.getElementById('clearFilterBtn').addEventListener('click', function() {
        document.getElementById('typeFilter').value = '';
        document.getElementById('startDateFilter').value = '';
        document.getElementById('endDateFilter').value = '';
        currentFilters = {};
        currentPageNum = 1;
        loadTransactions(currentPageNum);
    });
    
    // 生成报表按钮
    const generateReportBtn = document.getElementById('generateReportBtn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', async function() {
            console.log('生成报表按钮被点击');
            try {
                await generateReport();
                await loadMonthlyTrendChart();
                await loadExpenseCategoryChart();
                await loadDetailedStats();
                showMessage('报表生成成功', 'success', 'reports');
            } catch (error) {
                console.error('生成报表失败:', error);
                showMessage('生成报表失败: ' + error.message, 'error', 'reports');
            }
        });
    } else {
        console.error('找不到生成报表按钮');
    }
    
    // 模态框关闭
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // 点击模态框背景关闭
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
});

// 添加一些样式类
const style = document.createElement('style');
style.textContent = `
    .badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .badge.income {
        background: #d4edda;
        color: #155724;
    }
    
    .badge.expense {
        background: #f8d7da;
        color: #721c24;
    }
    
    .badge.admin {
        background: #d1ecf1;
        color: #0c5460;
    }
    
    .badge.member {
        background: #e2e3e5;
        color: #383d41;
    }
    
    .btn-sm {
        padding: 6px 12px;
        font-size: 0.8rem;
    }
    
    .income {
        color: #4CAF50;
        font-weight: 600;
    }
    
    .expense {
        color: #f44336;
        font-weight: 600;
    }
`;
document.head.appendChild(style);

