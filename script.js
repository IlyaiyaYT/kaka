const DEFAULT_ADMIN = {
    username: "IlyaiyaYT",
    passwordHash: btoa("!81Ologit"), // Простой хэш Base64 согласно ТЗ
    role: "admin",
    avatar: ""
};

const INITIAL_DATA = [
    {
        id: "1001",
        title: "Оптимизация Java-плагинов в 2026",
        type: "article",
        short: "Гайд по сокращению нагрузки на Garbage Collector и работе с асинхронными ивентами.",
        body: "Оптимизация плагинов требует понимания распределения памяти.\n\nИспользуйте асинхронные задачи (Scheduler) для тяжелых операций чтения/записи баз данных (например, SQLite).\nИзбегайте вызова ресурсоемких методов внутри событий PlayerMoveEvent. Кэшируйте данные сессий игроков при входе (PlayerJoinEvent) и очищайте их при выходе.",
        tags: ["java", "spigot", "оптимизация"],
        author: "IlyaiyaYT",
        date: "28.05.2026"
    },
    {
        id: "1002",
        title: "PvpElo Система Рекордов",
        type: "plugin",
        short: "Мощный плагин для распределения ELO рейтинга игроков на основе математического ожидания.",
        body: "Плагин автоматически рассчитывает рейтинг игроков после аренных сражений.\n\nОсновные команды:\n/elo - Просмотр личной статистики\n/pvpelo reload - Перезагрузка конфигурации (Только для Admin)\n/elotop - Топ-10 игроков сервера.\n\nИнтегрируется с базами данных SQLite и MySQL.",
        tags: ["pvp", "elo", "system"],
        author: "Система",
        date: "25.05.2026"
    },
    {
        id: "1003",
        title: "какая-то статья",
        type: "plugin",
        short: "какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья",
        body: "какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья какая-то статья",
        tags: ["статья", "какая-то"],
        author: "Система1",
        date: "20.05.2026"
    }
];

// Инициализация хранилища
if (!localStorage.getItem("wv_users")) {
    localStorage.setItem("wv_users", JSON.stringify([DEFAULT_ADMIN]));
}
if (!localStorage.getItem("wv_content")) {
    localStorage.setItem("wv_content", JSON.stringify(INITIAL_DATA));
}

// Глобальное состояние сессии
let currentUser = JSON.parse(localStorage.getItem("wv_session")) || null;
let currentFilter = "all";
let searchQuery = "";

// DOM Элементы
const splashScreen = document.getElementById("splash-screen");
const appContainer = document.querySelector(".app-container");
const cardsGrid = document.getElementById("cards-grid");
const searchInput = document.getElementById("search-input");
const profileWidget = document.getElementById("profile-widget");
const btnAuthTrigger = document.getElementById("btn-auth-trigger");
const btnCreateContent = document.getElementById("btn-create-content");

// Модалки
const authModal = document.getElementById("auth-modal");
const editorModal = document.getElementById("editor-modal");
const viewerModal = document.getElementById("viewer-modal");

// Обработчики инициализации приложения
document.addEventListener("DOMContentLoaded", () => {
    // 3 секунды Сплэш-скрин
    setTimeout(() => {
        splashScreen.style.opacity = "0";
        splashScreen.style.transform = "scale(1.1)";
        setTimeout(() => {
            splashScreen.classList.add("hidden");
            appContainer.classList.remove("hidden");
            updateUIState();
            renderContent();
        }, 500);
    }, 3000);

    setupEventListeners();
    setupCustomDropdown();
});

