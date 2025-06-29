// Personalization management functions - handle variable replacement and personalized messaging
class PersonalizationManager {
    constructor(app) {
        this.app = app;
        this.suggestedTokens = [
            'name', 'phone', 'email', 'company', 'firstName', 'lastName',
            'city', 'country', 'date', 'time', 'amount', 'product', 'service'
        ];
        this.currentTemplate = null;
        this.currentVariables = [];
    }

    // Extract variables from template content
    extractVariables(content) {
        if (!content) return [];
        const matches = content.match(/\{\{([^}]+)\}\}/g);
        if (!matches) return [];
        
        const variables = matches.map(match => match.replace(/[{}]/g, '').trim());
        return [...new Set(variables)]; // Remove duplicates
    }

    // Get suggested tokens
    getSuggestedTokens() {
        return this.suggestedTokens;
    }

    // Load suggested tokens from server
    async loadSuggestedTokens() {
        try {
            this.app.debugLog('Loading suggested tokens...');
            const response = await fetch('/api/personalization/tokens');
            const result = await response.json();
            
            if (result.success && result.tokens) {
                this.suggestedTokens = [...new Set([...this.suggestedTokens, ...result.tokens])];
                this.displaySuggestedTokens();
                this.app.debugLog(`Loaded ${this.suggestedTokens.length} suggested tokens`);
            }
        } catch (error) {
            this.app.debugLog(`Error loading suggested tokens: ${error.message}`);
        }
    }

    // Display suggested tokens
    displaySuggestedTokens() {
        const container = document.getElementById('suggested-tokens');
        if (!container) return;
        
        container.innerHTML = this.suggestedTokens.map(token => 
            `<span class="badge bg-info me-1 mb-1 suggested-token" onclick="app.personalizationManager.insertToken('${token}')" style="cursor: pointer;">${token}</span>`
        ).join('');
    }

    // Insert token into active text area
    insertToken(token) {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
            const start = activeElement.selectionStart;
            const end = activeElement.selectionEnd;
            const text = activeElement.value;
            const before = text.substring(0, start);
            const after = text.substring(end);
            
            activeElement.value = before + `{{${token}}}` + after;
            activeElement.selectionStart = activeElement.selectionEnd = start + token.length + 4;
            activeElement.focus();
            
            // Trigger input event to update variable detection
            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
            
            this.app.showNotification('success', 'Token Inserted', `{{${token}}} added to message`);
        } else {
            this.app.showNotification('warning', 'No Target', 'Click in a text field first, then click a token to insert it');
        }
    }

    // Personalize message with contact data
    personalizeMessage(template, contact) {
        if (!template || !contact) return template;
        
        let personalizedMessage = template;
        
        // Replace common tokens
        const replacements = {
            'name': contact.name || contact.firstName + ' ' + (contact.lastName || ''),
            'firstName': contact.firstName || contact.name?.split(' ')[0] || '',
            'lastName': contact.lastName || contact.name?.split(' ').slice(1).join(' ') || '',
            'phone': contact.phone || '',
            'email': contact.email || '',
            'company': contact.company || '',
            'city': contact.city || '',
            'country': contact.country || '',
            'date': new Date().toLocaleDateString(),
            'time': new Date().toLocaleTimeString(),
            'amount': contact.amount || '',
            'product': contact.product || '',
            'service': contact.service || ''
        };
        
        // Add any custom fields from contact
        if (contact.customFields) {
            Object.assign(replacements, contact.customFields);
        }
        
        // Replace all variables in the template
        Object.keys(replacements).forEach(key => {
            const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
            personalizedMessage = personalizedMessage.replace(regex, replacements[key] || `{{${key}}}`);
        });
        
        return personalizedMessage;
    }

    // Show personalized message modal
    showPersonalizedMessageModal() {
        this.app.debugLog('Opening personalized message modal');
        
        const modal = new bootstrap.Modal(document.getElementById('personalized-message-modal'));
        
        // Load contacts for selection
        this.loadContactsForPersonalization();
        
        modal.show();
    }

    // Load contacts for personalization dropdown
    async loadContactsForPersonalization() {
        const select = document.getElementById('personalization-contact');
        if (!select) return;
        
        if (this.app.contactManager && this.app.contactManager.contacts) {
            const contacts = this.app.contactManager.contacts;
            
            select.innerHTML = '<option value="">Select a contact...</option>';
            contacts.forEach(contact => {
                const option = document.createElement('option');
                option.value = contact.id;
                option.textContent = `${contact.name} (${contact.phone})`;
                select.appendChild(option);
            });
        }
    }

    // Generate personalized preview
    generatePersonalizedPreview() {
        const contactSelect = document.getElementById('personalization-contact');
        const messageTextarea = document.getElementById('personalization-message');
        const previewDiv = document.getElementById('personalization-preview');
        
        if (!contactSelect || !messageTextarea || !previewDiv) return;
        
        const contactId = contactSelect.value;
        const template = messageTextarea.value;
        
        if (!contactId || !template) {
            previewDiv.innerHTML = '<em class="text-muted">Select a contact and enter a message to see preview</em>';
            return;
        }
        
        const contact = this.app.contactManager.contacts.find(c => c.id === contactId);
        if (!contact) {
            previewDiv.innerHTML = '<em class="text-danger">Contact not found</em>';
            return;
        }
        
        const personalizedMessage = this.personalizeMessage(template, contact);
        previewDiv.innerHTML = `<strong>Preview for ${contact.name}:</strong><br><div class="border p-2 bg-light mt-2">${this.escapeHtml(personalizedMessage)}</div>`;
    }

    // Send personalized message
    async sendPersonalizedMessage() {
        const contactSelect = document.getElementById('personalization-contact');
        const messageTextarea = document.getElementById('personalization-message');
        
        if (!contactSelect || !messageTextarea) return;
        
        const contactId = contactSelect.value;
        const template = messageTextarea.value.trim();
        
        if (!contactId) {
            this.app.showNotification('error', 'Validation Error', 'Please select a contact');
            return;
        }
        
        if (!template) {
            this.app.showNotification('error', 'Validation Error', 'Please enter a message');
            return;
        }
        
        const contact = this.app.contactManager.contacts.find(c => c.id === contactId);
        if (!contact) {
            this.app.showNotification('error', 'Contact Error', 'Selected contact not found');
            return;
        }
        
        const personalizedMessage = this.personalizeMessage(template, contact);
        
        try {
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    number: contact.phone, 
                    message: personalizedMessage 
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.app.showNotification('success', 'Message Sent', `Personalized message sent to ${contact.name}`);
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('personalized-message-modal'));
                modal.hide();
                
                // Reset form
                document.getElementById('personalized-form').reset();
                document.getElementById('personalization-preview').innerHTML = '<em class="text-muted">Select a contact and enter a message to see preview</em>';
            } else {
                this.app.showNotification('error', 'Send Failed', result.message);
            }
        } catch (error) {
            this.app.debugLog(`Personalized message send error: ${error.message}`);
            this.app.showNotification('error', 'Network Error', 'Failed to send personalized message');
        }
    }

    // Show bulk personalized message modal
    showBulkPersonalizedModal() {
        this.app.debugLog('Opening bulk personalized message modal');
        
        const modal = new bootstrap.Modal(document.getElementById('bulk-personalized-modal'));
        
        // Load groups for selection
        this.loadGroupsForPersonalization();
        
        modal.show();
    }

    // Load groups for personalization
    async loadGroupsForPersonalization() {
        const select = document.getElementById('bulk-personalization-group');
        if (!select) return;
        
        if (this.app.contactManager && this.app.contactManager.groups) {
            const groups = this.app.contactManager.groups;
            
            select.innerHTML = '<option value="">Select a group...</option><option value="all">All Contacts</option>';
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = `${group.name} (${group.contactCount || 0} contacts)`;
                select.appendChild(option);
            });
        }
    }

    // Generate bulk preview
    async generateBulkPreview() {
        const groupSelect = document.getElementById('bulk-personalization-group');
        const messageTextarea = document.getElementById('bulk-personalization-message');
        const previewDiv = document.getElementById('bulk-personalization-preview');
        const limitInput = document.getElementById('bulk-preview-limit');
        
        if (!groupSelect || !messageTextarea || !previewDiv) return;
        
        const groupId = groupSelect.value;
        const template = messageTextarea.value;
        const limit = parseInt(limitInput.value) || 3;
        
        if (!groupId || !template) {
            previewDiv.innerHTML = '<em class="text-muted">Select contacts and enter a message to see preview</em>';
            return;
        }
        
        let contacts = [];
        
        if (groupId === 'all') {
            contacts = this.app.contactManager.contacts.slice(0, limit);
        } else {
            // For now, show first few contacts (group contact loading would be implemented)
            contacts = this.app.contactManager.contacts.slice(0, limit);
        }
        
        if (contacts.length === 0) {
            previewDiv.innerHTML = '<em class="text-warning">No contacts found</em>';
            return;
        }
        
        const previews = contacts.map(contact => {
            const personalizedMessage = this.personalizeMessage(template, contact);
            return `
                <div class="border p-2 mb-2 bg-light">
                    <strong>${this.escapeHtml(contact.name)} (${this.escapeHtml(contact.phone)}):</strong><br>
                    ${this.escapeHtml(personalizedMessage)}
                </div>
            `;
        }).join('');
        
        previewDiv.innerHTML = `
            <strong>Preview for ${contacts.length} contacts:</strong>
            ${previews}
            ${contacts.length < this.app.contactManager.contacts.length ? '<em class="text-muted">...and more</em>' : ''}
        `;
    }

    // Send bulk personalized messages
    async sendBulkPersonalized() {
        const groupSelect = document.getElementById('bulk-personalization-group');
        const messageTextarea = document.getElementById('bulk-personalization-message');
        const delayInput = document.getElementById('bulk-personalization-delay');
        
        if (!groupSelect || !messageTextarea) return;
        
        const groupId = groupSelect.value;
        const template = messageTextarea.value.trim();
        const delay = parseInt(delayInput.value) || 2;
        
        if (!groupId) {
            this.app.showNotification('error', 'Validation Error', 'Please select a contact group');
            return;
        }
        
        if (!template) {
            this.app.showNotification('error', 'Validation Error', 'Please enter a message template');
            return;
        }
        
        let contacts = [];
        
        if (groupId === 'all') {
            contacts = this.app.contactManager.contacts;
        } else {
            // For now, use all contacts (group filtering would be implemented)
            contacts = this.app.contactManager.contacts;
        }
        
        if (contacts.length === 0) {
            this.app.showNotification('error', 'No Contacts', 'No contacts found to send messages to');
            return;
        }
        
        // Confirm bulk send
        if (!confirm(`Send personalized messages to ${contacts.length} contacts?`)) {
            return;
        }
        
        try {
            // Prepare personalized messages
            const personalizedMessages = contacts.map(contact => ({
                number: contact.phone,
                message: this.personalizeMessage(template, contact),
                contactName: contact.name
            }));
            
            const response = await fetch('/api/personalization/bulk-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: personalizedMessages,
                    delay: delay
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.app.showNotification('success', 'Bulk Send Started', `Personalized messages queued for ${contacts.length} contacts`);
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('bulk-personalized-modal'));
                modal.hide();
                
                // Reset form
                document.getElementById('bulk-personalized-form').reset();
                document.getElementById('bulk-personalization-preview').innerHTML = '<em class="text-muted">Select contacts and enter a message to see preview</em>';
            } else {
                this.app.showNotification('error', 'Bulk Send Failed', result.message);
            }
        } catch (error) {
            this.app.debugLog(`Bulk personalized send error: ${error.message}`);
            this.app.showNotification('error', 'Network Error', 'Failed to send bulk personalized messages');
        }
    }

    // Show template with personalization modal
    showTemplatePersonalizationModal(templateId) {
        const template = this.app.templateManager.templates.find(t => t.id === templateId);
        if (!template) {
            this.app.showNotification('error', 'Template Not Found', 'Template not found');
            return;
        }
        
        this.app.debugLog(`Opening template personalization for: ${template.name}`);
        
        const modal = new bootstrap.Modal(document.getElementById('template-personalization-modal'));
        
        // Set template info
        document.getElementById('template-personalization-name').textContent = template.name;
        document.getElementById('template-personalization-content').value = template.content;
        
        // Extract and display variables
        const variables = this.extractVariables(template.content);
        this.currentVariables = variables;
        this.displayTemplateVariables(variables);
        
        // Load contacts
        this.loadContactsForTemplatePersonalization();
        
        modal.show();
    }

    // Display template variables for input
    displayTemplateVariables(variables) {
        const container = document.getElementById('template-variables-input');
        if (!container) return;
        
        if (variables.length === 0) {
            container.innerHTML = '<em class="text-muted">No variables found in this template</em>';
            return;
        }
        
        container.innerHTML = variables.map(variable => `
            <div class="mb-2">
                <label class="form-label">${variable}</label>
                <input type="text" class="form-control template-variable-input" data-variable="${variable}" placeholder="Enter value for {{${variable}}}">
            </div>
        `).join('');
    }

    // Load contacts for template personalization
    loadContactsForTemplatePersonalization() {
        const select = document.getElementById('template-personalization-contact');
        if (!select) return;
        
        if (this.app.contactManager && this.app.contactManager.contacts) {
            const contacts = this.app.contactManager.contacts;
            
            select.innerHTML = '<option value="">Manual entry</option>';
            contacts.forEach(contact => {
                const option = document.createElement('option');
                option.value = contact.id;
                option.textContent = `${contact.name} (${contact.phone})`;
                select.appendChild(option);
            });
        }
    }

    // Auto-fill template variables from contact
    autoFillTemplateVariables() {
        const contactSelect = document.getElementById('template-personalization-contact');
        if (!contactSelect || !contactSelect.value) return;
        
        const contact = this.app.contactManager.contacts.find(c => c.id === contactSelect.value);
        if (!contact) return;
        
        // Auto-fill common variables
        const inputs = document.querySelectorAll('.template-variable-input');
        inputs.forEach(input => {
            const variable = input.dataset.variable.toLowerCase();
            
            switch (variable) {
                case 'name':
                    input.value = contact.name || '';
                    break;
                case 'phone':
                    input.value = contact.phone || '';
                    break;
                case 'email':
                    input.value = contact.email || '';
                    break;
                case 'firstname':
                    input.value = contact.name?.split(' ')[0] || '';
                    break;
                case 'lastname':
                    input.value = contact.name?.split(' ').slice(1).join(' ') || '';
                    break;
                default:
                    // Check if contact has this field
                    if (contact[variable]) {
                        input.value = contact[variable];
                    }
                    break;
            }
        });
        
        this.updateTemplatePreview();
    }

    // Update template preview with current variable values
    updateTemplatePreview() {
        const contentTextarea = document.getElementById('template-personalization-content');
        const previewDiv = document.getElementById('template-personalization-preview');
        
        if (!contentTextarea || !previewDiv) return;
        
        let template = contentTextarea.value;
        
        // Get all variable inputs
        const inputs = document.querySelectorAll('.template-variable-input');
        inputs.forEach(input => {
            const variable = input.dataset.variable;
            const value = input.value || `{{${variable}}}`;
            const regex = new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`, 'gi');
            template = template.replace(regex, value);
        });
        
        previewDiv.innerHTML = `<strong>Preview:</strong><br><div class="border p-2 bg-light mt-2">${this.escapeHtml(template)}</div>`;
    }

    // Send template with personalization
    async sendTemplatePersonalized() {
        const contactSelect = document.getElementById('template-personalization-contact');
        const phoneInput = document.getElementById('template-personalization-phone');
        const contentTextarea = document.getElementById('template-personalization-content');
        
        if (!contentTextarea) return;
        
        // Get phone number
        let phoneNumber = '';
        if (contactSelect && contactSelect.value) {
            const contact = this.app.contactManager.contacts.find(c => c.id === contactSelect.value);
            phoneNumber = contact ? contact.phone : '';
        } else if (phoneInput) {
            phoneNumber = phoneInput.value.trim();
        }
        
        if (!phoneNumber) {
            this.app.showNotification('error', 'Validation Error', 'Please select a contact or enter a phone number');
            return;
        }
        
        // Generate personalized message
        let message = contentTextarea.value;
        const inputs = document.querySelectorAll('.template-variable-input');
        inputs.forEach(input => {
            const variable = input.dataset.variable;
            const value = input.value || `{{${variable}}}`;
            const regex = new RegExp(`\\{\\{\\s*${variable}\\s*\\}\\}`, 'gi');
            message = message.replace(regex, value);
        });
        
        try {
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    number: phoneNumber, 
                    message: message 
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.app.showNotification('success', 'Template Sent', 'Personalized template message sent successfully');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('template-personalization-modal'));
                modal.hide();
            } else {
                this.app.showNotification('error', 'Send Failed', result.message);
            }
        } catch (error) {
            this.app.debugLog(`Template personalization send error: ${error.message}`);
            this.app.showNotification('error', 'Network Error', 'Failed to send personalized template');
        }
    }

    // Utility function to escape HTML
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PersonalizationManager;
}
