const body = document.body;
const modeRadios = document.querySelectorAll('input[name="colorMode"]');
const fileInput = document.getElementById('fileInput');
const loadButton = document.getElementById('loadButton');
const contentDiv = document.getElementById('content');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const showTextPosts = document.getElementById('showTextPosts');
const showLinkPosts = document.getElementById('showLinkPosts');
const sortBy = document.getElementById('sortBy');
const searchInput = document.getElementById('searchInput');
const fontSizeSelect = document.getElementById('fontSizeSelect');
const lineHeightSelect = document.getElementById('lineHeightSelect');
const postCountDiv = document.getElementById('postCount');
const paginationDiv = document.querySelector('.pagination');

let rawData = [];
let filteredData = [];
let currentPage = 1;
const pageSize = 10;
let lastScrollY = 0;

modeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        body.classList.remove('dark-gray', 'true-black');
        if (radio.checked) {
            if (radio.value === 'dark-gray') body.classList.add('dark-gray');
            if (radio.value === 'true-black') body.classList.add('true-black');
        }
    });
});

fileInput.addEventListener('change', () => {
    loadButton.disabled = !fileInput.files[0];
});

loadButton.addEventListener('click', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const lines = e.target.result.split('\n').filter(line => line.trim());
        rawData = [];
        let skipped = 0;
        for (const line of lines) {
            try {
                rawData.push(JSON.parse(line));
            } catch {
                skipped++;
            }
        }
        contentDiv.innerHTML = skipped > 0 ? `⚠️ Skipped ${skipped} malformed entries.<br><br>` : '';
        applyFilters();
    };
    reader.readAsText(file);
});

function applyFilters() {
    const showText = showTextPosts.checked;
    const showLink = showLinkPosts.checked;
    const query = searchInput.value.toLowerCase();
    filteredData = rawData.filter(item => {
        const isText = ('is_self' in item) ? item.is_self : !!item.selftext;
        const isLink = ('is_self' in item) ? !item.is_self : (!!item.url && !item.selftext);
        const isComment = 'body' in item && !('title' in item);
        const showType = (isText && showText) || (isLink && showLink) || (isComment && showText);
        if (!showType) return false;
        const content = `${item.title || ''} ${item.selftext || ''} ${item.body || ''} ${item.author || ''}`.toLowerCase();
        return content.includes(query);
    });
    applySorting();
    currentPage = 1;
    renderPage(currentPage);
}

function applySorting() {
    const mode = sortBy.value;
    filteredData.sort((a, b) => {
        const lenA = (a.selftext || a.body || '').length;
        const lenB = (b.selftext || b.body || '').length;
        const scoreA = a.score || 0;
        const scoreB = b.score || 0;
        const dateA = a.created_utc || a.created || 0;
        const dateB = b.created_utc || b.created || 0;
        switch (mode) {
            case 'textLength': return lenB - lenA;
            case 'scoreAsc': return scoreA - scoreB;
            case 'scoreDesc': return scoreB - scoreA;
            case 'dateAsc': return dateA - dateB;
            case 'dateDesc': return dateB - dateA;
            default: return 0;
        }
    });
}

function updatePostCount() {
    postCountDiv.textContent = `Showing ${filteredData.length} post${filteredData.length !== 1 ? 's' : ''}`;
}

function renderSinglePost(post) {
    lastScrollY = window.scrollY;
    contentDiv.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'post single-post';
    const dateStr = new Date((post.created_utc || post.created || 0) * 1000).toLocaleString();
    if (post.body && !post.title) {
        div.innerHTML = `
            <p><strong>Author:</strong> ${post.author || 'unknown'}<br>
                <strong>Subreddit:</strong> ${post.subreddit || 'unknown'}<br>
                <strong>Score:</strong> ${post.score ?? 0}<br>
                <strong>Date:</strong> ${dateStr}</p>
            <div><strong>Comment:</strong><br>${post.body}</div>`;
    } else {
        div.innerHTML = `
            <h3>${post.title || '(No Title)'}</h3>
            <p><strong>Author:</strong> ${post.author || 'unknown'}<br>
                <strong>Subreddit:</strong> ${post.subreddit || 'unknown'}<br>
                <strong>Score:</strong> ${post.score ?? 0}<br>
                <strong>Date:</strong> ${dateStr}</p>
            ${(post.is_self !== false || post.selftext)
                ? `<div><strong>Text Post:</strong><br>${post.selftext || '(No content)'}</div>`
                : `<div><strong>Link Post:</strong><br><a href="${post.url || '#'}" target="_blank">${post.url || '(No link)'}</a></div>`}`;
    }

    const backBtn = document.createElement('button');
    backBtn.textContent = '← Back to List';
    backBtn.className = 'back-button';
    backBtn.onclick = () => {
        renderPage(currentPage);
        window.scrollTo(0, lastScrollY);
        paginationDiv.style.display = '';
        postCountDiv.style.display = '';
    };

    contentDiv.appendChild(backBtn);
    contentDiv.appendChild(div);
    paginationDiv.style.display = 'none';
    postCountDiv.style.display = 'none';
}

