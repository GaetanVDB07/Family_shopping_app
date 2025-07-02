# Family Grocery Shopping App 🛒

A modern, collaborative grocery list application built for families to manage their shopping lists together with real-time updates.

## ✨ Features

- 🏠 **Family Collaboration**: Multiple family members can add and manage items
- ⚡ **Real-time Updates**: Live synchronization via WebSockets
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- ✅ **Smart Lists**: Mark items as completed while shopping
- 🎨 **Modern UI**: Beautiful interface built with shadcn/ui components

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** & **Radix UI** for components
- **TanStack Query** for state management
- **Wouter** for routing

### Backend
- **Express.js** with TypeScript
- **WebSockets** for real-time communication
- **Drizzle ORM** for database operations
- **Zod** for validation

### Database
- **PostgreSQL** with **Neon** serverless hosting

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL database (or Neon account)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/family-shopping-app.git
   cd family-shopping-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy the environment template
   cp .env.example .env
   
   # Edit .env with your database configuration
   # For development, you can use memory storage (current default)
   # For production, set up a PostgreSQL database URL
   ```

4. **Database Setup (Optional)**
   ```bash
   # If using PostgreSQL, push the schema to your database
   npm run db:push
   
   # Note: Currently using in-memory storage for development
   # Database setup is only needed for production deployment
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type check TypeScript
- `npm run db:push` - Push database schema changes

## 🏗️ Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Page components
│   │   └── lib/            # Utilities
├── server/                 # Express backend
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API routes
│   └── storage.ts         # Database layer
├── shared/                 # Shared types & schemas
│   └── schema.ts          # Database schema & types
└── docs/                  # Documentation
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📱 Usage

1. **Add Items**: Type grocery items and press Enter or click Add
2. **Mark Complete**: Check off items as you shop
3. **Family Sync**: All family members see updates instantly
4. **Delete Items**: Remove items you no longer need

## 🔧 Environment Variables

Create a `.env` file with:

```env
DATABASE_URL=your_postgresql_connection_string
NODE_ENV=development
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍👩‍👧‍👦 Built for Families

This app was created to help families coordinate their grocery shopping more effectively. No more duplicate purchases or forgotten items!

---

**Happy Shopping!** 🛍️
