# 💸 BillBlend
> **Mix the costs. Blend the bills. Settle up seamlessly.**

![BillBlend](https://img.shields.io/badge/Status-Live-success?style=for-the-badge)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)

BillBlend is a lightning-fast, production-grade Progressive Web App (PWA) designed to take the awkward math out of group trips and shared expenses. Built entirely as a client-side architecture, it prioritizes user privacy, offline capabilities, and highly optimized financial algorithms.

Built with ❤️ by **Debanjan Sarkar**.

---

## ✨ Key Features (For Users)

*   **📱 Native App Feel (PWA):** Installable directly to your phone's home screen from the browser. Works offline and feels like a native iOS/Android app.
*   **🧮 Smart Split Options:**
    *   *Equally:* Divide the bill perfectly among everyone.
    *   *Unequally:* Enter exact amounts for people who ordered different things.
    *   *On Behalf Of:* Handle edge cases where one person covers the entire cost for another specific person.
*   **🔗 "Magic Link" Sync:** No accounts required! Share a trip with friends instantly via a Base64-encoded URL that syncs the entire group data to their device.
*   **🛡️ Mid-Way Checkpoints:** On long trips, use the "Mark as Settled" feature to clear active debts back to zero while preserving older expenses in a "Settled History" log.
*   **🌙 System-Aware Dark Mode:** Beautiful "Charcoal & Neon Mint" dark theme that can follow your OS settings or be toggled manually.
*   **📊 Excel / CSV Export:** Download a perfectly formatted spreadsheet of your entire trip's expenses with a single click.

---

## 🛠️ Technical Architecture (For Developers)

BillBlend is intentionally designed without a traditional backend/database. It relies on advanced client-side state management and data engineering principles to deliver a zero-latency experience.

### Tech Stack
*   **Core:** React.js (via Vite), TypeScript
*   **State Management:** Zustand (with `persist` middleware)
*   **Styling:** Tailwind CSS (v3)
*   **Animations:** Framer Motion
*   **Icons:** Lucide React
*   **Routing:** React Router DOM

### 🧠 The Settlement Engine (Min-Cash Flow Algorithm)
The core of BillBlend is its settlement optimization engine. Instead of generating a transaction for every single expense, it uses a **Greedy Algorithm** to find the absolute minimum number of transfers required to settle all debts.

1.  Calculates the exact net balance (Credits - Debts) for every member.
2.  Partitions members into `Debtors` (Negative balance) and `Creditors` (Positive balance).
3.  Sorts both arrays and iteratively matches the largest Debtor with the largest Creditor until all balances reach `0.00`.
*Result: If A owes B $10, and B owes C $10, the engine simply tells A to pay C $10, eliminating redundant transactions.*

### 💾 Data Integrity & Storage
All data is stored purely in the browser's `localStorage` via Zustand's persistence layer. 
*   **Data Protection:** The app prevents users from deleting group members who are currently engaged in active expenses, protecting the mathematical integrity of the settlement algorithm.
*   **State Partitioning:** The "Mid-Way Settlement" engine does not delete data. It maps over existing JSON objects, applies an `isSettled: true` flag, and dynamically filters the array fed into the calculation engine, creating a robust historical ledger.

### 🔗 Magic Link Serialization
To achieve backend-free sharing, the app takes a specific Group's JSON object -> stringifies it -> URI encodes it -> compresses it into a **Base64 string** -> and attaches it to a URL parameter. The receiving device decodes this string, runs structural validation, and merges it into its local Zustand store.

---

## 💻 Getting Started (Local Development)

Want to run BillBlend locally or contribute? Follow these steps:

### Prerequisites
*   Node.js (v18 or higher)
*   npm (v9 or higher)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/billblend.git
   cd billblend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

### Building for Production
To generate a highly optimized, minified production build:
```bash
npm run build
```
The output will be generated in the `/dist` directory, ready to be deployed to any static host.

---

## 🚀 Deployment

BillBlend is heavily optimized for hosting on static platforms like **Vercel** or **Netlify**. 

**Important Note for Vercel:**
Because BillBlend is a Single Page Application (SPA) utilizing React Router, a `vercel.json` file is included in the root directory to rewrite all trailing paths to `index.html`, preventing `404 Not Found` errors on direct URL visits.

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 📄 License
This project is open-source and free to use. 

*Designed and Engineered by Debanjan Sarkar.*
