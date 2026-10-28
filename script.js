
const SUPABASE_URL = "https://ggpebincglevmsgkfyah.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_kybTUuZyvCYrUBCTf3U4uA_nZINdYbH";

const loginTab = document.querySelector("#login-tab");
const registerTab = document.querySelector("#register-tab");

const form = document.querySelector("#auth-form");
const title = document.querySelector("#form-title");
const description = document.querySelector("#form-description");
const submitButton = document.querySelector("#submit-button");

const nameField = document.querySelector("#name-field");
const nameInput = document.querySelector("#display-name");

const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");

const confirmField = document.querySelector("#confirm-field");
const confirmPassword = document.querySelector("#confirm-password");

const message = document.querySelector("#form-message");
const logoutButton = document.querySelector("#logout-button");

let supabaseClient = null;
let isRegisterMode = false;


/* =========================================
   ПОЛУЧЕНИЕ ТОКЕНА ПРИГЛАШЕНИЯ
========================================= */

function getInviteToken() {
    const params = new URLSearchParams(window.location.search);

    // Токен из адреса страницы входа.
    const urlToken = params.get("inviteToken");

    // Токен, сохранённый при переходе со страницы приглашения.
    const savedToken = sessionStorage.getItem("familyInviteToken");

    const token = urlToken || savedToken;

    if (token) {
        sessionStorage.setItem("familyInviteToken", token);
    }

    return token;
}


/* =========================================
   ВЫБОР СТРАНИЦЫ ПОСЛЕ ВХОДА
========================================= */

function getAuthDestination() {
    const token = getInviteToken();

    if (token) {
        // Если пользователь пришёл по приглашению,
        // после авторизации возвращаем его к приглашению.
        const url = new URL(
            "accept-invitation.html",
            window.location.href
        );

        url.searchParams.set("token", token);

        return url.href;
    }

    // Обычный вход — переходим к выбору семей.
    return new URL(
        "famswitcher.html",
        window.location.href
    ).href;
}


/* =========================================
   СООБЩЕНИЯ
========================================= */

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
}


/* =========================================
   ПЕРЕКЛЮЧЕНИЕ ВХОДА И РЕГИСТРАЦИИ
========================================= */

function setMode(registerMode) {
    isRegisterMode = registerMode;

    loginTab.classList.toggle("active", !registerMode);
    registerTab.classList.toggle("active", registerMode);

    title.textContent = registerMode
        ? "Создать аккаунт"
        : "С возвращением";

    description.textContent = registerMode
        ? "Создай аккаунт, чтобы участвовать в общих планах."
        : "Войди, чтобы продолжить планировать покупки.";

    submitButton.innerHTML = registerMode
        ? 'Зарегистрироваться <span>→</span>'
        : 'Войти в аккаунт <span>→</span>';

    nameField.hidden = !registerMode;
    nameInput.disabled = !registerMode;
    nameInput.required = registerMode;

    confirmField.hidden = !registerMode;
    confirmPassword.disabled = !registerMode;
    confirmPassword.required = registerMode;

    passwordInput.autocomplete = registerMode
        ? "new-password"
        : "current-password";

    logoutButton.hidden = true;

    showMessage("");
}

loginTab.addEventListener("click", () => setMode(false));
registerTab.addEventListener("click", () => setMode(true));


