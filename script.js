/**
 * PT Sismadi Langit Solusi - Core Engine (Refactored)
 * Build: 2026-04-19 | Focus: Consistency, DRY, & Sub-folder Scalability
 */

const web = {
    // Definisi rute yang dipetakan ke fungsi resolusi khusus atau langsung ke data pages
    routes: {
        cert: 'resolveCertificate',
        learn: 'resolveLearningModule',
        exam: 'exam',
        order: 'order'
        // Rute lain (press, expertise, solutions) ditangani secara otomatis oleh resolveContent
    },

    gebi: (id) => document.getElementById(id),

    navigate: function(slug) {
        const queryString = window.location.search.substring(1);
        const currentPath = slug || queryString || 'home';
        const [targetSlug, subParam] = currentPath.split('/');

        let pageData = [];
        const resolverName = this.routes[targetSlug];

        // Konsistensi: Gunakan resolver khusus jika ada, jika tidak gunakan resolveContent (Generic)
        if (typeof this[resolverName] === 'function') {
            pageData = this[resolverName](subParam);
        } else {
            pageData = this.resolveContent(targetSlug, subParam);
        }

        ui.render('content', pageData);

        // Update State & UI
        if (slug !== undefined) {
            window.history.pushState({ path: currentPath }, '', `?${currentPath}`);
        }
        document.title = `DonatJS | ${targetSlug.toUpperCase()}`;
        window.scrollTo(0, 0);
        if (typeof svg?.di === 'function') svg.di();

        // Close mobile nav if active
        web.gebi('navLinks')?.classList.remove('active');
        return false;
    },

    /**
     * Resolver Generik untuk Article & Sub-folders (Skalabilitas)
     * Menangani: ?press, ?press/buku01, ?solutions, dll.
     */
    resolveContent: function(category, subId) {
        const fullData = pages[category] || pages['home'];
        if (!subId || !Array.isArray(fullData)) return fullData;

        // Mencari item dengan ID spesifik dalam array kategori (misal: id: 'buku01')
        const subContent = fullData.find(item => item.id === subId);
        return subContent ? [subContent] : fullData;
    },

    resolveCertificate: function(id) {
        const data = (id && pages.certificates) ? pages.certificates[id] : null;
        return data
            ? [{ section: 'certificate', id, ...data }]
            : [{ section: 'titleHero', title: 'Sertifikat Tidak Ditemukan' }];
    },

    resolveLearningModule: function(id) {
        const data = pages.learn || {};
        const categories = data.categories || [];
        // Default ke item pertama jika sub-id kosong
        let activeId = id || (categories[0]?.items[0]?.id);
        const exists = categories.some(cat => cat.items.some(i => i.id === activeId));

        return [
            { section: 'titleHero', title: exists ? 'Learning Module' : 'Modul Tidak Ditemukan' },
            { section: 'learningModule', activeId, data }
        ];
    },

    evaluateQuiz: function(form, questions) {
        const score = questions.reduce((acc, q, idx) => {
            const selected = form.querySelector(`input[name="q${idx}"]:checked`);
            return (selected && btoa(selected.value) === q.ans) ? acc + 1 : acc;
        }, 0);
        const finalScore = (score / questions.length) * 100;
        alert(`Ujian Selesai!\nSkor Anda: ${finalScore.toFixed(2)}`);
        this.navigate('home');
    }
};

