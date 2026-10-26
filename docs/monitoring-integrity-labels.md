# Integrity Trend

Mengikuti alur branch main: grafik membaca dashboard/stats dengan trend_range, bukan histori percobaan integrity-history dimension source.

- Valid dan Invalid memakai integrity_status (bukti log Gateway/Merkle/Fabric).
- Setiap audit log dihitung sekali pada interval timestamp event. Verify berulang tidak menambah jumlah log.
- INSERT, UPDATE, DELETE ditampilkan sebagai aktivitas. RECOVERY internal dikecualikan backend.
- source_integrity_status dipisahkan dari status bukti. Selisih field sumber tetap terlihat di detail verifikasi.
- Ini status terakhir tiap log, bukan jaminan seluruh data live client cocok. Status belum diperiksa/pending/unavailable tidak dipaksakan menjadi valid atau invalid.
