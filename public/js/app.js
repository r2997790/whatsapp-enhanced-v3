// Enhanced WhatsApp Application with Socket.IO
class WhatsAppEnhanced {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.currentStatus = 'disconnected';
        this.templates = [];
        this.contacts = [];
        this.groups = [];
        this.suggestedTokens = [];
        
        this.initializeSocket();
        this.initializeEventListeners();
        this.loadInitialData();
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Socket.IO connected');
            this.isConnected = true;
            this.updateWebSocketStatus('connected', 'Connected');
        });

        this.socket.on('disconnect', () => {
            console.log('Socket.IO disconnected');
            this.isConnected = false;
            this.updateWebSocketStatus('disconnected', 'Disconnected');
        });

        this.socket.on('status_update', (status) => {
            this.updateStatus(status);
        });

        this.socket.on('qr_code', (data) => {
            this.displayQRCode(data.qr);
        });

        this.socket.on('connection_ready', (data) => {
            this.showNotification('success', 'WhatsApp Connected!', data.message);
        });

        this.socket.on('authenticated', (data) => {
            this.showNotification('success', 'Authenticated!', data.message);
        });

        this.socket.on('auth_failure', (data) => {
            this.showNotification('error', 'Authentication Failed', data.message);
        });

        this.socket.on('disconnected', (data) => {
            this.showNotification('warning', 'Disconnected', data.message);
        });

        this.socket.on('message_sent', (data) => {
            if (data.demo) {
                this.showNotification('info', 'Demo Mode', `Demo message sent to ${data.number}`);
            } else {
                this.showNotification('success', 'Message Sent', `Message sent to ${data.number}`);
            }
        });

        this.socket.on('message_send_error', (data) => {
            this.showNotification('error', 'Send Failed', `Failed to send message to ${data.number}: ${data.error}`);
        });

        this.socket.on('loading_update', (data) => {
            this.updateLoadingProgress(data.percent, data.message);
        });
    }

    updateWebSocketStatus(status, text) {
        const statusElement = document.getElementById('websocket-status');
        const statusText = document.getElementById('ws-status-text');
        
        statusElement.className = `connection-status ${status}`;
        statusText.textContent = text;
    }

    updateStatus(status) {
        this.currentStatus = status.status;
        
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.getElementById('status-text');
        const clientCount = document.getElementById('client-count');
        const qrContainer = document.getElementById('qr-container');
        const loadingStatus = document.getElementById('loading-status');
        
        // Update status indicator
        statusIndicator.className = `status-indicator status-${status.status}`;
        
        // Update status text
        let statusMessage = this.getStatusMessage(status.status, status.demoMode);
        statusText.textContent = statusMessage;
        
        // Update client count
        if (status.connectedClients !== undefined) {
            clientCount.textContent = `${status.connectedClients} clients`;
            clientCount.style.display = 'inline';
        }
        
        // Show/hide QR container
        if (status.status === 'qr_ready') {
            qrContainer.style.display = 'block';
            loadingStatus.style.display = 'none';
        } else if (status.status === 'ready' || status.status === 'authenticated') {
            qrContainer.style.display = 'none';
            loadingStatus.style.display = 'none';
        } else {
            loadingStatus.style.display = 'none';
        }
    }

    getStatusMessage(status, demoMode) {
        if (demoMode) return 'Demo Mode - WhatsApp simulation active';
        
        switch (status) {
            case 'disconnected': return 'Disconnected';
            case 'qr_ready': return 'Scan QR Code to Connect';
            case 'authenticated': return 'Authenticated - Loading...';
            case 'ready': return 'Connected and Ready';
            case 'auth_failure': return 'Authentication Failed';
            case 'error': return 'Connection Error';
            default: return 'Unknown Status';
        }
    }

    displayQRCode(qrDataUrl) {
        const qrImage = document.getElementById('qr-image');
        const qrContainer = document.getElementById('qr-container');
        
        qrImage.src = qrDataUrl;
        qrContainer.style.display = 'block';
    }

    updateLoadingProgress(percent, message) {
        const loadingStatus = document.getElementById('loading-status');
        const progressBar = document.getElementById('loading-progress');
        const loadingMessage = document.getElementById('loading-message');
        
        loadingStatus.style.display = 'block';
        progressBar.style.width = `${percent}%`;
        progressBar.textContent = `${percent}%`;
        loadingMessage.textContent = message;
    }

    showNotification(type, title, message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${this.getBootstrapAlertClass(type)} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        
        notification.innerHTML = `
            <strong>${title}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getBootstrapAlertClass(type) {
        switch (type) {
            case 'success': return 'success';
            case 'error': return 'danger';
            case 'warning': return 'warning';
            case 'info': return 'info';
            default: return 'secondary';
        }
    }

    initializeEventListeners() {
        // Quick send form
        document.getElementById('quick-send-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendQuickMessage();
        });

        // Bulk messaging forms
        document.getElementById('manual-bulk-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendManualBulk();
        });

        document.getElementById('csv-bulk-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendCSVBulk();
        });

        // Template management
        document.getElementById('create-template-btn').addEventListener('click', () => {
            this.showTemplateModal();
        });

        document.getElementById('save-template-btn').addEventListener('click', () => {
            this.saveTemplate();
        });

        document.getElementById('template-content').addEventListener('input', () => {
            this.detectTemplateVariables();
        });

        // Contact management
        document.getElementById('add-contact-btn').addEventListener('click', () => {
            this.showAddContactModal();
        });

        document.getElementById('save-contact-btn').addEventListener('click', () => {
            this.saveContact();
        });

        document.getElementById('import-contacts-btn').addEventListener('click', () => {
            this.showImportContactsModal();
        });

        document.getElementById('import-contacts-btn-modal').addEventListener('click', () => {
            this.importContacts();
        });

        document.getElementById('create-group-btn').addEventListener('click', () => {
            this.showCreateGroupModal();
        });

        document.getElementById('save-group-btn').addEventListener('click', () => {
            this.saveGroup();
        });

        // Search and filters
        document.getElementById('contact-search').addEventListener('input', (e) => {
            this.filterContacts(e.target.value);
        });

        document.getElementById('contact-tag-filter').addEventListener('change', (e) => {
            this.filterContactsByTag(e.target.value);
        });

        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.filterTemplatesByCategory(e.target.value);
        });

        // Personalization
        document.getElementById('personalize-message').addEventListener('input', () => {
            this.updatePersonalizationTokens();
            this.updatePersonalizationPreview();
        });

        document.getElementById('personalize-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendPersonalizedMessage();
        });

        document.getElementById('bulk-personalize-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendBulkPersonalized();
        });

        document.getElementById('group-personalize-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendGroupPersonalized();
        });

        // Tab change listeners
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('data-bs-target');
                if (target === '#contacts') {
                    this.loadContacts();
                    this.loadGroups();
                } else if (target === '#templates') {
                    this.loadTemplates();
                } else if (target === '#personalization') {
                    this.loadSuggestedTokens();
                    this.loadGroupsForPersonalization();
                }
            });
        });
    }

    async loadInitialData() {
        try {
            await this.loadTemplates();
            await this.loadContacts();
            await this.loadGroups();
            await this.loadSuggestedTokens();
            this.updateContactTagFilter();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    // Quick Message Functions
    async sendQuickMessage() {
        const phoneNumber = document.getElementById('phone-number').value;
        const message = document.getElementById('message').value;

        if (!phoneNumber || !message) {
            this.showNotification('error', 'Validation Error', 'Phone number and message are required');
            return;
        }

        try {
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: phoneNumber, message })
            });

            const result = await response.json();
            if (result.success) {
                this.showNotification('success', 'Message Sent', result.message);
                document.getElementById('quick-send-form').reset();
            } else {
                this.showNotification('error', 'Send Failed', result.message);
            }
        } catch (error) {
            this.showNotification('error', 'Network Error', 'Failed to send message');
        }
    }

    // Template Functions
    async loadTemplates() {
        try {
            const response = await fetch('/api/templates');
            const result = await response.json();
            
            if (result.success) {
                this.templates = result.templates;
                this.displayTemplates();
                this.updateCategoryFilter();
            }
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }

    displayTemplates() {
        const container = document.getElementById('templates-list');
        
        if (this.templates.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-muted">No templates found. Create your first template!</p></div>';
            return;
        }

        container.innerHTML = this.templates.map(template => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card template-card h-100" onclick="app.useTemplate('${template.id}')">
                    <div class="card-body">
                        <h6 class="card-title">${template.name}</h6>
                        <span class="badge bg-primary mb-2">${template.category || 'General'}</span>
                        <p class="card-text small">${template.content.substring(0, 100)}${template.content.length > 100 ? '...' : ''}</p>
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); app.editTemplate('${template.id}')">Edit</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); app.deleteTemplate('${template.id}')">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Stub functions for the rest of the functionality
    showTemplateModal() { console.log('Template modal'); }
    saveTemplate() { console.log('Save template'); }
    detectTemplateVariables() { console.log('Detect variables'); }
    showAddContactModal() { console.log('Add contact modal'); }
    saveContact() { console.log('Save contact'); }
    showImportContactsModal() { console.log('Import contacts modal'); }
    importContacts() { console.log('Import contacts'); }
    showCreateGroupModal() { console.log('Create group modal'); }
    saveGroup() { console.log('Save group'); }
    filterContacts() { console.log('Filter contacts'); }
    filterContactsByTag() { console.log('Filter by tag'); }
    filterTemplatesByCategory() { console.log('Filter templates'); }
    updatePersonalizationTokens() { console.log('Update tokens'); }
    updatePersonalizationPreview() { console.log('Update preview'); }
    sendPersonalizedMessage() { console.log('Send personalized'); }
    sendBulkPersonalized() { console.log('Bulk personalized'); }
    sendGroupPersonalized() { console.log('Group personalized'); }
    loadContacts() { console.log('Load contacts'); }
    loadGroups() { console.log('Load groups'); }
    loadSuggestedTokens() { console.log('Load tokens'); }
    loadGroupsForPersonalization() { console.log('Load groups for personalization'); }
    updateContactTagFilter() { console.log('Update contact tag filter'); }
    updateCategoryFilter() { console.log('Update category filter'); }
    sendManualBulk() { console.log('Send manual bulk'); }
    sendCSVBulk() { console.log('Send CSV bulk'); }
}

// Initialize the application
const app = new WhatsAppEnhanced();

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    app.showNotification('error', 'Application Error', 'An unexpected error occurred');
});