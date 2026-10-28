const SUPABASE_URL = "https://ggpebincglevmsgkfyah.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_kybTUuZyvCYrUBCTf3U4uA_nZINdYbH";

/* =========================================
   ЭЛЕМЕНТЫ СТРАНИЦЫ
========================================= */

const familyTitle = document.querySelector("#family-title");
const familyDescription = document.querySelector("#family-description");
const membersCount = document.querySelector("#members-count");
const listsCount = document.querySelector("#lists-count");
const familyMessage = document.querySelector("#family-message");

const tierlistsGrid = document.querySelector("#tierlists-grid");
const membersList = document.querySelector("#family-members-list");

const inviteButton = document.querySelector("#invite-member-button");
const deleteFamilyButton = document.querySelector("#delete-family-button");

const tierlistModal = document.querySelector("#tierlist-modal");
const closeTierlistModalButton =
    document.querySelector("#close-tierlist-modal");
const createTierlistForm =
    document.querySelector("#create-tierlist-form");
const tierlistNameInput = document.querySelector("#tierlist-name");
const createTierlistSubmit =
    document.querySelector("#create-tierlist-submit");
const tierlistModalMessage =
    document.querySelector("#tierlist-modal-message");

const inviteModal = document.querySelector("#invite-modal");
const closeInviteModalButton =
    document.querySelector("#close-invite-modal");
const inviteForm = document.querySelector("#invite-form");
const inviteLinkInput = document.querySelector("#invite-link");
const sendInviteButton = document.querySelector("#send-invite-button");
const copyInviteLinkButton =
    document.querySelector("#copy-invite-link-button");
const inviteMessage = document.querySelector("#invite-message");


/* =========================================
   СОСТОЯНИЕ ПРИЛОЖЕНИЯ
========================================= */

const params = new URLSearchParams(window.location.search);
const familyId = params.get("familyId");

let supabaseClient = null;
let currentUser = null;
let currentFamily = null;
let currentMembership = null;
let currentTierLists = [];


/* =========================================
   ОБЩИЕ ФУНКЦИИ
========================================= */

function el(tag, className = "", text = "") {
    const node = document.createElement(tag);

    if (className) {
        node.className = className;
    }

    if (text !== undefined && text !== null) {
        node.textContent = text;
    }

    return node;
}


function showMessage(text, isError = false) {
    familyMessage.textContent = text;
    familyMessage.hidden = !text;
    familyMessage.classList.toggle("is-error", isError);
}


function showModalMessage(element, text, isError = false) {
    element.textContent = text;
    element.classList.toggle("error", isError);
}


function setHeading(element, text) {
    element.replaceChildren(
        document.createTextNode(text),
        el("span", "", ".")
    );
}


function showModal(modal) {
    modal.hidden = false;
}


function hideModal(modal) {
    modal.hidden = true;
}


function openTierlistModal() {
    if (currentTierLists.length >= 3) {
        showMessage(
            "В этой семье уже создано три тир-листа.",
            true
        );
        return;
    }

    createTierlistForm.reset();
    showModalMessage(tierlistModalMessage, "");
    showModal(tierlistModal);
    tierlistNameInput.focus();
}


function closeTierlistModal() {
    hideModal(tierlistModal);
    createTierlistForm.reset();
    showModalMessage(tierlistModalMessage, "");
}


function openInviteModal() {
    if (!currentMembership) {
        return;
    }

    if (!["owner", "admin"].includes(currentMembership.role)) {
        showMessage(
            "Приглашать участников может только владелец или администратор.",
            true
        );
        return;
    }

    inviteForm.reset();
    inviteLinkInput.value = "";
    copyInviteLinkButton.disabled = true;
    sendInviteButton.disabled = false;
    sendInviteButton.innerHTML = 'Создать ссылку <span>→</span>';

    showModalMessage(inviteMessage, "");
    showModal(inviteModal);
    inviteLinkInput.focus();
}


