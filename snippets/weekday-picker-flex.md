<div class="weekday-picker">
  <button class="day-tile">Mo</button>
  <button class="day-tile">Di</button>
  <button class="day-tile">Mi</button>
  <button class="day-tile">Do</button>
  <button class="day-tile">Fr</button>
  <button class="day-tile">Sa</button>
  <button class="day-tile">So</button>
</div>
```

```css
.weekday-picker {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  align-items: stretch;
  padding: 10px;
  width: 400px;
  margin: 20px;
  border: 1px solid #ccc;
}

.day-tile {
  flex: 1 1 0;
  min-width: 0;
  padding: 10px 0;
  font-size: clamp(12px, 2.5vw, 16px);
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
}