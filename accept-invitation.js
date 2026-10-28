const SUPABASE_URL = "https://ggpebincglevmsgkfyah.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_kybTUuZyvCYrUBCTf3U4uA_nZINdYbH";

const heading = document.querySelector("#invite-heading");
const status = document.querySelector("#invite-status");
const familyLink = document.querySelector("#invite-family-link");

function setStatus(title, text, isError = false) {
    heading.textContent = title;
    status.textContent = text;
    status.classList.toggle("error", isError);
}

async function getFunctionErrorMessage(error) {
    if (error.context && typeof error.context.json === "function") {
        const body = await error.context.json().catch(() => null);

        if (body?.error || body?.message) {
            return body.error || body.message;
        }
    }

    return error.message || "Не удалось принять приглашение.";
}

async function initializeInvitation() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
        setStatus(
            "Ссылка некорректна.",
            "Попроси владельца семьи отправить новое приглашение.",
            true
        );
        return;
    }

    if (!window.supabase) {
        setStatus(
            "Не удалось загрузить приложение.",
            "Проверь подключение к интернету и обнови страницу.",
            true
        );
        return;
    }

    const client = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    const { data, error } = await client.auth.getSession();

    if (error) {
        setStatus("Не удалось проверить аккаунт.", error.message, true);
        return;
    }

    if (!data.session) {
        // Передаём токен на страницу входа, не теряя приглашение.
        sessionStorage.setItem("familyInviteToken", token);

        window.location.replace(
            `index.html?inviteToken=${encodeURIComponent(token)}`
        );

        return;
    }

    setStatus(
        "Принимаю приглашение...",
        "Проверяю адрес аккаунта и добавляю тебя в семью."
    );

    const { data: result, error: acceptError } =
        await client.functions.invoke("family-invitations", {
            body: {
                action: "accept",
                token
            }
        });

    if (acceptError) {
        setStatus(
            "Не удалось принять приглашение.",
            await getFunctionErrorMessage(acceptError),
            true
        );
        return;
    }

    if (!result?.success || !result.familyId) {
        setStatus(
            "Приглашение не принято.",
            result?.error || "Ссылка недействительна или срок её действия истёк.",
            true
        );
        return;
    }

    sessionStorage.removeItem("familyInviteToken");

    const { data: family, error: familyError } = await client
        .from("families")
        .select("name")
        .eq("id", result.familyId)
        .single();

    if (familyError) {
        console.error(familyError);
    }

    const name = family?.name || "твоя семья";

    setStatus(
        "Добро пожаловать!",
        `Ты теперь участник семьи «${name}».`
    );

    familyLink.href =
        `family.html?familyId=${encodeURIComponent(result.familyId)}`;

    familyLink.hidden = false;
}

initializeInvitation().catch((error) => {
    console.error("Ошибка приглашения:", error);

    setStatus(
        "Что-то пошло не так.",
        error.message || "Попробуй открыть приглашение ещё раз.",
        true
    );
});
