Square, icon-only control for toolbars and dense rows — always pass a `label` for accessibility.

```jsx
<IconButton label="Phóng to" onClick={zoomIn}><i data-lucide="zoom-in" /></IconButton>
<IconButton label="Bộ lọc" variant="secondary"><i data-lucide="sliders-horizontal" /></IconButton>
<IconButton label="Đánh dấu" active><i data-lucide="highlighter" /></IconButton>
```

- **variant**: `ghost` (default) · `secondary` · `primary`. **size**: `sm`/`md`/`lg` (28/32/40px square).
- **active** keeps the pressed surface fill for an engaged tool.
- Size icons ~16–18px; the PDF viewer toolbar uses Lucide at 18px.
