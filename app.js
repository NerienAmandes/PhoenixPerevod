// ===== Данные =====
let allTranslators = [];
let allSongs = [];

let filters = {
    status: 'all',
    translator: 'all',
    search: ''
};

const statusLabels = {
    free: 'Свободен',
    in_progress: 'В работе',
    taken: 'Бронь',
    done: 'Готов'
};

const statusClass = {
    free: 'status-free',
    in_progress: 'status-progress',
    taken: 'status-booked',
    done: 'status-ready'
};

// ===== Загрузка данных из БД =====
async function loadData() {
    try {
        const res = await fetch('/api/songs');
        if (!res.ok) throw new Error('Ошибка загрузки: ' + res.status);
        const data = await res.json();
        allTranslators = data.translators || [];
        allSongs = [];
        allTranslators.forEach(t => t.songs.forEach(s => allSongs.push({ ...s, translator_id: t.id })));
        buildTranslatorFilters();
        updateStats();
        render();
    } catch (e) {
        console.error(e);
        document.getElementById('translationGroups').innerHTML =
            '<div class="empty-state"><span class="empty-emoji">😿</span><p>Не удалось загрузить данные</p></div>';
    }
}

// ===== Статистика в сайдбаре =====
function plural(n, one, few, many) {
    n = Math.abs(n) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return many;
    if (n1 > 1 && n1 < 5) return few;
    if (n1 === 1) return one;
    return many;
}

function statText(n) {
    return `${n} ${plural(n, 'перевод', 'перевода', 'переводов')}`;
}

function updateStats() {
    const counts = {
        total: allSongs.length,
        free: allSongs.filter(s => s.status === 'free').length,
        in_progress: allSongs.filter(s => s.status === 'in_progress').length,
        taken: allSongs.filter(s => s.status === 'taken').length,
        done: allSongs.filter(s => s.status === 'done').length
    };
    document.getElementById('statTotal').textContent = statText(counts.total);
    document.getElementById('statFree').textContent = statText(counts.free);
    document.getElementById('statProgress').textContent = statText(counts.in_progress);
    document.getElementById('statTaken').textContent = statText(counts.taken);
    document.getElementById('statDone').textContent = statText(counts.done);
}

// ===== Кнопки переводчиков =====
function buildTranslatorFilters() {
    const container = document.getElementById('translatorFilters');
    const allBtn = container.querySelector('[data-translator="all"]');
    container.innerHTML = '';
    container.appendChild(allBtn);
    allTranslators.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'translator-btn';
        btn.dataset.translator = t.id;
        btn.innerHTML = `${escapeHtml(t.name)} <span class="count">${t.songs.length}</span>`;
        btn.onclick = () => setFilter('translator', String(t.id));
        container.appendChild(btn);
    });
}

// ===== Установка фильтра =====
function setFilter(type, value) {
    filters[type] = value;
    if (type === 'status') {
        // Синхронизируем сайдбар и верхние кнопки
        document.querySelectorAll('.sidebar-link').forEach(b => b.classList.toggle('active', b.dataset.status === value));
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.status === value));
    }
    if (type === 'translator') {
        document.querySelectorAll('.translator-btn').forEach(b => b.classList.toggle('active', b.dataset.translator === value));
    }
    render();
}

// ===== Фильтрация =====
function getFilteredSongs() {
    return allSongs.filter(s => {
        if (filters.status !== 'all' && s.status !== filters.status) return false;
        if (filters.translator !== 'all' && String(s.translator_id) !== filters.translator) return false;
        if (filters.search) {
            const q = filters.search.toLowerCase();
            if (!s.title.toLowerCase().includes(q) && !s.artist.toLowerCase().includes(q)) return false;
        }
        return true;
    });
}

