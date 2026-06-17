Primary action control — use for the main action in any view; pick the variant by emphasis.

```jsx
<Button variant="primary" onClick={save}>Lưu thay đổi</Button>
<Button variant="secondary" leadingIcon={<i data-lucide="download" />}>Tải PDF</Button>
<Button variant="ghost" size="sm">Huỷ</Button>
<Button variant="danger">Xoá tài khoản</Button>
<Button variant="primary" loading>Đang xử lý</Button>
```

- **variant**: `primary` (violet, once per view) · `secondary` (neutral surface + border) · `ghost` (transparent, toolbar/low-emphasis) · `danger` (destructive).
- **size**: `sm` 28px · `md` 32px (default) · `lg` 40px.
- **leadingIcon / trailingIcon**: pass a Lucide icon or SVG node. **loading** swaps in a spinner and disables the button.
- Hover/active states are built in (background steps up through the surface scale; primary darkens). Transitions use the 180ms signature easing.
