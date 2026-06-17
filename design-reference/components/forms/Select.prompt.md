Native `<select>` styled to match Input.

```jsx
<Select label="Vai trò" defaultValue="EDITOR">
  <option value="SUPER_ADMIN">Quản trị tối cao</option>
  <option value="EDITOR">Biên tập</option>
  <option value="APPROVER">Người duyệt</option>
</Select>
```

- Pass `<option>`s as children. Same size/error/hint API as Input.