// Настройка прослушивания событий UI
function setupEventListeners() {
    // Вкладки фильтрации в Сидбаре
    document.querySelectorAll(".menu-item").forEach(item => {
        item.addEventListener("click", (e) => {
            document.querySelectorAll(".menu-item").forEach(b => b.classList.remove("active"));
            const target = e.currentTarget;
            target.classList.add("active");
            currentFilter = target.getAttribute("data-filter");
            renderContent();
        });
    });

    // Живой поиск
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderContent();
    });

    // Управление Аутентификацией / Модалка
    btnAuthTrigger.addEventListener("click", () => {
        if (currentUser) {
            // Действие Logout
            currentUser = null;
            localStorage.removeItem("wv_session");
            showToast("Вы вышли из аккаунта", "info");
            updateUIState();
            renderContent();
        } else {
            openModal(authModal);
        }
    });

    document.getElementById("close-auth").addEventListener("click", () => closeModal(authModal));
    
    // Переключение Табов Вход / Регистрация
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const formLogin = document.getElementById("form-login");
    const formRegister = document.getElementById("form-register");

    tabLogin.addEventListener("click", () => {
        tabLogin.classList.add("active"); tabRegister.classList.remove("active");
        formLogin.classList.remove("hidden"); formRegister.classList.add("hidden");
    });
    tabRegister.addEventListener("click", () => {
        tabRegister.classList.add("active"); tabLogin.classList.remove("active");
        formRegister.classList.remove("hidden"); formLogin.classList.add("hidden");
    });

    // Сабмиты Форм Авторизации
    formLogin.addEventListener("submit", handleLogin);
    formRegister.addEventListener("submit", handleRegister);

    // Управление созданием контента
    btnCreateContent.addEventListener("click", () => {
        document.getElementById("form-editor").reset();
        document.getElementById("edit-id").value = "";
        document.getElementById("editor-title").innerText = "Создать публикацию";
        document.getElementById("btn-editor-submit").innerText = "Опубликовать";
        // Сброс кастомного селекта на дефолт
        setCustomDropdownValue("article");
        openModal(editorModal);
    });
    document.getElementById("close-editor").addEventListener("click", () => closeModal(editorModal));
    document.getElementById("form-editor").addEventListener("submit", handleSaveContent);

    // Закрытие просмотрщика полноэкранного режима
    document.getElementById("close-viewer").addEventListener("click", () => {
        viewerModal.classList.remove("open");
    });
}

// Кастомный Dropdown Логика
function setupCustomDropdown() {
    const dropdown = document.getElementById("content-type-dropdown");
    const selected = dropdown.querySelector(".dropdown-selected");
    const options = dropdown.querySelector(".dropdown-options");

    selected.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("open");
    });

    dropdown.querySelectorAll(".dropdown-option").forEach(opt => {
        opt.addEventListener("click", (e) => {
            const val = opt.getAttribute("data-value");
            setCustomDropdownValue(val);
            dropdown.classList.remove("open");
        });
    });

    document.addEventListener("click", () => dropdown.classList.remove("open"));
}

function setCustomDropdownValue(value) {
    const dropdown = document.getElementById("content-type-dropdown");
    const selectedSpan = dropdown.querySelector(".dropdown-selected span");
    const selectedIcon = dropdown.querySelector(".dropdown-selected i");
    const selectedDiv = dropdown.querySelector(".dropdown-selected");
    
    dropdown.querySelectorAll(".dropdown-option").forEach(o => o.classList.remove("selected"));
    const activeOpt = dropdown.querySelector(`.dropdown-option[data-value="${value}"]`);
    activeOpt.classList.add("selected");
    
    selectedDiv.setAttribute("data-value", value);
    selectedSpan.innerText = activeOpt.innerText;
    selectedIcon.className = activeOpt.querySelector("i").className;
}

// Вспомогательные функции окон
function openModal(modal) { modal.classList.add("open"); }
function closeModal(modal) { modal.classList.remove("open"); }

// Toast Уведомления
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = "fa-circle-check";
    if (type === "error") icon = "fa-circle-xmark";
    if (type === "info") icon = "fa-circle-info";

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 50);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Обработка логина
function handleLogin(e) {
    e.preventDefault();
    const userInp = document.getElementById("login-username").value.trim();
    const passInp = document.getElementById("login-password").value;
    
    const users = JSON.parse(localStorage.getItem("wv_users"));
    const hash = btoa(passInp);

    const targetUser = users.find(u => u.username.toLowerCase() === userInp.toLowerCase() && u.passwordHash === hash);

    if (targetUser) {
        currentUser = { username: targetUser.username, role: targetUser.role, avatar: targetUser.avatar || "" };
        localStorage.setItem("wv_session", JSON.stringify(currentUser));
        showToast(`Добро пожаловать, ${currentUser.username}!`);
        closeModal(authModal);
        updateUIState();
        renderContent();
        document.getElementById("form-login").reset();
    } else {
        showToast("Неверное имя пользователя или пароль", "error");
    }
}

// Обработка регистрации
function handleRegister(e) {
    e.preventDefault();
    const userInp = document.getElementById("reg-username").value.trim();
    const passInp = document.getElementById("reg-password").value;

    if (userInp.toLowerCase() === "ilyaiyayt") {
        showToast("Этот логин зарезервирован системой", "error");
        return;
    }

    const users = JSON.parse(localStorage.getItem("wv_users"));
    if (users.some(u => u.username.toLowerCase() === userInp.toLowerCase())) {
        showToast("Пользователь с таким именем уже существует", "error");
        return;
    }

    const newUser = {
        username: userInp,
        passwordHash: btoa(passInp),
        role: "user",
        avatar: ""
    };

    users.push(newUser);
    localStorage.setItem("wv_users", JSON.stringify(users));
    
    // Автоматический вход после создания
    currentUser = { username: newUser.username, role: newUser.role, avatar: "" };
    localStorage.setItem("wv_session", JSON.stringify(currentUser));
    
    showToast("Аккаунт успешно создан!");
    closeModal(authModal);
    updateUIState();
    renderContent();
    document.getElementById("form-register").reset();
}

