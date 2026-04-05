const translatorsList = document.getElementById('translatorsList');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
let currentFilter = 'all';

const statusTexts = {
    'free': 'Свободен',
    'in_progress': 'В работе',
    'taken': 'Занят',
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
            <a id="modalUrl" href="#" target="_blank" style="color: #8b7355; margin-bottom: 0.5rem; display: inline-block;"></a>
            <div id="modalStatus" class="status"></div>
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

    return div;
}

function renderTranslators(filteredTranslators) {
    translatorsList.innerHTML = '';

    let hasAnySongs = false;

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
            <h2 class="translator-title">${translator.name}</h2>
            <div class="translator-songs">
                ${songCards}
            </div>
        `;

        translatorsList.appendChild(section);
    });

    if (!hasAnySongs) {
        translatorsList.innerHTML = '<p style="text-align: center; color: #888;">Ничего не найдено</p>';
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

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('songModal');
        if (modal) modal.classList.remove('active');
    }
});

createModal();
renderTranslators(translatorsData.translators);
