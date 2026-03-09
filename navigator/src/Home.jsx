function Home() {
    return (

        <>
            <div class="container py-5">
                <header class="text-center mb-5">
                    <h1 class="display-4 fw-bold text-primary">ArtAround</h1>
                    <p class="lead">Seleziona l'applicazione da avviare</p>
                </header>

                <div class="row g-4 justify-content-center">
                    <div class="col-md-4">
                        <div class="card h-100 border-primary text-center p-3">
                            <div class="card-body">
                                <h2 class="card-title h4">Navigator</h2>
                                <p class="card-text">Applicazione in <strong>React</strong> per la navigazione delle opere.</p>
                                <a href="/navigator/index.html" class="btn btn-primary w-100">Apri Navigator</a>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-4">
                        <div class="card h-100 border-success text-center p-3">
                            <div class="card-body">
                                <h2 class="card-title h4 text-success">Marketplace & Editor</h2>
                                <p class="card-text">Realizzato in <strong>Vanilla JS</strong> (Senza Framework).</p>
                                <a href="/marketplace/index.html" class="btn btn-success w-100">Apri Marketplace</a>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-4">
                        <div class="card h-100 border-warning text-center p-3">
                            <div class="card-body">
                                <h2 class="card-title h4 text-warning">Back-office</h2>
                                <p class="card-text">Gestione contenuti e database (Node + Express).</p>
                                <a href="/admin/index.html" class="btn btn-warning w-100">Apri Gestionale</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>)
}
export default Home
