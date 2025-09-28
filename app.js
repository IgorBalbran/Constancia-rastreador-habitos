document.addEventListener('DOMContentLoaded', () => {

    // =======================================================================
    // 1. ESTADO DA APLICAÇÃO (O "CÉREBRO")
    // ============================================a===========================
    const state = {
        currentPage: 'habits',
        editingHabitId: null,
        // ESTADO INICIAL: Agora começa com arrays vazios para um novo usuário.
        // Se já houver dados no localStorage, eles serão carregados.
        habits: JSON.parse(localStorage.getItem('constancia_habits')) || [],
        dreams: JSON.parse(localStorage.getItem('constancia_dreams')) || [],
        pomodoro: {
            timer: null, mode: 'focus', timeRemaining: 25 * 60, isRunning: false,
            focusTime: 25 * 60, breakTime: 5 * 60,
        },
        calendar: {
            currentDate: new Date(),
        }
    };

    const habitColors = ['#34d399', '#f59e0b', '#60a5fa', '#a78bfa', '#f472b6', '#ef4444'];

    // =======================================================================
    // 2. SELETORES DO DOM
    // =======================================================================
    const DOM = {
        mainContent: document.getElementById('main-content'),
        navLinks: document.querySelectorAll('.nav-item, .bottom-nav-item'),
        pages: {
            habits: document.getElementById('page-habits'),
            calendar: document.getElementById('page-calendar'),
            dreams: document.getElementById('page-dreams'),
            pomodoro: document.getElementById('page-pomodoro'),
        },
        fab: document.getElementById('fab'),
        dailyQuote: document.getElementById('daily-quote'),
        themeToggle: document.getElementById('theme-toggle'),
        themeIcon: document.getElementById('theme-icon'),
        modalContainer: document.getElementById('modal-container'),
        toastContainer: document.getElementById('toast-container'),
    };

    // =======================================================================
    // 3. FUNÇÕES DE UTILIDADE
    // =======================================================================
    const utils = {
        getFormattedDate: (date) => date.toISOString().split('T')[0],
        getStartOfWeek: (date) => {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() - day;
            return new Date(d.setDate(diff));
        },
        calculateStreak: (completions) => {
            if (!completions) return 0;
            let streak = 0;
            let currentDate = new Date();
            if (!completions[utils.getFormattedDate(currentDate)]) {
                currentDate.setDate(currentDate.getDate() - 1);
            }
            while (completions[utils.getFormattedDate(currentDate)]) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            }
            return streak;
        },
        saveData: () => {
            localStorage.setItem('constancia_habits', JSON.stringify(state.habits));
            localStorage.setItem('constancia_dreams', JSON.stringify(state.dreams));
        },
    };

    // =======================================================================
    // 4. MÓDULO DE UI (INTERFACE DO USUÁRIO)
    // =======================================================================
    const UI = {
        renderPageContent(pageId) {
            const pageContainer = DOM.pages[pageId];
            if (!pageContainer) return;
            pageContainer.innerHTML = '';
            switch (pageId) {
                case 'habits': this.renderHabitsPage(pageContainer); break;
                case 'calendar': this.renderCalendarPage(pageContainer); break;
                case 'dreams': this.renderDreamsPage(pageContainer); break;
                case 'pomodoro': this.renderPomodoroPage(pageContainer); break;
            }
        },
        renderHabitsPage(container) {
            container.innerHTML = `<header class="flex justify-between items-center mb-6"><div><h2 class="text-3xl font-bold">Seus Hábitos</h2><p class="text-stone-500 dark:text-stone-400" id="todayDate"></p></div><div class="hidden md:flex items-center space-x-2"><button id="add-habit-btn" class="bg-orange-700 hover:bg-orange-800 dark:bg-orange-600 dark:hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition">+ Novo Hábito</button></div></header><div id="habits-list" class="space-y-3"></div>`;
            document.getElementById('todayDate').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
            this.renderHabitsList();
        },
        renderHabitsList() {
            const listContainer = document.getElementById('habits-list');
            if (!listContainer) return;
            listContainer.innerHTML = '';
            if (state.habits.length === 0) {
                listContainer.innerHTML = '<p class="text-stone-500 dark:text-stone-400 text-center mt-8">Nenhum hábito adicionado ainda. Crie o seu primeiro!</p>';
                return;
            }
            const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
            const startOfWeek = utils.getStartOfWeek(new Date());
            state.habits.forEach(habit => {
                const card = document.createElement('div');
                card.className = 'habit-card bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between transition border-l-4';
                card.style.borderColor = habit.color;
                const currentStreak = utils.calculateStreak(habit.completions);
                habit.streak = currentStreak;
                habit.record = Math.max(habit.record || 0, currentStreak);
                let weekDayButtons = '';
                for (let i = 0; i < 7; i++) {
                    const dayDate = new Date(startOfWeek);
                    dayDate.setDate(startOfWeek.getDate() + i);
                    const dateStr = utils.getFormattedDate(dayDate);
                    const isCompleted = habit.completions && habit.completions[dateStr];
                    weekDayButtons += `<button data-date="${dateStr}" class="weekday-btn ${isCompleted ? 'completed' : 'bg-stone-200 dark:bg-gray-700 text-stone-600 dark:text-stone-300'}">${weekDays[i]}</button>`;
                }
                card.innerHTML = `<div class="flex-grow w-full"><p class="font-semibold text-stone-700 dark:text-stone-200">${habit.name}</p><div class="flex items-center space-x-1 sm:space-x-2 mt-2 weekday-container" data-id="${habit.id}">${weekDayButtons}</div></div><div class="flex items-center space-x-3 mt-3 sm:mt-0 w-full sm:w-auto justify-end"><div class="text-right"><p class="text-sm text-stone-500 dark:text-stone-400">Ofensiva: <span class="font-bold">${habit.streak} dias 🔥</span></p><p class="text-xs text-stone-400 dark:text-stone-500">Recorde: ${habit.record} 🏆</p></div><button data-id="${habit.id}" class="edit-btn text-stone-500 hover:text-orange-600 dark:hover:text-orange-400 p-2" aria-label="Editar Hábito">✏️</button><button data-id="${habit.id}" class="delete-btn text-stone-500 hover:text-red-600 dark:hover:text-red-400 p-2" aria-label="Deletar Hábito">🗑️</button></div>`;
                listContainer.appendChild(card);
            });
        },
        renderCalendarPage(container) {
            container.innerHTML = `<h2 class="text-3xl font-bold text-stone-800 dark:text-stone-100 mb-6">Calendário e Progresso</h2><div class="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm"><div class="flex justify-between items-center mb-4"><button id="prev-month" class="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-gray-700 text-stone-800 dark:text-stone-200">&lt;</button><h3 id="month-year" class="text-xl font-semibold text-stone-800 dark:text-stone-100"></h3><button id="next-month" class="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-gray-700 text-stone-800 dark:text-stone-200">&gt;</button></div><div id="calendar-grid" class="grid grid-cols-7 gap-1 text-center text-sm md:text-base text-stone-800 dark:text-stone-200"></div></div><div id="calendar-stats" class="mt-6 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm"></div>`;
            this.renderCalendarGrid();
        },
        renderCalendarGrid() {
            const calendarGrid = document.getElementById('calendar-grid');
            const monthYearEl = document.getElementById('month-year');
            const { currentDate } = state.calendar;
            calendarGrid.innerHTML = '';
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            monthYearEl.textContent = `${currentDate.toLocaleString('pt-BR', { month: 'long' })} ${year}`.replace(/^\w/, c => c.toUpperCase());
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach(day => { calendarGrid.innerHTML += `<div class="font-bold text-stone-500 dark:text-stone-400 p-2">${day}</div>`; });
            for (let i = 0; i < firstDay; i++) calendarGrid.innerHTML += `<div></div>`;
            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = utils.getFormattedDate(new Date(year, month, i));
                let indicatorsHTML = '<div class="indicators-container">';
                state.habits.forEach(habit => {
                    if (habit.completions && habit.completions[dateStr]) {
                        indicatorsHTML += `<div class="habit-indicator" style="background-color: ${habit.color};"></div>`;
                    }
                });
                indicatorsHTML += '</div>';
                calendarGrid.innerHTML += `<div class="calendar-day p-2 rounded-lg">${i}${indicatorsHTML}</div>`;
            }
            this.renderCalendarStats();
        },
        renderCalendarStats() {
            const calendarStatsEl = document.getElementById('calendar-stats');
            const { currentDate } = state.calendar;
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            if (state.habits.length === 0) {
                calendarStatsEl.innerHTML = '<p class="text-stone-500 dark:text-stone-400">Adicione hábitos para ver as estatísticas.</p>';
                return;
            }
            let statsHTML = `<h4 class="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">Estatísticas de Hábitos</h4><div class="space-y-2">`;
            state.habits.forEach(habit => {
                let monthCount = 0;
                let yearCount = 0;
                if (habit.completions) {
                    for (const dateStr in habit.completions) {
                        if (habit.completions[dateStr]) {
                            const date = new Date(dateStr + 'T00:00:00');
                            if (date.getFullYear() === year) {
                                yearCount++;
                                if (date.getMonth() === month) {
                                    monthCount++;
                                }
                            }
                        }
                    }
                }
                statsHTML += `<div class="flex items-center justify-between text-sm"><div class="flex items-center"><span class="w-3 h-3 rounded-full mr-2" style="background-color: ${habit.color};"></span><span class="font-medium text-stone-600 dark:text-stone-300">${habit.name}</span></div><span class="font-semibold text-stone-800 dark:text-stone-100">${monthCount} no mês / ${yearCount} no ano</span></div>`;
            });
            statsHTML += `</div>`;
            calendarStatsEl.innerHTML = statsHTML;
        },
        renderDreamsPage(container) {
            container.innerHTML = `<header class="flex justify-between items-center mb-6"><div><h2 class="text-3xl font-bold text-stone-800 dark:text-stone-100">Mural dos Sonhos</h2><p class="text-stone-500 dark:text-stone-400">Seus hábitos constroem seus sonhos.</p></div><button id="add-dream-btn" class="bg-orange-700 hover:bg-orange-800 dark:bg-orange-600 dark:hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition hidden md:block">+ Novo Sonho</button></header><div id="dreams-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"></div>`;
            this.renderDreamsGrid();
        },
        renderDreamsGrid() {
            const dreamsGrid = document.getElementById('dreams-grid');
            if (!dreamsGrid) return;
            dreamsGrid.innerHTML = state.dreams.length > 0 ? '' : '<p class="text-stone-500 dark:text-stone-400 text-center mt-8 col-span-full">Adicione o seu primeiro sonho!</p>';
            state.dreams.forEach(dream => {
                const card = document.createElement('div');
                card.className = 'relative bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden flex flex-col';
                // BOTÃO DE DELETAR ADICIONADO AQUI
                card.innerHTML = `
                    <img src="${dream.img || 'https://images.unsplash.com/photo-1531306733931-31451a4454e9?fit=crop&w=400&h=400&q=80'}" alt="${dream.name}" class="w-full h-32 object-cover">
                    <div class="p-3 flex-grow flex flex-col">
                        <p class="font-semibold flex-grow text-stone-700 dark:text-stone-200">${dream.name}</p>
                    </div>
                    <button data-id="${dream.id}" class="delete-dream-btn absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition" aria-label="Deletar Sonho">
                        <span class="text-sm">×</span>
                    </button>
                `;
                dreamsGrid.appendChild(card);
            });
        },
        renderPomodoroPage(container) {
            container.innerHTML = `<div class="flex flex-col items-center justify-center h-full"><div class="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg"><div id="pomodoro-mode-display" class="text-2xl font-semibold text-orange-800 dark:text-orange-400 mb-4 h-8">Foco</div><div class="w-64 h-64 border-8 border-stone-200 dark:border-gray-700 rounded-full flex items-center justify-center mb-8"><span id="pomodoro-time" class="text-6xl font-bold text-stone-800 dark:text-stone-100">25:00</span></div><div class="flex space-x-4"><button id="pomodoro-start" class="flex-grow bg-orange-700 hover:bg-orange-800 dark:bg-orange-600 dark:hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition">Iniciar</button><button id="pomodoro-reset" class="bg-stone-200 dark:bg-gray-700 text-stone-700 dark:text-stone-200 font-bold py-3 px-4 rounded-lg shadow-md hover:bg-stone-300 dark:hover:bg-gray-600 transition">Resetar</button></div></div></div>`;
            this.updatePomodoroDisplay();
        },
        updatePomodoroDisplay() {
            const timeEl = document.getElementById('pomodoro-time');
            if (!timeEl) return;
            const { timeRemaining, isRunning, focusTime } = state.pomodoro;
            const minutes = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
            const seconds = String(timeRemaining % 60).padStart(2, '0');
            timeEl.textContent = `${minutes}:${seconds}`;
            const modeDisplay = document.getElementById('pomodoro-mode-display');
            modeDisplay.textContent = state.pomodoro.mode === 'focus' ? 'Foco' : 'Descanso';
            const startBtn = document.getElementById('pomodoro-start');
            if (isRunning) {
                startBtn.textContent = 'Pausar';
            } else if (timeRemaining < focusTime) {
                startBtn.textContent = 'Continuar';
            } else {
                startBtn.textContent = 'Iniciar';
            }
        },
        showModal({ title, contentHTML, saveButtonText = 'Salvar', showSaveButton = true }) {
            const modalHTML = `<div id="active-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"><div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm p-6"><h2 class="text-xl font-bold mb-4">${title}</h2><div id="modal-content-body">${contentHTML}</div><div class="flex justify-end space-x-2 mt-6"><button id="modal-cancel-btn" class="bg-stone-200 dark:bg-gray-600 px-4 py-2 rounded-md">Fechar</button>${showSaveButton ? `<button id="modal-save-btn" class="bg-orange-700 text-white px-4 py-2 rounded-md">${saveButtonText}</button>` : ''}</div></div></div>`;
            DOM.modalContainer.innerHTML = modalHTML;
            document.getElementById('dream-name-input')?.focus();
        },
        closeModal() {
            DOM.modalContainer.innerHTML = '';
        },
        showToast(message, isError = false) {
            const toast = document.createElement('div');
            toast.className = `toast ${isError ? 'bg-red-600' : 'bg-green-600'} text-white font-bold py-2 px-4 rounded-lg shadow-lg`;
            toast.textContent = message;
            DOM.toastContainer.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        },
        applyTheme(theme) {
            document.documentElement.classList.toggle('dark', theme === 'dark');
            DOM.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
            localStorage.setItem('theme', theme);
        },
    };

    // =======================================================================
    // 6. CONTROLADOR PRINCIPAL DA APLICAÇÃO
    // =======================================================================
    const App = {
        init() {
            const savedTheme = localStorage.getItem('theme');
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            UI.applyTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));
            this.setupEventListeners();
            this.navigateTo('habits');
            if (Notification.permission !== 'granted') Notification.requestPermission();
        },
        setupEventListeners() {
            DOM.themeToggle.addEventListener('click', () => { const currentTheme = localStorage.getItem('theme') || 'light'; UI.applyTheme(currentTheme === 'light' ? 'dark' : 'light'); });
            DOM.navLinks.forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); this.navigateTo(link.dataset.page); }); });
            DOM.mainContent.addEventListener('click', (e) => {
                const target = e.target;
                if (target.closest("#add-habit-btn")) this.onAddHabit();
                if (target.closest(".weekday-btn")) this.onToggleHabitCompletion(target.closest(".weekday-btn"));
                if (target.closest(".delete-btn")) this.onDeleteHabit(target.closest(".delete-btn").dataset.id);
                if (target.closest("#prev-month")) this.onChangeMonth(-1);
                if (target.closest("#next-month")) this.onChangeMonth(1);
                if (target.closest("#add-dream-btn")) this.onAddDream();
                // NOVO LISTENER PARA DELETAR SONHOS
                if (target.closest(".delete-dream-btn")) this.onDeleteDream(target.closest(".delete-dream-btn").dataset.id);
                if (target.closest("#pomodoro-start")) this.onTogglePomodoro();
                if (target.closest("#pomodoro-reset")) this.onResetPomodoro();
            });
            DOM.fab.addEventListener('click', () => { if (state.currentPage === 'habits') this.onAddHabit(); if (state.currentPage === 'dreams') this.onAddDream(); });
            DOM.modalContainer.addEventListener('click', (e) => { if (e.target.closest("#modal-cancel-btn")) UI.closeModal(); });
        },
        navigateTo(pageId) {
            if (state.pomodoro.isRunning && state.currentPage === 'pomodoro' && pageId !== 'pomodoro') this.onPausePomodoro();
            state.currentPage = pageId;
            Object.values(DOM.pages).forEach(p => p.classList.remove("active"));
            DOM.pages[pageId].classList.add("active");
            DOM.navLinks.forEach(link => { const isActive = link.dataset.page === pageId; link.classList.toggle("active", isActive); link.setAttribute("aria-current", isActive ? "page" : "false"); });
            UI.renderPageContent(pageId);
            const showFab = ["habits", "dreams"].includes(pageId);
            DOM.fab.style.display = showFab && window.innerWidth < 768 ? "flex" : "none";
        },
        onAddHabit() {
            UI.showModal({ title: 'Novo Hábito', contentHTML: `<input id="modal-input" type="text" placeholder="Ex: Ler 10 páginas" class="w-full bg-white dark:bg-gray-700 border p-2 rounded">` });
            document.getElementById("modal-save-btn").onclick = () => {
                const input = document.getElementById("modal-input");
                const name = input.value.trim();
                if (name) {
                    state.habits.push({ id: Date.now(), name: name, completions: {}, record: 0, color: habitColors[state.habits.length % habitColors.length] });
                    utils.saveData();
                    UI.renderHabitsList();
                    UI.showToast("Hábito adicionado!");
                    UI.closeModal();
                } else { input.focus(); }
            };
        },
        onToggleHabitCompletion(btn) {
            const habitId = parseInt(btn.closest(".weekday-container").dataset.id);
            const date = btn.dataset.date;
            const habit = state.habits.find(h => h.id === habitId);
            if (habit) {
                if (!habit.completions) habit.completions = {};
                habit.completions[date] = !habit.completions[date];
                utils.saveData();
                UI.renderHabitsList();
            }
        },
        onDeleteHabit(habitId) {
            const habit = state.habits.find(h => h.id === parseInt(habitId));
            if (habit) {
                UI.showModal({ title: 'Deletar Hábito', contentHTML: `<p>Tem certeza que quer deletar o hábito "${habit.name}"?</p>`, saveButtonText: 'Deletar' });
                document.getElementById("modal-save-btn").onclick = () => {
                    state.habits = state.habits.filter(h => h.id !== parseInt(habitId));
                    utils.saveData();
                    UI.renderHabitsList();
                    UI.showToast("Hábito removido.", true);
                    UI.closeModal();
                };
            }
        },
        onChangeMonth(direction) { state.calendar.currentDate.setMonth(state.calendar.currentDate.getMonth() + direction); UI.renderCalendarGrid(); },
        onAddDream() {
            UI.showModal({
                title: 'Novo Sonho',
                contentHTML: `<div class="space-y-4"><div><label for="dream-name-input" class="block text-sm font-medium text-stone-700 dark:text-stone-200 mb-1">Nome do Sonho</label><input id="dream-name-input" type="text" placeholder="Ex: Viajar para o Japão" class="w-full bg-white dark:bg-gray-700 border border-stone-300 dark:border-gray-600 text-stone-800 dark:text-stone-100 rounded-md p-2"></div><div><label for="dream-image-url-input" class="block text-sm font-medium text-stone-700 dark:text-stone-200 mb-1">URL da Imagem (opcional)</label><input id="dream-image-url-input" type="url" placeholder="Cole a URL de uma imagem da web" class="w-full bg-white dark:bg-gray-700 border border-stone-300 dark:border-gray-600 rounded-md p-2"><p class="text-xs text-stone-500 dark:text-stone-400 mt-1">Se deixar em branco, uma imagem padrão será usada.</p></div></div>`
            });
            document.getElementById("modal-save-btn").onclick = () => {
                const nameInput = document.getElementById("dream-name-input");
                const imageUrlInput = document.getElementById("dream-image-url-input");
                const name = nameInput.value.trim();
                const img = imageUrlInput.value.trim();
                if (name) {
                    state.dreams.push({ id: Date.now(), name: name, img: img });
                    utils.saveData();
                    UI.renderDreamsGrid();
                    UI.showToast("Sonho adicionado!");
                    UI.closeModal();
                } else { nameInput.focus(); }
            };
        },
        // NOVA FUNÇÃO: Lógica para deletar um sonho com confirmação.
        onDeleteDream(dreamId) {
            const dream = state.dreams.find(d => d.id === parseInt(dreamId));
            if (dream) {
                UI.showModal({
                    title: 'Deletar Sonho',
                    contentHTML: `<p>Tem certeza que deseja deletar o sonho "${dream.name}" do seu mural?</p>`,
                    saveButtonText: 'Deletar'
                });
                document.getElementById("modal-save-btn").onclick = () => {
                    state.dreams = state.dreams.filter(d => d.id !== parseInt(dreamId));
                    utils.saveData();
                    UI.renderDreamsGrid();
                    UI.showToast("Sonho removido.", true);
                    UI.closeModal();
                };
            }
        },
        onTogglePomodoro() { state.pomodoro.isRunning ? this.onPausePomodoro() : this.onStartPomodoro(); },
        onStartPomodoro() { if (!state.pomodoro.isRunning) { state.pomodoro.isRunning = true; state.pomodoro.timer = setInterval(() => { state.pomodoro.timeRemaining--; if (state.pomodoro.timeRemaining < 0) this.onSwitchPomodoroMode(); UI.updatePomodoroDisplay(); }, 1000); UI.updatePomodoroDisplay(); } },
        onPausePomodoro() { state.pomodoro.isRunning = false; clearInterval(state.pomodoro.timer); UI.updatePomodoroDisplay(); },
        onResetPomodoro() { this.onPausePomodoro(); state.pomodoro.mode = "focus"; state.pomodoro.timeRemaining = state.pomodoro.focusTime; UI.updatePomodoroDisplay(); },
        onSwitchPomodoroMode() { this.onPausePomodoro(); const p = state.pomodoro; p.mode = p.mode === "focus" ? "break" : "focus"; p.timeRemaining = p.mode === "focus" ? p.focusTime : p.breakTime; new Notification(p.mode === "focus" ? "Hora de focar!" : "Hora de descansar!"); this.onStartPomodoro(); },
    };

    App.init();
});

