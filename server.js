const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;
const REPO_DIR = __dirname;
const NEWS_JSON_PATH = path.join(REPO_DIR, 'assets', 'data', 'news.json');
const TEMPLATE_PATH = path.join(REPO_DIR, 'assets', 'data', 'article_template.html');
const NOTICIAS_INDEX_PATH = path.join(REPO_DIR, 'noticias', 'index.html');
const SITEMAP_PATH = path.join(REPO_DIR, 'sitemap.xml');

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

// In-memory sessions and csrf tokens
let activeSessionToken = null;
const activeCsrfToken = 'csrf-udc-centinela-news-panel-token';

// In-memory undo/redo history stack
let historyStack = [];
let historyIndex = -1;

// Background publishing queue status
let publishStatus = { state: 'idle', message: 'Sin información', commit: '' };
let gitQueue = [];
let gitProcessing = false;

// MIME types mapping
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

// Initialize news JSON file and history
function initNewsStore() {
  if (!fs.existsSync(NEWS_JSON_PATH)) {
    const parentDir = path.dirname(NEWS_JSON_PATH);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(NEWS_JSON_PATH, JSON.stringify({ items: [] }, null, 2), 'utf8');
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(NEWS_JSON_PATH, 'utf8'));
    historyStack = [JSON.stringify(data.items)];
    historyIndex = 0;
  } catch (error) {
    console.error('Error loading news data:', error);
    historyStack = [JSON.stringify([])];
    historyIndex = 0;
  }
}

// Push a new state of items to the undo/redo stack
function pushHistoryState(items) {
  historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(JSON.stringify(items));
  historyIndex = historyStack.length - 1;
}

// Save news items list to JSON file
function saveNewsStore(items) {
  fs.writeFileSync(NEWS_JSON_PATH, JSON.stringify({ items }, null, 2), 'utf8');
}

// Helper to escape HTML special characters
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Helper to slugify spanish text into ASCII URL-friendly slug
function slugify(text) {
  const from = "áéíóúñÁÉÍÓÚÑüÜ";
  const to   = "aeiounAEIOUNuU";
  let str = text.toString();
  for (let i = 0; i < from.length; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }
  return str.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Helper to estimate reading time
function calculateReadingTime(bodyText) {
  const words = bodyText.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min`;
}

// Convert date (DD/MM/YYYY) to ISO (YYYY-MM-DDT10:00:00)
function dateToISO(dateStr) {
  const parts = String(dateStr).split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}T10:00:00`;
  }
  return new Date().toISOString().split('.')[0];
}

