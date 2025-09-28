document.addEventListener('DOMContentLoaded', () => {

    // =======================================================================
    // 1. ESTADO DA APLICAÇÃO (O "CÉREBRO")
    // =======================================================================
    const state = {
        currentPage: 'habits',
        editingHabitId: null,
        editingDreamId: null,
        habits: JSON.parse(localStorage.getItem('constancia_habits')) || [],
        dreams: JSON.parse(localStorage.getItem('constancia_dreams')) || [],
        pomodoro: {
            timer: null,
            mode: 'focus',
            isRunning: false,
            focusTime: JSON.parse(localStorage.getItem('constancia_pomodoro'))?.focusTime || 25,
            breakTime: JSON.parse(localStorage.getItem('constancia_pomodoro'))?.breakTime || 5,
            timeRemaining: (JSON.parse(localStorage.getItem('constancia_pomodoro'))?.focusTime || 25) * 60,
        },
        calendar: {
            currentDate: new Date(),
        },
        bible: {
            verseOfTheDay: JSON.parse(localStorage.getItem('constancia_bible'))?.verseOfTheDay || {
                reference: "João 3:16",
                text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna."
            }
        },
        dreamRotator: null
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
            bible: document.getElementById('page-bible'),
        },
        fab: document.getElementById('fab'),
        themeToggle: document.getElementById('theme-toggle'),
        themeIcon: document.getElementById('theme-icon'),
        modalContainer: document.getElementById('modal-container'),
        toastContainer: document.getElementById('toast-container'),
    };

    // =======================================================================
    // 3. FUNÇÕES DE UTILIDADE
    // =======================================================================
    const utils = {
        getFormattedDate: (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },
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
            let dateKey = utils.getFormattedDate(currentDate);

            if (!completions[dateKey]) {
                currentDate.setDate(currentDate.getDate() - 1);
                dateKey = utils.getFormattedDate(currentDate);
            }

            while (completions[dateKey]) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
                dateKey = utils.getFormattedDate(currentDate);
            }
            return streak;
        },
        saveData: () => {
            localStorage.setItem('constancia_habits', JSON.stringify(state.habits));
            localStorage.setItem('constancia_dreams', JSON.stringify(state.dreams));
            localStorage.setItem('constancia_pomodoro', JSON.stringify({ focusTime: state.pomodoro.focusTime, breakTime: state.pomodoro.breakTime }));
            localStorage.setItem('constancia_bible', JSON.stringify({ verseOfTheDay: state.bible.verseOfTheDay }));
        },
        readFileAsDataURL: (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
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
                case 'bible': this.renderBiblePage(pageContainer); break;
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
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normaliza a data de hoje para comparação

            state.habits.forEach(habit => {
                const card = document.createElement('div');
                card.className = 'habit-card bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between transition border-l-4';
                card.style.borderColor = habit.color;

                const currentStreak = utils.calculateStreak(habit.completions);
                
                let weekDayButtons = '';
                for (let i = 0; i < 7; i++) {
                    const dayDate = new Date(startOfWeek);
                    dayDate.setDate(startOfWeek.getDate() + i);
                    dayDate.setHours(0, 0, 0, 0); // Normaliza a data do botão

                    const isDisabled = dayDate > today; // Verifica se é um dia no futuro

                    const dateStr = utils.getFormattedDate(dayDate);
                    const isCompleted = habit.completions && habit.completions[dateStr];

                    weekDayButtons += `<button data-date="${dateStr}" class="weekday-btn ${isCompleted ? 'completed' : 'bg-stone-200 dark:bg-gray-700 text-stone-600 dark:text-stone-300'}" ${isDisabled ? 'disabled' : ''}>${weekDays[i]}</button>`;
                }

                card.innerHTML = `<div class="flex-grow w-full"><p class="font-semibold">${habit.name}</p><div class="flex items-center space-x-1 sm:space-x-2 mt-2 weekday-container" data-id="${habit.id}">${weekDayButtons}</div></div><div class="flex items-center space-x-3 mt-3 sm:mt-0 w-full sm:w-auto justify-end"><div class="text-right"><p class="text-sm text-stone-500 dark:text-stone-400">Ofensiva: <span class="font-bold">${currentStreak} dias 🔥</span></p><p class="text-xs text-stone-400 dark:text-stone-500">Recorde: ${habit.record || 0} 🏆</p></div><button data-id="${habit.id}" class="edit-btn text-stone-500 hover:text-orange-600 dark:hover:text-orange-400 p-2" aria-label="Editar Hábito">✏️</button><button data-id="${habit.id}" class="delete-btn text-stone-500 hover:text-red-600 dark:hover:text-red-400 p-2" aria-label="Deletar Hábito">🗑️</button></div>`;
                listContainer.appendChild(card);
            });
        },

        renderCalendarPage(container) {
            container.innerHTML = `
            <h2 class="text-3xl font-bold mb-6">Calendário e Progresso</h2>
            <div class="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm">
                <div class="flex justify-between items-center mb-4">
                    <button id="prev-month" class="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-gray-700">&lt;</button>
                    <div class="flex items-center space-x-2">
                        <select id="month-select" class="bg-white dark:bg-gray-700 border border-stone-300 dark:border-gray-600 rounded-md p-2 font-semibold"></select>
                        <select id="year-select" class="bg-white dark:bg-gray-700 border border-stone-300 dark:border-gray-600 rounded-md p-2 font-semibold"></select>
                    </div>
                    <button id="next-month" class="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-gray-700">&gt;</button>
                </div>
                <div id="calendar-grid" class="grid grid-cols-7 gap-1 text-center text-sm md:text-base"></div>
            </div>
            <div id="calendar-stats" class="mt-6 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm"></div>`;

            const monthSelect = document.getElementById('month-select');
            const yearSelect = document.getElementById('year-select');
            const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            months.forEach((month, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = month;
                monthSelect.appendChild(option);
            });

            const currentYear = new Date().getFullYear();
            for (let i = currentYear - 10; i <= currentYear + 10; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                yearSelect.appendChild(option);
            }
            
            this.renderCalendarGrid();
        },

        renderCalendarGrid() {
            const { currentDate } = state.calendar;
            document.getElementById('month-select').value = currentDate.getMonth();
            document.getElementById('year-select').value = currentDate.getFullYear();
            
            const calendarGrid = document.getElementById('calendar-grid');
            calendarGrid.innerHTML = '';
            
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
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
            let statsHTML = `<h4 class="text-lg font-semibold mb-4">Estatísticas de Hábitos</h4><div class="space-y-2">`;
            state.habits.forEach(habit => {
                let monthCount = 0;
                let yearCount = 0;
                if (habit.completions) {
                    for (const dateStr in habit.completions) {
                        if (habit.completions[dateStr]) {
                            const date = new Date(dateStr + "T00:00:00"); 
                            if (date.getFullYear() === year) {
                                yearCount++;
                                if (date.getMonth() === month) monthCount++;
                            }
                        }
                    }
                }
                statsHTML += `<div class="flex items-center justify-between text-sm"><div class="flex items-center"><span class="w-3 h-3 rounded-full mr-2" style="background-color: ${habit.color};"></span><span class="font-medium text-stone-600 dark:text-stone-300">${habit.name}</span></div><span class="font-semibold">${monthCount} no mês / ${yearCount} no ano</span></div>`;
            });
            statsHTML += `</div>`;
            calendarStatsEl.innerHTML = statsHTML;
        },

        renderDreamsPage(container) {
            container.innerHTML = `<header class="flex justify-between items-center mb-6"><div><h2 class="text-3xl font-bold">Mural dos Sonhos</h2><p class="text-stone-500 dark:text-stone-400">Seus hábitos constroem seus sonhos.</p></div><button id="add-dream-btn" class="bg-orange-700 hover:bg-orange-800 dark:bg-orange-600 dark:hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition hidden md:block">+ Novo Sonho</button></header><div id="dreams-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"></div>`;
            this.renderDreamsGrid();
        },

        renderDreamsGrid() {
            const dreamsGrid = document.getElementById('dreams-grid');
            if (!dreamsGrid) return;
            dreamsGrid.innerHTML = state.dreams.length > 0 ? '' : '<p class="text-stone-500 dark:text-stone-400 text-center mt-8 col-span-full">Adicione o seu primeiro sonho!</p>';
            
            state.dreams.forEach(dream => {
                const card = document.createElement('div');
                card.className = 'relative bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden flex flex-col aspect-square';
                
                let imageOrPlaceholder;
                if (dream.img) {
                    imageOrPlaceholder = `<img src="${dream.img}" alt="${dream.name}" class="w-full h-full object-cover">`;
                } else {
                    imageOrPlaceholder = `<div class="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-orange-200 to-amber-300 dark:from-orange-800 dark:to-amber-700"><p class="font-bold text-center text-orange-800 dark:text-orange-200">${dream.name}</p></div>`;
                }

                card.innerHTML = `
                    ${imageOrPlaceholder}
                    <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
                        <p class="font-semibold text-white text-sm truncate">${dream.name}</p>
                    </div>
                    <div class="absolute top-2 right-2 flex space-x-1">
                        <button data-id="${dream.id}" class="edit-dream-btn bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-600 transition" aria-label="Editar Sonho">✏️</button>
                        <button data-id="${dream.id}" class="delete-dream-btn bg-black bg-opacity-50 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition" aria-label="Deletar Sonho"><span class="text-sm font-bold">×</span></button>
                    </div>
                `;
                dreamsGrid.appendChild(card);
            });
        },
        
        renderPomodoroPage(container) {
            container.innerHTML = `<div class="flex flex-col items-center justify-center h-full"><div class="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg w-full max-w-sm relative"><button id="pomodoro-settings-btn" class="absolute top-4 right-4 text-2xl text-stone-500 hover:text-orange-600 dark:text-stone-400 dark:hover:text-orange-400">⚙️</button><div id="pomodoro-mode-display" class="text-2xl font-semibold text-orange-800 dark:text-orange-400 mb-4 h-8">Foco</div><div class="w-64 h-64 border-8 border-stone-200 dark:border-gray-700 rounded-full flex items-center justify-center mb-8 mx-auto"><span id="pomodoro-time" class="text-6xl font-bold"></span></div><div class="flex space-x-4"><button id="pomodoro-start" class="flex-grow bg-orange-700 hover:bg-orange-800 dark:bg-orange-600 dark:hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition">Iniciar</button><button id="pomodoro-reset" class="bg-stone-200 dark:bg-gray-700 text-stone-700 dark:text-stone-200 font-bold py-3 px-4 rounded-lg shadow-md hover:bg-stone-300 dark:hover:bg-gray-600 transition">Resetar</button></div></div><div id="pomodoro-extra-display" class="mt-8 text-center w-full max-w-md h-24"><div id="verse-display" class="text-sm italic text-stone-600 dark:text-stone-400"></div><div id="dream-display" class="text-lg font-bold text-orange-800 dark:text-orange-400 h-8 mt-2"></div></div></div>`;
            this.updatePomodoroDisplay();
            this.updatePomodoroExtraDisplay();
        },
        
        updatePomodoroDisplay() {
            const timeEl = document.getElementById('pomodoro-time');
            if (!timeEl) return;
            const { timeRemaining, isRunning } = state.pomodoro;
            const focusTimeInSeconds = state.pomodoro.focusTime * 60;
            const minutes = String(Math.floor(timeRemaining / 60)).padStart(2, '0');
            const seconds = String(timeRemaining % 60).padStart(2, '0');
            timeEl.textContent = `${minutes}:${seconds}`;
            
            const modeDisplay = document.getElementById('pomodoro-mode-display');
            modeDisplay.textContent = state.pomodoro.mode === 'focus' ? 'Foco' : 'Descanso';
            
            const startBtn = document.getElementById('pomodoro-start');
            if (isRunning) startBtn.textContent = 'Pausar';
            else if (timeRemaining < focusTimeInSeconds && timeRemaining > 0) startBtn.textContent = 'Continuar';
            else startBtn.textContent = 'Iniciar';
        },

        updatePomodoroExtraDisplay() {
            const verseDisplay = document.getElementById('verse-display');
            if(verseDisplay && state.bible.verseOfTheDay) {
                verseDisplay.innerHTML = `<strong>${state.bible.verseOfTheDay.reference}:</strong> "${state.bible.verseOfTheDay.text}"`;
            }
        },

        renderBiblePage(container) {
            container.innerHTML = `<div class="max-w-xl mx-auto"><h2 class="text-3xl font-bold mb-2">Bíblia</h2><p class="text-stone-500 dark:text-stone-400 mb-6">Busque um versículo e defina-o como sua inspiração do dia.</p><div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm"><div class="flex space-x-2"><input id="verse-input" type="text" placeholder="Ex: João 3:16" class="flex-grow w-full bg-stone-100 dark:bg-gray-700 border border-stone-300 dark:border-gray-600 rounded-md p-2"><button id="fetch-verse-btn" class="bg-orange-700 text-white px-5 py-2 rounded-md font-semibold">Buscar</button></div><div id="verse-result-container" class="mt-6 min-h-[100px] p-4 bg-stone-50 dark:bg-gray-900 rounded-md"></div></div></div>`;
        },

        showModal({ title, contentHTML, saveButtonText = 'Salvar', showSaveButton = true }) {
            const modalHTML = `<div id="active-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"><div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm p-6 transform transition-all" style="animation: fadeIn 0.2s ease-out;"><h2 class="text-xl font-bold mb-4 text-stone-800 dark:text-stone-100">${title}</h2><div id="modal-content-body">${contentHTML}</div><div class="flex justify-end space-x-2 mt-6"><button id="modal-cancel-btn" class="bg-stone-200 dark:bg-gray-600 text-stone-800 dark:text-stone-100 font-semibold px-4 py-2 rounded-md">Fechar</button>${showSaveButton ? `<button id="modal-save-btn" class="bg-orange-700 text-white font-semibold px-4 py-2 rounded-md">${saveButtonText}</button>` : ''}</div></div></div>`;
            DOM.modalContainer.innerHTML = modalHTML;
        },

        closeModal() {
            DOM.modalContainer.innerHTML = '';
        },
        
        showToast(message, isError = false) {
            const toast = document.createElement('div');
            toast.className = `toast ${isError ? 'bg-red-600' : 'bg-green-600'} text-white font-bold py-2 px-4 rounded-lg shadow-lg`;
            toast.style.animation = 'toastInRight 0.5s, toastOutRight 0.5s 2.5s';
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
    // 5. CONTROLADOR PRINCIPAL DA APLICAÇÃO
    // =======================================================================
    const App = {
        init() {
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/service-worker.js')
                        .then(reg => console.log('Service Worker registrado com sucesso.'))
                        .catch(err => console.log('Falha ao registrar Service Worker:', err));
                });
            }

            const savedTheme = localStorage.getItem('theme');
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            UI.applyTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));
            
            this.setupEventListeners();
            this.navigateTo('habits');
            if (Notification.permission !== 'granted') Notification.requestPermission();
        },

        setupEventListeners() {
            DOM.themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
                UI.applyTheme(currentTheme === 'light' ? 'dark' : 'light');
            });
            
            DOM.navLinks.forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); this.navigateTo(link.dataset.page); }); });
            
            DOM.mainContent.addEventListener('click', (e) => {
                const button = e.target.closest('button');
                if (button) {
                    if (button.id === "add-habit-btn") this.onAddHabit();
                    if (button.classList.contains("weekday-btn")) this.onToggleHabitCompletion(button);
                    if (button.classList.contains("delete-btn")) this.onDeleteHabit(button.dataset.id);
                    if (button.id === "prev-month") this.onChangeMonth(-1);
                    if (button.id === "next-month") this.onChangeMonth(1);
                    if (button.id === "add-dream-btn") this.onAddDream();
                    if (button.classList.contains("edit-dream-btn")) this.onEditDream(button.dataset.id);
                    if (button.classList.contains("delete-dream-btn")) this.onDeleteDream(button.dataset.id);
                    if (button.id === "pomodoro-start") this.onTogglePomodoro();
                    if (button.id === "pomodoro-reset") this.onResetPomodoro();
                    if (button.id === "pomodoro-settings-btn") this.onPomodoroSettings();
                    if (button.id === "fetch-verse-btn") this.onFetchVerse();
                    if (button.id === "set-verse-btn") this.onSetVerseOfTheDay(button);
                }

                const select = e.target.closest('select');
                if (select && (select.id === 'month-select' || select.id === 'year-select')) {
                    this.onChangeMonthYear();
                }
            });
            
            DOM.fab.addEventListener('click', () => {
                if (state.currentPage === 'habits') this.onAddHabit();
                if (state.currentPage === 'dreams') this.onAddDream();
            });

            DOM.modalContainer.addEventListener('click', (e) => {
                if (e.target.id === "modal-cancel-btn" || e.target.id === "active-modal") {
                    UI.closeModal();
                }
            });
        },

        navigateTo(pageId) {
            if (state.pomodoro.isRunning) this.onPausePomodoro();
            if (state.dreamRotator) { clearInterval(state.dreamRotator); state.dreamRotator = null; }

            state.currentPage = pageId;
            Object.values(DOM.pages).forEach(p => p.classList.remove("active"));
            DOM.pages[pageId].classList.add("active");
            DOM.navLinks.forEach(link => link.classList.toggle("active", link.dataset.page === pageId));
            
            UI.renderPageContent(pageId);

            if (pageId === 'pomodoro' && state.dreams.length > 0) this.startDreamRotator();
            
            const showFab = ["habits", "dreams"].includes(pageId);
            DOM.fab.style.display = showFab && window.innerWidth < 768 ? "flex" : "none";
        },

        onAddHabit() {
            UI.showModal({ title: 'Novo Hábito', contentHTML: `<input id="modal-input" type="text" placeholder="Ex: Ler 10 páginas" class="w-full bg-stone-100 dark:bg-gray-700 border border-stone-300 dark:border-gray-600 p-2 rounded">` });
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

                const currentStreak = utils.calculateStreak(habit.completions);
                habit.record = Math.max(habit.record || 0, currentStreak);

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
        
        onChangeMonth(direction) {
            state.calendar.currentDate.setMonth(state.calendar.currentDate.getMonth() + direction);
            UI.renderCalendarGrid();
        },

        onChangeMonthYear() {
            const month = document.getElementById('month-select').value;
            const year = document.getElementById('year-select').value;
            state.calendar.currentDate = new Date(year, month, 1);
            UI.renderCalendarGrid();
        },

        onAddDream() {
            UI.showModal({
                title: 'Novo Sonho',
                contentHTML: `
                <div class="space-y-4">
                    <div>
                        <label for="dream-name-input" class="block text-sm font-medium mb-1">Nome do Sonho</label>
                        <input id="dream-name-input" type="text" placeholder="Ex: Viajar para o Japão" class="w-full bg-stone-100 dark:bg-gray-700 border border-stone-300 dark:border-gray-600 rounded-md p-2">
                    </div>
                    <div>
                        <label for="dream-image-input" class="block text-sm font-medium mb-1">Imagem</label>
                        <input id="dream-image-input" type="file" accept="image/*" class="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:file:bg-orange-900/50 dark:file:text-orange-300 dark:hover:file:bg-orange-900">
                        <p class="text-xs text-stone-500 dark:text-stone-400 mt-1">Imagens são salvas no seu navegador. Evite arquivos muito grandes.</p>
                    </div>
                </div>`
            });

            document.getElementById("modal-save-btn").onclick = async () => {
                const nameInput = document.getElementById("dream-name-input");
                const imageInput = document.getElementById("dream-image-input");
                const name = nameInput.value.trim();
                const file = imageInput.files[0];
                
                if (!name) { nameInput.focus(); return; }

                let imgDataUrl = null;
                if (file) {
                    try {
                        imgDataUrl = await utils.readFileAsDataURL(file);
                    } catch (error) {
                        UI.showToast("Erro ao carregar imagem.", true);
                        return;
                    }
                }

                state.dreams.push({ id: Date.now(), name: name, img: imgDataUrl });
                utils.saveData();
                UI.renderDreamsGrid();
                UI.showToast("Sonho adicionado!");
                UI.closeModal();
            };
        },

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
        
        onEditDream(dreamId) {
            const dream = state.dreams.find(d => d.id === parseInt(dreamId));
            if (!dream) return;

            state.editingDreamId = dream.id;
            UI.showModal({
                title: 'Editar Sonho',
                contentHTML: `
                <div class="space-y-4">
                    <div>
                        <label for="dream-name-input" class="block text-sm font-medium mb-1">Nome do Sonho</label>
                        <input id="dream-name-input" type="text" value="${dream.name}" class="w-full bg-stone-100 dark:bg-gray-700 border border-stone-300 dark:border-gray-600 rounded-md p-2">
                    </div>
                    <div>
                        <label for="dream-image-input" class="block text-sm font-medium mb-1">Nova Imagem (opcional)</label>
                        <input id="dream-image-input" type="file" accept="image/*" class="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 dark:file:bg-orange-900/50 dark:file:text-orange-300 dark:hover:file:bg-orange-900">
                        <p class="text-xs text-stone-500 dark:text-stone-400 mt-1">Escolha uma nova imagem para substituir a atual.</p>
                    </div>
                </div>`
            });

            document.getElementById("modal-save-btn").onclick = async () => {
                const nameInput = document.getElementById("dream-name-input");
                const imageInput = document.getElementById("dream-image-input");
                const newName = nameInput.value.trim();
                const newFile = imageInput.files[0];

                if (!newName) { nameInput.focus(); return; }

                const dreamIndex = state.dreams.findIndex(d => d.id === state.editingDreamId);
                if (dreamIndex === -1) return;

                state.dreams[dreamIndex].name = newName;

                if (newFile) {
                    try {
                        state.dreams[dreamIndex].img = await utils.readFileAsDataURL(newFile);
                    } catch (error) {
                        UI.showToast("Erro ao carregar nova imagem.", true);
                        return;
                    }
                }

                utils.saveData();
                UI.renderDreamsGrid();
                UI.showToast("Sonho atualizado!");
                UI.closeModal();
                state.editingDreamId = null;
            };
        },

        onTogglePomodoro() { state.pomodoro.isRunning ? this.onPausePomodoro() : this.onStartPomodoro(); },
        onStartPomodoro() {
            if (state.pomodoro.isRunning) return;
            state.pomodoro.isRunning = true;
            state.pomodoro.timer = setInterval(() => {
                state.pomodoro.timeRemaining--;
                if (state.pomodoro.timeRemaining < 0) {
                    this.onSwitchPomodoroMode();
                }
                UI.updatePomodoroDisplay();
            }, 1000);
            UI.updatePomodoroDisplay();
        },
        onPausePomodoro() {
            state.pomodoro.isRunning = false;
            clearInterval(state.pomodoro.timer);
            UI.updatePomodoroDisplay();
        },
        onResetPomodoro() {
            this.onPausePomodoro();
            state.pomodoro.mode = "focus";
            state.pomodoro.timeRemaining = state.pomodoro.focusTime * 60;
            UI.updatePomodoroDisplay();
        },
        onSwitchPomodoroMode() {
            this.onPausePomodoro();
            const p = state.pomodoro;
            p.mode = p.mode === "focus" ? "break" : "focus";
            p.timeRemaining = p.mode === "focus" ? p.focusTime * 60 : p.breakTime * 60;
            
            new Notification(p.mode === "focus" ? "Hora de focar!" : "Hora de descansar!");
            this.onStartPomodoro();
        },

        onPomodoroSettings() {
            UI.showModal({
                title: 'Configurar Pomodoro',
                contentHTML: `
                <div class="space-y-4">
                    <div>
                        <label for="focus-time-input" class="block text-sm font-medium mb-1">Tempo de Foco (minutos)</label>
                        <input id="focus-time-input" type="number" value="${state.pomodoro.focusTime}" class="w-full bg-stone-100 dark:bg-gray-700 border border-stone-300 dark:border-gray-600 rounded-md p-2">
                    </div>
                    <div>
                        <label for="break-time-input" class="block text-sm font-medium mb-1">Tempo de Descanso (minutos)</label>
                        <input id="break-time-input" type="number" value="${state.pomodoro.breakTime}" class="w-full bg-stone-100 dark:bg-gray-700 border border-stone-300 dark:border-gray-600 rounded-md p-2">
                    </div>
                </div>`
            });
            document.getElementById("modal-save-btn").onclick = () => {
                const focusTime = parseInt(document.getElementById('focus-time-input').value);
                const breakTime = parseInt(document.getElementById('break-time-input').value);
                if (focusTime > 0 && breakTime > 0) {
                    state.pomodoro.focusTime = focusTime;
                    state.pomodoro.breakTime = breakTime;
                    this.onResetPomodoro(); 
                    utils.saveData();
                    UI.showToast("Configurações salvas!");
                    UI.closeModal();
                } else {
                    UI.showToast("Por favor, insira valores válidos.", true);
                }
            };
        },

        async onFetchVerse() {
            const input = document.getElementById('verse-input');
            const container = document.getElementById('verse-result-container');
            const reference = input.value.trim();
            if (!reference) return;

            container.innerHTML = '<div class="loader mx-auto"></div>';
            try {
                const response = await fetch(`https://bible-api.com/${reference}?translation=almeida`);
                if (!response.ok) throw new Error('Versículo não encontrado.');
                
                const data = await response.json();
                container.innerHTML = `
                    <p class="font-semibold text-lg text-orange-800 dark:text-orange-400">${data.reference}</p>
                    <p class="mt-2 text-stone-600 dark:text-stone-300"><em>"${data.text}"</em></p>
                    <button id="set-verse-btn" data-reference='${data.reference}' data-text='${data.text}' class="mt-4 bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 font-bold py-2 px-4 rounded-lg w-full">Definir como Versículo do Dia</button>
                `;
            } catch (error) {
                container.innerHTML = `<p class="text-red-500">${error.message}</p>`;
            }
        },

        onSetVerseOfTheDay(button) {
            state.bible.verseOfTheDay = {
                reference: button.dataset.reference,
                text: button.dataset.text
            };
            utils.saveData();
            UI.showToast("Versículo do dia atualizado!");
        },

        startDreamRotator() {
            const dreamDisplay = document.getElementById('dream-display');
            if (!dreamDisplay || state.dreams.length === 0) return;
            
            let dreamIndex = 0;
            const updateDreamText = () => {
                dreamDisplay.classList.remove('dream-text-fade');
                void dreamDisplay.offsetWidth;
                dreamDisplay.classList.add('dream-text-fade');
                dreamDisplay.textContent = `Sonho: ${state.dreams[dreamIndex].name}`;
                dreamIndex = (dreamIndex + 1) % state.dreams.length;
            };

            updateDreamText();
            state.dreamRotator = setInterval(updateDreamText, 5000);
        },
    };

    App.init();
});
