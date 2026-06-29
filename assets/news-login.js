(function () {
  async function checkSession() {
    const response = await fetch("/api/session", { cache: "no-store" });
    if (!response.ok) return false;
    const data = await response.json();
    return !!data.authenticated;
  }

  function renderLogin() {
    const section = document.getElementById("noticias");
    if (!section) return;

    section.innerHTML = `
      <div class="absolute top-0 left-0 w-[700px] h-[700px] bg-brand-blue/10 rounded-full blur-[160px] pointer-events-none"></div>
      <div class="absolute bottom-0 right-0 w-[520px] h-[520px] bg-brand-neon/5 rounded-full blur-[130px] pointer-events-none"></div>

      <div class="max-w-xl mx-auto px-6 lg:px-8 relative z-10 pt-10">
        <div class="mb-10 text-center section-header">
          <p class="text-brand-neon font-semibold tracking-widest uppercase text-sm mb-3">Área privada</p>
          <h2 class="font-heading text-4xl md:text-6xl font-black mb-6 uppercase tracking-tight text-white">Login <span class="text-gradient">Noticias</span></h2>
          <p class="text-gray-400 text-lg leading-relaxed">Accede para crear, editar y eliminar publicaciones.</p>
        </div>

        <form id="loginForm" class="bg-white/5 border border-brand-neon/20 rounded-3xl p-6 md:p-8 profile-card shadow-neon">
          <p id="loginMessage" class="hidden mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200"></p>

          <label class="block mb-4">
            <span class="text-xs text-gray-400 font-bold tracking-widest uppercase">Usuario</span>
            <input id="loginUser" autocomplete="username" required class="mt-2 w-full rounded-2xl border border-white/10 bg-brand-dark/80 px-4 py-3 text-white outline-none focus:border-brand-neon" placeholder="admin">
          </label>

          <label class="block mb-6">
            <span class="text-xs text-gray-400 font-bold tracking-widest uppercase">Contraseña</span>
            <input id="loginPassword" type="password" autocomplete="current-password" required class="mt-2 w-full rounded-2xl border border-white/10 bg-brand-dark/80 px-4 py-3 text-white outline-none focus:border-brand-neon" placeholder="Contraseña">
          </label>

          <button type="submit" class="w-full inline-flex items-center justify-center px-6 py-4 text-sm font-black tracking-widest uppercase text-brand-dark bg-brand-neon rounded-full hover:bg-white hover:shadow-neon transition-all duration-300">Entrar</button>

          <a href="/noticias/" class="mt-6 inline-flex w-full items-center justify-center text-xs text-gray-400 font-bold tracking-widest uppercase hover:text-brand-neon">Volver a noticias</a>
        </form>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (await checkSession()) {
      location.href = "/noticias/admin/";
      return;
    }

    renderLogin();

    document.getElementById("loginForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.getElementById("loginMessage");
      message.hidden = true;

      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: document.getElementById("loginUser").value,
          password: document.getElementById("loginPassword").value,
        }),
      });

      if (response.ok) {
        location.href = "/noticias/admin/";
        return;
      }

      const data = await response.json().catch(() => ({}));
      message.textContent = data.error || "Usuario o contraseña incorrectos.";
      message.hidden = false;
    });
  });
})();