// SSG: Compile static folders, news list and sitemap
function regenerateStaticFiles(items) {
  console.log('Regenerating static files...');
  
  // 1. Compile each article folder
  if (fs.existsSync(TEMPLATE_PATH)) {
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    
    // Track compile paths so we can delete stale directories later
    const activeSlugs = new Set(items.map(item => item.slug));
    
    // We fetch current subfolders under /noticias/ to clean deleted ones
    const noticiasDir = path.join(REPO_DIR, 'noticias');
    if (fs.existsSync(noticiasDir)) {
      const dirs = fs.readdirSync(noticiasDir, { withFileTypes: true });
      for (const d of dirs) {
        if (d.isDirectory() && d.name !== 'admin' && d.name !== 'login' && !activeSlugs.has(d.name)) {
          const pathToDelete = path.join(noticiasDir, d.name);
          try {
            fs.rmSync(pathToDelete, { recursive: true, force: true });
            console.log(`Deleted stale news directory: ${d.name}`);
          } catch (e) {
            console.error(`Failed to delete folder ${d.name}:`, e);
          }
        }
      }
    }
    
    // Write index.html for each active article
    for (const article of items) {
      const bodyHtml = article.body.split(/\n\s*\n/).filter(Boolean)
        .map(p => `<p>${escapeHtml(p)}</p>`)
        .join('\n                ');
        
      const html = template
        .replace(/\{\{TITLE\}\}/g, escapeHtml(article.title))
        .replace(/\{\{TITLE_JSON\}\}/g, JSON.stringify(article.title).slice(1, -1))
        .replace(/\{\{EXCERPT\}\}/g, escapeHtml(article.excerpt))
        .replace(/\{\{EXCERPT_JSON\}\}/g, JSON.stringify(article.excerpt).slice(1, -1))
        .replace(/\{\{CATEGORY\}\}/g, escapeHtml(article.category))
        .replace(/\{\{DATE\}\}/g, escapeHtml(article.date))
        .replace(/\{\{READING\}\}/g, calculateReadingTime(article.body))
        .replace(/\{\{SLUG\}\}/g, article.slug)
        .replace(/\{\{IMAGE\}\}/g, escapeHtml(article.image || '/assets/img/logo-hero.webp'))
        .replace(/\{\{IMAGE_ALT\}\}/g, escapeHtml(article.imageAlt || article.title))
        .replace(/\{\{DATE_ISO\}\}/g, dateToISO(article.date))
        .replace(/\{\{DATE_MODIFIED_ISO\}\}/g, new Date().toISOString().split('.')[0])
        .replace(/\{\{BODY\}\}/g, bodyHtml);
        
      const folderPath = path.join(noticiasDir, article.slug);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      fs.writeFileSync(path.join(folderPath, 'index.html'), html, 'utf8');
      console.log(`Generated: /noticias/${article.slug}/index.html`);
    }
  } else {
    console.warn(`Template not found at ${TEMPLATE_PATH}. Skipping individual article compiles.`);
  }
  
  // 2. Compile Grid in /noticias/index.html
  if (fs.existsSync(NOTICIAS_INDEX_PATH)) {
    let indexHtml = fs.readFileSync(NOTICIAS_INDEX_PATH, 'utf8');
    const startTag = '<!-- NEWS_GRID_START -->';
    const endTag = '<!-- NEWS_GRID_END -->';
    const startIdx = indexHtml.indexOf(startTag);
    const endIdx = indexHtml.indexOf(endTag);
    
    if (startIdx !== -1 && endIdx !== -1) {
      let gridContent = '\n            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">\n';
      
      if (items.length === 0) {
        gridContent += '                <p class="col-span-3 text-center text-gray-400 py-10">No hay noticias publicadas todavía.</p>\n';
      } else {
        items.forEach((news, index) => {
          const featured = index === 0;
          const cardClass = featured
            ? "news-card news-card-anim lg:col-span-2 min-h-[420px] bg-gradient-to-br from-brand-blue/20 via-white/5 to-transparent border border-brand-neon/30 rounded-3xl group hover:-translate-y-1 hover:shadow-neon transition-all duration-300 flex flex-col justify-end overflow-hidden relative"
            : "news-card news-card-anim min-h-[420px] bg-white/5 border border-white/10 rounded-3xl group hover:-translate-y-1 hover:border-brand-neon/40 transition-all duration-300 overflow-hidden relative flex flex-col justify-end";
          
          const imgClass = featured
            ? "absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity"
            : "absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity";
          
          const titleClass = featured ? "text-4xl md:text-5xl" : "text-2xl";
          const imageSrc = news.image || '/assets/img/logo-hero.webp';
          
          gridContent += `
                <a href="/noticias/${news.slug}/" class="${cardClass}">
                    <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(news.imageAlt || news.title)}" class="${imgClass}" loading="lazy">
                    <div class="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/85 to-brand-dark/20"></div>
                    <div class="relative z-10 p-8 md:p-10">
                        <div class="flex flex-wrap items-center gap-3 mb-6">
                            <span class="bg-brand-neon text-brand-dark font-black px-3 py-1 rounded text-xs tracking-widest uppercase">${escapeHtml(news.category || 'Actualidad')}</span>
                            <span class="text-gray-300 text-sm">${escapeHtml(news.date)}</span>
                            <span class="text-gray-500 text-sm">/</span>
                            <span class="text-gray-300 text-sm">${calculateReadingTime(news.body)} lectura</span>
                        </div>
                        <h3 class="news-title font-heading ${titleClass} font-black text-white leading-tight transition-colors mb-5">${escapeHtml(news.title)}</h3>
                        <p class="text-gray-300 leading-relaxed max-w-2xl">${escapeHtml(news.excerpt)}</p>
                        <div class="mt-8 inline-flex items-center text-brand-neon font-bold tracking-widest uppercase text-xs">
                            Leer noticia
                            <svg class="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7-7l7 7-7 7"></path></svg>
                        </div>
                    </div>
                </a>\n`;
        });
      }
      gridContent += '            </div>\n            ';
      
      const before = indexHtml.substring(0, startIdx + startTag.length);
      const after = indexHtml.substring(endIdx);
      fs.writeFileSync(NOTICIAS_INDEX_PATH, before + gridContent + after, 'utf8');
      console.log('Regenerated: /noticias/index.html (news grid updated)');
    }
  } else {
    console.warn(`Noticias index not found at ${NOTICIAS_INDEX_PATH}. Skipping index regeneration.`);
  }

  // 3. Compile /sitemap.xml
  const todayISO = new Date().toISOString().split('T')[0];
  const staticUrls = [
    'https://udcentinela.github.io/',
    'https://udcentinela.github.io/calendario/',
    'https://udcentinela.github.io/historia/',
    'https://udcentinela.github.io/identidad/',
    'https://udcentinela.github.io/legado/',
    'https://udcentinela.github.io/noticias/',
    'https://udcentinela.github.io/regional/',
    'https://udcentinela.github.io/regional/centrocampista-8/',
    'https://udcentinela.github.io/regional/cuerpo-tecnico/',
    'https://udcentinela.github.io/regional/defensa-4/',
    'https://udcentinela.github.io/regional/delantero-9/',
    'https://udcentinela.github.io/regional/iriome/',
    'https://udcentinela.github.io/regional/portero-1/'
  ];
  
  let sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemapXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  for (const url of staticUrls) {
    sitemapXml += '  <url>\n';
    sitemapXml += `    <loc>${url}</loc>\n`;
    sitemapXml += `    <lastmod>${todayISO}</lastmod>\n`;
    sitemapXml += '  </url>\n';
  }
  
  for (const article of items) {
    sitemapXml += '  <url>\n';
    sitemapXml += `    <loc>https://udcentinela.github.io/noticias/${article.slug}/</loc>\n`;
    sitemapXml += `    <lastmod>${todayISO}</lastmod>\n`;
    sitemapXml += '  </url>\n';
  }
  
  sitemapXml += '</urlset>\n';
  fs.writeFileSync(SITEMAP_PATH, sitemapXml, 'utf8');
  console.log('Regenerated: /sitemap.xml');
}

