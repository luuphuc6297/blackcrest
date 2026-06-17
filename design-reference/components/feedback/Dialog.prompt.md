Centered modal. Controlled via `open`; closes on Escape and click-outside.

```jsx
<Dialog
  open={open}
  onClose={() => setOpen(false)}
  title="Phê duyệt báo cáo?"
  description="Báo cáo sẽ được phát hành tới nhà đầu tư ngay sau khi duyệt."
  footer={<>
    <Button variant="ghost" onClick={() => setOpen(false)}>Huỷ</Button>
    <Button variant="primary" onClick={approve}>Phê duyệt</Button>
  </>}
>
  <Input label="Ghi chú duyệt (tuỳ chọn)" />
</Dialog>
```
