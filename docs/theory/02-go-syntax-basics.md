# Go Syntax - Học nhanh qua ví dụ

> Học Go bằng cách so sánh với JavaScript/TypeScript

---

## 1. Variables & Types

### JavaScript vs Go

```javascript
// JavaScript
let name = "John"           // string
let age = 25                // number
const PI = 3.14             // constant
var oldStyle = "avoid"      // function-scoped
```

```go
// Go
name := "John"              // Short declaration (trong function)
var name string = "John"    // Full declaration
var age int = 25            // Explicit type
const PI = 3.14             // Constant

// Go có nhiều number types
var i int = 10              // Platform dependent (32 or 64 bit)
var i32 int32 = 10          // 32-bit integer
var i64 int64 = 10          // 64-bit integer
var f float64 = 3.14        // 64-bit float (default)
```

### Type Conversion - Go KHÔNG auto ép kiểu

```go
// JS: "5" + 3 = "53" (auto coerce) → bug ẩn
// Go: KHÔNG BAO GIỜ tự ép kiểu

var i int = 5
var f float64 = 2.5
// result := i + f  // ❌ LỖI COMPILE! Khác type
result := float64(i) + f  // ✅ Phải ép thủ công

// Lý do: tránh hoàn toàn bug ẩn do auto coercion như JS
```

### Zero Values (Khác JS!)

```go
var s string    // "" (empty string, không phải undefined)
var i int       // 0
var b bool      // false
var p *string   // nil (như null)
```

---

## 2. Functions

### JavaScript vs Go

```javascript
// JavaScript
function add(a, b) {
    return a + b
}

const multiply = (a, b) => a * b

// Async
async function fetchData() {
    return await fetch(url)
}
```

```go
// Go - Must declare types
func add(a int, b int) int {
    return a + b
}

// Shorthand khi cùng type
func add(a, b int) int {
    return a + b
}

// Multiple return values (Go đặc trưng!)
func divide(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("cannot divide by zero")
    }
    return a / b, nil
}

// Named return values
func getUser(id string) (user User, err error) {
    user, err = db.FindUser(id)
    return  // Implicit return user, err
}
```

### Gọi function với multiple returns

```go
// Phải handle cả 2 return values
result, err := divide(10, 2)
if err != nil {
    log.Fatal(err)
}
fmt.Println(result)  // 5

// Ignore một value với _
result, _ := divide(10, 2)  // Ignore error (không recommend)
```

---

## 3. Structs (như Class/Interface trong JS)

### JavaScript vs Go

```javascript
// JavaScript Class
class User {
    constructor(name, email) {
        this.name = name
        this.email = email
    }

    greet() {
        return `Hello, ${this.name}`
    }
}

const user = new User("John", "john@email.com")
```

```go
// Go Struct
type User struct {
    Name  string  // Capitalized = public (exported)
    Email string
    age   int     // lowercase = private (unexported)
}

// Method (function gắn với struct)
func (u User) Greet() string {
    return "Hello, " + u.Name
}

// Method với pointer receiver (có thể modify)
func (u *User) SetEmail(email string) {
    u.Email = email  // Thay đổi được vì dùng pointer
}

// Composition thay cho Inheritance (Go KHÔNG có extends)
type Admin struct {
    User        // Nhúng User vào → Admin có mọi field/method của User
    Role string
}

admin := Admin{
    User: User{Name: "John", Email: "john@email.com"},
    Role: "superadmin",
}
admin.Name   // "John" ← truy cập trực tiếp, không cần admin.User.Name
admin.Greet() // "Hello, John" ← method của User cũng dùng được

// Tạo instance
user := User{Name: "John", Email: "john@email.com"}
user := User{"John", "john@email.com", 25}  // Positional (không recommend)

// Pointer to struct
user := &User{Name: "John"}
```

### Pointer vs Value Receiver

```go
// Value receiver - copy của struct
func (u User) GetName() string {
    return u.Name  // Chỉ đọc, không modify
}

// Pointer receiver - reference tới struct
func (u *User) SetName(name string) {
    u.Name = name  // Modify được
}

// Khi nào dùng pointer?
// 1. Cần modify struct
// 2. Struct lớn (tránh copy)
// 3. Consistency (nếu 1 method dùng pointer, tất cả nên dùng)
```

---

## 4. Slices & Maps (Arrays & Objects)

### JavaScript vs Go

```javascript
// JavaScript Arrays
const arr = [1, 2, 3]
arr.push(4)
arr.map(x => x * 2)
arr.filter(x => x > 2)

// JavaScript Objects
const obj = { name: "John", age: 25 }
obj.email = "john@email.com"
```

