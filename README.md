# AI Companion

## Overview
AI Companion is a sophisticated Next.js application that leverages various AI technologies to create interactive and intelligent companions. Built with modern web technologies and AI services, it offers a unique platform for AI-powered conversations and interactions.

## Features
- **Authentication and User Management**: Powered by Clerk.
- **AI-Powered Conversations**: Utilizing OpenAI and Langchain.
- **Vector Database Integration**: Seamless connectivity with Pinecone.
- **Image Processing**: Enhanced with Cloudinary.
- **Rate Limiting**: Implemented with Upstash Redis.
- **Themes**: Support for dark and light themes.
- **UI Components**: Responsive and accessible with Radix UI.
- **Payment Integration**: Stripe for secure transactions.
- **Form Handling**: Simplified with React Hook Form and Zod validation.

## Tech Stack
### Frontend
- **Next.js**: Version 15.1.0
- **React**: Version 19.0.0
- **TypeScript**: Version 5.7.2
- **Tailwind CSS**: Version 3.4.16
- **UI Components**: Radix UI
- **State Management**: Zustand

### AI/ML
- **OpenAI**
- **Langchain**
- **Hugging Face Inference**

### Backend & Infrastructure
- **Prisma**: ORM with PostgreSQL
- **Pinecone**: Vector database
- **Upstash Redis**: Rate limiting
- **Cloudinary**: Image management
- **Stripe**: Payment gateway

## Prerequisites
- **Node.js**: Latest LTS version recommended
- **PNPM**: Version 9.15.0 or higher
- **PostgreSQL Database**
- Accounts and API keys for:
  - OpenAI
  - Pinecone
  - Cloudinary
  - Clerk
  - Stripe
  - Upstash

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd ai-companion
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory with the following configurations:
   ```env
   # Database
   DATABASE_URL="your-postgresql-database-url"

   # Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=

   # AI Services
   OPENAI_API_KEY=
   HUGGING_FACE_KEY=
   REPLICATE_API_TOKEN=

   # Vector Database
   PINECONE_API_KEY=
   PINECONE_ENVIRONMENT=
   PINECONE_INDEX=

   # Image Upload
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=

   # Rate Limiting
   UPSTASH_REDIS_REST_URL=
   UPSTASH_REDIS_REST_TOKEN=

   # Stripe
   STRIPE_API_KEY=
   STRIPE_WEBHOOK_SECRET=

   # App Configuration
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   pnpm postinstall

   # Run database migrations
   npx prisma db push
   ```

5. **Start the Development Server**
   ```bash
   pnpm dev
   ```

## Available Scripts
- `pnpm dev`: Start the development server
- `pnpm build`: Build the production application
- `pnpm start`: Start the production server
- `pnpm lint`: Run ESLint
- `pnpm postinstall`: Generate Prisma client

## Project Structure
```
ai-companion/
├── app/                 # Next.js app directory
├── components/          # React components
├── lib/                 # Utility functions and configurations
├── prisma/              # Database schema and migrations
├── public/              # Static assets
└── types/               # TypeScript type definitions
```

## Contributing
1. Fork the repository.
2. Create your feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a Pull Request.

## Support
For support, please reach out through:
- GitHub issues
- Email: bbabar0214@gmail.com
- Project discussions page

---
Built with ❤️ using Next.js and AI technologies.

