
const SUPABASE_URL = "https://ggpebincglevmsgkfyah.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_kybTUuZyvCYrUBCTf3U4uA_nZINdYbH";

const params = new URLSearchParams(window.location.search);
const familyId = params.get("familyId");

const familyTitle = document.querySelector("#family-title");
const familyDescription = document.querySelector("#family-description");
const membersCount = document.querySelector("#members-count");
const listsCount = document.querySelector("#lists-count");
const familyMessage = document.querySelector("#family-message");
const tierlistsGrid = document.querySelector("#tierlists-grid");
const membersList = document.querySelector("#family-members-list");

const modal = document.querySelector("#tierlist-modal");
const closeModalButton = document.querySelector("#close-tierlist-modal");
const createForm = document.querySelector("#create-tierlist-form");
const tierlistNameInput = document.querySelector("#tierlist-name");
const modalMessage = document.querySelector("#tierlist-modal-message");
const submitButton = document.querySelector("#create-tierlist-submit");

let supabaseClient;
let currentUser;
let currentFamily;
let currentTierLists = [];

function el(tag, className = "", text = "") {
    const node = document.createElement(tag);

    if (className) node.className = className;
    if (text) node.textContent = text;

    return node;
}

function showMessage(text, isError = false) {
    familyMessage.textContent = text;
    familyMessage.hidden = !text;
    familyMessage.classList.toggle("is-error", isError);
}

function showModalMessage(text, isError = false) {
    modalMessage.textContent = text;
    modalMessage.classList.toggle("error", isError);
}

function openModal() {
    if (currentTierLists.length >= 3) return;

    createForm.reset();
    showModalMessage("");
    modal.hidden = false;
    tierlistNameInput.focus();
}

function closeModal() {
    modal.hidden = true;
    createForm.reset();
    showModalMessage("");
}

function openTierList(list) {
    const url = new URL("tier-list.html", window.location.href);

    url.searchParams.set("familyId", familyId);
    url.searchParams.set("tierListId", list.id);
    url.searchParams.set("name", list.name);

    window.location.href = url.href;
}

function renderMembers(members) {
    membersList.replaceChildren();

    if (members.length === 0) {
        membersList.append(
            el("p", "empty-activity", "Пока нет участников.")
        );
        return;
    }

    members.forEach((member) => {
        const row = el("div", "family-member-row");
        const avatar = el(
            "span",
            "member-avatar member-one",
            Array.from(member.display_name)[0].toUpperCase()
        );

        const info = el("div", "family-member-info");
        info.append(
            el("strong", "", member.display_name),
            el("span", "", {
                owner: "Владелец семьи",
                admin: "Администратор",
                member: "Участник"
            }[member.role] || "Участник")
        );

        row.append(avatar, info);
        membersList.append(row);
    });
}

function renderTierLists(lists, itemCounts) {
    tierlistsGrid.replaceChildren();

    lists.forEach((list, index) => {
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
        const count = itemCounts[list.id] || 0;

        const description = el(
            "p",
            "",
            `${count} ${count === 1 ? "активная хотелка" : "активных хотелок"}`
        );

        const footer = el("span", "family-tierlist-footer", "Открыть тир-лист");

        card.append(top, title, description, footer);
        card.addEventListener("click", () => openTierList(list));

        tierlistsGrid.append(card);
    });

    if (lists.length < 3) {
        const addCard = el("button", "family-tierlist-card add-tierlist-card");
        addCard.type = "button";

        addCard.append(
            el("span", "family-tierlist-icon", "+"),
            el("h3", "", "Создать тир-лист"),
            el("p", "", `Доступно ещё ${3 - lists.length} из 3 списков`),
            el("span", "family-tierlist-footer", "Новый список ↗")
        );

        addCard.addEventListener("click", openModal);
        tierlistsGrid.append(addCard);
    } else {
        const limit = el("div", "family-tierlist-limit");
        limit.append(
            el("span", "family-tierlist-icon", "✓"),
            el("h3", "", "Все слоты заняты"),
            el("p", "", "В этой семье уже создано три тир-листа.")
        );

        tierlistsGrid.append(limit);
    }
}

async function loadFamily() {
    showMessage("Загружаю семью...");

    const { data: family, error: familyError } = await supabaseClient
        .from("families")
        .select("id, name, created_by, created_at")
        .eq("id", familyId)
        .single();

    if (familyError) throw familyError;

    currentFamily = family;
    familyTitle.textContent = `${family.name}.`;
    document.title = `${family.name} — Наши хотелки`;

    const { data: members, error: membersError } = await supabaseClient
        .from("family_members")
        .select("user_id, display_name, role, joined_at")
        .eq("family_id", familyId)
        .order("joined_at");

    if (membersError) throw membersError;

    membersCount.textContent =
        `${members.length} ${members.length === 1 ? "участник" : "участников"}`;

    renderMembers(members);

    const { data: lists, error: listsError } = await supabaseClient
        .from("tier_lists")
        .select("id, family_id, name, created_at")
        .eq("family_id", familyId)
        .order("created_at", { ascending: true });

    if (listsError) throw listsError;

    currentTierLists = lists;
    listsCount.textContent = `${lists.length} из 3 тир-листов`;

    let itemCounts = {};

    if (lists.length > 0) {
        const listIds = lists.map((list) => list.id);

        const { data: items, error: itemsError } = await supabaseClient
            .from("wishlist_items")
            .select("tier_list_id")
            .in("tier_list_id", listIds)
            .eq("purchased", false);

        if (itemsError) throw itemsError;

        for (const item of items) {
            itemCounts[item.tier_list_id] =
                (itemCounts[item.tier_list_id] || 0) + 1;
        }
    }

    renderTierLists(lists, itemCounts);

    showMessage(
        lists.length === 0
            ? "В этой семье пока нет тир-листов. Создай первый список."
            : ""
    );
}

async function initialize() {
    if (
        !window.supabase ||
        !SUPABASE_URL.startsWith("https://") ||
        SUPABASE_URL.includes("ВСТАВЬ") ||
        SUPABASE_PUBLISHABLE_KEY.includes("ВСТАВЬ")
    ) {
        showMessage("Укажи Project URL и Publishable key в family.js.", true);
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

    if (sessionError) throw sessionError;

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

createForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = tierlistNameInput.value.trim();

    if (name.length < 2 || name.length > 80) {
        showModalMessage("Название должно содержать от 2 до 80 символов.", true);
        return;
    }

    submitButton.disabled = true;
    showModalMessage("Создаю тир-лист...");

    try {
        const { data: newListId, error } = await supabaseClient.rpc(
            "create_tier_list",
            {
                p_family_id: familyId,
                p_name: name
            }
        );

        if (error) throw error;

        closeModal();

        openTierList({
            id: newListId,
            name
        });
    } catch (error) {
        console.error("Ошибка создания тир-листа:", error);

        showModalMessage(
            error.message || "Не удалось создать тир-лист.",
            true
        );
    } finally {
        submitButton.disabled = false;
    }
});

closeModalButton.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
});

initialize().catch((error) => {
    console.error("Ошибка загрузки семьи:", error);
    showMessage(
        error.message || "Не удалось загрузить семью. Проверь доступ.",
        true
    );
});