// Обновление элементов интерфейса в зависимости от роли сессии
function updateUIState() {
    if (currentUser) {
        // Меняем кнопку входа на Логаут
        btnAuthTrigger.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> <span>Выйти</span>`;
        btnAuthTrigger.className = "btn btn-secondary";
        
        // Показываем защищенные элементы
        document.querySelectorAll(".auth-required").forEach(el => el.classList.remove("hidden"));

        // Рендер виджета профиля
        const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.username}`;
        const currentAvatarSrc = currentUser.avatar || defaultAvatar;

        profileWidget.innerHTML = `
            <div class="avatar-container" onclick="triggerAvatarUpload()">
                <img src="${currentAvatarSrc}" id="user-avatar-img" alt="Avatar">
                <div class="avatar-upload-overlay"><i class="fa-solid fa-camera"></i></div>
            </div>
            <div class="profile-info">
                <span class="profile-name">${currentUser.username}</span>
                <span class="profile-role">${currentUser.role}</span>
            </div>
            <input type="file" id="hidden-avatar-input" style="display:none" accept="image/*" onchange="handleAvatarChange(this)">
        `;
        profileWidget.classList.remove("hidden");
    } else {
        btnAuthTrigger.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> <span>Войти</span>`;
        btnAuthTrigger.className = "btn btn-primary btn-block";
        
        document.querySelectorAll(".auth-required").forEach(el => el.classList.add("hidden"));
        profileWidget.innerHTML = "";
        profileWidget.classList.add("hidden");
        if (currentFilter === "my") currentFilter = "all";
    }
}

// Загрузка Аватара
window.triggerAvatarUpload = function() {
    document.getElementById("hidden-avatar-input").click();
};

window.handleAvatarChange = function(input) {
    const file = input.files[0];
    if (file) {
        if (file.size > 1024 * 1024) { // Ограничение 1МБ для localStorage
            showToast("Файл слишком большой. Максимум 1МБ.", "error");
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            
            // Обновляем в текущей сессии
            currentUser.avatar = dataUrl;
            localStorage.setItem("wv_session", JSON.stringify(currentUser));
            
            // Сохраняем в глобальную базу пользователей
            const users = JSON.parse(localStorage.getItem("wv_users"));
            const uIdx = users.findIndex(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
            if (uIdx !== -1) {
                users[uIdx].avatar = dataUrl;
                localStorage.setItem("wv_users", JSON.stringify(users));
            }
            
            document.getElementById("user-avatar-img").src = dataUrl;
            showToast("Аватар успешно обновлен!");
        };
        reader.readAsDataURL(file);
    }
};

// CRUD: Сохранение / Изменение контента
function handleSaveContent(e) {
    e.preventDefault();
    const id = document.getElementById("edit-id").value;
    const title = document.getElementById("content-title").value.trim();
    const type = document.getElementById("content-type-dropdown").querySelector(".dropdown-selected").getAttribute("data-value");
    const short = document.getElementById("content-short").value.trim();
    const body = document.getElementById("content-body").value;
    const tagsRaw = document.getElementById("content-tags").value;
    
    const tags = tagsRaw.split(",").map(t => t.trim().toLowerCase()).filter(t => t !== "");
    let items = JSON.parse(localStorage.getItem("wv_content"));

    if (id) {
        // Редактирование
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
            // Проверка прав (Автор или Админ)
            if (items[index].author !== currentUser.username && currentUser.role !== "admin") {
                showToast("Нет прав на редактирование публикации", "error");
                return;
            }
            items[index].title = title;
            items[index].type = type;
            items[index].short = short;
            items[index].body = body;
            items[index].tags = tags;
            showToast("Публикация обновлена");
        }
    } else {
        // Создание новой записи
        const newItem = {
            id: Date.now().toString(),
            title,
            type,
            short,
            body,
            tags,
            author: currentUser.username,
            date: new Date().toLocaleDateString("ru-RU")
        };
        items.unshift(newItem);
        showToast("Успешно опубликовано!");
    }

    localStorage.setItem("wv_content", JSON.stringify(items));
    closeModal(editorModal);
    renderContent();
}

// CRUD: Удаление записи
window.deleteContent = function(id, e) {
    e.stopPropagation(); // Исключаем открытие модалки просмотра
    if (!confirm("Вы уверены, что хотите удалить эту публикацию?")) return;

    let items = JSON.parse(localStorage.getItem("wv_content"));
    const target = items.find(i => i.id === id);
    
    if (!target) return;
    if (target.author !== currentUser?.username && currentUser?.role !== "admin") {
        showToast("Недостаточно прав для удаления", "error");
        return;
    }

    items = items.filter(i => i.id !== id);
    localStorage.setItem("wv_content", JSON.stringify(items));
    showToast("Публикация удалена", "info");
    renderContent();
};

// CRUD: Вызов окна редактирования
window.editContent = function(id, e) {
    e.stopPropagation();
    const items = JSON.parse(localStorage.getItem("wv_content"));
    const item = items.find(i => i.id === id);
    if (!item) return;

    document.getElementById("edit-id").value = item.id;
    document.getElementById("content-title").value = item.title;
    document.getElementById("content-short").value = item.short;
    document.getElementById("content-body").value = item.body;
    document.getElementById("content-tags").value = item.tags.join(", ");
    
    setCustomDropdownValue(item.type);

    document.getElementById("editor-title").innerText = "Редактировать публикацию";
    document.getElementById("btn-editor-submit").innerText = "Сохранить изменения";
    
    openModal(editorModal);
};

// Открытие статьи на весь экран (Fullscreen View)
window.viewContent = function(id) {
    const items = JSON.parse(localStorage.getItem("wv_content"));
    const item = items.find(i => i.id === id);
    if (!item) return;

    const viewType = document.getElementById("view-type");
    viewType.innerText = item.type === "article" ? "Статья" : "Плагин";
    viewType.className = `badge badge-${item.type}`;
    
    document.getElementById("view-title").innerText = item.title;
    document.getElementById("view-author").innerText = item.author;
    document.getElementById("view-date").innerText = item.date;
    document.getElementById("view-content").innerText = item.body;

    const tagsContainer = document.getElementById("view-tags");
    tagsContainer.innerHTML = item.tags.map(t => `<span class="tag">#${t}</span>`).join("");

    viewerModal.classList.add("open");
};

// Основной рендер карточек с фильтрацией и поиском
function renderContent() {
    cardsGrid.innerHTML = "";
    const items = JSON.parse(localStorage.getItem("wv_content")) || [];

    const filteredItems = items.filter(item => {
        // Фильтр по категориям бокового меню
        if (currentFilter === "article" && item.type !== "article") return false;
        if (currentFilter === "plugin" && item.type !== "plugin") return false;
        if (currentFilter === "my" && item.author !== currentUser?.username) return false;

        // Поиск (название, описание, теги)
        if (searchQuery) {
            const inTitle = item.title.toLowerCase().includes(searchQuery);
            const inShort = item.short.toLowerCase().includes(searchQuery);
            const inTags = item.tags.some(t => t.includes(searchQuery));
            return inTitle || inShort || inTags;
        }

        return true;
    });

    if (filteredItems.length === 0) {
        cardsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Контент не найден</div>`;
        return;
    }

    filteredItems.forEach(item => {
        const isAuthor = currentUser && item.author === currentUser.username;
        const isAdmin = currentUser && currentUser.role === "admin";
        
        let actionButtons = "";
        if (isAuthor || isAdmin) {
            actionButtons = `
                <div class="card-actions">
                    <button class="action-btn" onclick="editContent('${item.id}', event)"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn delete" onclick="deleteContent('${item.id}', event)"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;
        }

        const tagsHtml = item.tags.map(t => `<span class="tag">#${t}</span>`).join("");
        const typeLabel = item.type === "article" ? "Статья" : "Плагин";

        const card = document.createElement("div");
        card.className = "card";
        card.setAttribute("onclick", `viewContent('${item.id}')`);
        card.innerHTML = `
            <div class="card-header">
                <span class="badge badge-${item.type}">${typeLabel}</span>
                ${actionButtons}
            </div>
            <h3>${item.title}</h3>
            <p>${item.short}</p>
            <div class="card-tags">${tagsHtml}</div>
            <div class="card-footer">
                <span><i class="fa-solid fa-user"></i> ${item.author}</span>
                <span><i class="fa-solid fa-calendar"></i> ${item.date}</span>
            </div>
        `;
        cardsGrid.appendChild(card);
    });
}
