const SUPABASE_URL = "https://ggpebincglevmsgkfyah.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_kybTUuZyvCYrUBCTf3U4uA_nZINdYbH";

const params = new URLSearchParams(window.location.search);
const familyId = params.get("familyId");
const tierListId = params.get("tierListId");

const board = document.querySelector("#tier-board");
const tierTitle = document.querySelector("#tier-title");
const itemCount = document.querySelector("#item-count");
const saveStatus = document.querySelector("#save-status");

const addItemButton = document.querySelector("#add-item-button");
const exportButton = document.querySelector("#export-button");

const itemModal = document.querySelector("#item-modal");
const closeItemModalButton = document.querySelector("#close-item-modal");
const itemForm = document.querySelector("#item-form");
const itemTitleInput = document.querySelector("#item-title");
const itemDescriptionInput = document.querySelector("#item-description");
const itemEmojiInput = document.querySelector("#item-emoji");
const purchaseUrlInput = document.querySelector("#item-purchase-url");
const itemRankInput = document.querySelector("#item-rank");
const saveItemButton = document.querySelector("#save-item-button");
const itemFormMessage = document.querySelector("#item-form-message");

const linkPreview = document.querySelector("#link-preview");
const linkPreviewImage = document.querySelector("#link-preview-image");
const linkPreviewEmoji = document.querySelector("#link-preview-emoji");
const linkPreviewTitle = document.querySelector("#link-preview-title");
const linkPreviewStatus = document.querySelector("#link-preview-status");

const detailsModal = document.querySelector("#details-modal");
const closeDetailsModalButton = document.querySelector("#close-details-modal");
const detailsTitle = document.querySelector("#details-title");
const detailsDescription = document.querySelector("#details-description");
const detailsImage = document.querySelector("#details-image");
const detailsEmoji = document.querySelector("#details-emoji");
const detailsPurchaseLink = document.querySelector("#details-purchase-link");
const detailsRank = document.querySelector("#details-rank");
const purchaseButton = document.querySelector("#purchase-button");
const deleteButton = document.querySelector("#delete-button");
const detailsMessage = document.querySelector("#details-message");

const activityList = document.querySelector("#activity-list");

const MICROLINK_API = "https://api.microlink.io/";

let supabaseClient = null;
let currentUser = null;
let currentFamily = null;
let currentTierList = null;
let state = { items: [], activity: [] };
let selectedItemId = null;
let draggedItemId = null;

let previewState = {
    url: null,
    imageUrl: null,
    title: null,
    checked: false,
    error: null
};

function el(tag, className = "", text = "") {
    const node = document.createElement(tag);

    if (className) node.className = className;
    if (text) node.textContent = text;

    return node;
}

function showStatus(text, isError = false) {
    saveStatus.textContent = text;
    saveStatus.classList.toggle("status-error", isError);
}

function showFormMessage(element, text, isError = false) {
    element.textContent = text;
    element.classList.toggle("error", isError);
}

function normalizePurchaseUrl(value) {
    if (!value.trim()) return null;

    let url;

    try {
        url = new URL(value.trim());
    } catch {
        throw new Error("Введи корректную ссылку на товар.");
    }

    if (url.protocol !== "https:") {
        throw new Error("Ссылка на покупку должна начинаться с https://");
    }

    if (
        !url.hostname ||
        url.hostname === "localhost" ||
        url.hostname.endsWith(".local") ||
        url.username ||
        url.password
    ) {
        throw new Error("Проверь адрес сайта покупки.");
    }

    return url.href;
}

function createImageProxyUrl(productUrl) {
    const url = new URL(MICROLINK_API);

    url.searchParams.set("url", productUrl);
    url.searchParams.set("meta", "false");
    url.searchParams.set("embed", "image.url");

    return url.toString();
}

function resetPreview() {
    previewState = {
        url: null,
        imageUrl: null,
        title: null,
        checked: false,
        error: null
    };

    linkPreview.hidden = true;
    linkPreviewImage.hidden = true;
    linkPreviewImage.removeAttribute("src");

    linkPreviewTitle.textContent = "Превью товара";
    linkPreviewStatus.textContent = "";
    linkPreviewEmoji.textContent = itemEmoji();
}

function itemEmoji() {
    return itemEmojiInput.value.trim() || "🛍️";
}

