import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import VisitList from './VisitList';
import VisitDetail from './VisitDetail';

function App() {
    return (
        <BrowserRouter basename="/navigator">
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/visits" element={<VisitList />} />
                <Route path="/visit/:id" element={<VisitDetail />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;