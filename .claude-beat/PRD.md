# Product Requirements Document

## Project Name

CoinKeeper

## Overview

CoinKeeper is a personal finance management service that minimizes manual tracking through AI-powered automation. It supports multi-currency accounts, shared financial spaces for groups, receipt-based expense tracking, and deep spending analytics including product-level price statistics. Available via web interface and Telegram bot.

## Target Users

- Individual power users who want granular control and deep insights into their finances
- Households, couples, families, and roommates tracking shared finances in a collaborative space

## Core Problem

Manual expense tracking is tedious and error-prone. Existing tools require significant data entry effort and lack AI-driven automation for tasks like categorization, receipt scanning, and financial insights. Users want to spend less time logging and more time understanding their money.

## Goals

- **Automation first** — minimize manual data entry through AI-powered categorization, receipt scanning, and smart suggestions
- **Deep insights** — provide rich analytics including product-level price tracking across stores and time periods
- **Frictionless input** — offer multiple input channels (web, Telegram bot, receipt photos) so users can log expenses wherever they are

## P0 — Must Have (Core, launch blocker)

### Multi-Account Management with Multi-Currency Support
Users can create multiple financial accounts (cash, bank cards, wallets). Each account supports multiple currencies with real-time balance tracking. Users can see total net worth across all accounts with currency conversion.

### Transfers Between Accounts
Transfer money between any two accounts with three rate modes: (1) automatic external exchange rate from a live API, (2) user-defined exchange rate, or (3) user-specified final amount in the target currency. All transfers are logged with rate history.

### Scheduled Transfers
Create recurring transfers between accounts on a configurable schedule (daily, weekly, monthly, custom). Supports all three rate modes from regular transfers. Scheduled transfers show upcoming executions and history.

### Income Tracking
Log income with category, source, and recurrence. Income entries integrate with account balances and analytics. Support for one-time and recurring income patterns.

### AI-Powered Expense Categorization
Automatic category assignment for expenses using AI (Claude API / OpenAI). Categories are created dynamically based on transaction patterns without creating duplicates — the system normalizes and merges similar categories. Users can review and correct AI decisions to improve accuracy over time.

### Receipt Photo Expense Tracking
Capture receipt photos (via web upload or Telegram bot). AI extracts merchant, date, line items, prices, and total. Items are matched to existing categories or new categories are suggested. Receipt images are stored for reference and re-processing.

### Web Interface
Responsive web application serving as the primary user interface. Dashboard with account overview, recent transactions, quick-add forms, analytics charts, and settings management.

### Authentication and Security
Passkey-based authentication (WebAuthn) as primary login method. Passwordless by default with support for biometrics and hardware keys. Optional TOTP 2FA as a second factor. All sensitive data encrypted at rest. Audit log for security-sensitive actions.

### Shared Spaces
Multiple users can collaborate within a single financial space. Role-based access (owner, editor, viewer). Each user sees shared accounts and can contribute transactions. Personal accounts remain private within a shared space.

### Telegram Bot Interface
Full expense tracking via Telegram: photo receipts, text-based quick entry, category assignment, balance checks, spending summaries. Bot authenticates users via linked accounts. Supports all core operations available in the web interface.

## P1 — Should Have (Important, not launch blocker)

### Rich Analytics Dashboard
Interactive charts and graphs: spending by category over time, income vs. expense trends, account balance evolution, currency fluctuation impact. Filterable by date range, account, category, and user (in shared spaces).

### Product Price Statistics
Track individual product prices over time: receipt photo → extract exact product (e.g., "2% milk, Whole Foods") → store in product database → display price trends split by store. Users can see historical price charts for any tracked product and compare prices across stores.

### Smart Notifications
Reminders when users haven't logged expenses for a configurable period. Alerts for unusual spending patterns (AI-detected). Scheduled transfer execution confirmations. Low balance warnings. Notification delivery via Telegram bot and web push.

### AI Financial Insights
Proactive AI-generated insights: monthly spending summaries, budget recommendations, spending pattern analysis, savings opportunities. Insights are contextual and based on user's actual transaction history.

## P2 — Nice to Have (Bonus, if time permits)

### Natural Language Transaction Entry
Enter transactions via natural language in Telegram or web ("spent 15 bucks on coffee at Starbucks") and have AI parse amount, category, merchant, and account automatically.

### Import/Export
Import transactions from CSV files. Export data in standard formats (CSV, OFX) for use with other financial tools.

### Multi-Currency Account Aggregation
Aggregate balances across currencies with configurable base currency for net worth display. Historical currency rate charts.

### Custom Reports
User-configurable report templates: save filter combinations, schedule report generation, export as PDF.

## Non-Goals

- **No bank integration** — will not connect to banks via Open Banking, Plaid, or similar services for automatic transaction import
- **No investment tracking** — stocks, bonds, crypto portfolios, and investment performance are out of scope
- **No native mobile apps** — web interface and Telegram bot are the only client interfaces (no iOS/Android apps)
- **No budget planning / forecasting** — budget creation, goal setting, and future projections are deferred

## Tech Stack

- **Frontend:** TypeScript, Next.js, Tailwind CSS, shadcn/ui
- **Backend:** TypeScript, Next.js API routes (or separate API layer if complexity warrants)
- **Database:** SQLite with Prisma ORM (local-first, no external database dependency)
- **AI:** Multi-provider — Claude API (Anthropic) for categorization and insights, OpenAI API for receipt OCR and additional tasks
- **Authentication:** WebAuthn/Passkeys (via libraries like `@simplewebauthn/server`), optional TOTP 2FA
- **Real-time:** WebSocket or Server-Sent Events for shared space collaboration
- **Telegram Bot:** `grammy` or `telegraf` framework
- **Deployment:** Docker, deployable to any VPS or cloud provider
- **Notifications:** Telegram bot for messaging, web push API for browser notifications
