import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { GlowUpProvider } from '@/context/GlowUpContext';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import AuthPage from '@/pages/AuthPage';
import DashboardPage from '@/pages/DashboardPage';
import PlanningPage from '@/pages/PlanningPage';
import TodoPage from '@/pages/TodoPage';
import NotesPage from '@/pages/NotesPage';
import JournalPage from '@/pages/JournalPage';
import MonthlyObjectivesPage from '@/pages/MonthlyObjectivesPage';
import BigGoalsPage from '@/pages/BigGoalsPage';
import ChallengesPage from '@/pages/ChallengesPage';
import QuotesPage from '@/pages/QuotesPage';
import VersesPage from '@/pages/VersesPage';
import BudgetPage from '@/pages/BudgetPage';
import ShoppingPage from '@/pages/ShoppingPage';
import SavingsPage from '@/pages/SavingsPage';
import SettingsPage from '@/pages/SettingsPage';
import HistoryPage from '@/pages/HistoryPage';
import BilanPage from '@/pages/BilanPage';
import HabitsPage from '@/pages/HabitsPage';
import ChecklistPage from '@/pages/ChecklistPage';
import ActionPlanPage from '@/pages/ActionPlanPage';
import SuggestionsPage from '@/pages/SuggestionsPage';
import QualitiesPage from '@/pages/QualitiesPage';
import DiversPage from '@/pages/DiversPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GlowUpProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/historique" element={<HistoryPage />} />
              <Route path="/bilan" element={<BilanPage />} />
              <Route path="/suggestions" element={<SuggestionsPage />} />
              <Route path="/planning" element={<PlanningPage />} />
              <Route path="/habitudes" element={<HabitsPage />} />
              <Route path="/checklist" element={<ChecklistPage />} />
              <Route path="/plan-action" element={<ActionPlanPage />} />
              <Route path="/todo" element={<TodoPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/journal" element={<JournalPage />} />
              <Route path="/versets" element={<VersesPage />} />
              <Route path="/citations" element={<QuotesPage />} />
              <Route path="/divers" element={<DiversPage />} />
              <Route path="/qualites" element={<QualitiesPage />} />
              <Route path="/budget" element={<BudgetPage />} />
              <Route path="/achats" element={<ShoppingPage />} />
              <Route path="/epargne" element={<SavingsPage />} />
              <Route path="/objectifs" element={<MonthlyObjectivesPage />} />
              <Route path="/big-goals" element={<BigGoalsPage />} />
              <Route path="/challenges" element={<ChallengesPage />} />
              <Route path="/reglages" element={<SettingsPage />} />
            </Route>
          </Routes>
        </GlowUpProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