// Exit blog mode if clicking outside single post content
contentDiv.addEventListener('click', (e) => {
    if (contentDiv.querySelector('.single-post') && !e.target.closest('.single-post') && !e.target.classList.contains('back-button')) {
        renderPage(currentPage);
        window.scrollTo(0, lastScrollY);
        paginationDiv.style.display = '';
        postCountDiv.style.display = '';
    }
});

function renderPage(page) {
    contentDiv.innerHTML = '';
    const start = (page - 1) * pageSize;
    const items = filteredData.slice(start, start + pageSize);
    if (items.length === 0) {
        contentDiv.innerHTML = '<p>No entries to display for current filter.</p>';
    } else {
        items.forEach(post => {
            const div = document.createElement('div');
            div.className = 'post';
            const dateStr = new Date((post.created_utc || post.created || 0) * 1000).toLocaleString();
            if (post.body && !post.title) {
                div.innerHTML = `
                    <p><strong>Author:</strong> ${post.author || 'unknown'}<br>
                        <strong>Subreddit:</strong> ${post.subreddit || 'unknown'}<br>
                        <strong>Score:</strong> ${post.score ?? 0}<br>
                        <strong>Date:</strong> ${dateStr}</p>
                    <div><strong>Comment:</strong><br>${post.body}</div>`;
            } else {
                div.innerHTML = `
                    <h3>${post.title || '(No Title)'}</h3>
                    <p><strong>Author:</strong> ${post.author || 'unknown'}<br>
                        <strong>Subreddit:</strong> ${post.subreddit || 'unknown'}<br>
                        <strong>Score:</strong> ${post.score ?? 0}<br>
                        <strong>Date:</strong> ${dateStr}</p>
                    ${(post.is_self !== false || post.selftext)
                        ? `<div><strong>Text Post:</strong><br>${post.selftext || '(No content)'}</div>`
                        : `<div><strong>Link Post:</strong><br><a href="${post.url || '#'}" target="_blank">${post.url || '(No link)'}</a></div>`}`;
            }

            div.addEventListener('click', () => renderSinglePost(post));
            contentDiv.appendChild(div);
        });
    }

    updatePostCount();

    pageInfo.textContent = `Page ${page}`;
    prevBtn.disabled = page === 1;
    nextBtn.disabled = page * pageSize >= filteredData.length;

    paginationDiv.style.display = '';
    postCountDiv.style.display = '';

    // Apply font size and line height
    contentDiv.style.fontSize = fontSizeSelect.value;
    contentDiv.style.lineHeight = lineHeightSelect.value;
}

prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderPage(currentPage);
    }
});

nextBtn.addEventListener('click', () => {
    if (currentPage * pageSize < filteredData.length) {
        currentPage++;
        renderPage(currentPage);
    }
});

showTextPosts.addEventListener('change', applyFilters);
showLinkPosts.addEventListener('change', applyFilters);
sortBy.addEventListener('change', () => {
    applySorting();
    renderPage(currentPage);
});
searchInput.addEventListener('input', () => {
    applyFilters();
});
fontSizeSelect.addEventListener('change', () => {
    contentDiv.style.fontSize = fontSizeSelect.value;
});
lineHeightSelect.addEventListener('change', () => {
    contentDiv.style.lineHeight = lineHeightSelect.value;
});