```go
// Go Slice (dynamic array)
arr := []int{1, 2, 3}
arr = append(arr, 4)  // append returns new slice!

// Go Map (like Object/HashMap)
obj := map[string]interface{}{
    "name": "John",
    "age":  25,
}
obj["email"] = "john@email.com"

// Typed map (prefer này)
user := map[string]string{
    "name":  "John",
    "email": "john@email.com",
}

// Check if key exists
value, exists := obj["name"]
if exists {
    fmt.Println(value)
}
```

### Slice operations

```go
// Tạo slice
nums := []int{1, 2, 3, 4, 5}
nums := make([]int, 5)        // [0, 0, 0, 0, 0]
nums := make([]int, 0, 10)    // length=0, capacity=10

// Slice operations
nums[0]          // Access by index
nums[1:3]        // Slice [2, 3] (index 1 to 2)
nums[:3]         // [1, 2, 3] (first 3)
nums[2:]         // [3, 4, 5] (from index 2)
len(nums)        // Length
cap(nums)        // Capacity

// Iterate
for i, num := range nums {
    fmt.Printf("Index %d: %d\n", i, num)
}

// Chỉ cần value
for _, num := range nums {
    fmt.Println(num)
}
```

### ⚠️ Slice CHIA SẺ bộ nhớ (khác JS!)

```javascript
// JS: slice() tạo bản COPY mới
const a = [1, 2, 3]
const b = a.slice(0, 2)
b[0] = 99
console.log(a[0]) // 1 ← không ảnh hưởng
```

```go
// Go: slicing CHIA SẺ bộ nhớ với bản gốc!
a := []int{1, 2, 3}
b := a[0:2]
b[0] = 99
fmt.Println(a[0]) // 99 ← bản gốc BỊ ĐỔI!
// → Cẩn thận: slice Go giống pointer, trỏ vào cùng dữ liệu
```

### Loop - Go CHỈ có `for`

```go
// Go KHÔNG có while, forEach, for...of. Chỉ có `for` làm tất cả.

// 1. For cơ bản
for i := 0; i < 5; i++ { }

// 2. For range (giống forEach)
for index, value := range slice { }
for key, value := range mapData { }

// 3. While loop (dùng for không điều kiện)
for {
    break // thoát
}
```

---

## 5. Error Handling (Khác hoàn toàn JS!)

### JavaScript vs Go

```javascript
// JavaScript - try/catch
try {
    const result = await riskyOperation()
} catch (error) {
    console.error(error)
}
```

```go
// Go - Explicit error handling
result, err := riskyOperation()
if err != nil {
    log.Printf("Error: %v", err)
    return err  // Propagate error
}
// Continue with result

// Tạo error
import "errors"
err := errors.New("something went wrong")

// Formatted error
import "fmt"
err := fmt.Errorf("user %s not found", userID)

// Wrap error (Go 1.13+)
err := fmt.Errorf("failed to get user: %w", originalErr)
```

### Pattern thường gặp

```go
// Early return pattern
func GetUser(id string) (*User, error) {
    if id == "" {
        return nil, errors.New("id is required")
    }

    user, err := db.FindUser(id)
    if err != nil {
        return nil, fmt.Errorf("db error: %w", err)
    }

    if user == nil {
        return nil, ErrUserNotFound
    }

    return user, nil
}
```

---

## 6. Interfaces

### JavaScript vs Go

```javascript
// TypeScript Interface
interface Reader {
    read(): string
}

class FileReader implements Reader {
    read() { return "file content" }
}
```

```go
// Go Interface - IMPLICIT implementation!
type Reader interface {
    Read() string
}

// Struct tự động implement nếu có đủ methods
type FileReader struct{}

func (f FileReader) Read() string {
    return "file content"
}

// FileReader tự động là Reader mà không cần "implements"
// Go compiler check ở COMPILE TIME, lúc bạn DÙNG struct như interface:
var r Reader = FileReader{}  // ✅ Compiler check: FileReader có Read()? Có → OK
// Nếu thiếu method → lỗi compile ngay, không chờ runtime

// Dùng interface
func processReader(r Reader) {
    content := r.Read()
    fmt.Println(content)
}

processReader(FileReader{})  // Works!
```

### Empty Interface (như any trong TS)

```go
// interface{} = any type
func printAnything(v interface{}) {
    fmt.Println(v)
}

printAnything(42)
printAnything("hello")
printAnything(User{Name: "John"})

// Go 1.18+ có alias "any"
func printAnything(v any) {
    fmt.Println(v)
}
```

---

## 7. Pointers (JS không có!)

