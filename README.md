# 💰 Finance Tracker

A modern, feature-rich personal finance tracking application built with React, Vite, and Supabase.

## ✨ Features

- 💵 Track income and expenses
- 🏦 Multiple account management
- 🔄 Transfer money between accounts
- 📊 Visual analytics and charts
- 📱 Responsive design
- 🌙 Dark/Light theme
- 📈 Budget tracking
- 🎯 Custom categories and reasons
- 🔐 Secure authentication with Supabase

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/VinitSurve/Finance-Tracker.git
   cd Finance-Tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**
   ⚠️ **IMPORTANT**: You must run the database migrations before using the app!
   
   See [FIX_TRANSFER_ERROR.md](./FIX_TRANSFER_ERROR.md) for quick setup or [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md) for detailed instructions.

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
Finance-Tracker/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   ├── services/       # API and database services
│   ├── context/        # React context providers
│   ├── hooks/          # Custom React hooks
│   ├── styles/         # CSS stylesheets
│   ├── migrations/     # Database migration files
│   └── utils/          # Utility functions
├── public/             # Static assets
└── docs/              # Documentation
```

## 🗄️ Database Setup

The application requires specific database functions to work properly. If you encounter errors like:

```
Could not find the function public.transfer_money
```

You need to run the database migrations. See:
- **Quick Fix**: [FIX_TRANSFER_ERROR.md](./FIX_TRANSFER_ERROR.md)
- **Complete Guide**: [DATABASE_SETUP_GUIDE.md](./DATABASE_SETUP_GUIDE.md)

## 🛠️ Built With

- **React** - UI framework
- **Vite** - Build tool and dev server
- **Supabase** - Backend and database
- **Recharts** - Data visualization
- **Framer Motion** - Animations
- **React Router** - Navigation
- **React Hot Toast** - Notifications

## 📦 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🔒 Security

- All user data is secured with Row Level Security (RLS) in Supabase
- Authentication handled by Supabase Auth
- Environment variables for sensitive data

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🐛 Troubleshooting

### Common Issues

1. **Transfer function not found**
   - Run the SQL migrations in Supabase
   - See [FIX_TRANSFER_ERROR.md](./FIX_TRANSFER_ERROR.md)

2. **Authentication errors**
   - Check your Supabase credentials in `.env`
   - Ensure your Supabase project is active

3. **Build errors**
   - Delete `node_modules` and `package-lock.json`
   - Run `npm install` again

## 📞 Support

If you encounter any issues, please:
1. Check the troubleshooting guide above
2. Review the database setup guides
3. Open an issue on GitHub

---

Made with ❤️ by [Vinit Surve](https://github.com/VinitSurve)