// Background Git push worker queue
function addToGitQueue() {
  gitQueue.push(async () => {
    publishStatus.state = 'publishing';
    publishStatus.message = 'Publicando cambios en GitHub...';
    publishStatus.commit = '';
    
    return new Promise((resolve) => {
      const timestamp = new Date().toLocaleString('es-ES', { timeZone: 'Europe/London' }).split(',')[0];
      const time = new Date().toTimeString().split(' ')[0].substring(0, 5);
      const commitMessage = `Publish news ${timestamp} ${time}`;
      
      console.log(`Running git publishing: "${commitMessage}"`);
      
      exec('git add .', { cwd: REPO_DIR }, (err) => {
        if (err) return resolve({ error: `git add error: ${err.message}` });
        
        exec(`git commit -m "${commitMessage}"`, { cwd: REPO_DIR }, (err) => {
          // Check if nothing to commit (which is clean/fine)
          if (err && !err.message.includes('nothing to commit') && !err.message.includes('nada para hacer commit')) {
            return resolve({ error: `git commit error: ${err.message}` });
          }
          
          exec('git push origin main', { cwd: REPO_DIR }, (err) => {
            if (err) return resolve({ error: `git push error: ${err.message}` });
            
            exec('git rev-parse --short HEAD', { cwd: REPO_DIR }, (err, stdout) => {
              const commitHash = err ? '' : stdout.trim();
              resolve({ commit: commitHash });
            });
          });
        });
      });
    });
  });
  
  processGitQueue();
}

