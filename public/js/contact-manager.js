// Contact management functions - separate from main app logic
class ContactManager {
    constructor(app) {
        this.app = app;
        this.contacts = [];
        this.groups = [];
        this.tags = new Set();
        this.currentContact = null;
        this.currentGroup = null;
    }

    // Load contacts from server
    async loadContacts() {
        try {
            this.app.debugLog('Loading contacts...');
            const response = await fetch('/api/contacts');
            const result = await response.json();
            
            if (result.success) {
                this.contacts = result.contacts || [];
                this.updateTags();
                this.displayContacts();
                this.updateTagFilter();
                this.app.debugLog(`Loaded ${this.contacts.length} contacts`);
            } else {
                this.app.debugLog(`Failed to load contacts: ${result.message}`);
                this.contacts = [];
                this.displayContacts();
            }
        } catch (error) {
            this.app.debugLog(`Error loading contacts: ${error.message}`);
            this.contacts = [];
            this.displayContacts();
        }
    }

    // Load groups from server
    async loadGroups() {
        try {
            this.app.debugLog('Loading groups...');
            const response = await fetch('/api/groups');
            const result = await response.json();
            
            if (result.success) {
                this.groups = result.groups || [];
                this.displayGroups();
                this.app.debugLog(`Loaded ${this.groups.length} groups`);
            } else {
                this.app.debugLog(`Failed to load groups: ${result.message}`);
                this.groups = [];
                this.displayGroups();
            }
        } catch (error) {
            this.app.debugLog(`Error loading groups: ${error.message}`);
            this.groups = [];
            this.displayGroups();
        }
    }

    // Update tags set
    updateTags() {
        this.tags.clear();
        this.contacts.forEach(contact => {
            if (contact.tags && Array.isArray(contact.tags)) {
                contact.tags.forEach(tag => this.tags.add(tag));
            }
        });
    }