```go
// Pointer = địa chỉ memory của variable

x := 10
p := &x      // p là pointer tới x (lấy địa chỉ)
fmt.Println(p)   // 0xc0000140a0 (địa chỉ)
fmt.Println(*p)  // 10 (giá trị tại địa chỉ - dereference)

*p = 20      // Thay đổi giá trị tại địa chỉ
fmt.Println(x)   // 20 (x đã thay đổi!)

// Khi nào dùng pointer?
// 1. Muốn modify variable trong function
// 2. Struct lớn (tránh copy)
// 3. Optional values (nil = không có)
```

### Pointer với Struct

```go
// Value - copy toàn bộ struct
func updateUser(u User) {
    u.Name = "Jane"  // Chỉ modify copy, không ảnh hưởng original
}

// Pointer - reference tới original
func updateUser(u *User) {
    u.Name = "Jane"  // Modify original!
}

user := User{Name: "John"}
updateUser(&user)  // Pass pointer
fmt.Println(user.Name)  // "Jane"
```

---

## 8. Goroutines & Channels (Concurrency)

### JavaScript vs Go

```javascript
// JavaScript async/await
async function fetchAll() {
    const [users, posts] = await Promise.all([
        fetch('/users'),
        fetch('/posts')
    ])
}
```

```go
// Go goroutines
func fetchAll() {
    // Channel để nhận kết quả
    usersCh := make(chan []User)
    postsCh := make(chan []Post)

    // Chạy parallel với goroutine
    go func() {
        users := fetchUsers()
        usersCh <- users  // Gửi vào channel
    }()

    go func() {
        posts := fetchPosts()
        postsCh <- posts
    }()

    // Đợi kết quả
    users := <-usersCh  // Nhận từ channel
    posts := <-postsCh
}
```

### Đơn giản hơn với WaitGroup

```go
import "sync"

func fetchAll() {
    var wg sync.WaitGroup

    wg.Add(2)  // Đợi 2 goroutines

    go func() {
        defer wg.Done()  // Báo done khi xong
        fetchUsers()
    }()

    go func() {
        defer wg.Done()
        fetchPosts()
    }()

    wg.Wait()  // Block cho đến khi tất cả done
}
```

---

## 9. Defer (Cleanup)

```go
// defer = chạy khi function return (giống finally)

func readFile(path string) error {
    file, err := os.Open(path)
    if err != nil {
        return err
    }
    defer file.Close()  // Sẽ chạy khi function kết thúc

    // ... đọc file
    // Không cần lo close, defer sẽ handle
    return nil
}

// Multiple defers - LIFO (stack)
func example() {
    defer fmt.Println("1")
    defer fmt.Println("2")
    defer fmt.Println("3")
}
// Output: 3, 2, 1
```

---

## 10. Package & Imports

```go
// Mỗi file bắt đầu với package declaration
package main  // Executable
package user  // Library

// Import
import "fmt"
import "errors"

// Multiple imports
import (
    "fmt"
    "errors"
    "net/http"

    // External packages
    "github.com/gin-gonic/gin"

    // Alias
    pg "github.com/lib/pq"
)

// Exported vs Unexported
// Capitalized = exported (public)
func PublicFunction() {}   // Accessible from other packages
type PublicStruct struct {}

// lowercase = unexported (private)
func privateFunction() {}  // Only within same package
type privateStruct struct {}
```

---

## Quick Reference Table

| JavaScript | Go | Notes |
|------------|-----|-------|
| `let x = 1` | `x := 1` | Short declaration |
| `const` | `const` | Same |
| `null/undefined` | `nil` | Only for pointers, slices, maps |
| `[]` | `[]Type{}` | Must specify type |
| `{}` | `map[K]V{}` | Must specify key/value types |
| `class` | `struct` | No inheritance |
| `this` | Receiver `(s *Struct)` | Explicit |
| `try/catch` | `if err != nil` | Explicit error handling |
| `async/await` | `go func()` + channels | Different model |
| `interface` | `interface` | Implicit implementation |
| `any` | `interface{}` or `any` | Empty interface |

---

---

## 11. Key Takeaways (Từ discussion)

### Variables
```go
// Short declaration (phổ biến nhất, dùng trong function)
name := "John"

// Hằng số
const PI = 3.14

// Zero values - Go KHÔNG có undefined như JS
var s string  // "" (empty string)
var i int     // 0
var b bool    // false
```

### Number Types - Khi nào dùng?
```go
int       // Default, dùng cho hầu hết trường hợp
int64     // Cần số lớn (timestamps, file size, database IDs)
int32     // Tương thích với API/protocol cần 32-bit
float64   // Tiền, tính toán chính xác
```

### Multiple Returns = Error Handling của Go
```go
// Thay vì try/catch như JS/Java, Go return error trực tiếp
result, err := divide(10, 0)
if err != nil {
    // Handle error ngay lập tức
    return err
}
// Tiếp tục với result

// Ưu điểm:
// 1. BUỘC phải handle error (không thể ignore)
// 2. Error là first-class citizen
// 3. Code dễ đọc, dễ trace
```