function closeInviteModal() {
    hideModal(inviteModal);
    inviteForm.reset();
    inviteLinkInput.value = "";
    copyInviteLinkButton.disabled = true;
    sendInviteButton.disabled = false;
    sendInviteButton.innerHTML = 'Создать ссылку <span>→</span>';

    showModalMessage(inviteMessage, "");
}


function openTierList(list) {
    const url = new URL("tier-list.html", window.location.href);

    url.searchParams.set("familyId", currentFamily.id);
    url.searchParams.set("tierListId", list.id);
    url.searchParams.set("name", list.name);

    window.location.href = url.href;
}


/* =========================================
   ОТОБРАЖЕНИЕ УЧАСТНИКОВ
========================================= */

function renderMembers(members) {
    membersList.replaceChildren();

    if (members.length === 0) {
        membersList.append(
            el("p", "empty-activity", "В этой семье пока нет участников.")
        );
        return;
    }

    members.forEach((member, index) => {
        const row = el("div", "family-member-row");

        const initial = Array.from(
            member.display_name.trim()
        )[0] || "?";

        const avatarClasses = [
            "member-one",
            "member-two",
            "member-three",
            "member-four",
            "member-five"
        ];

        const avatar = el(
            "span",
            `member-avatar ${avatarClasses[index % avatarClasses.length]}`,
            initial.toUpperCase()
        );

        const info = el("div", "family-member-info");

        const name = el("strong", "", member.display_name);

        const roleNames = {
            owner: "Владелец семьи",
            admin: "Администратор",
            member: "Участник"
        };

        const role = el(
            "span",
            "",
            roleNames[member.role] || "Участник"
        );

        info.append(name, role);
        row.append(avatar, info);
        membersList.append(row);
    });
}


/* =========================================
   КАРТОЧКИ ТИР-ЛИСТОВ
========================================= */

function createTierlistCard(list, index, itemCount) {
    const card = el("button", "family-tierlist-card");
    card.type = "button";

    const top = el("div", "family-tierlist-top");

    const icon = el(
        "span",
        "family-tierlist-icon",
        String(index + 1).padStart(2, "0")
    );

    const arrow = el("span", "family-tierlist-arrow", "↗");

    top.append(icon, arrow);

    const title = el("h3", "", list.name);

    const description = el(
        "p",
        "",
        itemCount === 1
            ? "1 активная хотелка"
            : `${itemCount} активных хотелок`
    );

    const footer = el(
        "span",
        "family-tierlist-footer",
        "Открыть тир-лист"
    );

    card.append(top, title, description, footer);

    card.addEventListener("click", () => {
        openTierList(list);
    });

    return card;
}


function createAddTierlistCard() {
    const remaining = 3 - currentTierLists.length;

    const card = el(
        "button",
        "family-tierlist-card add-tierlist-card"
    );

    card.type = "button";

    card.append(
        el("span", "family-tierlist-icon", "+"),
        el("h3", "", "Создать тир-лист"),
        el(
            "p",
            "",
            `Доступно ещё ${remaining} из 3 списков`
        ),
        el(
            "span",
            "family-tierlist-footer",
            "Новый список ↗"
        )
    );

    card.addEventListener("click", openTierlistModal);

    return card;
}


function createLimitCard() {
    const card = el("div", "family-tierlist-limit");

    card.append(
        el("span", "family-tierlist-icon", "✓"),
        el("h3", "", "Все слоты заняты"),
        el(
            "p",
            "",
            "В этой семье уже три тир-листа. Максимальное количество достигнуто."
        )
    );

    return card;
}


function renderTierLists(lists, itemCounts) {
    tierlistsGrid.replaceChildren();

    lists.forEach((list, index) => {
        tierlistsGrid.append(
            createTierlistCard(
                list,
                index,
                itemCounts[list.id] || 0
            )
        );
    });

    if (lists.length < 3) {
        tierlistsGrid.append(createAddTierlistCard());
    } else {
        tierlistsGrid.append(createLimitCard());
    }
}


