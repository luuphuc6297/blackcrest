Underline tab bar. Pass `items` with value/label and optional icon + count badge.

```jsx
<Tabs
  defaultValue="all"
  onChange={setTab}
  items={[
    { value: "all", label: "Tất cả", badge: 128 },
    { value: "review", label: "Chờ duyệt", badge: 7 },
    { value: "published", label: "Đã phát hành", badge: 96 },
  ]}
/>
```
