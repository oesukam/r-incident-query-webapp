# Security Incident Query

A modern web application for searching and managing security incidents from PhishLabs ThreatIntel API. Built with Next.js, React, and TypeScript.

## Features

- **Authentication**: Simple username/password authentication to protect the application
- **Advanced Search**: Search incidents by keyword, date range, brand name, and threat type
- **Quick Date Filters**: Convenient preset filters (Today, This Week, This Month, This Year)
- **Threat Type Filtering**: Support for various threat types including:
  - Dark Web threats (Credentials, PII, Source Code, etc.)
  - Social Media threats (Phishing, Impersonation, Brand Mentions, etc.)
- **Email Extraction**: Download affected email addresses from incidents as CSV files
- **Expandable Email Lists**: View affected emails directly in the incident card with username, full name, and source details
- **Pagination**: Navigate through large result sets with configurable page sizes
- **Responsive Design**: Modern UI that works on desktop and mobile devices
- **Dark/Light Theme**: Toggle between dark and light modes for comfortable viewing
- **Real-time Status**: View incident severity, status, and metadata at a glance
- **Session Management**: Secure HTTP-only cookie-based sessions with 24-hour expiration

## Tech Stack

- **Framework**: [Next.js 16.0.0](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Library**: [React 19.2.0](https://react.dev/)
- **Styling**: [Tailwind CSS 4.1.9](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) with [Radix UI](https://www.radix-ui.com/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) validation
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)

## Prerequisites

- Node.js 18+
- Yarn package manager
- PhishLabs ThreatIntel API credentials

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/joinrepublic/r-incident-query.git
cd r-incident-query
```

### 2. Install dependencies

```bash
yarn install
```

### 3. Configure environment variables

Create a `.env.local` file in the root directory:

```env
# PhishLabs API Credentials
PHISHLABS_CLIENT_ID=your_client_id_here
PHISHLABS_CLIENT_SECRET=your_client_secret_here

# Authentication Credentials
AUTH_USERNAME=your_username
AUTH_PASSWORD=your_secure_password

# Session Secret (for signing cookies)
SESSION_SECRET=your_random_secret_key
```

You can use `.env.example` as a template.

**Important**:
- Change the default `AUTH_USERNAME` and `AUTH_PASSWORD` values to secure credentials
- Set `SESSION_SECRET` to a random string (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- These credentials will be used to access the application login page
- Sessions are stored in signed cookies and expire after 24 hours

### 4. Run the development server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Available Scripts

- `yarn dev` - Start the development server
- `yarn build` - Build the production application
- `yarn start` - Start the production server
- `yarn lint` - Run ESLint for code quality checks

## Project Structure

```
r-incident-query/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/token/           # OAuth token endpoint
│   │   └── incidents/            # Incident API endpoints
│   │       ├── search/           # Search incidents
│   │       ├── detail/           # Get incident details
│   │       └── download/         # Download incident files
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── incident-query-page.tsx   # Main incident query interface
│   ├── date-range-picker.tsx     # Date range selector
│   ├── searchable-select.tsx     # Searchable dropdown
│   ├── theme-provider.tsx        # Theme context provider
│   └── theme-toggle.tsx          # Dark/light mode toggle
├── hooks/                        # Custom React hooks
├── lib/                          # Utility functions
├── styles/                       # Additional styles
└── public/                       # Static assets
```

## API Integration

This application integrates with the PhishLabs ThreatIntel API:

- **Base URL**: `https://threatintel.phishlabs.com/api/external`
- **Authentication**: OAuth 2.0 Client Credentials flow
- **Endpoints Used**:
  - `/incident/search` - Search for security incidents
  - `/incident/{id}` - Get incident details
  - `/document/{documentId}/download` - Download incident documents

## Key Components

### Incident Query Page

The main interface (`components/incident-query-page.tsx`) provides:

- Search input with keyword filtering
- Date range picker with quick presets
- Brand name and threat type selectors
- Results table with pagination
- Email download functionality

### API Routes

**Authentication Routes:**
- **`/api/auth/login`**: Handles user login with username/password
- **`/api/auth/logout`**: Destroys user session and logs out
- **`/api/auth/token`**: Manages PhishLabs OAuth token with automatic caching and expiration handling

**Incident Routes:**
- **`/api/incidents/search`**: Proxies search requests to PhishLabs API
- **`/api/incidents/{incidentId}/detail`**: Fetches detailed incident information
- **`/api/incidents/download`**: Downloads document files from incidents

## Features in Detail

### Search & Filter

- Full-text search across incident titles and descriptions
- Filter by date range with calendar picker
- Filter by brand name
- Filter by 40+ threat type categories
- Real-time search with loading states

### Incident Display

- Severity badges (Critical, High, Medium, Low)
- Status indicators (Active, Investigating, Resolved)
- Incident metadata (ID, date, brand)
- Affected email preview
- Document download availability

### Email Download

- Extracts email addresses from incident documents
- Exports unique emails to CSV format
- Includes incident ID and date in filename
- Progress indicators during download

## Deployment

### Deploy to Vercel

The easiest way to deploy this application is using [Vercel](https://vercel.com):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rohanbhandari/r-incident-query)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables in Production

Make sure to set these environment variables in your deployment platform:

- `PHISHLABS_CLIENT_ID`
- `PHISHLABS_CLIENT_SECRET`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Authors

- **Olivier Esuka** - [oesukam@gmail.com](mailto:oesukam@gmail.com)

## Acknowledgments

- [PhishLabs](https://www.phishlabs.com/) for the ThreatIntel API
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Vercel](https://vercel.com/) for hosting and deployment platform

## Support

For support, please open an issue in the [GitHub repository](https://github.com/rohanbhandari/r-incident-query/issues).