/* =========================================
   ЗАГРУЗКА СЕМЬИ ИЗ SUPABASE
========================================= */

async function loadFamily() {
    showMessage("Загружаю информацию о семье...");

    // Получаем семью. RLS проверит права текущего пользователя.
    const { data: family, error: familyError } =
        await supabaseClient
            .from("families")
            .select("id, name, created_by, created_at")
            .eq("id", familyId)
            .single();

    if (familyError) {
        throw familyError;
    }

    currentFamily = family;

    setHeading(familyTitle, family.name);

    familyDescription.textContent =
        "Общие планы, хотелки и приоритеты вашей семьи.";

    document.title = `${family.name} — Наши хотелки`;

    // Получаем всех участников семьи.
    const { data: members, error: membersError } =
        await supabaseClient
            .from("family_members")
            .select("user_id, display_name, role, joined_at")
            .eq("family_id", familyId)
            .order("joined_at", { ascending: true });

    if (membersError) {
        throw membersError;
    }

    currentMembership = members.find(
        (member) => member.user_id === currentUser.id
    );

    if (!currentMembership) {
        throw new Error(
            "Твой аккаунт не является участником этой семьи."
        );
    }

    // Показываем кнопки в зависимости от роли.
    inviteButton.hidden = ![
        "owner",
        "admin"
    ].includes(currentMembership.role);

    deleteFamilyButton.hidden =
        currentMembership.role !== "owner";

    membersCount.textContent =
        `${members.length} ${
            members.length === 1
                ? "участник"
                : "участников"
        }`;

    renderMembers(members);

    // Загружаем тир-листы только выбранной семьи.
    const { data: lists, error: listsError } =
        await supabaseClient
            .from("tier_lists")
            .select("id, family_id, name, created_at")
            .eq("family_id", familyId)
            .order("created_at", { ascending: true });

    if (listsError) {
        throw listsError;
    }

    currentTierLists = lists || [];

    listsCount.textContent =
        `${currentTierLists.length} из 3 тир-листов`;

    // Считаем активные хотелки отдельно для каждого списка.
    const itemCounts = {};

    if (currentTierLists.length > 0) {
        const listIds = currentTierLists.map((list) => list.id);

        const { data: items, error: itemsError } =
            await supabaseClient
                .from("wishlist_items")
                .select("tier_list_id")
                .in("tier_list_id", listIds)
                .eq("purchased", false);

        if (itemsError) {
            throw itemsError;
        }

        for (const item of items || []) {
            itemCounts[item.tier_list_id] =
                (itemCounts[item.tier_list_id] || 0) + 1;
        }
    }

    renderTierLists(currentTierLists, itemCounts);

    showMessage(
        currentTierLists.length === 0
            ? "В семье пока нет тир-листов. Создай первый список."
            : ""
    );
}


/* =========================================
   СОЗДАНИЕ ТИР-ЛИСТА
========================================= */

createTierlistForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = tierlistNameInput.value.trim();

    if (name.length < 2 || name.length > 80) {
        showModalMessage(
            tierlistModalMessage,
            "Название должно содержать от 2 до 80 символов.",
            true
        );
        return;
    }

    if (currentTierLists.length >= 3) {
        showModalMessage(
            tierlistModalMessage,
            "В одной семье может быть максимум три тир-листа.",
            true
        );
        return;
    }

    createTierlistSubmit.disabled = true;

    showModalMessage(
        tierlistModalMessage,
        "Создаю тир-лист..."
    );

    try {
        // RPC самостоятельно проверяет принадлежность к семье
        // и ограничение количества тир-листов.
        const { data: newListId, error } =
            await supabaseClient.rpc("create_tier_list", {
                p_family_id: familyId,
                p_name: name
            });

        if (error) {
            throw error;
        }

        if (!newListId) {
            throw new Error(
                "База не вернула ID созданного тир-листа."
            );
        }

        closeTierlistModal();

        openTierList({
            id: newListId,
            name
        });
    } catch (error) {
        console.error("Ошибка создания тир-листа:", error);

        showModalMessage(
            tierlistModalMessage,
            error.message || "Не удалось создать тир-лист.",
            true
        );
    } finally {
        createTierlistSubmit.disabled = false;
    }
});