async function processGitQueue() {
  if (gitProcessing || gitQueue.length === 0) return;
  gitProcessing = true;
  publishStatus.state = 'queued';
  publishStatus.message = 'Publicación en cola...';
  
  const task = gitQueue.shift();
  const result = await task();
  
  if (result.error) {
    console.error('Git publish failed:', result.error);
    publishStatus.state = 'error';
    publishStatus.message = result.error;
  } else {
    console.log('Git publish completed successfully. Commit hash:', result.commit);
    publishStatus.state = 'published';
    publishStatus.message = 'Publicación completada con éxito';
    publishStatus.commit = result.commit;
  }
  
  gitProcessing = false;
  processGitQueue();
}

// Session validation helpers
function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name.trim();
    if (!name) return;
    const val = rest.join('=').trim();
    list[name] = decodeURIComponent(val);
  });
  return list;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  return activeSessionToken && cookies.session_token === activeSessionToken;
}

// API router
function handleApiRequest(req, res, url) {
  res.setHeader('Content-Type', 'application/json');
  
  // 1. GET /api/session
  if (url.pathname === '/api/session' && req.method === 'GET') {
    if (isAuthenticated(req)) {
      return res.end(JSON.stringify({ authenticated: true, csrfToken: activeCsrfToken }));
    }
    return res.end(JSON.stringify({ authenticated: false }));
  }
  
  // 2. POST /api/login
  if (url.pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const creds = JSON.parse(body);
        if (creds.username === ADMIN_USER && creds.password === ADMIN_PASS) {
          activeSessionToken = crypto.randomBytes(24).toString('hex');
          // Set session cookie
          res.writeHead(200, {
            'Set-Cookie': `session_token=${activeSessionToken}; Path=/; HttpOnly; SameSite=Lax`,
            'Content-Type': 'application/json'
          });
          return res.end(JSON.stringify({ authenticated: true }));
        }
        res.writeHead(401);
        return res.end(JSON.stringify({ error: 'Usuario o contraseña incorrectos.' }));
      } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'Datos de login no válidos.' }));
      }
    });
    return;
  }
  
  // 3. POST /api/logout
  if (url.pathname === '/api/logout' && req.method === 'POST') {
    activeSessionToken = null;
    res.writeHead(200, {
      'Set-Cookie': 'session_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly',
      'Content-Type': 'application/json'
    });
    return res.end(JSON.stringify({ success: true }));
  }
  
  // 4. GET /api/news
  if (url.pathname === '/api/news' && req.method === 'GET') {
    // Return news from JSON
    try {
      const data = JSON.parse(fs.readFileSync(NEWS_JSON_PATH, 'utf8'));
      return res.end(JSON.stringify({ items: data.items }));
    } catch (e) {
      res.writeHead(500);
      return res.end(JSON.stringify({ error: 'Error al leer la base de datos de noticias.' }));
    }
  }
  
  // Verify auth for any modifying operations
  if (!isAuthenticated(req)) {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: 'Sesión expirada o no autorizada.' }));
  }
  
  // Verify CSRF token
  const clientCsrfToken = req.headers['x-csrf-token'];
  if (clientCsrfToken !== activeCsrfToken) {
    res.writeHead(403);
    return res.end(JSON.stringify({ error: 'Petición rechazada por validación de seguridad (CSRF).' }));
  }
  
  // 5. POST /api/news (Create news)
  if (url.pathname === '/api/news' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const data = JSON.parse(fs.readFileSync(NEWS_JSON_PATH, 'utf8'));
        const items = data.items || [];
        
        const slug = slugify(payload.title);
        // Verify uniqueness
        if (items.some(item => item.slug === slug)) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'Ya existe una noticia con un título similar.' }));
        }
        
        let imagePath = payload.image || '/assets/img/logo-hero.webp';
        
        // Handle physical image upload if base64 provided
        if (payload.imageData && payload.imageName) {
          const matches = payload.imageData.match(/^data:image\/([A-Za-z-+]+);base64,(.+)$/);
          if (matches) {
            const ext = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            const cleanImageName = `${slug}-${Date.now()}.${ext}`;
            const imagesDir = path.join(REPO_DIR, 'assets', 'img', 'news');
            
            if (!fs.existsSync(imagesDir)) {
              fs.mkdirSync(imagesDir, { recursive: true });
            }
            
            fs.writeFileSync(path.join(imagesDir, cleanImageName), buffer);
            imagePath = `/assets/img/news/${cleanImageName}`;
            console.log(`Saved image to ${imagePath}`);
          }
        }
        
        const newItem = {
          slug,
          title: payload.title,
          category: payload.category || 'Actualidad',
          date: payload.date || new Date().toLocaleDateString('es-ES'),
          excerpt: payload.excerpt || '',
          body: payload.body || '',
          image: imagePath,
          imageAlt: payload.imageAlt || payload.title
        };
        
        // Insert at first position
        items.unshift(newItem);
        saveNewsStore(items);
        pushHistoryState(items);
        
        regenerateStaticFiles(items);
        addToGitQueue();
        
        return res.end(JSON.stringify(newItem));
      } catch (e) {
        console.error(e);
        res.writeHead(500);
        return res.end(JSON.stringify({ error: `Error al crear noticia: ${e.message}` }));
      }
    });
    return;
  }
  
  // 6. PUT /api/news/:slug (Edit news)
  if (url.pathname.startsWith('/api/news/') && req.method === 'PUT') {
    const slugParam = decodeURIComponent(url.pathname.split('/').pop());
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const data = JSON.parse(fs.readFileSync(NEWS_JSON_PATH, 'utf8'));
        let items = data.items || [];
        
        const index = items.findIndex(item => item.slug === slugParam);
        if (index === -1) {
          res.writeHead(404);
          return res.end(JSON.stringify({ error: 'La noticia que intentas editar no existe.' }));
        }
        
        let imagePath = payload.image || items[index].image || '/assets/img/logo-hero.webp';
        
        // Handle physical image upload if base64 provided
        if (payload.imageData && payload.imageName) {
          const matches = payload.imageData.match(/^data:image\/([A-Za-z-+]+);base64,(.+)$/);
          if (matches) {
            const ext = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            const cleanImageName = `${slugParam}-${Date.now()}.${ext}`;
            const imagesDir = path.join(REPO_DIR, 'assets', 'img', 'news');
            
            if (!fs.existsSync(imagesDir)) {
              fs.mkdirSync(imagesDir, { recursive: true });
            }
            
            fs.writeFileSync(path.join(imagesDir, cleanImageName), buffer);
            imagePath = `/assets/img/news/${cleanImageName}`;
            console.log(`Saved image to ${imagePath}`);
          }
        }
        
        const updatedItem = {
          slug: slugParam, // Keep the same slug to avoid breaking public links
          title: payload.title,
          category: payload.category || 'Actualidad',
          date: payload.date || items[index].date,
          excerpt: payload.excerpt || '',
          body: payload.body || '',
          image: imagePath,
          imageAlt: payload.imageAlt || payload.title
        };
        
        items[index] = updatedItem;
        saveNewsStore(items);
        pushHistoryState(items);
        
        regenerateStaticFiles(items);
        addToGitQueue();
        
        return res.end(JSON.stringify(updatedItem));
      } catch (e) {
        console.error(e);
        res.writeHead(500);
        return res.end(JSON.stringify({ error: `Error al editar noticia: ${e.message}` }));
      }
    });
    return;
  }
  
  // 7. DELETE /api/news/:slug (Delete news)
  if (url.pathname.startsWith('/api/news/') && req.method === 'DELETE') {
    const slugParam = decodeURIComponent(url.pathname.split('/').pop());
    try {
      const data = JSON.parse(fs.readFileSync(NEWS_JSON_PATH, 'utf8'));
      let items = data.items || [];
      
      const index = items.findIndex(item => item.slug === slugParam);
      if (index === -1) {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: 'La noticia que intentas eliminar no existe.' }));
      }
      
      // Remove folder
      const folderPath = path.join(REPO_DIR, 'noticias', slugParam);
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true });
      }
      
      items.splice(index, 1);
      saveNewsStore(items);
      pushHistoryState(items);
      
      regenerateStaticFiles(items);
      addToGitQueue();
      
      return res.end(JSON.stringify({ success: true }));
    } catch (e) {
      console.error(e);
      res.writeHead(500);
      return res.end(JSON.stringify({ error: `Error al eliminar noticia: ${e.message}` }));
    }
  }
  
  // 8. GET /api/publish-status
  if (url.pathname === '/api/publish-status' && req.method === 'GET') {
    return res.end(JSON.stringify(publishStatus));
  }
  
  // 9. GET /api/history-status
  if (url.pathname === '/api/history-status' && req.method === 'GET') {
    return res.end(JSON.stringify(getHistoryStatus()));
  }
  
  // 10. POST /api/history/undo
  if (url.pathname === '/api/history/undo' && req.method === 'POST') {
    if (historyIndex > 0) {
      historyIndex--;
      const items = JSON.parse(historyStack[historyIndex]);
      saveNewsStore(items);
      regenerateStaticFiles(items);
      addToGitQueue();
      
      return res.end(JSON.stringify({
        items,
        history: getHistoryStatus()
      }));
    }
    res.writeHead(400);
    return res.end(JSON.stringify({ error: 'No hay más cambios para deshacer.' }));
  }
  
  // 11. POST /api/history/redo
  if (url.pathname === '/api/history/redo' && req.method === 'POST') {
    if (historyIndex < historyStack.length - 1) {
      historyIndex++;
      const items = JSON.parse(historyStack[historyIndex]);
      saveNewsStore(items);
      regenerateStaticFiles(items);
      addToGitQueue();
      
      return res.end(JSON.stringify({
        items,
        history: getHistoryStatus()
      }));
    }
    res.writeHead(400);
    return res.end(JSON.stringify({ error: 'No hay más cambios para rehacer.' }));
  }
  
  // Endpoint not found
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Ruta de API no encontrada.' }));
}

