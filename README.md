# 💰 Finance Tracker

A modern, feature-rich personal finance tracker built with React and Supabase. Track your income and expenses, manage multiple balance types, set budgets, visualize your spending patterns, and get AI-powered financial insights—all with a beautiful, responsive interface that works seamlessly in both light and dark modes.

## ✨ Features

- 🔐 **User Authentication**: Secure sign-up and sign-in with Supabase Auth
- 💳 **Multiple Balance Types**: Track cash, digital wallets (GPay), piggy banks, and custom balance types
- 📊 **Transaction Management**: Add, filter, and categorize income/expense transactions with detailed notes
- 📈 **Visual Analytics**: Interactive charts and graphs using Chart.js and Recharts
- 💡 **AI Assistant**: Get personalized financial insights powered by Google Gemini AI
- 🎯 **Budget Management**: Set and track monthly budgets by category
- 🎨 **Modern UI/UX**: Smooth animations with Framer Motion, responsive design, and theme switching
- 🌓 **Dark Mode**: Full dark/light theme support with seamless transitions
- 🌍 **Multi-Currency**: Support for USD, EUR, GBP, INR, JPY, CAD, AUD, and CNY
- 📱 **PWA Support**: Install as a mobile or desktop app
- 🔔 **Notifications**: Real-time toast notifications with Do Not Disturb mode
- 🎮 **Gamification**: Points system with confetti celebrations
- 📤 **Data Export**: Export your financial data for backup or analysis
- 🔄 **Offline Support**: Network status detection and offline indicators

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18.2.0
- **Build Tool**: Vite 6.3.1
- **Routing**: React Router DOM 7.6.1
- **Styling**: Custom CSS with CSS Variables
- **Animations**: Framer Motion 10.18.0
- **3D Graphics**: Three.js + React Three Fiber + Drei

### Backend & Database
- **Backend as a Service**: Supabase 2.36.0
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)

### Data Visualization
- **Chart Libraries**: 
  - Chart.js 4.4.9
  - React Chart.js 2 5.3.0
  - Recharts 2.12.0

### AI Integration
- **AI SDK**: Google Generative AI 0.2.1 (Gemini)

### UI Components & Icons
- **Icons**: Lucide React 0.511.0, React Icons 4.11.0
- **Notifications**: React Hot Toast 2.5.2
- **Effects**: Canvas Confetti 1.9.3

### Developer Tools
- **Linting**: ESLint 9.22.0
- **Type Checking**: TypeScript types for React
- **PWA**: Vite Plugin PWA 1.0.0

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Supabase Account** ([Sign up here](https://supabase.com))
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/VinitSurve/Finance-Tracker.git
   cd Finance-Tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   
   Create a `.env` file in the root directory (use `.env.example` as template):
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

   # Gemini API Configuration
   VITE_GEMINI_API_KEY=your_gemini_api_key_here

   # Other Configuration
   VITE_APP_ENV=development
   ```

4. **Set up Supabase Database**:
   
   Create the following tables in your Supabase project:
   - `balance_types` (id, name, icon, is_default)
   - `user_balances` (id, user_id, balance_type_id, amount)
   - `transactions` (id, user_id, balance_id, amount, type, category, reason, note, created_at)
   - `budgets` (for budget management feature)

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5527`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

## 📱 Usage

1. **Sign Up / Sign In**: Create an account or log in with your email
2. **Set Up Balances**: Configure your initial balance types (Cash, GPay, Bank, etc.)
3. **Add Transactions**: 
   - Record income (salary, freelance, gifts)
   - Track expenses (groceries, rent, utilities, subscriptions)
4. **Set Budgets**: Create monthly budgets for different categories
5. **View Analytics**: Check your spending patterns with visual charts
6. **Get AI Insights**: Ask the AI assistant about your financial habits
7. **Customize**: Switch themes, change currency, adjust notification settings

## 📂 Project Structure

```
Finance-Tracker/
├── public/              # Static assets, PWA manifest
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── AIAssistant.jsx
│   │   ├── FloatingNav.jsx
│   │   ├── LoadingScreen.jsx
│   │   ├── Notifications.jsx
│   │   └── PWAInstallPrompt.jsx
│   ├── context/         # React Context providers
│   │   ├── AuthContext.jsx
│   │   ├── ThemeContext.jsx
│   │   └── CurrencyContext.jsx
│   ├── pages/           # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Login.jsx
│   │   ├── SetupBalances.jsx
│   │   ├── AddIncome.jsx
│   │   ├── AddExpense.jsx
│   │   ├── Transactions.jsx
│   │   ├── BudgetManagement.jsx
│   │   ├── Settings.jsx
│   │   ├── PointsPage.jsx
│   │   └── NotFound.jsx
│   ├── services/        # External service integrations
│   │   └── supabaseClient.js
│   ├── config/          # Configuration files
│   │   └── supabase.js
│   ├── styles/          # CSS files
│   │   ├── global/
│   │   ├── pages/
│   │   ├── variables.css
│   │   └── App.css
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # App entry point
│   └── index.css
├── .env.example         # Environment variables template
├── vite.config.js       # Vite configuration
├── package.json         # Dependencies and scripts
└── index.html           # HTML entry point
```

## 🎨 Key Features Explained

### AI Financial Assistant
Powered by Google Gemini AI, the assistant can:
- Analyze your spending patterns
- Provide budgeting advice
- Answer questions about your finances
- Suggest ways to save money

### Responsive Design
- Mobile-first approach with clamp() functions for fluid typography
- Breakpoints optimized for phones, tablets, and desktops
- Touch-friendly UI elements

### Theme System
- CSS custom properties for consistent theming
- Smooth transitions between light and dark modes
- Persistent theme preference

### Data Visualization
Three charting libraries provide:
- Pie charts for category-wise expenses
- Line charts for balance trends over time
- Bar charts for monthly income vs. expenses

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

Please ensure your code follows the existing style and all tests pass.

## 🗺️ Roadmap

- [ ] Recurring transactions
- [ ] Budget alerts and notifications
- [ ] CSV/Excel import/export
- [ ] Receipt photo uploads
- [ ] Multi-user support for families
- [ ] Investment tracking
- [ ] Bill reminders
- [ ] Custom categories and tags
- [ ] Advanced analytics and reports
- [ ] Bank account integration

## 📄 License

This project is open source. Add a license file (MIT, Apache 2.0, GPL-3.0, etc.) to specify terms of use.

## 👤 Author

**Vinit Surve**  
- GitHub: [@VinitSurve](https://github.com/VinitSurve)
- Repository: [Finance-Tracker](https://github.com/VinitSurve/Finance-Tracker)

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend and authentication
- [Google AI](https://ai.google.dev) - Gemini AI integration
- [Vite](https://vitejs.dev) - Lightning-fast build tool
- [React](https://react.dev) - UI framework
- Chart.js & Recharts - Data visualization

---

⭐ If you find this project useful, please consider giving it a star!