/* =========================================
   РЕГИСТРАЦИЯ И ВХОД
========================================= */

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!supabaseClient) {
        showMessage(
            "Supabase не подключён. Проверь URL и Publishable key.",
            true
        );
        return;
    }

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (isRegisterMode && password !== confirmPassword.value) {
        showMessage("Пароли не совпадают.", true);
        return;
    }

    const displayName = nameInput.value.trim();

    if (isRegisterMode && displayName.length < 2) {
        showMessage("Имя должно содержать минимум 2 символа.", true);
        return;
    }

    submitButton.disabled = true;
    loginTab.disabled = true;
    registerTab.disabled = true;

    showMessage("Обработка запроса...");

    try {
        /* ---------- РЕГИСТРАЦИЯ ---------- */

        if (isRegisterMode) {
            // Важно: если пользователь пришёл по приглашению,
            // ссылка подтверждения почты должна вернуть его
            // именно на страницу принятия приглашения.
            const redirectUrl = getAuthDestination();

            const { data, error } =
                await supabaseClient.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: redirectUrl,
                        data: {
                            display_name: displayName
                        }
                    }
                });

            if (error) {
                throw error;
            }

            // Некоторые настройки Supabase позволяют сразу войти,
            // если подтверждение почты не требуется.
            if (data.session) {
                window.location.replace(getAuthDestination());
                return;
            }

            // При включённом подтверждении почты ждём перехода
            // пользователя по ссылке из письма.
            showMessage(
                "Аккаунт создан! Проверь почту и подтверди адрес. " +
                "После подтверждения ты вернёшься к приглашению " +
                "или попадёшь на страницу своих семей."
            );

        } else {

            /* ---------- ВХОД ---------- */

            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) {
                throw error;
            }

            // При обычном входе откроются семьи.
            // При входе по приглашению откроется его принятие.
            if (data.session) {
                window.location.replace(getAuthDestination());
                return;
            }

            showMessage("Не удалось получить активную сессию.", true);
        }

    } catch (error) {
        console.error("Ошибка авторизации:", error);

        if (
            error.code === "email_not_confirmed" ||
            error.message === "Email not confirmed"
        ) {
            showMessage(
                "Подтверди электронную почту по ссылке из письма.",
                true
            );
        } else if (
            error.code === "invalid_credentials"
        ) {
            showMessage(
                "Неверная почта или пароль.",
                true
            );
        } else {
            showMessage(
                error.message || "Не удалось выполнить запрос.",
                true
            );
        }

    } finally {
        submitButton.disabled = false;
        loginTab.disabled = false;
        registerTab.disabled = false;
    }
});


/* =========================================
   ВЫХОД ИЗ АККАУНТА
========================================= */

logoutButton.addEventListener("click", async () => {
    if (!supabaseClient) {
        return;
    }

    logoutButton.disabled = true;

    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            throw error;
        }

        form.reset();
        setMode(false);

        showMessage("Ты вышел из аккаунта.");

    } catch (error) {
        console.error("Ошибка выхода:", error);

        showMessage(
            error.message || "Не удалось выйти из аккаунта.",
            true
        );

    } finally {
        logoutButton.disabled = false;
    }
});


/* =========================================
   ПРОВЕРКА ТЕКУЩЕЙ СЕССИИ
========================================= */

async function checkSession() {
    if (!supabaseClient) {
        return;
    }

    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {
        showMessage(
            "Не удалось проверить авторизацию.",
            true
        );
        return;
    }

    // Если пользователь уже авторизован,
    // повторный вход ему не нужен.
    if (data.session) {
        window.location.replace(getAuthDestination());
    }
}


/* =========================================
   ИНИЦИАЛИЗАЦИЯ SUPABASE
========================================= */

function initializeSupabase() {
    if (!window.supabase) {
        showMessage(
            "Не удалось загрузить библиотеку Supabase. " +
            "Проверь подключение к интернету.",
            true
        );
        return;
    }

    const hasConfig =
        SUPABASE_URL.startsWith("https://") &&
        !SUPABASE_URL.includes("ВСТАВЬ") &&
        SUPABASE_PUBLISHABLE_KEY.length > 10 &&
        !SUPABASE_PUBLISHABLE_KEY.includes("ВСТАВЬ");

    if (!hasConfig) {
        showMessage(
            "Укажи Project URL и Publishable key в script.js.",
            true
        );
        return;
    }

    try {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
        );

        checkSession().catch((error) => {
            console.error("Ошибка проверки сессии:", error);
            showMessage("Не удалось проверить текущую сессию.", true);
        });

    } catch (error) {
        console.error("Ошибка подключения Supabase:", error);

        showMessage(
            "Не удалось подключиться к Supabase.",
            true
        );
    }
}


/* =========================================
   ЗАПУСК
========================================= */

setMode(false);
initializeSupabase();
