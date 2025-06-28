// Template management functions - separate from main app logic
class TemplateManager {
    constructor(app) {
        this.app = app;
        this.templates = [];
        this.categories = new Set();
        this.currentTemplate = null;
    }

    // Show template creation/edit modal
    showTemplateModal(templateId = null) {
        this.app.debugLog('Opening template modal');
        
        const modal = new bootstrap.Modal(document.getElementById('template-form-modal'));
        const titleElement = document.getElementById('template-form-title');
        const form = document.getElementById('template-form');
        
        if (templateId) {
            // Edit mode
            this.currentTemplate = this.templates.find(t => t.id === templateId);
            if (!this.currentTemplate) {
                this.app.showNotification('error', 'Template Not Found', 'Template not found');
                return;
            }
            
            titleElement.textContent = 'Edit Template';
            document.getElementById('template-id').value = templateId;
            document.getElementById('template-name').value = this.currentTemplate.name;
            document.getElementById('template-category').value = this.currentTemplate.category || '';
            document.getElementById('template-content').value = this.currentTemplate.content;
            
            this.detectTemplateVariables();
        } else {
            // Create mode
            titleElement.textContent = 'Create Template';
            form.reset();
            document.getElementById('template-id').value = '';
            this.detectTemplateVariables();
        }
        
        modal.show();
    }

    // Detect template variables
    detectTemplateVariables() {
        const content = document.getElementById('template-content').value;
        const variableElement = document.getElementById('detected-variables');
        
        // Find variables in {{variable}} format
        const matches = content.match(/\{\{([^}]+)\}\}/g);
        