### Struct - Quan trọng!
```go
type User struct {
    Name  string  // Viết hoa = public (exported)
    email string  // Viết thường = private (unexported)
}

// Method KHÔNG nằm trong struct, define riêng bên ngoài
func (u User) GetName() string {
    return u.Name
}
```

### Value vs Pointer Receiver - CỰC KỲ QUAN TRỌNG!
```go
// Value receiver: nhận BẢN COPY → không modify được original
func (u User) GetName() string {
    return u.Name  // Chỉ đọc, OK
}

func (u User) SetNameWrong(name string) {
    u.Name = name  // ❌ Chỉ modify copy, original không đổi!
}

// Pointer receiver: nhận ĐỊA CHỈ → modify được original
func (u *User) SetName(name string) {
    u.Name = name  // ✓ Modify trực tiếp tại địa chỉ gốc
}

// RULE: Dùng pointer receiver khi:
// 1. Cần modify struct
// 2. Struct lớn (tránh copy)
// 3. Consistency (nếu 1 method dùng pointer, tất cả nên dùng)
```

### Tạo Instance
```go
// Cách 1: Named fields (RECOMMEND)
user := User{Name: "John", Email: "john@x.com"}

// Cách 2: Positional (KHÔNG recommend - dễ sai thứ tự)
user := User{"John", "john@x.com"}

// Cách 3: Pointer (khi cần pass by reference)
user := &User{Name: "John"}
```

---

## 12. Tổng kết buổi học Go Fundamentals (2026-02-21)

> Buổi học 1 tiếng, đi từ zero, focus vào so sánh với JS/React để dễ hiểu.

### Bảng điểm: 7/10 quiz tổng hợp

| Chủ đề | Nắm vững | Cần luyện thêm |
|--------|----------|----------------|
| Variables & Types | Zero value, không auto ép kiểu | - |
| Functions & Error | Multiple return, `if err != nil` | - |
| Structs & Methods | Receiver thay cho class | - |
| Interfaces | Implicit, compiler tự check | - |
| Pointers | `&` lấy địa chỉ, `*` lấy giá trị | Value vs Pointer khi truyền vào function |
| Slices, Maps, Loops | `append`, `range`, chỉ có `for` | Check key trong map (dùng truy cập trực tiếp, KHÔNG loop) |

### Những lỗi sai cần nhớ

**1. Pointer: Nhầm value vs pointer khi truyền vào function**

```go
// KHÔNG pointer → nhận bản COPY → sửa không ảnh hưởng bản gốc
func update(name string) {
    name = "Tùng"  // sửa bản copy, bản gốc không đổi
}

// CÓ pointer → nhận bản GỐC → sửa ảnh hưởng bản gốc
func update(u *User) {
    u.Name = "Tùng"  // sửa bản gốc
}
```

> Mẹo nhớ: Đưa bản photo (value) → sửa photo → gốc không đổi.
> Đưa địa chỉ nhà (pointer) → đến nhà sửa → gốc thay đổi.

**2. Map: Check key tồn tại dùng truy cập trực tiếp, KHÔNG cần loop**

```go
// ❌ SAI: Không cần loop cả map chỉ để tìm 1 key
for key, value := range m { ... }

// ✅ ĐÚNG: Truy cập trực tiếp + check giá trị thứ 2
age, exists := ages["Minh"]
if exists {
    fmt.Println(age)
}
```

**3. Map: Key không tồn tại → trả zero value + false, KHÔNG crash**

```go
m := map[string]int{"a": 1}
val, exists := m["z"]
fmt.Println(val, exists)  // 0 false (KHÔNG phải error)
```

### Analogy hay nhớ

| Concept | Analogy |
|---------|---------|
| Value receiver `(u User)` | Đưa **bản photocopy** - sửa photo, gốc không đổi |
| Pointer receiver `(u *User)` | Đưa **địa chỉ nhà** - đến nhà sửa trực tiếp |
| Interface implicit | **Ổ cắm điện** - 3 chân thì cắm ổ 3 chân được, không cần nhãn |
| Zero value | Go **không có undefined** - luôn có giá trị mặc định |
| `if err != nil` | **Buộc xử lý lỗi** - không thể quên như try/catch |

### Roadmap tiếp theo

- [ ] Đi qua project thật - hiểu từng layer (Handler → Service → Repository)
- [ ] Gin framework - HTTP handler, middleware, routing
- [ ] Database query trong Go - sql.DB, parameterized queries
- [ ] Concurrency - goroutine, channel (khi vào project thật)
- [ ] Testing - unit test, mock, table-driven test

---

*Next: Đi vào project thật, học qua code thực tế!*
