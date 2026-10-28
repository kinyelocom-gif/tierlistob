
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

let isRegisterMode = false;
let supabaseClient = null;

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
}

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

function initializeSupabase() {
    const hasConfig =
        SUPABASE_URL.startsWith("https://") &&
        SUPABASE_PUBLISHABLE_KEY.length > 10 &&
        !SUPABASE_PUBLISHABLE_KEY.includes("ВСТАВЬ");

    if (!window.supabase) {
        showMessage(
            "Не удалось загрузить Supabase. Проверь подключение к интернету.",
            true
        );
        return;
    }

    if (!hasConfig) {
        showMessage(
            "Сначала укажи Project URL и Publishable key в script.js.",
            true
        );
        return;
    }

    try {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
        );
    } catch (error) {
        console.error(error);

        showMessage(
            "Не удалось настроить Supabase. Проверь URL и ключ.",
            true
        );
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!supabaseClient) {
        showMessage("Supabase ещё не настроен.", true);
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (isRegisterMode && password !== confirmPassword.value) {
        showMessage("Пароли не совпадают.", true);
        return;
    }

    if (isRegisterMode && nameInput.value.trim().length < 2) {
        showMessage("Имя должно содержать минимум 2 символа.", true);
        return;
    }

    submitButton.disabled = true;
    loginTab.disabled = true;
    registerTab.disabled = true;

    showMessage("Обработка запроса...");

    try {
        if (isRegisterMode) {
            const displayName = nameInput.value.trim();

            const redirectUrl = window.location.href.split(/[?#]/)[0];

            const { data, error } = await supabaseClient.auth.signUp({
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

            if (data.session) {
                showMessage(
                    `Аккаунт создан. Ты вошёл как ${displayName}.`
                );

                logoutButton.hidden = false;
            } else {
                showMessage(
                    "Регистрация отправлена! Проверь почту и перейди " +
                    "по ссылке подтверждения, затем войди в аккаунт."
                );
            }
        } else {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) {
                throw error;
            }

            const displayName =
                data.user.user_metadata?.display_name || data.user.email;

            showMessage(`Вход выполнен. Привет, ${displayName}!`);


            logoutButton.hidden = false;

            window.location.href = "famswitcher.html";
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
        showMessage(error.message || "Не удалось выйти.", true);
    } finally {
        logoutButton.disabled = false;
    }
});

async function checkSession() {
    if (!supabaseClient) {
        return;
    }

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        showMessage("Не удалось проверить авторизацию.", true);
        return;
    }

    if (data.session) {
    window.location.replace("families.html");
    return;
}
}

setMode(false);
initializeSupabase();
checkSession();
