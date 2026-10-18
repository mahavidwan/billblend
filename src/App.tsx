import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { WalletCards } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import CreateGroup from './pages/CreateGroup';
import GroupMonitor from './pages/GroupMonitor';
import AddExpense from './pages/AddExpense'; // <-- Imported!

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-200 flex justify-center font-sans">
        <div className="w-full max-w-md bg-slate-50 min-h-screen shadow-2xl relative overflow-x-hidden flex flex-col">
          
          <header className="bg-brand-700 text-white px-4 py-4 flex items-center justify-between shadow-md z-20">
            <Link to="/" className="flex items-center gap-2 active:scale-95 transition-transform">
              <div className="bg-white p-1.5 rounded-lg shadow-sm flex items-center justify-center">
                <WalletCards className="w-5 h-5 text-brand-700" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">BillBlend</h1>
            </Link>
            <div className="w-8 h-8 rounded-full bg-brand-600/50 border border-brand-500 flex items-center justify-center text-xs font-bold text-brand-50">ME</div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/create" element={<CreateGroup />} />
              <Route path="/group/:id" element={<GroupMonitor />} />
              <Route path="/group/:id/add" element={<AddExpense />} />
            </Routes>
          </main>
          
        </div>
      </div>
    </Router>
  );
}