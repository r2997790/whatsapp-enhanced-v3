// Personalization management functions - handle variable replacement and personalized messaging
class PersonalizationManager {
    constructor(app) {
        this.app = app;
        this.suggestedTokens = [
            'name', 'phone', 'email', 'company', 'first_name', 'last_name',
            'city', 'country', 'current_date', 'current_time', 'amount', 'product', 'service'
        ];
        this.currentTemplate = null;
        this.currentVariables = [];
        this.selectedContacts = [];
        this.currentRecipientType = '';
    }

    // Extract variables from template content
    extractVariables(content) {
        if (!content) return [];
        const matches = content.match(/\{\{([^}]+)\}\}/g);
        if (!matches) return [];
        
        const variables = matches.map(match => match.replace(/[{}]/g, '').trim());
        return [...new Set(variables)]; // Remove duplicates
    }

    // Load templates for selector
    loadTemplatesForSelector() {
        const select = document.getElementById('personalization-template-select');
        if (!select || !this.app.templateManager) return;

        select.innerHTML = '<option value="">Create new message or select template...</option>';
        
        if (this.app.templateManager.templates) {
            this.app.templateManager.templates.forEach(template => {
                const option = document.createElement('option');
                option.value = template.id;
                option.textContent = `${template.name} (${template.category || 'General'})`;
                select.appendChild(option);
            });
        }

        select.onchange = () => {
            const templateId = select.value;
            if (templateId) {
                const template = this.app.templateManager.templates.find(t => t.id === templateId);
                if (template) {
                    this.loadTemplate(template);
                }
            } else {
                this.clearTemplateSelection();
            }
        };
    }

    // Load template into message composer
    loadTemplate(template) {
        const messageTextarea = document.getElementById('personalization-message');
        if (messageTextarea) {
            messageTextarea.value = template.content;
            this.currentTemplate = template;
            this.generatePersonalizedPreview();
            this.updatePersonalizationStats();
        }
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
            
            // Update stats if in main personalization tab
            this.updatePersonalizationStats();
        } else {
            this.app.showNotification('warning', 'No Target', 'Click in a text field first, then click a token to insert it');
        }
    }

    // Update personalization statistics
    updatePersonalizationStats() {
        const messageElement = document.getElementById('personalization-message');
        if (!messageElement) return;

        const message = messageElement.value;
        const tokens = this.extractVariables(message);
        
        // Update token count
        const tokenCountElement = document.getElementById('message-tokens-count');
        if (tokenCountElement) {
            tokenCountElement.textContent = tokens.length;
        }

        // Update selected recipients count
        const recipientCountElement = document.getElementById('selected-recipients-count');
        if (recipientCountElement) {
            recipientCountElement.textContent = this.selectedContacts.length;
        }
    }

    // Clear template selection
    clearTemplateSelection() {
        const templateSelect = document.getElementById('personalization-template-select');
        const messageTextarea = document.getElementById('personalization-message');
        
        if (templateSelect) templateSelect.value = '';
        if (messageTextarea) messageTextarea.value = '';
        
        this.currentTemplate = null;
        this.generatePersonalizedPreview();
        this.updatePersonalizationStats();
    }

    // Clear all form data
    clearAll() {
        this.clearTemplateSelection();
        
        const recipientType = document.getElementById('personalization-recipient-type');
        const recipients = document.getElementById('personalization-recipients');
        const contactSelection = document.getElementById('personalization-contact-selection');
        const preview = document.getElementById('personalization-preview');
        const sendBtn = document.getElementById('send-personalized-btn');
        
        if (recipientType) recipientType.value = '';
        if (recipients) recipients.style.display = 'none';
        if (contactSelection) contactSelection.style.display = 'none';
        if (sendBtn) sendBtn.disabled = true;
        
        this.selectedContacts = [];
        this.currentRecipientType = '';
        
        if (preview) {
            preview.innerHTML = '<em class="text-muted">Enter a message and select recipients to see personalized previews</em>';
        }
        
        this.updatePersonalizationStats();
    }

    // Show personalized message modal
    showPersonalizedMessageModal() {
        this.app.debugLog('Opening personalized message modal');
        
        const modal = new bootstrap.Modal(document.getElementById('personalized-message-modal'));
        
        // Load contacts for selection
        this.loadContactsForPersonalization();
        
        modal.show();
    }

    // Show bulk personalized modal
    showBulkPersonalizedModal() {
        this.app.debugLog('Opening bulk personalized message modal');
        
        const modal = new bootstrap.Modal(document.getElementById('bulk-personalized-modal'));
        
        // Load groups for selection
        this.loadGroupsForPersonalization();
        
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
        const limit = parseInt(limitInput?.value) || 3;
        
        if (!groupId || !template) {
            previewDiv.innerHTML = '<em class="text-muted">Select contacts and enter a message to see preview</em>';
            return;
        }
        
        let contacts = [];
        
        if (groupId === 'all') {
            contacts = this.app.contactManager?.contacts?.slice(0, limit) || [];
        } else {
            // For now, show first few contacts (group contact loading would be implemented)
            contacts = this.app.contactManager?.contacts?.slice(0, limit) || [];
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
        
        const totalContacts = this.app.contactManager?.contacts?.length || 0;
        previewDiv.innerHTML = `
            <strong>Preview for ${contacts.length} contacts:</strong>
            ${previews}
            ${contacts.length < totalContacts ? '<em class="text-muted">...and more</em>' : ''}
        `;
    }

    // Handle recipient type change
    onRecipientTypeChange() {
        const recipientType = document.getElementById('personalization-recipient-type').value;
        const recipientsSelect = document.getElementById('personalization-recipients');
        const multipleContactsDiv = document.getElementById('personalization-multiple-contacts');
        const contactSelectionDiv = document.getElementById('personalization-contact-selection');
        const sendBtn = document.getElementById('send-personalized-btn');

        this.currentRecipientType = recipientType;
        this.selectedContacts = [];

        // Hide all options first
        if (recipientsSelect) recipientsSelect.style.display = 'none';
        if (multipleContactsDiv) multipleContactsDiv.style.display = 'none';
        if (contactSelectionDiv) contactSelectionDiv.style.display = 'none';
        
        if (sendBtn) sendBtn.disabled = true;

        switch (recipientType) {
            case 'single':
                if (recipientsSelect) recipientsSelect.style.display = 'block';
                this.loadSingleContactOptions();
                break;
            case 'multiple':
                if (multipleContactsDiv) multipleContactsDiv.style.display = 'block';
                if (contactSelectionDiv) contactSelectionDiv.style.display = 'block';
                this.loadMultipleContactSelection();
                break;
            case 'group':
                if (recipientsSelect) recipientsSelect.style.display = 'block';
                this.loadGroupOptions();
                break;
            case 'all':
                this.selectedContacts = this.app.contactManager?.contacts || [];
                this.generatePersonalizedPreview();
                if (sendBtn) sendBtn.disabled = false;
                break;
        }

        this.updatePersonalizationStats();
    }

    // Send personalized messages
    async sendPersonalizedMessages() {
        const messageElement = document.getElementById('personalization-message');
        const delayElement = document.getElementById('message-delay');
        
        if (!messageElement) return;

        const message = messageElement.value.trim();
        const delay = parseInt(delayElement?.value) || 2;

        if (!message) {
            this.app.showNotification('error', 'Validation Error', 'Please enter a message');
            return;
        }

        if (this.selectedContacts.length === 0) {
            this.app.showNotification('error', 'Validation Error', 'Please select recipients');
            return;
        }

        // Confirm bulk send
        if (this.selectedContacts.length > 1) {
            if (!confirm(`Send personalized messages to ${this.selectedContacts.length} contacts?`)) {
                return;
            }
        }

        try {
            // Prepare personalized messages
            const personalizedMessages = this.selectedContacts.map(contact => ({
                number: contact.phone,
                message: this.personalizeMessage(message, contact),
                contactName: contact.name
            }));

            const response = await fetch('/api/personalization/bulk-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: personalizedMessages,
                    delay: delay * 1000 // Convert to milliseconds
                })
            });

            const result = await response.json();

            if (result.success) {
                this.app.showNotification('success', 'Messages Sent', 
                    `Personalized messages sent to ${this.selectedContacts.length} recipient${this.selectedContacts.length !== 1 ? 's' : ''}`);
                
                // Reset form
                this.clearAll();
            } else {
                this.app.showNotification('error', 'Send Failed', result.message);
            }
        } catch (error) {
            this.app.debugLog(`Personalized send error: ${error.message}`);
            this.app.showNotification('error', 'Network Error', 'Failed to send personalized messages');
        }
    }

    // Generate personalized preview for main tab
    generatePersonalizedPreview() {
        const messageElement = document.getElementById('personalization-message');
        const previewElement = document.getElementById('personalization-preview');
        const limitElement = document.getElementById('preview-limit');
        
        if (!messageElement || !previewElement) return;

        const message = messageElement.value.trim();
        const limit = parseInt(limitElement?.value) || 3;

        if (!message) {
            previewElement.innerHTML = '<em class="text-muted">Enter a message to see preview</em>';
            return;
        }

        if (this.selectedContacts.length === 0) {
            previewElement.innerHTML = '<em class="text-muted">Select recipients to see personalized previews</em>';
            return;
        }

        // Generate previews for limited number of contacts
        const contactsToPreview = this.selectedContacts.slice(0, limit);
        const previews = contactsToPreview.map(contact => {
            const personalizedMessage = this.personalizeMessage(message, contact);
            return `
                <div class="border p-2 mb-2 bg-white rounded">
                    <strong>${this.escapeHtml(contact.name)}</strong> 
                    <small class="text-muted">(${this.escapeHtml(contact.phone)})</small>
                    <div class="mt-1 text-dark">${this.escapeHtml(personalizedMessage)}</div>
                </div>
            `;
        }).join('');

        const totalCount = this.selectedContacts.length;
        const moreText = totalCount > limit ? 
            `<div class="text-center mt-2"><em class="text-muted">...and ${totalCount - limit} more recipients</em></div>` : '';

        previewElement.innerHTML = `
            <div class="mb-2"><strong>Preview for ${totalCount} recipient${totalCount !== 1 ? 's' : ''}:</strong></div>
            ${previews}
            ${moreText}
        `;
    }

    // Personalize message with contact data
    personalizeMessage(template, contact) {
        if (!template || !contact) return template;
        
        let personalizedMessage = template;
        
        // Replace common tokens
        const replacements = {
            'name': contact.name || contact.firstName + ' ' + (contact.lastName || ''),
            'first_name': contact.firstName || contact.name?.split(' ')[0] || '',
            'last_name': contact.lastName || contact.name?.split(' ').slice(1).join(' ') || '',
            'phone': contact.phone || '',
            'email': contact.email || '',
            'company': contact.company || '',
            'city': contact.city || '',
            'country': contact.country || '',
            'current_date': new Date().toLocaleDateString(),
            'current_time': new Date().toLocaleTimeString(),
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