/* =========================================
   ПРИГЛАШЕНИЯ ПО ССЫЛКЕ
========================================= */

async function getInviteErrorMessage(error) {
    if (
        error.context &&
        typeof error.context.json === "function"
    ) {
        const result = await error.context
            .json()
            .catch(() => null);

        if (result?.error || result?.message) {
            return result.error || result.message;
        }
    }

    return error.message || "Не удалось создать ссылку-приглашение.";
}


inviteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentFamily || !currentMembership) {
        showModalMessage(
            inviteMessage,
            "Не удалось определить текущую семью.",
            true
        );
        return;
    }

    if (!["owner", "admin"].includes(currentMembership.role)) {
        showModalMessage(
            inviteMessage,
            "У тебя нет права приглашать участников.",
            true
        );
        return;
    }

    sendInviteButton.disabled = true;
    copyInviteLinkButton.disabled = true;
    sendInviteButton.textContent = "Создаю ссылку...";
    inviteLinkInput.value = "";

    showModalMessage(
        inviteMessage,
        "Создаю ссылку-приглашение..."
    );

    try {
        const { data, error } =
            await supabaseClient.functions.invoke(
                "family-invitations",
                {
                    body: {
                        action: "create",
                        familyId
                    }
                }
            );

        if (error) {
            throw new Error(
                await getInviteErrorMessage(error)
            );
        }

        if (!data?.inviteUrl) {
            throw new Error(
                data?.error ||
                "Сервер не вернул ссылку-приглашение."
            );
        }

        inviteLinkInput.value = data.inviteUrl;
        copyInviteLinkButton.disabled = false;

        let message =
            "Ссылка готова! Скопируй её и отправь близкому человеку. ";

        if (data.expiresAt) {
            const expirationDate = new Date(data.expiresAt);

            if (!Number.isNaN(expirationDate.getTime())) {
                message +=
                    `Действует до ${expirationDate.toLocaleString("ru-RU")}.`;
            } else {
                message +=
                    "Ссылка действует 7 дней и используется один раз.";
            }
        } else {
            message +=
                "Ссылка действует 7 дней и используется один раз.";
        }

        showModalMessage(inviteMessage, message);
    } catch (error) {
        console.error(
            "Ошибка создания ссылки-приглашения:",
            error
        );

        showModalMessage(
            inviteMessage,
            error.message ||
                "Не удалось создать ссылку-приглашение.",
            true
        );
    } finally {
        sendInviteButton.disabled = false;
        sendInviteButton.innerHTML =
            'Создать новую ссылку <span>→</span>';
    }
});


// Копирование готовой ссылки в буфер обмена.
copyInviteLinkButton.addEventListener("click", async () => {
    const inviteUrl = inviteLinkInput.value.trim();

    if (!inviteUrl) {
        showModalMessage(
            inviteMessage,
            "Сначала создай ссылку-приглашение.",
            true
        );
        return;
    }

    try {
        await navigator.clipboard.writeText(inviteUrl);

        showModalMessage(
            inviteMessage,
            "Ссылка скопирована! Теперь отправь её близкому человеку."
        );
    } catch (error) {
        // Запасной способ, если Clipboard API недоступен.
        inviteLinkInput.focus();
        inviteLinkInput.select();

        let copied = false;

        try {
            copied = document.execCommand("copy");
        } catch {
            copied = false;
        }

        if (copied) {
            showModalMessage(
                inviteMessage,
                "Ссылка скопирована! Теперь отправь её близкому человеку."
            );
        } else {
            showModalMessage(
                inviteMessage,
                "Не удалось скопировать автоматически. Выдели ссылку и нажми Ctrl+C."
            );
        }
    }
});


