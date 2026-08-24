import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { fetchVisita, fetchItemsByVisita, fetchDescriptionsByItem, fetchQuizByVisita, getDarkMode, setDarkMode, getUser, fetchUser, logout } from './api';
import ProfileModal from './Profile';

const LEVELS = ['infantile', 'semplice', 'medio', 'dettagliato'];
const LENGTHS = ['3s', '15s', '40s'];

const normalizeCoordinate = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return 0;
    const normalized = num > 1 ? num / 100 : num;
    return Math.max(0, Math.min(1, normalized));
};

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
    const [selectedType, setSelectedType] = useState(() => localStorage.getItem('artaround_preferred_level') || 'medio');
    const [selectedLength, setSelectedLength] = useState('15s');
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Nuovi stati per Chat e Azioni
    const [chatMessages, setChatMessages] = useState([]);
    const [chatFilter, setChatFilter] = useState('all');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [pianoAttivo, setPianoAttivo] = useState(null);
    const [domandaAperta, setDomandaAperta] = useState(null);
    const [chatInput, setChatInput] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [connectedStudents, setConnectedStudents] = useState([]);
    const [studentActions, setStudentActions] = useState({});
    const [lightboxImage, setLightboxImage] = useState(null);
    const [selectedMapPin, setSelectedMapPin] = useState(null);
    const messagesEndRef = useRef(null);
    const currentIndexRef = useRef(currentIndex);
    const descriptionsRef = useRef(descriptions);
    const selectedTypeRef = useRef(selectedType);

    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);

    useEffect(() => {
        descriptionsRef.current = descriptions;
    }, [descriptions]);

    useEffect(() => {
        selectedTypeRef.current = selectedType;
    }, [selectedType]);


    // Stati per il Quiz di fine visita
    const [hasQuiz, setHasQuiz] = useState(false);
    const [quizPhase, setQuizPhase] = useState('none'); // 'none' | 'active' | 'results'
    const [quizQuestions, setQuizQuestions] = useState([]); // domande senza correctIndex (arrivano via SSE)
    const [quizAnswers, setQuizAnswers] = useState({}); // { [questionId]: selectedIndex } - risposte locali dello studente
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizResults, setQuizResults] = useState(null); // array [{ studentName, score, total, details }]
    const [studentsSubmitted, setStudentsSubmitted] = useState([]); // nomi studenti che hanno gia' inviato (vista docente)
    const [quizReportTab, setQuizReportTab] = useState('questions'); // 'questions' | 'students'
    const [expandedStudent, setExpandedStudent] = useState(null);
    
    // Voice commands
    const [isListeningForVoice, setIsListeningForVoice] = useState(false);
    const [isTextExpanded, setIsTextExpanded] = useState(false);

    // Azzera i messaggi non letti se la chat è aperta e scrolla in basso
    useEffect(() => {
        const handleStorageChange = () => {
            const newDarkMode = getDarkMode();
            setDarkModeState(newDarkMode);
            if (newDarkMode) {
                document.body.classList.add('dark-mode');
                document.documentElement.classList.add('dark-mode');
                document.documentElement.setAttribute('data-bs-theme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                document.documentElement.classList.remove('dark-mode');
                document.documentElement.removeAttribute('data-bs-theme');
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        // Setup iniziale
        if (darkMode) {
            document.body.classList.add('dark-mode');
            document.documentElement.classList.add('dark-mode');
            document.documentElement.setAttribute('data-bs-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.documentElement.classList.remove('dark-mode');
            document.documentElement.removeAttribute('data-bs-theme');
        }

        return () => window.removeEventListener('storage', handleStorageChange);
    }, [darkMode]);

    useEffect(() => {
        if (isChatOpen) {
            setUnreadCount(0);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [isChatOpen, chatMessages]);

    // Sincronizza automaticamente il piano attivo con il piano dell'opera corrente (Piano A, Piano B...)
    useEffect(() => {
        if (!items || items.length === 0) return;
        const currentItem = items[currentIndex];
        const sala = currentItem?.sala;
        const piani = [...(visita?.museum_id?.mappa?.piante || [])].sort((a, b) => a.piano - b.piano);

        if (sala?.piano !== undefined && sala?.piano !== null) {
            setPianoAttivo(sala.piano);
        } else if (piani.length > 0 && (pianoAttivo === null || pianoAttivo === undefined)) {
            setPianoAttivo(piani[0].piano);
        }
    }, [currentIndex, items, visita]);
    
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

    const broadcastAudio = async (text) => {
        if (!text || !pin || role !== 'teacher') return;
        try {
            await fetch('/api/rooms/broadcast-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin, text })
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

        if (isListeningForVoice) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'it-IT';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => { setIsListeningForVoice(true); handleStudentAction('microphone'); };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();

            // Autore / Opera (Match avanzato tramite Regex)
            if (/(autore|chi (ha dipinto|ha creato|è l'autore)|come si chiama l'opera|quest'opera)/i.test(transcript)) {
                 const author = currentItem?.author || "Autore sconosciuto";
                 const title = (currentItem?.item || currentItem?.title || currentItem?.name || "Opera").replace(/\s*\d{10,}$/, '');
                 speak(`L'autore di quest'opera è ${author}, e si intitola ${title}.`);
                 return;
            }

            // Navigazione / Mappa / POI (Match avanzato tramite Regex)
            if (/(mappa|bagno|toilette|servizi|igienici|uscita|caffetteria|bar|shop|bookshop|dove mi trovo)/i.test(transcript)) {
                 const domandeMappa = (visita?.museum_id?.mappa?.poi || []).filter(p => p.testo && p.testo.trim() !== '');
                 let targetType = null;
                 let targetName = "";
                 
                 if (/(bagno|toilette|servizi|igienici)/i.test(transcript)) {
                     targetType = 'toilette';
                     targetName = 'il bagno';
                 } else if (/(caffetteria|bar)/i.test(transcript)) {
                     targetType = 'bar';
                     targetName = 'la caffetteria';
                 } else if (/(shop|bookshop)/i.test(transcript)) {
                     targetType = 'shop';
                     targetName = 'il bookshop';
                 } else if (/(uscita)/i.test(transcript)) {
                     targetType = 'uscita';
                     targetName = "l'uscita";
                 }

                 if (targetType) {
                     handleStudentAction('info');
                     const poi = domandeMappa.find(p => p.tipo === targetType);
                     if (poi) {
                         speak(poi.testo);
                         setDomandaAperta(poi._id || domandeMappa.indexOf(poi));
                     }
                 }
                 
                 setIsMapOpen(true);
                 return;
            }

            // Riproduzione Audio
            if (/(ascolta|leggi|spiega|riproduci)/i.test(transcript)) {
                 if (currentDescription) {
                     speak(currentDescription.text);
                     handleStudentAction('audio');
                 }
                 return;
            }
            if (/(ferma|stop|zitto|silenzio)/i.test(transcript)) {
                 stopSpeaking();
                 handleStudentAction('stop');
                 return;
            }

            // Navigazione tra opere
            if (/(avanti|prossimo|successivo)/i.test(transcript)) {
                 if (pin && role !== 'teacher') {
                     //toast.warning("In visita guidata non puoi cambiare opera!");
                 } else {
                     goToNextItem();
                 }
                 return;
            }
            if (/(indietro|precedente)/i.test(transcript)) {
                 if (pin && role !== 'teacher') {
                     //toast.warning("In visita guidata non puoi cambiare opera!");
                 } else {
                     goToPrevItem();
                 }
                 return;
            }
            
            // Difficoltà
            if (/(più semplice|non capisco)/i.test(transcript)) {
                changeLevelDown();
                handleStudentAction('minus');
                return;
            }
            if (/(troppo semplice|meno scolastico)/i.test(transcript)) {
                changeLevelUp();
                handleStudentAction('plus');
                return;
            }

            // Lunghezza
            if (/(di più|più dettagli|aumenta)/i.test(transcript)) {
                changeLengthUp();
                handleStudentAction('plus');
                return;
            }
            if (/(di meno|meno dettagli|diminuisci)/i.test(transcript)) {
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
        setQuizAnswers(prev => {
            const next = { ...prev, [questionId]: optionIndex };
            if (pin) {
                const studentName = user?.name || localStorage.getItem('artaround_student_name') || localStorage.getItem('studentName');
                if (studentName) {
                    fetch('/api/rooms/quiz/answer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pin, studentName, answers: next })
                    }).catch(err => console.error("Errore sync risposta quiz:", err));
                }
            }
            return next;
        });
    };

    const submitQuizAnswers = async () => {
        if (!pin) return;
        const studentName = user?.name || localStorage.getItem('artaround_student_name') || localStorage.getItem('studentName');
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
                const [visitaData, itemsData] = await Promise.all([fetchVisita(id, pin), fetchItemsByVisita(id)]);
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
            document.body.classList.remove('dark-mode');
            document.documentElement.classList.remove('dark-mode');
            document.documentElement.removeAttribute('data-bs-theme');
        };
    }, [id]);

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

    // Precarica le immagini per evitare caricamenti lenti durante la visita
    useEffect(() => {
        if (items && items.length > 0) {
            items.forEach(item => {
                if (item.img_path) {
                    const img = new Image();
                    img.src = item.img_path;
                }
            });
        }
    }, [items]);

    // SSE Effect per stanza (studenti e docente)
    useEffect(() => {
        if (!pin) return;
        
        const studentName = localStorage.getItem('artaround_student_name') || (user ? user.name : '');
        const eventUrl = (studentName && role !== 'teacher') ? `/api/rooms/events/${pin}?studentName=${encodeURIComponent(studentName)}` : `/api/rooms/events/${pin}`;
        const eventSource = new EventSource(eventUrl);

        
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

            // Aggiungi un messaggio di sistema in chat
            let actionText = '';
            if (data.action === 'audio') actionText = 'ha avviato la riproduzione audio.';
            else if (data.action === 'stop') actionText = 'ha fermato la riproduzione audio.';
            else if (data.action === 'plus') actionText = 'ha aumentato i dettagli/difficoltà della descrizione.';
            else if (data.action === 'minus') actionText = 'ha diminuito i dettagli/difficoltà della descrizione.';
            else actionText = `ha eseguito l'azione: ${data.action}`;

            setChatMessages(prev => [...prev, {
                id: Date.now() + Math.random(),
                sender: 'Sistema',
                message: `Lo studente ${data.studentName} ${actionText}`,
                type: 'system',
                timestamp: new Date().toISOString()
            }]);

            // Rimuovi l'icona fluttuante dopo 5 secondi
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

        eventSource.addEventListener('broadcast-audio', (e) => {
            if (role === 'teacher') return;
            const data = JSON.parse(e.data);
            if (data.text) {
                speak(data.text);
            }
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
            if (data.questions && data.questions.length > 0) {
                setQuizQuestions(data.questions);
            }
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
                body: JSON.stringify({ pin, visitId: id })
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

    useEffect(() => {
        return () => window.speechSynthesis.cancel();
    }, []);

    const bgMain = darkMode ? 'text-white' : 'marketplace-light text-dark';
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

    // --- MAPPA DEL MUSEO ---
    const piante = [...(visita.museum_id?.mappa?.piante || [])].sort((a, b) => a.piano - b.piano);
    const piantaAttiva = piante.find(p => p.piano === pianoAttivo);

    const getPoiIcon = (s) => {
        if (!s) return 'bi-geo-alt-fill';
        const tipoKey = (s.tipo || '').trim().toLowerCase();
        const nomeKey = (s.nome || '').trim().toLowerCase();
        
        if (tipoKey === 'shop' || tipoKey === 'bookshop' || nomeKey.includes('shop') || nomeKey.includes('store')) return 'bi-bag-fill';
        if (tipoKey === 'bar' || tipoKey === 'caffetteria' || nomeKey.includes('bar') || nomeKey.includes('caffè')) return 'bi-cup-hot-fill';
        if (tipoKey === 'toilette' || tipoKey === 'wc' || nomeKey.includes('wc') || nomeKey.includes('bagno')) return 'bi-droplet-fill';
        if (tipoKey === 'ingresso' || nomeKey.includes('ingresso')) return 'bi-box-arrow-in-right';
        if (tipoKey === 'uscita' || nomeKey.includes('uscita')) return 'bi-box-arrow-right';
        if (tipoKey === 'emergenza') return 'bi-sign-turn-right-fill';
        if (tipoKey === 'scala' || tipoKey === 'scale') return 'bi-stairs';
        if (tipoKey === 'ascensore') return 'bi-arrow-down-up';
        if (tipoKey === 'sala') return 'bi-door-open-fill';

        return 'bi-geo-alt-fill';
    };

    const renderMapWithPins = (isLightbox = false) => {
        if (!piantaAttiva?.immagine) return null;
        const saleAttive = (visita.museum_id?.mappa?.sale || []).filter(s => s.piano === pianoAttivo);
        return (
            <div className="map-pin-canvas">
                <img
                    src={piantaAttiva.immagine}
                    alt={`Pianta - ${piantaAttiva.nome}`}
                    className={`map-pin-img${isLightbox ? ' map-pin-img--lightbox' : ''}`}
                    onClick={() => !isLightbox && setLightboxImage('__mappa__')}
                    draggable={false}
                />
                {saleAttive.map((s, idx) => {
                    const isCurrentRoom = currentItem?.sala?.nome && s.nome &&
                        currentItem.sala.nome.trim().toLowerCase() === s.nome.trim().toLowerCase();
                    const isSelected = selectedMapPin?.nome === s.nome;
                    const icon = getPoiIcon(s);
                    const posX = normalizeCoordinate(s.x);
                    const posY = normalizeCoordinate(s.y);
                    const transX = posX < 0.20 ? '0%' : posX > 0.80 ? '-100%' : '-50%';
                    const transY = posY < 0.10 ? '0%' : posY > 0.90 ? '-100%' : '-50%';
                    return (
                        <div
                            key={s._id || idx}
                            className={`map-pin-point ${isCurrentRoom ? 'z-idx-35' : isSelected ? 'z-idx-30' : 'z-idx-20'}`}
                            style={{
                                '--pin-x': `${posX * 100}%`,
                                '--pin-y': `${posY * 100}%`,
                                '--trans-x': transX,
                                '--trans-y': transY
                            }}
                        >
                            {isCurrentRoom ? (
                                <div className="map-pin-here">
                                    <span className="map-pin-here__dot"></span>
                                    <span className="map-pin-here__label">{s.nome}</span>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className={`btn btn-sm btn-icon-32 rounded-circle d-flex align-items-center justify-content-center shadow p-0 border ${
                                        isSelected
                                            ? 'bg-orange text-white border-orange'
                                            : (darkMode ? 'bg-dark text-orange border-orange' : 'bg-white text-orange border-orange')
                                    }`}
                                    onClick={e => { e.stopPropagation(); setSelectedMapPin(isSelected ? null : s); }}
                                    title={s.nome}
                                    aria-label={s.nome}
                                >
                                    <i className={`bi ${icon}`}></i>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderSelectedPinCard = () => {
        if (!selectedMapPin) return null;

        const isSala = !selectedMapPin.tipo || selectedMapPin.tipo === 'sala';
        const roomArtworks = items.filter(it =>
            it.sala?.nome && selectedMapPin.nome &&
            it.sala.nome.trim().toLowerCase() === selectedMapPin.nome.trim().toLowerCase()
        );

        // Verifica se il museo ha configurato una risposta o indicazione per questo punto di interesse
        const poiResponse = (visita.museum_id?.mappa?.poi || []).find(p => p.tipo === selectedMapPin.tipo);

        return (
            <div className={`p-3 rounded-4 shadow-sm mb-3 border transition-all w-100 ${
                darkMode 
                    ? 'bg-dark text-white border-secondary border-opacity-25' 
                    : 'bg-body-tertiary text-dark border-secondary-subtle'
            }`} onClick={e => e.stopPropagation()}>
                <div className="d-flex align-items-center justify-content-between gap-3">
                    <div className="d-flex align-items-center gap-3 min-w-0">
                        <span className="btn-icon-32 rounded-circle bg-orange bg-opacity-15 text-orange d-flex align-items-center justify-content-center flex-shrink-0 me-1">
                            <i className={`bi ${getPoiIcon(selectedMapPin)}`}></i>
                        </span>
                        <div className="min-w-0">
                            <h6 className="fw-bold mb-0 text-truncate fs-6">{selectedMapPin.nome}</h6>
                            <small className="text-body-secondary fs-075">Piano {selectedMapPin.piano}</small>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} 
                        onClick={() => setSelectedMapPin(null)}
                        aria-label="Chiudi"
                    ></button>
                </div>

                {/* Se ci sono opere del tour in questa sala */}
                {roomArtworks.length > 0 && (
                    <div className="mt-2.5 pt-2 border-top border-secondary-subtle">
                        <div className="text-uppercase fw-bold text-orange mb-1 fs-065 letter-spacing-sm">
                            Opere in questa sala ({roomArtworks.length})
                        </div>
                        <div className="d-flex flex-column gap-1 max-h-150 overflow-y-auto pe-1">
                            {roomArtworks.map((art, i) => (
                                <div key={art._id || i} className="d-flex align-items-center gap-2">
                                    <i className="bi bi-circle-fill text-orange fs-06"></i>
                                    <span className="fs-08 fw-medium text-truncate">{art.item || art.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Se c'è un'indicazione specifica del museo per questo punto di interesse */}
                {roomArtworks.length === 0 && poiResponse?.testo && (
                    <div className="mt-2 pt-2 border-top border-secondary-subtle">
                        <p className="fs-08 text-body-secondary mb-0">
                            {poiResponse.testo}
                        </p>
                    </div>
                )}

                {/* Se è una sala espositiva senza opere del tour corrente */}
                {roomArtworks.length === 0 && isSala && !poiResponse?.testo && (
                    <p className="fs-08 text-body-secondary mb-0 mt-2 fst-italic">
                        Nessuna opera del tour in questa sala.
                    </p>
                )}
            </div>
        );
    };
    // Il piano in cui si trova l'opera, indipendente dal piano visualizzato
    const pianoOpera = piante.find(p => p.piano === currentItem.sala?.piano);
    // Solo le domande a cui il museo ha dato una risposta
    const domandeMappa = (visita.museum_id?.mappa?.poi || []).filter(p => p.testo && p.testo.trim() !== '');

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
        <div className={`vh-100 d-flex flex-column overflow-hidden position-relative ${darkMode ? 'bg-black text-white' : 'marketplace-light text-dark'}`}>
            
            {currentItem.img_path && (
                <div className="position-absolute w-100 h-100 dynamic-bg-blur" style={{ backgroundImage: `url(${currentItem.img_path})` }}></div>
            )}
            
            <header className="d-flex justify-content-between align-items-center w-100 px-3 py-3 position-relative z-1030">
                
                <div className="d-flex align-items-center gap-3">
                    <Link to="/" className="btn border-0 rounded-circle d-flex align-items-center justify-content-center p-2 bg-body-tertiary text-body shadow-sm btn-icon-40" title="Torna alla Home">
                        <i className="bi bi-arrow-left fs-5"></i>
                    </Link>
                    <div className="d-none d-md-flex align-items-center gap-2">
                        <i className="bi bi-box-seam text-orange fs-5"></i>
                        <span className="fw-black fs-6 tracking-tight-sm text-body">ArtAround</span>
                    </div>
                </div>

                <div className="position-absolute top-50 start-50 translate-middle text-center px-2 d-none d-md-block text-truncate z-0">
                    <div className="d-flex align-items-center justify-content-center px-3 py-1 rounded-pill bg-body-tertiary text-body-secondary small fw-medium border border-secondary-subtle shadow-sm mx-auto max-w-400 text-truncate">
                        {visita.name}
                    </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                    {role === 'teacher' && pin && (
                        <div className="d-flex align-items-center pe-3 border-end border-secondary-subtle d-none d-sm-flex me-1">
                            <div className="dropdown">
                                <button 
                                    className="btn btn-sm px-2 py-1 rounded-pill shadow-sm d-flex align-items-center gap-2 border border-secondary-subtle bg-body-tertiary text-body"
                                    data-bs-toggle="dropdown" 
                                    title="Gestione Studenti"
                                    type="button"
                                >
                                    <div className="d-flex align-items-center">
                                        {visibleStudents.map((student, idx) => {
                                            const action = studentActions[student];
                                            return (
                                                <div key={idx} className={`position-relative flex-shrink-0 z-idx-${visibleStudents.length - idx} ${idx > 0 ? 'avatar-overlap-item' : ''}`}>
                                                    <div className={`user-avatar rounded-circle bg-secondary d-flex align-items-center justify-content-center fw-bold shadow-sm border border-2 avatar-sm-075 ${action ? 'border-orange' : ''} ${darkMode ? 'text-white border-dark' : 'text-dark border-white'}`}>
                                                        {student.charAt(0).toUpperCase()}
                                                    </div>
                                                    {action && (
                                                        <span className="position-absolute top-0 start-100 translate-middle p-1 rounded-circle bg-orange border border-1 border-white shadow-sm indicator-dot"></span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {hiddenCount > 0 && (
                                            <div className="user-avatar rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm border border-2 avatar-sm-065 overlap-avatar-left bg-body-tertiary text-body border-secondary-subtle">
                                                +{hiddenCount}
                                            </div>
                                        )}
                                    </div>
                                    <i className="bi bi-chevron-down ms-1 me-1 fs-07 text-body opacity-75"></i>
                                </button>

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
                                        else if (action === 'audio') { icon = 'bi-volume-up-fill'; iconColor = 'text-primary'; actionText = 'Audio'; }
                                        else if (action === 'microphone') { icon = 'bi-mic-fill'; iconColor = 'text-warning'; actionText = 'Microfono attivo'; }
                                        else if (action === 'info') { icon = 'bi-info-circle-fill'; iconColor = 'text-info'; actionText = 'Richiesta info/bagno'; }
                                        
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

                    <button 
                        className="btn border-0 rounded-circle d-flex align-items-center justify-content-center p-2 bg-body-tertiary text-body shadow-sm btn-icon-40"
                        onClick={() => toggleDarkMode()}
                        title="Cambia tema"
                    >
                        <i className={`bi ${darkMode ? 'bi-moon-stars-fill text-body' : 'bi-sun-fill text-warning'} fs-5`}></i>
                    </button>



                    <button
                        className="btn border-0 rounded-circle d-flex align-items-center justify-content-center p-2 bg-body-tertiary text-body shadow-sm btn-icon-40"
                        onClick={() => setIsMapOpen(true)}
                        title="Mappa del museo"
                    >
                        <i className="bi bi-map-fill fs-5 text-body"></i>
                    </button>

                    {pin && (
                        <button 
                            className="btn border-0 rounded-circle d-flex align-items-center justify-content-center p-2 bg-body-tertiary text-body shadow-sm position-relative btn-icon-40"
                            onClick={() => { setIsChatOpen(true); setUnreadCount(0); }}
                            title="Chat Stanza"
                        >
                            <i className="bi bi-chat-dots-fill fs-5 text-body"></i>
                            {unreadCount > 0 && (
                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-2 border-dark fs-065">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                    )}

                </div>
            </header>

            <main className="flex-grow-1 d-flex flex-column w-100 overflow-hidden z-10">
                <div className="container-fluid container-lg d-flex flex-column flex-lg-row flex-landscape-row flex-grow-1 justify-content-center align-items-center gap-3 gap-lg-4 py-2 w-100 h-100 min-h-0 overflow-hidden">
                    
                    <div className="w-100 w-lg-50 w-landscape-50 h-lg-100 h-landscape-100 d-flex justify-content-center align-items-center flex-shrink-1 max-w-800 min-h-0 min-h-landscape-0 overflow-hidden">
                    {currentItem.img_path && (
                            <div className="position-relative d-flex align-items-center justify-content-center h-100 w-100 cursor-pointer overflow-hidden" onClick={() => setLightboxImage(currentItem.img_path)}>
                                <img
                                    src={currentItem.img_path}
                                    alt={currentItem.item.replace(/\s*\d{10,}$/, '')}
                                    className="img-fluid rounded-4 shadow-lg artwork-main-img d-block mx-auto"
                                />
                                <div className="position-absolute bottom-0 end-0 m-2 badge bg-dark bg-opacity-75 text-white rounded-pill px-3 py-2 shadow-sm pointer-events-none d-flex align-items-center gap-2">
                                    <i className="bi bi-zoom-in"></i>
                                    <span className="d-none d-sm-inline">Clicca per ingrandire</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`card d-flex flex-column flex-grow-1 flex-shrink-1 mt-auto mt-lg-0 mb-1 border-secondary-subtle shadow-sm w-100 w-lg-50 w-landscape-50 h-lg-100 h-landscape-100 max-w-800 min-h-0 overflow-hidden ${darkMode ? 'bg-dark text-white' : 'bg-body text-dark'}`}>
                        <div className="card-body p-2 p-md-3 d-flex flex-column overflow-hidden flex-shrink-1 min-h-0">
                            
                            <div className="flex-shrink-0">
                                <h4 className="fw-bold mb-1">{currentItem.item.replace(/\s*\d{10,}$/, '')}</h4>
                                <div className="d-flex flex-wrap gap-1.5 mb-2">
                                    {visita.museum_id && (
                                        <span className={`rounded-pill px-3 py-1 shadow-sm small d-inline-flex align-items-center gap-1 fw-medium border ${darkMode ? 'bg-dark text-white border-secondary border-opacity-25' : 'bg-light text-dark border-light-subtle'}`}>
                                            <i className="bi bi-geo-alt-fill text-orange me-1"></i>
                                            <span>{visita.museum_id.museum}</span>
                                            {currentItem.sala?.nome && <span>· {currentItem.sala.nome}</span>}
                                        </span>
                                    )}
                                    <span className={`rounded-pill px-3 py-1 shadow-sm small d-inline-flex align-items-center gap-1 fw-medium border ${darkMode ? 'bg-dark text-white border-secondary border-opacity-25' : 'bg-light text-dark border-light-subtle'}`}>
                                        <i className="bi bi-person-fill text-orange me-1"></i>
                                        <span>{currentItem.author}</span>
                                    </span>
                                </div>


                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                                    <div>
                                    <div className="text-body-secondary text-uppercase fw-bold mb-1 fs-065 letter-spacing-sm">Impostazioni Testo</div>
                                    <div className="d-flex align-items-center gap-2">
                                        <div className={`rounded-pill p-1 d-inline-flex align-items-center shadow-sm ${darkMode ? 'bg-dark border border-secondary-subtle' : 'bg-light border border-light-subtle'}`}>
                                            <button onClick={() => { changeLevelDown(); handleStudentAction('minus'); }} disabled={LEVELS.indexOf(selectedType) === 0} className="btn border-0 rounded-circle d-flex align-items-center justify-content-center p-0 bg-danger bg-opacity-25 btn-icon-32"><i className="bi bi-dash fs-5 text-danger"></i></button>
                                            <span className="fw-bold fs-085 text-center text-body-emphasis user-select-none pill-level-width">{selectedType}</span>
                                            <button onClick={() => { changeLevelUp(); handleStudentAction('plus'); }} disabled={LEVELS.indexOf(selectedType) === LEVELS.length - 1} className="btn border-0 rounded-circle d-flex align-items-center justify-content-center p-0 bg-success bg-opacity-25 btn-icon-32"><i className="bi bi-plus fs-5 text-success"></i></button>
                                        </div>
                                        <div className={`rounded-pill p-1 d-inline-flex align-items-center shadow-sm ${darkMode ? 'bg-dark border border-secondary-subtle' : 'bg-light border border-light-subtle'}`}>
                                            <button onClick={() => { changeLengthDown(); handleStudentAction('minus'); }} disabled={LENGTHS.indexOf(selectedLength) === 0} className="btn border-0 rounded-circle d-flex align-items-center justify-content-center p-0 bg-danger bg-opacity-25 btn-icon-32"><i className="bi bi-dash fs-5 text-danger"></i></button>
                                            <span className="fw-bold fs-085 text-center text-body-emphasis user-select-none pill-duration-width">{selectedLength}</span>

                                            <button onClick={() => { changeLengthUp(); handleStudentAction('plus'); }} disabled={LENGTHS.indexOf(selectedLength) === LENGTHS.length - 1} className="btn border-0 rounded-circle d-flex align-items-center justify-content-center p-0 bg-success bg-opacity-25 btn-icon-32"><i className="bi bi-plus fs-5 text-success"></i></button>
                                        </div>
                                    </div>

                                </div>
                                
                                <div className="d-flex gap-3 mt-3 mt-md-0 flex-shrink-0">
                                    
                                    <div className="action-btn-col gap-1">
                                        <button 
                                            onClick={() => { if(isSpeaking) { stopSpeaking(); handleStudentAction('stop'); } else { speak(currentDescription?.text); handleStudentAction('audio'); } }} 
                                            disabled={!currentDescription} 
                                            className={`btn rounded-circle d-flex align-items-center justify-content-center shadow-sm text-white btn-icon-40 ${isSpeaking ? 'bg-warning' : 'bg-primary'}`}
                                        >
                                            <i className={`bi ${isSpeaking ? 'bi-stop-fill' : 'bi-headphones'} fs-5`}></i>
                                        </button>
                                        <span className="text-body-secondary text-uppercase fw-bold fs-06 letter-spacing-sm">{isSpeaking ? 'Ferma' : 'Ascolta'}</span>
                                    </div>
                                    
                                    {role === 'teacher' && (
                                        <div className="action-btn-col gap-1">
                                            <button 
                                                onClick={() => { broadcastAudio(currentDescription?.text); }} 
                                                disabled={!currentDescription} 
                                                className="btn rounded-circle d-flex align-items-center justify-content-center shadow-sm text-white bg-secondary btn-icon-40"
                                            >
                                                <i className="bi bi-broadcast fs-5"></i>
                                            </button>
                                            <span className="text-body-secondary text-uppercase fw-bold fs-06 letter-spacing-sm">Trasmetti</span>
                                        </div>
                                    )}

                                    <div className="action-btn-col gap-1">
                                        <button 
                                            onClick={startVoiceRecognition} 
                                            className={`btn rounded-circle d-flex align-items-center justify-content-center shadow-sm text-white btn-icon-40 ${isListeningForVoice ? 'bg-danger pulse-animation' : 'bg-primary'}`}
                                        >
                                            <i className={`bi ${isListeningForVoice ? 'bi-mic-fill' : 'bi-mic'} fs-5`}></i>
                                        </button>
                                        <span className="text-body-secondary text-uppercase fw-bold fs-06 letter-spacing-sm">
                                            {isListeningForVoice ? 'In ascolto' : 'Parla'}
                                        </span>
                                    </div>

                                    <div className="action-btn-col gap-1">
                                        <button 
                                            type="button"
                                            className={`btn border border-secondary-subtle rounded-circle d-flex justify-content-center align-items-center shadow-sm btn-icon-40 ${darkMode ? 'bg-dark text-white' : 'bg-body text-dark'}`}
                                            data-bs-toggle="modal" 
                                            data-bs-target="#commandsModal"
                                            title="Info e Comandi"
                                        >
                                            <i className="bi bi-info-circle fs-5"></i>
                                        </button>
                                        <span className="text-body-secondary text-uppercase fw-bold fs-06 letter-spacing-sm">Info</span>
                                    </div>

                                </div>
                            </div>
                            </div>

                            <div className="overflow-y-auto flex-grow-1 pe-2 my-1 min-h-60">
                                <div className="fs-6 lh-base">
                                    {currentDescription ? (
                                        <p className="mb-0">
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
                        
                        <div className="card-footer flex-shrink-0 bg-transparent border-top border-secondary-subtle py-2 px-2 px-sm-3 mt-auto">
                            <div className="d-flex justify-content-between align-items-center w-100 gap-1 gap-sm-2 flex-nowrap">
                                {(!pin || role === 'teacher') ? (
                                    <button onClick={() => handleIndexChange(currentIndex - 1)} disabled={currentIndex === 0} className="btn btn-outline-secondary rounded-pill px-2.5 px-sm-3 py-1.5 fs-7 fw-bold shadow-sm d-flex align-items-center gap-1 active-scale flex-shrink-0">
                                        <i className="bi bi-chevron-left"></i> <span>Indietro</span>
                                    </button>
                                ) : (
                                    <div className="flex-shrink-0 btn-icon-42"></div>
                                )}

                                
                                <div className="d-flex align-items-center justify-content-center gap-1 gap-sm-2 flex-grow-1 mx-1 min-w-0">
                                    <span className={`rounded-pill px-2 px-sm-2.5 py-1 small fw-bold d-inline-flex align-items-center gap-1 border shadow-sm flex-shrink-0 ${darkMode ? 'bg-dark text-white border-secondary border-opacity-25' : 'bg-light text-dark border-light-subtle'}`}>
                                        <span className="text-orange">{currentIndex + 1}</span>
                                        <span className="opacity-50">/</span>
                                        <span>{items.length}</span>
                                        <span className="d-none d-md-inline opacity-50 ms-1">· {Math.round(((currentIndex + 1) / items.length) * 100)}%</span>
                                    </span>

                                    <div className="d-none d-sm-flex align-items-center justify-content-center gap-1.5 py-1 flex-shrink-0">
                                        {(() => {
                                            const total = items.length;
                                            const maxVisible = 5;

                                            if (total <= maxVisible) {
                                                return items.map((_, index) => {
                                                    let dotClass = 'remaining';
                                                    if (index < currentIndex) dotClass = 'completed';
                                                    if (index === currentIndex) dotClass = 'active';

                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`dot-indicator ${dotClass}`}
                                                            onClick={() => (!pin || role === 'teacher') && handleIndexChange(index)}
                                                            title={`Tappa ${index + 1}`}
                                                        />
                                                    );
                                                });
                                            } else {
                                                let start = Math.max(0, currentIndex - Math.floor(maxVisible / 2));
                                                let end = start + maxVisible;
                                                if (end > total) {
                                                    end = total;
                                                    start = Math.max(0, end - maxVisible);
                                                }

                                                const visibleDots = [];
                                                if (start > 0) {
                                                    visibleDots.push(
                                                        <div key="start-mini" className="dot-indicator mini completed" title="Tappe precedenti" />
                                                    );
                                                }

                                                for (let i = start; i < end; i++) {
                                                    let dotClass = 'remaining';
                                                    if (i < currentIndex) dotClass = 'completed';
                                                    if (i === currentIndex) dotClass = 'active';

                                                    visibleDots.push(
                                                        <div
                                                            key={i}
                                                            className={`dot-indicator ${dotClass}`}
                                                            onClick={() => (!pin || role === 'teacher') && handleIndexChange(i)}
                                                            title={`Tappa ${i + 1}`}
                                                        />
                                                    );
                                                }

                                                if (end < total) {
                                                    visibleDots.push(
                                                        <div key="end-mini" className="dot-indicator mini remaining" title="Tappe successive" />
                                                    );
                                                }

                                                return visibleDots;
                                            }
                                        })()}
                                    </div>
                                </div>

                                {(!pin || role === 'teacher') ? (
                                    currentIndex === items.length - 1 ? (
                                        (pin && hasQuiz && role === 'teacher' && quizPhase === 'none') ? (
                                            <button onClick={startQuiz} className="btn btn-orange text-white rounded-pill px-2.5 px-sm-3 py-1.5 fs-7 fw-bold shadow-sm d-flex align-items-center gap-1 active-scale flex-shrink-0">
                                                <span>Avvia Quiz</span> <i className="bi bi-patch-question"></i>
                                            </button>
                                        ) : (
                                            <button onClick={handleEndVisit} className="btn btn-danger text-white rounded-pill px-2.5 px-sm-3 py-1.5 fs-7 fw-bold shadow-sm d-flex align-items-center gap-1 active-scale flex-shrink-0">
                                                <span>Termina</span> <i className="bi bi-stop-circle"></i>
                                            </button>
                                        )
                                    ) : (
                                        <button onClick={() => handleIndexChange(currentIndex + 1)} className="btn btn-orange text-white rounded-pill px-2.5 px-sm-3 py-1.5 fs-7 fw-bold shadow-sm d-flex align-items-center gap-1 active-scale flex-shrink-0">
                                            <span>Avanti</span> <i className="bi bi-chevron-right"></i>
                                        </button>
                                    )
                                ) : (
                                    <span className="badge rounded-pill bg-orange-subtle text-orange border border-orange border-opacity-25 px-2.5 px-sm-3 py-1.5 small fw-bold flex-shrink-0">
                                        <i className="bi bi-broadcast me-1"></i> Live
                                    </span>
                                )}
                            </div>
                        </div>



                    </div>
                </div>
            </main>

            {/* QUIZ OVERLAY (monitoraggio docente / risposta studente / risultati) */}
            {pin && quizPhase !== 'none' && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3 bg-black-85 z-2000">
                    <div className={`card border-0 rounded-4 shadow-lg glass-blur-15 w-100 max-w-700 max-h-90vh overflow-y-auto ${darkMode ? 'bg-dark bg-opacity-95 text-white' : 'bg-white text-dark'}`}>
                        <div className="card-body p-3.5 p-md-4">

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
                                        <i className="bi bi-flag-fill me-2"></i>Termina Quiz e genera resoconto
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
                                        disabled={Object.keys(quizAnswers).length === 0}
                                        className="btn bg-orange text-white rounded-pill px-4 py-2 fw-bold w-100 mt-2 shadow-sm active-scale"
                                    >
                                        Invia risposte {Object.keys(quizAnswers).length > 0 ? `(${Object.keys(quizAnswers).length}/${quizQuestions.length})` : ''}
                                    </button>
                                </>
                            )}

                            {/* STUDENTE: in attesa dopo l'invio */}
                            {role !== 'teacher' && quizPhase === 'active' && quizSubmitted && (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-orange mb-3" role="status"></div>
                                    <h5 className="fw-bold">Risposte inviate!</h5>
                                    <p className={textMuted}>In attesa che il docente concluda il quiz per mostrare il resoconto completo...</p>
                                </div>
                            )}

                            {/* RISULTATI & RESOCONTO DETTAGLIATO */}
                            {quizPhase === 'results' && quizResults && (
                                <div className="d-flex flex-column gap-3">
                                    {role === 'teacher' ? (
                                        /* VISTA DOCENTE / CHI FA PARTIRE IL QUIZ: RESOCONTO COMPLETO */
                                        <>
                                            {/* HEADER RESOCONTO */}
                                            <div className="d-flex align-items-center justify-content-between gap-2 pb-3 border-bottom border-secondary border-opacity-25">
                                                <div className="d-flex align-items-center gap-2 min-w-0">
                                                    <div className="btn-icon-42 rounded-circle bg-orange bg-opacity-15 text-orange d-flex align-items-center justify-content-center flex-shrink-0">
                                                        <i className="bi bi-bar-chart-line-fill fs-4"></i>
                                                    </div>
                                                    <div className="min-w-0 px-1">
                                                        <h4 className="fw-black m-0 fs-5 text-wrap">Resoconto Finale Quiz</h4>
                                                    </div>
                                                </div>
                                                <button onClick={handleEndVisit} className="btn btn-sm btn-outline-danger rounded-pill px-3 py-1.5 fw-bold shadow-sm d-flex align-items-center gap-1.5 flex-shrink-0 ms-1">
                                                    <i className="bi bi-stop-circle"></i> <span>Chiudi Visita</span>
                                                </button>
                                            </div>

                                            {/* KPI SUMMARY CARDS */}
                                            {(() => {
                                                const totalStudents = quizResults.length;
                                                const avgScore = totalStudents > 0 ? (quizResults.reduce((acc, r) => acc + (r.score || 0), 0) / totalStudents).toFixed(1) : 0;
                                                const totalQuestions = quizQuestions.length || (quizResults[0]?.total || 0);

                                                let hardestQuestion = null;
                                                let maxWrongPercent = -1;
                                                quizQuestions.forEach(q => {
                                                    let wrong = 0;
                                                    const totalCount = quizResults.length;
                                                    quizResults.forEach(r => {
                                                        const det = r.details?.find(d => String(d.question_id) === String(q._id));
                                                        if (det && !det.correct) wrong++;
                                                    });
                                                    const percent = totalCount > 0 ? Math.round((wrong / totalCount) * 100) : 0;
                                                    if (percent > maxWrongPercent) {
                                                        maxWrongPercent = percent;
                                                        hardestQuestion = { question: q.question, wrongCount: wrong, percent };
                                                    }
                                                });

                                                return (
                                                    <div className="row g-2">
                                                        <div className="col-4">
                                                            <div className={`p-2 p-sm-2.5 rounded-3 text-center border h-100 d-flex flex-column justify-content-center ${darkMode ? 'bg-black bg-opacity-40 border-secondary border-opacity-25' : 'bg-light border-light-subtle'}`}>
                                                                <div className="fs-06 text-uppercase text-orange fw-bold tracking-wider mb-1 text-truncate">Media Classe</div>
                                                                <div className="fs-6 fs-sm-5 fw-black text-orange lh-1">{avgScore} <span className="fs-07 text-white-50 fw-normal">/ {totalQuestions}</span></div>
                                                            </div>
                                                        </div>
                                                        <div className="col-4">
                                                            <div className={`p-2 p-sm-2.5 rounded-3 text-center border h-100 d-flex flex-column justify-content-center ${darkMode ? 'bg-black bg-opacity-40 border-secondary border-opacity-25' : 'bg-light border-light-subtle'}`}>
                                                                <div className="fs-06 text-uppercase text-orange fw-bold tracking-wider mb-1 text-truncate">Partecipanti</div>
                                                                <div className="fs-6 fs-sm-5 fw-black text-white lh-1">{totalStudents} <span className="fs-07 text-white-50 fw-normal">stud.</span></div>
                                                            </div>
                                                        </div>
                                                        <div className="col-4">
                                                            <div className={`p-2 p-sm-2.5 rounded-3 text-center border h-100 d-flex flex-column justify-content-center ${darkMode ? 'bg-black bg-opacity-40 border-secondary border-opacity-25' : 'bg-light border-light-subtle'}`}>
                                                                <div className="fs-06 text-uppercase text-danger fw-bold tracking-wider mb-1 text-truncate">Più Errata</div>
                                                                <div className="fs-6 fs-sm-5 fw-black text-danger lh-1">{hardestQuestion?.percent || 0}% <span className="fs-07 text-white-50 fw-normal">err.</span></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* TABS SELECTOR */}
                                            <div className="d-flex gap-1.5 p-1 rounded-pill bg-secondary bg-opacity-15 border border-secondary border-opacity-25">
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm rounded-pill flex-grow-1 py-1.5 px-2 fw-bold fs-075 transition-all text-truncate ${quizReportTab === 'questions' ? 'bg-orange text-white shadow-sm' : 'text-white-50'}`}
                                                    onClick={() => setQuizReportTab('questions')}
                                                >
                                                    <i className="bi bi-exclamation-triangle me-1"></i>Domande Errate
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm rounded-pill flex-grow-1 py-1.5 px-2 fw-bold fs-075 transition-all text-truncate ${quizReportTab === 'students' ? 'bg-orange text-white shadow-sm' : 'text-white-50'}`}
                                                    onClick={() => setQuizReportTab('students')}
                                                >
                                                    <i className="bi bi-trophy me-1"></i>Classifica ({quizResults.length})
                                                </button>
                                            </div>

                                            {/* TAB 1: DOMANDE PIÙ ERRATE ED ANALISI OPZIONI */}
                                            {quizReportTab === 'questions' && (
                                                <div className="d-flex flex-column gap-3 max-h-50vh overflow-y-auto pe-1 custom-scrollbar">
                                                    {(() => {
                                                        if (!quizQuestions || quizQuestions.length === 0) {
                                                            return <p className="text-center text-white-50 py-3 fst-italic">Informazioni domande non disponibili.</p>;
                                                        }

                                                        const sortedQuestions = [...quizQuestions].map((q, idx) => {
                                                            let totalCount = 0;
                                                            let correctCount = 0;
                                                            const optionDistribution = {};

                                                            quizResults.forEach(r => {
                                                                const det = r.details?.find(d => String(d.question_id) === String(q._id));
                                                                if (det) {
                                                                    totalCount++;
                                                                    if (det.correct) correctCount++;
                                                                    if (det.selectedIndex !== undefined && det.selectedIndex !== null) {
                                                                        optionDistribution[det.selectedIndex] = (optionDistribution[det.selectedIndex] || 0) + 1;
                                                                    }
                                                                }
                                                            });

                                                            const wrongCount = totalCount - correctCount;
                                                            const wrongPercent = totalCount > 0 ? Math.round((wrongCount / totalCount) * 100) : 0;

                                                            return { ...q, origIndex: idx, totalCount, correctCount, wrongCount, wrongPercent, optionDistribution };
                                                        }).sort((a, b) => b.wrongPercent - a.wrongPercent);

                                                        return sortedQuestions.map((q, qRank) => (
                                                            <div key={q._id} className={`p-3 rounded-4 border transition-all ${darkMode ? 'bg-secondary bg-opacity-10 border-secondary border-opacity-25' : 'bg-body border-secondary-subtle shadow-sm'}`}>
                                                                <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                                                                    <div className="d-flex align-items-center gap-2 min-w-0">
                                                                        <span className={`badge rounded-pill px-2.5 py-1 fw-bold fs-065 flex-shrink-0 ${q.wrongPercent >= 50 ? 'bg-danger text-white' : q.wrongPercent > 0 ? 'bg-warning text-dark' : 'bg-success text-white'}`}>
                                                                            {q.wrongPercent >= 50 ? <><i className="bi bi-exclamation-triangle-fill me-1"></i> {q.wrongPercent}% Errori</> : <><i className="bi bi-check-circle-fill me-1"></i> {100 - q.wrongPercent}% Corrette</>}
                                                                        </span>
                                                                        {qRank === 0 && q.wrongPercent > 0 && (
                                                                            <span className="badge bg-danger-subtle text-danger border border-danger border-opacity-25 rounded-pill px-2 py-0.5 fs-065 fw-bold">
                                                                                La più sbagliata
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="fs-07 text-white-50 fw-bold">Domanda {q.origIndex + 1}</span>
                                                                </div>

                                                                <h6 className="fw-bold mb-2.5 fs-6 lh-sm">{q.question}</h6>

                                                                <div className="d-flex flex-column gap-1.5">
                                                                    {q.options.map((optText, optIdx) => {
                                                                        const count = q.optionDistribution[optIdx] || 0;
                                                                        const percent = q.totalCount > 0 ? Math.round((count / q.totalCount) * 100) : 0;
                                                                        const isCorrect = optIdx === q.correctIndex;

                                                                        return (
                                                                            <div key={optIdx} className={`p-2 rounded-3 border position-relative overflow-hidden ${isCorrect ? 'border-success bg-success bg-opacity-25 border-opacity-60' : (count > 0 ? 'border-secondary border-opacity-30 bg-secondary bg-opacity-10' : 'border-transparent opacity-50')}`}>
                                                                                <div
                                                                                    className={`position-absolute top-0 start-0 h-100 opacity-20 ${isCorrect ? 'bg-success' : 'bg-orange'}`}
                                                                                    style={{ width: `${percent}%`, transition: 'width 0.5s ease-in-out' }}
                                                                                ></div>

                                                                                <div className="d-flex align-items-center justify-content-between position-relative z-1 gap-2">
                                                                                    <div className="d-flex align-items-center gap-2 min-w-0">
                                                                                        {isCorrect ? (
                                                                                            <i className="bi bi-check-circle-fill fs-5 flex-shrink-0"></i>
                                                                                        ) : (
                                                                                            <i className={`bi ${count > 0 ? 'bi-x-circle-fill text-danger' : 'bi-circle'} fs-5 flex-shrink-0 text-white-50`}></i>
                                                                                        )}
                                                                                        <span className={`fs-085 text-truncate ${isCorrect ? 'fw-bold text-white' : 'fw-medium'}`}>{optText}</span>
                                                                                    </div>

                                                                                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                                                                        {isCorrect && (
                                                                                            <span className="badge bg-success text-white rounded-pill px-2 py-0.5 fs-065">Esatta</span>
                                                                                        )}
                                                                                        <span className="fs-075 fw-bold text-white-50">
                                                                                            {count} {count === 1 ? 'voto' : 'voti'} ({percent}%)
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            )}

                                            {/* TAB 2: CLASSIFICA & DETTAGLIO RISPOSTE PER STUDENTE */}
                                            {quizReportTab === 'students' && (
                                                <div className="d-flex flex-column gap-2 max-h-50vh overflow-y-auto pe-1 custom-scrollbar">
                                                    {[...quizResults]
                                                        .sort((a, b) => b.score - a.score)
                                                        .map((r, rankIdx) => {
                                                            const isExpanded = expandedStudent === r.studentName;
                                                            const percentScore = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                                                            const medalIcons = ['🥇', '🥈', '🥉'];

                                                            return (
                                                                <div key={r.studentName || rankIdx} className={`rounded-4 border overflow-hidden transition-all ${darkMode ? 'bg-secondary bg-opacity-10 border-secondary border-opacity-25' : 'bg-body border-secondary-subtle shadow-sm'}`}>
                                                                    <div
                                                                        className="d-flex align-items-center justify-content-between p-3 cursor-pointer user-select-none hover-bg-tertiary"
                                                                        onClick={() => setExpandedStudent(isExpanded ? null : r.studentName)}
                                                                    >
                                                                        <div className="d-flex align-items-center gap-3 min-w-0">
                                                                            <div className="d-flex align-items-center justify-content-center flex-shrink-0 fs-5 fw-black w-h-36">
                                                                                {medalIcons[rankIdx] || <span className="fs-6 text-white-50">#{rankIdx + 1}</span>}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <h6 className="fw-bold mb-0 text-truncate fs-6">{r.studentName}</h6>
                                                                                <small className="text-white-50 fs-075">{r.score} su {r.total} risposte corrette ({percentScore}%)</small>
                                                                            </div>
                                                                        </div>

                                                                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                                                            <span className={`badge rounded-pill px-3 py-1.5 fw-bold fs-075 ${percentScore >= 80 ? 'bg-success text-white' : percentScore >= 50 ? 'bg-warning text-dark' : 'bg-danger text-white'}`}>
                                                                                {r.score} / {r.total}
                                                                            </span>
                                                                            <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} text-white-50 fs-6`}></i>
                                                                        </div>
                                                                    </div>

                                                                    {/* ESPANSIONE DETTAGLIATE RISPOSTE STUDENTE */}
                                                                    {isExpanded && (
                                                                        <div className={`p-3 border-top border-secondary border-opacity-25 d-flex flex-column gap-2 max-h-300 overflow-y-auto custom-scrollbar ${darkMode ? 'bg-black bg-opacity-40' : 'bg-body-tertiary'}`}>
                                                                            <div className="fs-065 text-uppercase fw-bold text-orange letter-spacing-sm mb-1">
                                                                                Dettaglio risposte di {r.studentName}:
                                                                            </div>
                                                                            {quizQuestions.map((q, qIdx) => {
                                                                                const det = r.details?.find(d => String(d.question_id) === String(q._id));
                                                                                const isCorrect = det?.correct;
                                                                                const qCorrectIdx = q.correctIndex !== undefined && q.correctIndex !== null ? Number(q.correctIndex) : -1;
                                                                                const studentSelectedIdx = (det?.selectedIndex !== undefined && det?.selectedIndex !== null && !isNaN(Number(det.selectedIndex))) ? Number(det.selectedIndex) : -1;
                                                                                const isUnanswered = studentSelectedIdx === -1;

                                                                                return (
                                                                                    <div key={q._id} className={`p-3 rounded-4 border ${isCorrect ? 'border-success border-opacity-50 bg-success bg-opacity-10' : (isUnanswered ? 'border-warning border-opacity-50 bg-warning bg-opacity-10' : 'border-danger border-opacity-50 bg-danger bg-opacity-10')}`}>
                                                                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                                                                            <div className="fw-bold fs-6 text-white">{qIdx + 1}. {q.question}</div>
                                                                                            <span className={`badge rounded-pill px-2.5 py-1 fw-bold fs-07 flex-shrink-0 ${isCorrect ? 'bg-success text-white' : (isUnanswered ? 'bg-warning text-dark' : 'bg-danger text-white')}`}>
                                                                                                {isCorrect ? 'Corretta' : (isUnanswered ? 'Non risposto' : 'Errata')}
                                                                                            </span>
                                                                                        </div>

                                                                                        {isUnanswered && (
                                                                                            <div className="p-2 rounded-3 bg-opacity-15 border border-warning border-opacity-30 text-warning fs-075 fw-bold d-flex align-items-center gap-1.5 mb-2">
                                                                                                <i className="bi bi-dash-circle-fill"></i>Nessuna risposta fornita (Conteggiato come errore)
                                                                                            </div>
                                                                                        )}
                                                                                        
                                                                                        <div className="d-flex flex-column gap-1.5 mt-2">
                                                                                            {q.options && q.options.map((optText, optIdx) => {
                                                                                                const isStudentChoice = optIdx === studentSelectedIdx;
                                                                                                const isThisOptionCorrect = (qCorrectIdx >= 0 && optIdx === qCorrectIdx) || (isStudentChoice && isCorrect);
                                                                                                const isThisOptionWrongChoice = isStudentChoice && !isCorrect;

                                                                                                let optClass = "border border-secondary border-opacity-20 text-white-50 opacity-60";
                                                                                                if (isThisOptionCorrect) {
                                                                                                    optClass = "border border-success border-opacity-80 bg-success bg-opacity-25 text-white fw-bold";
                                                                                                } else if (isThisOptionWrongChoice) {
                                                                                                    optClass = "border border-danger border-opacity-80 bg-danger bg-opacity-25 text-danger fw-bold";
                                                                                                }

                                                                                                return (
                                                                                                    <div key={optIdx} className={`p-2.5 rounded-3 d-flex align-items-center justify-content-between fs-085 ${optClass}`}>
                                                                                                        <div className="d-flex align-items-center gap-2 min-w-0">
                                                                                                            {isThisOptionCorrect ? (
                                                                                                                <i className="bi bi-check-circle-fill fs-5 flex-shrink-0"></i>
                                                                                                            ) : isThisOptionWrongChoice ? (
                                                                                                                <i className="bi bi-x-circle-fill text-danger fs-5 flex-shrink-0"></i>
                                                                                                            ) : (
                                                                                                                <i className="bi bi-circle fs-5 flex-shrink-0 opacity-40"></i>
                                                                                                            )}
                                                                                                            <span className="text-truncate">{optText}</span>
                                                                                                        </div>
                                                                                                        {isThisOptionCorrect && (
                                                                                                            <span className="badge bg-success text-white rounded-pill px-2.5 py-1 fs-065 ms-2 flex-shrink-0 fw-bold">
                                                                                                                <i className="bi bi-check2 me-1"></i>Esatta
                                                                                                            </span>
                                                                                                        )}
                                                                                                        {isThisOptionWrongChoice && (
                                                                                                            <span className="badge bg-danger text-white rounded-pill px-2.5 py-1 fs-065 ms-2 flex-shrink-0 fw-bold">
                                                                                                                Scelta dallo studente
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        /* VISTA VISITATORE / STUDENTE: SOLO I PROPRII RISULTATI */
                                        (() => {
                                            const currentStudentName = user?.name || localStorage.getItem('artaround_student_name') || localStorage.getItem('studentName') || '';
                                            const myResult = quizResults.find(r => r.studentName === currentStudentName) || quizResults[0];
                                            const score = myResult?.score || 0;
                                            const total = myResult?.total || quizQuestions.length;
                                            const percent = total > 0 ? Math.round((score / total) * 100) : 0;

                                            return (
                                                <div className="d-flex flex-column gap-3">
                                                    {/* HEADER PERSONALE STUDENTE */}
                                                    <div className="d-flex align-items-center justify-content-between pb-3 border-bottom border-secondary border-opacity-25">
                                                        <div className="d-flex align-items-center gap-3.5">
                                                            <div className="btn-icon-42 rounded-circle bg-orange bg-opacity-15 text-orange d-flex align-items-center justify-content-center flex-shrink-0 me-1">
                                                                <i className="bi bi-patch-check-fill fs-4"></i>
                                                            </div>
                                                            <div>
                                                                <h4 className="fw-black m-0 fs-5">Esito del tuo Quiz</h4>
                                                                <p className="small text-white-50 mb-0">Ecco il riepilogo delle tue risposte</p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => setQuizPhase('none')} className="btn-close btn-close-white" aria-label="Chiudi"></button>
                                                    </div>

                                                    {/* SCORE BANNER PERSONALE */}
                                                    <div className={`p-3.5 rounded-4 text-center border ${percent >= 80 ? 'bg-success bg-opacity-15 border-success border-opacity-40' : percent >= 50 ? 'bg-warning bg-opacity-15 border-warning border-opacity-40' : 'bg-danger bg-opacity-15 border-danger border-opacity-40'}`}>
                                                        <div className="fs-065 pt-1 text-uppercase fw-bold tracking-wider text-white mb-1">Punteggio Totale</div>
                                                        <div className="fs-2 fw-black text-white">
                                                            {score} <span className="fs-6 text-white fw-normal">/ {total} corrette ({percent}%)</span>
                                                        </div>
                                                    </div>

                                                    {/* ELENCO DELLE PROPRIE RISPOSTE */}
                                                    <div className="d-flex flex-column gap-2 max-h-50vh overflow-y-auto pe-1 custom-scrollbar">
                                                        <div className="fs-065 text-uppercase fw-bold text-orange letter-spacing-sm mb-1">
                                                            Le tue risposte per quesito:
                                                        </div>
                                                        {quizQuestions.map((q, qIdx) => {
                                                            const det = myResult?.details?.find(d => String(d.question_id) === String(q._id));
                                                            const isCorrect = det?.correct;
                                                            const qCorrectIdx = q.correctIndex !== undefined && q.correctIndex !== null ? Number(q.correctIndex) : -1;
                                                            const studentSelectedIdx = (det?.selectedIndex !== undefined && det?.selectedIndex !== null && !isNaN(Number(det.selectedIndex))) ? Number(det.selectedIndex) : -1;
                                                            const isUnanswered = studentSelectedIdx === -1;

                                                            return (
                                                                <div key={q._id} className={`p-3 rounded-4 border ${isCorrect ? 'border-success border-opacity-50 bg-success bg-opacity-10' : (isUnanswered ? 'border-warning border-opacity-50 bg-warning bg-opacity-10' : 'border-danger border-opacity-50 bg-danger bg-opacity-10')}`}>
                                                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                                                        <div className="fw-bold fs-6 text-white">{qIdx + 1}. {q.question}</div>
                                                                        <span className={`badge rounded-pill px-2.5 py-1 fw-bold fs-07 flex-shrink-0 ${isCorrect ? 'bg-success text-white' : (isUnanswered ? 'bg-warning text-dark' : 'bg-danger text-white')}`}>
                                                                            {isCorrect ? 'Corretta' : (isUnanswered ? 'Non risposto' : 'Errata')}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    {isUnanswered && (
                                                                        <div className="p-2 rounded-3 bg-opacity-15 border border-warning border-opacity-30 text-warning fs-075 fw-bold d-flex align-items-center gap-1.5 mb-2">
                                                                            <i className="bi bi-dash-circle-fill"></i>Non hai fornito alcuna risposta (Conteggiato come errore)
                                                                        </div>
                                                                    )}

                                                                    <div className="d-flex flex-column gap-1.5 mt-2">
                                                                        {q.options && q.options.map((optText, optIdx) => {
                                                                            const isStudentChoice = optIdx === studentSelectedIdx;
                                                                            const isThisOptionCorrect = (qCorrectIdx >= 0 && optIdx === qCorrectIdx) || (isStudentChoice && isCorrect);
                                                                            const isThisOptionWrongChoice = isStudentChoice && !isCorrect;

                                                                            let optClass = "border border-secondary border-opacity-20 text-white-50 opacity-60";
                                                                            if (isThisOptionCorrect) {
                                                                                optClass = "border border-success border-opacity-80 bg-success bg-opacity-25 text-white fw-bold";
                                                                            } else if (isThisOptionWrongChoice) {
                                                                                optClass = "border border-danger border-opacity-80 bg-danger bg-opacity-25 text-danger fw-bold";
                                                                            }

                                                                            return (
                                                                                <div key={optIdx} className={`p-2.5 rounded-3 d-flex align-items-center justify-content-between fs-085 ${optClass}`}>
                                                                                    <div className="d-flex align-items-center gap-2 min-w-0">
                                                                                        {isThisOptionCorrect ? (
                                                                                            <i className="bi bi-check-circle-fill fs-5 flex-shrink-0"></i>
                                                                                        ) : isThisOptionWrongChoice ? (
                                                                                            <i className="bi bi-x-circle-fill text-danger fs-5 flex-shrink-0"></i>
                                                                                        ) : (
                                                                                            <i className="bi bi-circle fs-5 flex-shrink-0 opacity-40"></i>
                                                                                        )}
                                                                                        <span className="text-truncate">{optText}</span>
                                                                                    </div>
                                                                                    {isThisOptionCorrect && (
                                                                                        <span className="badge bg-success text-white rounded-pill px-2.5 py-1 fs-065 ms-2 flex-shrink-0 fw-bold">
                                                                                            <i className="bi bi-check2 me-1"></i>Risposta Esatta
                                                                                        </span>
                                                                                    )}
                                                                                    {isThisOptionWrongChoice && (
                                                                                        <span className="badge bg-danger text-white rounded-pill px-2.5 py-1 fs-065 ms-2 flex-shrink-0 fw-bold">
                                                                                            La tua risposta
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <button onClick={() => setQuizPhase('none')} className="btn bg-orange text-white rounded-pill px-4 py-2 fw-bold w-100 mt-1 shadow-sm">
                                                        Torna alla visita
                                                    </button>
                                                </div>
                                            );
                                        })()
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* LIGHTBOX MODAL */}
            {lightboxImage && (
                <div
                    className="lightbox-overlay"
                    onClick={() => { setLightboxImage(null); setSelectedMapPin(null); }}
                >
                    <button
                        type="button"
                        className="btn btn-light rounded-circle d-flex align-items-center justify-content-center shadow-lg lightbox-close-btn"
                        onClick={e => { e.stopPropagation(); setLightboxImage(null); setSelectedMapPin(null); }}
                        aria-label="Chiudi"
                    >
                        <i className="bi bi-x-lg fs-5 text-dark fw-bold"></i>
                    </button>

                    {lightboxImage === '__mappa__' ? (
                        <div
                            className="w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3 overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="lightbox-map-container mb-3 position-relative">
                                {renderMapWithPins(true)}
                            </div>
                            <div className="max-w-400 w-100">
                                {renderSelectedPinCard()}
                            </div>
                        </div>
                    ) : (
                        <div
                            className="lightbox-artwork-container"
                            onClick={e => e.stopPropagation()}
                        >
                            <img
                                src={lightboxImage}
                                alt="Ingrandita"
                                className="lightbox-artwork-img"
                            />
                        </div>
                    )}
                </div>
            )}


            <ProfileModal 
                isOpen={isProfileModalOpen} 
                onClose={() => setIsProfileModalOpen(false)} 
                user={user} 
                onUpdate={(updatedUser) => setUser(updatedUser)} 
            />

            {/* OFFCANVAS MAPPA DEL MUSEO */}
            <div className={`offcanvas offcanvas-end z-1050 bg-body text-body w-100 max-w-400 ${isMapOpen ? 'show d-flex visible' : 'invisible'}`} tabIndex="-1">
                <div className="offcanvas-header border-bottom border-secondary-subtle px-4 py-3">
                    <h5 className="offcanvas-title fw-bold mb-0 d-flex align-items-center gap-2">
                        <i className="bi bi-map-fill text-orange"></i>Mappa del museo
                    </h5>
                    <button type="button" className="btn-close" onClick={() => setIsMapOpen(false)} aria-label="Chiudi mappa"></button>
                </div>

                <div className="offcanvas-body d-flex flex-column">
                    {/* Dove si trova l'opera che sto guardando */}
                    {currentItem.sala?.nome && (
                        <div className={`p-3 rounded-3 mb-3 ${darkMode ? 'bg-black bg-opacity-50' : 'bg-white border'}`}>
                            <small className={`d-block mb-1 ${textMuted}`}>Dove si trova quest'opera?</small>
                            <span className="fw-bold">
                                <i className="bi bi-geo-alt-fill text-orange me-1"></i>
                                {currentItem.sala.nome}
                                {pianoOpera && <span className="fw-normal"> · {pianoOpera.nome}</span>}
                            </span>
                        </div>
                    )}

                    {/* Selettore dei piani */}
                    {piante.length > 0 && (
                        <div className="mb-3">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="fs-075 text-uppercase fw-bold text-orange letter-spacing-sm">
                                    <i className="bi bi-layers-fill me-1"></i>Piani del museo
                                </span>
                                {currentItem.sala?.piano !== undefined && currentItem.sala?.piano !== null && currentItem.sala?.piano !== pianoAttivo && (
                                    <button
                                        type="button"
                                        className="btn btn-link p-0 text-orange fs-075 text-decoration-none fw-bold"
                                        onClick={() => setPianoAttivo(currentItem.sala.piano)}
                                    >
                                        <i className="bi bi-crosshair me-1"></i>Torna al piano dell'opera ({pianoOpera?.nome || `Piano ${currentItem.sala.piano}`})
                                    </button>
                                )}
                            </div>
                            <div className="d-flex flex-wrap gap-2">
                                {piante.map(p => {
                                    const isArtworkOnThisFloor = currentItem.sala?.piano === p.piano;
                                    const isSelectedFloor = p.piano === pianoAttivo;
                                    return (
                                        <button
                                            key={p.piano}
                                            type="button"
                                            onClick={() => setPianoAttivo(p.piano)}
                                            className={`btn btn-sm rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5 fw-bold transition-all ${
                                                isSelectedFloor
                                                    ? 'bg-orange text-white shadow-sm border border-orange'
                                                    : (darkMode ? 'btn-outline-light border-secondary border-opacity-50' : 'btn-outline-dark border-secondary-subtle')
                                            }`}
                                        >
                                            <i className={`bi ${isArtworkOnThisFloor ? 'bi-geo-alt-fill text-warning' : 'bi-layers'}`}></i>
                                            <span>{p.nome || `Piano ${p.piano}`}</span>
                                            {isArtworkOnThisFloor && (
                                                <span className={`badge rounded-pill px-1.5 py-0.5 ms-1 fs-065 ${isSelectedFloor ? 'bg-white text-orange' : 'bg-orange text-white'}`}>
                                                    Opera qui
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Pianta del piano selezionato con PIN */}
                    {piantaAttiva?.immagine ? (
                        <div className="mb-3">
                            {renderMapWithPins(false)}
                        </div>
                    ) : (
                        <div className="d-flex flex-column justify-content-center align-items-center h-100 text-center p-4 flex-grow-1">
                            <i className="bi bi-map display-4 text-secondary-subtle"></i>
                            <p className="text-body-secondary fw-medium mt-3 m-0">
                                Il museo non ha ancora caricato la pianta.
                            </p>
                        </div>
                    )}

                    {/* POPUP SCHEDA Dettagli Sala Selezionata (Sotto la Mappa) */}
                    {renderSelectedPinCard()}

                    {/* Domande a cui il museo ha risposto */}
                    {domandeMappa.length > 0 && (
                        <>
                            <h6 className="fw-bold mb-2">Domande frequenti</h6>
                            <div className="d-flex flex-column gap-2">
                                {domandeMappa.map((poi, i) => {
                                    const info = POI_INFO[poi.tipo] || { icona: 'bi-geo-alt-fill', domanda: `Dov'è ${poi.tipo}?` };
                                    const chiave = poi._id || i;
                                    const aperta = domandaAperta === chiave;
                                    return (
                                        <div key={chiave} className={`rounded-3 ${darkMode ? 'bg-black bg-opacity-50' : 'bg-white border'}`}>
                                            <button
                                                type="button"
                                                onClick={() => setDomandaAperta(aperta ? null : chiave)}
                                                className={`btn w-100 text-start d-flex align-items-center gap-2 py-2 px-3 shadow-none ${darkMode ? 'text-white' : 'text-dark'}`}
                                                aria-expanded={aperta}
                                            >
                                                <i className={`bi ${info.icona} text-orange`}></i>
                                                <span className="flex-grow-1 fw-bold fs-095">{info.domanda}</span>
                                                <i className={`bi ${aperta ? 'bi-chevron-up' : 'bi-chevron-down'} ${textMuted}`}></i>
                                            </button>
                                            {aperta && (
                                                <p className={`mb-0 px-3 pb-3 fs-095 ${textMuted}`}>{poi.testo}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {isMapOpen && (
                <div className="offcanvas-backdrop fade show z-1040" onClick={() => setIsMapOpen(false)}></div>
            )}

            {/* OFFCANVAS CHAT */}
            {pin && (
                <div className={`offcanvas offcanvas-end z-1050 d-flex flex-column bg-body text-body ${isChatOpen ? 'show visible' : 'invisible'}`} tabIndex="-1">
                    <div className="offcanvas-header border-bottom border-secondary-subtle px-4 py-3">
                        <h5 className="offcanvas-title fw-bold"><i className="bi bi-chat-dots-fill text-orange me-2"></i> Chat Stanza</h5>
                        <button type="button" className="btn-close" onClick={() => setIsChatOpen(false)}></button>
                    </div>
                    {role === 'teacher' && (
                        <div className="p-2 border-bottom border-secondary-subtle bg-body-tertiary">
                            <select className="form-select form-select-sm rounded-pill border-secondary-subtle bg-body text-body shadow-sm w-100" value={chatFilter} onChange={(e) => setChatFilter(e.target.value)}>
                                <option value="all">Tutti i messaggi</option>
                                <option value="user">Solo messaggi degli utenti</option>
                                <option value="system">Solo messaggi di sistema</option>
                            </select>
                        </div>
                    )}
                    <div className="offcanvas-body chat-background d-flex flex-column gap-3 p-3 pb-5 overflow-y-auto">
                        {chatMessages.length === 0 && (
                            <div className="d-flex justify-content-center mt-5">
                                <div className="px-4 py-2 rounded-pill shadow-sm small bg-body-secondary text-body-secondary">
                                    <i className="bi bi-shield-lock-fill me-2"></i>I messaggi sono crittografati.
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
                                    <div key={msg.id} className="d-flex flex-column align-items-center">
                                        <div className="p-2 px-3 rounded-pill text-center shadow-sm fs-07 bg-body-tertiary text-body-secondary border border-secondary-subtle max-w-90">
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
                                <div key={msg.id} className={isMe ? "align-self-end max-w-80" : "align-self-start max-w-80"}>
                                    <div className={`rounded-4 p-2 px-3 shadow-sm ${isMe ? 'bg-orange text-white' : 'bg-body-secondary text-body'}`}>
                                        {!isMe && <div className="text-orange fw-bold small mb-1 lh-1 fs-08">{msg.sender}</div>}
                                        <div className="d-flex align-items-end flex-wrap gap-2">
                                            <span className="mb-0 lh-sm break-word">{msg.message}</span>
                                            <span className={`small ms-auto fs-07 ${isMe ? 'text-white-50' : 'text-body-secondary'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                    
                    {/* INPUT MESSAGGI - FISSO IN BASSO */}
                    <div className="p-3 border-top border-secondary-subtle bg-body-tertiary mt-auto z-10">
                        <form onSubmit={sendChatMessage} className="d-flex gap-2 align-items-center">
                            <input 
                                type="text" 
                                className="form-control rounded-pill bg-body border-secondary-subtle px-3 py-2 shadow-none" 
                                placeholder="Scrivi un messaggio..." 
                                value={chatInput} 
                                onChange={e => setChatInput(e.target.value)}
                            />
                            <button type="submit" disabled={!chatInput.trim()} className="btn btn-orange rounded-circle d-flex align-items-center justify-content-center p-2 text-white shadow-sm btn-icon-42">
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

            {/* MODAL COMANDI INFO */}
            <div className="modal fade" id="commandsModal" tabIndex="-1" aria-labelledby="commandsModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className={`modal-content rounded-4 shadow-lg border-0 ${darkMode ? 'bg-dark text-white' : 'bg-body text-dark'}`}>
                        <div className="modal-header border-bottom border-secondary-subtle">
                            <h5 className="modal-title fw-bold" id="commandsModalLabel"><i className="bi bi-info-circle text-orange me-2"></i>Comandi Disponibili</h5>
                            <button type="button" className={`btn-close ${darkMode ? 'btn-close-white' : ''}`} data-bs-dismiss="modal" aria-label="Chiudi"></button>
                        </div>
                        <div className="modal-body p-0">
                            <div className="list-group list-group-flush rounded-bottom-4">
                                
                                <h6 className="text-uppercase fw-bold text-primary mt-3 mb-2 ms-3 letter-spacing-sm fs-7">Informazioni</h6>
                                
                                <button type="button" className={`list-group-item list-group-item-action d-flex align-items-center gap-3 border-secondary-subtle py-3 cursor-pointer ${darkMode ? 'bg-dark text-white' : 'bg-body text-dark'}`} onClick={() => { const author = currentItem?.author || "Autore sconosciuto"; const title = (currentItem?.item || currentItem?.title || currentItem?.name || "Opera").replace(/\s*\d{10,}$/, ''); speak(`L'autore di quest'opera è ${author}, e si intitola ${title}.`); }} data-bs-dismiss="modal">
                                    <i className="bi bi-person-badge fs-3 text-primary opacity-75"></i>
                                    <div>
                                        <div className={`fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>"Chi è l'autore?", "Quest'opera..."</div>
                                        <span className={`small d-block ${darkMode ? 'text-white-50' : 'text-muted'}`}>Risponde pronunciando il nome dell'autore dell'opera.</span>
                                    </div>
                                </button>
                                
                                <button type="button" className={`list-group-item list-group-item-action d-flex align-items-center gap-3 border-secondary-subtle py-3 cursor-pointer ${darkMode ? 'bg-dark text-white' : 'bg-body text-dark'}`} onClick={() => { setIsMapOpen(true); }} data-bs-dismiss="modal">
                                    <i className="bi bi-map fs-3 text-success opacity-75"></i>
                                    <div>
                                        <div className={`fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>"Mappa", "Dove mi trovo?"</div>
                                        <span className={`small d-block ${darkMode ? 'text-white-50' : 'text-muted'}`}>Apre automaticamente la mappa del museo.</span>
                                    </div>
                                </button>
                                
                                <button type="button" className={`list-group-item list-group-item-action d-flex align-items-center gap-3 border-secondary-subtle py-3 cursor-pointer ${darkMode ? 'bg-dark text-white' : 'bg-body text-dark'}`} onClick={() => { 
                                    const dm = (visita?.museum_id?.mappa?.poi || []).filter(p => p.testo && p.testo.trim() !== '');
                                    const p = dm.find(x => x.tipo === 'toilette');
                                    if(p){ speak(p.testo); setDomandaAperta(p._id || dm.indexOf(p)); } 
                                    setIsMapOpen(true); 
                                }} data-bs-dismiss="modal">
                                    <i className="bi bi-droplet fs-3 text-info opacity-75"></i>
                                    <div>
                                        <div className={`fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>"Dov'è il bagno?", "Servizi igienici"</div>
                                        <span className={`small d-block ${darkMode ? 'text-white-50' : 'text-muted'}`}>Mostra sulla mappa dove si trovano i bagni.</span>
                                    </div>
                                </button>

                                <button type="button" className={`list-group-item list-group-item-action d-flex align-items-center gap-3 border-secondary-subtle py-3 cursor-pointer ${darkMode ? 'bg-dark text-white' : 'bg-body text-dark'}`} onClick={() => { 
                                    const dm = (visita?.museum_id?.mappa?.poi || []).filter(p => p.testo && p.testo.trim() !== '');
                                    const p = dm.find(x => x.tipo === 'bar');
                                    if(p){ speak(p.testo); setDomandaAperta(p._id || dm.indexOf(p)); } 
                                    setIsMapOpen(true); 
                                }} data-bs-dismiss="modal">
                                    <i className="bi bi-cup-hot fs-3 text-warning opacity-75"></i>
                                    <div>
                                        <div className={`fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>"Dov'è la caffetteria?", "Bar"</div>
                                        <span className={`small d-block ${darkMode ? 'text-white-50' : 'text-muted'}`}>Mostra sulla mappa dove bere o mangiare qualcosa.</span>
                                    </div>
                                </button>

                                <button type="button" className={`list-group-item list-group-item-action d-flex align-items-center gap-3 border-secondary-subtle py-3 cursor-pointer ${darkMode ? 'bg-dark text-white' : 'bg-body text-dark'}`} onClick={() => { 
                                    const dm = (visita?.museum_id?.mappa?.poi || []).filter(p => p.testo && p.testo.trim() !== '');
                                    const p = dm.find(x => x.tipo === 'shop');
                                    if(p){ speak(p.testo); setDomandaAperta(p._id || dm.indexOf(p)); } 
                                    setIsMapOpen(true); 
                                }} data-bs-dismiss="modal">
                                    <i className="bi bi-bag-fill fs-3 text-primary opacity-75"></i>
                                    <div>
                                        <div className={`fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>"Dov'è il bookshop?", "Shop"</div>
                                        <span className={`small d-block ${darkMode ? 'text-white-50' : 'text-muted'}`}>Mostra sulla mappa dove si trova il negozio del museo.</span>
                                    </div>
                                </button>

                                <button type="button" className={`list-group-item list-group-item-action d-flex align-items-center gap-3 border-secondary-subtle py-3 cursor-pointer ${darkMode ? 'bg-dark text-white' : 'bg-body text-dark'}`} onClick={() => { 
                                    const dm = (visita?.museum_id?.mappa?.poi || []).filter(p => p.testo && p.testo.trim() !== '');
                                    const p = dm.find(x => x.tipo === 'uscita');
                                    if(p){ speak(p.testo); setDomandaAperta(p._id || dm.indexOf(p)); } 
                                    setIsMapOpen(true); 
                                }} data-bs-dismiss="modal">
                                    <i className="bi bi-door-open fs-3 text-danger opacity-75"></i>
                                    <div>
                                        <div className={`fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>"Dov'è l'uscita?", "Uscita"</div>
                                        <span className={`small d-block ${darkMode ? 'text-white-50' : 'text-muted'}`}>Ti indica la via d'uscita del museo.</span>
                                    </div>
                                </button>

                                {/* CATEGORIA NAVIGAZIONE */}
                                <h6 className="text-uppercase fw-bold text-primary mt-4 mb-2 ms-3 letter-spacing-sm fs-075">Navigazione</h6>

                                <button type="button" className={`list-group-item list-group-item-action d-flex align-items-center gap-3 border-secondary-subtle py-3 cursor-pointer ${darkMode ? 'bg-dark text-white' : 'bg-body text-dark'}`} onClick={() => { if(role === 'teacher' || !pin) goToNextItem(); }} data-bs-dismiss="modal">
                                    <i className="bi bi-arrow-right-circle fs-3 text-orange opacity-75"></i>
                                    <div>
                                        <div className={`fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>"Avanti", "Prossimo", "Successivo"</div>
                                        <span className={`small d-block ${darkMode ? 'text-white-50' : 'text-muted'}`}>Passa all'opera successiva (solo se abilitato).</span>
                                    </div>
                                </button>

                                <button type="button" className={`list-group-item list-group-item-action d-flex align-items-center gap-3 border-secondary-subtle py-3 cursor-pointer ${darkMode ? 'bg-dark text-white' : 'bg-body text-dark'}`} onClick={() => { if(role === 'teacher' || !pin) goToPrevItem(); }} data-bs-dismiss="modal">
                                    <i className="bi bi-arrow-left-circle fs-3 text-orange opacity-75"></i>
                                    <div>
                                        <div className={`fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>"Indietro", "Precedente"</div>
                                        <span className={`small d-block ${darkMode ? 'text-white-50' : 'text-muted'}`}>Torna all'opera precedente (solo se abilitato).</span>
                                    </div>
                                </button>

                                {/* CATEGORIA PERSONALIZZAZIONE */}
                                <h6 className="text-uppercase fw-bold text-primary mt-4 mb-2 ms-3 letter-spacing-sm fs-075">Personalizzazione</h6>

                                <button type="button" className={`list-group-item list-group-item-action d-flex align-items-center gap-3 border-secondary-subtle py-3 cursor-pointer ${darkMode ? 'bg-dark text-white' : 'bg-body text-dark'}`} onClick={() => { changeLevelDown(); handleStudentAction('minus'); }} data-bs-dismiss="modal">
                                    <i className="bi bi-chat-left-text fs-3 text-info opacity-75"></i>
                                    <div>
                                        <div className={`fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>"Più semplice", "Non capisco"</div>
                                        <span className={`small d-block ${darkMode ? 'text-white-50' : 'text-muted'}`}>Rende la descrizione più adatta ad un principiante.</span>
                                    </div>
                                </button>

                                <button type="button" className={`list-group-item list-group-item-action d-flex align-items-center gap-3 border-secondary-subtle py-3 cursor-pointer ${darkMode ? 'bg-dark text-white' : 'bg-body text-dark'}`} onClick={() => { changeLevelUp(); handleStudentAction('plus'); }} data-bs-dismiss="modal">
                                    <i className="bi bi-chat-right-text fs-3 text-info opacity-75"></i>
                                    <div>
                                        <div className={`fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>"Troppo semplice", "Meno scolastico"</div>
                                        <span className={`small d-block ${darkMode ? 'text-white-50' : 'text-muted'}`}>Aumenta la complessità accademica della descrizione.</span>
                                    </div>
                                </button>

                                <button type="button" className={`list-group-item list-group-item-action d-flex align-items-center gap-3 border-secondary-subtle py-3 cursor-pointer ${darkMode ? 'bg-dark text-white' : 'bg-body text-dark'}`} onClick={() => { changeLengthUp(); handleStudentAction('plus'); }} data-bs-dismiss="modal">
                                    <i className="bi bi-arrows-expand fs-3 text-secondary opacity-75"></i>
                                    <div>
                                        <div className={`fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>"Di più", "Più dettagli", "Aumenta"</div>
                                        <span className={`small d-block ${darkMode ? 'text-white-50' : 'text-muted'}`}>Aumenta la lunghezza della spiegazione dell'opera.</span>
                                    </div>
                                </button>

                                <button type="button" className={`list-group-item list-group-item-action d-flex align-items-center gap-3 border-secondary-subtle py-3 cursor-pointer ${darkMode ? 'bg-dark text-white' : 'bg-body text-dark'}`} onClick={() => { changeLengthDown(); handleStudentAction('minus'); }} data-bs-dismiss="modal">
                                    <i className="bi bi-arrows-collapse fs-3 text-secondary opacity-75"></i>
                                    <div>
                                        <div className={`fw-bold ${darkMode ? 'text-white' : 'text-dark'}`}>"Di meno", "Meno dettagli", "Diminuisci"</div>
                                        <span className={`small d-block ${darkMode ? 'text-white-50' : 'text-muted'}`}>Riduce la lunghezza e fornisce un riassunto breve.</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

export default VisitDetail;