// Start Server
initNewsStore();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  console.log(`${req.method} ${url.pathname}`);
  
  // Route to API router
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(req, res, url);
  }
  
  // Resolve static files
  let safePath = path.normalize(url.pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(REPO_DIR, safePath);
  
  // If requesting a directory, look for index.html inside it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  
  // Support URLs without trailing slashes or extensions (e.g. /noticias/login -> /noticias/login/index.html)
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    // Try resolving as a directory with index.html
    const dirWithIndex = path.join(filePath, 'index.html');
    if (fs.existsSync(dirWithIndex)) {
      filePath = dirWithIndex;
    } else {
      // Try resolving as a file with .html extension
      const fileWithHtml = filePath + '.html';
      if (fs.existsSync(fileWithHtml)) {
        filePath = fileWithHtml;
      }
    }
  }
  
  // Serve the file if it exists
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext.toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    
    // Stream the file
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error(err);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end('Error interno del servidor.');
      }
    });
    return stream.pipe(res);
  }
  
  // Serve 404.html if the file doesn't exist
  const path404 = path.join(REPO_DIR, '404.html');
  if (fs.existsSync(path404)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(path404).pipe(res);
  }
  
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Página no encontrada.');
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Servidor local de noticias (CMS) iniciado con éxito.`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Área de Login: http://localhost:${PORT}/noticias/login/`);
  console.log(`Área de Administración: http://localhost:${PORT}/noticias/admin/`);
  console.log(`====================================================`);
});
