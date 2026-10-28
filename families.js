
const SUPABASE_URL = "https://ggpebincglevmsgkfyah.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_kybTUuZyvCYrUBCTf3U4uA_nZINdYbH";

const familyGrid = document.querySelector("#family-grid");
const familiesMessage = document.querySelector("#families-message");
const familyCount = document.querySelector("#family-count");
const profileName = document.querySelector("#profile-name");
const profileMenu = document.querySelector("#profile-menu");

const modal = document.querySelector("#family-modal");
const closeModalButton = document.querySelector("#close-modal");
const createForm = document.querySelector("#create-family-form");
const familyNameInput = document.querySelector("#family-name");
const modalMessage = document.querySelector("#modal-message");

let supabaseClient = null;
let currentUser = null;
let memberships = [];

function createElement(tag, className = "", text = "") {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text) {
        element.textContent = text;
    }

    return element;
}

function showFeedback(text, isError = false) {
    familiesMessage.textContent = text;
    familiesMessage.hidden = !text;
    familiesMessage.classList.toggle("is-error", isError);
}

function showModalMessage(text, isError = false) {
    modalMessage.textContent = text;
    modalMessage.classList.toggle("error", isError);
}

function openModal() {
    const trigger = document.querySelector("#create-family-button");

    if (!trigger || trigger.disabled) {
        return;
    }

    createForm.reset();
    showModalMessage("");
    modal.hidden = false;
    familyNameInput.focus();
}

function closeModal() {
    modal.hidden = true;
    createForm.reset();
    showModalMessage("");
}

function updateFamilyCounter(count) {
    familyCount.textContent = String(count).padStart(2, "0");

    document.querySelectorAll("#limit-progress span").forEach((bar, index) => {
        bar.classList.toggle("active", index < count);
    });
}

function createFamilyCard(family, membership, members, tierLists) {
    const card = createElement("a", "family-card");

    card.href = `family.html?familyId=${encodeURIComponent(family.id)}`;

    if (membership.role === "owner") {
        card.classList.add("family-card-featured");
    }

    const top = createElement("div", "family-card-top");
    const icon = createElement("div", "family-icon family-icon-green", "⌂");

    const roleText = {
        owner: "ВЛАДЕЛЕЦ",
        admin: "АДМИНИСТРАТОР",
        member: "УЧАСТНИК"
    }[membership.role] || "УЧАСТНИК";

    const role = createElement(
        "span",
        membership.role === "member"
            ? "role-badge role-member"
            : "role-badge",
        roleText
    );

    top.append(icon, role);

    const body = createElement("div", "family-card-body");
    const title = createElement("h3");

    title.append(document.createTextNode(family.name));
    title.append(createElement("span", "", "."));

    const description = createElement(
        "p",
        "",
        membership.role === "owner"
            ? "Твоя семья, общие хотелки и планы на будущее."
            : "Общие покупки, приоритеты и планы."
    );

    body.append(title, description);

    const stats = createElement("div", "family-stats");

    const memberStat = createElement("div");
    memberStat.append(
        createElement("strong", "", String(members.length)),
        createElement("span", "", "участника")
    );

    const listStat = createElement("div");
    listStat.append(
        createElement("strong", "", String(tierLists.length)),
        createElement("span", "", "тир-листа")
    );

    stats.append(memberStat, listStat);

    const footer = createElement("div", "family-card-footer");
    const avatarStack = createElement("div", "avatar-stack");

    members.slice(0, 3).forEach((member, index) => {
        const initial = Array.from(member.display_name.trim())[0] || "?";

        const avatar = createElement(
            "span",
            `member-avatar member-${["one", "two", "three"][index]}`,
            initial.toUpperCase()
        );

        avatar.title = member.display_name;
        avatarStack.append(avatar);
    });

    if (members.length > 3) {
        avatarStack.append(
            createElement(
                "span",
                "member-avatar member-five",
                `+${members.length - 3}`
            )
        );
    }

    const openLabel = createElement("span", "open-family");
    openLabel.append(
        document.createTextNode("Открыть "),
        createElement("span", "", "↗")
    );

    footer.append(avatarStack, openLabel);
    card.append(top, body, stats, footer);

    return card;
}

