Toggle for instant on/off settings (applies immediately, no save step).

```jsx
<Switch label="Thông báo qua email" defaultChecked />
<Switch label="Chế độ tối" checked={dark} onChange={e => setDark(e.target.checked)} />
```
