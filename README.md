# ArsipCloud IMPS-I — versi pengembangan

## Prinsip keamanan data
- Paket ini tidak menjalankan DROP, TRUNCATE, DELETE massal, atau reset database.
- `config.js` mempertahankan Supabase URL dan publishable key dari proyek yang diberikan.
- Data `profiles`, `dokumen`, akun Auth, dan file Storage yang sudah ada tidak disentuh saat aplikasi dibuka.
- Tidak ada SQL migrasi yang dijalankan otomatis.

## Cara menjalankan
1. Ekstrak ZIP.
2. Buka folder `arsipcloud-impsi` menggunakan VS Code.
3. Jalankan melalui Live Server atau hosting statis yang mendukung HTTPS.
4. Buka `index.html` atau `login.html`, lalu masuk dengan akun Supabase yang sudah ada.

## Struktur yang digunakan
- `profiles`: `id`, `nama`, `role`, `created_at` (sesuai screenshot Supabase).
- `dokumen`: `id`, `nomor`, `perihal`, `jenis`, `tanggal` terlihat pada screenshot.
- Fitur upload yang sudah ada sebelumnya juga menggunakan kolom `akses`, `file_path`, `file_name`, `file_size`, `mime_type`, `uploaded_by` dan bucket Storage `arsip`. Pastikan kolom tersebut memang tersedia pada tabel sebelum menggunakan upload.

## Catatan kompatibilitas penting
Screenshot yang diberikan hanya memperlihatkan sebagian kolom tabel `dokumen`. Karena itu, kode mempertahankan nama kolom yang dipakai aplikasi awal. Jika kolom metadata file belum ada, upload akan mengembalikan error Supabase; tidak ada perubahan skema otomatis. Fitur edit memperbarui kolom `nomor`, `perihal`, dan `tanggal` saja.

## Hak akses
- Pembatasan data harus tetap ditegakkan oleh Row Level Security (RLS) Supabase, bukan hanya tampilan frontend.
- Menu pengguna hanya ditampilkan untuk profil dengan `role = admin`; daftar profil dibaca sesuai policy RLS yang sudah ada.
- Pembuatan akun Auth dan perubahan role tidak dilakukan dari browser karena memerlukan proses admin/server yang aman dan konfirmasi nilai enum `app_role`.
- Jangan pernah menaruh `service_role` key di `config.js`. Publishable/anon key memang digunakan di frontend bersama RLS.

## Pemeriksaan sebelum produksi
1. Pastikan bucket `arsip` tersedia dan policy Storage mengizinkan operasi sesuai role.
2. Pastikan kolom metadata file di tabel `dokumen` sesuai catatan di atas.
3. Uji login, upload, download, dan edit dengan akun admin serta anggota.
4. Verifikasi policy RLS untuk `profiles` dan `dokumen`.

Tidak ada pengujian koneksi langsung ke proyek Supabase yang dilakukan saat paket ini dibuat. Keberhasilan runtime tetap perlu diverifikasi di lingkungan Supabase milik pemilik proyek.


## Fitur pendaftaran akun
Halaman login sekarang menyediakan formulir pendaftaran yang memanggil `supabase.auth.signUp()` dan menyimpan nama sebagai metadata Auth (`user_metadata.nama`). Pengaturan verifikasi email mengikuti konfigurasi Supabase Auth pada proyek.

**Penting untuk integrasi tabel `profiles`:** pendaftaran Auth tidak otomatis menjamin baris pada tabel `profiles` terbentuk. Agar nama dan role tampil konsisten di dashboard serta daftar anggota, periksa apakah proyek sudah memiliki trigger `auth.users` yang membuat baris `profiles` dengan role default `anggota`. Jika belum ada, konfigurasi trigger/function di Supabase setelah memastikan tipe kolom `role`, nilai enum yang valid, dan kebijakan RLS yang berlaku. Paket ini sengaja tidak menjalankan SQL atau mengubah skema database karena definisi lengkap tabel dan enum tidak tersedia. Jangan memberi pengguna baru role admin dan jangan menaruh service-role key di frontend.
