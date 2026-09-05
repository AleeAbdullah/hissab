export function StoreButtons() {
  return (
    <div className="store-buttons" aria-label="App availability">
      <div className="store-button" aria-disabled="true">
        <span className="store-glyph" aria-hidden="true">iOS</span>
        <span><small>Coming to the</small>App Store</span>
      </div>
      <div className="store-button" aria-disabled="true">
        <span className="play-glyph" aria-hidden="true" />
        <span><small>Coming to</small>Google Play</span>
      </div>
    </div>
  );
}
