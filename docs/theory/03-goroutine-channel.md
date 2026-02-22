# Goroutine & Channel

> Concurrency trong Go - so sánh với JavaScript async/await

---

## 1. Goroutine là gì?

Bình thường code Go chạy **tuần tự**:

```go
func main() {
    doA()  // xong A
    doB()  // rồi mới B
    doC()  // rồi mới C
}
```

Thêm `go` → chạy ở **background**, không đợi:

```go
func main() {
    go doA()  // chạy A ở background, KHÔNG ĐỢI
    go doB()  // chạy B ở background, KHÔNG ĐỢI
    doC()     // chạy C ngay
}
```

### So sánh JS

```javascript
// JS: Promise chạy async
Promise.all([doA(), doB()])

// Go: goroutine
go doA()
go doB()
```

### Concurrency vs Parallelism

```
Parallel:     A ████████████
              B ████████████      ← chạy cùng lúc THẬT SỰ (nhiều CPU)
              C ████████████

Concurrency:  A ██░░██░░██░░
              B ░░██░░██░░██      ← xen kẽ, nhìn như cùng lúc (1 CPU)
              C ██░░░░██░░██
```

Goroutine = **concurrency**. Nhiều goroutine xen kẽ trên ít thread.
Go runtime tự quản lý, mình chỉ cần viết `go func()`.

### Lưu ý: Main chết → goroutine chết

```go
func main() {
    go func() {
        fmt.Println("Hello")  // CÓ THỂ KHÔNG BAO GIỜ IN RA
    }()
    // main() kết thúc ngay → goroutine chưa kịp chạy → chết
}
```

Giải pháp: dùng **Channel** để đợi.

---

## 2. Channel là gì?

Channel = **ống** để goroutine gửi/nhận dữ liệu.

```
Goroutine A ── data ──▶ [ ống (channel) ] ── data ──▶ Goroutine B
```

### Cú pháp

```go
ch := make(chan string)   // tạo ống chứa string

ch <- "hello"             // gửi vào ống
msg := <-ch               // nhận từ ống (BLOCKING - đợi cho đến khi có data)
```

> Mũi tên `<-` chỉ hướng data đi:
> - `ch <- data` = data đi VÀO ống
> - `<-ch` = data đi RA khỏi ống

### So sánh JS

| Go | JS | Ý nghĩa |
|----|-----|---------|
| `go func()` | `new Promise()` | Chạy background |
| `ch <- data` | `resolve(data)` | Gửi kết quả |
| `<-ch` | `await promise` | Đợi kết quả |

### Ví dụ đầy đủ

```go
func main() {
    ch := make(chan string)

    go func() {
        time.Sleep(2 * time.Second)  // giả lập việc nặng
        ch <- "xong rồi!"           // gửi kết quả vào ống
    }()

    fmt.Println("Đang đợi...")
    result := <-ch                   // đợi ống có data
    fmt.Println(result)              // "xong rồi!"
}
```

Thứ tự chạy:

```
Thời gian:  0s          1s          2s
            │           │           │
Main:       tạo ống → in "Đang đợi" → ĐỨNG ĐỢI ở <-ch ──────→ nhận "xong rồi!"
            │           │           │                              │
Goroutine:  bắt đầu ──────── đang sleep ──────────→ gửi "xong rồi!" vào ống
```

---

## 3. Áp dụng trong main.go của dự án

### Flow hoàn chỉnh

```
Thời gian:  0s              5s              60s         User nhấn Ctrl+C
            │               │               │           │
            │               │               │           │
Main:       ┌─ tạo router   │               │           │
            ├─ setup routes  │               │           │
            ├─ tạo server    │               │           │
            │               │               │           │
            ├─ go func() ───┐               │           │
            │               │               │           │
            ├─ tạo ống quit  │               │           │
            │               │               │           │
            └─ <-quit ██████████████████████████████████─┤ nhận signal!
                     (ĐỨNG ĐỢI Ở ĐÂY)                  │
                            │               │           ▼
                            │               │     chạy Shutdown()
                            │               │     đợi request xong
                            │               │     tắt server
                            │               │
Goroutine:                  │               │
(server)    ListenAndServe()│               │
            ████████████████████████████████████████████████▶ nhận request
            │  nhận req 1   │  nhận req 2   │           │    xử lý xong
            │  xử lý        │  xử lý        │           │    → tắt
            │  trả response │  trả response │           │
```

### Code tương ứng

```go
func main() {
    cfg := config.Load()                          // ─┐
    router := gin.New()                            //  │ Setup
    handler.SetupRoutes(router)                    //  │ (chạy tuần tự)
    srv := &http.Server{Addr: ":" + cfg.Port, ...} // ─┘

    // ─── Goroutine: Server chạy ở background ───
    go func() {
        srv.ListenAndServe()
        // Server đứng đây đợi request mãi mãi
        // Main function KHÔNG bị block nhờ "go"
    }()

    // ─── Channel: Main đợi Ctrl+C ───
    quit := make(chan os.Signal, 1)                // tạo ống
    signal.Notify(quit, syscall.SIGINT)            // Ctrl+C → gửi vào ống
    <-quit                                         // ĐỨNG ĐỢI ở đây

    // ─── Code này chỉ chạy SAU KHI nhận Ctrl+C ───
    srv.Shutdown(ctx)                              // tắt server an toàn
}
```

### Tại sao cần cả Goroutine lẫn Channel?

```
Nếu KHÔNG có goroutine:
    srv.ListenAndServe()    ← ĐỨNG MÃI Ở ĐÂY
    quit := make(chan ...)  ← KHÔNG BAO GIỜ CHẠY TỚI
    <-quit                  ← KHÔNG BAO GIỜ CHẠY TỚI
    srv.Shutdown()          ← KHÔNG BAO GIỜ CHẠY TỚI
    → Không thể graceful shutdown!

Nếu KHÔNG có channel:
    go func() { srv.ListenAndServe() }()
    srv.Shutdown()          ← CHẠY NGAY LẬP TỨC → server vừa bật đã tắt!
    → Cần channel để "đợi" signal trước khi shutdown

Có CẢ HAI:
    go func() { srv.ListenAndServe() }()  ← server chạy background
    <-quit                                 ← main đợi Ctrl+C
    srv.Shutdown()                         ← chỉ tắt khi user muốn
    → Hoàn hảo!
```

---

## 4. Buffered vs Unbuffered Channel

```go
// Unbuffered: gửi và nhận phải đồng thời
ch := make(chan string)
// Người gửi PHẢI đợi người nhận sẵn sàng

// Buffered: ống có chỗ chứa tạm
ch := make(chan string, 1)
// Gửi 1 cái không cần đợi (ống chứa được 1)
// Gửi cái thứ 2 → phải đợi ống trống

// Trong main.go:
quit := make(chan os.Signal, 1)
// Buffer = 1 vì OS gửi signal 1 lần, không cần đợi
```

---

## Tóm tắt

| Concept | Nhớ gì |
|---------|--------|
| `go func()` | Chạy background, không đợi |
| `chan` | Ống để goroutine nói chuyện |
| `ch <- data` | Gửi data vào ống |
| `<-ch` | Đợi data từ ống (blocking) |
| Goroutine + Channel | Server chạy background + Main đợi signal |

---

*Ghi chú: Concurrency sẽ gặp lại nhiều khi làm Builder Worker (clone git, build Docker song song)*
