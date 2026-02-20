# Memocare - Alzheimer's Care Assistant

## Overview
Memocare is a comprehensive web application designed for Alzheimer's patients and their caregivers. It provides medication tracking, memory exercises, emergency alerts with Twilio SMS integration, and daily care management features. Built with accessibility in mind, featuring large, high-contrast interface optimized for seniors.

## Recent Changes (October 4, 2025)
- Successfully imported GitHub project to Replit environment
- Provisioned PostgreSQL database using Replit's built-in database
- Configured Vite development server to work with Replit's proxy (allowedHosts: true)
- Added autocomplete attributes to login/register forms for better accessibility
- Set up workflow running on port 5000 with webview output
- Configured deployment for autoscale production environment

## Project Architecture

### Technology Stack
**Frontend:**
- React 18 with TypeScript
- Vite for fast development
- Tailwind CSS + shadcn/ui components
- TanStack Query for state management
- Wouter for routing
- Socket.io for real-time notifications
- TensorFlow.js for object detection

**Backend:**
- Express.js with TypeScript
- Drizzle ORM with PostgreSQL
- Socket.io for real-time features
- Twilio SDK for SMS emergency alerts
- Multer for file uploads
- bcrypt for password hashing

### Key Features
1. **Emergency Alert System** - SMS alerts to emergency contacts via Twilio
2. **Medication Management** - Track medications and doses with compliance visualization
3. **Contact Management** - Store contacts with photos and emergency contact designation
4. **Object Recognition** - AI-powered identification using TensorFlow.js
5. **Memory Wall** - Photo/video/audio uploads with tagging
6. **Journal** - Text and voice-to-text entries
7. **Memory Games** - Daily personalized quizzes
8. **Routines & Tasks** - Structured daily routines

### Database
- Using Replit's PostgreSQL database
- Schema managed with Drizzle ORM
- Migrations applied with `npm run db:push`

### File Structure
```
├── client/src/          # React frontend
│   ├── components/      # UI components (shadcn/ui)
│   ├── pages/          # Page components
│   ├── context/        # React context (Auth)
│   ├── hooks/          # Custom hooks
│   └── lib/            # API client, utilities
├── server/             # Express backend
│   ├── middleware/     # Auth, upload middleware
│   ├── utils/         # Twilio, scheduler, validators
│   ├── routes.ts      # API routes
│   └── storage.ts     # Database operations
├── shared/            # Shared types and schemas
└── migrations/        # Database migrations
```

## Development Setup

### Running the Application
The application is configured to run via the "Start application" workflow:
- Command: `npm run dev`
- Port: 5000 (frontend and backend served together)
- Output: webview (displays the web application)

### Environment Variables
Required environment variables are managed through Replit:
- `DATABASE_URL` - PostgreSQL connection (auto-configured by Replit)
- `PORT` - Server port (default: 5000)
- `SESSION_SECRET` - Session encryption key
- `NODE_ENV` - Environment mode (development/production)

Optional (for SMS features):
- `TWILIO_ACCOUNT_SID` - Twilio account identifier
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `TWILIO_PHONE_NUMBER` - Twilio phone number for SMS

### Database Management
```bash
# Push schema changes to database
npm run db:push

# If data loss warning appears
npm run db:push --force
```

### Development Notes
- Vite is configured with `allowedHosts: true` for Replit's proxy
- Server binds to `0.0.0.0:5000` for Replit compatibility
- HMR (Hot Module Reload) is configured with clientPort 443 for Replit
- Static uploads served from `./server/public/uploads`

## Deployment
Configured for autoscale deployment:
- Build: `npm run build`
- Start: `npm run server`
- Type: autoscale (stateless web application)

## User Preferences
- This is a healthcare/accessibility-focused application
- Large fonts and high contrast are intentional design choices
- Autocomplete attributes added for better form accessibility
- ARIA labels used throughout for screen reader compatibility

## Important Notes
- Twilio SMS features require valid credentials to function
- Without Twilio configuration, app runs normally but SMS alerts are disabled
- Object detection uses TensorFlow.js COCO-SSD model (downloads on first use)
- Camera permissions required for object identification feature
- Voice-to-text uses Web Speech API (requires HTTPS in production)

## Troubleshooting
- If port 5000 is in use, workflow will fail to start
- Database connection issues: verify DATABASE_URL environment variable
- Twilio SMS errors: check credentials start with correct prefixes (AC for SID)
- Object detection not working: check browser camera permissions
- Frontend not loading: verify Vite server is running and proxy is configured
