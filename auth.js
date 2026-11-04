document.addEventListener("DOMContentLoaded", async () => {
  const db = window.supabaseClient;
  const $ = (id) => document.getElementById(id);
  const loginForm = $("loginForm");
  const registerForm = $("registerForm");
  if (!loginForm || !registerForm || !db) return;

  const message = $("message");
  const loginPanel = $("loginPanel");
  const registerPanel = $("registerPanel");

  function setMessage(text, kind = "") {
    message.className = "form-message" + (kind ? " " + kind : "");
    message.textContent = text;
  }
  function showPanel(panel) {
    loginPanel.hidden = panel !== "login";
    registerPanel.hidden = panel !== "register";
    setMessage("");
  }
  $("showRegister").addEventListener("click", () => showPanel("register"));
  $("showLogin").addEventListener("click", () => showPanel("login"));

  const { data, error: sessionError } = await db.auth.getSession();
  if (!sessionError && data.session) {
    window.location.replace("dashboard.html");
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = loginForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Memeriksa akun...";
    setMessage("Sedang memproses login...");
    try {
      const { error } = await db.auth.signInWithPassword({
        email: $("email").value.trim(),
        password: $("password").value
      });
      if (error) throw error;
      setMessage("Login berhasil. Mengalihkan...", "success");
      window.location.replace("dashboard.html");
    } catch (error) {
      setMessage("Login gagal: " + (error.message || "Periksa email dan password."), "error");
      submit.disabled = false;
      submit.innerHTML = 'Masuk <span>→</span>';
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = registerForm.querySelector('button[type="submit"]');
    const nama = $("registerName").value.trim();
    const email = $("registerEmail").value.trim();
    const password = $("registerPassword").value;
    const confirmation = $("confirmPassword").value;

    if (nama.length < 2) return setMessage("Nama lengkap minimal 2 karakter.", "error");
    if (password.length < 8) return setMessage("Password minimal 8 karakter.", "error");
    if (password !== confirmation) return setMessage("Konfirmasi password tidak sama.", "error");

    submit.disabled = true;
    submit.textContent = "Mendaftarkan...";
    setMessage("Sedang membuat akun...");
    try {
      const { data: signUpData, error } = await db.auth.signUp({
        email,
        password,
        options: { data: { nama } }
      });
      if (error) throw error;

      registerForm.reset();
      if (signUpData.session) {
        setMessage("Akun berhasil dibuat. Mengalihkan ke dashboard...", "success");
        window.location.replace("dashboard.html");
      } else {
        setMessage("Pendaftaran berhasil. Silakan periksa email untuk verifikasi akun sebelum login.", "success");
      }
    } catch (error) {
      setMessage("Pendaftaran gagal: " + (error.message || "Silakan coba kembali."), "error");
    } finally {
      submit.disabled = false;
      submit.innerHTML = 'Daftar akun <span>→</span>';
    }
  });
});
