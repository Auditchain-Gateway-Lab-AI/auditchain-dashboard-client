# Recovery data client v1

## Tujuan

Recovery v1 memulihkan **satu baris data operasional client** dengan isi dari event client terbaru yang bukti hash, Merkle, dan anchor Fabric telah lolos. Riwayat log dan block yang sudah ada tidak ditulis ulang. Incident `GATEWAY_INTEGRITY` tetap menjadi bahan investigasi.

## Alur operator

1. Buka Recovery Workspace dan masukkan resource lengkap `TABLE:ID`, misalnya `RUANGAN:1046`.
2. Gateway memeriksa seluruh riwayat resource dan membandingkan baris client dengan **event client terbaru**. Event `RECOVERY` tidak dipakai sebagai referensi data client. Jika event terbaru masih pending, proses menunggu; event lama yang sudah anchored tidak menggantikannya.
3. Jika data cocok, tidak ada write. Jika bukti belum valid, Agent tidak tersedia, atau data belum bisa dibandingkan, hasilnya tetap terblokir dengan alasan. Hanya mismatch, row hilang, atau row yang seharusnya terhapus dengan bukti referensi `VERIFIED` dan incident `CLIENT_SOURCE` yang dapat menuju preview.
4. Preview melakukan preflight ulang: referensi terbaru, payload lengkap, hash state, izin operasi dan kolom Agent, serta kondisi baris saat ini. Nilai sensitif pada tampilan disamarkan. Nilai bertanda redaksi tidak boleh menjadi payload tulis.
5. Operator meninjau perbandingan, mengisi alasan, dan menekan Execute. Gateway mengulang syarat kritis sebelum meminta Agent menulis. Agent memeriksa policy dan kondisi awal di dalam transaksi, lalu membaca ulang hasilnya.
6. Gateway menunggu event CDC yang cocok dengan hasil. Bila kandidat CDC ambigu, request gagal verifikasi dan perlu ditinjau. Event CDC hasil tulis serta event recovery harus lolos bukti hash, Merkle, dan Fabric sebelum request berhasil dan incident ditutup.

## Cakupan dan prasyarat

- Satu resource per pemeriksaan dan eksekusi. V1 mengikuti event **terbaru**, tanpa pilihan rollback historis.
- Policy baca dan tulis Agent harus menunjuk schema/tabel/kolom yang sama. Hanya operasi dan kolom yang diizinkan policy dapat ditulis. Tabel yang tidak diizinkan tetap investigasi.
- Gateway harus dapat membaca event CDC, Merkle proof, dan anchor Fabric. CDC yang tertinggal dapat menyebabkan tampilan mismatch sementara; operator perlu memastikan pipeline kembali sinkron sebelum eksekusi.
- Perubahan `RUANGAN:1045/1046` di metadata PostgreSQL adalah temuan `GATEWAY_INTEGRITY`, sehingga tidak otomatis menjadi kandidat pemulihan baris Oracle. Kasus tersebut perlu investigasi bukti event historis tersendiri.
- V1 memakai tabel dan endpoint Recovery yang sudah ada; tidak memerlukan tabel Oracle `AUDIT_TRAIL` baru untuk pemulihan data client.

## Lokasi implementasi

- Dashboard client: pemeriksaan `GET /api/dashboard/verify-resource/:resource`, hasil status, preview, konfirmasi, permintaan, dan history.
- Gateway: pemilihan event terbaru bersama untuk Audit dan Recovery, pemeriksaan referensi serta precondition, korelasi CDC, dan verifikasi bukti event hasil.
- Agent: policy operasi/kolom, transaksi, readback, dan penolakan nilai redaksi.

## Uji penerimaan staging

Gunakan database client dan Fabric **staging** dengan resource uji yang memang boleh ditulis. Siapkan event terbaru anchored dan row client yang berbeda, lalu jalankan pemeriksaan, preview, Execute, readback, event CDC, verifikasi kedua event, hingga request `SUCCEEDED` dan incident selesai. Ulangi dengan event terbaru pending, event hilang, hash salah, Fabric tidak tersedia, policy menolak operasi, state berubah setelah preview, serta dua event CDC yang sama-sama cocok. Semua kasus itu harus tetap menahan penutupan incident. Uji ini belum bisa dinyatakan lulus hanya dari test lokal karena membutuhkan Oracle, Agent, CDC, dan Fabric yang aktif dan terkonfigurasi.