    // Display contacts
    displayContacts() {
        const container = document.getElementById('contacts-list');
        if (!container) return;
        
        if (this.contacts.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-4">
                        <i class="bi bi-person-plus" style="font-size: 3rem; color: #6c757d;"></i>
                        <h5 class="mt-3 text-muted">No contacts found</h5>
                        <p class="text-muted">Add your first contact to get started!</p>
                        <button class="btn btn-primary" onclick="app.contactManager.showAddContactModal()">
                            <i class="bi bi-plus-circle"></i> Add Contact
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.contacts.map(contact => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card contact-card h-100">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-2">
                            <div class="contact-avatar me-3">
                                <i class="bi bi-person-circle" style="font-size: 2rem; color: #007bff;"></i>
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="card-title mb-1">${this.escapeHtml(contact.name)}</h6>
                                <small class="text-muted">${this.escapeHtml(contact.phone)}</small>
                            </div>
                        </div>
                        
                        ${contact.email ? `<p class="card-text small mb-2"><i class="bi bi-envelope"></i> ${this.escapeHtml(contact.email)}</p>` : ''}
                        
                        ${contact.tags && contact.tags.length > 0 ? `
                            <div class="mb-2">
                                ${contact.tags.map(tag => `<span class="badge bg-secondary me-1">${this.escapeHtml(tag)}</span>`).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-outline-primary" onclick="app.contactManager.editContact('${contact.id}')">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="app.contactManager.messageContact('${contact.id}')">
                                <i class="bi bi-chat"></i> Message
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="app.contactManager.deleteContact('${contact.id}')">
                                <i class="bi bi-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Display groups
    displayGroups() {
        const container = document.getElementById('groups-list');
        if (!container) return;
        
        if (this.groups.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-4">
                        <i class="bi bi-people" style="font-size: 3rem; color: #6c757d;"></i>
                        <h5 class="mt-3 text-muted">No groups found</h5>
                        <p class="text-muted">Create your first group to organize contacts!</p>
                        <button class="btn btn-primary" onclick="app.contactManager.showCreateGroupModal()">
                            <i class="bi bi-plus-circle"></i> Create Group
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.groups.map(group => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card group-card h-100">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-2">
                            <div class="group-icon me-3">
                                <i class="bi bi-people-fill" style="font-size: 2rem; color: #28a745;"></i>
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="card-title mb-1">${this.escapeHtml(group.name)}</h6>
                                <small class="text-muted">${group.contactCount || 0} contacts</small>
                            </div>
                        </div>
                        
                        ${group.description ? `<p class="card-text small mb-2">${this.escapeHtml(group.description)}</p>` : ''}
                        
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-outline-primary" onclick="app.contactManager.editGroup('${group.id}')">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="app.contactManager.messageGroup('${group.id}')">
                                <i class="bi bi-chat"></i> Message
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="app.contactManager.deleteGroup('${group.id}')">
                                <i class="bi bi-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Show add contact modal
    showAddContactModal() {
        this.app.debugLog('Opening add contact modal');
        
        const modal = new bootstrap.Modal(document.getElementById('contact-form-modal'));
        const titleElement = document.getElementById('contact-form-title');
        const form = document.getElementById('contact-form');
        
        titleElement.textContent = 'Add Contact';
        form.reset();
        document.getElementById('contact-id').value = '';
        
        modal.show();
    }

    // Show edit contact modal
    editContact(contactId) {
        this.app.debugLog(`Editing contact: ${contactId}`);
        
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) {
            this.app.showNotification('error', 'Contact Not Found', 'Contact not found');
            return;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('contact-form-modal'));
        const titleElement = document.getElementById('contact-form-title');
        
        titleElement.textContent = 'Edit Contact';
        document.getElementById('contact-id').value = contactId;
        document.getElementById('contact-name').value = contact.name;
        document.getElementById('contact-phone').value = contact.phone;
        document.getElementById('contact-email').value = contact.email || '';
        document.getElementById('contact-tags').value = contact.tags ? contact.tags.join(', ') : '';
        
        modal.show();
    }

    // Save contact
    async saveContact() {
        this.app.debugLog('Saving contact...');
        
        const contactId = document.getElementById('contact-id').value;
        const name = document.getElementById('contact-name').value.trim();
        const phone = document.getElementById('contact-phone').value.trim();
        const email = document.getElementById('contact-email').value.trim();
        const tagsString = document.getElementById('contact-tags').value.trim();
        
        // Validation
        if (!name || !phone) {
            this.app.showNotification('error', 'Validation Error', 'Name and phone number are required');
            return;
        }
        
        const contactData = {
            name,
            phone,
            email: email || null,
            tags: tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []
        };
        
        try {
            let response;
            if (contactId) {
                // Update existing contact
                response = await fetch(`/api/contacts/${contactId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(contactData)
                });
            } else {
                // Create new contact
                response = await fetch('/api/contacts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(contactData)
                });
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.app.showNotification('success', 'Contact Saved', result.message);
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('contact-form-modal'));
                modal.hide();
                
                // Reload contacts
                await this.loadContacts();
            } else {
                this.app.showNotification('error', 'Save Failed', result.message);
            }
        } catch (error) {
            this.app.debugLog(`Contact save error: ${error.message}`);
            this.app.showNotification('error', 'Network Error', 'Failed to save contact');
        }
    }

    // Delete contact
    async deleteContact(contactId) {
        this.app.debugLog(`Deleting contact: ${contactId}`);
        
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) {
            this.app.showNotification('error', 'Contact Not Found', 'Contact not found');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete "${contact.name}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/contacts/${contactId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.app.showNotification('success', 'Contact Deleted', result.message);
                await this.loadContacts();
            } else {
                this.app.showNotification('error', 'Delete Failed', result.message);
            }
        } catch (error) {
            this.app.debugLog(`Contact delete error: ${error.message}`);
            this.app.showNotification('error', 'Network Error', 'Failed to delete contact');
        }
    }

    // Message contact
    messageContact(contactId) {
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) {
            this.app.showNotification('error', 'Contact Not Found', 'Contact not found');
            return;
        }
        
        // Fill in quick send form
        document.getElementById('phone-number').value = contact.phone;
        document.getElementById('message').focus();
        
        // Switch to first tab
        const firstTab = document.querySelector('[data-bs-target="#bulk-messaging"]');
        if (firstTab) {
            firstTab.click();
        }
        
        this.app.showNotification('info', 'Contact Selected', `Phone number filled for ${contact.name}`);
    }

    // Show create group modal
    showCreateGroupModal() {
        this.app.debugLog('Opening create group modal');
        
        const modal = new bootstrap.Modal(document.getElementById('group-form-modal'));
        const titleElement = document.getElementById('group-form-title');
        const form = document.getElementById('group-form');
        
        titleElement.textContent = 'Create Group';
        form.reset();
        document.getElementById('group-id').value = '';
        
        modal.show();
    }

    // Edit group
    editGroup(groupId) {
        this.app.debugLog(`Editing group: ${groupId}`);
        
        const group = this.groups.find(g => g.id === groupId);
        if (!group) {
            this.app.showNotification('error', 'Group Not Found', 'Group not found');
            return;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('group-form-modal'));
        const titleElement = document.getElementById('group-form-title');
        
        titleElement.textContent = 'Edit Group';
        document.getElementById('group-id').value = groupId;
        document.getElementById('group-name').value = group.name;
        document.getElementById('group-description').value = group.description || '';
        
        modal.show();
    }

    // Save group
    async saveGroup() {
        this.app.debugLog('Saving group...');
        
        const groupId = document.getElementById('group-id').value;
        const name = document.getElementById('group-name').value.trim();
        const description = document.getElementById('group-description').value.trim();
        
        // Validation
        if (!name) {
            this.app.showNotification('error', 'Validation Error', 'Group name is required');
            return;
        }
        
        const groupData = {
            name,
            description: description || null
        };
        
        try {
            let response;
            if (groupId) {
                // Update existing group
                response = await fetch(`/api/groups/${groupId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(groupData)
                });
            } else {
                // Create new group
                response = await fetch('/api/groups', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(groupData)
                });
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.app.showNotification('success', 'Group Saved', result.message);
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('group-form-modal'));
                modal.hide();
                
                // Reload groups
                await this.loadGroups();
            } else {
                this.app.showNotification('error', 'Save Failed', result.message);
            }
        } catch (error) {
            this.app.debugLog(`Group save error: ${error.message}`);
            this.app.showNotification('error', 'Network Error', 'Failed to save group');
        }
    }

    // Delete group
    async deleteGroup(groupId) {
        this.app.debugLog(`Deleting group: ${groupId}`);
        
        const group = this.groups.find(g => g.id === groupId);
        if (!group) {
            this.app.showNotification('error', 'Group Not Found', 'Group not found');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete the group "${group.name}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/groups/${groupId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.app.showNotification('success', 'Group Deleted', result.message);
                await this.loadGroups();
            } else {
                this.app.showNotification('error', 'Delete Failed', result.message);
            }
        } catch (error) {
            this.app.debugLog(`Group delete error: ${error.message}`);
            this.app.showNotification('error', 'Network Error', 'Failed to delete group');
        }
    }

    // Message group
    messageGroup(groupId) {
        const group = this.groups.find(g => g.id === groupId);
        if (!group) {
            this.app.showNotification('error', 'Group Not Found', 'Group not found');
            return;
        }
        
        this.app.showNotification('info', 'Group Selected', `Group messaging for "${group.name}" will be implemented in the next step`);
    }

    // Update tag filter
    updateTagFilter() {
        const filterElement = document.getElementById('contact-tag-filter');
        if (!filterElement) return;
        
        const currentValue = filterElement.value;
        
        filterElement.innerHTML = '<option value="">All Tags</option>';
        
        [...this.tags].sort().forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            if (tag === currentValue) {
                option.selected = true;
            }
            filterElement.appendChild(option);
        });
    }

    // Filter contacts by tag
    filterContactsByTag(tag) {
        this.app.debugLog(`Filtering contacts by tag: ${tag}`);
        
        let filteredContacts = this.contacts;
        if (tag) {
            filteredContacts = this.contacts.filter(contact => 
                contact.tags && contact.tags.includes(tag)
            );
        }
        
        const container = document.getElementById('contacts-list');
        if (!container) return;
        
        if (filteredContacts.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-4">
                        <i class="bi bi-search" style="font-size: 3rem; color: #6c757d;"></i>
                        <h5 class="mt-3 text-muted">No contacts found</h5>
                        <p class="text-muted">No contacts match the selected tag.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        // Re-render with filtered contacts (similar to displayContacts but with filteredContacts)
        container.innerHTML = filteredContacts.map(contact => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card contact-card h-100">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-2">
                            <div class="contact-avatar me-3">
                                <i class="bi bi-person-circle" style="font-size: 2rem; color: #007bff;"></i>
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="card-title mb-1">${this.escapeHtml(contact.name)}</h6>
                                <small class="text-muted">${this.escapeHtml(contact.phone)}</small>
                            </div>
                        </div>
                        
                        ${contact.email ? `<p class="card-text small mb-2"><i class="bi bi-envelope"></i> ${this.escapeHtml(contact.email)}</p>` : ''}
                        
                        ${contact.tags && contact.tags.length > 0 ? `
                            <div class="mb-2">
                                ${contact.tags.map(tag => `<span class="badge bg-secondary me-1">${this.escapeHtml(tag)}</span>`).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-outline-primary" onclick="app.contactManager.editContact('${contact.id}')">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="app.contactManager.messageContact('${contact.id}')">
                                <i class="bi bi-chat"></i> Message
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="app.contactManager.deleteContact('${contact.id}')">
                                <i class="bi bi-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Search contacts
    searchContacts(searchTerm) {
        this.app.debugLog(`Searching contacts for: ${searchTerm}`);
        
        if (!searchTerm.trim()) {
            this.displayContacts();
            return;
        }
        
        const term = searchTerm.toLowerCase();
        const filteredContacts = this.contacts.filter(contact => 
            contact.name.toLowerCase().includes(term) ||
            contact.phone.includes(term) ||
            (contact.email && contact.email.toLowerCase().includes(term))
        );
        
        const container = document.getElementById('contacts-list');
        if (!container) return;
        
        if (filteredContacts.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-4">
                        <i class="bi bi-search" style="font-size: 3rem; color: #6c757d;"></i>
                        <h5 class="mt-3 text-muted">No contacts found</h5>
                        <p class="text-muted">No contacts match your search.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        // Re-render with filtered contacts
        container.innerHTML = filteredContacts.map(contact => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card contact-card h-100">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-2">
                            <div class="contact-avatar me-3">
                                <i class="bi bi-person-circle" style="font-size: 2rem; color: #007bff;"></i>
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="card-title mb-1">${this.escapeHtml(contact.name)}</h6>
                                <small class="text-muted">${this.escapeHtml(contact.phone)}</small>
                            </div>
                        </div>
                        
                        ${contact.email ? `<p class="card-text small mb-2"><i class="bi bi-envelope"></i> ${this.escapeHtml(contact.email)}</p>` : ''}
                        
                        ${contact.tags && contact.tags.length > 0 ? `
                            <div class="mb-2">
                                ${contact.tags.map(tag => `<span class="badge bg-secondary me-1">${this.escapeHtml(tag)}</span>`).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-outline-primary" onclick="app.contactManager.editContact('${contact.id}')">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="app.contactManager.messageContact('${contact.id}')">
                                <i class="bi bi-chat"></i> Message
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="app.contactManager.deleteContact('${contact.id}')">
                                <i class="bi bi-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Import contacts from CSV
    async importContacts() {
        this.app.debugLog('Importing contacts from CSV...');
        
        const fileInput = document.getElementById('import-file');
        if (!fileInput.files[0]) {
            this.app.showNotification('error', 'Validation Error', 'Please select a CSV file');
            return;
        }
        
        const formData = new FormData();
        formData.append('csvFile', fileInput.files[0]);
        
        try {
            const response = await fetch('/api/contacts/import', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.app.showNotification('success', 'Import Successful', result.message);
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('import-contacts-modal'));
                modal.hide();
                
                // Reload contacts
                await this.loadContacts();
            } else {
                this.app.showNotification('error', 'Import Failed', result.message);
            }
        } catch (error) {
            this.app.debugLog(`Contact import error: ${error.message}`);
            this.app.showNotification('error', 'Network Error', 'Failed to import contacts');
        }
    }

    // Show import contacts modal
    showImportContactsModal() {
        this.app.debugLog('Opening import contacts modal');
        const modal = new bootstrap.Modal(document.getElementById('import-contacts-modal'));
        modal.show();
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
    module.exports = ContactManager;
}
