import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchVisita, fetchItemsByVisita, fetchDescriptionsByItem, fetchQuizByVisita, getDarkMode, setDarkMode, getUser, fetchUser, logout } from './api';
import ProfileModal from './Profile';

const LEVELS = ['infantile', 'semplice', 'medio', 'dettagliato'];
const LENGTHS = ['3s', '15s', '40s'];

function VisitDetail() {
    const { id } = useParams();
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const pin = query.get('pin');
    const role = query.get('role'); // 'teacher' o null/studente
    const initialIndex = parseInt(query.get('index')) || 0;
    const navigate = useNavigate();

    const [visita, setVisita] = useState(null);
    const [items, setItems] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [darkMode, setDarkModeState] = useState(getDarkMode());
    const [user, setUser] = useState(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [descriptions, setDescriptions] = useState([]);
    const [selectedType, setSelectedType] = useState('medio');
    const [selectedLength, setSelectedLength] = useState('15s');
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Nuovi stati per Chat e Azioni
    const [chatMessages, setChatMessages] = useState([]);
    const [chatFilter, setChatFilter] = useState('all');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [connectedStudents, setConnectedStudents] = useState([]);
    const [studentActions, setStudentActions] = useState({});
    const [lightboxImage, setLightboxImage] = useState(null);
    const messagesEndRef = useRef(null);
    const currentIndexRef = useRef(currentIndex);

    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);

    // Stati per il Quiz di fine visita
    const [hasQuiz, setHasQuiz] = useState(false);
    const [quizPhase, setQuizPhase] = useState('none'); // 'none' | 'active' | 'results'
    const [quizQuestions, setQuizQuestions] = useState([]); // domande senza correctIndex (arrivano via SSE)
    const [quizAnswers, setQuizAnswers] = useState({}); // { [questionId]: selectedIndex } - risposte locali dello studente
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizResults, setQuizResults] = useState(null); // array [{ studentName, score, total, details }]
    const [studentsSubmitted, setStudentsSubmitted] = useState([]); // nomi studenti che hanno gia' inviato (vista docente)

    // Stato per riconoscimento vocale
    const [isListeningForVoice, setIsListeningForVoice] = useState(false);

    // Azzera i messaggi non letti se la chat è aperta e scrolla in basso
    useEffect(() => {
        if (isChatOpen) {
            setUnreadCount(0);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [isChatOpen, chatMessages]);
    
    // Ferma la sintesi vocale
    const stopSpeaking = useCallback(() => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    // Leggi il testo ad alta voce
    const speak = useCallback((text) => {
        stopSpeaking();
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'it-IT';
        utterance.rate = 1;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
    }, [stopSpeaking]);

    // Dimmi di più / dimmi di meno
    const changeLevelUp = () => {
        const i = LEVELS.indexOf(selectedType);
        if (i < LEVELS.length - 1) setSelectedType(LEVELS[i + 1]);
    };
    const changeLevelDown = () => {
        const i = LEVELS.indexOf(selectedType);
        if (i > 0) setSelectedType(LEVELS[i - 1]);
    };

    const changeLengthUp = () => {
        const i = LENGTHS.indexOf(selectedLength);
        if (i < LENGTHS.length - 1) setSelectedLength(LENGTHS[i + 1]);
    };
    const changeLengthDown = () => {
        const i = LENGTHS.indexOf(selectedLength);
        if (i > 0) setSelectedLength(LENGTHS[i - 1]);
    };

    const goToNextItem = () => {
        if (currentIndexRef.current < items.length - 1) {
            handleIndexChange(currentIndexRef.current + 1);
        }
    };
    const goToPrevItem = () => {
        if (currentIndexRef.current > 0) {
            handleIndexChange(currentIndexRef.current - 1);
        }
    };

    const handleStudentAction = async (actionType) => {
        const studentName = user?.name || localStorage.getItem('studentName');
        if (!pin || role === 'teacher' || !studentName) return;
        try {
            await fetch('/api/rooms/student-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin, studentName, action: actionType })
            });
        } catch (e) {
            console.error(e);
        }
    };

    const sendChatMessage = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !pin) return;
        
        const msg = chatInput.trim();
        setChatInput('');
        
        try {
            const senderName = user?.name || localStorage.getItem('studentName') || 'Studente';
            await fetch('/api/rooms/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin, sender: senderName, message: msg, type: 'user' })
            });
        } catch (err) {
            console.error(err);
        }
    };

    const respondToJoin = async (reqId, isAccepted) => {
        if (!pin) return;
        try {
            await fetch(`/api/rooms/${isAccepted ? 'accept-join' : 'reject-join'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin, reqId })
            });
            // Rimuovi la richiesta dalla chat
            setChatMessages(prev => prev.filter(m => m.reqId !== reqId));
        } catch (err) {
            console.error(err);
        }
    };

    // Riconoscimento vocale per i comandi
    const startVoiceRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Il tuo browser non supporta i comandi vocali.');
            return;
        }

        if (isListeningForVoice) return; // Prevent multiple starts

        const recognition = new SpeechRecognition();
        recognition.lang = 'it-IT';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListeningForVoice(true);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();

            // Autore
            if (transcript.includes('autore') || transcript.includes('dipinto') || transcript.includes("chi l'ha")) {
                 const author = currentItem?.author || "Autore sconosciuto";
                 speak("L'autore è " + author);
                 return;
            }

            // Navigazione
            if (transcript.includes('avanti') || transcript.includes('prossimo') || transcript.includes('successivo')) {
                 if (role === 'student' && pin) {
                     toast.warning("In visita guidata non puoi cambiare opera!");
                 } else {
                     goToNextItem();
                 }
                 return;
            }
            if (transcript.includes('indietro') || transcript.includes('precedente')) {
                 if (role === 'student' && pin) {
                     toast.warning("In visita guidata non puoi cambiare opera!");
                 } else {
                     goToPrevItem();
                 }
                 return;
            }
            
            // Difficoltà
            if (transcript.includes('più semplice') || transcript.includes('non capisco')) {
                changeLevelDown();
                handleStudentAction('minus');
                return;
            }
            if (transcript.includes('troppo semplice') || transcript.includes('meno scolastico')) {
                changeLevelUp();
                handleStudentAction('plus');
                return;
            }

            // Lunghezza
            if (transcript.includes('di più') || transcript.includes('più dettagli') || transcript.includes('aumenta')) {
                changeLengthUp();
                handleStudentAction('plus');
                return;
            }
            if (transcript.includes('di meno') || transcript.includes('meno dettagli') || transcript.includes('diminuisci')) {
                changeLengthDown();
                handleStudentAction('minus');
                return;
            }

            console.error(`Comando non riconosciuto: "${transcript}"`);
        };

        recognition.onerror = (event) => {
            console.error('Errore riconoscimento vocale:', event.error);
            setIsListeningForVoice(false);
            if (event.error !== 'no-speech') {
                console.error("Errore durante l'ascolto.");
            }
        };

        recognition.onend = () => setIsListeningForVoice(false);

        try {
            recognition.start();
        } catch (e) {
            console.error('Impossibile avviare riconoscimento:', e);
            setIsListeningForVoice(false);
        }
    };

    // --- QUIZ: azioni docente ---
    const startQuiz = async () => {
        if (!pin) return;
        try {
            const res = await fetch('/api/rooms/quiz/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });
            if (!res.ok) {
                const err = await res.json();
                alert(err.error || "Errore nell'avvio del quiz");
            }
        } catch (err) {
            console.error("Errore avvio quiz:", err);
        }
    };

    const finishQuiz = async () => {
        if (!pin) return;
        try {
            await fetch('/api/rooms/quiz/finish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });
        } catch (err) {
            console.error("Errore chiusura quiz:", err);
        }
    };

    // --- QUIZ: azioni studente ---
    const selectQuizAnswer = (questionId, optionIndex) => {
        setQuizAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };

    const submitQuizAnswers = async () => {
        if (!pin) return;
        const studentName = user?.name || localStorage.getItem('studentName');
        if (!studentName) return;
        try {
            await fetch('/api/rooms/quiz/answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin, studentName, answers: quizAnswers })
            });
            setQuizSubmitted(true);
        } catch (err) {
            console.error("Errore invio risposte quiz:", err);
        }
    };

    useEffect(() => {
        // Applica la classe dark-mode al body
        if (darkMode) {
            document.documentElement.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode');
        }

        // Sincronizza dark mode con localStorage
        const handleStorageChange = () => {
            const newDarkMode = getDarkMode();
            setDarkModeState(newDarkMode);
            if (newDarkMode) {
                document.documentElement.classList.add('dark-mode');
            } else {
                document.documentElement.classList.remove('dark-mode');
            }
        };

        window.addEventListener('storage', handleStorageChange);

        // Carica utente
        const initUser = async () => {
            const userData = await fetchUser();
            setUser(userData);
        };
        initUser();

        const fetchAllData = async () => {
            try {
                if (pin) {
                    const roomRes = await fetch(`/api/rooms/check/${pin}`);
                    if (!roomRes.ok) throw new Error("Errore durante la verifica della stanza.");
                    const roomData = await roomRes.json();
                    if (!roomData.exists) {
                        throw new Error("Stanza non disponibile o codice errato.");
                    }
                }
                const [visitaData, itemsData] = await Promise.all([fetchVisita(id), fetchItemsByVisita(id)]);
                setVisita(visitaData);
                setItems(itemsData);

                // Verifica se questa visita ha un quiz di fine visita associato
                try {
                    const quiz = await fetchQuizByVisita(id);
                    setHasQuiz(quiz.length > 0);
                } catch (quizErr) {
                    // Non bloccante: se il quiz non si carica, semplicemente non viene mostrato
                    console.error("Errore nel controllo quiz:", quizErr);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
                if (window.hideMainLoader) window.hideMainLoader();
            }
        };
        
        fetchAllData();

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            document.documentElement.classList.remove('dark-mode');
        };
    }, [id, darkMode]);

    useEffect(() => {
        if (items.length > 0) {
            const currentItemId = items[currentIndex]?._id;
            if (currentItemId) {
                fetchDescriptionsByItem(currentItemId)
                    .then(data => setDescriptions(data))
                    .catch(err => console.error(err));
            }
        }
    }, [currentIndex, items]);

    // SSE Effect per stanza (studenti e docente)
    useEffect(() => {
        if (!pin) return;
        
        const eventSource = new EventSource(`/api/rooms/events/${pin}`);
        
        if (role !== 'teacher') {
            eventSource.addEventListener('artwork-changed', (e) => {
                const data = JSON.parse(e.data);
                if (data.artworkIndex !== undefined) {
                    setCurrentIndex(data.artworkIndex);
                    // Ferma l'audio precedente se stava parlando
                    stopSpeaking();
                }
            });
        }
        
        // Logica comune / Docente
        eventSource.addEventListener('connected', (e) => {
            const data = JSON.parse(e.data);
            setConnectedStudents(data.students || []);
            if (data.currentArtworkIndex !== undefined) {
                setCurrentIndex(data.currentArtworkIndex);
            }
        });

        eventSource.addEventListener('student-joined', (e) => {
            const data = JSON.parse(e.data);
            setConnectedStudents(data.students || []);
        });

        eventSource.addEventListener('student-action', (e) => {
            if (role !== 'teacher') return;
            const data = JSON.parse(e.data);
            setStudentActions(prev => ({
                ...prev,
                [data.studentName]: data.action
            }));

            // Rimuovi l'icona dopo 5 secondi
            setTimeout(() => {
                setStudentActions(prev => {
                    const next = { ...prev };
                    if (next[data.studentName] === data.action) {
                        delete next[data.studentName];
                    }
                    return next;
                });
            }, 5000);
        });

        eventSource.addEventListener('join-request', (e) => {
            if (role === 'teacher') {
                const data = JSON.parse(e.data);
                setChatMessages(prev => [...prev, {
                    id: Date.now(),
                    type: 'system-action',
                    reqId: data.reqId,
                    message: `${data.studentName} ha richiesto di entrare.`,
                    timestamp: new Date().toISOString()
                }]);
                setUnreadCount(prev => prev + 1);
            }
        });

        eventSource.addEventListener('chat-message', (e) => {
            const data = JSON.parse(e.data);
            if (data.type === 'system' && role !== 'teacher') return;
            
            setChatMessages(prev => [...prev, {
                id: Date.now() + Math.random(),
                type: data.type,
                sender: data.sender,
                message: data.message,
                timestamp: data.timestamp
            }]);
            setUnreadCount(prev => prev + 1);
        });

        eventSource.addEventListener('room-ended', (e) => {
            if (role !== 'teacher') {
                alert("La visita è stata terminata dall'insegnante.");
                window.location.href = '/navigator/';
            }
        });

        // --- QUIZ: eventi live ---
        eventSource.addEventListener('quiz-started', (e) => {
            const data = JSON.parse(e.data);
            setQuizQuestions(data.questions || []);
            setQuizAnswers({});
            setQuizSubmitted(false);
            setQuizResults(null);
            setStudentsSubmitted([]);
            setQuizPhase('active');
        });

        eventSource.addEventListener('quiz-student-submitted', (e) => {
            if (role !== 'teacher') return;
            const data = JSON.parse(e.data);
            setStudentsSubmitted(prev => prev.includes(data.studentName) ? prev : [...prev, data.studentName]);
        });

        eventSource.addEventListener('quiz-results', (e) => {
            const data = JSON.parse(e.data);
            setQuizResults(data.results || []);
            setQuizPhase('results');
        });

        return () => {
            eventSource.close();
        };
    }, [pin, role, stopSpeaking]);

    const handleIndexChange = async (newIndex) => {
        if (newIndex < 0 || newIndex >= items.length) return;
        
        if (pin && role === 'teacher' && Object.keys(studentActions).length > 0) {
            const proceed = window.confirm("Attenzione: alcuni studenti hanno appena fatto delle richieste. Sei sicuro di voler cambiare opera comunque?");
            if (!proceed) return;
        }

        setCurrentIndex(newIndex);
        
        if (pin && role === 'teacher') {
            try {
                await fetch('/api/rooms/change-artwork', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin, artworkIndex: newIndex })
                });
            } catch (err) {
                console.error("Errore nel cambio opera remoto:", err);
            }
        }
    };

    const handleEndVisit = async () => {
        if (!pin) {
            if (!window.confirm("Vuoi uscire dalla visita?")) return;
            navigate('/');
            return;
        }

        if (!window.confirm("Sei sicuro di voler terminare la visita per tutti? La stanza verrà chiusa.")) return;
        
        try {
            await fetch('/api/rooms/end', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });
            navigate('/');
        } catch (err) {
            console.error("Errore nella chiusura della stanza:", err);
            navigate('/');
        }
    };

    const currentDescription = descriptions.find(d => d.type === selectedType && d.length === selectedLength) 
                             || descriptions.find(d => d.type === selectedType) 
                             || descriptions[0];

    const toggleDarkMode = () => {
        const newValue = !darkMode;
        setDarkModeState(newValue);
        setDarkMode(newValue);
    };

    const handleLogout = () => {
        logout();
        setUser(null);
        setUserMenuOpen(false);
        window.location.href = '/index.html';
    };

    const bgMain = darkMode ? 'bg-dark text-white' : 'bg-white text-dark';
    const bgNavbar = darkMode ? 'glass-header border-bottom border-secondary border-opacity-10' : 'glass-header-light shadow-sm';
    const brandColor = darkMode ? 'text-white' : 'text-primary';
    const bgCard = darkMode ? 'bg-dark border border-secondary border-opacity-25' : 'bg-white border';
    const textMuted = darkMode ? 'text-white-50' : 'text-secondary';
    const bgFooter = darkMode ? 'bg-dark border-top border-secondary border-opacity-25' : 'bg-light border-top';
    const footerText = darkMode ? 'text-white-50' : 'text-secondary';

    if (loading) return null; // Lascia visibile il mainLoader HTML

    if (error) return (
        <div className={`vh-100 d-flex flex-column align-items-center justify-content-center text-center px-4 ${bgMain}`}>
            <i className="bi bi-exclamation-triangle text-red icon-5xl mb-3"></i>
            <h3 className={`fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>Errore</h3>
            <p className={textMuted}>{error}</p>
            <Link to="/" className="btn btn-outline-red rounded-pill px-4">← Torna alla lista</Link>
        </div>
    );

    if (!visita) return (
        <div className="vh-100 d-flex flex-column align-items-center justify-content-center text-center">
            <i className="bi bi-question-circle text-white-50 icon-5xl mb-3"></i>
            <h3 className="fw-bold">Visita non trovata</h3>
            <Link to="/" className="btn btn-outline-red rounded-pill px-4 mt-3">← Torna alla lista</Link>
        </div>
    );

    if (items.length === 0) return (
        <div className={`min-vh-100 d-flex flex-column ${bgMain}`}>
            {/* NAVBAR */}
            <header className={`navbar sticky-top py-3 desktop-navbar transition-theme border-0 ${bgNavbar}`}>
                <div className="container-lg d-flex justify-content-between align-items-center">
                    <a href="/" className={`navbar-brand fw-black fs-4 m-0 d-flex align-items-center gap-2 ${brandColor}`}>
                        <div className="bg-orange-subtle text-orange p-2 rounded-3 d-flex align-items-center justify-content-center">
                            <i className="bi bi-box-seam fs-5"></i>
                        </div>
                        <span className="tracking-tight-sm">ArtAround</span>
                    </a>
            </div>
        </header>
        <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center px-4">
            <i className={`bi bi-inbox ${textMuted} icon-5xl mb-3`}></i>
            <h3 className="fw-bold">{visita.name}</h3>
            <p className={textMuted}>Nessuna opera in questa visita.</p>
            <Link to="/" className="btn btn-outline-red rounded-pill px-4 mt-2">← Torna alla lista</Link>
        </div>
    </div>
);

    const currentItem = items[currentIndex];

    // Avatar Logic
    const maxVisibleAvatars = 4;
    const activeRequesters = connectedStudents.filter(s => studentActions[s]);
    const idleStudents = connectedStudents.filter(s => !studentActions[s]);
    const sortedStudents = [...activeRequesters, ...idleStudents];
    
    let visibleStudents = sortedStudents;
    let hiddenCount = 0;
    if (sortedStudents.length > 4) {
        visibleStudents = sortedStudents.slice(0, 3);
        hiddenCount = sortedStudents.length - 3;
    }

    return (
        <div className={`vh-100 d-flex flex-column overflow-hidden position-relative ${darkMode ? 'bg-black text-white' : 'bg-dark text-white'}`}>
            <style>{`
                @keyframes slideDownFade {
                    0% { opacity: 0; transform: translateY(-10px) scale(0.95); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animated-dropdown.show {
                    animation: slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    transform-origin: top right;
                }
            `}</style>
            
            {/* BACKGROUND DINAMICO (Prende tutto lo schermo) */}
            {currentItem.img_path && (
                <div className="position-absolute w-100 h-100 dynamic-bg-blur" style={{ backgroundImage: `url(${currentItem.img_path})` }}></div>
            )}
            
            {/* NAVBAR (Semplice, non a pillola intera, icone separate) */}
            <header className="w-100 px-3 py-3 position-relative z-1030">
                <div className="d-flex align-items-center justify-content-between">
                    
                    {/* SINISTRA: Back + Logo */}
                    <div className="d-flex align-items-center gap-3">
                        <Link to="/" className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm btn-icon-40 ${darkMode ? 'bg-dark text-white border border-secondary' : 'bg-light text-dark border'}`} title="Torna alla Home">
                            <i className="bi bi-arrow-left fs-5"></i>
                        </Link>
                        <div className="d-none d-md-flex align-items-center gap-2 px-3 py-2 rounded-pill bg-dark bg-opacity-50 border border-secondary glass-blur-5">
                            <i className="bi bi-box-seam text-orange fs-5"></i>
                            <span className="fw-black fs-6 text-white tracking-tight-sm">ArtAround</span>
                        </div>
                    </div>

                    {/* CENTRO: Titolo dell'opera (nascosto se lo schermo è piccolo) */}
                    <div className="text-center px-2 d-none d-md-block text-truncate">
                        <h6 className="m-0 fw-bold text-white shadow-sm px-4 py-2 rounded-pill bg-dark bg-opacity-50 border border-secondary text-truncate max-w-400 glass-blur-5">
                            {currentItem.item.replace(/\s*\d{10,}$/, '')}
                        </h6>
                    </div>

                    {/* DESTRA: Icone separate */}
                    <div className="d-flex align-items-center">
                        {/* AVATAR BAR DOCENTE - PILLOLA UNICA */}
                        {role === 'teacher' && pin && (
                            <div className="d-flex align-items-center pe-3 border-end border-secondary border-opacity-50 d-none d-sm-flex me-3">
                                <div className="dropdown">
                                    <button 
                                        className="btn btn-sm px-2 py-1 rounded-pill bg-dark bg-opacity-50 border border-secondary shadow-sm d-flex align-items-center gap-2" 
                                        data-bs-toggle="dropdown" 
                                        title="Gestione Studenti"
                                        type="button"
                                    >
                                        <div className="d-flex align-items-center">
                                            {visibleStudents.map((student, idx) => {
                                                const action = studentActions[student];
                                                return (
                                                    <div key={idx} className="position-relative flex-shrink-0" style={{ zIndex: visibleStudents.length - idx, marginLeft: idx > 0 ? '-12px' : '0' }}>
                                                        <div className={`user-avatar rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold shadow-sm border border-2 border-dark avatar-sm-075 ${action ? 'border-orange' : ''}`}>
                                                            {student.charAt(0).toUpperCase()}
                                                        </div>
                                                        {action && (
                                                            <span className="position-absolute top-0 start-100 translate-middle p-1 rounded-circle bg-orange border border-1 border-white shadow-sm indicator-dot"></span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {hiddenCount > 0 && (
                                                <div className="user-avatar rounded-circle bg-dark d-flex align-items-center justify-content-center text-white fw-bold shadow-sm border border-2 border-secondary avatar-sm-065 overlap-avatar-left">
                                                    +{hiddenCount}
                                                </div>
                                            )}
                                        </div>
                                        <i className="bi bi-chevron-down text-white-50 ms-1 me-1 fs-07"></i>
                                    </button>

                                    {/* DROPDOWN CON LA LISTA ATTIVITÀ DI TUTTI GLI STUDENTI */}
                                    <ul className={`dropdown-menu dropdown-menu-end animated-dropdown shadow-lg border-0 p-2 mt-2 min-w-260 ${darkMode ? 'dropdown-menu-dark' : ''}`}>
                                        <li className="px-3 pb-2 mb-2 border-bottom border-secondary border-opacity-25">
                                            <h6 className="m-0 fw-bold">Stato Studenti ({connectedStudents.length})</h6>
                                        </li>
                                        {connectedStudents.length === 0 && (
                                            <li className="dropdown-item text-muted small disabled">Nessuno studente connesso</li>
                                        )}
                                        {connectedStudents.map(student => {
                                            const action = studentActions[student];
                                            let icon = ''; let iconColor = ''; let actionText = '';
                                            if (action === 'plus') { icon = 'bi-plus-circle-fill'; iconColor = 'text-success'; actionText = 'Più dettagli'; }
                                            else if (action === 'minus') { icon = 'bi-dash-circle-fill'; iconColor = 'text-danger'; actionText = 'Meno dettagli'; }
                                            else if (action === 'audio') { icon = 'bi-mic-fill'; iconColor = 'text-primary'; actionText = 'Audio'; }
                                            
                                            return (
                                                <li key={student} className="dropdown-item rounded d-flex align-items-center justify-content-between py-2 mb-1 cursor-default">
                                                    <span className="fw-bold small text-truncate max-w-120">{student}</span>
                                                    {actionText ? (
                                                        <span className={`badge bg-opacity-10 d-flex align-items-center gap-1 fs-065 ${iconColor.replace('text-', 'bg-')} ${iconColor}`}>
                                                            <i className={`bi ${icon}`}></i> {actionText}
                                                        </span>
                                                    ) : (
                                                        <small className="text-muted fst-italic fs-065">
                                                            <i className="bi bi-eye"></i> Online
                                                        </small>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* THEME TOGGLE (Solo Icona) */}
                        <button 
                            className="btn btn-sm border-0 shadow-none p-1 d-flex align-items-center justify-content-center"
                            onClick={() => toggleDarkMode()}
                            title="Cambia tema"
                        >
                            <i className={`bi ${darkMode ? 'bi-sun-fill text-warning' : 'bi-moon-stars-fill text-primary'} fs-4`}></i>
                        </button>

                        {/* CHAT TOGGLE (Solo Icona) */}
                        {pin && (
                            <button 
                                className="btn btn-sm border-0 shadow-none p-1 position-relative d-flex align-items-center justify-content-center"
                                onClick={() => { setIsChatOpen(true); setUnreadCount(0); }}
                                title="Chat Stanza"
                            >
                                <i className={`bi bi-chat-dots-fill fs-4 ${darkMode ? 'text-info' : 'text-primary'}`}></i>
                                {unreadCount > 0 && (
                                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-2 border-dark fs-065">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                        )}

                    </div>
                </div>
            </header>

            {/* CONTENUTO FULL SCREEN IMMERSIVO */}
            <main className="flex-grow-1 w-100 d-flex flex-column scroll-y-hidden-x z-10">
                
                {/* MAIN IMAGE */}
                <div className="flex-grow-1 w-100 d-flex justify-content-center align-items-center p-3 min-h-250">
                    {currentItem.img_path && (
                        <img
                            src={currentItem.img_path}
                            alt={currentItem.item.replace(/\s*\d{10,}$/, '')}
                            className="img-fluid rounded-4 shadow-lg zoom-image-contain"
                            onClick={() => setLightboxImage(currentItem.img_path)}
                        />
                    )}
                </div>

                {/* BOTTOM TEXT & ACTION CARD */}
                <div className="w-100 p-2 p-md-4 flex-shrink-0 z-20 pb-safe">
                    <div className="container-lg px-0">
                        <div className="row justify-content-center">
                            <div className="col-12 col-md-10 col-lg-8">
                                <div className={`card border-0 rounded-4 shadow-lg glass-blur-15 ${darkMode ? 'bg-dark bg-opacity-75 text-white' : 'bg-white bg-opacity-90 text-dark'}`}>
                                    <div className="card-body p-3 p-md-4">
                                        <div className="d-flex justify-content-between align-items-start mb-3 gap-2 flex-wrap">
                                            <div className="flex-1-min-w-0">
                                                <h3 className="fw-black mb-1 tracking-tight-sm">{currentItem.item.replace(/\s*\d{10,}$/, '')}</h3>
                                                {visita.museum_id && <small className="d-block mb-2 opacity-75"><i className="bi bi-geo-alt-fill text-orange me-1"></i>{visita.museum_id.museum}</small>}
                                                <span className="badge bg-orange text-white rounded-pill px-3 py-2 shadow-sm"><i className="bi bi-person-fill me-1"></i>{currentItem.author}</span>
                                            </div>
                                            
                                            {/* ACTION BUTTONS */}
                                            <div className="d-flex flex-column align-items-end gap-2 w-100 mt-2 mt-sm-0 flex-sm-row justify-content-sm-end">
                                                <div className={`d-flex flex-wrap align-items-center justify-content-center rounded-pill p-1 shadow-sm border ${darkMode ? 'bg-dark border-secondary' : 'bg-white border-light'}`}>
                                                    <span className="small ms-2 me-1 fw-bold d-none d-sm-inline">Difficoltà:</span>
                                                    <button onClick={() => { changeLevelDown(); handleStudentAction('minus'); }} disabled={LEVELS.indexOf(selectedType) === 0} className="btn btn-sm btn-outline-danger rounded-start-pill px-2 fw-bold" title="Più semplice"><i className="bi bi-dash"></i></button>
                                                    <span className="px-2 fw-bold fs-085 text-uppercase" style={{ minWidth: '80px', textAlign: 'center' }}>{selectedType}</span>
                                                    <button onClick={() => { changeLevelUp(); handleStudentAction('plus'); }} disabled={LEVELS.indexOf(selectedType) === LEVELS.length - 1} className="btn btn-sm btn-outline-success rounded-end-pill px-2 fw-bold" title="Più avanzato"><i className="bi bi-plus"></i></button>
                                                    
                                                    <span className="mx-2">|</span>
                                                    
                                                    <span className="small me-1 fw-bold d-none d-sm-inline">Tempo:</span>
                                                    <button onClick={() => { changeLengthDown(); handleStudentAction('minus'); }} disabled={LENGTHS.indexOf(selectedLength) === 0} className="btn btn-sm btn-outline-danger rounded-start-pill px-2 fw-bold" title="Meno dettagli"><i className="bi bi-dash"></i></button>
                                                    <span className="px-2 fw-bold fs-085 text-uppercase" style={{ minWidth: '40px', textAlign: 'center' }}>{selectedLength}</span>
                                                    <button onClick={() => { changeLengthUp(); handleStudentAction('plus'); }} disabled={LENGTHS.indexOf(selectedLength) === LENGTHS.length - 1} className="btn btn-sm btn-outline-success rounded-end-pill px-2 fw-bold" title="Più dettagli"><i className="bi bi-plus"></i></button>

                                                    <span className="mx-2 text-muted">|</span>

                                                    <button onClick={() => { if(isSpeaking) stopSpeaking(); else { speak(currentDescription?.text); handleStudentAction('audio'); } }} disabled={!currentDescription} className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm mx-1 text-white btn-icon-32 ${isSpeaking ? 'btn-warning' : 'btn-primary'}`} title="Ascolta descrizione">
                                                        <i className={`bi ${isSpeaking ? 'bi-stop-fill' : 'bi-headphones'} fs-6`}></i>
                                                    </button>
                                                    <button onClick={startVoiceRecognition} className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm mx-1 text-white btn-icon-32 ${isListeningForVoice ? 'btn-danger pulse-animation' : 'btn-info'}`} title="Comandi vocali">
                                                        <i className={`bi ${isListeningForVoice ? 'bi-mic-fill' : 'bi-mic'} fs-6`}></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SCROLLABLE TESTO */}
                                        <div className="overflow-auto mt-2 pe-2 max-h-20vh scrollbar-thin">
                                            {currentDescription ? (
                                                <p className="mb-0 lh-lg fs-1-fw-500">
                                                    {currentDescription.text}
                                                </p>
                                            ) : (
                                                <p className="mb-0 text-center mt-3 text-muted">
                                                    Manca la descrizione per il livello <strong>{selectedType}</strong>.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* PREV NEXT BUTTONS FOR TEACHER */}
                                {(!pin || role === 'teacher') && (
                                    <div className="d-flex justify-content-center align-items-center mt-3 gap-2 gap-md-4">
                                        <button onClick={() => handleIndexChange(currentIndex - 1)} disabled={currentIndex === 0} className={`btn btn-lg rounded-pill px-4 py-2 shadow-lg fw-bold d-flex align-items-center gap-2 glass-blur-10 ${darkMode ? 'bg-dark bg-opacity-75 border border-secondary text-white' : 'bg-white bg-opacity-90 border text-dark'}`}>
                                            <i className="bi bi-arrow-left"></i> <span className="d-none d-sm-inline">Precedente</span>
                                        </button>
                                        
                                        <div className="d-flex flex-wrap justify-content-center gap-1 bg-dark bg-opacity-50 px-3 py-2 rounded-pill shadow-lg glass-blur-5">
                                            {items.map((_, i) => (
                                                <button key={i} onClick={() => handleIndexChange(i)} className={`btn p-0 border-0 rounded-circle shadow indicator-dot-lg transition-all-300 ${i === currentIndex ? 'bg-orange' : 'bg-secondary'}`}></button>
                                            ))}
                                        </div>
                                        
                                        {currentIndex === items.length - 1 ? (
                                            (pin && hasQuiz && role === 'teacher' && quizPhase === 'none') ? (
                                                <button onClick={startQuiz} className="btn btn-lg bg-orange text-white rounded-pill px-4 py-2 shadow-lg fw-bold d-flex align-items-center gap-2 glass-blur-10">
                                                    <span className="d-none d-sm-inline">Avvia Quiz</span> <i className="bi bi-patch-question"></i>
                                                </button>
                                            ) : (
                                                <button onClick={handleEndVisit} className="btn btn-lg btn-danger text-white rounded-pill px-4 py-2 shadow-lg fw-bold d-flex align-items-center gap-2 glass-blur-10">
                                                    <span className="d-none d-sm-inline">Termina Visita</span> <i className="bi bi-stop-circle"></i>
                                                </button>
                                            )
                                        ) : (
                                            <button onClick={() => handleIndexChange(currentIndex + 1)} className="btn btn-lg bg-orange text-white rounded-pill px-4 py-2 shadow-lg fw-bold d-flex align-items-center gap-2 glass-blur-10">
                                                <span className="d-none d-sm-inline">Successiva</span> <i className="bi bi-arrow-right"></i>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* QUIZ OVERLAY (monitoraggio docente / risposta studente / risultati) */}
            {pin && quizPhase !== 'none' && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000 }}>
                    <div className={`card border-0 rounded-4 shadow-lg glass-blur-15 w-100 max-w-600 ${darkMode ? 'bg-dark bg-opacity-90 text-white' : 'bg-white text-dark'}`} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="card-body p-4 p-md-5">

                            {/* DOCENTE: monitoraggio quiz in corso */}
                            {role === 'teacher' && quizPhase === 'active' && (
                                <>
                                    <h3 className="fw-black mb-2"><i className="bi bi-patch-question text-orange me-2"></i>Quiz in corso</h3>
                                    <p className={textMuted}>Gli studenti stanno rispondendo a {quizQuestions.length} domande.</p>
                                    <div className="my-4">
                                        <h6 className="fw-bold mb-2">Hanno risposto ({studentsSubmitted.length}/{connectedStudents.length})</h6>
                                        <div className="d-flex flex-wrap gap-2">
                                            {connectedStudents.length === 0 && (
                                                <span className={textMuted}>Nessuno studente connesso</span>
                                            )}
                                            {connectedStudents.map(s => (
                                                <span key={s} className={`badge rounded-pill px-3 py-2 ${studentsSubmitted.includes(s) ? 'bg-success' : 'bg-secondary'}`}>
                                                    {studentsSubmitted.includes(s) && <i className="bi bi-check-lg me-1"></i>}
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={finishQuiz} className="btn bg-orange text-white rounded-pill px-4 py-2 fw-bold w-100">
                                        <i className="bi bi-flag-fill me-2"></i>Termina Quiz e mostra risultati
                                    </button>
                                </>
                            )}

                            {/* STUDENTE: rispondi al quiz */}
                            {role !== 'teacher' && quizPhase === 'active' && !quizSubmitted && (
                                <>
                                    <h3 className="fw-black mb-3"><i className="bi bi-patch-question text-orange me-2"></i>Quiz finale</h3>
                                    {quizQuestions.map((q, qi) => (
                                        <div key={q._id} className="mb-4">
                                            <h6 className="fw-bold mb-2">{qi + 1}. {q.question}</h6>
                                            <div className="d-flex flex-column gap-2">
                                                {q.options.map((opt, oi) => (
                                                    <button
                                                        key={oi}
                                                        type="button"
                                                        onClick={() => selectQuizAnswer(q._id, oi)}
                                                        className={`btn text-start rounded-3 py-2 px-3 ${quizAnswers[q._id] === oi ? 'bg-orange text-white' : (darkMode ? 'btn-outline-light' : 'btn-outline-dark')}`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        onClick={submitQuizAnswers}
                                        disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                                        className="btn bg-orange text-white rounded-pill px-4 py-2 fw-bold w-100 mt-2"
                                    >
                                        Invia risposte
                                    </button>
                                </>
                            )}

                            {/* STUDENTE: in attesa dopo l'invio */}
                            {role !== 'teacher' && quizPhase === 'active' && quizSubmitted && (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-orange mb-3" role="status"></div>
                                    <h5 className="fw-bold">Risposte inviate!</h5>
                                    <p className={textMuted}>In attesa che il docente concluda il quiz...</p>
                                </div>
                            )}

                            {/* RISULTATI (docente e studente) */}
                            {quizPhase === 'results' && quizResults && (
                                <>
                                    <h3 className="fw-black mb-3"><i className="bi bi-bar-chart-fill text-orange me-2"></i>Risultati Quiz</h3>

                                    {role === 'teacher' ? (
                                        <div className="d-flex flex-column gap-2 mb-4">
                                            {[...quizResults]
                                                .sort((a, b) => b.score - a.score)
                                                .map(r => (
                                                    <div key={r.studentName} className={`d-flex justify-content-between align-items-center p-3 rounded-3 ${darkMode ? 'bg-secondary bg-opacity-10' : 'bg-light'}`}>
                                                        <span className="fw-bold">{r.studentName}</span>
                                                        <span className="badge bg-orange text-white rounded-pill px-3 py-2">{r.score}/{r.total}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        (() => {
                                            const studentName = user?.name || localStorage.getItem('studentName');
                                            const myResult = quizResults.find(r => r.studentName === studentName);
                                            return myResult ? (
                                                <div className="text-center py-4">
                                                    <h1 className="display-3 fw-black text-orange mb-0">{myResult.score}/{myResult.total}</h1>
                                                    <p className={textMuted}>Il tuo punteggio</p>
                                                </div>
                                            ) : (
                                                <p className={`text-center ${textMuted}`}>Non hai completato il quiz in tempo.</p>
                                            );
                                        })()
                                    )}

                                    {role === 'teacher' && (
                                        <button onClick={handleEndVisit} className="btn btn-danger text-white rounded-pill px-4 py-2 fw-bold w-100">
                                            <i className="bi bi-stop-circle me-2"></i>Termina Visita
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* LIGHTBOX MODAL */}
            {lightboxImage && (
                <div className="modal-backdrop fade show lightbox-backdrop" onClick={() => setLightboxImage(null)}></div>
            )}
            {lightboxImage && (
                <div className="modal fade show d-block z-1060" tabIndex="-1" onClick={() => setLightboxImage(null)}>
                    <div className="modal-dialog modal-dialog-centered modal-xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-content bg-transparent border-0">
                            <div className="modal-header border-0 pb-0 justify-content-end">
                                <button type="button" className="btn-close btn-close-white shadow-none bg-dark rounded-circle p-2 opacity-80" onClick={() => setLightboxImage(null)}></button>
                            </div>
                            <div className="modal-body text-center p-0">
                                <img src={lightboxImage} alt="Ingrandita" className="img-fluid rounded-4 shadow-lg lightbox-img" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <ProfileModal 
                isOpen={isProfileModalOpen} 
                onClose={() => setIsProfileModalOpen(false)} 
                user={user} 
                onUpdate={(updatedUser) => setUser(updatedUser)} 
            />

            {/* OFFCANVAS CHAT */}
            {pin && (
                <div className={`offcanvas offcanvas-end z-1050 ${isChatOpen ? 'show d-flex visible' : 'invisible'} ${darkMode ? 'bg-dark text-white' : 'bg-light'}`} tabIndex="-1">
                    <div className={`offcanvas-header border-bottom ${darkMode ? 'border-secondary' : ''}`}>
                        <h5 className="offcanvas-title fw-bold"><i className="bi bi-chat-dots-fill text-orange me-2"></i> Chat Stanza</h5>
                        <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} onClick={() => setIsChatOpen(false)}></button>
                    </div>
                    {role === 'teacher' && (
                        <div className={`p-2 border-bottom ${darkMode ? 'border-secondary' : ''}`}>
                            <select className={`form-select form-select-sm ${darkMode ? 'bg-secondary text-white border-secondary' : ''}`} value={chatFilter} onChange={(e) => setChatFilter(e.target.value)}>
                                <option value="all">Tutti i messaggi</option>
                                <option value="user">Solo messaggi degli utenti</option>
                                <option value="system">Solo messaggi di sistema</option>
                            </select>
                        </div>
                    )}
                    <div className={`offcanvas-body flex-grow-1 chat-body-scroll ${darkMode ? 'bg-chat-dark' : 'bg-chat-light'}`}>
                        {chatMessages.length === 0 && (
                            <div className="d-flex justify-content-center mt-5">
                                <div className={`px-4 py-2 rounded-pill shadow-sm small ${darkMode ? 'bg-dark text-white' : 'bg-white text-muted'}`}>
                                    <i className="bi bi-shield-lock-fill me-2"></i>I messaggi sono crittografati end-to-end.
                                </div>
                            </div>
                        )}
                        {chatMessages.filter(m => {
                            if (role !== 'teacher') return true;
                            if (chatFilter === 'all') return true;
                            if (chatFilter === 'user') return m.type === 'user';
                            if (chatFilter === 'system') return m.type !== 'user';
                            return true;
                        }).map(msg => {
                            const currentUserName = user?.name || localStorage.getItem('studentName');
                            const isMe = msg.type === 'user' && msg.sender === currentUserName;
                            const isSystem = msg.type === 'system-action' || msg.type === 'system';

                            if (isSystem) {
                                return (
                                    <div key={msg.id} className="mb-3 d-flex flex-column align-items-center">
                                        <div className={`p-2 px-3 rounded-pill text-center shadow-sm fs-07 max-w-90 ${darkMode ? 'bg-black bg-opacity-50 text-white-50' : 'bg-white text-muted border'} border-0`}>
                                            <i className="bi bi-info-circle-fill me-1 text-orange"></i>
                                            {msg.message}
                                            {msg.type === 'system-action' && role === 'teacher' && (
                                                <div className="d-flex justify-content-center gap-2 mt-2">
                                                    <button className="btn btn-sm btn-success py-0 px-2 rounded-pill fw-bold shadow-sm fs-07" onClick={() => respondToJoin(msg.reqId, true)}>Accetta</button>
                                                    <button className="btn btn-sm btn-outline-danger py-0 px-2 rounded-pill fw-bold shadow-sm fs-07" onClick={() => respondToJoin(msg.reqId, false)}>Rifiuta</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={msg.id} className={`mb-2 d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`}>
                                    <div className={`p-2 px-3 shadow-sm chat-bubble ${isMe ? 'bg-orange text-white chat-bubble-me' : (darkMode ? 'bg-dark text-white border border-secondary chat-bubble-other' : 'bg-white text-dark border-0 chat-bubble-other')}`}>
                                        {!isMe && <small className="fw-bold text-orange d-block mb-1 lh-1 fs-075">{msg.sender}</small>}
                                        <div className="d-flex align-items-end gap-2">
                                            <p className="mb-0 lh-sm flex-grow-1 fs-095 break-word">{msg.message}</p>
                                            <small className={`fs-065 text-nowrap ${isMe ? 'text-white-50' : 'text-muted'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                    
                    {/* INPUT MESSAGGI - FISSO IN BASSO */}
                    <div className={`p-2 flex-shrink-0 mt-auto z-10 ${darkMode ? 'bg-dark' : 'bg-light'}`}>
                        <form onSubmit={sendChatMessage} className="d-flex gap-2 align-items-end">
                            <div className={`d-flex align-items-end flex-grow-1 rounded-4 px-3 py-1 shadow-sm ${darkMode ? 'bg-black bg-opacity-50' : 'bg-white border'}`}>
                                <textarea 
                                    className={`form-control border-0 bg-transparent shadow-none px-0 py-2 chat-input-textarea ${darkMode ? 'text-white' : ''}`}
                                    placeholder="Scrivi un messaggio..." 
                                    value={chatInput} 
                                    onChange={e => setChatInput(e.target.value)}
                                    rows="1"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            if (chatInput.trim()) sendChatMessage(e);
                                        }
                                    }}
                                ></textarea>
                            </div>
                            <button type="submit" disabled={!chatInput.trim()} className={`btn rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center shadow-sm mb-1 btn-icon-46 ${chatInput.trim() ? 'bg-orange text-white' : (darkMode ? 'bg-secondary text-white-50' : 'bg-secondary text-white')}`}>
                                <i className="bi bi-send-fill fs-5"></i>
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Overlay semi-trasparente per Offcanvas senza bootstrap.js */}
            {isChatOpen && (
                <div className="offcanvas-backdrop fade show z-1040" onClick={() => setIsChatOpen(false)}></div>
            )}
        </div>
    );
}

export default VisitDetail;
