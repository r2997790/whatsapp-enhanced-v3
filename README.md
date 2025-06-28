# WhatsApp Enhanced v3

A comprehensive WhatsApp bulk messaging platform with advanced features including templates, personalization, contact management, and real-time WebSocket connectivity.

## Features

### 🚀 Core Functionality
- **Real-time QR Code Authentication** with WebSocket support
- **Quick Message Sending** to individual contacts
- **Bulk Messaging** with CSV upload and manual entry
- **Message Templates** with variable personalization
- **Contact Management** with groups and tags
- **Advanced Personalization** with token replacement

### 🔧 Technical Features
- Socket.IO for real-time communication
- Responsive Bootstrap UI
- File upload support for CSV imports
- Error handling and notifications
- Demo mode for testing
- Graceful connection handling

## Deployment

### Railway Deployment

This application is designed to run on Railway with automatic deployments.

1. **Fork this repository**
2. **Connect to Railway**
   - Go to [Railway](https://railway.app)
   - Create new project from GitHub repo
   - Select this repository

3. **Environment Variables** (Optional)
   - `NODE_ENV=production`
   - `PORT=8080` (automatically set by Railway)

4. **Deploy**
   - Railway will automatically build and deploy
   - Access your app at the provided Railway URL

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd whatsapp-enhanced-v3

# Install dependencies
npm install

# Start development server
npm run dev

# Or start production server
npm start
```

## Usage

### 1. QR Code Authentication
- Open the application
- Wait for QR code to appear
- Scan with WhatsApp (Settings > Linked Devices > Link a Device)
- Wait for "Connected and Ready" status

### 2. Quick Messaging
- Enter phone number with country code (+1234567890)
- Type your message
- Click "Send Message"

### 3. Bulk Messaging
- **Manual Entry**: Enter phone numbers, one per line
- **CSV Upload**: Upload CSV with columns: name, phone, email
- Set delay between messages (1-10 seconds)
- Click send to start bulk messaging

### 4. Templates
- Create reusable message templates
- Use variables like {{name}}, {{company}}
- Organize by categories
- Use templates for quick messaging

### 5. Contact Management
- Add contacts manually or import from CSV
- Create groups for organized messaging
- Tag contacts for easy filtering
- Search and filter contacts

### 6. Personalization
- Use tokens like {{name}}, {{date}} in messages
- Bulk personalized messaging with CSV data
- Group messaging with personalization
- Real-time preview of personalized messages

## API Endpoints

### WhatsApp
- `GET /api/status` - Get connection status
- `GET /api/qr` - Get QR code
- `POST /api/send-message` - Send single message

### Bulk Messaging
- `POST /api/bulk-send-manual` - Send to manual list
- `POST /api/bulk-send-csv` - Send to CSV contacts

### Templates
- `GET /api/templates` - List all templates
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

### Contacts
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `POST /api/contacts/import` - Import from CSV

### Groups
- `GET /api/groups` - List groups
- `POST /api/groups` - Create group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

### Personalization
- `GET /api/personalization/tokens` - Get suggested tokens
- `POST /api/personalization/personalize` - Send personalized message
- `POST /api/personalization/bulk-send` - Bulk personalized send
- `POST /api/personalization/group-send` - Group personalized send

## File Structure

```
whatsapp-enhanced-v3/
├── server.js                 # Main server with Socket.IO
├── package.json             # Dependencies and scripts
├── Dockerfile              # Container configuration
├── modules/                # Backend modules
│   ├── whatsapp.js         # WhatsApp client management
│   ├── bulk-messaging.js   # Bulk messaging logic
│   ├── templates.js        # Template management
│   ├── contacts.js         # Contact management
│   └── personalization.js  # Personalization features
├── public/                 # Frontend files
│   ├── index.html         # Main application UI
│   └── js/
│       └── app.js         # Frontend JavaScript
└── data/                  # Data storage (auto-created)
    ├── templates/         # Template storage
    ├── contacts/          # Contact storage
    └── whatsapp-session/  # WhatsApp session data
```

## Dependencies

### Backend
- `whatsapp-web.js` - WhatsApp Web client
- `express` - Web framework
- `socket.io` - Real-time communication
- `multer` - File upload handling
- `qrcode` - QR code generation
- `fs-extra` - Enhanced file system
- `csv-parser` - CSV file parsing
- `papaparse` - CSV parsing

### Frontend
- `Bootstrap 5` - UI framework
- `Socket.IO Client` - Real-time communication

## Troubleshooting

### QR Code Not Appearing
- Check WebSocket connection status
- Refresh the page
- Check browser console for errors

### Messages Not Sending
- Ensure WhatsApp is connected (green status)
- Check phone number format (+countrycode+number)
- Verify internet connection

### CSV Import Issues
- Ensure CSV has correct headers: name, phone, email
- Check file encoding (UTF-8 recommended)
- Verify phone numbers include country codes

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please create an issue in the GitHub repository.