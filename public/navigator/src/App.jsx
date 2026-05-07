import { BrowserRouter, Routes, Route } from 'react-router-dom';
import VisitList from './VisitList';
import VisitDetail from './VisitDetail';

function App() {
    return (
        <BrowserRouter basename="/navigator">
            <Routes>
                <Route path="/" element={<VisitList />} />
                <Route path="/visits" element={<VisitList />} />
                <Route path="/visit/:id" element={<VisitDetail />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;