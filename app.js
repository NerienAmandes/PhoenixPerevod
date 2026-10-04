const translatorsList = document.getElementById('translatorsList');
const searchInput = document.getElementById('searchInput');
const translatorSelect = document.getElementById('translatorSelect');
const filterBtns = document.querySelectorAll('.filter-btn');
let currentFilter = 'all';
let currentTranslator = 'all';

// Заполняем список переводчиков в select
function populateTranslatorSelect() {
    translatorsData.translators.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = `${t.name} (${t.songs.length})`;
        translatorSelect.appendChild(option);
    });
}

populateTranslatorSelect();

const statusTexts = {
    'free': 'Свободен',
    'in_progress': 'В работе',
    'taken': 'Бронь',
    'done': 'Готов'
};

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatTranslation(translation) {
    const normalized = (translation || '').replace(/\r\n?/g, '\n').trim();
    if (!normalized) return '';

    const lines = normalized.split('\n');
    const parts = [];
    let paragraphLines = [];

    const flushParagraph = () => {
        if (paragraphLines.length === 0) return;
        parts.push(
            `<p class="lyrics-paragraph">${paragraphLines.map(line => escapeHtml(line)).join('<br>')}</p>`
        );
        paragraphLines = [];
    };

    lines.forEach(rawLine => {
        const line = rawLine.trim();

        if (!line) {
            flushParagraph();
            parts.push('<div class="lyrics-break"></div>');
            return;
        }

        if (/^\[.*\]$/.test(line)) {
            flushParagraph();
            parts.push(`<p class="lyrics-section">${escapeHtml(line)}</p>`);
            return;
        }

        paragraphLines.push(line);
    });

    flushParagraph();

    return parts.join('');
}

function createModal() {
    const div = document.createElement('div');
    div.id = 'songModal';
    div.className = 'song-modal';
    div.innerHTML = `
        <div class="modal-content">
            <button class="close-btn">&times;</button>
            <h2 id="modalTitle"></h2>
            <p id="modalArtist" class="artist"></p>
            <p id="modalTranslator" class="category"></p>
            <a id="modalUrl" href="#" target="_blank"></a>
            <div id="modalStatus" class="status"></div>
            <button id="copyBtn" class="copy-btn" type="button">
                <span class="icon">📋</span>
                <span class="copy-btn-text">Скопировать текст</span>
            </button>
            <div id="modalLyrics" class="lyrics-content"></div>
        </div>
    `;
    document.body.appendChild(div);

    div.querySelector('.close-btn').addEventListener('click', () => {
        div.classList.remove('active');
    });

    div.addEventListener('click', (e) => {
        if (e.target === div) {
            div.classList.remove('active');
        }
    });

    const copyBtn = div.querySelector('#copyBtn');
    copyBtn.addEventListener('click', async () => {
        const text = div.dataset.translation || '';
        if (!text) return;

        const iconEl = copyBtn.querySelector('.icon');
        const textEl = copyBtn.querySelector('.copy-btn-text');
        const originalIcon = iconEl.textContent;
        const originalText = textEl.textContent;

        let success = false;
        try {
            await navigator.clipboard.writeText(text);
            success = true;
        } catch (e) {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                success = document.execCommand('copy');
                document.body.removeChild(ta);
            } catch (err) {
                success = false;
            }
        }

        if (success) {
            copyBtn.classList.add('copied');
            iconEl.textContent = '✓';
            textEl.textContent = 'Скопировано!';
            setTimeout(() => {
                copyBtn.classList.remove('copied');
                iconEl.textContent = originalIcon;
                textEl.textContent = originalText;
            }, 2000);
        }
    });

    return div;
}

function renderTranslators(filteredTranslators) {
    translatorsList.innerHTML = '';

    let hasAnySongs = false;
    let totalSongs = 0;

    filteredTranslators.forEach(t => totalSongs += t.songs.length);

    if (totalSongs > 0) {
        translatorsList.innerHTML += `<p class="songs-count">Всего переводов: ${totalSongs}</p>`;
    }

    filteredTranslators.forEach(translator => {
        if (translator.songs.length === 0) return;

        hasAnySongs = true;

        const section = document.createElement('div');
        section.className = 'translator-section';

        const songCards = translator.songs.map(song => `
            <div class="song-card" data-song-id="${song.id}">
                <h3>${song.title}</h3>
                <p class="artist">${song.artist}</p>
                <span class="status ${song.status}">${statusTexts[song.status]}</span>
            </div>
        `).join('');

        section.innerHTML = `
            <h2 class="translator-title">${translator.name} (${translator.songs.length})</h2>
            <div class="translator-songs">
                ${songCards}
            </div>
        `;

        translatorsList.appendChild(section);
    });

    if (!hasAnySongs) {
        translatorsList.innerHTML = '<p class="empty-message">Ничего не найдено</p>';
    }

    document.querySelectorAll('.song-card').forEach(card => {
        card.addEventListener('click', () => {
            const songId = parseInt(card.dataset.songId);
            const song = songs.find(s => s.id === songId);
            if (song) openSong(song);
        });
    });
}

function filterData() {
    let filtered = translatorsData.translators.map(t => ({
        ...t,
        songs: t.songs.filter(s => {
            const matchesStatus = currentFilter === 'all' || s.status === currentFilter;
            const matchesSearch = !searchInput.value ||
                s.title.toLowerCase().includes(searchInput.value.toLowerCase()) ||
                s.artist.toLowerCase().includes(searchInput.value.toLowerCase());
            return matchesStatus && matchesSearch;
        })
    }));

    renderTranslators(filtered);
}

function openSong(song) {
    const modalEl = document.getElementById('songModal');
    document.getElementById('modalTitle').textContent = song.title;
    document.getElementById('modalArtist').textContent = song.artist;
    document.getElementById('modalTranslator').textContent = song.translatorName;

    const urlEl = document.getElementById('modalUrl');
    if (song.url) {
        urlEl.href = song.url;
        urlEl.textContent = '🎵 Слушать';
        urlEl.style.display = 'inline-block';
    } else {
        urlEl.style.display = 'none';
    }

    const statusEl = document.getElementById('modalStatus');
    statusEl.className = `status ${song.status}`;
    statusEl.textContent = statusTexts[song.status];

    const lyricsEl = document.getElementById('modalLyrics');
    lyricsEl.innerHTML = formatTranslation(song.translation);
    modalEl.dataset.translation = song.translation || '';

    modalEl.classList.add('active');
}

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        filterData();
    });
});

searchInput.addEventListener('input', filterData);

translatorSelect.addEventListener('change', (e) => {
    currentTranslator = e.target.value;
    filterData();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('songModal');
        if (modal) modal.classList.remove('active');
    }
});

/* ============ THEME SWITCHER ============ */
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle ? themeToggle.querySelector('.theme-icon') : null;

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    themeToggle && themeToggle.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'
    );
}

if (themeToggle) {
    const savedTheme = localStorage.getItem('phoenix-theme') || 'light';
    applyTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('phoenix-theme', next);
    });
}

createModal();
renderTranslators(translatorsData.translators);