async function fetchLinkPreview(rawUrl) {
    const productUrl = normalizePurchaseUrl(rawUrl);

    if (!productUrl) {
        resetPreview();
        return null;
    }

    if (previewState.url === productUrl && previewState.checked) {
        return previewState;
    }

    linkPreview.hidden = false;
    linkPreviewImage.hidden = true;
    linkPreviewImage.removeAttribute("src");
    linkPreviewEmoji.textContent = itemEmoji();
    linkPreviewTitle.textContent = "Получаю превью...";
    linkPreviewStatus.textContent = "Проверяю страницу магазина";

    previewState = {
        url: productUrl,
        imageUrl: null,
        title: null,
        checked: false,
        error: null
    };

    const apiUrl = new URL(MICROLINK_API);
    apiUrl.searchParams.set("url", productUrl);

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`Сервис превью ответил: HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.status !== "success" || !result.data) {
            throw new Error("Сервис не смог получить превью этой страницы.");
        }

        const data = result.data;
        const imageUrl = data.image?.url
            ? createImageProxyUrl(productUrl)
            : null;

        previewState = {
            url: productUrl,
            imageUrl,
            title: data.title || null,
            checked: true,
            error: null
        };

        linkPreviewTitle.textContent =
            data.title || "Превью товара";

        linkPreviewEmoji.textContent = itemEmoji();

        if (imageUrl) {
            linkPreviewImage.crossOrigin = "anonymous";
            linkPreviewImage.alt = data.title || "Превью товара";

            linkPreviewImage.onload = () => {
                linkPreviewImage.hidden = false;
                linkPreviewEmoji.hidden = true;
            };

            linkPreviewImage.onerror = () => {
                linkPreviewImage.hidden = true;
                linkPreviewEmoji.hidden = false;
                linkPreviewStatus.textContent =
                    "Изображение не открылось. Сохраним эмодзи.";
            };

            linkPreviewImage.src = imageUrl;
            linkPreviewStatus.textContent =
                "Изображение найдено. Оно появится на карточке.";
        } else {
            linkPreviewEmoji.hidden = false;
            linkPreviewStatus.textContent =
                "У сайта нет доступного превью. Будет отображаться эмодзи.";
        }

        return previewState;
    } catch (error) {
        console.error("Ошибка получения превью:", error);

        previewState = {
            url: productUrl,
            imageUrl: null,
            title: null,
            checked: true,
            error: error.message
        };

        linkPreviewImage.hidden = true;
        linkPreviewEmoji.hidden = false;
        linkPreviewTitle.textContent = "Не удалось получить превью";
        linkPreviewStatus.textContent =
            "Ссылка сохранится, а вместо изображения будет эмодзи.";

        return previewState;
    }
}

function rankName(rank) {
    return {
        S: "S — максимальный приоритет",
        A: "A — очень важно",
        B: "B — средний приоритет",
        C: "C — можно подождать",
        D: "D — низкий приоритет"
    }[rank] || rank;
}

function formatDate(value) {
    return new Date(value).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function pluralizeItems(count) {
    const lastTwo = count % 100;
    const last = count % 10;

    let word = "хотелок";

    if (lastTwo < 11 || lastTwo > 14) {
        if (last === 1) word = "хотелка";
        else if (last >= 2 && last <= 4) word = "хотелки";
    }

    return `${count} ${word}`;
}

async function loadData() {
    showStatus("Синхронизирую с облаком...");

    const [itemsResult, activityResult] = await Promise.all([
        supabaseClient
            .from("wishlist_items")
            .select(
                "id, tier_list_id, title, description, emoji, purchase_url, preview_image_url, rank, position, created_by, created_at, updated_at, purchased"
            )
            .eq("tier_list_id", tierListId)
            .eq("purchased", false)
            .order("position", { ascending: true })
            .order("created_at", { ascending: true }),

        supabaseClient
            .from("tier_list_activity")
            .select(
                "id, item_title, action_type, actor_name, details, created_at"
            )
            .eq("tier_list_id", tierListId)
            .order("created_at", { ascending: false })
            .limit(30)
    ]);

    if (itemsResult.error) throw itemsResult.error;
    if (activityResult.error) throw activityResult.error;

    state.items = itemsResult.data || [];
    state.activity = activityResult.data || [];

    renderBoard();
    renderActivity();

    showStatus("Все изменения сохранены в облаке.");
}

function renderBoard() {
    document.querySelectorAll(".tier-items").forEach((zone) => {
        zone.replaceChildren();

        const rank = zone.dataset.rank;
        const items = state.items.filter((item) => item.rank === rank);

        if (items.length === 0) {
            zone.append(
                el("span", "tier-empty-hint", "Перетащите хотелку сюда")
            );
        }

        items.forEach((item) => {
            const card = el("div", "tier-item");
            card.dataset.id = item.id;
            card.draggable = true;
            card.tabIndex = 0;
            card.setAttribute("role", "button");
            card.setAttribute("aria-label", `${item.title}. Подробности`);

            let wasDragged = false;

            const media = el("div", "tier-item-media");
            const image = el("img");
            const emoji = el(
                "span",
                item.preview_image_url
                    ? "tier-item-emoji has-image"
                    : "tier-item-emoji",
                item.emoji || "🛍️"
            );

            image.alt = item.title;
            image.crossOrigin = "anonymous";
            image.hidden = !item.preview_image_url;

            image.onerror = () => {
                image.hidden = true;
                emoji.classList.remove("has-image");
            };

            image.onload = () => {
                image.hidden = false;
                emoji.classList.add("has-image");
            };

            media.append(image, emoji);

            if (item.preview_image_url) {
                image.src = item.preview_image_url;
            }

            const info = el("div", "tier-item-info");
            const title = el("strong", "tier-item-title", item.title);
            const description = el(
                "span",
                "tier-item-description",
                item.description || "Описание не добавлено"
            );

            info.append(title, description);
            card.append(media, info);

            card.addEventListener("click", () => {
                if (!wasDragged) openDetails(item.id);
            });

            card.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openDetails(item.id);
                }
            });

            card.addEventListener("dragstart", (event) => {
                wasDragged = true;
                draggedItemId = item.id;

                card.classList.add("is-dragging");
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", item.id);
            });

            card.addEventListener("dragend", () => {
                card.classList.remove("is-dragging");

                document.querySelectorAll(".tier-items").forEach((zone) => {
                    zone.classList.remove("drag-over");
                });

                setTimeout(() => {
                    wasDragged = false;
                    draggedItemId = null;
                }, 200);
            });

            zone.append(card);
        });
    });

    itemCount.textContent = pluralizeItems(state.items.length);
}

function renderActivity() {
    activityList.replaceChildren();

    if (state.activity.length === 0) {
        activityList.append(
            el("p", "empty-activity", "Здесь появятся ваши действия.")
        );
        return;
    }

    state.activity.forEach((entry) => {
        const row = el("div", "activity-entry");
        const dot = el("span", "activity-dot");
        const content = el("div", "activity-content");
        const text = el("p", "activity-text");
        const time = el("time", "activity-time");

        const details = entry.details || {};
        const itemTitle = `«${entry.item_title}»`;

        const messages = {
            added: `добавил(а) ${itemTitle} в ранг ${details.rank || ""}`,
            moved: `переместил(а) ${itemTitle}: ${details.from_rank || "?"} → ${details.to_rank || "?"}`,
            updated: `изменил(а) ${itemTitle}`,
            purchased: `отметил(а) ${itemTitle} купленной`,
            reopened: `вернул(а) ${itemTitle} в список`,
            deleted: `удалил(а) ${itemTitle}`
        };

        text.textContent =
            `${entry.actor_name || "Участник"} ${messages[entry.action_type] || `изменил(а) ${itemTitle}`}.`;

        time.dateTime = entry.created_at;
        time.textContent = formatDate(entry.created_at);

        content.append(text, time);
        row.append(dot, content);
        activityList.append(row);
    });
}

function openItemModal() {
    itemForm.reset();
    itemRankInput.value = "B";
    itemEmojiInput.value = "🛍️";

    showFormMessage(itemFormMessage, "");
    resetPreview();

    itemModal.hidden = false;
    itemTitleInput.focus();
}

function closeItemModal() {
    itemModal.hidden = true;
    itemForm.reset();
    resetPreview();
}

async function openDetails(id) {
    const item = state.items.find((entry) => entry.id === id);

    if (!item) return;

    selectedItemId = id;

    detailsTitle.textContent = item.title;
    detailsDescription.textContent =
        item.description || "Описание не добавлено.";
    detailsRank.textContent = rankName(item.rank);

    detailsEmoji.textContent = item.emoji || "🛍️";
    detailsEmoji.hidden = Boolean(item.preview_image_url);

    detailsImage.hidden = true;
    detailsImage.removeAttribute("src");
    detailsMessage.textContent = "";

    detailsPurchaseLink.hidden = !item.purchase_url;

    if (item.purchase_url) {
        detailsPurchaseLink.href = item.purchase_url;
    } else {
        detailsPurchaseLink.removeAttribute("href");
    }

    detailsModal.hidden = false;

    if (item.preview_image_url) {
        detailsImage.crossOrigin = "anonymous";
        detailsImage.alt = item.title;

        detailsImage.onload = () => {
            if (selectedItemId !== id) return;
            detailsImage.hidden = false;
            detailsEmoji.hidden = true;
        };

        detailsImage.onerror = () => {
            detailsImage.hidden = true;
            detailsEmoji.hidden = false;
        };

        detailsImage.src = item.preview_image_url;
    }
}

function closeDetailsModal() {
    detailsModal.hidden = true;
    selectedItemId = null;
}

document.querySelectorAll(".tier-items").forEach((zone) => {
    zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("drag-over");
        event.dataTransfer.dropEffect = "move";
    });

    zone.addEventListener("dragleave", (event) => {
        if (!zone.contains(event.relatedTarget)) {
            zone.classList.remove("drag-over");
        }
    });

    zone.addEventListener("drop", async (event) => {
        event.preventDefault();
        zone.classList.remove("drag-over");

        const id = event.dataTransfer.getData("text/plain") || draggedItemId;
        const item = state.items.find((entry) => entry.id === id);
        const targetRank = zone.dataset.rank;

        if (!item || item.rank === targetRank) return;

        const sourceRank = item.rank;
        const targetItems = state.items.filter(
            (entry) => entry.rank === targetRank
        );

        const position = targetItems.length
            ? Math.max(...targetItems.map((entry) => entry.position || 0)) + 1
            : 0;

        showStatus("Сохраняю новый ранг...");

        const { error } = await supabaseClient
            .from("wishlist_items")
            .update({ rank: targetRank, position })
            .eq("id", id)
            .eq("tier_list_id", tierListId);

        if (error) {
            showStatus(error.message, true);
            return;
        }

        await loadData();
    });
});

addItemButton.addEventListener("click", openItemModal);
closeItemModalButton.addEventListener("click", closeItemModal);

itemModal.addEventListener("click", (event) => {
    if (event.target === itemModal) closeItemModal();
});

itemEmojiInput.addEventListener("input", () => {
    linkPreviewEmoji.textContent = itemEmoji();
});

purchaseUrlInput.addEventListener("change", async () => {
    const value = purchaseUrlInput.value.trim();

    if (!value) {
        resetPreview();
        return;
    }

    try {
        await fetchLinkPreview(value);
    } catch (error) {
        showFormMessage(itemFormMessage, error.message, true);
    }
});

itemForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = itemTitleInput.value.trim();
    const description = itemDescriptionInput.value.trim();
    const emoji = itemEmoji();
    const rank = itemRankInput.value;

    let purchaseUrl = null;

    try {
        purchaseUrl = normalizePurchaseUrl(purchaseUrlInput.value);
    } catch (error) {
        showFormMessage(itemFormMessage, error.message, true);
        return;
    }

    saveItemButton.disabled = true;

    let previewImageUrl = null;

    if (purchaseUrl) {
        const preview = await fetchLinkPreview(purchaseUrl).catch((error) => {
            console.error(error);
            return null;
        });

        previewImageUrl = preview?.imageUrl || null;
    }

    showFormMessage(
        itemFormMessage,
        "Сохраняю хотелку..."
    );

    try {
        const rankItems = state.items.filter((item) => item.rank === rank);
        const position = rankItems.length
            ? Math.max(...rankItems.map((item) => item.position || 0)) + 1
            : 0;

        const { error } = await supabaseClient
            .from("wishlist_items")
            .insert({
                tier_list_id: tierListId,
                title,
                description,
                emoji,
                purchase_url: purchaseUrl,
                preview_image_url: previewImageUrl,
                rank,
                position
            });

        if (error) throw error;

        closeItemModal();
        await loadData();
    } catch (error) {
        console.error("Ошибка добавления хотелки:", error);

        showFormMessage(
            itemFormMessage,
            error.message || "Не удалось сохранить хотелку.",
            true
        );
    } finally {
        saveItemButton.disabled = false;
    }
});

closeDetailsModalButton.addEventListener("click", closeDetailsModal);

detailsModal.addEventListener("click", (event) => {
    if (event.target === detailsModal) closeDetailsModal();
});

purchaseButton.addEventListener("click", async () => {
    const item = state.items.find((entry) => entry.id === selectedItemId);

    if (!item) return;

    purchaseButton.disabled = true;
    showFormMessage(detailsMessage, "Сохраняю покупку...");

    try {
        const { error } = await supabaseClient
            .from("wishlist_items")
            .update({ purchased: true })
            .eq("id", item.id)
            .eq("tier_list_id", tierListId);

        if (error) throw error;

        closeDetailsModal();
        await loadData();
    } catch (error) {
        showFormMessage(detailsMessage, error.message, true);
    } finally {
        purchaseButton.disabled = false;
    }
});


deleteButton.addEventListener("click", async () => {
    const item = state.items.find(
        (entry) => entry.id === selectedItemId
    );

    if (!item) {
        showFormMessage(
            detailsMessage,
            "Не удалось найти хотелку. Закрой окно и открой её заново.",
            true
        );
        return;
    }

    if (!confirm(`Точно удалить «${item.title}»?`)) {
        return;
    }

    deleteButton.disabled = true;
    showFormMessage(detailsMessage, "Удаляю хотелку...");

    try {
        const { data, error } = await supabaseClient
            .from("wishlist_items")
            .delete()
            .eq("id", item.id)
            .eq("tier_list_id", tierListId)
            .select("id");

        if (error) {
            throw error;
        }

        // Supabase мог не удалить ничего из-за RLS.
        if (!data || data.length === 0) {
            throw new Error(
                "Запись не удалена. Проверь права DELETE и SELECT в Supabase."
            );
        }

        selectedItemId = null;
        detailsModal.hidden = true;

        await loadData();

        showStatus(`Хотелка «${item.title}» удалена.`);
    } catch (error) {
        console.error("Ошибка удаления хотелки:", error);

        showFormMessage(
            detailsMessage,
            error.message || "Не удалось удалить хотелку.",
            true
        );
    } finally {
        deleteButton.disabled = false;
    }
});


exportButton.addEventListener("click", async () => {
    if (!window.htmlToImage) {
        showStatus("Не загрузилась библиотека экспорта PNG.", true);
        return;
    }

    exportButton.disabled = true;
    exportButton.textContent = "Готовлю изображение...";

    try {
        const images = [...board.querySelectorAll("img")].filter(
            (image) => !image.hidden
        );

        await Promise.all(
            images.map((image) =>
                image.decode().catch(() => undefined)
            )
        );

        const dataUrl = await window.htmlToImage.toPng(board, {
            backgroundColor: "#141416",
            pixelRatio: 2,
            cacheBust: true
        });

        const link = document.createElement("a");

        link.download =
            `${currentTierList.name.replace(/[\\/:*?"<>|]/g, "_")}.png`;

        link.href = dataUrl;
        link.click();

        showStatus("Тир-лист экспортирован в PNG.");
    } catch (error) {
        console.error("Ошибка экспорта:", error);
        showStatus(
            "Не удалось создать PNG. Попробуй ещё раз.",
            true
        );
    } finally {
        exportButton.disabled = false;
        exportButton.textContent = "↓ Скачать PNG";
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeItemModal();
        closeDetailsModal();
    }
});

function addExportTitle() {
    if (board.querySelector(".tier-board-title")) return;

    const titleBlock = el("div", "tier-board-title");

    titleBlock.append(
        el("span", "tier-board-brand", "НХ."),
        el("h2", "", currentTierList.name),
        el("p", "", currentFamily.name.toUpperCase())
    );

    board.prepend(titleBlock);
}

async function initialize() {
    if (
        !window.supabase ||
        !SUPABASE_URL.startsWith("https://") ||
        SUPABASE_URL.includes("ВСТАВЬ") ||
        SUPABASE_PUBLISHABLE_KEY.includes("ВСТАВЬ")
    ) {
        showStatus("Проверь URL и Publishable key в tier-list.js.", true);
        return;
    }

    if (!familyId || !tierListId) {
        window.location.replace("families.html");
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

    const { data: list, error: listError } = await supabaseClient
        .from("tier_lists")
        .select("id, family_id, name")
        .eq("id", tierListId)
        .eq("family_id", familyId)
        .single();

    if (listError) throw listError;

    const { data: family, error: familyError } = await supabaseClient
        .from("families")
        .select("id, name")
        .eq("id", familyId)
        .single();

    if (familyError) throw familyError;

    currentTierList = list;
    currentFamily = family;

    tierTitle.textContent = `${list.name}.`;
    document.title = `${list.name} — ${family.name}`;

    const backLink = document.querySelector(".back-link");

    if (backLink) {
        backLink.href =
            `family.html?familyId=${encodeURIComponent(familyId)}`;

        backLink.textContent = "← К тир-листам семьи";
    }

    addExportTitle();
    await loadData();
}

resetPreview();

initialize().catch((error) => {
    console.error("Ошибка инициализации тир-листа:", error);

    showStatus(
        error.message || "Не удалось загрузить тир-лист.",
        true
    );
});
