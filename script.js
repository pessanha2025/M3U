document.addEventListener('DOMContentLoaded', function() {
    // Estado global da aplicação
    const state = {
        currentContent: null,
        contents: {
            tv: [],
            series: [],
            movies: []
        },
        groups: new Set(),
        currentCategory: 'all'
    };

    // Elementos DOM
    const elements = {
        fileInput: document.getElementById('fileInput'),
        fileName: document.getElementById('fileName'),
        contentGrid: document.getElementById('contentGrid'),
        videoPlayer: document.getElementById('videoPlayer'),
        errorMessage: document.getElementById('error-message'),
        playerWrapper: document.querySelector('.player-wrapper'),
        closePlayer: document.getElementById('closePlayer'),
        nowPlaying: document.getElementById('nowPlaying'),
        groupFilter: document.getElementById('groupFilter'),
        tabButtons: document.querySelectorAll('.tab-button')
    };

    // Event Listeners
    elements.fileInput.addEventListener('change', handleFileUpload);
    elements.closePlayer.addEventListener('click', closePlayer);
    elements.groupFilter.addEventListener('change', filterContent);
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', () => switchCategory(button.dataset.category));
    });

    // Carregar playlist salva
    loadPlaylistFromLocalStorage();

    // Funções principais
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            elements.fileName.textContent = file.name;
            const reader = new FileReader();
            reader.onload = e => {
                parseM3U(e.target.result);
                savePlaylistToLocalStorage(e.target.result);
            };
            reader.readAsText(file);
        }
    }

    function parseM3U(contents) {
        const lines = contents.split('\n');
        let currentItem = {};
        state.contents = { tv: [], series: [], movies: [] };
        state.groups = new Set();

        lines.forEach(line => {
            line = line.trim();
            if (line.startsWith('#EXTINF:')) {
                // Parse EXTINF line
                const matches = line.match(/#EXTINF:(?:-1|\d+)\s*(?:tvg-id="([^"]*)")?\s*(?:tvg-name="([^"]*)")?\s*(?:tvg-logo="([^"]*)")?\s*group-title="([^"]*)"?,(.+)/);
                if (matches) {
                    currentItem = {
                        id: matches[1] || '',
                        name: matches[5] || 'Unknown',
                        logo: matches[3] || '',
                        group: matches[4] || 'Uncategorized'
                    };
                    state.groups.add(currentItem.group);
                }
            } else if (line && !line.startsWith('#')) {
                currentItem.url = sanitizeURL(line);
                if (currentItem.url) {
                    categorizeContent(currentItem);
                }
                currentItem = {};
            }
        });

        updateGroupFilter();
        renderContent();
    }

    function categorizeContent(item) {
        const group = item.group.toLowerCase();
        if (group.includes('tv') || group.includes('canal')) {
            state.contents.tv.push(item);
        } else if (group.includes('serie') || group.includes('episodio')) {
            state.contents.series.push(item);
        } else if (group.includes('filme') || group.includes('movie')) {
            state.contents.movies.push(item);
        } else {
            state.contents.tv.push(item); // Default to TV if unknown
        }
    }

    function updateGroupFilter() {
        elements.groupFilter.innerHTML = '<option value="all">Todas as Categorias</option>';
        Array.from(state.groups).sort().forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            elements.groupFilter.appendChild(option);
        });
    }

    function renderContent() {
        elements.contentGrid.innerHTML = '';
        let contentToRender = [];

        if (state.currentCategory === 'all') {
            contentToRender = [
                ...state.contents.tv,
                ...state.contents.series,
                ...state.contents.movies
            ];
        } else {
            contentToRender = state.contents[state.currentCategory] || [];
        }

        const selectedGroup = elements.groupFilter.value;
        if (selectedGroup !== 'all') {
            contentToRender = contentToRender.filter(item => item.group === selectedGroup);
        }

        contentToRender.forEach(item => {
            const element = createContentElement(item);
            elements.contentGrid.appendChild(element);
        });
    }

    function createContentElement(item) {
        const div = document.createElement('div');
        div.className = 'content-item';
        div.innerHTML = `
            <div class="content-thumbnail">
                ${item.logo ? `<img src="${item.logo}" alt="${item.name}">` : ''}
            </div>
            <div class="content-info">
                <div class="content-title">${item.name}</div>
                <div class="content-category">${item.group}</div>
            </div>
        `;
        div.addEventListener('click', () => playContent(item));
        return div;
    }

    function playContent(item) {
        state.currentContent = item;
        elements.nowPlaying.textContent = item.name;
        elements.playerWrapper.style.display = 'block';
        elements.videoPlayer.src = item.url;
        
        const playPromise = elements.videoPlayer.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('Playback Error:', error);
                showError('Erro ao reproduzir conteúdo. Tentando método alternativo...');
                tryAlternativePlayback(item);
            });
        }
    }

    function tryAlternativePlayback(item) {
        // Tenta diferentes formatos de URL
        const alternativeUrls = [
            item.url,
            item.url.replace('http://', 'https://'),
            item.url.replace('.m3u8', '.ts'),
            item.url.replace('.ts', '.m3u8')
        ];

        const tryNextUrl = (urls) => {
            if (urls.length === 0) {
                showError('Não foi possível reproduzir este conteúdo.');
                return;
            }

            const url = urls.shift();
            elements.videoPlayer.src = url;
            const playPromise = elements.videoPlayer.play();

            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    tryNextUrl(urls);
                });
            }
        };

        tryNextUrl([...alternativeUrls]);
    }

    function showError(message) {
        elements.errorMessage.textContent = message;
        elements.errorMessage.style.display = 'block';
        setTimeout(() => {
            elements.errorMessage.style.display = 'none';
        }, 5000);
    }

    function closePlayer() {
        elements.videoPlayer.pause();
        elements.videoPlayer.src = '';
        elements.playerWrapper.style.display = 'none';
        state.currentContent = null;
    }

    function switchCategory(category) {
        state.currentCategory = category;
        elements.tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.category === category);
        });
        renderContent();
    }

    function filterContent() {
        renderContent();
    }

    function sanitizeURL(url) {
        try {
            url = url.trim();
            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('rtmp://')) {
                return url;
            }
            return 'https://' + url;
        } catch (e) {
            console.error('Invalid URL:', url);
            return '';
        }
    }

    function savePlaylistToLocalStorage(contents) {
        try {
            localStorage.setItem('m3uPlaylist', contents);
        } catch (e) {
            console.error('Failed to save playlist:', e);
        }
    }

    function loadPlaylistFromLocalStorage() {
        const contents = localStorage.getItem('m3uPlaylist');
        if (contents) {
            parseM3U(contents);
        }
    }
});
