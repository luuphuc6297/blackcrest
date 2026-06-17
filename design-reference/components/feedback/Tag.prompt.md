Neutral chip for metadata and filters; pass `onRemove` to make it removable.

```jsx
<Tag>Quỹ Cân bằng</Tag>
<Tag leadingIcon={<i data-lucide="calendar" />}>Quý III 2026</Tag>
<Tag onRemove={() => clear('q3')}>Bộ lọc: Q3</Tag>
```