// Fungsi untuk mengubah **teks** menjadi <strong>teks</strong>
const formatText = (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

const components = {


    /**
     * lineRenderer: Mengubah array string menjadi HTML (Modular & DRY)
     */
    lineRenderer: (lines = [], context = {}) => {
        const data = Array.isArray(lines) ? lines : [];

        const handlers = {
            'form:validate-cert': () => `
                <div class="card-input">
                    <p>Masukkan nomor kredensial:</p>
                    <input type="text" id="cert-input" placeholder="SLS-2026-XXX" style="width:200px">
                    <button class="slcBtn" onclick="const v = web.gebi('cert-input').value; v ? web.navigate('cert/'+v) : alert('Isi Kode!')">Verifikasi</button>
                </div>`,
            'form:quiz': () => components.quizEngine(context),
            'form:': () => components.genericForm(context),
            // Link Helper: mempermudah navigasi subfolder di dalam dataset
            'link:': (val) => {
                const [text, target] = val.split(':');
                return `<a href="javascript:void(0)" onclick="web.navigate('${target}')" class="inline-link">${text} &raquo;</a>`;
            },
            'skill:': (val) => {
                const [percent, label, text] = val.split(':');
                return `<div class="skill-item">
                            <div class="skill-info"><strong>${label}</strong> ${text || ''} <small>(${percent})</small></div>
                            <div class="skill-track"><div class="skill-fill" style="width:${percent}"></div></div>
                        </div>`;
            },
            'step:': (val) => {
                const [time, title, desc] = val.split(':');
                return `<div class="tl-item">
                            <div class="tl-year">${time}</div>
                            <div class="tl-title"><strong>${title}</strong></div>
                            <div class="tl-desc">${desc || ''}</div>
                        </div>`;
            },
            'card:': (val) => {
                const [title, content] = val.split(':');
                return `<div class="info-card"><strong>${title}</strong><p>${content}</p></div>`;
            },
            'table:': (val) => {
                let dataTable = context.table;
                if (val) { try { dataTable = JSON.parse(val); } catch(e) { console.error("Table Error"); } }
                if (!dataTable?.length) return '';
                const keys = Object.keys(dataTable[0]);
                return `<div class="table-container"><table>
                    <thead><tr>${keys.map(k => `<th>${k.toUpperCase()}</th>`).join('')}</tr></thead>
                    <tbody>${dataTable.map(row => `<tr>${keys.map(k => `<td>${row[k]}</td>`).join('')}</tr>`).join('')}</tbody>
                </table></div>`;
            },
            'contact:': (val) => {
                const [icon, label, info, link] = val.split(':');
                return `<div class="contact-item"><i class="${icon} img-32"></i><strong>${label}</strong><br>${link ? `<a href="${link}" target="_blank">${info}</a>` : info}</div>`;
            },
            'badge:': (val) => `<span class="badge">${val}</span>`,
            '### ': (val) => `<h3>${val}</h3>`,
            '## ': (val) => `<h2>${val}</h2>`,
            '---': () => '<hr>'
        };

        return data.map(line => {
            let html = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            for (const [key, handler] of Object.entries(handlers)) {
                if (html.startsWith(key)) return handler(html.replace(key, '').trim());
            }
            return `<div>${html}</div>`;
        }).join('');
    },

    genericForm: (ctx) => {
        const fields = (ctx.fields || []).map(f => {
            const label = f.label ? `<div>${f.label}:</div>` : '';
            if (f.type === 'select') return `${label}<select>${(f.options || []).map(o => `<option>${o}</option>`).join('')}</select>`;
            if (f.type === 'textarea') return `${label}<textarea rows="${f.rows || 4}" placeholder="${f.placeholder || ''}"></textarea>`;
            return `${label}<input type="${f.type || 'text'}" placeholder="${f.placeholder || ''}">`;
        }).join('');
        return `<form class="dynamic-form" onsubmit="event.preventDefault(); alert('Pesan Terkirim!');">${fields}<button type="submit" class="slcBtn">${ctx.submitText || 'Kirim'}</button></form>`;
    },

    quizEngine: (ctx) => {
        const randomized = [...(ctx.questions || [])].sort(() => Math.random() - 0.5);
        return `
            <div id="quiz-lock" class="card-input">
                <p><strong>Ujian Terproteksi.</strong> Masukkan sandi:</p>
                <input type="password" id="quiz-pass-input" style="width:200px">
                <button class="slcBtn" onclick="if(web.gebi('quiz-pass-input').value==='${ctx.password}'){web.gebi('quiz-container').classList.remove('hide');web.gebi('quiz-lock').classList.add('hide');}else{alert('Salah!');}">Buka</button>
            </div>
            <form id="quiz-container" class="dynamic-form hide" onsubmit="event.preventDefault(); web.evaluateQuiz(this, ${JSON.stringify(randomized).replace(/"/g, '&quot;')});">
                ${randomized.map((q, i) => `<div class="quiz-box"><p><strong>${i + 1}. ${q.q}</strong></p>${q.options.map(opt => `<label><input type="radio" name="q${i}" value="${opt}" required> ${opt}</label>`).join('')}</div>`).join('')}
                <button type="submit" class="slcBtn">Kirim</button>
            </form>`;
    },

    titleHero: (d) => `<div class="row page"><div class="artikel"><h1>${d.title}</h1></div></div>`,

    hero: (d) => `
        <div class="row page hero">
            <div class="col-2-3 artikel">
                <h1>${d.title}</h1><br><em>${d.tagline}</em> &mdash; ${d.description}<br><br>
                ${(d.badges || []).map(b => `<span class="badge">${b}</span>`).join(' ')}
                <br><br><button class="btn-cta" onclick="web.navigate('${d.cta.link}')">${d.cta.text}</button>
            </div>
            <div class="col-1-3 artikel"><i class="${d.imgClass} img"></i></div>
        </div>`,

        features: (d) => `
    <div class="row gading">
        ${(d.items || []).map(item => `
            <div class="col-1-3 artikel">
                <i class="${item.icon} simg"></i>
                <span class="judul">${formatText(item.title)}</span><br>
                <p>${formatText(item.content)}</p>
                <a href="javascript:void(0)" onclick="web.navigate('${item.linkTarget}')">
                    ${item.linkText}
                </a>
            </div>
        `).join('')}
    </div>`,


    article: (d) => `
        <div class="row page4">
            <div class="col-1-3 artikel">
                ${d.leftCol.subtitle ? `<h2>${d.leftCol.subtitle}</h2><hr>` : ''}
                ${components.lineRenderer(d.leftCol.lines || [], d.leftCol)}
            </div>
            <div class="col-2-3 artikel">
                ${d.rightCol.subtitle ? `<h2>${d.rightCol.subtitle}</h2><hr>` : ''}
                ${components.lineRenderer(d.rightCol.lines || [], d.rightCol)}
            </div>
        </div>`,

    learningModule: (d) => {
        const categories = d.data.categories || [];
        let activeContent = { title: 'Materi', lines: ['Pilih materi di samping.'] };
        categories.forEach(cat => {
            const found = cat.items.find(i => i.id === d.activeId);
            if (found) activeContent = found;
        });

        return `
            <div class="row page4">
                <div class="col-1-3 artikel sidebar">
                    <h3>Daftar Modul</h3><hr>
                    ${categories.map(cat => `
                        <div class="cat-box"><strong>${cat.name}</strong>
                        <ul>${cat.items.map(item => `
                            <li><a href="javascript:void(0)" class="${item.id === d.activeId ? 'active' : ''}"
                            onclick="web.navigate('learn/${item.id}')">${item.title}</a></li>`).join('')}
                        </ul></div>`).join('')}
                </div>
                <div class="col-2-3 artikel content">
                    <h2>${activeContent.title}</h2><hr>
                    <div class="module-body">${components.lineRenderer(activeContent.lines || [], activeContent)}</div>
                </div>
            </div>`;
    },

    certificate: (d) => `
        <div class="row page"><div class="cert-border">
        <i class="di-sls img-64"></i><h1>SERTIFIKAT HASIL UJIAN</h1><hr>
        <p>Diberikan kepada:</p><h2 class="cert-name">${d.name}</h2>
        <p>Materi: <b>${d.exam}</b></p><div class="cert-score">SKOR: ${d.score}</div>
        <p>Tanggal: ${d.date}</p><small>ID: ${d.id}</small><br><br>
        <button class="slcBtn no-print" onclick="window.print()">Cetak</button></div></div>`
};

const ui = {
    render: (id, dataArray) => {
        const el = web.gebi(id);
        if (el && Array.isArray(dataArray)) {
            el.innerHTML = dataArray.map(d => components[d.section]?.(d) || '').join('');
        }
    }
};

// Event Listeners
window.addEventListener('load', () => web.navigate());
window.addEventListener('popstate', () => web.navigate());

document.addEventListener('click', (e) => {
    const burger = web.gebi('burgerBtn');
    const nav = web.gebi('navLinks');
    if (burger?.contains(e.target)) {
        nav.classList.toggle('active');
        e.stopPropagation();
    } else if (nav?.classList.contains('active') && !nav.contains(e.target)) {
        nav.classList.remove('active');
    }
});

/**
 * Logika Filter Konten:
 * 1. Jika ada subId (misal: 'buku01'), CARI item yang id-nya cocok.
 * 2. Jika tidak ada subId, HANYA tampilkan item yang TIDAK memiliki id.
 */
web.resolveContent = function(category, subId) {
    const fullData = pages[category] || pages['home'];
    if (!Array.isArray(fullData)) return fullData;

    if (subId) {
        // Mode Detail: Cari yang ID-nya pas
        const subContent = fullData.find(item => item.id === subId);
        return subContent ? [subContent] : [{ section: 'titleHero', title: 'Konten Tidak Ditemukan' }];
    } else {
        // Mode Utama: Sembunyikan semua yang punya ID
        return fullData.filter(item => !item.id);
    }
};
