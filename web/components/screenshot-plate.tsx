export function ScreenshotPlate({ number, title, className = '' }: { number: string; title: string; className?: string }) {
  return (
    <figure className={`screenshot-figure ${className}`}>
      <div className="screenshot-plate" role="img" aria-label={`${title} app capture pending`}>
        <span className="crop crop-top" aria-hidden="true" />
        <span className="capture-number">{number}</span>
        <div className="capture-placeholder">
          <span>Current app capture</span>
          <strong>Pending</strong>
        </div>
        <span className="crop crop-bottom" aria-hidden="true" />
      </div>
      <figcaption>{title}</figcaption>
    </figure>
  );
}