// ===== Рендер =====
function render() {
    const filtered = getFilteredSongs();
    const container = document.getElementById('translationGroups');
    const empty = document.getElementById('emptyState');

    if (filtered.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    // Группируем по переводчику с учётом фильтра
    const byTranslator = {};
    filtered.forEach(s => {
        if (!byTranslator[s.translator_id]) byTranslator[s.translator_id] = [];
        byTranslator[s.translator_id].push(s);
    });

    const html = allTranslators
        .filter(t => byTranslator[t.id])
        .map(t => `
            <section class="translation-group">
                <div class="group-header">
                    <h3>${escapeHtml(t.name)}</h3>
                    <span class="item-count">${byTranslator[t.id].length} ${plural(byTranslator[t.id].length, 'песня', 'песни', 'песен')}</span>
                </div>
                <div class="group-items">
                    ${byTranslator[t.id].map((s, i) => `
                        <div class="translation-item" data-song-id="${s.id}">
                            <div class="item-number">${String(i + 1).padStart(2, '0')}</div>
                            <div class="item-info">
                                <h4>${escapeHtml(s.title)}</h4>
                                <p>${escapeHtml(s.artist)}</p>
                            </div>
                            <span class="item-status ${statusClass[s.status] || 'status-free'}">${statusLabels[s.status] || s.status}</span>
                        </div>
                    `).join('')}
                </div>
            </section>
        `).join('');

    container.innerHTML = html;

    // Клик по песне
    container.querySelectorAll('.translation-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.songId, 10);
            openSongModal(id);
        });
    });
}

// ===== Модалка с переводом =====
function openSongModal(songId) {
    const song = allSongs.find(s => s.id === songId);
    if (!song) return;

    const translator = allTranslators.find(t => t.id === song.translator_id);

    document.getElementById('modalTitle').textContent = song.title;
    document.getElementById('modalArtist').textContent = song.artist;
    document.getElementById('modalTranslator').textContent = `Перевод: ${translator ? translator.name : ''}`;

    const statusEl = document.getElementById('modalStatus');
    statusEl.textContent = statusLabels[song.status] || song.status;
    statusEl.className = 'item-status ' + (statusClass[song.status] || 'status-free');

    const urlEl = document.getElementById('modalUrl');
    if (song.url) {
        urlEl.href = song.url;
        urlEl.style.display = '';
    } else {
        urlEl.style.display = 'none';
    }

    const lyricsEl = document.getElementById('modalLyrics');
    if (song.translation && song.translation.trim()) {
        lyricsEl.innerHTML = formatLyrics(song.translation);
    } else {
        lyricsEl.innerHTML = '<p style="color:var(--text-muted)">Перевод ещё не готов...</p>';
    }

    document.getElementById('songModal').classList.add('active');

    // Сброс кнопки копирования
    const btn = document.getElementById('copyBtn');
    btn.classList.remove('copied');
    btn.querySelector('.copy-text').textContent = 'Скопировать текст';
}

// Форматирование текста перевода (помечаем [Припев], [Куплет] и т.д.)
function formatLyrics(text) {
    const lines = text.split('\n');
    return lines.map(line => {
        const t = line.trim();
        if (!t) return '<div class="lyrics-break"></div>';
        if (/^\[.+\]$/.test(t)) return `<div class="lyrics-section">${escapeHtml(t)}</div>`;
        return `<div>${escapeHtml(line)}</div>`;
    }).join('');
}

function closeSongModal() {
    document.getElementById('songModal').classList.remove('active');
}

// ===== Копирование перевода =====
document.getElementById('copyBtn').addEventListener('click', async () => {
    const songId = parseInt(document.querySelector('.song-modal.active') ?
        document.querySelector('.song-modal.active .modal-content').dataset.songId : '', 10);
    const title = document.getElementById('modalTitle').textContent;
    const artist = document.getElementById('modalArtist').textContent;
    const translator = document.getElementById('modalTranslator').textContent;
    const text = document.getElementById('modalLyrics').innerText;

    const toCopy = `${title} — ${artist}\n${translator}\n\n${text}`;

    try {
        await navigator.clipboard.writeText(toCopy);
    } catch {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = toCopy;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch {}
        document.body.removeChild(ta);
    }

    const btn = document.getElementById('copyBtn');
    btn.classList.add('copied');
    btn.querySelector('.copy-text').textContent = 'Скопировано!';
    setTimeout(() => {
        btn.classList.remove('copied');
        btn.querySelector('.copy-text').textContent = 'Скопировать текст';
    }, 2000);
});

// ===== Обработчики =====
document.getElementById('closeModal').addEventListener('click', closeSongModal);
document.getElementById('songModal').addEventListener('click', (e) => {
    if (e.target.id === 'songModal') closeSongModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSongModal();
});

document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        setFilter('status', link.dataset.status);
    });
});

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => setFilter('status', btn.dataset.status));
});

document.getElementById('searchInput').addEventListener('input', (e) => {
    filters.search = e.target.value;
    render();
});

// ===== Util =====
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
}

// ===== Старт =====
loadData();
