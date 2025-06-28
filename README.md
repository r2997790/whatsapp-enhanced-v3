# WhatsApp Enhanced v3

A comprehensive WhatsApp messaging platform with advanced features for bulk messaging, templates, contact management, and personalization.

## 🚀 Live Demo

**Deployed Application:** https://whatsapp-enhanced-v3-new-production.up.railway.app/

## ✨ Features

### 1. **Bulk Messaging** ✅
- Send messages to multiple contacts simultaneously
- Manual phone number entry or CSV file upload
- Configurable delay between messages to avoid spam detection
- Detailed delivery reports with success/failure tracking
- Real-time progress monitoring

### 2. **Message Templates** ✅
- Create, edit, and manage reusable message templates
- Category-based organization
- Variable detection and validation
- Template preview with personalization
- Pre-built templates for common use cases

### 3. **Contact Management** ✅
- Add, edit, and delete contacts
- Import contacts from CSV files
- Custom fields for additional contact information
- Tag-based organization and filtering
- Group management for organized messaging

### 4. **Personalization Engine** ✅
- Dynamic token replacement ({{name}}, {{company}}, etc.)
- Built-in tokens: current_date, current_time, etc.
- Contact-specific personalization
- Custom field integration
- Preview personalized messages before sending

## 🏗️ Architecture

### Modular Design
The application is built with a modular architecture for easy maintenance and feature iteration:

```
/modules
├── whatsapp.js          # Core WhatsApp Web integration
├── bulk-messaging.js    # Bulk messaging functionality
├── templates.js         # Template management system
├── contacts.js          # Contact and group management
└── personalization.js   # Personalization engine
```

### Technology Stack
- **Backend:** Node.js + Express
- **WhatsApp Integration:** whatsapp-web.js
- **Frontend:** Vanilla JavaScript + Bootstrap 5
- **Data Storage:** JSON files (easily portable)
- **Deployment:** Railway Platform

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- WhatsApp account for QR scanning

### Local Development

1. **Clone the repository:**
```bash
git clone https://github.com/r2997790/whatsapp-enhanced-v3.git
cd whatsapp-enhanced-v3
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm run dev
```

4. **Open your browser:**
```
http://localhost:3000
```

5. **Scan QR Code:**
   - Open WhatsApp on your phone
   - Go to Settings > Linked Devices
   - Scan the QR code displayed in the web interface

## 📖 Usage Guide

### Getting Started
1. **Connect WhatsApp:** Scan the QR code with your phone
2. **Create Templates:** Design reusable message templates with variables
3. **Add Contacts:** Import from CSV or add manually
4. **Send Messages:** Use bulk messaging with personalization

### Bulk Messaging
- **Manual Entry:** Enter phone numbers, one per line
- **CSV Upload:** Upload CSV with columns: name, phone, email
- **Delay Configuration:** Set delays between messages (1-10 seconds)

### Template Variables
Use these built-in tokens in your templates:

**Contact Tokens:**
- `{{name}}` - Full contact name
- `{{first_name}}` - First name only
- `{{last_name}}` - Last name only
- `{{phone}}` - Phone number
- `{{email}}` - Email address
- `{{company}}` - Company name

**System Tokens:**
- `{{current_date}}` - Today's date
- `{{current_time}}` - Current time
- `{{current_year}}` - Current year
- `{{current_month}}` - Current month name
- `{{current_day}}` - Current day name

**Custom Fields:**
Any custom field added to contacts can be used as `{{field_name}}`

### CSV Import Format
```csv
name,phone,email,company,tags
John Doe,+1234567890,john@example.com,Acme Corp,customer;vip
Jane Smith,+0987654321,jane@example.com,Tech Solutions,lead;prospect
```

## 🔧 API Endpoints

### WhatsApp Connection
- `GET /api/status` - Check connection status
- `GET /api/qr` - Get QR code for scanning
- `POST /api/send-message` - Send single message

### Bulk Messaging
- `POST /api/bulk-send-manual` - Send to manually entered numbers
- `POST /api/bulk-send-csv` - Send via CSV upload

### Templates
- `GET /api/templates` - List all templates
- `POST /api/templates` - Create new template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `POST /api/templates/:id/process` - Process template with variables

### Contacts
- `GET /api/contacts` - List contacts (with search/filter)
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `POST /api/contacts/import` - Import from CSV

### Groups
- `GET /api/groups` - List groups
- `POST /api/groups` - Create group
- `GET /api/groups/:id/contacts` - Get group contacts

### Personalization
- `GET /api/personalization/tokens` - Get available tokens
- `POST /api/personalization/personalize` - Personalize message
- `POST /api/personalization/bulk-send` - Send personalized bulk messages

## 🚀 Deployment

### Railway Deployment (Recommended)

1. **Connect Repository:**
   - Fork this repository
   - Connect your Railway account to GitHub
   - Deploy from your forked repository

2. **Environment Variables:**
   No additional environment variables required - the app works out of the box!

3. **Domain:**
   Railway automatically provides a domain like:
   `your-app-name.up.railway.app`

### Manual Deployment

1. **Build and start:**
```bash
npm install
npm start
```

2. **Configure reverse proxy** (if needed) to handle static files and API routes

## 🔒 Security Features

- **CORS Protection:** Configured for secure cross-origin requests
- **Input Validation:** All API endpoints validate input data
- **File Upload Security:** CSV uploads are processed safely
- **Rate Limiting:** Built-in delays prevent spam detection
- **Data Isolation:** Each deployment has isolated data storage

## 🛠️ Development

### Project Structure
```
whatsapp-enhanced-v3/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── modules/               # Modular functionality
│   ├── whatsapp.js
│   ├── bulk-messaging.js
│   ├── templates.js
│   ├── contacts.js
│   └── personalization.js
├── public/                # Frontend files
│   ├── index.html
│   └── js/app.js
├── data/                  # Data storage (auto-created)
│   ├── templates/
│   └── contacts/
└── uploads/               # Temporary file uploads
```

### Adding New Features

1. **Create Module:** Add new functionality in `/modules`
2. **Add Routes:** Register routes in `server.js`
3. **Update Frontend:** Modify `public/js/app.js` and `public/index.html`
4. **Test Locally:** Use `npm run dev` for development

### Code Style
- **Modular Architecture:** Each feature in separate module
- **Error Handling:** Comprehensive try-catch blocks
- **Async/Await:** Modern JavaScript patterns
- **RESTful APIs:** Standard HTTP methods and status codes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

- **Issues:** Report bugs or request features via GitHub Issues
- **Documentation:** This README covers all major features
- **Community:** Contributions and feedback welcome!

## 🔄 Version History

- **v3.0.0** - Complete rewrite with modular architecture
- **v2.x** - Enhanced templates and personalization
- **v1.x** - Basic bulk messaging functionality

---

**Built with ❤️ for efficient WhatsApp messaging**