/* =========================================
   УДАЛЕНИЕ СЕМЬИ
========================================= */

deleteFamilyButton.addEventListener("click", async () => {
    if (!currentFamily || !currentUser || !supabaseClient) {
        showMessage(
            "Не удалось определить семью или текущий аккаунт.",
            true
        );
        return;
    }

    if (currentMembership?.role !== "owner") {
        showMessage(
            "Удалить семью может только её владелец.",
            true
        );
        return;
    }

    const confirmation = prompt(
        `ВНИМАНИЕ!\n\n` +
        `Семья «${currentFamily.name}», все её тир-листы, ` +
        `хотелки, приглашения и история будут удалены без возможности восстановления.\n\n` +
        `Чтобы подтвердить удаление, введи точное название семьи:`
    );

    if (confirmation === null) {
        return;
    }

    if (confirmation.trim() !== currentFamily.name) {
        alert("Название не совпадает. Семья не удалена.");
        return;
    }

    const originalText = deleteFamilyButton.textContent;

    deleteFamilyButton.disabled = true;
    deleteFamilyButton.textContent = "Удаляю семью...";

    try {
        const { error } = await supabaseClient.rpc(
            "delete_family",
            {
                p_family_id: familyId
            }
        );

        if (error) {
            throw error;
        }

        window.location.replace("famswitcher.html");
    } catch (error) {
        console.error("Ошибка удаления семьи:", error);

        showMessage(
            error.message || "Не удалось удалить семью.",
            true
        );

        deleteFamilyButton.disabled = false;
        deleteFamilyButton.textContent = originalText;
    }
});


/* =========================================
   УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ
========================================= */

inviteButton.addEventListener("click", openInviteModal);

closeTierlistModalButton.addEventListener(
    "click",
    closeTierlistModal
);

closeInviteModalButton.addEventListener(
    "click",
    closeInviteModal
);

tierlistModal.addEventListener("click", (event) => {
    if (event.target === tierlistModal) {
        closeTierlistModal();
    }
});

inviteModal.addEventListener("click", (event) => {
    if (event.target === inviteModal) {
        closeInviteModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        if (!tierlistModal.hidden) {
            closeTierlistModal();
        }

        if (!inviteModal.hidden) {
            closeInviteModal();
        }
    }
});


/* =========================================
   ИНИЦИАЛИЗАЦИЯ
========================================= */

async function initialize() {
    if (!window.supabase) {
        showMessage(
            "Не удалось загрузить библиотеку Supabase. Проверь интернет.",
            true
        );
        return;
    }

    if (
        !SUPABASE_URL.startsWith("https://") ||
        SUPABASE_URL.includes("ВСТАВЬ") ||
        !SUPABASE_PUBLISHABLE_KEY ||
        SUPABASE_PUBLISHABLE_KEY.includes("ВСТАВЬ")
    ) {
        showMessage(
            "Укажи Project URL и Publishable key в family.js.",
            true
        );
        return;
    }

    if (!familyId) {
        window.location.replace("famswitcher.html");
        return;
    }

    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError) {
        throw sessionError;
    }

    if (!sessionData.session) {
        window.location.replace("index.html");
        return;
    }

    const { data: userData, error: userError } =
        await supabaseClient.auth.getUser();

    if (userError || !userData.user) {
        window.location.replace("index.html");
        return;
    }

    currentUser = userData.user;

    await loadFamily();
}


initialize().catch((error) => {
    console.error(
        "Ошибка инициализации страницы семьи:",
        error
    );

    showMessage(
        error.message ||
        "Не удалось загрузить семью. Проверь SQL и настройки Supabase.",
        true
    );
});