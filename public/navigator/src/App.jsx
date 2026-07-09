import { BrowserRouter, Routes, Route } from 'react-router-dom';
import VisitList from './VisitList';
import VisitDetail from './VisitDetail';
import RoomJoin from './RoomJoin';
import Lobby from './Lobby';

function App() {
    return (
        <BrowserRouter basename="/navigator">
            <Routes>
                <Route path="/" element={<VisitList />} />
                <Route path="/visits" element={<VisitList />} />
                <Route path="/visit/:id" element={<VisitDetail />} />
                <Route path="/room" element={<RoomJoin />} />
                <Route path="/lobby" element={<Lobby />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;