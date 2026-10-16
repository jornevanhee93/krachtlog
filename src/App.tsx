import { Navigate, Route, Routes } from 'react-router';
import BottomNav from './components/BottomNav';
import UpdatePrompt from './components/UpdatePrompt';
import DataScreen from './screens/DataScreen';
import ExercisesScreen from './screens/ExercisesScreen';
import HistoryScreen from './screens/HistoryScreen';
import TodayScreen from './screens/TodayScreen';

export default function App() {
  return (
    <div className="app">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<TodayScreen />} />
          <Route path="/oefeningen" element={<ExercisesScreen />} />
          <Route path="/historiek" element={<HistoryScreen />} />
          <Route path="/data" element={<DataScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <UpdatePrompt />
      <BottomNav />
    </div>
  );
}
