document.addEventListener("DOMContentLoaded", async () => {
  const db = window.supabaseClient;
  const $ = (id) => document.getElementById(id);
  const escapeText = (value) => String(value ?? "");
  const typeNames = {
    surat_masuk: "Surat masuk",
    surat_keluar: "Surat keluar",
    proposal: "Proposal",
    lpj: "LPJ",
    notulen: "Notulen",
    lainnya: "Lainnya",
  };
  const list = $("documentList");
  const uploadForm = $("uploadForm");
  const uploadButton = uploadForm.querySelector('button[type="submit"]');
  let currentUser,
    currentRole = "",
    allDocuments = [];

  if (!db) {
    alert("Konfigurasi Supabase tidak ditemukan.");
    return;
  }
  const { data: sessionData, error: sessionError } = await db.auth.getSession();
  if (sessionError || !sessionData.session) {
    window.location.replace("login.html");
    return;
  }
  currentUser = sessionData.session.user;

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("nama, role")
    .eq("id", currentUser.id)
    .single();
  if (profileError)
    console.warn("Profil tidak dapat dimuat:", profileError.message);
  currentRole = profile?.role || "anggota";
  const displayName =
    profile?.nama?.trim() || currentUser.email?.split("@")[0] || "Pengguna";
  $("userName").textContent = displayName;
  $("welcomeName").textContent = ", " + displayName;
  $("userRole").textContent = currentRole;
  $("avatarInitial").textContent = displayName.charAt(0).toUpperCase();
  $("year").textContent = new Date().getFullYear();

  if (currentRole === "admin") {
    document.querySelectorAll(".admin-only").forEach((el) => {
      el.hidden = false;
    });
    loadMembers();
  }

  function setMessage(element, message, kind = "") {
    element.textContent = message;
    element.className = "form-message" + (kind ? " " + kind : "");
  }
  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(
      value + (String(value).length === 10 ? "T00:00:00" : ""),
    );
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(date);
  }
  function makeCell(text, className) {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = text;
    return cell;
  }
  function renderStats(docs) {
    $("totalDocuments").textContent = docs.length;
    $("incomingDocuments").textContent = docs.filter(
      (d) => d.jenis === "surat_masuk",
    ).length;
    $("outgoingDocuments").textContent = docs.filter(
      (d) => d.jenis === "surat_keluar",
    ).length;
    $("typeCount").textContent = new Set(
      docs.map((d) => d.jenis).filter(Boolean),
    ).size;
  }
  function renderDocuments() {
    const keyword = $("searchInput").value.trim().toLocaleLowerCase("id-ID");
    const selectedType = $("typeFilter").value;
    const filtered = allDocuments.filter((doc) => {
      const matchesText =
        !keyword ||
        [doc.nomor, doc.perihal].some((v) =>
          String(v || "")
            .toLocaleLowerCase("id-ID")
            .includes(keyword),
        );
      return matchesText && (!selectedType || doc.jenis === selectedType);
    });
    list.replaceChildren();
    if (!filtered.length) {
      const row = document.createElement("tr");
      const cell = makeCell(
        allDocuments.length
          ? "Tidak ada dokumen yang cocok dengan pencarian."
          : "Belum ada dokumen yang dapat ditampilkan.",
        "empty-state",
      );
      cell.colSpan = 4;
      row.append(cell);
      list.append(row);
    } else {
      filtered.forEach((doc) => {
        const row = document.createElement("tr");
        const main = document.createElement("td");
        main.className = "doc-main";
        const title = document.createElement("b");
        title.textContent = doc.perihal || "Tanpa perihal";
        const number = document.createElement("small");
        number.textContent = doc.nomor || "Nomor tidak tersedia";
        main.append(title, number);
        const type = document.createElement("td");
        const pill = document.createElement("span");
        pill.className = "type-pill";
        pill.textContent = typeNames[doc.jenis] || doc.jenis || "Lainnya";
        type.append(pill);
        row.append(main, type, makeCell(formatDate(doc.tanggal)));
        const actions = document.createElement("td");
        actions.className = "action-cell";
        const download = document.createElement("button");
        download.className = "table-action";
        download.type = "button";
        download.textContent = "↓ Download";
        download.addEventListener("click", () =>
          downloadDocument(doc, download),
        );
        actions.append(download);
        if (currentRole === "admin" || doc.uploaded_by === currentUser.id) {
          const edit = document.createElement("button");
          edit.className = "table-action subtle-action";
          edit.type = "button";
          edit.textContent = "Edit";
          edit.addEventListener("click", () => editDocument(doc));
          actions.append(edit);
        }
        row.append(actions);
        list.append(row);
      });
    }
    $("documentCount").textContent =
      `${filtered.length} dari ${allDocuments.length} dokumen`;
    renderStats(allDocuments);
  }
  async function loadDocuments() {
    list.innerHTML =
      '<tr><td colspan="4" class="empty-state">Memuat arsip...</td></tr>';
    const { data, error } = await db
      .from("dokumen")
      .select("*")
      .order("tanggal", { ascending: false });
    if (error) {
      console.error(error);
      list.innerHTML = "";
      const row = document.createElement("tr");
      const cell = makeCell(
        "Gagal memuat dokumen: " + error.message,
        "empty-state error",
      );
      cell.colSpan = 4;
      row.append(cell);
      list.append(row);
      return;
    }
    allDocuments = data || [];
    renderDocuments();
  }
  async function downloadDocument(doc, button) {
    if (!doc.file_path) {
      alert("Lokasi file belum tercatat pada data dokumen ini.");
      return;
    }
    button.disabled = true;
    button.textContent = "Menyiapkan...";
    try {
      const { data, error } = await db.storage
        .from("arsip")
        .createSignedUrl(doc.file_path, 60, {
          download: doc.file_name || true,
        });
      if (error) throw error;
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.target = "_blank";
      link.rel = "noopener";
      link.click();
    } catch (error) {
      alert("Download gagal: " + error.message);
    } finally {
      button.disabled = false;
      button.textContent = "↓ Download";
    }
  }
  async function editDocument(doc) {
    const nomor = prompt("Nomor dokumen:", doc.nomor || "");
    if (nomor === null) return;
    const perihal = prompt("Perihal dokumen:", doc.perihal || "");
    if (perihal === null) return;
    const tanggal = prompt("Tanggal dokumen (YYYY-MM-DD):", doc.tanggal || "");
    if (tanggal === null) return;
    if (
      !nomor.trim() ||
      !perihal.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)
    ) {
      alert("Nomor, perihal, dan format tanggal wajib valid.");
      return;
    }
    const { error } = await db
      .from("dokumen")
      .update({ nomor: nomor.trim(), perihal: perihal.trim(), tanggal })
      .eq("id", doc.id);
    if (error) {
      alert("Perubahan gagal disimpan: " + error.message);
      return;
    }
    await loadDocuments();
  }
  async function loadMembers() {
    const body = $("memberList");
    const { data, error } = await db
      .from("profiles")
      .select("id, nama, role, created_at")
      .order("created_at", { ascending: false });
    body.replaceChildren();
    if (error) {
      const row = document.createElement("tr");
      const cell = makeCell(
        "Daftar pengguna tidak dapat dimuat: " + error.message,
        "empty-state error",
      );
      cell.colSpan = 3;
      row.append(cell);
      body.append(row);
      return;
    }
    (data || []).forEach((member) => {
      const row = document.createElement("tr");
      row.append(
        makeCell(member.nama?.trim() || "Nama belum diisi"),
        makeCell(member.role || "—"),
        makeCell(member.id),
      );
      body.append(row);
    });
    if (!data?.length) {
      const row = document.createElement("tr");
      const cell = makeCell("Belum ada profil pengguna.", "empty-state");
      cell.colSpan = 3;
      row.append(cell);
      body.append(row);
    }
  }

  await loadDocuments();
  $("searchInput").addEventListener("input", renderDocuments);
  $("typeFilter").addEventListener("change", renderDocuments);
  $("refreshButton").addEventListener("click", loadDocuments);
  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = $("fileDokumen").files[0];
    if (!file)
      return setMessage(
        $("uploadMessage"),
        "Pilih file terlebih dahulu.",
        "error",
      );
    if (file.size > 5 * 1024 * 1024)
      return setMessage(
        $("uploadMessage"),
        "Ukuran file maksimal 5 MB.",
        "error",
      );
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const extensionAllowed = /\.(pdf|jpe?g|png|docx)$/i.test(file.name);
    if (!allowed.includes(file.type) && !extensionAllowed)
      return setMessage(
        $("uploadMessage"),
        "Format file tidak didukung. Gunakan PDF, JPG, PNG, atau DOCX.",
        "error",
      );
    const payload = {
      nomor: $("nomor").value.trim(),
      perihal: $("perihal").value.trim(),
      jenis: $("jenis").value,
      tanggal: $("tanggal").value,
      akses: $("akses").value,
    };
    if (Object.values(payload).some((v) => !v))
      return setMessage(
        $("uploadMessage"),
        "Semua kolom wajib diisi.",
        "error",
      );
    uploadButton.disabled = true;
    uploadButton.textContent = "Mengunggah...";
    let uploadedPath = null;
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      uploadedPath = `${currentUser.id}/${Date.now()}_${safeName}`;
      const { error: storageError } = await db.storage
        .from("arsip")
        .upload(uploadedPath, file, { cacheControl: "3600", upsert: false });
      if (storageError) throw storageError;
      const { error: insertError } = await db
        .from("dokumen")
        .insert({
          ...payload,
          file_path: uploadedPath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: currentUser.id,
        });
      if (insertError) throw insertError;
      setMessage(
        $("uploadMessage"),
        "Dokumen berhasil diunggah dan disimpan.",
        "success",
      );
      uploadForm.reset();
      await loadDocuments();
    } catch (error) {
      if (uploadedPath) {
        const { error: cleanupError } = await db.storage
          .from("arsip")
          .remove([uploadedPath]);
        if (cleanupError)
          console.error("Pembersihan file gagal:", cleanupError.message);
      }
      setMessage($("uploadMessage"), "Upload gagal: " + error.message, "error");
    } finally {
      uploadButton.disabled = false;
      uploadButton.innerHTML = "Simpan dokumen <span>→</span>";
    }
  });
  $("logoutButton").addEventListener("click", async () => {
    const { error } = await db.auth.signOut();
    if (error) {
      alert("Logout gagal: " + error.message);
      return;
    }
    window.location.replace("login.html");
  });
});