        if (matches && matches.length > 0) {
            const variables = matches.map(match => match.replace(/[{}]/g, ''));
            const uniqueVariables = [...new Set(variables)];
            
            variableElement.innerHTML = `
                <strong>Variables found:</strong><br>
                ${uniqueVariables.map(v => `<span class="badge bg-info me-1">${v}</span>`).join('')}
            `;
            variableElement.className = 'alert alert-success';
        } else {
            variableElement.innerHTML = 'No variables detected. Use {{variableName}} to add personalization.';
            variableElement.className = 'alert alert-info';
        }
    }

    // Save template
    async saveTemplate() {
        this.app.debugLog('Saving template...');
        
        const templateId = document.getElementById('template-id').value;
        const name = document.getElementById('template-name').value.trim();
        const category = document.getElementById('template-category').value.trim();
        const content = document.getElementById('template-content').value.trim();
        
        // Validation
        if (!name || !content) {
            this.app.showNotification('error', 'Validation Error', 'Template name and content are required');
            return;
        }
        
        const templateData = {
            name,
            category: category || 'General',
            content
        };
        
        try {
            let response;
            if (templateId) {
                // Update existing template
                response = await fetch(`/api/templates/${templateId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(templateData)
                });
            } else {
                // Create new template
                response = await fetch('/api/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(templateData)
                });
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.app.showNotification('success', 'Template Saved', result.message);
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('template-form-modal'));
                modal.hide();
                
                // Reload templates
                await this.loadTemplates();
            } else {
                this.app.showNotification('error', 'Save Failed', result.message);
            }
        } catch (error) {
            this.app.debugLog(`Template save error: ${error.message}`);
            this.app.showNotification('error', 'Network Error', 'Failed to save template');
        }
    }

    // Load templates
    async loadTemplates() {
        try {
            this.app.debugLog('Loading templates...');
            const response = await fetch('/api/templates');
            const result = await response.json();
            
            if (result.success) {
                this.templates = result.templates || [];
                this.updateCategories();
                this.displayTemplates();
                this.updateCategoryFilter();
                this.app.debugLog(`Loaded ${this.templates.length} templates`);
            } else {
                this.app.debugLog(`Failed to load templates: ${result.message}`);
                this.templates = [];
                this.displayTemplates();
            }
        } catch (error) {
            this.app.debugLog(`Error loading templates: ${error.message}`);
            this.templates = [];
            this.displayTemplates();
        }
    }

    // Update categories set
    updateCategories() {
        this.categories.clear();
        this.templates.forEach(template => {
            if (template.category) {
                this.categories.add(template.category);
            }
        });
    }

    // Display templates
    displayTemplates() {
        const container = document.getElementById('templates-list');
        if (!container) return;
        
        if (this.templates.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-4">
                        <i class="bi bi-file-text" style="font-size: 3rem; color: #6c757d;"></i>
                        <h5 class="mt-3 text-muted">No templates found</h5>
                        <p class="text-muted">Create your first template to get started!</p>
                        <button class="btn btn-primary" onclick="app.templateManager.showTemplateModal()">
                            <i class="bi bi-plus-circle"></i> Create Template
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.templates.map(template => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card template-card h-100">
                    <div class="card-body">
                        <h6 class="card-title">${this.escapeHtml(template.name)}</h6>
                        <span class="badge bg-primary mb-2">${this.escapeHtml(template.category || 'General')}</span>
                        <p class="card-text small">${this.escapeHtml(template.content.substring(0, 100))}${template.content.length > 100 ? '...' : ''}</p>
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-outline-primary" onclick="app.templateManager.editTemplate('${template.id}')">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="app.templateManager.useTemplate('${template.id}')">
                                <i class="bi bi-play"></i> Use
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="app.templateManager.deleteTemplate('${template.id}')">
                                <i class="bi bi-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Update category filter
    updateCategoryFilter() {
        const filterElement = document.getElementById('category-filter');
        if (!filterElement) return;
        
        const currentValue = filterElement.value;
        
        filterElement.innerHTML = '<option value="">All Categories</option>';
        
        [...this.categories].sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            if (category === currentValue) {
                option.selected = true;
            }
            filterElement.appendChild(option);
        });
    }

    // Filter templates by category
    filterTemplatesByCategory(category) {
        this.app.debugLog(`Filtering templates by category: ${category}`);
        
        let filteredTemplates = this.templates;
        if (category) {
            filteredTemplates = this.templates.filter(template => template.category === category);
        }
        
        const container = document.getElementById('templates-list');
        if (!container) return;
        
        if (filteredTemplates.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-4">
                        <i class="bi bi-search" style="font-size: 3rem; color: #6c757d;"></i>
                        <h5 class="mt-3 text-muted">No templates found</h5>
                        <p class="text-muted">No templates match the selected category.</p>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredTemplates.map(template => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card template-card h-100">
                    <div class="card-body">
                        <h6 class="card-title">${this.escapeHtml(template.name)}</h6>
                        <span class="badge bg-primary mb-2">${this.escapeHtml(template.category || 'General')}</span>
                        <p class="card-text small">${this.escapeHtml(template.content.substring(0, 100))}${template.content.length > 100 ? '...' : ''}</p>
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-outline-primary" onclick="app.templateManager.editTemplate('${template.id}')">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="app.templateManager.useTemplate('${template.id}')">
                                <i class="bi bi-play"></i> Use
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="app.templateManager.deleteTemplate('${template.id}')">
                                <i class="bi bi-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Edit template
    editTemplate(templateId) {
        this.app.debugLog(`Editing template: ${templateId}`);
        this.showTemplateModal(templateId);
    }

    // Use template (placeholder for now)
    useTemplate(templateId) {
        this.app.debugLog(`Using template: ${templateId}`);
        const template = this.templates.find(t => t.id === templateId);
        if (template) {
            this.app.showNotification('info', 'Template Selected', `Template "${template.name}" selected. Template usage will be implemented in the next step.`);
        }
    }

    // Delete template
    async deleteTemplate(templateId) {
        this.app.debugLog(`Deleting template: ${templateId}`);
        
        const template = this.templates.find(t => t.id === templateId);
        if (!template) {
            this.app.showNotification('error', 'Template Not Found', 'Template not found');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/templates/${templateId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.app.showNotification('success', 'Template Deleted', result.message);
                await this.loadTemplates();
            } else {
                this.app.showNotification('error', 'Delete Failed', result.message);
            }
        } catch (error) {
            this.app.debugLog(`Template delete error: ${error.message}`);
            this.app.showNotification('error', 'Network Error', 'Failed to delete template');
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
    module.exports = TemplateManager;
}