function createFamilyTile(count) {
    const button = createElement("button", "create-family-card");
    button.type = "button";
    button.id = "create-family-button";

    button.append(
        createElement("span", "create-icon", "+"),
        createElement(
            "span",
            "create-title",
            count < 3 ? "Создать семью" : "Лимит достигнут"
        ),
        createElement(
            "span",
            "create-description",
            count < 3
                ? "Собери близких и планируйте покупки вместе."
                : "На одном аккаунте можно состоять максимум в трёх семьях."
        )
    );

    const bottom = createElement("span", "create-bottom");

    bottom.append(
        document.createTextNode(
            count < 3 ? "НОВОЕ ПРОСТРАНСТВО" : "3 ИЗ 3 СЕМЕЙ"
        ),
        createElement("span", "", count < 3 ? "↗" : "✓")
    );

    button.append(bottom);
    button.disabled = count >= 3;
    button.addEventListener("click", openModal);

    return button;
}

async function loadFamilies() {
    showFeedback("Загружаю семьи...");

    const { data: membershipData, error: membershipError } =
        await supabaseClient
            .from("family_members")
            .select("family_id, user_id, display_name, role, joined_at");

    if (membershipError) {
        throw membershipError;
    }

    memberships = membershipData || [];

    const myMemberships = memberships.filter(
        (membership) => membership.user_id === currentUser.id
    );

    const familyIds = myMemberships.map(
        (membership) => membership.family_id
    );

    let families = [];
    let tierLists = [];

    if (familyIds.length > 0) {
        const { data: familyData, error: familyError } =
            await supabaseClient
                .from("families")
                .select("id, name, created_at")
                .in("id", familyIds)
                .order("created_at", { ascending: true });

        if (familyError) {
            throw familyError;
        }

        families = familyData || [];

        const { data: tierListData, error: tierListError } =
            await supabaseClient
                .from("tier_lists")
                .select("id, family_id, name")
                .in("family_id", familyIds);

        if (tierListError) {
            throw tierListError;
        }

        tierLists = tierListData || [];
    }

    familyGrid.replaceChildren();
    updateFamilyCounter(families.length);

    profileName.textContent =
        currentUser.user_metadata?.display_name ||
        currentUser.email ||
        "Участник";

    families.forEach((family) => {
        const membership = myMemberships.find(
            (entry) => entry.family_id === family.id
        );

        const familyMembers = memberships.filter(
            (entry) => entry.family_id === family.id
        );

        const familyTierLists = tierLists.filter(
            (entry) => entry.family_id === family.id
        );

        familyGrid.append(
            createFamilyCard(
                family,
                membership,
                familyMembers,
                familyTierLists
            )
        );
    });

    familyGrid.append(createFamilyTile(families.length));

    showFeedback(
        families.length === 0
            ? "Пока у тебя нет семей. Создай первую — и сможешь пригласить близких."
            : ""
    );
}

async function initializePage() {
    if (
        !window.supabase ||
        !SUPABASE_URL.startsWith("https://") ||
        SUPABASE_URL.includes("ВСТАВЬ") ||
        SUPABASE_PUBLISHABLE_KEY.includes("ВСТАВЬ") ||
        SUPABASE_PUBLISHABLE_KEY.length < 10
    ) {
        showFeedback(
            "Проверь Project URL и Publishable key в families.js.",
            true
        );
        return;
    }

    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        throw error;
    }

    if (!data.session) {
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
    await loadFamilies();
}

createForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const familyName = familyNameInput.value.trim();

    if (familyName.length < 2 || familyName.length > 60) {
        showModalMessage(
            "Название должно содержать от 2 до 60 символов.",
            true
        );
        return;
    }

    const submitButton = createForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    showModalMessage("Создаю семью...");

    try {
        const { error } = await supabaseClient.rpc("create_family", {
            p_name: familyName
        });

        if (error) {
            throw error;
        }

        closeModal();
        await loadFamilies();
        showFeedback(`Семья «${familyName}» успешно создана.`);
    } catch (error) {
        console.error("Ошибка создания семьи:", error);

        showModalMessage(
            error.message || "Не удалось создать семью.",
            true
        );
    } finally {
        submitButton.disabled = false;
    }
});

closeModalButton.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
        closeModal();
    }
});

profileMenu.addEventListener("click", async () => {
    if (!confirm("Выйти из аккаунта?")) {
        return;
    }

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        showFeedback(error.message, true);
        return;
    }

    window.location.replace("index.html");
});

initializePage().catch((error) => {
    console.error("Не удалось загрузить семьи:", error);

    showFeedback(
        error.message || "Не удалось загрузить семьи. Проверь настройки базы.",
        true
    );
});
