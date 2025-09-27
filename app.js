document.addEventListener('DOMContentLoaded', () => {

    // =======================================================================
    // 1. ESTADO DA APLICAÇÃO (O "CÉREBRO")
    // =======================================================================
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
                    for (
