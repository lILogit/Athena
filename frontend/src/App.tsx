import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import GraphProvider from './store/GraphContext';
import UIProvider from './store/UIContext';

function App() {
  return (
    <Router>
      <UIProvider>
        <GraphProvider>
          <Routes>
            <Route path="/" element={<MainLayout />} />
            <Route path="/graph/:id" element={<MainLayout />} />
          </Routes>
        </GraphProvider>
      </UIProvider>
    </Router>
  );
}

export default App;
