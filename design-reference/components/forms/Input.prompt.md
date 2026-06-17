Single-line text field. Composes label, leading/trailing icons, hint and error in one component.

```jsx
<Input label="Email" type="email" placeholder="ten@quy.vn" leadingIcon={<i data-lucide="mail" />} />
<Input label="Mật khẩu" type="password" error="Mật khẩu không đúng" />
<Input placeholder="Tìm tài liệu…" leadingIcon={<i data-lucide="search" />} />
```

- **error** turns the border + message red and replaces **hint**. **size**: sm/md/lg (28/32/40px).
- Focus shows the violet ring (`--ring-focus`). All other input attributes pass through.
