import { Navigate, Route, Routes, useLocation } from 'react-router';
import BottomNav from './components/BottomNav';
import DbStatus from './components/DbStatus';
import ErrorBoundary from './components/ErrorBoundary';
import UpdatePrompt from './components/UpdatePrompt';
import DataScreen from './screens/DataScreen';
import HistoryScreen from './screens/HistoryScreen';
import EquipmentEdit from './screens/library/EquipmentEdit';
import EquipmentList from './screens/library/EquipmentList';
import ExerciseEdit from './screens/library/ExerciseEdit';
import ExerciseList from './screens/library/ExerciseList';
import TemplateEdit from './screens/library/TemplateEdit';
import TemplateList from './screens/library/TemplateList';
import SessionDetail from './screens/SessionDetail';
import TodayScreen from './screens/TodayScreen';
import TrainingScreen from './screens/TrainingScreen';

export default function App() {
  const { pathname } = useLocation();
  return (
    <div className="app">
      <main className="app-main">
        <DbStatus />
        <ErrorBoundary resetKey={pathname}>
          <Routes>
            <Route path="/" element={<TodayScreen />} />
            <Route path="/training" element={<TrainingScreen />} />
            <Route path="/oefeningen" element={<ExerciseList />} />
            <Route path="/oefeningen/:id" element={<ExerciseEdit />} />
            <Route path="/sjablonen" element={<TemplateList />} />
            <Route path="/sjablonen/:id" element={<TemplateEdit />} />
            <Route path="/materiaal" element={<EquipmentList />} />
            <Route path="/materiaal/:id" element={<EquipmentEdit />} />
            <Route path="/historiek" element={<HistoryScreen />} />
            <Route path="/historiek/:id" element={<SessionDetail />} />
            <Route path="/data" element={<DataScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <UpdatePrompt />
      <BottomNav />
    </div>
  );
}
